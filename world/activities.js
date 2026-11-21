// Hands-on workstation activities. Five reusable engines (rank, allocate, classify, calc, design) and 20 activities across
// the ten featured buildings. Educational simulations, simplified on purpose; not professional advice.
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const shuffle = a => { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0; [b[i], b[j]] = [b[j], b[i]]; } return b; };

export const ACTIVITIES = {
  // ---------------------------------------------------------------- MedCity General Hospital
  triage: { building: 'hospital', who: 'Grace · Triage Nurse', title: 'Emergency triage', badge: 'MedCity Triage Assistant', icon: '✚', type: 'rank',
    intro: 'Five patients just arrived. Put them in the order they should be seen, <b>most urgent first</b>.',
    items: ['Not breathing normally, lips turning blue', 'Crushing chest pain and sweating', 'Deep cut on the arm, bleeding now controlled', 'Twisted ankle, can walk with a limp', 'Needs a repeat prescription'],
    explain: 'Triage treats immediate threats to life first: airway and breathing, then circulation (possible heart attack), then injuries that can wait safely, then non-urgent needs. Simplified for learning; not medical guidance.' },
  dose: { building: 'hospital', who: 'MedCity Pharmacy', title: 'Weight-based dose', badge: 'MedCity Dose Checker', icon: '✚', type: 'calc',
    steps: [
      { q: 'A child weighs <b>20 kg</b>. The prescribed medicine is <b>15 mg per kg</b>. What dose in <b>mg</b>?', answer: 300, unit: 'mg', hint: 'Dose = weight × mg per kg = 20 × 15.' },
      { q: 'The syrup contains <b>120 mg in every 5 mL</b>. How many <b>mL</b> give 300 mg?', answer: 12.5, tol: 0.05, unit: 'mL', hint: 'Volume = 300 ÷ 120 × 5.' }],
    explain: 'Pharmacists and nurses double-check every calculation like this. Practice numbers only; not medical guidance.' },
  // ---------------------------------------------------------------- Capital Bay
  exchange: { building: 'bank', who: 'Sara · Teller', title: 'Currency exchange', badge: 'Capital Bay Teller', icon: '◈', type: 'calc',
    steps: [
      { q: 'A customer exchanges <b>$500</b> into euros. Today’s rate is <b>1 USD = 0.92 EUR</b>. How many euros before fees?', answer: 460, unit: 'EUR', hint: '500 × 0.92.' },
      { q: 'The bank charges a <b>1% fee</b> on the euro amount. How many euros does the customer receive?', answer: 455.4, tol: 0.05, unit: 'EUR', hint: '460 − 1% of 460.' }],
    explain: 'Banks earn from the exchange spread and fees. Always compare the total you receive, not just the headline rate.' },
  portfolio: { building: 'bank', who: 'Karim · Financial Advisor', title: 'Build a client portfolio', badge: 'Capital Bay Portfolio Builder', icon: '◈', type: 'allocate',
    intro: 'Client: 30 years old, saving for 25 years, comfortable with <b>moderate risk</b>. Target: expected return of <b>at least 5% a year</b> with risk (volatility) <b>no higher than 12%</b>.',
    parts: [['Savings account', 2, 0], ['Government bonds', 4, 5], ['Global shares', 8, 18], ['Property fund', 6, 12]], start: [60, 20, 10, 10],
    metric: (v, p) => { const r = v.reduce((a, x, i) => a + x / 100 * p[i][1], 0), k = v.reduce((a, x, i) => a + x / 100 * p[i][2], 0); return { r, k, ok: r >= 5 && k <= 12, html: `Expected return <b>${r.toFixed(1)}%</b> / year · Risk <b>${k.toFixed(1)}%</b>` }; },
    hint: m => m.r < 5 ? 'Return is too low. Add more shares or property.' : 'Too risky. Move some shares into bonds.',
    explain: 'Diversifying across assets balances growth and risk. (Simplified: real risk also depends on how assets move together.)' },
  // ---------------------------------------------------------------- Creative Quarter
  addesign: { building: 'agency', who: 'Noor · Creative Director', title: 'Design the campaign ad', badge: 'Creative Quarter Art Director', icon: '✦', type: 'design', hook: 'ad',
    intro: 'Audience: <b>high-school students choosing a career</b>. Build an ad that grabs attention and makes them act. Your design appears live on the studio screen.',
    groups: [
      { key: 'headline', label: 'Headline', opts: [['Talentopia: a platform', 8], ['Try 10 careers in 10 minutes', 30], ['Careers are important', 5]] },
      { key: 'visual', label: 'Visual', opts: [['Company logo only', 6], ['Stock photo of an office', 12], ['Students exploring the 3D city', 30]] },
      { key: 'cta', label: 'Call to action', opts: [['Learn more someday', 5], ['Scan the QR · start now', 25], ['No call to action', 0]] },
      { key: 'palette', label: 'Colours', opts: [['Violet + cyan (brand)', 15], ['Grey on grey', 3], ['Ten bright colours', 7]] }],
    score: s => s.reduce((a, x) => a + x, 0), pass: 85,
    explain: 'Strong ads speak to one audience with a clear benefit, a relevant visual, a single call to action and consistent brand colours.' },
  budget: { building: 'agency', who: 'Yara · Media Planner', title: 'Split a $10,000 budget', badge: 'Creative Quarter Media Planner', icon: '✦', type: 'allocate',
    intro: 'Goal: reach students and get <b>at least 1,200 sign-ups</b>, with <b>no more than 30%</b> spent on billboards.',
    parts: [['Short-video social ads', 0.16], ['Student creators', 0.14], ['City billboards', 0.04], ['School events', 0.12]], start: [25, 25, 25, 25],
    metric: (v, p) => { const su = v.reduce((a, x, i) => a + 10000 * x / 100 * p[i][1] * (1 - x / 400), 0); return { su, ok: su >= 1200 && v[2] <= 30, html: `Predicted sign-ups <b>${Math.round(su)}</b> · Billboards <b>${v[2]}%</b>` }; },
    hint: m => m.su < 1200 ? 'Not enough sign-ups. Shift money to channels students actually use.' : 'Billboards are over the 30% cap.',
    explain: 'Media planning balances reach and cost per result. Each channel also has diminishing returns, so mixing channels beats putting everything in one.' },
  // ---------------------------------------------------------------- Forge & Form
  bridge: { building: 'engineering', who: 'Karim · Structural Engineer', title: 'Design and load-test a beam', badge: 'Forge & Form Beam Designer', icon: '⌁', type: 'design', hook: 'bridge',
    intro: 'A 12 m footbridge beam must carry the test load with deflection <b>≤ 25 mm</b> and cost <b>≤ $9,000</b>. Pick a material and a section depth, then watch the beam on the rig.',
    groups: [
      { key: 'mat', label: 'Material', opts: [['Steel', 200], ['Timber (glulam)', 12], ['Aluminium', 70]] },
      { key: 'depth', label: 'Beam depth', opts: [['300 mm', 0.3], ['450 mm', 0.45], ['600 mm', 0.6]] }],
    evaluate: (s) => { const E = s[0], d = s[1]; const I = 7.4e-3 * d ** 3 * (E === 200 ? 1 : E === 70 ? 1.6 : 5.2); // second moment of area; timber/aluminium use wider sections
      const delta = 5 * 9e3 * 12 ** 4 / (384 * E * 1e9 * I) * 1000; const cost = (E === 200 ? 8200 : E === 70 ? 11000 : 4200) * (d / 0.45) ** 1.1;
      return { delta, cost, ok: delta <= 25 && cost <= 9000, html: `Deflection <b>${delta.toFixed(0)} mm</b> (limit 25) · Cost <b>$${Math.round(cost).toLocaleString()}</b> (budget $9,000)` }; },
    explain: 'Deflection falls sharply with depth (stiffness grows with depth³) and with a stiffer material. Engineers balance stiffness, cost and weight.' },
  zoning: { building: 'engineering', who: 'Omar · Architect', title: 'Planning-rules check', badge: 'Forge & Form Planner', icon: '⌁', type: 'calc',
    steps: [
      { q: 'The plot is <b>1,200 m²</b> and the floor-area ratio limit is <b>3.0</b>. What is the maximum total floor area (m²)?', answer: 3600, unit: 'm²', hint: 'Plot area × ratio.' },
      { q: 'The height limit is <b>30 m</b> and each floor is <b>3.5 m</b>. How many full floors fit?', answer: 8, unit: 'floors', hint: '30 ÷ 3.5, rounded down.' },
      { q: 'With 8 equal floors using all 3,600 m², what is each floor plate (m²)?', answer: 450, unit: 'm²', hint: '3,600 ÷ 8.' }],
    explain: 'Architects design within zoning rules like floor-area ratio and height limits before the creative work begins.' },
  // ---------------------------------------------------------------- Code Nexus
  codeorder: { building: 'software', who: 'Lea · Software Engineer', title: 'Fix the login handler', badge: 'Code Nexus Developer', icon: '⌘', type: 'rank', mono: true,
    intro: 'The login form sends duplicate requests. Put these lines in the right order so it can never submit twice.',
    items: ['async function onSubmit(e) {', '  e.preventDefault();', '  if (busy) return;', '  busy = true;', '  await sendLogin(form);', '  busy = false;', '}'],
    explain: 'Stop the default form submit, exit early if a request is in flight, set the flag, await the request, then release the flag.' },
  alerts: { building: 'software', who: 'Tom · Security Analyst', title: 'Triage live alerts', badge: 'Code Nexus On-Call', icon: '⌘', type: 'classify',
    intro: 'Sort each alert so the on-call team knows what to fix first.', buckets: ['Critical', 'Warning', 'Info'],
    items: [['Database down: no one can log in', 0], ['Thousands of login attempts from many countries', 0], ['Disk 85% full on a server', 1], ['API responses 15% slower than usual', 1], ['Nightly backup completed', 2], ['New version deployed successfully', 2]],
    explain: 'Critical: users affected or security at risk now. Warning: will become a problem soon. Info: good to know, no action.' },
  // ---------------------------------------------------------------- Taste District
  ticket: { building: 'kitchen', who: 'Rami · Head Chef', title: 'Cook the order', badge: 'Taste District Commis Chef', icon: '♨', type: 'rank',
    intro: 'Ticket: grilled chicken with vegetables. Put the steps in a safe, professional order.',
    items: ['Wash hands and put on an apron', 'Set out ingredients (mise en place)', 'Cook chicken to 74 °C core temperature', 'Rest the chicken for 3 minutes', 'Plate and garnish', 'Send to the pass for service'],
    explain: 'Hygiene first, prepare before cooking, cook to a safe measured temperature, rest for juicier meat, then plate and send.' },
  fridge: { building: 'kitchen', who: 'Food Safety Check', title: 'Food-safety inspection', badge: 'Taste District Food Safety', icon: '♨', type: 'classify',
    intro: 'Inspect the kitchen. Is each item safe or unsafe?', buckets: ['Safe', 'Unsafe'],
    items: [['Fridge at 3 °C', 0], ['Freezer at −18 °C', 0], ['Soup kept hot at 70 °C', 0], ['Fridge at 9 °C', 1], ['Raw chicken stored above salad', 1], ['Cooked rice left out for 4 hours', 1]],
    explain: 'Keep cold food at 5 °C or below, frozen at −18 °C, hot food at 63 °C or above, and raw meat below ready-to-eat food.' },
  // ---------------------------------------------------------------- Market Street
  shelf: { building: 'store', who: 'Hana · Store Manager', title: 'Merchandise the shelves', badge: 'Market Street Merchandiser', icon: '▣', type: 'classify',
    intro: 'Place each product where it will sell best and be safe to pick up.', buckets: ['Eye level', 'Bottom shelf', 'By the checkout'],
    items: [['Best-selling breakfast cereal', 0], ['New premium coffee launch', 0], ['Heavy 10 kg rice bags', 1], ['Packs of bottled water', 1], ['Chewing gum and mints', 2], ['Phone chargers and batteries', 2]],
    explain: 'Eye level sells best, heavy items go low for safety, and small impulse buys go by the checkout.' },
  margin: { building: 'store', who: 'Mira · Cashier', title: 'Cash up the day', badge: 'Market Street Analyst', icon: '▣', type: 'calc',
    steps: [
      { q: 'A lamp costs the store <b>$6</b> and sells for <b>$10</b>. What is the profit margin as a <b>%</b> of the price?', answer: 40, unit: '%', hint: '(10 − 6) ÷ 10 × 100.' },
      { q: 'You sold <b>120 lamps</b> today and the day’s fixed costs were <b>$300</b>. What is the profit ($)?', answer: 180, unit: '$', hint: '120 × $4 − $300.' }],
    explain: 'Gross margin shows profit per sale; fixed costs (rent, staff) must be covered before the business really makes money.' },
  // ---------------------------------------------------------------- Civic Square
  evidence: { building: 'court', who: 'Court Clerk', title: 'Sort the evidence', badge: 'Civic Square Evidence Analyst', icon: '⚖', type: 'classify',
    intro: 'A supplier dispute. Classify each statement.', buckets: ['Fact', 'Opinion', 'Hearsay'],
    items: [['The contract was signed on 3 March (signed copy)', 0], ['The invoice shows $4,200 owed', 0], ['The supplier is obviously dishonest', 1], ['I think the delivery was probably late', 1], ['My neighbour said she heard the manager admit it', 2], ['Someone online wrote that the company never pays', 2]],
    explain: 'Facts can be proven with evidence; opinions are beliefs; hearsay repeats what someone else said and is treated with caution in court.' },
  irac: { building: 'court', who: 'Advocacy coach', title: 'Structure a legal argument', badge: 'Civic Square Advocate', icon: '⚖', type: 'rank',
    intro: 'Lawyers structure analysis with IRAC. Put these parts of the argument in order.',
    items: ['Issue: Was the late delivery a breach of contract?', 'Rule: The contract required delivery by 10 April.', 'Application: Goods arrived on 18 April with no agreed extension.', 'Conclusion: The supplier likely breached the contract.'],
    explain: 'IRAC (Issue, Rule, Application, Conclusion) keeps legal reasoning clear and checkable.' },
  // ---------------------------------------------------------------- Planet Lab
  titration: { building: 'research', who: 'Dana · Lab Researcher', title: 'Run a titration', badge: 'Planet Lab Chemist', icon: '◉', type: 'design', range: true,
    intro: '25 mL of 0.10 M hydrochloric acid is in the flask. Add 0.10 M sodium hydroxide from the burette until the solution is <b>neutral (pH 6.5–7.5)</b>.',
    slider: { label: 'NaOH added', min: 0, max: 40, step: 0.5, unit: 'mL', start: 10 },
    evaluate: (mL) => { const acid = 2.5e-3, base = mL * 1e-4, V = (25 + mL) / 1000; let pH; const ex = base - acid;
      if (Math.abs(ex) < 1e-7) pH = 7; else if (ex < 0) pH = -Math.log10(-ex / V); else pH = 14 + Math.log10(ex / V);
      const col = pH < 6.5 ? '#f3f3f0' : pH <= 7.5 ? '#f6c9da' : '#e0399a';
      return { pH, ok: pH >= 6.5 && pH <= 7.5, html: `pH <b>${pH.toFixed(2)}</b> <span style="display:inline-block;width:18px;height:18px;border-radius:50%;background:${col};border:1px solid #ccc;vertical-align:middle"></span> (phenolphthalein turns pink above ~8.2)` }; },
    explain: 'Equal moles of acid and base neutralise each other: 0.10 M × 25 mL acid needs 25 mL of 0.10 M base. Near the end point, the pH jumps very fast.' },
  energymix: { building: 'research', who: 'Leila · Process Engineer', title: 'Design a clean power mix', badge: 'Planet Lab Energy Planner', icon: '◉', type: 'allocate',
    intro: 'Supply the city’s 100 MW. Keep CO₂ <b>under 120 t per day</b> and reliability <b>at least 80%</b> (sun and wind vary; storage-backed hydro and gas are steady).',
    parts: [['Solar', 0, 0.55], ['Wind', 0, 0.6], ['Hydro + storage', 0, 0.95], ['Gas', 9.6, 0.98]], start: [25, 25, 25, 25],
    metric: (v, p) => { const co2 = v[3] * 24 * 0.4; /* gas MW x 24 h x 0.4 t CO2 per MWh */ const rel = v.reduce((a, x, i) => a + x / 100 * p[i][2], 0) * 100 + (v[0] > 0 && v[1] > 0 ? 6 : 0);
      return { co2, rel, ok: co2 <= 120 && rel >= 80, html: `CO₂ <b>${Math.round(co2)} t/day</b> · Reliability <b>${Math.round(Math.min(100, rel))}%</b>` }; },
    hint: m => m.co2 > 120 ? 'Too much CO₂. Replace some gas with renewables.' : 'Not reliable enough. Add steady sources (hydro + storage) or mix sun and wind.',
    explain: 'Clean grids combine variable renewables (solar and wind complement each other) with storage or steady low-carbon sources.' },
  // ---------------------------------------------------------------- Skyport
  cargo: { building: 'terminal', who: 'Rana · Load Controller', title: 'Balance the aircraft', badge: 'Skyport Load Controller', icon: '➤', type: 'design',
    intro: 'Load four cargo pallets so the aircraft’s centre of gravity stays <b>between −2 and +2</b> (balanced) and nothing is overloaded.',
    groups: [
      { key: 'a', label: 'Pallet A · 1,800 kg', opts: [['Front hold', -1800], ['Rear hold', 1800]] },
      { key: 'b', label: 'Pallet B · 1,200 kg', opts: [['Front hold', -1200], ['Rear hold', 1200]] },
      { key: 'c', label: 'Pallet C · 900 kg', opts: [['Front hold', -900], ['Rear hold', 900]] },
      { key: 'd', label: 'Pallet D · 300 kg', opts: [['Front hold', -300], ['Rear hold', 300]] }],
    evaluate: (s) => { const cg = s.reduce((a, x) => a + x, 0) / 1000 + 0.3; const front = s.filter(x => x < 0).reduce((a, x) => a - x, 0), rear = s.filter(x => x > 0).reduce((a, x) => a + x, 0);
      return { cg, ok: Math.abs(cg) <= 2 && front <= 3000 && rear <= 3000, html: `Centre of gravity <b>${cg >= 0 ? '+' : ''}${cg.toFixed(1)}</b> (−2 to +2) · Front ${front.toLocaleString()} kg · Rear ${rear.toLocaleString()} kg (max 3,000 each)` }; },
    explain: 'An aircraft must be balanced: too far forward or aft and it becomes hard or unsafe to control. Load controllers calculate this for every flight.' },
  flightplan: { building: 'terminal', who: 'Flight Dispatch', title: 'Plan the fuel', badge: 'Skyport Flight Dispatcher', icon: '➤', type: 'calc',
    steps: [
      { q: 'The route is <b>1,800 km</b> and the aircraft cruises at <b>720 km/h</b>. How many <b>hours</b> is the flight?', answer: 2.5, tol: 0.01, unit: 'h', hint: '1,800 ÷ 720.' },
      { q: 'It burns <b>2,400 kg of fuel per hour</b>. Trip fuel plus a <b>30-minute reserve</b>: how many kg in total?', answer: 7200, unit: 'kg', hint: '(2.5 + 0.5) × 2,400.' }],
    explain: 'Dispatchers plan trip fuel plus reserves for holding or diverting. Real planning also adds taxi, contingency and alternate fuel.' },
};

