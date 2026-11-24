// V4 realistic traffic: Blender-built cars (blender/cars.py -> assets/city/cars.glb).
// Each car = paint (tinted per car) + detail (glass/trim/chrome/lamps, vertex colours) + tail lamps (glow when braking)
// + wheels (spun in the vertex shader). A coarse "_lo" copy is shown beyond LOD_DIST.
import * as THREE from 'three';

const LOD_DIST = 50;
const protos = {};   // name -> { hi: [{geo, mat}], lo: [...], L, axF, axR, r }
let shared = null;

// vertex colour alpha carries roughness/metalness: a < 0.5 -> roughness 2a (dielectric); a >= 0.5 -> roughness 2(a-0.5), metal
function encodedMat(extra = {}) {
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, metalness: 0, envMapIntensity: 1.2, ...extra });
  m.onBeforeCompile = sh => {
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\n float vEnc = vColor.a; roughnessFactor = max(0.03, vEnc < 0.5 ? vEnc * 2.0 : (vEnc - 0.5) * 2.0);')
      .replace('#include <metalnessmap_fragment>', '#include <metalnessmap_fragment>\n metalnessFactor = vColor.a < 0.5 ? 0.0 : 1.0;')
      .replace('#include <color_fragment>', '#include <color_fragment>\n diffuseColor.a = opacity;');
  };
  m.customProgramCacheKey = () => 'veh-enc' + (extra.spin ? '-spin' : '');
  return m;
}
function wheelMat(proto) {
  const m = encodedMat(); const u = { uSpin: { value: 0 }, uAx: { value: new THREE.Vector2(proto.axF, proto.axR) }, uR: { value: proto.r } };
  const base = m.onBeforeCompile;
  m.onBeforeCompile = sh => {
    base(sh); Object.assign(sh.uniforms, u);
    sh.vertexShader = 'uniform float uSpin; uniform vec2 uAx; uniform float uR;\n' + sh.vertexShader
      .replace('#include <beginnormal_vertex>', `#include <beginnormal_vertex>
        float wAz = position.z > 0.0 ? uAx.x : uAx.y; float wc = cos(uSpin), ws = sin(uSpin);
        objectNormal.yz = vec2(wc * objectNormal.y - ws * objectNormal.z, ws * objectNormal.y + wc * objectNormal.z);`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        { vec2 wp = vec2(transformed.y - uR, transformed.z - wAz);
          transformed.y = uR + wc * wp.x - ws * wp.y; transformed.z = wAz + ws * wp.x + wc * wp.y; }`);
  };
  m.customProgramCacheKey = () => 'veh-wheel';
  m.userData.u = u; return m;
}
function blobTexture() {
  const c = document.createElement('canvas'); c.width = 64; c.height = 128; const g = c.getContext('2d');
  const grd = g.createRadialGradient(32, 64, 4, 32, 64, 62); grd.addColorStop(0, 'rgba(0,0,0,0.75)'); grd.addColorStop(0.55, 'rgba(0,0,0,0.45)'); grd.addColorStop(1, 'rgba(0,0,0,0)');
  g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = grd; g.scale(1, 1); g.fillRect(0, 0, 64, 128);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

export function loadVehicles(loaderPromise, url = 'assets/city/cars.glb') {
  return loaderPromise.then(loader => new Promise((res, rej) => loader.load(url, g => {
    for (const k in protos) delete protos[k];
    shared = { detail: encodedMat({ polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2 }),
      blob: new THREE.MeshBasicMaterial({ map: blobTexture(), transparent: true, depthWrite: false, opacity: 0.85, polygonOffset: true, polygonOffsetFactor: -4 }) };
    g.scene.traverse(o => {
      if (!o.isMesh) return;
      let node = o; while (node.parent && node.parent !== g.scene) node = node.parent;
      const name = node.name.replace(/\.\d+$/, ''); const lo = name.endsWith('_lo'); const key = name.replace(/_lo$/, '');
      const p = protos[key] || (protos[key] = { hi: [], lo: [] });
      const geo = o.geometry.clone(); o.updateWorldMatrix(true, false);
      // geometry in car-local space (the exporter laid the cars out side by side)
      const m = new THREE.Matrix4().copy(node.matrixWorld).invert().multiply(o.matrixWorld); geo.applyMatrix4(m);
      (lo ? p.lo : p.hi).push({ geo, mat: o.material.name });
    });
    for (const p of Object.values(protos)) {
      const all = [...p.hi]; const bb = new THREE.Box3(); for (const e of all) { e.geo.computeBoundingBox(); bb.union(e.geo.boundingBox); }
      p.L = bb.max.z - bb.min.z; p.W = bb.max.x - bb.min.x;
      const wh = all.find(e => e.mat === 'Wheel'); const pos = wh.geo.attributes.position; let fz0 = 1e9, fz1 = -1e9, rz0 = 1e9, rz1 = -1e9, ymax = 0;
      for (let i = 0; i < pos.count; i++) { const z = pos.getZ(i), y = pos.getY(i); ymax = Math.max(ymax, y); if (z > 0) { fz0 = Math.min(fz0, z); fz1 = Math.max(fz1, z); } else { rz0 = Math.min(rz0, z); rz1 = Math.max(rz1, z); } }
      p.axF = (fz0 + fz1) / 2; p.axR = (rz0 + rz1) / 2; p.r = ymax / 2;
    }
    res(protos);
  }, undefined, rej)));
}
export const vehiclesReady = () => !!shared;

const SOLID = new Set([0xf5f7fb, 0x101114, 0xf1b70d, 0x8b1e2d, 0x2a3f66, 0xffffff]);
export function makeVehicle(kind, color) {
  const p = protos[kind]; if (!p) return null;
  const metallic = !SOLID.has(color);
  const paint = new THREE.MeshPhysicalMaterial({ color, metalness: metallic ? 0.55 : 0.08, roughness: metallic ? 0.38 : 0.3, clearcoat: 1, clearcoatRoughness: 0.04, envMapIntensity: 1.15 });
  const tail = new THREE.MeshStandardMaterial({ color: 0x5a0a0e, emissive: 0xff1810, emissiveIntensity: 0.35, roughness: 0.15, metalness: 0.2 });
  const wheel = wheelMat(p);
  const mats = { Paint: paint, Detail: shared.detail, Tail: tail, Wheel: wheel };
  const grp = new THREE.Group(), hi = new THREE.Group(), lo = new THREE.Group();
  for (const [list, parent] of [[p.hi, hi], [p.lo, lo]]) for (const e of list) {
    const me = new THREE.Mesh(e.geo, mats[e.mat] || paint); me.castShadow = e.mat === 'Paint'; me.receiveShadow = true; parent.add(me);
  }
  const blob = new THREE.Mesh(new THREE.PlaneGeometry(p.W * 1.25, p.L * 1.12), shared.blob); blob.rotation.x = -Math.PI / 2; blob.position.y = 0.02; blob.renderOrder = -1;
  lo.visible = false; grp.add(hi, lo, blob);
  let spin = 0, brake = 0;
  grp.userData = { L: p.L, kind,
    // speed m/s, braking flag, distance to camera/player
    drive(dt, v, braking, dist) {
      spin = (spin + v * dt / p.r) % (Math.PI * 2); wheel.userData.u.uSpin.value = spin;
      brake += ((braking ? 1 : 0) - brake) * Math.min(1, dt * 10); tail.emissiveIntensity = 0.35 + brake * 3.2;
      const near = dist < LOD_DIST; if (hi.visible !== near) { hi.visible = near; lo.visible = !near; }
      blob.visible = dist < 140;
    } };
  return grp;
}
