// Talentopia City Hall: the orientation building on Central Plaza (glass rotunda lobby between terraced wings).
// Inside: an interactive city model (opens World View), NOVA the guide, a Career Passport kiosk, an Avatar Studio booth,
// a "Start here" board, a Master Your Future wall (university learning) and a Career events board.
import * as THREE from 'three';
import { M, roomGlass } from './kit.js';

const CX = 0, CZ = -20, HALF = 11; // tower lobby: 22 × 22 m
function canvasPanel(w, h, draw, emissive = 0.55) {
  const c = document.createElement('canvas'); c.width = Math.round(512 * w / Math.max(w, h) * 2); c.height = Math.round(512 * h / Math.max(w, h) * 2);
  const g = c.getContext('2d'); draw(g, c.width, c.height); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: t, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: emissive, roughness: 0.5 }));
  m.userData.redraw = (fn) => { fn(g, c.width, c.height); t.needsUpdate = true; }; return m;
}
function screenText(title, sub, accent = '#42DBFF') {
  return (g, W, H) => { const gr = g.createLinearGradient(0, 0, W, H); gr.addColorStop(0, '#111827'); gr.addColorStop(1, '#1d2440'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
    g.fillStyle = accent; g.fillRect(W * 0.06, H * 0.18, W * 0.08, 6); g.fillStyle = '#F6F8FC'; g.font = `800 ${Math.round(H * 0.16)}px Plus Jakarta Sans, Arial`; g.fillText(title, W * 0.06, H * 0.42);
    g.fillStyle = '#C8B8F4'; g.font = `600 ${Math.round(H * 0.085)}px Plus Jakarta Sans, Arial`; sub.split('\n').forEach((l, i) => g.fillText(l, W * 0.06, H * (0.6 + i * 0.12))); };
}

// V4: the building itself is a Blender model (blender/cityhall.py -> assets/landmarks/cityhall.glb) made from the approved concept:
// glass rotunda (the walk-in lobby, 24 m across) with sign band, canopy, revolving door and glass dome, between terraced wings.
const R0 = 12.2;
function bannerTex() {
  const c = document.createElement('canvas'); c.width = 256; c.height = 768; const g = c.getContext('2d');
  const gr = g.createLinearGradient(0, 0, 0, 768); gr.addColorStop(0, '#2a1d6e'); gr.addColorStop(0.55, '#5b3fc4'); gr.addColorStop(1, '#3a2890'); g.fillStyle = gr; g.fillRect(0, 0, 256, 768);
  g.lineCap = 'round';
  for (let i = 0; i < 7; i++) { g.strokeStyle = `rgba(${200 + i * 8},${170 + i * 10},255,${0.75 - i * 0.08})`; g.lineWidth = 6 - i * 0.6; g.beginPath();
    for (let y = 120; y <= 700; y += 8) { const x = 128 + Math.sin(y / 90 + i * 0.55) * (60 + i * 9) * Math.sin((y - 120) / 580 * Math.PI); y === 120 ? g.moveTo(x, y) : g.lineTo(x, y); } g.stroke(); }
  const glow = g.createRadialGradient(128, 420, 10, 128, 420, 220); glow.addColorStop(0, 'rgba(255,255,255,0.28)'); glow.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = glow; g.fillRect(0, 0, 256, 768);
  g.fillStyle = 'rgba(255,255,255,0.9)'; g.font = '800 30px Plus Jakarta Sans, Arial'; g.textAlign = 'center'; g.fillText('TALENTOPIA', 128, 70);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; t.flipY = false; return t; // glTF UVs
}
function dressModel(root) {
  let bannerMat = null;
  root.traverse(o => {
    if (!o.isMesh) return;
    o.material = [].concat(o.material).map(m => {
      const n = m.name || '';
      if (n === 'glass_drum') { o.castShadow = false; return new THREE.MeshPhysicalMaterial({ color: 0x9db8cf, metalness: 0.55, roughness: 0.05, transparent: true, opacity: 0.5, envMapIntensity: 1.8, side: THREE.DoubleSide, depthWrite: false, clearcoat: 1 }); }
      if (n === 'glass_rooms') return roomGlass({ cell: [2.2, 4.2], tint: [92, 118, 146], mullion: '#e7e3db', spandrel: false, frame: 0.04, lit: 0.8, seed: 7, warm: 0.85 });
      if (n === 'banner') { o.castShadow = false; return bannerMat || (bannerMat = new THREE.MeshStandardMaterial({ map: bannerTex(), roughness: 0.75, side: THREE.DoubleSide, emissive: 0xffffff, emissiveMap: null, emissiveIntensity: 0 })); }
      if (n === 'WhitePanel') { m.envMapIntensity = 1.2; m.roughness = 0.3; }
      if (n.startsWith('glow')) { m.emissiveIntensity = n === 'glow_violet' ? 2.2 : 1.6; o.castShadow = false; }
      if (n === 'SignText') { m.metalness = 0.55; m.roughness = 0.35; }
      return m;
    });
    if (o.material.length === 1) o.material = o.material[0];
  });
  return root;
}

export function buildCityHall(ctx, P) {
  const scene = ctx.scene, floorY = P + 0.6, g = new THREE.Group(); g.name = 'cityhall'; scene.add(g);
  const x0 = CX - HALF, x1 = CX + HALF, z0 = CZ - HALF, z1 = CZ + HALF;
  // the Blender model (streamed with the other landmarks)
  ctx.landmark('cityhall', CX, P, CZ, 0, { w: 66, d: 40, h: 22, name: 'Talentopia City Hall', district: 'plaza', color: '#8D70FF', collide: false,
    onLoad: o => { dressModel(o); } });
  // walkable floors: the round lobby (strips approximating the circle) and the lit front steps as a gentle slope
  for (let z = -R0; z < R0; z += 2) { const zm = Math.min(Math.abs(z), Math.abs(z + 2)); const hw = Math.sqrt(Math.max(0, R0 * R0 - zm * zm)) - 0.2; ctx.floor(CX - hw, CX + hw, CZ + z, CZ + z + 2, floorY); }
  ctx.floor(CX - 9, CX + 9, CZ + R0 - 0.2, CZ + R0 + 3.4, 0, { axis: 'z', from: CZ + R0 + 3.4, to: CZ + R0 - 0.2, h0: P, h1: floorY });
  // colliders: the rotunda's glass wall (door gap at the front), the white blades, the wings, banner poles, flower beds
  for (let a = 0; a < 360; a += 6) { const t = a * Math.PI / 180; if (Math.abs(Math.sin(t)) * R0 < 2.6 && Math.cos(t) > 0) continue;
    const x = CX + Math.sin(t) * R0, z = CZ + Math.cos(t) * R0; ctx.collider(x - 0.7, x + 0.7, z - 0.7, z + 0.7, 0, 9); }
  for (const s of [-1, 1]) {
    const t = s * 66 * Math.PI / 180, bx = CX + Math.sin(t) * 13.8, bz = CZ + Math.cos(t) * 13.8; ctx.collider(bx - 1.4, bx + 1.4, bz - 1.4, bz + 1.4, 0, 16);
    // wings: front line z = CZ + 5.2 - 0.0185 (|x| - 12.4)^2, back at CZ - 9.3; outer fin to |x| = 33.2
    for (let xa = 12.4; xa < 33.2; xa += 2.6) { const xb = Math.min(33.2, xa + 2.6), xm = Math.min(30, xb); const zf = CZ + 5.2 - 0.0185 * Math.pow(Math.max(0, Math.min(xa, 30) - 12.4), 2) + 0.3;
      ctx.collider(CX + Math.min(s * xa, s * xb), CX + Math.max(s * xa, s * xb), CZ - 9.4, zf, 0, 14); }
    const pt = s * 34 * Math.PI / 180, px = CX + Math.sin(pt) * (R0 + 3.9), pz = CZ + Math.cos(pt) * (R0 + 3.9); ctx.collider(px - 0.25, px + 0.25, pz - 0.25, pz + 0.25, 0, 10);
    for (let a = 35; a < 60; a += 5) { const t2 = s * (a + 2.5) * Math.PI / 180; const bx2 = CX + Math.sin(t2) * 18.5, bz2 = CZ + Math.cos(t2) * 18.5; ctx.collider(bx2 - 1.3, bx2 + 1.3, bz2 - 1.3, bz2 + 1.3, 0, 0.9); }
  }
  // revolving door: four glass wings turning slowly inside the drum
  const rev = new THREE.Group(); rev.position.set(CX, floorY, CZ + R0); g.add(rev);
  const wingM = new THREE.MeshPhysicalMaterial({ color: 0xdfe8f2, transparent: true, opacity: 0.3, roughness: 0.05, metalness: 0.2, depthWrite: false, side: THREE.DoubleSide });
  for (let i = 0; i < 4; i++) { const w = new THREE.Mesh(new THREE.BoxGeometry(1.8, 2.8, 0.04), wingM); w.position.set(Math.cos(i * Math.PI / 2) * 0.9, 1.4, Math.sin(i * Math.PI / 2) * 0.9); w.rotation.y = -i * Math.PI / 2; rev.add(w);
    const frame = new THREE.Mesh(new THREE.BoxGeometry(0.05, 2.8, 0.06), M('metalLight')); frame.position.set(Math.cos(i * Math.PI / 2) * 1.8, 1.4, Math.sin(i * Math.PI / 2) * 1.8); rev.add(frame); }
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 2.8, 12), M('metalLight')); hub.position.y = 1.4; rev.add(hub);
  ctx.animated.push(tt => { const near = ctx.cityHallNear ? ctx.cityHallNear(CX, CZ + R0) : false; rev.rotation.y += near ? 0.012 : 0.004; });
  // lobby floor: polished stone with a champagne inlay ring
  const fl = new THREE.Mesh(new THREE.CircleGeometry(R0 - 0.1, 72), new THREE.MeshStandardMaterial({ color: 0xf2efe9, roughness: 0.18, metalness: 0.05, envMapIntensity: 1.2 })); fl.rotation.x = -Math.PI / 2; fl.position.set(CX, floorY + 0.012, CZ); fl.receiveShadow = true; g.add(fl);
  const inlay = new THREE.Mesh(new THREE.RingGeometry(4.2, 4.35, 72), new THREE.MeshBasicMaterial({ color: 0xd8b98a })); inlay.rotation.x = -Math.PI / 2; inlay.position.set(CX, floorY + 0.02, CZ); g.add(inlay);
  // the hologram column from the concept: light rings rising from the city model up into the atrium
  const holo = new THREE.Group(); holo.position.set(CX, floorY + 1.2, CZ); g.add(holo);
  const ringM = (c) => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.85, toneMapped: false, depthWrite: false });
  const rings = [[2.6, 0x42dbff, 1.6], [1.9, 0x8d70ff, 3.3], [2.9, 0x9fe8ff, 5.1], [1.5, 0xc8b8f4, 6.9], [2.2, 0x42dbff, 8.6]].map(([r, c, y]) => {
    const m = new THREE.Mesh(new THREE.TorusGeometry(r, 0.035, 8, 96), ringM(c)); m.rotation.x = Math.PI / 2; m.position.y = y; holo.add(m); return m; });
  const beamM = new THREE.MeshBasicMaterial({ color: 0x7fdcff, transparent: true, opacity: 0.16, toneMapped: false, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending });
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.9, 10, 32, 1, true), beamM); beam.position.y = 5; holo.add(beam);
  ctx.animated.push(tt => { rings.forEach((m, i) => { m.position.y = [1.6, 3.3, 5.1, 6.9, 8.6][i] + Math.sin(tt * 0.8 + i) * 0.15; m.rotation.z = tt * (0.2 + i * 0.07) * (i % 2 ? -1 : 1); m.material.opacity = 0.6 + 0.3 * Math.sin(tt * 1.3 + i); }); beamM.opacity = 0.12 + 0.05 * Math.sin(tt * 2); });
  // ---------------------------------------------------------------- the interactive city model (centre of the lobby)
  const tbl = new THREE.Mesh(new THREE.CylinderGeometry(3.3, 3.45, 0.85, 64), new THREE.MeshStandardMaterial({ color: 0x1b2333, metalness: 0.6, roughness: 0.3 })); tbl.position.set(CX, floorY + 0.43, CZ); tbl.castShadow = true; g.add(tbl);
  const ring = new THREE.Mesh(new THREE.RingGeometry(3.05, 3.25, 72), new THREE.MeshBasicMaterial({ color: 0x42dbff, toneMapped: false })); ring.rotation.x = -Math.PI / 2; ring.position.set(CX, floorY + 0.87, CZ); g.add(ring);
  ctx.collider(CX - 3.4, CX + 3.4, CZ - 3.4, CZ + 3.4, 0, 1.2);
  const model = new THREE.Group(); model.position.set(CX, floorY + 0.9, CZ); g.add(model); const k = 1 / 125;
  const fps = ctx.footprints.filter(f => f.kind === 'bldg' || !f.kind);
  const geo = new THREE.BoxGeometry(1, 1, 1), mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4, metalness: 0.1, emissive: 0x2a3a66, emissiveIntensity: 0.25 });
  const inst = new THREE.InstancedMesh(geo, mat, fps.length); const m4 = new THREE.Matrix4(), col = new THREE.Color();
  fps.forEach((f, i) => { const lm = ctx.landmarks.find(l => Math.abs(l.x - f.x) < 2 && Math.abs(l.z - f.z) < 2); const h = lm ? (lm.h || 60) : 8 + ((i * 37) % 17);
    m4.compose(new THREE.Vector3((f.x - 46) * k, h * k / 2, f.z * k), new THREE.Quaternion(), new THREE.Vector3(Math.max(0.02, f.w * k), Math.max(0.02, h * k), Math.max(0.02, f.d * k)));
    inst.setMatrixAt(i, m4); inst.setColorAt(i, col.set(f.color || '#cfd6e2')); });
  inst.castShadow = true; model.add(inst);
  const base = new THREE.Mesh(new THREE.BoxGeometry(760 * k, 0.02, 420 * k), new THREE.MeshStandardMaterial({ color: 0x8fb39a, roughness: 0.9 })); base.position.y = -0.01; model.add(base);
  const you = new THREE.Mesh(new THREE.SphereGeometry(0.06, 16, 12), new THREE.MeshBasicMaterial({ color: 0x42dbff, toneMapped: false })); you.position.set((0 - 46) * k, 0.12, 0); model.add(you);
  ctx.animated.push(tt => { model.rotation.y = Math.sin(tt * 0.1) * 0.25; you.scale.setScalar(1 + 0.35 * Math.sin(tt * 4)); ring.material.color.setHSL(0.53 + 0.03 * Math.sin(tt), 0.9, 0.62);
    // doors open when someone is near the entrance
    const near = ctx.cityHallNear ? ctx.cityHallNear(CX, z1) : false; doors.forEach(o => { o.k = (o.k || 0) + ((near ? 1 : 0) - (o.k || 0)) * 0.08; o.d.position.x = CX + o.s * (1.3 + o.k * 2.4); }); });
  // ---------------------------------------------------------------- NOVA: a friendly holographic guide orb
  const nova = new THREE.Group(); nova.position.set(CX + 6.6, floorY, CZ - 5.6); g.add(nova);
  const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.6, 0.9, 32), M('white')); ped.position.y = 0.45; nova.add(ped);
  const orb = new THREE.Mesh(new THREE.SphereGeometry(0.42, 32, 24), new THREE.MeshPhysicalMaterial({ color: 0x1a1f3a, roughness: 0.15, metalness: 0.3, clearcoat: 1 })); orb.position.y = 1.85; nova.add(orb);
  const halo = new THREE.Mesh(new THREE.TorusGeometry(0.58, 0.025, 12, 64), new THREE.MeshBasicMaterial({ color: 0x8d70ff, toneMapped: false })); halo.position.y = 1.85; halo.rotation.x = Math.PI / 2.4; nova.add(halo);
  const eyeM = new THREE.MeshBasicMaterial({ color: 0x42dbff, toneMapped: false }); const eyes = [-1, 1].map(s => { const e = new THREE.Mesh(new THREE.CapsuleGeometry(0.035, 0.07, 4, 8), eyeM); e.position.set(s * 0.12, 1.9, 0.39); nova.add(e); return e; });
  nova.rotation.y = Math.atan2((CX) - nova.position.x, (z1) - nova.position.z);
  ctx.animated.push(tt => { const y = 1.85 + Math.sin(tt * 1.6) * 0.06; orb.position.y = halo.position.y = y; eyes.forEach(e => { e.position.y = y + 0.05; e.scale.y = (tt % 4) < 0.12 ? 0.15 : 1; }); halo.rotation.z = tt * 0.6; });
  ctx.collider(nova.position.x - 0.6, nova.position.x + 0.6, nova.position.z - 0.6, nova.position.z + 0.6, 0, 2);
  // ---------------------------------------------------------------- kiosks and walls
  const kiosk = (x, z, ry, title, sub, accent) => { const k2 = new THREE.Group(); k2.position.set(x, floorY, z); k2.rotation.y = ry; g.add(k2);
    const b = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.05, 0.5), M('white')); b.position.y = 0.52; b.castShadow = true; k2.add(b);
    const s = canvasPanel(1.25, 0.8, screenText(title, sub, accent)); s.position.set(0, 1.5, 0.05); s.rotation.x = -0.12; k2.add(s);
    ctx.collider(x - 0.7, x + 0.7, z - 0.7, z + 0.7, 0, 2); return k2; };
  kiosk(CX - 6.6, CZ - 5.6, Math.atan2(CX - (CX - 6.6), z1 - (CZ - 5.6)), 'PASSPORT', 'Your journey,\nskills & badges', '#D8B98A');
  // avatar studio booth: arch with a ring light and a mirror
  const booth = new THREE.Group(); booth.position.set(CX - 7.8, floorY, CZ + 4.2); booth.rotation.y = Math.PI / 2; g.add(booth);
  const arch = new THREE.Mesh(new THREE.TorusGeometry(1.25, 0.08, 16, 64, Math.PI), new THREE.MeshBasicMaterial({ color: 0xc8b8f4, toneMapped: false })); arch.position.y = 1.0; booth.add(arch);
  const mirror = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 2.0), new THREE.MeshPhysicalMaterial({ color: 0xdfe6f0, metalness: 1, roughness: 0.05 })); mirror.position.set(0, 1.2, -0.3); booth.add(mirror);
  const bs = canvasPanel(1.6, 0.5, screenText('AVATAR STUDIO', 'Change your look', '#C8B8F4')); bs.position.set(0, 2.55, -0.25); booth.add(bs);
  kiosk(CX + 7.8, CZ + 4.2, -Math.PI / 2, 'START HERE', 'Your first career\nchallenge', '#78D8B5');
  const learn = canvasPanel(7, 2.6, screenText('MASTER YOUR FUTURE', 'University learning · practise your field\ninside real workplaces', '#8D70FF')); learn.position.set(CX, floorY + 2.6, CZ - R0 + 1.2); g.add(learn);
  const ev = canvasPanel(4.2, 2.2, screenText('CAREER EVENTS', 'Open days · fairs · workshops', '#F3A7B5')); ev.position.set(CX - R0 + 1.3, floorY + 2.4, CZ - 2); ev.rotation.y = Math.PI / 2; g.add(ev);
  const S = (id, x, z, label, action, radius = 1.9) => ({ id, x, z, label, action, radius, building: 'cityhall' });
  const stations = [
    S('ch_model', CX, CZ + 4.3, 'Talentopia city model · Open World View', 'ch:world', 2.4),
    S('ch_nova', CX + 6.0, CZ - 4.3, 'NOVA · Ask the Talentopia guide', 'ch:nova'),
    S('ch_passport', CX - 6.0, CZ - 4.3, 'Career Passport kiosk · Open my Passport', 'ch:passport'),
    S('ch_studio', CX - 6.4, CZ + 4.2, 'Avatar Studio · Change my look', 'ch:studio'),
    S('ch_start', CX + 6.4, CZ + 4.2, 'Start here · Find my first career', 'ch:start'),
    S('ch_learn', CX, CZ - R0 + 2.8, 'Master Your Future · University learning', 'ch:learn', 2.2),
    S('ch_events', CX - R0 + 2.9, CZ - 2, 'Career events · See what’s coming up', 'ch:events', 2.0),
  ];
  const featured = { id: 'cityhall', name: 'Talentopia City Hall', district: 'plaza', face: 's', x0, x1, z0, z1, floorH: floorY, gfH: 8.4, entrance: { x: CX, z: CZ + R0 + 4.2 }, inside: { x: CX, z: CZ + 6.5 } };
  ctx.labels.push({ name: 'Talentopia City Hall', district: 'plaza', x: CX, z: CZ, featured: 'cityhall' });
  const click = new THREE.Mesh(new THREE.BoxGeometry(26, 20, 26), new THREE.MeshBasicMaterial({ visible: false })); click.position.set(CX, floorY + 4.5, CZ);
  click.userData = { building: 'Talentopia City Hall', district: 'plaza', featured: 'cityhall' }; scene.add(click); ctx.clickMeshes.push(click);
  return { featured, stations };
}
