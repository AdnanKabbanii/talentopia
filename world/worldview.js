// Talentopia V3 World View: an interactive aerial mode on the real 3D city (not a separate map).
// Levels: whole city → district → building → back to street level with your avatar.
// Touch: one-finger drag pans, pinch zooms, tap selects, double-tap focuses. Mouse: drag pans, wheel zooms, Shift/right-drag rotates.
import * as THREE from 'three';

const CITY_C = new THREE.Vector3(46, 0, 0), CITY_W = 760, CITY_D = 420;
const ease = t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
// profession search: words people type → featured building
const KEYWORDS = {
  hospital: 'doctor nurse medicine medical health hospital surgeon cardiologist pharmacist pharmacy dentist paramedic radiographer anatomy triage',
  bank: 'bank banking finance financial accountant accounting loan investment investor teller money economist credit analyst',
  agency: 'marketing advertising design graphic designer copywriter media brand creative art director social',
  engineering: 'engineer engineering architect architecture civil structural mechanical construction bridge building',
  software: 'software developer programmer coding code computer ai data scientist cyber security tech technology web app',
  kitchen: 'chef cook cooking culinary food restaurant hospitality pastry kitchen',
  store: 'retail store shop business manager entrepreneur sales logistics supply merchandiser cashier',
  court: 'law lawyer legal judge attorney court paralegal justice teacher education social',
  research: 'science scientist chemistry chemist lab research environmental energy sustainability biology physics',
  terminal: 'pilot aviation airport flight air traffic controller cabin crew aircraft mechanic travel',
};