// ---------------------------------------------------------------- runner
// helpers: { dialog(who, html, opts, note) -> element, closeDialog(), award(id, xp, badge, icon, score, max) -> gained, done(title, html), hooks }
export function runActivity(id, H, cb) {
  const a = ACTIVITIES[id]; if (!a) return;
  let mistakes = 0;
  const finish = (extra = '') => {
    const score = Math.max(1, 3 - mistakes); const g = H.award('a_' + id, 80, a.badge, a.icon, score, 3); H.closeDialog();
    H.done(a.title + ' · complete', `${extra}${a.explain}<br><br>Accuracy: <b>${'★'.repeat(score)}${'☆'.repeat(3 - score)}</b>${g ? ` · <b>+${g} XP</b>` : ''}<br>Badge: <b>${a.icon} ${esc(a.badge)}</b>`);
    cb && cb({ done: true, score });
  };
  const close = () => { H.closeDialog(); cb && cb({ closed: true }); };
  const shell = (body, msg = '') => { const d = H.dialog(a.who, `<b>${esc(a.title)}.</b> ${a.intro || ''}${msg}`, []); d.classList.add('wide'); const o = d.querySelector('.opts'); o.innerHTML = body; return o; };
  const fb = (ok, html) => `<div class="task ${ok ? 'ok' : 'no'}" style="margin-top:8px">${html}</div>`;
  const leave = `<button class="secondary" data-x>Leave</button>`;
  const wire = (o) => { const x = o.querySelector('[data-x]'); if (x) x.onclick = close; };

  if (a.type === 'rank') {
    let order = shuffle(a.items.map((_, i) => i)); while (order.every((v, i) => v === i)) order = shuffle(order);
    const render = (msg = '', marks = null) => {
      const o = shell(`<div class="rank">${order.map((k, i) => `<div class="ri ${marks ? (marks[i] ? 'good' : 'bad') : ''}"><b>${i + 1}</b><span class="${a.mono ? 'mono' : ''}">${esc(a.items[k])}</span><button data-up="${i}" ${i ? '' : 'disabled'}>↑</button><button data-dn="${i}" ${i < order.length - 1 ? '' : 'disabled'}>↓</button></div>`).join('')}</div>
        <div class="row" style="margin-top:10px"><button class="primary" data-ok>Check order</button>${leave}</div>`, msg);
      o.querySelectorAll('[data-up]').forEach(b => b.onclick = () => { const i = +b.dataset.up; [order[i - 1], order[i]] = [order[i], order[i - 1]]; render(); });
      o.querySelectorAll('[data-dn]').forEach(b => b.onclick = () => { const i = +b.dataset.dn; [order[i + 1], order[i]] = [order[i], order[i + 1]]; render(); });
      o.querySelector('[data-ok]').onclick = () => { const m = order.map((k, i) => k === i); if (m.every(Boolean)) finish(); else { mistakes++; render(fb(false, `${m.filter(Boolean).length} of ${m.length} in the right place. Green rows are correct; move the red ones.`), m); } };
      wire(o);
    };
    render();
  }
  if (a.type === 'classify') {
    const items = shuffle(a.items.map((it, i) => ({ t: it[0], c: it[1], pick: null, i })));
    const render = (msg = '', check = false) => {
      const o = shell(`<div class="cls">${items.map((it, n) => `<div class="ci ${check ? (it.pick === it.c ? 'good' : 'bad') : ''}"><span>${esc(it.t)}</span><div>${a.buckets.map((b, k) => `<button data-n="${n}" data-k="${k}" class="${it.pick === k ? 'on' : ''}">${esc(b)}</button>`).join('')}</div></div>`).join('')}</div>
        <div class="row" style="margin-top:10px"><button class="primary" data-ok>Check</button>${leave}</div>`, msg);
      o.querySelectorAll('[data-n]').forEach(b => b.onclick = () => { items[+b.dataset.n].pick = +b.dataset.k; render(); });
      o.querySelector('[data-ok]').onclick = () => { if (items.some(it => it.pick === null)) return render(fb(false, 'Sort every item first.')); const right = items.filter(it => it.pick === it.c).length; if (right === items.length) finish(); else { mistakes++; render(fb(false, `${right} of ${items.length} correct. Fix the red ones.`), true); } };
      wire(o);
    };
    render();
  }
  if (a.type === 'calc') {
    let i = 0, tries = 0;
    const render = (msg = '') => {
      const s = a.steps[i];
      const o = shell(`<div style="margin:6px 0 10px"><b>Step ${i + 1}/${a.steps.length}.</b> ${s.q}</div><div class="row"><input type="number" step="any" id="actNum" placeholder="${esc(s.unit)}"> <span style="font-weight:700">${esc(s.unit)}</span><button class="primary" data-ok>Check</button>${leave}</div>`, msg);
      const inp = o.querySelector('#actNum'); setTimeout(() => inp.focus(), 30);
      const go = () => { const v = parseFloat(inp.value); if (isNaN(v)) return; if (Math.abs(v - s.answer) <= (s.tol || 0.5)) { i++; tries = 0; if (i >= a.steps.length) finish(); else render(fb(true, `✓ Correct: ${s.answer.toLocaleString()} ${esc(s.unit)}.`)); } else { mistakes++; tries++; render(fb(false, tries > 1 ? `Hint: ${s.hint}` : 'Not quite. Try again.')); } };
      o.querySelector('[data-ok]').onclick = go; inp.onkeydown = e => { e.stopPropagation(); if (e.key === 'Enter') go(); }; wire(o);
    };
    render();
  }
  if (a.type === 'allocate') {
    const v = a.start.slice();
    const render = (msg = '') => {
      const total = v.reduce((x, y) => x + y, 0); const m = a.metric(v, a.parts);
      const o = shell(`<div class="alloc">${a.parts.map((p, i) => `<label><span>${esc(p[0])}</span><input type="range" min="0" max="100" step="5" value="${v[i]}" data-i="${i}"><output>${v[i]}%</output></label>`).join('')}</div>
        <div class="big" style="margin:8px 0">${m.html} · Total <b style="color:${total === 100 ? '#1f7a4d' : '#b42318'}">${total}%</b></div>
        <div class="row"><button class="primary" data-ok>Submit plan</button>${leave}</div>`, msg);
      o.querySelectorAll('input[type=range]').forEach(r => r.oninput = () => { v[+r.dataset.i] = +r.value; render(); });
      o.querySelector('[data-ok]').onclick = () => { if (total !== 100) return render(fb(false, 'Allocations must add up to exactly 100%.')); if (m.ok) finish(`<div class="task ok">${m.html}</div>`); else { mistakes++; render(fb(false, a.hint(m))); } };
      wire(o);
    };
    render();
  }
  if (a.type === 'design') {
    const sel = a.groups ? a.groups.map(g => g.opts.length - 1) : null; let val = a.slider ? a.slider.start : 0;
    const values = () => sel.map((k, gi) => a.groups[gi].opts[k][1]);
    const evalNow = () => a.slider ? a.evaluate(val) : a.evaluate ? a.evaluate(values()) : (() => { const sc = a.score(values()); return { sc, ok: sc >= a.pass, html: `Audience appeal score <b>${sc}</b> / 100 (needs ${a.pass})` }; })();
    const render = (msg = '') => {
      const m = evalNow();
      const ctrls = a.slider ? `<label class="sl"><span>${esc(a.slider.label)}: <b>${val} ${esc(a.slider.unit)}</b></span><input type="range" min="${a.slider.min}" max="${a.slider.max}" step="${a.slider.step}" value="${val}" id="actSl"></label>`
        : a.groups.map((g, gi) => `<div class="grp"><span>${esc(g.label)}</span><div>${g.opts.map((op, k) => `<button data-g="${gi}" data-k="${k}" class="${sel[gi] === k ? 'on' : ''}">${esc(op[0])}</button>`).join('')}</div></div>`).join('');
      const preview = a.hook === 'ad' ? `<canvas id="adPrev" width="480" height="240" style="width:100%;border-radius:10px;margin-top:6px"></canvas>` : '';
      const o = shell(`<div class="design">${ctrls}</div>${preview}<div class="big" style="margin:8px 0">${m.html}</div><div class="row"><button class="primary" data-ok>${a.hook === 'bridge' ? 'Run load test' : 'Submit'}</button>${leave}</div>`, msg);
      o.querySelectorAll('[data-g]').forEach(b => b.onclick = () => { sel[+b.dataset.g] = +b.dataset.k; render(); });
      const sl = o.querySelector('#actSl'); if (sl) sl.oninput = () => { val = +sl.value; render(); };
      if (a.hook === 'ad') drawAd(o.querySelector('#adPrev'), sel, H.hooks && H.hooks.adScreen);
      if (a.hook === 'bridge' && H.hooks && H.hooks.bridge) H.hooks.bridge.set(m.delta, null);
      o.querySelector('[data-ok]').onclick = () => { if (m.ok) finish(`<div class="task ok">${m.html}</div>`); else { mistakes++; render(fb(false, a.hook === 'bridge' ? (m.delta > 25 ? 'Too much deflection: the beam sags past the limit. Try a stiffer material or a deeper section.' : 'Over budget. Try a cheaper option that still passes.') : a.hook === 'ad' ? 'The ad won’t land with students yet. Make the benefit, visual and call to action clearer.' : a.slider ? (m.pH < 6.5 ? 'Still acidic. Add more base.' : 'Too basic. You overshot; reduce the base.') : 'Not balanced yet. Move pallets between holds.')); } };
      wire(o);
    };
    render();
  }
}

