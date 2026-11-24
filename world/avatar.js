// Talentopia V2 avatar: a customisable MPFB/MakeHuman (CC0) body with morph targets, swappable hair/outfit/shoes/hat parts bound to
// one skeleton, material variations (skin, eyes, hair, outfit tint), procedural eyewear, and the Avatar Studio UI.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone as skClone } from 'three/addons/utils/SkeletonUtils.js';

const loader = new GLTFLoader(), texLoader = new THREE.TextureLoader();
const load = url => new Promise((res, rej) => loader.load(url, res, undefined, rej));
const $ = id => document.getElementById(id);
// Assets are downloaded once and shared: every AvatarModel (the player and each staff member) is a skeleton clone of the same base,
// with its own materials. Body index buffers (skin hidden under clothes) are cached per outfit+shoes combination.
const shared = { p: null, parts: {}, gray: new WeakMap(), skins: {}, iris: {}, strands: {}, geo: {} };
// Talentopia uniform: the tailored suits re-dressed in graphite navy with glowing violet piping along every seam and hem,
// plus a small Talentopia pin (uses the replaceable logo placeholder). Added to the catalog at load, no extra download.
function augmentCatalog(cat) {
  if (cat._v3) return cat; cat._v3 = true;
  for (const [id, base, label] of [['talentopia_m', 'male_elegantsuit01', 'Talentopia · classic cut'], ['talentopia_f', 'female_elegantsuit01', 'Talentopia · tailored cut']]) {
    const b = cat.parts.outfit.find(p => p.id === base); if (!b) continue; cat.parts.outfit.unshift({ ...b, id, label, style: 'talentopia', base }); cat.hideBits[id] = cat.hideBits[base];
  }
  // tailored cut with trousers: the tailored jacket (skirt pieces removed) worn over the suit trousers (jacket and shirt pieces removed)
  const tf = cat.parts.outfit.find(p => p.id === 'talentopia_f'), ms = cat.parts.outfit.find(p => p.id === 'male_elegantsuit01');
  if (tf && ms) { tf.compose = [{ file: tf.file, keep: 'upper', bit: cat.hideBits.female_elegantsuit01 }, { file: ms.file, keep: 'lower', bit: cat.hideBits.male_elegantsuit01 }]; tf.label = 'Talentopia · tailored cut'; }
  // V4 Signature look (approved character concept): iridescent lilac jacket with light piping over pearl trousers
  // modelled in Blender on the avatar body (blender/signature_outfit.py): cropped jacket with stand collar and light piping, wide cargo trousers, belt
  cat.parts.outfit.unshift({ id: 'signature_f', label: 'Signature · iridescent', file: 'parts/outfit_signature01.glb', mesh: 'outfit__signature01', style: 'signature2',
    hideCompose: [{ bit: cat.hideBits.female_elegantsuit01 }, { bit: cat.hideBits.male_elegantsuit01 }] });
  // (the procedural 'Messy bun' is retired until it is modelled properly; saved bun looks fall back to the ponytail)
  return cat;
}
const pearlCache = {};
function pearlMap(tex, rgb, lo, hi) { const k0 = tex.uuid + rgb.join(); let t = pearlCache[k0]; if (t) return t;
  const img = tex.image, c = document.createElement('canvas'); c.width = img.width; c.height = img.height; const g = c.getContext('2d'); g.drawImage(img, 0, 0);
  const d = g.getImageData(0, 0, c.width, c.height), p = d.data;
  for (let i = 0; i < p.length; i += 4) { const l = (0.3 * p[i] + 0.59 * p[i + 1] + 0.11 * p[i + 2]) / 255, k = Math.min(1.08, lo + hi * l); p[i] = Math.min(255, rgb[0] * k); p[i + 1] = Math.min(255, rgb[1] * k); p[i + 2] = Math.min(255, rgb[2] * k); }
  g.putImageData(d, 0, 0); t = new THREE.CanvasTexture(c); t.flipY = tex.flipY; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return (pearlCache[k0] = t); }
function signature2Mat(m) { // materials of the Blender-built Signature outfit, by name
  const n = m.name || '', c = col => new THREE.Color(col);
  let out;
  if (n === 'SigJacket') out = new THREE.MeshPhysicalMaterial({ color: c(0xb3a0e8), roughness: 0.36, metalness: 0.12, iridescence: 0.9, iridescenceIOR: 1.33, iridescenceThicknessRange: [200, 520],
    sheen: 0.25, sheenColor: c(0xc9b6ff), sheenRoughness: 0.45, clearcoat: 0.25, clearcoatRoughness: 0.3, envMapIntensity: 1.2 });
  else if (n === 'SigLight') out = new THREE.MeshStandardMaterial({ color: c(0xffffff), emissive: c(0xf4efff), emissiveIntensity: 2.4, roughness: 0.3 });
  else if (n === 'SigTrousers' || n === 'SigFlap') out = new THREE.MeshPhysicalMaterial({ color: c(n === 'SigFlap' ? 0xe2dde9 : 0xece8f0), roughness: 0.55, sheen: 0.35, sheenColor: c(0xffffff), sheenRoughness: 0.5, side: THREE.DoubleSide, envMapIntensity: 1.1 });
  else if (n === 'SigBelt') out = new THREE.MeshPhysicalMaterial({ color: c(0xeee8de), roughness: 0.42, sheen: 0.4, sheenColor: c(0xffffff), side: THREE.DoubleSide });
  else if (n === 'SigMetal') out = new THREE.MeshStandardMaterial({ color: c(0xdfe3e9), metalness: 1, roughness: 0.2, envMapIntensity: 1.4 });
  else return m;
  out.name = n; out.userData.ownColor = true; return out;
}
function signatureMat(m, geo, part) { // part: 'upper' jacket (iridescent lilac, glowing piping) | 'lower' trousers (pearl)
  const jacket = part !== 'lower';
  const n = new THREE.MeshPhysicalMaterial({ map: m.map ? pearlMap(m.map, jacket ? [198, 178, 236] : [238, 235, 242], jacket ? 0.8 : 0.62, jacket ? 0.16 : 0.42) : null,
    normalMap: m.normalMap || null, side: m.side, transparent: false, alphaTest: Math.max(0.5, m.alphaTest || 0), roughness: jacket ? 0.42 : 0.5, metalness: jacket ? 0.08 : 0.02,
    iridescence: jacket ? 0.65 : 0, iridescenceIOR: 1.32, iridescenceThicknessRange: [160, 520], sheen: jacket ? 0.35 : 0.3, sheenColor: new THREE.Color(jacket ? 0xd8c8ff : 0xf2eef8), sheenRoughness: 0.45,
    clearcoat: jacket ? 0.2 : 0, clearcoatRoughness: 0.25, envMapIntensity: 1.25,
    emissive: new THREE.Color(0xf4efff), emissiveMap: pipingTex(geo), emissiveIntensity: jacket ? 1.5 : 0.35 });
  n.name = m.name; return n;
}
// messy bun: three twisted hair loops and a core, high on the crown, plus two loose strands framing the face (all on the head bone)
function bunGeometry(centre, up, back, side) {
  const parts = [], basis = new THREE.Matrix4().makeBasis(side, up, back);
  const layer = (R, r, tilt, spin, sx = 1) => { const g = new THREE.TorusGeometry(R, r, 10, 40); const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getY(i), uv.getX(i) * 3); // strands run around the loop
    g.rotateX(Math.PI / 2 + tilt); g.rotateY(spin); g.scale(sx, 0.78, 1); return g; };
  parts.push(layer(0.03, 0.021, 0.15, 0.3), layer(0.022, 0.018, -0.25, 1.6, 1.05));
  const core = new THREE.SphereGeometry(0.036, 16, 12); core.scale(1.1, 0.8, 1); parts.push(core);
  for (const g of parts) { g.applyMatrix4(basis); g.translate(centre.x, centre.y, centre.z); }
  return mergeGeometries(parts, false);
}
function strandGeometry(start, down, outward, front, len = 0.15) {
  const seg = 10, pos = [], uv = [], idx = [], w = 0.011;
  for (let i = 0; i <= seg; i++) { const t = i / seg, wave = Math.sin(t * Math.PI * 2.2) * 0.008, p = start.clone().addScaledVector(down, len * t).addScaledVector(outward, wave + 0.01 * t).addScaledVector(front, 0.006 * t);
    const half = w * (1 - 0.7 * t); pos.push(p.x - outward.x * half, p.y - outward.y * half, p.z - outward.z * half, p.x + outward.x * half, p.y + outward.y * half, p.z + outward.z * half);
    uv.push(0, t, 1, t); if (i < seg) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); } }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals(); return g;
}
const navyCache = {};
function navyMap(tex) { let t = navyCache[tex.uuid]; if (t) return t;
  const img = tex.image, c = document.createElement('canvas'); c.width = img.width; c.height = img.height; const g = c.getContext('2d'); g.drawImage(img, 0, 0);
  const d = g.getImageData(0, 0, c.width, c.height), p = d.data;
  for (let i = 0; i < p.length; i += 4) { const l = (0.3 * p[i] + 0.59 * p[i + 1] + 0.11 * p[i + 2]) / 255, k = 0.35 + 0.9 * l; p[i] = 22 * k; p[i + 1] = 26 * k; p[i + 2] = 44 * k; }
  g.putImageData(d, 0, 0); t = new THREE.CanvasTexture(c); t.flipY = tex.flipY; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; navyCache[tex.uuid] = t; return t; }
