// Architecture kit: batching, world-scale UV geometry, materials, building types and street props.
import * as THREE from 'three';
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import * as TX from './textures.js';

// ------------------------------------------------------------------ geometry helpers
// Box with UVs in metres (u along the face, v up) so tiled facade textures keep real proportions.
export function ubox(w, h, d, vOff = 0) {
  const g = new THREE.BoxGeometry(w, h, d); const uv = g.attributes.uv;
  const dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (let f = 0; f < 6; f++) for (let i = 0; i < 4; i++) {
    const k = f * 4 + i; uv.setXY(k, uv.getX(k) * dims[f][0], uv.getY(k) * dims[f][1] + (f < 2 || f > 3 ? vOff : 0));
  }
  return g;
}
export function ucyl(rt, rb, h, seg = 24, open = false, arc = Math.PI * 2, start = 0) {
  const g = new THREE.CylinderGeometry(rt, rb, h, seg, 1, open, start, arc); const uv = g.attributes.uv;
  const circ = Math.max(rt, rb) * arc; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * circ, uv.getY(i) * h);
  return g;
}
const M4 = new THREE.Matrix4(), Q = new THREE.Quaternion(), S1 = new THREE.Vector3(1, 1, 1), V = new THREE.Vector3(), E = new THREE.Euler();
export function mat4(x, y, z, ry = 0, sx = 1, sy = 1, sz = 1, rx = 0, rz = 0) {
  // yaw first, then pitch/roll (so a ground plane laid flat with rx = -PI/2 keeps its heading ry)
  return new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), Q.setFromEuler(E.set(rx, ry, rz, 'YXZ')), new THREE.Vector3(sx, sy, sz));
}

// ------------------------------------------------------------------ batching (merge static geometry per material)
export class Batch {
  constructor() { this.groups = new Map(); }
  add(geo, mat, m, shadow = true) {
    let g = geo.index ? geo.toNonIndexed() : geo.clone();
    for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k);
    if (!g.attributes.uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    if (m) g.applyMatrix4(m);
    const key = mat.uuid + (shadow ? 's' : 'n');
    if (!this.groups.has(key)) this.groups.set(key, { mat, geos: [], shadow });
    this.groups.get(key).geos.push(g);
  }
  flush(parent) {
    const out = [];
    for (const { mat, geos, shadow } of this.groups.values()) {
      for (let i = 0; i < geos.length; i += 400) { // keep chunks moderately sized for culling
        const mg = mergeGeometries(geos.slice(i, i + 400), false); mg.computeBoundingSphere();
        const mesh = new THREE.Mesh(mg, mat); mesh.castShadow = shadow && !mat.transparent; mesh.receiveShadow = true; mesh.matrixAutoUpdate = false;
        parent.add(mesh); out.push(mesh);
      }
    }
    this.groups.clear(); return out;
  }
}
// Instanced props
export class Instancer {
  constructor() { this.parts = new Map(); }
  add(name, partsFn, m) { if (!this.parts.has(name)) this.parts.set(name, { parts: partsFn(), ms: [] }); this.parts.get(name).ms.push(m); }
  flush(parent) {
    for (const { parts, ms } of this.parts.values()) for (const [geo, mat, shadow = true, depthMat = null] of parts) {
      const im = new THREE.InstancedMesh(geo, mat, ms.length); ms.forEach((m, i) => im.setMatrixAt(i, m));
      im.castShadow = shadow; im.receiveShadow = true; if (depthMat) im.customDepthMaterial = depthMat; im.computeBoundingSphere(); parent.add(im);
    }
  }
}

