/* TALENTOPIA · Interior engine
   Shared code for walkable district interiors: HUD, avatar + editor, walking with
   collisions and doorway routing, NPC dialogue and questions, objectives, the NOVA
   guide, focus panels (custom camera + pointer hooks) and the end-of-shift badge.
   Each district file (medcity.js, capitalbay.js, …) calls TalentopiaInterior.register(cfg). */
(()=>{
'use strict';
window.TalentopiaInteriors={};
const App=window.TalentopiaApp;
if(!App||typeof THREE==='undefined'){window.TalentopiaInterior=null;return;}
const {renderer,progress,store,updateXP,toast}=App;
const $=id=>document.getElementById(id);
const world=renderer.domElement;
const C={violet:0x945cff,midnight:0x0c1031,cyan:0x67dff0,lilac:0xefe9ff,blush:0xf7a9d8,mint:0x8de8c3,gold:0xffd59c,cloud:0xfafbff};
const M=(c,o={})=>new THREE.MeshStandardMaterial({color:c,roughness:.55,metalness:.06,...o});
const glow=c=>M(c,{emissive:c,emissiveIntensity:.9});
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

/* ------------------------------------------------------------------ UI */
const style=document.createElement('style');
style.textContent=`
body.in-ix #toast{bottom:auto;top:76px}
body.in-ix #left,body.in-ix #headline,body.in-ix #bottom,body.in-ix #minimapInfo,body.in-ix #mission,body.in-ix #scenehint,body.in-ix #topbar,body.in-ix #vignette{display:none!important}
#ixHud{position:fixed;inset:0;z-index:9;pointer-events:none;display:none}body.in-ix #ixHud{display:block}#ixHud .mh{pointer-events:auto}
.ix-top{position:absolute;top:16px;left:16px;display:flex;gap:8px;align-items:center;flex-wrap:wrap}
.ix-btn{border:1px solid #c3d0ff48;background:#121a3fd9;backdrop-filter:blur(14px);border-radius:999px;padding:10px 14px;color:#FAFBFF;font-size:12px;font-weight:750}.ix-btn:hover{border-color:#945CFF}
.ix-title{color:#FAFBFF;text-shadow:0 2px 12px #0C1031;font-weight:850;font-size:15px;margin-left:4px}.ix-title small{display:block;font-size:10px;letter-spacing:1.6px;color:#c9b8ff;font-weight:800;text-transform:uppercase}
#ixObj{position:absolute;top:16px;right:16px;width:262px;border-radius:18px;padding:14px 16px;background:#0f1638e0;border:1px solid #d9e4ff2b;backdrop-filter:blur(16px);color:#FAFBFF}
#ixHud .k{font-size:10px;letter-spacing:1.8px;color:#c9b8ff;font-weight:800;text-transform:uppercase}
#ixObj .cur{display:none}#ixObj ol{list-style:none;margin:10px 0 0;padding:0;display:grid;gap:8px}
#ixObj li{display:flex;gap:9px;font-size:12px;color:#aab6da;line-height:1.35}#ixObj li i{font-style:normal;flex:0 0 20px;height:20px;border-radius:50%;display:grid;place-items:center;font-size:11px;background:#ffffff12;border:1px solid #ffffff2a}
#ixObj li.now{color:#FAFBFF;font-weight:700}#ixObj li.now i{background:#945CFF;border-color:#945CFF}#ixObj li.done{color:#8DE8C3}#ixObj li.done i{background:#8DE8C333;border-color:#8DE8C3}
#ixNova{position:absolute;left:50%;bottom:92px;transform:translateX(-50%);width:max-content;max-width:min(540px,calc(100vw - 32px));display:flex;gap:10px;align-items:flex-start;background:#0f1638eb;border:1px solid #67DFF055;border-radius:16px;padding:11px 14px;color:#e6f6ff;font-size:13px;line-height:1.5;backdrop-filter:blur(14px)}#ixNova b{color:#67DFF0}
.nova-dot{flex:0 0 26px;height:26px;border-radius:50%;background:radial-gradient(circle at 35% 35%,#e9fdff,#67DFF0 45%,#945CFF);box-shadow:0 0 16px #67DFF0aa}
#ixPrompt{position:absolute;left:50%;bottom:30px;transform:translateX(-50%);display:none;border:0;border-radius:999px;padding:13px 20px;font-weight:850;font-size:13px;color:#0C1031;background:linear-gradient(110deg,#945CFF,#67DFF0);box-shadow:0 10px 30px #945CFF66;white-space:nowrap}
#ixPrompt kbd{background:#0C103133;border-radius:6px;padding:1px 6px;margin-right:7px;font-family:inherit}
#ixHint{position:absolute;left:16px;bottom:18px;color:#cad6fcb0;font-size:11px}
#ixJoy{position:absolute;left:22px;bottom:26px;width:120px;height:120px;border-radius:50%;background:#ffffff10;border:1px solid #ffffff30;display:none;touch-action:none}#ixJoy span{position:absolute;left:50%;top:50%;width:50px;height:50px;margin:-25px 0 0 -25px;border-radius:50%;background:#945CFFcc;box-shadow:0 0 18px #945CFF88;pointer-events:none}
#ixDialog{position:absolute;left:50%;bottom:20px;transform:translateX(-50%);width:min(620px,calc(100vw - 24px));display:none;background:linear-gradient(145deg,#172344f7,#10182ff7);border:1px solid #d4d9ff5b;border-radius:20px;padding:18px 20px;color:#FAFBFF;box-shadow:0 25px 90px #030922dd;max-height:72vh;overflow:auto}
#ixDialog .who{font-size:10px;letter-spacing:1.8px;font-weight:800;color:#c9b8ff;text-transform:uppercase}#ixDialog .txt{font-size:14px;line-height:1.6;margin:8px 0 4px;color:#e2e8ff}
#ixDialog .opts{display:grid;gap:8px;margin-top:12px}#ixDialog .opts button{text-align:left;border:1px solid #67759c82;color:#e7efff;padding:11px 13px;border-radius:12px;background:#27345a99;font-size:13px;line-height:1.4}
#ixDialog .opts button:hover:not(:disabled){border-color:#945CFF;background:#945CFF33}#ixDialog .opts button.good{background:#24645088;border-color:#8DE8C3;opacity:1}#ixDialog .opts button.bad{background:#6f314d88;border-color:#ff9bb2;opacity:1}
#ixDialog .fb{margin-top:12px;padding:11px 12px;border-radius:12px;background:#153a38;border:1px solid #5ee1ba5c;color:#c6ffeb;font-size:12.5px;line-height:1.55}#ixDialog .fb.warn{background:#4d2936;border-color:#eb9bad78;color:#ffe1eb}
.vitals{display:grid;grid-template-columns:repeat(4,1fr);gap:7px;margin:10px 0}.vitals div{background:#0C1031aa;border:1px solid #ffffff22;border-radius:11px;padding:8px 4px;text-align:center;font-size:10px;color:#a9b5da}.vitals b{display:block;font-size:15px;color:#FAFBFF;margin-top:3px}
#ixEditor,#ixDone{position:absolute;inset:0;display:none;place-items:center;padding:18px}#ixDone{background:#05091bb0;backdrop-filter:blur(8px)}#ixEditor{place-items:center end;padding-right:6vw}
.ix-card{width:min(420px,100%);background:linear-gradient(145deg,#172344f2,#0C1031f2);border:1px solid #d4d9ff5b;border-radius:24px;padding:22px 24px;color:#FAFBFF;box-shadow:0 25px 90px #030922dd;max-height:calc(100vh - 36px);overflow:auto}
.ix-card h2{font-size:24px;letter-spacing:-.8px;margin:6px 0 4px}.ix-card p{font-size:13px;color:#bdc8e6;line-height:1.6}
.ed-row{margin-top:13px}.ed-row label{display:block;font-size:10px;font-weight:800;letter-spacing:1.4px;color:#aab6da;margin-bottom:7px;text-transform:uppercase}
.swatches{display:flex;gap:8px;flex-wrap:wrap}.swatches button{width:32px;height:32px;border-radius:50%;border:2px solid transparent;box-shadow:inset 0 0 0 1px #ffffff40;padding:0}.swatches button.on{border-color:#FAFBFF;box-shadow:0 0 0 2px #945CFF}
.chips{display:flex;gap:6px;flex-wrap:wrap}.chips button{border:1px solid #ffffff30;background:#202c51;color:#e9eeff;border-radius:10px;padding:8px 11px;font-size:12px}.chips button.on{background:#945CFF;border-color:#945CFF;color:#fff}
#edName{width:100%;background:#ffffff0b;border:1px solid #d7dcff26;border-radius:11px;color:#fff;padding:10px 12px;font-size:13px}
.ix-primary{width:100%;padding:13px 16px;border:0;border-radius:13px;background:linear-gradient(110deg,#945CFF,#67DFF0);color:#0C1031;font-size:13px;font-weight:900;margin-top:16px}.ix-primary:disabled{opacity:.45;cursor:not-allowed}
.ix-secondary{width:100%;padding:12px 16px;border-radius:13px;background:#202c51;color:#fff;border:1px solid #9a9bd966;font-size:13px;font-weight:800;margin-top:9px}
#ixPanel{position:absolute;right:16px;top:16px;bottom:16px;width:340px;display:none;flex-direction:column;gap:10px;background:#0f1638eb;border:1px solid #d9e4ff2b;border-radius:20px;padding:16px;color:#FAFBFF;backdrop-filter:blur(16px);overflow:auto}
#ixPanelBody{display:flex;flex-direction:column;gap:10px}#ixPanel h3{font-size:19px;letter-spacing:-.4px;margin:0}
.layers{display:flex;flex-wrap:wrap;gap:6px}.layers button{border:1px solid #ffffff30;background:#202c51;color:#c9d2f0;border-radius:999px;padding:7px 11px;font-size:11px;font-weight:700}.layers button.on{background:#945CFF44;border-color:#945CFF;color:#fff}
.ix-info{background:#0C1031aa;border:1px solid #67DFF040;border-radius:14px;padding:12px;font-size:12px;line-height:1.6;color:#d6e0ff}.ix-info b{color:#FAFBFF}.ix-info>b:first-child{display:block;font-size:15px;margin-bottom:4px}
.ix-task{background:#945CFF1f;border:1px solid #945CFF66;border-radius:14px;padding:12px;font-size:12.5px;line-height:1.55}.ix-task .bar{height:6px;background:#ffffff18;border-radius:99px;margin-top:8px;overflow:hidden}.ix-task .bar div{height:100%;background:linear-gradient(90deg,#945CFF,#67DFF0);transition:width .3s}
.ix-task.ok{background:#8DE8C31f;border-color:#8DE8C388}.ix-task.no{background:#ff9bb21a;border-color:#ff9bb288}
.ix-note{font-size:10px;color:#93a0c8;line-height:1.5}
.ix-metric{display:flex;justify-content:space-between;gap:10px;padding:9px 12px;border:1px solid #ffffff21;background:#101a38;border-radius:11px;font-size:12px}.ix-metric strong{color:#bceeff}
.ix-range label{display:flex;justify-content:space-between;font-size:12px;color:#d5dcf6;margin-bottom:6px}.ix-range input{width:100%;accent-color:#945CFF}
.skills{display:grid;gap:6px;margin:12px 0;text-align:left}.skills div{font-size:12px;background:#ffffff0b;border:1px solid #ffffff1c;border-radius:10px;padding:8px 10px;color:#d6e0ff}
@media (pointer:coarse),(max-width:760px){#ixJoy{display:block}#ixHint{display:none}#ixPrompt{left:auto;right:14px;transform:none;bottom:50px;max-width:calc(100vw - 168px);white-space:normal;text-align:center;line-height:1.3}#ixNova{bottom:166px}}
@media(max-width:760px){.ix-top{top:10px;left:10px;right:10px}.ix-title{display:none}#ixObj{top:58px;left:10px;right:10px;width:auto;padding:10px 12px}#ixObj ol{display:none}#ixObj.open ol{display:grid}#ixObj .cur{display:block;font-size:12.5px;margin-top:3px;font-weight:700}
#ixPanel{left:0;right:0;top:auto;bottom:0;width:auto;max-height:52vh;border-radius:20px 20px 0 0;padding:14px}#ixEditor{place-items:end center;padding:10px}#ixEditor .ix-card{max-height:58vh}.vitals{grid-template-columns:repeat(2,1fr)}}
`;
document.head.appendChild(style);
const hud=document.createElement('div');hud.id='ixHud';
hud.innerHTML=`
<div class="ix-top mh"><button class="ix-btn" id="ixExit">← Exit building</button><button class="ix-btn" id="ixEditBtn">✎ Avatar</button><div class="ix-title"><small id="ixKicker"></small><span id="ixSub"></span></div></div>
<div id="ixObj" class="mh" aria-live="polite"><div class="k">Shift objectives <span id="ixObjCount"></span></div><div class="cur" id="ixCur"></div><ol id="ixObjList"></ol></div>
<div id="ixNova" class="mh"><span class="nova-dot" aria-hidden="true"></span><div id="ixNovaText"></div></div>
<button id="ixPrompt" class="mh"></button>
<div id="ixHint">WASD or arrow keys to walk · click the floor to walk there · E to interact</div>
<div id="ixJoy" class="mh" aria-label="Movement joystick"><span></span></div>
<div id="ixDialog" class="mh" role="dialog" aria-live="polite"></div>
<div id="ixPanel" class="mh"><div id="ixPanelBody"></div><button class="ix-secondary" id="ixPanelBack" style="margin-top:auto">← Back to walking</button></div>
<div id="ixEditor" class="mh"><div class="ix-card">
 <div class="k">Step 1 · Your avatar</div><h2>Create your look</h2><p>Your avatar is a stylized character, never generated from your appearance. It follows you into every building, and you can change it anytime.</p>
 <div class="ed-row"><label for="edName">Display name</label><input id="edName" maxlength="24" placeholder="Future Explorer"></div>
 <div class="ed-row" id="edCharRow" style="display:none"><label>Character</label><div class="chips" id="edChar"></div></div>
 <div class="ed-row"><label>Skin tone</label><div class="swatches" id="edSkin"></div></div>
 <div class="ed-row"><label>Hair style</label><div class="chips" id="edStyle"></div></div>
 <div class="ed-row"><label>Hair colour</label><div class="swatches" id="edHair"></div></div>
 <div class="ed-row"><label>Outfit</label><div class="chips" id="edOutfit"></div></div>
 <button class="ix-primary" id="edDone">Start my shift →</button>
</div></div>
<div id="ixDone" class="mh"><div class="ix-card" style="text-align:center">
 <div class="crestbadge" id="ixDoneIcon" style="width:100px;height:100px;font-size:44px">✦</div>
 <div class="k">Shift complete · badge earned</div><h2 id="ixDoneTitle"></h2>
 <p id="ixDoneText"></p><div class="skills" id="ixDoneSkills"></div>
 <p style="font-size:11px;color:#93a0c8">A discovery badge from an educational simulation. It is not a professional qualification.</p>
 <button class="ix-primary" id="ixDoneCity">Return to Talent City</button><button class="ix-secondary" id="ixDonePass">View my Career Passport</button><button class="ix-secondary" id="ixDoneReplay">Replay the shift</button>
</div></div>`;
document.body.appendChild(hud);

/* ------------------------------------------------------------------ shared 3D helpers */
function roundRectPath(x,X,Y,w,h,r){x.beginPath();if(x.roundRect)x.roundRect(X,Y,w,h,r);else{x.moveTo(X+r,Y);x.arcTo(X+w,Y,X+w,Y+h,r);x.arcTo(X+w,Y+h,X,Y+h,r);x.arcTo(X,Y+h,X,Y,r);x.arcTo(X,Y,X+w,Y,r);x.closePath()}}
function textSprite(text,accent='#945CFF',scale=1,sub=''){
 const cv=document.createElement('canvas');cv.width=512;cv.height=sub?150:120;const x=cv.getContext('2d');
 x.fillStyle='#0f1638e6';roundRectPath(x,8,8,496,cv.height-16,26);x.fill();x.strokeStyle=accent;x.lineWidth=4;x.stroke();
 x.fillStyle='#FAFBFF';x.textAlign='center';x.textBaseline='middle';x.font='bold 42px system-ui,sans-serif';x.fillText(text,256,sub?58:64,460);
 if(sub){x.font='600 28px system-ui,sans-serif';x.fillStyle='#c9b8ff';x.fillText(sub,256,108,460)}
 const t=new THREE.CanvasTexture(cv);t.encoding=THREE.sRGBEncoding;
 const s=new THREE.Sprite(new THREE.SpriteMaterial({map:t,transparent:true}));s.scale.set(2.6*scale,2.6*scale*cv.height/512,1);return s;
}
function panelTexture(title,lines,color,draw){
 const cv=document.createElement('canvas');cv.width=512;cv.height=300;const x=cv.getContext('2d');
 const g=x.createLinearGradient(0,0,512,300);g.addColorStop(0,'#141a4a');g.addColorStop(1,'#0C1031');x.fillStyle=g;x.fillRect(0,0,512,300);
 x.strokeStyle=color;x.lineWidth=6;x.strokeRect(3,3,506,294);x.fillStyle=color;x.font='bold 34px system-ui,sans-serif';x.fillText(title,28,56);
 x.fillStyle='#d6e0ff';x.font='24px system-ui,sans-serif';(lines||[]).forEach((l,i)=>x.fillText(l,28,110+i*42));if(draw)draw(x);
 const t=new THREE.CanvasTexture(cv);t.encoding=THREE.sRGBEncoding;return t;
}
function screen(scene,w,h,tex,x,y,z,ry=0){const p=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({map:tex}));p.position.set(x,y,z);p.rotation.y=ry;scene.add(p);return p}
/* ---------- realistic characters (Mixamo FBX in assets/people/) ----------
   Loaded lazily on first building entry. If the files are missing, the stylized
   primitive people below are used instead, so nothing breaks. */
const PEOPLE=[['woman1','Woman 1'],['woman2','Woman 2'],['woman3','Woman 3'],['man1','Man 1'],['man2','Man 2'],['man3','Man 3']];
const people={tried:false,ready:false,models:{},walk:null,talk:null};const personGroups=[];
const PEOPLE_ENABLED=false; // set to true once the Mixamo .fbx files are in assets/people/
function loadPeople(){if(!PEOPLE_ENABLED||people.tried||!THREE.FBXLoader||!THREE.SkeletonUtils)return;people.tried=true;const L=new THREE.FBXLoader();
 const get=n=>new Promise(res=>{try{L.load('assets/people/'+n+'.fbx',o=>res(o),undefined,()=>res(null))}catch(e){res(null)}});
 Promise.all([...PEOPLE.map(p=>get(p[0])),get('walk'),get('talk')]).then(arr=>{PEOPLE.forEach((p,i)=>{if(arr[i])people.models[p[0]]=arr[i]});
  const w=arr[PEOPLE.length],t=arr[PEOPLE.length+1];if(w&&w.animations[0])people.walk=w.animations[0];if(t&&t.animations[0])people.talk=t.animations[0];
  people.ready=Object.keys(people.models).length>0;if(people.ready)upgradePeople()})}
const hashOf=o=>Math.abs(Math.floor((o.skin||1)*7+(o.hair||3)*13+(o.outfit||5)*3+(o.pants||0)))%997;
function pickModel(o){const names=Object.keys(people.models);if(!names.length)return null;if(o.model&&people.models[o.model])return o.model;
 const fem=o.style==='long'||o.style==='bun';let pool=names.filter(n=>fem?n.startsWith('woman'):n.startsWith('man'));if(!pool.length)pool=names;return pool[hashOf(o)%pool.length]}
function attachModel(g){const o=g.userData.personOpts;if(!o||g.userData.model||!people.ready)return;const name=pickModel(o);if(!name)return;
 const src=people.models[name];const m=THREE.SkeletonUtils.clone(src);m.scale.setScalar(.01);
 m.traverse(c=>{if(c.isMesh){c.castShadow=true;c.receiveShadow=true;c.frustumCulled=false;const fix=mm=>{if(mm&&mm.map)mm.map.encoding=THREE.sRGBEncoding;if(mm)mm.needsUpdate=true};Array.isArray(c.material)?c.material.forEach(fix):fix(c.material)}});
 g.children.forEach(c=>c.visible=false);g.add(m);g.userData.model=m;g.userData.modelName=name;
 const mixer=new THREE.AnimationMixer(m);const acts={};if(src.animations[0]){acts.idle=mixer.clipAction(src.animations[0]);acts.idle.play();acts.idle.time=Math.random()*acts.idle.getClip().duration}
 if(people.walk){acts.walk=mixer.clipAction(people.walk);acts.walk.enabled=true;acts.walk.setEffectiveWeight(0);acts.walk.play()}
 g.userData.mixer=mixer;g.userData.acts=acts;g.userData.moving=0}
function setMoving(g,amt){const a=g.userData.acts;if(!a||!a.walk)return false;const k=g.userData.moving+=((amt>.05?1:0)-g.userData.moving)*.2;a.walk.setEffectiveWeight(k);if(a.idle)a.idle.setEffectiveWeight(1-k);a.walk.timeScale=.6+amt*.6;return true}
function onPeopleReady(){if(!active||!W)return;if(mode==='editor')openEditor();else setAvatar(look())}
function upgradePeople(){personGroups.forEach(attachModel);if(typeof onPeopleReady==='function')onPeopleReady()}
function person(o){
 const g=new THREE.Group();const skin=M(o.skin,{roughness:.7}),top=M(o.outfit),pants=M(o.pants||0x2a3358),hairM=M(o.hair,{roughness:.85}),shoe=M(0x1b1f33);
 const add=(p,geo,mat,x,y,z)=>{const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);p.add(m);return m};
 const limb=(x,y)=>{const piv=new THREE.Group();piv.position.set(x,y,0);g.add(piv);return piv};
 const legL=limb(-.1,.9),legR=limb(.1,.9);
 for(const L of [legL,legR]){add(L,new THREE.CylinderGeometry(.075,.065,.82,12),pants,0,-.41,0);add(L,new THREE.BoxGeometry(.13,.08,.24),shoe,0,-.84,.04)}
 add(g,new THREE.CylinderGeometry(.21,.17,.64,16),top,0,1.22,0).scale.z=.68;
 if(o.coat){add(g,new THREE.CylinderGeometry(.235,.27,.86,16,1,true),M(o.coat===true?0xf6f7ff:o.coat,{side:THREE.DoubleSide}),0,1.1,0).scale.z=.72}
 if(o.tie)add(g,new THREE.BoxGeometry(.05,.3,.02),M(o.tie),0,1.32,.15);
 const armL=limb(-.27,1.5),armR=limb(.27,1.5);const sleeve=o.coat?M(o.coat===true?0xf6f7ff:o.coat):top;
 for(const A of [armL,armR]){add(A,new THREE.CylinderGeometry(.058,.05,.6,10),sleeve,0,-.3,0);add(A,new THREE.SphereGeometry(.055,10,8),skin,0,-.63,0)}
 add(g,new THREE.CylinderGeometry(.06,.065,.1,10),skin,0,1.59,0);
 add(g,new THREE.SphereGeometry(.15,20,16),skin,0,1.77,0).scale.y=1.08;
 for(const s of [-1,1])add(g,new THREE.SphereGeometry(.018,8,6),M(0x1b1830),s*.052,1.79,.138);
 if(o.style!=='none'){const cap=add(g,new THREE.SphereGeometry(.162,20,14,0,Math.PI*2,0,Math.PI*.52),hairM,0,1.785,-.012);cap.rotation.x=-.22;
  if(o.style==='long')add(g,new THREE.BoxGeometry(.3,.38,.09),hairM,0,1.6,-.11);
  if(o.style==='bun')add(g,new THREE.SphereGeometry(.075,12,10),hairM,0,1.9,-.1);}
 if(o.badge)add(g,new THREE.BoxGeometry(.07,.09,.01),M(C.cyan,{emissive:C.cyan,emissiveIntensity:.6}),.11,1.36,.145);
 g.userData.rig={legL,legR,armL,armR};g.userData.personOpts=o;personGroups.push(g);if(people.ready)attachModel(g);return g;
}
function swing(g,s){const r=g.userData.rig;if(!r)return;r.legL.rotation.x=s;r.legR.rotation.x=-s;r.armL.rotation.x=-s*.8;r.armR.rotation.x=s*.8}
const lerpAngle=(a,b,t)=>{const d=((b-a+Math.PI)%(Math.PI*2)+Math.PI*2)%(Math.PI*2)-Math.PI;return a+d*t};

