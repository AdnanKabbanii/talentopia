// Optional AI dialogue for Talentopia NPCs (Vercel serverless function).
// Disabled unless the ANTHROPIC_API_KEY environment variable is set on the Vercel project. With no key, GET returns
// { enabled: false } and the game hides the "Ask your own question" choice, so scripted dialogue is used.
// Uses raw fetch because the site is a static, no-build project (no package.json / SDK install).
const MODEL = 'claude-opus-5-5';
const clip = (s, n) => String(s || '').replace(/[\u0000-\u001f]/g, ' ').slice(0, n);

export default async function handler(req, res) {
  const key = process.env.ANTHROPIC_API_KEY;
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'GET') return res.status(200).json({ enabled: !!key });
  if (req.method !== 'POST') return res.status(405).json({ error: 'method' });
  if (!key) return res.status(503).json({ error: 'not configured' });

  const b = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  const name = clip(b.name, 40), role = clip(b.role, 60), building = clip(b.building, 40), message = clip(b.message, 280).trim();
  if (!message) return res.status(400).json({ error: 'empty' });
  const history = (Array.isArray(b.history) ? b.history : []).slice(-6)
    .filter(m => m && (m.role === 'user' || m.role === 'assistant')).map(m => ({ role: m.role, content: clip(m.content, 600) }));
  // the conversation must start with a user turn and alternate
  while (history.length && history[0].role !== 'user') history.shift();
  const messages = [...history, { role: 'user', content: message }].filter((m, i, a) => i === 0 || m.role !== a[i - 1].role);

  const system = `You are ${name}, a ${role} working at ${building || 'a workplace'} in Talentopia, a 3D city where students explore careers.
Answer the student's questions about your job: daily tasks, skills, education and training routes, challenges and rewards.
Speak in first person, warmly and plainly, in 1 to 3 short sentences (under 60 words) because your reply is spoken aloud. No lists, no markdown, no emojis.
Stay in character and on the topic of careers and your workplace. If asked about something unrelated, gently steer back to your work.
Never ask for or comment on the student's personal details, appearance, or identity, and never judge their suitability for a career.
Give general career information only, not medical, legal or financial advice for their own situation.`;

  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2026-10-21', 'anthropic-beta': 'server-side-fallback-2026-07-01' },
      body: JSON.stringify({ model: MODEL, max_tokens: 1024, system, messages, output_config: { effort: 'low' }, fallbacks: 'default' }),
    });
    const j = await r.json();
    if (!r.ok) return res.status(502).json({ error: 'upstream', status: r.status });
    if (j.stop_reason === 'refusal') return res.status(200).json({ reply: 'That’s not something I can talk about. Ask me anything about my work here!' });
    const reply = (j.content || []).filter(c => c.type === 'text').map(c => c.text).join(' ').trim();
    return res.status(200).json({ reply: reply || null });
  } catch (e) {
    return res.status(502).json({ error: 'failed' });
  }
}