export class WorldView {
  // d: { camera, scene, renderer, canvas, ctx, DISTRICTS, CAREERS, FEATURED(), STATIONS(), playerPos(), setMode(m), getMode(), walkTo(f), travelTo(f), sun, sunTarget, onClose(), toast }
  constructor(d) {
    this.d = d; this.active = false; this.o = { tx: 0, tz: 0, dist: 900, yaw: 0, pitch: 0.95 }; this.goal = null; this.sel = null; this.anim = null;
    this.el = document.getElementById('wv'); this.labels = document.getElementById('wvLabels'); this.sheet = document.getElementById('sheet');
    this.ray = new THREE.Raycaster(); this.v = new THREE.Vector3(); this.buildHighlight();
    this.bind();
  }
  // ------------------------------------------------------------ open / close
  open() {
    if (this.active) return; const d = this.d, cam = d.camera; this.active = true; this.prevMode = d.getMode(); d.setMode('world');
    document.body.classList.add('worldview'); this.el.hidden = false;
    // start from the current camera, expressed as an orbit around the point it looks at
    const fwd = new THREE.Vector3(); cam.getWorldDirection(fwd); const p = d.playerPos(); const tgt = p ? p.clone() : CITY_C.clone();
    const off = cam.position.clone().sub(tgt); this.o = { tx: tgt.x, tz: tgt.z, dist: off.length(), yaw: Math.atan2(off.x, off.z), pitch: Math.asin(Math.min(1, Math.max(-1, off.y / Math.max(0.01, off.length())))) };
    this.returnOrbit = { ...this.o };
    this.fog = { near: d.scene.fog.near, far: d.scene.fog.far }; this.camFar = cam.far; cam.far = 6000; cam.updateProjectionMatrix();
    this.renderLabels(); this.fit(1.7); this.closeSheet(true);
    document.getElementById('wvSearch').value = ''; this.results([]);
  }
  close(after) {
    if (!this.active) return; const d = this.d; this.closeSheet(true); this.highlight(null); this.sel = null;
    const back = this.returnOrbit; const p = d.playerPos(); if (p) { back.tx = p.x; back.tz = p.z; }
    this.flyTo(back, 1.2, () => {
      this.active = false; this.el.hidden = true; document.body.classList.remove('worldview'); this.labels.innerHTML = '';
      d.scene.fog.near = this.fog.near; d.scene.fog.far = this.fog.far; d.camera.far = this.camFar; d.camera.clearViewOffset(); d.camera.updateProjectionMatrix(); this.offK = 0;
      d.setMode('walk'); d.onClose && d.onClose(); after && after();
    });
  }
  // ------------------------------------------------------------ camera
  fitDist(w, h) { const cam = this.d.camera, vf = THREE.MathUtils.degToRad(cam.fov), hf = 2 * Math.atan(Math.tan(vf / 2) * cam.aspect); return Math.max((h / 2) / Math.tan(vf / 2) * 1.15, (w / 2) / Math.tan(hf / 2)) * 1.05; }
  // portrait phones: turn the view 90° so the city's long east-west axis runs up the screen
  get portrait() { return innerHeight > innerWidth * 1.1; }
  span(w, h, yaw = this.o.yaw) { return Math.abs(Math.sin(yaw)) > 0.7 ? [h, w] : [w, h]; }
  fit(dur = 1.2) { this.level = 'city'; this.selDistrict = this.selBuilding = null; this.highlight(null); const yaw = this.portrait ? Math.PI / 2 : 0, [w, h] = this.span(CITY_W, CITY_D * 1.2, yaw);
    this.flyTo({ tx: CITY_C.x, tz: CITY_C.z + (this.portrait ? 0 : 40), dist: this.fitDist(w, h * (this.portrait ? 0.82 : 1)), yaw, pitch: this.portrait ? 1.12 : 1.0 }, dur); this.setCrumb(); }
  flyTo(g, dur = 1.0, done) { this.anim = { from: { ...this.o }, to: { ...this.o, ...g }, t: 0, dur, done }; }
  update(dt) {
    if (!this.active) return; const o = this.o, cam = this.d.camera;
    if (this.anim) { const a = this.anim; a.start = a.start || performance.now(); a.t = Math.min(1, (performance.now() - a.start) / 1000 / a.dur); const u = ease(a.t);
      let dy = a.to.yaw - a.from.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy));
      o.tx = a.from.tx + (a.to.tx - a.from.tx) * u; o.tz = a.from.tz + (a.to.tz - a.from.tz) * u; o.yaw = a.from.yaw + dy * u; o.pitch = a.from.pitch + (a.to.pitch - a.from.pitch) * u;
      o.dist = Math.exp(Math.log(a.from.dist) + (Math.log(a.to.dist) - Math.log(a.from.dist)) * u); // log-lerp: zooming feels even
      if (a.t >= 1) { this.anim = null; a.done && a.done(); } }
    o.dist = THREE.MathUtils.clamp(o.dist, 3, 2200); o.pitch = THREE.MathUtils.clamp(o.pitch, 0.12, 1.45);
    const cp = Math.cos(o.pitch); cam.position.set(o.tx + Math.sin(o.yaw) * cp * o.dist, Math.sin(o.pitch) * o.dist + 1.5, o.tz + Math.cos(o.yaw) * cp * o.dist);
    cam.lookAt(o.tx, 1.5, o.tz);
    // keep the focus clear of the bottom sheet (phones) or the side sheet (desktop)
    const open = !this.sheet.hidden && this.sheet.classList.contains('open'), W = innerWidth, H = innerHeight, k = this.offK = (this.offK || 0) + ((open ? 1 : 0) - (this.offK || 0)) * Math.min(1, dt * 6);
    if (k > 0.01) { if (W < 761) { const oy = Math.round(H * 0.42 * k); cam.setViewOffset(W, H + oy, 0, oy, W, H); } else { const ox = Math.round(220 * k); cam.setViewOffset(W + ox, H, ox, 0, W, H); } } else cam.clearViewOffset();
    cam.updateProjectionMatrix();
    // atmosphere and shadows follow the aerial view
    const f = this.d.scene.fog; f.near = Math.max(this.fog.near, o.dist * 1.25); f.far = Math.max(this.fog.far, o.dist * 4.5);
    if (this.d.sun) { const s = this.d.sun; s.target.position.set(o.tx, 0, o.tz); s.position.set(o.tx + 88, 160, o.tz + 56); }
    this.placeLabels();
  }
  // ------------------------------------------------------------ labels (HTML, projected from 3D)
  renderLabels() {
    const D = this.d.DISTRICTS;
    this.labels.innerHTML = D.map(x => `<button class="wv-lbl" data-d="${x.id}" style="--c:${x.color}"><i>${x.icon}</i><span><b>${esc(x.name)}</b><em>${esc(x.short)}</em></span></button>`).join('') + `<div class="wv-me" id="wvMe"><span>You</span></div>` +
      this.d.FEATURED().map(f => `<button class="wv-bld" data-f="${f.id}" style="--c:${(D.find(x => x.id === f.district) || {}).color || '#8D70FF'}"><i></i><span>${esc(f.name)}</span></button>`).join('');
    this.labels.querySelectorAll('[data-d]').forEach(b => b.onclick = e => { e.stopPropagation(); this.focusDistrict(b.dataset.d); });
    this.labels.querySelectorAll('[data-f]').forEach(b => b.onclick = e => { e.stopPropagation(); this.focusBuilding(b.dataset.f); });
  }
  placeLabels() {
    const cam = this.d.camera, W = innerWidth, H = innerHeight, o = this.o; const v = this.v;
    const showBld = o.dist < 520, showDist = o.dist > 140;
    this.labels.querySelectorAll('[data-d]').forEach(b => { const x = this.d.DISTRICTS.find(q => q.id === b.dataset.d); v.set(x.label[0], 30, x.label[1]).project(cam);
      const on = v.z < 1 && Math.abs(v.x) < 1.1 && Math.abs(v.y) < 1.1 && showDist && !(this.level !== 'city' && this.selDistrict === x.id); b.style.display = on ? '' : 'none'; if (on) b.style.transform = `translate(${(v.x + 1) / 2 * W}px,${(1 - v.y) / 2 * H}px) translate(-50%,-50%)`;
      b.classList.toggle('dim', !!this.selDistrict && this.selDistrict !== x.id); b.classList.toggle('compact', W < 600 && (this.level === 'city' || o.dist > 700)); });
    this.labels.querySelectorAll('[data-f]').forEach(b => { const f = this.d.FEATURED().find(q => q.id === b.dataset.f); if (!f) { b.style.display = 'none'; return; }
      v.set((f.x0 + f.x1) / 2, (f.gfH || 5) + 10, (f.z0 + f.z1) / 2).project(cam); const on = showBld && v.z < 1 && Math.abs(v.x) < 1.05 && Math.abs(v.y) < 1.05;
      b.style.display = on ? '' : 'none'; if (on) b.style.transform = `translate(${(v.x + 1) / 2 * W}px,${(1 - v.y) / 2 * H}px) translate(-50%,-100%)`; b.classList.toggle('on', this.selBuilding === f.id); });
    const me = document.getElementById('wvMe'), p = this.d.playerPos(); if (me && p) { v.set(p.x, p.y + 2, p.z).project(cam); const on = v.z < 1 && Math.abs(v.x) < 1 && Math.abs(v.y) < 1; me.style.display = on ? '' : 'none'; if (on) me.style.transform = `translate(${(v.x + 1) / 2 * W}px,${(1 - v.y) / 2 * H}px) translate(-50%,-100%)`; }
  }
  // ------------------------------------------------------------ district / building focus
  buildHighlight() {
    const g = new THREE.Group(); g.visible = false; this.hl = g; this.d.scene.add(g);
    this.hlFill = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ color: 0x8d70ff, transparent: true, opacity: 0.12, depthWrite: false })); this.hlFill.rotation.x = -Math.PI / 2; this.hlFill.position.y = 0.6; g.add(this.hlFill);
    this.hlLine = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-.5, 0, -.5), new THREE.Vector3(.5, 0, -.5), new THREE.Vector3(.5, 0, .5), new THREE.Vector3(-.5, 0, .5)]), new THREE.LineBasicMaterial({ color: 0x8d70ff, transparent: true, opacity: 0.9 })); this.hlLine.position.y = 0.8; g.add(this.hlLine);
  }
  highlight(b, color = '#8D70FF') {
    if (!b) { this.hl.visible = false; this.selDistrict = null; return; }
    const [x0, x1, z0, z1] = b; this.hl.visible = true; this.hl.position.set((x0 + x1) / 2, 0, (z0 + z1) / 2); this.hl.scale.set(x1 - x0, 1, z1 - z0);
    this.hlFill.material.color.set(color); this.hlLine.material.color.set(color);
  }
  focusDistrict(id) {
    const x = this.d.DISTRICTS.find(q => q.id === id); if (!x) return; const [x0, x1, z0, z1] = x.bounds;
    this.level = 'district'; this.selDistrict = id; this.selBuilding = null; this.highlight(x.bounds, x.color);
    const [w, h] = this.span(x1 - x0 + 30, (z1 - z0) * 1.3); const yaw = this.portrait ? Math.PI / 2 : 0;
    this.flyTo({ tx: (x0 + x1) / 2 + (this.portrait ? 25 : 0), tz: (z0 + z1) / 2 + (this.portrait ? 0 : 20), dist: this.fitDist(...this.span(x1 - x0 + 30, (z1 - z0) * 1.3, yaw)), yaw, pitch: 0.92 }, 1.1);
    const blds = this.d.FEATURED().filter(f => f.district === id);
    this.openSheet(`<div class="sh-head"><span class="sh-ic" style="--c:${x.color}">${x.icon}</span><div><b>${esc(x.name)}</b><em>${esc(x.short)}</em></div></div>
      ${blds.length ? blds.map(f => { const c = this.d.CAREERS[f.id]; return `<button class="sh-item" data-f="${f.id}"><span><b>${esc(f.name)}</b><em>${c ? esc(c.roles.slice(0, 3).map(r => r[0]).join(' · ')) : 'Workplace'}</em></span><i>›</i></button>`; }).join('')
        : `<p class="sh-note">Buildings here are not open to visitors yet. Featured workplaces with real interiors are in the other districts.</p>`}
      <div class="sh-row"><button class="btn-glass" data-fit>Whole city</button></div>`, `district:${id}`);
    this.setCrumb(x.name);
  }
  focusBuilding(fid) {
    const f = this.d.FEATURED().find(q => q.id === fid); if (!f) return; const x = this.d.DISTRICTS.find(q => q.id === f.district) || {};
    this.level = 'building'; this.selBuilding = fid; this.selDistrict = f.district; this.highlight([f.x0 - 2, f.x1 + 2, f.z0 - 2, f.z1 + 2], x.color || '#8D70FF');
    const cx = (f.x0 + f.x1) / 2, cz = (f.z0 + f.z1) / 2, e = f.entrance || { x: cx, z: cz };
    this.flyTo({ tx: cx, tz: cz, dist: Math.max(55, Math.max(f.x1 - f.x0, f.z1 - f.z0) * 1.9), yaw: Math.atan2(e.x - cx, e.z - cz), pitch: 0.62 }, 1.1);
    const c = this.d.CAREERS[fid], st = this.d.STATIONS().filter(s => s.building === fid && !/^career/.test(s.id));
    this.openSheet(`<div class="sh-head"><span class="sh-ic" style="--c:${x.color}">${x.icon || '◆'}</span><div><b>${esc(f.name)}</b><em>${esc(x.name || '')} · ${esc(x.short || '')}</em></div></div>
      ${c ? `<div class="sh-tags">${c.roles.slice(0, 4).map(r => `<span>${esc(r[0])}</span>`).join('')}</div>` : ''}
      <p class="sh-note">${st.length} hands-on experience${st.length === 1 ? '' : 's'} inside: ${esc(st.slice(0, 3).map(s => s.label.split(' · ')[0]).join(', '))}${st.length > 3 ? '…' : ''}</p>
      <div class="sh-row"><button class="btn-glass" data-walk="${fid}">Walk there</button><button class="btn-primary" data-travel="${fid}">Fast travel</button></div>
      <div class="sh-row"><button class="linkbtn" data-back="${f.district}">Back to ${esc(x.name || 'district')}</button></div>`, `building:${fid}`);
    this.setCrumb(x.name, f.name);
  }
  setCrumb(a, b) { const el = document.getElementById('wvCrumb'); el.innerHTML = `<button data-fit>Talentopia</button>${a ? `<i>›</i><button data-cd="${this.selDistrict}">${esc(a)}</button>` : ''}${b ? `<i>›</i><span>${esc(b)}</span>` : ''}`;
    el.querySelector('[data-fit]').onclick = () => { this.closeSheet(); this.fit(); }; const cd = el.querySelector('[data-cd]'); if (cd) cd.onclick = () => this.focusDistrict(cd.dataset.cd); }
  // ------------------------------------------------------------ bottom sheet
  openSheet(html, key) {
    const s = this.sheet; s.innerHTML = `<div class="sh-grab"></div>${html}`; s.dataset.key = key; s.hidden = false; requestAnimationFrame(() => s.classList.add('open'));
    s.querySelectorAll('[data-f]').forEach(b => b.onclick = () => this.focusBuilding(b.dataset.f));
    s.querySelectorAll('[data-fit]').forEach(b => b.onclick = () => { this.closeSheet(); this.fit(); });
    s.querySelectorAll('[data-back]').forEach(b => b.onclick = () => this.focusDistrict(b.dataset.back));
    s.querySelectorAll('[data-walk]').forEach(b => b.onclick = () => { const f = this.d.FEATURED().find(q => q.id === b.dataset.walk); this.close(() => this.d.walkTo(f)); });
    s.querySelectorAll('[data-travel]').forEach(b => b.onclick = () => { const f = this.d.FEATURED().find(q => q.id === b.dataset.travel); this.close(() => this.d.travelTo(f)); });
  }
  closeSheet(instant) { const s = this.sheet; s.classList.remove('open'); if (instant) s.hidden = true; else setTimeout(() => { if (!s.classList.contains('open')) s.hidden = true; }, 260); }
  // ------------------------------------------------------------ search
  search(q) {
    q = q.trim().toLowerCase(); if (!q) return this.results([]);
    const out = [];
    for (const f of this.d.FEATURED()) {
      const c = this.d.CAREERS[f.id], x = this.d.DISTRICTS.find(d => d.id === f.district) || {};
      const role = c && c.roles.find(r => r[0].toLowerCase().includes(q));
      const kw = (KEYWORDS[f.id] || '').split(' ').find(w => w.startsWith(q) || (q.length > 3 && q.includes(w)));
      if (role || kw || f.name.toLowerCase().includes(q) || (x.name || '').toLowerCase().includes(q) || (x.short || '').toLowerCase().includes(q))
        out.push({ f, x, why: role ? role[0] : kw ? kw[0].toUpperCase() + kw.slice(1) : x.short });
    }
    this.results(out.slice(0, 6), q);
  }
  results(list, q) {
    const el = document.getElementById('wvResults'); if (!list.length) { el.innerHTML = q ? `<div class="wv-none">No match for “${esc(q)}”. Try doctor, banking, design, chef or engineer.</div>` : ''; el.hidden = !q; return; }
    el.hidden = false; el.innerHTML = list.map(r => `<button data-f="${r.f.id}"><i style="--c:${r.x.color}">${r.x.icon || '◆'}</i><span><b>${esc(r.why)}</b><em>${esc(r.f.name)} · ${esc(r.x.name || '')}</em></span></button>`).join('');
    el.querySelectorAll('[data-f]').forEach(b => b.onclick = () => { el.hidden = true; document.getElementById('wvSearch').blur(); this.focusBuilding(b.dataset.f); });
  }
  // ------------------------------------------------------------ input
  pick(cx, cy) {
    const cam = this.d.camera; this.ray.setFromCamera({ x: cx / innerWidth * 2 - 1, y: -(cy / innerHeight) * 2 + 1 }, cam);
    const hit = this.ray.intersectObjects(this.d.ctx.clickMeshes, false)[0];
    if (hit) { const u = hit.object.userData; if (u.featured) return this.focusBuilding(u.featured);
      const x = this.d.DISTRICTS.find(q => q.id === u.district);
      this.openSheet(`<div class="sh-head"><span class="sh-ic" style="--c:${x ? x.color : '#8D70FF'}">${x ? x.icon : '◆'}</span><div><b>${esc(u.building)}</b><em>${esc(x ? x.name : 'Talentopia')}</em></div></div><p class="sh-note">Not open to visitors yet. Featured workplaces have a glowing name tag.</p>${x ? `<div class="sh-row"><button class="btn-glass" data-back="${x.id}">See ${esc(x.name)}</button></div>` : ''}`, 'bld'); return; }
    const g = this.ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), new THREE.Vector3()); if (!g) return;
    const x = this.d.DISTRICTS.find(q => { const [x0, x1, z0, z1] = q.bounds; return g.x >= x0 && g.x <= x1 && g.z >= z0 && g.z <= z1; });
    if (x && this.level === 'city') this.focusDistrict(x.id);
  }
  bind() {
    const cv = this.d.canvas, pts = new Map(); let last = null, pinch = null, moved = 0, lastTap = 0, rot = false;
    cv.addEventListener('pointerdown', e => { if (!this.active) return; pts.set(e.pointerId, [e.clientX, e.clientY]); moved = 0; rot = e.shiftKey || e.button === 2; last = [e.clientX, e.clientY];
      if (pts.size === 2) { const [a, b] = [...pts.values()]; pinch = { d: Math.hypot(a[0] - b[0], a[1] - b[1]), dist: this.o.dist }; } this.anim = null; }, true);
    addEventListener('pointermove', e => { if (!this.active || !pts.has(e.pointerId)) return; pts.set(e.pointerId, [e.clientX, e.clientY]);
      if (pts.size === 2 && pinch) { const [a, b] = [...pts.values()]; const d = Math.hypot(a[0] - b[0], a[1] - b[1]); this.o.dist = pinch.dist * pinch.d / Math.max(20, d); moved = 99; return; }
      const dx = e.clientX - last[0], dy = e.clientY - last[1]; last = [e.clientX, e.clientY]; moved += Math.abs(dx) + Math.abs(dy);
      if (rot) { this.o.yaw -= dx * 0.006; this.o.pitch = THREE.MathUtils.clamp(this.o.pitch + dy * 0.004, 0.2, 1.4); return; }
      // pan in the ground plane, scaled so the city moves with your finger
      const k = this.o.dist * Math.tan(THREE.MathUtils.degToRad(this.d.camera.fov) / 2) * 2 / innerHeight, s = Math.sin(this.o.yaw), c = Math.cos(this.o.yaw);
      this.o.tx -= (dx * c + dy * s / Math.max(0.35, Math.sin(this.o.pitch))) * k; this.o.tz -= (-dx * s + dy * c / Math.max(0.35, Math.sin(this.o.pitch))) * k;
      this.o.tx = THREE.MathUtils.clamp(this.o.tx, -380, 470); this.o.tz = THREE.MathUtils.clamp(this.o.tz, -260, 300); });
    const up = e => { if (!this.active || !pts.has(e.pointerId)) return; pts.delete(e.pointerId); if (pts.size < 2) pinch = null;
      if (moved < 8 && pts.size === 0 && e.target === cv) { const now = performance.now();
        if (now - lastTap < 320) { this.zoomAt(e.clientX, e.clientY); lastTap = 0; } else { lastTap = now; const x = e.clientX, y = e.clientY; setTimeout(() => { if (lastTap && performance.now() - lastTap >= 300) this.pick(x, y); }, 320); } } };
    addEventListener('pointerup', up); addEventListener('pointercancel', up);
    cv.addEventListener('wheel', e => { if (!this.active) return; e.preventDefault(); e.stopImmediatePropagation(); this.anim = null; this.o.dist *= 1 + Math.sign(e.deltaY) * Math.min(0.25, Math.abs(e.deltaY) * 0.0012); }, { passive: false, capture: true });
    cv.addEventListener('contextmenu', e => { if (this.active) e.preventDefault(); });
    document.getElementById('wvFit').onclick = () => { this.closeSheet(); this.fit(); };
    document.getElementById('wvClose').onclick = () => this.close();
    document.getElementById('wvZin').onclick = () => this.flyTo({ dist: this.o.dist * 0.6 }, 0.35);
    document.getElementById('wvZout').onclick = () => this.flyTo({ dist: this.o.dist / 0.6 }, 0.35);
    const sIn = document.getElementById('wvSearch'); sIn.addEventListener('input', () => this.search(sIn.value)); sIn.addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Escape') { sIn.value = ''; this.results([]); sIn.blur(); } if (e.key === 'Enter') { const b = document.querySelector('#wvResults [data-f]'); if (b) b.click(); } });
    // swipe the sheet down to dismiss
    let sy = null; this.sheet.addEventListener('touchstart', e => { sy = e.touches[0].clientY; }, { passive: true });
    this.sheet.addEventListener('touchmove', e => { if (sy === null) return; const dy = e.touches[0].clientY - sy; if (dy > 0 && this.sheet.scrollTop <= 0) this.sheet.style.transform = `translateY(${dy}px)`; }, { passive: true });
    this.sheet.addEventListener('touchend', e => { const dy = parseFloat((this.sheet.style.transform.match(/[\d.]+/) || [0])[0]); this.sheet.style.transform = ''; if (dy > 80) this.closeSheet(); sy = null; });
  }
  zoomAt(cx, cy) { const cam = this.d.camera; this.ray.setFromCamera({ x: cx / innerWidth * 2 - 1, y: -(cy / innerHeight) * 2 + 1 }, cam); const g = this.ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), new THREE.Vector3()); if (g) this.flyTo({ tx: g.x, tz: g.z, dist: Math.max(60, this.o.dist * 0.45) }, 0.6); }
  key(k) { if (!this.active) return false; if (k === 'escape') { if (!this.sheet.hidden) this.closeSheet(); else this.close(); return true; } if (k === 'f') { this.fit(); return true; } return false; }
}
