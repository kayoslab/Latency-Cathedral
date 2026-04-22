/**
 * Tiered architectural weathering system.
 *
 * Uses mesh.userData.tier tags to apply realistic degradation:
 * - 0.0–0.2: pristine
 * - 0.2–0.4: weathered stone, slight tilts
 * - 0.4–0.6: missing pinnacles/glass, moss tint, debris
 * - 0.6–0.8: collapsed roof/walls, leaning structures, heavy debris
 * - 0.8–1.0: post-apocalyptic ruins, only lower walls remain
 */
import {
  Group,
  Mesh,
  BoxGeometry,
  MeshStandardMaterial,
  Color,
} from 'three';
import type { SceneParams } from '../domain/types';

type Tier = 'ground' | 'structural' | 'upper-wall' | 'roof' | 'glass' | 'pinnacle' | 'spire' | 'detail' | 'column';

// At what ruinLevel each tier starts being REMOVED.
// Much higher thresholds — the cathedral always remains recognizable.
// Only decorative elements disappear at moderate ruin.
const TIER_THRESHOLDS: Record<Tier, number> = {
  ground: 1.1,       // never removed
  structural: 1.1,   // never removed — the walls always stand
  column: 1.1,       // columns always stand
  'upper-wall': 0.9, // only the very top walls crumble at extreme ruin
  roof: 0.85,        // roof starts failing only at heavy degradation
  glass: 0.5,        // windows break at moderate degradation
  detail: 0.4,       // moldings, tracery erode
  pinnacle: 0.3,     // pinnacles are fragile, go first
  spire: 0.8,        // spires survive a long time
};

// Weathered stone colors (progressively darker/dirtier)
const WEATHERED_STONE = new Color(0x706050);
const RUINED_STONE = new Color(0x3a3530);
const MOSS_TINT = new Color(0x3a4a30);

function srand(seed: number): number {
  const x = Math.sin(seed * 9301 + 49297) * 49297;
  return x - Math.floor(x);
}

function safeFinite(v: number): number {
  return Number.isFinite(v) ? v : 0;
}

/** Weathering: darken and roughen materials. */
function applyMaterialWeathering(group: Group, ruinLevel: number): void {
  if (ruinLevel < 0.15) return;

  const weatherAmount = Math.min((ruinLevel - 0.15) / 0.6, 1);

  group.traverse((obj) => {
    const mesh = obj as Mesh;
    if (!mesh.isMesh) return;
    const tier = mesh.userData.tier as Tier;
    if (tier === 'ground' || tier === 'glass') return;

    const mat = mesh.material as MeshStandardMaterial;
    if (!mat.color) return;

    // Clone material so we don't mutate shared instances
    const newMat = mat.clone();

    // Darken toward weathered stone
    const targetColor = weatherAmount > 0.6 ? RUINED_STONE : WEATHERED_STONE;
    newMat.color.lerp(targetColor, weatherAmount * 0.7);

    // Add moss tint on lower elements
    if (tier === 'structural' || tier === 'column' || tier === 'detail') {
      newMat.color.lerp(MOSS_TINT, weatherAmount * 0.2);
    }

    // Increase roughness (weathered stone is rougher)
    newMat.roughness = Math.min(newMat.roughness + weatherAmount * 0.15, 1.0);

    mesh.material = newMat;
  });
}