const islandCache = {};
function filterIslands(s0, keep) {
  const key = s0.geometry.uuid + keep; if (islandCache[key]) return islandCache[key];
  const g0 = s0.geometry, idx = g0.index.array, pos = g0.attributes.position, n = pos.count, par = new Int32Array(n).map((_, i) => i);
  const find = a => { while (par[a] !== a) a = par[a] = par[par[a]]; return a; };
  for (let i = 0; i < idx.length; i += 3) { const a = find(idx[i]), b = find(idx[i + 1]), c = find(idx[i + 2]); par[b] = a; par[c] = a; }
  const sum = new Map(); for (let i = 0; i < n; i++) { const r = find(i), o = sum.get(r) || [0, 0]; o[0] += pos.getY(i); o[1]++; sum.set(r, o); }
  const sk = s0.skeleton, pi = sk.bones.findIndex(b => b.name === 'pelvis'); const pelvisY = pi >= 0 ? new THREE.Vector3().setFromMatrixPosition(new THREE.Matrix4().copy(sk.boneInverses[pi]).invert()).y : 0.95;
  const ok = r => { const [t, c] = sum.get(r), y = t / c; return keep === 'upper' ? y > pelvisY - 0.04 : y < pelvisY - 0.06; };
  const out = []; for (let i = 0; i < idx.length; i += 3) if (ok(find(idx[i]))) out.push(idx[i], idx[i + 1], idx[i + 2]);
  const g = new THREE.BufferGeometry(); for (const k in g0.attributes) g.setAttribute(k, g0.attributes[k]); g.morphAttributes = g0.morphAttributes; g.morphTargetsRelative = g0.morphTargetsRelative; g.setIndex(out);
  g.boundingSphere = g0.boundingSphere; g.boundingBox = g0.boundingBox; return (islandCache[key] = { geo: g, pelvisY });
}
const pipingCache = {};
function pipingTex(geo) { // white lines on black along UV-island borders (garment seams, lapels, cuffs, hems) → emissive piping
  if (pipingCache[geo.uuid]) return pipingCache[geo.uuid];
  const S = 1024, c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d'); g.fillStyle = '#000'; g.fillRect(0, 0, S, S);
  const uv = geo.attributes.uv, idx = geo.index ? geo.index.array : null, n = idx ? idx.length : uv.count, q = v => Math.round(v * 4096);
  const key = (a, b) => { const ka = q(uv.getX(a)) + ',' + q(uv.getY(a)), kb = q(uv.getX(b)) + ',' + q(uv.getY(b)); return ka < kb ? ka + '|' + kb : kb + '|' + ka; };
  const cnt = new Map(), ends = new Map();
  for (let i = 0; i < n; i += 3) { const t = idx ? [idx[i], idx[i + 1], idx[i + 2]] : [i, i + 1, i + 2];
    for (let e = 0; e < 3; e++) { const a = t[e], b = t[(e + 1) % 3], k = key(a, b); cnt.set(k, (cnt.get(k) || 0) + 1); if (!ends.has(k)) ends.set(k, [a, b]); } }
  g.strokeStyle = '#fff'; g.lineCap = 'round';
  for (const [w, al] of [[9, 0.35], [4, 1]]) { g.lineWidth = w; g.globalAlpha = al; g.beginPath();
    for (const [k, c2] of cnt) if (c2 === 1) { const [a, b] = ends.get(k); g.moveTo(uv.getX(a) * S, uv.getY(a) * S); g.lineTo(uv.getX(b) * S, uv.getY(b) * S); } g.stroke(); }
  const t = new THREE.CanvasTexture(c); t.flipY = false; t.colorSpace = THREE.SRGBColorSpace; return (pipingCache[geo.uuid] = t);
}
function pinTexture() { // gold-rimmed badge; the centre shows the logo placeholder (assets/brand/logo.svg) once it loads
  const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'), t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const draw = (img) => { g.clearRect(0, 0, 128, 128); g.fillStyle = '#D8B98A'; g.beginPath(); g.arc(64, 64, 62, 0, 7); g.fill(); const gr = g.createLinearGradient(0, 0, 128, 128); gr.addColorStop(0, '#42DBFF'); gr.addColorStop(1, '#8D70FF');
    g.fillStyle = gr; g.beginPath(); g.arc(64, 64, 52, 0, 7); g.fill(); if (img) { g.save(); g.beginPath(); g.arc(64, 64, 44, 0, 7); g.clip(); g.drawImage(img, 20, 20, 88, 88); g.restore(); } t.needsUpdate = true; };
  draw(null); const img = new Image(); img.onload = () => draw(img); img.src = 'assets/brand/logo.svg'; return t;
}
function assets() {
  return shared.p || (shared.p = Promise.all([fetch('assets/avatar/avatar_catalog.json').then(r => r.json()), load('assets/avatar/avatar_base.glb'), load('assets/avatar/avatar_anims.glb')])
    .then(([cat, base, anims]) => ({ cat: augmentCatalog(cat), base, anims })));
}
const cloneMat = m => Array.isArray(m) ? m.map(x => x.clone()) : m.clone();
function grayCached(tex) { let t = shared.gray.get(tex); if (!t) { t = grayMap(tex); shared.gray.set(tex, t); } return t; }
// makeup regions come from the face's own morph targets: vertices moved by 'lipsFull' are the lips, by 'blinkL/R' the upper lids
const faceRegions = {};
function regionsFor(body) {
  const g = body.geometry, key = g.uuid; if (faceRegions[key]) return faceRegions[key];
  const dict = body.morphTargetDictionary || {}, mp = g.morphAttributes.position || [], idx = g.index.array, uv = g.attributes.uv;
  const moved = (name, th) => { const a = mp[dict[name]]; if (!a) return null; const s = new Uint8Array(a.count); for (let i = 0; i < a.count; i++) if (Math.hypot(a.getX(i), a.getY(i), a.getZ(i)) > th) s[i] = 1; return s; };
  const lips = moved('lipsFull', 0.0012), l1 = moved('blinkL', 0.002), l2 = moved('blinkR', 0.002);
  const tris = (set) => { const out = []; if (!set) return out; for (let i = 0; i < idx.length; i += 3) { const a = idx[i], b = idx[i + 1], c = idx[i + 2]; if (set[a] && set[b] && set[c]) out.push([uv.getX(a), uv.getY(a), uv.getX(b), uv.getY(b), uv.getX(c), uv.getY(c)]); } return out; };
  const lids = l1 && l2 ? l1.map((v, i) => v | l2[i]) : l1 || l2;
  return (faceRegions[key] = { lips: tris(lips), lids: tris(lids) });
}
const makeupCache = {};
function skinWithMakeup(tex, body, look) {
  const k = tex.uuid + look; if (makeupCache[k]) return makeupCache[k];
  const img = tex.image, W = img.width, H = img.height, c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d'); g.drawImage(img, 0, 0);
  const R = regionsFor(body), L = document.createElement('canvas'); L.width = W; L.height = H; const lg = L.getContext('2d');
  const fill = (tris, col) => { lg.fillStyle = col; lg.beginPath(); for (const t of tris) { lg.moveTo(t[0] * W, t[1] * H); lg.lineTo(t[2] * W, t[3] * H); lg.lineTo(t[4] * W, t[5] * H); lg.closePath(); } lg.fill(); };
  const bold = look === 'bold';
  fill(R.lips, bold ? 'rgba(150,30,70,0.8)' : 'rgba(214,128,132,0.34)'); fill(R.lids, bold ? 'rgba(85,50,150,0.75)' : 'rgba(176,140,150,0.14)');
  g.save(); g.filter = `blur(${Math.max(2, W / 600)}px)`; g.globalCompositeOperation = 'multiply'; g.drawImage(L, 0, 0); g.restore();
  const t = new THREE.CanvasTexture(c); t.flipY = tex.flipY; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return (makeupCache[k] = t);
}
function skinTex(id) { return shared.skins[id] || (shared.skins[id] = new Promise(res => texLoader.load(`assets/avatar/skins/${id}.jpg`, t => { t.flipY = false; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; res(t); }, undefined, () => res(null)))); }

export const DEFAULT = { pres: -0.4, build: 0, muscle: 0.25, height: 1.0, jawWide: 0, chinStrong: 0, nose: 0, cheekbones: 0.25, eyesBig: 0, eyesUp: 0, lipsFull: 0, head: 0,
  skin: 'young_asian_female', tone: -0.06, makeup: 'none', eyes: '#5b3a22', hair: 'long01', hairColor: '#1b1411', brows: 'eyebrow006', beard: 'none',
  outfit: 'talentopia_f', outfitTint: '#ffffff', shoes: 'shoes06', glasses: 'none', hat: 'none' }; // new guests start in the Talentopia uniform
export const PRESETS = {
  feminine: { pres: -0.8, build: -0.1, muscle: 0.2, hair: 'long01', brows: 'eyebrow001', beard: 'none', outfit: 'female_elegantsuit01', shoes: 'shoes01', skin: 'young_african_female', hairColor: '#1b1411', cheekbones: 0.4, jawWide: 0 },
  masculine: { pres: 0.85, build: 0.05, muscle: 0.5, hair: 'short02', brows: 'eyebrow006', beard: 'stubble', outfit: 'male_casualsuit03', shoes: 'shoes03', skin: 'young_caucasian_male', hairColor: '#3a2a1e', jawWide: 0.4, chinStrong: 0.3 },
  neutral: { pres: 0, build: 0, muscle: 0.3, hair: 'short04', brows: 'eyebrow001', beard: 'none', outfit: 'female_sportsuit01', shoes: 'shoes03', skin: 'young_asian_female', hairColor: '#141012' },
};
// ready-made avatars offered during onboarding (portraits in assets/ui/avatars are renders of these exact configs)
export const READY = [
  { id: 'sofia', name: 'Sofia', cfg: { eyesBig: 0.38, eyesUp: 0.12, nose: -0.3, cheekbones: 0.42, lipsFull: 0.28, jawWide: 0, chinStrong: 0, head: -0.18, makeup: 'natural', pres: -0.85, build: -0.12, muscle: 0.22, skin: 'young_caucasian_female', tone: 0.02, hair: 'ponytail01', hairColor: '#2b1c14', brows: 'eyebrow001', eyes: '#4a2f1d', outfit: 'signature_f', outfitTint: '#ffffff', shoes: 'shoes03', shoesTint: '#f6f4fa', glasses: 'none', hat: 'none' } },
  { id: 'layla', name: 'Layla', cfg: { eyesBig: 0.38, eyesUp: 0.12, nose: -0.3, cheekbones: 0.42, lipsFull: 0.28, jawWide: 0, chinStrong: 0, head: -0.18, pres: -0.85, build: -0.1, muscle: 0.25, skin: 'young_asian_female', tone: -0.04, hair: 'long01', hairColor: '#1b1411', brows: 'eyebrow006', outfit: 'talentopia_f', outfitTint: '#ffffff', shoes: 'shoes06', makeup: 'natural', eyes: '#5b3a22' } },
  { id: 'aria', name: 'Aria', cfg: { eyes: '#3a2416', eyesBig: 0.38, eyesUp: 0.12, nose: -0.3, cheekbones: 0.42, lipsFull: 0.28, jawWide: 0, chinStrong: 0, head: -0.18, makeup: 'natural', pres: -0.8, build: -0.05, muscle: 0.25, skin: 'young_african_female', hair: 'long01', hairColor: '#141012', brows: 'eyebrow001', outfit: 'female_elegantsuit01', outfitTint: '#5f6f9a', shoes: 'shoes01'} },
  { id: 'leo', name: 'Leo', cfg: { pres: 0.85, build: 0.05, muscle: 0.5, skin: 'young_caucasian_male', hair: 'short02', hairColor: '#5a3a24', brows: 'eyebrow006', beard: 'stubble', outfit: 'male_casualsuit03', outfitTint: '#ffffff', shoes: 'shoes03', jawWide: 0.4, chinStrong: 0.3, eyes: '#3a6ea8' } },
  { id: 'mei', name: 'Mei', cfg: { eyesBig: 0.38, eyesUp: 0.12, nose: -0.3, cheekbones: 0.42, lipsFull: 0.28, jawWide: 0, chinStrong: 0, head: -0.18, makeup: 'natural', pres: -0.7, build: -0.1, muscle: 0.2, skin: 'young_asian_female', hair: 'bob02', hairColor: '#141012', brows: 'eyebrow001', outfit: 'female_casualsuit01', outfitTint: '#ffffff', shoes: 'shoes03', glasses: 'round', eyes: '#5b3a22' } },
  { id: 'omar', name: 'Omar', cfg: { pres: 0.8, build: 0.15, muscle: 0.45, skin: 'young_asian_male', hair: 'short01', hairColor: '#141012', brows: 'eyebrow006', beard: 'full', outfit: 'male_elegantsuit01', outfitTint: '#6b6f78', shoes: 'shoes03', jawWide: 0.35, eyes: '#5b3a22' } },
  { id: 'kai', name: 'Kai', cfg: { pres: 0.1, build: 0, muscle: 0.35, skin: 'young_african_male', hair: 'short04', hairColor: '#141012', brows: 'eyebrow001', outfit: 'talentopia_m', outfitTint: '#ffffff', shoes: 'shoes03', glasses: 'rect', eyes: '#5b3a22' } },
];
const HAIR_COLORS = [['Black', '#141012'], ['Dark brown', '#2a1d16'], ['Brown', '#5a3a24'], ['Auburn', '#7a3420'], ['Copper', '#a5532a'], ['Blonde', '#c9a46a'], ['Platinum', '#e3dccb'], ['Grey', '#9a9a98'], ['Violet', '#6b4fd8']];
const EYE_COLORS = [['Brown', '#5b3a22'], ['Hazel', '#7a6a32'], ['Green', '#3f7a4a'], ['Blue', '#3a6ea8'], ['Grey', '#6f7c86'], ['Amber', '#a8742a']];
const TINTS = [['Original', '#ffffff'], ['Navy', '#5f6f9a'], ['Graphite', '#6b6f78'], ['Sand', '#e9dcc4'], ['Sage', '#a9c2a4'], ['Violet', '#b9a8f0']];
const SKIN_HEX = { young_caucasian_female: '#efcfb6', young_caucasian_male: '#e6bf9f', young_asian_female: '#e3c09b', young_asian_male: '#d4a77f', middleage_caucasian_male: '#f0d2bd', young_african_female: '#6b4430', young_african_male: '#7a4e36', middleage_african_female: '#5a3828' };
const SKIN_LABELS = { young_caucasian_female: 'Light', young_caucasian_male: 'Light warm', young_asian_female: 'Light olive', young_asian_male: 'Olive', middleage_caucasian_male: 'Fair', young_african_female: 'Deep', young_african_male: 'Deep warm', middleage_african_female: 'Rich' };