/* avatar look, shared across all districts */
const SKINS=[0xf6d7c3,0xe8b896,0xc98e66,0xa0663f,0x7a4a2a,0x4e2f1c],HAIRS=[0x1d1a1f,0x5a3b22,0xa86d3a,0xe2c07a,0x9b8cff,0xf7a9d8];
const STYLES=[['short','Short'],['long','Long'],['bun','Bun'],['none','Shaved']];
const OUTFITS=[['scrubs','Teal scrubs',0x2fa79a,false],['violet','Violet scrubs',0x7a4fe0,false],['coat','White coat',0x4b5fc4,true],['suit','Navy suit',0x24305e,0x24305e]];
const look=()=>({skin:SKINS[1],hair:HAIRS[0],style:'short',outfit:'scrubs',...(progress.avatar||{})});
function avatarFrom(a){const o=OUTFITS.find(x=>x[0]===a.outfit)||OUTFITS[0];return person({model:a.model,skin:a.skin,hair:a.hair,style:a.style,outfit:o[0]==='suit'?0xf2f4ff:o[2],pants:o[3]?0x2a3358:o[2],coat:o[3],tie:o[0]==='suit'?C.violet:0,badge:true})}

/* ------------------------------------------------------------------ building a district */
function makeBuilder(w){
 const scene=w.scene;
 const box=(wd,h,d,mat,x,y,z,parent=scene)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(wd,h,d),mat);m.position.set(x,y,z);parent.add(m);return m};
 const collider=(x1,z1,x2,z2)=>w.colliders.push({x1,z1,x2,z2});
 const trimM=M(C.violet,{emissive:C.violet,emissiveIntensity:.55});
 const wall=(x1,z1,x2,z2,mat,h=2.8,trim=trimM)=>{const W=Math.max(Math.abs(x2-x1),.3),D=Math.max(Math.abs(z2-z1),.3),cx=(x1+x2)/2,cz=(z1+z2)/2;
  const m=box(W,h,D,mat.clone(),cx,h/2,cz);m.material.transparent=true;const base=mat.opacity??1;
  const t=box(W+.02,.08,D+.02,trim.clone(),cx,h,cz);t.material.transparent=true;w.walls.push({m,t,cx,cz,w:W,base,horiz:W>D});collider(cx-W/2,cz-D/2,cx+W/2,cz+D/2)};
 const floor=(x1,z1,x2,z2,c,o)=>box(x2-x1,.1,z2-z1,M(c,{roughness:.6,...o}),(x1+x2)/2,-.05,(z1+z2)/2);
 const hotspot=(id,x,z,r,label,meshes=[])=>{w.hotspots.push({id,x,z,r,label});meshes.forEach(m=>{m.userData.hotspot=id;w.hotspotMeshes.push(m)})};
 const npc=g=>{w.npcs.push(g);return g};
 /* Standard floor plan: lobby (x −10…10, z 0…14) with a desk at z≈4, a corridor (x −3…3, z −16…0),
    a left room (x −18…−3, z −16…−4) and a right room (x 3…18, z −16…−4), doors at z = −10. */
 const tile=(rx,ry)=>{if(!tileCanvas){tileCanvas=document.createElement('canvas');tileCanvas.width=tileCanvas.height=128;const x=tileCanvas.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,128,128);x.fillStyle='#e9e9ef';x.fillRect(64,0,64,64);x.fillRect(0,64,64,64);x.strokeStyle='#c4c4d0';x.lineWidth=2;x.strokeRect(1,1,126,126);x.beginPath();x.moveTo(64,0);x.lineTo(64,128);x.moveTo(0,64);x.lineTo(128,64);x.stroke()}
  const t=new THREE.CanvasTexture(tileCanvas);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(rx,ry);t.encoding=THREE.sRGBEncoding;return t};
 const dim=(c,k)=>new THREE.Color(c).multiplyScalar(k);
 const shell=o=>{
  box(80,.1,80,M(0x0a0e2a,{roughness:1}),0,-.12,-2);
  box(20,.1,14,new THREE.MeshStandardMaterial({color:dim(o.lobby,.8),map:tile(10,7),roughness:.45,metalness:.05}),0,-.05,7);
  box(6,.1,16,new THREE.MeshStandardMaterial({color:dim(o.corridor,.8),map:tile(3,8),roughness:.45,metalness:.05}),0,-.05,-8);
  o={...o,wall:dim(o.wall,.86).getHex()};floor(-18,-16,-3,-4,o.left,o.leftOpts);floor(3,-16,18,-4,o.right,o.rightOpts);
  const wallM=M(o.wall,{roughness:.85}),glassM=M(0xa9dcff,{transparent:true,opacity:.28,metalness:.6,roughness:.1}),tr=M(o.trim||C.violet,{emissive:o.trim||C.violet,emissiveIntensity:.55});
  const W=(a,b,c,d,m=wallM)=>wall(a,b,c,d,m,2.8,tr);
  W(-10,14,10,14,glassM);W(-10,0,-10,14);W(10,0,10,14);W(-10,0,-3,0);W(3,0,10,0);
  W(-3,-16,-3,-11.5);W(-3,-8.5,-3,0);W(3,-16,3,-11.5);W(3,-8.5,3,0);
  W(-18,-16,18,-16);W(-18,-4,-3,-4);W(3,-4,18,-4);W(-18,-16,-18,-4);W(18,-16,18,-4);
  for(const s of [-1,1]){box(.34,.22,3,glow(o.trim||C.violet),s*3,2.7,-10);box(.08,.03,15.6,glow(o.trim||C.violet),s*2.72,.02,-8)}
  const ring=new THREE.Mesh(new THREE.RingGeometry(.55,.65,40),glow(o.trim||C.violet));ring.rotation.x=-Math.PI/2;ring.position.set(0,.01,11.5);scene.add(ring);
 };
 const plant=(x,z)=>{box(.5,.5,.5,M(0xffffff),x,.25,z);const f=new THREE.Mesh(new THREE.IcosahedronGeometry(.48,0),M(0x5cbea3,{roughness:1}));f.position.set(x,.95,z);scene.add(f);collider(x-.3,z-.3,x+.3,z+.3)};
 return {scene,C,M,glow,box,collider,wall,floor,hotspot,npc,person,textSprite,panelTexture,screen:(...a)=>screen(scene,...a),shell,plant};
}
/* default route planner for the standard floor plan */
const region=(x,z)=>z>=0?'L':x<-3?'A':x>3?'W':'C';const side=x=>x>=0?1:-1;
function deskCross(x1,z1,x2,z2){if((z1>3.9)===(z2>3.9))return false;const k=(3.9-z1)/((z2-z1)||1e-6);return Math.abs(x1+(x2-x1)*k)<3}
function standardPlan(fx,fz,tx,tz){const a=region(fx,fz),b=region(tx,tz),pts=[];
 if(a===b){if(a==='L'&&deskCross(fx,fz,tx,tz))pts.push([side(fx)*3.8,3.1])}
 else{if(a==='L'){if(fz>3.2)pts.push([side(fx)*3.8,3.1]);pts.push([0,1],[0,-1.2])}
  if(a==='A')pts.push([-4.3,-10],[-1.8,-10]);if(a==='W')pts.push([4.3,-10],[1.8,-10]);
  if(b==='L'){pts.push([0,-1.2],[0,1]);if(tz>3.2)pts.push([side(tx)*3.8,3.1])}
  if(b==='A')pts.push([-1.8,-10],[-4.3,-10]);if(b==='W')pts.push([1.8,-10],[4.3,-10])}
 pts.push([tx,tz]);return pts}

