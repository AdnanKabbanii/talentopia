// Rigged characters (MakeHuman/MPFB, CC0) with retargeted Quaternius UAL clips (CC0) and a velocity-driven animation state machine.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone as skClone } from 'three/addons/utils/SkeletonUtils.js';

const loader = new GLTFLoader();
const cache = {};
export const MODELS = ['avatar_f1', 'avatar_m1', 'avatar_f2', 'avatar_m2', 'receptionist', 'doctor', 'visitor_m', 'visitor_f'];
export function loadModel(name) {
  return cache[name] || (cache[name] = new Promise((res, rej) => loader.load(`assets/people/${name}.glb`, g => {
    g.scene.traverse(o => { if (!(o.isMesh || o.isSkinnedMesh)) return; o.castShadow = true; o.receiveShadow = true; o.frustumCulled = false;
      for (const m of [].concat(o.material)) {
        // MPFB exports every material as BLEND; render skin/clothes opaque and use alpha-test for hair cards, brows and lashes
        const n = (m.name || '').toLowerCase(); const cards = /eyebrow|eyelash|afro|bob0|braid|long0|ponytail|short0|hair/.test(n);
        m.transparent = false; m.depthWrite = true; const eye = /high-poly|low-poly|eye/.test(n) && !/eyebrow|eyelash/.test(n) || /^eyes__/.test(o.name || ''); m.alphaTest = cards ? 0.45 : eye ? 0.35 : 0; m.side = cards ? THREE.DoubleSide : THREE.FrontSide;
        if (!cards) m.opacity = 1; if (m.map) m.map.anisotropy = 4; m.needsUpdate = true;
      } });
    res(g);
  }, undefined, rej)));
}

// ---------------------------------------------------------------- gaits
// The CC0 clips have fixed strides (walk ~1.4 m, jog ~5.4 m per cycle), so the target speeds (walk 1.8, jog 3.2, sprint 6.0 m/s)
// cannot be reached at a natural cadence by speeding them up. Derived gaits rescale each clip's limb swing (stride) and cycle time,
// then the true ground speed and foot-contact phase of every gait are measured from the character's own skeleton at load.
const LIMB = /^(thigh|calf|foot|ball|upperarm|lowerarm)_/i, TORSO = /^(pelvis|spine_0[123]|clavicle_)/i;
const qa = new THREE.Quaternion(), qb = new THREE.Quaternion(), qm = new THREE.Quaternion();
function deriveGait(src, name, k, newDur) {
  const c = src.clone(); c.name = name; const f = newDur / src.duration;
  for (const t of c.tracks) {
    t.times = t.times.map(x => x * f);
    const bone = t.name.split('.')[0];
    const kk = LIMB.test(bone) ? k : TORSO.test(bone) ? Math.sqrt(k) : 1;
    if (kk !== 1 && t.name.endsWith('.quaternion')) {
      const v = t.values, n = v.length / 4; let mx = 0, my = 0, mz = 0, mw = 0; qa.fromArray(v, 0);
      for (let i = 0; i < n; i++) { qb.fromArray(v, i * 4); if (qb.dot(qa) < 0) { qb.x = -qb.x; qb.y = -qb.y; qb.z = -qb.z; qb.w = -qb.w; } mx += qb.x; my += qb.y; mz += qb.z; mw += qb.w; }
      qm.set(mx, my, mz, mw).normalize();
      for (let i = 0; i < n; i++) { qb.fromArray(v, i * 4); if (qb.dot(qm) < 0) { qb.x = -qb.x; qb.y = -qb.y; qb.z = -qb.z; qb.w = -qb.w; } qa.copy(qm).slerp(qb, kk); qa.toArray(v, i * 4); }
    }
    if (t.name.endsWith('.position') && /^pelvis/i.test(bone)) { const v = t.values, n = v.length / 3; const m = [0, 0, 0]; for (let i = 0; i < n; i++) for (let j = 0; j < 3; j++) m[j] += v[i * 3 + j] / n; for (let i = 0; i < n; i++) for (let j = 0; j < 3; j++) v[i * 3 + j] = m[j] + (v[i * 3 + j] - m[j]) * kk; }
  }
  c.duration = newDur; return c;
}
// gait table: [name, source clip, stride scale, cycle seconds]
const GAITS = [['Stroll', 'Walk', 1.0, null], ['WalkG', 'Walk', 1.32, 1.06], ['JogG', 'Jog', 0.42, 0.76], ['RunG', 'Sprint', 0.68, 0.64]];
const v3 = new THREE.Vector3(), v4 = new THREE.Vector3();
const _v1 = new THREE.Vector3(), _v2 = new THREE.Vector3(), _v3 = new THREE.Vector3(), _v4 = new THREE.Vector3(), _v5 = new THREE.Vector3(), _v6 = new THREE.Vector3(), _up = new THREE.Vector3(0, 1, 0), _axis = new THREE.Vector3();
const _q1 = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _q3 = new THREE.Quaternion(), _q4 = new THREE.Quaternion(), _id = new THREE.Quaternion();
// apply a world-space rotation delta to a bone: local' = parentWorld^-1 * delta * parentWorld * local
function worldRotate(b, delta) {
  b.parent.getWorldQuaternion(_q3); _q4.copy(_q3).invert().multiply(delta).multiply(_q3); b.quaternion.premultiply(_q4); b.updateMatrixWorld(true);
}
// turn a bone so the direction towards its child points along dir (world), blended by w
function aim(b, child, dir, w) {
  const a = b.getWorldPosition(_v5), c = child.getWorldPosition(_v2).sub(a).normalize();
  _q1.setFromUnitVectors(c, dir); _q2.copy(_id).slerp(_q1, w); worldRotate(b, _q2);
}

