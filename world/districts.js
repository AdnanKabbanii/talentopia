// The ten career districts. Each builds several recognisable buildings and registers one featured, enterable building.
import * as THREE from 'three';
import { M, mat4, ubox, ucyl, glassMat, panelMat, signMat, mass, bands, fins, shell, classical, factory, hangar, dome, sign, faceSign, FACE, onFace,
  treeAt, lampAt, benchAt, planterAt, umbrellaTable, solarRow, busStop, turbine, crane, makeCar } from './kit.js';
import { blockBase, BLOCK } from './city.js';
import { billboard, boardTex } from './textures.js';

// Mission data carried over from the original Talentopia brief (index.html)
export const DISTRICTS = [
  { id: 'med', name: 'MedCity', short: 'Medicine & health', icon: '✚', color: '#78D8B5', bounds: [-187, -73, -187, -73], label: [-130, -130] },
  { id: 'capital', name: 'Capital Bay', short: 'Banking & finance', icon: '◈', color: '#F3C679', bounds: [-57, 57, -187, -73], label: [0, -130] },
  { id: 'creative', name: 'Creative Quarter', short: 'Marketing, media & design', icon: '✦', color: '#F3A7B5', bounds: [73, 187, -187, -73], label: [130, -130] },
  { id: 'forge', name: 'Forge & Form', short: 'Engineering & architecture', icon: '⌁', color: '#9EBDFF', bounds: [73, 187, -57, 57], label: [130, 0] },
  { id: 'nexus', name: 'Code Nexus', short: 'Software, AI & cybersecurity', icon: '⌘', color: '#51C9E8', bounds: [-187, -73, -57, 57], label: [-130, 0] },
  { id: 'taste', name: 'Taste District', short: 'Culinary arts & hospitality', icon: '♨', color: '#FFBA91', bounds: [-187, -73, 73, 187], label: [-130, 130] },
  { id: 'planet', name: 'Planet Lab', short: 'Science & sustainability', icon: '◉', color: '#8DE8C3', bounds: [-317, -203, -187, 187], label: [-260, 0] },
  { id: 'civic', name: 'Civic Square', short: 'Law, education & social sciences', icon: '⚖', color: '#C8B8F4', bounds: [73, 187, 73, 187], label: [130, 130] },
  { id: 'market', name: 'Market Street', short: 'Retail, business & logistics', icon: '▣', color: '#FFCCAB', bounds: [-57, 57, 73, 187], label: [0, 130] },
  { id: 'sky', name: 'Skyport', short: 'Aviation & mobility', icon: '➤', color: '#99DFFA', bounds: [203, 410, -195, 195], label: [300, 0] },
];
export const PLAZA = { id: 'plaza', name: 'Central Plaza', bounds: [-57, 57, -57, 57] };
export function districtAt(x, z) {
  for (const d of [...DISTRICTS, PLAZA]) { const [x0, x1, z0, z1] = d.bounds; if (x >= x0 - 8 && x <= x1 + 8 && z >= z0 - 8 && z <= z1 + 8) return d; }
  return null;
}

// named buildings: invisible proxy boxes for hover / click (raycast) + map labels
function named(ctx, name, district, x, z, w, d, h, featured = null) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshBasicMaterial({ visible: false }));
  m.position.set(x, h / 2, z); m.userData = { building: name, district, featured }; ctx.scene.add(m); ctx.clickMeshes.push(m);
  ctx.labels.push({ name, district, x, z, featured });
}
function feature(ctx, spec) { ctx.featured = ctx.featured || []; ctx.featured.push(spec); return spec; }

// common building recipes
function glassTower(ctx, { x, z, w, d, h, y0 = 0, tint = [70, 110, 150], seed = 1, slab = true, mullion = '#2a3340' }) {
  const gm = glassMat({ tint, seed, mullion });
  mass(ctx, { x, z, w, d, y0, h, mat: gm, seed });
  if (slab) bands(ctx, { x, z, w, d, y0, h, every: 8, mat: M('metalLight'), depth: 0.15, th: 0.3 });
}
function panelBlock(ctx, { x, z, w, d, h, y0 = 0, wall = '#e9e6df', kind = 'ribbon', seed = 2, glass = [80, 110, 140] }) {
  mass(ctx, { x, z, w, d, y0, h, mat: panelMat({ wall, kind, seed, glass }), seed });
}
// featured building: enterable ground floor (shell) + upper floors
function featuredBuilding(ctx, { id, name, district, x, z, w, d, face, gfH = 5, upper, wallMat, floorMat, signText, signOpts = {} }) {
  const inner = shell(ctx, { x, z, w, d, face, gfH, wallMat: wallMat || M('white'), floorMat: floorMat || M('marble'), name });
  if (upper) upper(gfH);
  faceSign(ctx, { x, z, w, d }, face, signText || name, gfH + 0.9, 1.1, { bg: '#101A32', accent: signOpts.accent || '#8056F6', ...signOpts });
  named(ctx, name, district, x, z, w, d, (upper ? 14 : gfH), id);
  return feature(ctx, { id, name, district, face, ...inner, w, d, x, z, gfH });
}