// draw the ad preview (also mirrored onto the studio screen in 3D)
function drawAd(cv, sel, screen) {
  const A = ACTIVITIES.addesign; const pick = gi => A.groups[gi].opts[sel[gi]][0];
  const pal = [['#101A32', '#8056F6', '#51C9E8', '#F5F7FB'], ['#9aa0a6', '#7c8187', '#b0b4b8', '#e6e6e6'], ['#ff3b30', '#ffcc00', '#34c759', '#007aff']][sel[3]];
  const vis = A.groups[1].opts[sel[1]][0], cta = A.groups[2].opts[sel[2]][1];
  const paint = (c) => { if (!c) return; const g = c.getContext('2d'); const W = c.width, Hh = c.height;
    const grd = g.createLinearGradient(0, 0, W, Hh); grd.addColorStop(0, pal[0]); grd.addColorStop(1, pal[1]); g.fillStyle = grd; g.fillRect(0, 0, W, Hh);
    // visual
    if (vis.startsWith('Students')) { for (let i = 0; i < 6; i++) { g.fillStyle = pal[2]; g.globalAlpha = 0.5; g.fillRect(W * 0.58 + i * W * 0.06, Hh * (0.75 - (i % 3) * 0.15), W * 0.045, Hh * (0.25 + (i % 3) * 0.15)); } g.globalAlpha = 1; for (let i = 0; i < 3; i++) { g.fillStyle = pal[3]; g.beginPath(); g.arc(W * (0.66 + i * 0.09), Hh * 0.8, Hh * 0.05, 0, 7); g.fill(); g.fillRect(W * (0.66 + i * 0.09) - Hh * 0.03, Hh * 0.85, Hh * 0.06, Hh * 0.12); } }
    else if (vis.startsWith('Company')) { g.fillStyle = pal[3]; g.font = `800 ${Hh * 0.3}px Plus Jakarta Sans, Arial`; g.fillText('T', W * 0.75, Hh * 0.7); }
    else { g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(W * 0.6, Hh * 0.2, W * 0.33, Hh * 0.6); g.fillStyle = 'rgba(0,0,0,.25)'; for (let i = 0; i < 4; i++) g.fillRect(W * 0.63, Hh * (0.28 + i * 0.12), W * 0.27, Hh * 0.06); }
    g.fillStyle = pal[3]; g.font = `800 ${Hh * 0.11}px Plus Jakarta Sans, Arial`; const words = pick(0).split(' '); let line = '', y = Hh * 0.28;
    for (const w of words) { if (g.measureText(line + w).width > W * 0.52) { g.fillText(line, W * 0.05, y); line = ''; y += Hh * 0.13; } line += w + ' '; } g.fillText(line, W * 0.05, y);
    if (cta > 0) { g.fillStyle = pal[2]; const bw = W * 0.36, bh = Hh * 0.14; g.fillRect(W * 0.05, Hh * 0.74, bw, bh); g.fillStyle = pal[0]; g.font = `700 ${Hh * 0.06}px Plus Jakarta Sans, Arial`; g.fillText(pick(2), W * 0.07, Hh * 0.83); }
  };
  paint(cv); if (screen) { paint(screen.canvas); screen.tex.needsUpdate = true; }
}
