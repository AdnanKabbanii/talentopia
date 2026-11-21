// Talentopia V3 panels: one shared glass panel (bottom sheet on phones, side card on desktop) used by the Career Passport,
// NOVA the guide, Master Your Future (university learning) and Career events.
const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// ---------------------------------------------------------------- generic panel
let onCloseCb = null;
export function openPanel(html, { cls = '', onClose = null, label = 'Panel' } = {}) {
  const p = $('panel'); p.className = 'lg ' + cls; p.setAttribute('aria-label', label);
  p.innerHTML = `<div class="pn-grab"></div><button class="pn-x" aria-label="Close">✕</button><div class="pn-body">${html}</div>`;
  p.hidden = false; requestAnimationFrame(() => p.classList.add('open')); document.body.classList.add('panel-open');
  onCloseCb = onClose; p.querySelector('.pn-x').onclick = () => closePanel();
  let sy = null; p.ontouchstart = e => { if (e.target.closest('.pn-body') && p.querySelector('.pn-body').scrollTop > 0) return; sy = e.touches[0].clientY; };
  p.ontouchmove = e => { if (sy === null) return; const dy = e.touches[0].clientY - sy; if (dy > 0) p.style.transform = `translateY(${dy}px)`; };
  p.ontouchend = () => { const m = p.style.transform.match(/([\d.]+)px/); p.style.transform = ''; if (m && +m[1] > 90) closePanel(); sy = null; };
  return p.querySelector('.pn-body');
}
export function closePanel() {
  const p = $('panel'); if (p.hidden) return false; p.classList.remove('open'); document.body.classList.remove('panel-open');
  setTimeout(() => { if (!p.classList.contains('open')) p.hidden = true; }, 240); const cb = onCloseCb; onCloseCb = null; cb && cb(); return true;
}
export const panelOpen = () => !$('panel').hidden && $('panel').classList.contains('open');