// ------------------------------------------------------------------ materials
const mats = {};
export function M(name) { return mats[name]; }
export function initMaterials(envIntensity = 1) {
  const std = (o) => new THREE.MeshStandardMaterial(o);
  const P = TX.pbr;
  mats.asphalt = std({ ...P('asphalt_02', 6), color: 0x8a8d92, roughness: 0.92 });
  mats.sidewalk = std({ ...P('concrete_pavement', 3), color: 0xd8d4cc, roughness: 0.85 });
  mats.plaza = std({ ...P('concrete_pavement', 1.6), color: 0xe9e0d2, roughness: 0.85 });
  mats.pavers = std({ ...P('white_sandstone_bricks', 1.2), color: 0xdcd2c2, roughness: 0.85 });
  mats.grass = std({ ...P('aerial_grass_rock', 8), color: 0x9fbf7a, roughness: 1 });
  mats.meadow = std({ map: TX.meadowTex(), roughness: 1 });
  mats.marble = std({ ...P('marble_tiles', 2.5), roughness: 0.25 });
  mats.parquet = std({ ...P('herringbone_parquet', 2.5), roughness: 0.55 });
  { const t = new THREE.TextureLoader().load('assets/tex/terrazzo.jpg'); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1 / 2.5, 1 / 2.5); t.anisotropy = 8;
    mats.terrazzo = std({ map: t, roughness: 0.3, envMapIntensity: 1.1 }); } // user-provided seamless terrazzo (2.5 m tile)
  mats.concrete = std({ ...P('brushed_concrete', 4), color: 0xcfcac2, roughness: 0.8 });
  mats.curb = std({ color: 0xbdb8b0, roughness: 0.8 });
  mats.roadLines = std({ map: TX.roadMarkings(), transparent: true, roughness: 0.8, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
  mats.zebra = std({ map: TX.zebra(), transparent: true, roughness: 0.8, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
  mats.roof = std({ color: 0x9a9893, roughness: 0.95 });
  mats.roofGreen = std({ color: 0x7c9a5a, roughness: 1 });
  mats.metalDark = std({ color: 0x2b2f36, metalness: 0.7, roughness: 0.35 });
  mats.metalLight = std({ color: 0xc9ccd1, metalness: 0.8, roughness: 0.3 });
  mats.charcoal = std({ color: 0x33363c, roughness: 0.7 });
  mats.white = std({ color: 0xf2f0eb, roughness: 0.6 });
  mats.offwhite = std({ color: 0xe6e1d6, roughness: 0.7 });
  mats.limestone = std({ map: TX.masonry({ kind: 'limestone', base: '#ddd3bf', mortar: '#cfc5b1' }), roughness: 0.85 });
  mats.brick = std({ map: TX.masonry({ kind: 'brick', base: '#8e4f3a' }), roughness: 0.9 });
  mats.brickDark = std({ map: TX.masonry({ kind: 'brick', base: '#5a4a44', seed: 9 }), roughness: 0.9 });
  mats.wood = std({ map: TX.woodSlats(), roughness: 0.7 });
  mats.limestoneTrim = std({ color: 0xe6dccb, roughness: 0.8 }); // window surrounds on brick
  mats.trimWhite = std({ color: 0xf4f2ee, roughness: 0.55 }); // window surrounds on render / panels
  mats.glassClear = new THREE.MeshPhysicalMaterial({ color: 0xbfd6e6, metalness: 0, roughness: 0.05, transmission: 0, transparent: true, opacity: 0.28, envMapIntensity: 1.5, depthWrite: false });
  mats.water = new THREE.MeshPhysicalMaterial({ color: 0x5f93a8, roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.88, envMapIntensity: 1.4 });
  mats.leaf = std({ color: 0x4f7a36, roughness: 0.85 });
  mats.leaf2 = std({ color: 0x648f40, roughness: 0.85 });
  mats.leaf3 = std({ color: 0x3b5a2c, roughness: 0.95 });
  mats.bark = std({ ...TX.pbr('bark_photo', 1.2), roughness: 1 });
  mats.violet = std({ color: 0x8056f6, emissive: 0x8056f6, emissiveIntensity: 0.6, roughness: 0.4 });
  mats.cyan = std({ color: 0x51c9e8, emissive: 0x51c9e8, emissiveIntensity: 0.8, roughness: 0.4 });
  mats.lilac = std({ color: 0xc8b8f4, roughness: 0.5 });
  mats.navy = std({ color: 0x101a32, roughness: 0.5 });
  mats.lampHead = std({ color: 0xfff6e0, emissive: 0xfff2d0, emissiveIntensity: 0.8 });
  mats.ceilPanel = std({ color: 0xffffff, emissive: 0xfff8ec, emissiveIntensity: 1.2 });
  mats.screen = std({ color: 0x0b1424, emissive: 0x3a6cff, emissiveIntensity: 0.35, roughness: 0.2 });
  mats.solar = std({ color: 0x1d2a4a, metalness: 0.6, roughness: 0.2, envMapIntensity: 1.5 });
  mats.fabricBlue = std({ color: 0x3a5a8c, roughness: 0.9 });
  mats.fabricGrey = std({ color: 0x8e9196, roughness: 0.95 });
  mats.leather = std({ color: 0x5a3b2a, roughness: 0.6 });
  mats.red = std({ color: 0xc8463c, roughness: 0.5 });
  mats.green = std({ color: 0x2f9e5b, emissive: 0x2f9e5b, emissiveIntensity: 0.5 });
  mats.yellow = std({ color: 0xf3c679, roughness: 0.6 });
  mats.orange = std({ color: 0xe8843a, roughness: 0.6 });
  mats.steel = std({ color: 0xe2c33a, metalness: 0.3, roughness: 0.5 }); // crane yellow
  mats.rubber = std({ color: 0x1a1a1c, roughness: 0.9 });
  for (const m of Object.values(mats)) m.envMapIntensity = (m.envMapIntensity || 1) * envIntensity;
}
const facadeCache = {};
// ---- glass with real rooms behind it ("interior mapping"): every window cell is a small 3D room (back wall, floor, ceiling
// light strip, side walls, desks, blinds) traced in the shader, so walking past a facade shows depth and parallax instead of a
// flat picture. Coated glass reflections come from the normal PBR path. UVs are in metres (ubox / upl), cell = one window.
const INTERIOR_FRAG = `
uniform vec2 iCell; uniform vec3 iTint; uniform vec3 iMull; uniform float iSpan, iSeed, iLit, iFrame, iWarm;
varying vec3 vIWPos; varying vec2 vIUv;
vec3 roomCol; float glassM;
float ih( vec2 p ) { p = fract( p * vec2( 123.34, 456.21 ) + iSeed * 0.137 ); p += dot( p, p + 45.32 ); return fract( p.x * p.y ); }`;
const INTERIOR_MAP = `
{
  vec2 q = vIUv / iCell, id = floor( q ), f = fract( q );
  vec3 dpx = dFdx( vIWPos ), dpy = dFdy( vIWPos ); vec2 dux = dFdx( vIUv ), duy = dFdy( vIUv );
  float det = dux.x * duy.y - dux.y * duy.x; det = abs( det ) < 1e-9 ? 1e-9 : det;
  vec3 T = normalize( ( dpx * duy.y - dpy * dux.y ) / det ), Bv = normalize( ( dpy * dux.x - dpx * duy.x ) / det ), N = normalize( cross( T, Bv ) );
  vec3 V = normalize( vIWPos - cameraPosition ); if ( dot( N, V ) > 0.0 ) N = -N;
  float D = max( iCell.y * 1.5, 3.5 );
  vec3 rd = vec3( dot( V, T ) / iCell.x, dot( V, Bv ) / iCell.y, max( dot( V, -N ), 0.05 ) / D );
  rd += sign( rd ) * 1e-4 + vec3( 1e-5 );
  vec3 ro = vec3( f, 0.0 ), tv = ( step( 0.0, rd ) - ro ) / rd; float t = min( min( tv.x, tv.y ), tv.z ); vec3 hp = ro + rd * t;
  float r1 = ih( id ), r2 = ih( id + 17.3 ), r3 = ih( id + 41.9 ), lit = step( r1, iLit );
  vec3 wallC = mix( vec3( 0.80, 0.76, 0.70 ), vec3( 0.86, 0.88, 0.90 ), r2 ), c;
  if ( t == tv.z ) { // back wall with a desk, a screen or a plant
    c = wallC * 0.92;
    float dx0 = 0.12 + r2 * 0.3, dx1 = dx0 + 0.35 + r3 * 0.25;
    float desk = step( dx0, hp.x ) * step( hp.x, dx1 ) * step( 0.2, hp.y ) * step( hp.y, 0.26 );
    float leg = step( dx0 + 0.02, hp.x ) * step( hp.x, dx0 + 0.05 ) * step( hp.y, 0.2 );
    float scr = step( r3, 0.6 ) * step( dx0 + 0.1, hp.x ) * step( hp.x, dx0 + 0.28 ) * step( 0.27, hp.y ) * step( hp.y, 0.4 );
    float art = step( 0.55, r1 ) * step( 0.62, hp.x ) * step( hp.x, 0.86 ) * step( 0.5, hp.y ) * step( hp.y, 0.72 );
    c = mix( c, vec3( 0.18, 0.17, 0.17 ), max( desk, leg ) ); c = mix( c, vec3( 0.05, 0.06, 0.08 ) + vec3( 0.1, 0.2, 0.45 ) * lit, scr );
    c = mix( c, mix( vec3( 0.75, 0.42, 0.3 ), vec3( 0.3, 0.45, 0.7 ), r2 ), art );
  } else if ( t == tv.y ) {
    if ( rd.y < 0.0 ) c = mix( vec3( 0.36, 0.30, 0.26 ), vec3( 0.55, 0.55, 0.56 ), r3 ); // floor
    else { c = vec3( 0.9 ); c += lit * 3.0 * smoothstep( 0.06, 0.0, abs( hp.z - 0.4 ) ) * step( 0.12, hp.x ) * step( hp.x, 0.88 ); } // ceiling light strip
  } else c = wallC * 0.82; // side walls
  vec3 lc = mix( vec3( 1.0, 0.88, 0.72 ), vec3( 0.94, 0.97, 1.0 ), step( iWarm, r2 ) );
  vec3 room = lit > 0.5 ? c * lc * 0.4 * mix( 1.0, 0.5, hp.z ) : c * vec3( 0.07, 0.075, 0.085 ) * mix( 1.0, 0.5, hp.z );
  // blinds in some windows (on the glass plane, no parallax)
  float bl = step( r3, 0.3 ) * step( 1.0 - ( 0.25 + r1 * 0.5 ), f.y );
  room = mix( room, vec3( 0.78, 0.74, 0.66 ) * ( 0.55 + 0.45 * lit ) * ( 0.9 + 0.1 * step( 0.5, fract( f.y * iCell.y * 12.0 ) ) ), bl );
  // far away the cells get smaller than a few pixels: fade to the average colour so nothing shimmers
  vec2 fw = fwidth( q ); float lod = smoothstep( 0.06, 0.25, max( fw.x, fw.y ) );
  room = mix( room, lit > 0.5 ? vec3( 0.22, 0.21, 0.2 ) : vec3( 0.03 ), lod );
  float fx = iFrame / iCell.x, fy = iFrame / iCell.y;
  float frame = ( 1.0 - step( fx, f.x ) * step( f.x, 1.0 - fx ) * step( fy, f.y ) * step( f.y, 1.0 - fy ) ) * step( 0.0001, iFrame ) * ( 1.0 - lod * 0.7 );
  float span = iSpan * step( f.y, 0.14 );
  glassM = ( 1.0 - frame ) * ( 1.0 - span );
  float fres = 0.12 + 0.88 * pow( 1.0 - abs( dot( V, N ) ), 4.0 );
  roomCol = room * iTint * glassM * ( 1.0 - fres );
  diffuseColor.rgb = mix( mix( iMull, iTint * 0.22, span ), iTint * 0.13, glassM ); // glass: no diffuse, ~13% tinted reflection at normal incidence
}`;
function interiorize(m, { cell = [1.6, 4], tint = [70, 110, 150], mullion = '#2a3340', spandrel = true, frame = 0.05, lit = 0.72, seed = 1, warm = 0.4 }) {
  const t = new THREE.Vector3(...tint).divideScalar(255); const avg = (t.x + t.y + t.z) / 3 || 1; t.divideScalar(avg).lerp(new THREE.Vector3(1, 1, 1), 0.55);
  const U = { iCell: { value: new THREE.Vector2(...cell) }, iTint: { value: new THREE.Color(t.x, t.y, t.z) }, iMull: { value: new THREE.Color(mullion).convertSRGBToLinear() },
    iSpan: { value: spandrel ? 1 : 0 }, iSeed: { value: seed }, iLit: { value: lit }, iFrame: { value: frame }, iWarm: { value: warm } };
  m.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vIWPos;\nvarying vec2 vIUv;')
      .replace('#include <project_vertex>', '#include <project_vertex>\nvIUv = uv;\nvIWPos = ( modelMatrix * vec4( transformed, 1.0 ) ).xyz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>' + INTERIOR_FRAG)
      .replace('#include <map_fragment>', '#include <map_fragment>' + INTERIOR_MAP)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = mix( 0.55, 0.05, glassM );')
      .replace('#include <metalnessmap_fragment>', '#include <metalnessmap_fragment>\nmetalnessFactor = mix( 0.3, 1.0, glassM );')
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += roomCol;');
  };
  m.customProgramCacheKey = () => 'interior-glass'; return m;
}
export function roomGlass(o = {}) {
  const k = 'r' + JSON.stringify(o); if (facadeCache[k]) return facadeCache[k];
  const m = interiorize(new THREE.MeshStandardMaterial({ color: 0xffffff, envMapIntensity: 1.3 }), o); m.userData.glass = true; return (facadeCache[k] = m);
}
export function glassMat(opts = {}) {
  const k = 'g' + JSON.stringify(opts); if (facadeCache[k]) return facadeCache[k];
  const { tint, mullion, seed = 1, spandrel = true, bayW = 1.6, floorH = 4, warm = 0.35 } = opts;
  return (facadeCache[k] = roomGlass({ cell: [bayW, floorH], tint, mullion, seed, spandrel, warm, frame: 0.05 }));
}
// panel / masonry facades: a PBR wall; the windows are real 3D units (surrounds, sills, recessed room-glass) added by mass()
export function panelMat(opts = {}) {
  const k = 'p' + JSON.stringify(opts); if (facadeCache[k]) return facadeCache[k];
  const c = new THREE.Color(opts.wall || '#e9e6df'), hsl = {}; c.getHSL(hsl);
  const brick = hsl.l < 0.45 && hsl.h < 0.12, ribbon = (opts.kind || 'ribbon') === 'ribbon';
  const tex = brick ? TX.pbr(hsl.l < 0.3 ? 'brown_brick_02' : 'red_brick_03', 2.2) : ribbon ? TX.pbr('brushed_concrete', 3) : TX.pbr('concrete_tile_facade', 3.5);
  const col = brick ? new THREE.Color(1, 1, 1).lerp(c.clone().multiplyScalar(1.8), 0.25) : c.clone().multiplyScalar(1.04);
  const m = new THREE.MeshStandardMaterial({ ...tex, color: col, roughness: 0.88, metalness: 0 });
  m.userData.panel = { ...opts, brick }; return (facadeCache[k] = m);
}
// plane with metre UVs facing +z (for window glass)
function upl(w, h) { const g = new THREE.PlaneGeometry(w, h); const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * w, uv.getY(i) * h); return g; }
// Build queued window units once every sign and entrance is known, so windows never cut through them
export function flushFacades(ctx) {
  const jobs = ctx._facadeJobs || []; ctx._facadeJobs = [];
  const open = ctx._openings || [];
  const blocked = (face, wx, wz, ya, yb, hw) => open.some(o => o.face === face && o.y0 < yb && o.y1 > ya &&
    (FACE[face][1] ? Math.abs(wz - o.z) < 1.2 && Math.abs(wx - o.x) < hw + o.hw : Math.abs(wx - o.x) < 1.2 && Math.abs(wz - o.z) < hw + o.hw));
  for (const j of jobs) {
    const { x, z, w, d, y0, h, o, baseTop } = j, b = { x, z, w, d }, top = y0 + h;
    const bw = o.bayW || 2.5, fh = o.floorH || 4, ribbon = (o.kind || 'ribbon') === 'ribbon';
    const surround = o.brick ? M('limestoneTrim') : M('trimWhite'), dark = M('metalDark');
    for (const face of ['s', 'n', 'e', 'w']) {
      const along = FACE[face][1] ? w : d, ry = FACE[face][2];
      const put = (geo, mat, t, y, out) => { const [px, pz] = onFace(b, face, t, out); ctx.geo(geo, mat, mat4(px, y, pz, ry), !mat.userData.glass); };
      for (let fy = y0; fy + fh * 0.75 <= top - 0.2; fy += fh) {
        const wh = fh * 0.5, wy = fy + fh * 0.5; if (wy - wh / 2 < baseTop + 0.25) continue;
        if (ribbon) {
          const L = along - 0.8; if (L < 2) continue;
          if (blocked(face, ...onFace(b, face, 0, 0), wy - wh / 2, wy + wh / 2, L / 2)) {
            // a sign crosses this band: fall back to separate bays left and right of it
          } else {
            put(upl(L, wh), roomGlass({ cell: [bw, wh], tint: o.glass || [80, 110, 140], seed: o.seed || 2, spandrel: false, frame: 0, mullion: '#2a3340' }), 0, wy, 0.02);
            put(ubox(L + 0.3, 0.16, 0.22), surround, 0, wy + wh / 2 + 0.08, 0.11); put(ubox(L + 0.3, 0.14, 0.3), surround, 0, wy - wh / 2 - 0.07, 0.15);
            for (let t = -L / 2; t <= L / 2 + 0.01; t += bw / 2) put(ubox(0.07, wh, 0.1), dark, t, wy, 0.05);
            continue;
          }
        }
        const n = Math.max(1, Math.floor(along / bw)), m0 = (along - n * bw) / 2, ww = ribbon ? bw * 0.8 : bw * 0.56;
        for (let i = 0; i < n; i++) {
          const t = -along / 2 + m0 + bw * (i + 0.5), [wx, wz] = onFace(b, face, t, 0);
          if (blocked(face, wx, wz, wy - wh / 2 - 0.3, wy + wh / 2 + 0.3, ww / 2 + 0.25)) continue;
          put(upl(ww, wh), roomGlass({ cell: [ww, wh], tint: o.glass || [80, 110, 140], seed: o.seed || 2, spandrel: false, frame: 0.045, mullion: '#2b2e33' }), t, wy, 0.02);
          put(ubox(0.12, wh + 0.26, 0.16), surround, t - ww / 2 - 0.06, wy, 0.08); put(ubox(0.12, wh + 0.26, 0.16), surround, t + ww / 2 + 0.06, wy, 0.08);
          put(ubox(ww + 0.36, 0.18, 0.2), surround, t, wy + wh / 2 + 0.09, 0.1); put(ubox(ww + 0.44, 0.1, 0.3), surround, t, wy - wh / 2 - 0.05, 0.15);
          if (wh > 1.4) put(ubox(ww, 0.05, 0.05), dark, t, wy + wh * 0.18, 0.04); // transom bar
        }
      }
    }
  }
}
export function signMat(text, o = {}) {
  const k = 's' + text + JSON.stringify(o); if (facadeCache[k]) return facadeCache[k];
  const { tex, aspect } = TX.signTex(text, o);
  const m = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.4, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: o.glow ?? 0.35, transparent: !o.bg && o.bg !== undefined });
  m.userData.aspect = aspect; return (facadeCache[k] = m);
}

