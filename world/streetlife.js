// V4 street life: New York details on the streets. Manhole steam, food carts, green street-name blades, newspaper boxes.
import * as THREE from 'three';
import { M, mat4, ubox } from './kit.js';
import { XS, ZS, ROAD, HALF } from './city.js';

const AVENUES = { '-325': 'Harbor Av', '-195': 'Innovation Av', '-65': 'Talent Av', '65': 'Discovery Av', '195': 'Skyport Av' };
const STREETS = { '-195': 'Market St', '-65': 'Plaza St', '65': 'Central St', '195': 'Garden St' };

function canvasTex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
// NYC-style green street blade with white letters and a thin white border
function bladeMat(name) {
  const tex = canvasTex(512, 96, (g, w, h) => {
    g.fillStyle = '#0f6b3a'; g.fillRect(0, 0, w, h); g.strokeStyle = '#f4f4f0'; g.lineWidth = 5; g.strokeRect(6, 6, w - 12, h - 12);
    g.fillStyle = '#f7f7f2'; g.font = '600 56px "Helvetica Neue", Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(name, w / 2, h / 2 + 3);
  });
  return new THREE.MeshStandardMaterial({ map: tex, roughness: 0.45, metalness: 0.1, side: THREE.DoubleSide });
}
function softPuff() {
  return canvasTex(64, 64, (g) => { const r = g.createRadialGradient(32, 32, 2, 32, 32, 31); r.addColorStop(0, 'rgba(255,255,255,0.9)'); r.addColorStop(0.5, 'rgba(240,242,245,0.45)'); r.addColorStop(1, 'rgba(240,242,245,0)'); g.fillStyle = r; g.fillRect(0, 0, 64, 64); });
}

