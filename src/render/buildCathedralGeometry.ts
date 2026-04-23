/**
 * Gothic cathedral — complete enclosed building.
 *
 * Architecture: continuous wall circuits with window openings,
 * connected roofs, seamless transitions between nave/aisles/transept/apse.
 *
 * Plan: cruciform layout with west towers, apsidal east end.
 * Cross-section: nave + side aisles + flying buttresses.
 */
import {
  Group, Mesh, BoxGeometry, ConeGeometry, CylinderGeometry,
  PlaneGeometry, TorusGeometry, RingGeometry, Shape, ExtrudeGeometry,
  MeshStandardMaterial, DoubleSide,
} from 'three';
import type { Texture } from 'three';
import type { SceneParams } from '../domain/types';

let stoneColor: Texture | null = null;
let stoneNormal: Texture | null = null;
let stoneRoughness: Texture | null = null;
let roofNormal: Texture | null = null;

export function setTextures(sc: Texture, sn: Texture, sr: Texture, rn: Texture): void {
  stoneColor = sc; stoneNormal = sn; stoneRoughness = sr; roofNormal = rn;
}

// ── Materials ──
function stM(c = 0xffffff): MeshStandardMaterial {
  return new MeshStandardMaterial({
    color: c,
    map: stoneColor,
    normalMap: stoneNormal,
    normalScale: { x: 0.7, y: 0.7 } as never,
    roughnessMap: stoneRoughness,
    roughness: 0.85,
    metalness: 0.02,
  });
}
function dkM(): MeshStandardMaterial { return stM(0xc0b8b0); }
function rfM(): MeshStandardMaterial {
  return new MeshStandardMaterial({ color: 0x3a4550, roughness: 0.55, metalness: 0.15, normalMap: roofNormal, normalScale: { x: 0.4, y: 0.4 } as never });
}
// Stained glass — varies by bay index for visual richness
const GLASS_HUES = [0xffcc66, 0x66aaff, 0xff8844, 0xaa66ff, 0x44ddaa, 0xffdd44, 0xff6688, 0x88ccff];
function glM(h: number, bayIdx = 0): MeshStandardMaterial {
  const hue = GLASS_HUES[bayIdx % GLASS_HUES.length];
  return new MeshStandardMaterial({ color: 0x060310, emissive: hue, emissiveIntensity: 0.4 + h * 0.7, transparent: true, opacity: 0.88, side: DoubleSide });
}
function rgM(h: number): MeshStandardMaterial {
  return new MeshStandardMaterial({ color: 0x180610, emissive: 0xff3322, emissiveIntensity: 0.7 + h * 1.0, side: DoubleSide });
}
// Blue-tinted glass for clerestory
function clGlM(h: number): MeshStandardMaterial {
  return new MeshStandardMaterial({ color: 0x040812, emissive: 0x6688ff, emissiveIntensity: 0.3 + h * 0.5, transparent: true, opacity: 0.85, side: DoubleSide });
}

type Tier = 'ground' | 'structural' | 'upper-wall' | 'roof' | 'glass' | 'pinnacle' | 'spire' | 'detail' | 'column';

function bx(g: Group, w: number, h: number, d: number, x: number, y: number, z: number, m: MeshStandardMaterial, t: Tier, shadow = true): Mesh {
  const mesh = new Mesh(new BoxGeometry(w, h, d), m);
  mesh.position.set(x, y, z); if (shadow) { mesh.castShadow = true; mesh.receiveShadow = true; }
  mesh.userData.tier = t; g.add(mesh); return mesh;
}

function cn(g: Group, r: number, h: number, s: number, x: number, y: number, z: number, m: MeshStandardMaterial, t: Tier, ry = 0): void {
  const mesh = new Mesh(new ConeGeometry(r, h, s), m);
  mesh.position.set(x, y, z); mesh.rotation.y = ry; mesh.castShadow = true; mesh.userData.tier = t; g.add(mesh);
}

function cyl(g: Group, rt: number, rb: number, h: number, s: number, x: number, y: number, z: number, m: MeshStandardMaterial, t: Tier): void {
  const mesh = new Mesh(new CylinderGeometry(rt, rb, h, s), m);
  mesh.position.set(x, y, z); mesh.castShadow = true; mesh.userData.tier = t; g.add(mesh);
}

function pin(g: Group, x: number, y: number, z: number, h: number): void {
  bx(g, h * 0.3, 0.2, h * 0.3, x, y, z, dkM(), 'pinnacle');
  cn(g, h * 0.12, h, 4, x, y + h / 2 + 0.1, z, dkM(), 'pinnacle', Math.PI / 4);
}