// ======================================================================== MEDCITY (hospital itself comes from medcity.glb)
function medcity(ctx) {
  blockBase(ctx, -130, -130, M('plaza'));
  // pharmacy (green cross) and dental clinic along Talent Avenue / Harbour side
  panelBlock(ctx, { x: -86, z: -84, w: 20, d: 12, h: 6, wall: '#f2f2ee', kind: 'punched', seed: 31 });
  faceSign(ctx, { x: -86, z: -84, w: 20, d: 12 }, 's', 'Pharmacy', 4.8, 0.9, { bg: '#ffffff', fg: '#1f7a4d', accent: '#2f9e5b' });
  ctx.box(-78, 3.2, -77.9, 1.6, 1.6, 0.25, M('green')); // green cross light box
  named(ctx, 'MedCity Pharmacy', 'med', -86, -84, 20, 12, 6);
  panelBlock(ctx, { x: -84, z: -104, w: 18, d: 22, h: 10, wall: '#e8eef2', kind: 'ribbon', seed: 32, glass: [90, 130, 150] });
  faceSign(ctx, { x: -84, z: -104, w: 18, d: 22 }, 'e', 'Bright Smile Dental Clinic', 7.6, 0.8, { bg: '#ffffff', fg: '#1a5f7a', accent: '#51C9E8' });
  named(ctx, 'Bright Smile Dental Clinic', 'med', -84, -104, 18, 22, 10);
  // Medical school: limestone base + glass upper, facing North Boulevard
  mass(ctx, { x: -160, z: -165, w: 44, d: 28, h: 6, mat: M('limestone'), units: false, parapet: 0 });
  glassTower(ctx, { x: -160, z: -165, w: 42, d: 26, y0: 6, h: 14, tint: [90, 125, 140], seed: 33 });
  faceSign(ctx, { x: -160, z: -165, w: 44, d: 28 }, 'n', 'Talentopia School of Medicine', 4.4, 1.0, { bg: '#F5F7FB', fg: '#101A32', accent: '#78D8B5' });
  named(ctx, 'Talentopia School of Medicine', 'med', -160, -165, 44, 28, 20);
  // biomedical research laboratory
  glassTower(ctx, { x: -100, z: -160, w: 28, d: 34, h: 26, tint: [80, 120, 130], seed: 34 });
  fins(ctx, { x: -100, z: -160, w: 28, d: 34 }, 'n', { h: 26, step: 2, depth: 0.9 });
  faceSign(ctx, { x: -100, z: -160, w: 28, d: 34 }, 'n', 'Biomedical Research Lab', 3.6, 0.8, { bg: '#101A32', accent: '#78D8B5' });
  named(ctx, 'Biomedical Research Lab', 'med', -100, -160, 28, 34, 26);
  // healing garden behind the hospital
  ctx.box(-140, 0.15, -128, 56, 0.1, 18, M('grass'), { shadow: false });
  for (let i = 0; i < 7; i++) treeAt(ctx, -164 + i * 8, -122 + (i % 2) * 6, 0.9 + (i % 3) * 0.1, 0.15);
  for (let i = 0; i < 3; i++) benchAt(ctx, -152 + i * 12, -132, 0);
}

// ======================================================================== CAPITAL BAY
function capital(ctx) {
  blockBase(ctx, 0, -130, M('plaza'));
  // Talentopia Central Bank: classical limestone hall (enterable)
  const inner = classical(ctx, { x: -22, z: -104, w: 34, d: 20, h: 15, face: 's', cols: 8, enterable: true });
  sign(ctx, 'TALENTOPIA CENTRAL BANK', -22, 12.6, -85.85, 0, 1.0, { bg: null, fg: '#7a5a1e', glow: 0.1, backing: false });
  named(ctx, 'Talentopia Central Bank', 'capital', -22, -100, 36, 28, 16, 'bank');
  feature(ctx, { id: 'bank', name: 'Talentopia Central Bank', district: 'capital', face: 's', ...inner, x: -22, z: -104, w: 34, d: 20, gfH: 9.3 });
  // finance tower (skyline anchor) with setback + lit crown
  glassTower(ctx, { x: 26, z: -128, w: 24, d: 24, h: 54, tint: [60, 95, 140], seed: 41 });
  glassTower(ctx, { x: 26, z: -128, w: 19, d: 19, y0: 54, h: 26, tint: [60, 95, 140], seed: 42 });
  ctx.box(26, 80.9, -128, 12, 6, 12, M('metalLight'));
  ctx.box(26, 86.9, -128, 9, 0.5, 9, M('yellow'));
  faceSign(ctx, { x: 26, z: -128, w: 24, d: 24 }, 's', 'Bay Financial Tower', 4.5, 0.9, { bg: '#101A32', accent: '#F3C679' });
  named(ctx, 'Bay Financial Tower', 'capital', 26, -128, 24, 24, 82);
  // fintech hub: dark glass + cyan fins
  glassTower(ctx, { x: 30, z: -86, w: 26, d: 12, h: 16, tint: [40, 60, 80], seed: 43, mullion: '#111' });
  fins(ctx, { x: 30, z: -86, w: 26, d: 12 }, 's', { h: 16, step: 1.3, depth: 0.5, mat: M('cyan') });
  faceSign(ctx, { x: 30, z: -86, w: 26, d: 12 }, 's', 'Ledgerline Fintech', 3.9, 0.7, { bg: '#0b0f1a', fg: '#51C9E8', accent: '#51C9E8' });
  named(ctx, 'Ledgerline Fintech', 'capital', 30, -86, 26, 12, 16);
  // investment centre: cylindrical tower
  const gm = glassMat({ tint: [80, 110, 135], seed: 44 });
  ctx.geo(ucyl(12, 12, 46, 40), gm, mat4(-25, 23, -160)); ctx.geo(new THREE.CylinderGeometry(12, 12, 0.6, 40), M('roof'), mat4(-25, 46.3, -160));
  for (let y = 8; y < 46; y += 8) ctx.geo(new THREE.CylinderGeometry(12.3, 12.3, 0.35, 40), M('metalLight'), mat4(-25, y, -160));
  ctx.collider(-34, -16, -169, -151, 0, 46); ctx.foot(-25, -160, 24, 24, '#cfc9bd');
  sign(ctx, 'Meridian Investment Centre', -25, 4.2, -147.9, 0, 0.8, { bg: '#101A32', accent: '#F3C679' });
  named(ctx, 'Meridian Investment Centre', 'capital', -25, -160, 24, 24, 46);
  // bank forecourt trees
  for (const x of [-48, 4]) { treeAt(ctx, x, -80, 1, 0.15); planterAt(ctx, x, -92, 4, 1.4); }
}

