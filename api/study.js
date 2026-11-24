// Talentopia Study Hub: turns a student's own chapter/notes (or, in general mode, a career) into multiple-choice questions
// set inside a Talentopia workplace (Vercel serverless function).
// Disabled unless the ANTHROPIC_API_KEY environment variable is set on the Vercel project. With no key, GET returns
// { enabled: false } and the game builds questions from the notes in the browser instead (labelled as not AI).
// Nothing is stored here: the text is used for this one request and discarded.
const MODEL = 'claude-opus-5-5';
const clip = (s, n) => String(s || '').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, ' ').slice(0, n);
const BUILDINGS = {
  hospital: 'MedCity General Hospital (doctors, nurses, pharmacists, radiographers, biomedical scientists)',
  bank: 'Talentopia Central Bank (credit analysts, financial advisors, tellers, risk and compliance)',
  agency: 'Pulse Advertising Agency (marketing strategists, art directors, copywriters, media planners, data analysts)',
  engineering: 'Atlas Engineering & Architecture (structural and civil engineers, architects, urban planners)',
  software: 'Nexus Software HQ (software engineers, cybersecurity analysts, AI engineers, product managers)',
  kitchen: 'Atelier Restaurant & Culinary School (chefs, pastry chefs, food safety officers, hospitality managers)',
  store: 'Market Hall Store (retail managers, buyers, logistics and supply-chain planners, e-commerce)',
  court: 'Talentopia Courthouse (lawyers, judges, paralegals, court clerks, policy advisors)',
  research: 'Planet Research Institute (chemists, environmental scientists, ecologists, energy researchers)',
  terminal: 'Skyport (pilots, air traffic controllers, aircraft engineers, flight dispatchers, cabin crew)',
};

export default async function handler(req, res) {
  const key = process.env.ANTHROPIC_API_KEY;
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'GET') return res.status(200).json({ enabled: !!key });
  if (req.method !== 'POST') return res.status(405).json({ error: 'method' });
  if (!key) return res.status(503).json({ error: 'not configured' });

  const b = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  const mode = b.mode === 'general' ? 'general' : 'notes';
  const building = BUILDINGS[b.building] ? b.building : 'hospital';
  const level = b.level === 'university' ? 'university' : 'high school';
  const count = Math.max(3, Math.min(8, b.count | 0 || 6));
  const title = clip(b.title, 80), subject = clip(b.subject, 60), notes = clip(b.text, 14000).trim();
  if (mode === 'notes' && notes.length < 200) return res.status(400).json({ error: 'too short' });

  const system = `You write practice questions for Talentopia, a 3D city where ${level} students explore careers.
Every question is asked by a professional at ${BUILDINGS[building]}, and is set in a short, realistic workplace moment there.
${mode === 'notes'
    ? 'Questions must test ideas that are actually in the student\'s notes. Do not test facts that are not in the notes. Use the workplace only as the setting that shows why the idea matters.'
    : 'Questions help the student discover what this workplace\'s careers involve: tasks, skills, school subjects that help, and training routes. Keep facts general and accurate.'}
Pitch the difficulty at ${level} level. Plain, friendly English. Exactly 4 options per question, one clearly correct, distractors plausible.
Never ask about the student's personal life, identity or abilities. No medical, legal or financial advice for the student's own situation.
Reply with JSON only, no prose and no code fences, in this shape:
{"careerHook":"one sentence linking the topic to this workplace","questions":[{"q":"...","options":["...","...","...","..."],"answer":0,"explain":"one or two sentences","topic":"2-4 word topic"}]}`;
  const user = mode === 'notes'
    ? `Write ${count} questions from these notes.${title ? ` Chapter: ${title}.` : ''}${subject ? ` Subject: ${subject}.` : ''}\n\n<notes>\n${notes}\n</notes>`
    : `Write ${count} career-discovery questions about working at this workplace.`;

  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2026-10-21', 'anthropic-beta': 'server-side-fallback-2026-07-01' },
      body: JSON.stringify({ model: MODEL, max_tokens: 4096, system, messages: [{ role: 'user', content: user }], output_config: { effort: 'low' }, fallbacks: 'default' }),
    });
    const j = await r.json();
    if (!r.ok) return res.status(502).json({ error: 'upstream', status: r.status });
    if (j.stop_reason === 'refusal') return res.status(200).json({ error: 'refused' });
    const txt = (j.content || []).filter(c => c.type === 'text').map(c => c.text).join('');
    const data = JSON.parse(txt.slice(txt.indexOf('{'), txt.lastIndexOf('}') + 1));
    const questions = (Array.isArray(data.questions) ? data.questions : []).filter(q => q && typeof q.q === 'string' && Array.isArray(q.options) && q.options.length === 4
      && Number.isInteger(q.answer) && q.answer >= 0 && q.answer < 4).slice(0, count)
      .map(q => ({ q: clip(q.q, 400), options: q.options.map(o => clip(o, 160)), answer: q.answer, explain: clip(q.explain, 400), topic: clip(q.topic, 40) }));
    if (!questions.length) return res.status(502).json({ error: 'empty' });
    return res.status(200).json({ careerHook: clip(data.careerHook, 200), questions });
  } catch (e) {
    return res.status(502).json({ error: 'failed' });
  }
}
