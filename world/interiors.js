// Interior furnishing for featured buildings: finished rooms (linings, feature walls, lighting, rugs), furniture, three hands-on
// workstations per building, a careers board, standing + seated professional NPCs and seats the player can sit at.
import * as THREE from 'three';
import { M, mat4, ubox, ucyl, sign, glassMat } from './kit.js';
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
  return { F, ry, y, W, D, H: r.roomH || ((r.gfH || 5) - 0.4) };
}
function put(ctx, fr, u, v, rot, parts, collide) {
  const [x, z] = fr.F(u, v); const r = fr.ry + rot;
  for (const [geo, mat, lx, ly, lz] of parts) { const c = Math.cos(r), s = Math.sin(r); ctx.geo(geo, mat, mat4(x + lx * c + lz * s, fr.y + ly, z - lx * s + lz * c, r)); }
  if (collide) { const [hw, hd] = collide; const c = Math.abs(Math.cos(r)), s = Math.abs(Math.sin(r)); const ex = hw * c + hd * s, ez = hw * s + hd * c; ctx.collider(x - ex, x + ex, z - ez, z + ez, 0, 2); }
  return [x, z];
}
const B = (w, h, d) => ubox(w, h, d);
const desk = (w = 1.6, d = 0.8, top = M('white')) => [[B(w, 0.05, d), top, 0, 0.74, 0], [B(0.05, 0.72, d), M('metalDark'), -w / 2 + 0.05, 0.37, 0], [B(0.05, 0.72, d), M('metalDark'), w / 2 - 0.05, 0.37, 0], [B(w - 0.1, 0.4, 0.03), M('metalDark'), 0, 0.5, -d / 2 + 0.05]];
const monitor = (x = 0, z = -0.2) => [[B(0.62, 0.38, 0.03), M('screen'), x, 1.03, z], [B(0.05, 0.22, 0.05), M('metalDark'), x, 0.85, z], [B(0.25, 0.02, 0.18), M('metalDark'), x, 0.76, z]];
const laptop = (x = 0, z = 0) => [[B(0.36, 0.02, 0.25), M('metalLight'), x, 0.77, z], [B(0.36, 0.24, 0.02), M('screen'), x, 0.89, z - 0.12]];
const chair = (mat = M('fabricGrey')) => [[B(0.5, 0.08, 0.5), mat, 0, 0.48, 0], [B(0.5, 0.55, 0.06), mat, 0, 0.8, 0.24], [ucyl(0.03, 0.03, 0.45, 6), M('metalDark'), 0, 0.23, 0], [ucyl(0.28, 0.28, 0.03, 10), M('metalDark'), 0, 0.03, 0]];
const plant = (s = 1) => [[ucyl(0.25 * s, 0.2 * s, 0.5 * s, 12), M('charcoal'), 0, 0.25 * s, 0], [new THREE.IcosahedronGeometry(0.45 * s, 1), M('leaf2'), 0, 0.95 * s, 0], [new THREE.IcosahedronGeometry(0.32 * s, 1), M('leaf'), 0.15 * s, 1.3 * s, 0.1 * s]];
const sofa = (w = 2.2, mat = M('fabricBlue')) => [[B(w, 0.45, 0.9), mat, 0, 0.22, 0], [B(w, 0.5, 0.2), mat, 0, 0.65, 0.35], [B(0.2, 0.3, 0.9), mat, -w / 2 + 0.1, 0.55, 0], [B(0.2, 0.3, 0.9), mat, w / 2 - 0.1, 0.55, 0]];
const counter = (w, d = 0.9, h = 1.05, mat = M('white'), top = M('charcoal')) => [[B(w, h, d), mat, 0, h / 2, 0], [B(w + 0.05, 0.05, d + 0.1), top, 0, h + 0.02, 0]];
const shelf = (w = 2, h = 2) => { const p = [[B(w, h, 0.4), M('offwhite'), 0, h / 2, 0]]; for (let y = 0.4; y < h; y += 0.45) for (let i = 0; i < 5; i++) p.push([B(w / 6, 0.3, 0.3), [M('red'), M('fabricBlue'), M('yellow'), M('green'), M('orange')][(i + (y * 10 | 0)) % 5], -w / 2 + w / 10 + i * w / 5, y + 0.15, -0.06]); return p; };
const table = (r = 0.6, h = 0.75) => [[ucyl(r, r, 0.05, 20), M('wood'), 0, h, 0], [ucyl(0.06, 0.06, h - 0.02, 8), M('metalDark'), 0, h / 2, 0], [ucyl(0.3, 0.3, 0.03, 12), M('metalDark'), 0, 0.02, 0]];
const kiosk = (scr = M('screen')) => [[B(0.6, 1.1, 0.4), M('charcoal'), 0, 0.55, 0], [B(0.75, 0.5, 0.06), scr, 0, 1.35, -0.1]];
const rug = (w, d, mat) => [[B(w, 0.012, d), mat, 0, 0.035, 0]];

const accentMats = {};
const accent = (hex) => accentMats[hex] || (accentMats[hex] = new THREE.MeshStandardMaterial({ color: hex, roughness: 0.6 }));