// ======================================================================== CREATIVE QUARTER
function creative(ctx) {
  blockBase(ctx, 130, -130, M('concrete'));
  const ag = featuredBuilding(ctx, { id: 'agency', name: 'Pulse Advertising Agency', district: 'creative', x: 105, z: -96, w: 30, d: 18, face: 's', gfH: 5,
    wallMat: M('white'), floorMat: M('parquet'), signText: 'PULSE · Advertising & Media', signOpts: { accent: '#F3A7B5' },
    upper: (y) => {
      mass(ctx, { x: 108, z: -97, w: 30, d: 19, y0: y, h: 6, mat: panelMat({ wall: '#cfc3f0', kind: 'ribbon', seed: 51 }), parapet: 0, units: false, collide: false });
      glassTower(ctx, { x: 101, z: -95, w: 28, d: 18, y0: y + 6, h: 6, tint: [90, 90, 140], seed: 52, slab: false });
      mass(ctx, { x: 107, z: -96, w: 24, d: 16, y0: y + 12, h: 4, mat: panelMat({ wall: '#f5f3ef', kind: 'punched', seed: 53 }), collide: false });
    } });
  // media studio with animated billboards
  mass(ctx, { x: 160, z: -96, w: 34, d: 22, h: 14, mat: M('charcoal'), seed: 54 });
  for (const [bx, bz, ry, s] of [[160, -84.8, 0, 1], [142.8, -96, -Math.PI / 2, 2]]) {
    const b = billboard(s); const m = new THREE.MeshStandardMaterial({ map: b.tex, emissive: 0xffffff, emissiveMap: b.tex, emissiveIntensity: 0.55 });
    const p = new THREE.Mesh(new THREE.PlaneGeometry(16, 8), m); p.position.set(bx, 8, bz); p.rotation.y = ry; ctx.scene.add(p); ctx.animated.push(t => b.draw(t));
  }
  faceSign(ctx, { x: 160, z: -96, w: 34, d: 22 }, 's', 'Lumen Media Studios', 2.6, 0.8, { bg: '#101A32', accent: '#F3A7B5' });
  named(ctx, 'Lumen Media Studios', 'creative', 160, -96, 34, 22, 14);
  // fashion house: glass box with gold fins
  glassTower(ctx, { x: 160, z: -152, w: 30, d: 24, h: 11, tint: [120, 110, 100], seed: 55, slab: false });
  fins(ctx, { x: 160, z: -152, w: 30, d: 24 }, 'w', { h: 11, step: 1.2, depth: 0.6, mat: M('yellow') });
  faceSign(ctx, { x: 160, z: -152, w: 30, d: 24 }, 'w', 'MAISON NOVA · Fashion', 8.2, 0.9, { bg: '#F5F7FB', fg: '#101A32', accent: '#C8B8F4' });
  named(ctx, 'Maison Nova Fashion House', 'creative', 160, -152, 30, 24, 11);
  // design school: converted brick warehouse
  mass(ctx, { x: 104, z: -156, w: 34, d: 28, h: 15, mat: panelMat({ wall: '#9a5a45', kind: 'punched', seed: 56, glass: [70, 90, 110] }), seed: 56 });
  faceSign(ctx, { x: 104, z: -156, w: 34, d: 28 }, 'e', 'Quarter School of Design', 12.5, 0.9, { bg: '#F5F7FB', fg: '#101A32', accent: '#F3A7B5' });
  named(ctx, 'Quarter School of Design', 'creative', 104, -156, 34, 28, 15);
  // sculptures + trees in the creative courtyard
  ctx.geo(new THREE.TorusKnotGeometry(1.4, 0.4, 96, 12), M('violet'), mat4(132, 3, -125));
  ctx.box(132, 0.15, -125, 3, 0.8, 3, M('concrete'), { collide: true });
  for (let i = 0; i < 5; i++) treeAt(ctx, 118 + i * 7, -118 - (i % 2) * 14, 0.9, 0.15);
  for (let i = 0; i < 4; i++) umbrellaTable(ctx, 140 + i * 4, -138, ['#F3A7B5', '#C8B8F4', '#51C9E8', '#F3C679'][i]);
  return ag;
}