function build(cfg){
 const w={scene:new THREE.Scene(),walls:[],colliders:[],hotspots:[],hotspotMeshes:[],npcs:[]};cfg._w=w;
 w.scene.background=new THREE.Color(0x0c1031);w.scene.fog=new THREE.Fog(0x0c1031,28,62);
 w.scene.add(new THREE.HemisphereLight(0xf4f2ff,0x4a4290,cfg.ambient??.5));const sun=new THREE.DirectionalLight(0xfff4ea,.45);sun.position.set(8,22,12);w.scene.add(sun);
 cfg.build(makeBuilder(w));
 w.nova=new THREE.Group();w.nova.add(new THREE.Mesh(new THREE.SphereGeometry(.16,20,16),M(C.cyan,{emissive:C.cyan,emissiveIntensity:1.2})));
 const halo=new THREE.Mesh(new THREE.TorusGeometry(.26,.015,8,40),glow(C.violet));halo.rotation.x=Math.PI/2;w.nova.add(halo);w.nova.userData.halo=halo;w.scene.add(w.nova);
 w.beacon=new THREE.Group();const beam=new THREE.Mesh(new THREE.CylinderGeometry(.55,.55,5,32,1,true),new THREE.MeshBasicMaterial({color:C.violet,transparent:true,opacity:.16,side:THREE.DoubleSide,depthWrite:false}));beam.position.y=2.5;w.beacon.add(beam);
 const br=new THREE.Mesh(new THREE.RingGeometry(.5,.62,40),new THREE.MeshBasicMaterial({color:C.cyan,transparent:true,opacity:.9}));br.rotation.x=-Math.PI/2;br.position.y=.02;w.beacon.add(br);w.scene.add(w.beacon);
 w.tapRing=new THREE.Mesh(new THREE.RingGeometry(.18,.26,28),new THREE.MeshBasicMaterial({color:C.cyan,transparent:true,opacity:.85}));w.tapRing.rotation.x=-Math.PI/2;w.tapRing.visible=false;w.scene.add(w.tapRing);
}

