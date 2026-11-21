// City layout: street grid, sidewalks, crosswalks, Central Plaza, monorail, navigation graph, traffic + pedestrian routes.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { M, mat4, ubox, ucyl, lampAt, treeAt, benchAt, planterAt, busStop, sign, signMat, glassMat, mass, bands, umbrellaTable } from './kit.js';

export const PITCH = 130, ROAD = 9, SIDE = 3.5, HALF = ROAD / 2 + SIDE; // street corridor half-width = 8
export const XS = [-325, -195, -65, 65, 195];   // north-south streets
export const ZS = [-195, -65, 65, 195];         // east-west streets
export const X0 = -325, X1 = 195, Z0 = -195, Z1 = 195;
export const BLOCK = PITCH - 2 * HALF;          // 114 m
export const CITY = { minX: -340, maxX: 420, minZ: -215, maxZ: 215 };

export function buildStreets(ctx) {
  // base ground (beyond the city: grass), city blocks paved / landscaped by the districts
  ctx.box(40, -0.2, 0, 4200, 0.2, 4200, M('meadow'), { shadow: false });
  // roadways
  const road = (x, z, w, d) => { ctx.box(x, 0, z, w, 0.02, d, M('asphalt'), { shadow: false }); };
  for (const z of ZS) road((X0 + X1) / 2, z, X1 - X0 + ROAD, ROAD);
  for (const x of XS) road(x, (Z0 + Z1) / 2, ROAD, Z1 - Z0 + ROAD);
  // lane markings per segment (between intersections)
  const marks = (x, z, len, alongX) => { const g = new THREE.PlaneGeometry(ROAD, len); const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setY(i, uv.getY(i) * len / 12);
    ctx.geo(g, M('roadLines'), mat4(x, 0.025, z, alongX ? Math.PI / 2 : 0, 1, 1, 1, -Math.PI / 2), false); };
  for (const z of ZS) for (let i = 0; i < XS.length - 1; i++) { const a = XS[i] + HALF + 3, b = XS[i + 1] - HALF - 3; marks((a + b) / 2, z, b - a, true); }
  for (const x of XS) for (let i = 0; i < ZS.length - 1; i++) { const a = ZS[i] + HALF + 3, b = ZS[i + 1] - HALF - 3; marks(x, (a + b) / 2, b - a, false); }
  // sidewalks: four corner-to-corner strips around every block + crosswalks at every intersection
  const walk = (x0, x1, z0, z1) => { ctx.box((x0 + x1) / 2, 0, (z0 + z1) / 2, x1 - x0, 0.15, z1 - z0, M('sidewalk'), { shadow: false }); ctx.floor(x0, x1, z0, z1, 0.15); };
  const curbs = (x0, x1, z0, z1) => ctx.box((x0 + x1) / 2, 0, (z0 + z1) / 2, x1 - x0, 0.16, z1 - z0, M('curb'), { shadow: false });
  for (const z of ZS) for (let i = 0; i < XS.length - 1; i++) {
    const a = XS[i] + ROAD / 2, b = XS[i + 1] - ROAD / 2;
    for (const s of [-1, 1]) { const zz0 = z + s * ROAD / 2, zz1 = z + s * HALF; walk(a, b, Math.min(zz0, zz1), Math.max(zz0, zz1)); curbs(a, b, z + s * (ROAD / 2 + 0.1) - 0.1, z + s * (ROAD / 2 + 0.1) + 0.1); }
  }
  for (const x of XS) for (let i = 0; i < ZS.length - 1; i++) {
    const a = ZS[i] + HALF, b = ZS[i + 1] - HALF;
    for (const s of [-1, 1]) { const xx0 = x + s * ROAD / 2, xx1 = x + s * HALF; walk(Math.min(xx0, xx1), Math.max(xx0, xx1), a, b); curbs(x + s * (ROAD / 2 + 0.1) - 0.1, x + s * (ROAD / 2 + 0.1) + 0.1, a, b); }
  }
  // outer stubs where streets end (keep pavement continuous at the grid edges)
  for (const x of XS) for (const z of ZS) {
    const zebra = (cx, cz, alongX) => { const g = new THREE.PlaneGeometry(ROAD - 1, 3); ctx.geo(g, M('zebra'), mat4(cx, 0.026, cz, alongX ? 0 : Math.PI / 2, 1, 1, 1, -Math.PI / 2), false); };
    if (x > X0) zebra(x - ROAD / 2 - 2, z, false); if (x < X1) zebra(x + ROAD / 2 + 2, z, false);
    if (z > Z0) zebra(x, z - ROAD / 2 - 2, true); if (z < Z1) zebra(x, z + ROAD / 2 + 2, true);
  }
  // street furniture: lamps + trees along every sidewalk (skip intersections)
  for (const z of ZS) for (let i = 0; i < XS.length - 1; i++) for (let x = XS[i] + 18; x < XS[i + 1] - 14; x += 26) {
    lampAt(ctx, x, z - ROAD / 2 - 0.7, 0); lampAt(ctx, x + 13, z + ROAD / 2 + 0.7, Math.PI);
    treeAt(ctx, x + 6.5, z - ROAD / 2 - 1.3, 0.9); treeAt(ctx, x + 19.5, z + ROAD / 2 + 1.3, 0.9);
  }
  for (const x of XS) for (let i = 0; i < ZS.length - 1; i++) for (let z = ZS[i] + 18; z < ZS[i + 1] - 14; z += 26) {
    lampAt(ctx, x - ROAD / 2 - 0.7, z, Math.PI / 2); lampAt(ctx, x + ROAD / 2 + 0.7, z + 13, -Math.PI / 2);
    treeAt(ctx, x - ROAD / 2 - 1.3, z + 6.5, 0.9); treeAt(ctx, x + ROAD / 2 + 1.3, z + 19.5, 0.9);
  }
  // street-name signs at a few intersections
  const names = { '-65': 'Talent Avenue', '65': 'Harbour Avenue', '-195': 'North Boulevard', '195': 'South Boulevard' };
  for (const z of ZS) for (const x of XS) if ((x + z) % 260 === 0) {
    const sx = x + HALF - 0.6, sz = z - HALF + 0.6; ctx.box(sx, 0, sz, 0.1, 3, 0.1, M('metalDark'));
    sign(ctx, names[z], sx, 3.1, sz + 0.06, 0, 0.35, { bg: '#1d5a3c', backing: false }); sign(ctx, names[z], sx, 3.1, sz - 0.06, Math.PI, 0.35, { bg: '#1d5a3c', backing: false });
  }
}

