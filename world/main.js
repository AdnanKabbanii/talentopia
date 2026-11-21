// Talentopia · one connected 3D career city. World systems: scene, streaming, collisions, avatar + camera, doors, NPCs, traffic,
// building interaction, MedCity hospital + Heart Lab, missions, map, persistence.
import * as THREE from 'three';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { Ctx, initMaterials, M, makeCar, Batch, WIND } from './kit.js';
import * as TX from './textures.js';
import { buildStreets, buildPlaza, buildMonorail, buildNav, findPath, nearestSidewalk, ROUTES, polyline, blockLoop, CITY, buildSignals, buildBackdrop, SIGNAL, XS, ZS, HALF } from './city.js';
import { buildDistricts, DISTRICTS, PLAZA, districtAt } from './districts.js';
import { furnish, furnishHospital } from './interiors.js';
import { loadModel, Character } from './characters.js';
import { createUI } from './ui.js';

const $ = id => document.getElementById(id);
const isTouch = matchMedia('(pointer: coarse)').matches;
const isSmall = Math.min(innerWidth, innerHeight) < 760;

// ------------------------------------------------------------------ persistence (shared with the classic site)
const KEY = 'talentopia_3dcity_v1';
let progress = {}; try { progress = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) { progress = {}; }
progress.xp = progress.xp || 0; progress.done = progress.done || []; progress.flags = progress.flags || {}; progress.shifts = progress.shifts || {};
const store = () => { try { localStorage.setItem(KEY, JSON.stringify(progress)); } catch (e) {} };

// ------------------------------------------------------------------ renderer / scene
const canvas = $('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
// phones: cap resolution; dynamic resolution below lowers it further if the frame rate drops
const Q = { phone: isTouch || isSmall, maxPR: (isTouch || isSmall) ? 1.25 : 1.75, pr: 0, slow: 0 };
Q.pr = Math.min(devicePixelRatio, Q.maxPR); renderer.setPixelRatio(Q.pr);
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 0.95;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
TX.setAniso(Math.min(8, renderer.capabilities.getMaxAnisotropy()));
const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0xd3dde8, 260, 2100);
const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.15, 2500);
camera.position.set(0, 40, 120);
const hemi = new THREE.HemisphereLight(0xe3ecff, 0x8f8270, 0.55); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff0dc, 2.7); sun.castShadow = true;
const SH = (isTouch || isSmall) ? 70 : 110;
sun.shadow.mapSize.set((isTouch || isSmall) ? 1024 : 4096, (isTouch || isSmall) ? 1024 : 4096);
Object.assign(sun.shadow.camera, { left: -SH, right: SH, top: SH, bottom: -SH, near: 10, far: 420 });
sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.04; scene.add(sun); scene.add(sun.target);
const SUN_DIR = new THREE.Vector3(0.55, 1, 0.35).normalize();
// two pooled interior lights that follow the nearest interior (keeps the light count fixed, no shader recompiles)
const roomLights = [new THREE.PointLight(0xfff4e6, 0, 26, 1.6), new THREE.PointLight(0xfff4e6, 0, 26, 1.6)]; roomLights.forEach(l => scene.add(l));
// post-processing: ground-truth ambient occlusion (desktop), tone mapping + sRGB in the output pass
let composer = null, gtao = null;
if (!isTouch && new URLSearchParams(location.search).get('ao') !== '0') {
  composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  gtao = new GTAOPass(scene, camera, innerWidth, innerHeight);
  gtao.output = GTAOPass.OUTPUT.Default; gtao.blendIntensity = 0.9;
  gtao.updateGtaoMaterial({ radius: 1.4, distanceExponent: 1.4, thickness: 1.2, scale: 1.0, samples: 12, distanceFallOff: 1, screenSpaceRadius: false });
  gtao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 6, radiusExponent: 1, rings: 2, samples: 12 });
  composer.addPass(gtao); composer.addPass(new OutputPass());
}
addEventListener('resize', () => { renderer.setSize(innerWidth, innerHeight); if (composer) composer.setSize(innerWidth, innerHeight); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); });

// ------------------------------------------------------------------ loading
const manager = new THREE.LoadingManager();
let loadParts = { sky: 0, hospital: 0, avatar: 0 };
const setLoad = (k, v) => { loadParts[k] = v; const p = (loadParts.sky + loadParts.hospital + 0.2) / 2.2; $('loadBar').style.width = Math.round(p * 100) + '%'; };
function fail(msg) { const e = $('err'); e.style.display = 'block'; e.textContent = msg; console.error(msg); }
addEventListener('error', e => { if (e.message) fail('Error: ' + e.message); });

initMaterials(1);
const ctx = new Ctx(scene);
const ui = createUI({ progress, store, onTravel: (p) => travelTo(p), onClose: () => {} });

// sky + image-based light
new RGBELoader(manager).load('assets/medcity/sky_1k.hdr', tex => {
  tex.mapping = THREE.EquirectangularReflectionMapping;
  const pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromEquirectangular(tex).texture; pm.dispose();
  scene.background = tex; scene.backgroundIntensity = 1.0; scene.environmentIntensity = 0.75;
  setLoad('sky', 1); checkReady();
}, undefined, () => { setLoad('sky', 1); checkReady(); });

// ------------------------------------------------------------------ build the city (procedural, no download)
$('loadTxt').textContent = 'Building the city…';
buildStreets(ctx);
const plaza = buildPlaza(ctx);
buildMonorail(ctx);
buildSignals(ctx);
buildBackdrop(ctx);
buildDistricts(ctx);
const FEATURED = ctx.featured; // [{id,name,district,x0,x1,z0,z1,entrance,inside,face,...}]
const STATIONS = [], PROS = [];
for (const f of FEATURED) { const r = furnish(ctx, f); STATIONS.push(...r.stations); PROS.push(...r.npcs); }
ctx.batch.flush(scene); ctx.inst.flush(scene);

// spatial hash for colliders + floors
class Grid { constructor(c = 12) { this.c = c; this.m = new Map(); }
  key(i, k) { return i * 100003 + k; }
  add(o) { const c = this.c; for (let i = Math.floor(o.x0 / c); i <= Math.floor(o.x1 / c); i++) for (let k = Math.floor(o.z0 / c); k <= Math.floor(o.z1 / c); k++) { const kk = this.key(i, k); if (!this.m.has(kk)) this.m.set(kk, []); this.m.get(kk).push(o); } }
  near(x, z, r = 1) { const c = this.c, out = new Set(); for (let i = Math.floor((x - r) / c); i <= Math.floor((x + r) / c); i++) for (let k = Math.floor((z - r) / c); k <= Math.floor((z + r) / c); k++) { const a = this.m.get(this.key(i, k)); if (a) for (const o of a) out.add(o); } return out; } }
const colGrid = new Grid(10), floorGrid = new Grid(16);
const addCollider = b => colGrid.add(b), addFloor = f => floorGrid.add(f);
ctx.colliders.forEach(addCollider); ctx.floors.forEach(addFloor);

function groundAt(x, z, yRef = 0) {
  let best = 0;
  for (const f of floorGrid.near(x, z, 0)) {
    if (x < f.x0 || x > f.x1 || z < f.z0 || z > f.z1) continue;
    let h = f.h; if (f.slope) { const s = f.slope; const v = s.axis === 'x' ? x : z; const t = THREE.MathUtils.clamp((v - s.from) / (s.to - s.from), 0, 1); h = s.h0 + (s.h1 - s.h0) * t; }
    if (h <= yRef + 0.6 && h > best) best = h;
  }
  return best;
}
function collide(p, r, y) {
  for (let it = 0; it < 2; it++) for (const b of colGrid.near(p.x, p.z, r + 1)) {
    if (b.door && b.open) continue;
    if (y + 0.3 > b.y1 || y + 1.7 < b.y0) continue;
    const cx = THREE.MathUtils.clamp(p.x, b.x0, b.x1), cz = THREE.MathUtils.clamp(p.z, b.z0, b.z1);
    const dx = p.x - cx, dz = p.z - cz, d2 = dx * dx + dz * dz;
    if (d2 < r * r) {
      if (d2 > 1e-8) { const d = Math.sqrt(d2), k = (r - d) / d; p.x += dx * k; p.z += dz * k; }
      else { // inside the box: push out on the shortest axis
        const ox = Math.min(p.x - b.x0, b.x1 - p.x), oz = Math.min(p.z - b.z0, b.z1 - p.z);
        if (ox < oz) p.x = (p.x - b.x0 < b.x1 - p.x) ? b.x0 - r : b.x1 + r; else p.z = (p.z - b.z0 < b.z1 - p.z) ? b.z0 - r : b.z1 + r;
      }
    }
  }
}

