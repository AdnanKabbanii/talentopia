// Talentopia V4: New York style blocks around the career city.
// Buildings are authored in Blender (blender/nyc.py -> assets/city/nyc/*.glb, Draco-compressed geometry + material names),
// textured here with shared photo-scanned CC0 PBR sets (Poly Haven) and drawn as InstancedMeshes (one draw call per type x material).
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { pbr, rng } from './textures.js';

// footprints (w along x = street frontage, d depth) as authored in nyc.py
const FOOT = {
  prewar_a: [24, 20], prewar_b: [18, 18], prewar_c: [30, 22], prewar_d: [15, 16], prewar_e: [21, 20], brownstones: [24, 14],
  office_a: [34, 30], office_b: [28, 26], office_c: [40, 36], glass_a: [30, 30], glass_b: [26, 36], glass_c: [22, 22], deco_a: [36, 36], deco_b: [30, 30],
};
const LOW = ['prewar_a', 'prewar_b', 'prewar_c', 'prewar_d', 'prewar_e', 'brownstones'];
const MID = ['prewar_a', 'prewar_c', 'prewar_e', 'office_a', 'office_b', 'glass_b'];
const TALL = ['office_c', 'glass_a', 'glass_c', 'deco_a', 'deco_b', 'glass_b', 'office_a'];
const FAR_ONLY = t => t.startsWith('office') || t.startsWith('deco');

// city playable rectangle (x, z) and its edge streets; the ring of blocks starts one street beyond it
const C = { x0: -345, x1: 430, z0: -215, z1: 215 };

function materials(envMap) {
  const brick = (n, tile = 3, color = 0xffffff) => new THREE.MeshStandardMaterial({ ...pbr(n, tile), color, roughness: 0.9, metalness: 0, normalScale: new THREE.Vector2(0.9, 0.9) });
  const std = (o) => new THREE.MeshStandardMaterial({ roughness: 0.6, metalness: 0, ...o });
  const glass = (color, o = {}) => new THREE.MeshStandardMaterial({ color, metalness: 0.95, roughness: 0.04, envMapIntensity: 1.6, ...o });
  return {
    BrickRed: brick('red_brick_03', 2.4), BrickYellow: brick('yellow_bricks', 2.6, 0xf2e6d2), BrickBrown: brick('brown_brick_02', 2.4), BrickDark: brick('dark_brick_wall', 2.4),
    Sandstone: brick('red_sandstone_wall', 3, 0xc99a84), Limestone: brick('concrete_tile_facade', 4, 0xeee6d8), Granite: brick('granite_tile', 2, 0x9a958f),
    Cornice: std({ color: 0xe4dccd, roughness: 0.75 }), CorniceDark: std({ color: 0x3b2c24, roughness: 0.6 }),
    Glass: glass(0x52606c, { metalness: 0.75, roughness: 0.07 }), GlassBlind: std({ color: 0xa89e88, roughness: 0.25, metalness: 0.45, envMapIntensity: 1.0 }),
    GlassLit: std({ color: 0x4a4436, emissive: 0xffd9a0, emissiveIntensity: 0.12, roughness: 0.15, metalness: 0.6, envMapIntensity: 1.2 }),
    GlassShop: glass(0x37424a, { metalness: 0.6, roughness: 0.08, emissive: 0x3a2e20, emissiveIntensity: 0.4 }),
    GlassCurtain: glass(0x6d8aa4, { metalness: 1.0, roughness: 0.03, envMapIntensity: 1.9 }),
    Frame: std({ color: 0xf1ede6, roughness: 0.5 }), Mullion: std({ color: 0x9aa4ad, metalness: 0.85, roughness: 0.35 }),
    Steel: std({ color: 0x1b1d20, metalness: 0.6, roughness: 0.55 }), Metal: std({ color: 0xa9b0b6, metalness: 0.9, roughness: 0.32 }),
    Roof: std({ color: 0x55534f, roughness: 0.95 }), Wood: std({ color: 0x7a5a3d, roughness: 0.85 }),
    AwningRed: std({ color: 0x8e2420, roughness: 0.8 }), AwningGreen: std({ color: 0x1f4a33, roughness: 0.8 }), AwningNavy: std({ color: 0x1d2a44, roughness: 0.8 }), AwningCream: std({ color: 0xd9ceb5, roughness: 0.8 }),
    SignA: std({ color: 0x1a1a1a, emissive: 0xf3c679, emissiveIntensity: 0.15 }), SignB: std({ color: 0x8d70ff, emissive: 0x8d70ff, emissiveIntensity: 0.25 }),
    SignC: std({ color: 0x0f3a2c, roughness: 0.5 }), SignD: std({ color: 0x7a1f2b, roughness: 0.5 }),
  };
}

