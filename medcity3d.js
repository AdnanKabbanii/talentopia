/* TALENTOPIA · MedCity walkable 3D experience
   Plaza → street → MedCity General Hospital (sliding doors) → lobby/reception → Anatomy Lab (interactive heart).
   Assets: assets/medcity/medcity.glb (Blender), assets/medcity/heart.glb (BodyParts3D, CC BY-SA 2.1 JP),
   assets/medcity/sky_1k.hdr (Poly Haven, CC0), assets/people/*.glb (MakeHuman/MPFB, CC0). */
(() => {
'use strict';
const $ = id => document.getElementById(id);
const KEY = 'talentopia_3dcity_v1';
let progress = { xp: 0, done: [], name: 'Future Explorer' };
try { progress = { ...progress, ...JSON.parse(localStorage.getItem(KEY) || '{}') }; } catch (e) {}
const store = () => { try { localStorage.setItem(KEY, JSON.stringify(progress)); } catch (e) {} };
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
function awardOnce(key, xp) { progress.flags = progress.flags || {}; if (progress.flags[key]) return 0; progress.flags[key] = 1; progress.xp += xp; store(); showXP(); return xp; }
function showXP() { $('xp').textContent = '✦ ' + (progress.xp || 0) + ' XP'; }
showXP();
const isSmall = Math.min(innerWidth, innerHeight) < 700;
const coarse = matchMedia('(pointer:coarse)').matches;

// ------------------------------------------------------------------ renderer / scene
const canvas = $('c');
let renderer;
try { renderer = new THREE.WebGLRenderer({ canvas, antialias: !isSmall, powerPreference: 'high-performance' }); }
catch (e) { fail('Your browser could not start 3D graphics (WebGL). Try a recent Chrome, Safari or Edge.'); return; }
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, isSmall ? 1.5 : 1.75));
renderer.setSize(innerWidth, innerHeight); renderer.outputEncoding = THREE.sRGBEncoding;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0;
renderer.shadowMap.enabled = !isSmall; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 900);
scene.add(new THREE.HemisphereLight(0xdfe9ff, 0x8a7f6a, 0.35));
const sun = new THREE.DirectionalLight(0xfff1dc, 2.2); sun.position.set(30, 60, 25); scene.add(sun); scene.add(sun.target);
if (!isSmall) { sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); const s = sun.shadow.camera; s.left = -40; s.right = 40; s.top = 40; s.bottom = -40; s.near = 5; s.far = 160; sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.03; }
addEventListener('resize', () => { renderer.setSize(innerWidth, innerHeight); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); });

// ------------------------------------------------------------------ loading
const manager = new THREE.LoadingManager();
manager.onProgress = (url, a, b) => { $('loadBar').style.width = Math.round(a / b * 100) + '%'; $('loadTxt').textContent = 'Loading ' + a + ' / ' + b + ' files…'; };
manager.onError = url => fail('Could not load ' + url.split('/').pop() + '. Check your connection and reload.');
function fail(msg) { const e = $('err'); if (e) { e.style.display = 'block'; e.textContent = msg; } const t = $('loadTxt'); if (t) t.textContent = 'Something went wrong.'; }
const gltf = new THREE.GLTFLoader(manager);
const loadGLB = url => new Promise((res, rej) => gltf.load(url, res, undefined, rej));

const AVATARS = [['avatar_f1', 'Amara'], ['avatar_m1', 'Leo'], ['avatar_f2', 'Mei'], ['avatar_m2', 'Kwame']];
let chosen = (progress.avatar3d && AVATARS.some(a => a[0] === progress.avatar3d)) ? progress.avatar3d : 'avatar_f1';
$('avatars').innerHTML = AVATARS.map(([id, nm]) => `<button data-av="${id}" class="${id === chosen ? 'on' : ''}"><img src="assets/people/${id}.jpg" alt="${nm}"><span>${nm}</span></button>`).join('');
$('avatars').querySelectorAll('[data-av]').forEach(b => b.onclick = () => { chosen = b.dataset.av; $('avatars').querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b)); });

const colliders = [], floors = [], markers = {}, clickables = [], hospitalMeshes = [];
let doorL, doorR, doorBase = {}, heart, heartParts = [], env;
const people = [];  // {root, mixer, acts, kind}

new THREE.RGBELoader(manager).setDataType(THREE.UnsignedByteType).load('assets/medcity/sky_1k.hdr', tex => {
  const pm = new THREE.PMREMGenerator(renderer); const envMap = pm.fromEquirectangular(tex).texture;
  scene.environment = envMap; tex.mapping = THREE.EquirectangularReflectionMapping; scene.background = tex; pm.dispose();
});

// Background loads (people, heart, the chosen avatar) don't block the Enter button.
const bgLoader = new THREE.GLTFLoader();
const bgCache = {};
const loadBG = url => bgCache[url] || (bgCache[url] = new Promise((res, rej) => bgLoader.load(url, res, undefined, rej)));
let cityReady = false, heartReady = null;

