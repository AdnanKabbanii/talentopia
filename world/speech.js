// NPC voices (browser Web Speech API) + lip sync. Mouth shapes come from the text itself (letters -> visemes) on an estimated
// per-word timeline. When the browser reports word boundaries during speech, the timeline is re-anchored to the real audio,
// so the mouth stays on the word being spoken. With voice off, the same timeline drives the mouth silently.
const FEMALE = /samantha|karen|moira|tessa|fiona|victoria|serena|kate|susan|zira|aria|jenny|libby|sonia|female|natasha|catherine|allison|ava|joelle|nicky|martha|emma|sara/i;
const MALE = /daniel|alex|fred|tom|oliver|arthur|aaron|david|guy|ryan|male|george|rishi|gordon|reed|evan|nathan|james|thomas|lee/i;

export class Speech {
  constructor() {
    this.synth = typeof window !== 'undefined' && window.speechSynthesis ? window.speechSynthesis : null;
    let pref = null; try { pref = localStorage.getItem('talentopiaVoice'); } catch (e) {}
    this.enabled = !!this.synth && pref !== 'off';
    this.voices = []; this.cur = null;
    const load = () => { this.voices = this.synth ? this.synth.getVoices().filter(v => /^en(-|_|$)/i.test(v.lang)) : []; };
    if (this.synth) { load(); this.synth.addEventListener ? this.synth.addEventListener('voiceschanged', load) : (this.synth.onvoiceschanged = load); }
  }
  get available() { return !!this.synth; }
  setEnabled(on) { this.enabled = on && !!this.synth; try { localStorage.setItem('talentopiaVoice', on ? 'on' : 'off'); } catch (e) {} if (!on) this.stopAudio(); }
  // rank voices by how natural they sound: neural/natural (Edge, Chrome), premium/enhanced (Apple), Google network voices,
  // then everything else; novelty and old robotic voices are pushed to the bottom
  score(v) {
    const n = v.name; let s = 0;
    if (/natural|neural/i.test(n)) s += 100; if (/premium/i.test(n)) s += 85; if (/enhanced/i.test(n)) s += 70;
    if (/online/i.test(n)) s += 35; if (/^google/i.test(n)) s += 40; if (/siri/i.test(n)) s += 60;
    if (/ava|zoe|samantha|aria|jenny|emma|sonia|libby|andrew|brian|guy|ryan|evan|nathan|serena|daniel/i.test(n)) s += 12;
    if (/en[-_](us|gb)/i.test(v.lang)) s += 6;
    if (/albert|bad news|bahh|bells|boing|bubbles|cellos|good news|jester|organ|superstar|trinoids|whisper|wobble|zarvox|ralph|junior|kathy|fred|grandma|grandpa|eddy|flo|reed|rocko|sandy|shelley/i.test(n)) s -= 200;
    return s;
  }
  pick(gender, seed = 0) {
    const pool = this.voices.filter(v => (gender === 'f' ? FEMALE : MALE).test(v.name) && !(gender === 'f' ? MALE : FEMALE).test(v.name));
    const list = (pool.length ? pool : this.voices).slice().sort((a, b) => this.score(b) - this.score(a));
    if (!list.length) return null;
    // vary voices between characters, but only among the best-sounding ones
    const top = list.filter(v => this.score(v) >= this.score(list[0]) - 8);
    return top[seed % top.length];
  }
  stopAudio() { if (this.synth) try { this.synth.cancel(); } catch (e) {} }
  // returns a line player: { update(dt) -> {jawOpen, mouthO, mouthE, word, done}, stop() }
  say(text, { gender = 'f', seed = 0, rate = 1, pitch = 1 } = {}) {
    this.stop();
    const plain = text.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
    const line = new Line(plain, rate);
    if (this.enabled && plain) {
      const u = new SpeechSynthesisUtterance(plain); const v = this.pick(gender, seed);
      const natural = v && this.score(v) >= 60; // neural voices already sound warm: keep them close to neutral
      if (v) u.voice = v; u.rate = rate * (natural ? 0.97 : 0.93); u.pitch = natural ? 1 + (pitch - 1) * 0.4 : Math.min(1.25, pitch * 1.04); u.volume = 0.9; u.lang = v ? v.lang : 'en-GB';
      u.onstart = () => { line.audio = true; line.t = 0; };
      u.onboundary = (e) => { if (e.name === 'word' || e.name === undefined) line.anchor(e.charIndex); };
      u.onend = u.onerror = () => { line.ended = true; };
      line.audioPending = true; line.utt = u;
      try { this.synth.cancel(); this.synth.speak(u); } catch (e) { line.audioPending = false; }
      // if speech never starts (no voices / blocked), fall back to the silent timeline
      setTimeout(() => { if (!line.audio) line.audioPending = false; }, 900);
    }
    this.cur = line; return line;
  }
  stop() { if (this.cur) { this.cur.stopped = true; this.cur = null; } this.stopAudio(); }
}

