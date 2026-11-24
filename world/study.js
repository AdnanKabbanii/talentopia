// Talentopia Study Hub: students add their own chapters / notes (or choose general mode) and practise them inside the
// careers that use those ideas. Chapters live only on this device (IndexedDB). Questions come from:
//   - the AI question writer (api/study) when it is enabled on the server, or
//   - a built-in builder that turns sentences from the notes into fill-in-the-blank and "which term" questions (no AI).
import { openPanel, closePanel } from './panels.js';

const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const shuffle = a => { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0; [b[i], b[j]] = [b[j], b[i]]; } return b; };
const MAX_TEXT = 80000;

// ---------------------------------------------------------------- on-device library (IndexedDB)
const DB = { p: null };
function db() {
  return DB.p || (DB.p = new Promise((res, rej) => { const r = indexedDB.open('talentopia-study', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('chapters', { keyPath: 'id' }); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); }));
}
async function tx(mode, fn) { const d = await db(); return new Promise((res, rej) => { const t = d.transaction('chapters', mode); const s = t.objectStore('chapters'); const out = fn(s); t.oncomplete = () => res(out && out.result !== undefined ? out.result : out); t.onerror = () => rej(t.error); }); }
const lib = {
  all: () => tx('readonly', s => s.getAll()).then(a => (a || []).sort((x, y) => (y.added || '').localeCompare(x.added || ''))),
  put: ch => tx('readwrite', s => s.put(ch)),
  del: id => tx('readwrite', s => s.delete(id)),
};

// ---------------------------------------------------------------- text extraction (in the browser; files never leave the device)
async function extractText(file) {
  const name = file.name.toLowerCase();
  if (name.endsWith('.pdf')) {
    const pdfjs = await import('https://cdn.jsdelivr.net/npm/pdfjs-dist@4.0.379/build/pdf.min.mjs');
    pdfjs.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.0.379/build/pdf.worker.min.mjs';
    const doc = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise; let out = '';
    for (let p = 1; p <= Math.min(doc.numPages, 60) && out.length < MAX_TEXT; p++) { const c = await (await doc.getPage(p)).getTextContent(); out += c.items.map(i => i.str + (i.hasEOL ? '\n' : ' ')).join('') + '\n\n'; }
    return out;
  }
  if (name.endsWith('.docx')) {
    if (!window.mammoth) await new Promise((res, rej) => { const s = document.createElement('script'); s.src = 'https://cdn.jsdelivr.net/npm/mammoth@1.6.0/mammoth.browser.min.js'; s.onload = res; s.onerror = rej; document.head.appendChild(s); });
    return (await window.mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() })).value;
  }
  if (/\.(txt|md|markdown|text|csv)$/.test(name) || file.type.startsWith('text/')) return file.text();
  throw new Error('unsupported');
}
const tidy = t => String(t || '').replace(/\r/g, '').replace(/-\n(?=[a-z])/g, '').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim().slice(0, MAX_TEXT);

// ---------------------------------------------------------------- career matching (which workplaces use this topic)
export const TOPICS = {
  hospital: 'health medicine medical biology cell cells anatomy disease patient heart blood organ organs body tissue nurse doctor infection immune virus bacteria dna gene genetics brain nerve muscle bone drug dose hormone respiration digestion',
  bank: 'finance financial money economics economy interest loan loans investment invest accounting budget market markets price prices inflation bank banking credit debt tax profit revenue cost saving savings currency stock shares',
  agency: 'marketing media advertising advert brand branding design communication audience art visual persuasion psychology social campaign consumer story writing language colour color photography film',
  engineering: 'physics force forces structure structures energy material materials geometry building bridge load stress motion velocity acceleration mechanics electricity circuit beam architecture construction trigonometry',
  software: 'computer computing programming program code coding algorithm algorithms data database internet network software logic binary function variable loop security encryption artificial intelligence machine learning',
  kitchen: 'food nutrition cooking cook recipe hospitality hygiene diet vitamin protein carbohydrate fat taste bacteria temperature kitchen restaurant',
  store: 'business retail supply logistics sales management customer customers marketing economics product products inventory trade entrepreneurship demand',
  court: 'law legal government rights history politics justice civics society ethics constitution court crime evidence argument philosophy policy democracy',
  research: 'science scientific chemistry chemical reaction environment climate ecology ecosystem biology experiment laboratory sustainability energy atom molecule element acid base pollution species',
  terminal: 'aviation flight aircraft travel geography physics transport tourism weather navigation engine airport pilot speed distance fuel map',
};
export function matchCareers(text, n = 3) {
  const words = (String(text).toLowerCase().match(/[a-z]{3,}/g) || []); const freq = new Map(); for (const w of words) freq.set(w, (freq.get(w) || 0) + 1);
  return Object.entries(TOPICS).map(([id, kw]) => [id, kw.split(' ').reduce((a, w) => a + Math.log1p(freq.get(w) || 0), 0)]).sort((a, b) => b[1] - a[1]).filter((x, i, a) => i === 0 || x[1] >= a[0][1] * 0.35).slice(0, n).map(([id, s]) => ({ id, s }));
}