// careers shown on each building's careers board
export const CAREERS = {
  hospital: { title: 'Careers at MedCity General Hospital', roles: [['Doctor (physician)', 'Diagnoses and treats patients. Medical degree, then residency.'], ['Nurse', 'Cares for patients around the clock. Nursing degree + licence.'], ['Pharmacist', 'Checks and supplies medicines safely. Pharmacy degree.'], ['Radiographer', 'Takes X-ray, CT and MRI scans. Radiography degree.'], ['Biomedical scientist', 'Analyses samples in the lab. Biomedical science degree.']] },
  bank: { title: 'Careers at Talentopia Central Bank', roles: [['Credit analyst', 'Decides whether loans are affordable and safe.'], ['Financial advisor', 'Helps clients plan savings and investments.'], ['Teller / customer advisor', 'Handles everyday banking for customers.'], ['Risk manager', 'Measures and limits what could go wrong.'], ['Compliance officer', 'Makes sure the bank follows the law.']] },
  agency: { title: 'Careers at Pulse Advertising Agency', roles: [['Marketing strategist', 'Turns business goals into campaign plans.'], ['Art director', 'Leads the visual look of campaigns.'], ['Copywriter', 'Writes headlines, scripts and slogans.'], ['Media planner', 'Chooses where ads run and spends the budget.'], ['Data / insights analyst', 'Measures what worked and why.']] },
  engineering: { title: 'Careers at Atlas Engineering & Architecture', roles: [['Structural engineer', 'Makes sure buildings and bridges stand safely.'], ['Architect', 'Designs buildings people love to use.'], ['Civil engineer', 'Plans roads, bridges, water and transport.'], ['Construction manager', 'Runs building sites on time and safely.'], ['Urban planner', 'Shapes how whole neighbourhoods grow.']] },
  software: { title: 'Careers at Nexus Software HQ', roles: [['Software engineer', 'Designs and builds apps and systems.'], ['Cybersecurity analyst', 'Protects systems from attacks.'], ['AI / ML engineer', 'Builds models that learn from data.'], ['Site reliability engineer', 'Keeps services fast and online.'], ['Product manager', 'Decides what to build and why.']] },
  kitchen: { title: 'Careers at Atelier Restaurant & Culinary School', roles: [['Chef', 'Creates menus and runs the kitchen.'], ['Pastry chef', 'Specialises in breads, pastry and desserts.'], ['Restaurant manager', 'Runs service, staff and finances.'], ['Food safety officer', 'Inspects kitchens to protect diners.'], ['Hotel / hospitality manager', 'Leads guest experience in hotels.']] },
  store: { title: 'Careers at Market Hall Store', roles: [['Retail manager', 'Runs a store, team and targets.'], ['Merchandiser', 'Decides where products go and how they look.'], ['Entrepreneur', 'Starts and grows their own business.'], ['Supply-chain analyst', 'Gets products to the right place on time.'], ['Sales manager', 'Leads a sales team and key customers.']] },
  court: { title: 'Careers at Talentopia Courthouse', roles: [['Lawyer (solicitor / attorney)', 'Advises clients and prepares cases.'], ['Barrister / trial advocate', 'Argues cases in court.'], ['Judge', 'Decides cases fairly under the law.'], ['Paralegal', 'Supports lawyers with research and documents.'], ['Psychologist / social worker', 'Supports people in the justice system.']] },
  research: { title: 'Careers at Planet Research Institute', roles: [['Chemical engineer', 'Designs safe, efficient chemical processes.'], ['Environmental scientist', 'Studies and protects ecosystems.'], ['Lab researcher', 'Runs experiments and analyses results.'], ['Sustainability consultant', 'Helps organisations cut emissions.'], ['Renewable-energy engineer', 'Builds solar, wind and storage systems.']] },
  terminal: { title: 'Careers at Skyport', roles: [['Airline pilot', 'Flies passengers and cargo safely.'], ['Air traffic controller', 'Guides aircraft through busy airspace.'], ['Flight dispatcher', 'Plans routes, fuel and weight for flights.'], ['Aircraft maintenance engineer', 'Inspects and repairs aircraft.'], ['Logistics / operations manager', 'Keeps airports and fleets running.']] },
};