// ------------------------------------------------------------------ the world context passed to every builder
export class Ctx {
  constructor(scene) {
    this.scene = scene; this.batch = new Batch(); this.inst = new Instancer();
    this.colliders = [];  // {x0,x1,z0,z1,y0,y1}
    this.floors = [];     // {x0,x1,z0,z1,h, slope:{axis,from,to,h0,h1}}
    this.footprints = []; // map drawing {x,z,w,d,color,kind}
    this.interactables = []; this.doors = []; this.animated = []; this.clickMeshes = []; this.labels = []; this.hooks = {}; this.landmarks = [];
  }
  box(x, y, z, w, h, d, mat, { ry = 0, collide = false, shadow = true, vOff = 0 } = {}) {
    this.batch.add(ubox(w, h, d, vOff), mat, mat4(x, y + h / 2, z, ry), shadow);
    if (collide) this.collider(x - w / 2, x + w / 2, z - d / 2, z + d / 2, y, y + h);
  }
  // a Blender-authored landmark GLB: collider + footprint now, model streamed later (world/landmarks.js)
  landmark(file, x, y, z, ry = 0, o = {}) {
    const sw = Math.abs(Math.sin(ry)) > 0.5; const w = sw ? o.d : o.w, d = sw ? o.w : o.d;
    if (o.collide !== false) this.collider(x - w / 2, x + w / 2, z - d / 2, z + d / 2, 0, o.h || 60);
    if (o.foot !== false) this.foot(x, z, w, d, o.color || '#cfc9bd');
    this.landmarks.push({ file, x, y, z, ry, ...o });
  }
  collider(x0, x1, z0, z1, y0 = 0, y1 = 10) { this.colliders.push({ x0: Math.min(x0, x1), x1: Math.max(x0, x1), z0: Math.min(z0, z1), z1: Math.max(z0, z1), y0, y1 }); }
  floor(x0, x1, z0, z1, h, slope) { this.floors.push({ x0: Math.min(x0, x1), x1: Math.max(x0, x1), z0: Math.min(z0, z1), z1: Math.max(z0, z1), h, slope }); }
  foot(x, z, w, d, color = '#c9c4ba', kind = 'bldg') { this.footprints.push({ x, z, w, d, color, kind }); }
  geo(geo, mat, m, shadow = true) { this.batch.add(geo, mat, m, shadow); }
  // a mesh that stays separate (clickable / animated)
  mesh(geo, mat, x, y, z, ry = 0) { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.y = ry; m.castShadow = !mat.transparent; m.receiveShadow = true; this.scene.add(m); return m; }
}

