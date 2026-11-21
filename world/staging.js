// Talentopia V2 Milestone D: physically staged missions. While a task panel is open, the camera frames a real 3D scene that
// reacts to the player's choices, and a correct result plays out physically before the summary appears. Scoring stays in
// activities.js / ui.js; they only report events here: open, state, right, wrong, success (returns a delay in ms), close.
//   m:bank    loan desk: a seated customer who reacts, a live holographic loan document, approval stamp
//   a:ticket  kitchen prep counter: ingredients, pan, hob, probe thermometer, plating and the pass bell
//   m:kitchen kitchen: rice scale and probe thermometer readouts
//   a:budget  media planning: holographic channel bars and a campaign forecast screen that launches
//   a:triage  hospital: a holographic anatomy figure with colour-coded triage markers on the injured body regions
import * as THREE from 'three';

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const ease = u => u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2;
const TRIAGE = [['#E5484D', 'Immediate'], ['#F5842B', 'Very urgent'], ['#F2C230', 'Urgent'], ['#3FB27F', 'Standard'], ['#3E7BFA', 'Non-urgent']];

// ---------------------------------------------------------------- small helpers
function panel(w, h, cw = 1024) {
  const c = document.createElement('canvas'); c.width = cw; c.height = Math.round(cw * h / w);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, transparent: true, toneMapped: false, side: THREE.DoubleSide, depthWrite: false }));
  m.renderOrder = 5; return { mesh: m, c, g: c.getContext('2d'), tex };
}
function rr(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
function holoFrame(g, W, H, title) {
  g.clearRect(0, 0, W, H); rr(g, 6, 6, W - 12, H - 12, 26); g.fillStyle = 'rgba(17,24,39,.82)'; g.fill();
  g.lineWidth = 4; g.strokeStyle = 'rgba(66,219,255,.85)'; g.stroke();
  g.fillStyle = '#42DBFF'; g.font = '800 30px Plus Jakarta Sans, Arial'; g.fillText(title, 36, 56);
  g.fillStyle = 'rgba(66,219,255,.25)'; g.fillRect(36, 70, W - 72, 2);
}
function labelSprite(text, bg, size = 0.16) {
  const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
  g.fillStyle = bg; g.beginPath(); g.arc(64, 64, 58, 0, 7); g.fill(); g.lineWidth = 6; g.strokeStyle = '#fff'; g.stroke();
  g.fillStyle = '#fff'; g.font = '800 64px Plus Jakarta Sans, Arial'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, 64, 68);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: false, toneMapped: false })); s.scale.setScalar(size); s.renderOrder = 10; return s;
}
let actx = null;
function sfx(kind) {
  try {
    actx = actx || new (window.AudioContext || window.webkitAudioContext)(); const t = actx.currentTime;
    if (kind === 'ding' || kind === 'ok') { for (const [f, d] of kind === 'ding' ? [[1760, 0], [2637, 0.02]] : [[660, 0], [990, 0.09]]) { const o = actx.createOscillator(), g = actx.createGain(); o.frequency.value = f; o.type = 'sine'; g.gain.setValueAtTime(0.0001, t + d); g.gain.exponentialRampToValueAtTime(0.18, t + d + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + d + (kind === 'ding' ? 1.4 : 0.35)); o.connect(g).connect(actx.destination); o.start(t + d); o.stop(t + d + 1.5); } }
    if (kind === 'no') { const o = actx.createOscillator(), g = actx.createGain(); o.type = 'triangle'; o.frequency.setValueAtTime(220, t); o.frequency.linearRampToValueAtTime(160, t + 0.25); g.gain.setValueAtTime(0.15, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3); o.connect(g).connect(actx.destination); o.start(t); o.stop(t + 0.32); }
    if (kind === 'stamp') { const o = actx.createOscillator(), g = actx.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(50, t + 0.15); g.gain.setValueAtTime(0.4, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2); o.connect(g).connect(actx.destination); o.start(t); o.stop(t + 0.22); }
    if (kind === 'sizzle') { const n = actx.sampleRate * 2.6, b = actx.createBuffer(1, n, actx.sampleRate), d = b.getChannelData(0); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (Math.random() < 0.3 ? 1 : 0.3);
      const s = actx.createBufferSource(); s.buffer = b; const f = actx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 3000; const g = actx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.07, t + 0.2); g.gain.linearRampToValueAtTime(0.0001, t + 2.6); s.connect(f).connect(g).connect(actx.destination); s.start(t); }
  } catch (e) {}
}
const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.6, ...o });

// holographic material: works on skinned + morphed meshes (it's a MeshStandardMaterial whose output is replaced)
function holoMaterial(color = 0x42dbff) {
  const m = new THREE.MeshStandardMaterial({ color: 0x000000, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
  m.userData.u = { holoCol: { value: new THREE.Color(color) }, holoT: { value: 0 }, holoFlash: { value: 0 } };
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, m.userData.u);
    sh.fragmentShader = 'uniform vec3 holoCol; uniform float holoT; uniform float holoFlash;\n' + sh.fragmentShader.replace('#include <dithering_fragment>', `#include <dithering_fragment>
      float fr = pow(1.0 - abs(dot(normalize(normal), normalize(vViewPosition))), 2.2);
      float scan = 0.75 + 0.25 * sin(gl_FragCoord.y * 0.9 + holoT * 6.0);
      vec3 col = mix(holoCol, vec3(0.35, 1.0, 0.6), holoFlash);
      gl_FragColor = vec4(col * (0.35 + fr * 2.2) * scan, 1.0);`);
  };
  return m;
}

