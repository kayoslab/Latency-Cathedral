// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { SceneParams } from '../../src/domain/types';

// Mock three.js — jsdom has no WebGL context.
vi.mock('three', () => {
  const Color = vi.fn(function Color() {});

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
      geometry,
      material,
      position: { set: vi.fn(function set(this: { x: number; y: number; z: number }, x: number, y: number, z: number) { this.x = x; this.y = y; this.z = z; }), x: 0, y: 0, z: 0 },
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
    return {
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      quadraticCurveTo: vi.fn(),
      closePath: vi.fn(),
    };
  });

  const Vector3 = vi.fn(function Vector3(x = 0, y = 0, z = 0) {
    return { x, y, z };
  });

  const QuadraticBezierCurve3 = vi.fn(function QuadraticBezierCurve3() {
    return {};
  });

  const DoubleSide = 2;

  return {
    Color,
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
    QuadraticBezierCurve3,
    DoubleSide,
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

  it('group contains many children (ground, base, nave, towers, buttresses, windows, etc.)', () => {
    const group = buildCathedralGeometry(makeParams());

    // Full gothic cathedral: ground + base + nave + transept + towers + spires +
    // buttresses + piers + windows + rose window + columns + apse = many meshes
    expect(group.children.length).toBeGreaterThanOrEqual(20);
  });

  it('all children are Mesh instances with geometry and material', () => {
    const group = buildCathedralGeometry(makeParams());

    for (const child of group.children) {
      const mesh = child as unknown as { isMesh: boolean; geometry: unknown; material: unknown };
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

describe('US-012: buildCathedralGeometry with ruin modifiers', () => {
  let buildCathedralGeometry: typeof import('../../src/render/buildCathedralGeometry').buildCathedralGeometry;

  beforeEach(async () => {
    vi.resetModules();
    const mod = await import('../../src/render/buildCathedralGeometry');
    buildCathedralGeometry = mod.buildCathedralGeometry;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('default makeParams (fracture=0.1, ruinLevel=0.1) produces clean cathedral — no debris added', () => {
    const cleanGroup = buildCathedralGeometry(makeParams({ fracture: 0, ruinLevel: 0 }));
    const defaultGroup = buildCathedralGeometry(makeParams());

    // Below RUIN_THRESHOLD so no debris added — same child count as clean
    expect(defaultGroup.children.length).toBe(cleanGroup.children.length);
  });

  it('fast preset values (fracture=0.007, ruinLevel=0.009) produce clean cathedral — no debris', () => {
    const cleanGroup = buildCathedralGeometry(makeParams({ fracture: 0, ruinLevel: 0 }));
    const fastGroup = buildCathedralGeometry(makeParams({ fracture: 0.007, ruinLevel: 0.009 }));

    expect(fastGroup.children.length).toBe(cleanGroup.children.length);
  });

  it('poor-like values (fracture=0.8, ruinLevel=0.8) produce same base geometry — ruin applied separately', () => {
    const cleanGroup = buildCathedralGeometry(makeParams({ fracture: 0, ruinLevel: 0 }));
    const ruinGroup = buildCathedralGeometry(makeParams({ fracture: 0.8, ruinLevel: 0.8 }));

    // Ruin modifiers are now decoupled from buildCathedralGeometry — same base mesh count
    expect(ruinGroup.children.length).toBe(cleanGroup.children.length);
  });

  it('poor-like values produce same base positions — ruin applied separately', () => {
    // Build clean cathedral for reference
    const cleanGroup = buildCathedralGeometry(makeParams({ fracture: 0, ruinLevel: 0 }));
    const cleanPositions = cleanGroup.children.map((c) => {
      const m = c as { position: { x: number; y: number; z: number } };
      return { x: m.position.x, y: m.position.y, z: m.position.z };
    });

    // Build with ruin params — ruin modifiers are now decoupled
    const ruinGroup = buildCathedralGeometry(makeParams({ fracture: 0.8, ruinLevel: 0.9 }));

    // Positions should be identical since ruin modifiers are applied separately
    let allSame = true;
    for (let i = 1; i < Math.min(6, ruinGroup.children.length); i++) {
      const m = ruinGroup.children[i] as { position: { x: number; y: number; z: number } };
      if (
        m.position.x !== cleanPositions[i].x ||
        m.position.y !== cleanPositions[i].y ||
        m.position.z !== cleanPositions[i].z
      ) {
        allSame = false;
        break;
      }
    }

    expect(allSame).toBe(true);
  });
});
