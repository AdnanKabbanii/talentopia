// Optional AI dialogue for Talentopia NPCs (Vercel serverless function), using Google's Gemini API (Google AI Studio key).
// Disabled unless the GEMINI_API_KEY environment variable is set on the Vercel project (GEMINI_MODEL optionally picks the
// model; default is the latest Flash alias, on the free tier). With no key, GET returns { enabled: false } and the game hides
// the "Ask your own question" choice, so scripted dialogue is used. Talentopia stores nothing here; Google may use free-tier
// requests to improve its products.
// Uses raw fetch because the site is a static, no-build project (no package.json / SDK install).
import { gemini } from './_gemini.js';
const clip = (s, n) => String(s || '').replace(/[\u0000-\u001f]/g, ' ').slice(0, n);

export default async function handler(req, res) {
  const key = process.env.GEMINI_API_KEY;
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'GET') return res.status(200).json({ enabled: !!key });
  if (req.method !== 'POST') return res.status(405).json({ error: 'method' });
  if (!key) return res.status(503).json({ error: 'not configured' });

  const b = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  const name = clip(b.name, 40), role = clip(b.role, 60), building = clip(b.building, 40), message = clip(b.message, 280).trim();
  if (!message) return res.status(400).json({ error: 'empty' });
  const history = (Array.isArray(b.history) ? b.history : []).slice(-6)
    .filter(m => m && (m.role === 'user' || m.role === 'assistant')).map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: clip(m.content, 600) }] }));
  // the conversation must start with a user turn and alternate
  while (history.length && history[0].role !== 'user') history.shift();
  const contents = [...history, { role: 'user', parts: [{ text: message }] }].filter((m, i, a) => i === 0 || m.role !== a[i - 1].role);

  const system = `You are ${name}, a ${role} working at ${building || 'a workplace'} in Talentopia, a 3D city where students explore careers.
Answer the student's questions about your job: daily tasks, skills, education and training routes, challenges and rewards.
Speak in first person, warmly and plainly, in 1 to 3 short sentences (under 60 words) because your reply is spoken aloud. No lists, no markdown, no emojis.
Stay in character and on the topic of careers and your workplace. If asked about something unrelated, gently steer back to your work.
Never ask for or comment on the student's personal details, appearance, or identity, and never judge their suitability for a career.
Give general career information only, not medical, legal or financial advice for their own situation.`;
  const declined = 'That’s not something I can talk about. Ask me anything about my work here!';

  try {
    const g = await gemini(key, { systemInstruction: { parts: [{ text: system }] }, contents, generationConfig: { temperature: 0.8, maxOutputTokens: 2048 } });
    // free-tier quota reached: answer in character instead of failing
    if (g.status === 429) return res.status(200).json({ reply: 'I’m helping a lot of visitors right now. Ask me again in a minute!', busy: true });
    const j = g.data || {};
    if (!g.ok) return res.status(502).json({ error: 'upstream', status: g.status, model: g.model, reason: g.reason });
    const cand = (j.candidates || [])[0];
    if ((j.promptFeedback && j.promptFeedback.blockReason) || !cand || cand.finishReason === 'SAFETY' || cand.finishReason === 'PROHIBITED_CONTENT') return res.status(200).json({ reply: declined });
    const reply = ((cand.content && cand.content.parts) || []).map(p => p.text || '').join(' ').replace(/[*_#`]/g, '').trim();
    return res.status(200).json({ reply: reply || null, model: g.model });
  } catch (e) {
    return res.status(502).json({ error: 'failed' });
  }
}
