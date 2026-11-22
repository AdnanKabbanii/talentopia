// Talentopia V2 conversations: each named professional has a look (avatar config), a voice and a short branching script about their
// job (a normal day, the skills it needs, how they got there, plus an optional extra). The controller runs the conversation:
// camera framing, gestures, expressions, spoken lines with lip sync and word-highlighted subtitles, and choices.
// AI dialogue: if the optional /api/npc backend reports it is configured, an "Ask your own question" choice appears.
import * as THREE from 'three';

const DAY = 'What does a normal day look like?', SKILLS = 'What skills does this job need?', PATH = 'How did you get into it?';
// look helpers
const fem = (o) => ({ pres: -0.75, build: -0.05, muscle: 0.2, brows: 'eyebrow001', beard: 'none', shoes: 'shoes01', ...o });
const masc = (o) => ({ pres: 0.8, build: 0.05, muscle: 0.45, brows: 'eyebrow006', shoes: 'shoes03', beard: 'none', jawWide: 0.3, chinStrong: 0.25, ...o });
// [gender, pitch, look, greeting, day, skills, path, extra?, station?]
const P = (g, pitch, look, greet, day, skills, path, extra = null) => ({ g, pitch, look, greet, topics: [
  { id: 'day', q: DAY, a: day, gesture: 'explain', expr: 'smile' }, { id: 'skills', q: SKILLS, a: skills, gesture: 'present', expr: 'neutral' },
  { id: 'path', q: PATH, a: path, gesture: 'explain', expr: 'smile' }, ...(extra ? [{ id: 'extra', q: extra[0], a: extra[1], gesture: extra[2] || 'explain', expr: extra[3] || 'neutral' }] : [])] });

