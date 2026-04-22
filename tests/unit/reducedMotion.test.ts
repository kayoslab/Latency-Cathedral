// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

/**
 * US-015: Reduced-motion tests for initRenderer.
 *
 * These tests verify that the renderer respects the prefers-reduced-motion
 * media query: animation intensity is lowered (rotation skipped) when active,
 * and the scene still renders (not blank).
 */

// Mock three.js — same pattern as initRenderer.test.ts
vi.mock('three', () => {
  const Color = vi.fn(function Color() {});

  const WebGLRenderer = vi.fn(function WebGLRenderer() {
    return {
      setPixelRatio: vi.fn(),
      setSize: vi.fn(),
      render: vi.fn(),
      dispose: vi.fn(),
      domElement: document.createElement('canvas'),
    };
  });

  const Scene = vi.fn(function Scene() {
    return {
      add: vi.fn(),
      background: null,
    };
  });

  const PerspectiveCamera = vi.fn(function PerspectiveCamera() {
    return {
      position: { set: vi.fn(), z: 0 },
      aspect: 1,
      updateProjectionMatrix: vi.fn(),
    };
  });

  const AmbientLight = vi.fn(function AmbientLight() {
    return { isLight: true };
  });

  const DirectionalLight = vi.fn(function DirectionalLight() {
    return {
      position: { set: vi.fn() },
      isLight: true,
    };
  });

  const BoxGeometry = vi.fn(function BoxGeometry() {
    return { dispose: vi.fn() };
  });

  const MeshStandardMaterial = vi.fn(function MeshStandardMaterial() {
    return { dispose: vi.fn() };
  });

  const Mesh = vi.fn(function Mesh(geometry: unknown, material: unknown) {
    return {
      rotation: { x: 0, y: 0 },
      geometry,
      material,
    };
  });

  return {
    Color,
    WebGLRenderer,
    Scene,
    PerspectiveCamera,
    AmbientLight,
    DirectionalLight,
    BoxGeometry,
    MeshStandardMaterial,
    Mesh,
  };
});

