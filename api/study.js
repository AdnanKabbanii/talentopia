// Talentopia Study Hub: turns a student's own chapter/notes (or, in general mode, a career) into multiple-choice questions
// set inside a Talentopia workplace (Vercel serverless function).
// Uses Google's Gemini API (Google AI Studio key). Disabled unless GEMINI_API_KEY is set on the Vercel project; GEMINI_MODEL
// optionally picks the model (default: the latest Flash alias, which is on the free tier). With no key, GET returns
// { enabled: false } and the game builds questions from the notes in the browser instead (labelled as not AI).
// Talentopia stores nothing here; note that Google may use free-tier requests to improve its products.
import { gemini } from './_gemini.js';
const SCHEMA = { type: 'OBJECT', required: ['careerHook', 'questions'], properties: {
  careerHook: { type: 'STRING' },
  questions: { type: 'ARRAY', items: { type: 'OBJECT', required: ['q', 'options', 'answer', 'explain', 'topic'], properties: {
    q: { type: 'STRING' }, options: { type: 'ARRAY', items: { type: 'STRING' } }, answer: { type: 'INTEGER' }, explain: { type: 'STRING' }, topic: { type: 'STRING' } } } } } };
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
  const key = process.env.GEMINI_API_KEY;
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
Reply as JSON: careerHook is one sentence linking the topic to this workplace; each question has q, exactly 4 options, answer (the 0-based index of the correct option), explain (one or two sentences) and topic (2 to 4 words).`;
  const user = mode === 'notes'
    ? `Write ${count} questions from these notes.${title ? ` Chapter: ${title}.` : ''}${subject ? ` Subject: ${subject}.` : ''}\n\n<notes>\n${notes}\n</notes>`
    : `Write ${count} career-discovery questions about working at this workplace.`;

  try {
    const g = await gemini(key, { systemInstruction: { parts: [{ text: system }] }, contents: [{ role: 'user', parts: [{ text: user }] }],
        generationConfig: { responseMimeType: 'application/json', responseSchema: SCHEMA, temperature: 0.6, maxOutputTokens: 8192 } });
    if (g.status === 429) return res.status(429).json({ error: 'busy' }); // free-tier quota reached: the game falls back to the on-device builder
    const j = g.data || {};
    if (!g.ok) return res.status(502).json({ error: 'upstream', status: g.status, model: g.model, reason: g.reason });
    const cand = (j.candidates || [])[0];
    if ((j.promptFeedback && j.promptFeedback.blockReason) || !cand || cand.finishReason === 'SAFETY' || cand.finishReason === 'PROHIBITED_CONTENT') return res.status(200).json({ error: 'refused' });
    const txt = ((cand.content && cand.content.parts) || []).map(p => p.text || '').join('');
    const data = JSON.parse(txt.slice(txt.indexOf('{'), txt.lastIndexOf('}') + 1));
    const questions = (Array.isArray(data.questions) ? data.questions : []).filter(q => q && typeof q.q === 'string' && Array.isArray(q.options) && q.options.length === 4
      && Number.isInteger(q.answer) && q.answer >= 0 && q.answer < 4).slice(0, count)
      .map(q => ({ q: clip(q.q, 400), options: q.options.map(o => clip(o, 160)), answer: q.answer, explain: clip(q.explain, 400), topic: clip(q.topic, 40) }));
    if (!questions.length) return res.status(502).json({ error: 'empty' });
    return res.status(200).json({ careerHook: clip(data.careerHook, 200), questions, model: g.model });
  } catch (e) {
    return res.status(502).json({ error: 'failed' });
  }
}
