// Talentopia V2 avatar: a customisable MPFB/MakeHuman (CC0) body with morph targets, swappable hair/outfit/shoes/hat parts bound to
// one skeleton, material variations (skin, eyes, hair, outfit tint), procedural eyewear, and the Avatar Studio UI.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const loader = new GLTFLoader(), texLoader = new THREE.TextureLoader();
const load = url => new Promise((res, rej) => loader.load(url, res, undefined, rej));
const $ = id => document.getElementById(id);

export const DEFAULT = { pres: -0.4, build: 0, muscle: 0.25, height: 1.0, jawWide: 0, chinStrong: 0, nose: 0, cheekbones: 0.25, eyesBig: 0, eyesUp: 0, lipsFull: 0, head: 0,
  skin: 'young_caucasian_female', tone: 0, eyes: '#5b3a22', hair: 'bob01', hairColor: '#2a1d16', brows: 'eyebrow001', beard: 'none',
  outfit: 'female_casualsuit01', outfitTint: '#ffffff', shoes: 'shoes03', glasses: 'none', hat: 'none' };
export const PRESETS = {
  feminine: { pres: -0.8, build: -0.1, muscle: 0.2, hair: 'long01', brows: 'eyebrow001', beard: 'none', outfit: 'female_elegantsuit01', shoes: 'shoes01', skin: 'young_african_female', hairColor: '#1b1411', cheekbones: 0.4, jawWide: 0 },
  masculine: { pres: 0.85, build: 0.05, muscle: 0.5, hair: 'short02', brows: 'eyebrow006', beard: 'stubble', outfit: 'male_casualsuit03', shoes: 'shoes03', skin: 'young_caucasian_male', hairColor: '#3a2a1e', jawWide: 0.4, chinStrong: 0.3 },
  neutral: { pres: 0, build: 0, muscle: 0.3, hair: 'short04', brows: 'eyebrow001', beard: 'none', outfit: 'female_sportsuit01', shoes: 'shoes03', skin: 'young_asian_female', hairColor: '#141012' },
};
const HAIR_COLORS = [['Black', '#141012'], ['Dark brown', '#2a1d16'], ['Brown', '#5a3a24'], ['Auburn', '#7a3420'], ['Copper', '#a5532a'], ['Blonde', '#c9a46a'], ['Platinum', '#e3dccb'], ['Grey', '#9a9a98'], ['Violet', '#6b4fd8']];
const EYE_COLORS = [['Brown', '#5b3a22'], ['Hazel', '#7a6a32'], ['Green', '#3f7a4a'], ['Blue', '#3a6ea8'], ['Grey', '#6f7c86'], ['Amber', '#a8742a']];
const TINTS = [['Original', '#ffffff'], ['Navy', '#5f6f9a'], ['Graphite', '#6b6f78'], ['Sand', '#e9dcc4'], ['Sage', '#a9c2a4'], ['Violet', '#b9a8f0']];
const SKIN_LABELS = { young_caucasian_female: 'Light', young_caucasian_male: 'Light warm', young_asian_female: 'Light olive', young_asian_male: 'Olive', middleage_caucasian_male: 'Fair', young_african_female: 'Deep', young_african_male: 'Deep warm', middleage_african_female: 'Rich' };