export class Staging {
  // deps: { scene, ctx, stations(id), npc(rolePart), spawnAvatar(look), player(), P, placePlayer(x,z,yaw), groundAt, ui }
  constructor(d) { this.d = d; this.cur = null; this.time = 0; this.tw = []; this.cache = {}; this.chars = []; }
  get cam() { return this.cur && this.cur.cam; }
  has(key) { return !!this.builders()[key]; }
  builders() { return { 'm:bank': () => this.bank(), 'a:ticket': () => this.kitchen('ticket'), 'm:kitchen': () => this.kitchen('rush'), 'a:budget': () => this.budget(), 'a:triage': () => this.triage() }; }
  // ---------------------------------------------------------------- event bus
  event(key, ev, data = {}) {
    if (ev === 'open') { const b = this.builders()[key]; if (!b) return 0; this.end(); try { this.cur = b(); } catch (e) { console.warn('stage', key, e); this.cur = null; return 0; } this.cur.key = key; this.d.ui.setStaged(key); return 0; }
    const s = this.cur; if (!s || s.key !== key) return 0;
    if (ev === 'close') { this.end(); return 0; }
    const h = s[ev]; const r = h ? h.call(this, data) : 0; return r || 0;
  }
  end() { const s = this.cur; if (!s) return; s.cleanup && s.cleanup(); this.cur = null; this.tw.length = 0; this.d.ui.setStaged(null); }
  // tweens + timelines on the game clock
  tween(d, fn, done) { this.tw.push({ t: 0, d, fn, done }); }
  at(delay, fn) { this.tw.push({ t: -delay, d: 0, fn: () => {}, done: fn }); }
  update(dt) {
    this.time += dt;
    for (let i = this.tw.length - 1; i >= 0; i--) { const w = this.tw[i]; w.t += dt; if (w.t < 0) continue; const u = w.d ? Math.min(1, w.t / w.d) : 1; w.fn(u); if (u >= 1) { this.tw.splice(i, 1); w.done && w.done(); } }
    const s = this.cur; if (s && s.tick) s.tick(dt, this.time);
    for (const k in this.cache) { const c = this.cache[k]; if (c.idle) c.idle(dt, this.time); }
    const pp = this.d.player() && this.d.player().root.position;
    for (const c of this.chars) { const vis = !pp || c.root.position.distanceTo(pp) < 30; c.root.visible = vis; if (vis) c.update(dt, 0, 0); }
  }
  arc(obj, to, d = 0.8, h = 0.35, done) { const from = obj.position.clone(); this.tween(d, u => { const e = ease(u); obj.position.lerpVectors(from, to, e); obj.position.y += Math.sin(Math.PI * e) * h; }, done); }
  frameOf(id) { return this.d.ctx.frames[id]; }
  P(fr, u, v, y = 0) { const [x, z] = fr.F(u, v); return V(x, fr.y + y, z); }
  yawTo(a, b) { return Math.atan2(b.x - a.x, b.z - a.z); }
  camFrom(target, from, dist, height, side = 0) { // camera behind `from`, looking at target
    const d = V(target.x - from.x, 0, target.z - from.z).normalize(); const r = V(-d.z, 0, d.x);
    return { pos: V(from.x - d.x * dist + r.x * side, height, from.z - d.z * dist + r.z * side), look: target.clone() };
  }

