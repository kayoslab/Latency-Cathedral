// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { SceneParams } from '../../src/domain/types';

// Mock three.js — jsdom has no WebGL context.
vi.mock('three', () => {
  const Color = vi.fn(function Color() {});

  const BoxGeometry = vi.fn(function BoxGeometry(
    _w?: number,
    _h?: number,
    _d?: number,
  ) {
    return { dispose: vi.fn(), type: 'BoxGeometry' };
  });

  const CylinderGeometry = vi.fn(function CylinderGeometry() {
    return { dispose: vi.fn(), type: 'CylinderGeometry' };
  });

  const MeshStandardMaterial = vi.fn(function MeshStandardMaterial() {
    return { dispose: vi.fn(), type: 'MeshStandardMaterial' };
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

  const children: unknown[] = [];
  const Group = vi.fn(function Group() {
    return {
      add: vi.fn((...objs: unknown[]) => {
        children.push(...objs);
        (this as { children: unknown[] }).children = [
          ...(this as { children: unknown[] }).children,
          ...objs,
        ];
      }),
      children: [] as unknown[],
      rotation: { x: 0, y: 0, z: 0 },
      isGroup: true,
      traverse: vi.fn(function (this: { children: unknown[] }, cb: (obj: unknown) => void) {
        cb(this);
        for (const child of this.children) {
          cb(child);
        }
      }),
      removeFromParent: vi.fn(),
    };
  });

  return {
    Color,
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

describe('US-011: buildCathedralGeometry', () => {
  let buildCathedralGeometry: typeof import('../../src/render/buildCathedralGeometry').buildCathedralGeometry;

  beforeEach(async () => {
    vi.resetModules();
    const mod = await import('../../src/render/buildCathedralGeometry');
    buildCathedralGeometry = mod.buildCathedralGeometry;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns a THREE.Group', () => {
    const group = buildCathedralGeometry(makeParams());

    expect(group).toBeDefined();
    expect(group.isGroup).toBe(true);
  });

  it('group contains at least 3 children (base, nave, towers)', () => {
    const group = buildCathedralGeometry(makeParams());

    // Base + nave + at least 2 towers = 4, but spec says "at least 3"
    expect(group.children.length).toBeGreaterThanOrEqual(3);
  });

  it('all children are Mesh instances with geometry and material', () => {
    const group = buildCathedralGeometry(makeParams());

    for (const child of group.children) {
      const mesh = child as { isMesh: boolean; geometry: unknown; material: unknown };
      expect(mesh.isMesh).toBe(true);
      expect(mesh.geometry).toBeDefined();
      expect(mesh.material).toBeDefined();
    }
  });

  it('height=1/symmetry=1 produces taller geometry than height=0.2/symmetry=0.5', async () => {
    const THREE = await import('three');

    // Build with tall params
    (THREE.BoxGeometry as unknown as ReturnType<typeof vi.fn>).mockClear();
    (THREE.CylinderGeometry as unknown as ReturnType<typeof vi.fn>)?.mockClear?.();
    buildCathedralGeometry(makeParams({ height: 1, symmetry: 1 }));
    const tallCalls = (THREE.BoxGeometry as unknown as ReturnType<typeof vi.fn>).mock.calls.slice();
    const tallCylinderCalls = (THREE.CylinderGeometry as unknown as ReturnType<typeof vi.fn>)?.mock?.calls?.slice() ?? [];

    // Build with short params
    (THREE.BoxGeometry as unknown as ReturnType<typeof vi.fn>).mockClear();
    (THREE.CylinderGeometry as unknown as ReturnType<typeof vi.fn>)?.mockClear?.();
    buildCathedralGeometry(makeParams({ height: 0.2, symmetry: 0.5 }));
    const shortCalls = (THREE.BoxGeometry as unknown as ReturnType<typeof vi.fn>).mock.calls.slice();
    const shortCylinderCalls = (THREE.CylinderGeometry as unknown as ReturnType<typeof vi.fn>)?.mock?.calls?.slice() ?? [];

    // Extract height args (typically second argument to BoxGeometry or CylinderGeometry)
    // At least one geometry constructor should have a larger height dimension for tall params
    const allTallArgs = [...tallCalls, ...tallCylinderCalls];
    const allShortArgs = [...shortCalls, ...shortCylinderCalls];

    // Sum up all height-like arguments (second positional arg for BoxGeometry)
    const sumHeight = (calls: unknown[][]) =>
      calls.reduce((sum, args) => {
        // BoxGeometry(w, h, d) — h is index 1
        // CylinderGeometry(rTop, rBot, h) — h is index 2
        const h = typeof args[1] === 'number' ? args[1] : 0;
        return sum + h;
      }, 0);

    expect(sumHeight(allTallArgs)).toBeGreaterThan(sumHeight(allShortArgs));
  });

  it('rebuilding with different params produces a new group (not mutated)', () => {
    const group1 = buildCathedralGeometry(makeParams({ height: 0.5 }));
    const group2 = buildCathedralGeometry(makeParams({ height: 0.9 }));

    expect(group1).not.toBe(group2);
  });
});

describe('US-011: sceneParamsChanged', () => {
  let sceneParamsChanged: typeof import('../../src/render/sceneParamsChanged').sceneParamsChanged;

  beforeEach(async () => {
    vi.resetModules();
    const mod = await import('../../src/render/sceneParamsChanged');
    sceneParamsChanged = mod.sceneParamsChanged;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns false for identical params', () => {
    const a = makeParams();
    const b = makeParams();

    expect(sceneParamsChanged(a, b)).toBe(false);
  });

  it('returns true when height differs', () => {
    const a = makeParams({ height: 0.5 });
    const b = makeParams({ height: 0.6 });

    expect(sceneParamsChanged(a, b)).toBe(true);
  });

  it('returns true when symmetry differs', () => {
    const a = makeParams({ symmetry: 0.5 });
    const b = makeParams({ symmetry: 0.9 });

    expect(sceneParamsChanged(a, b)).toBe(true);
  });

  it('returns true when fracture differs', () => {
    const a = makeParams({ fracture: 0.0 });
    const b = makeParams({ fracture: 0.5 });

    expect(sceneParamsChanged(a, b)).toBe(true);
  });

  it('returns true when fog differs', () => {
    const a = makeParams({ fog: 0.1 });
    const b = makeParams({ fog: 0.9 });

    expect(sceneParamsChanged(a, b)).toBe(true);
  });

  it('returns true when lightIntensity differs', () => {
    const a = makeParams({ lightIntensity: 0.3 });
    const b = makeParams({ lightIntensity: 0.7 });

    expect(sceneParamsChanged(a, b)).toBe(true);
  });

  it('returns true when ruinLevel differs', () => {
    const a = makeParams({ ruinLevel: 0.0 });
    const b = makeParams({ ruinLevel: 1.0 });

    expect(sceneParamsChanged(a, b)).toBe(true);
  });
});