/* ------------------------------------------------------------------ runtime state */
const camera=new THREE.PerspectiveCamera(50,innerWidth/innerHeight,.05,200);
let tileCanvas=null;let cur=null,W=null,avatar=null,active=false,mode='walk',objIdx=0,t=0,lastNow=0,camZoom=1,walkPhase=0,panel=null;
const keys=new Set(),joy={x:0,y:0};let moveTarget=null,route=[],pendingHot=null,stuck={best:1e9,t:0},currentHot=null;
const camPos=new THREE.Vector3(),camLook=new THREE.Vector3(),tmpV=new THREE.Vector3();
const ray=new THREE.Raycaster(),ptr=new THREE.Vector2(),floorPlane=new THREE.Plane(new THREE.Vector3(0,1,0),0);
function setPtr(e){const r=world.getBoundingClientRect();ptr.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);ray.setFromCamera(ptr,camera);return ray}

function say(h){$('ixNovaText').innerHTML=h;$('ixNova').style.display='flex'}
function renderObjectives(){const O=cur.objectives;
 $('ixObjList').innerHTML=O.map((o,i)=>`<li class="${i<objIdx?'done':i===objIdx?'now':''}"><i>${i<objIdx?'✓':i+1}</i><span>${o[0]}</span></li>`).join('');
 $('ixObjCount').textContent=`· ${Math.min(objIdx,O.length)}/${O.length}`;$('ixCur').textContent=objIdx<O.length?'→ '+O[objIdx][0]:'✓ Shift complete';
 say(cur.hints[Math.min(objIdx,cur.hints.length-1)]);
 const tg=O[objIdx]&&O[objIdx][1];W.beacon.visible=!!tg&&mode!=='panel';if(tg)W.beacon.position.set(tg[0],0,tg[1]);}