  // ================================================================ BANK: loan desk
  bank() {
    const fr = this.frameOf('bank'), W = fr.W, D = fr.D; const sc = this.d.scene;
    const deskC = this.P(fr, -W / 2 + 4, D * 0.45), chairP = this.P(fr, -W / 2 + 5.3, D * 0.45), lina = this.d.npc('Lina');
    const standP = this.P(fr, -W / 2 + 5.25, D * 0.45 + 1.15);
    // the customer: built once, then stays seated at the desk
    let C = this.cache.bank;
    if (!C) {
      C = this.cache.bank = { cust: null };
      this.d.spawnAvatar({ pres: 0.55, build: 0.1, muscle: 0.35, skin: 'young_african_male', hair: 'short02', hairColor: '#141012', brows: 'eyebrow006', beard: 'stubble', outfit: 'male_casualsuit03', outfitTint: '#ffffff', shoes: 'shoes03', jawWide: 0.2 })
        .then(c => { C.cust = c; this.chars.push(c); c.root.position.set(chairP.x, fr.y, chairP.z); c.root.rotation.y = this.yawTo(chairP, deskC) ; c.sitDown(true); c.sit = 1; c.sitClip = 'SitIdle'; c.baseRy = c.root.rotation.y; });
    }
    this.d.placePlayer(standP.x, standP.z, this.yawTo(standP, deskC));
    const doc = panel(1.25, 0.82); doc.mesh.position.set(deskC.x, fr.y + 1.62, deskC.z); doc.mesh.rotation.y = this.yawTo(deskC, V((standP.x + chairP.x) / 2, 0, (standP.z + chairP.z) / 2)); sc.add(doc.mesh);
    let st = { amount: 25000, years: 4, p: 599, ok: false }, stamp = null, flash = 0, lastOk = null;
    const draw = () => {
      const g = doc.g, Wc = doc.c.width, Hc = doc.c.height; holoFrame(g, Wc, Hc, 'LOAN APPLICATION · ALEX');
      g.font = '600 26px Plus Jakarta Sans, Arial'; g.fillStyle = '#C8D3E6';
      const row = (y, a, b, col = '#F6F8FC') => { g.fillStyle = '#A7B9C9'; g.fillText(a, 36, y); g.fillStyle = col; g.textAlign = 'right'; g.fillText(b, Wc - 36, y); g.textAlign = 'left'; };
      row(112, 'Monthly income after tax', '$3,200'); row(152, 'Rent and bills', '−$2,700'); row(192, 'Affordable repayment', '$500 / month', '#42DBFF');
      row(244, 'Loan requested (used car)', '$' + st.amount.toLocaleString()); row(284, 'Term · rate', `${st.years} years · 7% APR`);
      // repayment bar against the $500 limit
      const bx = 36, by = 318, bw = Wc - 72, bh = 46, max = 1200; rr(g, bx, by, bw, bh, 12); g.fillStyle = 'rgba(255,255,255,.08)'; g.fill();
      const fw = Math.min(1, st.p / max) * bw; rr(g, bx, by, Math.max(24, fw), bh, 12); g.fillStyle = st.ok ? '#3FB27F' : '#E5484D'; g.fill();
      const lx = bx + 500 / max * bw; g.fillStyle = '#F6F8FC'; g.fillRect(lx - 2, by - 10, 4, bh + 20); g.font = '700 20px Plus Jakarta Sans, Arial'; g.fillText('limit $500', lx + 8, by - 8);
      g.font = '800 40px Plus Jakarta Sans, Arial'; g.fillStyle = '#F6F8FC'; g.fillText(`$${Math.round(st.p)} / month`, 36, by + bh + 52);
      g.font = '700 24px Plus Jakarta Sans, Arial'; g.fillStyle = st.ok ? '#78D8B5' : '#F3A7B5'; g.textAlign = 'right'; g.fillText(st.ok ? 'Within budget' : 'Over budget', Wc - 36, by + bh + 48); g.textAlign = 'left';
      if (flash > 0) { g.fillStyle = `rgba(229,72,77,${flash * 0.35})`; rr(g, 6, 6, Wc - 12, Hc - 12, 26); g.fill(); }
      if (stamp) { g.save(); g.translate(Wc * 0.68, Hc * 0.34); g.rotate(-0.22); g.lineWidth = 8; g.strokeStyle = stamp.col; g.fillStyle = stamp.col; g.font = '900 64px Plus Jakarta Sans, Arial'; g.textAlign = 'center'; const tw = g.measureText(stamp.t).width; g.globalAlpha = stamp.a; rr(g, -tw / 2 - 22, -56, tw + 44, 84, 10); g.stroke(); g.fillText(stamp.t, 0, 8); g.restore(); }
      doc.tex.needsUpdate = true;
    };
    draw();
    const cam = this.camFrom(V(deskC.x, fr.y + 1.25, deskC.z), V((standP.x + chairP.x) / 2, 0, (standP.z + chairP.z) / 2), 2.4, fr.y + 2.15, 0.25);
    return {
      cam,
      tick: (dt, t) => { doc.mesh.position.y = fr.y + 1.62 + Math.sin(t * 1.6) * 0.01; if (flash > 0) { flash = Math.max(0, flash - dt * 1.5); draw(); } const c = C.cust; if (c && lina && lina.c) { lina.c.lookAt(c.bones.head.getWorldPosition(V())); c.lookAt(this.d.player() ? this.d.player().bones.head.getWorldPosition(V()) : null); } },
      state: (s) => {
        st = s; draw(); const c = C.cust; if (!c) return;
        c.expr.smile = s.ok ? 0.55 : 0; c.expr.browsDown = s.ok ? 0 : 0.45; c.expr.browsUp = 0;
        if (lastOk === false && s.ok && c.acts.Nod) c.play('Nod', { lock: false }); lastOk = s.ok;
      },
      wrong: () => { flash = 1; draw(); sfx('no'); const c = C.cust; if (c && c.acts.No) c.play('No', { lock: false }); if (lina && lina.c && lina.c.acts.No) lina.c.play('No', { lock: false }); },
      success: ({ approved }) => {
        sfx('stamp'); stamp = approved ? { t: 'APPROVED', col: '#3FB27F', a: 0 } : { t: 'REFERRED', col: '#F2C230', a: 0 };
        this.tween(0.25, u => { stamp.a = u; draw(); });
        const c = C.cust; if (c) { c.expr.smile = approved ? 0.85 : 0.3; c.expr.browsDown = 0; if (c.acts.Nod) c.play('Nod', { lock: false }); }
        if (lina && lina.c) { lina.c.expr.smile = 0.7; this.at(0.6, () => lina.c.acts.Present && lina.c.play('Present', { lock: false })); }
        if (c && approved) this.at(1.3, () => { c.sitDown(false); this.at(0.7, () => c.wave(1.6)); this.at(2.6, () => c.sitDown(true)); });
        this.d.ui.toast(approved ? 'Loan approved within Alex’s budget' : 'Unaffordable loan referred back'); return 3200;
      },
      cleanup: () => { sc.remove(doc.mesh); doc.tex.dispose(); const c = C.cust; if (c) { c.lookAt(null); c.expr.smile = 0.15; c.expr.browsDown = 0; } if (lina && lina.c) lina.c.lookAt(null); },
    };
  }