// ======================================================================== FORGE & FORM
function forge(ctx) {
  blockBase(ctx, 130, 0, M('concrete'));
  featuredBuilding(ctx, { id: 'engineering', name: 'Atlas Engineering & Architecture', district: 'forge', x: 92, z: -22, w: 20, d: 34, face: 'w', gfH: 5,
    wallMat: M('offwhite'), floorMat: M('concrete'), signText: 'ATLAS · Engineering & Architecture', signOpts: { accent: '#9EBDFF' },
    upper: (y) => { mass(ctx, { x: 92, z: -22, w: 20, d: 34, y0: y, h: 9, mat: M('wood'), collide: false, seed: 61 });
      glassTower(ctx, { x: 92, z: -22, w: 18, d: 32, y0: y + 9, h: 4, tint: [100, 120, 140], seed: 62, slab: false }); } });
  // construction site: steel frame skeleton, crane, fence, containers
  const sx = 150, sz = -25;
  ctx.box(sx, 0.15, sz, 40, 0.05, 40, M('concrete'), { shadow: false });
  for (let fx = -15; fx <= 15; fx += 7.5) for (let fz = -15; fz <= 15; fz += 7.5) { ctx.box(sx + fx, 0.15, sz + fz, 0.4, 16, 0.4, M('steel')); ctx.collider(sx + fx - 0.3, sx + fx + 0.3, sz + fz - 0.3, sz + fz + 0.3, 0, 16); }
  for (let y = 4; y <= 16; y += 4) { for (let fz = -15; fz <= 15; fz += 7.5) ctx.box(sx, y, sz + fz, 30.4, 0.35, 0.3, M('steel')); for (let fx = -15; fx <= 15; fx += 7.5) ctx.box(sx + fx, y, sz, 0.3, 0.35, 30.4, M('steel')); if (y <= 8) ctx.box(sx, y + 0.35, sz, 30, 0.25, 30, M('concrete')); }
  crane(ctx, sx + 20, sz + 18, 38, 34);
  for (const [fx0, fz0, fx1, fz1] of [[sx - 19, sz - 19, sx + 19, sz - 19], [sx - 19, sz + 19, sx + 19, sz + 19], [sx - 19, sz - 19, sx - 19, sz + 19], [sx + 19, sz - 19, sx + 19, sz + 19]]) {
    const len = Math.hypot(fx1 - fx0, fz1 - fz0); ctx.box((fx0 + fx1) / 2, 0.15, (fz0 + fz1) / 2, fx0 === fx1 ? 0.08 : len, 2, fx0 === fx1 ? len : 0.08, M('fabricBlue'), { collide: true });
  }
  for (let i = 0; i < 3; i++) ctx.box(176, 0.15, -40 + i * 7, 6, 2.6, 2.5, [M('orange'), M('fabricBlue'), M('red')][i], { collide: true });
  sign(ctx, 'Forge & Form Construction · Hard hats required', sx, 2.6, sz + 19.1, 0, 0.45, { bg: '#F3C679', fg: '#101A32', backing: false });
  named(ctx, 'Skyline Construction Site', 'forge', sx, sz, 40, 40, 16);
  // factory
  factory(ctx, { x: 138, z: 34, w: 60, d: 26, h: 9 });
  faceSign(ctx, { x: 138, z: 34, w: 60, d: 26 }, 'w', 'Forge Advanced Manufacturing', 6.6, 0.8, { bg: '#101A32', accent: '#9EBDFF' });
  named(ctx, 'Forge Advanced Manufacturing', 'forge', 138, 34, 60, 26, 12);
  // architecture studio
  glassTower(ctx, { x: 92, z: 30, w: 18, d: 20, h: 12, tint: [110, 130, 140], seed: 63 });
  mass(ctx, { x: 92, z: 30, w: 18.6, d: 20.6, y0: 12, h: 1.2, mat: M('concrete'), parapet: 0, units: false, collide: false });
  faceSign(ctx, { x: 92, z: 30, w: 18, d: 20 }, 'w', 'Form Studio Architects', 9.5, 0.7, { bg: '#F5F7FB', fg: '#101A32', accent: '#9EBDFF' });
  named(ctx, 'Form Studio Architects', 'forge', 92, 30, 18, 20, 13);
}

// ======================================================================== CODE NEXUS
function nexus(ctx) {
  blockBase(ctx, -130, 0, M('concrete'));
  featuredBuilding(ctx, { id: 'software', name: 'Nexus Software HQ', district: 'nexus', x: -94, z: -14, w: 22, d: 36, face: 'e', gfH: 5,
    wallMat: M('charcoal'), floorMat: M('concrete'), signText: 'NEXUS · Software & AI', signOpts: { accent: '#51C9E8' },
    upper: (y) => { glassTower(ctx, { x: -94, z: -14, w: 22, d: 36, y0: y, h: 40, tint: [35, 55, 75], seed: 71, slab: false, mullion: '#0a0d12' });
      for (let yy = y + 4; yy < y + 40; yy += 4) ctx.box(-94, yy, -14, 22.3, 0.12, 36.3, M('cyan'), { shadow: false }); } });
  // robotics lab with dome
  panelBlock(ctx, { x: -94, z: 36, w: 22, d: 24, h: 10, wall: '#f4f5f7', kind: 'ribbon', seed: 72 });
  ctx.geo(new THREE.SphereGeometry(8, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), M('metalLight'), mat4(-94, 10.9, 36));
  faceSign(ctx, { x: -94, z: 36, w: 22, d: 24 }, 'e', 'Robotics Lab', 7.4, 0.8, { bg: '#101A32', accent: '#51C9E8' });
  named(ctx, 'Nexus Robotics Lab', 'nexus', -94, 36, 22, 24, 19);
  // cyber security operations
  glassTower(ctx, { x: -156, z: -30, w: 30, d: 30, h: 13, tint: [30, 40, 55], seed: 73, mullion: '#05070a' });
  faceSign(ctx, { x: -156, z: -30, w: 30, d: 30 }, 'e', 'Sentinel Cyber Security', 10, 0.8, { bg: '#0b0f1a', fg: '#51C9E8', accent: '#51C9E8' });
  named(ctx, 'Sentinel Cyber Security', 'nexus', -156, -30, 30, 30, 13);
  // AI data centre with cooling fans
  mass(ctx, { x: -156, z: 30, w: 34, d: 38, h: 9, mat: M('concrete'), units: false, seed: 74 });
  for (let i = 0; i < 4; i++) for (let k = 0; k < 3; k++) { const fx = -168 + i * 8, fz = 18 + k * 12; ctx.geo(ucyl(2.2, 2.2, 1.4, 20), M('metalLight'), mat4(fx, 9.7, fz)); ctx.geo(new THREE.CylinderGeometry(1.9, 1.9, 0.05, 20), M('charcoal'), mat4(fx, 10.43, fz)); }
  faceSign(ctx, { x: -156, z: 30, w: 34, d: 38 }, 'e', 'Nexus AI Data Centre', 6.4, 0.8, { bg: '#101A32', accent: '#51C9E8' });
  named(ctx, 'Nexus AI Data Centre', 'nexus', -156, 30, 34, 38, 10);
  for (let i = 0; i < 4; i++) treeAt(ctx, -120, -40 + i * 26, 0.9, 0.15);
}