// ------------------------------------------------------------------ MedCity General Hospital (Blender-built interior, placed into the city)
const HOSP = { ox: -140, oz: -56.1 };
const hospital = { ready: false, markers: {}, doors: [], interior: null };
const gltfLoader = new GLTFLoader(manager);
gltfLoader.load('assets/medcity/medcity.glb', g => {
  const root = g.scene; root.position.set(HOSP.ox, 0, HOSP.oz); scene.add(root); root.updateMatrixWorld(true);
  const keep = (o) => { const bb = new THREE.Box3().setFromObject(o); if (bb.isEmpty()) { const p = o.getWorldPosition(new THREE.Vector3()); return inZone(p.x, p.z, p.x, p.z); } return inZone(bb.min.x, bb.min.z, bb.max.x, bb.max.z); };
  const inZone = (x0, z0, x1, z1) => x0 >= HOSP.ox - 36 && x1 <= HOSP.ox + 42 && z0 >= HOSP.oz - 57 && z1 <= HOSP.oz - 14.5;
  const drop = [];
  root.traverse(o => {
    if (o === root) return;
    if (o.name.startsWith('MK_')) { hospital.markers[o.name.slice(3)] = o.getWorldPosition(new THREE.Vector3()); return; }
    if (!o.isMesh) return;
    if (!keep(o)) { drop.push(o); return; }
    if (o.name.startsWith('COL_')) { const b = new THREE.Box3().setFromObject(o); addCollider({ x0: b.min.x, x1: b.max.x, z0: b.min.z, z1: b.max.z, y0: b.min.y, y1: b.max.y }); o.visible = false; return; }
    const glass = o.material && o.material.transparent; o.castShadow = !glass; o.receiveShadow = true;
    if (/^(lobbyFloor|labFloor|hospForecourt)/.test(o.name)) { const b = new THREE.Box3().setFromObject(o); addFloor({ x0: b.min.x, x1: b.max.x, z0: b.min.z, z1: b.max.z, h: b.max.y }); }
    if (o.name === 'DOOR_L' || o.name === 'DOOR_R') hospital.doors.push({ mesh: o, base: o.position.clone(), sign: o.name === 'DOOR_L' ? -1 : 1 });
  });
  drop.forEach(o => o.parent && o.parent.remove(o));
  // a forecourt floor bridging to the sidewalk
  addFloor({ x0: HOSP.ox - 35, x1: HOSP.ox + 35, z0: HOSP.oz - 24.5, z1: HOSP.oz - 15, h: 0.15 });
  hospital.interior = { x0: HOSP.ox - 30, x1: HOSP.ox + 30, z0: HOSP.oz - 54, z1: HOSP.oz - 24, floorH: 0.15 };
  const ent = hospital.markers.hospitalEntrance || new THREE.Vector3(HOSP.ox, 0, HOSP.oz - 21.5);
  const hf = { id: 'hospital', name: 'MedCity General Hospital', district: 'med', face: 's', ...hospital.interior, entrance: { x: ent.x, z: ent.z + 1.5 }, inside: { x: HOSP.ox, z: HOSP.oz - 28 }, gfH: 5 };
  FEATURED.unshift(hf);
  const m = new THREE.Mesh(new THREE.BoxGeometry(60, 18, 31), new THREE.MeshBasicMaterial({ visible: false })); m.position.set(HOSP.ox, 9, HOSP.oz - 39);
  m.userData = { building: 'MedCity General Hospital', district: 'med', featured: 'hospital' }; scene.add(m); ctx.clickMeshes.push(m);
  ctx.labels.push({ name: 'MedCity General Hospital', district: 'med', x: HOSP.ox, z: HOSP.oz - 39, featured: 'hospital' });
  ctx.footprints.push({ x: HOSP.ox, z: HOSP.oz - 39, w: 60, d: 30, color: '#d9d2ee' });
  const mk = hospital.markers;
  STATIONS.push({ id: 'reception', building: 'hospital', x: mk.reception.x, z: mk.reception.z, label: 'Reception · Press E to talk to Maya', action: 'hosp:reception', radius: 2.6 });
  STATIONS.push({ id: 'heartlab', building: 'hospital', x: mk.labStation.x, z: mk.labStation.z, label: 'Heart Lab display · Press E to explore the heart', action: 'hosp:lab', radius: 2.6 });
  PROS.push({ model: 'receptionist', x: mk.receptionist.x, z: mk.receptionist.z, y: 0.15, ry: 0, role: 'Receptionist · Maya', talk: null, building: 'hospital', station: 'reception' });
  PROS.push({ model: 'doctor', x: mk.doctor.x, z: mk.doctor.z, y: 0.15, ry: -Math.PI / 2, role: 'Cardiologist · Dr. Haddad', talk: 'Every medical student learns the heart’s structure first. Step onto the glowing ring at the display to open the Heart Lab.', building: 'hospital' });
  // hospital workstations (triage kiosk, dosage bench, careers board) added into the shared world
  const nCol = ctx.colliders.length; const hx = furnishHospital(ctx, HOSP.ox, HOSP.oz); STATIONS.push(...hx.stations); PROS.push(...hx.npcs);
  ctx.batch.flush(scene); for (let i = nCol; i < ctx.colliders.length; i++) addCollider(ctx.colliders[i]);
  hospital.ready = true; setLoad('hospital', 1); checkReady();
}, undefined, () => { fail('Could not load the hospital model.'); });
let heart = null, heartParts = [];
gltfLoader.load('assets/medcity/heart.glb', h => { heart = h; if (hospital.ready) setupHeart(); });

// ------------------------------------------------------------------ doors (city + hospital)
function updateDoors(dt) {
  for (const d of ctx.doors) {
    let near = false; for (const c of movers()) if (Math.hypot(c.x - d.cx, c.z - d.cz) < 3.6) { near = true; break; }
    d.open += ((near ? 1 : 0) - d.open) * Math.min(1, dt * 5); d.collider.open = d.open > 0.7;
    const o = d.open * d.half * 0.95;
    d.panels.forEach((p, i) => { const s = i ? 1 : -1; const off = s * (d.half / 2 + o);
      if (d.axis === 'x') p.position.set(d.cx + off, d.y, d.cz); else p.position.set(d.cx, d.y, d.cz + off); });
  }
  if (hospital.ready) { const mk = hospital.markers.doorCenter || new THREE.Vector3(HOSP.ox, 0, HOSP.oz - 24);
    let near = false; for (const c of movers()) if (Math.hypot(c.x - mk.x, c.z - mk.z) < 6) { near = true; break; }
    for (const d of hospital.doors) { d.k = (d.k || 0) + ((near ? 1 : 0) - (d.k || 0)) * Math.min(1, dt * 4); d.mesh.position.x = d.base.x + d.sign * d.k * 2.9; } }
}
function* movers() { if (player) yield player.root.position; for (const n of peds) if (n.root.visible) yield n.root.position; }

// ------------------------------------------------------------------ characters
let player = null, chosen = progress.avatar3d || 'avatar_f1';
const HEIGHTS = { avatar_f1: 0.88, avatar_m1: 0.95, avatar_f2: 0.86, avatar_m2: 0.96, receptionist: 0.87, doctor: 0.95, visitor_m: 0.93, visitor_f: 0.88 }; // target hip heights (m)
async function spawnChar(model) {
  const g = await loadModel(model); const c = new Character(g);
  // normalise to a realistic adult height
  let hip = 1; c.model.traverse(o => { if (o.isBone && o.name === 'pelvis') { const v = new THREE.Vector3(); o.getWorldPosition(v); hip = v.y; } });
  const s = HEIGHTS[model] / Math.max(0.3, hip); c.leanG.scale.setScalar(s); c.leg *= s; for (const k in c.speeds) c.speeds[k] *= s;
  scene.add(c.root); return c;
}
ui.renderAvatars(chosen, id => { chosen = id; });

