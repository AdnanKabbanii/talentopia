// Talentopia V2 Milestone E: graphics presets + accessibility settings, saved on this device.
// Presets change resolution cap, shadow quality and range, post effects (ambient occlusion, bloom), and how far people/cars
// are drawn. "Auto" picks by device and keeps the automatic fallbacks (drop effects / lower resolution when the frame rate falls).
export const PRESETS = {
  high: { label: 'High', note: 'Full resolution, soft 4K shadows and glow. For desktops and laptops with good graphics.',
    maxPR: 2, shadow: 4096, shadowRange: 110, ao: false, bloom: true, people: 1, cars: 1, staff: 1 }, // no screen-space AO: it crawled on large floors while moving
  balanced: { label: 'Balanced', note: 'Sharper than Light, 2K shadows and glow, no ambient occlusion. A good middle for most laptops and tablets.',
    maxPR: 1.5, shadow: 2048, shadowRange: 90, ao: false, bloom: true, people: 0.8, cars: 0.8, staff: 0.8 },
  light: { label: 'Light', note: 'Lower resolution, 1K shadows over a short range, no post effects, people and traffic drawn closer. For phones and older computers.',
    maxPR: 1, shadow: 1024, shadowRange: 60, ao: false, bloom: false, people: 0.55, cars: 0.55, staff: 0.6 },
};
const KEY = 'talentopiaSettings';
export function loadSettings() {
  let s = {}; try { s = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) {}
  const reduce = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  return { preset: 'auto', guided: true, reduceMotion: reduce, largeText: false, contrast: false, ...s };
}
export function saveSettings(s) { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {} }
export function resolvePreset(s, isPhone) { return s.preset === 'auto' ? (isPhone ? 'light' : 'high') : s.preset; }

// settings panel; onChange(newSettings) is called on every change
export function openSettings(s, { isPhone, onChange, speech, fpsNow }) {
  const box = document.getElementById('settings'); box.style.display = 'grid';
  const render = () => {
    const eff = resolvePreset(s, isPhone);
    const opt = (k, label, desc) => `<button class="set-opt ${s.preset === k ? 'on' : ''}" data-p="${k}"><b>${label}</b><span>${desc}</span></button>`;
    const tog = (k, label, desc, on) => `<label class="set-tog"><input type="checkbox" data-t="${k}" ${on ? 'checked' : ''}><span><b>${label}</b><em>${desc}</em></span></label>`;
    box.innerHTML = `<div class="card glass set-card" role="dialog" aria-modal="true" aria-labelledby="setTitle">
      <div class="set-head"><h3 id="setTitle">Settings</h3><button class="set-x" aria-label="Close settings">✕</button></div>
      <h4>Graphics</h4>
      <div class="set-grid">${opt('auto', 'Auto', `Chooses for this device (now: ${PRESETS[eff].label}) and lowers effects if it runs slowly.`)}
        ${Object.entries(PRESETS).map(([k, p]) => opt(k, p.label, p.note)).join('')}</div>
      <div class="set-note">Now running at about <b>${Math.round(fpsNow() || 0)} fps</b>.</div>
      <h4>Guidance</h4>
      ${tog('guided', 'Guided view', 'Step-by-step route, a glowing path to your next stop and quick tips. Turn off to explore freely.', s.guided !== false)}
      <h4>Accessibility</h4>
      <label class="set-tog" style="display:block"><b>Camera sensitivity</b><input type="range" min="0.4" max="2" step="0.1" value="${s.camSens || 1}" data-r="camSens" style="width:100%;accent-color:#8D70FF" aria-label="Camera sensitivity"></label>
      ${tog('reduceMotion', 'Reduce motion', 'Calmer camera: no speed zoom, no body lean, a still view behind the start screen.', s.reduceMotion)}
      ${tog('largeText', 'Larger text', 'Bigger text in panels, subtitles and buttons.', s.largeText)}
      ${tog('contrast', 'High-contrast panels', 'Solid panel backgrounds and stronger outlines.', s.contrast)}
      ${speech && speech.available ? tog('voice', 'Character voices', 'Staff speak their lines aloud. Subtitles are always shown.', speech.enabled) : ''}
      <div class="set-note">Controls: WASD or arrows to move, Shift to run, V to walk, R auto-run, E to interact, M map, Space to skip a line, Esc to close.</div>
    </div>`;
    box.querySelector('.set-x').onclick = close;
    box.querySelectorAll('[data-p]').forEach(b => b.onclick = () => { s.preset = b.dataset.p; saveSettings(s); onChange(s); render(); });
    box.querySelectorAll('[data-r]').forEach(r => r.oninput = () => { s[r.dataset.r] = +r.value; saveSettings(s); });
    box.querySelectorAll('[data-t]').forEach(c => c.onchange = () => { const k = c.dataset.t; if (k === 'voice') speech.setEnabled(c.checked); else { s[k] = c.checked; saveSettings(s); onChange(s); } });
    box.querySelector('.set-x').focus();
  };
  const close = () => { box.style.display = 'none'; removeEventListener('keydown', esc, true); };
  const esc = e => { if (e.key === 'Escape') { e.stopPropagation(); close(); } };
  addEventListener('keydown', esc, true);
  box.onclick = e => { if (e.target === box) close(); };
  render();
}