export class Character {
  constructor(gltf, { role = 'npc', animations = null, model = null } = {}) {
    this.root = new THREE.Group();
    this.model = model || skClone(gltf.scene);
    this.leanG = new THREE.Group(); this.root.add(this.leanG); this.leanG.add(this.model);
    // auto-detect facing from the bind pose (toe ahead of ankle) and turn the model to face +Z
    this.model.updateMatrixWorld(true);
    const bone = n => { let b = null; this.model.traverse(o => { if (o.isBone && o.name.toLowerCase() === n) b = o; }); return b; };
    this.bones = { footL: bone('foot_l'), footR: bone('foot_r'), ballL: bone('ball_l'), ballR: bone('ball_r'), head: bone('head'), neck: bone('neck_01'), spine: bone('spine_03'),
      upR: bone('upperarm_r'), loR: bone('lowerarm_r'), handR: bone('hand_r'), upL: bone('upperarm_l'), loL: bone('lowerarm_l'), handL: bone('hand_l') };
    const foot = this.bones.footL, ball = this.bones.ballL, thigh = bone('thigh_l'), calf = bone('calf_l');
    if (foot && ball) { foot.getWorldPosition(v3); ball.getWorldPosition(v4); const yaw = Math.atan2(v4.x - v3.x, v4.z - v3.z); this.model.rotation.y = -yaw; }
    this.leg = (thigh && calf && foot) ? thigh.getWorldPosition(v3).distanceTo(calf.getWorldPosition(v4)) + calf.getWorldPosition(v3).distanceTo(foot.getWorldPosition(v4)) : 0.85;
    this.mixer = new THREE.AnimationMixer(this.model);
    this.acts = {}; const clips = {};
    for (const c of (animations || gltf.animations)) {
      const clip = c.clone(); clip.tracks = clip.tracks.filter(t => !/^Root\.position/i.test(t.name)); clips[c.name] = clip;
    }
    for (const [name, src, k, dur] of GAITS) if (clips[src]) clips[name] = deriveGait(clips[src], name, k, dur || clips[src].duration);
    for (const name in clips) { const a = this.mixer.clipAction(clips[name]); a.enabled = true; a.setEffectiveWeight(0); a.play(); this.acts[name] = a; }
    this.dur = {}; for (const k in this.acts) this.dur[k] = this.acts[k].getClip().duration;
    // measure each gait's true ground speed and contact phase on this skeleton
    this.gaits = [];
    // CAL: residual correction from the in-browser planted-foot slip test (walk 1.8, jog 3.2, sprint 6.0 m/s)
    const CAL = { Stroll: 1.0, WalkG: 1.02, JogG: 0.96, RunG: 0.966 }; // RunG re-tuned in Milestone E QA (deterministic 60 Hz slip test)
    for (const [name] of GAITS) if (this.acts[name]) { const m = this.measure(name); this.acts[name].timeScale = 0; this.gaits.push({ name, speed: m.speed * CAL[name], offset: m.offset }); }
    this.gaits.sort((a, b) => a.speed - b.speed);
    this.speeds = { Walk: this.gaitSpeed('WalkG'), Jog: this.gaitSpeed('JogG'), Sprint: this.gaitSpeed('RunG'), Stroll: this.gaitSpeed('Stroll') };
    this.w = {}; for (const k in this.acts) this.w[k] = 0;
    this.idleClip = 'Idle'; this.phase = Math.random(); this.oneShot = null; this.sit = 0; this.lean = 0;
    this.speed = 0; this.blend = 0.2;
    if (this.acts.Idle) { this.acts.Idle.time = Math.random() * this.dur.Idle; }
    this.morphMeshes = []; this.blinkT = 2 + Math.random() * 3;
    // procedural layer (applied after the clips): head look-at, wave / point gestures, expressions and visemes
    this.look = { target: null, yaw: 0, pitch: 0, w: 0 }; this.gesture = null;
    this.expr = { smile: 0, browsUp: 0, browsDown: 0 }; this.exprCur = { smile: 0, browsUp: 0, browsDown: 0 };
    this.vis = { jawOpen: 0, mouthO: 0, mouthE: 0 }; this.visCur = { jawOpen: 0, mouthO: 0, mouthE: 0 };
  }
  gaitSpeed(n) { const g = this.gaits.find(x => x.name === n); return g ? g.speed : 1; }
  // sample the clip on this skeleton: speed = backward speed of the lowest foot point while planted; offset = phase of left-foot contact
  measure(name) {
    const a = this.acts[name], d = this.dur[name], N = 64; const saved = {}; for (const k in this.acts) { saved[k] = this.acts[k].getEffectiveWeight(); this.acts[k].setEffectiveWeight(0); }
    a.setEffectiveWeight(1); const pts = [];
    const inv = new THREE.Matrix4();
    for (let i = 0; i <= N; i++) {
      a.time = (i / N) * d; a.timeScale = 0; this.mixer.update(0); this.model.updateMatrixWorld(true); inv.copy(this.leanG.matrixWorld).invert();
      const P = (b) => b.getWorldPosition(new THREE.Vector3()).applyMatrix4(inv);
      const fl = P(this.bones.footL), bl = P(this.bones.ballL), fr = P(this.bones.footR), br = P(this.bones.ballR);
      pts.push({ L: fl.y < bl.y ? fl : bl, R: fr.y < br.y ? fr : br });
    }
    let minY = Infinity; for (const p of pts) minY = Math.min(minY, p.L.y, p.R.y);
    const vs = []; let contact = 0, best = Infinity;
    for (let i = 1; i <= N; i++) for (const s of ['L', 'R']) {
      const p = pts[i][s], q = pts[i - 1][s]; if (p.y < minY + 0.03 && q.y < minY + 0.03) vs.push(-(p.z - q.z) / (d / N));
      if (s === 'L' && p.y < best) { best = p.y; contact = i / N; }
    }
    vs.sort((x, y) => x - y); const speed = vs.length ? vs[vs.length >> 1] : 1;
    a.setEffectiveWeight(0); for (const k in saved) this.acts[k].setEffectiveWeight(saved[k]);
    return { speed: Math.max(0.3, speed), offset: contact };
  }
  stride(g) { return g.speed * this.dur[g.name]; }
  play(name, { lock = true, then = null } = {}) {
    const a = this.acts[name]; if (!a) { then && then(); return 0; }
    a.reset(); a.setLoop(THREE.LoopOnce, 1); a.clampWhenFinished = true; a.timeScale = 1;
    this.oneShot = { name, t: 0, d: this.dur[name], lock, then };
    return this.dur[name];
  }
  sitDown(on) { this.sitTarget = on ? 1 : 0; }
  // speed: current ground speed (m/s). turn: angular velocity (rad/s)
  update(dt, speed, turn = 0) {
    this.speed = speed;
    const tw = {}; for (const k in this.acts) tw[k] = 0;
    const G = this.gaits; let idle = 1, gi = 0, gt = 0;
    if (speed > 0.02 && G.length) {
      const v0 = G[0].speed; idle = Math.max(0, 1 - speed / (0.5 * v0));
      if (speed >= G[G.length - 1].speed) { gi = G.length - 1; gt = 0; }
      else { for (let i = 0; i < G.length - 1; i++) if (speed < G[i + 1].speed) { gi = i; gt = speed <= G[i].speed ? 0 : (speed - G[i].speed) / (G[i + 1].speed - G[i].speed); break; } }
    }
    // stepping turn in place
    const turnStep = Math.min(1, Math.abs(turn) / 2.5) * (1 - Math.min(1, speed / 0.5));
    if (turnStep > 0.05) idle = Math.min(idle, 1 - turnStep * 0.7);
    // phase advances by distance / blended stride: feet stay planted at every speed
    const ga = G[gi], gb = G[Math.min(G.length - 1, gi + 1)];
    if (ga) {
      const stride = this.stride(ga) * (1 - gt) + this.stride(gb) * gt;
      this.phase = (this.phase + (speed * dt) / stride + turnStep * dt * 0.9) % 1;
      for (const g of G) this.acts[g.name].time = (((this.phase + g.offset - G[0].offset) % 1 + 1) % 1) * this.dur[g.name];
      const move = 1 - idle; tw[ga.name] += move * (1 - gt); tw[gb.name] += move * gt;
    }
    tw[this.idleClip] = (tw[this.idleClip] || 0) + idle;
    if (this.sitTarget !== undefined) { this.sit += (this.sitTarget - this.sit) * Math.min(1, dt / 0.35); const sc = this.acts[this.sitClip] ? this.sitClip : 'SitIdle'; if (this.sit > 0.01 && this.acts[sc]) { for (const k in tw) tw[k] *= 1 - this.sit; tw[sc] = this.sit; } }
    if (this.oneShot) {
      const o = this.oneShot; o.t += dt; const f = Math.min(1, o.t / 0.2, (o.d - o.t) / 0.25);
      for (const k in tw) tw[k] *= 1 - Math.max(0, f); tw[o.name] = Math.max(0, f);
      if (o.t >= o.d) { this.oneShot = null; o.then && o.then(); }
    }
    const k = 1 - Math.exp(-dt / (this.blend / 3));
    for (const n in this.acts) { this.w[n] += (tw[n] - this.w[n]) * k; this.acts[n].setEffectiveWeight(this.w[n]); }
    this.mixer.update(dt);
    const targetLean = this.noLean ? 0 : THREE.MathUtils.clamp(-turn * speed * 0.01, -0.14, 0.14);
    this.lean += (targetLean - this.lean) * Math.min(1, dt * 6); this.leanG.rotation.z = this.lean;
    this.procedural(dt);
    this.life(dt, speed);
    this.faceLife(dt);
  }
  // ---------------------------------------------------------------- procedural layer
  wave(d = 1.8) { this.gesture = { name: 'wave', t: 0, d }; }
  point(target, d = 2.2) { this.gesture = { name: 'point', t: 0, d, target: target.clone() }; }
  lookAt(v) { this.look.target = v ? (this.look.target || new THREE.Vector3()).copy(v) : null; }
  procedural(dt) {
    const L = this.look, G = this.gesture, B = this.bones;
    const wantW = L.target ? 1 : 0; L.w += (wantW - L.w) * Math.min(1, dt * 4);
    if (L.w < 0.01 && !G) return;
    this.root.updateMatrixWorld(true);
    if (L.w > 0.01 && B.head && B.neck) {
      if (L.target) {
        const hp = B.head.getWorldPosition(_v1); const ry = this.root.rotation.y;
        const dx = L.target.x - hp.x, dz = L.target.z - hp.z, dy = L.target.y - hp.y;
        let yaw = Math.atan2(dx, dz) - ry; yaw = Math.atan2(Math.sin(yaw), Math.cos(yaw));
        const tyaw = THREE.MathUtils.clamp(yaw, -1.1, 1.1), tp = THREE.MathUtils.clamp(Math.atan2(dy, Math.hypot(dx, dz)), -0.45, 0.35);
        L.yaw += (tyaw - L.yaw) * Math.min(1, dt * 6); L.pitch += (tp - L.pitch) * Math.min(1, dt * 6);
      }
      const ry = this.root.rotation.y; _axis.set(Math.cos(ry), 0, -Math.sin(ry));
      for (const [b, k] of [[B.neck, 0.4], [B.head, 0.6]]) {
        _q1.setFromAxisAngle(_up, L.yaw * k * L.w); _q2.setFromAxisAngle(_axis, -L.pitch * k * L.w); _q1.multiply(_q2);
        worldRotate(b, _q1);
      }
    }
    if (G) {
      G.t += dt; const env = Math.max(0, Math.min(1, G.t / 0.35, (G.d - G.t) / 0.45));
      if (G.t >= G.d) this.gesture = null;
      else if (B.upR && B.loR && B.handR && B.spine) {
        const sh = B.upR.getWorldPosition(_v1), sp = B.spine.getWorldPosition(_v2);
        const out = _v3.set(sh.x - sp.x, 0, sh.z - sp.z).normalize();
        if (G.name === 'wave') {
          const ry = this.root.rotation.y; const fwd = _v6.set(Math.sin(ry), 0, Math.cos(ry));
          const upDir = _v4.copy(out).addScaledVector(_up, 0.45).addScaledVector(fwd, 0.3).normalize();
          aim(B.upR, B.loR, upDir, env);
          const sw = Math.sin(G.t * 9) * 0.38; const fa = _v4.copy(_up).addScaledVector(out, 0.1 + sw).addScaledVector(fwd, 0.15).normalize();
          aim(B.loR, B.handR, fa, env);
        } else {
          const dir = _v4.copy(G.target).sub(sh).normalize(); dir.y = Math.min(dir.y, 0.1); dir.normalize();
          aim(B.upR, B.loR, dir, env * 0.9); aim(B.loR, B.handR, dir, env * 0.9);
        }
      }
    }
  }
  // living layer on top of the clips: breathing, a slow weight shift and tiny head movements when standing,
  // so nobody freezes like a mannequin between gestures
  life(dt, speed = 0) {
    const B = this.bones; if (!B.spine) return;
    this.lifeT = (this.lifeT || this.phase * 20) + dt; const t = this.lifeT, still = Math.max(0, 1 - speed / 0.6);
    const breath = Math.sin(t * 1.55 + this.phase * 6) ; // ~15 breaths a minute
    const ry = this.root.rotation.y; _axis.set(Math.cos(ry), 0, -Math.sin(ry));
    _q1.setFromAxisAngle(_axis, -breath * 0.012 * (0.5 + still)); worldRotate(B.spine, _q1); // chest rises and falls
    if (still > 0.05 && B.neck && !(this.look.w > 0.5)) {
      const n1 = Math.sin(t * 0.37 + this.phase * 9) * 0.6 + Math.sin(t * 0.91 + this.phase * 3) * 0.4, n2 = Math.sin(t * 0.29 + this.phase * 5);
      _q1.setFromAxisAngle(_up, n1 * 0.035 * still); _q2.setFromAxisAngle(_axis, n2 * 0.02 * still); _q1.multiply(_q2); worldRotate(B.neck, _q1);
    }
    if (still > 0.05) { // weight shift: the whole body sways a few millimetres over a few seconds
      const sw = Math.sin(t * 0.45 + this.phase * 4) * 0.012 * still; _q1.setFromAxisAngle(_v6.set(Math.sin(ry), 0, Math.cos(ry)), sw); worldRotate(B.spine, _q1);
    }
  }
  // blinking, expressions and visemes for models with facial morph targets
  faceLife(dt) {
    if (!this.morphMeshes.length) return;
    this.blinkT -= dt; let b = 0;
    if (this.blinkT < 0.16) b = Math.sin(Math.max(0, this.blinkT) / 0.16 * Math.PI);
    if (this.blinkT <= 0) this.blinkT = 2.2 + Math.random() * 3.5;
    this.setMorph('blinkL', b); this.setMorph('blinkR', b);
    const ke = Math.min(1, dt * 5), kv = Math.min(1, dt * 22);
    const rest = { smile: 0.2, browsUp: 0.06 }; // a soft, friendly resting face instead of a blank stare
    for (const k in this.expr) { this.exprCur[k] += (this.expr[k] - this.exprCur[k]) * ke; this.setMorph(k, Math.max(rest[k] || 0, this.exprCur[k])); }
    for (const k in this.vis) { this.visCur[k] += (this.vis[k] - this.visCur[k]) * kv; this.setMorph(k, this.visCur[k]); }
  }
  setMorph(name, v) { for (const m of this.morphMeshes) { const i = m.morphTargetDictionary[name]; if (i !== undefined) m.morphTargetInfluences[i] = v; } }
  get locked() { return this.oneShot && this.oneShot.lock; }
}

export async function makeCharacter(name, opts) { const g = await loadModel(name); return new Character(g, opts); }