// ------------------------------------------------------------------ player controller
const P = { pos: new THREE.Vector3(), yaw: 0, speed: 0, vel: new THREE.Vector2(), route: [], routeCb: null, inside: null, lastSave: 0, yv: 0 };
const keys = new Set(); const joy = { x: 0, y: 0, on: false }; let runToggle = false;
let camYaw = Math.PI, camPitch = 0.32, camDist = 6.2, camTarget = new THREE.Vector3(), lastLook = -10, mode = 'loading';
function WALK() { return player ? player.speeds.Walk * 1.42 : 1.4; }
const RUN = 4.5;
addEventListener('keydown', e => {
  const k = e.key.toLowerCase(); if (mode === 'loading') return;
  if (['input', 'textarea'].includes(document.activeElement.tagName.toLowerCase())) return;
  keys.add(k); if (k.startsWith('arrow') || k === ' ') e.preventDefault();
  if (k === 'e' && mode === 'walk') { e.preventDefault(); interact(); }
  if (k === 'm' && mode === 'walk') ui.openMap(mapData());
  else if (k === 'm' && mode === 'map') ui.closeMap();
  if (k === 'escape') { if (mode === 'lab') closeLab(); else ui.closeAll(); }
  if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) { P.route = []; P.routeCb = null; }
});
addEventListener('keyup', e => keys.delete(e.key.toLowerCase()));
addEventListener('blur', () => keys.clear());
ui.onMode = m => { mode = m; if (m === 'walk' && P.seated && player) player.sitDown(false); };

function inputVector() {
  let x = 0, z = 0;
  if (keys.has('w') || keys.has('arrowup')) z += 1; if (keys.has('s') || keys.has('arrowdown')) z -= 1;
  if (keys.has('d') || keys.has('arrowright')) x += 1; if (keys.has('a') || keys.has('arrowleft')) x -= 1;
  if (joy.on) { x += joy.x; z += -joy.y; }
  const l = Math.hypot(x, z); if (l > 1) { x /= l; z /= l; }
  return [x, z, Math.min(1, l)];
}
const angDiff = (a, b) => { let d = (b - a) % (Math.PI * 2); if (d > Math.PI) d -= Math.PI * 2; if (d < -Math.PI) d += Math.PI * 2; return d; };

function updatePlayer(dt) {
  if (!player) return;
  const [ix, iz, mag] = mode === 'walk' ? inputVector() : [0, 0, 0];
  const running = keys.has('shift') || runToggle;
  let desX = 0, desZ = 0, desSpeed = 0;
  if (mag > 0.05) {
    const fx = -Math.sin(camYaw), fz = -Math.cos(camYaw), rx = Math.cos(camYaw), rz = -Math.sin(camYaw);
    desX = rx * ix + fx * iz; desZ = rz * ix + fz * iz; const l = Math.hypot(desX, desZ) || 1; desX /= l; desZ /= l;
    desSpeed = (running ? RUN : WALK()) * Math.max(mag, joy.on ? 0.35 : 1);
  } else if (P.route.length && mode === 'walk') {
    // stuck detection: if we barely moved for a while, sidestep around the obstacle
    P.stuckT = (P.stuckT || 0) + dt; if (P.stuckT > 0.8) { const moved = P.stuckFrom ? Math.hypot(P.pos.x - P.stuckFrom.x, P.pos.z - P.stuckFrom.z) : 9; P.stuckFrom = P.pos.clone(); P.stuckT = 0;
      if (moved < 0.35 && !P.route[0].detour) { const t = P.route[0]; const dx = t.x - P.pos.x, dz = t.z - P.pos.z, d = Math.hypot(dx, dz) || 1; const side = (P.sideSign = -(P.sideSign || 1));
        P.route.unshift({ x: P.pos.x + (-dz / d) * 1.4 * side + dx / d * 0.8, z: P.pos.z + (dx / d) * 1.4 * side + dz / d * 0.8, detour: true }); } }
    const t = P.route[0]; const dx = t.x - P.pos.x, dz = t.z - P.pos.z, d = Math.hypot(dx, dz);
    if (d < (P.route.length > 1 ? 1.2 : 0.45)) { P.route.shift(); if (!P.route.length && P.routeCb) { const cb = P.routeCb; P.routeCb = null; cb(); } }
    else { desX = dx / d; desZ = dz / d; desSpeed = Math.min(running ? RUN : WALK(), P.route.length === 1 ? Math.max(0.6, d * 1.2) : 99); }
  }
  // heading: turn toward the desired direction at a human turn rate
  let turn = 0;
  if (desSpeed > 0) {
    const target = Math.atan2(desX, desZ); const diff = angDiff(P.yaw, target);
    const maxRate = (P.speed > 2.5 ? 5 : 7.5);
    turn = THREE.MathUtils.clamp(diff * 8, -maxRate, maxRate); P.yaw += turn * dt;
    // slow down while turning sharply (no moonwalking / sideways sliding)
    const align = Math.max(0, Math.cos(diff)); desSpeed *= 0.25 + 0.75 * align * align;
  }
  // accelerate / decelerate smoothly (frame-rate independent)
  const accel = desSpeed > P.speed ? (P.speed < 1.5 ? 3.2 : 4.5) : 6.5;
  P.speed += (desSpeed - P.speed) * (1 - Math.exp(-accel * dt));
  if (P.speed < 0.02 && desSpeed === 0) P.speed = 0;
  // move along the facing direction (feet always travel the way the body points)
  const prev = P.pos.clone();
  P.pos.x += Math.sin(P.yaw) * P.speed * dt; P.pos.z += Math.cos(P.yaw) * P.speed * dt;
  if (!isFinite(P.pos.x + P.pos.z)) P.pos.copy(prev);
  collide(P.pos, 0.33, P.pos.y);
  const g = groundAt(P.pos.x, P.pos.z, P.pos.y);
  if (g - P.pos.y > 0.55) { P.pos.x = prev.x; P.pos.z = prev.z; } // too high to step onto
  else { const gy = groundAt(P.pos.x, P.pos.z, P.pos.y); P.pos.y += (gy - P.pos.y) * Math.min(1, dt * (gy > P.pos.y ? 14 : 10)); }
  // real ground speed after collisions (keeps the animation honest when pushing against a wall)
  const moved = Math.hypot(P.pos.x - prev.x, P.pos.z - prev.z) / Math.max(dt, 1e-4);
  const animSpeed = Math.min(P.speed, moved * 1.05 + 0.05);
  player.root.position.copy(P.pos); player.root.rotation.y = P.yaw;
  if (!player.locked) player.update(dt, animSpeed, turn); else player.update(dt, 0, 0);
  footsteps(animSpeed);
  // camera follows behind when walking and the mouse is idle
  if (P.speed > 0.6 && performance.now() / 1000 - lastLook > 1.6 && mode === 'walk') camYaw += angDiff(camYaw, P.yaw + Math.PI) * Math.min(1, dt * 1.2);
  // interior / district tracking
  const inside = FEATURED.find(f => P.pos.x > f.x0 && P.pos.x < f.x1 && P.pos.z > f.z0 && P.pos.z < f.z1) || null;
  if (inside !== P.inside) { P.inside = inside; onEnterBuilding(inside); }
  if (performance.now() - P.lastSave > 2000) { P.lastSave = performance.now(); progress.world = { x: +P.pos.x.toFixed(2), z: +P.pos.z.toFixed(2), y: +P.pos.y.toFixed(2), yaw: +P.yaw.toFixed(2) }; store(); }
}