// ------------------------------------------------------------------ facade-direction helpers
// face: 's' (front toward +z), 'n' (-z), 'e' (+x), 'w' (-x)
export const FACE = { s: [0, 1, 0], n: [0, -1, Math.PI], e: [1, 0, Math.PI / 2], w: [-1, 0, -Math.PI / 2] };
// position on a face: returns world x,z for a point offset `t` along the face (from centre) and `out` metres outward
export function onFace(b, face, t = 0, out = 0) {
  const [fx, fz] = FACE[face];
  if (fz) return [b.x + t * fz, b.z + fz * (b.d / 2 + out)];
  return [b.x + fx * (b.w / 2 + out), b.z - t * fx];
}

// Sign panel mounted on a facade
export function sign(ctx, text, x, y, z, ry, height = 1.2, o = {}) {
  const m = signMat(text, o); const w = height * m.userData.aspect;
  ctx.geo(new THREE.PlaneGeometry(w, height), m, mat4(x, y, z, ry), false);
  if (o.backing !== false) ctx.geo(ubox(w + 0.2, height + 0.2, 0.12), M('charcoal'), mat4(x - Math.sin(ry) * 0.07, y, z - Math.cos(ry) * 0.07, ry));
  return w;
}
export function faceSign(ctx, b, face, text, y, height, o = {}) {
  const [x, z] = onFace(b, face, o.t || 0, 0.09); const sw = sign(ctx, text, x, y, z, FACE[face][2], height, o);
  const op = (ctx._openings = ctx._openings || []); op.push({ face, x, z, y0: y - height / 2 - 0.2, y1: y + height / 2 + 0.2, hw: sw / 2 + 0.2 });
  if (o.door !== false && y <= 16) op.push({ face, x, z, y0: 0, y1: 3.6, hw: 2.3 });
  if (o.door === false || y > 16) return;
  // entrance: framed glass doors + a cantilevered canopy on the signed face
  const ry = FACE[face][2], [dx, dz] = onFace(b, face, o.t || 0, 0.12), [cx, cz] = onFace(b, face, o.t || 0, 0.95);
  ctx.geo(ubox(2.6, 2.8, 0.06), M('glassClear'), mat4(dx, 0.15 + 1.4, dz, ry), false);
  ctx.geo(ubox(2.8, 0.14, 0.12), M('metalDark'), mat4(dx, 0.15 + 2.85, dz, ry));
  for (const sd of [-1.35, 0, 1.35]) ctx.geo(ubox(0.08, 2.8, 0.1), M('metalDark'), mat4(dx + Math.cos(ry) * sd, 0.15 + 1.4, dz - Math.sin(ry) * sd, ry));
  ctx.geo(ubox(4.2, 0.16, 1.8), M('metalLight'), mat4(cx, 3.35, cz, ry));
  ctx.geo(ubox(4.2, 0.02, 1.8), M('lampHead'), mat4(cx, 3.26, cz, ry), false);
}

// ------------------------------------------------------------------ building massing
// Generic massing block with collider + roof details.
export function mass(ctx, { x, z, w, d, y0 = 0, h, mat, roofMat = M('roof'), parapet = 0.9, units = true, collide = true, seed = 1, grid = null, base = null }) {
  ctx.box(x, y0, z, w, h, d, mat, { vOff: y0 });
  const wantBase = base ?? (y0 === 0 && h >= 8 && w >= 8 && d >= 8);
  if (mat.userData && mat.userData.panel) (ctx._facadeJobs = ctx._facadeJobs || []).push({ x, z, w, d, y0, h, o: mat.userData.panel, baseTop: wantBase ? 4.7 : y0 });
  if (collide && y0 < 2.5) ctx.collider(x - w / 2, x + w / 2, z - d / 2, z + d / 2, y0, y0 + h);
  const top = y0 + h;
  ctx.box(x, top, z, w - 0.1, 0.05, d - 0.1, roofMat, { shadow: false });
  if (parapet) { // parapet ring with a metal coping
    const t = 0.35;
    ctx.box(x, top, z - d / 2 + t / 2, w, parapet, t, M('charcoal')); ctx.box(x, top, z + d / 2 - t / 2, w, parapet, t, M('charcoal'));
    ctx.box(x - w / 2 + t / 2, top, z, t, parapet, d - 2 * t, M('charcoal')); ctx.box(x + w / 2 - t / 2, top, z, t, parapet, d - 2 * t, M('charcoal'));
    ctx.box(x, top + parapet, z, w + 0.06, 0.06, d + 0.06, M('metalLight'), { shadow: false });
  }
  const r = TX.rng(seed + (x * 7 + z * 13 | 0));
  if (units && w > 8 && d > 8) { // rooftop plant: units, a water tank, maybe a mast
    const n = 1 + (r() * 3 | 0);
    for (let i = 0; i < n; i++) { const uw = 2 + r() * 4, ud = 2 + r() * 3; ctx.box(x + (r() - 0.5) * (w - uw - 2), top, z + (r() - 0.5) * (d - ud - 2), uw, 1.2 + r() * 1.6, ud, M('metalLight')); }
    if (r() < 0.55) { const tx = x + (r() - 0.5) * (w - 5), tz = z + (r() - 0.5) * (d - 5); ctx.geo(ucyl(1.3, 1.3, 2.2, 16), M('offwhite'), mat4(tx, top + 2.3, tz)); for (const [lx, lz] of [[-0.9, -0.9], [0.9, -0.9], [-0.9, 0.9], [0.9, 0.9]]) ctx.box(tx + lx, top, tz + lz, 0.12, 1.2, 0.12, M('metalDark')); }
    if (h > 38 && r() < 0.6) ctx.geo(ucyl(0.08, 0.15, 7, 6), M('metalDark'), mat4(x + w * 0.25, top + 3.5, z - d * 0.2));
  }
  // curtain-wall mullions and floor lines with real depth
  if (grid) {
    const { bay = 1.6, floor = 4, m = M('metalDark') } = grid, dep = 0.07, th = 0.09;
    for (const [fx, fz, along, other] of [[0, 1, w, d], [0, -1, w, d], [1, 0, d, w], [-1, 0, d, w]]) {
      for (let t = 0; t <= along + 0.01; t += bay) { const off = -along / 2 + t;
        const px = fz ? x + off : x + fx * (w / 2 + dep / 2), pz = fz ? z + fz * (d / 2 + dep / 2) : z + off;
        ctx.box(px, y0, pz, fz ? th : dep, h, fz ? dep : th, m, { shadow: false }); }
      for (let yy = y0 + floor; yy < top - 0.5; yy += floor) { const px = fz ? x : x + fx * (w / 2 + dep / 2), pz = fz ? z + fz * (d / 2 + dep / 2) : z;
        ctx.box(px, yy - 0.06, pz, fz ? along + 0.1 : dep, 0.12, fz ? dep : along + 0.1, m, { shadow: false }); }
    }
  }
  // ground-floor storefront: stone plinth, tall dark glazing, transom band
  if (wantBase) {
    ctx.box(x, 0, z, w + 0.16, 0.55, d + 0.16, M('concrete'));
    ctx.box(x, 0.55, z, w + 0.1, 3.9, d + 0.1, glassMat({ tint: [40, 52, 64], bays: 2, floors: 1, bayW: 2.4, floorH: 3.9, seed: 99, warm: 0.6, spandrel: false, mullion: '#1a1d22' }), { vOff: 0 });
    ctx.box(x, 4.45, z, w + 0.2, 0.5, d + 0.2, M('charcoal'));
  }
  ctx.foot(x, z, w, d, ctx._footColor || '#cfc9bd');
}
// horizontal slab bands (floor edges) wrapped around a mass
export function bands(ctx, { x, z, w, d, y0 = 0, h, every = 4, mat = M('white'), depth = 0.25, th = 0.35 }) {
  for (let y = y0 + every; y < y0 + h - 0.5; y += every) ctx.box(x, y - th / 2, z, w + depth * 2, th, d + depth * 2, mat, { shadow: false });
}
// vertical fins on a face
export function fins(ctx, b, face, { y0 = 0, h, step = 1.6, depth = 0.6, th = 0.18, mat = M('metalLight') }) {
  const along = FACE[face][1] ? b.w : b.d;
  for (let t = -along / 2 + step / 2; t < along / 2; t += step) { const [fx, fz] = onFace(b, face, t, depth / 2); const ry = FACE[face][2]; ctx.geo(ubox(th, h, depth), mat, mat4(fx, y0 + h / 2, fz, ry)); }
}

