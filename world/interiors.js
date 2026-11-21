// Interior furnishing for featured buildings + interaction stations and professional NPC spots.
import * as THREE from 'three';
import { M, mat4, ubox, ucyl, sign, signMat } from './kit.js';
import { boardTex } from './textures.js';

// Local frame inside a room: u = across (left/right as you enter), v = depth from the door wall (0) inward.
function frame(r) {
  const { x0, x1, z0, z1, face } = r; const y = r.floorH ?? 0.15;
  const F = {
    s: (u, v) => [(x0 + x1) / 2 + u, z1 - v], n: (u, v) => [(x0 + x1) / 2 - u, z0 + v],
    e: (u, v) => [x1 - v, (z0 + z1) / 2 - u], w: (u, v) => [x0 + v, (z0 + z1) / 2 + u],
  }[face];
  const ry = { s: Math.PI, n: 0, e: -Math.PI / 2, w: Math.PI / 2 }[face]; // rotation that faces INTO the room (+v)
  const W = face === 's' || face === 'n' ? x1 - x0 : z1 - z0, D = face === 's' || face === 'n' ? z1 - z0 : x1 - x0;
  return { F, ry, y, W, D };
}
// furniture builders in local space (u,v), rot = extra rotation (0 = facing the door / -v)
function put(ctx, fr, u, v, rot, parts, collide) {
  const [x, z] = fr.F(u, v); const r = fr.ry + rot;
  for (const [geo, mat, lx, ly, lz] of parts) { const c = Math.cos(r), s = Math.sin(r); ctx.geo(geo, mat, mat4(x + lx * c + lz * s, fr.y + ly, z - lx * s + lz * c, r)); }
  if (collide) { const [hw, hd] = collide; const c = Math.abs(Math.cos(r)), s = Math.abs(Math.sin(r)); const ex = hw * c + hd * s, ez = hw * s + hd * c; ctx.collider(x - ex, x + ex, z - ez, z + ez, 0, 2); }
  return [x, z];
}
const B = (w, h, d) => ubox(w, h, d);
const desk = (w = 1.6, d = 0.8) => [[B(w, 0.05, d), M('white'), 0, 0.74, 0], [B(0.05, 0.72, d), M('metalDark'), -w / 2 + 0.05, 0.37, 0], [B(0.05, 0.72, d), M('metalDark'), w / 2 - 0.05, 0.37, 0]];
const monitor = (x = 0, z = -0.2) => [[B(0.6, 0.36, 0.03), M('screen'), x, 1.02, z], [B(0.05, 0.25, 0.05), M('metalDark'), x, 0.86, z]];
const chair = () => [[B(0.5, 0.08, 0.5), M('fabricGrey'), 0, 0.48, 0], [B(0.5, 0.55, 0.06), M('fabricGrey'), 0, 0.8, 0.24], [ucyl(0.03, 0.03, 0.45, 6), M('metalDark'), 0, 0.23, 0]];
const plant = () => [[ucyl(0.25, 0.2, 0.5, 12), M('charcoal'), 0, 0.25, 0], [new THREE.IcosahedronGeometry(0.45, 1), M('leaf2'), 0, 0.95, 0]];
const sofa = (w = 2.2, mat = M('fabricBlue')) => [[B(w, 0.45, 0.9), mat, 0, 0.22, 0], [B(w, 0.5, 0.2), mat, 0, 0.65, 0.35], [B(0.2, 0.3, 0.9), mat, -w / 2 + 0.1, 0.55, 0], [B(0.2, 0.3, 0.9), mat, w / 2 - 0.1, 0.55, 0]];
const counter = (w, d = 0.9, h = 1.05, mat = M('white'), top = M('charcoal')) => [[B(w, h, d), mat, 0, h / 2, 0], [B(w + 0.05, 0.05, d + 0.1), top, 0, h + 0.02, 0]];
const shelf = (w = 2, h = 2) => { const p = [[B(w, h, 0.4), M('offwhite'), 0, h / 2, 0]]; for (let y = 0.4; y < h; y += 0.45) for (let i = 0; i < 5; i++) p.push([B(w / 6, 0.3, 0.3), [M('red'), M('fabricBlue'), M('yellow'), M('green'), M('orange')][(i + (y * 10 | 0)) % 5], -w / 2 + w / 10 + i * w / 5, y + 0.15, -0.06]); return p; };