// ------------------------------------------------------------------ camera
const camRay = new THREE.Ray(), hitV = new THREE.Vector3(), tmp = new THREE.Vector3(), box = new THREE.Box3();
let photoCam = null;
function updateCamera(dt) {
  if (photoCam) { camera.position.set(photoCam[0], photoCam[1], photoCam[2]); camera.lookAt(photoCam[3], photoCam[4], photoCam[5]); return; }
  if (mode === 'lab' && heartPivot) { labCamera(dt); return; }
  if (!player) { const t = performance.now() / 1000; camera.position.set(Math.sin(t * 0.05) * 260, 120, Math.cos(t * 0.05) * 260); camera.lookAt(0, 20, 0); return; }
  const inside = !!P.inside;
  const dist = inside ? Math.min(camDist, 4.2) : camDist, pitch = inside ? Math.max(camPitch, 0.2) : camPitch;
  const want = tmp.set(P.pos.x, P.pos.y + 1.55, P.pos.z);
  camTarget.lerp(want, 1 - Math.exp(-dt * 12));
  const cp = new THREE.Vector3(camTarget.x + Math.sin(camYaw) * Math.cos(pitch) * dist, camTarget.y + Math.sin(pitch) * dist, camTarget.z + Math.cos(camYaw) * Math.cos(pitch) * dist);
  if (inside) cp.y = Math.min(cp.y, (P.inside.floorH || 0.15) + (P.inside.gfH || 5) - 0.6);
  // keep the camera in front of walls between it and the avatar
  const dir = cp.clone().sub(camTarget); const len = dir.length(); dir.normalize(); camRay.set(camTarget, dir); let best = len;
  for (const b of colGrid.near((cp.x + camTarget.x) / 2, (cp.z + camTarget.z) / 2, len / 2 + 2)) {
    if (b.y1 < 2.2 || (b.door && b.open) || (b.x1 - b.x0 < 1.3 && b.z1 - b.z0 < 1.3)) continue; box.min.set(b.x0, b.y0, b.z0); box.max.set(b.x1, b.y1, b.z1);
    if (camRay.intersectBox(box, hitV)) { const d = hitV.distanceTo(camTarget); if (d < best) best = Math.max(0.6, d - 0.25); }
  }
  camera.position.copy(camTarget).addScaledVector(dir, best);
  camera.lookAt(camTarget);
}
// mouse / touch look
let drag = null;
// two-finger pinch zooms the camera (phones)
const touches = new Map(); let pinch0 = 0, dist0 = 0;
canvas.addEventListener('pointerdown', e => { if (e.pointerType === 'touch') { touches.set(e.pointerId, [e.clientX, e.clientY]); if (touches.size === 2) { const [a, b] = [...touches.values()]; pinch0 = Math.hypot(a[0] - b[0], a[1] - b[1]); dist0 = mode === 'lab' ? labOrbit.dist : camDist; drag = null; } } }, true);
canvas.addEventListener('pointermove', e => { if (!touches.has(e.pointerId)) return; touches.set(e.pointerId, [e.clientX, e.clientY]); if (touches.size === 2 && pinch0) { const [a, b] = [...touches.values()]; const k = pinch0 / Math.max(20, Math.hypot(a[0] - b[0], a[1] - b[1]));
  if (mode === 'lab') labOrbit.dist = THREE.MathUtils.clamp(dist0 * k, 0.6, 4); else camDist = THREE.MathUtils.clamp(dist0 * k, 2.2, 16); drag = null; } }, true);
const endTouch = e => { touches.delete(e.pointerId); if (touches.size < 2) pinch0 = 0; }; canvas.addEventListener('pointerup', endTouch, true); canvas.addEventListener('pointercancel', endTouch, true);
canvas.addEventListener('pointerdown', e => { if (mode === 'loading' || touches.size > 1) return; canvas.focus(); drag = { x: e.clientX, y: e.clientY, id: e.pointerId, moved: 0 }; try { canvas.setPointerCapture(e.pointerId); } catch (err) {} audioStart(); });
canvas.addEventListener('pointermove', e => {
  if (drag && drag.id === e.pointerId) {
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag.moved += Math.abs(dx) + Math.abs(dy); drag.x = e.clientX; drag.y = e.clientY;
    if (mode === 'lab') { labOrbit.yaw -= dx * 0.008; labOrbit.pitch = THREE.MathUtils.clamp(labOrbit.pitch + dy * 0.006, -1.2, 1.2); }
    else { camYaw -= dx * 0.0055; camPitch = THREE.MathUtils.clamp(camPitch + dy * 0.004, -0.15, 1.25); lastLook = performance.now() / 1000; }
  } else hover(e);
});
canvas.addEventListener('pointerup', e => { if (drag && drag.moved < 6) click(e); drag = null; });
canvas.addEventListener('wheel', e => { if (mode === 'lab') labOrbit.dist = THREE.MathUtils.clamp(labOrbit.dist * (1 + e.deltaY * 0.001), 0.6, 4); else camDist = THREE.MathUtils.clamp(camDist * (1 + e.deltaY * 0.001), 2.2, 16); e.preventDefault(); }, { passive: false });
// touch joystick
if (isTouch) {
  $('joy').style.display = 'block'; $('eBtn').style.display = 'block'; $('runBtn').style.display = 'block';
  const J = $('joy'), K = J.querySelector('i'); let jid = null;
  const setJ = e => { const r = J.getBoundingClientRect(); let x = (e.clientX - r.left - 60) / 50, y = (e.clientY - r.top - 60) / 50; const l = Math.hypot(x, y); if (l > 1) { x /= l; y /= l; } joy.x = x; joy.y = y; K.style.transform = `translate(${x * 35}px,${y * 35}px)`; };
  J.addEventListener('pointerdown', e => { jid = e.pointerId; try { J.setPointerCapture(jid); } catch (err) {} joy.on = true; P.route = []; setJ(e); audioStart(); });
  J.addEventListener('pointermove', e => { if (e.pointerId === jid) setJ(e); });
  const end = () => { jid = null; joy.on = false; joy.x = joy.y = 0; K.style.transform = ''; }; J.addEventListener('pointerup', end); J.addEventListener('pointercancel', end);
  $('eBtn').onclick = () => interact(); $('runBtn').onclick = () => { runToggle = !runToggle; $('runBtn').classList.toggle('on', runToggle); };
}

// ------------------------------------------------------------------ picking: buildings, people, heart
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
function setRay(e) { ndc.set(e.clientX / innerWidth * 2 - 1, -e.clientY / innerHeight * 2 + 1); ray.setFromCamera(ndc, camera); }
function pickBuilding() { const h = ray.intersectObjects(ctx.clickMeshes, false)[0]; return h ? h.object.userData : null; }
function hover(e) {
  if (mode === 'lab') { setRay(e); const m = pickHeart(); setHoverPart(m); canvas.style.cursor = m ? 'pointer' : 'grab'; return; }
  if (mode !== 'walk' || isTouch) return; setRay(e);
  const b = pickBuilding(); const tip = $('tip');
  if (b) { tip.style.display = 'block'; tip.style.left = (e.clientX + 14) + 'px'; tip.style.top = (e.clientY + 12) + 'px';
    tip.innerHTML = `${b.building}<br><span style="font-weight:500;color:#5d6580">${b.featured ? 'Click to walk there and go inside' : 'Not open to visitors yet'}</span>`; canvas.style.cursor = 'pointer'; }
  else { tip.style.display = 'none'; canvas.style.cursor = 'grab'; }
}
function click(e) {
  setRay(e);
  if (mode === 'lab') { const m = pickHeart(); if (m) selectPart(m); return; }
  if (mode !== 'walk' || !player) return;
  // people first
  for (const n of PRO_CHARS) { if (n.c && ray.intersectObject(n.c.root, true)[0]) { const st = n.station ? STATIONS.find(s => s.id === n.station) : null; walkTo(st ? st : { x: n.x + Math.sin(n.ry) * 1.6, z: n.z + Math.cos(n.ry) * 1.6 }, () => st ? runAction(st) : talk(n)); return; } }
  const b = pickBuilding();
  if (b) { if (b.featured) { const f = FEATURED.find(x => x.id === b.featured); if (f) goToBuilding(f); } else ui.toast(`${b.building} · not open to visitors yet. Featured buildings with real interiors are marked on the map.`); return; }
  // click on the ground: walk there
  const g = ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), -P.pos.y), new THREE.Vector3());
  if (g && g.distanceTo(P.pos) < 60) walkTo({ x: g.x, z: g.z });
}