function prepMaterial(o) {
  for (const m of [].concat(o.material)) {
    const n = (m.name || '').toLowerCase(); const cards = /eyebrow|eyelash|afro|bob0|braid|long0|ponytail|short0|hair|beard/.test(n) || /^(hair|brows|lashes|beard)__/.test(o.name);
    m.transparent = false; m.depthWrite = true; const eye = /high-poly|low-poly|eye/.test(n) && !/eyebrow|eyelash/.test(n) || /^eyes__/.test(o.name || ''); m.alphaTest = cards ? 0.3 : eye ? 0.35 : 0; m.side = cards ? THREE.DoubleSide : THREE.FrontSide;
    if (cards) { m.alphaToCoverage = true; m.roughness = 0.55; } // soft strand edges with MSAA instead of a hard cut-out line
    if (/eyelash|lashes/.test(n) || /^lashes__/.test(o.name)) { m.color && m.color.setRGB(0.05, 0.04, 0.04); m.alphaTest = 0.2; }
    if (!cards) m.opacity = 1; if (m.map) m.map.anisotropy = 8; m.needsUpdate = true;
    const lash = /eyelash|lashes/.test(n) || /^lashes__/.test(o.name);
    if ((eye || (cards && !lash)) && !m.isMeshPhysicalMaterial) {
      const p = new THREE.MeshPhysicalMaterial(); THREE.MeshStandardMaterial.prototype.copy.call(p, m); p.name = m.name;
      if (eye) { p.clearcoat = 1; p.clearcoatRoughness = 0.03; p.roughness = 0.3; p.envMapIntensity = 0.9; } // wet cornea highlight
      else { p.sheen = 0.55; p.sheenRoughness = 0.38; p.sheenColor = new THREE.Color(0x8a7b6c); p.roughness = 0.5; } // silky strands
      if (Array.isArray(o.material)) o.material[o.material.indexOf(m)] = p; else o.material = p;
    }
  }
  o.castShadow = true; o.receiveShadow = true; o.frustumCulled = false;
}