// Enterable ground floor: real walls, glass front with an automatic sliding door, interior floor + ceiling.
// Returns interior bounds. Upper floors are added by the caller from y = gfH.
export function shell(ctx, { x, z, w, d, face = 's', gfH = 5, doorW = 3.2, wallMat = M('white'), floorMat = M('marble'), frontMat = null, name = '' }) {
  const t = 0.3, [fx, fz, ry] = FACE[face];
  const walls = { n: [x, z - d / 2 + t / 2, w, t], s: [x, z + d / 2 - t / 2, w, t], w: [x - w / 2 + t / 2, z, t, d], e: [x + w / 2 - t / 2, z, t, d] };
  ctx.box(x, 0, z, w - 0.2, 0.162, d - 0.2, floorMat, { shadow: false }); // 12 mm above the block paving (coplanar tops flickered)
  ctx.floor(x - w / 2 + t, x + w / 2 - t, z - d / 2 + t, z + d / 2 - t, 0.15);
  ctx.box(x, gfH - 0.25, z, w, 0.25, d, M('offwhite'));                      // ceiling slab
  // ceiling light panels
  for (let px = -w / 2 + 3; px <= w / 2 - 3; px += 4) for (let pz = -d / 2 + 3; pz <= d / 2 - 3; pz += 4) ctx.box(x + px, gfH - 0.27, z + pz, 1.6, 0.03, 0.6, M('ceilPanel'), { shadow: false });
  for (const k of ['n', 's', 'e', 'w']) {
    const [cx, cz, ww, dd] = walls[k];
    if (k !== face) { ctx.box(cx, 0, cz, ww, gfH, dd, wallMat); ctx.collider(cx - ww / 2, cx + ww / 2, cz - dd / 2, cz + dd / 2, 0, gfH); continue; }
    // front: glass with mullions + door opening in the centre
    const along = fz ? w : d; const seg = (along - doorW) / 2;
    for (const sgn of [-1, 1]) {
      const off = sgn * (doorW / 2 + seg / 2);
      const sx = fz ? cx + off : cx, sz = fz ? cz : cz + off;
      const gw = fz ? seg : t, gd = fz ? t : seg;
      ctx.box(sx, 0.15, sz, fz ? gw : 0.06, gfH - 0.6, fz ? 0.06 : gd, frontMat || M('glassClear'), { shadow: false });
      ctx.collider(sx - gw / 2, sx + gw / 2, sz - gd / 2, sz + gd / 2, 0, gfH);
      for (let m = -seg / 2; m <= seg / 2 + 0.01; m += seg / Math.max(1, Math.round(seg / 2))) { // mullions
        const mx = fz ? sx + m : sx, mz = fz ? sz : sz + m; ctx.box(mx, 0.15, mz, 0.12, gfH - 0.4, 0.12, M('metalDark'));
      }
    }
    ctx.box(fz ? cx : cx, gfH - 0.6, fz ? cz : cz, fz ? along : 0.4, 0.45, fz ? 0.4 : along, M('metalDark')); // transom
    // automatic sliding doors (two panels)
    const dmat = M('glassClear');
    const panels = [-1, 1].map(sgn => { const geo = ubox(fz ? doorW / 2 : 0.08, gfH - 0.8, fz ? 0.08 : doorW / 2); const mesh = ctx.mesh(geo, dmat, 0, 0, 0); mesh.renderOrder = 2;
      const frame = new THREE.Mesh(new THREE.EdgesGeometry(geo), new THREE.LineBasicMaterial({ color: 0x30363f })); mesh.add(frame); return mesh; });
    const [ex, ez] = [cx, cz];
    ctx.doors.push({ panels, cx: ex, cz: ez, axis: fz ? 'x' : 'z', half: doorW / 2, y: (gfH - 0.8) / 2 + 0.15, open: 0, collider: null });
    const dc = { x0: fz ? ex - doorW / 2 : ex - 0.2, x1: fz ? ex + doorW / 2 : ex + 0.2, z0: fz ? ez - 0.2 : ez - doorW / 2, z1: fz ? ez + 0.2 : ez + doorW / 2, y0: 0, y1: gfH, door: true };
    ctx.colliders.push(dc); ctx.doors[ctx.doors.length - 1].collider = dc;
  }
  const ent = onFace({ x, z, w, d }, face, 0, 2.2), ins = onFace({ x, z, w, d }, face, 0, -3.5);
  return { x0: x - w / 2 + t, x1: x + w / 2 - t, z0: z - d / 2 + t, z1: z + d / 2 - t, entrance: { x: ent[0], z: ent[1] }, inside: { x: ins[0], z: ins[1] }, ry };
}