// ------------------------------------------------------------------ navigation / building entry
const nav = buildNav();
function walkTo(t, cb) {
  const sameBuilding = P.inside && P.inside.x0 <= t.x && t.x <= P.inside.x1 && P.inside.z0 <= t.z && t.z <= P.inside.z1;
  const direct = sameBuilding || Math.hypot(t.x - P.pos.x, t.z - P.pos.z) < 18;
  let pts = [];
  if (!direct) {
    if (P.inside) { if (P.inside.id === 'hospital' && P.pos.z < HOSP.oz - 40) pts.push({ x: HOSP.ox + 7.5, z: HOSP.oz - 42.4 }, { x: HOSP.ox + 7.5, z: HOSP.oz - 37.6 });
      pts.push({ x: P.inside.inside ? P.inside.inside.x : P.pos.x, z: P.inside.inside ? P.inside.inside.z : P.pos.z }, { x: P.inside.entrance.x, z: P.inside.entrance.z }); }
    const from = pts.length ? pts[pts.length - 1] : P.pos;
    pts.push(...findPath(nav, from.x, from.z, t.x, t.z));
  } else {
    // hospital: lobby and Anatomy Lab are separated by a partition with a doorway (local x 7.5, z -40)
    const hz = HOSP.oz - 40, inH = (q) => q.x > HOSP.ox - 30 && q.x < HOSP.ox + 30 && q.z > HOSP.oz - 54 && q.z < HOSP.oz - 24;
    if (inH(P.pos) && inH(t) && (P.pos.z - hz) * (t.z - hz) < 0) { const a = { x: HOSP.ox + 7.5, z: HOSP.oz - 37.6 }, b = { x: HOSP.ox + 7.5, z: HOSP.oz - 42.4 }; if (P.pos.z > hz) pts.push(a, b); else pts.push(b, a); }
    pts.push({ x: t.x, z: t.z });
  }
  P.route = pts; P.routeCb = cb || null;
}
function goToBuilding(f) {
  ui.toast(`Walking to ${f.name}…`);
  walkTo(f.entrance, () => enterBuilding(f));
}
function enterBuilding(f) { // walk through the door to the inside point
  const e = f.entrance, i = f.inside || { x: (f.x0 + f.x1) / 2, z: (f.z0 + f.z1) / 2 };
  P.route = [{ x: e.x + (i.x - e.x) * 0.35, z: e.z + (i.z - e.z) * 0.35 }, { x: i.x, z: i.z }]; P.routeCb = null;
}
function onEnterBuilding(f) {
  if (f) { ui.setWhere(f.name, DISTRICTS.find(d => d.id === f.district)?.color || '#8056F6'); event('enter:' + f.id); ui.toast(`Inside ${f.name}`); }
}
function travelTo(f) { // map fast travel: same avatar, same progress, arrive at the entrance outside
  ui.closeMap(); const fade = $('fade'); fade.style.opacity = 1;
  setTimeout(() => {
    const e = f.entrance || { x: f.x, z: f.z }; const c = f.inside || { x: f.x, z: f.z };
    const away = Math.atan2(e.x - c.x, e.z - c.z); // direction from the building toward the street
    P.pos.set(e.x + Math.sin(away) * 3, 0, e.z + Math.cos(away) * 3); P.pos.y = groundAt(P.pos.x, P.pos.z, 2);
    P.yaw = away + Math.PI; camYaw = away; P.speed = 0; P.route = []; camTarget.set(P.pos.x, P.pos.y + 1.55, P.pos.z);
    if (player) player.root.position.copy(P.pos);
    setTimeout(() => { fade.style.opacity = 0; }, 150);
  }, 380);
}

// ------------------------------------------------------------------ interaction system (prompts + E + click)
let current = null;
function interactables() {
  const out = [];
  for (const f of FEATURED) if (!P.inside || P.inside.id !== f.id) out.push({ kind: 'enter', x: f.entrance.x, z: f.entrance.z, r: 4.5, label: `${f.name} · Press E to enter`, f });
  if (P.inside) out.push({ kind: 'exit', x: P.inside.entrance.x, z: P.inside.entrance.z, r: 0, label: '', f: P.inside });
  for (const s of STATIONS) out.push({ kind: 'station', x: s.x, z: s.z, r: s.radius || 2.2, label: s.label, s });
  for (const n of PRO_CHARS) if (n.talk && n.c) out.push({ kind: 'talk', x: n.x, z: n.z, r: 2.6, label: `${n.role} · Press E to talk`, n });
  return out;
}
function updatePrompt() {
  if (!player || mode !== 'walk') { $('prompt').style.display = 'none'; current = null; return; }
  let best = null, bd = 1e9;
  for (const it of interactables()) { if (!it.r) continue; const d = Math.hypot(it.x - P.pos.x, it.z - P.pos.z); if (d < it.r && d < bd) { bd = d; best = it; } }
  current = best; const pr = $('prompt');
  if (best) { pr.style.display = 'flex'; pr.innerHTML = `<kbd>${isTouch ? 'E' : 'E'}</kbd><span>${best.label}</span>`; pr.onclick = () => interact(); } else pr.style.display = 'none';
}
function interact() {
  if (!current || mode !== 'walk') return; const it = current;
  if (it.kind === 'enter') { player.play('Interact', { lock: false }); enterBuilding(it.f); }
  else if (it.kind === 'station') runAction(it.s);
  else if (it.kind === 'talk') talk(it.n);
}
function faceTowards(x, z) { P.yaw = Math.atan2(x - P.pos.x, z - P.pos.z); }
function talk(n) {
  faceTowards(n.x, n.z); if (n.c) n.c.play('Talk', { lock: false });
  ui.dialog(n.role, n.talk || 'Hello!', [{ label: 'Thanks!', fn: () => ui.closeDialog() }]);
}
function runAction(s) {
  faceTowards(s.x, s.z);
  const pro = PRO_CHARS.find(n => n.building === s.building && Math.hypot(n.x - s.x, n.z - s.z) < 5);
  if (pro && pro.c) pro.c.play(pro.c.acts.Nod ? 'Nod' : 'Talk', { lock: false });
  if (s.action === 'hosp:reception') return reception();
  if (s.action === 'hosp:lab') { player.play('Interact', { lock: true, then: () => openLab() }); return; }
  if (s.action.startsWith('mission:')) { const id = s.action.slice(8); player.play('Interact', { lock: true }); ui.mission(id, (res) => { if (res && res.done) event('mission:' + id); }); }
  if (s.action.startsWith('career:')) { ui.careers(s.action.slice(7)); }
  if (s.action.startsWith('act:')) {
    const id = s.action.slice(4);
    const stand = () => { if (P.seated) { P.seated = false; player.sitDown(false); P.pos.set(s.x, P.pos.y, s.z); } };
    if (s.seat) { P.seated = true; P.pos.set(s.seat.x, s.seat.y, s.seat.z); P.yaw = s.seat.ry; P.speed = 0; player.sitDown(true); }
    else player.play('Interact', { lock: false });
    ui.activity(id, (res) => { stand(); if (res && res.done) event('act:' + id); }, ctx.hooks);
  }
}
function reception() {
  event('talk:reception');
  ui.dialog('Maya · Reception', 'Welcome to <b>MedCity General Hospital</b>! What would you like to do today?', [
    { label: '🩺 Explore Medicine: show me the Anatomy Lab', fn: () => { ui.dialog('Maya · Reception', 'Our Anatomy Lab has a real 3D heart built from scientific scan data. Go through the <b>Anatomy Lab</b> door on the right and step onto the glowing ring.', [{ label: 'Walk me there →', fn: () => { ui.closeDialog(); const st = STATIONS.find(s => s.id === 'heartlab'); walkTo(st, () => runAction(st)); } }]); } },
    { label: '🏥 What do people do in a hospital?', fn: () => ui.dialog('Maya · Reception', 'Doctors diagnose and treat, nurses care for patients around the clock, radiographers take scans, pharmacists check medicines and lab scientists analyse samples. MedCity also has a <b>pharmacy</b>, a <b>dental clinic</b>, a <b>medical school</b> and a <b>research lab</b> along this block.', [{ label: 'Got it', fn: () => ui.closeDialog() }]) },
    { label: 'Not now', fn: () => ui.closeDialog() }]);
}

// ------------------------------------------------------------------ guided route (objectives) + events
const OBJ = [
  { t: 'Walk to MedCity General Hospital', ev: 'enter:hospital', target: () => FEATURED.find(f => f.id === 'hospital')?.entrance },
  { t: 'Check in with Maya at reception', ev: 'talk:reception', target: () => STATIONS.find(s => s.id === 'reception') },
  { t: 'Explore the Heart Lab', ev: 'lab:open', target: () => STATIONS.find(s => s.id === 'heartlab') },
  { t: 'Complete the heart challenge', ev: 'mission:med_heart', target: () => STATIONS.find(s => s.id === 'heartlab') },
  { t: 'Walk along Talent Avenue to Capital Bay', ev: 'district:capital', target: () => ({ x: -22, z: -80 }) },
  { t: 'Enter Talentopia Central Bank', ev: 'enter:bank', target: () => FEATURED.find(f => f.id === 'bank')?.entrance },
  { t: 'Do a loan assessment with Lina', ev: 'mission:bank', target: () => STATIONS.find(s => s.id === 'bank_loan') },
  { t: 'Explore another district (M for the map)', ev: 'never', target: () => null }];
