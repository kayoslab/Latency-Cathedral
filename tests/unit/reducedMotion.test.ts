// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

/**
 * US-015: Reduced-motion tests for initRenderer.
 *
 * These tests verify that the renderer respects the prefers-reduced-motion
 * media query: animation intensity is lowered (rotation skipped) when active,
 * and the scene still renders (not blank).
 */

vi.mock('three/examples/jsm/postprocessing/EffectComposer.js', () => ({
  EffectComposer: vi.fn(function EffectComposer() {
    return { addPass: vi.fn(), render: vi.fn(), dispose: vi.fn(), setSize: vi.fn() };
  }),
}));
vi.mock('three/examples/jsm/postprocessing/RenderPass.js', () => ({
  RenderPass: vi.fn(function RenderPass() { return {}; }),
}));
vi.mock('three/examples/jsm/postprocessing/UnrealBloomPass.js', () => ({
  UnrealBloomPass: vi.fn(function UnrealBloomPass() {
    return { resolution: { set: vi.fn() } };
  }),
}));
vi.mock('three/examples/jsm/postprocessing/OutputPass.js', () => ({
  OutputPass: vi.fn(function OutputPass() { return {}; }),
}));
vi.mock('../../src/render/stoneTexture', () => ({
  createStoneTextures: vi.fn(() => ({ color: {}, normal: {}, roughness: {} })),
  createRoofNormalMap: vi.fn(() => ({})),
}));
vi.mock('../../src/render/buildCathedralGeometry', async (importOriginal) => {
  const orig = await importOriginal() as Record<string, unknown>;
  return { ...orig, setTextures: vi.fn() };
});

