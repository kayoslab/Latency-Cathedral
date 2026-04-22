// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { SceneParams } from '../../src/domain/types';

// Mock three.js — extended to track position/rotation/scale mutations for ruin modifier testing.
vi.mock('three', () => {
  const Color = vi.fn(function Color() {});

  const BoxGeometry = vi.fn(function BoxGeometry(
    _w?: number, // eslint-disable-line @typescript-eslint/no-unused-vars
    _h?: number, // eslint-disable-line @typescript-eslint/no-unused-vars
    _d?: number, // eslint-disable-line @typescript-eslint/no-unused-vars
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
      position: { set: vi.fn(function set(this: { x: number; y: number; z: number }, x: number, y: number, z: number) { this.x = x; this.y = y; this.z = z; }), x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      scale: { x: 1, y: 1, z: 1 },
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

/** Build a mock group with 4 children (matching cathedral structure: base + nave + 2 towers). */
async function buildBaseGroup() {
  const THREE = await import('three');
  const group = new THREE.Group();
  for (let i = 0; i < 4; i++) {
    const geo = new THREE.BoxGeometry(1, 1, 1);
    const mat = new THREE.MeshStandardMaterial();
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(i * 0.5, i * 0.3, 0);
    group.add(mesh);
  }
  return group;
}

type MeshLike = {
  isMesh: boolean;
  position: { x: number; y: number; z: number; set: ReturnType<typeof vi.fn> };
  rotation: { x: number; y: number; z: number };
  scale: { x: number; y: number; z: number };
  geometry: { dispose: ReturnType<typeof vi.fn>; type: string };
  material: { dispose: ReturnType<typeof vi.fn>; type: string };
};

describe('US-012: applyRuinModifiers', () => {
  let applyRuinModifiers: typeof import('../../src/render/ruinModifiers').applyRuinModifiers;

  beforeEach(async () => {
    vi.resetModules();
    const mod = await import('../../src/render/ruinModifiers');
    applyRuinModifiers = mod.applyRuinModifiers;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // --- AC: Fast state remains mostly clean ---

  it('no-op when fracture=0 and ruinLevel=0 — group unchanged', async () => {
    const group = await buildBaseGroup();
    const childCountBefore = group.children.length;

    applyRuinModifiers(group, makeParams({ fracture: 0, ruinLevel: 0 }));

    expect(group.children.length).toBe(childCountBefore);
  });

  it('no-op when fracture=0.1 and ruinLevel=0.1 (makeParams defaults) — below RUIN_THRESHOLD', async () => {
    const group = await buildBaseGroup();
    const childCountBefore = group.children.length;

    // Record original positions
    const originalPositions = group.children.map((c) => {
      const m = c as unknown as MeshLike;
      return { x: m.position.x, y: m.position.y, z: m.position.z };
    });

    applyRuinModifiers(group, makeParams()); // defaults: fracture=0.1, ruinLevel=0.1

    // Same number of children
    expect(group.children.length).toBe(childCountBefore);

    // Positions unchanged
    group.children.forEach((c, i) => {
      const m = c as unknown as MeshLike;
      expect(m.position.x).toBe(originalPositions[i].x);
      expect(m.position.y).toBe(originalPositions[i].y);
      expect(m.position.z).toBe(originalPositions[i].z);
    });
  });

  it('no-op for fast preset values (fracture≈0.007, ruinLevel≈0.009)', async () => {
    const group = await buildBaseGroup();
    const childCountBefore = group.children.length;

    applyRuinModifiers(group, makeParams({ fracture: 0.007, ruinLevel: 0.009 }));

    expect(group.children.length).toBe(childCountBefore);
  });

  // --- AC: Sections can collapse or distort ---

  it('fracture=0.8 distorts mesh positions/rotations from original values', async () => {
    const group = await buildBaseGroup();

    const originalPositions = group.children.map((c) => {
      const m = c as unknown as MeshLike;
      return { x: m.position.x, y: m.position.y, z: m.position.z };
    });
    const originalRotations = group.children.map((c) => {
      const m = c as unknown as MeshLike;
      return { x: m.rotation.x, y: m.rotation.y, z: m.rotation.z };
    });

    applyRuinModifiers(group, makeParams({ fracture: 0.8, ruinLevel: 0 }));

    // At least some meshes should be displaced or rotated
    let anyPositionChanged = false;
    let anyRotationChanged = false;

    group.children.forEach((c, i) => {
      const m = c as unknown as MeshLike;
      if (
        m.position.x !== originalPositions[i].x ||
        m.position.y !== originalPositions[i].y ||
        m.position.z !== originalPositions[i].z
      ) {
        anyPositionChanged = true;
      }
      if (
        m.rotation.x !== originalRotations[i].x ||
        m.rotation.y !== originalRotations[i].y ||
        m.rotation.z !== originalRotations[i].z
      ) {
        anyRotationChanged = true;
      }
    });

    expect(anyPositionChanged).toBe(true);
    expect(anyRotationChanged).toBe(true);
  });

  it('collapse: ruinLevel=0.6 reduces Y-scale on at least one non-base mesh', async () => {
    const group = await buildBaseGroup();

    applyRuinModifiers(group, makeParams({ fracture: 0, ruinLevel: 0.6 }));

    // Non-base meshes are index > 0
    const nonBaseMeshes = group.children.slice(1) as unknown as MeshLike[];
    const anyCollapsed = nonBaseMeshes.some((m) => m.scale.y < 1);

    expect(anyCollapsed).toBe(true);
  });

  // --- AC: Debris density increases on poor state ---

  it('ruinLevel=0.8 adds debris children to the group', async () => {
    const group = await buildBaseGroup();
    const childCountBefore = group.children.length;

    applyRuinModifiers(group, makeParams({ fracture: 0, ruinLevel: 0.8 }));

    expect(group.children.length).toBeGreaterThan(childCountBefore);
  });

  it('ruinLevel=1.0 produces exactly MAX_DEBRIS (12) additional children', async () => {
    const group = await buildBaseGroup();
    const childCountBefore = group.children.length;

    applyRuinModifiers(group, makeParams({ fracture: 0, ruinLevel: 1.0 }));

    expect(group.children.length).toBe(childCountBefore + 12);
  });

  // --- AC: Transforms remain valid numbers ---

  it('all transforms produce finite numbers at fracture=1, ruinLevel=1', async () => {
    const group = await buildBaseGroup();

    applyRuinModifiers(group, makeParams({ fracture: 1, ruinLevel: 1 }));

    for (const child of group.children) {
      const m = child as unknown as MeshLike;
      expect(Number.isFinite(m.position.x)).toBe(true);
      expect(Number.isFinite(m.position.y)).toBe(true);
      expect(Number.isFinite(m.position.z)).toBe(true);
      expect(Number.isFinite(m.rotation.x)).toBe(true);
      expect(Number.isFinite(m.rotation.y)).toBe(true);
      expect(Number.isFinite(m.rotation.z)).toBe(true);
      expect(Number.isFinite(m.scale.x)).toBe(true);
      expect(Number.isFinite(m.scale.y)).toBe(true);
      expect(Number.isFinite(m.scale.z)).toBe(true);
    }
  });

  it('all transforms produce finite numbers at boundary fracture=0.15, ruinLevel=0.15', async () => {
    const group = await buildBaseGroup();

    applyRuinModifiers(group, makeParams({ fracture: 0.15, ruinLevel: 0.15 }));

    for (const child of group.children) {
      const m = child as unknown as MeshLike;
      expect(Number.isFinite(m.position.x)).toBe(true);
      expect(Number.isFinite(m.position.y)).toBe(true);
      expect(Number.isFinite(m.position.z)).toBe(true);
      expect(Number.isFinite(m.rotation.x)).toBe(true);
      expect(Number.isFinite(m.rotation.y)).toBe(true);
      expect(Number.isFinite(m.rotation.z)).toBe(true);
      expect(Number.isFinite(m.scale.x)).toBe(true);
      expect(Number.isFinite(m.scale.y)).toBe(true);
      expect(Number.isFinite(m.scale.z)).toBe(true);
    }
  });

  // --- Determinism ---

  it('identical params produce identical transforms (deterministic)', async () => {
    const params = makeParams({ fracture: 0.7, ruinLevel: 0.8 });

    const group1 = await buildBaseGroup();
    applyRuinModifiers(group1, params);

    const group2 = await buildBaseGroup();
    applyRuinModifiers(group2, params);

    expect(group1.children.length).toBe(group2.children.length);

    for (let i = 0; i < group1.children.length; i++) {
      const m1 = group1.children[i] as unknown as MeshLike;
      const m2 = group2.children[i] as unknown as MeshLike;
      expect(m1.position.x).toBe(m2.position.x);
      expect(m1.position.y).toBe(m2.position.y);
      expect(m1.position.z).toBe(m2.position.z);
      expect(m1.rotation.x).toBe(m2.rotation.x);
      expect(m1.rotation.y).toBe(m2.rotation.y);
      expect(m1.rotation.z).toBe(m2.rotation.z);
      expect(m1.scale.x).toBe(m2.scale.x);
      expect(m1.scale.y).toBe(m2.scale.y);
      expect(m1.scale.z).toBe(m2.scale.z);
    }
  });

  // --- Proportionality ---

  it('higher fracture produces larger distortion offsets', async () => {
    const groupLow = await buildBaseGroup();
    applyRuinModifiers(groupLow, makeParams({ fracture: 0.3, ruinLevel: 0 }));

    const groupHigh = await buildBaseGroup();
    applyRuinModifiers(groupHigh, makeParams({ fracture: 0.9, ruinLevel: 0 }));

    // Sum absolute position deltas for non-base meshes
    const sumDeltas = (group: Awaited<ReturnType<typeof buildBaseGroup>>) => {
      let total = 0;
      group.children.forEach((c, i) => {
        if (i === 0) return; // skip base
        const m = c as unknown as MeshLike;
        total += Math.abs(m.position.x - i * 0.5);
        total += Math.abs(m.position.y - i * 0.3);
        total += Math.abs(m.position.z - 0);
      });
      return total;
    };

    expect(sumDeltas(groupHigh)).toBeGreaterThan(sumDeltas(groupLow));
  });

  it('higher ruinLevel produces more debris', async () => {
    const groupLow = await buildBaseGroup();
    applyRuinModifiers(groupLow, makeParams({ fracture: 0, ruinLevel: 0.3 }));

    const groupHigh = await buildBaseGroup();
    applyRuinModifiers(groupHigh, makeParams({ fracture: 0, ruinLevel: 0.9 }));

    expect(groupHigh.children.length).toBeGreaterThan(groupLow.children.length);
  });
});