// Paved/landscaped block base at sidewalk height
export function blockBase(ctx, cx, cz, mat = M('plaza'), w = BLOCK, d = BLOCK) {
  ctx.box(cx, 0, cz, w, 0.15, d, mat, { shadow: false }); ctx.floor(cx - w / 2, cx + w / 2, cz - d / 2, cz + d / 2, 0.15);
}

// ------------------------------------------------------------------ Central Plaza (block 0,0)
export function buildPlaza(ctx) {
  const P = 0.75; // raised plaza with ramps on all four sides
  blockBase(ctx, 0, 0, M('plaza'));
  ctx.box(0, 0.15, 0, 70, P - 0.15, 70, M('plaza'), { shadow: false }); ctx.floor(-35, 35, -35, 35, P);
  for (const [ax, az] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) { // ramps 12 m wide, 8 m long
    const rx = ax * 39, rz = az * 39;
    const g = new THREE.BufferGeometry(); // wedge
    const L = 8, W = 12, h0 = 0.15, h1 = P;
    const pts = ax ? [[-L / 2, h1, -W / 2], [L / 2, h0, -W / 2], [L / 2, h0, W / 2], [-L / 2, h1, W / 2]] : [[-W / 2, h1, -L / 2], [W / 2, h1, -L / 2], [W / 2, h0, L / 2], [-W / 2, h0, L / 2]];
    const sgn = ax || az; if (sgn < 0) pts.forEach(p => { if (ax) p[0] = -p[0]; else p[2] = -p[2]; });
    const v = [...pts[0], ...pts[1], ...pts[2], ...pts[0], ...pts[2], ...pts[3]];
    g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 2, 0, 2, 3, 0, 0, 2, 3, 0, 3], 2)); g.computeVertexNormals();
    if (g.attributes.normal.getY(0) < 0) { const idx = [...pts[0], ...pts[2], ...pts[1], ...pts[0], ...pts[3], ...pts[2]]; g.setAttribute('position', new THREE.Float32BufferAttribute(idx, 3)); g.computeVertexNormals(); }
    ctx.geo(g, M('plaza'), mat4(rx, 0, rz), false);
    if (ax) ctx.floor(rx - L / 2, rx + L / 2, rz - W / 2, rz + W / 2, 0, { axis: 'x', from: rx + ax * L / 2, to: rx - ax * L / 2, h0, h1 });
    else ctx.floor(rx - W / 2, rx + W / 2, rz - L / 2, rz + L / 2, 0, { axis: 'z', from: rz + az * L / 2, to: rz - az * L / 2, h0, h1 });
    // low walls beside the ramps
    for (const s of [-1, 1]) { const wx = ax ? rx : rx + s * (W / 2 + 0.3), wz = ax ? rz + s * (W / 2 + 0.3) : rz; ctx.box(wx, 0.15, wz, ax ? L : 0.5, P - 0.1, ax ? 0.5 : L, M('limestone'), { collide: true }); }
  }
  // plaza edge walls where there are no ramps
  for (const s of [-1, 1]) for (const k of [-1, 1]) {
    ctx.box(s * 35.25, 0.15, k * 20.5, 0.5, P, 29, M('limestone'), { collide: true }); ctx.box(k * 20.5, 0.15, s * 35.25, 29, P, 0.5, M('limestone'), { collide: true });
  }
  // Talentopia Tower (Blender landmark, streamed as GLB) north of the fountain
  const T = { x: 0, z: -20 };
  ctx.landmark('talentopia_tower', T.x, P, T.z, 0, { w: 30, d: 30, h: 150, name: 'Talentopia Tower', district: 'plaza', color: '#8D70FF', collide: false }); // City Hall (cityhall.js) adds the walk-in lobby walls
  // fountain
  const F = { x: 0, z: 8 };
  ctx.geo(ucyl(9, 9.3, 0.7, 48), M('limestone'), mat4(F.x, P + 0.35, F.z));
  ctx.geo(new THREE.CylinderGeometry(8.4, 8.4, 0.1, 48), M('water'), mat4(F.x, P + 0.62, F.z), false);
  ctx.geo(ucyl(1.2, 1.8, 2.4, 24), M('limestone'), mat4(F.x, P + 1.2, F.z));
  const jets = new THREE.Group(); const jm = new THREE.MeshStandardMaterial({ color: 0xdff3ff, transparent: true, opacity: 0.55, roughness: 0.1 });
  for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; const j = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.12, 2.4, 6), jm); j.position.set(F.x + Math.cos(a) * 5.5, P + 1.6, F.z + Math.sin(a) * 5.5); jets.add(j); }
  ctx.scene.add(jets); ctx.animated.push(t => jets.children.forEach((j, i) => { j.scale.y = 0.75 + 0.3 * Math.sin(t * 3 + i); }));
  ctx.collider(F.x - 9, F.x + 9, F.z - 9, F.z + 9, 0, 2);
  // landscaping: lawns with trees, benches, planters
  for (const [lx, lz] of [[-24, 24], [24, 24], [-24, -6], [24, -6]]) {
    ctx.box(lx, P, lz, 14, 0.12, 14, M('grass'), { shadow: false });
    ctx.box(lx, P, lz, 14.6, 0.35, 0.3, M('limestone')); // low edging hints
    treeAt(ctx, lx - 3, lz - 3, 1.1, P); treeAt(ctx, lx + 3.5, lz + 2.5, 1.0, P); ctx.collider(lx - 7, lx + 7, lz - 7, lz + 7, 0, 0.5);
    benchAt(ctx, lx, lz + (lz > 0 ? -8.4 : 8.4), lz > 0 ? Math.PI : 0);
  }
  // outer plaza ring (between the raised plaza and the streets): tree groves, lawns, café pavilion, seating
  for (const [gx, gz] of [[-46, -46], [46, -46], [-46, 46], [46, 46]]) {
    ctx.box(gx, 0.15, gz, 18, 0.1, 18, M('grass'), { shadow: false });
    for (const [tx, tz] of [[-5, -5], [5, -4], [-4, 5], [5, 5], [0, 0]]) treeAt(ctx, gx + tx, gz + tz, 1.05 + ((tx + tz) & 1) * 0.15, 0.15);
    benchAt(ctx, gx + (gx < 0 ? 10.5 : -10.5), gz, gx < 0 ? -Math.PI / 2 : Math.PI / 2);
  }
  for (let t = -26; t <= 26; t += 9) for (const s of [-1, 1]) { // avenues of trees along the ring
    if (Math.abs(t) < 9) continue; treeAt(ctx, t, s * 50, 0.95, 0.15); treeAt(ctx, s * 50, t, 0.95, 0.15);
    planterAt(ctx, t + 4.5, s * 44.5, 2.4, 1); planterAt(ctx, s * 44.5, t + 4.5, 1, 2.4);
  }
  // café pavilion (glass + timber roof) with terrace
  ctx.box(-46, 0.15, 24, 12, 3.2, 8, M('glassClear'), { shadow: false, collide: true });
  ctx.box(-46, 3.35, 24, 13.5, 0.35, 9.5, M('wood'));
  for (const [cx, cz] of [[-52.4, 20.4], [-39.6, 20.4], [-52.4, 27.6], [-39.6, 27.6]]) ctx.box(cx, 0.15, cz, 0.25, 3.2, 0.25, M('metalDark'));
  ctx.box(-46, 0.15, 25.5, 8, 1.05, 0.7, M('wood')); sign(ctx, 'Plaza Café', -46, 2.8, 19.95, Math.PI, 0.45, { bg: '#101A32', accent: '#F3C679', backing: false });
  for (let i = 0; i < 4; i++) umbrellaTable(ctx, -51 + i * 3.4, 14, ['#F5F7FB', '#C8B8F4', '#F5F7FB', '#51C9E8'][i]);
  // seating steps + sculpture on the raised plaza
  for (const s of [-1, 1]) { ctx.box(s * 22, P, -2, 10, 0.45, 1.2, M('wood'), { collide: true }); ctx.box(s * 22, P, 14, 10, 0.45, 1.2, M('wood'), { collide: true }); }
  ctx.geo(new THREE.TorusGeometry(2.2, 0.35, 16, 48), M('metalLight'), mat4(-14, P + 3.2, 26, 0.6)); ctx.box(-14, P, 26, 1.2, 1, 1.2, M('limestone'), { collide: true });
  // holographic information panels (subtle, additive, slowly turning)
  const holo = (x, z, lines, phase) => {
    const c = document.createElement('canvas'); c.width = 512; c.height = 320; const g = c.getContext('2d'); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 2), new THREE.MeshBasicMaterial({ map: t, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    m.position.set(x, P + 2.6, z); ctx.scene.add(m);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.55, 0.5, 24), M('metalLight')); base.position.set(x, P + 0.25, z); ctx.scene.add(base);
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.05, 1.3, 24, 1, true), new THREE.MeshBasicMaterial({ color: 0x42dbff, transparent: true, opacity: 0.18, blending: THREE.AdditiveBlending, depthWrite: false })); beam.position.set(x, P + 1.1, z); ctx.scene.add(beam);
    ctx.collider(x - 0.6, x + 0.6, z - 0.6, z + 0.6, 0, 3);
    let last = -1;
    ctx.animated.push(time => { m.rotation.y = phase + time * 0.15; m.position.y = P + 2.6 + Math.sin(time + phase) * 0.06;
      const k = Math.floor(time / 5 + phase) % lines.length; if (k === last) return; last = k; const [title, sub, body] = lines[k];
      g.clearRect(0, 0, 512, 320); g.strokeStyle = 'rgba(66,219,255,0.9)'; g.lineWidth = 3; g.strokeRect(6, 6, 500, 308);
      g.fillStyle = 'rgba(66,219,255,0.10)'; g.fillRect(6, 6, 500, 308); g.fillStyle = 'rgba(66,219,255,0.95)'; g.font = '700 22px Plus Jakarta Sans, Arial'; g.fillText(sub, 28, 52);
      g.fillStyle = '#F6F8FC'; g.font = '800 42px Plus Jakarta Sans, Arial'; g.fillText(title, 28, 112); g.font = '500 22px Plus Jakarta Sans, Arial'; g.fillStyle = 'rgba(246,248,252,0.85)';
      body.forEach((l, i) => g.fillText(l, 28, 166 + i * 34)); g.fillStyle = 'rgba(141,112,255,0.9)'; g.fillRect(28, 280, 140, 6); t.needsUpdate = true; });
  };
  holo(-9, 30, [['MedCity', 'DISTRICT · NORTH-WEST', ['General Hospital · Heart Lab', 'Triage · Pharmacy · Med School']], ['Capital Bay', 'DISTRICT · NORTH', ['Central Bank · HQ tower', 'Loans · Markets · Exchange']], ['Creative Quarter', 'DISTRICT · NORTH-EAST', ['Pulse Agency · Media studio', 'Design · Fashion · Campaigns']]], 0.3);
  holo(9, 30, [['Skyport', 'DISTRICT · EAST', ['Terminal · Control tower', 'Flight ops · Load control']], ['Civic Square', 'DISTRICT · SOUTH-EAST', ['Courthouse · University', 'Law · Education · Society']], ['Planet Lab', 'DISTRICT · WEST', ['Research institute · Biodomes', 'Energy · Chemistry · Climate']]], 2.1);
  // information kiosk with a city map
  ctx.box(12, P, 18, 1.6, 2.4, 0.4, M('navy'), { collide: true });
  sign(ctx, 'City map · Press M', 12, P + 1.6, 18.22, 0, 0.32, { bg: '#101A32', accent: '#51C9E8', backing: false });
  return { spawn: { x: 0, z: 26, ry: Math.PI }, P };
}