export const CAST = {
  // ------------------------------------------------ MedCity General Hospital
  'Receptionist · Maya': P('f', 1.1, fem({ skin: 'young_asian_female', hair: 'ponytail01', hairColor: '#141012', outfit: 'female_elegantsuit01', outfitTint: '#ffffff', cheekbones: 0.4 }),
    'Oh, hi! Welcome to MedCity General! I’m Maya. I’m so glad you came by. I can show you the Anatomy Lab, or tell you about the amazing people who work here.',
    'I’m the first face patients see. I check people in, calm nervous visitors, and make sure everyone ends up in the right department.',
    'Patience, clear communication and staying organised when the waiting room is full. You also learn a lot of medical vocabulary quickly.',
    'I studied health administration at college, then started on the front desk. Many hospital managers began exactly where I’m standing.',
    ['Who else works in a hospital?', 'Doctors diagnose and treat, nurses care for patients around the clock, radiographers take scans, pharmacists check medicines, and lab scientists analyse samples.', 'present']),
  'Cardiologist · Dr. Haddad': P('m', 0.92, masc({ skin: 'middleage_caucasian_male', hair: 'short01', hairColor: '#5a5a58', beard: 'full', outfit: 'male_elegantsuit01', outfitTint: '#ffffff', glasses: 'rect', build: 0.15, height: 1.02 }),
    'Hello, and welcome! I’m Dr. Haddad, a cardiologist. The heart is my passion, and honestly, it’s the most fascinating thing you’ll ever study.',
    'Mornings are ward rounds and test results. Afternoons are clinics, and some days I perform procedures to open blocked arteries.',
    'A solid grasp of biology, careful reasoning, and the ability to explain serious news kindly. You never stop studying in medicine.',
    'Medical school took six years, then several years of training as a junior doctor before I specialised in cardiology. It’s a long road, but worth it.',
    ['Where can I learn about the heart?', 'Step onto the glowing ring at the Heart Lab display. You can take a real 3D heart apart, chamber by chamber.', 'point']),
  'Triage Nurse · Grace': P('f', 1.02, fem({ skin: 'young_african_female', hair: 'braid01', hairColor: '#1b1411', outfit: 'female_sportsuit01', outfitTint: '#a9c2a4' }),
    'Hi there, I’m Grace! I’m the triage nurse. I decide who needs help first, and I think you’d be really good at it.',
    'Patients arrive all day. I check their symptoms and vital signs within minutes, then sort them by urgency so the sickest are treated first.',
    'Calm under pressure, sharp observation and good judgement. Kindness matters too, because people are often scared when they arrive.',
    'I did a nursing degree with lots of hospital placements, then specialised in emergency care after a few years on the wards.',
    ['Can I try triage?', 'Of course. The triage screen next to me has today’s patients. Sort them by urgency, and I’ll tell you how you did.', 'point', 'smile']),
  // ------------------------------------------------ Talentopia Central Bank
  'Teller · Sara': P('f', 1.08, fem({ skin: 'young_caucasian_female', hair: 'bob01', hairColor: '#5a3a24', outfit: 'female_elegantsuit01', outfitTint: '#5f6f9a' }),
    'Hi, welcome to Talentopia Central Bank! I’m Sara, one of the tellers. It’s lovely to meet you. What would you like to know?',
    'I handle deposits, withdrawals and currency exchange, and I spot problems like forged notes or unusual transactions.',
    'Accuracy with numbers, honesty, and friendly service. Every shift ends with the cash drawer balancing to the cent.',
    'I joined straight after school and trained on the job. Several of our branch managers started as tellers.',
    ['Where do I go for a loan?', 'Loans are handled by Lina at the advisor desk on the left. She’ll walk you through a real loan assessment.', 'point']),
  'Teller · Omar': P('m', 1.0, masc({ skin: 'young_asian_male', hair: 'short02', hairColor: '#141012', beard: 'stubble', outfit: 'male_elegantsuit01', outfitTint: '#6b6f78' }),
    'Hey, hello! I’m Omar. If you’re curious about money, you’ve come to exactly the right place.',
    'I serve customers at the counter, exchange currency for travellers, and help people set up their first accounts.',
    'Mental arithmetic, patience and being able to explain fees simply. People trust you with their money, so trust is everything.',
    'I studied finance part-time while working here. Next year I hope to move into financial advising.',
    ['What’s the market wall?', 'It shows how investments move every day. Our advisors use it to build portfolios that match each client’s goals and risk.', 'point']),
  'Loan Advisor · Lina': P('f', 1.0, fem({ skin: 'young_asian_female', hair: 'long01', hairColor: '#2a1d16', outfit: 'female_elegantsuit01', outfitTint: '#ffffff', glasses: 'round' }),
    'Hi! I’m Lina, a loan advisor. I help people make their big plans happen, the smart way.',
    'I meet clients who want to buy a home or start a business. I check their income, spending and credit history, then decide what they can safely afford.',
    'Analytical thinking, attention to detail and empathy. Saying no kindly is part of the job when a loan would hurt someone.',
    'I have a degree in business and finance, and I passed professional banking exams after joining the bank.',
    ['Can I try a loan assessment?', 'Yes, please. Sit at my desk and I’ll give you a real application to assess. Look closely at the numbers.', 'point', 'smile']),
  'Financial Advisor · Karim': P('m', 0.95, masc({ skin: 'young_african_male', hair: 'short04', hairColor: '#141012', beard: 'full', outfit: 'male_elegantsuit01', outfitTint: '#5f6f9a' }),
    'It’s really good to meet you! I’m Karim, a financial advisor. I help people build the future they want.',
    'I plan savings and investments with clients: saving for university, buying a home, or retiring comfortably.',
    'Understanding markets, listening carefully and explaining risk honestly. Good advice depends on the client’s goals, not mine.',
    'Economics at university, then professional certification. I still study regularly because regulations change.'),
  // ------------------------------------------------ Pulse Advertising Agency
  'Copywriter · Sami': P('m', 1.05, masc({ skin: 'young_caucasian_male', hair: 'short03', hairColor: '#7a3420', outfit: 'male_casualsuit05', outfitTint: '#ffffff', glasses: 'round' }),
    'Hey, welcome! I’m Sami, a copywriter. I write the words that make people stop scrolling.',
    'I write headlines, slogans and video scripts, then rewrite them many times after feedback from the creative director and the client.',
    'Writing clearly, understanding people, and handling criticism without taking it personally. Short words are harder than long ones.',
    'I studied English and kept a portfolio of spec ads. That portfolio got me my first internship here.'),
  'Media Planner · Yara': P('f', 1.1, fem({ skin: 'young_caucasian_female', hair: 'ponytail01', hairColor: '#c9a46a', outfit: 'female_casualsuit02', outfitTint: '#ffffff' }),
    'Hi! I’m Yara, a media planner. I decide where our ads show up, so the right people see them at the right moment.',
    'I split each campaign budget across TV, social media, outdoor screens and search, then track results and move money to what works.',
    'Comfort with data and spreadsheets, curiosity about how people use media, and negotiating good prices.',
    'I studied marketing, did a summer internship in media buying, and was hired at the end of it.',
    ['How do I try media planning?', 'Use the media planning table by the window. You’ll split a real campaign budget and see the reach you get.', 'point']),
  'Creative Director · Noor': P('f', 0.98, fem({ skin: 'middleage_african_female', hair: 'afro01', hairColor: '#141012', outfit: 'female_elegantsuit01', outfitTint: '#6b6f78', glasses: 'rect' }),
    'Welcome to Pulse! I’m Noor, the creative director. I lead the team that dreams up our campaigns, and I love meeting new talent.',
    'I review ideas from writers and designers, present concepts to clients, and protect the big idea when deadlines get tight.',
    'Taste, leadership and storytelling. You also need to defend ideas with evidence, because clients want results.',
    'I started as a graphic designer, became an art director, and after ten years I was leading the whole creative team.',
    ['What makes a great ad?', 'One clear idea, aimed at the right audience, that makes people feel something. If you need to explain it, it isn’t finished.', 'present', 'smile']),
  // ------------------------------------------------ Engineering
  'Architect · Omar': P('m', 0.98, masc({ skin: 'young_asian_male', hair: 'short01', hairColor: '#2a1d16', beard: 'stubble', outfit: 'male_casualsuit03', outfitTint: '#ffffff' }),
    'Hello, welcome! I’m Omar, an architect. I design buildings people genuinely love spending time in.',
    'I sketch ideas, build 3D models, meet clients and engineers, and check designs against planning rules before anything gets built.',
    'Creativity, spatial thinking, drawing and 3D software. And patience, because one building can take years.',
    'Five years of architecture school, then supervised practice before I could register as an architect.',
    ['What are planning rules?', 'Cities limit building height, how much of the plot you cover, and how far you sit from the street. Check our model table to test a design.', 'point']),
  'Structural Engineer · Karim': P('m', 0.9, masc({ skin: 'middleage_caucasian_male', hair: 'short04', hairColor: '#9a9a98', outfit: 'male_worksuit01', outfitTint: '#ffffff', build: 0.2, height: 1.03 }),
    'Hi! I’m Karim, a structural engineer. I make sure everything you see here stands strong, and I love every minute of it.',
    'I calculate the loads on beams, columns and foundations, choose materials, and visit sites to inspect what’s being built.',
    'Strong maths and physics, careful checking, and clear reports. Safety depends on getting the numbers right.',
    'A civil engineering degree, then years of supervised work before becoming a chartered engineer.',
    ['Can I test a bridge?', 'Absolutely. Our test rig lets you design a beam and load it until it fails. Try to make it strong without wasting material.', 'point', 'smile']),
  // ------------------------------------------------ Software
  'Software Engineer · Lea': P('f', 1.12, fem({ skin: 'young_asian_female', hair: 'bob02', hairColor: '#6b4fd8', outfit: 'female_casualsuit01', outfitTint: '#ffffff' }),
    'Oh, hi! I’m Lea, a software engineer. I build the app thousands of people use every single day. Want to see how?',
    'I write and review code, fix bugs, and join a short team meeting each morning to plan the day.',
    'Logical problem solving, persistence, and teamwork. Most code is read by other people, so clarity matters.',
    'I taught myself to code at sixteen, then studied computer science. Bootcamps and apprenticeships work too.'),
  'Security Analyst · Tom': P('m', 1.0, masc({ skin: 'young_caucasian_male', hair: 'short02', hairColor: '#c9a46a', outfit: 'male_casualsuit05', outfitTint: '#6b6f78' }),
    'Hey, I’m Tom! I’m a security analyst. I protect our systems from attackers. It’s like solving a puzzle every day.',
    'I watch security alerts, investigate anything suspicious, and test our own systems to find weaknesses before criminals do.',
    'Curiosity, networking knowledge, staying calm during incidents, and strong ethics.',
    'I started in IT support, studied for security certifications at night, and moved onto the security team.'),
  'Engineering Lead · Daniel': P('m', 0.94, masc({ skin: 'young_african_male', hair: 'short03', hairColor: '#141012', beard: 'stubble', outfit: 'male_casualsuit03', outfitTint: '#5f6f9a' }),
    'Welcome to the engineering floor! I’m Daniel. I lead the team here, and we’re always happy to meet future engineers.',
    'I plan our work, unblock engineers, review designs and step in when something breaks in production.',
    'Technical depth plus people skills: giving feedback, making trade-offs and keeping the team focused.',
    'Eight years as a developer first. Leading is a different job, so I took management training too.',
    ['What happens when the site goes down?', 'We open an incident, find the cause fast, fix it, then write up what we learned. Try the incident desk to see.', 'point']),
  // ------------------------------------------------ Restaurant
  'Head Chef · Rami': P('m', 0.9, masc({ skin: 'young_asian_male', hair: 'short04', hairColor: '#141012', beard: 'full', outfit: 'male_worksuit01', outfitTint: '#ffffff', build: 0.3 }),
    'Welcome to my kitchen! I’m Rami, the head chef. Come in, come in. It smells amazing in here today.',
    'I plan the menu, order ingredients, train cooks, and run the pass during service, calling orders and checking every plate.',
    'Speed, organisation, food safety knowledge and a good palate. Kitchens are hot, loud and very much a team sport.',
    'Culinary school, then years working my way up from prep cook to sous chef in busy restaurants.',
    ['Can I help with the lunch rush?', 'Yes! Head to the kitchen pass and take the tickets. Cook each order in the right sequence and keep it safe.', 'point', 'smile']),
  // ------------------------------------------------ Retail
  'Cashier · Mira': P('f', 1.12, fem({ skin: 'young_african_female', hair: 'short04', hairColor: '#141012', outfit: 'female_casualsuit01', outfitTint: '#b9a8f0' }),
    'Hi there! I’m Mira. I run the checkout, and I get to chat with everyone who walks in.',
    'I serve customers, handle payments and returns, and keep an eye on the queue so nobody waits too long.',
    'Friendliness, speed and accuracy with money. You get very good at solving problems on the spot.',
    'This was my first job while studying. Retail teaches you skills every employer wants.'),
  'Store Manager · Hana': P('f', 1.0, fem({ skin: 'young_caucasian_female', hair: 'long01', hairColor: '#7a3420', outfit: 'female_elegantsuit01', outfitTint: '#a9c2a4' }),
    'Welcome in! I’m Hana, the store manager. I’m so happy you stopped by.',
    'I set staff schedules, track sales on the dashboard, order stock, and make sure the store looks great every morning.',
    'Leadership, reading numbers like margins and stock levels, and great customer service.',
    'I started as a sales assistant, became a supervisor, and completed a retail management programme.',
    ['How do stores decide what goes where?', 'Merchandising! Best sellers sit at eye level, related items go together, and promotions face the entrance.', 'present']),
  // ------------------------------------------------ Courthouse
  'Judge · Hon. Mansour': P('m', 0.86, masc({ skin: 'middleage_caucasian_male', hair: 'short01', hairColor: '#e3dccb', outfit: 'male_elegantsuit01', outfitTint: '#6b6f78', glasses: 'rect', build: 0.1, height: 1.01 }),
    'Good day, and welcome to the courthouse! I’m Judge Mansour. I’m always glad when young people take an interest in justice.',
    'I hear cases, listen to both sides, weigh the evidence against the law, and write decisions that explain my reasoning.',
    'Fairness, careful reading, and calm. A judge must put personal opinions aside and follow the law.',
    'Law school, then many years as a lawyer arguing cases before I was appointed to the bench.',
    ['What does a lawyer do here?', 'Lawyers build arguments: the issue, the rule, how it applies to the facts, and a conclusion. Try the advocate’s lectern.', 'point']),
  // ------------------------------------------------ Research lab
  'Lab Researcher · Dana': P('f', 1.08, fem({ skin: 'young_caucasian_female', hair: 'ponytail01', hairColor: '#2a1d16', outfit: 'female_casualsuit01', outfitTint: '#ffffff', glasses: 'round' }),
    'Hello! I’m Dana, a research chemist. I get to discover things nobody has ever known before. Isn’t that exciting?',
    'I design experiments, run tests like titrations, record results carefully, and share findings with the team.',
    'Precision, patience, and curiosity. Most experiments don’t work the first time, and that is normal.',
    'A chemistry degree, then a PhD studying new materials for batteries.',
    ['What’s a titration?', 'You add one solution to another drop by drop until a reaction is complete, which tells you its concentration. The bench is right here.', 'point']),
  'Process Engineer · Leila': P('f', 0.98, fem({ skin: 'young_african_female', hair: 'bob01', hairColor: '#141012', outfit: 'female_sportsuit01', outfitTint: '#5f6f9a' }),
    'Hi, I’m Leila! I’m a process engineer. I keep our pilot plant safe and running beautifully.',
    'I monitor pressure and temperature, improve how chemicals are processed, and respond when alarms go off.',
    'Chemistry, maths, systems thinking, and staying calm when an alarm sounds.',
    'Chemical engineering at university, plus a year-long industry placement that turned into a job.'),
  // ------------------------------------------------ SkyPort terminal
  'Flight Operations · Captain Aziz': P('m', 0.9, masc({ skin: 'young_african_male', hair: 'short01', hairColor: '#141012', outfit: 'male_elegantsuit01', outfitTint: '#5f6f9a', glasses: 'aviator', height: 1.03 }),
    'Welcome aboard! I’m Captain Aziz, a commercial pilot. There’s no better view than the one from the cockpit.',
    'Before every flight I check the weather, fuel, and aircraft systems with my co-pilot, then we fly and land following strict procedures.',
    'Discipline, quick decisions, maths and physics, and excellent teamwork in the cockpit.',
    'Flight school for about two years, then building flying hours until an airline hired me as a first officer.',
    ['Can I do a pre-flight check?', 'Yes. Come to the flight operations desk. Look at the weather and decide whether it is safe to fly.', 'point', 'smile']),
  'Load Controller · Rana': P('f', 1.04, fem({ skin: 'young_asian_female', hair: 'braid01', hairColor: '#141012', outfit: 'female_elegantsuit01', outfitTint: '#6b6f78' }),
    'Hi! I’m Rana, a load controller. I make sure every aircraft is perfectly balanced before it takes off.',
    'I plan where passengers, bags and cargo go so the plane’s weight and balance stay within safe limits for take-off.',
    'Accuracy, maths, and working fast to a deadline. The plane can’t leave until my numbers are signed off.',
    'I studied aviation management and trained on load planning software at the airline.'),
};