// Only the district itself (about 4 MB) and the sky (about 1.4 MB) are needed before you can enter.
loadGLB('assets/medcity/medcity.glb').then(e => {
  env = e.scene; scene.add(env);
  env.traverse(o => {
    if (o.name.startsWith('COL_')) { o.updateWorldMatrix(true, false); colliders.push(new THREE.Box3().setFromObject(o)); o.visible = false; return; }
    if (o.name.startsWith('MK_')) { markers[o.name.slice(3)] = o.getWorldPosition(new THREE.Vector3()); return; }
    if (o.isMesh) {
      const glass = o.material && o.material.transparent;
      o.castShadow = !glass && !isSmall; o.receiveShadow = true;
      if (/^(ground|plaza|road|sidewalk|hospForecourt|lawn|lobbyFloor|labFloor|ambLane|curb|dash|edge|zebra)/.test(o.name)) floors.push(o);
      if (o.userData && o.userData.clickable === 'hospital') { hospitalMeshes.push(o); clickables.push(o); }
      if (o.name === 'DOOR_L') doorL = o; if (o.name === 'DOOR_R') doorR = o;
    }
  });
  if (doorL) doorBase.L = doorL.position.clone(); if (doorR) doorBase.R = doorR.position.clone();
  // interior lights (the sun can't reach under the hospital ceiling)
  [[0, 4.5, -30], [-18, 4.5, -30], [18, 4.5, -30], [15, 4.5, -47], [6, 4.5, -47], [24, 4.5, -47]].forEach(p => { const l = new THREE.PointLight(0xfff4e6, 0.9, 22, 2); l.position.set(...p); scene.add(l); });
  cityReady = true;
  $('loadTxt').textContent = 'City loaded. Choose your avatar and enter.';
  const g = $('go'); g.disabled = false; g.style.opacity = 1;
  // then stream in the rest: your avatar first, then the people you'll meet, then the heart
  loadBG('assets/people/' + chosen + '.glb').catch(() => {});
  loadBG('assets/people/visitor_m.glb').then(vm => { const w = addPerson(vm, markers.visitor2, 0, 'walker'); w.path = { a: 0, r: 9, cx: 0, cz: 16 }; }).catch(() => {});
  loadBG('assets/people/receptionist.glb').then(g => addPerson(g, markers.receptionist, 0, 'receptionist')).catch(() => {});
  loadBG('assets/people/doctor.glb').then(g => addPerson(g, markers.doctor, -Math.PI / 2, 'doctor')).catch(() => {});
  loadBG('assets/people/visitor_f.glb').then(g => addPerson(g, markers.visitor1, Math.PI, 'visitor')).catch(() => {});
  heartReady = loadBG('assets/medcity/heart.glb').then(setupHeart);
}).catch(err => { console.error(err); fail('Loading failed: ' + (err && err.message ? err.message : err)); });

function setupHeart(h) {
  heart = h.scene; const hp = markers.heart || new THREE.Vector3(15, 2.1, -47);
  heart.position.copy(hp); scene.add(heart);
  // orient anatomically: superior vena cava above inferior vena cava (vertical axis = +Y), then centre the model
  { const centre = name => { let c = null; heart.traverse(o => { if (o.isMesh && o.name.toLowerCase().includes(name)) c = new THREE.Box3().setFromObject(o).getCenter(new THREE.Vector3()); }); return c; };
    const svc = centre('superior vena cava') || centre('superior_vena_cava'), ivc = centre('inferior vena cava') || centre('inferior_vena_cava');
    const pivot = new THREE.Group(); pivot.position.copy(hp); scene.add(pivot);
    if (svc && ivc) { const up = svc.clone().sub(ivc).normalize(); heart.quaternion.premultiply(new THREE.Quaternion().setFromUnitVectors(up, new THREE.Vector3(0, 1, 0))); }
    heart.updateMatrixWorld(true); const bb = new THREE.Box3().setFromObject(heart); const c = bb.getCenter(new THREE.Vector3());
    heart.position.sub(c).add(hp); pivot.attach(heart); heart = pivot; }
  heart.traverse(o => { if (o.isMesh) { o.material = o.material.clone(); o.userData.base = o.material.emissive ? o.material.emissive.getHex() : 0; heartParts.push(o); o.castShadow = false; } });
}

function addPerson(g, pos, rotY, kind) {
  const root = new THREE.Group(); g.scene.rotation.y = Math.PI; root.add(g.scene);   // MPFB models face -Z after export; make them face +Z
  root.position.copy(pos || new THREE.Vector3()); root.rotation.y = rotY; scene.add(root);
  root.traverse(o => { if (o.isMesh) { o.castShadow = !isSmall; o.receiveShadow = true; o.frustumCulled = false; } });
  const mixer = new THREE.AnimationMixer(root); const acts = {};
  g.animations.forEach(c => { acts[c.name] = mixer.clipAction(c); });
  if (acts.Idle) { acts.Idle.play(); acts.Idle.time = Math.random() * 2; }
  if (acts.Walk) { acts.Walk.play(); acts.Walk.setEffectiveWeight(0); }
  const p = { root, mixer, acts, kind, moving: 0 }; people.push(p); return p;
}
function setMoving(p, amt, run) {
  if (!p.acts.Walk) return; p.moving += ((amt > 0.05 ? 1 : 0) - p.moving) * 0.18;
  p.acts.Walk.setEffectiveWeight(p.moving); if (p.acts.Idle) p.acts.Idle.setEffectiveWeight(1 - p.moving);
  p.acts.Walk.timeScale = run ? 1.7 : 1.0;
}

// ------------------------------------------------------------------ player
let player = null, started = false;
$('go').onclick = () => {
  $('go').disabled = true; $('go').textContent = 'Loading your avatar…';
  progress.avatar3d = chosen; store();
  loadBG('assets/people/' + chosen + '.glb').then(g => {
    player = addPerson(g, markers.spawn || new THREE.Vector3(0, 0, 34), Math.PI, 'player');
    camYaw = 0; started = true; $('overlay').style.display = 'none'; renderObjectives();
  }).catch(e => fail('Could not load your avatar.'));
};
const keys = new Set(); const joy = { x: 0, y: 0 };
addEventListener('keydown', e => {
  if (!started) return; const k = e.key.toLowerCase(); keys.add(k);
  if (k.startsWith('arrow') || k === ' ') e.preventDefault();
  if ((k === 'e' || k === 'enter') && mode === 'walk' && current) { e.preventDefault(); interact(current.id); }
  if (k === 'm' && mode === 'walk') openMap();
  if (k === 'escape') { if (mode === 'lab') closeLab(); else if (mode === 'dialog') closeDialog(); }
});
addEventListener('keyup', e => keys.delete(e.key.toLowerCase())); addEventListener('blur', () => keys.clear());