// ======================================================================== TASTE DISTRICT
function taste(ctx) {
  blockBase(ctx, -130, 130, M('plaza'));
  featuredBuilding(ctx, { id: 'kitchen', name: 'Atelier Restaurant & Culinary School', district: 'taste', x: -148, z: 96, w: 34, d: 20, face: 'n', gfH: 5.5,
    wallMat: M('brick'), floorMat: M('parquet'), signText: 'ATELIER · Restaurant & Culinary School', signOpts: { accent: '#FFBA91' },
    upper: (y) => { mass(ctx, { x: -148, z: 96, w: 34, d: 20, y0: y, h: 5, mat: panelMat({ wall: '#8e4f3a', kind: 'punched', seed: 81, glass: [90, 80, 70] }), collide: false, seed: 81 });
      ctx.box(-148, y - 0.6, 85.2, 30, 0.12, 2.4, M('navy')); } }); // awning
  for (let i = 0; i < 6; i++) umbrellaTable(ctx, -164 + i * 6.4, 80.5, i % 2 ? '#F5F7FB' : '#101A32');
  // Hotel Aurelia
  mass(ctx, { x: -96, z: 124, w: 24, d: 24, h: 8, mat: M('limestone'), parapet: 0, units: false });
  mass(ctx, { x: -96, z: 124, w: 22, d: 22, y0: 8, h: 40, mat: panelMat({ wall: '#e4dccd', kind: 'punched', seed: 82, glass: [80, 100, 120] }), seed: 82 });
  ctx.box(-96, 4.5, 111.2, 12, 0.3, 3.6, M('metalDark'));
  faceSign(ctx, { x: -96, z: 124, w: 24, d: 24 }, 'n', 'Hotel Aurelia', 6, 1.0, { bg: null, fg: '#7a5a1e', glow: 0.1, backing: false });
  named(ctx, 'Hotel Aurelia', 'taste', -96, 124, 24, 24, 48);
  // café row facing the boulevard
  const cafes = [['Olive & Thyme', '#556b2f'], ['Café Lumière', '#7a4b2a'], ['Noodle Lab', '#b03a2e'], ['Green Bowl', '#2f9e5b']];
  cafes.forEach(([nm, col], i) => { const z = 116 + i * 17; mass(ctx, { x: -178, z, w: 14, d: 15, h: 7 + (i % 2) * 2, mat: panelMat({ wall: ['#efe7da', '#e8ddd0', '#f1ece2', '#e2e6dd'][i], kind: 'punched', seed: 83 + i }), seed: 83 + i, units: false });
    ctx.box(-185.6, 3.2, z, 1.6, 0.12, 12, new THREE.MeshStandardMaterial({ color: col, roughness: 0.9 }));
    faceSign(ctx, { x: -178, z, w: 14, d: 15 }, 'w', nm, 4.4, 0.7, { bg: '#F5F7FB', fg: col, backing: true }); named(ctx, nm, 'taste', -178, z, 14, 15, 9); });
  // pastry school
  panelBlock(ctx, { x: -120, z: 170, w: 40, d: 20, h: 10, wall: '#f3e6dc', kind: 'ribbon', seed: 88, glass: [110, 100, 95] });
  faceSign(ctx, { x: -120, z: 170, w: 40, d: 20 }, 's', 'Sucre Pastry School', 7.4, 0.8, { bg: '#F5F7FB', fg: '#8b4a5f', accent: '#F3A7B5' });
  named(ctx, 'Sucre Pastry School', 'taste', -120, 170, 40, 20, 10);
  for (let i = 0; i < 4; i++) treeAt(ctx, -150 + i * 12, 140, 1, 0.15);
}