// Builds the interior for each featured id. Returns { stations: [...], npcs: [...] }
export function furnish(ctx, f) {
  const fr = frame(f); const out = { stations: [], npcs: [] };
  const station = (id, u, v, label, action, radius = 2.2) => { const [x, z] = fr.F(u, v); out.stations.push({ id, x, z, label, action, radius, building: f.id }); return [x, z]; };
  const npc = (model, u, v, rot, role, talk) => { const [x, z] = fr.F(u, v); out.npcs.push({ model, x, z, y: fr.y, ry: fr.ry + rot, role, talk, building: f.id }); };
  const ring = (u, v) => { const [x, z] = fr.F(u, v); const m = new THREE.Mesh(new THREE.RingGeometry(0.75, 0.95, 40), new THREE.MeshBasicMaterial({ color: 0x8056f6, transparent: true, opacity: 0.8 })); m.rotation.x = -Math.PI / 2; m.position.set(x, fr.y + 0.03, z); ctx.scene.add(m); ctx.animated.push(t => { m.material.opacity = 0.45 + 0.35 * Math.sin(t * 3); }); };
  const wallSign = (text, u, v, h = 0.6, o = {}) => { const [x, z] = fr.F(u, v); sign(ctx, text, x, fr.y + 3.1, z, fr.ry + Math.PI, h, { bg: '#101A32', accent: '#8056F6', ...o }); };
  const { W, D } = fr;

  if (f.id === 'bank') {
    // banking hall: teller counters at the back, advisor desks, ATM wall, market screen, vault door
    put(ctx, fr, 0, D - 3, 0, counter(W * 0.6, 1, 1.15, M('limestone'), M('marble')), [W * 0.3, 0.6]);
    for (const u of [-W * 0.2, 0, W * 0.2]) { put(ctx, fr, u, D - 2.2, 0, [[B(1.6, 0.9, 0.04), M('glassClear'), 0, 1.6, 0]]); }
    npc('receptionist', -W * 0.2, D - 1.8, Math.PI, 'Teller · Sara', 'Welcome to Talentopia Central Bank. Deposits and withdrawals are here at the counter. For loans, please see our advisor at the desk on the left.');
    npc('doctor', W * 0.2, D - 1.8, Math.PI, 'Teller · Omar', 'Hello! Our loan advisor can show you how banks decide whether a loan is affordable.');
    // advisor desk (mission)
    put(ctx, fr, -W / 2 + 4, D * 0.45, Math.PI / 2, [...desk(1.8, 0.9), ...monitor(0, -0.25)], [0.9, 0.45]);
    put(ctx, fr, -W / 2 + 5.3, D * 0.45, Math.PI / 2, chair());
    npc('receptionist', -W / 2 + 2.9, D * 0.45, Math.PI / 2, 'Loan Advisor · Lina', null);
    station('bank_loan', -W / 2 + 5.4, D * 0.45, 'Loan Advisor desk · Press E to start a loan assessment', 'mission:bank'); ring(-W / 2 + 5.4, D * 0.45);
    // ATM wall
    for (let i = 0; i < 3; i++) put(ctx, fr, W / 2 - 0.5, 3 + i * 1.6, -Math.PI / 2, [[B(0.9, 1.7, 0.5), M('metalLight'), 0, 0.85, 0], [B(0.5, 0.35, 0.02), M('screen'), 0, 1.3, -0.26]], [0.45, 0.3]);
    // market data wall
    { const [x, z] = fr.F(W / 2 - 0.2, D * 0.55); const t = boardTex(['TLNT  ▲ 2.4%   142.10', 'BAYF  ▲ 0.8%    88.32', 'LDGR  ▼ 1.1%    23.75', 'MRDN  ▲ 3.0%   310.40'], { title: 'Capital Bay Markets', fg: '#78D8B5' });
      const s = new THREE.Mesh(new THREE.PlaneGeometry(5, 2.5), new THREE.MeshStandardMaterial({ map: t, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: 0.5 })); s.position.set(x, fr.y + 3, z); s.rotation.y = fr.ry - Math.PI / 2; ctx.scene.add(s); }
    // vault door
    { const [x, z] = fr.F(0, D - 0.25); const v = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 0.4, 40), M('metalLight')); v.rotation.x = Math.PI / 2; v.rotation.y = fr.ry; v.position.set(x, fr.y + 2.6, z); ctx.scene.add(v); }
    for (const u of [-W / 2 + 1.5, W / 2 - 1.5]) put(ctx, fr, u, 1.5, 0, plant(), [0.3, 0.3]);
    put(ctx, fr, W * 0.15, D * 0.4, 0, sofa(2.4, M('leather')), [1.2, 0.5]);
    wallSign('Loans & Advice', -W / 2 + 0.2, D * 0.45, 0.5);
  }
  if (f.id === 'agency') {
    put(ctx, fr, 0, D - 1, 0, [[B(6, 3, 0.1), M('screen'), 0, 2.2, 0]]);
    for (let i = 0; i < 3; i++) for (let k = 0; k < 2; k++) { put(ctx, fr, -8 + i * 8, 4 + k * 3.5, 0, [...desk(2.4, 1), ...monitor(-0.5), ...monitor(0.5)], [1.2, 0.5]); put(ctx, fr, -8 + i * 8, 4.8 + k * 3.5, 0, chair()); }
    put(ctx, fr, W / 2 - 2, D - 3, -Math.PI / 2, sofa(2.6, M('red')), [1.3, 0.5]);
    // mood boards
    for (let i = 0; i < 3; i++) { const [x, z] = fr.F(-W / 2 + 0.2, 3 + i * 3); const c = document.createElement('canvas'); c.width = 256; c.height = 192; const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, 256, 192);
      for (let k = 0; k < 6; k++) { g.fillStyle = ['#8056F6', '#51C9E8', '#F3A7B5', '#F3C679', '#78D8B5', '#101A32'][(k + i) % 6]; g.fillRect(12 + (k % 3) * 80, 12 + (k / 3 | 0) * 88, 70, 76); }
      const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; const m = new THREE.Mesh(new THREE.PlaneGeometry(2, 1.5), new THREE.MeshStandardMaterial({ map: t })); m.position.set(x, fr.y + 1.8, z); m.rotation.y = fr.ry + Math.PI / 2; ctx.scene.add(m); }
    npc('avatar_f2', 2, D - 2.5, Math.PI, 'Creative Director · Noor', null);
    station('agency_brief', 2, D - 4, 'Client brief · Press E to plan a campaign', 'mission:agency'); ring(2, D - 4);
  }
  if (f.id === 'engineering') {
    for (let i = 0; i < 3; i++) put(ctx, fr, -5 + i * 5, 5, 0, [[B(1.8, 0.05, 1.2), M('white'), 0, 0.95, 0], [B(0.08, 0.95, 0.08), M('metalDark'), -0.8, 0.47, 0], [B(0.08, 0.95, 0.08), M('metalDark'), 0.8, 0.47, 0]], [0.9, 0.6]);
    // bridge model on a test rig
    put(ctx, fr, 0, D - 5, 0, [[B(4, 0.9, 1.6), M('charcoal'), 0, 0.45, 0], [B(3.4, 0.08, 0.4), M('steel'), 0, 1.25, 0], [B(0.15, 0.4, 0.4), M('metalLight'), -1.6, 1.05, 0], [B(0.15, 0.4, 0.4), M('metalLight'), 1.6, 1.05, 0]], [2, 0.8]);
    // architectural model
    put(ctx, fr, 4, D - 9, 0, [[B(2, 0.8, 2), M('white'), 0, 0.4, 0], [B(0.4, 1.2, 0.4), M('offwhite'), -0.4, 1.4, 0], [B(0.5, 0.7, 0.5), M('offwhite'), 0.4, 1.15, 0.3], [B(0.3, 1.6, 0.3), M('glassClear'), 0.3, 1.6, -0.4]], [1, 1]);
    npc('doctor', 2.6, D - 5, Math.PI / 2, 'Structural Engineer · Karim', null);
    station('eng_bridge', 0, D - 3.6, 'Bridge test rig · Press E to run a stress test', 'mission:engineering'); ring(0, D - 3.6);
    put(ctx, fr, -5, D - 2, 0, [[B(3, 1.2, 0.1), M('screen'), 0, 1.8, 0]]);
  }
  if (f.id === 'software') {
    for (let r = 0; r < 3; r++) for (let c = 0; c < 2; c++) { put(ctx, fr, -4.5 + c * 9, 4 + r * 3.2, 0, [...desk(3, 0.9), ...monitor(-0.8), ...monitor(0), ...monitor(0.8)], [1.5, 0.5]); for (const k of [-0.8, 0.8]) put(ctx, fr, -4.5 + c * 9 + k, 4.7 + r * 3.2, 0, chair()); }
    for (let i = 0; i < 4; i++) put(ctx, fr, W / 2 - 0.6, D - 3 - i * 1.4, -Math.PI / 2, [[B(0.7, 2.1, 1.1), M('charcoal'), 0, 1.05, 0], [B(0.6, 1.8, 0.02), M('cyan'), 0, 1.05, -0.56]], [0.4, 0.6]);
    npc('avatar_m2', 0, D - 2.2, Math.PI, 'Engineering Lead · Daniel', null);
    station('code_bug', 0, D - 4, 'Incident desk · Press E to debug a login issue', 'mission:software'); ring(0, D - 4);
    put(ctx, fr, 0, D - 0.6, 0, [[B(5, 2.2, 0.1), M('screen'), 0, 2.4, 0]]);
  }
  if (f.id === 'kitchen') {
    // professional kitchen at the back, dining room at the front
    put(ctx, fr, 0, D - 1.2, 0, counter(W * 0.7, 0.9, 0.92, M('metalLight'), M('metalLight')), [W * 0.35, 0.5]);
    put(ctx, fr, 0, D - 4, 0, counter(8, 1.4, 0.92, M('metalLight'), M('metalLight')), [4, 0.7]);
    for (let i = 0; i < 4; i++) put(ctx, fr, -4.5 + i * 3, D - 1.2, 0, [[ucyl(0.25, 0.25, 0.25, 16), M('metalDark'), -0.4, 1.06, 0], [ucyl(0.2, 0.2, 0.18, 16), M('metalDark'), 0.4, 1.02, 0]]);
    put(ctx, fr, 0, D - 0.6, 0, [[B(W * 0.7, 0.8, 1.2), M('metalLight'), 0, 2.6, 0]]); // extraction hood
    for (let i = 0; i < 4; i++) for (let k = 0; k < 2; k++) put(ctx, fr, -9 + i * 6, 3 + k * 3.2, 0, [[ucyl(0.6, 0.6, 0.05, 20), M('white'), 0, 0.76, 0], [ucyl(0.06, 0.06, 0.74, 8), M('metalDark'), 0, 0.37, 0]], [0.6, 0.6]);
    npc('doctor', 0, D - 2.6, Math.PI, 'Head Chef · Rami', null);
    station('chef_recipe', 0, D - 5.4, 'Kitchen pass · Press E to start the lunch rush', 'mission:kitchen'); ring(0, D - 5.4);
  }
  if (f.id === 'store') {
    for (let i = 0; i < 3; i++) put(ctx, fr, -8 + i * 8, D - 6, 0, [...shelf(4, 1.8)], [2, 0.3]);
    for (let i = 0; i < 2; i++) put(ctx, fr, -6 + i * 12, D - 1, 0, shelf(6, 2.2), [3, 0.3]);
    for (let i = 0; i < 3; i++) put(ctx, fr, -6 + i * 6, 3.4, 0, [...counter(2, 0.8, 1, M('offwhite'), M('charcoal')), [B(0.4, 0.3, 0.05), M('screen'), 0.5, 1.25, 0]], [1, 0.4]);
    npc('receptionist', 0, 2.6, 0, 'Store Manager · Hana', null);
    station('store_queue', 3, 5.5, 'Store dashboard · Press E to fix the checkout queue', 'mission:store'); ring(3, 5.5);
  }
  if (f.id === 'court') {
    put(ctx, fr, 0, D - 2.5, 0, [[B(6, 1.4, 1.4), M('wood'), 0, 0.7, 0], [B(6.4, 0.08, 1.6), M('wood'), 0, 1.44, 0], [B(6, 0.6, 0.3), M('wood'), 0, 0.3 + 1.45, 0.5]], [3, 0.8]);
    for (let r = 0; r < 4; r++) for (const s of [-1, 1]) put(ctx, fr, s * 4.5, 3 + r * 1.8, 0, [[B(5, 0.45, 0.5), M('wood'), 0, 0.45, 0], [B(5, 0.6, 0.06), M('wood'), 0, 0.8, 0.25]], [2.5, 0.35]);
    put(ctx, fr, -5, D - 4.5, 0, [[B(1.6, 1.1, 1), M('wood'), 0, 0.55, 0]], [0.8, 0.5]);
    npc('doctor', 0, D - 2, Math.PI, 'Judge · Hon. Mansour', null);
    station('court_clause', 0, D - 5, 'Clerk’s desk · Press E to review a contract dispute', 'mission:court'); ring(0, D - 5);
    { const [x, z] = fr.F(0, D - 0.2); sign(ctx, '⚖  TALENTOPIA COURT', x, fr.y + 3.6, z, fr.ry + Math.PI, 0.7, { bg: '#3a2a1a', fg: '#f3e2b8' }); }
  }
  if (f.id === 'research') {
    for (let i = 0; i < 3; i++) put(ctx, fr, -4.5 + i * 4.5, 6, 0, [[B(3, 0.9, 1.2), M('white'), 0, 0.45, 0], [B(3.1, 0.05, 1.3), M('charcoal'), 0, 0.92, 0], [ucyl(0.08, 0.08, 0.3, 10), M('glassClear'), -0.6, 1.1, 0], [ucyl(0.12, 0.06, 0.25, 10), M('glassClear'), 0.4, 1.06, 0.2]], [1.5, 0.6]);
    for (let i = 0; i < 2; i++) put(ctx, fr, W / 2 - 1, D - 4 - i * 4, -Math.PI / 2, [[B(1.8, 2.4, 0.9), M('white'), 0, 1.2, 0], [B(1.6, 0.9, 0.04), M('glassClear'), 0, 1.4, -0.46]], [0.9, 0.5]);
    for (let i = 0; i < 4; i++) put(ctx, fr, -W / 2 + 1, 3 + i * 2.5, 0, plant(), [0.3, 0.3]);
    npc('receptionist', 0, D - 2.4, Math.PI, 'Process Engineer · Leila', null);
    station('lab_pressure', 0, D - 4, 'Pilot plant control panel · Press E to respond to an alarm', 'mission:research'); ring(0, D - 4);
    put(ctx, fr, 0, D - 0.6, 0, [[B(4, 1.6, 0.1), M('screen'), 0, 1.9, 0]]);
  }
  if (f.id === 'terminal') {
    for (let i = 0; i < 4; i++) put(ctx, fr, -18 + i * 9, D - 4, 0, [...counter(3.2, 0.9, 1.05, M('white'), M('charcoal')), [B(0.4, 0.3, 0.05), M('screen'), 0.6, 1.3, 0]], [1.6, 0.5]);
    for (let r = 0; r < 2; r++) for (let i = 0; i < 4; i++) put(ctx, fr, -15 + i * 10, 5 + r * 4, 0, [[B(4, 0.45, 0.55), M('fabricBlue'), 0, 0.45, 0], [B(4, 0.5, 0.08), M('fabricBlue'), 0, 0.85, 0.25]], [2, 0.35]);
    { const [x, z] = fr.F(0, D - 0.3); const t = boardTex(['TK101  LONDON     08:40  ON TIME', 'TK214  DUBAI      09:15  BOARDING', 'TK330  TOKYO      10:05  ON TIME', 'TK402  NEW YORK   11:30  DELAYED'], { title: 'Departures' });
      const s = new THREE.Mesh(new THREE.PlaneGeometry(8, 4), new THREE.MeshStandardMaterial({ map: t, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: 0.5 })); s.position.set(x, fr.y + 4.2, z); s.rotation.y = fr.ry + Math.PI; ctx.scene.add(s); }
    npc('doctor', -9, D - 2.8, Math.PI, 'Flight Operations · Captain Aziz', null);
    station('sky_weather', -9, D - 5.2, 'Flight operations desk · Press E for the pre-flight check', 'mission:terminal'); ring(-9, D - 5.2);
  }
  return out;
}
