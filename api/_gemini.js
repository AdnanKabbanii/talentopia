// Shared Gemini caller for api/study.js and api/npc.js (files starting with "_" are not routes on Vercel).
// Tries the configured model, retries once on a temporary 5xx, then falls back to other free Flash models.
// Remembers the model that last answered and tries it first next time.
// Returns { ok, status, data, model, reason } where reason is Google's error status/message (never contains the key).
const BASE = 'https://generativelanguage.googleapis.com/v1beta/models/';
export const MODELS = [process.env.GEMINI_MODEL, 'gemini-flash-latest', 'gemini-flash-lite-latest', 'gemini-2.5-flash'].filter((m, i, a) => m && a.indexOf(m) === i);
const sleep = ms => new Promise(r => setTimeout(r, ms));
let preferred = null; // the model that last answered (kept while this serverless instance stays warm)

export async function gemini(key, body) {
  let last = { ok: false, status: 0, data: null, model: null, reason: 'no model tried' };
  const order = preferred ? [preferred, ...MODELS.filter(m => m !== preferred)] : MODELS;
  for (const model of order) {
    for (let attempt = 0; attempt < 2; attempt++) {
      let r, data = null;
      try {
        r = await fetch(BASE + encodeURIComponent(model) + ':generateContent', { method: 'POST', headers: { 'content-type': 'application/json', 'x-goog-api-key': key }, body: JSON.stringify(body) });
        data = await r.json().catch(() => null);
      } catch (e) { last = { ok: false, status: 0, data: null, model, reason: 'network' }; break; }
      const reason = data && data.error ? `${data.error.status || r.status}: ${String(data.error.message || '').slice(0, 160)}` : '';
      last = { ok: r.ok, status: r.status, data, model, reason };
      if (r.ok) { preferred = model; return last; }
      if (r.status === 429) return last;                                  // the free quota is used up
      if (r.status >= 400 && r.status < 500 && r.status !== 404) return last; // bad key / bad request: another model won't help
      if (r.status >= 500 && attempt === 0) { await sleep(800); continue; } // temporary overload: retry once
      break;                                                              // 404 (model not available) or second 5xx: next model
    }
  }
  return last;
}
