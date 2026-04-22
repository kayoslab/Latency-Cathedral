/**
 * Procedural stone textures: color map + normal map + roughness map.
 * Creates realistic ashlar masonry with weathering, staining, and erosion.
 */
import { CanvasTexture, RepeatWrapping } from 'three';

/** Deterministic random for reproducible textures. */
function srand(seed: number): number {
  const x = Math.sin(seed * 9301 + 49297) * 49297;
  return x - Math.floor(x);
}

// ── Stone textures ──

interface StoneTextures {
  color: CanvasTexture;
  normal: CanvasTexture;
  roughness: CanvasTexture;
}

export function createStoneTextures(size = 1024): StoneTextures {
  const rows = 14;
  const cols = 8;
  const blockH = size / rows;
  const blockW = size / cols;

  // ── Color map ──
  const colorCanvas = document.createElement('canvas');
  colorCanvas.width = size;
  colorCanvas.height = size;
  const cc = colorCanvas.getContext('2d')!;

  // Base warm stone color
  cc.fillStyle = '#9a9080';
  cc.fillRect(0, 0, size, size);

  // Per-block color variation (some blocks lighter, some darker, some warm, some cool)
  for (let row = 0; row < rows; row++) {
    const offset = (row % 2) * blockW * 0.5;
    for (let col = 0; col < cols + 1; col++) {
      const bx = col * blockW + offset;
      const by = row * blockH;
      const seed = row * 100 + col;

      // Vary base color per block
      const r = 140 + srand(seed) * 40 - 20;
      const g2 = 130 + srand(seed + 1) * 35 - 15;
      const b = 115 + srand(seed + 2) * 30 - 10;
      cc.fillStyle = `rgb(${r}, ${g2}, ${b})`;
      cc.fillRect(bx + 1, by + 1, blockW - 2, blockH - 2);
    }
  }

  // Mortar lines (slightly darker than stone)
  cc.strokeStyle = '#6a6458';
  cc.lineWidth = 3;
  for (let row = 0; row <= rows; row++) {
    const y = row * blockH;
    cc.beginPath(); cc.moveTo(0, y); cc.lineTo(size, y); cc.stroke();
    const offset = (row % 2) * blockW * 0.5;
    for (let col = 0; col <= cols + 1; col++) {
      const x = col * blockW + offset;
      cc.beginPath(); cc.moveTo(x, y); cc.lineTo(x, y + blockH); cc.stroke();
    }
  }

  // Weathering stains (dark vertical streaks running down from top)
  cc.globalAlpha = 0.12;
  for (let s = 0; s < 25; s++) {
    const sx = srand(s * 7 + 500) * size;
    const sw = 5 + srand(s * 7 + 501) * 15;
    const sh = size * 0.3 + srand(s * 7 + 502) * size * 0.7;
    const gradient = cc.createLinearGradient(sx, 0, sx, sh);
    gradient.addColorStop(0, '#3a3530');
    gradient.addColorStop(1, 'transparent');
    cc.fillStyle = gradient;
    cc.fillRect(sx - sw / 2, 0, sw, sh);
  }
  cc.globalAlpha = 1;

  // Lichen/moss patches (greenish spots, sparse)
  cc.globalAlpha = 0.08;
  for (let m = 0; m < 15; m++) {
    const mx = srand(m * 11 + 300) * size;
    const my = srand(m * 11 + 301) * size;
    const mr = 10 + srand(m * 11 + 302) * 30;
    cc.fillStyle = '#4a5a3a';
    cc.beginPath(); cc.arc(mx, my, mr, 0, Math.PI * 2); cc.fill();
  }
  cc.globalAlpha = 1;

  // Fine noise overlay
  const colorData = cc.getImageData(0, 0, size, size);
  const cd = colorData.data;
  for (let i = 0; i < cd.length; i += 4) {
    const n = (Math.random() - 0.5) * 10;
    cd[i] = Math.max(0, Math.min(255, cd[i] + n));
    cd[i + 1] = Math.max(0, Math.min(255, cd[i + 1] + n));
    cd[i + 2] = Math.max(0, Math.min(255, cd[i + 2] + n));
  }
  cc.putImageData(colorData, 0, 0);

  // ── Normal map ──
  const normalCanvas = document.createElement('canvas');
  normalCanvas.width = size;
  normalCanvas.height = size;
  const nc = normalCanvas.getContext('2d')!;

  nc.fillStyle = 'rgb(128, 128, 255)';
  nc.fillRect(0, 0, size, size);

  // Deep mortar grooves (strong normal perturbation)
  nc.strokeStyle = 'rgb(100, 100, 190)';
  nc.lineWidth = 5;
  for (let row = 0; row <= rows; row++) {
    const y = row * blockH;
    nc.beginPath(); nc.moveTo(0, y); nc.lineTo(size, y); nc.stroke();
    const offset = (row % 2) * blockW * 0.5;
    for (let col = 0; col <= cols + 1; col++) {
      const x = col * blockW + offset;
      nc.beginPath(); nc.moveTo(x, y); nc.lineTo(x, y + blockH); nc.stroke();
    }
  }

  // Edge highlights along mortar (simulates beveled stone edges)
  nc.strokeStyle = 'rgb(145, 145, 255)';
  nc.lineWidth = 2;
  for (let row = 0; row <= rows; row++) {
    const y = row * blockH + 3;
    nc.beginPath(); nc.moveTo(0, y); nc.lineTo(size, y); nc.stroke();
  }

  // Per-block face tilt (each stone slightly angled)
  for (let row = 0; row < rows; row++) {
    const offset = (row % 2) * blockW * 0.5;
    for (let col = 0; col < cols + 1; col++) {
      const bx2 = col * blockW + offset + 4;
      const by2 = row * blockH + 4;
      const bw = blockW - 8;
      const bh = blockH - 8;
      if (bw <= 0 || bh <= 0) continue;
      const seed = row * 100 + col + 7;
      const tr = 128 + (srand(seed) - 0.5) * 25;
      const tg = 128 + (srand(seed + 1) - 0.5) * 25;
      nc.fillStyle = `rgb(${tr}, ${tg}, 245)`;
      nc.globalAlpha = 0.35;
      nc.fillRect(bx2, by2, bw, bh);
      nc.globalAlpha = 1;
    }
  }

  // Surface grain noise
  const normalData = nc.getImageData(0, 0, size, size);
  const nd = normalData.data;
  for (let i = 0; i < nd.length; i += 4) {
    nd[i] += (Math.random() - 0.5) * 20;
    nd[i + 1] += (Math.random() - 0.5) * 20;
  }
  nc.putImageData(normalData, 0, 0);

  // Cracks (thin dark lines, random paths)
  nc.strokeStyle = 'rgb(108, 108, 210)';
  nc.lineWidth = 1.5;
  for (let c = 0; c < 12; c++) {
    let cx = srand(c * 13 + 600) * size;
    let cy = srand(c * 13 + 601) * size;
    nc.beginPath();
    nc.moveTo(cx, cy);
    const steps = 5 + Math.floor(srand(c * 13 + 602) * 10);
    for (let s = 0; s < steps; s++) {
      cx += (srand(c * 100 + s * 3) - 0.5) * 30;
      cy += srand(c * 100 + s * 3 + 1) * 20;
      nc.lineTo(cx, cy);
    }
    nc.stroke();
  }

  // Erosion pits
  nc.fillStyle = 'rgb(115, 115, 220)';
  for (let p = 0; p < 60; p++) {
    const px = srand(p * 5 + 800) * size;
    const py = srand(p * 5 + 801) * size;
    const pr = 2 + srand(p * 5 + 802) * 5;
    nc.beginPath(); nc.arc(px, py, pr, 0, Math.PI * 2); nc.fill();
  }

  // ── Roughness map ──
  const roughCanvas = document.createElement('canvas');
  roughCanvas.width = size;
  roughCanvas.height = size;
  const rc = roughCanvas.getContext('2d')!;

  // Base roughness (medium-high)
  rc.fillStyle = 'rgb(190, 190, 190)'; // ~0.75 roughness
  rc.fillRect(0, 0, size, size);

  // Per-block roughness variation
  for (let row = 0; row < rows; row++) {
    const offset = (row % 2) * blockW * 0.5;
    for (let col = 0; col < cols + 1; col++) {
      const bx3 = col * blockW + offset + 2;
      const by3 = row * blockH + 2;
      const bw = blockW - 4;
      const bh = blockH - 4;
      if (bw <= 0 || bh <= 0) continue;
      const seed = row * 100 + col + 50;
      const rough = 160 + srand(seed) * 60; // 0.63 - 0.86
      rc.fillStyle = `rgb(${rough}, ${rough}, ${rough})`;
      rc.fillRect(bx3, by3, bw, bh);
    }
  }

  // Mortar is rougher
  rc.strokeStyle = 'rgb(220, 220, 220)'; // ~0.86
  rc.lineWidth = 4;
  for (let row = 0; row <= rows; row++) {
    const y = row * blockH;
    rc.beginPath(); rc.moveTo(0, y); rc.lineTo(size, y); rc.stroke();
    const offset = (row % 2) * blockW * 0.5;
    for (let col = 0; col <= cols + 1; col++) {
      const x = col * blockW + offset;
      rc.beginPath(); rc.moveTo(x, y); rc.lineTo(x, y + blockH); rc.stroke();
    }
  }

  // Smooth worn patches (where water runs or people touch)
  rc.globalAlpha = 0.2;
  for (let w = 0; w < 10; w++) {
    const wx = srand(w * 9 + 900) * size;
    const wy = srand(w * 9 + 901) * size;
    const wr = 15 + srand(w * 9 + 902) * 40;
    rc.fillStyle = 'rgb(130, 130, 130)'; // smoother
    rc.beginPath(); rc.arc(wx, wy, wr, 0, Math.PI * 2); rc.fill();
  }
  rc.globalAlpha = 1;

  // Build textures
  const wrap = (c: HTMLCanvasElement, rx: number, ry: number) => {
    const t = new CanvasTexture(c);
    t.wrapS = RepeatWrapping;
    t.wrapT = RepeatWrapping;
    t.repeat.set(rx, ry);
    return t;
  };

  return {
    color: wrap(colorCanvas, 6, 6),
    normal: wrap(normalCanvas, 6, 6),
    roughness: wrap(roughCanvas, 6, 6),
  };
}