let objIdx = progress.flags.objIdx || 0;
function event(ev) {
  if (objIdx < OBJ.length && OBJ[objIdx].ev === ev) { objIdx++; progress.flags.objIdx = objIdx; store(); ui.renderObjectives(OBJ, objIdx); if (objIdx < OBJ.length) ui.toast('✓ Next: ' + OBJ[objIdx].t); }
}
const beacon = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 40, 16, 1, true), new THREE.MeshBasicMaterial({ color: 0x51c9e8, transparent: true, opacity: 0.25, depthWrite: false, side: THREE.DoubleSide }));
scene.add(beacon);
function updateBeacon(t) { const o = OBJ[objIdx]; const p = o && o.target && o.target(); beacon.visible = !!p && mode !== 'lab'; if (p) { beacon.position.set(p.x, 20, p.z); beacon.material.opacity = 0.18 + 0.1 * Math.sin(t * 3); } }

// ------------------------------------------------------------------ professional NPCs + pedestrians
const PRO_CHARS = []; const peds = [];
async function spawnPeople() {
  for (const p of PROS) { const n = { ...p }; PRO_CHARS.push(n);
    spawnChar(p.model).then(c => { n.c = c; c.root.position.set(p.x, p.y ?? 0.15, p.z); c.root.rotation.y = p.ry; n.baseRy = p.ry;
      c.idleClip = p.idle || ['Idle', 'FoldArms', 'Idle'][PRO_CHARS.indexOf(n) % 3]; if (!c.acts[c.idleClip]) c.idleClip = 'Idle';
      if (p.sit) { c.sitDown(true); c.sit = 1; c.sitClip = Math.random() < 0.5 ? 'SitTalk' : 'SitIdle'; } }).catch(() => {}); }
  // pedestrians on sidewalk loops around busy blocks
  const loops = [[0, 0, 2], [-130, -130, 2], [0, -130, 2], [130, -130, 1], [-130, 0, 1], [130, 0, 1], [0, 130, 1], [-130, 130, 1], [130, 130, 1]];
  const models = ['visitor_m', 'visitor_f', 'avatar_m1', 'avatar_f2', 'doctor', 'avatar_m2', 'receptionist', 'avatar_f1'].filter(m => m !== chosen);
  let k = 0;
  for (const [cx, cz, n] of loops) {
    const pts = roundLoop(blockLoop(cx, cz), 2.5); const pl = polyline(pts);
    for (let i = 0; i < n; i++) {
      const ped = { pl, s: (i / n) * pl.L + Math.random() * 20, dir: (k % 2 ? 1 : -1), pause: 0, nextPause: 30 + Math.random() * 60, speed: 0, yaw: 0, root: { position: new THREE.Vector3(1e5, 0, 1e5), visible: false } };
      const model = models[k++ % models.length]; peds.push(ped);
      spawnChar(model).then(c => { ped.c = c; ped.root = c.root; ped.cruise = c.speeds.Walk * (1.05 + Math.random() * 0.3); }).catch(() => {});
    }
  }
}
function roundLoop(pts, r) { // round the corners of a rectangle loop
  const out = []; const n = pts.length;
  for (let i = 0; i < n; i++) { const p = pts[i], a = pts[(i - 1 + n) % n], b = pts[(i + 1) % n];
    const da = Math.hypot(a[0] - p[0], a[1] - p[1]), db = Math.hypot(b[0] - p[0], b[1] - p[1]);
    const pa = [p[0] + (a[0] - p[0]) / da * r, p[1] + (a[1] - p[1]) / da * r], pb = [p[0] + (b[0] - p[0]) / db * r, p[1] + (b[1] - p[1]) / db * r];
    for (let k = 0; k <= 4; k++) { const t = k / 4; const u = 1 - t; out.push([u * u * pa[0] + 2 * u * t * p[0] + t * t * pb[0], u * u * pa[1] + 2 * u * t * p[1] + t * t * pb[1]]); } }
  return out;
}
function updatePeople(dt) {
  const pp = player ? player.root.position : null;
  for (const n of PRO_CHARS) { if (!n.c) continue; const near = pp && !n.sit && Math.hypot(pp.x - n.x, pp.z - n.z) < 6;
    const vis = !pp || Math.hypot(pp.x - n.x, pp.z - n.z) < (Q.phone ? 45 : 90); n.c.root.visible = vis; if (!vis) continue;
    const want = near ? Math.atan2(pp.x - n.x, pp.z - n.z) : n.baseRy; const d = angDiff(n.c.root.rotation.y, want);
    const tr = THREE.MathUtils.clamp(d * 4, -2.5, 2.5); n.c.root.rotation.y += tr * dt; n.c.update(dt, 0, Math.abs(d) > 0.3 ? tr : 0); }
  for (const p of peds) {
    if (!p.c) continue;
    const [x, z] = p.pl.at(p.s); const vis = !pp || Math.hypot(pp.x - x, pp.z - z) < (Q.phone ? 60 : 110); p.c.root.visible = vis;
    // pauses (check phone / look around), and give way to the player or another pedestrian ahead
    let want = p.cruise;
    if (p.pause > 0) { p.pause -= dt; want = 0; if (p.pause <= 0) { p.c.idleClip = 'Idle'; p.nextPause = 40 + Math.random() * 80; } }
    else if ((p.nextPause -= p.speed * dt) <= 0) { p.pause = 2.5 + Math.random() * 3.5; p.c.idleClip = Math.random() < 0.5 ? 'Phone' : 'Idle'; if (!p.c.acts[p.c.idleClip]) p.c.idleClip = 'Idle'; }
    const ahead = p.pl.at(p.s + p.dir * 1.6);
    if (pp && Math.hypot(pp.x - ahead[0], pp.z - ahead[1]) < 1.3) want = 0;
    for (const q of peds) if (q !== p && q.pl === p.pl && q.c) { const d = ((q.s - p.s) * p.dir % p.pl.L + p.pl.L) % p.pl.L; if (d > 0 && d < 2.2) want = Math.min(want, q.speed * 0.8); }
    p.speed += (want - p.speed) * (1 - Math.exp(-dt * (want > p.speed ? 2.5 : 4)));
    p.s += p.dir * p.speed * dt;
    const [nx, nz, h] = p.pl.at(p.s); const heading = p.dir > 0 ? h : h + Math.PI;
    const d = angDiff(p.yaw, heading); const tr = THREE.MathUtils.clamp(d * 5, -4, 4); p.yaw += tr * dt;
    if (!vis) continue;
    p.c.root.position.set(nx, groundAt(nx, nz, 0.5), nz); p.c.root.rotation.y = p.yaw; p.c.update(dt, p.speed, tr);
  }
}

// ------------------------------------------------------------------ traffic
const cars = [];
function spawnTraffic() {
  const colors = [0xf5f7fb, 0x1d2433, 0x8a919c, 0x2f4f7f, 0x8b1e2d, 0xc9ccd1, 0x3a5a40, 0x101a32];
  ROUTES.forEach((r, ri) => {
    const pl = polyline(roundLoop(r, 5)); const n = Math.max(3, Math.round(pl.L / 120));
    for (let i = 0; i < n; i++) { const kind = (i + ri) % 5 === 0 ? 'van' : (i + ri) % 3 === 0 ? 'suv' : 'sedan';
      const car = makeCar(colors[(i * 3 + ri) % colors.length], kind); scene.add(car); cars.push({ car, pl, s: (i / n) * pl.L, v: 8, cruise: 8 + Math.random() * 3, L: car.userData.L }); }
  });
}
function updateTraffic(dt) {
  const pp = player ? player.root.position : null;
  for (const c of cars) {
    const [x, z, h] = c.pl.at(c.s); const fx = Math.sin(h), fz = Math.cos(h);
    let want = c.cruise;
    // corners: slow down
    const [, , h2] = c.pl.at(c.s + 10); if (Math.abs(angDiff(h, h2)) > 0.3) want = Math.min(want, 4.5);
    // brake for cars and people ahead
    const check = (px, pz, gap) => { const dx = px - x, dz = pz - z; const along = dx * fx + dz * fz, side = Math.abs(dx * fz - dz * fx); if (along > 0 && along < gap && side < 2.2) want = Math.min(want, Math.max(0, (along - c.L * 0.6 - 2.5) * 0.9)); };
    // traffic signals: stop at the line on amber/red
    { const ew = Math.abs(fx) > 0.7, sgn = ew ? Math.sign(fx) : Math.sign(fz), pos = ew ? x : z, lines = ew ? XS : ZS; let best = null;
      for (const L of lines) { const stop = L - sgn * (HALF + 1.2); const dist = (stop - pos) * sgn; if (dist > -0.5 && dist < 40 && (best === null || dist < best)) best = dist; }
      const st = SIGNAL.state(ew ? 'ew' : 'ns', elapsed); if (best !== null && st !== 'g' && !(st === 'a' && best < 6)) want = Math.min(want, Math.max(0, best - 0.5) * 0.7); }
    for (const o of cars) if (o !== c) { const [ox, oz] = o.pl.at(o.s); check(ox, oz, 14); }
    if (pp) check(pp.x, pp.z, 12);
    for (const p of peds) if (p.c && p.c.root.visible) check(p.c.root.position.x, p.c.root.position.z, 9);
    c.v += (want - c.v) * (1 - Math.exp(-dt * (want < c.v ? 3 : 1)));
    c.s += c.v * dt;
    c.car.position.set(x, 0.02, z); c.car.rotation.y = h;
    c.car.visible = !pp || Math.hypot(pp.x - x, pp.z - z) < (Q.phone ? 180 : 320);
  }
}