// ------------------------------------------------------------------ monorail (elevated loop) with a station at the plaza
export const RAIL = { x0: -195, x1: 195, z0: -65, z1: 65, h: 9, offset: 0 };
export function buildMonorail(ctx) {
  const { x0, x1, z0, z1, h } = RAIL; const beam = M('white');
  const seg = (ax, az, bx, bz) => { const len = Math.hypot(bx - ax, bz - az); const ry = Math.atan2(bx - ax, bz - az);
    ctx.geo(ubox(1.2, 1.4, len + 1.2), beam, mat4((ax + bx) / 2, h - 0.7, (az + bz) / 2, ry));
    const n = Math.floor(len / 26); for (let i = 1; i < n; i++) { const t = i / n, px = ax + (bx - ax) * t, pz = az + (bz - az) * t;
      ctx.geo(ucyl(0.45, 0.55, h - 1.4, 12), M('concrete'), mat4(px, (h - 1.4) / 2, pz)); ctx.collider(px - 0.6, px + 0.6, pz - 0.6, pz + 0.6, 0, h); } };
  seg(x0, z0, x1, z0); seg(x1, z0, x1, z1); seg(x1, z1, x0, z1); seg(x0, z1, x0, z0);
  // station on Talent Avenue in front of the plaza
  const sx = 0, sz = z0;
  ctx.box(sx, h - 1.6, sz + 4, 34, 0.4, 6, M('concrete'));
  ctx.geo(ubox(36, 0.3, 10), M('glassClear'), mat4(sx, h + 4.2, sz + 2, 0), false);
  for (const px of [-16, 0, 16]) for (const pz of [sz - 3, sz + 7]) { ctx.geo(ucyl(0.3, 0.3, h + 4, 10), M('metalLight'), mat4(sx + px, (h + 4) / 2, pz)); ctx.collider(sx + px - 0.4, sx + px + 0.4, pz - 0.4, pz + 0.4, 0, h + 4); }
  sign(ctx, 'Central Station · Monorail', sx, h + 2.6, sz + 7.1, 0, 0.6, { bg: '#101A32', accent: '#8056F6' });
  // train
  const train = new THREE.Group(); const cars = 3;
  const bodyM = new THREE.MeshPhysicalMaterial({ color: 0xf5f7fb, metalness: 0.3, roughness: 0.25, clearcoat: 1 });
  for (let i = 0; i < cars; i++) {
    const c = new THREE.Mesh(new THREE.CapsuleGeometry(1.35, 10, 6, 16), bodyM); c.rotation.x = Math.PI / 2; c.position.z = -i * 12.6; c.scale.set(1, 1, 0.95); c.castShadow = true; train.add(c);
    const w = new THREE.Mesh(new THREE.CapsuleGeometry(1.38, 8.5, 4, 16, 1), M('charcoal')); w.rotation.x = Math.PI / 2; w.position.set(0, 0.35, -i * 12.6); w.scale.set(1.0, 0.45, 1); train.add(w);
    const s = new THREE.Mesh(new THREE.BoxGeometry(2.76, 0.18, 11), M('violet')); s.position.set(0, -0.5, -i * 12.6); train.add(s);
  }
  ctx.scene.add(train);
  const per = 2 * (x1 - x0) + 2 * (z1 - z0);
  const at = (s) => { s = ((s % per) + per) % per; const L1 = x1 - x0, L2 = z1 - z0;
    if (s < L1) return [x0 + s, z0, Math.PI / 2]; s -= L1; if (s < L2) return [x1, z0 + s, 0]; s -= L2; if (s < L1) return [x1 - s, z1, -Math.PI / 2]; s -= L1; return [x0, z1 - s, Math.PI]; };
  let s = 200, v = 0, dwell = 0;
  ctx.animated.push((t, dt) => {
    // stop at the station
    const stationS = (0 - x0); const d = ((stationS - s) % per + per) % per;
    let target = 14; if (d < 40) target = Math.max(0, d * 0.35); if (dwell > 0) { dwell -= dt; target = 0; if (dwell <= 0) s += 0.5; } else if (d < 0.6 && v < 0.5) dwell = 6;
    v += (target - v) * Math.min(1, dt * 0.8); s += v * dt;
    for (let i = 0; i < cars; i++) { const [px, pz, ry] = at(s - i * 12.6); const c = train.children; for (let k = 0; k < 3; k++) { const o = c[i * 3 + k]; o.position.set(px, h + 0.9 + (k === 2 ? -0.5 : k === 1 ? 0.35 : 0), pz); o.rotation.set(Math.PI / 2, 0, 0); o.rotation.order = 'YXZ'; o.rotation.y = ry; } }
  });
}