// Builds the interior for each featured id. Returns { stations, npcs }
export function furnish(ctx, f) {
  const fr = frame(f); const out = { stations: [], npcs: [] };
  const { W, D, H } = fr;
  const station = (id, u, v, label, action, o = {}) => { const [x, z] = fr.F(u, v); const s = { id, x, z, label, action, radius: o.radius || 2.0, building: f.id }; if (o.seat) { const [sx, sz] = fr.F(o.seat[0], o.seat[1]); s.seat = { x: sx, z: sz, ry: fr.ry + o.seat[2], y: fr.y }; } out.stations.push(s); ring(u, v, o.color); return s; };
  const npc = (model, u, v, rot, role, talk, o = {}) => { const [x, z] = fr.F(u, v); out.npcs.push({ model, x, z, y: fr.y, ry: fr.ry + rot, role, talk, building: f.id, sit: !!o.sit, idle: o.idle }); };
  function ring(u, v, color = 0x8056f6) { const [x, z] = fr.F(u, v); const m = new THREE.Mesh(new THREE.RingGeometry(0.62, 0.78, 40), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.8, depthWrite: false })); m.rotation.x = -Math.PI / 2; m.position.set(x, fr.y + 0.025, z); ctx.scene.add(m); ctx.animated.push(t => { m.material.opacity = 0.4 + 0.35 * Math.sin(t * 3 + u); }); }
  const wallSign = (text, u, v, y, h = 0.5, o = {}) => { const [x, z] = fr.F(u, v); sign(ctx, text, x, fr.y + y, z, fr.ry + Math.PI, h, { bg: '#101A32', accent: '#8056F6', ...o }); };
  const sideSign = (text, side, v, y, h = 0.45, o = {}) => { const [x, z] = fr.F(side * (W / 2 - 0.08), v); sign(ctx, text, x, fr.y + y, z, fr.ry - side * Math.PI / 2, h, { bg: '#101A32', accent: '#8056F6', ...o }); };
  const screen = (u, v, w, h, y, tex, rot = 0) => { const [x, z] = fr.F(u, v); const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: tex, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.55 })); m.position.set(x, fr.y + y, z); m.rotation.y = fr.ry + Math.PI + rot; ctx.scene.add(m); return m; };

  // ---------------------------------------------------------------- finished room shell (all buildings except the hospital)
  function finish({ lining = M('offwhite'), dado = null, accentHex = 0x8056f6, logo = '', rugMat = null, pendants = true }) {
    const t = 0.05, hh = Math.min(H, 9);
    put(ctx, fr, 0, D - t / 2 - 0.01, 0, [[B(W - 0.1, hh, t), lining, 0, hh / 2, 0]]);
    for (const s of [-1, 1]) put(ctx, fr, s * (W / 2 - t / 2 - 0.01), D / 2, Math.PI / 2, [[B(D - 0.1, hh, t), lining, 0, hh / 2, 0]]);
    // skirting + optional timber dado on back and sides
    put(ctx, fr, 0, D - 0.07, 0, [[B(W - 0.2, 0.12, 0.04), M('charcoal'), 0, 0.06, 0]]);
    for (const s of [-1, 1]) put(ctx, fr, s * (W / 2 - 0.07), D / 2, Math.PI / 2, [[B(D - 0.2, 0.12, 0.04), M('charcoal'), 0, 0.06, 0]]);
    if (dado) { put(ctx, fr, 0, D - 0.08, 0, [[B(W - 0.3, 1.15, 0.03), dado, 0, 0.7, 0]]); for (const s of [-1, 1]) put(ctx, fr, s * (W / 2 - 0.08), D / 2, Math.PI / 2, [[B(D - 0.3, 1.15, 0.03), dado, 0, 0.7, 0]]); }
    // feature wall: accent panel + timber slats + logo
    const fw = Math.min(W * 0.36, 10);
    put(ctx, fr, 0, D - 0.09, 0, [[B(fw, Math.min(3.4, hh - 0.6), 0.04), accent(accentHex), 0, Math.min(3.4, hh - 0.6) / 2 + 0.3, 0]]);
    for (let i = 0; i < 9; i++) put(ctx, fr, -fw / 2 - 0.9 - i * 0.22, D - 0.1, 0, [[B(0.1, Math.min(3.4, hh - 0.6), 0.06), M('wood'), 0, Math.min(3.4, hh - 0.6) / 2 + 0.3, 0]]);
    if (logo) wallSign(logo, 0, D - 0.14, Math.min(2.6, hh - 1.2), 0.55, { bg: null, fg: '#F5F7FB', glow: 0.5, backing: false });
    if (rugMat) put(ctx, fr, 0, D * 0.45, 0, rug(W * 0.4, D * 0.35, rugMat));
    if (pendants) for (let i = -2; i <= 2; i++) put(ctx, fr, i * W / 6, D * 0.5, 0, [[ucyl(0.012, 0.012, 1.2, 4), M('metalDark'), 0, H - 0.6, 0], [ucyl(0.22, 0.32, 0.25, 16, true), M('charcoal'), 0, H - 1.25, 0], [new THREE.SphereGeometry(0.12, 12, 8), M('lampHead'), 0, H - 1.32, 0]]);
  }
  function careers(u, v) {
    const c = CAREERS[f.id]; if (!c) return;
    put(ctx, fr, u, v, 0, [[B(1.4, 1.9, 0.12), M('navy'), 0, 1.25, 0], [B(0.1, 0.35, 0.1), M('metalDark'), 0, 0.17, 0]], [0.7, 0.2]);
    const cv = document.createElement('canvas'); cv.width = 256; cv.height = 340; const g = cv.getContext('2d');
    g.fillStyle = '#101A32'; g.fillRect(0, 0, 256, 340); g.fillStyle = '#51C9E8'; g.font = '800 22px Plus Jakarta Sans, Arial'; g.fillText('CAREERS HERE', 18, 40);
    g.fillStyle = '#F5F7FB'; g.font = '600 15px Plus Jakarta Sans, Arial'; c.roles.forEach((r, i) => g.fillText('• ' + r[0], 18, 78 + i * 34));
    g.fillStyle = '#C8B8F4'; g.font = '500 13px Plus Jakarta Sans, Arial'; g.fillText('Press E to learn more', 18, 318);
    const tx = new THREE.CanvasTexture(cv); tx.colorSpace = THREE.SRGBColorSpace;
    const [x, z] = fr.F(u, v - 0.07); const m = new THREE.Mesh(new THREE.PlaneGeometry(1.25, 1.66), new THREE.MeshStandardMaterial({ map: tx, emissive: 0xffffff, emissiveMap: tx, emissiveIntensity: 0.45 }));
    m.position.set(x, fr.y + 1.27, z); m.rotation.y = fr.ry + Math.PI; ctx.scene.add(m);
    station('career_' + f.id, u, v - 0.9, 'Careers board · Press E to see the jobs in this building', 'career:' + f.id, { color: 0x51c9e8, radius: 1.6 });
  }

  // ================================================================ BANK
  if (f.id === 'bank') {
    finish({ lining: M('offwhite'), dado: M('wood'), accentHex: 0x1d2f55, logo: 'TALENTOPIA CENTRAL BANK', rugMat: accent(0x7a2f2f) });
    put(ctx, fr, 0, D - 3, 0, counter(W * 0.6, 1, 1.15, M('limestone'), M('marble')), [W * 0.3, 0.6]);
    for (const u of [-W * 0.2, 0, W * 0.2]) put(ctx, fr, u, D - 2.95, 0, [[B(1.6, 0.9, 0.04), M('glassClear'), 0, 1.6, -0.45], ...monitor(0.4, 0.2)]);
    npc('receptionist', -W * 0.2, D - 1.8, Math.PI, 'Teller · Sara', 'Welcome to Talentopia Central Bank. Deposits and currency exchange are here at the counter. For loans, see Lina at the advisor desk on the left.');
    npc('doctor', W * 0.2, D - 1.8, Math.PI, 'Teller · Omar', 'Hello! Our market wall on the right shows how investments move every day.');
    // advisor desk (main mission) + a second advisor working seated
    put(ctx, fr, -W / 2 + 4, D * 0.45, Math.PI / 2, [...desk(1.8, 0.9, M('wood')), ...monitor(0, -0.25)], [0.9, 0.45]);
    put(ctx, fr, -W / 2 + 5.3, D * 0.45, Math.PI / 2, chair(M('leather')));
    npc('receptionist', -W / 2 + 2.9, D * 0.45, Math.PI / 2, 'Loan Advisor · Lina', null);
    station('bank_loan', -W / 2 + 5.6, D * 0.45, 'Loan Advisor desk · Press E to assess a loan', 'mission:bank');
    put(ctx, fr, -W / 2 + 4, D * 0.75, Math.PI / 2, [...desk(1.8, 0.9, M('wood')), ...laptop(0, 0)], [0.9, 0.45]);
    put(ctx, fr, -W / 2 + 3.1, D * 0.75, -Math.PI / 2, chair(M('leather')));
    npc('doctor', -W / 2 + 3.1, D * 0.75, -Math.PI / 2, 'Financial Advisor · Karim', null, { sit: true });
    // teller window: currency exchange
    station('bank_fx', 0, D - 4.4, 'Teller window · Press E to exchange currency for a customer', 'act:exchange');
    // market data wall: portfolio builder
    { const t = boardTex(['TLNT  ▲ 2.4%   142.10', 'BAYF  ▲ 0.8%    88.32', 'LDGR  ▼ 1.1%    23.75', 'MRDN  ▲ 3.0%   310.40'], { title: 'Capital Bay Markets', fg: '#78D8B5' });
      const [x, z] = fr.F(W / 2 - 0.15, D * 0.5); const s = new THREE.Mesh(new THREE.PlaneGeometry(6, 3), new THREE.MeshStandardMaterial({ map: t, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: 0.5 })); s.position.set(x, fr.y + 2.8, z); s.rotation.y = fr.ry - Math.PI / 2; ctx.scene.add(s); }
    station('bank_portfolio', W / 2 - 2.2, D * 0.5, 'Market wall · Press E to build a client portfolio', 'act:portfolio');
    // ATMs, vault, lounge
    for (let i = 0; i < 3; i++) put(ctx, fr, W / 2 - 0.5, 2.6 + i * 1.5, -Math.PI / 2, [[B(0.9, 1.7, 0.5), M('metalLight'), 0, 0.85, 0], [B(0.5, 0.35, 0.02), M('screen'), 0, 1.3, -0.26]], [0.45, 0.3]);
    { const [x, z] = fr.F(-W * 0.32, D - 0.25); const v = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.4, 0.4, 40), M('metalLight')); v.rotation.x = Math.PI / 2; v.rotation.z = 0; v.rotation.order = 'YXZ'; v.rotation.y = fr.ry; v.position.set(x, fr.y + 2.2, z); ctx.scene.add(v); }
    put(ctx, fr, W * 0.12, D * 0.42, 0, sofa(2.4, M('leather')), [1.2, 0.5]); put(ctx, fr, W * 0.12, D * 0.3, 0, table(0.5, 0.45), [0.5, 0.5]);
    for (const u of [-W / 2 + 1.2, W / 2 - 1.2]) put(ctx, fr, u, 1.4, 0, plant(1.2), [0.3, 0.3]);
    careers(-4.5, 2.4);
  }
  // ================================================================ AGENCY
  if (f.id === 'agency') {
    finish({ lining: M('white'), accentHex: 0xf3a7b5, logo: 'PULSE', rugMat: accent(0xc8b8f4) });
    const ad = document.createElement('canvas'); ad.width = 640; ad.height = 320; const adT = new THREE.CanvasTexture(ad); adT.colorSpace = THREE.SRGBColorSpace;
    { const g = ad.getContext('2d'); g.fillStyle = '#101A32'; g.fillRect(0, 0, 640, 320); g.fillStyle = '#F5F7FB'; g.font = '800 40px Plus Jakarta Sans, Arial'; g.fillText('Your ad appears here', 120, 170); }
    ctx.hooks.adScreen = { canvas: ad, tex: adT, mesh: screen(-W / 2 + 0.12, D * 0.5, 4.8, 2.4, 2.3, adT, Math.PI / 2) };
    for (let i = 0; i < 3; i++) for (let k = 0; k < 2; k++) { const u = -8 + i * 8, v = 4 + k * 4; put(ctx, fr, u, v, 0, [...desk(2.4, 1), ...monitor(-0.5), ...monitor(0.5)], [1.2, 0.5]); put(ctx, fr, u - 0.5, v + 0.8, 0, chair()); put(ctx, fr, u + 0.5, v + 0.8, 0, chair()); }
    npc('avatar_m1', 7.5, 4.8, Math.PI, 'Copywriter · Sami', null, { sit: true }); npc('avatar_f1', 8.5, 8.8, Math.PI, 'Media Planner · Yara', null, { sit: true });
    station('agency_design', -8.5, 4.8 + 0.9, 'Design desk · Press E to design an ad (sit down)', 'act:addesign', { seat: [-8.5, 4.8, Math.PI] });
    put(ctx, fr, W / 2 - 2, D - 3, -Math.PI / 2, sofa(2.6, M('red')), [1.3, 0.5]); put(ctx, fr, W / 2 - 3.4, D - 3, 0, table(0.5, 0.45), [0.5, 0.5]);
    station('agency_budget', W / 2 - 4.6, D - 5.6, 'Media planning table · Press E to split the campaign budget', 'act:budget');
    for (let i = 0; i < 3; i++) { const [x, z] = fr.F(W / 2 - 0.12, 3 + i * 3); const c = document.createElement('canvas'); c.width = 256; c.height = 192; const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, 256, 192);
      for (let k = 0; k < 6; k++) { g.fillStyle = ['#8056F6', '#51C9E8', '#F3A7B5', '#F3C679', '#78D8B5', '#101A32'][(k + i) % 6]; g.fillRect(12 + (k % 3) * 80, 12 + (k / 3 | 0) * 88, 70, 76); }
      const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; const m = new THREE.Mesh(new THREE.PlaneGeometry(2, 1.5), new THREE.MeshStandardMaterial({ map: t })); m.position.set(x, fr.y + 1.8, z); m.rotation.y = fr.ry - Math.PI / 2; ctx.scene.add(m); }
    npc('avatar_f2', 2, D - 2.5, Math.PI, 'Creative Director · Noor', null);
    station('agency_brief', 2, D - 4, 'Client brief · Press E to plan a campaign', 'mission:agency');
    put(ctx, fr, -W / 2 + 1.2, D - 1.2, 0, plant(1.3), [0.3, 0.3]); put(ctx, fr, W / 2 - 1.2, 1.4, 0, plant(1.1), [0.3, 0.3]);
    careers(-11.5, 2);
  }
  // ================================================================ ENGINEERING
  if (f.id === 'engineering') {
    finish({ lining: M('offwhite'), dado: null, accentHex: 0x9ebdff, logo: 'ATLAS', rugMat: null });
    for (let i = 0; i < 3; i++) put(ctx, fr, -5 + i * 5, 5, 0, [[B(1.8, 0.05, 1.2), M('white'), 0, 0.95, 0], [B(0.08, 0.95, 0.08), M('metalDark'), -0.8, 0.47, 0], [B(0.08, 0.95, 0.08), M('metalDark'), 0.8, 0.47, 0], [B(1.2, 0.01, 0.8), accent(0xdfe8ff), 0, 0.98, 0]], [0.9, 0.6]);
    npc('avatar_m2', 5, 5.9, Math.PI, 'Architect · Omar', null, { idle: 'FoldArms' });
    // bridge test rig with a deformable beam (3D feedback for the bridge designer)
    put(ctx, fr, 0, D - 5, 0, [[B(4.4, 0.9, 1.6), M('charcoal'), 0, 0.45, 0], [B(0.18, 0.45, 0.5), M('metalLight'), -1.7, 1.12, 0], [B(0.18, 0.45, 0.5), M('metalLight'), 1.7, 1.12, 0], [B(0.1, 1.6, 0.1), M('metalDark'), 0, 1.7, 0.6], [B(0.6, 0.12, 0.3), M('red'), 0, 2.45, 0.45]], [2.2, 0.8]);
    { const g = new THREE.BoxGeometry(3.6, 0.12, 0.36, 40, 1, 1); const beam = new THREE.Mesh(g, M('steel')); const [x, z] = fr.F(0, D - 5); beam.position.set(x, fr.y + 1.42, z); beam.rotation.y = fr.ry; beam.castShadow = true; ctx.scene.add(beam);
      const base = g.attributes.position.array.slice(); let cur = 0, target = 0;
      ctx.hooks.bridge = { set(deflectionMm, mat) { target = Math.min(0.45, deflectionMm / 1000 * 8); if (mat) beam.material = mat; } };
      ctx.animated.push((t, dt) => { if (Math.abs(target - cur) < 1e-4) return; cur += (target - cur) * Math.min(1, dt * 4); const p = g.attributes.position.array; for (let i = 0; i < p.length; i += 3) { const u = (base[i] + 1.8) / 3.6; p[i + 1] = base[i + 1] - cur * Math.sin(Math.PI * Math.min(1, Math.max(0, u))); } g.attributes.position.needsUpdate = true; g.computeVertexNormals(); }); }
    npc('doctor', 2.8, D - 5, Math.PI / 2, 'Structural Engineer · Karim', null);
    station('eng_bridge', 0, D - 3.5, 'Bridge test rig · Press E to design and load-test a beam', 'act:bridge');
    // architectural model table: zoning / floor-area check
    put(ctx, fr, -6, D - 9, 0, [[B(2.4, 0.8, 2.4), M('white'), 0, 0.4, 0], [B(0.5, 1.4, 0.5), M('offwhite'), -0.5, 1.5, -0.3], [B(0.6, 0.8, 0.6), M('offwhite'), 0.45, 1.2, 0.35], [B(0.35, 1.9, 0.35), glassMat({ tint: [110, 130, 150], seed: 9 }), 0.4, 1.75, -0.5], [B(2.2, 0.02, 2.2), M('grass'), 0, 0.81, 0]], [1.2, 1.2]);
    station('eng_zoning', -6, D - 7.2, 'Architectural model · Press E to check a building against planning rules', 'act:zoning');
    // site-safety briefing board (the original multiple-choice challenge)
    put(ctx, fr, 6, D - 1.2, 0, [[B(3, 1.6, 0.1), M('screen'), 0, 1.9, 0]]);
    station('eng_safety', 6, D - 2.6, 'Site safety briefing · Press E for the test-failure scenario', 'mission:engineering');
    for (const s of [-1, 1]) put(ctx, fr, s * (W / 2 - 1.3), 2, 0, plant(1.1), [0.3, 0.3]);
    careers(-12, 2.2);
  }
  // ================================================================ SOFTWARE
  if (f.id === 'software') {
    finish({ lining: M('charcoal'), accentHex: 0x51c9e8, logo: 'NEXUS', rugMat: accent(0x26324a), pendants: false });
    for (let r = 0; r < 3; r++) for (let c = 0; c < 2; c++) { const u = -4.5 + c * 9, v = 4 + r * 3.2; put(ctx, fr, u, v, 0, [...desk(3, 0.9), ...monitor(-0.8), ...monitor(0), ...monitor(0.8)], [1.5, 0.5]); for (const k of [-0.8, 0.8]) put(ctx, fr, u + k, v + 0.75, 0, chair()); }
    npc('avatar_f1', 4.5 - 0.8, 4 + 0.75, Math.PI, 'Software Engineer · Lea', null, { sit: true });
    npc('visitor_m', 4.5 + 0.8, 7.2 + 0.75, Math.PI, 'Security Analyst · Tom', null, { sit: true });
    station('code_order', -4.5 - 0.8, 4 + 1.6, 'Developer desk · Press E to fix the login code (sit down)', 'act:codeorder', { seat: [-4.5 - 0.8, 4 + 0.75, Math.PI] });
    for (let i = 0; i < 4; i++) put(ctx, fr, W / 2 - 0.6, D - 3 - i * 1.4, -Math.PI / 2, [[B(0.7, 2.1, 1.1), M('charcoal'), 0, 1.05, 0], [B(0.6, 1.8, 0.02), M('cyan'), 0, 1.05, -0.56]], [0.4, 0.6]);
    station('code_alerts', W / 2 - 2.4, D - 5, 'Server room · Press E to triage live alerts', 'act:alerts', { color: 0x51c9e8 });
    npc('avatar_m2', 0, D - 2.2, Math.PI, 'Engineering Lead · Daniel', null);
    station('code_bug', 0, D - 4, 'Incident desk · Press E to debug a login issue', 'mission:software');
    put(ctx, fr, 0, D - 0.6, 0, [[B(5, 2.2, 0.1), M('screen'), 0, 2.4, 0]]);
    for (const s of [-1, 1]) put(ctx, fr, s * (W / 2 - 1.2), 1.6, 0, plant(1.2), [0.3, 0.3]);
    careers(-W / 2 + 3, 2.2);
  }
  // ================================================================ KITCHEN
  if (f.id === 'kitchen') {
    finish({ lining: M('offwhite'), dado: M('wood'), accentHex: 0xffba91, logo: 'ATELIER', rugMat: null });
    put(ctx, fr, 0, D - 1.2, 0, counter(W * 0.7, 0.9, 0.92, M('metalLight'), M('metalLight')), [W * 0.35, 0.5]);
    put(ctx, fr, 0, D - 4, 0, counter(8, 1.4, 0.92, M('metalLight'), M('metalLight')), [4, 0.7]);
    for (let i = 0; i < 4; i++) put(ctx, fr, -4.5 + i * 3, D - 1.2, 0, [[ucyl(0.25, 0.25, 0.25, 16), M('metalDark'), -0.4, 1.06, 0], [ucyl(0.2, 0.2, 0.18, 16), M('metalDark'), 0.4, 1.02, 0]]);
    put(ctx, fr, 0, D - 0.6, 0, [[B(W * 0.7, 0.8, 1.2), M('metalLight'), 0, 2.6, 0]]);
    for (let i = 0; i < 4; i++) put(ctx, fr, -2.4 + i * 1.6, D - 4, 0, [[B(0.5, 0.04, 0.35), M('wood'), 0, 0.96, 0], [new THREE.SphereGeometry(0.08, 10, 8), [M('red'), M('green'), M('yellow'), M('orange')][i], 0, 1.03, 0]]);
    // walk-in fridge
    put(ctx, fr, W / 2 - 1, D - 6, -Math.PI / 2, [[B(2.4, 2.4, 1.4), M('metalLight'), 0, 1.2, 0], [B(0.08, 1.2, 0.05), M('metalDark'), 0.8, 1.2, -0.72], [B(0.4, 0.2, 0.02), M('screen'), -0.5, 1.9, -0.71]], [0.7, 1.2]);
    station('chef_fridge', W / 2 - 2.8, D - 6, 'Walk-in fridge · Press E for the food-safety check', 'act:fridge', { color: 0x51c9e8 });
    station('chef_ticket', -3.2, D - 5.6, 'Prep counter · Press E to cook an order in the right sequence', 'act:ticket');
    for (let i = 0; i < 4; i++) for (let k = 0; k < 2; k++) { const u = -9 + i * 6, v = 3 + k * 3.2; put(ctx, fr, u, v, 0, [[ucyl(0.6, 0.6, 0.05, 20), M('white'), 0, 0.76, 0], [ucyl(0.06, 0.06, 0.74, 8), M('metalDark'), 0, 0.37, 0]], [0.6, 0.6]); put(ctx, fr, u, v + 0.95, 0, chair(M('leather'))); put(ctx, fr, u, v - 0.95, Math.PI, chair(M('leather'))); }
    npc('visitor_m', -9, 3 + 0.95, Math.PI, 'Diner', null, { sit: true }); npc('avatar_f1', 3, 6.2 - 0.95, 0, 'Diner', null, { sit: true });
    npc('doctor', 0, D - 2.6, Math.PI, 'Head Chef · Rami', null);
    station('chef_recipe', 0, D - 5.4, 'Kitchen pass · Press E to start the lunch rush', 'mission:kitchen');
    careers(-W / 2 + 2.6, 2.2);
  }
  // ================================================================ STORE
  if (f.id === 'store') {
    finish({ lining: M('white'), accentHex: 0xffccab, logo: 'MARKET HALL', rugMat: null });
    for (let i = 0; i < 3; i++) put(ctx, fr, -8 + i * 8, D - 6, 0, shelf(4, 1.8), [2, 0.3]);
    for (let i = 0; i < 2; i++) put(ctx, fr, -6 + i * 12, D - 1, 0, shelf(6, 2.2), [3, 0.3]);
    station('store_shelf', -8, D - 7.6, 'Shelving aisle · Press E to merchandise the shelves', 'act:shelf');
    for (let i = 0; i < 3; i++) put(ctx, fr, -6 + i * 6, 3.4, 0, [...counter(2, 0.8, 1, M('offwhite'), M('charcoal')), [B(0.4, 0.3, 0.05), M('screen'), 0.5, 1.25, 0]], [1, 0.4]);
    npc('avatar_f2', 6, 4.3, Math.PI, 'Cashier · Mira', null);
    station('store_margin', 6, 2.2, 'Checkout · Press E to cash up the day', 'act:margin');
    npc('receptionist', 0, 2.6, 0, 'Store Manager · Hana', null);
    station('store_queue', 3, 6.2, 'Store dashboard · Press E to fix the checkout queue', 'mission:store');
    for (const s of [-1, 1]) put(ctx, fr, s * (W / 2 - 1.2), 1.6, 0, plant(1), [0.3, 0.3]);
    careers(-W / 2 + 2.6, 2.4);
  }
  // ================================================================ COURT
  if (f.id === 'court') {
    finish({ lining: M('offwhite'), dado: M('wood'), accentHex: 0x3a2a1a, logo: '⚖ TALENTOPIA COURT', rugMat: accent(0x5a2a2a), pendants: false });
    put(ctx, fr, 0, D - 2.5, 0, [[B(6, 1.4, 1.4), M('wood'), 0, 0.7, 0], [B(6.4, 0.08, 1.6), M('wood'), 0, 1.44, 0], [B(6, 0.6, 0.3), M('wood'), 0, 1.75, 0.5]], [3, 0.8]);
    for (let r = 0; r < 4; r++) for (const s of [-1, 1]) put(ctx, fr, s * 4.5, 3 + r * 1.8, 0, [[B(5, 0.45, 0.5), M('wood'), 0, 0.45, 0], [B(5, 0.6, 0.06), M('wood'), 0, 0.8, 0.25]], [2.5, 0.35]);
    npc('visitor_m', -4.5, 3 + 1.8 + 0.1, Math.PI, 'Member of the public', null, { sit: true }); npc('avatar_f2', 4.5, 3 + 0.1, Math.PI, 'Law student', null, { sit: true });
    put(ctx, fr, -5, D - 4.5, 0, [[B(1.6, 1.1, 1), M('wood'), 0, 0.55, 0]], [0.8, 0.5]);
    npc('doctor', 0, D - 2, Math.PI, 'Judge · Hon. Mansour', null);
    station('court_clause', 0, D - 5, 'Clerk’s desk · Press E to review a contract dispute', 'mission:court');
    put(ctx, fr, 6.5, D - 5.5, 0, [[B(2.4, 0.05, 1.2), M('wood'), 0, 0.85, 0], [B(0.08, 0.84, 1.1), M('wood'), -1.1, 0.42, 0], [B(0.08, 0.84, 1.1), M('wood'), 1.1, 0.42, 0], [B(0.3, 0.02, 0.4), M('white'), -0.5, 0.88, 0], [B(0.3, 0.02, 0.4), M('white'), 0.3, 0.88, 0.1]], [1.2, 0.6]);
    station('court_evidence', 6.5, D - 7, 'Evidence table · Press E to sort the evidence', 'act:evidence');
    put(ctx, fr, -7, 6, 0, [[B(0.7, 1.2, 0.5), M('wood'), 0, 0.6, 0], [B(0.8, 0.05, 0.6), M('wood'), 0, 1.22, -0.05]], [0.4, 0.3]);
    station('court_irac', -7, 7.4, 'Advocate’s lectern · Press E to structure a legal argument', 'act:irac');
    careers(-W / 2 + 2.6, 2.2);
  }
  // ================================================================ RESEARCH
  if (f.id === 'research') {
    finish({ lining: M('white'), accentHex: 0x78d8b5, logo: 'PLANET RESEARCH', rugMat: null });
    for (let i = 0; i < 3; i++) put(ctx, fr, -4.5 + i * 4.5, 6, 0, [[B(3, 0.9, 1.2), M('white'), 0, 0.45, 0], [B(3.1, 0.05, 1.3), M('charcoal'), 0, 0.92, 0], [ucyl(0.08, 0.08, 0.3, 10), M('glassClear'), -0.6, 1.1, 0], [ucyl(0.12, 0.06, 0.25, 10), M('glassClear'), 0.4, 1.06, 0.2], [ucyl(0.015, 0.015, 0.6, 6), M('metalDark'), 0.9, 1.25, 0], [ucyl(0.05, 0.03, 0.35, 8), M('glassClear'), 0.9, 1.4, 0]], [1.5, 0.6]);
    station('lab_titration', 0, 7.5, 'Lab bench · Press E to run a titration', 'act:titration');
    npc('avatar_f1', -4.5, 6.9, Math.PI, 'Lab Researcher · Dana', null);
    for (let i = 0; i < 2; i++) put(ctx, fr, W / 2 - 1, D - 4 - i * 4, -Math.PI / 2, [[B(1.8, 2.4, 0.9), M('white'), 0, 1.2, 0], [B(1.6, 0.9, 0.04), M('glassClear'), 0, 1.4, -0.46]], [0.9, 0.5]);
    for (let i = 0; i < 4; i++) put(ctx, fr, -W / 2 + 1, 3 + i * 2.5, 0, plant(1.1), [0.3, 0.3]);
    put(ctx, fr, -8, D - 6, 0, [[B(3, 0.8, 2), M('white'), 0, 0.4, 0], [B(2.8, 0.02, 1.8), M('screen'), 0, 0.82, 0]], [1.5, 1]);
    station('lab_energy', -8, D - 4.3, 'Energy-planning table · Press E to design a clean power mix', 'act:energymix', { color: 0x78d8b5 });
    npc('receptionist', 0, D - 2.4, Math.PI, 'Process Engineer · Leila', null);
    station('lab_pressure', 0, D - 4, 'Pilot plant control panel · Press E to respond to an alarm', 'mission:research');
    put(ctx, fr, 0, D - 0.6, 0, [[B(4, 1.6, 0.1), M('screen'), 0, 1.9, 0]]);
    careers(-W / 2 + 4.5, 2.2);
  }
  // ================================================================ TERMINAL
  if (f.id === 'terminal') {
    finish({ lining: M('white'), accentHex: 0x99dffa, logo: 'SKYPORT', rugMat: null });
    for (let i = 0; i < 4; i++) put(ctx, fr, -18 + i * 9, D - 4, 0, [...counter(3.2, 0.9, 1.05, M('white'), M('charcoal')), [B(0.4, 0.3, 0.05), M('screen'), 0.6, 1.3, 0]], [1.6, 0.5]);
    for (let r = 0; r < 2; r++) for (let i = 0; i < 4; i++) put(ctx, fr, -15 + i * 10, 5 + r * 4, 0, [[B(4, 0.45, 0.55), M('fabricBlue'), 0, 0.45, 0], [B(4, 0.5, 0.08), M('fabricBlue'), 0, 0.85, 0.25]], [2, 0.35]);
    npc('avatar_m1', -15.5, 5.1, Math.PI, 'Passenger', null, { sit: true }); npc('visitor_f', 5.8, 9.1, Math.PI, 'Passenger', null, { sit: true }); npc('visitor_m', 14.6, 5.1, Math.PI, 'Passenger', null, { sit: true });
    { const [x, z] = fr.F(0, D - 0.3); const t = boardTex(['TK101  LONDON     08:40  ON TIME', 'TK214  DUBAI      09:15  BOARDING', 'TK330  TOKYO      10:05  ON TIME', 'TK402  NEW YORK   11:30  DELAYED'], { title: 'Departures' });
      const s = new THREE.Mesh(new THREE.PlaneGeometry(8, 4), new THREE.MeshStandardMaterial({ map: t, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: 0.5 })); s.position.set(x, fr.y + 4.2, z); s.rotation.y = fr.ry + Math.PI; ctx.scene.add(s); }
    npc('doctor', -9, D - 2.8, Math.PI, 'Flight Operations · Captain Aziz', null);
    station('sky_weather', -9, D - 5.2, 'Flight operations desk · Press E for the pre-flight check', 'mission:terminal');
    npc('receptionist', 9, D - 2.8, Math.PI, 'Load Controller · Rana', null);
    station('sky_cargo', 9, D - 5.2, 'Load control desk · Press E to balance an aircraft', 'act:cargo');
    put(ctx, fr, 22, D - 6, 0, [...desk(2, 1), ...monitor(-0.4), ...monitor(0.4)], [1, 0.5]); put(ctx, fr, 22, D - 5.2, 0, chair());
    station('sky_dispatch', 22, D - 4.3, 'Dispatch desk · Press E to plan fuel for a flight (sit down)', 'act:flightplan', { seat: [22, D - 5.2, Math.PI] });
    for (const s of [-1, 1]) put(ctx, fr, s * 30, 2, 0, plant(1.4), [0.3, 0.3]);
    careers(-25, 2.5);
  }
  return out;
}