// Classical civic building: podium, steps (walkable ramp), colonnade, entablature, pediment. w = width along the face, d = hall depth.
export function classical(ctx, { x, z, w, d, h = 14, face = 's', cols = 8, mat = M('limestone'), enterable = false }) {
  const [fx, fz, ry] = FACE[face];
  // local (u along face, v outward from the building centre) -> world
  const F = (u, v) => face === 's' ? [x + u, z + v] : face === 'n' ? [x - u, z - v] : face === 'e' ? [x + v, z - u] : [x - v, z + u];
  const B = (u, v, y, lw, lh, ld, m, collide = false) => { const [cx, cz] = F(u, v); const ww = fz ? lw : ld, dd = fz ? ld : lw; ctx.box(cx, y, cz, ww, lh, dd, m, { collide }); };
  const podH = 1.2, front = d / 2, colV = front + 3, podV = front + 5, stepV = front + 7;
  // podium under hall + portico
  const podD = podV + front + 1; B(0, (podV - front - 1) / 2, 0, w + 2, podH, podD, mat);
  { const [ax, az] = F(-(w + 2) / 2, -front - 1), [bx, bz] = F((w + 2) / 2, podV); ctx.floor(ax, bx, az, bz, podH); }
  // steps + ramp
  for (let i = 0; i < 4; i++) B(0, podV + (i + 0.5) * 0.5, 0, w * 0.7, podH * (4 - i) / 4, 0.5, mat);
  { const [ax, az] = F(-w * 0.35, podV), [bx, bz] = F(w * 0.35, stepV); const [p0x, p0z] = F(0, stepV), [p1x, p1z] = F(0, podV);
    ctx.floor(ax, bx, az, bz, 0, fz ? { axis: 'z', from: p0z, to: p1z, h0: 0.15, h1: podH } : { axis: 'x', from: p0x, to: p1x, h0: 0.15, h1: podH }); }
  // side walls of the podium (so you use the steps)
  for (const s of [-1, 1]) { const [ax, az] = F(s * (w * 0.35 + 0.2), podV + 1); }
  // hall
  const hw = fz ? w : d, hd = fz ? d : w;
  let interior = null;
  if (enterable) {
    interior = shell(ctx, { x, z, w: hw, d: hd, face, gfH: h - 3 - podH, doorW: 3.6, wallMat: mat, floorMat: M('marble') });
    // move the shell up onto the podium: shell geometry was built at y=0; we rebuild floor height + raise via an offset group is complex,
    // so the hall interior simply sits on the podium (podium top = interior floor).
    ctx.floors.pop(); ctx.floor(interior.x0, interior.x1, interior.z0, interior.z1, podH);
    interior.floorH = podH;
    ctx.box(x, podH, z, hw - 0.62, 0.02, hd - 0.62, M('marble'), { shadow: false }); // banking-hall floor on the podium
    ctx.box(x, h - 3, z, hw, 3, hd, mat, { vOff: h - 3 });
  } else { ctx.box(x, podH, z, hw, h - podH, hd, mat); ctx.collider(x - hw / 2, x + hw / 2, z - hd / 2, z + hd / 2, 0, h); }
  // colonnade
  const ch = h - podH - 1.6;
  for (let i = 0; i < cols; i++) {
    const u = -w / 2 + 1 + i * (w - 2) / (cols - 1); const [cx, cz] = F(u, colV);
    ctx.geo(ucyl(0.55, 0.65, ch, 20), mat, mat4(cx, podH + ch / 2, cz));
    ctx.box(cx, podH, cz, 1.6, 0.4, 1.6, mat); ctx.box(cx, h - 1.6 - 0.35, cz, 1.5, 0.35, 1.5, mat);
    ctx.collider(cx - 0.6, cx + 0.6, cz - 0.6, cz + 0.6, 0, h);
  }
  // portico roof + entablature + pediment
  B(0, (colV + 1 + front) / 2, h - 1.6, w + 1, 1.6, colV + 1 - front, mat);
  const ped = new THREE.Shape(); ped.moveTo(-w / 2 - 0.5, 0); ped.lineTo(w / 2 + 0.5, 0); ped.lineTo(0, 3.2); ped.closePath();
  const pg = new THREE.ExtrudeGeometry(ped, { depth: d + 4, bevelEnabled: false }); pg.translate(0, 0, -(d + 4) / 2);
  const [pcx, pcz] = F(0, 2); ctx.geo(pg, mat, mat4(pcx, h, pcz, ry));
  const [fcx, fcz] = F(0, (podV - front - 1) / 2); ctx.foot(fcx, fcz, fz ? w + 2 : podD, fz ? podD : w + 2, '#e3dccb');
  if (interior) { const [ex, ez] = F(0, front + 2); interior.entrance = { x: ex, z: ez }; }
  return interior;
}

// Sawtooth-roof factory with chimney
export function factory(ctx, { x, z, w, d, h = 9, face = 's', mat = M('brick') }) {
  ctx.box(x, 0, z, w, h, d, mat); ctx.collider(x - w / 2, x + w / 2, z - d / 2, z + d / 2, 0, h);
  const teeth = Math.max(3, Math.round(w / 6)), tw = w / teeth;
  for (let i = 0; i < teeth; i++) {
    const s = new THREE.Shape(); s.moveTo(0, 0); s.lineTo(tw, 0); s.lineTo(tw, 3); s.closePath();
    const g = new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: false }); g.translate(-tw / 2, 0, -d / 2);
    ctx.geo(g, M('metalLight'), mat4(x - w / 2 + tw * (i + 0.5), h, z));
    ctx.box(x - w / 2 + tw * (i + 1) - 0.05, h, z, 0.1, 2.9, d - 0.4, M('glassClear'), { shadow: false });
  }
  ctx.geo(ucyl(1, 1.3, h + 14, 20), M('brickDark'), mat4(x + w / 2 - 3, (h + 14) / 2, z - d / 2 + 3));
  ctx.box(x + w / 2 - 3, h + 13, z - d / 2 + 3, 2.8, 0.6, 2.8, M('charcoal'));
  ctx.foot(x, z, w, d, '#b9a493');
}
// Hangar with barrel roof
export function hangar(ctx, { x, z, w, d, h = 12, face = 'e' }) {
  const [fx, fz] = FACE[face];
  const roof = ucyl(w / 2, w / 2, d, 32, true, Math.PI, -Math.PI / 2); // half cylinder along Y
  ctx.geo(roof, M('metalLight'), mat4(x, h - w / 2 + 0.01 > 0 ? 4 : 4, z, 0, 1, 1, 1, Math.PI / 2, 0));
  ctx.box(x, 0, z, w, 4, d, M('metalDark'), {});
  ctx.collider(x - w / 2, x + w / 2, z - d / 2, z + d / 2, 0, h);
  ctx.foot(x, z, w, d, '#c3c7cc');
}
// Geodesic greenhouse dome
export function dome(ctx, { x, z, r = 10 }) {
  const g = new THREE.IcosahedronGeometry(r, 2); const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) if (pos.getY(i) < 0) pos.setY(i, 0);
  ctx.geo(g, M('glassClear'), mat4(x, 0, z), false);
  const frame = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(r * 1.002, 2)), new THREE.LineBasicMaterial({ color: 0xe8ecef }));
  frame.position.set(x, 0, z); frame.scale.y = 1; ctx.scene.add(frame);
  ctx.box(x, 0, z, r * 1.6, 0.6, r * 1.6, M('concrete'));
  for (let i = 0; i < 18; i++) { const a = i / 18 * Math.PI * 2, rr = r * 0.6 * Math.random(); treeAt(ctx, x + Math.cos(a) * rr, z + Math.sin(a) * rr, 0.45 + Math.random() * 0.3, 0.6); }
  ctx.collider(x - r * 0.75, x + r * 0.75, z - r * 0.75, z + r * 0.75, 0, r);
  ctx.foot(x, z, r * 1.6, r * 1.6, '#d8e8d6', 'round');
}

