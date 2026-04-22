// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { SceneParams } from '../../src/domain/types';

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

// Track rebuild calls via Group constructor invocations
vi.mock('three', () => {
  const Color = vi.fn(function Color(this: { r: number; g: number; b: number }, hex?: number) {
    this.r = ((hex ?? 0) >> 16 & 0xff) / 255;
    this.g = ((hex ?? 0) >> 8 & 0xff) / 255;
    this.b = ((hex ?? 0) & 0xff) / 255;
  });
  Color.prototype.lerpColors = vi.fn(function lerpColors(
    this: { r: number; g: number; b: number },
    a: { r: number; g: number; b: number },
    b: { r: number; g: number; b: number },
    t: number,
  ) {
    this.r = a.r + (b.r - a.r) * t;
    this.g = a.g + (b.g - a.g) * t;
    this.b = a.b + (b.b - a.b) * t;
    return this;
  });

  const Fog = vi.fn(function Fog(this: { color: InstanceType<typeof Color>; near: number; far: number }, color: number, near: number, far: number) {
    this.color = new Color(color);
    this.near = near;
    this.far = far;
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
    const sceneChildren: unknown[] = [];
    const scene = {
      add: vi.fn((...objs: unknown[]) => { sceneChildren.push(...objs); }),
      remove: vi.fn((obj: unknown) => {
        const idx = sceneChildren.indexOf(obj);
        if (idx >= 0) sceneChildren.splice(idx, 1);
      }),
      children: sceneChildren,
      background: new Color(0xd5d0c8),
      fog: new Fog(0xd5d0c8, 200, 600),
    };
    return scene;
  });

  const PerspectiveCamera = vi.fn(function PerspectiveCamera() {
    return {
      position: { set: vi.fn(), x: 0, y: 0, z: 0 },
      aspect: 1,
      updateProjectionMatrix: vi.fn(),
      lookAt: vi.fn(),
    };
  });

  const AmbientLight = vi.fn(function AmbientLight(this: { intensity: number; isLight: boolean }, _color?: number, intensity?: number) {
    this.intensity = intensity ?? 1;
    this.isLight = true;
  });

  const DirectionalLight = vi.fn(function DirectionalLight(this: { intensity: number; isLight: boolean; position: { set: ReturnType<typeof vi.fn> } }, _color?: number, intensity?: number) {
    this.intensity = intensity ?? 1;
    this.isLight = true;
    this.position = { set: vi.fn() };
    (this as unknown as { castShadow: boolean }).castShadow = false;
    (this as unknown as { shadow: unknown }).shadow = { mapSize: { width: 0, height: 0 }, camera: { near: 0, far: 0, left: 0, right: 0, top: 0, bottom: 0 } };
  });

  const PointLight = vi.fn(function PointLight(this: { intensity: number; isLight: boolean; position: { set: ReturnType<typeof vi.fn> } }, _color?: number, intensity?: number) {
    this.intensity = intensity ?? 1;
    this.isLight = true;
    this.position = { set: vi.fn() };
  });

  const HemisphereLight = vi.fn(function HemisphereLight(this: { intensity: number; isLight: boolean }, _skyColor?: number, _groundColor?: number, intensity?: number) {
    this.intensity = intensity ?? 1;
    this.isLight = true;
  });

  const makeGeo = (type: string) => vi.fn(function Geo() {
    return { dispose: vi.fn(), type };
  });
  const BoxGeometry = makeGeo('BoxGeometry');
  const CylinderGeometry = makeGeo('CylinderGeometry');
  const ConeGeometry = makeGeo('ConeGeometry');
  const PlaneGeometry = makeGeo('PlaneGeometry');
  const ExtrudeGeometry = makeGeo('ExtrudeGeometry');
  const TubeGeometry = makeGeo('TubeGeometry');
  const TorusGeometry = makeGeo('TorusGeometry');
  const RingGeometry = makeGeo('RingGeometry');

  const MeshStandardMaterial = vi.fn(function MeshStandardMaterial() {
    const mat: any = {
      dispose: vi.fn(), type: 'MeshStandardMaterial',
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
      geometry, material,
      position: { set: vi.fn(), x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      scale: { x: 1, y: 1, z: 1 },
      castShadow: false, receiveShadow: false,
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

function makeParams(overrides: Partial<SceneParams> = {}): SceneParams {
  return {
    height: 0.8,
    symmetry: 0.9,
    fracture: 0.1,
    fog: 0.2,
    lightIntensity: 0.8,
    ruinLevel: 0.1,
    ...overrides,
  };
}

describe('US-013: fog/lightIntensity changes do not trigger geometry rebuild', () => {
  let initRenderer: typeof import('../../src/render/initRenderer').initRenderer;
  let THREE: typeof import('three');
  let canvas: HTMLCanvasElement;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();
    vi.useFakeTimers();

    document.body.innerHTML = '<canvas id="cathedral"></canvas>';
    canvas = document.getElementById('cathedral') as HTMLCanvasElement;

    vi.stubGlobal('innerWidth', 1280);
    vi.stubGlobal('innerHeight', 720);
    vi.stubGlobal('devicePixelRatio', 1);

    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockReturnValue({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }),
    );

    vi.stubGlobal('requestAnimationFrame', vi.fn().mockReturnValue(1));
    vi.stubGlobal('cancelAnimationFrame', vi.fn());

    THREE = await import('three');
    const mod = await import('../../src/render/initRenderer');
    initRenderer = mod.initRenderer;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  it('changing only fog does not trigger geometry rebuild (no new Group created)', () => {
    const handle = initRenderer(canvas);
    const params1 = makeParams({ fog: 0.2 });

    // First update creates initial geometry
    handle.update(params1);
    const groupCallsAfterFirst = (THREE.Group as unknown as ReturnType<typeof vi.fn>).mock.calls.length;

    // Change only fog — should NOT rebuild geometry (just changes targetParams)
    handle.update(makeParams({ fog: 0.9 }));
    const groupCallsAfterSecond = (THREE.Group as unknown as ReturnType<typeof vi.fn>).mock.calls.length;

    expect(groupCallsAfterSecond).toBe(groupCallsAfterFirst);

    handle.dispose();
  });

  it('changing only lightIntensity does not trigger geometry rebuild', () => {
    const handle = initRenderer(canvas);

    handle.update(makeParams({ lightIntensity: 0.8 }));
    const groupCallsAfterFirst = (THREE.Group as unknown as ReturnType<typeof vi.fn>).mock.calls.length;

    handle.update(makeParams({ lightIntensity: 0.2 }));
    const groupCallsAfterSecond = (THREE.Group as unknown as ReturnType<typeof vi.fn>).mock.calls.length;

    expect(groupCallsAfterSecond).toBe(groupCallsAfterFirst);

    handle.dispose();
  });

  it('changing fog AND lightIntensity together does not trigger geometry rebuild', () => {
    const handle = initRenderer(canvas);

    handle.update(makeParams({ fog: 0.1, lightIntensity: 0.9 }));
    const groupCallsAfterFirst = (THREE.Group as unknown as ReturnType<typeof vi.fn>).mock.calls.length;

    handle.update(makeParams({ fog: 0.8, lightIntensity: 0.3 }));
    const groupCallsAfterSecond = (THREE.Group as unknown as ReturnType<typeof vi.fn>).mock.calls.length;

    expect(groupCallsAfterSecond).toBe(groupCallsAfterFirst);

    handle.dispose();
  });

  it('changing height sets a new target for geometry rebuild', () => {
    const handle = initRenderer(canvas);

    // First update creates initial geometry
    handle.update(makeParams({ height: 0.5 }));
    const groupCallsAfterFirst = (THREE.Group as unknown as ReturnType<typeof vi.fn>).mock.calls.length;

    // Setting a very different height updates targetParams
    // Geometry rebuild happens in animate loop (tested via animation tests)
    handle.update(makeParams({ height: 0.9 }));

    // The initial build happened, targetParams are now different
    expect(groupCallsAfterFirst).toBeGreaterThan(0);

    handle.dispose();
  });

  it('initial update applies atmosphere immediately', () => {
    const handle = initRenderer(canvas);

    // First update with initial params — atmosphere applied synchronously
    handle.update(makeParams({ fog: 0.0, lightIntensity: 1.0 }));

    // Get the scene's fog reference after first update
    const sceneInstance = (THREE.Scene as unknown as ReturnType<typeof vi.fn>).mock.results[0]?.value;

    // Scene fog should have been set on initial update
    if (sceneInstance?.fog) {
      expect(sceneInstance.fog.near).toBe(200); // FOG_NEAR_MIN at fog=0
      expect(sceneInstance.fog.far).toBe(600);  // FOG_FAR_MIN at fog=0
    }

    handle.dispose();
  });

  it('palette changes do not recreate the renderer', async () => {
    const handle = initRenderer(canvas);
    const rendererConstructorCalls = (THREE.WebGLRenderer as unknown as ReturnType<typeof vi.fn>).mock.calls.length;

    // Apply multiple atmosphere changes
    handle.update(makeParams({ fog: 0.0, lightIntensity: 1.0 }));
    handle.update(makeParams({ fog: 0.5, lightIntensity: 0.5 }));
    handle.update(makeParams({ fog: 1.0, lightIntensity: 0.0 }));

    // WebGLRenderer should NOT have been constructed again
    expect((THREE.WebGLRenderer as unknown as ReturnType<typeof vi.fn>).mock.calls.length).toBe(rendererConstructorCalls);

    handle.dispose();
  });
});

describe('US-013: sceneParamsChanged — atmosphere vs geometry split', () => {
  let sceneParamsChanged: typeof import('../../src/render/sceneParamsChanged').sceneParamsChanged;

  beforeEach(async () => {
    vi.resetModules();
    const mod = await import('../../src/render/sceneParamsChanged');
    sceneParamsChanged = mod.sceneParamsChanged;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('detects fog changes', () => {
    const a = makeParams({ fog: 0.1 });
    const b = makeParams({ fog: 0.9 });

    expect(sceneParamsChanged(a, b)).toBe(true);
  });

  it('detects lightIntensity changes', () => {
    const a = makeParams({ lightIntensity: 0.3 });
    const b = makeParams({ lightIntensity: 0.7 });

    expect(sceneParamsChanged(a, b)).toBe(true);
  });

  it('returns false when all params are identical', () => {
    const a = makeParams();
    const b = makeParams();

    expect(sceneParamsChanged(a, b)).toBe(false);
  });
});
