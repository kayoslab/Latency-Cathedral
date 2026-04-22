// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { SceneParams } from '../../src/domain/types';

// Track dispose calls to verify no leaked meshes
const disposedGeometries: unknown[] = [];
const disposedMaterials: unknown[] = [];

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
    return { position: { set: vi.fn() }, isLight: true };
  });

  const BoxGeometry = vi.fn(function BoxGeometry() {
    return {
      dispose: vi.fn(() => disposedGeometries.push(this)),
      type: 'BoxGeometry',
    };
  });

  const CylinderGeometry = vi.fn(function CylinderGeometry() {
    return {
      dispose: vi.fn(() => disposedGeometries.push(this)),
      type: 'CylinderGeometry',
    };
  });

  const MeshStandardMaterial = vi.fn(function MeshStandardMaterial() {
    return {
      dispose: vi.fn(() => disposedMaterials.push(this)),
      type: 'MeshStandardMaterial',
    };
  });

  const Mesh = vi.fn(function Mesh(geometry: unknown, material: unknown) {
    return {
      geometry,
      material,
      position: { set: vi.fn(), x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      isMesh: true,
    };
  });

  const Group = vi.fn(function Group() {
    const groupChildren: unknown[] = [];
    return {
      add: vi.fn((...objs: unknown[]) => {
        groupChildren.push(...objs);
        (this as { children: unknown[] }).children = groupChildren;
      }),
      children: groupChildren,
      rotation: { x: 0, y: 0, z: 0 },
      isGroup: true,
      traverse: vi.fn(function (this: { children: unknown[] }, cb: (obj: unknown) => void) {
        cb(this);
        for (const child of this.children ?? groupChildren) {
          cb(child);
        }
      }),
      removeFromParent: vi.fn(),
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
    CylinderGeometry,
    MeshStandardMaterial,
    Mesh,
    Group,
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

    // First call — builds cathedral
    handle.update(params);
    const groupCallCount1 = (THREE.Group as unknown as ReturnType<typeof vi.fn>).mock.calls.length;

    // Second call with identical params — should NOT rebuild
    handle.update({ ...params });
    const groupCallCount2 = (THREE.Group as unknown as ReturnType<typeof vi.fn>).mock.calls.length;

    expect(groupCallCount2).toBe(groupCallCount1);

    handle.dispose();
  });

  it('update() with different params triggers rebuild', async () => {
    const THREE = await import('three');
    const handle = initRenderer(canvas);

    handle.update(makeParams({ height: 0.5 }));
    const groupCallCount1 = (THREE.Group as unknown as ReturnType<typeof vi.fn>).mock.calls.length;

    handle.update(makeParams({ height: 0.9 }));
    const groupCallCount2 = (THREE.Group as unknown as ReturnType<typeof vi.fn>).mock.calls.length;

    expect(groupCallCount2).toBeGreaterThan(groupCallCount1);

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