// ------------------------------------------------------------------ props (instanced)
// Card-foliage trees: trunk + branches, and a canopy of crossed leaf-cluster cards with normals bent outward from the crown
// centre (soft, volumetric lighting), alpha-tested (including shadows), with a gentle wind sway in the vertex shader.
export const WIND = { value: 0 };
let leafMat = null, leafDepth = null;
function leafMaterials() {
  if (leafMat) return [leafMat, leafDepth];
  const map = TX.photoLeafTex();
  leafMat = new THREE.MeshStandardMaterial({ map, alphaTest: 0.4, alphaToCoverage: true, side: THREE.DoubleSide, roughness: 0.75, metalness: 0, color: 0xe8f0dc });
  const sway = (shader) => { shader.uniforms.uWind = WIND;
    shader.vertexShader = 'uniform float uWind;\n' + shader.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
      #ifdef USE_INSTANCING
        vec4 ip = instanceMatrix[3];
      #else
        vec4 ip = vec4(0.0);
      #endif
      float h = max(0.0, position.y - 2.5);
      transformed.x += sin(uWind * 1.3 + ip.x * 0.37 + position.y * 0.6) * 0.035 * h;
      transformed.z += cos(uWind * 1.1 + ip.z * 0.29 + position.x * 0.5) * 0.03 * h;`); };
  leafMat.onBeforeCompile = sway;
  leafDepth = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map, alphaTest: 0.45, side: THREE.DoubleSide });
  leafDepth.onBeforeCompile = sway;
  return [leafMat, leafDepth];
}
const SPECIES = [ // [crown centre height, radii x/y/z, cards, trunk height]
  { cy: 4.6, rx: 2.3, ry: 1.9, rz: 2.3, n: 110, th: 3.2 },   // round deciduous
  { cy: 5.6, rx: 1.3, ry: 3.2, rz: 1.3, n: 95, th: 2.6 },   // columnar
  { cy: 4.4, rx: 3.0, ry: 1.7, rz: 3.0, n: 130, th: 3.0 },   // wide plane tree
];
const treeParts = (v) => () => {
  const r = TX.rng(17 + v * 31), sp = SPECIES[v % 3];
  const trunk = new THREE.CylinderGeometry(0.1, 0.2, sp.th + 1.2, 8); trunk.translate(0, (sp.th + 1.2) / 2, 0);
  const branches = [trunk.toNonIndexed()];
  for (let i = 0; i < 5; i++) { const L = 1.2 + r() * 1.2; const b = new THREE.CylinderGeometry(0.03, 0.08, L, 5); b.translate(0, L / 2, 0); b.rotateZ(0.5 + r() * 0.5); b.rotateY(i * 1.26 + r()); b.translate(0, sp.th - 0.2 + r() * 1.0, 0); branches.push(b.toNonIndexed()); }
  // leaf cards
  const pos = [], nor = [], uv = [];
  const C = new THREE.Vector3(0, sp.cy, 0), q = new THREE.Quaternion(), e = new THREE.Euler();
  for (let i = 0; i < sp.n; i++) {
    // point inside the crown ellipsoid, biased to the surface
    let x, y, z; do { x = r() * 2 - 1; y = r() * 2 - 1; z = r() * 2 - 1; } while (x * x + y * y + z * z > 1);
    const k = 0.35 + 0.65 * Math.pow(r(), 0.35); const P = new THREE.Vector3(x * sp.rx * k, sp.cy + y * sp.ry * k, z * sp.rz * k);
    const size = 1.9 + r() * 1.3; e.set(r() * Math.PI, r() * Math.PI * 2, r() * Math.PI); q.setFromEuler(e);
    const qv = (r() * 2 | 0), qu = (r() * 2 | 0); // atlas quadrant
    const corners = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([a, b]) => new THREE.Vector3(a * size / 2, b * size / 2, 0).applyQuaternion(q).add(P));
    const uvs = [[0, 0], [1, 0], [1, 1], [0, 1]].map(([a, b]) => qu ? [1 - a, b] : [a, b]);
    for (const idx of [0, 1, 2, 0, 2, 3]) { const p = corners[idx]; pos.push(p.x, p.y, p.z); const n = p.clone().sub(C); n.y *= 0.6; n.normalize(); nor.push(n.x, n.y + 0.25, n.z); uv.push(...uvs[idx]); }
  }
  const leaves = new THREE.BufferGeometry(); leaves.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); leaves.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); leaves.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  leaves.computeBoundingSphere();
  // a dark inner volume so the canopy never looks see-through
  const core = new THREE.IcosahedronGeometry(1, 1); core.scale(sp.rx * 0.38, sp.ry * 0.38, sp.rz * 0.38); core.translate(0, sp.cy, 0);
  const [lm, ld] = leafMaterials();
  return [[mergeGeometries(branches), M('bark')], [core, M('leaf3')], [leaves, lm, true, ld]];
};
export function treeAt(ctx, x, z, s = 1, y = 0) { const v = (Math.abs(x * 3 + z * 7) | 0) % 3; ctx.inst.add('tree' + v, treeParts(v), mat4(x, y, z, (x * 13 + z) % 6.28, s, s, s)); if (y < 1) ctx.collider(x - 0.3, x + 0.3, z - 0.3, z + 0.3, 0, 3); }
export function lampAt(ctx, x, z, ry = 0) {
  ctx.inst.add('lamp', () => {
    const pole = new THREE.CylinderGeometry(0.07, 0.1, 6, 8); pole.translate(0, 3, 0);
    const arm = new THREE.BoxGeometry(0.08, 0.08, 1.4); arm.translate(0, 5.95, 0.65);
    const head = new THREE.BoxGeometry(0.35, 0.12, 0.7); head.translate(0, 5.9, 1.25);
    return [[mergeGeometries([pole.toNonIndexed(), arm.toNonIndexed()]), M('metalDark')], [head, M('lampHead'), false]];
  }, mat4(x, 0, z, ry));
  ctx.collider(x - 0.15, x + 0.15, z - 0.15, z + 0.15, 0, 6);
}
export function benchAt(ctx, x, z, ry = 0) {
  ctx.inst.add('bench', () => {
    const seat = new THREE.BoxGeometry(1.8, 0.08, 0.5); seat.translate(0, 0.45, 0);
    const back = new THREE.BoxGeometry(1.8, 0.45, 0.06); back.translate(0, 0.75, -0.22);
    const legs = [-0.75, 0.75].map(lx => { const l = new THREE.BoxGeometry(0.08, 0.45, 0.45); l.translate(lx, 0.22, 0); return l.toNonIndexed(); });
    return [[mergeGeometries([seat.toNonIndexed(), back.toNonIndexed()]), M('wood')], [mergeGeometries(legs), M('metalDark')]];
  }, mat4(x, 0.15, z, ry));
  ctx.collider(x - 0.8, x + 0.8, z - 0.8, z + 0.8, 0, 1);
}
export function planterAt(ctx, x, z, w = 3, d = 1.2) { ctx.box(x, 0, z, w, 0.6, d, M('concrete'), { collide: true }); for (let i = 0; i < Math.round(w / 1.2); i++) ctx.inst.add('shrub', () => { const g = new THREE.IcosahedronGeometry(0.55, 1); g.scale(1, 0.8, 1); return [[g, M('leaf2')]]; }, mat4(x - w / 2 + 0.6 + i * 1.2, 0.85, z)); }
export function umbrellaTable(ctx, x, z, color) {
  ctx.inst.add('table', () => { const t = new THREE.CylinderGeometry(0.45, 0.45, 0.05, 16); t.translate(0, 0.75, 0); const p = new THREE.CylinderGeometry(0.04, 0.04, 2.4, 6); p.translate(0, 1.2, 0); return [[mergeGeometries([t.toNonIndexed(), p.toNonIndexed()]), M('metalDark')]]; }, mat4(x, 0.15, z));
  ctx.inst.add('umb' + color, () => { const u = new THREE.ConeGeometry(1.4, 0.5, 8, 1, true); u.translate(0, 2.4, 0); return [[u, new THREE.MeshStandardMaterial({ color, roughness: 0.9, side: THREE.DoubleSide })]]; }, mat4(x, 0.15, z));
  for (const a of [0, Math.PI]) ctx.inst.add('chair', () => { const s = new THREE.BoxGeometry(0.42, 0.05, 0.42); s.translate(0, 0.45, 0); const b = new THREE.BoxGeometry(0.42, 0.45, 0.04); b.translate(0, 0.7, -0.2); return [[mergeGeometries([s.toNonIndexed(), b.toNonIndexed()]), M('metalDark')]]; }, mat4(x + Math.sin(a) * 0.75, 0.15, z + Math.cos(a) * 0.75, a + Math.PI));
  ctx.collider(x - 0.6, x + 0.6, z - 0.6, z + 0.6, 0, 1);
}
export function solarRow(ctx, x, z, n = 6, ry = 0) { for (let i = 0; i < n; i++) ctx.inst.add('solar', () => { const p = new THREE.BoxGeometry(3, 0.08, 1.8); p.rotateX(-0.45); p.translate(0, 1.3, 0); const l = new THREE.BoxGeometry(0.1, 1.2, 0.1); l.translate(0, 0.6, 0); return [[p, M('solar')], [l, M('metalLight')]]; }, mat4(x + Math.cos(ry) * i * 3.3, 0, z - Math.sin(ry) * i * 3.3, ry)); }
export function busStop(ctx, x, z, ry, label = 'Talentopia Transit') {
  ctx.box(x, 0, z, 4, 0.08, 1.6, M('metalDark'), { ry }); // base
  ctx.geo(ubox(4, 0.12, 1.8), M('glassClear'), mat4(x, 2.6, z, ry), false);
  const bx = x - Math.sin(ry) * 0.75, bz = z - Math.cos(ry) * 0.75;
  ctx.geo(ubox(4, 2.4, 0.05), M('glassClear'), mat4(bx, 1.35, bz, ry), false);
  for (const s of [-1.9, 1.9]) ctx.geo(ubox(0.1, 2.6, 0.1), M('metalDark'), mat4(bx + Math.cos(ry) * s, 1.3, bz - Math.sin(ry) * s, ry));
  benchAt(ctx, x - Math.sin(ry) * 0.3, z - Math.cos(ry) * 0.3, ry);
  sign(ctx, label, x + Math.cos(ry) * 2.6, 2.9, z - Math.sin(ry) * 2.6, ry, 0.4, { bg: '#101A32', accent: '#51C9E8', backing: false });
}
// Wind turbine (rotor animated)
export function turbine(ctx, x, z, h = 32) {
  ctx.geo(ucyl(0.5, 1.1, h, 16), M('white'), mat4(x, h / 2, z));
  const hub = new THREE.Group(); hub.position.set(x, h, z + 1.2);
  const blade = new THREE.BoxGeometry(0.7, 13, 0.25); blade.translate(0, 6.5, 0);
  for (let i = 0; i < 3; i++) { const b = new THREE.Mesh(blade, M('white')); b.rotation.z = i * Math.PI * 2 / 3; b.castShadow = true; hub.add(b); }
  const n = new THREE.Mesh(new THREE.CapsuleGeometry(0.8, 2.4, 4, 12), M('white')); n.rotation.x = Math.PI / 2; n.position.z = -1.2; hub.add(n);
  ctx.scene.add(hub); ctx.animated.push(t => { hub.rotation.z = t * 0.9 + x; });
  ctx.collider(x - 1.1, x + 1.1, z - 1.1, z + 1.1, 0, h);
}
// Tower crane (construction site)
export function crane(ctx, x, z, h = 40, jib = 30) {
  const mast = new THREE.Group(); const cell = 3;
  for (let y = 0; y < h; y += cell) { ctx.box(x, y, z, 2, 0.15, 2, M('steel')); for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) ctx.box(x + dx * 0.95, y, z + dz * 0.95, 0.15, cell, 0.15, M('steel')); }
  const top = new THREE.Group(); top.position.set(x, h, z);
  const jibG = new THREE.BoxGeometry(jib, 1.2, 1.2); jibG.translate(jib / 2 - 6, 0.6, 0);
  top.add(new THREE.Mesh(jibG, M('steel'))); const cw = new THREE.Mesh(new THREE.BoxGeometry(3, 2, 2), M('concrete')); cw.position.set(-5, 0, 0); top.add(cw);
  const cab = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2), M('white')); cab.position.set(0, -1, 1.6); top.add(cab);
  const cable = new THREE.Mesh(new THREE.BoxGeometry(0.06, 14, 0.06), M('metalDark')); cable.position.set(jib * 0.6, -7, 0); top.add(cable);
  const load = new THREE.Mesh(new THREE.BoxGeometry(4, 0.6, 1), M('metalDark')); load.position.set(jib * 0.6, -14, 0); top.add(load);
  top.traverse(o => { if (o.isMesh) o.castShadow = true; }); ctx.scene.add(top);
  ctx.animated.push(t => { top.rotation.y = Math.sin(t * 0.08 + x) * 1.2; });
  ctx.collider(x - 1.2, x + 1.2, z - 1.2, z + 1.2, 0, h);
}

// ------------------------------------------------------------------ vehicles (procedural, used by traffic + parked cars)
export function carGeometry(kind = 'sedan') {
  const L = kind === 'van' ? 5.2 : kind === 'suv' ? 4.8 : 4.5, H = kind === 'van' ? 2.1 : kind === 'suv' ? 1.7 : 1.45;
  const s = new THREE.Shape();
  if (kind === 'van') { s.moveTo(-L / 2, 0.35); s.lineTo(L / 2, 0.35); s.lineTo(L / 2, 1.0); s.lineTo(L / 2 - 0.6, H); s.lineTo(-L / 2, H); s.closePath(); }
  else { s.moveTo(-L / 2, 0.35); s.lineTo(L / 2, 0.35); s.quadraticCurveTo(L / 2 + 0.05, 0.85, L / 2 - 0.3, 0.9); s.lineTo(L * 0.18, 0.98); s.quadraticCurveTo(0, H + 0.02, -L * 0.2, H); s.lineTo(-L / 2 + 0.35, H * 0.72 + 0.12); s.quadraticCurveTo(-L / 2, 0.95, -L / 2, 0.35); }
  const body = new THREE.ExtrudeGeometry(s, { depth: 1.7, bevelEnabled: true, bevelSize: 0.08, bevelThickness: 0.08, bevelSegments: 2, curveSegments: 8 });
  body.translate(0, 0, -0.85); body.rotateY(Math.PI / 2); // length along z
  // windows band
  const w = new THREE.Shape();
  if (kind === 'van') { w.moveTo(-L / 2 + 0.1, 1.2); w.lineTo(L / 2 - 0.55, 1.2); w.lineTo(L / 2 - 0.85, H - 0.1); w.lineTo(-L / 2 + 0.1, H - 0.1); w.closePath(); }
  else { w.moveTo(-L * 0.36, 1.0); w.lineTo(L * 0.16, 1.0); w.quadraticCurveTo(0, H - 0.06, -L * 0.18, H - 0.07); w.lineTo(-L * 0.36, 1.0); }
  const win = new THREE.ExtrudeGeometry(w, { depth: 1.82, bevelEnabled: false }); win.translate(0, 0, -0.91); win.rotateY(Math.PI / 2);
  const wheel = new THREE.CylinderGeometry(0.36, 0.36, 0.26, 16); wheel.rotateZ(Math.PI / 2);
  const wheels = []; for (const [wx, wz] of [[-0.82, L * 0.32], [0.82, L * 0.32], [-0.82, -L * 0.32], [0.82, -L * 0.32]]) { const g = wheel.clone(); g.translate(wx, 0.36, wz); wheels.push(g.toNonIndexed()); }
  const lights = new THREE.BoxGeometry(1.5, 0.12, 0.05); lights.translate(0, 0.8, L / 2 + 0.05);
  const tail = new THREE.BoxGeometry(1.5, 0.12, 0.05); tail.translate(0, 0.85, -L / 2 - 0.05);
  return { body, win, wheels: mergeGeometries(wheels), lights, tail, L };
}
export function makeCar(color, kind = 'sedan') {
  const g = carGeometry(kind); const grp = new THREE.Group();
  const paint = new THREE.MeshPhysicalMaterial({ color, metalness: 0.6, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.08 });
  const add = (geo, m) => { const me = new THREE.Mesh(geo, m); me.castShadow = true; me.receiveShadow = true; grp.add(me); };
  add(g.body, paint); add(g.win, M('charcoal')); add(g.wheels, M('rubber')); add(g.lights, M('lampHead')); add(g.tail, M('red'));
  grp.userData.L = g.L; return grp;
}

// Autonomous shuttle pod (Talentopia Transit): rounded pearl body, dark glazing band, cyan running light
export function makeShuttle() {
  const g = new THREE.Group(); const L = 5.6;
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(1.15, L - 2.3, 8, 20), new THREE.MeshPhysicalMaterial({ color: 0xf6f8fc, metalness: 0.2, roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.06 }));
  body.rotation.x = Math.PI / 2; body.scale.set(1, 1, 0.92); body.position.y = 1.35; g.add(body);
  const glass = new THREE.Mesh(new THREE.CapsuleGeometry(1.17, L - 2.6, 6, 20), new THREE.MeshPhysicalMaterial({ color: 0x111827, metalness: 0.6, roughness: 0.08 }));
  glass.rotation.x = Math.PI / 2; glass.scale.set(1.0, 1.0, 0.42); glass.position.y = 1.62; g.add(glass);
  const strip = new THREE.Mesh(new THREE.BoxGeometry(2.36, 0.05, L - 1.2), new THREE.MeshStandardMaterial({ color: 0x42dbff, emissive: 0x42dbff, emissiveIntensity: 2.2 })); strip.position.y = 0.95; g.add(strip);
  const wheel = new THREE.CylinderGeometry(0.32, 0.32, 0.22, 16); wheel.rotateZ(Math.PI / 2);
  for (const [x, z] of [[-0.95, 1.7], [0.95, 1.7], [-0.95, -1.7], [0.95, -1.7]]) { const w = new THREE.Mesh(wheel, M('rubber')); w.position.set(x, 0.32, z); g.add(w); }
  g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  g.userData.L = L; return g;
}