function advance(to){if(to>objIdx){objIdx=to;renderObjectives()}}
function awardOnce(key,xp){progress.flags=progress.flags||{};if(progress.flags[key])return 0;progress.flags[key]=1;progress.xp+=xp;store();updateXP();return xp}

/* dialogue */
function hidePrompt(){currentHot=null;$('ixPrompt').style.display='none'}
function dialog(who,html,opts){mode='dialog';hidePrompt();$('ixNova').style.display='none';const d=$('ixDialog');
 d.innerHTML=`<div class="who">${esc(who)}</div><div class="txt">${html}</div><div class="opts">${opts.map((o,i)=>`<button data-o="${i}">${o.label}</button>`).join('')}</div>`;d.style.display='block';
 d.querySelectorAll('[data-o]').forEach(b=>b.onclick=()=>opts[+b.dataset.o].fn(b));const f=d.querySelector('button');if(f)f.focus({preventScroll:true});}
function closeDialog(){$('ixDialog').style.display='none';mode='walk';$('ixNova').style.display='flex'}
const shuffle=a=>{for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};
function question(who,html,options,correct,explain,next){let first=true;
 dialog(who,html,shuffle(options.map((label,i)=>({label,fn:b=>{const d=$('ixDialog');let fb=d.querySelector('.fb');if(!fb){fb=document.createElement('div');d.appendChild(fb)}
  if(i!==correct){first=false;b.classList.add('bad');b.disabled=true;fb.className='fb warn';fb.textContent='Not quite. Think about it again and try another answer.';return}
  d.querySelectorAll('[data-o]').forEach(x=>x.disabled=true);b.classList.add('good');fb.className='fb';fb.innerHTML='✓ '+explain;
  const c=document.createElement('button');c.className='ix-primary';c.textContent='Continue →';c.onclick=()=>next(first);d.appendChild(c);c.focus({preventScroll:true});}}))));}

