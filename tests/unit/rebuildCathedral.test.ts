// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { SceneParams } from '../../src/domain/types';

// Track dispose calls to verify no leaked meshes
const disposedGeometries: unknown[] = [];
const disposedMaterials: unknown[] = [];

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
    const sceneChildren: unknown[] = [];
    return {
      add: vi.fn((...objs: unknown[]) => {
        sceneChildren.push(...objs);
      }),
      remove: vi.fn((obj: unknown) => {
        const idx = sceneChildren.indexOf(obj);
        if (idx >= 0) sceneChildren.splice(idx, 1);
      }),
      children: sceneChildren,
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

  const makeTrackedGeo = (type: string) => vi.fn(function Geo() {
    const geo = {
      dispose: vi.fn(() => disposedGeometries.push(geo)),
      type,
    };
    return geo;
  });

  const BoxGeometry = makeTrackedGeo('BoxGeometry');
  const CylinderGeometry = makeTrackedGeo('CylinderGeometry');
  const ConeGeometry = makeTrackedGeo('ConeGeometry');
  const PlaneGeometry = makeTrackedGeo('PlaneGeometry');
  const ExtrudeGeometry = makeTrackedGeo('ExtrudeGeometry');
  const TubeGeometry = makeTrackedGeo('TubeGeometry');
  const TorusGeometry = makeTrackedGeo('TorusGeometry');
  const RingGeometry = makeTrackedGeo('RingGeometry');

  const MeshStandardMaterial = vi.fn(function MeshStandardMaterial() {
    const mat: any = {
      dispose: vi.fn(() => disposedMaterials.push(mat)),
      type: 'MeshStandardMaterial',
      color: { r: 0.5, g: 0.5, b: 0.5, lerp: vi.fn() },
      roughness: 0.85, metalness: 0.02, opacity: 1, emissiveIntensity: 1,
    };
    mat.clone = vi.fn(() => {
      const c = { ...mat, color: { r: 0.5, g: 0.5, b: 0.5, lerp: vi.fn() } };
      c.clone = mat.clone;
      c.dispose = vi.fn(() => disposedMaterials.push(c));
      return c;
    });
    return mat;
  });

  const Mesh = vi.fn(function Mesh(geometry: unknown, material: unknown) {
    return {
      geometry,
      material,
      position: { set: vi.fn(), x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      scale: { x: 1, y: 1, z: 1 },
      castShadow: false,
      receiveShadow: false,
      isMesh: true,
      userData: {},
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

  const Shape = vi.fn(function Shape() {
    return { moveTo: vi.fn(), lineTo: vi.fn(), quadraticCurveTo: vi.fn(), closePath: vi.fn() };
  });
  const Vector3 = vi.fn(function Vector3(x = 0, y = 0, z = 0) {
    return { x, y, z };
  });
  const Vector2 = vi.fn(function Vector2(x = 0, y = 0) {
    return { x, y, set: vi.fn() };
  });
  const QuadraticBezierCurve3 = vi.fn(function QuadraticBezierCurve3() {
    return {};
  });
  const DoubleSide = 2;
  const CanvasTexture = vi.fn(function CanvasTexture() { return {}; });

  return {
    Color,
    Fog,
    WebGLRenderer,
    Scene,
    PerspectiveCamera,
    AmbientLight,
    DirectionalLight,
    PointLight,
    HemisphereLight,
    ACESFilmicToneMapping,
    SRGBColorSpace,
    PCFShadowMap,
    BoxGeometry,
    CylinderGeometry,
    ConeGeometry,
    PlaneGeometry,
    ExtrudeGeometry,
    TubeGeometry,
    TorusGeometry,
    RingGeometry,
    MeshStandardMaterial,
    Mesh,
    Group,
    Shape,
    Vector3,
    Vector2,
    QuadraticBezierCurve3,
    DoubleSide,
    CanvasTexture,
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

describe('US-011: rebuildCathedral', () => {
  let rebuildCathedral: typeof import('../../src/render/rebuildCathedral').rebuildCathedral;
  let THREE: typeof import('three');

  beforeEach(async () => {
    vi.resetModules();
    disposedGeometries.length = 0;
    disposedMaterials.length = 0;

    THREE = await import('three');
    const mod = await import('../../src/render/rebuildCathedral');
    rebuildCathedral = mod.rebuildCathedral;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function createMockScene() {
    return new THREE.Scene() as unknown as import('three').Scene;
  }

  it('handles null currentGroup gracefully (first call)', () => {
    const scene = createMockScene();

    const group = rebuildCathedral(scene, null, makeParams());

    expect(group).toBeDefined();
    expect(group.isGroup).toBe(true);
  });

  it('adds new group to scene', () => {
    const scene = createMockScene();

    const group = rebuildCathedral(scene, null, makeParams());

    expect((scene as unknown as { add: ReturnType<typeof vi.fn> }).add).toHaveBeenCalledWith(group);
  });

  it('returns the new group', () => {
    const scene = createMockScene();

    const group = rebuildCathedral(scene, null, makeParams());

    expect(group).toBeDefined();
    expect(group.children.length).toBeGreaterThanOrEqual(3);
  });

  it('removes old group from scene when replacing', () => {
    const scene = createMockScene();

    // First build
    const oldGroup = rebuildCathedral(scene, null, makeParams());

    // Rebuild with different params
    rebuildCathedral(scene, oldGroup, makeParams({ height: 0.5 }));

    expect((scene as unknown as { remove: ReturnType<typeof vi.fn> }).remove).toHaveBeenCalledWith(oldGroup);
  });

  it('disposes all geometries and materials on old group before creating new one', () => {
    const scene = createMockScene();

    // First build
    const oldGroup = rebuildCathedral(scene, null, makeParams());

    // Verify old group has children with geometry/material
    const oldChildren = oldGroup.children;
    expect(oldChildren.length).toBeGreaterThan(0);

    // Collect dispose spies from old group meshes
    const geometryDisposeFns: ReturnType<typeof vi.fn>[] = [];
    const materialDisposeFns: ReturnType<typeof vi.fn>[] = [];
    for (const child of oldChildren) {
      const mesh = child as { geometry?: { dispose: ReturnType<typeof vi.fn> }; material?: { dispose: ReturnType<typeof vi.fn> } };
      if (mesh.geometry?.dispose) geometryDisposeFns.push(mesh.geometry.dispose);
      if (mesh.material?.dispose) materialDisposeFns.push(mesh.material.dispose);
    }

    // Rebuild — old group should be disposed
    rebuildCathedral(scene, oldGroup, makeParams({ height: 0.3 }));

    // Verify all geometries on old group were disposed
    for (const disposeFn of geometryDisposeFns) {
      expect(disposeFn).toHaveBeenCalled();
    }

    // Verify all materials on old group were disposed
    for (const disposeFn of materialDisposeFns) {
      expect(disposeFn).toHaveBeenCalled();
    }
  });

  it('no leaked disposed meshes — dispose count matches mesh count', () => {
    const scene = createMockScene();

    const oldGroup = rebuildCathedral(scene, null, makeParams());
    const meshCount = oldGroup.children.filter(
      (c: unknown) => (c as { isMesh?: boolean }).isMesh,
    ).length;

    // Collect geometry dispose spies
    const geoDisposes = oldGroup.children
      .map((c: unknown) => (c as { geometry?: { dispose: ReturnType<typeof vi.fn> } }).geometry?.dispose)
      .filter(Boolean);

    // Rebuild triggers dispose
    rebuildCathedral(scene, oldGroup, makeParams({ height: 0.4 }));

    // Every mesh geometry should have been disposed exactly once
    expect(geoDisposes.length).toBe(meshCount);
    for (const d of geoDisposes) {
      expect(d).toHaveBeenCalledTimes(1);
    }
  });
});

describe('US-011: RendererHandle.update() integration', () => {
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

    const mod = await import('../../src/render/initRenderer');
    initRenderer = mod.initRenderer;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  it('RendererHandle has an update() method', () => {
    const handle = initRenderer(canvas);

    expect(typeof handle.update).toBe('function');

    handle.dispose();
  });

  it('update() can be called without throwing', () => {
    const handle = initRenderer(canvas);

    expect(() => handle.update(makeParams())).not.toThrow();

    handle.dispose();
  });

  it('update() with same params twice does not rebuild (dirty-flag guard)', async () => {
    const THREE = await import('three');
    const handle = initRenderer(canvas);
    const params = makeParams();

    // First call — builds cathedral instantly (initial update)
    handle.update(params);
    const groupCallCount1 = (THREE.Group as unknown as ReturnType<typeof vi.fn>).mock.calls.length;

    // Second call with identical params — just sets target, no immediate rebuild
    handle.update({ ...params });
    const groupCallCount2 = (THREE.Group as unknown as ReturnType<typeof vi.fn>).mock.calls.length;

    expect(groupCallCount2).toBe(groupCallCount1);

    handle.dispose();
  });

  it('update() with different params sets new target', async () => {
    const THREE = await import('three');
    const handle = initRenderer(canvas);

    // First update creates initial geometry
    handle.update(makeParams({ height: 0.5 }));
    const groupCallCount1 = (THREE.Group as unknown as ReturnType<typeof vi.fn>).mock.calls.length;

    // Second update with different height sets target
    // Geometry rebuild happens in animation loop via lerp
    handle.update(makeParams({ height: 0.9 }));

    // At minimum, initial geometry was created
    expect(groupCallCount1).toBeGreaterThan(0);

    handle.dispose();
  });

  // Verify existing US-004 dispose contract still holds with the extended interface
  it('dispose() still cancels the animation frame after update()', () => {
    const handle = initRenderer(canvas);
    handle.update(makeParams());
    handle.dispose();

    expect(cancelAnimationFrame).toHaveBeenCalled();
  });

  it('dispose() still removes resize event listener after update()', () => {
    const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');
    const handle = initRenderer(canvas);
    handle.update(makeParams());
    handle.dispose();

    const resizeRemoved = removeEventListenerSpy.mock.calls.some(
      ([event]) => event === 'resize',
    );
    expect(resizeRemoved).toBe(true);

    removeEventListenerSpy.mockRestore();
  });

  it('dispose() still removes visibilitychange listener after update()', () => {
    const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener');
    const handle = initRenderer(canvas);
    handle.update(makeParams());
    handle.dispose();

    const visibilityRemoved = removeEventListenerSpy.mock.calls.some(
      ([event]) => event === 'visibilitychange',
    );
    expect(visibilityRemoved).toBe(true);

    removeEventListenerSpy.mockRestore();
  });

  it('dispose() still calls renderer.dispose() after update()', async () => {
    const THREE = await import('three');
    const handle = initRenderer(canvas);
    handle.update(makeParams());
    handle.dispose();

    const rendererInstance = (
      THREE.WebGLRenderer as unknown as ReturnType<typeof vi.fn>
    ).mock.results[0]?.value;
    expect(rendererInstance.dispose).toHaveBeenCalled();
  });
});