// gestures map to clips or procedural motions on the Character
function gesture(c, g, target) {
  if (!c) return;
  if (g === 'wave') c.wave();
  else if (g === 'point' && target) c.point(target);
  else if (g === 'present' && c.acts.Present) c.play('Present', { lock: false });
  else if (g === 'nod' && c.acts.Nod) c.play('Nod', { lock: false });
  else if (g === 'no' && c.acts.No) c.play('No', { lock: false });
}
function expression(c, e) {
  if (!c) return; const x = c.expr; x.smile = 0; x.browsUp = 0; x.browsDown = 0;
  if (e === 'smile') { x.smile = 0.75; x.browsUp = 0.15; } else if (e === 'think') { x.browsDown = 0.35; } else if (e === 'surprised') { x.browsUp = 0.8; } else x.smile = 0.18;
}
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export class Conversations {
  // deps: { speech, setMode(m), getPlayer(), stationsNear(n), runStation(s), onStart(n), playerHead(), aiEndpoint }
  constructor(deps) {
    this.d = deps; this.active = null; this.met = new Set(); this.ai = null; this.el = document.getElementById('talk');
    this.shot = { pos: new THREE.Vector3(), look: new THREE.Vector3(), ready: false };
    this.checkAI();
  }
  async checkAI() {
    try { const r = await fetch(this.d.aiEndpoint, { method: 'GET' }); if (r.ok) { const j = await r.json(); this.ai = !!j.enabled; } else this.ai = false; } catch (e) { this.ai = false; }
  }
  person(n) {
    return CAST[n.role] || { g: /Maya|Sara|Lina|Grace|Yara|Noor|Lea|Mira|Hana|Dana|Leila|Rana/.test(n.role) ? 'f' : 'm', pitch: 1, greet: n.talk || 'Hello! Welcome to Talentopia.', topics: [] };
  }
  start(n) {
    if (this.active) this.end(true);
    const p = this.person(n); const first = !this.met.has(n.role); this.met.add(n.role);
    const st = this.d.stationsNear(n);
    this.active = { n, p, asked: new Set(), st, history: [], line: null, speaking: false, t: 0 };
    this.d.setMode('talk'); this.d.onStart && this.d.onStart(n);
    const c = n.c; if (c) { c.lookAt(this.d.playerHead()); c._talkIdle = c.idleClip; }
    this.el.style.display = 'block'; document.body.classList.add('talking');
    const [name, ...rest] = n.role.split(' · ').reverse(); this.who = { name, role: rest.reverse().join(' · ') || '' };
    this.say(first ? p.greet : `Hey, you’re back! It’s so good to see you again. What would you like to know?`, first ? 'wave' : 'nod', 'smile');
  }
  say(text, g = 'explain', e = 'neutral', target = null) {
    const A = this.active; if (!A) return; const c = A.n.c;
    A.text = text; A.speaking = true; A.optsShown = false;
    expression(c, e);
    if (g === 'point' && !target && A.st[0]) target = new THREE.Vector3(A.st[0].x, 1.0, A.st[0].z);
    gesture(c, g, target);
    if (c && c.acts.Talk && !c.sit) c.idleClip = 'Talk'; if (c && c.sit && c.acts.SitTalk) c.sitClip = 'SitTalk';
    const seed = [...A.n.role].reduce((s, ch) => s + ch.charCodeAt(0), 0);
    A.line = this.d.speech.say(text, { gender: A.p.g, seed, pitch: A.p.pitch || 1, rate: 1.02 });
    this.words = text.replace(/<[^>]+>/g, '').split(/\s+/).filter(Boolean);
    this.render();
  }
  render() {
    const A = this.active; if (!A) return;
    const voiceBtn = this.d.speech.available ? `<button class="tk-voice" title="Voice on/off">${this.d.speech.enabled ? '🔊 Voice' : '🔇 Voice off'}</button>` : '';
    this.el.innerHTML = `<div class="tk-head"><div><b>${esc(this.who.name)}</b><span>${esc(this.who.role)}</span></div><div class="tk-ctl">${voiceBtn}<button class="tk-x" title="End conversation (Esc)">✕</button></div></div>
      ${A.q ? `<div class="tk-q">You: ${esc(A.q)}</div>` : ''}<p class="tk-line">${this.words.map((w, i) => `<span data-w="${i}">${esc(w)}</span>`).join(' ')}</p><div class="tk-opts"></div><div class="tk-hint">${A.speaking ? 'Click or press Space to skip' : ''}</div>`;
    this.el.querySelector('.tk-x').onclick = () => this.end();
    const vb = this.el.querySelector('.tk-voice'); if (vb) vb.onclick = () => { this.d.speech.setEnabled(!this.d.speech.enabled); vb.textContent = this.d.speech.enabled ? '🔊 Voice' : '🔇 Voice off'; };
    this.el.querySelector('.tk-line').onclick = () => this.skip();
    this.spans = [...this.el.querySelectorAll('.tk-line span')];
    if (!A.speaking) this.showOptions();
  }
  skip() { const A = this.active; if (!A || !A.speaking) return; this.d.speech.stop(); A.line = null; this.finishLine(); }
  finishLine() {
    const A = this.active; if (!A) return; A.speaking = false; const c = A.n.c;
    if (c) { c.vis.jawOpen = c.vis.mouthO = c.vis.mouthE = 0; c.idleClip = c._talkIdle || 'Idle'; if (c.sit) c.sitClip = 'SitIdle'; }
    this.spans && this.spans.forEach(s => s.classList.add('on'));
    const h = this.el.querySelector('.tk-hint'); if (h) h.textContent = '';
    this.showOptions();
  }
  showOptions() {
    const A = this.active; if (!A || A.optsShown) return; A.optsShown = true;
    const o = this.el.querySelector('.tk-opts'); if (!o) return; o.innerHTML = '';
    const add = (label, fn, cls = '') => { const b = document.createElement('button'); b.innerHTML = label; if (cls) b.className = cls; b.onclick = fn; o.appendChild(b); };
    if (A.n.role === 'Receptionist · Maya' && !A.asked.has('lab')) add('🩺 Show me the Anatomy Lab', () => this.ask({ id: 'lab', q: 'Can you show me the Anatomy Lab?', a: 'Our Anatomy Lab has a real 3D heart built from scan data. Go through the Anatomy Lab door on the right and step onto the glowing ring.', gesture: 'point', expr: 'smile', target: this.d.labTarget && this.d.labTarget(), after: 'lab' }));
    for (const t of A.p.topics) if (!A.asked.has(t.id)) add(esc(t.q), () => this.ask(t));
    const task = A.st.find(s => !/^career/.test(s.id));
    if (task && !A.asked.has('task')) add(`Show me your workstation`, () => this.ask({ id: 'task', q: 'Can you show me your workstation?', a: `Right over there: the ${task.label.split(' · ')[0].toLowerCase()}. Want to give it a go?`, gesture: 'point', expr: 'smile', target: new THREE.Vector3(task.x, 1, task.z), after: 'task' }));
    if (this.ai) add('💬 Ask your own question…', () => this.askFree());
    if (A.after === 'task' && task) add(`<b>Try it now →</b>`, () => { this.end(); this.d.runStation(task); }, 'primary');
    if (A.after === 'lab') add(`<b>Walk me there →</b>`, () => { this.end(); this.d.goLab && this.d.goLab(); }, 'primary');
    add('Thanks, goodbye!', () => this.end());
  }
  ask(t) {
    const A = this.active; if (!A) return; A.asked.add(t.id); A.q = t.q; A.after = t.after || null;
    A.history.push({ role: 'user', content: t.q }, { role: 'assistant', content: t.a });
    this.say(t.a, t.gesture, t.expr, t.target || null);
  }
  askFree() {
    const A = this.active; if (!A) return; const o = this.el.querySelector('.tk-opts');
    o.innerHTML = `<form class="tk-free"><input maxlength="280" placeholder="Ask ${esc(this.who.name)} about their job…" autocomplete="off"><button class="primary">Ask</button></form><div class="tk-note">Answers are generated by AI from this character’s role. Don’t share personal information.</div>`;
    const f = o.querySelector('form'), inp = f.querySelector('input'); inp.focus();
    inp.addEventListener('keydown', e => { if (e.key !== 'Escape') e.stopPropagation(); });
    f.onsubmit = async (e) => {
      e.preventDefault(); const q = inp.value.trim(); if (!q) return;
      A.q = q; A.optsShown = true; expression(A.n.c, 'think');
      this.words = ['…']; this.render(); this.el.querySelector('.tk-hint').textContent = 'Thinking…';
      let reply = null;
      try {
        const r = await fetch(this.d.aiEndpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: this.who.name, role: this.who.role, building: A.n.building || '', message: q, history: A.history.slice(-6) }) });
        const j = await r.json(); reply = j.reply || null;
      } catch (err) {}
      if (this.active !== A) return;
      reply = reply || 'Sorry, I didn’t catch that. Could you ask me something else about my work?';
      A.history.push({ role: 'user', content: q }, { role: 'assistant', content: reply }); A.after = null;
      this.say(reply, 'explain', 'neutral');
    };
  }
  end(silent) {
    const A = this.active; if (!A) return; this.d.speech.stop(); const c = A.n.c;
    if (c) { c.vis.jawOpen = c.vis.mouthO = c.vis.mouthE = 0; c.idleClip = c._talkIdle || 'Idle'; if (c.sit) c.sitClip = 'SitIdle'; expression(c, 'smile'); if (!silent) gesture(c, 'nod'); setTimeout(() => { if (!this.active || this.active.n !== A.n) { c.lookAt(null); expression(c, 'neutral'); } }, 2500); }
    this.active = null; this.el.style.display = 'none'; document.body.classList.remove('talking'); this.shot.ready = false;
    if (!silent) this.d.setMode('walk');
  }
  update(dt) {
    const A = this.active; if (!A) return;
    const c = A.n.c; if (c) c.lookAt(this.d.playerHead());
    if (A.speaking && A.line) {
      const v = A.line.update(dt);
      if (c) { c.vis.jawOpen = v.jawOpen; c.vis.mouthO = v.mouthO; c.vis.mouthE = v.mouthE; }
      if (v.word >= 0 && this.spans) { const k = Math.min(this.spans.length - 1, Math.round(v.word * this.spans.length / Math.max(1, A.line.words.length))); for (let i = 0; i <= k; i++) this.spans[i] && this.spans[i].classList.add('on'); }
      if (A.line.done) this.finishLine();
    }
  }
  // camera: over the player's shoulder onto the speaker's face; slightly wider while choosing
  camera(playerHead, npcHead) {
    const A = this.active; if (!A) return null;
    const d = new THREE.Vector3(npcHead.x - playerHead.x, 0, npcHead.z - playerHead.z); const dist = Math.max(0.6, d.length()); d.normalize();
    const right = new THREE.Vector3(-d.z, 0, d.x); const pointing = A.n.c && A.n.c.gesture && A.n.c.gesture.name === 'point'; const wide = A.speaking && !pointing ? 0 : 1;
    const back = 0.85 + wide * 0.45 + Math.max(0, dist - 2) * 0.15;
    const pos = playerHead.clone().addScaledVector(d, -back).addScaledVector(right, 0.48 + wide * 0.2 + Math.max(0, dist - 1.6) * 0.4); // wider shoulder offset across counters pos.y = playerHead.y + 0.12 + wide * 0.12;
    const look = npcHead.clone().lerp(playerHead, 0.18 + wide * 0.1); look.y = npcHead.y - 0.2 - wide * 0.12;
    return { pos, look, fov: (A.speaking && !pointing ? 38 : 44) - THREE.MathUtils.clamp((dist - 1.8) * 6, 0, 10) };
  }
}