// ======================================================================== MARKET STREET
function market(ctx) {
  blockBase(ctx, 0, 130, M('plaza'));
  featuredBuilding(ctx, { id: 'store', name: 'Market Hall Store', district: 'market', x: 0, z: 90, w: 30, d: 20, face: 'n', gfH: 5.5,
    wallMat: M('offwhite'), floorMat: M('concrete'), signText: 'MARKET HALL · Retail & Business', signOpts: { accent: '#FFCCAB' },
    upper: (y) => { mass(ctx, { x: 0, z: 90, w: 30, d: 20, y0: y, h: 5, mat: glassMat({ tint: [110, 105, 95], seed: 91 }), collide: false });
      ctx.box(0, y - 0.6, 79.2, 26, 0.12, 2.4, M('orange')); } });
  const shops = [[-42, 'Bloom Florist', '#c8507a', '#fdf1f5'], [-24, 'Urban Goods', '#3a4a5c', '#eef0f2'], [24, 'Tech Corner', '#2563c9', '#eef4ff'], [42, 'Book Nook', '#7a4b2a', '#fbf4ea']];
  shops.forEach(([x, nm, col, wall], i) => { mass(ctx, { x, z: 88, w: 16, d: 16, h: 8 + (i % 2) * 3, mat: panelMat({ wall, kind: 'punched', seed: 92 + i }), seed: 92 + i, units: false });
    ctx.box(x, 3.4, 79.4, 14, 0.12, 2, new THREE.MeshStandardMaterial({ color: col, roughness: 0.9 }));
    ctx.box(x, 0.15, 80.05, 12, 3, 0.08, M('glassClear'), { shadow: false });
    faceSign(ctx, { x, z: 88, w: 16, d: 16 }, 'n', nm, 4.6, 0.7, { bg: '#F5F7FB', fg: col }); named(ctx, nm, 'market', x, 88, 16, 16, 10); });
  // business & entrepreneurship centre
  glassTower(ctx, { x: -26, z: 145, w: 38, d: 30, h: 30, tint: [75, 105, 130], seed: 96 });
  faceSign(ctx, { x: -26, z: 145, w: 38, d: 30 }, 'n', 'Founders Business Centre', 4, 0.8, { bg: '#101A32', accent: '#FFCCAB' });
  named(ctx, 'Founders Business Centre', 'market', -26, 145, 38, 30, 30);
  // logistics warehouse with loading docks and vans
  mass(ctx, { x: 32, z: 150, w: 40, d: 40, h: 11, mat: panelMat({ wall: '#c4c9cf', kind: 'ribbon', seed: 97, floors: 2, glass: [90, 100, 110] }), seed: 97 });
  for (let i = 0; i < 4; i++) { ctx.box(11.9, 0.15, 136 + i * 9, 0.2, 4, 3.6, M('charcoal')); }
  faceSign(ctx, { x: 32, z: 150, w: 40, d: 40 }, 'w', 'SwiftRoute Logistics', 8, 0.9, { bg: '#101A32', accent: '#FFCCAB' });
  named(ctx, 'SwiftRoute Logistics Hub', 'market', 32, 150, 40, 40, 11);
  for (let i = 0; i < 2; i++) { const v = makeCar(0xf5f7fb, 'van'); v.position.set(6, 0.15, 140 + i * 18); v.rotation.y = -Math.PI / 2; ctx.scene.add(v); ctx.collider(3, 9, 137 + i * 18, 143 + i * 18, 0, 2); }
}

// ======================================================================== CIVIC SQUARE
function civic(ctx) {
  blockBase(ctx, 130, 130, M('plaza'));
  const inner = classical(ctx, { x: 130, z: 122, w: 40, d: 22, h: 16, face: 'n', cols: 8, enterable: true });
  sign(ctx, 'TALENTOPIA COURTHOUSE', 130, 13.6, 99.85, Math.PI, 1.0, { bg: null, fg: '#5a4a2a', glow: 0.1, backing: false });
  named(ctx, 'Talentopia Courthouse', 'civic', 130, 118, 42, 30, 17, 'court');
  feature(ctx, { id: 'court', name: 'Talentopia Courthouse', district: 'civic', face: 'n', ...inner, x: 130, z: 122, w: 40, d: 22, gfH: 10.3 });
  // civic square in front
  for (const x of [92, 168]) { treeAt(ctx, x, 84, 1.1, 0.15); treeAt(ctx, x, 96, 1, 0.15); benchAt(ctx, x + (x < 130 ? 6 : -6), 90, x < 130 ? Math.PI / 2 : -Math.PI / 2); }
  // law firm tower
  mass(ctx, { x: 170, z: 166, w: 22, d: 22, h: 6, mat: M('limestone'), parapet: 0, units: false });
  glassTower(ctx, { x: 170, z: 166, w: 20, d: 20, y0: 6, h: 34, tint: [85, 100, 120], seed: 101 });
  faceSign(ctx, { x: 170, z: 166, w: 22, d: 22 }, 'w', 'Hale & Partners Law', 4.2, 0.8, { bg: '#101A32', accent: '#C8B8F4' });
  named(ctx, 'Hale & Partners Law', 'civic', 170, 166, 22, 22, 40);
  // teaching centre
  mass(ctx, { x: 96, z: 166, w: 34, d: 24, h: 14, mat: panelMat({ wall: '#a8604a', kind: 'ribbon', seed: 102, glass: [80, 100, 115] }), seed: 102 });
  faceSign(ctx, { x: 96, z: 166, w: 34, d: 24 }, 'e', 'Talentopia Teaching Centre', 11.2, 0.8, { bg: '#F5F7FB', fg: '#101A32', accent: '#C8B8F4' });
  named(ctx, 'Talentopia Teaching Centre', 'civic', 96, 166, 34, 24, 14);
  // social sciences institute
  panelBlock(ctx, { x: 176, z: 118, w: 18, d: 28, h: 18, wall: '#efe9de', kind: 'punched', seed: 103 });
  faceSign(ctx, { x: 176, z: 118, w: 18, d: 28 }, 'n', 'Institute of Social Sciences', 15, 0.7, { bg: '#101A32', accent: '#C8B8F4' });
  named(ctx, 'Institute of Social Sciences', 'civic', 176, 118, 18, 28, 18);
}

