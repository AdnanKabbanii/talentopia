// Talentopia automated QA (Milestone E). Run in the browser after entering the city:
//   const { runQA } = await import('/qa/qa.js'); const r = await runQA(window.__talentopia);
// Checks: locomotion speeds + planted-foot slip, staff rigs (no NaN bones, feet on the floor, seated height, skin hidden under
// clothes), every conversation, every workstation (opens, closes, returns to walking, staged scene cleans up), console errors,
// and per-preset render cost. Not shipped to Vercel (see .vercelignore).
const W = ms => new Promise(r => setTimeout(r, ms));
const median = a => { const b = a.slice().sort((x, y) => x - y); return b.length ? b[b.length >> 1] : NaN; };

export async function runQA(T, { presets = true, only = null, log = () => {} } = {}) {
  const want = k => !only || only.includes(k);
  const R = { started: new Date().toISOString(), tests: [], errors: [], perf: [] };
  const pass = (group, name, ok, detail = '') => { R.tests.push({ group, name, ok: !!ok, detail }); log(`${ok ? 'PASS' : 'FAIL'} ${group} · ${name} ${detail}`); };
  const origErr = console.error; console.error = (...a) => { const m = a.map(x => x && x.message ? x.message : String(x)).join(' '); if (!/api\/npc/.test(m)) R.errors.push(m.slice(0, 240)); origErr.apply(console, a); };
  const onErr = e => R.errors.push('uncaught: ' + (e.message || e.reason)); addEventListener('error', onErr); addEventListener('unhandledrejection', onErr);
  const V = T.camera.position.constructor;
  const voiceWas = T.speech.enabled; T.speech.setEnabled(false);
  try {
    // ------------------------------------------------------------ 1. locomotion: speed + planted-foot slip
    const P = T.P, pl = T.player, B = pl.bones;
    const lowest = side => { const f = (side === 'L' ? B.footL : B.footR).getWorldPosition(new V()), b = (side === 'L' ? B.ballL : B.ballR).getWorldPosition(new V()); return f.y < b.y ? f : b; };
    for (const [pace, keysOn, target] of [['walk', ['w', 'control'], 1.8], ['jog', ['w'], 3.2], ['sprint', ['w', 'shift'], 6.0]].filter(() => want('loco'))) {
      T.ui.closeAll(); P.route = []; P.pos.set(65, 0, pace === 'sprint' ? -120 : -58); P.pos.y = T.groundAt(65, -58, 1); P.yaw = 0; P.speed = 0; pl.root.position.copy(P.pos); T.setCam(Math.PI, 0.3, 6);
      T.keys.clear(); keysOn.forEach(k => T.keys.add(k));
      const dt = 1 / 60, speeds = [], slips = []; let prev = null, minY = Infinity; const fx = 0, fz = 1; // moving along +z
      const N = pace === 'sprint' ? 560 : 300; // sprint contacts are brief: run longer for enough planted samples
      for (let i = 0; i < N; i++) {
        T.step(dt); pl.root.updateMatrixWorld(true);
        if (i < 120) continue; // accelerate first
        speeds.push(P.speed);
        const L = lowest('L'), Rr = lowest('R'); minY = Math.min(minY, L.y, Rr.y);
        const cur = { L, R: Rr };
        // a planted foot should be still: measure its forward drift (positive = sliding forward, negative = skating back)
        if (prev && i > 140) for (const s of ['L', 'R']) if (cur[s].y < minY + 0.015 && prev[s].y < minY + 0.015) slips.push(((cur[s].x - prev[s].x) * fx + (cur[s].z - prev[s].z) * fz) / dt);
        prev = cur;
      }
      T.keys.clear();
      const sp = median(speeds), slip = median(slips) / Math.max(0.1, sp);
      pass('Locomotion', `${pace} speed`, Math.abs(sp - target) / target < 0.08, `${sp.toFixed(2)} m/s (target ${target})`);
      pass('Locomotion', `${pace} planted-foot slip`, Math.abs(slip) < 0.08, `${(slip * 100).toFixed(1)}% of body speed (${slips.length} samples)`);
      for (let i = 0; i < 40; i++) T.step(1 / 30); // stop
    }
    // ------------------------------------------------------------ 2. staff rigs
    const staff = T.PRO_CHARS.filter(n => n.c && n.c.isAvatar);
    if (want('rigs')) {
    pass('Rigs', 'named staff use the V2 avatar', staff.length === 23, `${staff.length}/23`);
    let nan = 0, feetBad = [], seatBad = [], hideBad = [];
    for (const n of staff) {
      const c = n.c; for (let k = 0; k < 90; k++) c.update(1 / 60, 0, 0); c.root.updateMatrixWorld(true); // let the pose (sitting, idle) settle
      for (const b of c.avatar.body.skeleton.bones) { const p = b.getWorldPosition(new V()); if (!isFinite(p.x + p.y + p.z)) { nan++; break; } }
      const floor = c.root.position.y, bb = c.bones;
      if (!n.sit) { const low = Math.min(bb.footL.getWorldPosition(new V()).y, bb.footR.getWorldPosition(new V()).y, bb.ballL.getWorldPosition(new V()).y, bb.ballR.getWorldPosition(new V()).y) - floor; if (low < -0.06 || low > 0.12) feetBad.push(`${n.role} ${low.toFixed(2)}`); }
      else { const pv = c.avatar.bones.pelvis.getWorldPosition(new V()).y - floor; if (pv < 0.3 || pv > 0.85) seatBad.push(`${n.role} ${pv.toFixed(2)}`); }
      const av = c.avatar, hasBits = (av.catalog.hideBits[av.cfg.outfit] ?? -1) >= 0;
      if (hasBits && av.body.geometry.index.count >= av.srcGeo.index.count) hideBad.push(n.role);
    }
    pass('Rigs', 'no NaN bones', nan === 0, `${nan} broken`);
    pass('Rigs', 'standing staff feet on the floor', !feetBad.length, feetBad.join('; ') || 'all within -6/+12 cm');
    pass('Rigs', 'seated staff at seat height', !seatBad.length, seatBad.join('; ') || `${staff.filter(n => n.sit).length} seated OK`);
    pass('Clipping', 'skin hidden under each outfit', !hideBad.length, hideBad.join('; ') || 'body triangles under clothing removed for all staff');
    }
    // ------------------------------------------------------------ 3. conversations
    let convBad = [];
    if (want('conv')) for (const n of staff) {
      P.pos.set(n.x + Math.sin(n.ry) * 1.5, P.pos.y, n.z + Math.cos(n.ry) * 1.5); P.pos.y = T.groundAt(P.pos.x, P.pos.z, P.pos.y + 1); pl.root.position.copy(P.pos);
      T.talk(n); await W(60); for (let i = 0; i < 4; i++) T.step(1 / 30);
      const A = T.conv.active; T.conv.skip(); await W(30);
      const opts = document.querySelectorAll('#talk .tk-opts button').length;
      if (!A || !A.text || T.mode !== 'talk' || opts < 4) convBad.push(`${n.role} (opts ${opts})`);
      // ask the first topic and make sure the reply arrives
      const b = document.querySelector('#talk .tk-opts button'); if (b) { b.click(); await W(30); if (!T.conv.active || !T.conv.active.text) convBad.push(n.role + ' reply'); T.conv.skip(); }
      T.conv.end(); await W(20); if (T.mode !== 'walk') convBad.push(n.role + ' did not end');
    }
    if (want('conv')) pass('Conversations', 'every staff conversation opens, answers and closes', !convBad.length, convBad.join('; ') || `${staff.length} conversations`);
    // ------------------------------------------------------------ 4. every workstation
    let stBad = [], staged = 0;
    if (want('stations')) for (const s of T.STATIONS) {
      T.ui.closeAll(); P.route = []; P.pos.set(s.x, P.pos.y, s.z); P.pos.y = T.groundAt(s.x, s.z, P.pos.y + 1); pl.root.position.copy(P.pos);
      for (let i = 0; i < 3; i++) T.step(1 / 30);
      const e0 = R.errors.length;
      try { T.runAction(s); } catch (e) { stBad.push(`${s.id}: ${e.message}`); continue; }
      for (let k = 0; k < 90 && T.mode === 'walk'; k++) { T.step(1 / 20); await W(10); } // some open after a reach animation
      const opened = T.mode !== 'walk'; const st = T.staging.cur && T.staging.cur.key; if (st) staged++;
      if (!opened) stBad.push(`${s.id} did not open`);
      // close it the way a player would (Esc)
      dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })); await W(80); for (let i = 0; i < 3; i++) T.step(1 / 30);
      if (T.mode === 'talk') T.conv.end();
      if (T.mode !== 'walk') { stBad.push(`${s.id} stuck in ${T.mode}`); T.ui.closeAll(); }
      if (T.staging.cur) stBad.push(`${s.id} staged scene not cleaned up`);
      if (R.errors.length > e0) stBad.push(`${s.id} errors: ${R.errors.slice(e0).join(' | ')}`);
    }
    if (want('stations')) pass('Workstations', 'every station opens and closes cleanly', !stBad.length, stBad.join('; ') || `${T.STATIONS.length} stations, ${staged} staged scenes`);
    // ------------------------------------------------------------ 5. presets: render cost at fixed views
    if (presets && want('presets')) {
      const was = T.settings.preset; const views = { plaza: [40, 30, 60, 0, 8, -20], hospital: null };
      const hosp = T.FEATURED.find(f => f.id === 'hospital');
      for (const p of ['high', 'balanced', 'light']) {
        T.settings.preset = p; T.applySettings();
        for (const [vname, cam] of Object.entries(views)) {
          if (vname === 'hospital') { P.pos.set(hosp.inside.x, P.pos.y, hosp.inside.z); P.pos.y = T.groundAt(P.pos.x, P.pos.z, 1); pl.root.position.copy(P.pos); T.photo([P.pos.x + 6, P.pos.y + 3, P.pos.z + 6, P.pos.x, P.pos.y + 1.2, P.pos.z - 4]); }
          else { P.pos.set(0, 0, 10); P.pos.y = T.groundAt(0, 10, 1); pl.root.position.copy(P.pos); T.photo(cam); }
          await W(2000);
          // scene cost measured directly (with post-processing on, renderer.info only sees the final screen pass)
          const info = T.renderer.info; info.autoReset = false; info.reset(); T.renderer.render(T.ctx.scene, T.camera); const calls = info.render.calls, tris = info.render.triangles; info.autoReset = true;
          let frames = 0, run = true; const f = () => { frames++; if (run) requestAnimationFrame(f); }; requestAnimationFrame(f); const t0 = performance.now(); await W(3000); run = false;
          const fps = frames * 1000 / (performance.now() - t0);
          R.perf.push({ preset: p, view: vname, calls, triangles: tris, pr: +T.Q.pr.toFixed(2), shadow: T.preset && 0 || undefined, post: !!T.composer, fps: +fps.toFixed(1), visible: !document.hidden });
        }
      }
      T.photo(null); T.settings.preset = was; T.applySettings();
      const hi = R.perf.filter(x => x.preset === 'high'), lo = R.perf.filter(x => x.preset === 'light');
      pass('Presets', 'Light is cheaper than High', lo.every((x, k) => x.calls <= hi[k].calls && x.pr <= hi[k].pr), lo.map((x, k) => `${x.view}: ${hi[k].calls}→${x.calls} calls`).join(', '));
    }
    pass('Console', 'no errors during QA', !R.errors.length, R.errors.slice(0, 5).join(' | ') || 'clean (local /api/npc 404 ignored: no serverless runtime locally)');
  } finally {
    console.error = origErr; removeEventListener('error', onErr); removeEventListener('unhandledrejection', onErr); T.keys.clear(); T.speech.setEnabled(voiceWas);
  }
  R.passed = R.tests.filter(t => t.ok).length; R.total = R.tests.length; R.finished = new Date().toISOString();
  return R;
}