// Hospital extras (the hospital interior itself comes from the Blender GLB): triage kiosk, dosage bench, careers board.
export function furnishHospital(ctx, ox, oz) {
  const out = { stations: [], npcs: [] };
  const fr = { F: (u, v) => [ox + u, oz + v], ry: 0, y: 0.15, W: 60, D: 30, H: 4.6 };
  const ring = (x, z, color = 0x8056f6) => { const m = new THREE.Mesh(new THREE.RingGeometry(0.62, 0.78, 40), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.8, depthWrite: false })); m.rotation.x = -Math.PI / 2; m.position.set(x, 0.18, z); ctx.scene.add(m); ctx.animated.push(t => { m.material.opacity = 0.4 + 0.35 * Math.sin(t * 3 + x); }); };
  // triage kiosk in the west lobby (local x -20, z -35)
  put(ctx, fr, -20, -36.2, Math.PI, kiosk(), [0.35, 0.25]);
  out.npcs.push({ model: 'receptionist', x: ox - 21.2, z: oz - 36.2, y: 0.15, ry: Math.PI / 2, role: 'Triage Nurse · Grace', talk: 'I decide who is seen first. Use the triage screen to sort today’s patients by urgency.', building: 'hospital' });
  out.stations.push({ id: 'hosp_triage', x: ox - 20, z: oz - 34.8, label: 'Triage screen · Press E to prioritise patients', action: 'act:triage', radius: 1.8, building: 'hospital' }); ring(ox - 20, oz - 34.8);
  // dosage bench in the Anatomy Lab (local x 24, z -44)
  put(ctx, fr, 24, -44.6, Math.PI, [[B(2.2, 0.9, 0.8), M('white'), 0, 0.45, 0], [B(2.3, 0.05, 0.9), M('charcoal'), 0, 0.92, 0], [ucyl(0.05, 0.05, 0.16, 8), M('glassClear'), -0.5, 1.03, 0], [ucyl(0.06, 0.06, 0.2, 8), accent(0x8a3b2a), 0.2, 1.05, 0.1]], [1.1, 0.45]);
  out.stations.push({ id: 'hosp_dose', x: ox + 24, z: oz - 43.3, label: 'Pharmacy bench · Press E to calculate a safe dose', action: 'act:dose', radius: 1.8, building: 'hospital' }); ring(ox + 24, oz - 43.3);
  // careers board near the entrance (local x 8, z -27)
  put(ctx, fr, 9, -26.3, Math.PI, [[B(1.4, 1.9, 0.12), M('navy'), 0, 1.25, 0]], [0.7, 0.2]);
  out.stations.push({ id: 'career_hospital', x: ox + 9, z: oz - 27.3, label: 'Careers board · Press E to see the jobs in this hospital', action: 'career:hospital', radius: 1.6, building: 'hospital' }); ring(ox + 9, oz - 27.3, 0x51c9e8);
  { const cv = document.createElement('canvas'); cv.width = 256; cv.height = 340; const g = cv.getContext('2d'); g.fillStyle = '#101A32'; g.fillRect(0, 0, 256, 340); g.fillStyle = '#78D8B5'; g.font = '800 22px Plus Jakarta Sans, Arial'; g.fillText('CAREERS HERE', 18, 40);
    g.fillStyle = '#F5F7FB'; g.font = '600 15px Plus Jakarta Sans, Arial'; CAREERS.hospital.roles.forEach((r, i) => g.fillText('• ' + r[0], 18, 78 + i * 34)); g.fillStyle = '#C8B8F4'; g.font = '500 13px Plus Jakarta Sans, Arial'; g.fillText('Press E to learn more', 18, 318);
    const tx = new THREE.CanvasTexture(cv); tx.colorSpace = THREE.SRGBColorSpace; const m = new THREE.Mesh(new THREE.PlaneGeometry(1.25, 1.66), new THREE.MeshStandardMaterial({ map: tx, emissive: 0xffffff, emissiveMap: tx, emissiveIntensity: 0.45 })); m.position.set(ox + 9, 1.42, oz - 26.37); m.rotation.y = Math.PI; ctx.scene.add(m); }
  return out;
}