// ---------------------------------------------------------------- realistic skin
// tiling micro-normal for pores and fine lines (generated once), plus a lighting tweak: light wraps a little past the
// shadow line and the red channel wraps most, which is how light scattering under real skin looks (warm soft terminator)
let poreTex = null;
function poreNormal() {
  if (poreTex) return poreTex;
  const S = 256, c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d');
  const h = new Float32Array(S * S); let seed = 7; const r = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let k = 0; k < 2600; k++) { const x = r() * S, y = r() * S, rad = 0.6 + r() * 1.4, d = 0.4 + r() * 0.6;
    for (let j = -3; j <= 3; j++) for (let i = -3; i <= 3; i++) { const q = (i * i + j * j) / (rad * rad); if (q < 1) { const X = (x + i + S) % S | 0, Y = (y + j + S) % S | 0; h[Y * S + X] -= d * (1 - q); } } }
  for (let i = 0; i < h.length; i++) h[i] += (r() - 0.5) * 0.25;
  const im = g.createImageData(S, S);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) { const H = (X, Y) => h[((Y + S) % S) * S + ((X + S) % S)];
    const dx = H(x + 1, y) - H(x - 1, y), dy = H(x, y + 1) - H(x, y - 1); const nx = -dx, ny = -dy, nz = 1.6, L = Math.hypot(nx, ny, nz); const o = (y * S + x) * 4;
    im.data[o] = (nx / L * 0.5 + 0.5) * 255; im.data[o + 1] = (ny / L * 0.5 + 0.5) * 255; im.data[o + 2] = (nz / L * 0.5 + 0.5) * 255; im.data[o + 3] = 255; }
  g.putImageData(im, 0, 0); poreTex = new THREE.CanvasTexture(c); poreTex.wrapS = poreTex.wrapT = THREE.RepeatWrapping; poreTex.repeat.set(22, 22); poreTex.anisotropy = 8;
  return poreTex;
}
function skinize(m) {
  if (!m.normalMap) { m.normalMap = poreNormal(); m.normalScale = new THREE.Vector2(0.28, 0.28); }
  m.ior = 1.4; m.specularIntensity = 0.6; m.roughness = 0.52;
  m.onBeforeCompile = sh => {
    const from = 'reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );';
    const chunk = THREE.ShaderChunk.lights_physical_pars_fragment; if (!chunk.includes(from)) return;
    sh.fragmentShader = sh.fragmentShader.replace('#include <lights_physical_pars_fragment>', chunk.replace(from,
      `{ float nl = dot( geometryNormal, directLight.direction ); vec3 k = vec3( 0.45, 0.18, 0.1 );
         vec3 wrap = clamp( ( vec3( nl ) + k ) / ( 1.0 + k ), 0.0, 1.0 );
         reflectedLight.directDiffuse += wrap * directLight.color * BRDF_Lambert( material.diffuseColor ); }`));
  };
  m.customProgramCacheKey = () => 'skin-wrap'; m.needsUpdate = true;
}
// ---------------------------------------------------------------- realistic hair
// The MPFB hair cards ship with 256px textures, which reads as a smooth helmet. Three fixes, all in the shader:
// 1) a tiling strand texture (strands run along V) adds fine per-strand brightness and clumping,
// 2) Kajiya-Kay style double highlight along the strands (a white primary and a hair-coloured secondary, shifted per strand)
//    replaces the plastic GGX blob, 3) inner layers are darkened by a baked "shell depth" occlusion, which gives volume.
let strandT = null;
function strandTex() {
  if (strandT) return strandT;
  const W = 512, H = 128, c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d'), im = g.createImageData(W, H);
  let seed = 11; const r = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const wave = (n) => { const a = []; for (let k = 0; k < n; k++) a.push([1 + (r() * 40 | 0), r() * 6.283, 0.3 + r() * 0.7]); return x => a.reduce((s, [f, p, w]) => s + Math.sin(x * 6.283 * f + p) * w, 0) / n; };
  const clump = wave(6), shift = wave(4); const b = new Float32Array(W), k = new Uint8Array(W), ph = new Float32Array(W);
  const sh = new Float32Array(W); for (let x = 0; x < W; x++) { b[x] = 0.25 + 0.75 * Math.pow(r(), 0.6); k[x] = 1 + (r() * 3 | 0); ph[x] = r() * 6.283; sh[x] = r() * 2 - 1; }
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const o = (y * W + x) * 4, u = x / W;
    const v = b[x] * (0.85 + 0.35 * clump(u)) * (0.96 + 0.04 * Math.sin(y / H * 6.283 * k[x] + ph[x]));
    im.data[o] = Math.max(0, Math.min(255, v * 255)); im.data[o + 1] = (0.5 + 0.32 * sh[x] + 0.18 * shift(u)) * 255; im.data[o + 2] = 255; im.data[o + 3] = 255; }
  g.putImageData(im, 0, 0); strandT = new THREE.CanvasTexture(c); strandT.wrapS = strandT.wrapT = THREE.RepeatWrapping; strandT.anisotropy = 8; strandT.colorSpace = THREE.NoColorSpace;
  return strandT;
}
function hairOcclusion(geo, c) { // 1 on the outer shell of the hair, falling to 0 a few cm inside (bind pose, mesh space)
  const p = geo.attributes.position, n = p.count, PI = Math.PI, NB = 44, key = new Array(n), rad = new Float32Array(n), mx = new Map();
  for (let i = 0; i < n; i++) { const x = p.getX(i) - c.x, y = p.getY(i) - c.y, z = p.getZ(i) - c.z, az = Math.floor((Math.atan2(z, x) + PI) / (2 * PI) * NB);
    let k, R; if (y > 0) { R = Math.hypot(x, y, z); k = 's' + az + '_' + Math.floor(Math.asin(Math.min(1, y / R)) / (PI / 2) * 14); } else { R = Math.hypot(x, z); k = 'c' + az + '_' + Math.floor(y / 0.022); }
    key[i] = k; rad[i] = R; if (!(mx.get(k) >= R)) mx.set(k, R); }
  const ao = new Float32Array(n); for (let i = 0; i < n; i++) ao[i] = Math.max(0, Math.min(1, 1 - (mx.get(key[i]) - rad[i]) / 0.03));
  geo.setAttribute('hairAO', new THREE.BufferAttribute(ao, 1));
}
let flatN = null;
function flatNormal() { if (!flatN) { flatN = new THREE.DataTexture(new Uint8Array([128, 128, 255, 255]), 1, 1); flatN.needsUpdate = true; } return flatN; }
function hairize(m, curly) { // curly hair (afro) keeps its own texture: no straight streaks, a soft matte sheen instead of strand highlights
  const SPEC = 'reflectedLight.directSpecular += irradiance * BRDF_GGX( directLight.direction, geometryViewDir, geometryNormal, material );';
  const DIFF = 'reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );';
  m.sheen = 0.2; m.roughness = 0.62; m.envMapIntensity = 0.15; m.specularIntensity = 0.35;
  if (!m.normalMap) m.normalMap = flatNormal(); // a flat normal map switches on three's skinned tangent frame, which the strand highlight follows
  m.onBeforeCompile = sh => {
    const chunk = THREE.ShaderChunk.lights_physical_pars_fragment; if (!chunk.includes(SPEC) || !chunk.includes(DIFF)) return;
    sh.uniforms.strandMap = { value: strandTex() };
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float hairAO;\nvarying float vHairAO;\nvarying vec2 vHairUv;')
      .replace('#include <uv_vertex>', '#include <uv_vertex>\nvHairAO = hairAO; vHairUv = uv;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform sampler2D strandMap;\nvarying float vHairAO;\nvarying vec2 vHairUv;\nvec3 hairT; float hairS; float hairO;')
      .replace('#include <map_fragment>', `#include <map_fragment>
        vec4 hs = texture2D( strandMap, vHairUv * vec2( 9.0, 1.0 ) ); hairS = hs.g - 0.5; hairO = vHairAO;
        #ifdef HAIR_CURLY
          diffuseColor.rgb *= mix( 0.58, 1.0, vHairAO ); hairS = 0.0;
        #else
          diffuseColor.rgb *= ( 0.6 + 0.6 * hs.r ) * mix( 0.58, 1.0, vHairAO );
          diffuseColor.a *= 0.55 + 0.75 * hs.r; // ragged, strand-by-strand edges instead of a clean cut-out line
        #endif`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
        #ifdef USE_TANGENT
          { vec3 B = tbn[ 1 ]; B -= normal * dot( B, normal ); hairT = normalize( B + vec3( 1e-6 ) ); } // smooth, skinned strand direction (along V)
        #else
          { vec3 dp1 = dFdx( -vViewPosition ), dp2 = dFdy( -vViewPosition ); vec2 du1 = dFdx( vHairUv ), du2 = dFdy( vHairUv );
            vec3 B = dp1 * du2.x - dp2 * du1.x; B -= normal * dot( B, normal ); hairT = normalize( B + vec3( 1e-6 ) ); }
        #endif`)
      .replace('#include <lights_physical_pars_fragment>', chunk.replace(SPEC, `{
          vec3 H = normalize( directLight.direction + geometryViewDir );
          vec3 t1 = normalize( hairT + geometryNormal * ( hairS * 0.35 + 0.08 ) ), t2 = normalize( hairT + geometryNormal * ( hairS * 0.35 - 0.16 ) );
          float c1 = dot( t1, H ), c2 = dot( t2, H );
          float s1 = pow( sqrt( max( 0.0, 1.0 - c1 * c1 ) ), 160.0 ), s2 = pow( sqrt( max( 0.0, 1.0 - c2 * c2 ) ), 26.0 );
          float att = smoothstep( -0.15, 0.5, dot( geometryNormal, directLight.direction ) ) * ( 0.25 + 0.75 * hairO );
          #ifdef HAIR_CURLY
            reflectedLight.directSpecular += irradiance * BRDF_GGX( directLight.direction, geometryViewDir, geometryNormal, material ) * 0.25;
          #else
            reflectedLight.directSpecular += directLight.color * att * ( vec3( 0.2 ) * s1 + material.diffuseColor * ( 0.9 + 1.4 * max( hairS, 0.0 ) ) * s2 * 0.35 );
          #endif
        }`).replace(DIFF, `reflectedLight.directDiffuse += directLight.color * clamp( ( dot( geometryNormal, directLight.direction ) + 0.3 ) / 1.3, 0.0, 1.0 ) * BRDF_Lambert( material.diffuseColor );`));
  };
  if (curly) { m.defines = { ...(m.defines || {}), HAIR_CURLY: '' }; m.roughness = 0.85; m.sheen = 0.35; }
  m.customProgramCacheKey = () => curly ? 'hair-kk-curly' : 'hair-kk'; m.needsUpdate = true;
}
function grayMap(tex) { // hair/brow texture -> normalised greyscale (keeps alpha) so material colour controls the hue
  const img = tex.image; const c = document.createElement('canvas'); c.width = img.width; c.height = img.height; const g = c.getContext('2d'); g.drawImage(img, 0, 0);
  const d = g.getImageData(0, 0, c.width, c.height), p = d.data; const ls = [];
  for (let i = 0; i < p.length; i += 4) { const l = 0.3 * p[i] + 0.59 * p[i + 1] + 0.11 * p[i + 2]; p[i] = p[i + 1] = p[i + 2] = l; if (p[i + 3] > 128 && (i & 60) === 0) ls.push(l); }
  ls.sort((a, b) => a - b); const mx = Math.max(8, ls.length ? ls[Math.floor(ls.length * 0.9)] : 255);
  for (let i = 0; i < p.length; i += 4) { const v = Math.min(255, p[i] / mx * 255 * 0.92 + 18); p[i] = p[i + 1] = p[i + 2] = v; }
  g.putImageData(d, 0, 0); const t = new THREE.CanvasTexture(c); t.flipY = tex.flipY; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}
function recolorIris(tex, hex) {
  const img = tex.userData.src || tex.image; tex.userData.src = img;
  const c = document.createElement('canvas'); c.width = img.width; c.height = img.height; const g = c.getContext('2d'); g.drawImage(img, 0, 0);
  const d = g.getImageData(0, 0, c.width, c.height), p = d.data; const tc = new THREE.Color(hex), hsl = {}; tc.getHSL(hsl); const tmp = new THREE.Color(), h2 = {};
  for (let i = 0; i < p.length; i += 4) { tmp.setRGB(p[i] / 255, p[i + 1] / 255, p[i + 2] / 255); tmp.getHSL(h2); if (h2.s > 0.16 && h2.l > 0.06 && h2.l < 0.82) { tmp.setHSL(hsl.h, Math.min(1, hsl.s * 0.9 + 0.1), h2.l * (0.75 + hsl.l)); p[i] = tmp.r * 255; p[i + 1] = tmp.g * 255; p[i + 2] = tmp.b * 255; } }
  g.putImageData(d, 0, 0); const t = new THREE.CanvasTexture(c); t.flipY = tex.flipY; t.colorSpace = THREE.SRGBColorSpace; t.userData.src = img; return t;
}
function strandsTex(dense) { // fine hair strands with soft alpha (rendered with alpha hashing, no hard dots)
  const S = 512, c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d'); g.clearRect(0, 0, S, S);
  for (let i = 0; i < (dense ? 26000 : 14000); i++) { const x = Math.random() * S, y = Math.random() * S, l = dense ? 4 + Math.random() * 7 : 1.5 + Math.random() * 2.5, a = Math.random() * 0.8 - 0.4;
    g.strokeStyle = `rgba(255,255,255,${dense ? 0.35 + Math.random() * 0.5 : 0.18 + Math.random() * 0.35})`; g.lineWidth = dense ? 1.1 : 0.9; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.sin(a) * l, y + Math.cos(a) * l); g.stroke(); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(dense ? 28 : 40, dense ? 28 : 40); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}

export class AvatarModel {
  constructor() { this.cfg = { ...DEFAULT }; this.partMeshes = {}; this.loading = {}; this.ready = false; }
  async init(saved) {
    const { cat, base, anims } = await assets();
    this.catalog = cat; this.gltf = base; this.animations = anims.animations; this.root = skClone(base.scene);
    this.meshes = []; this.byName = {};
    this.root.traverse(o => { if (o.isMesh) { o.material = cloneMat(o.material); prepMaterial(o); this.meshes.push(o); this.byName[o.name] = o; if (o.geometry.attributes._hide) this.body = o; } });
    if (this.body && !Array.isArray(this.body.material)) { const m0 = this.body.material; // skin: soft sheen and a slightly satin finish
      const m = new THREE.MeshPhysicalMaterial({ map: m0.map, normalMap: m0.normalMap || null, color: m0.color.clone(), roughness: 0.58, metalness: 0, sheen: 0.18, sheenRoughness: 0.7, sheenColor: new THREE.Color(0xb98a74), clearcoat: 0.03, clearcoatRoughness: 0.7 });
      m.name = m0.name; skinize(m); this.body.material = m; }
    if (!this.body) this.body = this.meshes.find(o => !o.name.includes('__')) || this.meshes[0];
    this.bones = {}; for (const b of this.body.skeleton.bones) this.bones[b.name] = b;
    this.srcGeo = this.body.geometry; this.idx0 = this.srcGeo.index.array; this.hideAttr = this.srcGeo.attributes._hide;
    this.root.updateMatrixWorld(true);
    // eye centre in head-bone space (for eyewear)
    const eyes = this.meshes.find(m => /^eyes__/.test(m.name));
    if (eyes) { const bb = new THREE.Box3().setFromObject(eyes); this.eyeCenter = bb.getCenter(new THREE.Vector3()); this.eyeWidth = bb.max.x - bb.min.x;
      const hz = this.bones.head ? this.bones.head.getWorldPosition(new THREE.Vector3()).z : 0; this.front = Math.sign(this.eyeCenter.z - hz) || -1; this.eyeFront = this.front > 0 ? bb.max.z : bb.min.z; }
    this.cfg = { ...DEFAULT, ...(saved || {}) };
    await this.apply(); this.ready = true; return this;
  }
  setCfg(patch) { Object.assign(this.cfg, patch); return this.apply(); }
  morphValues() {
    const c = this.cfg; const v = (x) => Math.max(0, x);
    return { masc: v(c.pres), fem: v(-c.pres), heavy: v(c.build), slim: v(-c.build), muscular: c.muscle, jawWide: c.jawWide, chinStrong: c.chinStrong, noseWide: v(c.nose), noseNarrow: v(-c.nose),
      cheekbones: c.cheekbones, eyesBig: c.eyesBig, eyesUp: c.eyesUp, lipsFull: c.lipsFull, headRound: v(-c.head), headSquare: v(c.head) };
  }
  applyMorphs() { const mv = this.morphValues(); for (const m of this.allMeshes()) { if (!m.morphTargetDictionary) continue; for (const k in mv) { const i = m.morphTargetDictionary[k]; if (i !== undefined) m.morphTargetInfluences[i] = mv[k]; } } this.measureFace(); }
  // body morphs change head height without moving the head bone: measure where the eyes really are (root space, unscaled)
  measureFace() { // in the bind pose (stable: no dependence on the current animation frame or render state)
    const eyes = this.meshes && this.meshes.find(m => /^eyes__/.test(m.name)); if (!eyes || !eyes.skeleton) { this.faceDy = 0.05; return; }
    const sk = eyes.skeleton, hi = sk.bones.findIndex(b => b.name === 'head'); if (hi < 0) { this.faceDy = 0.05; return; }
    const pos = eyes.geometry.attributes.position, mp = eyes.geometry.morphAttributes.position || [], inf = eyes.morphTargetInfluences || [], rel = eyes.geometry.morphTargetsRelative;
    let y = 0, n = 0; for (let i = 0; i < pos.count; i += 5) { let v = pos.getY(i); for (let k = 0; k < mp.length; k++) if (inf[k]) v += (rel ? mp[k].getY(i) : mp[k].getY(i) - pos.getY(i)) * inf[k]; y += v; n++; }
    const eyeY = new THREE.Vector3(0, n ? y / n : 0, 0).applyMatrix4(eyes.bindMatrix).y;
    const headY = new THREE.Vector3().setFromMatrixPosition(new THREE.Matrix4().copy(sk.boneInverses[hi]).invert()).y;
    this.faceDy = THREE.MathUtils.clamp(eyeY - headY, -0.05, 0.2);
  }
  setExpression(name, v) { for (const m of this.allMeshes()) { const i = m.morphTargetDictionary && m.morphTargetDictionary[name]; if (i !== undefined) m.morphTargetInfluences[i] = v; } }
  allMeshes() { const out = [...this.meshes]; for (const k in this.partMeshes) out.push(...this.partMeshes[k]); return out; }
  async loadPart(kind, id) {
    const key = kind + ':' + id; if (this.partMeshes[key]) return this.partMeshes[key];
    if (this.loading[key]) return this.loading[key];
    const info = (this.catalog.parts[kind] || []).find(p => p.id === id); if (!info) return [];
    const pieces = info.compose || [{ file: info.file }];
    const srcs0 = pieces.map(pc => shared.parts[pc.file] || (shared.parts[pc.file] = load('assets/avatar/' + pc.file)));
    return (this.loading[key] = Promise.all(srcs0).then(gs => {
      const srcs = []; gs.forEach((g, k) => g.scene.traverse(o => { if (o.isSkinnedMesh) srcs.push([o, pieces[k].keep]); })); const list = [];
      for (const [s0, keep] of srcs) {
        const s = s0.clone(); s.material = cloneMat(s0.material);
        if (keep) { const f = filterIslands(s0, keep); s.geometry = f.geo; this.composeCutY = f.pelvisY; }
        const bones = s0.skeleton.bones.map(b => this.bones[b.name] || b);
        s.bind(new THREE.Skeleton(bones, s0.skeleton.boneInverses), s0.bindMatrix);
        s.name = kind + '__' + id; prepMaterial(s); this.body.parent.add(s); list.push(s);
        if (kind === 'hair') {
          if (!s0.geometry.attributes.hairAO) { const sk = s0.skeleton, hi = sk.bones.findIndex(b => b.name === 'head');
            const c = hi < 0 ? new THREE.Box3().setFromBufferAttribute(s0.geometry.attributes.position).getCenter(new THREE.Vector3())
              : new THREE.Vector3().setFromMatrixPosition(new THREE.Matrix4().copy(sk.boneInverses[hi]).invert()).add(new THREE.Vector3(0, 0.09, 0)).applyMatrix4(s0.bindMatrixInverse);
            hairOcclusion(s0.geometry, c); if (s0.geometry.index && s0.geometry.attributes.normal && s0.geometry.attributes.uv && !s0.geometry.attributes.tangent) s0.geometry.computeTangents(); }
          for (const m of [].concat(s.material)) { if (m.map) m.map = grayCached(m.map); hairize(m, /afro/.test(id)); }
        }
        if (info.style === 'signature2') s.material = [].concat(s.material).length > 1 ? [].concat(s.material).map(signature2Mat) : signature2Mat(s.material);
        if (info.style === 'signature') s.material = [].concat(s.material).length > 1 ? [].concat(s.material).map(m => signatureMat(m, s.geometry, keep)) : signatureMat(s.material, s.geometry, keep);
        if (kind === 'hair' && info.bun) this.makeBun(s, s0, list);
        if (info.style === 'talentopia') for (const m of [].concat(s.material)) { if (m.map && m.map.image) m.map = navyMap(m.map); m.emissive = new THREE.Color(0x9d84ff); m.emissiveMap = pipingTex(s.geometry); m.emissiveIntensity = 1.7; m.roughness = 0.55; m.metalness = 0.04; m.needsUpdate = true; }
      }
      this.partMeshes[key] = list; return list;
    }));
  }
  makeBun(s, s0, list) { // ponytail minus its tail, plus a bun and two face-framing strands bound to the head bone
    const sk = s.skeleton, hi = sk.bones.findIndex(b => b.name === 'head'); if (hi < 0) return;
    const g0 = s0.geometry, pos = g0.attributes.position;
    const hc = new THREE.Vector3().setFromMatrixPosition(new THREE.Matrix4().copy(s0.skeleton.boneInverses[hi]).invert()).add(new THREE.Vector3(0, 0.09, 0)).applyMatrix4(s0.bindMatrixInverse);
    const f = this.front || 1, v = new THREE.Vector3();
    const tail = i => { v.fromBufferAttribute(pos, i); const behind = (v.z - hc.z) * f; return v.y < hc.y - 0.105 || (v.y < hc.y - 0.035 && behind < -0.06); };
    const idx = g0.index.array, keepIdx = []; let topY = -1e9, backZ = hc.z;
    for (let i = 0; i < pos.count; i++) { v.fromBufferAttribute(pos, i); if (v.y > topY) topY = v.y; if (v.y > hc.y && (v.z - hc.z) * f < (backZ - hc.z) * f) backZ = v.z; }
    for (let i = 0; i < idx.length; i += 3) if (!(tail(idx[i]) || tail(idx[i + 1]) || tail(idx[i + 2]))) keepIdx.push(idx[i], idx[i + 1], idx[i + 2]);
    const g = new THREE.BufferGeometry(); for (const k in g0.attributes) g.setAttribute(k, g0.attributes[k]); g.morphAttributes = g0.morphAttributes; g.morphTargetsRelative = g0.morphTargetsRelative; g.setIndex(keepIdx);
    g.boundingSphere = g0.boundingSphere; s.geometry = g;
    const up = new THREE.Vector3(0, 0.62, -0.78 * f).normalize(), back = new THREE.Vector3(0, 0.78, 0.62 * f).normalize(), side = new THREE.Vector3(1, 0, 0);
    const centre = new THREE.Vector3(hc.x, topY - 0.075, hc.z + (backZ - hc.z) * 0.93);
    const toBind = (geo) => { const n = geo.attributes.position.count; geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(new Array(n * 4).fill(0).map((_, k) => k % 4 ? 0 : hi), 4)); geo.setAttribute('skinWeight', new THREE.Float32BufferAttribute(new Array(n * 4).fill(0).map((_, k) => k % 4 ? 0 : 1), 4)); hairOcclusion(geo, hc); geo.computeTangents(); return geo; };
    const add = (geo) => { const m = new THREE.SkinnedMesh(toBind(geo), s.material); m.name = s.name + '_bun'; m.frustumCulled = false; m.castShadow = true; m.bind(s.skeleton, s.bindMatrix); this.body.parent.add(m); list.push(m); };
    add(bunGeometry(centre, up, back, side));
    const down = new THREE.Vector3(0, -1, 0), fr = new THREE.Vector3(0, 0, f);
  }
  async apply() {
    if (this.cfg.hair === 'bun01') this.cfg.hair = 'ponytail01';
    const c = this.cfg, kinds = { hair: c.hair, outfit: c.outfit, shoes: c.shoes, hat: c.hat };
    await Promise.all(Object.entries(kinds).map(([k, id]) => id && id !== 'none' ? this.loadPart(k, id) : null));
    for (const key in this.partMeshes) { const [k, id] = key.split(':'); const on = kinds[k] === id; for (const m of this.partMeshes[key]) m.visible = on; }
    // brows, beard
    for (const m of this.meshes) {
      if (/^brows__/.test(m.name)) m.visible = m.name === 'brows__' + c.brows;
      if (/^beard__/.test(m.name)) m.visible = m.name === 'beard__' + c.beard;
    }
    this.applyMorphs(); this.applyHide(); this.applyMaterials(); this.applyGlasses(); this.applyPin();
  }
  applyHide() { // hide body triangles fully covered by the chosen outfit + shoes
    const bits = this.catalog.hideBits; const info = this.catalog.parts.outfit.find(p => p.id === this.cfg.outfit);
    const shoeMask = (bits[this.cfg.shoes] ?? -1) >= 0 ? 1 << bits[this.cfg.shoes] : 0;
    if (info && (info.compose || info.hideCompose)) return this.applyHideCompose(info.hideCompose ? { compose: info.hideCompose } : info, shoeMask);
    const mask = ((bits[this.cfg.outfit] ?? -1) >= 0 ? 1 << bits[this.cfg.outfit] : 0) | shoeMask;
    if (!this.hideAttr || !mask) { this.body.geometry = this.srcGeo; return; }
    let g = shared.geo[mask];
    if (!g) {
      const h = this.hideAttr.array, src = this.idx0, out = [];
      const hid = (v) => (Math.round(h[v]) & mask) !== 0;
      for (let i = 0; i < src.length; i += 3) if (!(hid(src[i]) && hid(src[i + 1]) && hid(src[i + 2]))) out.push(src[i], src[i + 1], src[i + 2]);
      const s0 = this.srcGeo; g = new THREE.BufferGeometry(); for (const k in s0.attributes) g.setAttribute(k, s0.attributes[k]);
      g.morphAttributes = s0.morphAttributes; g.morphTargetsRelative = s0.morphTargetsRelative; g.setIndex(out);
      g.boundingBox = s0.boundingBox; g.boundingSphere = s0.boundingSphere; shared.geo[mask] = g;
    }
    this.body.geometry = g;
  }
  applyHideCompose(info, shoeMask) {
    const [up, lo] = info.compose, key = 'c' + up.bit + '_' + lo.bit + '_' + shoeMask; let g = shared.geo[key];
    if (!g) { const h = this.hideAttr.array, src = this.idx0, pos = this.srcGeo.attributes.position, cut = this.composeCutY || 0.95, out = [];
      const hid = v => { const b = Math.round(h[v]); return (b & (1 << up.bit)) || (b & shoeMask) || ((b & (1 << lo.bit)) && pos.getY(v) < cut - 0.08); };
      for (let i = 0; i < src.length; i += 3) if (!(hid(src[i]) && hid(src[i + 1]) && hid(src[i + 2]))) out.push(src[i], src[i + 1], src[i + 2]);
      const s0 = this.srcGeo; g = new THREE.BufferGeometry(); for (const k in s0.attributes) g.setAttribute(k, s0.attributes[k]); g.morphAttributes = s0.morphAttributes; g.morphTargetsRelative = s0.morphTargetsRelative; g.setIndex(out);
      g.boundingBox = s0.boundingBox; g.boundingSphere = s0.boundingSphere; shared.geo[key] = g; }
    this.body.geometry = g;
  }
  applyMaterials() {
    const c = this.cfg, bm = this.body.material;
    const sk = c.skin + '|' + (c.makeup || 'none'); if (this._skin !== sk) { this._skin = sk; const want = c.skin, mk = c.makeup || 'none'; skinTex(want).then(t => { if (!t || this.cfg.skin !== want || (this.cfg.makeup || 'none') !== mk) return; bm.map = mk === 'none' ? t : skinWithMakeup(t, this.body, mk); bm.needsUpdate = true; }); }
    { const k = 1 + c.tone; bm.color.setRGB(k, k * 0.95, k * 0.9); } // a gentle warm cast keeps skin from looking grey under cool city light
    bm.envMapIntensity = 0.55;
    const hairC = new THREE.Color(c.hairColor);
    for (const key in this.partMeshes) {
      const [k] = key.split(':');
      for (const m of this.partMeshes[key]) for (const mt of [].concat(m.material)) {
        if (k === 'hair') mt.color.copy(hairC).multiplyScalar(1.15);
        if (k === 'outfit' && !mt.userData.ownColor) mt.color.set(c.outfitTint);
        if (k === 'shoes' && mt.map) { if (!mt.userData.map0) mt.userData.map0 = mt.map; const want = c.shoesTint ? pearlMap(mt.userData.map0, [246, 244, 250], 0.62, 0.42) : mt.userData.map0; if (mt.map !== want) { mt.map = want; mt.needsUpdate = true; } }
      }
    }
    for (const m of this.meshes) {
      if (/^brows__/.test(m.name)) { for (const mt of [].concat(m.material)) { if (mt.map && !mt.userData.gray) { mt.map = grayCached(mt.map); mt.userData.gray = true; } mt.color.copy(hairC).lerp(new THREE.Color(0x7a5a46), 0.38); } }
      if (/^beard__/.test(m.name)) { for (const mt of [].concat(m.material)) { if (!mt.userData.strands) { const dn = /full/.test(m.name); mt.map = shared.strands[dn] || (shared.strands[dn] = strandsTex(dn)); mt.alphaTest = 0; mt.alphaHash = true; mt.transparent = false; mt.userData.strands = true; mt.roughness = 0.9; mt.needsUpdate = true; } mt.color.copy(hairC).multiplyScalar(0.9); } }
      if (/^eyes__/.test(m.name) && this._eyes !== c.eyes) { for (const mt of [].concat(m.material)) if (mt.map && mt.map.image) { const src = mt.map.userData.src || mt.map.image; const k = c.eyes; if (!shared.iris[k]) { const t0 = mt.map; t0.userData.src = src; shared.iris[k] = recolorIris(t0, k); } mt.map = shared.iris[k]; mt.needsUpdate = true; } }
    }
    this._eyes = c.eyes;
  }
  applyPin() { // small Talentopia pin on the left lapel of the uniform (logo placeholder: assets/brand/logo.svg); placed in the bind pose
    if (this.pin) { this.pin.parent && this.pin.parent.remove(this.pin); this.pin = null; }
    const info = this.catalog.parts.outfit.find(p => p.id === this.cfg.outfit); if (!info || info.style !== 'talentopia') return;
    const mesh = (this.partMeshes['outfit:' + this.cfg.outfit] || [])[0]; if (!mesh || !mesh.skeleton) return;
    const sk = mesh.skeleton, bi = sk.bones.findIndex(b => b.name === 'spine_03'); if (bi < 0) return;
    const bp = new THREE.Vector3().setFromMatrixPosition(new THREE.Matrix4().copy(sk.boneInverses[bi]).invert());
    const side = this.front > 0 ? 1 : -1, px = bp.x + side * 0.075, py = bp.y + 0.05; // upper chest, on the lapel
    const pos = mesh.geometry.attributes.position, mp = mesh.geometry.morphAttributes.position || [], inf = mesh.morphTargetInfluences || [], rel = mesh.geometry.morphTargetsRelative;
    let best = null; const v = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) { v.fromBufferAttribute(pos, i); for (let k = 0; k < mp.length; k++) if (inf[k]) { const dx = mp[k].getX(i), dy = mp[k].getY(i), dz = mp[k].getZ(i); if (rel) v.x += dx * inf[k], v.y += dy * inf[k], v.z += dz * inf[k]; }
      if (Math.abs(v.x - px) < 0.025 && Math.abs(v.y - py) < 0.03) { const f = v.z * this.front; if (best === null || f > best) best = f; } }
    if (best === null) return;
    const tex = shared.logo || (shared.logo = pinTexture());
    const pin = new THREE.Mesh(new THREE.CircleGeometry(0.017, 32), new THREE.MeshStandardMaterial({ map: tex, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.9, metalness: 0.3, roughness: 0.3, toneMapped: false }));
    const m = new THREE.Matrix4().copy(sk.boneInverses[bi]).multiply(new THREE.Matrix4().makeTranslation(px, py, best * this.front + this.front * 0.005)).multiply(new THREE.Matrix4().makeRotationY(this.front > 0 ? 0 : Math.PI));
    m.decompose(pin.position, pin.quaternion, pin.scale); sk.bones[bi].add(pin); this.pin = pin;
  }
  applyGlasses() {
    const head = this.bones.head; if (!head || !this.eyeCenter) return;
    if (this.glasses) { this.glasses.parent && this.glasses.parent.remove(this.glasses); this.glasses = null; }
    const style = this.cfg.glasses; if (style === 'none') return;
    const g = new THREE.Group(); const w = this.eyeWidth || 0.065, r = w * (style === 'round' ? 0.2 : 0.19);
    const frame = new THREE.MeshStandardMaterial({ color: style === 'aviator' ? 0xc9a76a : 0x1d1f24, metalness: style === 'aviator' ? 1 : 0.3, roughness: 0.35 });
    const lens = new THREE.MeshPhysicalMaterial({ color: style === 'aviator' ? 0x3a4a5a : 0xffffff, transparent: true, opacity: style === 'aviator' ? 0.55 : 0.12, roughness: 0.05, metalness: 0 });
    for (const s of [-1, 1]) {
      let rim; if (style === 'rect') { const sh = new THREE.Shape(); const a = r * 1.15, b = r * 0.78; sh.moveTo(-a, -b); sh.lineTo(a, -b); sh.lineTo(a, b); sh.lineTo(-a, b); sh.closePath(); const hole = new THREE.Path(); const a2 = a - 0.0025, b2 = b - 0.0025; hole.moveTo(-a2, -b2); hole.lineTo(-a2, b2); hole.lineTo(a2, b2); hole.lineTo(a2, -b2); hole.closePath(); sh.holes.push(hole); rim = new THREE.Mesh(new THREE.ExtrudeGeometry(sh, { depth: 0.002, bevelEnabled: false }), frame); }
      else rim = new THREE.Mesh(new THREE.TorusGeometry(r, 0.0016, 8, 32), frame);
      rim.position.set(s * w * 0.25, 0, 0); g.add(rim);
      const l = new THREE.Mesh(new THREE.CircleGeometry(r * 0.97, 32), lens); l.position.set(s * w * 0.25, 0, -0.0005); if (style === 'rect') l.scale.set(1.15, 0.78, 1); g.add(l);
      const temple = new THREE.Mesh(new THREE.BoxGeometry(0.0018, 0.0018, w * 1.55), frame); temple.position.set(s * (w * 0.25 + r), 0, -w * 0.75); g.add(temple);
    }
    const bridge = new THREE.Mesh(new THREE.BoxGeometry(w * 0.5 - 2 * r + 0.004, 0.0016, 0.0016), frame); bridge.position.set(0, r * 0.25, 0); g.add(bridge);
    // measure the posed eyes (skinned + morphed vertices) in avatar-root space, place the frames there, then attach to the head bone
    const eyes = this.meshes.find(m => /^eyes__/.test(m.name)); this.root.updateMatrixWorld(true);
    const bb = new THREE.Box3(), v = new THREE.Vector3(), n = eyes.geometry.attributes.position.count, inv = new THREE.Matrix4().copy(this.root.matrixWorld).invert();
    for (let i = 0; i < n; i += 3) { eyes.getVertexPosition(i, v); v.applyMatrix4(eyes.matrixWorld).applyMatrix4(inv); bb.expandByPoint(v); }
    const ctr = bb.getCenter(new THREE.Vector3()), ew = bb.max.x - bb.min.x, ed = bb.max.y - bb.min.y, sep = ew / 2 - ed / 2;
    const fz = this.front > 0 ? bb.max.z : bb.min.z;
    g.scale.setScalar(1); g.children.forEach(ch => { ch.position.x = Math.sign(ch.position.x) * (Math.abs(ch.position.x) > 0.0001 ? (Math.abs(ch.position.x) < w * 0.4 ? sep : sep + r) : 0); });
    g.position.set(ctr.x, ctr.y + ed * 0.05, fz + this.front * 0.016); g.rotation.set(0, this.front > 0 ? 0 : Math.PI, 0);
    this.root.add(g); g.updateMatrixWorld(true); head.attach(g); this.glasses = g;

  }
}