// Mock three.js — same pattern as initRenderer.test.ts
vi.mock('three', () => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const Color = vi.fn(function Color(_hex?: number) {
    return { r: 0, g: 0, b: 0, lerpColors: vi.fn() };
  });

  const Fog = vi.fn(function Fog(_color: number, near: number, far: number) {
    return { color: new Color(), near, far };
  });

  const ACESFilmicToneMapping = 4;
  const SRGBColorSpace = 'srgb';
  const PCFShadowMap = 2;

  const WebGLRenderer = vi.fn(function WebGLRenderer() {
    return {
      setPixelRatio: vi.fn(),
      setSize: vi.fn(),
      render: vi.fn(),
      dispose: vi.fn(),
      domElement: document.createElement('canvas'),
      toneMapping: 0,
      toneMappingExposure: 1,
      outputColorSpace: '',
      shadowMap: { enabled: false, type: null },
    };
  });

  const Scene = vi.fn(function Scene() {
    return {
      add: vi.fn(),
      remove: vi.fn(),
      background: new Color(0xd5d0c8),
      fog: new Fog(0xd5d0c8, 200, 600),
    };
  });

  const PerspectiveCamera = vi.fn(function PerspectiveCamera() {
    return {
      position: { set: vi.fn(), x: 0, y: 4, z: 10 },
      aspect: 1,
      updateProjectionMatrix: vi.fn(),
      lookAt: vi.fn(),
    };
  });

  const AmbientLight = vi.fn(function AmbientLight(_color?: number, intensity?: number) {
    return { intensity: intensity ?? 1, isLight: true };
  });

  const DirectionalLight = vi.fn(function DirectionalLight(_color?: number, intensity?: number) {
    return { intensity: intensity ?? 1, position: { set: vi.fn() }, isLight: true, castShadow: false, shadow: { mapSize: { width: 0, height: 0 }, camera: { near: 0, far: 0, left: 0, right: 0, top: 0, bottom: 0 } } };
  });

  const PointLight = vi.fn(function PointLight(_color?: number, intensity?: number) {
    return { intensity: intensity ?? 1, position: { set: vi.fn() }, isLight: true };
  });

  const HemisphereLight = vi.fn(function HemisphereLight(_skyColor?: number, _groundColor?: number, intensity?: number) {
    return { intensity: intensity ?? 1, isLight: true };
  });

  const makeGeo = () => vi.fn(function Geo() { return { dispose: vi.fn() }; });
  const BoxGeometry = makeGeo();
  const CylinderGeometry = makeGeo();
  const ConeGeometry = makeGeo();
  const PlaneGeometry = makeGeo();
  const ExtrudeGeometry = makeGeo();
  const TubeGeometry = makeGeo();
  const TorusGeometry = makeGeo();
  const RingGeometry = makeGeo();

  const MeshStandardMaterial = vi.fn(function MeshStandardMaterial() {
    const mat: any = {
      dispose: vi.fn(),
      color: { r: 0.5, g: 0.5, b: 0.5, lerp: vi.fn() },
      roughness: 0.85, metalness: 0.02, opacity: 1, emissiveIntensity: 1,
    };
    mat.clone = vi.fn(() => {
      const c = { ...mat, color: { r: 0.5, g: 0.5, b: 0.5, lerp: vi.fn() } };
      c.clone = mat.clone;
      return c;
    });
    return mat;
  });

  const Mesh = vi.fn(function Mesh(geometry: unknown, material: unknown) {
    return {
      rotation: { x: 0, y: 0, z: 0 },
      position: { set: vi.fn(), x: 0, y: 0, z: 0 },
      scale: { x: 1, y: 1, z: 1 },
      castShadow: false,
      receiveShadow: false,
      geometry,
      material,
      isMesh: true,
      userData: {},
    };
  });

  const Group = vi.fn(function Group() {
    const groupChildren: unknown[] = [];
    const group = {
      add: vi.fn((...objs: unknown[]) => { groupChildren.push(...objs); }),
      children: groupChildren,
      rotation: { x: 0, y: 0, z: 0 },
      isGroup: true,
      traverse: vi.fn((cb: (obj: unknown) => void) => { cb(group); for (const child of groupChildren) cb(child); }),
      removeFromParent: vi.fn(),
    };
    return group;
  });

  const Shape = vi.fn(function Shape() { return { moveTo: vi.fn(), lineTo: vi.fn(), quadraticCurveTo: vi.fn(), closePath: vi.fn() }; });
  const Vector3 = vi.fn(function Vector3(x = 0, y = 0, z = 0) { return { x, y, z }; });
  const Vector2 = vi.fn(function Vector2(x = 0, y = 0) { return { x, y, set: vi.fn() }; });
  const QuadraticBezierCurve3 = vi.fn(function QuadraticBezierCurve3() { return {}; });
  const DoubleSide = 2;
  const CanvasTexture = vi.fn(function CanvasTexture() { return {}; });

  return {
    Color, Fog, WebGLRenderer, Scene, PerspectiveCamera,
    AmbientLight, DirectionalLight, PointLight, HemisphereLight,
    ACESFilmicToneMapping, SRGBColorSpace, PCFShadowMap,
    BoxGeometry, CylinderGeometry, ConeGeometry, PlaneGeometry,
    ExtrudeGeometry, TubeGeometry, TorusGeometry, RingGeometry,
    MeshStandardMaterial, Mesh, Group,
    Shape, Vector3, Vector2, QuadraticBezierCurve3, DoubleSide, CanvasTexture,
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

  it('camera orbit updates when reduced-motion is NOT active', async () => {
    matchMediaResult.matches = false;

    const handle = initRenderer(canvas);

    const THREE = await import('three');
    const cameraInstance = (THREE.PerspectiveCamera as unknown as ReturnType<typeof vi.fn>).mock.results[0]?.value;

    // Step one frame — camera lookAt should be called (orbit update)
    stepFrame();

    expect(cameraInstance.lookAt).toHaveBeenCalled();

    handle.dispose();
  });

  it('camera orbit does NOT update when reduced-motion IS active', async () => {
    // Set reduced motion before initializing
    matchMediaResult.matches = true;

    const handle = initRenderer(canvas);

    const THREE = await import('three');
    const cameraInstance = (THREE.PerspectiveCamera as unknown as ReturnType<typeof vi.fn>).mock.results[0]?.value;

    // Clear any calls from initialization
    cameraInstance.lookAt.mockClear();

    // Step one frame — camera should NOT orbit
    stepFrame();

    expect(cameraInstance.lookAt).not.toHaveBeenCalled();

    handle.dispose();
  });

  it('renderer.render() is still called when reduced-motion is active (scene not blank)', async () => {
    matchMediaResult.matches = true;

    const handle = initRenderer(canvas);

    const { EffectComposer } = await import('three/examples/jsm/postprocessing/EffectComposer.js');
    const composerInstance = (EffectComposer as unknown as ReturnType<typeof vi.fn>).mock.results[0]?.value;

    // Step one frame — render should still be called even without rotation
    stepFrame();

    expect(composerInstance.render).toHaveBeenCalled();

    handle.dispose();
  });

  it('dynamically responds to reduced-motion change event', () => {
    matchMediaResult.matches = false;

    const handle = initRenderer(canvas);

    // Verify motion change handler was registered via addEventListener
    expect(motionChangeHandler).not.toBeNull();

    // Simulate user enabling reduced motion — should not throw
    expect(() => {
      if (motionChangeHandler) {
        motionChangeHandler({ matches: true });
      }
    }).not.toThrow();

    // After enabling reduced motion, animation should still work (not crash)
    // but camera orbit will be skipped
    stepFrame();

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