// ── Roof texture (normal only, simpler) ──

export function createRoofNormalMap(size = 512): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = 'rgb(128, 128, 255)';
  ctx.fillRect(0, 0, size, size);

  const rows = 16;
  const tileH = size / rows;
  const tileW = size / 6;

  ctx.strokeStyle = 'rgb(112, 112, 218)';
  ctx.lineWidth = 3;

  for (let row = 0; row <= rows; row++) {
    const y = row * tileH;
    const offset = (row % 2) * tileW * 0.5;
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(size, y); ctx.stroke();
    for (let col = 0; col <= 8; col++) {
      const x = col * tileW + offset;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + tileH); ctx.stroke();
    }
  }

  // Per-tile tilt
  for (let row = 0; row < rows; row++) {
    const offset = (row % 2) * tileW * 0.5;
    for (let col = 0; col <= 7; col++) {
      const tx = col * tileW + offset + 2;
      const ty = row * tileH + 2;
      const tw = tileW - 4;
      const th = tileH - 4;
      if (tw <= 0 || th <= 0) continue;
      const s = row * 50 + col;
      ctx.fillStyle = `rgb(${128 + (srand(s) - 0.5) * 20}, ${128 + (srand(s + 1) - 0.5) * 20}, 248)`;
      ctx.globalAlpha = 0.3;
      ctx.fillRect(tx, ty, tw, th);
      ctx.globalAlpha = 1;
    }
  }

  const imageData = ctx.getImageData(0, 0, size, size);
  const d = imageData.data;
  for (let i = 0; i < d.length; i += 4) {
    d[i] += (Math.random() - 0.5) * 14;
    d[i + 1] += (Math.random() - 0.5) * 14;
  }
  ctx.putImageData(imageData, 0, 0);

  const texture = new CanvasTexture(canvas);
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.repeat.set(4, 8);
  return texture;
}