  // ================================================================ KITCHEN: prep counter
  kitchenProps() {
    if (this.cache.kitchen) return this.cache.kitchen;
    const fr = this.frameOf('kitchen'), D = fr.D, sc = this.d.scene; const top = 0.95;
    const g = new THREE.Group(); sc.add(g); const at = (u, v, y = 0) => this.P(fr, u, v, top + y);
    const add = (geo, mat, p, name) => { const m = new THREE.Mesh(geo, mat); m.position.copy(p); m.castShadow = true; m.name = name || ''; g.add(m); return m; };
    const K = { g, fr };
    K.board = add(new THREE.BoxGeometry(0.5, 0.03, 0.34), std(0xb88a5a), at(-3.6, D - 4.2, 0.015));
    K.chickenMat = std(0xf2b8a8, { roughness: 0.5 });
    K.chicken = add(new THREE.CapsuleGeometry(0.06, 0.12, 6, 12), K.chickenMat, at(-3.6, D - 4.2, 0.08)); K.chicken.rotation.z = Math.PI / 2; K.chicken.scale.set(1, 1, 0.6);
    K.home = { chicken: K.chicken.position.clone() };
    K.veg = [];
    const vegs = [[new THREE.CylinderGeometry(0.018, 0.01, 0.16, 8), std(0xf08a24)], [new THREE.IcosahedronGeometry(0.045, 1), std(0x3d8b3d)], [new THREE.SphereGeometry(0.045, 12, 8), std(0xd8342c)], [new THREE.IcosahedronGeometry(0.04, 1), std(0x3d8b3d)]];
    vegs.forEach(([geo, m], i) => { const p = at(-3.15 + (i % 2) * 0.12, D - 4.45 + (i >> 1) * 0.12 + Math.random() * 0.03, 0.05); const o = add(geo, m, p); if (i === 0) o.rotation.z = Math.PI / 2; o.userData.home = p.clone(); K.veg.push(o); });
    K.hob = add(new THREE.BoxGeometry(0.42, 0.03, 0.42), std(0x111318, { roughness: 0.2, metalness: 0.4 }), at(-2.75, D - 4.15, 0.015));
    K.ringMat = new THREE.MeshBasicMaterial({ color: 0xff3a1a, transparent: true, opacity: 0 }); K.ring = add(new THREE.RingGeometry(0.11, 0.15, 32), K.ringMat, at(-2.75, D - 4.15, 0.032)); K.ring.rotation.x = -Math.PI / 2;
    K.pan = add(new THREE.CylinderGeometry(0.15, 0.13, 0.05, 24, 1, true), std(0x2a2d33, { metalness: 0.7, roughness: 0.35, side: THREE.DoubleSide }), at(-2.75, D - 4.15, 0.06));
    add(new THREE.CylinderGeometry(0.13, 0.13, 0.01, 24), std(0x2a2d33, { metalness: 0.7, roughness: 0.35 }), at(-2.75, D - 4.15, 0.04));
    const handle = add(new THREE.BoxGeometry(0.22, 0.02, 0.03), std(0x111111), at(-2.75 + 0.24, D - 4.15, 0.07));
    K.plate = add(new THREE.CylinderGeometry(0.15, 0.11, 0.025, 28), std(0xffffff, { roughness: 0.25 }), at(-2.2, D - 4.3, 0.013)); K.home.plate = K.plate.position.clone();
    K.therm = add(new THREE.CylinderGeometry(0.006, 0.006, 0.2, 8), std(0xcfd5dc, { metalness: 0.8, roughness: 0.3 }), at(-2.45, D - 4.0, 0.1)); K.home.therm = K.therm.position.clone();
    K.read = panel(0.34, 0.16, 384); K.read.mesh.position.copy(at(-2.75, D - 4.15, 0.42)); g.add(K.read.mesh);
    K.scale = add(new THREE.BoxGeometry(0.26, 0.04, 0.26), std(0xe9edf2, { roughness: 0.3 }), at(-1.75, D - 4.2, 0.02));
    K.rice = add(new THREE.CylinderGeometry(0.08, 0.09, 0.03, 20), std(0xf3efe3), at(-1.75, D - 4.2, 0.05)); K.rice.scale.y = 0.01;
    K.bell = add(new THREE.SphereGeometry(0.06, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), std(0xd8b98a, { metalness: 1, roughness: 0.25 }), at(-1.95, D - 3.5, 0));
    K.pass = at(-2.3, D - 3.5, 0.013); // service spot on the near edge of the counter, in view
    K.smoke = []; const sm = new THREE.SpriteMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false });
    for (let i = 0; i < 14; i++) { const s = new THREE.Sprite(sm.clone()); s.scale.setScalar(0.12); s.userData.ph = Math.random(); g.add(s); K.smoke.push(s); }
    K.cook = 0; K.temp = null; K.heat = 0; K.label = '';
    const drawRead = () => { const r = K.read, cv = r.c, gg = r.g; gg.clearRect(0, 0, cv.width, cv.height); if (K.temp === null && !K.label) { r.tex.needsUpdate = true; return; }
      rr(gg, 4, 4, cv.width - 8, cv.height - 8, 22); gg.fillStyle = 'rgba(17,24,39,.85)'; gg.fill(); gg.lineWidth = 4; gg.strokeStyle = K.temp !== null && K.temp >= 74 || K.label.includes('✓') ? '#3FB27F' : '#42DBFF'; gg.stroke();
      gg.fillStyle = '#F6F8FC'; gg.font = '800 64px Plus Jakarta Sans, Arial'; gg.textAlign = 'center'; gg.textBaseline = 'middle'; gg.fillText(K.label || `${Math.round(K.temp)} °C`, cv.width / 2, cv.height / 2 + 4); r.tex.needsUpdate = true; };
    K.drawRead = drawRead; drawRead();
    K.idle = (dt, t) => {
      K.ringMat.opacity += ((K.heat ? 0.9 : 0) - K.ringMat.opacity) * Math.min(1, dt * 3);
      const panP = K.pan.position; for (const s of K.smoke) { const a = (t * 0.5 + s.userData.ph) % 1; s.position.set(panP.x + Math.sin(s.userData.ph * 40) * 0.08, panP.y + 0.05 + a * 0.6, panP.z + Math.cos(s.userData.ph * 30) * 0.08); s.material.opacity = K.heat * 0.35 * Math.sin(a * Math.PI); s.scale.setScalar(0.08 + a * 0.22); }
      K.chickenMat.color.setRGB(0.95 - K.cook * 0.47, 0.62 - K.cook * 0.42, 0.52 - K.cook * 0.46);
      K.read.mesh.lookAt(this.d.camera.position);
    };
    this.cache.kitchen = K; return K;
  }
  kitchen(kind) {
    const K = this.kitchenProps(), fr = K.fr, D = fr.D; const chef = this.d.npc('Rami');
    // reset props
    K.chicken.position.copy(K.home.chicken); K.cook = 0; K.heat = 0; K.temp = null; K.label = ''; K.veg.forEach(v => v.position.copy(v.userData.home)); K.plate.position.copy(K.home.plate); K.therm.position.copy(K.home.therm); K.therm.rotation.set(0, 0, 0); K.rice.scale.y = 0.01; K.drawRead();
    const standP = this.P(fr, kind === 'rush' ? -2.2 : -3.0, D - 5.45), counterC = this.P(fr, kind === 'rush' ? -2.2 : -2.9, D - 4.2, 1.0);
    this.d.placePlayer(standP.x, standP.z, this.yawTo(standP, counterC));
    const cam = this.camFrom(counterC, standP, 0.55, fr.y + 2.0, 1.5);
    const pl = () => this.d.player();
    const no = () => { sfx('no'); if (chef && chef.c && chef.c.acts.No) chef.c.play('No', { lock: false }); };
    if (kind === 'rush') return {
      cam, wrong: no,
      right: ({ i }) => { sfx('ok'); if (i === 0) { pl() && pl().play('PickUp', { lock: false }); this.tween(1.2, u => { K.rice.scale.y = Math.max(0.01, u); }); K.label = '500 g ✓'; K.drawRead(); K.read.mesh.position.copy(this.P(fr, -1.75, D - 4.2, 1.35)); }
        else { K.read.mesh.position.copy(this.P(fr, -2.75, D - 4.15, 1.37)); K.label = ''; K.heat = 1; this.arc(K.therm, K.chicken.position.clone().add(V(0, 0.08, 0)), 0.5, 0.15); K.temp = 30; this.tween(1.4, u => { K.temp = 30 + 44 * u; K.cook = u; K.drawRead(); }); } },
      success: () => { this.at(0.4, () => { sfx('ding'); if (chef && chef.c) { chef.c.expr.smile = 0.7; chef.c.acts.Nod && chef.c.play('Nod', { lock: false }); } }); return 2200; },
      cleanup: () => { K.heat = 0; },
    };
    return {
      cam, wrong: no,
      success: () => {
        const step = (t, msg, fn) => this.at(t, () => { this.d.ui.toast(msg); fn && fn(); });
        step(0.2, '1 · Wash hands, apron on', () => pl() && pl().play('Interact', { lock: false }));
        step(1.5, '2 · Mise en place', () => { pl() && pl().play('PickUp', { lock: false }); K.veg.forEach((v, i) => this.arc(v, this.P(fr, -3.3 + i * 0.09, D - 4.48, 0.95 + 0.05), 0.5 + i * 0.08, 0.12)); });
        step(3.0, '3 · Cook to 74 °C core temperature', () => { K.heat = 1; sfx('sizzle'); this.arc(K.chicken, K.pan.position.clone().add(V(0, 0.05, 0)), 0.7, 0.3); this.tween(2.4, u => { K.cook = u; }); });
        this.at(4.4, () => { this.arc(K.therm, K.pan.position.clone().add(V(0.02, 0.14, 0)), 0.45, 0.15); K.therm.rotation.z = 0.5; K.temp = 22; this.tween(1.3, u => { K.temp = 22 + 52 * ease(u); K.drawRead(); }, () => sfx('ok')); });
        step(6.0, '4 · Rest for 3 minutes', () => { K.heat = 0; this.arc(K.therm, K.home.therm, 0.4, 0.1); K.therm.rotation.z = 0; this.arc(K.chicken, K.board.position.clone().add(V(0, 0.06, 0)), 0.6, 0.25); });
        step(7.0, '5 · Plate and garnish', () => { K.temp = null; K.drawRead(); pl() && pl().play('PickUp', { lock: false }); this.arc(K.chicken, K.plate.position.clone().add(V(0, 0.05, 0)), 0.6, 0.3); K.veg.forEach((v, i) => this.arc(v, K.plate.position.clone().add(V(Math.cos(i * 1.6) * 0.09, 0.04, Math.sin(i * 1.6) * 0.09)), 0.55 + i * 0.07, 0.2)); });
        step(8.1, '6 · Send to the pass', () => { const items = [K.plate, K.chicken, ...K.veg]; const off = items.map(o => o.position.clone().sub(K.plate.position)); const from = K.plate.position.clone();
          this.tween(1.0, u => { const p = from.clone().lerp(K.pass, ease(u)); items.forEach((o, k) => o.position.copy(p).add(off[k])); }, () => { sfx('ding'); this.tween(0.15, u => { K.bell.position.y = K.pass.y + 0.01 - Math.sin(u * Math.PI) * 0.01; }); if (chef && chef.c) { chef.c.expr.smile = 0.8; chef.c.acts.Nod && chef.c.play('Nod', { lock: false }); } }); });
        return 9800;
      },
      cleanup: () => { K.heat = 0; },
    };
  }

  // ================================================================ AGENCY: media planning table
  budget() {
    const fr = this.frameOf('agency'), W = fr.W, D = fr.D, sc = this.d.scene; const yara = this.d.npc('Yara');
    const standP = this.P(fr, W / 2 - 4.6, D - 5.6), padC = this.P(fr, W / 2 - 4.6, D - 4.2);
    this.d.placePlayer(standP.x, standP.z, this.yawTo(standP, padC));
    const g = new THREE.Group(); sc.add(g);
    const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.8, 0.08, 40), std(0x1b2333, { metalness: 0.6, roughness: 0.3 })); pad.position.set(padC.x, fr.y + 0.04, padC.z); g.add(pad);
    const glow = new THREE.Mesh(new THREE.RingGeometry(0.62, 0.7, 48), new THREE.MeshBasicMaterial({ color: 0x42dbff, toneMapped: false })); glow.rotation.x = -Math.PI / 2; glow.position.set(padC.x, fr.y + 0.085, padC.z); g.add(glow);
    const cols = [0x8d70ff, 0x42dbff, 0xd8b98a, 0x78d8b5], names = ['Social video', 'Creators', 'Billboards', 'School events'];
    const right = V(Math.cos(fr.ry), 0, -Math.sin(fr.ry)); // across the room
    const bars = cols.map((c, i) => { const m = new THREE.Mesh(new THREE.BoxGeometry(0.2, 1, 0.2), new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.75, toneMapped: false, depthWrite: false }));
      const off = (i - 1.5) * 0.3; m.position.set(padC.x + right.x * off, fr.y + 0.1, padC.z + right.z * off); m.scale.y = 0.01; m.userData.h = 0.01; g.add(m);
      const lab = panel(0.42, 0.12, 256); lab.g.fillStyle = '#F6F8FC'; lab.g.font = '700 40px Plus Jakarta Sans, Arial'; lab.g.textAlign = 'center'; lab.g.fillText(names[i], 128, 52); lab.tex.needsUpdate = true; lab.mesh.position.set(m.position.x, fr.y + 0.18, m.position.z); g.add(lab.mesh); m.userData.lab = lab; return m; });
    const scr = panel(1.9, 1.05); scr.mesh.position.set(padC.x - Math.sin(fr.ry) * 0.9, fr.y + 2.05, padC.z - Math.cos(fr.ry) * 0.9); scr.mesh.rotation.y = this.yawTo(scr.mesh.position, standP); g.add(scr.mesh);
    let st = { v: [25, 25, 25, 25], su: 0 }, launched = 0;
    const draw = () => {
      const gg = scr.g, Wc = scr.c.width, Hc = scr.c.height; holoFrame(gg, Wc, Hc, launched ? 'CAMPAIGN LAUNCHED · LIVE' : 'CAMPAIGN FORECAST · $10,000');
      const su = launched ? st.su * Math.min(1, launched) : st.su, ok = st.su >= 1200 && st.v[2] <= 30;
      gg.fillStyle = '#A7B9C9'; gg.font = '600 26px Plus Jakarta Sans, Arial'; gg.fillText(launched ? 'Sign-ups so far' : 'Predicted student sign-ups', 36, 112);
      gg.fillStyle = launched || ok ? '#78D8B5' : '#F6F8FC'; gg.font = '800 96px Plus Jakarta Sans, Arial'; gg.fillText(Math.round(su).toLocaleString(), 36, 210);
      gg.fillStyle = '#A7B9C9'; gg.font = '600 24px Plus Jakarta Sans, Arial'; gg.fillText('target 1,200', 36, 248);
      // progress to target
      rr(gg, 36, 268, Wc * 0.42, 24, 10); gg.fillStyle = 'rgba(255,255,255,.1)'; gg.fill(); rr(gg, 36, 268, Math.max(20, Wc * 0.42 * Math.min(1, su / 1600)), 24, 10); gg.fillStyle = su >= 1200 ? '#3FB27F' : '#8D70FF'; gg.fill();
      gg.fillStyle = '#F6F8FC'; gg.fillRect(36 + Wc * 0.42 * 1200 / 1600 - 2, 260, 4, 40);
      // channel split
      const x0 = Wc * 0.52, bw = Wc * 0.42; ['#8D70FF', '#42DBFF', '#D8B98A', '#78D8B5'].forEach((c, i) => { const y = 112 + i * 52; gg.fillStyle = '#C8D3E6'; gg.font = '600 22px Plus Jakarta Sans, Arial'; gg.fillText(names[i], x0, y);
        rr(gg, x0, y + 10, bw, 18, 8); gg.fillStyle = 'rgba(255,255,255,.08)'; gg.fill(); rr(gg, x0, y + 10, Math.max(12, bw * st.v[i] / 100), 18, 8); gg.fillStyle = c; gg.fill();
        gg.fillStyle = i === 2 && st.v[2] > 30 ? '#F3A7B5' : '#F6F8FC'; gg.textAlign = 'right'; gg.fillText(st.v[i] + '%', x0 + bw, y); gg.textAlign = 'left'; });
      if (st.v[2] > 30 && !launched) { gg.fillStyle = '#F3A7B5'; gg.font = '700 22px Plus Jakarta Sans, Arial'; gg.fillText('Billboards over the 30% cap', x0, 330); }
      if (launched) { // weekly growth chart
        const cx = 36, cy = Hc - 40, cw = Wc - 72, ch = Hc - 360; gg.strokeStyle = '#42DBFF'; gg.lineWidth = 5; gg.beginPath();
        for (let k = 0; k <= 40; k++) { const u = k / 40; if (u > Math.min(1, launched)) break; const val = 1 - Math.pow(1 - u, 2); const x = cx + u * cw, y = cy - val * ch; k ? gg.lineTo(x, y) : gg.moveTo(x, y); } gg.stroke();
        gg.fillStyle = '#A7B9C9'; gg.font = '600 20px Plus Jakarta Sans, Arial'; ['Week 1', 'Week 2', 'Week 3', 'Week 4'].forEach((w, k) => gg.fillText(w, cx + (k + 0.5) * cw / 4 - 30, cy + 28));
      }
      scr.tex.needsUpdate = true;
    };
    draw();
    const tgt = V((padC.x + scr.mesh.position.x) / 2, fr.y + 1.3, (padC.z + scr.mesh.position.z) / 2);
    const cam = this.camFrom(tgt, standP, 1.7, fr.y + 2.3, 1.6);
    return {
      cam,
      tick: (dt, t) => { for (const [i, b] of bars.entries()) { const h = Math.max(0.01, st.v[i] / 100 * 1.6); b.userData.h += (h - b.userData.h) * Math.min(1, dt * 6); b.scale.y = b.userData.h; b.position.y = fr.y + 0.1 + b.userData.h / 2; b.userData.lab.mesh.position.y = fr.y + 0.22 + b.userData.h; b.userData.lab.mesh.lookAt(this.d.camera.position); b.material.opacity = 0.6 + 0.15 * Math.sin(t * 3 + i); } glow.material.color.setHex(st.v[2] > 30 ? 0xf3a7b5 : st.su >= 1200 ? 0x78d8b5 : 0x42dbff); },
      state: ({ v, su }) => { st = { v: v.slice(), su }; draw(); },
      wrong: () => { sfx('no'); if (yara && yara.c) { yara.c.expr.browsDown = 0.4; this.at(1.5, () => { yara.c.expr.browsDown = 0; }); } },
      success: () => { sfx('ok'); launched = 0.001; this.tween(3.0, u => { launched = u; draw(); }, () => sfx('ding')); if (yara && yara.c) { yara.c.expr.smile = 0.8; yara.c.lookAt(this.d.player().bones.head.getWorldPosition(V())); } this.d.ui.toast('Campaign launched: watch the sign-ups come in'); return 3600; },
      cleanup: () => { sc.remove(g); if (yara && yara.c) { yara.c.expr.smile = 0.15; yara.c.lookAt(null); } },
    };
  }

  // ================================================================ HOSPITAL: holographic anatomy figure for triage
  triage() {
    const fr = this.frameOf('hospital'), sc = this.d.scene; const grace = this.d.npc('Grace');
    const st0 = this.d.stations('hosp_triage'); const standP = V(st0.x, 0, st0.z);
    const padC = this.P(fr, -18.15, -35.7);
    this.d.placePlayer(standP.x, standP.z, this.yawTo(standP, this.P(fr, -19.2, -36.2)));
    let H = this.cache.holo;
    if (!H) {
      H = this.cache.holo = { ready: false, g: new THREE.Group(), markers: [] }; sc.add(H.g); H.g.position.copy(padC);
      const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.55, 0.06, 40), std(0x1b2333, { metalness: 0.6, roughness: 0.3 })); pad.position.y = 0.03; H.g.add(pad);
      const ring = new THREE.Mesh(new THREE.RingGeometry(0.4, 0.46, 48), new THREE.MeshBasicMaterial({ color: 0x42dbff, toneMapped: false })); ring.rotation.x = -Math.PI / 2; ring.position.y = 0.065; H.g.add(ring);
      const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.46, 1.9, 40, 1, true), new THREE.MeshBasicMaterial({ color: 0x42dbff, transparent: true, opacity: 0.06, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false })); beam.position.y = 1.0; H.g.add(beam);
      H.mat = holoMaterial(0x42dbff);
      this.d.spawnFigure().then(f => {
        H.fig = f; f.root.traverse(o => { if (o.isMesh) { if (o !== f.body) o.visible = false; else { o.material = H.mat; o.castShadow = false; o.receiveShadow = false; o.renderOrder = 4; } } });
        H.spin = new THREE.Group(); H.spin.position.y = 0.08; H.g.add(H.spin); H.spin.add(f.root); f.root.scale.setScalar(1.45 / Math.max(0.5, f.height));
        // body regions for the five patients: airway, chest, arm, ankle, (prescription) hand
        const B = f.bones, regions = [B.neck_01 || B.head, B.spine_03, B.lowerarm_l, B.foot_r, B.hand_r];
        regions.forEach((b, k) => { const s = labelSprite('', '#3E7BFA', 0.09); s.userData.bone = b; s.userData.k = k; H.markers.push(s); H.g.add(s);
          const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: 0xffffff, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false })); glow.scale.setScalar(0.22); s.userData.glow = glow; H.g.add(glow); });
        H.ready = true; if (H.pending) { H.setOrder(H.pending); }
      });
      H.setOrder = (order) => { if (!H.ready) { H.pending = order; return; } order.forEach((k, rank) => { const s = H.markers[k]; const [col] = TRIAGE[rank]; if (s.userData.rank !== rank) { s.material.map = labelSprite(String(rank + 1), col, 1).material.map; s.userData.rank = rank; s.userData.glow.material.color.set(col); } }); };
      H.idle = (dt, t) => {
        if (!H.ready) return; H.spin.rotation.y += dt * (H.focus !== undefined ? 0.15 : 0.45); H.mat.userData.u.holoT.value = t;
        H.g.updateMatrixWorld(true);
        for (const s of H.markers) { const b = s.userData.bone; if (!b) continue; b.getWorldPosition(s.position); H.g.worldToLocal(s.position); s.position.y += 0.02; s.userData.glow.position.copy(s.position);
          const pulse = H.focus === s.userData.k ? 1.6 + 0.6 * Math.sin(t * 8) : 1 + 0.15 * Math.sin(t * 3 + s.userData.k); s.userData.glow.scale.setScalar(0.18 * pulse); s.visible = s.userData.glow.visible = H.active || H.focus !== undefined; }
      };
      H.setOrder([0, 1, 2, 3, 4].sort(() => Math.random() - 0.5));
    }
    H.active = true; H.focus = undefined;
    const cam = { pos: V(padC.x + 1.5, 1.8, padC.z + 2.7), look: V(padC.x - 0.55, 1.05, padC.z - 0.1) };
    return {
      cam,
      state: ({ order }) => H.setOrder(order),
      wrong: () => { sfx('no'); if (grace && grace.c && grace.c.acts.No) grace.c.play('No', { lock: false }); H.mat.userData.u.holoCol.value.set(0xff6a6a); this.at(0.5, () => H.mat.userData.u.holoCol.value.set(0x42dbff)); },
      success: () => {
        sfx('ok'); const names = ['Airway and breathing', 'Possible heart attack', 'Controlled bleeding', 'Sprained ankle', 'Repeat prescription'];
        [0, 1, 2, 3, 4].forEach(k => this.at(0.2 + k * 0.6, () => { H.focus = k; this.d.ui.toast(`${k + 1} · ${TRIAGE[k][1]}: ${names[k]}`); }));
        this.at(3.3, () => { H.focus = undefined; this.tween(0.8, u => { H.mat.userData.u.holoFlash.value = Math.sin(u * Math.PI); }); sfx('ding'); if (grace && grace.c) { grace.c.expr.smile = 0.8; grace.c.acts.Nod && grace.c.play('Nod', { lock: false }); } });
        return 4300;
      },
      cleanup: () => { H.active = false; H.focus = undefined; H.mat && (H.mat.userData.u.holoFlash.value = 0); },
    };
  }
}
let _glow = null;
function glowTex() { if (_glow) return _glow; const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'); const r = g.createRadialGradient(32, 32, 0, 32, 32, 32); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.3, 'rgba(255,255,255,.5)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, 64, 64); _glow = new THREE.CanvasTexture(c); return _glow; }
