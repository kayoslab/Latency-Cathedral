/**
 * Ruin modifiers for degraded connections (US-012).
 *
 * Applies fracture distortion, section collapse, and debris generation
 * to an existing cathedral Group based on SceneParams.
 *
 * RUIN_THRESHOLD = 0.15 rationale:
 *  - Fast preset: fracture≈0.007, ruinLevel≈0.009 → well below → no-op
 *  - Default makeParams: fracture=0.1, ruinLevel=0.1 → below → no-op
 *  - Mixed preset: fracture≈0.24, ruinLevel≈0.19 → above → visible ruin
 */
import {
  Group,
  Mesh,
  BoxGeometry,
  MeshStandardMaterial,
} from 'three';
import type { SceneParams } from '../domain/types';

const RUIN_THRESHOLD = 0.15;
const MAX_DEBRIS = 12;
const MAX_POSITION_OFFSET = 0.3;
const MAX_ROTATION_OFFSET = 0.15;

/** Deterministic pseudo-random from seed, returns value in [0, 1). */
function seededRandom(seed: number): number {
  const x = Math.sin(seed * 9301 + 49297) * 49297;
  return x - Math.floor(x);
}

/** Ensure a value is finite, defaulting to 0 if not. */
function safeFinite(v: number): number {
  return Number.isFinite(v) ? v : 0;
}

function applyFractureDistortion(group: Group, fracture: number): void {
  if (fracture < RUIN_THRESHOLD) return;

  const effective = (fracture - RUIN_THRESHOLD) / (1 - RUIN_THRESHOLD);
  const children = group.children;

  for (let i = 0; i < children.length; i++) {
    const child = children[i];
    if (!(child as Mesh).isMesh) continue;
    const mesh = child as Mesh;

    const dx = safeFinite((seededRandom(i * 3 + 1) * 2 - 1) * MAX_POSITION_OFFSET * effective);
    const dy = safeFinite((seededRandom(i * 3 + 2) * 2 - 1) * MAX_POSITION_OFFSET * effective);
    const dz = safeFinite((seededRandom(i * 3 + 3) * 2 - 1) * MAX_POSITION_OFFSET * effective);

    mesh.position.x = safeFinite(mesh.position.x + dx);
    mesh.position.y = safeFinite(mesh.position.y + dy);
    mesh.position.z = safeFinite(mesh.position.z + dz);

    mesh.rotation.x = safeFinite(mesh.rotation.x + (seededRandom(i * 3 + 4) * 2 - 1) * MAX_ROTATION_OFFSET * effective);
    mesh.rotation.y = safeFinite(mesh.rotation.y + (seededRandom(i * 3 + 5) * 2 - 1) * MAX_ROTATION_OFFSET * effective);
    mesh.rotation.z = safeFinite(mesh.rotation.z + (seededRandom(i * 3 + 6) * 2 - 1) * MAX_ROTATION_OFFSET * effective);
  }
}

function applyCollapse(group: Group, ruinLevel: number): void {
  if (ruinLevel < 0.5) return;

  const collapseAmount = (ruinLevel - 0.5) / 0.5; // 0 at 0.5, 1 at 1.0
  const children = group.children;

  for (let i = 1; i < children.length; i++) {
    const child = children[i];
    if (!(child as Mesh).isMesh) continue;
    const mesh = child as Mesh;

    const factor = seededRandom(i * 7 + 13) * 0.6 * collapseAmount;
    mesh.scale.y = safeFinite(1 - factor);
  }
}

function applyRuinDebris(group: Group, ruinLevel: number): void {
  if (ruinLevel < RUIN_THRESHOLD) return;

  const effective = (ruinLevel - RUIN_THRESHOLD) / (1 - RUIN_THRESHOLD);
  const debrisCount = Math.floor(effective * MAX_DEBRIS);

  for (let i = 0; i < debrisCount; i++) {
    const geo = new BoxGeometry(0.15, 0.1, 0.15);
    const mat = new MeshStandardMaterial({ color: 0x444455 });
    const mesh = new Mesh(geo, mat);

    const px = safeFinite((seededRandom(i * 5 + 100) * 2 - 1) * 2);
    const py = safeFinite(seededRandom(i * 5 + 101) * 0.5);
    const pz = safeFinite((seededRandom(i * 5 + 102) * 2 - 1) * 2);
    mesh.position.set(px, py, pz);

    mesh.rotation.x = safeFinite(seededRandom(i * 5 + 103) * Math.PI);
    mesh.rotation.y = safeFinite(seededRandom(i * 5 + 104) * Math.PI);
    mesh.rotation.z = safeFinite(seededRandom(i * 5 + 105) * Math.PI);

    group.add(mesh);
  }
}

export function applyRuinModifiers(group: Group, params: SceneParams): Group {
  applyFractureDistortion(group, params.fracture);
  applyCollapse(group, params.ruinLevel);
  applyRuinDebris(group, params.ruinLevel);
  return group;
}