// dusk skyline backdrop: violet-to-navy gradient with soft out-of-focus city lights (no external image)
function duskBackdrop() {
  const c = document.createElement('canvas'); c.width = 1024; c.height = 512; const g = c.getContext('2d');
  const gr = g.createLinearGradient(0, 0, 0, 512); gr.addColorStop(0, '#2a1f5e'); gr.addColorStop(0.55, '#3b2a78'); gr.addColorStop(0.8, '#1d1a44'); gr.addColorStop(1, '#111827'); g.fillStyle = gr; g.fillRect(0, 0, 1024, 512);
  let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 70; i++) { const x = rnd() * 1024, y = 170 + rnd() * 260, r = 6 + rnd() * 26, col = ['141,112,255', '66,219,255', '200,184,244', '255,214,170'][i % 4];
    const rg = g.createRadialGradient(x, y, 0, x, y, r); rg.addColorStop(0, `rgba(${col},${0.35 + rnd() * 0.35})`); rg.addColorStop(1, `rgba(${col},0)`); g.fillStyle = rg; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); }
  for (let i = 0; i < 26; i++) { const w = 18 + rnd() * 50, h = 60 + rnd() * 170, x = rnd() * 1024; g.fillStyle = 'rgba(12,14,34,0.55)'; g.fillRect(x, 430 - h, w, h + 90); } // faint skyline silhouettes
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
// ---------------------------------------------------------------- Avatar Studio
export class AvatarStudio {
  constructor({ renderer, envMap, onDone, store }) {
    this.renderer = renderer; this.onDone = onDone; this.store = store; this.active = false;
    const s = this.scene = new THREE.Scene(); s.background = duskBackdrop(); s.environment = envMap || null; s.environmentIntensity = 0.45;
    s.fog = new THREE.Fog(0x1b1640, 9, 24);
    const floor = new THREE.Mesh(new THREE.CircleGeometry(7, 64), new THREE.MeshStandardMaterial({ color: 0x151a30, roughness: 0.28, metalness: 0.35 })); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; s.add(floor);
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.74, 0.79, 64), new THREE.MeshBasicMaterial({ color: 0x9d84ff, toneMapped: false })); ring.rotation.x = -Math.PI / 2; ring.position.y = 0.065; s.add(ring);
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.74, 0.06, 64), new THREE.MeshStandardMaterial({ color: 0x1d2440, roughness: 0.25, metalness: 0.5 })); disc.position.y = 0.03; disc.receiveShadow = true; s.add(disc);
    const key = new THREE.DirectionalLight(0xffe7d2, 1.9); key.position.set(2.8, 3.2, 1.7); key.castShadow = true; key.shadow.mapSize.set(2048, 2048); Object.assign(key.shadow.camera, { left: -1.5, right: 1.5, top: 2.5, bottom: -0.5, near: 0.5, far: 10 }); key.shadow.bias = -0.0005; s.add(key);
    const fill = new THREE.DirectionalLight(0xbfd2ff, 0.55); fill.position.set(-2.5, 1.8, 1.5); s.add(fill);
    const rim = new THREE.DirectionalLight(0x9d84ff, 3.2); rim.position.set(-1.6, 2.4, -3); s.add(rim); // violet rim (dusk city glow)
    const rim2 = new THREE.DirectionalLight(0x42dbff, 1.6); rim2.position.set(2.0, 2.0, -2.6); s.add(rim2); // cyan rim
    s.add(new THREE.HemisphereLight(0xb8b0ff, 0x1a1530, 0.45));
    this.turn = new THREE.Group(); this.turn.position.y = 0.06; s.add(this.turn);
    this.camera = new THREE.PerspectiveCamera(32, innerWidth / innerHeight, 0.05, 50);
    this.orbit = { yaw: 0.35, dist: 4.0, height: 1.0, tDist: 4.0, tHeight: 1.0 };
    this.expr = 'neutral'; this.exprT = 0;
  }
  attach(avatar, character) { this.avatar = avatar; this.char = character; this.turn.add(character.root); character.root.position.set(0, 0, 0); character.root.rotation.y = 0; }
  headY() { const h = this.avatar && this.avatar.bones.head; if (!h) return 1.6; this.turn.updateMatrixWorld(true); const s = this.char ? this.char.leanG.scale.y : 1; return h.getWorldPosition(new THREE.Vector3()).y + (this.avatar.faceDy || 0.05) * s + 0.02; } // ≈ eye level
  frame(mode) { this.frameMode = mode; const hy = this.headY(); if (mode === 'face') { this.orbit.tDist = 0.95; this.orbit.tHeight = hy; } else if (mode === 'upper') { this.orbit.tDist = 1.9; this.orbit.tHeight = hy - 0.35; } else { this.orbit.tDist = 4.0; this.orbit.tHeight = hy * 0.56; } }
  render(dt) {
    if (this.frameMode && this.char) { const hy = this.headY(); this.orbit.tHeight = this.frameMode === 'face' ? hy : this.frameMode === 'upper' ? hy - 0.35 : hy * 0.56; }
    const o = this.orbit; o.dist += (o.tDist - o.dist) * Math.min(1, dt * 6); o.height += (o.tHeight - o.height) * Math.min(1, dt * 6);
    const narrow = innerWidth < 760; const off = narrow ? 0 : -0.55 * o.dist / 4; // keep the avatar left of the panel on desktop
    this.camera.aspect = innerWidth / innerHeight;
    // phones: the panel covers the lower half, so render the avatar into the top part of the screen
    if (narrow) { const H = innerHeight, oy = Math.round(H * 0.5); this.camera.setViewOffset(innerWidth, H + oy, 0, oy, innerWidth, H); } else this.camera.clearViewOffset();
    this.camera.updateProjectionMatrix();
    // portrait phones see a narrow top strip: back off and aim a little higher so head and shoulders (or the full body) fit
    const pd = narrow ? o.dist * (innerHeight > innerWidth ? 1.75 : 1.2) : o.dist, ph = narrow ? o.height + ({ full: 0.05, upper: 0.2, face: -0.02 }[this.frameMode] ?? 0.1) : o.height;
    this.camera.position.set(Math.sin(0) * pd - off, ph + 0.08 * pd, pd); this.camera.lookAt(-off, ph, 0);
    this.turn.rotation.y = o.yaw;
    if (this.char) {
      this.char.update(dt, 0, 0);
      // expression preview
      this.exprT += dt; const av = this.avatar;
      const set = (n, v) => av.setExpression(n, v);
      ['smile', 'jawOpen', 'mouthO', 'mouthE', 'browsUp'].forEach(n => set(n, 0)); set('smile', 0.2); set('browsUp', 0.06); // soft resting smile, as in the city
      if (this.expr === 'smile') { set('smile', 0.9); set('browsUp', 0.2); }
      if (this.expr === 'talk') { const t = this.exprT * 7; set('jawOpen', 0.25 + 0.25 * Math.max(0, Math.sin(t))); set('mouthO', 0.4 * Math.max(0, Math.sin(t * 0.7 + 1))); set('mouthE', 0.4 * Math.max(0, Math.cos(t * 0.9))); }
      if (this.expr === 'surprised') { set('browsUp', 1); set('jawOpen', 0.35); set('mouthO', 0.5); }
    }
    this.renderer.render(this.scene, this.camera);
  }
  // ---------------------------------------------------------------- UI
  // mode 'quick': pick a ready-made avatar (onboarding); 'full': every customisation category
  open(mode = 'full', { onSkip = null, enterLabel = 'Enter Talent City' } = {}) {
    this.mode = mode; this.onSkip = onSkip; this.enterLabel = enterLabel; this.fromQuick = mode === 'quick';
    this.active = true; document.body.classList.add('in-studio'); const el = $('studio'); el.style.display = 'grid'; requestAnimationFrame(() => el.classList.add('show'));
    const ov = $('overlay'); if (ov) ov.classList.add('hidden'); const fc = $('flyCap'); if (fc) fc.style.visibility = 'hidden'; this.frame(mode === 'quick' ? 'upper' : 'full'); this.build(); this.bindPointer();
  }
  // a portrait of the current avatar rendered from the live 3D model (avatar cards, Passport)
  snapshot(size = 320, full = false) {
    // render into a square viewport so the framing is the same on portrait phones and wide screens
    const r = this.renderer, cv = r.domElement, pr = r.getPixelRatio(), S = Math.min(cv.width, cv.height), cam = new THREE.PerspectiveCamera(full ? 24 : 16, 1, 0.05, 30);
    if (this.char) for (let i = 0; i < 4; i++) this.char.update(1 / 30, 0, 0); // pose the avatar even if the studio has not been rendering
    const hy = this.headY(); const yaw0 = this.turn.rotation.y; this.turn.rotation.y = 0.32; this.turn.updateMatrixWorld(true);
    if (full) { cam.position.set(0, hy * 0.55, 6.2); cam.lookAt(0, hy * 0.52, 0); } else { cam.position.set(0, hy - 0.1, 2.05); cam.lookAt(0, hy - 0.17, 0); }
    const vp = new THREE.Vector4(); r.getViewport(vp); r.setViewport(0, 0, S / pr, S / pr); r.render(this.scene, cam);
    const c = document.createElement('canvas'); c.width = c.height = size;
    c.getContext('2d').drawImage(cv, 0, cv.height - S, S, S, 0, 0, size, size); r.setViewport(vp);
    this.turn.rotation.y = yaw0; return c.toDataURL('image/jpeg', 0.86);
  }
  close() { this.active = false; document.body.classList.remove('in-studio'); this.camera.clearViewOffset(); const el = $('studio'); el.classList.remove('show'); el.style.display = 'none'; }
  build() {
    const av = this.avatar, cat = av.catalog, c = av.cfg;
    const tab = this.tab || 'body';
    const slider = (key, label, min, max, step, l = '', r = '') => `<label class="sl2"><span>${label}<em>${l && r ? `${l} ↔ ${r}` : ''}</em></span><input type="range" min="${min}" max="${max}" step="${step}" value="${c[key]}" data-k="${key}"></label>`;
    const chips = (key, items) => `<div class="chips">${items.map(([id, label]) => `<button data-k="${key}" data-v="${id}" class="${c[key] === id ? 'on' : ''}">${label}</button>`).join('')}</div>`;
    const swatches = (key, items) => `<div class="sw">${items.map(([label, hex]) => `<button title="${label}" data-k="${key}" data-v="${hex}" class="${c[key] === hex ? 'on' : ''}" style="background:${hex}"></button>`).join('')}</div>`;
    const P = cat.parts;
    const thumbs = (key, items, kind) => `<div class="thumbs">${items.map(([id, label]) => `<button data-k="${key}" data-v="${id}" class="${c[key] === id ? 'on' : ''}" aria-label="${label}"><img src="assets/ui/studio/${kind}_${id}.jpg" alt="" loading="lazy" onerror="this.style.visibility='hidden'"><span>${label}</span></button>`).join('')}</div>`;
    if (this.mode === 'quick') return this.buildQuick();
    const tabs = { face: 'Face', hair: 'Hair', skin: 'Skin & eyes', body: 'Body', style: 'Outfit', extras: 'Accessories' };
    let body = '';
    if (tab === 'body') body = `<h4>Quick start</h4><div class="chips"><button data-preset="feminine">Feminine</button><button data-preset="neutral">Neutral</button><button data-preset="masculine">Masculine</button><button data-random>Randomise</button></div>
      <h4>Proportions</h4>${slider('pres', 'Presentation', -1, 1, 0.05, 'Feminine', 'Masculine')}${slider('build', 'Build', -1, 1, 0.05, 'Slim', 'Fuller')}${slider('muscle', 'Muscle tone', 0, 1, 0.05)}${slider('height', `Height · ${Math.round(c.height * (170 + c.pres * 6))} cm`, 0.9, 1.1, 0.01)}`;
    if (tab === 'face') body = `<h4>Face structure</h4>${slider('jawWide', 'Jaw width', 0, 1, 0.05)}${slider('chinStrong', 'Chin', 0, 1, 0.05)}${slider('cheekbones', 'Cheekbones', 0, 1, 0.05)}${slider('nose', 'Nose', -1, 1, 0.05, 'Narrow', 'Wide')}${slider('lipsFull', 'Lips', 0, 1, 0.05)}${slider('head', 'Head shape', -1, 1, 0.05, 'Round', 'Square')}
      <h4>Makeup</h4>${chips('makeup', [['none', 'None'], ['natural', 'Natural'], ['bold', 'Bold']])}
      <h4>Eyes</h4>${slider('eyesBig', 'Eye size', 0, 1, 0.05)}${slider('eyesUp', 'Eye angle', 0, 1, 0.05)}
      <h4>Expression preview</h4><div class="chips">${['neutral', 'smile', 'talk', 'surprised'].map(e => `<button data-expr="${e}" class="${this.expr === e ? 'on' : ''}">${e[0].toUpperCase() + e.slice(1)}</button>`).join('')}</div>
      <h4>Create my Digital Twin</h4><button class="st-row" data-photo><span>✦ Make an editable 3D likeness from a photo</span><em class="soon">Coming soon</em></button>`;
    if (tab === 'skin') body = `<h4>Skin tone</h4><div class="sw sw-lg">${cat.skins.map(s => `<button title="${SKIN_LABELS[s] || s}" aria-label="Skin ${SKIN_LABELS[s] || s}" data-k="skin" data-v="${s}" class="${c.skin === s ? 'on' : ''}" style="background:${SKIN_HEX[s] || '#c89f7c'}"></button>`).join('')}</div>${slider('tone', 'Fine tone', -0.25, 0.15, 0.01, 'Deeper', 'Lighter')}<h4>Eye colour</h4>${swatches('eyes', EYE_COLORS)}`;
    if (tab === 'hair') body = `<h4>Hairstyle</h4>${thumbs('hair', [['none', 'None'], ...P.hair.map(p => [p.id, p.label])], 'hair')}<h4>Hair colour</h4>${swatches('hairColor', HAIR_COLORS)}
      <h4>Eyebrows</h4>${chips('brows', cat.brows.map(b => [b.id, b.label]))}<h4>Facial hair</h4>${chips('beard', [['none', 'None'], ...cat.beards.map(b => [b.id, b.label])])}`;
    if (tab === 'style') body = `<h4>Outfit</h4>${thumbs('outfit', P.outfit.map(p => [p.id, p.label]), 'outfit')}<p class="hint2">Business suit, Tailored suit and Work uniform double as professional attire.</p><h4>Outfit colour</h4>${swatches('outfitTint', TINTS)}<h4>Footwear</h4>${chips('shoes', P.shoes.map(p => [p.id, p.label]))}`;
    if (tab === 'extras') body = `<h4>Eyewear</h4>${chips('glasses', [['none', 'None'], ['round', 'Round'], ['rect', 'Rectangular'], ['aviator', 'Aviator']])}<h4>Headwear</h4>${chips('hat', [['none', 'None'], ['fedora01', 'Fedora']])}`;
    $('studioPanel').innerHTML = `<div class="st-grab"></div><div class="st-head"><div><b>Avatar Studio</b><span>Every change edits your 3D avatar.</span></div><div class="st-cam"><button data-frame="full">Full</button><button data-frame="upper">Upper</button><button data-frame="face">Face</button></div></div>
      <div class="st-tabs">${Object.entries(tabs).map(([k, l]) => `<button data-tab="${k}" class="${tab === k ? 'on' : ''}">${l}</button>`).join('')}</div>
      <div class="st-body">${body}</div>
      <div class="st-foot">${this.fromQuick ? '<button class="ghost" data-back>Back</button>' : ''}<button class="ghost" data-save>Save</button><button class="btn-primary" id="studioDone">${this.enterLabel}</button></div>`;
    const P2 = $('studioPanel');
    P2.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => { this.tab = b.dataset.tab; if (this.tab === 'face') this.frame('face'); else if (this.tab === 'hair') this.frame('upper'); else this.frame('full'); this.build(); });
    P2.querySelectorAll('[data-frame]').forEach(b => b.onclick = () => this.frame(b.dataset.frame));
    P2.querySelectorAll('input[type=range]').forEach(r => r.oninput = () => { av.cfg[r.dataset.k] = +r.value; av.applyMorphs(); av.applyMaterials(); if (r.dataset.k === 'height') this.applyHeight(); this.save(); });
    P2.querySelectorAll('input[type=range][data-k=height],input[type=range][data-k=pres]').forEach(r => r.onchange = () => this.build());
    P2.querySelectorAll('[data-v]').forEach(b => b.onclick = async () => { b.classList.add('busy'); await av.setCfg({ [b.dataset.k]: b.dataset.v }); this.save(); this.build(); });
    P2.querySelectorAll('[data-preset]').forEach(b => b.onclick = async () => { await av.setCfg({ ...DEFAULT, ...PRESETS[b.dataset.preset] }); this.applyHeight(); this.save(); this.build(); });
    const rnd = P2.querySelector('[data-random]'); if (rnd) rnd.onclick = async () => { const r = (a) => a[Math.random() * a.length | 0]; await av.setCfg({ pres: Math.round((Math.random() * 2 - 1) * 20) / 20, build: Math.round((Math.random() - 0.5) * 12) / 20, muscle: Math.random() * 0.8, jawWide: Math.random() * 0.6, cheekbones: Math.random() * 0.6, nose: Math.random() - 0.5, eyesBig: Math.random() * 0.5, head: Math.random() - 0.5, skin: r(cat.skins), eyes: r(EYE_COLORS)[1], hair: r(P.hair).id, hairColor: r(HAIR_COLORS)[1], outfit: r(P.outfit).id, shoes: r(P.shoes).id, beard: Math.random() < 0.3 ? r(cat.beards).id : 'none', glasses: Math.random() < 0.3 ? r(['round', 'rect', 'aviator']) : 'none' }); this.save(); this.build(); };
    P2.querySelectorAll('[data-expr]').forEach(b => b.onclick = () => { this.expr = b.dataset.expr; this.exprT = 0; this.build(); });
    const ph = P2.querySelector('[data-photo]'); if (ph) ph.onclick = () => this.photoFlow();
    const bk = P2.querySelector('[data-back]'); if (bk) bk.onclick = () => { this.mode = 'quick'; this.frame('upper'); this.build(); };
    const sv = P2.querySelector('[data-save]'); if (sv) sv.onclick = () => { this.save(); sv.textContent = 'Saved ✓'; setTimeout(() => { sv.textContent = 'Save'; }, 1400); };
    $('studioDone').onclick = () => { this.save(); this.onDone && this.onDone(); };
  }
  buildQuick() {
    const av = this.avatar, sel = this.readyId;
    $('studioPanel').innerHTML = `<div class="st-grab"></div><div class="st-head"><div>${this.onboardStep ? '<div class="ob-steps"><i></i><i class="on"></i></div><div class="eyebrow">Step 2 of 2 · Your look</div>' : ''}<b>${this.greetName ? `Choose your avatar, ${this.greetName.replace(/[<>&"]/g, '')}` : 'Choose your avatar'}</b><span>Pick one to start. You can change everything later.</span></div></div>
      <div class="st-body"><div class="av-grid">${READY.map(r => `<button class="av-card ${sel === r.id ? 'on' : ''}" data-ready="${r.id}" aria-label="Avatar ${r.name}"><img src="assets/ui/avatars/${r.id}.jpg" alt="" loading="lazy"><span>${r.name}</span></button>`).join('')}</div>
        <button class="st-row" data-custom><span>✎ Customize my avatar</span><em>Face, hair, skin, body, outfit</em></button>
        <button class="st-row" data-photo><span>✦ Create my Digital Twin</span><em class="soon">Coming soon</em></button></div>
      <div class="st-foot"><button class="ghost" data-skip>Skip for now</button><button class="btn-primary" id="studioDone">${this.enterLabel}</button></div>`;
    const P2 = $('studioPanel');
    P2.querySelectorAll('[data-ready]').forEach(b => b.onclick = async () => {
      const r = READY.find(x => x.id === b.dataset.ready); this.readyId = r.id; P2.querySelectorAll('.av-card').forEach(x => x.classList.toggle('on', x === b)); b.classList.add('busy');
      await av.setCfg({ ...DEFAULT, ...r.cfg }); this.applyHeight(); this.save(); b.classList.remove('busy'); });
    P2.querySelector('[data-custom]').onclick = () => { this.mode = 'full'; this.tab = 'face'; this.frame('face'); this.build(); };
    P2.querySelector('[data-photo]').onclick = () => this.photoFlow();
    P2.querySelector('[data-skip]').onclick = () => { this.onSkip ? this.onSkip() : this.onDone && this.onDone(); };
    $('studioDone').onclick = () => { this.save(); this.onDone && this.onDone(); };
  }
  applyHeight() { if (this.char) { const s = this.char.baseScale * this.avatar.cfg.height; this.char.leanG.scale.setScalar(s); } }
  save() { this.store && this.store(this.avatar.cfg); }
  bindPointer() {
    if (this._bound) return; this._bound = true; const cv = this.renderer.domElement; let drag = null;
    cv.addEventListener('pointerdown', e => { if (!this.active) return; drag = { x: e.clientX }; });
    addEventListener('pointermove', e => { if (!this.active || !drag) return; this.orbit.yaw += (e.clientX - drag.x) * 0.01; drag.x = e.clientX; });
    addEventListener('pointerup', () => { drag = null; });
    cv.addEventListener('wheel', e => { if (!this.active) return; this.orbit.tDist = THREE.MathUtils.clamp(this.orbit.tDist * (1 + e.deltaY * 0.001), 0.8, 5.5); e.preventDefault(); }, { passive: false });
  }
  photoFlow() {
    const box = $('studioModal'); box.style.display = 'grid';
    box.innerHTML = `<div class="card lg" style="max-width:520px;padding:22px"><div class="eyebrow">Coming soon</div><h3 style="margin:4px 0 8px">Create my Digital Twin</h3>
      <p style="color:#5b6476;line-height:1.5;font-size:14px">In a future version, you could choose to upload a photo and get an editable 3D likeness. It would only suggest visual features (skin tone, hair, face shape) that you then adjust. Talentopia never infers personality, ability or career suitability from appearance, a photo is never required, and nothing would be uploaded without your consent.</p>
      <p style="color:#5b6476;line-height:1.5;font-size:14px"><b>Status:</b> not available yet. It needs a 3D face-fitting service and a secure backend. No photo is uploaded or stored today.</p>
      <div class="row" style="margin-top:10px"><button class="btn-primary" id="phClose">Customize manually</button></div></div>`;
    $('phClose').onclick = () => { box.style.display = 'none'; };
  }
}
// Integration point for a future photo-to-avatar backend (POST image, receive suggested cfg). Intentionally null: not connected.
export const AVATAR_PHOTO_ENDPOINT = null;