function makeRoofGeo(baseW: number, rise: number, length: number, thick: number): ExtrudeGeometry {
  const shape = new Shape();
  const hw = baseW / 2;
  shape.moveTo(-hw - 0.2, 0);
  shape.lineTo(0, rise);
  shape.lineTo(hw + 0.2, 0);
  shape.lineTo(hw, -thick);
  shape.lineTo(0, rise - thick * 1.5);
  shape.lineTo(-hw, -thick);
  shape.closePath();
  return new ExtrudeGeometry(shape, { depth: length, bevelEnabled: false });
}

// ════════════════════════════════════════════════
export function buildCathedralGeometry(params: SceneParams): Group {
  const { height, symmetry } = params;
  const g = new Group();

  // ── Dimensions ──
  const W = 1.2;
  const nH = 20 + height * 25;
  const nW = 12;
  const nD = 80;
  const aW = 7;
  const tW = 8;
  const tH = 30 + height * 35;
  const sH = 12 + height * 16;
  const bays = 8;
  const bayD = nD / bays;
  const aH = nH * 0.48;
  const roofRise = nW * 0.4;

  // half-widths for clarity
  const nHW = nW / 2;             // nave half-width (inner)
  const nWallX = nHW + W;         // nave outer wall face X
  const aOutX = nWallX + aW;      // aisle outer wall inner face X
  const aWallX = aOutX + W;       // aisle outer wall outer face X

  // Z extents
  const nFront = -nD / 2;         // nave front (west)
  const nBack = nD / 2;           // nave back (east)

  // ── Ground ──
  const gnd = new Mesh(new PlaneGeometry(1200, 1200), new MeshStandardMaterial({ color: 0xc5c0b8, roughness: 0.95 }));
  gnd.rotation.x = -Math.PI / 2; gnd.receiveShadow = true; gnd.userData.tier = 'ground'; g.add(gnd);

  // ── Foundation ──
  bx(g, aWallX * 2 + 2, 0.8, nD + 4, 0, 0.4, 0, dkM(), 'structural');

  // ════════════════════════════════════════
  // CONTINUOUS NAVE WALLS (two long walls with window openings)
  //
  // Each wall is built bay-by-bay but with no gaps:
  // Each bay = pier section (solid) + window section (3 horizontal strips)
  // ════════════════════════════════════════
  const winH = nH * 0.30;
  const winBot = nH * 0.40;
  const clH = nH * 0.09;
  const clBot = nH * 0.78;

  for (const side of [-1, 1] as const) {
    const wallCX = side * (nHW + W / 2); // wall center X

    for (let i = 0; i < bays; i++) {
      const bayStart = nFront + bayD * i;
      const pierEnd = bayStart + bayD * 0.25;
      const winStart = pierEnd;
      const winEnd = bayStart + bayD;
      const pierD = pierEnd - bayStart;
      const winBayD = winEnd - winStart;
      const pierCZ = bayStart + pierD / 2;
      const winCZ = winStart + winBayD / 2;

      // PIER: full-height solid wall section
      bx(g, W, nH, pierD, wallCX, nH / 2, pierCZ, stM(), 'structural');
      // Pilaster (decorative inner projection)
      bx(g, 0.4, nH * 0.85, 0.6, wallCX - side * (W / 2 + 0.2), nH * 0.425, pierCZ, stM(), 'structural');
      // Pier pinnacle
      pin(g, wallCX + side * 0.15, nH + 0.2, pierCZ, 2.0);

      // WINDOW BAY: three horizontal wall strips with glass between
      // Strip 1: below main window
      bx(g, W, winBot, winBayD, wallCX, winBot / 2, winCZ, stM(), 'structural');
      // Strip 2: between main window and clerestory
      const gap = clBot - (winBot + winH);
      if (gap > 0) bx(g, W, gap, winBayD, wallCX, winBot + winH + gap / 2, winCZ, stM(), 'upper-wall');
      // Strip 3: above clerestory to wall top
      const topH = nH - (clBot + clH);
      if (topH > 0) bx(g, W, topH, winBayD, wallCX, clBot + clH + topH / 2, winCZ, stM(), 'upper-wall');

      // ── Main window ──
      const glassX = wallCX - side * W * 0.4;     // deep recess
      const mullionX = wallCX - side * W * 0.15;  // tracery layer
      const glassZ = winCZ;
      const glassW = winBayD;     // fill entire opening width
      const glassH = winH;        // fill entire opening height
      const gBot = winBot;
      const gCY = gBot + glassH / 2;

      // Glass panel (colored per bay)
      bx(g, 0.08, glassH, glassW, glassX, gCY, glassZ, glM(height, i), 'glass', false);

      // Tracery sits between glass and wall face — all at mullionX, no overlapping pieces
      // 3 vertical mullions (full height)
      for (const frac of [-0.25, 0, 0.25]) {
        bx(g, 0.14, glassH, 0.14, mullionX, gCY, glassZ + glassW * frac, dkM(), 'detail');
      }
      // 2 horizontal transoms (stop short of window edges to avoid overlap with wall)
      const tranW = glassW * 0.88;
      bx(g, 0.14, 0.14, tranW, mullionX, gBot + glassH * 0.55, glassZ, dkM(), 'detail');
      bx(g, 0.14, 0.14, tranW, mullionX, gBot + glassH * 0.78, glassZ, dkM(), 'detail');

      // Hood mold above window (no sill to avoid Z-fighting)
      bx(g, W + 0.3, 0.15, glassW + 0.8, wallCX + side * 0.06, gBot + glassH + 0.25, glassZ, dkM(), 'detail');

      // ── Clerestory window ──
      const clGW = winBayD;   // fill entire opening
      const clGH = clH;       // fill entire opening
      const clGCY = clBot + clGH / 2;
      bx(g, 0.06, clGH, clGW, glassX, clGCY, winCZ, clGlM(height), 'glass', false);
      // Clerestory tracery: central mullion + transom
      bx(g, 0.08, clGH, 0.08, mullionX, clGCY, winCZ, dkM(), 'detail');
      bx(g, 0.08, 0.08, clGW * 0.85, mullionX, clBot + clGH * 0.6, winCZ, dkM(), 'detail');
    }

    // Cornice runs the full length
    bx(g, W + 0.3, 0.25, nD, wallCX + side * 0.08, nH + 0.12, 0, dkM(), 'detail');
  }

  // ════════════════════════════════════════
  // CONTINUOUS AISLE WALLS (outer walls — shorter than nave for sloping roof)
  // ════════════════════════════════════════
  const aOuterH = aH * 0.75; // outer wall shorter so roof slopes down
  for (const side of [-1, 1] as const) {
    const wallCX = side * (aOutX + W / 2);

    for (let i = 0; i < bays; i++) {
      const bayStart = nFront + bayD * i;
      const pierEnd = bayStart + bayD * 0.25;
      const winStart = pierEnd;
      const winEnd = bayStart + bayD;
      const pierD = pierEnd - bayStart;
      const winBayD = winEnd - winStart;
      const pierCZ = bayStart + pierD / 2;
      const winCZ = winStart + winBayD / 2;

      // Pier
      bx(g, W, aOuterH, pierD, wallCX, aOuterH / 2, pierCZ, stM(), 'structural');

      // Window bay: lower wall + upper wall + glass
      const awH = aOuterH * 0.32;
      const awBot = aOuterH * 0.38;
      bx(g, W, awBot, winBayD, wallCX, awBot / 2, winCZ, stM(), 'structural');
      const aAbove = aOuterH - (awBot + awH);
      if (aAbove > 0) bx(g, W, aAbove, winBayD, wallCX, awBot + awH + aAbove / 2, winCZ, stM(), 'upper-wall');

      // Aisle window: colored glass, mullion + transom
      const aGlassW = winBayD;    // fill entire opening
      const aGlassH = awH;        // fill entire opening
      const aGlassX = wallCX - side * W * 0.4;
      const aMullX = wallCX - side * W * 0.15;
      bx(g, 0.06, aGlassH, aGlassW, aGlassX, awBot + aGlassH / 2, winCZ, glM(height, i + 3), 'glass', false);
      bx(g, 0.08, aGlassH, 0.08, aMullX, awBot + aGlassH / 2, winCZ, dkM(), 'detail');
      bx(g, 0.08, 0.08, aGlassW * 0.8, aMullX, awBot + aGlassH * 0.55, winCZ, dkM(), 'detail');
    }
  }

  // ── Shared gable shape (used on front and back walls) ──
  const gableHW = (nW + W * 2 + 0.5) / 2;
  const gableShape = new Shape();
  gableShape.moveTo(-gableHW, 0);
  gableShape.lineTo(0, roofRise);
  gableShape.lineTo(gableHW, 0);
  gableShape.closePath();

  // ════════════════════════════════════════
  // FRONT WALL (WEST) — closes the west end
  // ════════════════════════════════════════
  const fZ = nFront - W / 2;
  const fullW = aWallX * 2; // total facade width

  // Facade wall: full width at aisle level, nave width above
  bx(g, fullW, aH, W, 0, aH / 2, fZ, stM(), 'structural');
  bx(g, nW + W * 2, nH - aH, W, 0, aH + (nH - aH) / 2, fZ, stM(), 'structural');

  // Portals
  for (let d = 0; d < 3; d++) {
    const s = 1 - d * 0.08;
    bx(g, 5 * s, nH * 0.32 * s, 0.5, 0, nH * 0.32 * s / 2 + 1, fZ - W / 2 - d * 0.5, d % 2 === 0 ? dkM() : stM(0xb0a898), 'detail');
  }
  for (const sx of [-fullW * 0.28, fullW * 0.28]) {
    for (let d = 0; d < 2; d++) {
      bx(g, 3 * (1 - d * 0.1), nH * 0.22 * (1 - d * 0.1), 0.4, sx, nH * 0.22 / 2 + 1, fZ - W / 2 - d * 0.35, d === 0 ? dkM() : stM(), 'detail');
    }
  }

  // Gallery of kings
  const galY = nH * 0.4;
  for (let k = 0; k < 14; k++) {
    bx(g, 0.4, 1.8, 0.35, -fullW * 0.4 + k * (fullW * 0.8 / 13), galY, fZ - W / 2 - 0.12, stM(0xb0a898), 'detail');
  }
  bx(g, fullW + 0.2, 0.18, 0.3, 0, galY + 2, fZ - W / 2 - 0.06, dkM(), 'detail');

  // ── Rose window (projects outward from facade face) ──
  const rY = nH * 0.65;
  const rR = Math.min(5.0, nH * 0.11);
  const faceFront = fZ - W / 2;    // front face of wall
  const rZGlass = faceFront - 0.08; // glass flush with wall face
  const rZTrace = faceFront - 0.25; // tracery in front of glass
  const rZFrame = faceFront - 0.45; // outer frame projects furthest

  // Outer stone frame ring
  const rFrame = new Mesh(new TorusGeometry(rR + 0.3, 0.4, 12, 32), dkM());
  rFrame.position.set(0, rY, rZFrame); rFrame.userData.tier = 'detail'; g.add(rFrame);

  // Glass disc (vivid warm colors)
  const rGl = new Mesh(new RingGeometry(0.2, rR, 32), rgM(height));
  rGl.position.set(0, rY, rZGlass); rGl.userData.tier = 'glass'; g.add(rGl);

  // Tracery: 12 radial spokes
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const sp = new Mesh(new BoxGeometry(0.12, rR * 1.95, 0.12), dkM());
    sp.position.set(0, rY, rZTrace); sp.rotation.z = a; sp.userData.tier = 'detail'; g.add(sp);
  }
  // Inner ring
  const rInner = new Mesh(new TorusGeometry(rR * 0.55, 0.12, 8, 24), dkM());
  rInner.position.set(0, rY, rZTrace); rInner.userData.tier = 'detail'; g.add(rInner);
  // Center medallion ring
  const rCenter = new Mesh(new TorusGeometry(rR * 0.25, 0.08, 8, 16), dkM());
  rCenter.position.set(0, rY, rZTrace); rCenter.userData.tier = 'detail'; g.add(rCenter);

  // Front gable (flat triangle extruded to wall thickness)
  const fGableGeo = new ExtrudeGeometry(gableShape, { depth: W, bevelEnabled: false });
  const gableFront = new Mesh(fGableGeo, stM());
  gableFront.position.set(0, nH + 0.05, fZ - W / 2 - 0.02);
  gableFront.castShadow = true; gableFront.userData.tier = 'upper-wall'; g.add(gableFront);

  // Facade string courses
  for (const f of [0.22, 0.4, 0.6, 0.82]) {
    bx(g, fullW + 0.4, 0.2, 0.35, 0, nH * f, fZ - W / 2 - 0.08, dkM(), 'detail');
  }

  // ════════════════════════════════════════
  // BACK WALL (EAST)
  // Lower: full width up to aisle height
  // Upper: only nave width from aisle height to nave height
  // Gable: triangle above nave wall to roof ridge
  // ════════════════════════════════════════
  bx(g, fullW, aH, W, 0, aH / 2, nBack + W / 2, stM(), 'structural');
  bx(g, nW + W * 2, nH - aH, W, 0, aH + (nH - aH) / 2, nBack + W / 2, stM(), 'structural');
  // Back gable
  const gableGeo = new ExtrudeGeometry(gableShape, { depth: W, bevelEnabled: false });
  const gableBack = new Mesh(gableGeo, stM());
  gableBack.position.set(0, nH, nBack + 0.01);
  gableBack.castShadow = true; gableBack.userData.tier = 'upper-wall'; g.add(gableBack);

  // ════════════════════════════════════════
  // NAVE ROOF (triangular cross-section)
  // ════════════════════════════════════════
  const naveRoofW = nW + W * 2 + 0.5;
  const naveRoofGeo = makeRoofGeo(naveRoofW, roofRise, nD + W * 2, 0.35);
  const naveRoof = new Mesh(naveRoofGeo, rfM());
  naveRoof.position.set(0, nH, nFront - W);
  naveRoof.castShadow = true; naveRoof.userData.tier = 'roof'; g.add(naveRoof);
  bx(g, 0.3, 0.35, nD + W * 2, 0, nH + roofRise + 0.17, 0, dkM(), 'detail'); // ridge

  // ════════════════════════════════════════
  // AISLE ROOFS (sloping from nave wall down to outer wall)
  // ════════════════════════════════════════
  for (const side of [-1, 1] as const) {
    const roofW = aW + W + 0.5;
    const innerY = aH + 0.3;       // where roof meets nave wall (higher)
    const outerY = aOuterH + 0.3;  // where roof meets outer wall (lower)
    const midY = (innerY + outerY) / 2;
    const midX = side * (nWallX + aW / 2);
    const slopeLen = Math.sqrt(roofW * roofW + (innerY - outerY) ** 2);
    const slopeAngle = Math.atan2(innerY - outerY, roofW);

    const roofSlab = new Mesh(new BoxGeometry(slopeLen, 0.25, nD + 1), rfM());
    roofSlab.position.set(midX, midY, 0);
    roofSlab.rotation.z = -side * slopeAngle; // slope outward (down toward outer wall)
    roofSlab.castShadow = true; roofSlab.userData.tier = 'roof'; g.add(roofSlab);
  }

  // ════════════════════════════════════════
  // TWIN WEST TOWERS
  // ════════════════════════════════════════
  const tBaseX = aWallX + tW / 2 + 0.5;
  const tOffs = [-(tBaseX + (1 - symmetry) * 0.4), tBaseX - (1 - symmetry) * 0.4];

  for (const tx of tOffs) {
    const tz = nFront;
    bx(g, tW, tH, tW, tx, tH / 2, tz, stM(), 'structural');

    for (let lvl = 0; lvl < 3; lvl++) {
      const y = tH * (0.35 + lvl * 0.2);
      bx(g, tW + 0.5, 0.3, tW + 0.5, tx, y, tz, dkM(), 'detail');
      for (const [dx, dz] of [[-tW / 2, -tW / 2], [tW / 2, -tW / 2], [-tW / 2, tW / 2], [tW / 2, tW / 2]]) {
        pin(g, tx + dx, y + 0.25, tz + dz, 1.3);
      }
    }

    // Battlements
    const bSz = tW / 6;
    for (let face = 0; face < 4; face++) {
      for (let bi = 0; bi < 3; bi++) {
        const off = (bi - 1) * bSz * 2;
        let bxx = tx, bzz = tz;
        if (face === 0) { bxx += off; bzz -= tW / 2; }
        else if (face === 1) { bxx += off; bzz += tW / 2; }
        else if (face === 2) { bxx -= tW / 2; bzz += off; }
        else { bxx += tW / 2; bzz += off; }
        bx(g, bSz, bSz * 1.5, bSz, bxx, tH + bSz * 0.75, bzz, stM(), 'upper-wall');
      }
    }

    const spBase = tH + bSz * 1.5;
    cn(g, tW * 0.42, sH, 4, tx, spBase + sH / 2, tz, rfM(), 'spire', Math.PI / 4);
    for (const [dx, dz] of [[-tW / 2, -tW / 2], [tW / 2, -tW / 2], [-tW / 2, tW / 2], [tW / 2, tW / 2]]) {
      pin(g, tx + dx, spBase, tz + dz, 3.0);
    }

    // Tower windows (recessed)
    for (let lvl = 0; lvl < 5; lvl++) {
      const wy = tH * 0.14 + lvl * tH * 0.14;
      for (const off of [-1.1, 1.1]) {
        bx(g, 0.6, tH * 0.06, 0.08, tx + off, wy, tz - tW / 2 + 0.2, glM(height), 'glass', false);
      }
    }
  }

  // ════════════════════════════════════════
  // FLYING BUTTRESSES (segmented arches, 8 per side)
  // ════════════════════════════════════════
  // Buttresses align with nave piers (one per bay, at pier Z position)
  const fbN = bays;

  for (let i = 0; i < fbN; i++) {
    // Same Z as each bay's pier center
    const z = nFront + bayD * i + bayD * 0.25 * 0.5;

    for (const side of [-1, 1] as const) {
      const pierX = side * (aWallX + 3);
      const jit = (1 - symmetry) * side * 0.3 * ((i % 2) * 2 - 1);
      const px = pierX + jit;

      // Stepped pier
      const pierH = nH * 0.52;
      bx(g, 1.8, pierH, 1.8, px, pierH / 2, z, stM(), 'structural');
      bx(g, 2.1, 0.3, 2.1, px, pierH + 0.15, z, dkM(), 'detail');
      pin(g, px, pierH + 0.4, z, 2.8);

      // Upper flying arch: built as overlapping rotated segments
      // Each segment connects consecutive points on a parabolic curve
      const nwx = side * nWallX;
      const uSegs = 8;
      const uy0 = pierH;
      const uy1 = nH * 0.7;
      const uPeak = Math.max(uy0, uy1) + Math.abs(px - nwx) * 0.12;

      for (let s = 0; s < uSegs; s++) {
        const t0 = s / uSegs;
        const t1 = (s + 1) / uSegs;

        // Start and end points of this segment
        const x0s = px + (nwx - px) * t0;
        const x1s = px + (nwx - px) * t1;
        const y0s = uy0 + (uy1 - uy0) * t0 + 4 * (uPeak - Math.max(uy0, uy1)) * t0 * (1 - t0);
        const y1s = uy0 + (uy1 - uy0) * t1 + 4 * (uPeak - Math.max(uy0, uy1)) * t1 * (1 - t1);

        const dx = x1s - x0s;
        const dy = y1s - y0s;
        const segLen = Math.sqrt(dx * dx + dy * dy);
        const segAngle = Math.atan2(dy, dx);

        const seg = new Mesh(new BoxGeometry(segLen * 1.05, 0.9, 0.9), stM());
        seg.position.set((x0s + x1s) / 2, (y0s + y1s) / 2, z);
        seg.rotation.z = segAngle;
        seg.castShadow = true; seg.userData.tier = 'structural'; g.add(seg);
      }

      // Lower flying arch: same approach, pier base to aisle wall
      const awx = side * aWallX;
      const lSegs = 6;
      const ly0 = pierH * 0.35;
      const ly1 = aH * 0.55;
      const lPeak = Math.max(ly0, ly1) + Math.abs(px - awx) * 0.08;

      for (let s = 0; s < lSegs; s++) {
        const t0 = s / lSegs;
        const t1 = (s + 1) / lSegs;

        const x0s = px + (awx - px) * t0;
        const x1s = px + (awx - px) * t1;
        const y0s = ly0 + (ly1 - ly0) * t0 + 4 * (lPeak - Math.max(ly0, ly1)) * t0 * (1 - t0);
        const y1s = ly0 + (ly1 - ly0) * t1 + 4 * (lPeak - Math.max(ly0, ly1)) * t1 * (1 - t1);

        const dx = x1s - x0s;
        const dy = y1s - y0s;
        const segLen = Math.sqrt(dx * dx + dy * dy);
        const segAngle = Math.atan2(dy, dx);

        const seg = new Mesh(new BoxGeometry(segLen * 1.05, 0.7, 0.7), stM());
        seg.position.set((x0s + x1s) / 2, (y0s + y1s) / 2, z);
        seg.rotation.z = segAngle;
        seg.castShadow = true; seg.userData.tier = 'structural'; g.add(seg);
      }
    }
  }

  // ════════════════════════════════════════
  // TRANSEPT (seamlessly connected to nave)
  // ════════════════════════════════════════
  // Transept aligned with buttress positions: centered between buttress 4 and 5
  const buttress4Z = nFront + bayD * 4 + bayD * 0.25 * 0.5; // pier Z of bay 4
  const buttress5Z = nFront + bayD * 5 + bayD * 0.25 * 0.5; // pier Z of bay 5
  const tpZ = (buttress4Z + buttress5Z) / 2;
  const tpArm = 10;
  const tpInnerH = aH;             // inner wall height matches aisle
  const tpOuterH = aH * 0.7;       // end wall shorter for sloping roof
  const tpD = bayD;  // transept width = one bay span (matches buttress spacing)

  for (const side of [-1, 1] as const) {
    const innerX = side * nWallX;
    const outerX = innerX + side * tpArm;
    const midX = (innerX + outerX) / 2;
    const armLen = Math.abs(tpArm);

    // Side walls aligned exactly at buttress Z positions
    bx(g, armLen, tpInnerH, W, midX, tpInnerH / 2, buttress4Z, stM(), 'structural');
    bx(g, armLen, tpInnerH, W, midX, tpInnerH / 2, buttress5Z, stM(), 'structural');
    // End wall (shorter for slope)
    bx(g, W, tpOuterH, tpD + W * 2, outerX + side * W / 2, tpOuterH / 2, tpZ, stM(), 'structural');

    // Transept end window
    bx(g, 0.08, tpOuterH * 0.35, tpD * 0.5, outerX, tpOuterH * 0.48, tpZ, glM(height), 'glass', false);

    // Transept rose
    const trR = Math.min(2.0, tpOuterH * 0.12);
    const trRing = new Mesh(new TorusGeometry(trR, 0.12, 8, 20), stM());
    trRing.position.set(outerX, tpOuterH * 0.72, tpZ);
    trRing.rotation.y = Math.PI / 2; trRing.userData.tier = 'detail'; g.add(trRing);
    const trGl = new Mesh(new RingGeometry(0.1, trR - 0.08, 20), rgM(height));
    trGl.position.set(outerX, tpOuterH * 0.72, tpZ);
    trGl.rotation.y = Math.PI / 2; trGl.userData.tier = 'glass'; g.add(trGl);

    // Transept roof — slopes outward (higher at nave, lower at end wall)
    const tpRoofW = armLen + 0.5;
    const tpRoofD = tpD + W * 2 + 0.5;
    const tpInnerY = tpInnerH + 0.3;
    const tpOuterY = tpOuterH + 0.3;
    const tpMidY = (tpInnerY + tpOuterY) / 2;
    const tpSlopeLen = Math.sqrt(tpRoofW ** 2 + (tpInnerY - tpOuterY) ** 2);
    const tpSlopeAng = Math.atan2(tpInnerY - tpOuterY, tpRoofW);

    const tpRoof = new Mesh(new BoxGeometry(tpSlopeLen, 0.25, tpRoofD), rfM());
    tpRoof.position.set(midX, tpMidY, tpZ);
    // Slope outward: inner (nave) side high, outer (end) side low
    // rotation.z tilts around Z axis; for transept arms extending along X:
    tpRoof.rotation.z = -side * tpSlopeAng;
    tpRoof.castShadow = true; tpRoof.userData.tier = 'roof'; g.add(tpRoof);
  }

  // ════════════════════════════════════════
  // CROSSING TOWER (where nave and transept intersect)
  // ════════════════════════════════════════
  const crW = nW * 0.5;
  const crH = nH * 0.25;
  bx(g, crW, crH, crW, 0, nH + crH / 2, tpZ, stM(), 'structural');
  cn(g, crW * 0.35, sH * 0.5, 4, 0, nH + crH + sH * 0.25, tpZ, rfM(), 'spire', Math.PI / 4);

  // ════════════════════════════════════════
  // APSE — semicircular east end bulging in +Z
  //
  // Built by computing each facet's two corner positions on the circle,
  // then placing a wall between them. No trig rotation — use atan2 of
  // the actual vertex positions for rotation.
  // ════════════════════════════════════════
  const apN = 9;
  const apInnerR = nHW + W / 2;
  const apOuterR = aWallX;
  const apInnerH = aH;              // inner apse walls = aisle height (taller)
  const apOuterH = aH * 0.65;       // outer ambulatory walls shorter (for slope)
  const apZ = nBack;

  function apseVertex(angle: number, radius: number): [number, number] {
    return [Math.cos(angle) * radius, Math.sin(angle) * radius + apZ];
  }

  function chordAngle(x1: number, z1: number, x2: number, z2: number): [number, number] {
    const chord = Math.sqrt((x2 - x1) ** 2 + (z2 - z1) ** 2);
    const angle = Math.atan2(-(z2 - z1), x2 - x1);
    return [chord, angle];
  }

  for (let i = 0; i < apN; i++) {
    const ang1 = (i / apN) * Math.PI;
    const ang2 = ((i + 1) / apN) * Math.PI;
    const aMid = (ang1 + ang2) / 2;

    // ── Inner apse wall (taller) ──
    const [ix1, iz1] = apseVertex(ang1, apInnerR);
    const [ix2, iz2] = apseVertex(ang2, apInnerR);
    const [iChord, iAngle] = chordAngle(ix1, iz1, ix2, iz2);

    const iSeg = new Mesh(new BoxGeometry(iChord, apInnerH, W), stM());
    iSeg.position.set((ix1 + ix2) / 2, apInnerH / 2, (iz1 + iz2) / 2);
    iSeg.rotation.y = iAngle;
    iSeg.castShadow = true; iSeg.userData.tier = 'structural'; g.add(iSeg);

    // Inner window
    const winR = apInnerR - 0.5;
    const iwn = new Mesh(new BoxGeometry(iChord * 0.4, apInnerH * 0.3, 0.06), glM(height));
    iwn.position.set(Math.cos(aMid) * winR, apInnerH * 0.5, Math.sin(aMid) * winR + apZ);
    iwn.rotation.y = iAngle;
    iwn.userData.tier = 'glass'; g.add(iwn);

    // ── Outer ambulatory wall (shorter) ──
    const [ox1, oz1] = apseVertex(ang1, apOuterR);
    const [ox2, oz2] = apseVertex(ang2, apOuterR);
    const [oChord, oAngle] = chordAngle(ox1, oz1, ox2, oz2);

    const oSeg = new Mesh(new BoxGeometry(oChord, apOuterH, W), stM());
    oSeg.position.set((ox1 + ox2) / 2, apOuterH / 2, (oz1 + oz2) / 2);
    oSeg.rotation.y = oAngle;
    oSeg.castShadow = true; oSeg.userData.tier = 'structural'; g.add(oSeg);

    // Ambulatory window
    const oWinR = apOuterR - 0.4;
    const own = new Mesh(new BoxGeometry(oChord * 0.35, apOuterH * 0.3, 0.05), glM(height));
    own.position.set(Math.cos(aMid) * oWinR, apOuterH * 0.45, Math.sin(aMid) * oWinR + apZ);
    own.rotation.y = oAngle;
    own.userData.tier = 'glass'; g.add(own);

    // ── Buttress at each joint ──
    const [bjx, bjz] = apseVertex(ang2, apOuterR + 1.2);
    bx(g, 0.9, apInnerH * 0.5, 0.9, bjx, apInnerH * 0.25, bjz, dkM(), 'structural');
    pin(g, bjx, apInnerH * 0.5 + 0.2, bjz, 2.0);
  }

  // Apse roof: half-cone shape (higher at center, slopes down to outer wall)
  // Uses a CylinderGeometry half-circle with different top/bottom radii to create slope.
  // Top radius = 0 (peak at center), bottom radius = apOuterR (outer wall edge).
  // But since we want it higher at the inner wall, we use a truncated half-cone:
  // small radius at top (inner wall level) and larger at bottom (outer wall level).
  const apseRoofInnerY = apInnerH + 0.2;
  const apseRoofOuterY = apOuterH + 0.2;
  // Inner apse roof: half-cone, vertical axis (small end up, large end down)
  // The cone stands upright — apex at top = peak of roof, base = drip edge
  // CylinderGeometry(topRadius, bottomRadius, height) — top is small, bottom is large
  const innerRoofSlope = apseRoofInnerY - apseRoofOuterY + 1; // height of cone = slope amount
  const innerConeGeo = new CylinderGeometry(0.1, apInnerR + 0.5, innerRoofSlope, apN * 2, 1, false, 0, Math.PI);
  const innerCone = new Mesh(innerConeGeo, rfM());
  innerCone.rotation.y = -Math.PI / 2; // rotate half-circle to open toward +Z
  // Base (large end) sits on inner wall top, apex rises above
  innerCone.position.set(0, apseRoofInnerY + innerRoofSlope / 2, apZ);
  innerCone.castShadow = true; innerCone.userData.tier = 'roof'; g.add(innerCone);

  // Ambulatory roof: truncated half-cone (slopes from inner wall to outer wall)
  const ambRoofSlope = (apseRoofInnerY - apseRoofOuterY) * 0.7;
  const ambConeGeo = new CylinderGeometry(apInnerR + 0.3, apOuterR + W / 2, ambRoofSlope, apN * 2, 1, false, 0, Math.PI);
  const ambCone = new Mesh(ambConeGeo, rfM());
  ambCone.rotation.y = -Math.PI / 2;
  // Base (large end) sits on outer wall top, apex rises above
  ambCone.position.set(0, apseRoofOuterY + ambRoofSlope / 2, apZ);
  ambCone.castShadow = true; ambCone.userData.tier = 'roof'; g.add(ambCone);

  // ════════════════════════════════════════
  // INTERIOR COLUMNS (at pier positions, aligned with solid wall sections)
  // ════════════════════════════════════════
  for (let i = 0; i < bays; i++) {
    // Place columns at pier Z (start of each bay), not at window Z
    const pierZ = nFront + bayD * i + bayD * 0.25 * 0.5;
    for (const side of [-1, 1] as const) {
      // Nave arcade column (compound pier)
      const cx = side * (nHW - 0.1);
      const colH = nH * 0.85;
      cyl(g, 0.4, 0.5, colH, 16, cx, colH / 2, pierZ, stM(), 'column');
      for (const [dx, dz] of [[0.28, 0], [-0.28, 0], [0, 0.28], [0, -0.28]]) {
        cyl(g, 0.12, 0.16, colH, 8, cx + dx, colH / 2, pierZ + dz, dkM(), 'column');
      }
      bx(g, 1.3, 0.3, 1.3, cx, 0.15, pierZ, dkM(), 'column');
      bx(g, 1.2, 0.4, 1.2, cx, colH + 0.2, pierZ, stM(), 'column');
    }
  }

  return g;
}