// ------------------------------------------------------------------ Heart Lab (inside the hospital's Anatomy Lab)
let heartPivot = null;
function setupHeart() {
  if (!heart || heartPivot) return;
  const hp = hospital.markers.heart || new THREE.Vector3(HOSP.ox + 15, 2.1, HOSP.oz - 47);
  const h = heart.scene; h.position.copy(hp); scene.add(h);
  const centre = name => { let c = null; h.traverse(o => { if (o.isMesh && o.name.toLowerCase().includes(name)) c = new THREE.Box3().setFromObject(o).getCenter(new THREE.Vector3()); }); return c; };
  const svc = centre('superior vena cava') || centre('superior_vena_cava'), ivc = centre('inferior vena cava') || centre('inferior_vena_cava');
  const pivot = new THREE.Group(); pivot.position.copy(hp); scene.add(pivot);
  if (svc && ivc) { const up = svc.clone().sub(ivc).normalize(); h.quaternion.premultiply(new THREE.Quaternion().setFromUnitVectors(up, new THREE.Vector3(0, 1, 0))); }
  h.updateMatrixWorld(true); const c = new THREE.Box3().setFromObject(h).getCenter(new THREE.Vector3()); h.position.sub(c).add(hp); pivot.attach(h);
  h.traverse(o => { if (o.isMesh) { o.material = o.material.clone(); heartParts.push(o); } });
  heartPivot = pivot; ui.heart.bind({ parts: heartParts, paint: paintParts });
}
const labOrbit = { yaw: 0, pitch: 0.1, dist: 1.9 };
function openLab() {
  if (!heartPivot) { setupHeart(); if (!heartPivot) { ui.toast('Preparing the 3D heart…'); return; } }
  mode = 'lab'; event('lab:open'); ui.heart.open(() => closeLab(), (score, max) => { event('mission:med_heart'); });
}
function closeLab() { mode = 'walk'; ui.heart.close(); paintParts(null, null); }
function labCamera(dt) {
  const c = heartPivot.position; const d = isSmall ? labOrbit.dist * 1.6 : labOrbit.dist;
  const cp = new THREE.Vector3(c.x + Math.sin(labOrbit.yaw) * Math.cos(labOrbit.pitch) * d, c.y + Math.sin(labOrbit.pitch) * d, c.z + Math.cos(labOrbit.yaw) * Math.cos(labOrbit.pitch) * d);
  camera.position.lerp(cp, 1 - Math.exp(-dt * 8)); const t = c.clone(); if (isSmall) t.y -= 0.35; camera.lookAt(t);
}
function pickHeart() { const h = ray.intersectObjects(heartParts.filter(m => m.visible), false)[0]; return h ? h.object : null; }
let hovPart = null; function setHoverPart(m) { if (m !== hovPart) { hovPart = m; paintParts(); } }
function paintParts() { const sel = ui.heart.selected(); heartParts.forEach(m => { if (!m.material.emissive) return; const on = sel && sel.name === m.name, hv = hovPart && hovPart.name === m.name; m.material.emissive.setHex(on ? 0xffffff : hv ? 0x8056f6 : 0); m.material.emissiveIntensity = on ? 0.35 : hv ? 0.45 : 0; }); }
function selectPart(m) { ui.heart.select(m); paintParts(); }

// ------------------------------------------------------------------ map data for UI
function mapData() {
  return { districts: DISTRICTS, plaza: PLAZA, footprints: ctx.footprints, featured: FEATURED, labels: ctx.labels,
    player: player ? { x: P.pos.x, z: P.pos.z, yaw: P.yaw } : null, objective: (() => { const o = OBJ[objIdx]; return o && o.target && o.target(); })() };
}
$('mapBtn').onclick = () => { if (mode === 'walk') ui.openMap(mapData()); };
$('mini').onclick = () => { if (mode === 'walk') ui.openMap(mapData()); };

// ------------------------------------------------------------------ audio (ambient city + footsteps), WebAudio, no files
let AC = null, amb = null, sndOn = true;
function audioStart() {
  if (AC || !sndOn) return; try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return; }
  const len = AC.sampleRate * 2, buf = AC.createBuffer(1, len, AC.sampleRate), d = buf.getChannelData(0); let last = 0;
  for (let i = 0; i < len; i++) { const w = Math.random() * 2 - 1; last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; }
  const src = AC.createBufferSource(); src.buffer = buf; src.loop = true; const lp = AC.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 420;
  amb = AC.createGain(); amb.gain.value = 0.0; src.connect(lp).connect(amb).connect(AC.destination); src.start();
  setInterval(() => { if (!AC || !sndOn || P.inside || Math.random() < 0.5) return; const o = AC.createOscillator(), g = AC.createGain(); o.type = 'sine'; const f = 2400 + Math.random() * 1600; const t = AC.currentTime;
    o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f * 1.4, t + 0.08); o.frequency.exponentialRampToValueAtTime(f * 0.9, t + 0.16);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.025, t + 0.02); g.gain.linearRampToValueAtTime(0, t + 0.18); o.connect(g).connect(AC.destination); o.start(t); o.stop(t + 0.2); }, 2600);
}
let lastPhase = 0;
function footsteps(speed) {
  if (!AC || !sndOn || !player) return;
  if (amb) amb.gain.value += ((P.inside ? 0.02 : 0.07) - amb.gain.value) * 0.05;
  const ph = player.phase; const crossed = (lastPhase < 0.5 && ph >= 0.5) || (ph < lastPhase); lastPhase = ph;
  if (!crossed || speed < 0.3) return;
  const t = AC.currentTime, n = AC.createBufferSource(), b = AC.createBuffer(1, AC.sampleRate * 0.06, AC.sampleRate), d = b.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 3);
  n.buffer = b; const f = AC.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = P.inside ? 1800 : 900; const g = AC.createGain(); g.gain.value = Math.min(0.22, 0.06 + speed * 0.04);
  n.connect(f).connect(g).connect(AC.destination); n.start(t);
}
$('sndBtn').onclick = () => { sndOn = !sndOn; $('sndBtn').textContent = sndOn ? '🔊' : '🔇'; if (amb) amb.gain.value = 0; if (sndOn) audioStart(); };

