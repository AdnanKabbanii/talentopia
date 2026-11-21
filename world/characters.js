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
        m.transparent = false; m.depthWrite = true; m.alphaTest = cards ? 0.45 : 0; m.side = cards ? THREE.DoubleSide : THREE.FrontSide;
        if (!cards) m.opacity = 1; if (m.map) m.map.anisotropy = 4; m.needsUpdate = true;
      } });
    res(g);
  }, undefined, rej)));
}

// Clip-native speeds were measured from the planted foot in Blender (avatar_m1: walk 0.76 m/s, jog 3.76 m/s, sprint 5.2 m/s at leg 0.692 m)
// and scale with leg length, so the feet stay planted at any playback speed.
// In-engine calibration (planted-foot slip measured in the browser) refined these by x1.156 (walk) and x1.28 (jog).
const PER_LEG = { Walk: 0.76 / 0.692 * 1.156, Jog: 3.76 / 0.692 * 1.28, Sprint: 5.2 / 0.692 * 1.28 };
const v3 = new THREE.Vector3(), v4 = new THREE.Vector3();

export class Character {
  constructor(gltf, { role = 'npc' } = {}) {
    this.root = new THREE.Group();
    this.model = skClone(gltf.scene);
    this.leanG = new THREE.Group(); this.root.add(this.leanG); this.leanG.add(this.model);
    // auto-detect facing from the bind pose (toe ahead of ankle) and turn the model to face +Z
    this.model.updateMatrixWorld(true);
    const bone = n => { let b = null; this.model.traverse(o => { if (o.isBone && o.name.toLowerCase() === n) b = o; }); return b; };
    const foot = bone('foot_l'), ball = bone('ball_l'), thigh = bone('thigh_l'), calf = bone('calf_l');
    if (foot && ball) { foot.getWorldPosition(v3); ball.getWorldPosition(v4); const yaw = Math.atan2(v4.x - v3.x, v4.z - v3.z); this.model.rotation.y = -yaw; }
    this.leg = (thigh && calf && foot) ? thigh.getWorldPosition(v3).distanceTo(calf.getWorldPosition(v4)) + calf.getWorldPosition(v3).distanceTo(foot.getWorldPosition(v4)) : 0.85;
    this.speeds = { Walk: PER_LEG.Walk * this.leg, Jog: PER_LEG.Jog * this.leg, Sprint: PER_LEG.Sprint * this.leg };
    this.mixer = new THREE.AnimationMixer(this.model);
    this.acts = {};
    for (const c of gltf.animations) {
      // drop the root bone translation (in-place clips) to avoid drift
      const clip = c.clone(); clip.tracks = clip.tracks.filter(t => !/^Root\.position/i.test(t.name));
      const a = this.mixer.clipAction(clip); a.enabled = true; a.setEffectiveWeight(0); a.play(); this.acts[c.name] = a;
    }
    this.dur = {}; for (const k in this.acts) this.dur[k] = this.acts[k].getClip().duration;
    for (const k of ['Walk', 'Jog', 'Sprint']) if (this.acts[k]) this.acts[k].timeScale = 0;  // locomotion phase is driven manually
    this.w = {}; for (const k in this.acts) this.w[k] = 0;
    this.idleClip = 'Idle'; this.phase = Math.random(); this.oneShot = null; this.sit = 0; this.lean = 0;
    this.speed = 0; this.blend = 0.2; // seconds for cross-fades
    if (this.acts.Idle) { this.acts.Idle.time = Math.random() * this.dur.Idle; }
  }
  // strides (metres per full cycle) for phase-synced blending
  stride(k) { return this.speeds[k] * this.dur[k]; }
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
    const W = this.speeds.Walk, J = this.speeds.Jog;
    const walkMax = W * 1.45;
    let idle = 1, walk = 0, jog = 0;
    if (speed > 0.02) {
      const s = Math.min(1, speed / (0.45 * W)); // ease from idle into the walk
      if (speed <= walkMax) { walk = s; idle = 1 - s; }
      else { const t = Math.min(1, (speed - walkMax) / Math.max(0.5, J * 0.78 - walkMax)); walk = 1 - t; jog = t; idle = 0; }
    }
    // stepping turn in place
    const turnStep = Math.min(1, Math.abs(turn) / 2.5) * (1 - Math.min(1, speed / (0.4 * W)));
    if (turnStep > 0.05) { walk = Math.max(walk, turnStep * 0.7); idle = Math.min(idle, 1 - turnStep * 0.7); }
    // phase: advance by distance travelled / blended stride (no foot sliding)
    const tJ = jog; const stride = this.stride('Walk') * (1 - tJ) + this.stride('Jog') * tJ;
    this.phase += (speed * dt) / stride + turnStep * dt * 0.9;
    this.phase %= 1;
    for (const k of ['Walk', 'Jog']) if (this.acts[k]) this.acts[k].time = this.phase * this.dur[k];
    tw[this.idleClip] = idle; tw.Walk = walk; tw.Jog = jog;
    // sitting
    if (this.sitTarget !== undefined) { this.sit += (this.sitTarget - this.sit) * Math.min(1, dt / 0.35); if (this.sit > 0.01 && this.acts.SitIdle) { for (const k in tw) tw[k] *= 1 - this.sit; tw.SitIdle = this.sit; } }
    // one-shot (interact, pick up, nod) layered over everything
    if (this.oneShot) {
      const o = this.oneShot; o.t += dt; const f = Math.min(1, o.t / 0.2, (o.d - o.t) / 0.25);
      for (const k in tw) tw[k] *= 1 - Math.max(0, f); tw[o.name] = Math.max(0, f);
      if (o.t >= o.d) { this.oneShot = null; o.then && o.then(); }
    }
    // smooth weights (cross-fade ~0.2 s)
    const k = 1 - Math.exp(-dt / (this.blend / 3));
    for (const n in this.acts) { this.w[n] += (tw[n] - this.w[n]) * k; this.acts[n].setEffectiveWeight(this.w[n]); }
    this.mixer.update(dt);
    // gentle lean into fast turns
    const targetLean = THREE.MathUtils.clamp(-turn * speed * 0.012, -0.12, 0.12);
    this.lean += (targetLean - this.lean) * Math.min(1, dt * 6); this.leanG.rotation.z = this.lean;
  }
  get locked() { return this.oneShot && this.oneShot.lock; }
}

export async function makeCharacter(name, opts) { const g = await loadModel(name); return new Character(g, opts); }