// ------------------------------------------------------------------ navigation graph (sidewalk corners + crosswalks)
export function buildNav() {
  const C = 7.0; const nodes = []; const idx = new Map();
  const key = (x, z) => x.toFixed(1) + ',' + z.toFixed(1);
  const add = (x, z) => { const k = key(x, z); if (!idx.has(k)) { idx.set(k, nodes.length); nodes.push({ x, z, e: [] }); } return idx.get(k); };
  const link = (a, b) => { const d = Math.hypot(nodes[a].x - nodes[b].x, nodes[a].z - nodes[b].z); nodes[a].e.push([b, d]); nodes[b].e.push([a, d]); };
  for (const x of XS) for (const z of ZS) {
    const c = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([sx, sz]) => add(x + sx * C, z + sz * C));
    for (let i = 0; i < 4; i++) link(c[i], c[(i + 1) % 4]); // crosswalks around the intersection
  }
  for (const z of ZS) for (let i = 0; i < XS.length - 1; i++) for (const s of [-1, 1]) link(idx.get(key(XS[i] + C, z + s * C)), idx.get(key(XS[i + 1] - C, z + s * C)));
  for (const x of XS) for (let i = 0; i < ZS.length - 1; i++) for (const s of [-1, 1]) link(idx.get(key(x + s * C, ZS[i] + C)), idx.get(key(x + s * C, ZS[i + 1] - C)));
  return { nodes, add, link };
}
// project a point onto the nearest sidewalk line; returns {x,z, a, b} (a,b = node ids of that sidewalk edge)
export function nearestSidewalk(nav, x, z) {
  let best = null;
  for (let a = 0; a < nav.nodes.length; a++) for (const [b] of nav.nodes[a].e) {
    if (b < a) continue; const A = nav.nodes[a], B = nav.nodes[b];
    const dx = B.x - A.x, dz = B.z - A.z, L2 = dx * dx + dz * dz || 1; let t = ((x - A.x) * dx + (z - A.z) * dz) / L2; t = Math.max(0, Math.min(1, t));
    const px = A.x + dx * t, pz = A.z + dz * t, d = Math.hypot(px - x, pz - z);
    if (!best || d < best.d) best = { x: px, z: pz, a, b, d };
  }
  return best;
}
export function findPath(nav, sx, sz, tx, tz) {
  const s = nearestSidewalk(nav, sx, sz), t = nearestSidewalk(nav, tx, tz);
  if (!s || !t) return [{ x: tx, z: tz }];
  const N = nav.nodes; const dist = new Array(N.length).fill(Infinity), prev = new Array(N.length).fill(-1); const open = new Set();
  const h = (i) => Math.abs(N[i].x - t.x) + Math.abs(N[i].z - t.z);
  for (const i of [s.a, s.b]) { dist[i] = Math.hypot(N[i].x - s.x, N[i].z - s.z); open.add(i); }
  const goals = new Set([t.a, t.b]); let end = -1;
  while (open.size) {
    let u = -1, bu = Infinity; for (const i of open) { const f = dist[i] + h(i); if (f < bu) { bu = f; u = i; } }
    open.delete(u); if (goals.has(u)) { end = u; break; }
    for (const [v, w] of N[u].e) if (dist[u] + w < dist[v]) { dist[v] = dist[u] + w; prev[v] = u; open.add(v); }
  }
  const pts = [{ x: s.x, z: s.z }];
  if (end >= 0 && !(s.a === t.a && s.b === t.b)) { const chain = []; for (let i = end; i >= 0; i = prev[i]) chain.unshift({ x: N[i].x, z: N[i].z }); pts.push(...chain); }
  pts.push({ x: t.x, z: t.z }, { x: tx, z: tz });
  return pts;
}