// ---------------------------------------------------------------- built-in question builder (no AI): questions made from the notes' own sentences
const STOP = new Set(('the a an and or of to in on for with is are was were be been being by as at from that this these those it its their there which who whom whose what when where why how not no nor but if then than so such into onto over under between among about after before during while also can could may might must should would will shall do does did has have had more most less least very each every any some many much few other another same own only just both all one two three first second new used use using make made called known example examples include includes including however therefore thus because since although though within without upon via per eg ie etc page figure table chapter section unit lesson they them we you your our his her she he i me my us').split(' '));
function keyTerms(text) {
  const tokens = text.match(/[A-Za-z][A-Za-z\-']{3,}/g) || []; const freq = new Map(), shown = new Map();
  for (const t of tokens) { const k = t.toLowerCase(); if (STOP.has(k)) continue; freq.set(k, (freq.get(k) || 0) + 1); if (!shown.has(k) || /^[a-z]/.test(shown.get(k))) shown.set(k, t); }
  return [...freq.entries()].filter(([, f]) => f >= 2).map(([k, f]) => ({ k, w: shown.get(k), f, s: f * Math.log(k.length) })).sort((a, b) => b.s - a.s).slice(0, 60);
}
const sentencesOf = text => text.replace(/\n+/g, ' ').split(/(?<=[.!?])\s+(?=[A-Z0-9])/).map(s => s.trim()).filter(s => s.length >= 45 && s.length <= 280 && !/https?:|www\./.test(s));
export function buildQuestions(text, count = 6) {
  const terms = keyTerms(text), sents = sentencesOf(text); const used = new Set(), out = [];
  if (terms.length < 4 || sents.length < 3) return out;
  const distract = (ans, n = 3) => shuffle(terms.filter(t => t.k !== ans.k && Math.abs(t.k.length - ans.k.length) < 6)).slice(0, n).map(t => t.w);
  // 1) definitions: "X is / are / refers to / means ..." -> which term matches the description
  for (const s of sents) {
    if (out.length >= Math.ceil(count / 2)) break;
    const m = s.match(/^((?:[A-Z][\w\-']*\s?){1,4}|(?:The |An? )?[a-z][\w\-']*(?: [a-z][\w\-']*){0,2})\s+(?:is|are|refers to|means|describes)\s+(.{25,220})[.!?]?$/);
    if (!m) continue; const term = m[1].replace(/^(The|An?)\s/i, '').trim(); const t = terms.find(x => x.k === term.toLowerCase()) || { k: term.toLowerCase(), w: term };
    if (term.split(' ').length > 4 || STOP.has(t.k) || used.has(t.k)) continue;
    const opts = distract(t); if (opts.length < 3) continue; used.add(t.k);
    const o = shuffle([t.w, ...opts]); out.push({ q: `Which term matches this description from your notes: “${m[2].replace(/[.!?]$/, '')}”?`, options: o, answer: o.indexOf(t.w), explain: s, topic: t.w, kind: 'define' });
  }
  // 2) fill in the blank: hide an important term in one of the notes' sentences
  for (const t of terms) {
    if (out.length >= count) break; if (used.has(t.k)) continue;
    const re = new RegExp(`\\b${t.k.replace(/[-']/g, m => '\\' + m)}\\b`, 'i'); const s = sents.find(x => re.test(x) && !out.some(q => q.explain === x)); if (!s) continue;
    const opts = distract(t); if (opts.length < 3) continue; used.add(t.k);
    const o = shuffle([t.w, ...opts]); out.push({ q: `Fill in the blank: “${s.replace(re, '_____')}”`, options: o, answer: o.indexOf(t.w), explain: s, topic: t.w, kind: 'cloze' });
  }
  const cap = w => w ? w[0].toUpperCase() + w.slice(1) : w;
  for (const q of out) q.options = q.options.map(cap);
  return shuffle(out).slice(0, count);
}
// general mode without AI: questions built from Talentopia's own careers data
export function careerQuestions(CAREERS, building, count = 5) {
  const C = CAREERS[building]; if (!C) return []; const out = []; const allRoles = Object.entries(CAREERS).flatMap(([b, c]) => c.roles.map(r => ({ b, name: r[0], d: r[1] })));
  for (const [name, d] of shuffle(C.roles)) {
    if (out.length >= count) break;
    if (out.length % 2 === 0) { const o = shuffle([name, ...shuffle(C.roles.filter(r => r[0] !== name)).slice(0, 3).map(r => r[0])]); out.push({ q: `Which career does this? “${d}”`, options: o, answer: o.indexOf(name), explain: `${name}: ${d}`, topic: name }); }
    else { const here = C.title.replace(/^Careers at /, ''); const others = shuffle(Object.keys(CAREERS).filter(b => b !== building)).slice(0, 3).map(b => CAREERS[b].title.replace(/^Careers at /, ''));
      const o = shuffle([here, ...others]); out.push({ q: `Where in Talentopia would you work as a ${name.toLowerCase()}?`, options: o, answer: o.indexOf(here), explain: `${name}s work at ${here}. ${d}`, topic: name }); }
  }
  return out;
}

// ---------------------------------------------------------------- Study Hub panel
export class StudyHub {
  // d: { progress, store, CAREERS, FEATURED, DISTRICTS, ACTIVITIES, play(actId, building, here), toast, onClose }
  constructor(d) { this.d = d; this.ai = null; this.view = 'home'; this.tab = 'notes';
    fetch('api/study').then(r => r.ok ? r.json() : { enabled: false }).then(j => { this.ai = !!j.enabled; }).catch(() => { this.ai = false; });
    const S = d.progress.study || (d.progress.study = { profile: { level: 'highschool' }, acts: {} });
    for (const [id, a] of Object.entries(S.acts || {})) d.ACTIVITIES[id] = { ...a, type: 'quiz', questions: [] }; // so the Passport can name past sessions
  }
  get S() { return this.d.progress.study; }
  async open(view = 'home', arg) { this.view = view; const body = openPanel('<div class="sh-load">Loading your study space…</div>', { cls: 'study', label: 'Study Hub', onClose: this.d.onClose }); this.body = body; await this.render(arg); }
  bInfo(id) { const f = this.d.FEATURED.find(x => x.id === id) || {}; const dist = this.d.DISTRICTS.find(x => x.id === f.district) || {}; return { f, dist, name: f.name || id, color: dist.color || '#C8B8F4', icon: dist.icon || '•', short: dist.short || '' }; }
  chip(id, extra = '') { const b = this.bInfo(id); return `<button class="st-car" data-go="${id}" ${extra} style="--c:${b.color}"><i>${b.icon}</i><span><b>${esc(b.name)}</b><em>${esc(b.short)}</em></span><span class="st-arrow">→</span></button>`; }
  mastery(ch) { const a = ch.attempts || []; if (!a.length) return null; const last = a.slice(-3); return Math.round(100 * last.reduce((x, y) => x + y.right, 0) / last.reduce((x, y) => x + y.total, 0)); }

  async render(arg) {
    const B = this.body; if (!B) return;
    const lvl = this.S.profile.level;
    const head = `<div class="st-hd"><div class="eyebrow">Study Hub</div><h2>Learn it. Then live it.</h2><p>Bring your own chapters and practise them inside the careers that use them, or explore careers with general questions.</p></div>
      <div class="st-seg" role="tablist"><button data-tab="notes" class="${this.tab === 'notes' ? 'on' : ''}" role="tab">My chapters</button><button data-tab="general" class="${this.tab === 'general' ? 'on' : ''}" role="tab">General questions</button></div>
      <div class="st-lvl"><span>I’m in</span><button data-lvl="highschool" class="${lvl === 'highschool' ? 'on' : ''}">High school</button><button data-lvl="university" class="${lvl === 'university' ? 'on' : ''}">University</button></div>`;
    if (this.view === 'add') return this.renderAdd();
    if (this.view === 'chapter') return this.renderChapter(arg);
    let html = head;
    if (this.tab === 'notes') {
      const chs = await lib.all().catch(() => []); this.chs = chs;
      html += `<button class="btn-primary btn-xl" data-add>＋ Add a chapter or notes</button>`;
      if (!this.ai) html += `<div class="st-lock" aria-disabled="true"><span class="st-lock-ic">✨</span><span class="st-lock-t"><b>AI question writer</b><em>Questions set in real workplace moments, from any kind of notes</em></span><span class="soon">Coming soon</span></div>`;
      html += chs.length ? `<div class="st-list">${chs.map(ch => { const m = this.mastery(ch); const top = (ch.careers || [])[0]; const b = top ? this.bInfo(top) : null;
        return `<button class="st-ch" data-ch="${ch.id}"><span class="st-ch-ic" style="--c:${b ? b.color : '#C8B8F4'}">${b ? b.icon : '📘'}</span><span class="st-ch-t"><b>${esc(ch.title)}</b><em>${esc(ch.subject || 'Notes')} · ${(ch.words || 0).toLocaleString()} words${b ? ` · fits ${esc(b.name)}` : ''}</em></span>${m === null ? '<span class="st-new">New</span>' : `<span class="st-m"><b>${m}%</b><i style="--p:${m}%"></i></span>`}</button>`; }).join('')}</div>`
        : `<div class="st-empty"><b>No chapters yet.</b> Add a PDF, a Word file, a text file, or paste your notes. Talentopia finds the careers that use what you’re learning and turns your notes into questions you answer inside those workplaces.</div>`;
    } else {
      const ids = Object.keys(this.d.CAREERS);
      html += `<div class="st-note">Pick a workplace. Its team asks you questions about what they do, the skills they use and how people get there.</div><div class="st-cars">${ids.map(id => this.chip(id, `data-gen="${id}"`)).join('')}</div>`;
    }
    html += `<p class="st-priv">${this.ai ? 'Your chapters are saved only on this device. When you practise, the text of that chapter is sent to Google Gemini to write your questions. Talentopia doesn’t store it; Google may use these requests to improve its services.' : 'Your chapters are saved only on this device and never uploaded. Questions are built from your notes’ own sentences on your device.'}</p>`;
    B.innerHTML = html; this.wire();
  }
  renderAdd() {
    this.body.innerHTML = `<button class="st-back" data-home>← Study Hub</button><div class="st-hd"><div class="eyebrow">Add a chapter</div><h2>What are you studying?</h2></div>
      <label class="st-f"><span>Chapter title</span><input id="stTitle" maxlength="80" placeholder="e.g. Chapter 4: Cells and tissues"></label>
      <label class="st-f"><span>Subject</span><input id="stSubj" maxlength="60" placeholder="e.g. Biology" list="stSubjects"><datalist id="stSubjects">${['Biology', 'Chemistry', 'Physics', 'Mathematics', 'Economics', 'Business', 'Computer science', 'History', 'Geography', 'Law', 'Psychology', 'Literature', 'Art & design', 'Nutrition'].map(s => `<option>${s}</option>`).join('')}</datalist></label>
      <div class="st-drop"><input type="file" id="stFile" accept=".pdf,.docx,.txt,.md,text/plain,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" hidden>
        <button class="btn-glass" data-file>📄 Choose a file</button><em>PDF, Word (.docx) or text · read on your device</em><div id="stFileName" class="st-fn"></div></div>
      ${`<div class="st-lock" aria-disabled="true"><span class="st-lock-ic">📷</span><span class="st-lock-t"><b>Photos & scanned pages</b><em>Snap your notebook or a printed chapter</em></span><span class="soon">Coming soon</span></div>`}
      <label class="st-f"><span>…or paste your notes</span><textarea id="stText" rows="7" placeholder="Paste a chapter, a summary or your class notes here."></textarea></label>
      <div id="stErr" class="st-err" hidden></div>
      <button class="btn-primary btn-xl" data-save>Save chapter</button>`;
    const B = this.body; let fileText = '';
    B.querySelector('[data-home]').onclick = () => { this.view = 'home'; this.render(); };
    const fi = B.querySelector('#stFile'); B.querySelector('[data-file]').onclick = () => fi.click();
    fi.onchange = async () => { const f = fi.files[0]; if (!f) return; const fn = B.querySelector('#stFileName'); fn.textContent = `Reading ${f.name}…`;
      try { fileText = tidy(await extractText(f));
        if (/\.pdf$/i.test(f.name) && fileText.split(/\s+/).length < 25) { fileText = ''; fn.textContent = ''; return this.err('This PDF looks scanned (photos of pages). Reading scanned pages is coming soon. For now, paste the text below.'); }
        fn.textContent = `✓ ${f.name} · ${fileText.split(/\s+/).length.toLocaleString()} words`; const t = B.querySelector('#stTitle'); if (!t.value) t.value = f.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').slice(0, 80); }
      catch (e) { fileText = ''; fn.textContent = ''; this.err(e.message === 'unsupported' ? 'That file type isn’t supported yet. Use a PDF, a Word .docx or a text file, or paste the text.' : 'Couldn’t read that file. Reading scanned pages and photos is coming soon. For now, paste the text below.'); } };
    B.querySelector('#stText').onkeydown = e => e.stopPropagation(); B.querySelectorAll('input').forEach(i => i.onkeydown = e => e.stopPropagation());
    B.querySelector('[data-save]').onclick = async () => {
      const text = tidy([fileText, B.querySelector('#stText').value].filter(Boolean).join('\n\n')); const words = text ? text.split(/\s+/).length : 0;
      if (words < 60) return this.err('Add a bit more: at least a few paragraphs (about 60 words) so there’s enough to ask about.');
      const title = B.querySelector('#stTitle').value.trim() || 'My notes'; const subject = B.querySelector('#stSubj').value.trim();
      const ch = { id: 'c' + Date.now().toString(36), title, subject, text, words, added: new Date().toISOString(), careers: matchCareers(subject + ' ' + subject + ' ' + title + ' ' + text).map(c => c.id), attempts: [] };
      try { await lib.put(ch); } catch (e) { return this.err('Couldn’t save on this device (storage may be full or blocked in private browsing).'); }
      this.d.toast('Chapter saved on this device'); this.view = 'chapter'; this.render(ch.id);
    };
  }
  err(msg) { const e = this.body.querySelector('#stErr'); if (e) { e.textContent = msg; e.hidden = false; } else this.d.toast(msg); }
  async renderChapter(id) {
    const chs = this.chs || await lib.all(); const ch = chs.find(c => c.id === id) || (await lib.all()).find(c => c.id === id); if (!ch) { this.view = 'home'; return this.render(); }
    this.ch = ch; const m = this.mastery(ch); const weak = this.weakTopics(ch);
    this.body.innerHTML = `<button class="st-back" data-home>← Study Hub</button>
      <div class="st-hd"><div class="eyebrow">${esc(ch.subject || 'Chapter')}</div><h2>${esc(ch.title)}</h2><p>${(ch.words || 0).toLocaleString()} words${m !== null ? ` · recent score <b>${m}%</b>` : ''} · ${(ch.attempts || []).length} practice session${(ch.attempts || []).length === 1 ? '' : 's'}</p></div>
      <div class="st-sub">Practise it where it’s used</div><div class="st-note">These workplaces use ideas from this chapter. Go there and their team will quiz you on <b>your</b> notes.</div>
      <div class="st-cars">${(ch.careers || []).map(c => this.chip(c)).join('')}</div>
      ${weak.length ? `<div class="st-sub">Review next</div><div class="sh-tags">${weak.map(w => `<span>${esc(w)}</span>`).join('')}</div>` : ''}
      <div class="sh-row"><button class="btn-glass" data-here>Quick practice here</button><button class="btn-glass" data-del>Delete chapter</button></div>`;
    const B = this.body; B.querySelector('[data-home]').onclick = () => { this.view = 'home'; this.render(); };
    B.querySelectorAll('[data-go]').forEach(b => b.onclick = () => this.start(ch, b.dataset.go, false));
    B.querySelector('[data-here]').onclick = () => this.start(ch, (ch.careers || ['research'])[0], true);
    B.querySelector('[data-del]').onclick = async () => { if (!confirm(`Delete “${ch.title}” from this device?`)) return; await lib.del(ch.id); this.chs = null; this.view = 'home'; this.render(); };
  }
  weakTopics(ch) { const miss = new Map(); for (const a of (ch.attempts || []).slice(-4)) for (const t of a.missed || []) miss.set(t, (miss.get(t) || 0) + 1); return [...miss.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(x => x[0]); }
  wire() {
    const B = this.body;
    B.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => { this.tab = b.dataset.tab; this.render(); });
    B.querySelectorAll('[data-lvl]').forEach(b => b.onclick = () => { this.S.profile.level = b.dataset.lvl; this.d.store(); this.render(); });
    const add = B.querySelector('[data-add]'); if (add) add.onclick = () => { this.view = 'add'; this.render(); };
    B.querySelectorAll('[data-ch]').forEach(b => b.onclick = () => { this.view = 'chapter'; this.render(b.dataset.ch); });
    B.querySelectorAll('[data-gen]').forEach(b => b.onclick = () => this.start(null, b.dataset.gen, false));
  }

  // build a question set, register it as a quiz activity, and hand over to the city
  async start(ch, building, here) {
    const level = this.S.profile.level === 'university' ? 'university' : 'highschool';
    const B = this.body; if (B) B.insertAdjacentHTML('afterbegin', `<div class="st-busy"><span></span>${this.ai ? 'Writing your questions…' : 'Building your questions…'}</div>`);
    let qs = [], hook = '', source = 'builder';
    if (this.ai) {
      try { const r = await fetch('api/study', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(ch
          ? { mode: 'notes', building, level, count: 6, title: ch.title, subject: ch.subject, text: this.excerpt(ch) } : { mode: 'general', building, level, count: 5 }) });
        if (r.ok) { const j = await r.json(); if (j.questions && j.questions.length) { qs = j.questions; hook = j.careerHook || ''; source = 'ai'; } } } catch (e) {}
    }
    if (!qs.length && this.ai) this.d.toast('The AI writer is busy right now, so these questions come straight from your notes.');
    if (!qs.length) qs = ch ? buildQuestions(ch.text, 6) : careerQuestions(this.d.CAREERS, building, 5);
    const busy = B && B.querySelector('.st-busy'); if (busy) busy.remove();
    if (qs.length < 2) return this.d.toast(ch ? 'Smarter questions for short and bullet-point notes are coming soon. For now, add a few full sentences to this chapter.' : 'No questions available for this workplace yet.');
    const b = this.bInfo(building); const id = `study_${ch ? ch.id : 'gen'}_${building}`;
    const meta = { building, title: ch ? `Study: ${ch.title}` : `Career quiz: ${b.name}`, badge: ch ? `${b.name} · ${ch.subject || 'Study'} practice` : `${b.name} explorer`, icon: b.icon,
      who: b.name, explain: ch ? `You practised “${ch.title}” at ${b.name}.` : `You explored what the team at ${b.name} does.` };
    this.S.acts[id] = meta; this.d.store();
    const intro = ch ? (hook ? esc(hook) + ' ' : `This team uses ideas from your ${esc(ch.subject || 'notes')} every day. `) + `Questions from <b>your</b> chapter${source === 'builder' ? ' (built from your notes’ own sentences)' : ''}.`
      : (hook ? esc(hook) : `Questions about working at ${esc(b.name)}.`);
    this.d.ACTIVITIES[id] = { ...meta, type: 'quiz', intro, questions: qs, source,
      onResult: (res) => { if (!ch) return; ch.attempts = [...(ch.attempts || []), { date: new Date().toISOString(), building, right: res.right, total: res.total, missed: res.missed }].slice(-20); lib.put(ch).catch(() => {}); } };
    closePanel(); this.d.play(id, building, here);
  }
  excerpt(ch) { // the most content-dense part of a long chapter, within the server limit
    const t = ch.text; if (t.length <= 14000) return t; const start = Math.floor(Math.random() * Math.max(1, t.length - 14000)); return t.slice(start, start + 14000);
  }
}