// lay out blocks beyond the city: perimeter street walls facing every street, towers in Midtown/Downtown clusters
function plan(density) {
  const r = rng(77), out = [];
  const BW = 70, BD = 110, ST = 14; // block size and street width (Manhattan-like long blocks)
  const R = 520; // how far out the ring goes beyond the city rectangle
  const inCity = (x0, x1, z0, z1) => x1 > C.x0 && x0 < C.x1 && z1 > C.z0 && z0 < C.z1;
  const distOut = (x, z) => Math.max(C.x0 - x, x - C.x1, C.z0 - z, z - C.z1, 0);
  const blocks = [];
  for (let x = C.x0 - R; x < C.x1 + R; x += BW + ST) for (let z = C.z0 - R; z < C.z1 + R; z += BD + ST) {
    const b = { x0: x, x1: x + BW, z0: z, z1: z + BD };
    if (inCity(b.x0 - 6, b.x1 + 6, b.z0 - 6, b.z1 + 6)) continue;
    const cx = (b.x0 + b.x1) / 2, cz = (b.z0 + b.z1) / 2; b.d = distOut(cx, cz); if (b.d > R) continue;
    // keep the Skyport approach (east, behind the runway) low and open
    b.east = cx > C.x1 && Math.abs(cz) < 260; blocks.push(b);
  }
  for (const b of blocks) {
    const near = b.d < 70, cx = (b.x0 + b.x1) / 2, cz = (b.z0 + b.z1) / 2;
    const midtown = Math.hypot(cx - 60, cz + 560) < 330, downtown = Math.hypot(cx + 120, cz - 560) < 300, westside = Math.hypot(cx + 640, cz) < 220;
    const tall = !b.east && (midtown || downtown || westside);
    const pool = b.east ? LOW : tall ? MID : (b.d < 200 ? LOW : MID);
    if (!near && r() > density) continue;
    // rows behind the first two rings are hidden from the street: keep only skyline towers and a sparse fill there
    const deep = b.d >= 150, perimeter = !deep || (tall ? r() < 0.4 : r() < 0.18);
    // four sides: N & S full length, E & W between them
    const sides = [
      { n: [0, -1], len: BW, at: t => [b.x0 + t, b.z0], ry: Math.PI, along: [1, 0] },
      { n: [0, 1], len: BW, at: t => [b.x1 - t, b.z1], ry: 0, along: [-1, 0] },
      { n: [1, 0], len: BD - 40, at: t => [b.x1, b.z0 + 20 + t], ry: Math.PI / 2, along: [0, 1] },
      { n: [-1, 0], len: BD - 40, at: t => [b.x0, b.z1 - 20 - t], ry: -Math.PI / 2, along: [0, -1] },
    ];
    for (const s of (perimeter ? sides : [])) {
      let t = 0;
      while (t < s.len - 8) {
        const type = pool[Math.floor(r() * pool.length)]; const [w, d] = FOOT[type];
        if (t + w > s.len + 2) break;
        const [px, pz] = s.at(t + w / 2); const x = px - s.n[0] * d / 2, z = pz - s.n[1] * d / 2;
        // the row facing the city gets the detailed near version
        const facesCity = (s.n[0] < 0 && b.x0 > C.x1) || (s.n[0] > 0 && b.x1 < C.x0) || (s.n[1] < 0 && b.z0 > C.z1) || (s.n[1] > 0 && b.z1 < C.z0);
        out.push({ type, x, z, ry: s.ry, hi: near && facesCity && !FAR_ONLY(type) });
        t += w + (r() < 0.15 ? 2 : 0.0);
      }
    }
    if (tall && r() < 0.85) { const type = TALL[Math.floor(r() * TALL.length)]; out.push({ type, x: cx + (r() - 0.5) * 8, z: cz + (r() - 0.5) * 20, ry: Math.floor(r() * 4) * Math.PI / 2, hi: false }); }
  }
  return { list: out, blocks, ST };
}