// ------------------------------------------------------------------ traffic routes (right-hand lanes, loops with rounded corners)
export function laneLoop(x0, x1, z0, z1, clockwise) {
  const o = 2.25; // lane offset from centreline (drive on the right)
  // clockwise seen from above (north = -z): north side heading +x, east side +z, south -x, west -z
  let pts = clockwise ? [[x0, z0], [x1, z0], [x1, z1], [x0, z1]] : [[x0, z0], [x0, z1], [x1, z1], [x1, z0]];
  const out = [];
  for (let i = 0; i < 4; i++) {
    const [ax, az] = pts[i], [bx, bz] = pts[(i + 1) % 4]; const dx = Math.sign(bx - ax), dz = Math.sign(bz - az);
    const rx = -dz, rz = dx; // right-hand normal of travel direction (x right, z down): right of (dx,dz) is (-dz, dx)
    out.push([ax + rx * o, az + rz * o], [bx + rx * o, bz + rz * o]);
  }
  return out;
}
export function polyline(pts) { // closed polyline with cumulative lengths + sampler
  const segs = []; let L = 0;
  for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; const l = Math.hypot(b[0] - a[0], b[1] - a[1]); if (l < 0.01) continue; segs.push({ a, b, l, s: L }); L += l; }
  return { L, at(s) { s = ((s % L) + L) % L; let lo = 0, hi = segs.length - 1; while (lo < hi) { const m = (lo + hi + 1) >> 1; if (segs[m].s <= s) lo = m; else hi = m - 1; }
    const g = segs[lo], t = (s - g.s) / g.l; return [g.a[0] + (g.b[0] - g.a[0]) * t, g.a[1] + (g.b[1] - g.a[1]) * t, Math.atan2(g.b[0] - g.a[0], g.b[1] - g.a[1])]; } };
}
export const ROUTES = [laneLoop(-195, 195, -65, 65, true), laneLoop(-325, 195, -195, 195, false), laneLoop(-65, 65, -195, 195, true), laneLoop(-325, -195, -195, 195, true), laneLoop(65, 195, -195, 195, false)];

