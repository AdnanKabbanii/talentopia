/* TALENTOPIA · MedCity Hospital (district config for interior.js)
   Reception check-in, a layered 3D anatomy model with a short quiz, and a supervised
   fictional patient case. */
(()=>{
'use strict';
const TI=window.TalentopiaInterior;if(!TI)return;
const $=id=>document.getElementById(id);

/* ------------------------------------------------------------------ anatomy data */
const INFO={
 brain:['Brain','Part of the central nervous system. It processes information from the senses, controls movement and supports memory, language and thinking.'],
 lungs:['Lungs','Where gas exchange happens: oxygen passes into the blood and carbon dioxide leaves it through millions of tiny air sacs called alveoli. The right lung has three lobes, the left has two.'],
 heart:['Heart','A muscular pump with four chambers. The right side sends blood to the lungs; the left side pumps oxygen-rich blood to the whole body. A typical adult resting rate is about 60–100 beats per minute.'],
 liver:['Liver','The largest internal organ, in the upper right of the abdomen. It processes nutrients, makes bile, stores energy as glycogen and breaks down many medicines and toxins.'],
 stomach:['Stomach','Stores food and starts digesting it with acid and enzymes before passing it on to the small intestine.'],
 kidneys:['Kidneys','Two bean-shaped organs near the back of the abdomen. They filter the blood, remove waste as urine and help control fluid balance and blood pressure.'],
 intestines:['Intestines','The small intestine absorbs most nutrients from food; the large intestine absorbs water and forms stool.'],
 bladder:['Bladder','A stretchy muscular bag that stores urine from the kidneys until it is emptied.'],
 aorta:['Aorta','The largest artery in the body. It carries oxygen-rich blood from the heart’s left ventricle to the rest of the body.'],
 carotid:['Carotid arteries','Run up each side of the neck and supply blood to the head and brain. You can feel their pulse beside the windpipe.'],
 arteries:['Limb arteries','Branches that carry oxygen-rich blood away from the heart to the arms and legs.'],
 venacava:['Venae cavae','The two largest veins. They bring oxygen-poor blood from the body back into the right side of the heart.'],
 veins:['Veins','Carry blood back toward the heart. Many leg veins contain valves that stop blood flowing backward.'],
 spinalcord:['Spinal cord','Carries signals between the brain and the rest of the body. It is protected inside the vertebral column.'],
 sciatic:['Sciatic nerve','The longest and widest nerve in the body, running from the lower back down each leg.'],
 nerves:['Arm nerves','A network of nerves from the neck and spinal cord that controls the shoulder, arm and hand and carries touch sensation back.'],
 spine:['Vertebral column','A stack of vertebrae that supports the body, allows movement and protects the spinal cord.'],
 ribs:['Rib cage','Twelve pairs of ribs that protect the heart and lungs and move with every breath.'],
 pelvis:['Pelvis','A ring of bones that supports the abdominal organs and connects the spine to the legs.'],
 femur:['Femur','The thigh bone: the longest and strongest bone in the human body.']
};
const LAYERS=[['skin','Skin'],['skeleton','Skeleton'],['organs','Organs'],['vessels','Blood vessels'],['nerves','Nerves']];
const LAYER_OF={brain:'organs',lungs:'organs',heart:'organs',liver:'organs',stomach:'organs',kidneys:'organs',intestines:'organs',bladder:'organs',aorta:'vessels',carotid:'vessels',arteries:'vessels',venacava:'vessels',veins:'vessels',spinalcord:'nerves',sciatic:'nerves',nerves:'nerves',spine:'skeleton',ribs:'skeleton',pelvis:'skeleton',femur:'skeleton'};
const QUIZ=[['kidneys','Find the organ that <b>filters the blood and makes urine</b>.'],['heart','Find the organ that <b>pumps blood around the body</b>.'],['aorta','Find the vessel that carries <b>oxygen-rich blood from the heart to the body</b>.']];
const pickables=[];let layerGroups={};
const layerOn={};const anat={seen:new Set(),phase:'explore',q:0};const orbit={yaw:Math.PI/2,pitch:.12,dist:3};
let focus='everything',caseScore=0,selectedPart=null,hoverPart=null,cross,ecg,studioLabel,bodyCenter;

function buildBody(B){
 const {M}=B;const g=new THREE.Group();layerGroups={};for(const [k] of LAYERS){layerGroups[k]=new THREE.Group();g.add(layerGroups[k])}
 const reg=(m,id)=>{m.userData.part=id;m.userData.baseE=m.material.emissiveIntensity;pickables.push(m);return m};
 const ell=(L,id,c,x,y,z,sx,sy,sz)=>{const m=new THREE.Mesh(new THREE.SphereGeometry(1,24,18),M(c,{roughness:.4,emissive:c,emissiveIntensity:.15}));m.position.set(x,y,z);m.scale.set(sx,sy,sz);layerGroups[L].add(m);return reg(m,id)};
 const tube=(L,id,c,pts,r)=>{const cu=new THREE.CatmullRomCurve3(pts.map(p=>new THREE.Vector3(...p)));const m=new THREE.Mesh(new THREE.TubeGeometry(cu,40,r,8,false),M(c,{emissive:c,emissiveIntensity:.35,roughness:.4}));layerGroups[L].add(m);return reg(m,id)};
 const skinM=new THREE.MeshStandardMaterial({color:0xcfc4ff,transparent:true,opacity:.14,roughness:.3,depthWrite:false});
 const S=(geo,x,y,z,rz=0)=>{const m=new THREE.Mesh(geo,skinM);m.position.set(x,y,z);m.rotation.z=rz;layerGroups.skin.add(m);return m};
 S(new THREE.SphereGeometry(.115,24,18),0,1.66,0).scale.set(1,1.15,1.05);S(new THREE.CylinderGeometry(.05,.056,.1,16),0,1.53,0);
 S(new THREE.SphereGeometry(1,28,20),0,1.26,0).scale.set(.2,.3,.12);S(new THREE.SphereGeometry(1,24,18),0,.95,0).scale.set(.17,.12,.11);
 for(const s of [-1,1]){S(new THREE.CylinderGeometry(.042,.035,.62,12),s*.25,1.16,0,s*.12);S(new THREE.CylinderGeometry(.068,.045,.88,12),s*.09,.45,0)}
 const bone=()=>M(0xf5f1e6,{roughness:.6,emissive:0xf5f1e6,emissiveIntensity:.05});
 for(let i=0;i<17;i++){const v=new THREE.Mesh(new THREE.BoxGeometry(.034,.022,.034),bone());v.position.set(0,.95+i*.037,-.075);layerGroups.skeleton.add(v);reg(v,'spine')}
 for(let i=0;i<7;i++){const geo=new THREE.TorusGeometry(.15-Math.abs(i-2.5)*.009,.006,6,32,Math.PI*1.7);geo.rotateZ(-1.35*Math.PI);geo.rotateX(Math.PI/2);const r=new THREE.Mesh(geo,bone());r.scale.z=.72;r.position.set(0,1.43-i*.045,-.015);layerGroups.skeleton.add(r);reg(r,'ribs')}
 const pel=new THREE.Mesh(new THREE.TorusGeometry(.1,.022,8,28),bone());pel.rotation.x=Math.PI/2.6;pel.position.set(0,.92,-.01);layerGroups.skeleton.add(pel);reg(pel,'pelvis');
 for(const s of [-1,1]){const f=new THREE.Mesh(new THREE.CylinderGeometry(.018,.015,.42,10),bone());f.position.set(s*.085,.66,0);f.rotation.z=s*.06;layerGroups.skeleton.add(f);reg(f,'femur')}
 ell('organs','brain',0xd9a6ff,0,1.68,0,.085,.07,.095);
 for(const s of [-1,1])ell('organs','lungs',0x7fd9e8,s*.078,1.33,-.005,.062,.115,.06);
 ell('organs','heart',0xff4d6d,.025,1.29,.04,.045,.056,.042).rotation.z=-.4;
 ell('organs','liver',0xa8503f,-.06,1.15,.02,.1,.05,.075);ell('organs','stomach',0xffb38a,.065,1.14,.035,.055,.045,.04);
 for(const s of [-1,1])ell('organs','kidneys',0x8a2f45,s*.066,1.04,-.06,.026,.046,.026);
 const int=new THREE.Mesh(new THREE.TorusKnotGeometry(.05,.016,90,10,2,3),M(0xf0c27a,{roughness:.5,emissive:0xf0c27a,emissiveIntensity:.15}));int.position.set(0,.98,.03);int.scale.set(1.15,.8,.6);layerGroups.organs.add(int);reg(int,'intestines');
 ell('organs','bladder',0xf2d36b,0,.88,.035,.032,.026,.026);
 const red=0xff3b5c,blue=0x5b8cff;
 tube('vessels','aorta',red,[[.02,1.3,.03],[.012,1.39,.01],[.02,1.415,-.03],[.03,1.36,-.055],[.02,1.2,-.05],[0,1.0,-.04],[0,.92,-.03]],.011);
 for(const s of [-1,1]){
  tube('vessels','carotid',red,[[.012,1.4,0],[s*.03,1.5,.005],[s*.035,1.6,.0]],.006);
  tube('vessels','arteries',red,[[0,.92,-.03],[s*.06,.86,0],[s*.095,.6,.012],[s*.09,.08,.01]],.007);
  tube('vessels','arteries',red,[[s*.025,1.405,-.01],[s*.15,1.43,.005],[s*.25,1.38,.008],[s*.29,1.0,.008],[s*.315,.87,.008]],.006);
  tube('vessels','veins',blue,[[-.02,.91,-.035],[s*.05,.85,-.01],[s*.08,.6,-.008],[s*.075,.08,-.01]],.007);
  tube('vessels','veins',blue,[[-.025,1.44,0],[s*.14,1.45,-.01],[s*.24,1.4,-.008],[s*.28,1.0,-.008]],.006);
 }
 tube('vessels','venacava',blue,[[-.02,1.3,.02],[-.025,1.38,.005],[-.025,1.46,0]],.01);
 tube('vessels','venacava',blue,[[-.02,1.27,0],[-.028,1.12,-.035],[-.02,.92,-.035]],.01);
 const gold=0xffc860;
 tube('nerves','spinalcord',gold,[[0,1.62,-.02],[0,1.52,-.065],[0,1.2,-.077],[0,.95,-.072]],.006);
 for(const s of [-1,1]){tube('nerves','sciatic',gold,[[0,.95,-.072],[s*.07,.88,-.05],[s*.088,.6,-.02],[s*.085,.08,-.02]],.0045);
  tube('nerves','nerves',gold,[[0,1.46,-.065],[s*.14,1.42,-.02],[s*.26,1.36,-.012],[s*.305,.95,-.012],[s*.32,.88,-.01]],.0035)}
 g.scale.setScalar(1.05);return g;
}

/* ------------------------------------------------------------------ hospital */
function build(B){
 const {scene,C,M,glow,box,collider,hotspot,npc,person,textSprite,panelTexture,screen,shell,plant}=B;
 shell({lobby:0xcdc8e6,corridor:0xbfb9de,left:0x221d52,leftOpts:{roughness:.35,metalness:.3},right:0xc6e0dc,wall:0xe2dff2,trim:C.violet});
 box(5,1.05,1.1,M(0xffffff,{roughness:.4}),0,.525,4);box(5.1,.06,1.2,glow(C.cyan),0,1.08,4);box(5,.18,.02,glow(C.violet),0,.62,4.56);collider(-2.6,3.4,2.6,4.6);
 const maya=npc(person({skin:0xa0663f,hair:0x1d1a1f,style:'bun',outfit:0x7a4fe0,badge:true}));maya.position.set(0,0,2.9);scene.add(maya);collider(-.35,2.55,.35,3.25);
 const mt=textSprite('Maya','#945CFF',.75,'Reception');mt.position.set(0,2.35,2.9);scene.add(mt);
 cross=new THREE.Group();box(.75,.24,.24,glow(0xff6b8a),0,0,0,cross);box(.24,.75,.24,glow(0xff6b8a),0,0,0,cross);cross.position.set(0,3.05,4);scene.add(cross);
 const sign=textSprite('MedCity Hospital','#67DFF0',1.25,'Learning hospital · Talent City');sign.position.set(0,3.4,.2);scene.add(sign);
 for(const s of [-1,1]){box(3,.45,.8,M(0x8f86c9),s*6.5,.225,9);box(3,.5,.12,M(0x8f86c9),s*6.5,.6,9.4);collider(s*6.5-1.5,8.6,s*6.5+1.5,9.5)}
 plant(-9.2,.9);plant(9.2,.9);plant(-9.2,13.1);plant(9.2,13.1);plant(-3.7,.9);plant(3.7,.9);
 screen(3,1.75,panelTexture('Today at MedCity',['Anatomy Studio · open','Ward 3 · new admission','NOVA learning guide · online'],'#67DFF0'),-9.83,1.7,7,Math.PI/2);
 screen(3,1.75,panelTexture('Patient safety first',['Wash hands · check ID','Students always work','under supervision'],'#8DE8C3'),9.83,1.7,7,-Math.PI/2);
 hotspot('reception',0,5.7,1.9,'Talk to Maya at reception',[maya]);
 const sa=textSprite('← Anatomy Studio','#67DFF0',.95);sa.position.set(-2.2,3.25,-10);scene.add(sa);
 const sw=textSprite('Patient Ward →','#F7A9D8',.95);sw.position.set(2.2,3.25,-10);scene.add(sw);
 const grid=new THREE.GridHelper(12,24,C.violet,0x3a3480);grid.position.set(-10.5,.011,-10);scene.add(grid);
 const plat=new THREE.Mesh(new THREE.CylinderGeometry(1.3,1.42,.3,48),M(0x2d2870,{metalness:.4,roughness:.3}));plat.position.set(-10.5,.15,-10);scene.add(plat);
 const ring=new THREE.Mesh(new THREE.TorusGeometry(1.36,.03,8,64),glow(C.cyan));ring.rotation.x=Math.PI/2;ring.position.set(-10.5,.31,-10);scene.add(ring);collider(-11.85,-11.35,-9.15,-8.65);
 const pl=new THREE.PointLight(C.cyan,.9,10);pl.position.set(-10.5,3.2,-10);scene.add(pl);
 [['Cardiovascular',['Heart · 4 chambers','Arteries carry blood away','Veins bring it back'],'#ff8fa8',-15],['Respiratory',['Lungs · gas exchange','Right lung: 3 lobes','Left lung: 2 lobes'],'#67DFF0',-10.5],['Nervous system',['Brain + spinal cord','= central nervous system','Nerves branch to the body'],'#FFD59C',-6]].forEach(([t,l,c,x])=>screen(3.2,1.9,panelTexture(t,l,c),x,1.75,-15.83));
 const body=buildBody(B);body.position.set(-10.5,.3,-10);body.rotation.y=Math.PI/2;scene.add(body);bodyCenter=new THREE.Vector3(-10.5,1.32,-10);
 studioLabel=textSprite('Anatomy Studio','#67DFF0',.9,'Interactive 3D body');studioLabel.position.set(-10.5,2.75,-10);scene.add(studioLabel);
 hotspot('anatomy',-10.5,-10,2.55,'Open the interactive body',[body,plat]);
 const bed=(x,z)=>{const g=new THREE.Group();box(1.1,.45,2.3,M(0xd6dbe8),0,.35,0,g);box(1.0,.16,2.1,M(0xf3fbff),0,.65,0,g);box(1.15,.95,.08,M(0x9aa6c8),0,.62,-1.15,g);box(.7,.12,.35,M(0xffffff),0,.8,-.85,g);g.position.set(x,0,z);scene.add(g);collider(x-.6,z-1.2,x+.6,z+1.2);return g};
 const bed1=bed(12,-11.95);bed(15.6,-11.95);
 const sam=person({skin:0xc98e66,hair:0x8a8a8a,style:'short',outfit:0x9fc8e8,pants:0x9fc8e8});sam.rotation.x=-Math.PI/2;sam.position.set(12,.74,-11.0);scene.add(sam);
 box(.95,.12,1.35,M(C.blush,{roughness:.9}),12,.86,-11.55);
 const st=new THREE.Mesh(new THREE.CylinderGeometry(.04,.04,1.5,8),M(0x9aa6c8));st.position.set(13.2,.75,-12.7);scene.add(st);box(.68,.48,.06,M(0x1b1f33),13.2,1.62,-12.7);collider(13,-12.9,13.4,-12.5);
 const cv=document.createElement('canvas');cv.width=256;cv.height=176;const tex=new THREE.CanvasTexture(cv);screen(.62,.42,tex,13.2,1.62,-12.665);ecg={cv,tex};
 box(.04,2.2,3,M(C.blush,{transparent:true,opacity:.4}),10.4,1.1,-11.9);collider(10.36,-13.4,10.44,-10.4);
 box(.5,.5,.5,M(0x8f86c9),13.6,.25,-10.4);collider(13.35,-10.65,13.85,-10.15);
 const doc=npc(person({skin:0x7a4a2a,hair:0x1d1a1f,style:'long',outfit:0x2fa79a,coat:true,badge:true}));doc.position.set(14.3,0,-9.4);doc.rotation.y=-Math.PI/2.4;scene.add(doc);collider(14,-9.7,14.6,-9.1);
 const dt=textSprite('Dr. Haddad','#F7A9D8',.75,'Supervising physician');dt.position.set(14.3,2.35,-9.4);scene.add(dt);
 const pt=textSprite('Sam R. · Bed 3','#F7A9D8',.75,'Fictional patient');pt.position.set(12,1.95,-12.3);scene.add(pt);
 const wl=new THREE.PointLight(0xffe6d0,.3,12);wl.position.set(12,3,-10);scene.add(wl);
 hotspot('patient',12,-9.8,2,'See the patient with Dr. Haddad',[sam,doc,bed1]);
}
function drawEcg(t){const x=ecg.cv.getContext('2d'),W=256,H=176;x.fillStyle='#071022';x.fillRect(0,0,W,H);x.strokeStyle='#123a3a';x.lineWidth=1;for(let i=0;i<W;i+=16){x.beginPath();x.moveTo(i,0);x.lineTo(i,H);x.stroke()}
 const y=p=>{if(p<.1)return Math.sin(p/.1*Math.PI)*5;if(p>.18&&p<.2)return-(p-.18)/.02*7;if(p>=.2&&p<.23)return-7+(p-.2)/.03*45;if(p>=.23&&p<.26)return 38-(p-.23)/.03*50;if(p>=.26&&p<.28)return-12+(p-.26)/.02*12;if(p>.38&&p<.52)return Math.sin((p-.38)/.14*Math.PI)*9;return 0};
 x.strokeStyle='#8DE8C3';x.lineWidth=2.5;x.beginPath();for(let i=0;i<W;i++){const ph=((i/W)*2.6-t*1.73)%1;const v=y((ph+1)%1);i?x.lineTo(i,100-v):x.moveTo(i,100-v)}x.stroke();
 x.fillStyle='#8DE8C3';x.font='bold 22px system-ui';x.fillText('HR 104',12,30);x.fillStyle='#67DFF0';x.font='16px system-ui';x.fillText('SpO₂ 95%',150,30);ecg.tex.needsUpdate=true}

/* ------------------------------------------------------------------ anatomy studio panel */
function paintParts(){for(const m of pickables){const id=m.userData.part;m.material.emissiveIntensity=id===selectedPart?1.1:id===hoverPart?.7:m.userData.baseE}}
function visiblePick(ray){const h=ray.intersectObjects(pickables.filter(m=>m.parent.visible),false)[0];return h?h.object.userData.part:null}
function applyLayers(){for(const k in layerGroups)layerGroups[k].visible=!!layerOn[k];const el=$('anatLayers');if(!el)return;
 el.innerHTML=LAYERS.map(([k,l])=>`<button data-layer="${k}" class="${layerOn[k]?'on':''}" aria-pressed="${!!layerOn[k]}">${l}</button>`).join('')+`<button data-zoom="1" aria-label="Zoom in">＋</button><button data-zoom="-1" aria-label="Zoom out">−</button>`;
 el.querySelectorAll('[data-layer]').forEach(b=>b.onclick=()=>{layerOn[b.dataset.layer]=!layerOn[b.dataset.layer];applyLayers()});
 el.querySelectorAll('[data-zoom]').forEach(b=>b.onclick=()=>{orbit.dist=Math.max(1.2,Math.min(4.6,orbit.dist-Number(b.dataset.zoom)*.5))})}
function renderTask(msg,cls=''){const el=$('anatTask');if(!el)return;el.className='ix-task '+cls;
 if(anat.phase==='explore'){const n=Math.min(anat.seen.size,4);el.innerHTML=`<b>NOVA:</b> ${msg||(focus==='heart'?'You chose heart and circulation, so the blood vessels are switched on. ':focus==='lungs'?'You chose the lungs, so the rib cage is visible. ':'')+'Tap <b>4 different structures</b> to learn what they do.'}<div class="bar"><div style="width:${n*25}%"></div></div>`}
 else if(anat.phase==='quiz')el.innerHTML=`<b>NOVA quiz ${anat.q+1}/3:</b> ${QUIZ[anat.q][1]}${msg?`<br><span style="opacity:.9">${msg}</span>`:''}<div class="bar"><div style="width:${anat.q/3*100}%"></div></div>`;
 else el.innerHTML=`<b>✓ Anatomy Studio complete.</b> ${msg||''} Head back out and visit the Patient Ward when you’re ready.<div class="bar"><div style="width:100%"></div></div>`;}
function pickPart(id,ix){selectedPart=id;paintParts();const [n,tx]=INFO[id];$('anatInfo').innerHTML=`<b>${n}</b>${tx}`;
 if(anat.phase==='explore'){anat.seen.add(id);if(anat.seen.size>=4){anat.phase='quiz';anat.q=0;layerOn[LAYER_OF[QUIZ[0][0]]]=true;applyLayers();renderTask('Nice exploring! Now a quick check.')}else renderTask()}
 else if(anat.phase==='quiz'){const want=QUIZ[anat.q][0];
  if(id===want){anat.q++;if(anat.q>=3){anat.phase='done';const g=ix.awardOnce('med_anatomy',60);renderTask(g?`+${g} XP.`:'','ok');ix.advance(2);ix.toast('✓ Anatomy Studio complete')}
   else{layerOn[LAYER_OF[QUIZ[anat.q][0]]]=true;applyLayers();renderTask('✓ Correct!','ok')}}
  else renderTask(`That’s the ${INFO[id][0].toLowerCase()}. Try again.`,'no')}}
function openStudio(ix){
 if(focus==='heart')layerOn.vessels=true;if(focus==='lungs')layerOn.skeleton=true;orbit.dist=innerWidth<=760?3.9:3;studioLabel.visible=false;
 ix.openPanel({hideAvatar:true,
  html:`<div class="k">Anatomy Studio · NOVA</div><h3>Interactive body</h3><div class="layers" id="anatLayers"></div>
   <div class="ix-info" id="anatInfo" style="min-height:96px"><b>Tap a structure</b>Drag to rotate, scroll or use ＋/− to zoom. Switch layers on and off to look inside the body.</div>
   <div class="ix-task" id="anatTask"></div><div class="ix-note">Simplified teaching model. Shapes, sizes and positions are approximate, not an anatomical atlas.</div>`,
  bind(){applyLayers();renderTask()},
  camera(p,l){const c=bodyCenter,d=orbit.dist;p.set(c.x+Math.sin(orbit.yaw)*Math.cos(orbit.pitch)*d,c.y+Math.sin(orbit.pitch)*d,c.z+Math.cos(orbit.yaw)*Math.cos(orbit.pitch)*d);l.set(c.x,c.y-(innerWidth<=760?.55:0),c.z)},
  drag(dx,dy){orbit.yaw-=dx*.009;orbit.pitch=Math.max(-.35,Math.min(1.25,orbit.pitch+dy*.006))},
  hover(ray){const id=visiblePick(ray);if(id!==hoverPart){hoverPart=id;paintParts();$('world').style.cursor=id?'pointer':'grab'}},
  tap(ray){const id=visiblePick(ray);if(id)pickPart(id,ix)},
  wheel(dy){orbit.dist=Math.max(1.2,Math.min(4.6,orbit.dist+(dy>0?.25:-.25)))},
  onClose(){studioLabel.visible=true;selectedPart=hoverPart=null;paintParts()}});
}

/* ------------------------------------------------------------------ conversations */
function talkReception(ix){
 if(ix.objIdx>0){ix.dialog('Maya · Reception',`You’re doing great, ${ix.name}! Next up: <b>${CFG.objectives[Math.min(ix.objIdx,3)][0].toLowerCase()}</b>.`,[{label:'Thanks, Maya',fn:ix.closeDialog}]);return}
 ix.dialog('Maya · Reception',`Welcome to MedCity Hospital, <b>${ix.name}</b>! You’re shadowing our team today. Students always work under supervision here. What would you like to focus on?`,
  [['Heart and circulation','heart'],['Breathing and the lungs','lungs'],['A bit of everything','everything']].map(([label,f])=>({label,fn:()=>{focus=f;
   ix.dialog('Maya · Reception','Great choice. Here’s your visitor badge. Your learning guide <b>NOVA</b> will come with you. Start in the <b>Anatomy Studio</b>: up the corridor, first door on the left.',
    [{label:'Let’s go →',fn:()=>{ix.closeDialog();ix.nova.visible=true;ix.advance(1);ix.toast('✓ Checked in. NOVA has joined you.')}}])}})));
}
function talkPatient(ix){
 const D='Dr. Haddad · Supervising physician';
 if(ix.objIdx<2){ix.dialog(D,`Hi ${ix.name}! Visit the <b>Anatomy Studio</b> first. Today’s case will make much more sense once you’ve explored the body.`,[{label:'On my way',fn:ix.closeDialog}]);return}
 if(ix.objIdx>2){ix.dialog(D,'Great work today. Sam is in good hands with the team now.',[{label:'Thank you, doctor',fn:ix.closeDialog}]);return}
 caseScore=0;
 ix.dialog(D,`Hi ${ix.name}, I’m Dr. Haddad. This is <b>Sam</b>, a fictional 58-year-old patient who came in with chest discomfort that started an hour ago. Let’s review the chart together.`,[{label:'Show me the chart',fn:q1}]);
 function q1(){ix.question('Step 1 of 4 · Vital signs',`<div class="vitals"><div>Heart rate<b>104 bpm</b></div><div>Blood pressure<b>132/84</b></div><div>SpO₂<b>95%</b></div><div>Temperature<b>36.9°C</b></div></div>Which reading is outside the typical adult resting range?`,
  ['Heart rate: 104 bpm','Temperature: 36.9°C','Oxygen saturation: 95%'],0,'A typical adult resting heart rate is about 60–100 bpm, so 104 is fast (called <b>tachycardia</b>). 36.9°C is a normal temperature, and 95% oxygen saturation is usually within the normal range.',f=>{caseScore+=f;q2()})}
 function q2(){ix.question('Step 2 of 4 · Sam speaks','“It feels like a heavy pressure in my chest, and it’s spreading to my left arm.”<br><br><b>Dr. Haddad:</b> As a student, what should you do first?',
  ['Tell the supervising doctor straight away and follow the hospital’s chest-pain protocol','Give Sam some medicine from the cupboard','Ask Sam to walk around to see if it goes away'],0,'Chest pressure spreading to the arm can be a warning sign of a heart problem, so it needs urgent senior assessment. Students never treat patients on their own: they escalate and learn by following the protocol.',f=>{caseScore+=f;q3()})}
 function q3(){ix.question('Step 3 of 4 · Connect to anatomy','Think back to the Anatomy Studio. Which organ is the team most concerned about?',
  ['The heart','The kidneys','The stomach'],0,'Pressure-like chest pain that spreads to the arm makes the team think about the <b>heart</b> first. Remember: the heart sits in the chest, slightly to the left, between the lungs.',f=>{caseScore+=f;q4()})}
 function q4(){ix.question('Step 4 of 4 · The right test','Look at the monitor beside Sam’s bed. Which test records the heart’s electrical activity?',
  ['ECG (electrocardiogram)','An X-ray of the knee','An eye test'],0,'An <b>ECG</b> records the heart’s electrical activity as a trace like the one on Sam’s monitor. It’s one of the first tests a team would arrange for chest pain.',f=>{caseScore+=f;
   ix.dialog(D,`Excellent work, ${ix.name}. You read the vital signs, escalated safely and connected anatomy to a real situation. That’s how clinicians think.`,[{label:'Finish my shift →',fn:()=>ix.finish({icon:'✚',title:'MedCity Anatomy Explorer',score:caseScore,max:4,
    skills:['✚ Identifying organs, vessels and nerves','♥ Reading vital signs','⚠ Escalating safely under supervision','⌁ Linking anatomy to a patient case']})}])})}
}

const CFG={id:'med',title:'MedCity Hospital',subtitle:'Your first shift',enterLabel:'🏥 Enter MedCity Hospital: start a 3D shift →',badge:'MedCity Anatomy Explorer',
 objectives:[['Check in with Maya at reception',[0,5.7]],['Explore the body in the Anatomy Studio',[-10.5,-10]],['See your patient in the Ward',[12,-9.8]],['Get your feedback and badge',null]],
 hints:['Hi, I’m <b>NOVA</b>, your learning guide. Walk to the glowing marker at <b>reception</b> to check in with Maya.','Head up the corridor and take the <b>first door on the left</b> into the Anatomy Studio.','Great work! Cross the corridor into the <b>Patient Ward</b>. Dr. Haddad is waiting by Bed 3.','Shift complete. Open your <b>Career Passport</b> to see your new badge.'],
 build,
 interact(id,ix){if(id==='reception')talkReception(ix);else if(id==='anatomy')openStudio(ix);else if(id==='patient')talkPatient(ix)},
 frame(dt,t,ix){cross.rotation.y+=dt*.8;if(ix.avatar.position.x>3)drawEcg(t)},
 reset(){anat.seen.clear();anat.phase='explore';anat.q=0;caseScore=0;focus='everything';Object.assign(layerOn,{skin:true,skeleton:false,organs:true,vessels:true,nerves:false});applyLayers();selectedPart=hoverPart=null;paintParts();if(studioLabel)studioLabel.visible=true}
};
TI.register(CFG);
})();
