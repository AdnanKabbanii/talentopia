// Talentopia City Hall: the glass ground-floor lobby of Talentopia Tower at Central Plaza, the orientation building.
// Inside: an interactive city model (opens World View), NOVA the guide, a Career Passport kiosk, an Avatar Studio booth,
// a "Start here" board, a Master Your Future wall (university learning) and a Career events board.
import * as THREE from 'three';
import { M } from './kit.js';

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

export function buildCityHall(ctx, P, { logoUrl = 'assets/brand/logo.svg' } = {}) {
  const scene = ctx.scene, floorY = P + 0.6, g = new THREE.Group(); g.name = 'cityhall'; scene.add(g);
  const x0 = CX - HALF, x1 = CX + HALF, z0 = CZ - HALF, z1 = CZ + HALF;
  // walk-in: the tower's stone plinth (+0.6 m) gets a gentle ramp on the plaza side and the glass walls get colliders with a door gap
  ctx.floor(CX - 15, CX + 15, CZ - 15, CZ + 15, floorY);
  ctx.floor(CX - 6, CX + 6, CZ + 15, CZ + 18.5, 0, { axis: 'z', from: CZ + 18.5, to: CZ + 15, h0: P, h1: floorY });
  const ramp = new THREE.Mesh(new THREE.BoxGeometry(12, 0.3, 3.8), M('limestone')); ramp.position.set(CX, P + 0.15, CZ + 16.7); ramp.rotation.x = Math.atan2(0.6, 3.5); ramp.receiveShadow = true; g.add(ramp);
  const t = 0.35, H = 9;
  ctx.collider(x0 - t, x0, z0, z1, 0, H); ctx.collider(x1, x1 + t, z0, z1, 0, H); ctx.collider(x0, x1, z0 - t, z0, 0, H);
  ctx.collider(x0, CX - 2.6, z1, z1 + t, 0, H); ctx.collider(CX + 2.6, x1, z1, z1 + t, 0, H);
  // automatic doors
  const doorMat = new THREE.MeshPhysicalMaterial({ color: 0xdfe8f2, transparent: true, opacity: 0.35, roughness: 0.05, metalness: 0.1 });
  const doors = [-1, 1].map(s => { const d = new THREE.Mesh(new THREE.BoxGeometry(2.6, 3.2, 0.08), doorMat); d.position.set(CX + s * 1.3, floorY + 1.6, z1 + 0.05); g.add(d); return { d, s }; });
  // interior finishes: frosted glass lining (bright, keeps the city visible) and a ceiling with a glowing cove
  const lining = new THREE.MeshStandardMaterial({ color: 0xf6f8fc, transparent: true, opacity: 0.42, roughness: 0.2, metalness: 0, side: THREE.FrontSide, depthWrite: false });
  for (const [x, z, ry, w] of [[CX, z0 + 0.4, 0, 21.2], [x0 + 0.4, CZ, Math.PI / 2, 21.2], [x1 - 0.4, CZ, -Math.PI / 2, 21.2]]) { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, 7.6), lining); m.position.set(x, floorY + 3.8, z); m.rotation.y = ry; g.add(m); }
  for (const s of [-1, 1]) { const m = new THREE.Mesh(new THREE.PlaneGeometry(8.2, 7.6), lining); m.position.set(CX + s * 6.9, floorY + 3.8, z1 - 0.4); m.rotation.y = Math.PI; g.add(m); }
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(21.6, 21.6), new THREE.MeshStandardMaterial({ color: 0xf3f1ec, roughness: 0.8, side: THREE.DoubleSide })); ceil.rotation.x = Math.PI / 2; ceil.position.set(CX, floorY + 7.7, CZ); g.add(ceil);
  const cove = new THREE.Mesh(new THREE.RingGeometry(5.6, 6.0, 72), new THREE.MeshBasicMaterial({ color: 0xfff4e0, side: THREE.DoubleSide, toneMapped: false })); cove.rotation.x = Math.PI / 2; cove.position.set(CX, floorY + 7.65, CZ); g.add(cove);
  // interior finishes
  const fl = new THREE.Mesh(new THREE.CircleGeometry(9.5, 64), new THREE.MeshStandardMaterial({ color: 0xf2efe9, roughness: 0.35, metalness: 0.05 })); fl.rotation.x = -Math.PI / 2; fl.position.set(CX, floorY + 0.012, CZ); fl.receiveShadow = true; g.add(fl);
  const inlay = new THREE.Mesh(new THREE.RingGeometry(4.2, 4.35, 72), new THREE.MeshBasicMaterial({ color: 0xd8b98a })); inlay.rotation.x = -Math.PI / 2; inlay.position.set(CX, floorY + 0.02, CZ); g.add(inlay);
  // planters with greenery in the four corners
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { const px = CX + sx * 8.6, pz = CZ + sz * 8.6;
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.0, 0.7, 24), M('charcoal')); pot.position.set(px, floorY + 0.35, pz); g.add(pot);
    for (let k = 0; k < 3; k++) { const b = new THREE.Mesh(new THREE.IcosahedronGeometry(0.75 - k * 0.12, 1), M(k % 2 ? 'leaf' : 'leaf2')); b.position.set(px + (k - 1) * 0.35, floorY + 1.2 + k * 0.45, pz); b.castShadow = true; g.add(b); }
    ctx.collider(px - 1.1, px + 1.1, pz - 1.1, pz + 1.1, 0, 2); }
  // lobby wall sign + exterior sign (logo placeholder slot: assets/brand/logo.svg)
  const drawSign = (logo) => (gg, W, Hh) => { gg.fillStyle = '#111827'; gg.fillRect(0, 0, W, Hh); if (logo) gg.drawImage(logo, Hh * 0.18, Hh * 0.18, Hh * 0.64, Hh * 0.64);
    gg.fillStyle = '#F6F8FC'; gg.font = `800 ${Math.round(Hh * 0.32)}px Plus Jakarta Sans, Arial`; gg.fillText('TALENTOPIA', Hh * 1.0, Hh * 0.5);
    gg.fillStyle = '#D8B98A'; gg.font = `700 ${Math.round(Hh * 0.2)}px Plus Jakarta Sans, Arial`; gg.fillText('CITY HALL', Hh * 1.02, Hh * 0.8); };
  const ext = canvasPanel(9, 1.8, drawSign(null), 0.7); ext.position.set(CX, floorY + 6.7, z1 + 0.25); g.add(ext);
  const inn = canvasPanel(6, 1.2, drawSign(null), 0.6); inn.position.set(CX, floorY + 5.2, z0 + 0.2); g.add(inn);
  const img = new Image(); img.onload = () => { ext.userData.redraw(drawSign(img)); inn.userData.redraw(drawSign(img)); }; img.src = logoUrl;
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
  const learn = canvasPanel(7, 2.6, screenText('MASTER YOUR FUTURE', 'University learning · practise your field\ninside real workplaces', '#8D70FF')); learn.position.set(CX + 3.5, floorY + 2.6, z0 + 0.22); g.add(learn);
  const ev = canvasPanel(4.2, 2.2, screenText('CAREER EVENTS', 'Open days · fairs · workshops', '#F3A7B5')); ev.position.set(x0 + 0.22, floorY + 2.4, CZ - 2); ev.rotation.y = Math.PI / 2; g.add(ev);
  const S = (id, x, z, label, action, radius = 1.9) => ({ id, x, z, label, action, radius, building: 'cityhall' });
  const stations = [
    S('ch_model', CX, CZ + 4.3, 'Talentopia city model · Open World View', 'ch:world', 2.4),
    S('ch_nova', CX + 6.0, CZ - 4.3, 'NOVA · Ask the Talentopia guide', 'ch:nova'),
    S('ch_passport', CX - 6.0, CZ - 4.3, 'Career Passport kiosk · Open my Passport', 'ch:passport'),
    S('ch_studio', CX - 6.4, CZ + 4.2, 'Avatar Studio · Change my look', 'ch:studio'),
    S('ch_start', CX + 6.4, CZ + 4.2, 'Start here · Find my first career', 'ch:start'),
    S('ch_learn', CX + 3.5, z0 + 1.8, 'Master Your Future · University learning', 'ch:learn', 2.2),
    S('ch_events', x0 + 1.8, CZ - 2, 'Career events · See what’s coming up', 'ch:events', 2.0),
  ];
  const featured = { id: 'cityhall', name: 'Talentopia City Hall', district: 'plaza', face: 's', x0, x1, z0, z1, floorH: floorY, gfH: 8.4, entrance: { x: CX, z: CZ + 17.5 }, inside: { x: CX, z: CZ + 6.5 } };
  ctx.labels.push({ name: 'Talentopia City Hall', district: 'plaza', x: CX, z: CZ, featured: 'cityhall' });
  const click = new THREE.Mesh(new THREE.BoxGeometry(22, 9, 22), new THREE.MeshBasicMaterial({ visible: false })); click.position.set(CX, floorY + 4.5, CZ);
  click.userData = { building: 'Talentopia City Hall', district: 'plaza', featured: 'cityhall' }; scene.add(click); ctx.clickMeshes.push(click);
  return { featured, stations };
}