// pedestrian sidewalk loop around a block (centre cx,cz)
export function blockLoop(cx, cz, inset = 58.0) { return [[cx - inset, cz - inset], [cx + inset, cz - inset], [cx + inset, cz + inset], [cx - inset, cz + inset]]; }

// ------------------------------------------------------------------ traffic signals (cars obey them) + street furniture
export const SIGNAL = { cycle: 24, state(axis, t) { const c = t % 24; if (axis === 'ew') return c < 10 ? 'g' : c < 12 ? 'a' : 'r'; return c >= 12 && c < 22 ? 'g' : c >= 22 ? 'a' : 'r'; } };
export function buildSignals(ctx) {
  const lamp = (hex) => new THREE.MeshStandardMaterial({ color: 0x222222, emissive: hex, emissiveIntensity: 0, roughness: 0.4 });
  const L = { ew: { r: lamp(0xff2a1a), a: lamp(0xffb000), g: lamp(0x22ff66) }, ns: { r: lamp(0xff2a1a), a: lamp(0xffb000), g: lamp(0x22ff66) } };
  const sph = new THREE.SphereGeometry(0.11, 10, 8);
  const head = (x, z, ry, axis) => { // housing faces direction ry (toward the approaching driver)
    ctx.geo(ubox(0.36, 1.0, 0.25), M('charcoal'), mat4(x, 3.3, z, ry));
    ['r', 'a', 'g'].forEach((k, i) => ctx.geo(sph, L[axis][k], mat4(x + Math.sin(ry) * 0.14, 3.62 - i * 0.32, z + Math.cos(ry) * 0.14, ry), false));
  };
  for (const x of XS) for (const z of ZS) {
    const o = ROAD / 2 + 0.7;
    for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
      const px = x + sx * o, pz = z + sz * o; ctx.box(px, 0.15, pz, 0.14, 3.0, 0.14, M('metalDark')); ctx.collider(px - 0.12, px + 0.12, pz - 0.12, pz + 0.12, 0, 3);
      // right-hand traffic: the head on the far-right corner faces the oncoming cars of each axis
      head(px, pz, sz > 0 ? 0 : Math.PI, 'ns'); head(px, pz, sx > 0 ? Math.PI / 2 : -Math.PI / 2, 'ew');
    }
  }
  ctx.animated.push(t => { for (const ax of ['ew', 'ns']) { const st = SIGNAL.state(ax, t); for (const k of ['r', 'a', 'g']) L[ax][k].emissiveIntensity = st === k ? 2.2 : 0; } });
  // bollards, bins, hydrants and bike racks
  const bollard = (x, z) => ctx.inst.add('bollard', () => { const g = new THREE.CylinderGeometry(0.1, 0.12, 0.9, 10); g.translate(0, 0.45, 0); const c = new THREE.CylinderGeometry(0.105, 0.105, 0.06, 10); c.translate(0, 0.75, 0); return [[g, M('charcoal')], [c, M('metalLight')]]; }, mat4(x, 0.15, z));
  const bin = (x, z) => { ctx.inst.add('bin', () => { const g = new THREE.CylinderGeometry(0.28, 0.25, 0.95, 14); g.translate(0, 0.47, 0); const l = new THREE.CylinderGeometry(0.3, 0.3, 0.06, 14); l.translate(0, 0.97, 0); return [[g, M('navy')], [l, M('metalLight')]]; }, mat4(x, 0.15, z)); ctx.collider(x - 0.3, x + 0.3, z - 0.3, z + 0.3, 0, 1); };
  const hydrant = (x, z) => ctx.inst.add('hydrant', () => { const g = new THREE.CylinderGeometry(0.13, 0.16, 0.7, 10); g.translate(0, 0.35, 0); const t = new THREE.SphereGeometry(0.14, 10, 6); t.translate(0, 0.72, 0); return [[mergeGeometries([g.toNonIndexed(), t.toNonIndexed()]), M('red')]]; }, mat4(x, 0.15, z));
  for (const x of XS) for (const z of ZS) {
    for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
      for (let i = 0; i < 3; i++) { bollard(x + sx * (ROAD / 2 + 0.45), z + sz * (ROAD / 2 + 2.2 + i * 1.1)); bollard(x + sx * (ROAD / 2 + 2.2 + i * 1.1), z + sz * (ROAD / 2 + 0.45)); }
    }
    if ((x + z) % 260 === 0) hydrant(x + HALF - 1.2, z + ROAD / 2 + 3.5);
    bin(x - HALF + 1.0, z - ROAD / 2 - 3.6);
  }
  for (const [x, z] of [[-30, 36], [30, 36], [-36, -30], [36, -30]]) for (let i = 0; i < 4; i++) ctx.inst.add('bikerack', () => { const g = new THREE.TorusGeometry(0.4, 0.03, 6, 16, Math.PI); g.translate(0, 0.0, 0); return [[g, M('metalLight')]]; }, mat4(x + i * 0.8, 0.75, z, Math.PI / 2));
}
// ------------------------------------------------------------------ horizon: rolling hills + far mountains (fogged)
export function buildBackdrop(ctx) {
  const ring = (r0, r1, hMin, hMax, seg, color, seed) => {
    const g = new THREE.RingGeometry(r0, r1, seg, 6); const p = g.attributes.position; const rr = (a, b) => Math.sin(a * 3.1 + seed) * 0.5 + Math.sin(a * 7.3 + seed * 2) * 0.3 + Math.sin(a * 13.7 + seed * 3) * 0.2;
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i); const a = Math.atan2(y, x), d = Math.hypot(x, y); const t = (d - r0) / (r1 - r0); const hgt = Math.sin(Math.PI * Math.min(1, t * 1.2)) * (hMin + (hMax - hMin) * (0.5 + 0.5 * rr(a))); p.setZ(i, hgt); }
    g.computeVertexNormals(); const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color, roughness: 1, flatShading: false })); m.rotation.x = -Math.PI / 2; m.position.set(40, -0.3, 0); m.receiveShadow = false; ctx.scene.add(m);
  };
  ring(950, 1500, 25, 90, 160, 0x6f8f55, 1.3);   // green hills
  ring(1700, 2300, 120, 320, 120, 0x7f93a6, 4.1); // distant blue-grey mountains
}