/* focus panels (anatomy studio, loan desk…) */
function openPanel(p){panel=p;mode='panel';hidePrompt();stopMove();$('ixPanelBody').innerHTML=p.html;$('ixPanel').style.display='flex';$('ixNova').style.display='none';$('ixObj').style.display='none';W.beacon.visible=false;
 if(p.hideAvatar){avatar.visible=false;W.nova.userData.was=W.nova.visible;W.nova.visible=false}if(p.bind)p.bind();}
function closePanel(){if(!panel)return;const p=panel;panel=null;mode='walk';$('ixPanel').style.display='none';$('ixObj').style.display='';$('ixNova').style.display='flex';
 if(p.hideAvatar){avatar.visible=true;W.nova.visible=!!W.nova.userData.was}world.style.cursor='';if(p.onClose)p.onClose();renderObjectives()}
$('ixPanelBack').onclick=closePanel;

function finish(o){closeDialog();advance(cur.objectives.length);
 const gained=awardOnce('shift_'+cur.id,cur.shiftXP||150);progress.shifts=progress.shifts||{};
 progress.shifts[cur.id]={score:o.score,max:o.max,badge:o.title,icon:o.icon,date:new Date().toISOString().slice(0,10)};
 if(!progress.done.includes(cur.id))progress.done.push(cur.id);store();updateXP();
 mode='done';$('ixDoneIcon').textContent=o.icon;$('ixDoneTitle').textContent=o.title;
 $('ixDoneText').innerHTML=`You answered <b>${o.score} of ${o.max}</b> decisions right first time${gained?` and earned <b>+${gained} XP</b>`:''}.`;
 $('ixDoneSkills').innerHTML=o.skills.map(s=>`<div>${s}</div>`).join('');$('ixDone').style.display='grid';}

const api={get mode(){return mode},get objIdx(){return objIdx},get avatar(){return avatar},get nova(){return W.nova},get name(){return esc(progress.name||'Future Explorer')},
 camera,progress,store,updateXP,toast,esc,setPtr,advance,dialog,question,closeDialog,say,openPanel,closePanel,finish,awardOnce};

