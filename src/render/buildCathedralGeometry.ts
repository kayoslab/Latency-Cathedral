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
  const gnd = new Mesh(new PlaneGeometry(400, 400), new MeshStandardMaterial({ color: 0xc5c0b8, roughness: 0.95 }));
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
      const glassW = winBayD * 0.92;
      const glassH = winH * 0.95;
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

      // Sill + hood mold
      bx(g, W + 0.25, 0.2, glassW + 0.5, wallCX, gBot - 0.1, glassZ, dkM(), 'detail');
      bx(g, W + 0.3, 0.15, glassW + 0.8, wallCX + side * 0.06, gBot + glassH + 0.25, glassZ, dkM(), 'detail');

      // ── Clerestory window ──
      const clGW = winBayD * 0.88;
      const clGH = clH * 0.92;
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
  // CONTINUOUS AISLE WALLS (outer walls, same bay structure)
  // ════════════════════════════════════════
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
      bx(g, W, aH, pierD, wallCX, aH / 2, pierCZ, stM(), 'structural');

      // Window bay: lower wall + upper wall + glass
      const awH = aH * 0.28;
      const awBot = aH * 0.38;
      bx(g, W, awBot, winBayD, wallCX, awBot / 2, winCZ, stM(), 'structural');
      const aAbove = aH - (awBot + awH);
      if (aAbove > 0) bx(g, W, aAbove, winBayD, wallCX, awBot + awH + aAbove / 2, winCZ, stM(), 'upper-wall');

      // Aisle window: colored glass, mullion + transom
      const aGlassW = winBayD * 0.85;
      const aGlassH = awH * 0.92;
      const aGlassX = wallCX - side * W * 0.4;
      const aMullX = wallCX - side * W * 0.15;
      bx(g, 0.06, aGlassH, aGlassW, aGlassX, awBot + aGlassH / 2, winCZ, glM(height, i + 3), 'glass', false);
      // Mullion + transom
      bx(g, 0.08, aGlassH, 0.08, aMullX, awBot + aGlassH / 2, winCZ, dkM(), 'detail');
      bx(g, 0.08, 0.08, aGlassW * 0.8, aMullX, awBot + aGlassH * 0.55, winCZ, dkM(), 'detail');
      // Sill
      bx(g, W + 0.15, 0.12, aGlassW + 0.3, wallCX, awBot - 0.06, winCZ, dkM(), 'detail');
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

  // Solid facade wall — rose window sits in front of it
  bx(g, fullW, nH, W, 0, nH / 2, fZ, stM(), 'structural');

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
  // AISLE ROOFS (flat slabs sitting on aisle wall tops)
  // ════════════════════════════════════════
  for (const side of [-1, 1] as const) {
    const roofCX = side * (nWallX + aW / 2);
    bx(g, aW + W + 0.3, 0.3, nD + 1, roofCX, aH + 0.15, 0, rfM(), 'roof');
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
  const fbN = 8;
  const fbSp = nD / (fbN + 0.5);

  for (let i = 0; i < fbN; i++) {
    const z = nFront + fbSp * (i + 0.75);

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
  const tpZ = nD * 0.1;
  const tpArm = 10;
  const tpH = nH * 0.82;
  const tpD = 5;

  for (const side of [-1, 1] as const) {
    const innerX = side * nWallX;       // where transept meets nave
    const outerX = innerX + side * tpArm;
    const midX = (innerX + outerX) / 2;
    const armLen = Math.abs(tpArm);

    // North/south walls (parallel to X axis)
    bx(g, armLen, tpH, W, midX, tpH / 2, tpZ - tpD / 2 - W / 2, stM(), 'structural');
    bx(g, armLen, tpH, W, midX, tpH / 2, tpZ + tpD / 2 + W / 2, stM(), 'structural');
    // End wall (perpendicular, closes the arm)
    bx(g, W, tpH, tpD + W * 2, outerX + side * W / 2, tpH / 2, tpZ, stM(), 'structural');

    // Transept window (recessed into end wall)
    bx(g, 0.08, tpH * 0.3, tpD * 0.5, outerX, tpH * 0.48, tpZ, glM(height), 'glass', false);

    // Transept rose
    const trR = Math.min(2.3, tpH * 0.08);
    const trRing = new Mesh(new TorusGeometry(trR, 0.12, 8, 20), stM());
    trRing.position.set(outerX, tpH * 0.7, tpZ);
    trRing.rotation.y = Math.PI / 2; trRing.userData.tier = 'detail'; g.add(trRing);
    const trGl = new Mesh(new RingGeometry(0.1, trR - 0.08, 20), rgM(height));
    trGl.position.set(outerX, tpH * 0.7, tpZ);
    trGl.rotation.y = Math.PI / 2; trGl.userData.tier = 'glass'; g.add(trGl);

    // Transept roof (flat slab sitting on walls)
    bx(g, armLen + 0.5, 0.3, tpD + W * 2 + 0.5, midX, tpH + 0.15, tpZ, rfM(), 'roof');
  }

  // ════════════════════════════════════════
  // CROSSING TOWER (where nave and transept intersect)
  // ════════════════════════════════════════
  const crW = nW * 0.5;
  const crH = nH * 0.25;
  bx(g, crW, crH, crW, 0, nH + crH / 2, tpZ, stM(), 'structural');
  cn(g, crW * 0.35, sH * 0.5, 4, 0, nH + crH + sH * 0.25, tpZ, rfM(), 'spire', Math.PI / 4);

  // ════════════════════════════════════════
  // APSE — semicircular east end
  //
  // The apse replaces the center of the back wall.
  // Inner apse (nave height) + outer ambulatory (aisle height).
  // Walls connect to the nave walls at Z = nBack.
  // ════════════════════════════════════════
  // Apse: semicircular east end bulging outward in +Z direction.
  // Center of semicircle at (0, 0, nBack).
  // Angles sweep from -π/2 (right/+X side) to +π/2 (left/-X side).
  // At angle 0, the wall faces directly in +Z.
  const apN = 9;
  const apInnerR = nHW + W / 2;
  const apOuterR = aWallX;
  const apH = nH * 0.78;
  const apZ = nBack;

  for (let i = 0; i < apN; i++) {
    const a1 = -Math.PI / 2 + (i / apN) * Math.PI;
    const a2 = -Math.PI / 2 + ((i + 1) / apN) * Math.PI;
    const aMid = (a1 + a2) / 2;
    const halfArc = Math.PI / apN / 2;

    // Wall segment position: on the circle at the midpoint angle
    // The wall is tangent to the circle, so it faces outward (normal = radial)
    // BoxGeometry flat face is in XY plane (normal along Z).
    // rotation.y = aMid rotates so the normal points radially outward.

    // ── Inner apse wall ──
    const icx = Math.sin(aMid) * apInnerR;  // sin for X (right-hand convention)
    const icz = Math.cos(aMid) * apInnerR + apZ;  // cos for Z (forward)
    const iSegW = 2 * apInnerR * Math.sin(halfArc) * 1.05;

    const iSeg = new Mesh(new BoxGeometry(iSegW, apH, W), stM());
    iSeg.position.set(icx, apH / 2, icz);
    iSeg.rotation.y = -aMid;  // rotate so face is tangent to circle
    iSeg.castShadow = true; iSeg.userData.tier = 'structural'; g.add(iSeg);

    // Inner window (recessed)
    const iwn = new Mesh(new BoxGeometry(iSegW * 0.4, apH * 0.3, 0.06), glM(height));
    iwn.position.set(
      Math.sin(aMid) * (apInnerR - 0.4),
      apH * 0.5,
      Math.cos(aMid) * (apInnerR - 0.4) + apZ,
    );
    iwn.rotation.y = -aMid;
    iwn.userData.tier = 'glass'; g.add(iwn);

    // ── Outer ambulatory wall ──
    const ocx = Math.sin(aMid) * apOuterR;
    const ocz = Math.cos(aMid) * apOuterR + apZ;
    const oSegW = 2 * apOuterR * Math.sin(halfArc) * 1.05;

    const oSeg = new Mesh(new BoxGeometry(oSegW, aH, W), stM());
    oSeg.position.set(ocx, aH / 2, ocz);
    oSeg.rotation.y = -aMid;
    oSeg.castShadow = true; oSeg.userData.tier = 'structural'; g.add(oSeg);

    // Ambulatory window
    const own = new Mesh(new BoxGeometry(oSegW * 0.35, aH * 0.25, 0.05), glM(height));
    own.position.set(
      Math.sin(aMid) * (apOuterR - 0.4),
      aH * 0.45,
      Math.cos(aMid) * (apOuterR - 0.4) + apZ,
    );
    own.rotation.y = -aMid;
    own.userData.tier = 'glass'; g.add(own);

    // ── Buttress at each joint ──
    const bjR = apOuterR + 1.2;
    const bjx = Math.sin(a2) * bjR;
    const bjz = Math.cos(a2) * bjR + apZ;
    bx(g, 0.9, apH * 0.5, 0.9, bjx, apH * 0.25, bjz, dkM(), 'structural');
    pin(g, bjx, apH * 0.5 + 0.2, bjz, 2.0);
  }

  // Apse inner roof (one slab per facet, forming a polygon)
  for (let i = 0; i < apN; i++) {
    const aMid = -Math.PI / 2 + ((i + 0.5) / apN) * Math.PI;
    const halfArc = Math.PI / apN / 2;
    const midR = apInnerR * 0.5;
    const rW = 2 * apInnerR * Math.sin(halfArc) * 1.08;
    const rD = apInnerR * 0.55;
    const rSlab = new Mesh(new BoxGeometry(rW, 0.25, rD), rfM());
    rSlab.position.set(Math.sin(aMid) * midR, apH + 0.12, Math.cos(aMid) * midR + apZ);
    rSlab.rotation.y = -aMid;
    rSlab.castShadow = true; rSlab.userData.tier = 'roof'; g.add(rSlab);
  }

  // Ambulatory roof
  for (let i = 0; i < apN; i++) {
    const aMid = -Math.PI / 2 + ((i + 0.5) / apN) * Math.PI;
    const halfArc = Math.PI / apN / 2;
    const midR = (apInnerR + apOuterR) / 2;
    const rW = 2 * midR * Math.sin(halfArc) * 1.08;
    const rD = (apOuterR - apInnerR) + W;
    const rSlab = new Mesh(new BoxGeometry(rW, 0.2, rD), rfM());
    rSlab.position.set(Math.sin(aMid) * midR, aH + 0.1, Math.cos(aMid) * midR + apZ);
    rSlab.rotation.y = -aMid;
    rSlab.castShadow = true; rSlab.userData.tier = 'roof'; g.add(rSlab);
  }

  // ════════════════════════════════════════
  // INTERIOR COLUMNS (arcade separating nave from aisles)
  // ════════════════════════════════════════
  for (let i = 0; i < bays; i++) {
    const z = nFront + bayD * (i + 0.5);
    for (const side of [-1, 1] as const) {
      // Nave arcade column
      const cx = side * (nHW - 0.1);
      const colH = nH * 0.85;
      cyl(g, 0.4, 0.5, colH, 16, cx, colH / 2, z, stM(), 'column');
      for (const [dx, dz] of [[0.28, 0], [-0.28, 0], [0, 0.28], [0, -0.28]]) {
        cyl(g, 0.12, 0.16, colH, 8, cx + dx, colH / 2, z + dz, dkM(), 'column');
      }
      bx(g, 1.3, 0.3, 1.3, cx, 0.15, z, dkM(), 'column');
      bx(g, 1.2, 0.4, 1.2, cx, colH + 0.2, z, stM(), 'column');

      // Aisle outer column
      const ax = side * (aOutX - 0.1);
      const acH = aH * 0.8;
      cyl(g, 0.2, 0.25, acH, 10, ax, acH / 2, z, stM(), 'column');
      bx(g, 0.6, 0.2, 0.6, ax, 0.1, z, dkM(), 'column');
    }
  }

  return g;
}
