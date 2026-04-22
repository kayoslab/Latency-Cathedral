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
  const Color = vi.fn(function Color() {
    return { r: 0, g: 0, b: 0, lerpColors: vi.fn() };
  });

  const Fog = vi.fn(function Fog(_color: number, near: number, far: number) {
    return { color: new Color(), near, far };
  });

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
      remove: vi.fn(),
      background: new Color(),
      fog: new Fog(0, 50, 100),
    };
  });

  const PerspectiveCamera = vi.fn(function PerspectiveCamera() {
    return {
      position: { set: vi.fn(), z: 0 },
      aspect: 1,
      updateProjectionMatrix: vi.fn(),
    };
  });

  const AmbientLight = vi.fn(function AmbientLight(_color?: number, intensity?: number) {
    return { intensity: intensity ?? 1, isLight: true };
  });

  const DirectionalLight = vi.fn(function DirectionalLight(_color?: number, intensity?: number) {
    return {
      intensity: intensity ?? 1,
      position: { set: vi.fn() },
      isLight: true,
    };
  });

  const BoxGeometry = vi.fn(function BoxGeometry() {
    return { dispose: vi.fn() };
  });

  const CylinderGeometry = vi.fn(function CylinderGeometry() {
    return { dispose: vi.fn() };
  });

  const MeshStandardMaterial = vi.fn(function MeshStandardMaterial() {
    return { dispose: vi.fn() };
  });

  const Mesh = vi.fn(function Mesh(geometry: unknown, material: unknown) {
    return {
      rotation: { x: 0, y: 0 },
      position: { set: vi.fn(), x: 0, y: 0, z: 0 },
      geometry,
      material,
      isMesh: true,
    };
  });

  const Group = vi.fn(function Group() {
    const groupChildren: unknown[] = [];
    const group = {
      add: vi.fn((...objs: unknown[]) => {
        groupChildren.push(...objs);
      }),
      children: groupChildren,
      rotation: { x: 0, y: 0, z: 0 },
      isGroup: true,
      traverse: vi.fn((cb: (obj: unknown) => void) => {
        cb(group);
        for (const child of groupChildren) {
          cb(child);
        }
      }),
      removeFromParent: vi.fn(),
    };
    return group;
  });

  return {
    Color,
    Fog,
    WebGLRenderer,
    Scene,
    PerspectiveCamera,
    AmbientLight,
    DirectionalLight,
    BoxGeometry,
    CylinderGeometry,
    MeshStandardMaterial,
    Mesh,
    Group,
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

    // Build cathedral group so rotation applies to it
    const THREE = await import('three');
    handle.update({
      height: 0.8, symmetry: 0.9, fracture: 0.1,
      fog: 0.2, lightIntensity: 0.8, ruinLevel: 0.1,
    });
    const groupInstance = (THREE.Group as unknown as ReturnType<typeof vi.fn>).mock.results[0]?.value;

    const initialY = groupInstance.rotation.y;

    // Step one frame
    stepFrame();

    expect(groupInstance.rotation.y).toBeGreaterThan(initialY);

    handle.dispose();
  });

  it('mesh rotation does NOT change when reduced-motion IS active', async () => {
    // Set reduced motion before initializing
    matchMediaResult.matches = true;

    const handle = initRenderer(canvas);

    const THREE = await import('three');
    handle.update({
      height: 0.8, symmetry: 0.9, fracture: 0.1,
      fog: 0.2, lightIntensity: 0.8, ruinLevel: 0.1,
    });
    const groupInstance = (THREE.Group as unknown as ReturnType<typeof vi.fn>).mock.results[0]?.value;

    const initialY = groupInstance.rotation.y;

    // Step one frame
    stepFrame();

    expect(groupInstance.rotation.y).toBe(initialY);

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
    handle.update({
      height: 0.8, symmetry: 0.9, fracture: 0.1,
      fog: 0.2, lightIntensity: 0.8, ruinLevel: 0.1,
    });
    const groupInstance = (THREE.Group as unknown as ReturnType<typeof vi.fn>).mock.results[0]?.value;

    // Initially rotation happens
    stepFrame();
    expect(groupInstance.rotation.y).toBeGreaterThan(0);

    // Simulate user enabling reduced motion
    if (motionChangeHandler) {
      motionChangeHandler({ matches: true });
    }

    const yAfterEnable = groupInstance.rotation.y;
    stepFrame();

    // Rotation should NOT increase further
    expect(groupInstance.rotation.y).toBe(yAfterEnable);

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