// camera orbit
let camYaw = 0, camPitch = 0.32, camDist = 6.5, drag = null;
canvas.addEventListener('pointerdown', e => { drag = { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, moved: false }; try { canvas.setPointerCapture(e.pointerId); } catch (_) {} });
canvas.addEventListener('pointermove', e => {
  if (drag) {
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag.x = e.clientX; drag.y = e.clientY;
    if (Math.abs(e.clientX - drag.sx) + Math.abs(e.clientY - drag.sy) > 6) drag.moved = true;
    if (drag.moved) {
      if (mode === 'lab') { labOrbit.yaw -= dx * 0.008; labOrbit.pitch = Math.max(-0.6, Math.min(1.1, labOrbit.pitch + dy * 0.006)); }
      else { camYaw -= dx * 0.006; camPitch = Math.max(0.05, Math.min(1.2, camPitch + dy * 0.004)); }
    }
  } else if (e.pointerType === 'mouse') hover(e);
});
canvas.addEventListener('pointerup', e => { if (!drag) return; const tap = !drag.moved; drag = null; if (tap) click(e); });
canvas.addEventListener('wheel', e => { e.preventDefault(); if (mode === 'lab') labOrbit.dist = Math.max(0.6, Math.min(3, labOrbit.dist + (e.deltaY > 0 ? 0.15 : -0.15))); else camDist = Math.max(2.5, Math.min(14, camDist + (e.deltaY > 0 ? 0.6 : -0.6))); }, { passive: false });
// joystick
const joyEl = $('joy'), knob = joyEl.querySelector('span'); let joyId = null;
const jm = e => { const r = joyEl.getBoundingClientRect(); let dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2); const L = Math.hypot(dx, dy), R = 46; if (L > R) { dx *= R / L; dy *= R / L; } joy.x = dx / R; joy.y = dy / R; knob.style.transform = `translate(${dx}px,${dy}px)`; };
joyEl.addEventListener('pointerdown', e => { joyId = e.pointerId; joyEl.setPointerCapture(e.pointerId); jm(e); });
joyEl.addEventListener('pointermove', e => { if (e.pointerId === joyId) jm(e); });
const je = e => { if (e.pointerId !== joyId) return; joyId = null; joy.x = joy.y = 0; knob.style.transform = ''; };
joyEl.addEventListener('pointerup', je); joyEl.addEventListener('pointercancel', je);