// ======================================================================== PLANET LAB (three blocks on the west edge)
function planet(ctx) {
  for (const z of [-130, 0, 130]) blockBase(ctx, -260, z, M('grass'));
  featuredBuilding(ctx, { id: 'research', name: 'Planet Research Institute', district: 'planet', x: -226, z: -8, w: 24, d: 40, face: 'e', gfH: 5,
    wallMat: M('white'), floorMat: M('concrete'), signText: 'PLANET RESEARCH INSTITUTE', signOpts: { accent: '#78D8B5' },
    upper: (y) => { mass(ctx, { x: -226, z: -8, w: 24, d: 40, y0: y, h: 12, mat: panelMat({ wall: '#f4f2ec', kind: 'ribbon', seed: 111, glass: [90, 125, 120] }), roofMat: M('roofGreen'), collide: false, units: false });
      fins(ctx, { x: -226, z: -8, w: 24, d: 40 }, 'e', { y0: y, h: 12, step: 1.8, depth: 0.7, mat: M('wood') }); } });
  ctx.box(-260, 0.15, 0, 112, 0.05, 6, M('sidewalk'), { shadow: false });
  dome(ctx, { x: -282, z: -26, r: 12 }); dome(ctx, { x: -284, z: 18, r: 9 }); dome(ctx, { x: -262, z: 40, r: 6.5 });
  named(ctx, 'Biodome Greenhouses', 'planet', -282, -5, 30, 60, 12);
  // lake + boardwalk + environmental centre (north block)
  ctx.geo(new THREE.CircleGeometry(30, 48), M('water'), mat4(-268, 0.2, -128, 0, 1.4, 1, 1, -Math.PI / 2), false); ctx.collider(-306, -230, -152, -104, 0, 1);
  ctx.box(-232, 0.15, -128, 30, 0.35, 3, M('wood'), { shadow: false }); ctx.floor(-247, -217, -129.5, -126.5, 0.5);
  mass(ctx, { x: -232, z: -170, w: 30, d: 18, h: 8, mat: M('wood'), roofMat: M('roofGreen'), units: false, seed: 112 });
  faceSign(ctx, { x: -232, z: -170, w: 30, d: 18 }, 'e', 'Environmental Science Centre', 5.6, 0.7, { bg: '#F5F7FB', fg: '#1f5e45', accent: '#78D8B5' });
  named(ctx, 'Environmental Science Centre', 'planet', -232, -170, 30, 18, 8);
  for (let i = 0; i < 8; i++) treeAt(ctx, -300 + (i % 4) * 22, -175 + (i >> 2) * 90, 1.1, 0.15);
  // chemical engineering pilot plant (south block)
  const px = -265, pz = 125;
  for (let i = 0; i < 4; i++) { ctx.geo(ucyl(3, 3, 12, 24), M('metalLight'), mat4(px - 18 + i * 8, 6.15, pz - 10)); ctx.geo(new THREE.SphereGeometry(3, 24, 12, 0, 6.3, 0, Math.PI / 2), M('metalLight'), mat4(px - 18 + i * 8, 12.15, pz - 10)); ctx.collider(px - 21 + i * 8, px - 15 + i * 8, pz - 13, pz - 7, 0, 15); }
  for (const cx of [px + 16, px + 22]) { ctx.geo(ucyl(1.4, 1.4, 24, 16), M('white'), mat4(cx, 12.15, pz + 4)); ctx.collider(cx - 1.5, cx + 1.5, pz + 2.5, pz + 5.5, 0, 24); }
  for (let y = 4; y < 12; y += 3.5) ctx.box(px, y, pz + 4, 40, 0.4, 0.4, M('yellow'));
  ctx.box(px, 0.15, pz + 4, 40, 0.2, 2, M('metalDark'));
  panelBlock(ctx, { x: px + 6, z: pz + 22, w: 30, d: 14, h: 8, wall: '#eef0ee', kind: 'ribbon', seed: 113 });
  faceSign(ctx, { x: px + 6, z: pz + 22, w: 30, d: 14 }, 'n', 'Chemical Engineering Pilot Plant', 6, 0.7, { bg: '#101A32', accent: '#78D8B5' });
  named(ctx, 'Chemical Engineering Pilot Plant', 'planet', px, pz, 50, 40, 24);
  for (let r = 0; r < 4; r++) solarRow(ctx, -305, 160 + r * 6, 8);
  for (const [tx, tz] of [[-360, -120], [-360, -40], [-360, 40], [-360, 120], [-390, 0]]) turbine(ctx, tx, tz, 34);
}