/** Structural degradation: hide, tilt, and collapse elements by tier. */
function applyStructuralDegradation(group: Group, ruinLevel: number, fracture: number, symmetry: number): void {
  if (ruinLevel < 0.15) return;

  const children = group.children;
  const asymmetry = 1 - symmetry; // higher = more asymmetric decay

  for (let i = 0; i < children.length; i++) {
    const mesh = children[i] as Mesh;
    if (!mesh.isMesh) continue;

    const tier = mesh.userData.tier as Tier;
    if (!tier || tier === 'ground') continue;

    const threshold = TIER_THRESHOLDS[tier] ?? 1;
    const seed = i * 7 + 13;
    const rand = srand(seed);

    // Asymmetric bias: elements on one side (x > 0) have lower effective threshold
    const sideBias = mesh.position.x > 0 ? asymmetry * 0.15 : 0;
    const effectiveThreshold = threshold - sideBias - rand * 0.15;

    if (ruinLevel > effectiveThreshold) {
      // Element is destroyed — hide it
      mesh.visible = false;
      continue;
    }

    // Element survives but may be damaged
    const damageLevel = Math.max(0, (ruinLevel - effectiveThreshold * 0.5) / (effectiveThreshold * 0.5));
    if (damageLevel <= 0) continue;

    // Tilt tall elements (spires, pinnacles, upper walls)
    if (tier === 'spire' || tier === 'pinnacle' || tier === 'upper-wall') {
      const tiltAmount = damageLevel * 0.15 * (1 + fracture * 0.5);
      mesh.rotation.x += safeFinite((srand(seed + 1) * 2 - 1) * tiltAmount);
      mesh.rotation.z += safeFinite((srand(seed + 2) * 2 - 1) * tiltAmount);
    }

    // Slight position displacement (more with higher fracture)
    if (fracture > 0.2 && damageLevel > 0.3) {
      const dispScale = damageLevel * fracture * 2.0;
      mesh.position.x += safeFinite((srand(seed + 3) * 2 - 1) * dispScale);
      mesh.position.y += safeFinite((srand(seed + 4) * 2 - 1) * dispScale * 0.3);
      mesh.position.z += safeFinite((srand(seed + 5) * 2 - 1) * dispScale);
    }

    // Partial collapse (scale down Y) for roofs and upper walls
    if ((tier === 'roof' || tier === 'upper-wall') && damageLevel > 0.4) {
      const collapseAmount = (damageLevel - 0.4) / 0.6;
      mesh.scale.y = safeFinite(1 - collapseAmount * 0.5 * srand(seed + 6));
      mesh.position.y -= collapseAmount * 2 * srand(seed + 7);
    }

    // Dim glass emissivity on damaged windows
    if (tier === 'glass' && damageLevel > 0.2) {
      const mat = mesh.material as MeshStandardMaterial;
      const newMat = mat.clone();
      newMat.emissiveIntensity *= (1 - damageLevel * 0.8);
      newMat.opacity = Math.max(0.3, newMat.opacity - damageLevel * 0.4);
      mesh.material = newMat;
    }
  }
}

/** Generate debris around the cathedral base. */
function applyDebris(group: Group, ruinLevel: number): void {
  if (ruinLevel < 0.25) return;

  const effective = (ruinLevel - 0.25) / 0.75;
  const debrisCount = Math.floor(effective * 24);

  // Debris material — dark weathered stone
  const debrisMat = new MeshStandardMaterial({
    color: WEATHERED_STONE,
    roughness: 0.9,
    metalness: 0.01,
  });

  for (let i = 0; i < debrisCount; i++) {
    // Varied sizes — some large blocks, some small rubble
    const isLarge = srand(i * 5 + 200) > 0.7;
    const scale = isLarge ? 1.5 + srand(i * 5 + 201) * 3.0 : 0.4 + srand(i * 5 + 201) * 1.0;
    const geo = new BoxGeometry(scale, scale * (0.3 + srand(i * 5 + 202) * 0.5), scale * (0.5 + srand(i * 5 + 203) * 0.5));
    const mesh = new Mesh(geo, debrisMat);

    // Scatter near the cathedral footprint
    const px = safeFinite((srand(i * 5 + 100) * 2 - 1) * 35);
    const py = safeFinite(srand(i * 5 + 101) * scale * 0.5);
    const pz = safeFinite((srand(i * 5 + 102) * 2 - 1) * 35);
    mesh.position.set(px, py + 1, pz);

    mesh.rotation.x = safeFinite(srand(i * 5 + 103) * 0.5);
    mesh.rotation.y = safeFinite(srand(i * 5 + 104) * Math.PI);
    mesh.rotation.z = safeFinite(srand(i * 5 + 105) * 0.5);

    mesh.castShadow = true;
    mesh.userData.tier = 'ground';
    group.add(mesh);
  }
}

export function applyRuinModifiers(group: Group, params: SceneParams): Group {
  applyMaterialWeathering(group, params.ruinLevel);
  applyStructuralDegradation(group, params.ruinLevel, params.fracture, params.symmetry);
  applyDebris(group, params.ruinLevel);
  return group;
}
