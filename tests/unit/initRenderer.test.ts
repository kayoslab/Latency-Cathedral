// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

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
vi.mock('three/examples/jsm/controls/OrbitControls.js', () => ({
  OrbitControls: vi.fn(function OrbitControls() {
    return { target: { copy: vi.fn() }, autoRotate: false, autoRotateSpeed: 0, minPolarAngle: 0, maxPolarAngle: Math.PI, minDistance: 0, maxDistance: Infinity, enableDamping: false, dampingFactor: 0, enablePan: true, update: vi.fn(), dispose: vi.fn() };
  }),
}));
vi.mock('../../src/render/dayNight', () => ({
  getTimeOfDay: vi.fn(() => 0.5),
  computeDayNight: vi.fn(() => ({
    timeOfDay: 0.5, sunIntensity: 1, sunX: 0, sunY: 100, sunZ: 40,
    skyColor: { r: 0.8, g: 0.8, b: 0.78, copy: vi.fn(), lerp: vi.fn(), lerpColors: vi.fn() },
    fogColor: { r: 0.8, g: 0.8, b: 0.77, copy: vi.fn(), lerp: vi.fn(), lerpColors: vi.fn() },
    groundColor: { r: 0.77, g: 0.75, b: 0.72 },
    interiorGlow: 0.3,
  })),
  createSkyObjects: vi.fn(() => ({ traverse: vi.fn(), children: [] })),
  updateSkyObjects: vi.fn(),
}));
vi.mock('../../src/render/stoneTexture', () => ({
  createStoneTextures: vi.fn(() => ({ color: {}, normal: {}, roughness: {} })),
  createRoofNormalMap: vi.fn(() => ({})),
}));
vi.mock('../../src/render/buildCathedralGeometry', async (importOriginal) => {
  const orig = await importOriginal() as Record<string, unknown>;
  return { ...orig, setTextures: vi.fn() };
});

// Mock three.js — we only care about the dispose contract, not WebGL internals.
// jsdom has no WebGL context, so we must mock the constructors.
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
      position: { set: vi.fn(), x: 0, y: 0, z: 0 },
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

describe('US-004: initRenderer() lifecycle and dispose contract', () => {
  let initRenderer: typeof import('../../src/render/initRenderer').initRenderer;
  let canvas: HTMLCanvasElement;

  beforeEach(async () => {
    vi.resetModules();
    vi.useFakeTimers();

    document.body.innerHTML = '<canvas id="cathedral"></canvas>';
    canvas = document.getElementById('cathedral') as HTMLCanvasElement;

    vi.stubGlobal('innerWidth', 1280);
    vi.stubGlobal('innerHeight', 720);
    vi.stubGlobal('devicePixelRatio', 1);

    // Mock matchMedia for prefers-reduced-motion
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));

    // Mock requestAnimationFrame / cancelAnimationFrame
    vi.stubGlobal('requestAnimationFrame', vi.fn().mockReturnValue(1));
    vi.stubGlobal('cancelAnimationFrame', vi.fn());

    const mod = await import('../../src/render/initRenderer');
    initRenderer = mod.initRenderer;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  it('returns an object with a dispose function', () => {
    const handle = initRenderer(canvas);

    expect(handle).toBeDefined();
    expect(typeof handle.dispose).toBe('function');

    handle.dispose();
  });

  it('dispose() can be called without throwing', () => {
    const handle = initRenderer(canvas);

    expect(() => handle.dispose()).not.toThrow();
  });

  it('dispose() cancels the animation frame', () => {
    const handle = initRenderer(canvas);
    handle.dispose();

    expect(cancelAnimationFrame).toHaveBeenCalled();
  });

  it('dispose() removes the resize event listener', () => {
    const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

    const handle = initRenderer(canvas);
    handle.dispose();

    const resizeRemoved = removeEventListenerSpy.mock.calls.some(
      ([event]) => event === 'resize',
    );
    expect(resizeRemoved).toBe(true);

    removeEventListenerSpy.mockRestore();
  });

  it('dispose() removes the visibilitychange listener', () => {
    const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener');

    const handle = initRenderer(canvas);
    handle.dispose();

    const visibilityRemoved = removeEventListenerSpy.mock.calls.some(
      ([event]) => event === 'visibilitychange',
    );
    expect(visibilityRemoved).toBe(true);

    removeEventListenerSpy.mockRestore();
  });

  it('dispose() calls renderer.dispose()', async () => {
    const THREE = await import('three');
    const handle = initRenderer(canvas);
    handle.dispose();

    // The mock WebGLRenderer instance should have dispose called
    const rendererInstance = (THREE.WebGLRenderer as unknown as ReturnType<typeof vi.fn>).mock.results[0]?.value;
    expect(rendererInstance.dispose).toHaveBeenCalled();
  });
});
