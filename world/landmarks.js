// Streams the Blender-authored landmark GLBs (assets/landmarks) and places them where the city layout registered them.
import * as THREE from 'three';

function prep(root) {
  root.traverse(o => {
    if (!o.isMesh) return;
    o.castShadow = true; o.receiveShadow = true;
    for (const m of [].concat(o.material)) {
      const n = (m.name || '').toLowerCase();
      if (n.startsWith('glass')) { m.envMapIntensity = 1.5; m.roughness = Math.min(m.roughness, 0.08); }
      if (n.includes('glow') || n === 'lamp') { m.toneMapped = true; o.castShadow = false; }
      if (n.includes('champagne') || n.includes('coolmetal')) m.envMapIntensity = 1.3;
    }
  });
  return root;
}

export function loadLandmarks(ctx, scene, loader) {
  const files = [...new Set(ctx.landmarks.map(l => l.file))];
  const cache = {};
  return Promise.all(files.map(f => new Promise(res => loader.load(`assets/landmarks/${f}.glb`, g => { cache[f] = prep(g.scene); res(); }, undefined, () => { console.warn('landmark failed', f); res(); }))))
    .then(() => {
      for (const l of ctx.landmarks) {
        const src = cache[l.file]; if (!src) continue;
        const o = src.clone(); o.position.set(l.x, l.y, l.z); o.rotation.y = l.ry || 0; o.name = 'landmark:' + l.file; scene.add(o); l.object = o;
      }
      return cache;
    });
}
export function loadHospitalUpgrade(root, loader) {
  return new Promise(res => loader.load('assets/landmarks/hospital_upgrade.glb', g => { root.add(prep(g.scene)); res(true); }, undefined, () => res(false)));
}