describe('US-015: reduced-motion handling in initRenderer', () => {
  let initRenderer: typeof import('../../src/render/initRenderer').initRenderer;
  let canvas: HTMLCanvasElement;
  let rafCallbacks: Array<FrameRequestCallback>;
  let matchMediaResult: {
    matches: boolean;
    addEventListener: ReturnType<typeof vi.fn>;
    removeEventListener: ReturnType<typeof vi.fn>;
  };
  let motionChangeHandler: ((e: { matches: boolean }) => void) | null;
  let visibilityChangeHandler: (() => void) | null;
  let hiddenValue: boolean;

  beforeEach(async () => {
    vi.resetModules();

    document.body.innerHTML = '<canvas id="cathedral"></canvas>';
    canvas = document.getElementById('cathedral') as HTMLCanvasElement;

    vi.stubGlobal('innerWidth', 1280);
    vi.stubGlobal('innerHeight', 720);
    vi.stubGlobal('devicePixelRatio', 1);

    motionChangeHandler = null;
    matchMediaResult = {
      matches: false,
      addEventListener: vi.fn((_event: string, cb: (e: { matches: boolean }) => void) => {
        motionChangeHandler = cb;
      }),
      removeEventListener: vi.fn(),
    };
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue(matchMediaResult));

    // Track requestAnimationFrame callbacks so we can step through frames
    rafCallbacks = [];
    let rafId = 0;
    vi.stubGlobal('requestAnimationFrame', vi.fn((cb: FrameRequestCallback) => {
      rafCallbacks.push(cb);
      return ++rafId;
    }));
    vi.stubGlobal('cancelAnimationFrame', vi.fn());

    // Capture the visibilitychange handler and control document.hidden
    hiddenValue = false;
    visibilityChangeHandler = null;
    const origAddEventListener = document.addEventListener.bind(document);
    vi.spyOn(document, 'addEventListener').mockImplementation((event: string, handler: any, options?: any) => {
      if (event === 'visibilitychange') {
        visibilityChangeHandler = handler;
      }
      origAddEventListener(event, handler, options);
    });
    Object.defineProperty(document, 'hidden', {
      get: () => hiddenValue,
      configurable: true,
    });

    const mod = await import('../../src/render/initRenderer');
    initRenderer = mod.initRenderer;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  function stepFrame() {
    // Execute the most recent rAF callback to advance one frame
    const cb = rafCallbacks.pop();
    if (cb) cb(performance.now());
  }

  it('mesh rotation changes when reduced-motion is NOT active', async () => {
    matchMediaResult.matches = false;

    const handle = initRenderer(canvas);

    // initRenderer calls animate() which schedules a rAF
    // The first rAF callback should rotate the mesh
    const THREE = await import('three');
    const meshInstance = (THREE.Mesh as unknown as ReturnType<typeof vi.fn>).mock.results[0]?.value;

    const initialX = meshInstance.rotation.x;
    const initialY = meshInstance.rotation.y;

    // Step one frame
    stepFrame();

    expect(meshInstance.rotation.x).toBeGreaterThan(initialX);
    expect(meshInstance.rotation.y).toBeGreaterThan(initialY);

    handle.dispose();
  });

  it('mesh rotation does NOT change when reduced-motion IS active', async () => {
    // Set reduced motion before initializing
    matchMediaResult.matches = true;

    const handle = initRenderer(canvas);

    const THREE = await import('three');
    const meshInstance = (THREE.Mesh as unknown as ReturnType<typeof vi.fn>).mock.results[0]?.value;

    const initialX = meshInstance.rotation.x;
    const initialY = meshInstance.rotation.y;

    // Step one frame
    stepFrame();

    expect(meshInstance.rotation.x).toBe(initialX);
    expect(meshInstance.rotation.y).toBe(initialY);

    handle.dispose();
  });

  it('renderer.render() is still called when reduced-motion is active (scene not blank)', async () => {
    matchMediaResult.matches = true;

    const handle = initRenderer(canvas);

    const THREE = await import('three');
    const rendererInstance = (THREE.WebGLRenderer as unknown as ReturnType<typeof vi.fn>).mock.results[0]?.value;

    // Step one frame — render should still be called even without rotation
    stepFrame();

    expect(rendererInstance.render).toHaveBeenCalled();

    handle.dispose();
  });

  it('dynamically responds to reduced-motion change event', async () => {
    matchMediaResult.matches = false;

    const handle = initRenderer(canvas);

    const THREE = await import('three');
    const meshInstance = (THREE.Mesh as unknown as ReturnType<typeof vi.fn>).mock.results[0]?.value;

    // Initially rotation happens
    stepFrame();
    expect(meshInstance.rotation.x).toBeGreaterThan(0);

    // Simulate user enabling reduced motion
    if (motionChangeHandler) {
      motionChangeHandler({ matches: true });
    }

    const xAfterEnable = meshInstance.rotation.x;
    stepFrame();

    // Rotation should NOT increase further
    expect(meshInstance.rotation.x).toBe(xAfterEnable);

    handle.dispose();
  });

  it('dispose() removes the matchMedia change listener', () => {
    const handle = initRenderer(canvas);
    handle.dispose();

    expect(matchMediaResult.removeEventListener).toHaveBeenCalledWith(
      'change',
      expect.any(Function),
    );
  });

  it('animation loop pauses when tab is hidden', async () => {
    const handle = initRenderer(canvas);

    const THREE = await import('three');
    const rendererInstance = (THREE.WebGLRenderer as unknown as ReturnType<typeof vi.fn>).mock.results[0]?.value;

    const renderCountBefore = rendererInstance.render.mock.calls.length;

    // Simulate tab hidden
    hiddenValue = true;
    visibilityChangeHandler?.();

    // Try to step a frame — should not render because paused
    stepFrame();

    expect(rendererInstance.render.mock.calls.length).toBe(renderCountBefore);

    handle.dispose();
  });

  it('animation loop resumes when tab returns from hidden', async () => {
    const handle = initRenderer(canvas);

    // Hide — pauses rendering
    hiddenValue = true;
    visibilityChangeHandler?.();

    // Clear rafCallbacks so we can check if new ones are scheduled on resume
    rafCallbacks.length = 0;

    // Show — resumes rendering
    hiddenValue = false;
    visibilityChangeHandler?.();

    // animate() should have scheduled a new rAF and rendered
    expect(rafCallbacks.length).toBeGreaterThan(0);
    expect(requestAnimationFrame).toHaveBeenCalled();

    handle.dispose();
  });
});