// ---------------------------------------------------------------- Career Passport
export const LEVELS = [[0, 'Explorer'], [150, 'Discoverer'], [400, 'Apprentice'], [800, 'Practitioner'], [1300, 'Specialist'], [2000, 'Trailblazer']];
export function levelOf(xp) { let i = 0; while (i < LEVELS.length - 1 && xp >= LEVELS[i + 1][0]) i++; const next = LEVELS[i + 1]; return { n: i + 1, title: LEVELS[i][1], from: LEVELS[i][0], to: next ? next[0] : null }; }
// skills practised by each experience (shown as evidence: which experiences, never a score)
const SKILLS = {
  med_heart: ['Technical reasoning', 'Attention to detail'], a_triage: ['Analytical thinking', 'Ethical judgement'], a_dose: ['Numeracy', 'Attention to detail'],
  m_bank: ['Numeracy', 'Ethical judgement', 'Communication'], a_exchange: ['Numeracy'], a_portfolio: ['Analytical thinking', 'Numeracy'],
  m_agency: ['Communication', 'Creativity', 'Analytical thinking'], a_addesign: ['Creativity', 'Communication'], a_budget: ['Analytical thinking', 'Numeracy'],
  m_engineering: ['Ethical judgement', 'Technical reasoning'], a_bridge: ['Technical reasoning', 'Problem-solving'], a_zoning: ['Attention to detail', 'Numeracy'],
  m_software: ['Problem-solving', 'Technical reasoning'], a_codeorder: ['Problem-solving', 'Technical reasoning'], a_alerts: ['Analytical thinking', 'Attention to detail'],
  m_kitchen: ['Numeracy', 'Attention to detail'], a_ticket: ['Attention to detail', 'Teamwork'], a_fridge: ['Attention to detail', 'Ethical judgement'],
  m_store: ['Analytical thinking', 'Problem-solving'], a_shelf: ['Creativity', 'Analytical thinking'], a_margin: ['Numeracy'],
  m_court: ['Analytical thinking', 'Ethical judgement'], a_evidence: ['Analytical thinking', 'Attention to detail'], a_irac: ['Communication', 'Analytical thinking'],
  m_research: ['Ethical judgement', 'Problem-solving'], a_titration: ['Technical reasoning', 'Attention to detail'], a_energymix: ['Analytical thinking', 'Problem-solving'],
  m_terminal: ['Ethical judgement', 'Teamwork'], a_cargo: ['Numeracy', 'Problem-solving'], a_flightplan: ['Numeracy', 'Attention to detail'],
};
const XP = id => id === 'med_heart' || id === 'm_bank' ? 150 : id.startsWith('m_') ? 120 : 80;
export function experienceInfo(id, d) { // → { building, district, title, skills, xp }
  const act = id.startsWith('a_') ? d.ACTIVITIES[id.slice(2)] : null;
  const building = id === 'med_heart' ? 'hospital' : act ? act.building : id.slice(2);
  const f = d.FEATURED.find(x => x.id === building) || {}; const dist = d.DISTRICTS.find(x => x.id === f.district) || {};
  const title = act ? act.title : id === 'med_heart' ? 'Heart anatomy challenge' : `${f.name || 'Workplace'} mission`;
  return { building, f, dist, title, skills: SKILLS[id] || [], xp: XP(id) };
}
export function openPassport(d, tab = 'journey') {
  // d: { progress, store, ACTIVITIES, FEATURED, DISTRICTS, CAREERS, portrait, onGo(fid), onAvatar(), onLearning() }
  const P = d.progress, sh = P.shifts || {}, ids = Object.keys(sh).sort((a, b) => (sh[b].date || '').localeCompare(sh[a].date || ''));
  const xp = P.xp || 0, lv = levelOf(xp), info = Object.fromEntries(ids.map(id => [id, experienceInfo(id, d)]));
  const explored = new Set(ids.map(id => info[id].building)); const visited = P.visited || {};
  const missions = ids.filter(id => id.startsWith('m_') || id === 'med_heart').length;
  const name = P.name || 'Guest Explorer';
  const pct = lv.to ? Math.round((xp - lv.from) / (lv.to - lv.from) * 100) : 100;
  const head = `<div class="pp-head">
      <div class="pp-ava">${d.portrait ? `<img src="${d.portrait}" alt="Your avatar">` : '<span>👤</span>'}<button class="pp-edit" data-ava aria-label="Edit avatar">✎</button></div>
      <div class="pp-id"><div class="eyebrow">Career Passport</div><input class="pp-name" value="${esc(name)}" maxlength="24" aria-label="Display name"><div class="pp-lv">Level ${lv.n} · ${lv.title}</div>
        <div class="pp-bar"><span style="width:${pct}%"></span></div><div class="pp-sub">${lv.to ? `${lv.to - xp} XP to level ${lv.n + 1}` : 'Top level reached'}</div></div></div>
    <div class="pp-stats"><div><b>${xp}</b><span>XP</span></div><div><b>${explored.size}</b><span>Careers explored</span></div><div><b>${missions}</b><span>Missions</span></div><div><b>${ids.length}</b><span>Badges</span></div></div>`;
  const tabs = [['journey', 'My Journey'], ['skills', 'My Skills'], ['badges', 'Achievements'], ['careers', 'My Careers'], ['learning', 'My Learning']];
  let body = '';
  if (tab === 'journey') body = ids.length ? `<ol class="pp-tl">${ids.map(id => { const i = info[id], s = sh[id]; return `<li style="--c:${i.dist.color || '#8D70FF'}"><button class="pp-tli" data-exp="${id}"><i>${esc(s.icon || i.dist.icon || '✦')}</i><span><b>${esc(i.dist.name || 'Talentopia')} · ${esc(i.title)}</b><em>${esc(s.date || '')} · +${i.xp} XP</em></span></button>
      <div class="pp-more" hidden>${esc(s.badge)}<br>Skills practised: <b>${esc(i.skills.join(', ') || 'General')}</b>${s.max ? `<br>Result: ${s.score}/${s.max}` : ''}<br><button class="btn-glass" data-go="${i.building}">Go back to ${esc(i.f.name || 'this workplace')}</button></div></li>`; }).join('')}</ol>`
    : `<div class="pp-empty"><b>Your journey starts here.</b><span>Complete a hands-on experience in any workplace and it will appear on your timeline.</span><button class="btn-primary" data-go="hospital">Try MedCity first</button></div>`;
  if (tab === 'skills') { const m = {}; ids.forEach(id => info[id].skills.forEach(s => (m[s] = m[s] || []).push(info[id].title)));
    const all = ['Analytical thinking', 'Problem-solving', 'Communication', 'Creativity', 'Technical reasoning', 'Teamwork', 'Numeracy', 'Attention to detail', 'Ethical judgement'];
    body = `<p class="pp-note">Skills you have practised, with the experiences that showed them. No scores: just evidence of what you tried.</p><div class="pp-skills">${all.map(s => `<div class="pp-sk ${m[s] ? 'on' : ''}"><b>${s}</b><span>${m[s] ? `${m[s].length} experience${m[s].length > 1 ? 's' : ''}: ${esc(m[s].slice(0, 3).join(', '))}` : 'Not practised yet'}</span></div>`).join('')}</div>`; }
  if (tab === 'badges') body = ids.length ? `<div class="pp-badges">${ids.map(id => { const i = info[id], s = sh[id]; return `<div class="pp-bd" style="--c:${i.dist.color || '#8D70FF'}"><div class="pp-medal"><span>${esc(s.icon || '✦')}</span></div><b>${esc(s.badge)}</b><em>${esc(i.dist.name || '')} · ${esc(s.date || '')}</em><em>${esc(i.title)} · +${i.xp} XP</em></div>`; }).join('')}</div>` : `<div class="pp-empty"><b>No badges yet.</b><span>Every workplace has hands-on experiences that award a badge.</span></div>`;
  if (tab === 'careers') { const saved = P.saved || {};
    body = `<div class="pp-careers">${d.DISTRICTS.map(x => { const fs = d.FEATURED.filter(f => f.district === x.id); const done = fs.some(f => explored.has(f.id)), seen = fs.some(f => visited[f.id]);
      const st = done ? 'Explored' : seen ? 'Visited' : 'Not explored yet'; const sv = fs.filter(f => saved[f.id]);
      return `<div class="pp-cr ${done ? 'done' : seen ? 'seen' : ''}" style="--c:${x.color}"><i>${x.icon}</i><span><b>${esc(x.name)}</b><em>${esc(x.short)} · ${st}${sv.length ? ' · ♥ saved' : ''}</em></span>${fs[0] ? `<button class="btn-glass" data-go="${fs[0].id}">Go</button>` : ''}</div>`; }).join('')}</div>`; }
  if (tab === 'learning') body = learningHTML(d);
  const el = openPanel(`${head}<div class="pp-tabs" role="tablist">${tabs.map(([k, l]) => `<button role="tab" aria-selected="${k === tab}" class="${k === tab ? 'on' : ''}" data-tab="${k}">${l}</button>`).join('')}</div><div class="pp-body">${body}</div>
    <p class="pp-foot">Discovery badges from educational simulations, not qualifications. Saved on this device only.</p>`, { cls: 'pn-passport', label: 'Career Passport', onClose: d.onClose });
  el.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => openPassport(d, b.dataset.tab));
  el.querySelectorAll('[data-exp]').forEach(b => b.onclick = () => { const m = b.parentElement.querySelector('.pp-more'); m.hidden = !m.hidden; });
  el.querySelectorAll('[data-go]').forEach(b => b.onclick = () => { closePanel(); d.onGo(b.dataset.go); });
  const ed = el.querySelector('[data-ava]'); if (ed) ed.onclick = () => { closePanel(); d.onAvatar(); };
  const nm = el.querySelector('.pp-name'); nm.addEventListener('keydown', e => e.stopPropagation()); nm.onchange = () => { P.name = nm.value.trim().slice(0, 24) || 'Guest Explorer'; d.store(); };
  bindLearning(el, d);
}

