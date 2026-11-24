// HUD, dialogs, missions, Career Passport, city map + minimap, Heart Lab panel.
import { XS, ZS, X0, X1, Z0, Z1, CITY } from './city.js';
import { runActivity, ACTIVITIES } from './activities.js';
import { CAREERS } from './interiors.js';
const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export function createUI({ progress, store, onTravel }) {
  const api = { onMode: () => {} };
  const setMode = m => api.onMode(m);
  const updateXP = () => { $('xp').textContent = `✦ ${progress.xp || 0} XP`; };
  updateXP();
  const award = (id, xp, badge, icon, score, max) => {
    progress.flags = progress.flags || {}; let gained = 0;
    if (!progress.flags[id]) { progress.flags[id] = true; progress.xp = (progress.xp || 0) + xp; gained = xp; }
    progress.shifts = progress.shifts || {}; progress.shifts[id] = { badge, icon, score, max, date: new Date().toISOString().slice(0, 10) };
    store(); updateXP(); return gained;
  };
  const AVATARS = [['avatar_f1', 'Amara'], ['avatar_m1', 'Leo'], ['avatar_f2', 'Mei'], ['avatar_m2', 'Kwame']];
  api.renderAvatars = (chosen, pick) => {
    $('avatars').innerHTML = AVATARS.map(([id, nm]) => `<button data-av="${id}" class="${id === chosen ? 'on' : ''}"><img src="assets/people/${id}.jpg" alt="${nm}"><span>${nm}</span></button>`).join('');
    $('avatars').querySelectorAll('[data-av]').forEach(b => b.onclick = () => { pick(b.dataset.av); $('avatars').querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b)); });
  };
  api.setWhere = (name, color) => { $('whereTxt').textContent = name; $('where').querySelector('.dot').style.background = color; };
  let tt; api.toast = (msg) => { const t = $('toast'); t.innerHTML = msg; t.style.display = 'block'; clearTimeout(tt); tt = setTimeout(() => t.style.display = 'none', 3200); };
  let staged = null; api.setStaged = k => { staged = k; $('dialog').classList.toggle('staged', !!k); document.body.classList.toggle('staged', !!k); };
  api.stage = (key, ev, data) => (api.onStage ? api.onStage(key, ev, data) : 0) || 0;
  api.dialog = (who, html, opts = [], note = '') => {
    const d = $('dialog'); d.style.display = 'block'; document.body.classList.add('dlg'); d.classList.remove('wide'); d.classList.toggle('staged', !!staged); setMode('dialog');
    d.innerHTML = `<div class="who">${esc(who)}</div><p>${html}</p><div class="opts"></div>${note ? `<div class="note">${note}</div>` : ''}`;
    const o = d.querySelector('.opts'); opts.forEach(op => { const b = document.createElement('button'); b.innerHTML = op.label; b.onclick = () => op.fn(b); o.appendChild(b); });
    return d;
  };
  api.closeDialog = (keepStage) => { const keep = keepStage === true; $('dialog').style.display = 'none'; document.body.classList.remove('dlg'); if (staged && !keep) api.stage(staged, 'close'); setMode(keep ? 'dialog' : 'walk'); };
  api.closeAll = () => { api.closeDialog(); api.closeMap(); $('done').style.display = 'none'; };
  api.renderObjectives = (OBJ, idx) => {
    $('objList').innerHTML = OBJ.map((o, i) => `<li class="${i < idx ? 'ok' : i === idx ? 'now' : ''}"><b>${i < idx ? '✓' : i + 1}</b><span>${esc(o.t)}</span></li>`).join('');
  };
  // which challenges belong to which building (main mission + hands-on activities)
  const BUILDINGS = [['hospital', 'MedCity General Hospital', ['med_heart']], ['bank', 'Talentopia Central Bank', ['m_bank']], ['agency', 'Pulse Advertising Agency', ['m_agency']],
    ['engineering', 'Atlas Engineering & Architecture', ['m_engineering']], ['software', 'Nexus Software HQ', ['m_software']], ['kitchen', 'Atelier Restaurant & Culinary School', ['m_kitchen']],
    ['store', 'Market Hall Store', ['m_store']], ['court', 'Talentopia Courthouse', ['m_court']], ['research', 'Planet Research Institute', ['m_research']], ['terminal', 'Skyport Terminal', ['m_terminal']]];
  for (const b of BUILDINGS) for (const [k, a] of Object.entries(ACTIVITIES)) if (a.building === b[0]) b[2].push('a_' + k);
  api.buildingProgress = (id) => { const b = BUILDINGS.find(x => x[0] === id); if (!b) return [0, 0]; return [b[2].filter(k => progress.flags && progress.flags[k]).length, b[2].length]; };
  $('passBtn').onclick = () => {
    const s = progress.shifts || {};
    const rows = BUILDINGS.map(([id, name, keys]) => { const n = keys.filter(k => progress.flags && progress.flags[k]).length; const pct = Math.round(n / keys.length * 100);
      const bs = keys.filter(k => s[k]).map(k => `<span class="pb" title="${esc(s[k].badge)}">${esc(s[k].icon || '✦')} ${esc(s[k].badge)}</span>`).join('');
      return `<div class="pp"><div class="row" style="justify-content:space-between"><b>${esc(name)}</b><span>${n}/${keys.length}</span></div><div class="bar"><span style="width:${pct}%"></span></div>${bs ? `<div class="pbs">${bs}</div>` : ''}</div>`; }).join('');
    const d = api.dialog('Career Passport', `<b>${progress.xp || 0} XP</b> · ${Object.keys(s).length} badges earned across Talentopia.<div class="ppl">${rows}</div>`, [{ label: 'Close', fn: api.closeDialog }], 'Discovery badges from educational simulations, not qualifications. Saved on this device.');
    d.classList.add('wide');
  };
  api.careers = (id) => {
    const c = CAREERS[id]; if (!c) return; const [n, t] = api.buildingProgress(id);
    const d = api.dialog(c.title, `${c.roles.map(r => `<div class="role"><b>${esc(r[0])}</b><span>${esc(r[1])}</span></div>`).join('')}<div class="task" style="margin-top:10px">You’ve completed <b>${n} of ${t}</b> workstations in this building. Look for the glowing rings.</div>`, [{ label: 'Close', fn: api.closeDialog }]);
    d.classList.add('wide');
  };
  api.activity = (id, cb, hooks) => runActivity(id, { dialog: api.dialog, closeDialog: api.closeDialog, award, done, hooks: { ...hooks, stage: api.stage } }, cb);
  $('donePass').onclick = () => { $('done').style.display = 'none'; $('passBtn').onclick(); };
  $('doneNext').onclick = () => { $('done').style.display = 'none'; if ($('lab').style.display === 'flex' && lab.onClose) lab.onClose(); else setMode('walk'); };
  const done = (title, text) => { $('doneTitle').textContent = title; $('doneText').innerHTML = text; $('done').style.display = 'grid'; if ($('lab').style.display !== 'flex') setMode('dialog'); };

  // ---------------------------------------------------------------- missions
  const MC = (who, steps, badge, icon, xp = 120) => ({ who, steps, badge, icon, xp });
  const MISSIONS = {
    agency: MC('Noor · Creative Director', [
      { q: 'Client brief: <b>Talentopia</b> wants high-school students to explore careers. Who is the core audience?', a: ['Students aged 15–18 choosing majors, with parents and counsellors as influencers', 'Everyone in the country', 'Only university professors'], c: 0, e: 'A sharp audience definition (with influencers) drives every later choice.' },
      { q: 'Which campaign approach is strongest?', a: ['An immersive career challenge supported by school activations and social storytelling', 'One generic billboard and no follow-up', 'A discount code with no explanation of the product'], c: 0, e: 'Connected, experiential marketing creates more meaning than isolated exposure.' },
      { q: 'How should you measure success?', a: ['Sign-ups, challenge completions, time spent and post-campaign survey on career confidence', 'Number of colours used in the ads', 'How much the agency enjoyed the shoot'], c: 0, e: 'Tie metrics to the objective: engagement and attitude change, not vanity numbers.' }], 'Creative Quarter Campaign Strategist', '✦'),
    engineering: MC('Karim · Structural Engineer', [
      { q: 'Test rig: a 12 m pedestrian bridge must carry 40 kN with deflection under <b>25 mm</b>. Which beam passes?', a: ['Steel I-beam (18 mm predicted deflection)', 'Timber plank (61 mm predicted deflection)', 'Thin aluminium tube (44 mm predicted deflection)'], c: 0, e: 'Only the steel I-beam stays within the 25 mm serviceability limit. Stiffness depends on material and section shape.' },
      { q: 'During the physical test, the prototype bends beyond the safety threshold. What do you do?', a: ['Stop the test, review the loads and revise the design', 'Hide the reading and approve construction', 'Ignore structural performance for aesthetics'], c: 0, e: 'Engineering depends on evidence, iteration and safe design.' }], 'Forge & Form Structural Tester', '⌁'),
    software: MC('Daniel · Engineering Lead', [
      { q: 'Users report the login form sends the same request twice. Best first step?', a: ['Reproduce the bug, inspect the network requests and find the cause', 'Delete the error log', 'Assume the user is always wrong'], c: 0, e: 'Reproducing and measuring the problem comes before a reliable fix.' },
      { q: 'You find <code>submit</code> fires on both the button click and the form submit event. Which fix is cleanest?', a: ['Handle only the form submit event and disable the button while the request is in flight', 'Add a random delay', 'Send three requests so one always works'], c: 0, e: 'One event source plus an in-flight guard prevents duplicates without hacks.' }], 'Code Nexus Debugger', '⌘'),
    kitchen: MC('Rami · Head Chef', [
      { q: 'Lunch rush! The risotto recipe uses <b>300 g</b> of rice for <b>6</b> portions. You need <b>10</b>. How much rice?', input: true, c: 500, e: '300 × 10 ÷ 6 = 500 g. Kitchens scale recipes with ratios every day.' },
      { q: 'A chicken dish must reach a safe internal temperature before serving. Which is correct?', a: ['74 °C (165 °F) measured with a probe thermometer', 'Whenever it looks golden', '45 °C is enough if served quickly'], c: 0, e: 'Food safety uses measured core temperatures, not appearance.' }], 'Taste District Line Cook', '♨'),
    store: MC('Hana · Store Manager', [
      { q: 'The checkout queue is making customers leave. What do you measure first?', a: ['Wait time, staffing, transaction flow and abandonment', 'Only the wall colour', 'Only the music genre'], c: 0, e: 'Good retail decisions start with operational data and customer insight.' },
      { q: 'Data: peak wait 9 min with 2 tills open, 30% of queuers leave at 12:00–13:00. Best action?', a: ['Schedule a third till and a self-checkout helper at peak hour, then re-measure', 'Close a till to save money', 'Remove the queue barriers'], c: 0, e: 'Match staffing to demand, then check the effect with the same metrics.' }], 'Market Street Operations Analyst', '▣'),
    court: MC('Clerk of the Court', [
      { q: 'Before deciding whether a contract clause is enforceable, what should you examine?', a: ['The relevant facts, the exact wording and the applicable law', 'Only how formal the document looks', 'What a random commenter predicts'], c: 0, e: 'Professional legal reasoning starts with facts, text and law.' },
      { q: 'In most civil cases, what standard of proof applies?', a: ['The balance of probabilities (more likely than not)', 'Beyond all possible doubt', 'Whatever the judge feels like'], c: 0, e: 'Civil cases use the balance of probabilities; criminal cases use “beyond reasonable doubt”.' }], 'Civic Square Legal Reasoner', '⚖'),
    research: MC('Leila · Process Engineer', [
      { q: 'The pilot plant shows a pressure alarm above its safe limit. What is appropriate?', a: ['Apply the approved safety procedure and alert the supervisor', 'Disable the alarm', 'Increase the pressure further'], c: 0, e: 'Process engineering combines calculations with strict safety systems.' },
      { q: 'After the plant is safe, what should you record?', a: ['Time, readings, actions taken and suspected cause, for the incident review', 'Nothing, it is fixed', 'Only your lunch order'], c: 0, e: 'Good records let the team find root causes and prevent repeats.' }], 'Planet Lab Safety Engineer', '◉'),
    terminal: MC('Captain Aziz · Flight Operations', [
      { q: 'Pre-flight: the forecast crosswind is above the aircraft’s approved limit. What comes first?', a: ['Respect the procedures and limits: delay, divert or change runway', 'Ignore the conditions', 'Let passengers vote on it'], c: 0, e: 'Safety and situational awareness underpin aviation decisions.' },
      { q: 'Which team plans the safest route and fuel for a flight?', a: ['Flight dispatchers with the captain', 'The baggage team alone', 'Nobody, pilots improvise'], c: 0, e: 'Dispatchers and pilots share responsibility for flight planning.' }], 'Skyport Flight Ops Cadet', '➤'),
  };
  api.mission = (id, cb) => {
    if (id === 'bank') return bankMission(cb);
    const m = MISSIONS[id]; if (!m) return; let i = 0, score = 0, first = true; const S = (ev, d) => api.stage('m:' + id, ev, d); S('open');
    const step = (msg) => {
      const s = m.steps[i];
      if (s.input) {
        const d = api.dialog(m.who, `<b>Step ${i + 1}/${m.steps.length}.</b> ${s.q}${msg || ''}`, []);
        const o = d.querySelector('.opts'); o.innerHTML = `<div class="row"><input type="number" id="numIn" placeholder="grams"> <button class="primary" id="numGo">Check</button></div>`;
        const go = () => { const v = +$('numIn').value; if (Math.abs(v - s.c) < 0.5) { if (first) score++; S('right', { i }); next(`<div class="task ok" style="margin-top:8px">✓ ${s.e}</div>`); } else { first = false; S('wrong', { i }); step(`<div class="task no" style="margin-top:8px">Not quite. Try again: what is 300 ÷ 6 × 10?</div>`); } };
        $('numGo').onclick = go; $('numIn').onkeydown = e => { if (e.key !== 'Escape') e.stopPropagation(); if (e.key === 'Enter') go(); }; setTimeout(() => { const n = $('numIn'); if (n) n.focus(); }, 50); return;
      }
      const order = s.a.map((_, k) => k).sort(() => Math.random() - 0.5);
      api.dialog(m.who, `<b>Step ${i + 1}/${m.steps.length}.</b> ${s.q}${msg || ''}`, order.map(k => ({ label: s.a[k], fn: (b) => {
        if (k === s.c) { if (first) score++; S('right', { i }); b.classList.add('good'); setTimeout(() => next(`<div class="task ok" style="margin-top:8px">✓ ${s.e}</div>`), 450); }
        else { first = false; S('wrong', { i }); b.classList.add('bad'); }
      } })));
    };
    const next = (fb) => { i++; first = true; if (i < m.steps.length) step(fb); else finish(fb); };
    const finish = (fb) => { const g = award('m_' + id, m.xp, m.badge, m.icon, score, m.steps.length); api.closeDialog(true);
      const show = () => { done('Challenge complete', `${fb || ''}<br>You got <b>${score}/${m.steps.length}</b> right first time${g ? ` and earned <b>+${g} XP</b>` : ''}.<br>Badge: <b>${m.icon} ${m.badge}</b>`); cb && cb({ done: true, score }); };
      const w = S('success', { score }); if (w) setTimeout(show, w); else show(); };
    step();
  };
  // Capital Bay: loan affordability assessment with a live repayment calculator
  function bankMission(cb) {
    const APR = 0.07; let amount = 25000, years = 4; const S = (ev, d) => api.stage('m:bank', ev, d); S('open');
    const pay = () => { const r = APR / 12, n = years * 12; return amount * r / (1 - Math.pow(1 + r, -n)); };
    const render = (msg = '') => {
      const p = pay(), ok = p <= 500; S('state', { amount, years, p, ok });
      const d = api.dialog('Lina · Loan Advisor', `<b>Client:</b> Alex wants to borrow for a used car. After rent and bills, Alex can afford at most <b>$500 per month</b>. Interest rate: <b>7% APR</b>. Adjust the loan, then make a decision.`, []);
      const o = d.querySelector('.opts');
      o.innerHTML = `<div class="calc"><label>Loan amount <output>$${amount.toLocaleString()}</output><input type="range" id="lAmt" min="5000" max="40000" step="1000" value="${amount}"></label>
        <label>Term <output>${years} years</output><input type="range" id="lYrs" min="2" max="7" step="1" value="${years}"></label>
        <div class="big">Monthly repayment: <span style="color:${ok ? '#1f7a4d' : '#b42318'}">$${p.toFixed(0)}</span> · total interest $${(p * years * 12 - amount).toFixed(0)}</div></div>
        <div class="row"><button class="primary" id="lApprove">Approve this loan</button><button class="secondary" id="lDecline">Decline / refer back</button></div>${msg}`;
      $('lAmt').oninput = e => { amount = +e.target.value; render(); }; $('lYrs').oninput = e => { years = +e.target.value; render(); };
      $('lApprove').onclick = () => { if (ok) finish(true); else S('wrong'), render(`<div class="task no" style="margin-top:8px">$${p.toFixed(0)} per month is above Alex’s $500 limit. A responsible lender would not approve this. Try a smaller amount or a longer term.</div>`); };
      $('lDecline').onclick = () => { if (!ok) finish(false); else S('wrong'), render(`<div class="task no" style="margin-top:8px">This structure is affordable ($${p.toFixed(0)} ≤ $500). You could approve it, while noting that a longer term costs more interest.</div>`); };
    };
    const finish = (approved) => {
      const g = award('m_bank', 150, 'Capital Bay Credit Analyst', '◈', 1, 1); api.closeDialog(true);
      const w = S('success', { approved }); setTimeout(() => done('Loan assessment complete', `${approved ? `You approved <b>$${amount.toLocaleString()}</b> over <b>${years} years</b> at <b>$${pay().toFixed(0)}</b>/month, within Alex’s budget.` : 'You correctly declined an unaffordable structure.'}<br><br>Affordability is one part of real lending decisions; banks also check credit history, income stability and existing debt.${g ? `<br><b>+${g} XP</b>` : ''}<br>Badge: <b>◈ Capital Bay Credit Analyst</b>`), w);
      cb && cb({ done: true });
    };
    render();
  }

  // ---------------------------------------------------------------- map + minimap
  const W2M = (W, H, pad = 20) => { const sx = (W - pad * 2) / (CITY.maxX - CITY.minX), sz = (H - pad * 2) / (CITY.maxZ - CITY.minZ), s = Math.min(sx, sz);
    const ox = (W - (CITY.maxX - CITY.minX) * s) / 2, oz = (H - (CITY.maxZ - CITY.minZ) * s) / 2; return { s, x: x => ox + (x - CITY.minX) * s, z: z => oz + (z - CITY.minZ) * s }; };
  function drawCity(g, T, data, opts = {}) {
    const { s } = T;
    g.fillStyle = '#dfe7d6'; g.fillRect(T.x(CITY.minX - 50), T.z(CITY.minZ - 50), (CITY.maxX - CITY.minX + 100) * s, (CITY.maxZ - CITY.minZ + 100) * s);
    for (const d of data.districts) { const [x0, x1, z0, z1] = d.bounds; g.fillStyle = d.color + '55'; g.fillRect(T.x(x0), T.z(z0), (x1 - x0) * s, (z1 - z0) * s); }
    { const [x0, x1, z0, z1] = data.plaza.bounds; g.fillStyle = '#e9e4fb'; g.fillRect(T.x(x0), T.z(z0), (x1 - x0) * s, (z1 - z0) * s); }
    g.fillStyle = '#9aa3b2';
    for (const z of ZS) g.fillRect(T.x(X0 - 4.5), T.z(z - 4.5), (X1 - X0 + 9) * s, 9 * s);
    for (const x of XS) g.fillRect(T.x(x - 4.5), T.z(Z0 - 4.5), 9 * s, (Z1 - Z0 + 9) * s);
    g.fillStyle = '#7e8796'; g.fillRect(T.x(322), T.z(-195), 46 * s, 390 * s); // runway
    for (const f of data.footprints) { g.fillStyle = f.color || '#c9c4ba'; if (f.kind === 'round') { g.beginPath(); g.arc(T.x(f.x), T.z(f.z), f.w / 2 * s, 0, 7); g.fill(); } else g.fillRect(T.x(f.x - f.w / 2), T.z(f.z - f.d / 2), f.w * s, f.d * s); }
    // featured pins
    for (const f of data.featured) { const d = data.districts.find(x => x.id === f.district); const e = f.entrance; const px = T.x((f.x0 + f.x1) / 2), pz = T.z((f.z0 + f.z1) / 2);
      g.fillStyle = '#8056F6'; g.beginPath(); g.arc(px, pz, opts.pin || 9, 0, 7); g.fill(); g.strokeStyle = '#fff'; g.lineWidth = 2; g.stroke();
      g.fillStyle = '#fff'; g.font = `800 ${opts.pin ? opts.pin + 2 : 11}px Plus Jakarta Sans, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(d ? d.icon : '★', px, pz + 0.5); f._mp = [px, pz]; }
    if (opts.labels) { g.textAlign = 'center'; const big = s > 0.95; for (const d of data.districts) { const [lx, lz] = d.label; g.font = `800 ${big ? 14 : 11}px Plus Jakarta Sans, sans-serif`; g.fillStyle = '#101A32'; g.fillText(d.name, T.x(lx), T.z(lz) - (big ? 22 : 16));
        if (big) { g.font = '500 11px Plus Jakarta Sans, sans-serif'; g.fillStyle = '#5d6580'; g.fillText(d.short, T.x(lx), T.z(lz) - 8); } }
      g.font = '800 13px Plus Jakarta Sans, sans-serif'; g.fillStyle = '#6b55c9'; g.fillText('Central Plaza', T.x(0), T.z(0) + 26); }
    if (data.objective) { const o = data.objective; g.strokeStyle = '#51C9E8'; g.lineWidth = 3; g.beginPath(); g.arc(T.x(o.x), T.z(o.z), opts.pin ? 12 : 13, 0, 7); g.stroke(); }
    if (data.player) { const p = data.player; g.save(); g.translate(T.x(p.x), T.z(p.z)); g.rotate(-p.yaw + Math.PI); g.fillStyle = '#101A32'; g.strokeStyle = '#fff'; g.lineWidth = 2;
      g.beginPath(); g.moveTo(0, -10); g.lineTo(7, 8); g.lineTo(0, 4); g.lineTo(-7, 8); g.closePath(); g.fill(); g.stroke(); g.restore(); }
  }
  let mapState = null;
  api.openMap = (data) => {
    setMode('map'); $('map').style.display = 'block'; const c = $('mapC'); const r = c.getBoundingClientRect(); c.width = r.width * devicePixelRatio; c.height = r.height * devicePixelRatio;
    const g = c.getContext('2d'); g.scale(devicePixelRatio, devicePixelRatio); const T = W2M(r.width, r.height); mapState = { data, T };
    drawCity(g, T, data, { labels: true });
    $('mapList').innerHTML = `<h3>City map</h3><div class="note" style="margin-bottom:6px">Click a district or a ★ pin to travel to its featured building. You keep your avatar and progress.</div>` +
      data.districts.map(d => { const f = data.featured.find(x => x.district === d.id); return `<button class="d" data-f="${f ? f.id : ''}"><i style="background:${d.color}">${d.icon}</i><span>${esc(d.name)}<small>${f ? esc(f.name) : esc(d.short)}${progress.flags && progress.flags['m_' + (f ? f.id : '')] ? ' · ✓ done' : ''}</small></span></button>`; }).join('') +
      `<button class="secondary" id="mapClose" style="margin-top:8px">Close map (M)</button>`;
    $('mapList').querySelectorAll('[data-f]').forEach(b => b.onclick = () => { const f = data.featured.find(x => x.id === b.dataset.f); if (f) onTravel(f); });
    $('mapClose').onclick = api.closeMap;
    c.onclick = e => { const rr = c.getBoundingClientRect(); const mx = e.clientX - rr.left, mz = e.clientY - rr.top; let best = null, bd = 22;
      for (const f of data.featured) { if (!f._mp) continue; const d = Math.hypot(f._mp[0] - mx, f._mp[1] - mz); if (d < bd) { bd = d; best = f; } }
      if (!best) { const wx = CITY.minX + (mx - T.x(CITY.minX)) / T.s, wz = CITY.minZ + (mz - T.z(CITY.minZ)) / T.s; const d = data.districts.find(dd => wx > dd.bounds[0] && wx < dd.bounds[1] && wz > dd.bounds[2] && wz < dd.bounds[3]); if (d) best = data.featured.find(x => x.district === d.id); }
      if (best) onTravel(best); };
  };
  api.closeMap = () => { if ($('map').style.display === 'block') { $('map').style.display = 'none'; setMode('walk'); } };
  const mini = $('miniC').getContext('2d');
  api.drawMini = (data) => {
    const W = 400, S = 1.7, p = data.player; if (!p) return; mini.setTransform(1, 0, 0, 1, 0, 0); mini.clearRect(0, 0, W, W);
    const T = { s: S, x: x => W / 2 + (x - p.x) * S, z: z => W / 2 + (z - p.z) * S };
    drawCity(mini, T, data, { pin: 10 });
  };

  // ---------------------------------------------------------------- Heart Lab panel (ported from the MedCity slice)
  const HEART_INFO = [
    ['cavity of left ventricle', 'Left ventricle', 'The heart’s strongest chamber. Its thick muscular wall pumps oxygen-rich blood through the aortic valve into the aorta and out to the whole body.'],
    ['cavity of right ventricle', 'Right ventricle', 'Pumps oxygen-poor blood through the pulmonary valve into the pulmonary trunk, toward the lungs.'],
    ['cavity of left atrium', 'Left atrium', 'Receives oxygen-rich blood returning from the lungs through the pulmonary veins and passes it through the mitral valve to the left ventricle.'],
    ['cavity of right atrium', 'Right atrium', 'Receives oxygen-poor blood from the body through the superior and inferior venae cavae and passes it through the tricuspid valve to the right ventricle.'],
    ['wall of left atrium', 'Wall of the left atrium', 'The thin muscular wall of the left atrium. Atria need less muscle than ventricles because they only push blood into the chamber just below them.'],
    ['wall of right atrium', 'Wall of the right atrium', 'The thin muscular wall of the right atrium. The heart’s natural pacemaker (the sinoatrial node) sits in this wall.'],
    ['tricuspid', 'Tricuspid valve', 'Three leaflets between the right atrium and right ventricle. They close when the ventricle contracts so blood can’t flow back into the atrium.'],
    ['mitral', 'Mitral valve', 'Two leaflets between the left atrium and left ventricle. It stops backflow into the left atrium when the left ventricle contracts.'],
    ['aortic valve', 'Aortic valve', 'Three cusps at the exit of the left ventricle. It opens to let blood into the aorta and closes to stop it flowing back.'],
    ['pulmonary valve', 'Pulmonary valve', 'Three cusps at the exit of the right ventricle into the pulmonary trunk.'],
    ['papillary', 'Papillary muscle', 'Small muscles inside the ventricles. Through thin cords (chordae tendineae) they hold the valve leaflets so they don’t flip backward.'],
    ['ascending aorta', 'Ascending aorta', 'The first part of the aorta, the body’s largest artery. It carries oxygen-rich blood upward from the left ventricle.'],
    ['arch of aorta', 'Arch of the aorta', 'The aorta curves over the heart here and gives off the arteries that supply the head, neck and arms.'],
    ['pulmonary trunk', 'Pulmonary trunk', 'Carries oxygen-poor blood from the right ventricle toward the lungs. It is an artery even though its blood is low in oxygen, because it carries blood away from the heart.'],
    ['superior vena cava', 'Superior vena cava', 'A large vein returning oxygen-poor blood from the head, neck and arms to the right atrium.'],
    ['inferior vena cava', 'Inferior vena cava', 'The largest vein, returning oxygen-poor blood from the lower body to the right atrium.'],
    ['coronary', 'Coronary artery', 'Supplies the heart muscle itself with oxygen-rich blood. A blockage here can cause a heart attack.'],
  ];
  const GROUPS = [['walls', 'Atrial walls', n => n.includes('wall of')], ['chambers', 'Chambers', n => n.includes('cavity of')], ['valves', 'Valves', n => /valve|leaflet|cusp/.test(n)],
    ['muscles', 'Papillary muscles', n => n.includes('papillary')], ['vessels', 'Great vessels', n => /aorta|vena cava|pulmonary trunk/.test(n)], ['coronary', 'Coronary arteries', n => n.includes('coronary')]];
  const partName = m => (m.name.split('|')[1] || m.name).replace(/_/g, ' ').toLowerCase();
  const infoFor = n => HEART_INFO.find(h => n.includes(h[0]));
  const CHALLENGE = [
    ['cavity of left ventricle', 'Find the chamber that pumps <b>oxygen-rich blood to the whole body</b>.', 'walls'],
    ['pulmonary trunk', 'Find the vessel that carries blood from the <b>right ventricle to the lungs</b>.', null],
    ['tricuspid', 'Find a leaflet of the valve between the <b>right atrium and right ventricle</b>.', 'walls'],
    ['superior vena cava', 'Find the large vein that returns blood from the <b>head and arms</b>.', null],
    ['coronary', 'Find an artery that supplies <b>the heart muscle itself</b>.', null]];
  const groupOn = { walls: true, chambers: true, valves: true, muscles: true, vessels: true, coronary: true };
  const lab = { seen: new Set(), phase: 'explore', q: 0, first: true, score: 0, sel: null, parts: [], paint: () => {}, onClose: null, onDone: null };
  const applyGroups = () => lab.parts.forEach(m => { const n = partName(m); const g = GROUPS.find(G => G[2](n)); m.visible = g ? groupOn[g[0]] : true; });
  const infoHTML = m => { const n = partName(m), i = infoFor(n); return i ? `<b>${i[1]}</b><span style="font-size:11px;color:#6b7290">${esc(n)}</span><br>${i[2]}` : `<b>${esc(n)}</b>`; };
  const taskHTML = msg => {
    if (lab.phase === 'explore') { const n = Math.min(lab.seen.size, 5); return `<b>Step 1 · Explore.</b> Tap <b>5 different structures</b> to learn what they do.${msg ? '<br>' + msg : ''}<div class="bar"><span style="width:${n * 20}%"></span></div>`; }
    if (lab.phase === 'quiz') return `<b>Step 2 · Challenge ${lab.q + 1}/5.</b> ${CHALLENGE[lab.q][1]}${msg ? '<br>' + msg : ''}<div class="bar"><span style="width:${lab.q * 20}%"></span></div>`;
    return `<b>✓ Heart challenge complete.</b> ${msg || ''}<div class="bar"><span style="width:100%"></span></div><button class="primary" id="replay" style="margin-top:10px;width:100%">Replay the challenge</button>`;
  };
  const renderLab = (msg, cls) => {
    const L = $('lab');
    L.innerHTML = `<div class="k">MedCity General Hospital · Anatomy Lab</div><h3>The human heart</h3>
      <div class="layerbar">${GROUPS.map(([k, l]) => `<button data-g="${k}" class="${groupOn[k] ? 'on' : ''}">${l}</button>`).join('')}</div>
      <div class="info">${lab.sel ? infoHTML(lab.sel) : '<b>Tap any structure</b>Drag to rotate, scroll or pinch to zoom. Switch off “Atrial walls” to see the chambers inside.'}</div>
      <div class="task ${cls || ''}">${taskHTML(msg)}</div>
      <div class="note">Educational 3D model built from BodyParts3D scan data (© DBCLS, CC BY-SA 2.1 JP). Colours are for teaching: red = oxygen-rich side, blue = oxygen-poor side. Not medical advice.</div>
      <button class="secondary" id="labBack">← Back to walking (Esc)</button>`;
    L.querySelectorAll('[data-g]').forEach(b => b.onclick = () => { groupOn[b.dataset.g] = !groupOn[b.dataset.g]; applyGroups(); renderLab(msg, cls); });
    $('labBack').onclick = () => lab.onClose && lab.onClose(); applyGroups();
    const r = $('replay'); if (r) r.onclick = () => { lab.phase = 'quiz'; lab.q = 0; lab.score = 0; lab.first = true; renderLab(); };
  };
  api.heart = {
    bind: ({ parts, paint }) => { lab.parts = parts; lab.paint = paint; },
    open: (onClose, onDone) => { lab.onClose = onClose; lab.onDone = onDone; $('lab').style.display = 'flex'; $('obj').style.display = 'none'; $('mini').style.display = 'none'; $('prompt').style.display = 'none'; renderLab(); },
    close: () => { $('lab').style.display = 'none'; $('obj').style.display = ''; $('mini').style.display = ''; lab.sel = null; },
    selected: () => lab.sel,
    select: (m) => {
      lab.sel = m; const n = partName(m);
      if (lab.phase === 'explore') { const i = infoFor(n); lab.seen.add(i ? i[1] : n); if (lab.seen.size >= 5) { lab.phase = 'quiz'; lab.q = 0; renderLab('Great exploring! Now the challenge.', 'ok'); } else renderLab(); }
      else if (lab.phase === 'quiz') {
        if (n.includes(CHALLENGE[lab.q][0])) { if (lab.first) lab.score++; lab.q++; lab.first = true;
          if (lab.q >= CHALLENGE.length) { lab.phase = 'done'; const g = award('med_heart', 150, 'MedCity Heart Anatomy Explorer', '♥', lab.score, CHALLENGE.length); renderLab(g ? `+${g} XP earned.` : 'Challenge replayed.', 'ok');
            done('Heart challenge complete', `You answered <b>${lab.score} of ${CHALLENGE.length}</b> right first time${g ? ` and earned <b>+${g} XP</b>` : ''}.<br>Skills practised: heart chambers, valves, great vessels and coronary circulation.<br>Next: walk out of the hospital and follow Talent Avenue east to Capital Bay.`);
            lab.onDone && lab.onDone(lab.score, CHALLENGE.length); }
          else { const hide = CHALLENGE[lab.q][2]; if (hide) groupOn[hide] = false; renderLab('✓ Correct!', 'ok'); } }
        else { lab.first = false; const i = infoFor(n); renderLab(`That’s the <b>${i ? i[1] : esc(n)}</b>. Try again.`, 'no'); }
      } else renderLab();
    },
  };
  return api;
}