export function loadNYC(scene, { density = 1, hiDetail = true, shadows = true } = {}) {
  const draco = new DRACOLoader().setDecoderPath('https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/libs/draco/gltf/');
  const loader = new GLTFLoader().setDRACOLoader(draco);
  const MAT = materials();
  const { list, blocks } = plan(density);
  const root = new THREE.Group(); root.name = 'nyc'; scene.add(root);
  // ground for the outer blocks: asphalt streets + raised concrete block tops (two instanced boxes)
  {
    const asph = new THREE.MeshStandardMaterial({ ...pbr('asphalt_02', 6), color: 0x8a8a8a, roughness: 0.95 });
    const walk = new THREE.MeshStandardMaterial({ ...pbr('concrete_pavement', 3), roughness: 0.9 });
    const strips = [[C.x0 - 540, C.x1 + 540, C.z0 - 540, C.z0], [C.x0 - 540, C.x1 + 540, C.z1, C.z1 + 540], [C.x0 - 540, C.x0, C.z0, C.z1], [C.x1, C.x1 + 540, C.z0, C.z1]];
    for (const [x0, x1, z0, z1] of strips) { const m = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, z1 - z0), asph); const uv = m.geometry.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * (x1 - x0), uv.getY(i) * (z1 - z0)); m.rotation.x = -Math.PI / 2; m.position.set((x0 + x1) / 2, 0.004, (z0 + z1) / 2); m.receiveShadow = true; root.add(m); }
    const edge = [[-333, 418, -215, -203.2], [-333, 418, 203.2, 215], [-345, -333.2, -215, 215]];
    for (const [x0, x1, z0, z1] of edge) { const m = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, 0.15, z1 - z0), walk); const uv = m.geometry.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * (x1 - x0), uv.getY(i) * (z1 - z0)); m.position.set((x0 + x1) / 2, 0.075, (z0 + z1) / 2); m.receiveShadow = true; root.add(m); }
    const box = new THREE.BoxGeometry(1, 0.15, 1); box.translate(0, 0.075, 0);
    // world-scale uvs on the top face via a per-instance scale: use a simple tiling instead
    const im = new THREE.InstancedMesh(box, walk, blocks.length); const m4 = new THREE.Matrix4();
    blocks.forEach((b, i) => im.setMatrixAt(i, m4.compose(new THREE.Vector3((b.x0 + b.x1) / 2, -0.02, (b.z0 + b.z1) / 2), new THREE.Quaternion(), new THREE.Vector3(b.x1 - b.x0 + 6, 1, b.z1 - b.z0 + 6))));
    im.receiveShadow = true; root.add(im);
  }
  // group placements by file
  const byFile = {};
  for (const p of list) { const f = p.type + (p.hi && hiDetail ? '' : '_lo'); (byFile[f] = byFile[f] || []).push(p); }
  const q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), m4 = new THREE.Matrix4(), one = new THREE.Vector3(1, 1, 1);
  const stats = { buildings: list.length, files: Object.keys(byFile).length, tris: 0, drawCalls: 0 };
  const jobs = Object.entries(byFile).map(([file, ps]) => new Promise(res => loader.load(`assets/city/nyc/${file}.glb`, g => {
    const near = !file.endsWith('_lo');
    g.scene.updateMatrixWorld(true);
    g.scene.traverse(o => {
      if (!o.isMesh) return;
      const name = (o.material.name || '').replace(/\.\d+$/, ''); const mat = MAT[name] || MAT.Cornice;
      const geo = o.geometry.clone().applyMatrix4(o.matrixWorld);
      const im = new THREE.InstancedMesh(geo, mat, ps.length);
      const tintable = /^(Brick|Sandstone|Limestone|Granite|Glass$|GlassCurtain|Cornice|Awning)/.test(name), col = new THREE.Color();
      ps.forEach((p, i) => { im.setMatrixAt(i, m4.compose(new THREE.Vector3(p.x, 0.13, p.z), q.setFromAxisAngle(up, p.ry), one));
        if (tintable) { const h = Math.abs(Math.sin(p.x * 12.9898 + p.z * 78.233) * 43758.5453) % 1, h2 = Math.abs(Math.sin(p.x * 3.1 + p.z * 1.7) * 9631.7) % 1; // per-building weathering / colour variation
          const k = 0.82 + h * 0.3; col.setRGB(k * (1 + (h2 - 0.5) * 0.12), k, k * (1 - (h2 - 0.5) * 0.14)); im.setColorAt(i, col); } });
      im.computeBoundingSphere(); im.castShadow = shadows && near; im.receiveShadow = true; im.name = 'nyc:' + file + ':' + name;
      root.add(im); stats.drawCalls++; stats.tris += (geo.index ? geo.index.count : geo.attributes.position.count) / 3 * ps.length;
    });
    res();
  }, undefined, () => { console.warn('nyc building failed', file); res(); })));
  return Promise.all(jobs).then(() => (root.userData.stats = stats, root));
}