// ======================================================================== SKYPORT (east of the grid)
function sky(ctx) {
  ctx.box(305, 0, 0, 205, 0.15, 400, M('concrete'), { shadow: false }); ctx.floor(203, 410, -200, 200, 0.15);
  // terminal (enterable) with a curved roof
  const tm = featuredBuilding(ctx, { id: 'terminal', name: 'Skyport Terminal', district: 'sky', x: 228, z: 0, w: 30, d: 80, face: 'w', gfH: 7,
    wallMat: M('white'), floorMat: M('marble'), signText: 'SKYPORT · Departures', signOpts: { accent: '#99DFFA' },
    upper: (y) => { const roof = ucyl(24, 24, 88, 32, true, Math.PI * 0.42, -Math.PI * 0.21); ctx.geo(roof, M('metalLight'), mat4(228, y - 17.6, 0, 0, 1, 1, 1, Math.PI / 2)); } });
  // control tower
  ctx.geo(ucyl(2.6, 3.4, 38, 24), M('white'), mat4(266, 19, -64)); ctx.collider(262.5, 269.5, -67.5, -60.5, 0, 38);
  ctx.geo(ucyl(6.5, 5, 5, 24), glassMat({ tint: [60, 100, 130], bays: 6, floors: 1, floorH: 5, seed: 121 }), mat4(266, 40.5, -64));
  ctx.geo(new THREE.CylinderGeometry(7, 7, 0.8, 24), M('charcoal'), mat4(266, 43.4, -64)); ctx.geo(new THREE.CylinderGeometry(0.1, 0.1, 6, 6), M('metalDark'), mat4(266, 46.8, -64));
  named(ctx, 'Air Traffic Control Tower', 'sky', 266, -64, 14, 14, 44);
  // hangars
  hangar(ctx, { x: 285, z: 90, w: 34, d: 30 }); hangar(ctx, { x: 285, z: 130, w: 34, d: 30 });
  named(ctx, 'Maintenance Hangars', 'sky', 285, 110, 34, 70, 20);
  // runway, taxiway, apron markings
  ctx.box(345, 0.15, 0, 46, 0.03, 390, M('asphalt'), { shadow: false });
  for (let z = -180; z < 180; z += 20) ctx.box(345, 0.19, z, 1, 0.01, 10, M('white'), { shadow: false });
  for (const zz of [-188, 188]) for (let i = -7; i <= 7; i++) if (i) ctx.box(345 + i * 2.6, 0.19, zz, 1.4, 0.01, 6, M('white'), { shadow: false });
  ctx.box(305, 0.15, 0, 18, 0.02, 390, M('asphalt'), { shadow: false });
  for (let z = -185; z < 185; z += 6) ctx.box(305, 0.18, z, 0.3, 0.01, 3, M('yellow'), { shadow: false });
  // parked aircraft
  const plane = () => { const g = new THREE.Group(); const body = new THREE.MeshPhysicalMaterial({ color: 0xf5f7fb, metalness: 0.2, roughness: 0.35, clearcoat: 0.8 });
    const f = new THREE.Mesh(new THREE.CapsuleGeometry(2, 30, 8, 20), body); f.rotation.x = Math.PI / 2; g.add(f);
    const wing = new THREE.Mesh(new THREE.BoxGeometry(34, 0.4, 5), body); wing.position.set(0, -0.6, 1); g.add(wing);
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.4, 6, 4), M('violet')); tail.position.set(0, 3.4, -15); g.add(tail);
    const hs = new THREE.Mesh(new THREE.BoxGeometry(11, 0.3, 2.5), body); hs.position.set(0, 0.6, -15.5); g.add(hs);
    for (const s of [-1, 1]) { const e = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 4, 16), M('metalLight')); e.rotation.x = Math.PI / 2; e.position.set(s * 7, -1.6, 2.5); g.add(e); }
    const w = new THREE.Mesh(new THREE.BoxGeometry(4.04, 0.6, 26), M('charcoal')); w.position.set(0, 0.7, 0); w.scale.set(1, 1, 1); g.add(w);
    g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } }); return g; };
  for (const [z, ry] of [[-30, -Math.PI / 2], [30, -Math.PI / 2]]) { const p = plane(); p.position.set(272, 3.4, z); p.rotation.y = ry; ctx.scene.add(p); ctx.collider(256, 290, z - 17, z + 17, 0, 7); }
  const flyer = plane(); ctx.scene.add(flyer);
  ctx.animated.push(t => { const c = (t % 60) / 60; let z, y; if (c < 0.6) { z = -180 + c / 0.6 * 300; y = 3.4 + Math.max(0, (c - 0.35) / 0.25) ** 2 * 24; } else { z = 120 + (c - 0.6) * 1200; y = 27.4 + (c - 0.6) * 500; }
    flyer.position.set(345, y, z); flyer.rotation.set(-(c > 0.45 ? 0.16 : 0), 0, 0); flyer.visible = y < 400; });
  // mobility & automotive engineering centre with cars inside
  glassTower(ctx, { x: 232, z: 150, w: 36, d: 28, h: 12, tint: [110, 125, 140], seed: 122, slab: false });
  faceSign(ctx, { x: 232, z: 150, w: 36, d: 28 }, 'w', 'Mobility & Automotive Engineering Centre', 9.6, 0.7, { bg: '#101A32', accent: '#99DFFA' });
  named(ctx, 'Mobility & Automotive Engineering Centre', 'sky', 232, 150, 36, 28, 12);
  // transit hub: bus shelters
  busStop(ctx, 215, -120, -Math.PI / 2, 'Skyport Transit Hub'); busStop(ctx, 215, -140, -Math.PI / 2, 'Skyport Transit Hub');
  panelBlock(ctx, { x: 238, z: -150, w: 26, d: 34, h: 9, wall: '#e8edf2', kind: 'ribbon', seed: 123 });
  faceSign(ctx, { x: 238, z: -150, w: 26, d: 34 }, 'w', 'Transport Systems Institute', 6.8, 0.7, { bg: '#101A32', accent: '#99DFFA' });
  named(ctx, 'Transport Systems Institute', 'sky', 238, -150, 26, 34, 9);
  // departures board on the forecourt
  const board = new THREE.Mesh(new THREE.PlaneGeometry(6, 3), new THREE.MeshStandardMaterial({ map: boardTex(['TK101  LONDON     08:40  ON TIME', 'TK214  DUBAI      09:15  BOARDING', 'TK330  TOKYO      10:05  ON TIME', 'TK402  NEW YORK   11:30  DELAYED'], { title: 'Departures' }), emissive: 0xffffff, emissiveIntensity: 0.4 }));
  board.material.emissiveMap = board.material.map; board.position.set(211, 3.4, 18); board.rotation.y = -Math.PI / 2; ctx.scene.add(board);
  ctx.box(211.1, 0.15, 18, 0.2, 5, 6.4, M('charcoal'), { collide: true });
  return tm;
}

export function buildDistricts(ctx) {
  const builders = { med: medcity, capital, creative, forge, nexus, taste, planet, civic, market, sky };
  for (const d of DISTRICTS) { ctx._footColor = '#cfc9bd'; builders[d.id](ctx); }
}