// ---------------------------------------------------------------- Master Your Future (university learning)
const FIELDS = [['medicine', 'Medicine & health sciences', 'hospital'], ['business', 'Business & finance', 'bank'], ['marketing', 'Marketing & communication', 'agency'],
  ['engineering', 'Engineering & architecture', 'engineering'], ['computing', 'Computer science', 'software'], ['hospitality', 'Hospitality & culinary arts', 'kitchen'],
  ['retail', 'Business operations & retail', 'store'], ['law', 'Law', 'court'], ['science', 'Natural sciences', 'research'], ['aviation', 'Aviation', 'terminal']];
function learningHTML(d) {
  const L = d.progress.learning || {}, f = FIELDS.find(x => x[0] === L.field);
  if (!f) return `<p class="pp-note"><b>Master Your Future</b> is for university students: pick your field and practise its concepts inside real workplace simulations.</p><div class="pp-fields">${FIELDS.map(x => `<button class="btn-glass" data-field="${x[0]}">${esc(x[1])}</button>`).join('')}</div>`;
  const acts = Object.entries(d.ACTIVITIES).filter(([, a]) => a.building === f[2]); const sh = d.progress.shifts || {};
  const items = [...(f[2] === 'hospital' ? [['med_heart', 'Heart anatomy challenge']] : [['m_' + f[2], 'Workplace mission']]), ...acts.map(([k, a]) => ['a_' + k, a.title])];
  const doneN = items.filter(([id]) => sh[id]).length; const fb = d.FEATURED.find(x => x.id === f[2]) || {};
  return `<div class="pp-field"><div><div class="eyebrow">My field</div><b>${esc(f[1])}</b></div><button class="linkbtn" data-field="">Change</button></div>
    <div class="pp-bar big"><span style="width:${Math.round(doneN / items.length * 100)}%"></span></div><div class="pp-sub">${doneN} of ${items.length} practice simulations completed at ${esc(fb.name || '')}</div>
    <div class="pp-list">${items.map(([id, t]) => `<div class="pp-li ${sh[id] ? 'done' : ''}"><i>${sh[id] ? '✓' : '○'}</i><span>${esc(t)}</span></div>`).join('')}</div>
    <div class="sh-row"><button class="btn-primary" data-go="${f[2]}">Practise at ${esc(fb.name || 'the workplace')}</button></div>
    <div class="pp-up"><b>Course material</b><span>Uploading approved course notes will be available once the university backend is connected. Nothing is uploaded today.</span><button class="btn-glass" disabled>Upload material · coming soon</button></div>`;
}
function bindLearning(el, d) { el.querySelectorAll('[data-field]').forEach(b => b.onclick = () => { d.progress.learning = { ...(d.progress.learning || {}), field: b.dataset.field || null }; d.store(); openPassport(d, 'learning'); }); }