// letter -> viseme weights (jawOpen, mouthO, mouthE). Closed lips for m/b/p.
function vis(ch) {
  switch (ch) {
    case 'a': return [0.62, 0.05, 0.15];
    case 'e': return [0.32, 0, 0.62];
    case 'i': case 'y': return [0.22, 0, 0.72];
    case 'o': return [0.38, 0.75, 0];
    case 'u': case 'w': case 'q': return [0.2, 0.85, 0];
    case 'm': case 'b': case 'p': return [0, 0, 0];
    case 'f': case 'v': return [0.08, 0, 0.3];
    case 's': case 'z': case 'c': case 'x': case 't': case 'd': case 'n': return [0.14, 0, 0.35];
    case 'r': case 'l': return [0.22, 0.25, 0.1];
    case 'h': return [0.3, 0, 0.1];
    default: return [0.16, 0.05, 0.12];
  }
}

class Line {
  constructor(text, rate) {
    this.text = text; this.t = 0; this.words = []; let tt = 0; const re = /\S+/g; let m;
    while ((m = re.exec(text))) {
      const w = m[0].toLowerCase().replace(/[^a-z']/g, ''); const syl = Math.max(1, (w.match(/[aeiouy]+/g) || []).length);
      const d = (0.11 + syl * 0.17) / rate; const pause = /[,;:]$/.test(m[0]) ? 0.2 / rate : /[.!?]$/.test(m[0]) ? 0.38 / rate : 0.04 / rate;
      this.words.push({ start: tt, d, char: m.index, letters: w.replace(/(.)\1+/g, '$1') || 'a', raw: m[0] }); tt += d + pause;
    }
    this.total = tt; this.audio = false; this.audioPending = false; this.ended = false; this.stopped = false; this.wi = 0;
  }
  anchor(charIndex) { // the browser says word at charIndex is starting now: jump the timeline there
    let i = this.words.findIndex(w => w.char >= charIndex); if (i < 0) i = this.words.length - 1;
    if (i >= 0) this.t = this.words[i].start;
  }
  get done() {
    if (this.stopped) return true;
    if (this.audio || this.audioPending) return this.ended && this.t > 0.2;
    return this.t >= this.total;
  }
  update(dt) {
    const out = { jawOpen: 0, mouthO: 0, mouthE: 0, word: -1 };
    if (this.stopped) return out;
    if (this.audioPending && !this.audio) return out; // waiting for the voice to start
    // with audio, never run ahead of the last word by more than its duration (boundary events pull us forward)
    this.t += dt; if (this.audio && !this.ended) this.t = Math.min(this.t, this.total);
    if (this.audio && this.ended) return out;
    let wi = -1; for (let i = 0; i < this.words.length; i++) if (this.t >= this.words[i].start) wi = i; else break;
    out.word = wi; if (wi < 0) return out;
    const w = this.words[wi], u = (this.t - w.start) / w.d; if (u > 1) return out; // pause between words
    const L = w.letters, f = u * L.length, k = Math.min(L.length - 1, Math.floor(f)), fr = f - k;
    const a = vis(L[k]), b = vis(L[Math.min(L.length - 1, k + 1)]), env = Math.sin(Math.min(1, u) * Math.PI) * 0.35 + 0.65;
    out.jawOpen = (a[0] + (b[0] - a[0]) * fr) * env; out.mouthO = (a[1] + (b[1] - a[1]) * fr) * env; out.mouthE = (a[2] + (b[2] - a[2]) * fr) * env;
    return out;
  }
}