// ------------------------------------------------------------------ start
let readyCount = 0;
function checkReady() {
  if (!loadParts.sky || !hospital.ready) return;
  perf.readyAt = performance.now(); $('loadTxt').textContent = 'City ready. Choose your avatar and enter.'; const g = $('go'); g.disabled = false; g.textContent = 'Enter Talentopia →';
  loadModel(chosen).catch(() => {}); // prefetch the chosen avatar
  setupHeart();
}
$('go').onclick = async () => {
  const g = $('go'); g.disabled = true; g.textContent = 'Loading your avatar…'; audioStart();
  try {
    progress.avatar3d = chosen; store();
    player = await spawnChar(chosen);
    const w = progress.world;
    if (w && w.x > CITY.minX && w.x < CITY.maxX && w.z > CITY.minZ && w.z < CITY.maxZ) { P.pos.set(w.x, w.y || 0, w.z); P.yaw = w.yaw || 0; }
    else { P.pos.set(plaza.spawn.x, plaza.P, plaza.spawn.z); P.yaw = plaza.spawn.ry; }
    const q = new URLSearchParams(location.search).get('go'); if (q) { const f = FEATURED.find(x => x.id === q); if (f) { setTimeout(() => travelTo(f), 50); } }
    P.pos.y = groundAt(P.pos.x, P.pos.z, P.pos.y + 0.5); camYaw = P.yaw + Math.PI; camTarget.set(P.pos.x, P.pos.y + 1.55, P.pos.z);
    player.root.position.copy(P.pos);
    $('overlay').style.display = 'none'; mode = 'walk'; ui.renderObjectives(OBJ, objIdx); canvas.focus();
    spawnPeople(); spawnTraffic();
  } catch (e) { fail('Could not load your avatar: ' + e.message); g.disabled = false; g.textContent = 'Try again'; }
};

// ------------------------------------------------------------------ main loop
let lowFps = 0;
const clock = new THREE.Clock(); let elapsed = 0, lastWhere = '', frames = 0, fpsT = 0;
function step(dtOverride) {
  const dt = dtOverride || Math.min(clock.getDelta(), 1 / 20); elapsed += dt;
  updatePlayer(dt); updatePeople(dt); updateTraffic(dt); updateDoors(dt); updateCamera(dt);
  WIND.value = elapsed;
  for (const f of ctx.animated) f(elapsed, dt);
  updatePrompt(); updateBeacon(elapsed);
  // sun + shadow follow the avatar
  const fp = player ? P.pos : camTarget; sun.position.set(fp.x + SUN_DIR.x * 160, SUN_DIR.y * 160, fp.z + SUN_DIR.z * 160); sun.target.position.set(fp.x, 0, fp.z);
  // interior lights follow the room you are in / nearest
  if (player) { const f = P.inside; roomLights.forEach((l, i) => { if (f) { const cx = (f.x0 + f.x1) / 2, cz = (f.z0 + f.z1) / 2; l.position.set(cx + (i ? 1 : -1) * (f.x1 - f.x0) * 0.22, (f.floorH || 0.15) + (f.gfH || 5) - 1, cz + (i ? 1 : -1) * (f.z1 - f.z0) * 0.2); l.intensity += (60 - l.intensity) * 0.1; } else l.intensity *= 0.9; }); }
  // location label
  if (player && !P.inside) { const d = districtAt(P.pos.x, P.pos.z); const nm = d ? d.name : 'Talentopia'; if (nm !== lastWhere) { lastWhere = nm; ui.setWhere(nm, d && d.color ? d.color : '#8056F6'); if (d && d.id) event('district:' + d.id); } }
  else if (P.inside) lastWhere = '';
  if (player) ui.drawMini(mapData());
  if (composer) composer.render(dt); else renderer.render(scene, camera);
  frames++; fpsT += dt; if (fpsT > 1) { window.__fps = frames / fpsT; frames = 0; fpsT = 0;
  }
}
// ---------------------------------------------------------------- real frame timing, dynamic resolution, diagnostics overlay
const perf = { t: performance.now(), n: 0, fps: 0, ms: 0, worst: 0, readyAt: 0, enterAt: 0, startAt: performance.now(), hist: [] };
function perfTick() {
  const now = performance.now(), d = now - perf.lastT; perf.lastT = now; if (d > 0 && d < 1000) { perf.worst = Math.max(perf.worst, d); }
  perf.n++; if (now - perf.t >= 1000) { perf.fps = perf.n * 1000 / (now - perf.t); perf.ms = (now - perf.t) / perf.n; perf.t = now; perf.n = 0; perf.hist.push(perf.fps); if (perf.hist.length > 60) perf.hist.shift();
    if (mode !== 'loading' && !document.hidden) {
      if (composer && perf.fps < 34) { lowFps++; if (lowFps > 4) { composer = null; lowFps = 0; ui.toast('Reduced effects for smoother movement'); } } else lowFps = 0;
      if (perf.fps < 28) { Q.slow++; if (Q.slow >= 3 && Q.pr > 0.85) { Q.pr = Math.max(0.85, Q.pr - 0.15); renderer.setPixelRatio(Q.pr); if (composer) composer.setPixelRatio ? composer.setPixelRatio(Q.pr) : 0; Q.slow = 0; } }
      else if (perf.fps > 50 && Q.pr < Math.min(devicePixelRatio, Q.maxPR)) { Q.slow--; if (Q.slow <= -5) { Q.pr = Math.min(Math.min(devicePixelRatio, Q.maxPR), Q.pr + 0.1); renderer.setPixelRatio(Q.pr); Q.slow = 0; } }
      else Q.slow = 0; }
    if (dbg) drawDebug(); perf.worst = 0; }
}
const dbg = /[?&]debug=1/.test(location.search) ? document.createElement('div') : null;
if (dbg) { dbg.style.cssText = 'position:fixed;left:8px;top:110px;z-index:30;background:rgba(16,26,50,.85);color:#F5F7FB;font:10px/1.4 ui-monospace,Menlo,monospace;padding:6px 8px;border-radius:10px;max-width:230px;white-space:pre-wrap;pointer-events:auto'; document.body.appendChild(dbg); dbg.addEventListener('click', e => { if (e.target.id === 'dbgCopy') return; if (dbg.dataset.min) delete dbg.dataset.min; else dbg.dataset.min = '1'; drawDebug(); }); }
function gpuName() { try { const gl = renderer.getContext(); const e = gl.getExtension('WEBGL_debug_renderer_info'); return e ? gl.getParameter(e.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER); } catch (e) { return '?'; } }
function report() {
  const i = renderer.info, avg = perf.hist.length ? perf.hist.reduce((a, b) => a + b, 0) / perf.hist.length : 0, min = perf.hist.length ? Math.min(...perf.hist) : 0;
  return `Talentopia device report\nfps now ${perf.fps.toFixed(0)} · avg ${avg.toFixed(0)} · min ${min.toFixed(0)} (last ${perf.hist.length}s)\nworst frame ${perf.worst.toFixed(0)} ms\ndraw calls ${i.render.calls} · triangles ${(i.render.triangles / 1000).toFixed(0)}k\ntextures ${i.memory.textures} · geometries ${i.memory.geometries}\nscreen ${innerWidth}x${innerHeight} @ pixel ratio ${Q.pr.toFixed(2)} (device ${devicePixelRatio})\nAO ${composer ? 'on' : 'off'} · phone mode ${Q.phone}\ncity ready in ${perf.readyAt ? ((perf.readyAt - perf.startAt) / 1000).toFixed(1) + ' s' : '…'}\nGPU ${gpuName()}\n${navigator.userAgent.slice(0, 120)}`;
}
function drawDebug() { if (dbg.dataset.min) { dbg.innerHTML = `${perf.fps.toFixed(0)} fps · tap`; return; } dbg.innerHTML = report().replace(/</g, '&lt;') + '\n<button id="dbgCopy" style="margin-top:6px;padding:6px 10px;border-radius:8px;border:0;background:#8056F6;color:#fff;font:inherit">Copy report</button>';
  dbg.querySelector('#dbgCopy').onclick = () => { const t = report(); (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(() => ui.toast('Report copied, paste it to Claude')).catch(() => { prompt('Copy this report:', t); }); }; }
function frame() { perfTick(); step(); requestAnimationFrame(frame); }
frame();
window.__talentopia = { get mode() { return mode; }, get pos() { return P.pos; }, get yaw() { return P.yaw; }, get speed() { return P.speed; }, get objIdx() { return objIdx; },
  get inside() { return P.inside && P.inside.id; }, travel: id => { const f = FEATURED.find(x => x.id === id); if (f) travelTo(f); }, featured: () => FEATURED.map(f => f.id),
  goTo: id => { const f = FEATURED.find(x => x.id === id); if (f) goToBuilding(f); }, keys, camera, step, ui, P, groundAt, report: () => report(), Q, photo: (a) => { photoCam = a; }, ctx, colGrid, get composer() { return composer; }, renderer, get player() { return player; }, peds, cars, PRO_CHARS, FEATURED, STATIONS, interact, get current() { return current; }, setCam: (y, p, d) => { camYaw = y; if (p !== undefined) camPitch = p; if (d) camDist = d; } };