function prepMaterial(o) {
  for (const m of [].concat(o.material)) {
    const n = (m.name || '').toLowerCase(); const cards = /eyebrow|eyelash|afro|bob0|braid|long0|ponytail|short0|hair|beard/.test(n) || /^(hair|brows|lashes|beard)__/.test(o.name);
    m.transparent = false; m.depthWrite = true; const eye = /high-poly|low-poly|eye/.test(n) && !/eyebrow|eyelash/.test(n) || /^eyes__/.test(o.name || ''); m.alphaTest = cards ? 0.45 : eye ? 0.35 : 0; m.side = cards ? THREE.DoubleSide : THREE.FrontSide;
    if (!cards) m.opacity = 1; if (m.map) m.map.anisotropy = 8; m.needsUpdate = true;
  }
  o.castShadow = true; o.receiveShadow = true; o.frustumCulled = false;
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
    const [cat, base, anims] = await Promise.all([fetch('assets/avatar/avatar_catalog.json').then(r => r.json()), load('assets/avatar/avatar_base.glb'), load('assets/avatar/avatar_anims.glb')]);
    this.catalog = cat; this.gltf = base; this.animations = anims.animations; this.root = base.scene;
    this.meshes = []; this.byName = {};
    this.root.traverse(o => { if (o.isMesh) { prepMaterial(o); this.meshes.push(o); this.byName[o.name] = o; if (o.geometry.attributes._hide) this.body = o; } });
    if (!this.body) this.body = this.meshes.find(o => !o.name.includes('__')) || this.meshes[0];
    this.bones = {}; for (const b of this.body.skeleton.bones) this.bones[b.name] = b;
    this.idx0 = this.body.geometry.index.array.slice(); this.hideAttr = this.body.geometry.attributes._hide;
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
  applyMorphs() { const mv = this.morphValues(); for (const m of this.allMeshes()) { if (!m.morphTargetDictionary) continue; for (const k in mv) { const i = m.morphTargetDictionary[k]; if (i !== undefined) m.morphTargetInfluences[i] = mv[k]; } } }
  setExpression(name, v) { for (const m of this.allMeshes()) { const i = m.morphTargetDictionary && m.morphTargetDictionary[name]; if (i !== undefined) m.morphTargetInfluences[i] = v; } }
  allMeshes() { const out = [...this.meshes]; for (const k in this.partMeshes) out.push(...this.partMeshes[k]); return out; }
  async loadPart(kind, id) {
    const key = kind + ':' + id; if (this.partMeshes[key]) return this.partMeshes[key];
    if (this.loading[key]) return this.loading[key];
    const info = (this.catalog.parts[kind] || []).find(p => p.id === id); if (!info) return [];
    return (this.loading[key] = load('assets/avatar/' + info.file).then(g => {
      const list = []; g.scene.traverse(o => { if (o.isSkinnedMesh) list.push(o); });
      for (const s of list) {
        const bones = s.skeleton.bones.map(b => this.bones[b.name] || b);
        s.bind(new THREE.Skeleton(bones, s.skeleton.boneInverses), s.bindMatrix);
        s.name = kind + '__' + id; prepMaterial(s); this.body.parent.add(s);
        if (kind === 'hair') for (const m of [].concat(s.material)) if (m.map) m.map = grayMap(m.map);
      }
      this.partMeshes[key] = list; return list;
    }));
  }
  async apply() {
    const c = this.cfg, kinds = { hair: c.hair, outfit: c.outfit, shoes: c.shoes, hat: c.hat };
    await Promise.all(Object.entries(kinds).map(([k, id]) => id && id !== 'none' ? this.loadPart(k, id) : null));
    for (const key in this.partMeshes) { const [k, id] = key.split(':'); const on = kinds[k] === id; for (const m of this.partMeshes[key]) m.visible = on; }
    // brows, beard
    for (const m of this.meshes) {
      if (/^brows__/.test(m.name)) m.visible = m.name === 'brows__' + c.brows;
      if (/^beard__/.test(m.name)) m.visible = m.name === 'beard__' + c.beard;
    }
    this.applyMorphs(); this.applyHide(); this.applyMaterials(); this.applyGlasses();
  }
  applyHide() { // hide body triangles fully covered by the chosen outfit + shoes
    const bits = this.catalog.hideBits; const mask = ((bits[this.cfg.outfit] ?? -1) >= 0 ? 1 << bits[this.cfg.outfit] : 0) | ((bits[this.cfg.shoes] ?? -1) >= 0 ? 1 << bits[this.cfg.shoes] : 0);
    if (!this.hideAttr || !mask) { this.body.geometry.setIndex(new THREE.BufferAttribute(this.idx0, 1)); return; }
    const h = this.hideAttr.array, src = this.idx0, out = [];
    const hid = (v) => (Math.round(h[v]) & mask) !== 0;
    for (let i = 0; i < src.length; i += 3) if (!(hid(src[i]) && hid(src[i + 1]) && hid(src[i + 2]))) out.push(src[i], src[i + 1], src[i + 2]);
    this.body.geometry.setIndex(out);
  }
  applyMaterials() {
    const c = this.cfg, bm = this.body.material;
    if (this._skin !== c.skin) { this._skin = c.skin; texLoader.load(`assets/avatar/skins/${c.skin}.jpg`, t => { t.flipY = false; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; bm.map = t; bm.needsUpdate = true; }); }
    bm.color.setScalar(1 + c.tone);
    const hairC = new THREE.Color(c.hairColor);
    for (const key in this.partMeshes) {
      const [k] = key.split(':');
      for (const m of this.partMeshes[key]) for (const mt of [].concat(m.material)) {
        if (k === 'hair') mt.color.copy(hairC).multiplyScalar(1.15);
        if (k === 'outfit') mt.color.set(c.outfitTint);
      }
    }
    for (const m of this.meshes) {
      if (/^brows__/.test(m.name)) { for (const mt of [].concat(m.material)) { if (mt.map && !mt.userData.gray) { mt.map = grayMap(mt.map); mt.userData.gray = true; } mt.color.copy(hairC).multiplyScalar(0.8); } }
      if (/^beard__/.test(m.name)) { for (const mt of [].concat(m.material)) { if (!mt.userData.strands) { mt.map = strandsTex(/full/.test(m.name)); mt.alphaTest = 0; mt.alphaHash = true; mt.transparent = false; mt.userData.strands = true; mt.roughness = 0.9; mt.needsUpdate = true; } mt.color.copy(hairC).multiplyScalar(0.9); } }
      if (/^eyes__/.test(m.name) && this._eyes !== c.eyes) { for (const mt of [].concat(m.material)) if (mt.map && mt.map.image) { mt.map = recolorIris(mt.map, c.eyes); mt.needsUpdate = true; } }
    }
    this._eyes = c.eyes;
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

// ---------------------------------------------------------------- Avatar Studio
export class AvatarStudio {
  constructor({ renderer, envMap, onDone, store }) {
    this.renderer = renderer; this.onDone = onDone; this.store = store; this.active = false;
    const s = this.scene = new THREE.Scene(); s.background = new THREE.Color(0xeef1f7); s.environment = envMap || null; s.environmentIntensity = 0.6;
    s.fog = new THREE.Fog(0xeef1f7, 8, 18);
    const floor = new THREE.Mesh(new THREE.CircleGeometry(6, 64), new THREE.MeshStandardMaterial({ color: 0xf6f8fc, roughness: 0.6 })); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; s.add(floor);
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.62, 0.66, 64), new THREE.MeshBasicMaterial({ color: 0x8d70ff })); ring.rotation.x = -Math.PI / 2; ring.position.y = 0.002; s.add(ring);
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.74, 0.06, 64), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.35, metalness: 0.1 })); disc.position.y = 0.03; disc.receiveShadow = true; s.add(disc);
    const key = new THREE.DirectionalLight(0xfff3e6, 2.4); key.position.set(2.2, 3.4, 2.6); key.castShadow = true; key.shadow.mapSize.set(2048, 2048); Object.assign(key.shadow.camera, { left: -1.5, right: 1.5, top: 2.5, bottom: -0.5, near: 0.5, far: 10 }); key.shadow.bias = -0.0005; s.add(key);
    const fill = new THREE.DirectionalLight(0xdfe8ff, 0.8); fill.position.set(-2.5, 1.8, 1.5); s.add(fill);
    const rim = new THREE.DirectionalLight(0xc8b8ff, 1.4); rim.position.set(-0.5, 2.6, -3); s.add(rim);
    s.add(new THREE.HemisphereLight(0xffffff, 0xd9dde6, 0.6));
    this.turn = new THREE.Group(); this.turn.position.y = 0.06; s.add(this.turn);
    this.camera = new THREE.PerspectiveCamera(32, innerWidth / innerHeight, 0.05, 50);
    this.orbit = { yaw: 0.35, dist: 4.0, height: 1.0, tDist: 4.0, tHeight: 1.0 };
    this.expr = 'neutral'; this.exprT = 0;
  }
  attach(avatar, character) { this.avatar = avatar; this.char = character; this.turn.add(character.root); character.root.position.set(0, 0, 0); character.root.rotation.y = 0; }
  headY() { const h = this.avatar && this.avatar.bones.head; if (!h) return 1.6; this.turn.updateMatrixWorld(true); return h.getWorldPosition(new THREE.Vector3()).y + 0.07; }
  frame(mode) { this.frameMode = mode; const hy = this.headY(); if (mode === 'face') { this.orbit.tDist = 0.95; this.orbit.tHeight = hy; } else if (mode === 'upper') { this.orbit.tDist = 1.9; this.orbit.tHeight = hy - 0.35; } else { this.orbit.tDist = 4.0; this.orbit.tHeight = hy * 0.56; } }
  render(dt) {
    if (this.frameMode && this.char) { const hy = this.headY(); this.orbit.tHeight = this.frameMode === 'face' ? hy : this.frameMode === 'upper' ? hy - 0.35 : hy * 0.56; }
    const o = this.orbit; o.dist += (o.tDist - o.dist) * Math.min(1, dt * 6); o.height += (o.tHeight - o.height) * Math.min(1, dt * 6);
    const narrow = innerWidth < 760; const off = narrow ? 0 : -0.55 * o.dist / 4; // keep the avatar left of the panel on desktop
    this.camera.aspect = innerWidth / innerHeight; this.camera.updateProjectionMatrix();
    this.camera.position.set(Math.sin(0) * o.dist - off, o.height + 0.08 * o.dist, o.dist); this.camera.lookAt(-off, o.height, 0);
    this.turn.rotation.y = o.yaw;
    if (this.char) {
      this.char.update(dt, 0, 0);
      // expression preview
      this.exprT += dt; const av = this.avatar;
      const set = (n, v) => av.setExpression(n, v);
      ['smile', 'jawOpen', 'mouthO', 'mouthE', 'browsUp'].forEach(n => set(n, 0));
      if (this.expr === 'smile') { set('smile', 0.9); set('browsUp', 0.2); }
      if (this.expr === 'talk') { const t = this.exprT * 7; set('jawOpen', 0.25 + 0.25 * Math.max(0, Math.sin(t))); set('mouthO', 0.4 * Math.max(0, Math.sin(t * 0.7 + 1))); set('mouthE', 0.4 * Math.max(0, Math.cos(t * 0.9))); }
      if (this.expr === 'surprised') { set('browsUp', 1); set('jawOpen', 0.35); set('mouthO', 0.5); }
    }
    this.renderer.render(this.scene, this.camera);
  }
  // ---------------------------------------------------------------- UI
  open() {
    this.active = true; const el = $('studio'); el.style.display = 'grid'; const ov = $('overlay'); if (ov) ov.style.display = 'none'; const fc = $('flyCap'); if (fc) fc.style.visibility = 'hidden'; this.build(); this.bindPointer();
  }
  close() { this.active = false; $('studio').style.display = 'none'; }
  build() {
    const av = this.avatar, cat = av.catalog, c = av.cfg;
    const tab = this.tab || 'body';
    const slider = (key, label, min, max, step, l = '', r = '') => `<label class="sl2"><span>${label}<em>${l && r ? `${l} ↔ ${r}` : ''}</em></span><input type="range" min="${min}" max="${max}" step="${step}" value="${c[key]}" data-k="${key}"></label>`;
    const chips = (key, items) => `<div class="chips">${items.map(([id, label]) => `<button data-k="${key}" data-v="${id}" class="${c[key] === id ? 'on' : ''}">${label}</button>`).join('')}</div>`;
    const swatches = (key, items) => `<div class="sw">${items.map(([label, hex]) => `<button title="${label}" data-k="${key}" data-v="${hex}" class="${c[key] === hex ? 'on' : ''}" style="background:${hex}"></button>`).join('')}</div>`;
    const P = cat.parts;
    const tabs = { body: 'Body', face: 'Face', skin: 'Skin & eyes', hair: 'Hair', style: 'Outfit', extras: 'Extras' };
    let body = '';
    if (tab === 'body') body = `<h4>Quick start</h4><div class="chips"><button data-preset="feminine">Feminine</button><button data-preset="neutral">Neutral</button><button data-preset="masculine">Masculine</button><button data-random>Randomise</button></div>
      <h4>Proportions</h4>${slider('pres', 'Presentation', -1, 1, 0.05, 'Feminine', 'Masculine')}${slider('build', 'Build', -1, 1, 0.05, 'Slim', 'Fuller')}${slider('muscle', 'Muscle tone', 0, 1, 0.05)}${slider('height', `Height · ${Math.round(c.height * (170 + c.pres * 6))} cm`, 0.9, 1.1, 0.01)}`;
    if (tab === 'face') body = `<h4>Face structure</h4>${slider('jawWide', 'Jaw width', 0, 1, 0.05)}${slider('chinStrong', 'Chin', 0, 1, 0.05)}${slider('cheekbones', 'Cheekbones', 0, 1, 0.05)}${slider('nose', 'Nose', -1, 1, 0.05, 'Narrow', 'Wide')}${slider('lipsFull', 'Lips', 0, 1, 0.05)}${slider('head', 'Head shape', -1, 1, 0.05, 'Round', 'Square')}
      <h4>Eyes</h4>${slider('eyesBig', 'Eye size', 0, 1, 0.05)}${slider('eyesUp', 'Eye angle', 0, 1, 0.05)}
      <h4>Expression preview</h4><div class="chips">${['neutral', 'smile', 'talk', 'surprised'].map(e => `<button data-expr="${e}" class="${this.expr === e ? 'on' : ''}">${e[0].toUpperCase() + e.slice(1)}</button>`).join('')}</div>
      <h4>Photo-assisted creator (optional)</h4><button class="ghost" data-photo>Use a photo as a reference…</button>`;
    if (tab === 'skin') body = `<h4>Skin tone</h4>${chips('skin', cat.skins.map(s => [s, SKIN_LABELS[s] || s]))}${slider('tone', 'Fine tone', -0.25, 0.15, 0.01, 'Deeper', 'Lighter')}<h4>Eye colour</h4>${swatches('eyes', EYE_COLORS)}`;
    if (tab === 'hair') body = `<h4>Hairstyle</h4>${chips('hair', [['none', 'None'], ...P.hair.map(p => [p.id, p.label])])}<h4>Hair colour</h4>${swatches('hairColor', HAIR_COLORS)}
      <h4>Eyebrows</h4>${chips('brows', cat.brows.map(b => [b.id, b.label]))}<h4>Facial hair</h4>${chips('beard', [['none', 'None'], ...cat.beards.map(b => [b.id, b.label])])}`;
    if (tab === 'style') body = `<h4>Outfit</h4>${chips('outfit', P.outfit.map(p => [p.id, p.label]))}<p class="hint2">Business suit, Tailored suit and Work uniform double as professional attire.</p><h4>Outfit colour</h4>${swatches('outfitTint', TINTS)}<h4>Footwear</h4>${chips('shoes', P.shoes.map(p => [p.id, p.label]))}`;
    if (tab === 'extras') body = `<h4>Eyewear</h4>${chips('glasses', [['none', 'None'], ['round', 'Round'], ['rect', 'Rectangular'], ['aviator', 'Aviator']])}<h4>Headwear</h4>${chips('hat', [['none', 'None'], ['fedora01', 'Fedora']])}`;
    $('studioPanel').innerHTML = `<div class="st-head"><div><b>Avatar Studio</b><span>Every change edits the 3D model.</span></div><div class="st-cam"><button data-frame="full">Full</button><button data-frame="upper">Upper</button><button data-frame="face">Face</button></div></div>
      <div class="st-tabs">${Object.entries(tabs).map(([k, l]) => `<button data-tab="${k}" class="${tab === k ? 'on' : ''}">${l}</button>`).join('')}</div>
      <div class="st-body">${body}</div>
      <div class="st-foot"><span class="hint2">Drag the avatar to rotate · scroll to zoom</span><button class="primary" id="studioDone">Save & enter Talentopia →</button></div>`;
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
    box.innerHTML = `<div class="card glass" style="max-width:520px;padding:22px"><h3 style="margin:0 0 8px">Photo-assisted avatar (optional)</h3>
      <p style="color:#5b6476;line-height:1.5;font-size:14px">With your consent, a photo could be used <b>only</b> to suggest visual features (skin tone, hair, face shape) that you can then edit. Talentopia never infers personality, ability or career suitability from appearance, and a photo is never required.</p>
      <p style="color:#5b6476;line-height:1.5;font-size:14px"><b>Status:</b> this needs an image-to-3D / face-fitting service and a secure backend, which are <b>not connected yet</b>. No photo is uploaded or stored. The integration point is <code>AVATAR_PHOTO_ENDPOINT</code> in <code>world/avatar.js</code>.</p>
      <div class="row" style="margin-top:10px"><button class="primary" id="phClose">OK, I’ll customise manually</button></div></div>`;
    $('phClose').onclick = () => { box.style.display = 'none'; };
  }
}
// Integration point for a future photo-to-avatar backend (POST image, receive suggested cfg). Intentionally null: not connected.
export const AVATAR_PHOTO_ENDPOINT = null;