export function buildStreetLife(ctx) {
  const free = (x, z, r) => !ctx.colliders.some(b => x > b.x0 - r && x < b.x1 + r && z > b.z0 - r && z < b.z1 + r && b.y0 < 2);
  // ---- street-name blades on one signal pole per intersection
  const o = ROAD / 2 + 0.7;
  for (const x of XS) for (const z of ZS) {
    const px = x + o, pz = z + o;
    ctx.box(px, 3.1, pz, 0.08, 1.5, 0.08, M('metalDark'));
    const st = STREETS[String(z)], av = AVENUES[String(x)];
    if (st) ctx.geo(new THREE.PlaneGeometry(1.7, 0.32), bladeMat(st), mat4(px - 0.9, 4.42, pz, 0), false);
    if (av) ctx.geo(new THREE.PlaneGeometry(1.7, 0.32), bladeMat(av), mat4(px, 4.06, pz - 0.9, Math.PI / 2), false);
  }
  // ---- newspaper / free-paper boxes beside corner bins
  const boxCols = [0x1f4fa8, 0xc8312a, 0xe8b417, 0x2e8b57];
  let k = 0;
  for (const x of XS) for (const z of ZS) {
    for (let i = 0; i < 2; i++, k++) {
      const bx = x - HALF + 1.0 + 0.75 * (i + 1), bz = z - ROAD / 2 - 3.6; if (!free(bx, bz, 0.3)) continue;
      const col = boxCols[k % 4];
      ctx.inst.add('paperbox' + col, () => { const b = new THREE.BoxGeometry(0.5, 0.95, 0.45); b.translate(0, 0.62, 0); const lid = new THREE.BoxGeometry(0.46, 0.3, 0.02); lid.translate(0, 0.86, 0.235);
        return [[b, new THREE.MeshStandardMaterial({ color: col, roughness: 0.5, metalness: 0.3 })], [lid, M('glassClear') || M('charcoal'), false]]; }, mat4(bx, 0.15, bz, Math.PI));
      ctx.collider(bx - 0.27, bx + 0.27, bz - 0.25, bz + 0.25, 0, 1.1);
    }
  }
  // ---- food carts (stainless cart, striped umbrella, menu board) on mid-block sidewalks
  const steam = [];
  const carts = [['HALAL · FALAFEL', 0xd8402f, 0xf3c623], ['HOT DOGS · PRETZELS', 0x1f5fb8, 0xf3c623], ['COFFEE · BAGELS', 0x2f6b3c, 0xf1ece0], ['TACOS', 0xe0782a, 0xf6e7c8], ['FRUIT · SMOOTHIES', 0x3a9a48, 0xf8f2e2], ['HALAL GYRO', 0xc22f2f, 0xf2f2f2]];
  let ci = 0;
  for (let i = 0; i < XS.length - 1 && ci < carts.length; i++) for (const z of ZS) {
    if (ci >= carts.length || (i + ZS.indexOf(z)) % 2) continue;
    const s = ZS.indexOf(z) % 2 ? 1 : -1; const cx = (XS[i] + XS[i + 1]) / 2 + 18, cz = z + s * (ROAD / 2 + 1.9);
    if (!free(cx, cz, 1.3)) continue;
    const [label, c1, c2] = carts[ci++]; const ry = s > 0 ? Math.PI : 0; // serving window faces the sidewalk
    const at = (lx, y, lz) => mat4(cx + Math.cos(ry) * lx + Math.sin(ry) * lz, y, cz - Math.sin(ry) * lx + Math.cos(ry) * lz, ry);
    ctx.geo(ubox(1.9, 1.0, 0.95), M('metalLight'), at(0, 0.75, 0));
    ctx.geo(ubox(1.95, 0.05, 1.05), M('metalLight'), at(0, 1.27, 0));
    ctx.geo(ubox(1.7, 0.55, 0.03), new THREE.MeshStandardMaterial({ map: canvasTex(512, 160, (g, w, h) => { g.fillStyle = '#' + c1.toString(16).padStart(6, '0'); g.fillRect(0, 0, w, h); g.fillStyle = '#fff'; g.font = '700 54px Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(label, w / 2, h / 2); }), roughness: 0.6 }), at(0, 0.62, -0.49));
    for (const lx of [-0.75, 0.75]) ctx.geo(new THREE.CylinderGeometry(0.2, 0.2, 0.08, 14).rotateZ(Math.PI / 2), M('rubber'), at(lx, 0.2, 0.4));
    ctx.geo(new THREE.CylinderGeometry(0.03, 0.03, 1.4, 6), M('metalDark'), at(0, 1.95, 0));
    for (let pnl = 0; pnl < 12; pnl++) { // striped umbrella: alternating canvas panels
      const g = new THREE.ConeGeometry(1.45, 0.5, 2, 1, true, pnl * Math.PI / 6, Math.PI / 6);
      ctx.geo(g, new THREE.MeshStandardMaterial({ color: pnl % 2 ? c1 : c2, roughness: 0.8, side: THREE.DoubleSide }), at(0, 2.75, 0), false);
    }
    ctx.collider(cx - 1.05, cx + 1.05, cz - 0.6, cz + 0.6, 0, 2);
    steam.push({ x: cx + Math.cos(ry) * 0.5, y: 1.35, z: cz - Math.sin(ry) * 0.5, s: 0.35, rise: 1.4, n: 4 });
  }
  // ---- manholes with steam drifting up from the street (cars drive through it)
  for (let i = 0; i < XS.length - 1; i++) for (const z of ZS) {
    if ((i + ZS.indexOf(z)) % 2) continue;
    const mx = (XS[i] + XS[i + 1]) / 2 - 22, mz = z + (ZS.indexOf(z) % 2 ? 0.9 : -0.9);
    ctx.geo(new THREE.CircleGeometry(0.42, 20), M('metalDark'), mat4(mx, 0.03, mz, 0, 1, 1, 1, -Math.PI / 2), false);
    steam.push({ x: mx, y: 0.05, z: mz, s: 1, rise: 3.8, n: 7 });
  }
  const puff = softPuff(), sprites = [];
  const grp = new THREE.Group(); ctx.scene.add(grp);
  for (const src of steam) for (let j = 0; j < src.n; j++) {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: puff, transparent: true, depthWrite: false, opacity: 0, color: 0xf2f4f7 }));
    sp.renderOrder = 2; grp.add(sp); sprites.push({ sp, src, ph: j / src.n, sd: Math.random() * 10 });
  }
  ctx.streetSteam = { group: grp, sprites };
  ctx.animated.push(t => {
    for (const p of sprites) {
      const { src } = p; const u = (t / (2.6 + src.s * 1.6) + p.ph) % 1; const sp = p.sp;
      const drift = Math.sin(t * 0.7 + p.sd) * 0.35 * src.s;
      sp.position.set(src.x + drift + u * 0.8 * src.s, src.y + u * src.rise, src.z + Math.cos(t * 0.5 + p.sd) * 0.25 * src.s);
      const sc = src.s * (0.9 + u * 3.2); sp.scale.set(sc, sc, 1);
      sp.material.opacity = Math.sin(Math.PI * Math.min(1, u * 1.15)) * (src.s < 1 ? 0.5 : 0.75);
    }
  });
}