// ---------------------------------------------------------------- NOVA, the Talentopia guide (scripted)
export const CURIOUS = [['medicine', 'Medicine and health', 'med', 'hospital'], ['business', 'Business and finance', 'capital', 'bank'], ['tech', 'Technology', 'nexus', 'software'],
  ['design', 'Design and creativity', 'creative', 'agency'], ['engineering', 'Engineering', 'forge', 'engineering'], ['food', 'Food and hospitality', 'taste', 'kitchen'], ['unsure', 'I’m not sure yet', null, null]];
export const TRAIL = [{ st: 'hosp_triage', b: 'hospital', t: 'Sort patients by urgency at MedCity', ev: 'act:triage' }, { st: 'bank_fx', b: 'bank', t: 'Exchange currency at the bank', ev: 'act:exchange' }, { st: 'agency_budget', b: 'agency', t: 'Plan a campaign budget at Pulse', ev: 'act:budget' }];
export function novaHTML(msg, opts) {
  return `<div class="nova-head"><div class="nova-orb" aria-hidden="true"><i></i><i></i></div><div><b>NOVA</b><em>Your Talentopia guide</em></div></div><p class="nova-msg">${msg}</p><div class="nova-opts">${opts.map((o, i) => `<button class="${o.primary ? 'btn-primary' : 'btn-glass'}" data-o="${i}">${esc(o.label)}</button>`).join('')}</div>`;
}
export function openNova(d, view = 'home') {
  // d: { explore(curiousId), trail(), demoFirst(), onClose }
  const show = (msg, opts) => { const el = openPanel(novaHTML(msg, opts), { cls: 'pn-nova', label: 'NOVA guide', onClose: d.onClose }); el.querySelectorAll('[data-o]').forEach(b => b.onclick = () => opts[+b.dataset.o].fn()); };
  const home = () => show('Hi, I’m NOVA. I can help you find a career to try, or explain how Talentopia works. What would you like?', [
    { label: 'Help me explore', primary: true, fn: curious },
    ...(d.demoFirst ? [{ label: 'Try a career in one minute', fn: d.demoFirst }] : []),
    { label: 'How do I move around?', fn: () => show(d.touch ? 'Use the joystick at the bottom left to walk, drag anywhere to look around, and tap the purple button when something glows. You can also tap the ground to walk there.' : 'Walk with W A S D or the arrow keys, hold Shift to run, drag with the mouse to look around, and press E when something glows. You can also click the ground or a building to walk there.', [{ label: 'Got it', primary: true, fn: closePanel }, { label: 'Back', fn: home }]) },
    { label: 'What is the Career Passport?', fn: () => show('Your Career Passport records every experience you complete: the careers you tried, the skills you practised and the badges you earned. Open it any time from the bottom bar.', [{ label: 'Open my Passport', primary: true, fn: () => { closePanel(); d.passport(); } }, { label: 'Back', fn: home }]) },
    { label: 'Show me the whole city', fn: () => { closePanel(); d.world(); } }]);
  const curious = () => show('What are you curious about? Pick one and I’ll show you where it happens.', CURIOUS.map(c => ({ label: c[1], primary: false, fn: () => { closePanel(); c[0] === 'unsure' ? d.trail() : d.explore(c); } })));
  view === 'curious' ? curious() : home();
}

// ---------------------------------------------------------------- Career events (City Hall)
export function openEvents() {
  openPanel(`<div class="eyebrow">City Hall</div><h3 class="pn-h">Career events</h3><p class="pp-note">Open days, career fairs, virtual workshops and student-ambassador sessions from partner institutions will appear here, linked to the same Passport.</p>
    <div class="pp-list">${['University open days', 'Career fairs', 'Virtual workshops', 'Student ambassador sessions', 'Career consultations'].map(t => `<div class="pp-li"><i>◷</i><span>${t} · <em>none scheduled yet</em></span></div>`).join('')}</div>`, { cls: 'pn-events', label: 'Career events' });
}