/* ------------------------------------------------------------------ walking */
function plan(fx,fz,tx,tz){return (cur.plan||standardPlan)(fx,fz,tx,tz)}
function setMoveTarget(x,z,hot=null){pendingHot=hot;route=plan(avatar.position.x,avatar.position.z,x,z);nextWaypoint();W.tapRing.position.set(x,.02,z);W.tapRing.visible=true}
function nextWaypoint(){const p=route.shift();moveTarget=p?{x:p[0],z:p[1]}:null;stuck={best:1e9,t:0};
 if(!p){W.tapRing.visible=false;if(pendingHot){const h=W.hotspots.find(x=>x.id===pendingHot);pendingHot=null;if(h&&Math.hypot(avatar.position.x-h.x,avatar.position.z-h.z)<h.r)interact(h.id)}}}
function stopMove(){route=[];pendingHot=null;moveTarget=null;if(W)W.tapRing.visible=false}
function interact(id){stopMove();cur.interact(id,api)}
const hit=(x,z,r=.33)=>W.colliders.some(b=>x+r>b.x1&&x-r<b.x2&&z+r>b.z1&&z-r<b.z2);
function updateWalk(dt){
 const v=new THREE.Vector2(0,0);
 if(keys.has('w')||keys.has('arrowup'))v.y-=1;if(keys.has('s')||keys.has('arrowdown'))v.y+=1;if(keys.has('a')||keys.has('arrowleft'))v.x-=1;if(keys.has('d')||keys.has('arrowright'))v.x+=1;
 v.x+=joy.x;v.y+=joy.y;
 if(v.lengthSq()>.01){if(moveTarget)stopMove()}
 else if(moveTarget){v.set(moveTarget.x-avatar.position.x,moveTarget.z-avatar.position.z);const d=v.length();
  if(d<(route.length?.35:.15)){nextWaypoint();v.set(0,0)}else{if(d<stuck.best-.02){stuck.best=d;stuck.t=0}else if((stuck.t+=dt)>.8){stopMove();v.set(0,0)}}}
 const amt=Math.min(1,v.length());const p=avatar.position;
 if(amt>.05){v.normalize();const sp=3.6*amt*dt,nx=p.x+v.x*sp,nz=p.z+v.y*sp;if(!hit(nx,p.z))p.x=nx;if(!hit(p.x,nz))p.z=nz;
  avatar.rotation.y=lerpAngle(avatar.rotation.y,Math.atan2(v.x,v.y),.22);walkPhase+=dt*10*amt;if(!setMoving(avatar,amt))swing(avatar,Math.sin(walkPhase)*.6*amt)}
 else{walkPhase=0;if(!setMoving(avatar,0))swing(avatar,0)}
 let best=null,bd=1e9;for(const h of W.hotspots){const d=Math.hypot(p.x-h.x,p.z-h.z);if(d<h.r&&d<bd){bd=d;best=h}}
 if(best!==currentHot){currentHot=best;const el=$('ixPrompt');if(best){el.innerHTML=(coarse?'':'<kbd>E</kbd>')+best.label;el.style.display='block'}else el.style.display='none'}
}

/* ------------------------------------------------------------------ input */
const coarse=matchMedia('(pointer:coarse)').matches;let pdown=null;
world.addEventListener('pointerdown',e=>{if(!active)return;pdown={x:e.clientX,y:e.clientY,lx:e.clientX,ly:e.clientY,moved:false};try{world.setPointerCapture(e.pointerId)}catch(_){}});
world.addEventListener('pointermove',e=>{if(!active)return;
 if(pdown){const dx=e.clientX-pdown.lx,dy=e.clientY-pdown.ly;if(Math.abs(e.clientX-pdown.x)+Math.abs(e.clientY-pdown.y)>8)pdown.moved=true;pdown.lx=e.clientX;pdown.ly=e.clientY;
  if(mode==='panel'&&pdown.moved&&panel.drag)panel.drag(dx,dy)}
 else if(mode==='panel'&&panel.hover&&e.pointerType==='mouse'){setPtr(e);panel.hover(ray)}});
world.addEventListener('pointerup',e=>{if(!active||!pdown)return;const tap=!pdown.moved;pdown=null;if(!tap)return;setPtr(e);
 if(mode==='panel'){if(panel.tap)panel.tap(ray);return}
 if(mode!=='walk')return;
 const h=ray.intersectObjects(W.hotspotMeshes,true)[0];
 if(h){let o=h.object;while(o&&!o.userData.hotspot)o=o.parent;const hs=o&&W.hotspots.find(x=>x.id===o.userData.hotspot);
  if(hs){const d=Math.hypot(avatar.position.x-hs.x,avatar.position.z-hs.z);if(d<hs.r)interact(hs.id);else setMoveTarget(hs.x,hs.z,hs.id);return}}
 if(ray.ray.intersectPlane(floorPlane,tmpV))setMoveTarget(tmpV.x,tmpV.z);});
world.addEventListener('wheel',e=>{if(!active)return;e.preventDefault();if(mode==='panel'){if(panel.wheel)panel.wheel(e.deltaY)}else camZoom=Math.max(.6,Math.min(1.45,camZoom+(e.deltaY>0?.08:-.08)))},{passive:false});
addEventListener('keydown',e=>{if(!active)return;if(/^(input|textarea|select)$/i.test(e.target.tagName))return;const k=e.key.toLowerCase();
 if(['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright'].includes(k)){keys.add(k);if(k.startsWith('arrow'))e.preventDefault()}
 if((k==='e'||k===' '||k==='enter')&&mode==='walk'&&currentHot&&e.target.tagName!=='BUTTON'){e.preventDefault();interact(currentHot.id)}
 if(k==='escape'&&mode==='panel')closePanel()});
addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));addEventListener('blur',()=>keys.clear());
const joyEl=$('ixJoy'),knob=joyEl.querySelector('span');let joyId=null;
const joyMove=e=>{const r=joyEl.getBoundingClientRect();let dx=e.clientX-(r.left+r.width/2),dy=e.clientY-(r.top+r.height/2);const L=Math.hypot(dx,dy),R=46;if(L>R){dx*=R/L;dy*=R/L}joy.x=dx/R;joy.y=dy/R;knob.style.transform=`translate(${dx}px,${dy}px)`};
joyEl.addEventListener('pointerdown',e=>{joyId=e.pointerId;joyEl.setPointerCapture(e.pointerId);joyMove(e)});
joyEl.addEventListener('pointermove',e=>{if(e.pointerId===joyId)joyMove(e)});
const joyEnd=e=>{if(e.pointerId!==joyId)return;joyId=null;joy.x=joy.y=0;knob.style.transform=''};joyEl.addEventListener('pointerup',joyEnd);joyEl.addEventListener('pointercancel',joyEnd);
$('ixPrompt').onclick=()=>{if(currentHot&&mode==='walk')interact(currentHot.id)};
$('ixObj').onclick=()=>$('ixObj').classList.toggle('open');

