// Procedural facade / sign textures + loaded CC0 PBR textures (Poly Haven).
import * as THREE from 'three';

const loader = new THREE.TextureLoader();
const cache = {};
let maxAniso = 4;
export function setAniso(n) { maxAniso = n; }

// Loaded PBR set: assets/tex/<name>_diff.jpg + _nor.jpg. Repeat is set per material (world-scale UVs: 1 unit = 1 m).
export function pbr(name, tile = 4) {
  const k = name + tile; if (cache[k]) return cache[k];
  const map = loader.load(`assets/tex/${name}_diff.jpg`); map.colorSpace = THREE.SRGBColorSpace;
  const nor = loader.load(`assets/tex/${name}_nor.jpg`);
  for (const t of [map, nor]) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1 / tile, 1 / tile); t.anisotropy = maxAniso; }
  return (cache[k] = { map, normalMap: nor });
}

function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; }
function tex(c, tileW, tileH, srgb = true) {
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1 / tileW, 1 / tileH);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = maxAniso; return t;
}
// deterministic random
export function rng(seed) { let s = seed >>> 0 || 1; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

// Curtain-wall glass: a tile of `bays` x `floors` panes, each pane shows a faint interior (ceiling light, desks, plants)
// under a sky-reflection gradient. tileW/tileH = metres covered by the tile.
export function glassFacade({ tint = [70, 110, 150], mullion = '#2a3340', bays = 4, floors = 3, bayW = 1.6, floorH = 4, seed = 1, warm = 0.35, spandrel = true } = {}) {
  const key = 'g' + tint + mullion + bays + floors + seed + warm + spandrel; if (cache[key]) return cache[key];
  const W = 512, H = 512, [c, g] = canvas(W, H), r = rng(seed);
  const pw = W / bays, ph = H / floors;
  for (let f = 0; f < floors; f++) for (let b = 0; b < bays; b++) {
    const x = b * pw, y = f * ph;
    // interior
    const lit = r() < 0.75;
    const base = lit ? `rgb(${150 + r() * 40 | 0},${145 + r() * 35 | 0},${130 + r() * 30 | 0})` : 'rgb(60,66,74)';
    g.fillStyle = base; g.fillRect(x, y, pw, ph);
    if (lit) {
      g.fillStyle = r() < warm ? 'rgba(255,236,200,0.9)' : 'rgba(235,245,255,0.9)'; g.fillRect(x + pw * 0.08, y + ph * 0.06, pw * 0.84, ph * 0.05); // ceiling light strip
      // desks / chairs / plants silhouettes
      const n = 1 + (r() * 3 | 0);
      for (let i = 0; i < n; i++) {
        const dx = x + pw * (0.1 + r() * 0.6), dw = pw * (0.2 + r() * 0.25);
        g.fillStyle = 'rgba(40,40,45,0.55)'; g.fillRect(dx, y + ph * 0.62, dw, ph * 0.05); g.fillRect(dx + dw * 0.1, y + ph * 0.67, dw * 0.08, ph * 0.2);
        if (r() < 0.5) { g.fillStyle = 'rgba(30,30,35,0.6)'; g.fillRect(dx + dw * 0.35, y + ph * 0.45, dw * 0.3, ph * 0.17); } // monitor
        if (r() < 0.25) { g.fillStyle = 'rgba(40,90,50,0.7)'; g.beginPath(); g.arc(x + pw * (0.15 + r() * 0.7), y + ph * 0.62, pw * 0.08, 0, 7); g.fill(); }
      }
    }
    // reflection gradient
    const grd = g.createLinearGradient(x, y, x + pw * 0.6, y + ph);
    grd.addColorStop(0, `rgba(${tint[0] + 60},${tint[1] + 60},${tint[2] + 60},0.70)`);
    grd.addColorStop(0.5, `rgba(${tint[0]},${tint[1]},${tint[2]},0.55)`);
    grd.addColorStop(1, `rgba(${tint[0] - 30},${tint[1] - 30},${tint[2] - 30},0.75)`);
    g.fillStyle = grd; g.fillRect(x, y, pw, ph);
    if (spandrel) { g.fillStyle = `rgb(${tint[0] * 0.45 | 0},${tint[1] * 0.45 | 0},${tint[2] * 0.5 | 0})`; g.fillRect(x, y + ph * 0.86, pw, ph * 0.14); }
  }
  g.strokeStyle = mullion; g.lineWidth = 6;
  for (let b = 0; b <= bays; b++) { g.beginPath(); g.moveTo(b * pw, 0); g.lineTo(b * pw, H); g.stroke(); }
  g.lineWidth = 8; for (let f = 0; f <= floors; f++) { g.beginPath(); g.moveTo(0, f * ph); g.lineTo(W, f * ph); g.stroke(); }
  return (cache[key] = tex(c, bays * bayW, floors * floorH));
}

// Solid facade with punched / ribbon windows. kind: 'ribbon' | 'punched'
export function panelFacade({ wall = '#e9e6df', glass = [80, 110, 140], kind = 'ribbon', floors = 3, bays = 4, bayW = 2.5, floorH = 4, seed = 2, joints = true } = {}) {
  const key = 'p' + wall + glass + kind + floors + bays + seed; if (cache[key]) return cache[key];
  const W = 512, H = 512, [c, g] = canvas(W, H), r = rng(seed);
  g.fillStyle = wall; g.fillRect(0, 0, W, H);
  // subtle panel noise
  for (let i = 0; i < 1500; i++) { g.fillStyle = `rgba(0,0,0,${r() * 0.04})`; g.fillRect(r() * W, r() * H, 2, 2); }
  const pw = W / bays, ph = H / floors;
  if (joints) { g.strokeStyle = 'rgba(0,0,0,0.12)'; g.lineWidth = 2; for (let b = 0; b <= bays; b++) { g.beginPath(); g.moveTo(b * pw, 0); g.lineTo(b * pw, H); g.stroke(); } }
  for (let f = 0; f < floors; f++) {
    const y = f * ph;
    const win = (x, w) => {
      const lit = r() < 0.7;
      g.fillStyle = lit ? 'rgb(170,165,150)' : 'rgb(55,62,70)'; g.fillRect(x, y + ph * 0.25, w, ph * 0.5);
      if (lit) { g.fillStyle = 'rgba(40,40,45,0.5)'; g.fillRect(x + w * 0.2, y + ph * 0.55, w * 0.3, ph * 0.04); g.fillStyle = 'rgba(255,240,215,0.8)'; g.fillRect(x, y + ph * 0.27, w, ph * 0.03); }
      const grd = g.createLinearGradient(x, y + ph * 0.25, x + w, y + ph * 0.75);
      grd.addColorStop(0, `rgba(${glass[0] + 70},${glass[1] + 70},${glass[2] + 70},0.65)`); grd.addColorStop(1, `rgba(${glass[0]},${glass[1]},${glass[2]},0.7)`);
      g.fillStyle = grd; g.fillRect(x, y + ph * 0.25, w, ph * 0.5);
      g.strokeStyle = 'rgba(40,45,55,0.9)'; g.lineWidth = 3; g.strokeRect(x, y + ph * 0.25, w, ph * 0.5);
    };
    if (kind === 'ribbon') { win(0, W); for (let b = 1; b < bays * 2; b++) { g.fillStyle = 'rgba(40,45,55,0.9)'; g.fillRect(b * pw / 2 - 2, y + ph * 0.25, 4, ph * 0.5); } }
    else for (let b = 0; b < bays; b++) win(b * pw + pw * 0.2, pw * 0.6);
    g.fillStyle = 'rgba(0,0,0,0.08)'; g.fillRect(0, y + ph * 0.8, W, 3);
  }
  return (cache[key] = tex(c, bays * bayW, floors * floorH));
}

// Masonry: 'brick' | 'limestone'
export function masonry({ kind = 'brick', base = '#8a4b38', mortar = '#c9bfb2', seed = 3 } = {}) {
  const key = 'm' + kind + base + seed; if (cache[key]) return cache[key];
  const W = 512, H = 512, [c, g] = canvas(W, H), r = rng(seed);
  g.fillStyle = mortar; g.fillRect(0, 0, W, H);
  const bw = kind === 'brick' ? 64 : 128, bh = kind === 'brick' ? 21.33 : 64, gap = kind === 'brick' ? 3 : 2;
  const col = new THREE.Color(base);
  for (let row = 0; row * bh < H; row++) for (let x = -(row % 2) * bw / 2; x < W; x += bw) {
    const k = 0.85 + r() * 0.25; g.fillStyle = `rgb(${col.r * 255 * k | 0},${col.g * 255 * k | 0},${col.b * 255 * k | 0})`;
    g.fillRect(x + gap / 2, row * bh + gap / 2, bw - gap, bh - gap);
  }
  for (let i = 0; i < 3000; i++) { g.fillStyle = `rgba(0,0,0,${r() * 0.05})`; g.fillRect(r() * W, r() * H, 2, 2); }
  return (cache[key] = tex(c, kind === 'brick' ? 2.4 : 4.8, kind === 'brick' ? 1.6 : 2.4));
}

export function woodSlats(seed = 4) {
  if (cache.wood) return cache.wood;
  const W = 256, H = 256, [c, g] = canvas(W, H), r = rng(seed);
  for (let x = 0; x < W; x += 16) { const k = 0.85 + r() * 0.3; g.fillStyle = `rgb(${160 * k | 0},${110 * k | 0},${70 * k | 0})`; g.fillRect(x, 0, 14, H); g.fillStyle = 'rgba(40,25,15,0.7)'; g.fillRect(x + 14, 0, 2, H); }
  for (let i = 0; i < 400; i++) { g.fillStyle = `rgba(60,35,20,${r() * 0.15})`; g.fillRect(r() * W, r() * H, 1, 10 + r() * 30); }
  return (cache.wood = tex(c, 1.6, 1.6));
}

export function roadMarkings() {
  if (cache.road) return cache.road;
  // 8 m wide roadway tile (u across, v along) 8 x 12 m: edge lines + centre dashes
  const W = 256, H = 384, [c, g] = canvas(W, H);
  g.clearRect(0, 0, W, H);
  g.fillStyle = 'rgba(255,255,255,0.85)'; g.fillRect(6, 0, 5, H); g.fillRect(W - 11, 0, 5, H);
  g.fillStyle = 'rgba(245,200,70,0.95)'; g.fillRect(W / 2 - 4, 0, 3, H * 0.5); g.fillRect(W / 2 + 2, 0, 3, H * 0.5);
  const t = new THREE.CanvasTexture(c); t.wrapS = THREE.ClampToEdgeWrapping; t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = maxAniso;
  return (cache.road = t);
}
export function zebra() {
  if (cache.zebra) return cache.zebra;
  const [c, g] = canvas(256, 64); g.clearRect(0, 0, 256, 64); g.fillStyle = 'rgba(255,255,255,0.9)';
  for (let x = 8; x < 256; x += 32) g.fillRect(x, 0, 18, 64);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = maxAniso; return (cache.zebra = t);
}

// Professional signage: crisp text on a panel. Returns {tex, aspect}
export function signTex(text, { bg = '#101A32', fg = '#F5F7FB', accent = null, font = 'Plus Jakarta Sans, Inter, Arial', weight = 700, sub = '' } = {}) {
  const key = 's' + text + bg + fg + accent + sub; if (cache[key]) return cache[key];
  const h = 128, [m] = canvas(8, 8); const mg = m.getContext('2d'); mg.font = `${weight} 72px ${font}`;
  const w = Math.max(256, Math.ceil(mg.measureText(text).width + 120 + (accent ? 40 : 0)));
  const [c, g] = canvas(w, sub ? 176 : h);
  if (bg) { g.fillStyle = bg; g.fillRect(0, 0, w, c.height); }
  let x = 60;
  if (accent) { g.fillStyle = accent; g.fillRect(36, 30, 10, c.height - 60); x = 70; }
  g.fillStyle = fg; g.font = `${weight} 72px ${font}`; g.textBaseline = 'middle'; g.fillText(text, x, 64);
  if (sub) { g.font = `500 38px ${font}`; g.globalAlpha = 0.8; g.fillText(sub, x, 136); g.globalAlpha = 1; }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = maxAniso;
  return (cache[key] = { tex: t, aspect: w / c.height });
}

// Animated billboard canvas (Creative Quarter screens). Returns {tex, draw(t)}
export function billboard(seed = 1) {
  const [c, g] = canvas(512, 256); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const ads = [['DESIGN THE FUTURE', '#8056F6', '#F5F7FB'], ['TALENTOPIA', '#101A32', '#51C9E8'], ['MADE IN THE QUARTER', '#F3A7B5', '#101A32'], ['FIND YOUR CAREER', '#51C9E8', '#101A32']];
  let last = -1;
  return { tex: t, draw(time) {
    const i = Math.floor(time / 4 + seed) % ads.length; const p = (time / 4 + seed) % 1;
    if (i === last && p > 0.15) return; last = i;
    const [txt, bg, fg] = ads[i];
    g.fillStyle = bg; g.fillRect(0, 0, 512, 256);
    g.globalAlpha = 0.25; g.fillStyle = fg; for (let k = 0; k < 6; k++) { g.beginPath(); g.arc(80 + k * 80, 200 - Math.sin(k + i) * 40, 50, 0, 7); g.fill(); } g.globalAlpha = 1;
    g.fillStyle = fg; g.font = '800 48px Plus Jakarta Sans, Arial'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(txt, 256, 118);
    g.font = '500 22px Plus Jakarta Sans, Arial'; g.fillText('Creative Quarter · Talentopia', 256, 170);
    t.needsUpdate = true;
  } };
}

// Departure / info board
export function boardTex(lines, { bg = '#0c1426', fg = '#f3c679', title = '' } = {}) {
  const [c, g] = canvas(512, 256); g.fillStyle = bg; g.fillRect(0, 0, 512, 256);
  g.font = '700 26px Plus Jakarta Sans, Arial'; g.fillStyle = '#F5F7FB'; g.fillText(title, 20, 36);
  g.font = '600 22px ui-monospace, Menlo, monospace'; g.fillStyle = fg; lines.forEach((l, i) => g.fillText(l, 20, 76 + i * 34));
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