// ------------------------------------------------------------------ picking: hospital hover/click, NPCs, heart
const ray = new THREE.Raycaster(), ptr = new THREE.Vector2();
function setPtr(e) { const r = canvas.getBoundingClientRect(); ptr.set((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1); ray.setFromCamera(ptr, camera); }
let hoverHospital = false;
function paintHospital(on) {
  if (on === hoverHospital) return; hoverHospital = on;
  hospitalMeshes.forEach(m => { if (!m.material.emissive) return; if (!m.userData.e0) { m.material = m.material.clone(); m.userData.e0 = m.material.emissive.getHex(); } m.material.emissive.setHex(on ? 0x2b2070 : m.userData.e0); m.material.emissiveIntensity = on ? 0.35 : 1; });
}
function hover(e) {
  if (!started) return; setPtr(e); const tip = $('tip');
  if (mode === 'lab') { const id = pickHeart(); setHoverPart(id); canvas.style.cursor = id ? 'pointer' : 'grab'; tip.style.display = 'none'; return; }
  if (mode !== 'walk') return;
  const h = ray.intersectObjects(hospitalMeshes, false)[0];
  const inside = player && isInside(player.root.position);
  paintHospital(!!h && !inside); canvas.style.cursor = h && !inside ? 'pointer' : 'grab';
  if (h && !inside) { tip.textContent = 'MedCity General Hospital · click to walk to the entrance'; tip.style.left = e.clientX + 'px'; tip.style.top = e.clientY + 'px'; tip.style.display = 'block'; } else tip.style.display = 'none';
}
function click(e) {
  if (!started) return; setPtr(e);
  if (mode === 'lab') { const id = pickHeart(); if (id) selectPart(id); return; }
  if (mode !== 'walk') return;
  // people / stations
  for (const p of people) { if (p.kind === 'player') continue; if (ray.intersectObject(p.root, true)[0]) { const it = INTERACT.find(i => i.npc === p.kind); if (it) { goTo(it.pos(), it.id); return; } } }
  if (heart && ray.intersectObject(heart, true)[0]) { goTo(INTERACT.find(i => i.id === 'lab').pos(), 'lab'); return; }
  const h = ray.intersectObjects(hospitalMeshes, false)[0];
  if (h && !isInside(player.root.position)) { walkToHospital(); return; }
  const f = ray.intersectObjects(floors, false)[0]; if (f) goTo(f.point.clone(), null);
}

// ------------------------------------------------------------------ movement, collisions, auto-walk
const R = 0.35; const blocked = (x, z) => colliders.some(b => x + R > b.min.x && x - R < b.max.x && z + R > b.min.z && z - R < b.max.z && b.max.y > 0.4);
const down = new THREE.Raycaster(); down.far = 6;
function groundY(x, z, y) { down.set(new THREE.Vector3(x, (y || 0) + 2, z), new THREE.Vector3(0, -1, 0)); const h = down.intersectObjects(floors, false)[0]; return h ? h.point.y : (y || 0); }
const isInside = p => p.x > -30 && p.x < 30 && p.z < -24 && p.z > -54;
let route = [], routeGoal = null, stuckT = 0, bestD = 1e9;
function goTo(target, goal) { route = planRoute(player.root.position, target); routeGoal = goal; stuckT = 0; bestD = 1e9; }
function planRoute(from, to) {
  const pts = []; const fromIn = isInside(from), toIn = isInside(to);
  const door = markers.doorCenter || new THREE.Vector3(0, 0, -24);
  const crossesFountain = (from.z > 10 && to.z < 21) || (from.z < 21 && to.z > 23);
  if (!fromIn && crossesFountain && Math.abs(from.x) < 8.5 && from.z > 9) { const sx = from.x >= 0 ? 1 : -1; pts.push(new THREE.Vector3(sx * 8.5, 0, from.z > 16 ? 23.5 : 8.5)); pts.push(new THREE.Vector3(sx * 8.5, 0, from.z > 16 ? 8.5 : 23.5)); }
  if (!fromIn && toIn) { if (from.z > -1) pts.push(new THREE.Vector3(from.x * 0.3, 0, -1)); pts.push(new THREE.Vector3(0, 0, door.z + 3)); pts.push(new THREE.Vector3(0, 0, door.z - 2)); }
  if (fromIn && !toIn) { pts.push(new THREE.Vector3(0, 0, door.z - 2)); pts.push(new THREE.Vector3(0, 0, door.z + 3)); }
  if (toIn && (to.z < -40) && from.z > -40) { pts.push(new THREE.Vector3(7.5, 0, -38.5)); pts.push(new THREE.Vector3(7.5, 0, -41.5)); }
  if (fromIn && from.z < -40 && to.z > -40) { pts.push(new THREE.Vector3(7.5, 0, -41.5)); pts.push(new THREE.Vector3(7.5, 0, -38.5)); }
  pts.push(to.clone()); return pts;
}
function walkToHospital() { const ent = markers.hospitalEntrance || new THREE.Vector3(0, 0, -21.5); goTo(ent.clone(), 'entrance'); toast('Walking to MedCity General Hospital…'); }
const cdir = new THREE.Vector3();
function updatePlayer(dt) {
  if (!player) return; const p = player.root.position;
  let ix = 0, iz = 0;
  if (keys.has('w') || keys.has('arrowup')) iz += 1; if (keys.has('s') || keys.has('arrowdown')) iz -= 1;
  if (keys.has('a') || keys.has('arrowleft')) ix -= 1; if (keys.has('d') || keys.has('arrowright')) ix += 1;
  ix += joy.x; iz -= joy.y;
  let mx = 0, mz = 0, run = keys.has('shift');
  if (Math.hypot(ix, iz) > 0.1) {
    route = []; routeGoal = null;
    const fx = -Math.sin(camYaw), fz = -Math.cos(camYaw);   // camera forward on ground
    const rx = -fz, rz = fx;
    mx = fx * iz + rx * ix; mz = fz * iz + rz * ix; const L = Math.hypot(mx, mz); if (L > 1) { mx /= L; mz /= L; }
  } else if (route.length) {
    const t = route[0]; const dx = t.x - p.x, dz = t.z - p.z, d = Math.hypot(dx, dz);
    if (d < (route.length > 1 ? 0.6 : 0.35)) { route.shift(); bestD = 1e9; if (!route.length) arrive(); }
    else { mx = dx / d; mz = dz / d; run = d > 8; if (d < bestD - 0.05) { bestD = d; stuckT = 0; } else if ((stuckT += dt) > 1.2) { route = []; routeGoal = null; } }
  }
  const amt = Math.min(1, Math.hypot(mx, mz)), speed = (run ? 4.6 : 2.1) * amt * dt;
  if (amt > 0.05) {
    const nx = p.x + mx * speed, nz = p.z + mz * speed;
    if (!blocked(nx, p.z)) p.x = nx; if (!blocked(p.x, nz)) p.z = nz;
    const target = Math.atan2(mx, mz); let d = target - player.root.rotation.y; d = ((d + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI; player.root.rotation.y += d * 0.2;
  }
  p.y += (groundY(p.x, p.z, p.y) - p.y) * 0.5;
  setMoving(player, amt, run);
}
function arrive() { const g = routeGoal; routeGoal = null; if (g === 'entrance') { toast('The doors open: welcome to MedCity General Hospital.'); advance(1); } else if (g) interact(g); }

// ------------------------------------------------------------------ objectives, interactions, dialogue
const OBJ = ['Walk to MedCity General Hospital', 'Check in with Maya at reception', 'Open the Heart Lab in the Anatomy Lab', 'Complete the heart challenge'];
let objIdx = 0;
function renderObjectives() { $('objList').innerHTML = OBJ.map((o, i) => `<li class="${i < objIdx ? 'done' : i === objIdx ? 'now' : ''}"><i>${i < objIdx ? '✓' : i + 1}</i><span>${o}</span></li>`).join(''); }
function advance(n) { if (n > objIdx) { objIdx = n; renderObjectives(); } }
const INTERACT = [
  { id: 'reception', npc: 'receptionist', r: 2.4, label: 'Talk to Maya at reception', pos: () => markers.reception || new THREE.Vector3(0, 0, -30.2) },
  { id: 'lab', r: 2.4, label: 'Open the Heart Lab', pos: () => markers.labStation || new THREE.Vector3(15, 0, -43.6) },
  { id: 'doctor', npc: 'doctor', r: 2.2, label: 'Talk to Dr. Haddad', pos: () => (markers.doctor || new THREE.Vector3(18.5, 0, -44)).clone().add(new THREE.Vector3(-1.2, 0, 0)) },
];
let mode = 'walk', current = null;
function updatePrompt() {
  if (!player || mode !== 'walk') { $('prompt').style.display = 'none'; current = null; return; }
  const p = player.root.position; let best = null, bd = 1e9;
  for (const it of INTERACT) { const d = p.distanceTo(it.pos().clone().setY(p.y)); if (d < it.r && d < bd) { bd = d; best = it; } }
  if (best !== current) { current = best; const el = $('prompt'); if (best) { el.innerHTML = (coarse ? '' : '<kbd>E</kbd>') + best.label; el.style.display = 'block'; } else el.style.display = 'none'; }
}
$('prompt').onclick = () => { if (current) interact(current.id); };
function dialog(who, html, opts) {
  mode = 'dialog'; $('prompt').style.display = 'none'; const d = $('dialog');
  d.innerHTML = `<div class="who">${esc(who)}</div><div class="txt">${html}</div><div class="opts">${opts.map((o, i) => `<button data-o="${i}">${o.label}</button>`).join('')}</div>`;
  d.style.display = 'block'; d.querySelectorAll('[data-o]').forEach(b => b.onclick = () => opts[+b.dataset.o].fn());
}
function closeDialog() { $('dialog').style.display = 'none'; mode = 'walk'; }
function interact(id) {
  route = [];
  if (id === 'reception') {
    if (objIdx < 1) advance(1);
    if (objIdx > 1) { dialog('Maya · Reception', 'Welcome back! The <b>Anatomy Lab</b> is through the door on your right, past the seating area.', [{ label: 'Thanks, Maya', fn: closeDialog }]); return; }
    dialog('Maya · Reception', `Welcome to <b>MedCity General Hospital</b>, ${esc(progress.name || 'Future Explorer')}! What would you like to do today?`, [
      { label: '🩺 Explore Medicine (career explorer)', fn: () => dialog('Maya · Reception', 'Great choice. Our Anatomy Lab has a real 3D heart built from scientific scan data. Head through the <b>Anatomy Lab</b> door on the right and step onto the glowing ring.', [{ label: 'Show me the way →', fn: () => { closeDialog(); advance(2); goTo(INTERACT[1].pos(), null); } }]) },
      { label: '📚 Study my course material (university mode)', fn: () => dialog('Maya · Reception', 'Study mode, where you upload your own lecture notes and practise them here, is <b>planned but not built yet</b>. For now, try the guided heart lesson in the Anatomy Lab.', [{ label: 'OK, take me to the lab →', fn: () => { closeDialog(); advance(2); goTo(INTERACT[1].pos(), null); } }]) }]);
    return;
  }
  if (id === 'doctor') {
    const done = progress.flags && progress.flags.med_heart;
    dialog('Dr. Haddad · Cardiologist', done ? 'You completed the heart challenge. Cardiologists use exactly this knowledge every day: which chamber, which valve, which vessel. Well done!' : 'Hello! Before patients, every medical student learns the heart’s structure. Step onto the ring at the display to open the Heart Lab.', [{ label: done ? 'Thank you, doctor' : 'Open the Heart Lab →', fn: () => { closeDialog(); if (!done) interact('lab'); } }]);
    return;
  }
  if (id === 'lab') { if (objIdx < 2) advance(2); openLab(); }
}
let toastT; function toast(t) { const h = $('hint'); h.textContent = t; h.style.display = 'block'; clearTimeout(toastT); toastT = setTimeout(() => { h.textContent = coarse ? '' : 'WASD / arrows to walk · Shift to run · drag to look · E to interact · M map'; if (coarse) h.style.display = 'none'; }, 3200); }

// ------------------------------------------------------------------ map / fast travel / passport
function openMap() {
  dialog('City map · fast travel', 'Jump to a place in MedCity:', [
    { label: '🏛 Central plaza', fn: () => travel(markers.spawn) }, { label: '🏥 Hospital entrance', fn: () => travel(markers.hospitalEntrance, 1) },
    { label: '🛎 Reception', fn: () => travel(markers.reception, 1) }, { label: '❤ Anatomy Lab', fn: () => travel(markers.labStation, 2) }, { label: 'Close', fn: closeDialog }]);
}
function travel(p, obj) { closeDialog(); if (!p || !player) return; player.root.position.set(p.x, groundY(p.x, p.z, 0), p.z); route = []; if (obj) advance(obj); }
$('mapBtn').onclick = () => { if (started && mode === 'walk') openMap(); };
$('passBtn').onclick = () => {
  if (!started) return; const s = progress.shifts || {};
  const badges = Object.values(s).map(b => `<div style="padding:8px 10px;border:1px solid #e3e6f1;border-radius:10px;margin:4px 0">${esc(b.icon || '✦')} ${esc(b.badge)} · ${b.score}/${b.max}</div>`).join('') || '<p>No badges yet. Complete the heart challenge to earn one.</p>';
  dialog('Career Passport', `<b>${esc(progress.name || 'Future Explorer')}</b> · ${progress.xp || 0} XP${badges}<div class="note">Discovery badges from educational simulations, not qualifications. Saved on this device.</div>`, [{ label: 'Close', fn: closeDialog }]);
};

// ------------------------------------------------------------------ Heart Lab
const HEART_INFO = [
  ['cavity of left ventricle', 'Left ventricle', 'The heart’s strongest chamber. Its thick muscular wall pumps oxygen-rich blood through the aortic valve into the aorta and out to the whole body.'],
  ['cavity of right ventricle', 'Right ventricle', 'Pumps oxygen-poor blood through the pulmonary valve into the pulmonary trunk, toward the lungs.'],
  ['cavity of left atrium', 'Left atrium', 'Receives oxygen-rich blood returning from the lungs through the pulmonary veins and passes it through the mitral valve to the left ventricle.'],
  ['cavity of right atrium', 'Right atrium', 'Receives oxygen-poor blood from the body through the superior and inferior venae cavae and passes it through the tricuspid valve to the right ventricle.'],
  ['wall of left atrium', 'Wall of the left atrium', 'The thin muscular wall of the left atrium. Atria need less muscle than ventricles because they only push blood into the chamber just below them.'],
  ['wall of right atrium', 'Wall of the right atrium', 'The thin muscular wall of the right atrium. The heart’s natural pacemaker (the sinoatrial node) sits in this wall.'],
  ['tricuspid', 'Tricuspid valve', 'Three leaflets between the right atrium and right ventricle. They close when the ventricle contracts so blood can’t flow back into the atrium.'],
  ['mitral', 'Mitral valve', 'Two leaflets (anterior and posterior) between the left atrium and left ventricle. It stops backflow into the left atrium when the left ventricle contracts.'],
  ['aortic valve', 'Aortic valve', 'Three cusps at the exit of the left ventricle. It opens to let blood into the aorta and closes to stop it flowing back.'],
  ['pulmonary valve', 'Pulmonary valve', 'Three cusps at the exit of the right ventricle into the pulmonary trunk.'],
  ['papillary', 'Papillary muscle', 'Small muscles inside the ventricles. Through thin cords (chordae tendineae) they hold the valve leaflets so they don’t flip backward.'],
  ['ascending aorta', 'Ascending aorta', 'The first part of the aorta, the body’s largest artery. It carries oxygen-rich blood upward from the left ventricle.'],
  ['arch of aorta', 'Arch of the aorta', 'The aorta curves over the heart here and gives off the arteries that supply the head, neck and arms.'],
  ['pulmonary trunk', 'Pulmonary trunk', 'Carries oxygen-poor blood from the right ventricle toward the lungs. It is an artery even though its blood is low in oxygen, because it carries blood away from the heart.'],
  ['superior vena cava', 'Superior vena cava', 'A large vein returning oxygen-poor blood from the head, neck and arms to the right atrium.'],
  ['inferior vena cava', 'Inferior vena cava', 'The largest vein, returning oxygen-poor blood from the lower body to the right atrium.'],
  ['coronary', 'Coronary artery', 'Supplies the heart muscle itself with oxygen-rich blood. A blockage here can cause a heart attack.'],
];
const GROUPS = [['walls', 'Atrial walls', n => n.includes('wall of')], ['chambers', 'Chambers', n => n.includes('cavity of')], ['valves', 'Valves', n => /valve|leaflet|cusp/.test(n)],
                ['muscles', 'Papillary muscles', n => n.includes('papillary')], ['vessels', 'Great vessels', n => /aorta|vena cava|pulmonary trunk/.test(n)], ['coronary', 'Coronary arteries', n => n.includes('coronary')]];
const partName = m => (m.name.split('|')[1] || m.name).replace(/_/g, ' ').toLowerCase();
const infoFor = n => HEART_INFO.find(h => n.includes(h[0]));
const groupOn = { walls: true, chambers: true, valves: true, muscles: true, vessels: true, coronary: true };
const CHALLENGE = [
  ['cavity of left ventricle', 'Find the chamber that pumps <b>oxygen-rich blood to the whole body</b>.', 'walls'],
  ['pulmonary trunk', 'Find the vessel that carries blood from the <b>right ventricle to the lungs</b>.', null],
  ['tricuspid', 'Find a leaflet of the valve between the <b>right atrium and right ventricle</b>.', 'walls'],
  ['superior vena cava', 'Find the large vein that returns blood from the <b>head and arms</b>.', null],
  ['coronary', 'Find an artery that supplies <b>the heart muscle itself</b>.', null]];
const lab = { seen: new Set(), phase: 'explore', q: 0, first: true, score: 0, sel: null, hov: null };
const labOrbit = { yaw: 0, pitch: 0.1, dist: 1.9 };
function openLab() {
  if (!heart) { toast('Preparing the 3D heart…'); if (heartReady) heartReady.then(() => { if (mode === 'walk') openLab(); }); return; }
  mode = 'lab'; $('prompt').style.display = 'none'; $('tip').style.display = 'none'; paintHospital(false);
  $('lab').style.display = 'flex'; $('obj').style.display = 'none'; $('mini').style.display = 'none';
  renderLab();
}
function closeLab() { mode = 'walk'; $('lab').style.display = 'none'; $('obj').style.display = ''; $('mini').style.display = ''; lab.sel = lab.hov = null; paintParts(); canvas.style.cursor = 'grab'; }
function renderLab(msg, cls) {
  const L = $('lab');
  L.innerHTML = `<div class="k">Anatomy Lab · Heart</div><h3>The human heart</h3>
   <div class="layerbar">${GROUPS.map(([k, l]) => `<button data-g="${k}" class="${groupOn[k] ? 'on' : ''}">${l}</button>`).join('')}</div>
   <div class="info" id="hinfo">${lab.sel ? infoHTML(lab.sel) : '<b>Tap any structure</b>Drag to rotate, scroll or pinch to zoom. Switch off “Atrial walls” to see the chambers inside.'}</div>
   <div class="task ${cls || ''}" id="htask">${taskHTML(msg)}</div>
   <div class="note">Educational 3D model built from BodyParts3D scan data (© DBCLS, CC BY-SA 2.1 JP). Colours are for teaching: red = oxygen-rich side, blue = oxygen-poor side. Not medical advice.</div>
   <button class="secondary" id="labBack">← Back to walking</button>`;
  L.querySelectorAll('[data-g]').forEach(b => b.onclick = () => { groupOn[b.dataset.g] = !groupOn[b.dataset.g]; applyGroups(); renderLab(msg, cls); });
  $('labBack').onclick = closeLab; applyGroups();
}
function infoHTML(m) { const n = partName(m), i = infoFor(n); return i ? `<b>${i[1]}</b><span style="font-size:11px;color:#6b7290">${esc(n)}</span><br>${i[2]}` : `<b>${esc(n)}</b>`; }
function taskHTML(msg) {
  if (lab.phase === 'explore') { const n = Math.min(lab.seen.size, 5); return `<b>Step 1 · Explore.</b> Tap <b>5 different structures</b> to learn what they do.${msg ? '<br>' + msg : ''}<div class="bar"><span style="width:${n * 20}%"></span></div>`; }
  if (lab.phase === 'quiz') return `<b>Step 2 · Challenge ${lab.q + 1}/5.</b> ${CHALLENGE[lab.q][1]}${msg ? '<br>' + msg : ''}<div class="bar"><span style="width:${lab.q * 20}%"></span></div>`;
  return `<b>✓ Heart challenge complete.</b> ${msg || ''}<div class="bar"><span style="width:100%"></span></div><button class="primary" id="replay" style="margin-top:10px;width:100%">Replay the challenge</button>`;
}
function applyGroups() {
  heartParts.forEach(m => { const n = partName(m); const g = GROUPS.find(G => G[2](n)); m.visible = g ? groupOn[g[0]] : true; });
  const r = $('replay'); if (r) r.onclick = () => { lab.phase = 'quiz'; lab.q = 0; lab.score = 0; lab.first = true; renderLab(); };
}
function pickHeart() { const h = ray.intersectObjects(heartParts.filter(m => m.visible), false)[0]; return h ? h.object : null; }
function setHoverPart(m) { if (m !== lab.hov) { lab.hov = m; paintParts(); } }
function paintParts() {
  heartParts.forEach(m => { if (!m.material.emissive) return; const n = partName(m);
    const on = lab.sel && partName(lab.sel) === n, hv = lab.hov && partName(lab.hov) === n;
    m.material.emissive.setHex(on ? 0xffffff : hv ? 0x8056f6 : 0x000000); m.material.emissiveIntensity = on ? 0.35 : hv ? 0.45 : 0; });
}
function selectPart(m) {
  lab.sel = m; paintParts(); const n = partName(m);
  if (lab.phase === 'explore') {
    const i = infoFor(n); lab.seen.add(i ? i[1] : n);
    if (lab.seen.size >= 5) { lab.phase = 'quiz'; lab.q = 0; renderLab('Great exploring! Now the challenge.', 'ok'); } else renderLab();
  } else if (lab.phase === 'quiz') {
    const want = CHALLENGE[lab.q][0];
    if (n.includes(want)) {
      if (lab.first) lab.score++; lab.q++; lab.first = true;
      if (lab.q >= CHALLENGE.length) finishHeart();
      else { const hide = CHALLENGE[lab.q][2]; if (hide) { groupOn[hide] = false; } renderLab('✓ Correct!', 'ok'); }
    } else { lab.first = false; const i = infoFor(n); renderLab(`That’s the <b>${i ? i[1] : esc(n)}</b>. Try again.`, 'no'); }
  } else renderLab();
}
function finishHeart() {
  lab.phase = 'done'; const g = awardOnce('med_heart', 150);
  progress.shifts = progress.shifts || {}; progress.shifts.med_heart = { score: lab.score, max: CHALLENGE.length, badge: 'MedCity Heart Anatomy Explorer', icon: '♥', date: new Date().toISOString().slice(0, 10) };
  if (!progress.done.includes('med')) progress.done.push('med'); store(); advance(4);
  renderLab(g ? `+${g} XP earned.` : 'Challenge replayed.', 'ok');
  $('doneText').innerHTML = `You answered <b>${lab.score} of ${CHALLENGE.length}</b> right first time${g ? ` and earned <b>+${g} XP</b>` : ''}.<br>Skills practised: heart chambers, valves, great vessels and coronary circulation.`;
  $('done').style.display = 'grid';
}
$('donePass').onclick = () => { $('done').style.display = 'none'; closeLab(); $('passBtn').onclick(); };
$('doneStay').onclick = () => { $('done').style.display = 'none'; };

// ------------------------------------------------------------------ minimap & region
const mc = $('miniC').getContext('2d');
function drawMini() {
  if (!player) return; const W = 300, S = 2.2; const p = player.root.position; mc.clearRect(0, 0, W, W);
  mc.fillStyle = '#e7ecf4'; mc.fillRect(0, 0, W, W);
  const tx = x => W / 2 + (x - p.x) * S, tz = z => W / 2 + (z - p.z) * S;
  mc.fillStyle = '#9aa2b5'; mc.fillRect(0, tz(-14), W, 12 * S);
  mc.fillStyle = '#cbd3df'; mc.fillRect(tx(-30), tz(2), 60 * S, 34 * S);
  mc.fillStyle = '#a7d3b1'; mc.fillRect(tx(-27), tz(4), 14 * S, 24 * S); mc.fillRect(tx(13), tz(4), 14 * S, 24 * S);
  mc.fillStyle = '#c8b8f4'; mc.fillRect(tx(-30), tz(-54), 60 * S, 30 * S); mc.fillStyle = '#8056f6'; mc.font = 'bold 18px sans-serif'; mc.fillText('Hospital', tx(-14), tz(-38));
  mc.beginPath(); mc.arc(tx(0), tz(16), 6 * S, 0, 7); mc.fillStyle = '#9fd3e6'; mc.fill();
  const goal = objIdx === 0 ? markers.hospitalEntrance : objIdx === 1 ? markers.reception : objIdx < 4 ? markers.labStation : null;
  if (goal) { mc.beginPath(); mc.arc(tx(goal.x), tz(goal.z), 7, 0, 7); mc.fillStyle = '#51c9e8'; mc.fill(); }
  mc.save(); mc.translate(W / 2, W / 2); mc.rotate(-player.root.rotation.y + Math.PI); mc.fillStyle = '#101a32'; mc.beginPath(); mc.moveTo(0, -11); mc.lineTo(8, 8); mc.lineTo(-8, 8); mc.closePath(); mc.fill(); mc.restore();
}
function region(p) { if (isInside(p)) return p.z < -40 && p.x > 0 ? '❤ Anatomy Lab' : '🏥 Hospital lobby'; if (p.z < -14) return '🏥 Hospital forecourt'; if (p.z < 2) return '🚦 Health Avenue'; return '🏛 Central plaza'; }

// ------------------------------------------------------------------ main loop
const camRay = new THREE.Raycaster(), hitV = new THREE.Vector3();
const clock = new THREE.Clock(); const camTarget = new THREE.Vector3(), camPos = new THREE.Vector3(), tmp = new THREE.Vector3();
let lastRegion = '', miniT = 0;
function frame() {
  requestAnimationFrame(frame); const dt = Math.min(clock.getDelta(), 0.05);
  if (started && mode === 'walk') updatePlayer(dt);
  for (const p of people) {
    if (p.kind === 'walker' && p.path) { p.path.a += dt * 0.12; const nx = p.path.cx + Math.cos(p.path.a) * p.path.r, nz = p.path.cz + Math.sin(p.path.a) * p.path.r; const r = p.root.position; p.root.rotation.y = Math.atan2(nx - r.x, nz - r.z); r.set(nx, groundY(nx, nz, r.y), nz); setMoving(p, 1, false); }
    else if (p.kind !== 'player' && player && (p.kind === 'receptionist' || p.kind === 'doctor')) { const d = p.root.position.distanceTo(player.root.position); if (d < 6) { const a = Math.atan2(player.root.position.x - p.root.position.x, player.root.position.z - p.root.position.z); let dd = a - p.root.rotation.y; dd = ((dd + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI; p.root.rotation.y += dd * 0.06; } }
    p.mixer.update(dt);
  }
  // doors open when someone is near
  if (doorL && doorR && player) { const dc = markers.doorCenter || new THREE.Vector3(0, 0, -24); const near = Math.hypot(player.root.position.x - dc.x, player.root.position.z - dc.z) < 6; const k = near ? 1 : 0; doorL.userData.k = (doorL.userData.k || 0) + (k - (doorL.userData.k || 0)) * 0.08; const o = doorL.userData.k * 2.9; doorL.position.x = doorBase.L.x - o; doorR.position.x = doorBase.R.x + o; }
  if (heart && mode !== 'lab') heart.rotation.y += dt * 0.25;
  // camera
  if (mode === 'lab' && heart) {
    const c = heart.position; const d = isSmall ? labOrbit.dist * 1.5 : labOrbit.dist;
    camPos.set(c.x + Math.sin(labOrbit.yaw) * Math.cos(labOrbit.pitch) * d, c.y + Math.sin(labOrbit.pitch) * d, c.z + Math.cos(labOrbit.yaw) * Math.cos(labOrbit.pitch) * d);
    camTarget.copy(c); if (isSmall) camTarget.y -= 0.35;
    camera.position.lerp(camPos, 0.12);
  } else if (player) {
    const p = player.root.position; const inside = isInside(p); const dist = inside ? Math.min(camDist, 4.2) : camDist; const pitch = inside ? Math.max(camPitch, 0.22) : camPitch;
    camTarget.set(p.x, p.y + 1.55, p.z);
    camPos.set(p.x + Math.sin(camYaw) * Math.cos(pitch) * dist, p.y + 1.6 + Math.sin(pitch) * dist, p.z + Math.cos(camYaw) * Math.cos(pitch) * dist);
    if (inside) camPos.y = Math.min(camPos.y, 4.6);
    // camera collision: keep the camera in front of walls between it and the avatar
    { const dir = tmp.copy(camPos).sub(camTarget); const len = dir.length(); dir.normalize(); camRay.set(camTarget, dir); let best = len;
      for (const b of colliders) { if (b.max.y < 2.2) continue; const hit = camRay.ray.intersectBox(b, hitV); if (hit) { const d = hitV.distanceTo(camTarget); if (d < best) best = d; } }
      if (best < len) camPos.copy(camTarget).addScaledVector(dir, Math.max(0.6, best - 0.25)); }
    camera.position.lerp(camPos, 0.15);
    sun.position.set(p.x + 30, 60, p.z + 25); sun.target.position.set(p.x, 0, p.z);
    updatePrompt();
    const rg = region(p); if (rg !== lastRegion) { lastRegion = rg; $('where').textContent = '📍 ' + rg; }
    if ((miniT += dt) > 0.1) { miniT = 0; drawMini(); }
  } else { camera.position.set(28, 18, 30); camTarget.set(0, 6, -10); }
  camera.lookAt(camTarget);
  renderer.render(scene, camera);
}
frame();
window.__medcity = { get mode() { return mode; }, get objIdx() { return objIdx; } };
})();