/* ------------------------------------------------------------------ avatar editor */
function setAvatar(a){const p=avatar.position.clone(),r=avatar.rotation.y,vis=avatar.visible;W.scene.remove(avatar);avatar=avatarFrom(a);avatar.position.copy(p);avatar.rotation.y=r;avatar.visible=vis;W.scene.add(avatar)}
function openEditor(){mode='editor';hidePrompt();stopMove();$('ixNova').style.display='none';$('ixObj').style.display='none';$('ixEditor').style.display='grid';
 const a=look();$('edName').value=progress.name&&progress.name!=='Future Explorer'?progress.name:'';
 const sw=(el,list,key)=>{el.innerHTML=list.map(c=>`<button style="background:#${c.toString(16).padStart(6,'0')}" data-v="${c}" class="${a[key]===c?'on':''}" aria-label="Colour option"></button>`).join('');el.querySelectorAll('button').forEach(b=>b.onclick=()=>{a[key]=Number(b.dataset.v);el.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));setAvatar(a)})};
 const ch=(el,list,key)=>{el.innerHTML=list.map(o=>`<button data-v="${o[0]}" class="${a[key]===o[0]?'on':''}">${o[1]}</button>`).join('');el.querySelectorAll('button').forEach(b=>b.onclick=()=>{a[key]=b.dataset.v;el.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));setAvatar(a)})};
 sw($('edSkin'),SKINS,'skin');sw($('edHair'),HAIRS,'hair');ch($('edStyle'),STYLES,'style');ch($('edOutfit'),OUTFITS,'outfit');
 const real=people.ready;$('edCharRow').style.display=real?'':'none';['edSkin','edStyle','edHair','edOutfit'].forEach(id=>$(id).parentNode.style.display=real?'none':'');
 if(real){const names=PEOPLE.filter(p=>people.models[p[0]]);if(!a.model||!people.models[a.model])a.model=names[0][0];ch($('edChar'),names,'model');setAvatar(a)}
 $('edDone').onclick=()=>{progress.avatar=a;const n=$('edName').value.trim();progress.name=n||'Future Explorer';store();$('ixEditor').style.display='none';$('ixObj').style.display='';mode='walk';avatar.rotation.y=Math.PI;renderObjectives()};
 avatar.rotation.y=0;}
$('ixEditBtn').onclick=()=>{if(mode==='walk')openEditor()};

/* ------------------------------------------------------------------ frame */
const isIn=(o,sc)=>{while(o){if(o===sc)return true;o=o.parent}return false};
function frame(now){if(!cur)return;const dt=Math.min(.05,(now-(lastNow||now))/1000);lastNow=now;t+=dt;
 if(mode==='walk')updateWalk(dt);
 for(const g of personGroups){if(g.userData.mixer&&isIn(g,W.scene))g.userData.mixer.update(dt)}
 W.npcs.forEach((n,i)=>{n.position.y=Math.sin(t*1.6+i)*.008;const r=n.userData.rig;if(r)r.armL.rotation.x=Math.sin(t*1.2+i)*.05});
 W.beacon.children[1].scale.setScalar(1+Math.sin(t*3)*.12);W.beacon.children[0].material.opacity=.12+Math.sin(t*2)*.05;W.tapRing.rotation.z+=dt*2;
 if(W.nova.visible){const a=avatar.position;W.nova.position.lerp(tmpV.set(a.x+.75,2.05+Math.sin(t*2.2)*.1,a.z+.35),.08);W.nova.userData.halo.rotation.z+=dt*1.5}
 if(cur.frame)cur.frame(dt,t,api);
 const az=avatar.position.z,ax=avatar.position.x;
 for(const w of W.walls){const fade=mode!=='panel'&&w.horiz&&w.cz>az+.2&&Math.abs(ax-w.cx)<w.w/2+5&&w.cz-az<9;const target=fade?Math.min(w.base,.13):w.base;w.m.material.opacity+=(target-w.m.material.opacity)*.15;w.t.material.opacity=w.m.material.opacity;w.m.material.depthWrite=w.m.material.opacity>.9}
 const a=avatar.position;
 if(mode==='panel'&&panel.camera){panel.camera(camPos,camLook)}
 else if(mode==='editor'){camPos.set(a.x,1.5,a.z+3.9);camLook.set(a.x+(innerWidth>760?.85:0),1.0-(innerWidth<=760?.75:0),a.z)}
 else{const z=camZoom*(innerWidth<innerHeight?1.45:1);camPos.set(a.x,a.y+8.2*z,a.z+7.2*z);camLook.set(a.x,1,a.z-.4)}
 camera.position.lerp(camPos,.1);smoothLook.lerp(camLook,.12);camera.lookAt(smoothLook);
 renderer.render(W.scene,camera);
}
const smoothLook=new THREE.Vector3();
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix()});

/* ------------------------------------------------------------------ enter / exit */
function resetShift(){objIdx=0;stopMove();panel=null;['ixDialog','ixDone','ixPanel','ixEditor'].forEach(id=>$(id).style.display='none');$('ixObj').style.display='';
 const s=cur.start||[0,11.5];avatar.position.set(s[0],0,s[1]);avatar.rotation.y=Math.PI;avatar.visible=true;W.nova.visible=false;W.nova.position.set(s[0]+.75,2,s[1]+.3);
 if(cur.reset)cur.reset(api);}
function enter(cfg){loadPeople();if(!cfg._w)build(cfg);cur=cfg;W=cfg._w;App.closeMission();document.body.classList.add('in-ix');active=true;
 if(avatar&&avatar.parent)avatar.parent.remove(avatar);avatar=avatarFrom(look());W.scene.add(avatar);
 camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();$('ixKicker').textContent=cfg.title;$('ixSub').textContent=cfg.subtitle||'Your first shift';
 resetShift();mode='walk';camera.position.set(0,8,19);smoothLook.set(0,1,11);lastNow=0;renderObjectives();
 if(!progress.avatar)openEditor();}
function exit(){active=false;mode='walk';keys.clear();hidePrompt();document.body.classList.remove('in-ix');world.style.cursor='';if(App.resetView)App.resetView()}
$('ixExit').onclick=exit;$('ixDoneCity').onclick=()=>{$('ixDone').style.display='none';exit()};$('ixDonePass').onclick=()=>{$('ixDone').style.display='none';exit();App.showPassport()};
$('ixDoneReplay').onclick=()=>{$('ixDone').style.display='none';resetShift();mode='walk';renderObjectives()};

window.TalentopiaInterior={get active(){return active},frame,exit,
 register(cfg){window.TalentopiaInteriors[cfg.id]={enter:()=>enter(cfg),label:cfg.enterLabel,badge:cfg.badge,title:cfg.title};}};
addEventListener('load',()=>{const m=location.search.match(/[?&]enter=([a-z]+)/)||(/[?&]medcity\b/.test(location.search)?[0,'med']:null);
 const d=m&&window.TalentopiaInteriors[m[1]];if(d){const i=$('intro');if(i)i.classList.remove('open');d.enter()}});
})();
