/* TALENTOPIA · Forge & Form Engineering (district config for interior.js)
   Chief-engineer check-in, a Structures Lab beam test where M = P·L/4 drives a live 3D
   beam that really bends on the rig, a Site Office build-sequencing task with a safety
   call, and a sustainability + ethics design review. All people, projects, capacities
   and costs are fictional and illustrative teaching values, not design data. */
(()=>{
'use strict';
const TI=window.TalentopiaInterior;if(!TI)return;
const $=id=>document.getElementById(id);
const money=n=>'$'+Math.round(n).toLocaleString('en-US');
const ORANGE=0xffb35c,STEEL=0x9ebdff;
let cube,beam,beamGeo,beamBase,ram,lamp,labCv,labTex,techTag,daraTag,stageGroups=[],score=0,interest='structures';
let beamDef=0,shownDef=-1,shownSy=-1;

/* ------------------------------------------------------------------ beam data (illustrative) */
// sizes: [capacity kN·m, cost $ per metre]
const MATS={
 timber:{name:'Glulam timber',short:'Timber',color:0xc8955a,sizes:[[30,60],[45,85],[65,120]]},
 concrete:{name:'Reinforced concrete',short:'Concrete',color:0xa9adb5,sizes:[[50,70],[80,95],[110,130]]},
 steel:{name:'Steel I-beam',short:'Steel',color:0x7d8fa8,sizes:[[70,110],[100,150],[140,200]]}};
const SIZES=['Small','Medium','Large'],DEPTH=[.2,.29,.4];
const BRIEF={L:8,P:30},LIMIT=.8;
const UCOL=u=>u<=LIMIT?0x8de8c3:u<=1?0xffd59c:0xff6b8a;
const UCSS=u=>u<=LIMIT?'#8DE8C3':u<=1?'#FFD59C':'#ff9bb2';
const ULBL=u=>u<=LIMIT?'PASS':u<=1?'REVIEW: too little margin':'FAIL: overloaded';
function evalBeam(mat,size,L,P){const s=MATS[mat].sizes[size],M=P*L/4;return{M,cap:s[0],u:M/s[0],cost:s[1]*L}}
function cheapestPass(){let best=null;for(const k in MATS)for(let s=0;s<3;s++){const r=evalBeam(k,s,BRIEF.L,BRIEF.P);if(r.u<=LIMIT&&(!best||r.cost<best.cost))best=Object.assign({mat:k,size:s},r)}return best}
let lab;
function resetLab(){lab={mat:'timber',size:0,L:BRIEF.L,P:BRIEF.P,tries:0,done:false,target:0,result:null};applyBeam()}

function drawLab(r){if(!labCv)return;const x=labCv.getContext('2d');
 x.fillStyle='#0b1130';x.fillRect(0,0,512,300);x.strokeStyle='#FFB35C';x.lineWidth=6;x.strokeRect(3,3,506,294);
 x.fillStyle='#FFB35C';x.font='bold 30px system-ui,sans-serif';x.fillText('Test rig 2 · live readout',24,48);
 x.font='22px system-ui,sans-serif';x.fillStyle='#d6e0ff';
 [`${MATS[lab.mat].name} · ${SIZES[lab.size]}`,`Span ${lab.L} m · centre load ${lab.P} kN`,`M = P × L ÷ 4 = ${r.M.toFixed(1)} kN·m`,`Capacity ${r.cap} kN·m (illustrative)`].forEach((l,i)=>x.fillText(l,24,90+i*32));
 x.fillStyle=UCSS(r.u);x.font='bold 24px system-ui,sans-serif';x.fillText(`Utilisation ${Math.round(r.u*100)}% · ${r.u<=LIMIT?'PASS':r.u<=1?'REVIEW':'FAIL'}`,24,232);
 x.fillStyle='#ffffff22';x.fillRect(24,248,464,24);x.fillStyle=UCSS(r.u);x.fillRect(24,248,464*Math.min(1,r.u/1.5),24);
 x.fillStyle='#ffffff';x.fillRect(24+464*LIMIT/1.5-1,242,3,36);x.font='16px system-ui,sans-serif';x.fillText('80%',24+464*LIMIT/1.5+6,288);
 labTex.needsUpdate=true}
function applyBeam(){const r=evalBeam(lab.mat,lab.size,lab.L,lab.P);lab.target=Math.min(r.u,1.6)*.2;if(!beam)return;
 const d=DEPTH[lab.size];beam.scale.y=d;beam.position.y=.92+d/2;beam.material.color.setHex(MATS[lab.mat].color);beam.material.emissive.setHex(UCOL(r.u));
 lamp.material.color.setHex(UCOL(r.u));lamp.material.emissive.setHex(UCOL(r.u));drawLab(r)}
function bendBeam(def){const pos=beamGeo.attributes.position,a=pos.array,sy=beam.scale.y;
 for(let i=0;i<pos.count;i++){let s=(beamBase[i*3]+2.5)/5;s=Math.max(0,Math.min(1,s));if(s>.5)s=1-s;a[i*3+1]=beamBase[i*3+1]-def*(3*s-4*s*s*s)/sy}
 pos.needsUpdate=true;beamGeo.computeVertexNormals();ram.position.y=beam.position.y+sy/2-def;shownDef=def;shownSy=sy}

/* ------------------------------------------------------------------ site stages */
const STAGES=[
 ['Site survey','Surveyors measure the land, levels and boundaries and test the ground.'],
 ['Foundations','Excavate and pour footings or a slab that spread the load into the ground.'],
 ['Structural frame','Columns, beams and floors go up: the skeleton that carries the loads.'],
 ['Roof & envelope','Roof, walls and windows make the building weathertight.'],
 ['Services & fit-out','Electrics, plumbing, heating, ventilation, then interiors.'],
 ['Inspection & handover','Inspectors check it meets the approved design and safety rules.']];
const STAGE_HINT=['Before anything is built, the team needs to know exactly what the land is like.','Nothing can stand up until there is something solid underneath to carry the weight.','The skeleton must be in place before you can hang a roof and walls on it.','You need to keep the rain out before installing electrics and interiors.','Pipes and wiring go in before the final finishes.','The last step checks everything before people move in.'];
const DISPLAY=[3,0,5,2,4,1];
let site;
function resetSite(){site={n:0,mistakes:0,done:false};showStages()}
function showStages(){stageGroups.forEach((g,i)=>{const v=i<site.n;if(v&&!g.visible){g.visible=true;g.scale.setScalar(.02)}else if(!v){g.visible=false;g.scale.setScalar(1)}})}

/* ------------------------------------------------------------------ building */
function build(B){
 const {scene,C,M,glow,box,collider,hotspot,npc,person,textSprite,panelTexture,screen,shell,plant}=B;
 shell({lobby:0xcdd1da,corridor:0xbcc1cc,left:0x3b4152,leftOpts:{roughness:.75},right:0x8a7458,rightOpts:{roughness:.7},wall:0xe4e2dd,trim:ORANGE});
 const hat=(g,c)=>{const m=M(c,{roughness:.35});const h=new THREE.Mesh(new THREE.SphereGeometry(.175,16,10,0,Math.PI*2,0,Math.PI/2),m);h.position.y=1.83;g.add(h);
  const b=new THREE.Mesh(new THREE.CylinderGeometry(.215,.215,.02,18),m);b.position.set(0,1.835,.03);g.add(b);return g};
 const steelM=M(0x8796b5,{metalness:.6,roughness:.3}),concM=M(0xd9d6cf),cableM=M(0xdfe6ff,{metalness:.5});

 // lobby: welcome desk + Nadia
 box(5,1.05,1.1,M(0x2f3647,{roughness:.35,metalness:.35}),0,.525,4);box(5.1,.06,1.2,glow(ORANGE),0,1.08,4);box(5,.16,.02,glow(STEEL),0,.62,4.56);collider(-2.6,3.4,2.6,4.6);
 const nadia=npc(hat(person({skin:0x7a4a2a,hair:0x1d1a1f,style:'short',outfit:0x2a3358,coat:ORANGE,badge:true}),0xfafbff));nadia.position.set(0,0,2.9);scene.add(nadia);collider(-.35,2.55,.35,3.25);
 const nt=textSprite('Nadia','#FFB35C',.75,'Chief engineer');nt.position.set(0,2.35,2.9);scene.add(nt);
 hotspot('chief',0,5.7,1.9,'Talk to Nadia, the chief engineer',[nadia]);
 cube=new THREE.Mesh(new THREE.BoxGeometry(.62,.62,.62,2,2,2),new THREE.MeshBasicMaterial({color:ORANGE,wireframe:true}));cube.position.set(0,3.05,4);scene.add(cube);
 const sign=textSprite('Forge & Form','#FFB35C',1.25,'Engineering · Architecture · Construction');sign.position.set(0,3.4,.2);scene.add(sign);
 const grid=new THREE.GridHelper(13.6,34,0x6f8fd8,0xa9b6d6);grid.position.set(0,.006,7);scene.add(grid);
 // scale models on plinths
 const plinth=(x,z,label,sub)=>{box(1.7,.9,1.1,M(0xf3f2ee,{roughness:.4}),x,.45,z);box(1.74,.04,1.14,glow(ORANGE),x,.92,z);collider(x-.9,z-.6,x+.9,z+.6);
  const t=textSprite(label,'#FFB35C',.55,sub);t.position.set(x,2.2,z);scene.add(t);const g=new THREE.Group();g.position.set(x,.94,z);scene.add(g);return g};
 const sb=plinth(-6.5,7.6,'Suspension bridge','Scale model · 1:500');
 box(1.5,.05,.26,concM,0,.18,0,sb);for(const s of [-1,1])for(const z of [-.09,.09])box(.06,.62,.06,steelM,s*.42,.31,z,sb);
 const cable=(x1,y1,x2,y2,z)=>{const dx=x2-x1,dy=y2-y1;const c=box(Math.hypot(dx,dy),.015,.015,cableM,(x1+x2)/2,(y1+y2)/2,z,sb);c.rotation.z=Math.atan2(dy,dx)};
 for(const z of [-.09,.09]){cable(-.75,.2,-.42,.62,z);cable(.42,.62,.75,.2,z);cable(-.42,.62,0,.24,z);cable(0,.24,.42,.62,z)}
 const tw=plinth(6.5,7.6,'High-rise tower','Concept model · 1:400');
 for(let i=0;i<7;i++)box(.6-i*.03,.16,.6-i*.03,M(i%2?0xbfe3ff:0x9fc3e8,{metalness:.4,roughness:.2}),0,.08+i*.17,0,tw);box(.04,.35,.04,steelM,0,1.35,0,tw);
 const ab=plinth(-6.5,11.4,'Arch bridge','Scale model · 1:300');
 const arch=new THREE.Mesh(new THREE.TorusGeometry(.6,.04,8,32,Math.PI),concM);ab.add(arch);box(1.5,.05,.3,concM,0,.64,0,ab);
 for(const x of [-.45,-.25,.25,.45]){const h=.64-Math.sqrt(.36-x*x);box(.04,h,.2,concM,x,.64-h/2,0,ab)}
 const dm=plinth(6.5,11.4,'Timber gridshell','Concept model · 1:200');
 dm.add(new THREE.Mesh(new THREE.SphereGeometry(.55,12,6,0,Math.PI*2,0,Math.PI/2),new THREE.MeshBasicMaterial({color:0xc8955a,wireframe:true})));box(1.3,.02,.9,M(0x7fc59a,{roughness:.9}),0,.01,0,dm);
 hotspot('models',-6.5,6.3,1.5,'Look at the scale models',[sb,ab]);
 screen(3,1.75,panelTexture('Projects in Talent City',['Riverside Library · design','Harbour footbridge · testing','Northgate School · on site'],'#FFB35C'),-9.83,1.8,4.2,Math.PI/2);
 screen(3,1.75,panelTexture('Site safety record',['412 days without a','lost-time injury','(illustrative)'],'#8DE8C3'),9.83,1.8,4.2,-Math.PI/2);
 plant(-3.7,.9);plant(3.7,.9);plant(-9.2,13.1);plant(9.2,13.1);
 const sl=textSprite('← Structures Lab','#9ebdff',.95);sl.position.set(-2.2,3.25,-10);scene.add(sl);
 const so=textSprite('Site Office →','#FFB35C',.95);so.position.set(2.2,3.25,-10);scene.add(so);

 // structures lab: strong floor, reaction frame, test beam
 box(7.4,.04,3.2,M(0x262b38,{roughness:.9}),-10.5,.02,-11);
 const yel=M(0xffcf3a,{emissive:0x5a4300,emissiveIntensity:.5});
 for(const z of [-12.6,-9.4])box(7.4,.03,.08,yel,-10.5,.045,z);for(const x of [-14.2,-6.8])box(.08,.03,3.2,yel,x,.045,-11);
 const frameM=M(0x3f6fd8,{metalness:.5,roughness:.35});
 for(const x of [-13.75,-7.25])box(.26,2.75,.3,frameM,x,1.375,-11);box(6.8,.3,.36,frameM,-10.5,2.6,-11);
 const act=new THREE.Mesh(new THREE.CylinderGeometry(.15,.15,.55,16),M(0xd9dde8,{metalness:.7,roughness:.25}));act.position.set(-10.5,2.175,-11);scene.add(act);
 ram=new THREE.Group();const rod=new THREE.Mesh(new THREE.CylinderGeometry(.07,.07,1,12),M(0xeef2ff,{metalness:.85,roughness:.15}));rod.position.y=.55;ram.add(rod);
 const plate=new THREE.Mesh(new THREE.BoxGeometry(.34,.06,.34),M(0x5a6070,{metalness:.5}));plate.position.y=.03;ram.add(plate);ram.position.set(-10.5,1.2,-11);scene.add(ram);
 for(const x of [-13,-8]){box(.6,.8,.7,M(0x5a6070,{metalness:.4}),x,.4,-11);const pin=new THREE.Mesh(new THREE.CylinderGeometry(.06,.06,.6,12),M(0xeef2ff,{metalness:.8,roughness:.2}));pin.rotation.x=Math.PI/2;pin.position.set(x,.86,-11);scene.add(pin)}
 beamGeo=new THREE.BoxGeometry(5.6,1,.36,40,1,1);beamBase=Float32Array.from(beamGeo.attributes.position.array);
 beam=new THREE.Mesh(beamGeo,M(0xc8955a,{roughness:.5,emissive:0x8de8c3,emissiveIntensity:.32}));beam.position.set(-10.5,1.02,-11);scene.add(beam);
 lamp=new THREE.Mesh(new THREE.SphereGeometry(.12,16,12),M(0x8de8c3,{emissive:0x8de8c3,emissiveIntensity:1}));lamp.position.set(-10.5,2.87,-11);scene.add(lamp);
 collider(-14,-11.45,-7,-10.55);
 const rl=textSprite('Test rig 2','#9ebdff',.6,'3-point bending');rl.position.set(-14.6,3.1,-11);scene.add(rl);
 labCv=document.createElement('canvas');labCv.width=512;labCv.height=300;labTex=new THREE.CanvasTexture(labCv);labTex.encoding=THREE.sRGBEncoding;
 box(3.5,2.1,.06,M(0x0b0f26),-10.5,1.75,-15.9);screen(3.4,2,labTex,-10.5,1.75,-15.86);
 screen(3,1.75,panelTexture('Bending basics',['M = P × L ÷ 4','Utilisation = M ÷ capacity','Design target ≤ 80%'],'#9ebdff'),-15.4,1.75,-15.83);
 screen(3,1.75,panelTexture('Lab rules',['Eye protection on','Stand clear of the rig','Stop if anything cracks'],'#FFB35C'),-5.8,1.75,-15.83);
 // material samples shelf
 box(.5,1.6,3,M(0x2a3040,{metalness:.3}),-17.55,.8,-8.5);collider(-17.85,-10.05,-17.25,-6.95);
 box(.4,.2,.9,M(0xc8955a),-17.55,1.7,-9.4);box(.3,.3,.3,concM,-17.55,1.75,-8.5);
 box(.32,.04,.8,steelM,-17.55,1.62,-7.6);box(.04,.24,.8,steelM,-17.55,1.76,-7.6);box(.32,.04,.8,steelM,-17.55,1.9,-7.6);
 const ms=textSprite('Material samples','#9ebdff',.55);ms.position.set(-17.2,2.55,-8.5);scene.add(ms);
 // workbench with laptop
 box(2.4,.08,.9,M(0x6b7891,{metalness:.3}),-15.2,.86,-5.1);for(const s of [-1,1])box(.08,.82,.8,M(0x3c4458),-15.2+s*1.12,.41,-5.1);collider(-16.45,-5.6,-13.95,-4.6);
 box(.6,.36,.03,M(0x1b1f33),-15.2,1.12,-5.3).rotation.x=-.25;screen(.56,.32,panelTexture('Beam calc',['M = P·L/4','δ ∝ P·L³'],'#9ebdff'),-15.2,1.12,-5.28);
 const tech=npc(hat(person({skin:0xc98e66,hair:0x1d1a1f,style:'short',outfit:0x3f6fd8,pants:0x2a3358}),0xffcf3a));tech.position.set(-6.3,0,-12.6);tech.rotation.y=-.9;scene.add(tech);collider(-6.65,-12.95,-5.95,-12.25);
 techTag=textSprite('Tomás','#9ebdff',.75,'Test technician');techTag.position.set(-6.3,2.4,-12.6);scene.add(techTag);
 hotspot('lab',-10.5,-8.4,2,'Run the beam test with Tomás',[tech,beam]);
 const ll=new THREE.PointLight(0xdfe8ff,.7,12);ll.position.set(-10.5,3.2,-10);scene.add(ll);

 // site office / design studio
 const wood=M(0x6b5240,{roughness:.6});
 box(3.2,.08,1.7,M(0xf1efe8),12,.9,-11.8);for(const sx of [-1,1])for(const sz of [-1,1])box(.08,.86,.08,wood,12+sx*1.5,.43,-11.8+sz*.75);collider(10.35,-12.7,13.65,-10.9);
 box(2.5,.04,1.3,M(0x7fbf7a,{roughness:.9}),12,.96,-11.8);
 const base=new THREE.Group();base.position.set(12,.98,-11.8);scene.add(base);
 const sg=()=>{const g=new THREE.Group();g.visible=false;base.add(g);stageGroups.push(g);return g};
 const g0=sg(),redM=M(0xff6b5a),strM=M(0xfafbff);
 for(const sx of [-1,1])for(const sz of [-1,1]){const st=new THREE.Mesh(new THREE.CylinderGeometry(.012,.012,.2,6),redM);st.position.set(sx*.72,.1,sz*.42);g0.add(st)}
 for(const sz of [-1,1])box(1.44,.008,.008,strM,0,.12,sz*.42,g0);for(const sx of [-1,1])box(.008,.008,.84,strM,sx*.72,.12,0,g0);
 const g1=sg();box(1.42,.06,.82,concM,0,.03,0,g1);
 const g2=sg();for(const x of [-.6,0,.6])for(const z of [-.34,.34])box(.04,.5,.04,steelM,x,.31,z,g2);for(const z of [-.34,.34])box(1.26,.04,.05,steelM,0,.56,z,g2);box(1.26,.03,.72,concM,0,.32,0,g2);
 const g3=sg(),glassM=M(0x9fd2ff,{transparent:true,opacity:.55,metalness:.4,roughness:.15});box(1.38,.04,.78,M(0x56607a),0,.6,0,g3);
 for(const z of [-.36,.36])box(1.3,.5,.015,glassM,0,.33,z,g3);for(const x of [-.66,.66])box(.015,.5,.7,glassM,x,.33,0,g3);
 const g4=sg();box(.3,.12,.2,M(0xb9c2d6,{metalness:.6}),-.35,.68,0,g4);for(const x of [.15,.45]){const p=box(.26,.02,.5,M(0x1d3c7a,{metalness:.5,roughness:.2}),x,.68,0,g4);p.rotation.z=.35}
 const pipe=new THREE.Mesh(new THREE.CylinderGeometry(.015,.015,.55,8),M(C.cyan));pipe.position.set(.69,.33,.2);g4.add(pipe);
 const g5=sg();const ok=textSprite('✓ Inspected','#8DE8C3',.45);ok.position.set(0,1.05,0);g5.add(ok);
 const dara=npc(hat(person({skin:0xe8b896,hair:0x5a3b22,style:'short',outfit:0x2a3358,coat:0xffcf3a,badge:true}),0xffcf3a));dara.position.set(12,0,-13.3);scene.add(dara);collider(11.65,-13.65,12.35,-12.95);
 daraTag=textSprite('Dara','#FFB35C',.75,'Site manager');daraTag.position.set(12,2.4,-13.3);scene.add(daraTag);
 hotspot('site',12,-9.3,2,'Plan the build with Dara',[dara,base]);
 // PPE station
 box(2.6,1.3,.06,wood,6.2,1.6,-15.92);
 [0xfafbff,0xffcf3a,ORANGE,0x67a8ff].forEach((c,i)=>{const h=new THREE.Mesh(new THREE.SphereGeometry(.17,14,8,0,Math.PI*2,0,Math.PI/2),M(c,{roughness:.35}));h.position.set(5.25+i*.63,1.95,-15.75);scene.add(h)});
 for(let i=0;i<3;i++)box(.42,.55,.04,M(ORANGE,{emissive:0x5a3000,emissiveIntensity:.3}),5.5+i*.7,1.25,-15.86);
 const pp=textSprite('PPE station','#FFB35C',.6,'Hard hat · boots · hi-vis');pp.position.set(6.2,2.75,-15.6);scene.add(pp);
 screen(3,1.75,panelTexture('Site safety',['Hard hat · boots · hi-vis','Stop work if it’s unsafe','Report every hazard'],'#FFB35C'),10.5,1.75,-15.83);
 screen(3,1.75,panelTexture('Library · 3D model','','#9ebdff',x=>{x.strokeStyle='#9ebdff';x.lineWidth=3;
  const P=[[150,250],[330,250],[400,210],[220,210]];x.beginPath();P.forEach((p,i)=>i?x.lineTo(p[0],p[1]):x.moveTo(p[0],p[1]));x.closePath();x.stroke();
  x.beginPath();P.forEach((p,i)=>i?x.lineTo(p[0],p[1]-110):x.moveTo(p[0],p[1]-110));x.closePath();x.stroke();P.forEach(p=>{x.beginPath();x.moveTo(p[0],p[1]);x.lineTo(p[0],p[1]-110);x.stroke()});
  x.fillStyle='#d6e0ff';x.font='20px system-ui';x.fillText('Fictional project',300,285)}),14.8,1.75,-15.83);
 screen(3.6,2.1,panelTexture('Site plan · Library','','#FFB35C',x=>{x.fillStyle='#2d6fb066';x.beginPath();x.moveTo(0,250);x.bezierCurveTo(160,210,300,290,512,240);x.lineTo(512,300);x.lineTo(0,300);x.fill();
  x.strokeStyle='#FFB35C';x.setLineDash([10,8]);x.lineWidth=3;x.strokeRect(70,80,330,150);x.setLineDash([]);x.fillStyle='#9ebdff88';x.fillRect(150,110,170,90);
  x.strokeStyle='#ff9bb2';x.beginPath();x.arc(360,120,70,0,Math.PI*2);x.stroke();x.fillStyle='#d6e0ff';x.font='18px system-ui';x.fillText('Library',200,160);x.fillText('Crane radius',320,215);x.fillText('River',30,285);
  x.font='bold 22px system-ui';x.fillText('N ↑',450,100)}),17.83,1.75,-10,-Math.PI/2);
 const draft=(x,z)=>{box(1.4,.04,.9,M(0xfafbff),x,1.0,z).rotation.x=-.45;box(1.2,.01,.7,M(0xdfe9ff),x,1.03,z+.01).rotation.x=-.45;for(const s of [-1,1])box(.06,.95,.06,M(0x3c4458),x+s*.6,.47,z);
  const arm=box(.04,.04,.6,M(0x3c4458),x+.6,1.45,z-.1);arm.rotation.x=.5;box(.14,.08,.14,glow(0xfff1d6),x+.6,1.55,z+.15);collider(x-.75,z-.5,x+.75,z+.5)};
 draft(6.6,-6.2);draft(9.4,-6.2);
 box(.8,1.3,.6,M(0x8a94ad,{metalness:.4}),16.9,.65,-5.2);collider(16.5,-5.5,17.3,-4.9);
 const dl=new THREE.PointLight(0xffe6c4,.6,12);dl.position.set(12,3.1,-10);scene.add(dl);
}

/* ------------------------------------------------------------------ structures lab panel */
function renderLab(ix,msg,cls){const r=evalBeam(lab.mat,lab.size,lab.L,lab.P);if(!$('fgM'))return;
 $('fgMat').innerHTML=Object.keys(MATS).map(k=>`<button data-mat="${k}" class="${lab.mat===k?'on':''}" aria-pressed="${lab.mat===k}">${MATS[k].name}</button>`).join('');
 $('fgSize').innerHTML=SIZES.map((s,i)=>{const o=MATS[lab.mat].sizes[i];return `<button data-size="${i}" class="${lab.size===i?'on':''}" aria-pressed="${lab.size===i}">${s} · ${o[0]} kN·m · $${o[1]}/m</button>`}).join('');
 $('fgMat').querySelectorAll('[data-mat]').forEach(b=>b.onclick=()=>{lab.mat=b.dataset.mat;applyBeam();renderLab(ix)});
 $('fgSize').querySelectorAll('[data-size]').forEach(b=>b.onclick=()=>{lab.size=+b.dataset.size;applyBeam();renderLab(ix)});
 $('fgLv').textContent=lab.L+' m';$('fgPv').textContent=lab.P+' kN';$('fgL').value=lab.L;$('fgP').value=lab.P;
 $('fgM').textContent=`${lab.P} × ${lab.L} ÷ 4 = ${r.M.toFixed(1)} kN·m`;$('fgCap').textContent=r.cap+' kN·m';
 const u=$('fgU');u.textContent=Math.round(r.u*100)+'% · '+ULBL(r.u);u.style.color=UCSS(r.u);$('fgCost').textContent=`${money(r.cost)} (${lab.L} m × $${MATS[lab.mat].sizes[lab.size][1]}/m)`;
 const t=$('fgTask');t.className='ix-task '+(cls||'');
 t.innerHTML=(msg?msg+'<br>':'')+`<span style="opacity:.85"><b>Goal:</b> span <b>${BRIEF.L} m</b>, load <b>${BRIEF.P} kN</b>, utilisation <b>≤ 80%</b>, lowest cost. Watch the beam on the rig as you change it.</span>`}
function openLab(ix){
 techTag.visible=false;
 ix.openPanel({hideAvatar:true,
  html:`<div class="k">Structures Lab · Brief FB-08</div><h3>Choose a footbridge beam</h3>
   <div class="ix-info"><b>Design brief</b>A simply supported footbridge beam spans <b>${BRIEF.L} m</b> and must carry a design point load of <b>${BRIEF.P} kN</b> at mid-span. Keep utilisation at <b>80% or less</b> and choose the <b>cheapest</b> beam that passes.</div>
   <div class="k">Material</div><div class="layers" id="fgMat"></div>
   <div class="k">Section size · capacity · cost</div><div class="layers" id="fgSize"></div>
   <div class="ix-range"><label>Span L <strong id="fgLv"></strong></label><input type="range" id="fgL" min="4" max="12" step="1" value="${lab.L}" aria-label="Span in metres"></div>
   <div class="ix-range"><label>Centre load P <strong id="fgPv"></strong></label><input type="range" id="fgP" min="10" max="50" step="5" value="${lab.P}" aria-label="Centre load in kilonewtons"></div>
   <div class="ix-metric"><span>Bending moment M = P × L ÷ 4</span><strong id="fgM"></strong></div>
   <div class="ix-metric"><span>Beam capacity</span><strong id="fgCap"></strong></div>
   <div class="ix-metric"><span>Utilisation = M ÷ capacity</span><strong id="fgU"></strong></div>
   <div class="ix-metric"><span>Material cost</span><strong id="fgCost"></strong></div>
   <div class="ix-task" id="fgTask"></div>
   <div style="display:flex;gap:8px"><button class="ix-secondary" id="fgBrief" style="margin-top:0">↺ Design case</button><button class="ix-primary" id="fgSubmit" style="margin-top:0">Submit design</button></div>
   <div class="ix-note">Simplified textbook formula for one central point load; the beam’s own weight is ignored. Capacities and costs are made-up teaching values, not design data. The bend on the rig is exaggerated to show utilisation.</div>`,
  bind(){renderLab(ix);
   $('fgL').oninput=()=>{lab.L=+$('fgL').value;applyBeam();renderLab(ix)};
   $('fgP').oninput=()=>{lab.P=+$('fgP').value;applyBeam();renderLab(ix)};
   $('fgBrief').onclick=()=>{lab.L=BRIEF.L;lab.P=BRIEF.P;applyBeam();renderLab(ix,'Span and load reset to the design case.')};
   $('fgSubmit').onclick=()=>{if(lab.done)return;
    if(lab.L!==BRIEF.L||lab.P!==BRIEF.P){renderLab(ix,`<b>Check the test case.</b> You must design for the brief: span ${BRIEF.L} m and load ${BRIEF.P} kN. Tap <b>↺ Design case</b>.`,'no');return}
    lab.tries++;const r=evalBeam(lab.mat,lab.size,lab.L,lab.P),best=cheapestPass();
    if(r.u>LIMIT){renderLab(ix,`<b>Not safe enough.</b> Utilisation is ${Math.round(r.u*100)}%, above the 80% limit. ${r.u>1?'The beam would be overloaded.':'It might hold, but there is too little safety margin.'} Try a stronger material or a bigger section.`,'no');return}
    if(r.cost>best.cost+.5){renderLab(ix,`<b>Safe (${Math.round(r.u*100)}%), but not the best value.</b> Another option also passes ≤ 80% and costs less than ${money(r.cost)}. Compare the capacities and the cost per metre.`,'no');return}
    lab.done=true;lab.result=Object.assign({mat:lab.mat,size:lab.size},r);score+=lab.tries===1?1:0;
    renderLab(ix,`<b>✓ Design accepted.</b> ${MATS[lab.mat].name} (${SIZES[lab.size].toLowerCase()}) at ${Math.round(r.u*100)}% utilisation for ${money(r.cost)}: the cheapest beam that keeps a safety margin.`,'ok');
    setTimeout(()=>{ix.closePanel();afterLab(ix)},1500)}},
  camera(p,l){const m=innerWidth<=760;if(m){p.set(-10.5,7.2,-4.6);l.set(-10.5,-.4,-11)}else{p.set(-9.7,2.3,-6.1);l.set(-9.7,1.15,-11)}},
  onClose(){techTag.visible=true}});
}
function afterLab(ix){
 const T='Tomás · Test technician',r=lab.result;
 ix.dialog(T,`Nice work. The rig agrees with your maths: <b>M = ${BRIEF.P} × ${BRIEF.L} ÷ 4 = ${r.M} kN·m</b>, and the ${MATS[r.mat].name.toLowerCase()} beam is at <b>${Math.round(r.u*100)}%</b> of its capacity. One question before I sign the test sheet.`,[{label:'Go ahead',fn:()=>
  ix.question('Structures Lab · Safety margin','Why do engineers keep utilisation at about 80% or less, instead of using a beam right up to 100% of its capacity?',
   ['To leave a safety margin: real loads, material quality, workmanship and wear can all differ from the calculation','Because bigger beams always look better','There is no reason: 100% is perfectly fine'],0,
   'Real design codes add <b>safety factors</b> to loads and materials because nothing is known perfectly: crowds can be heavier than expected, timber has knots, steel can corrode. A margin means a small surprise doesn’t become a failure.',f=>{score+=f;ix.closeDialog();
    const g=ix.awardOnce('forge_lab',60);ix.advance(2);ix.toast('✓ Beam test signed off'+(g?` · +${g} XP`:''))})}]);
}
function talkLab(ix){
 const T='Tomás · Test technician';
 if(ix.objIdx<1){ix.dialog(T,'Hi! Please check in with Nadia at the front desk first. Lab safety briefing and all that.',[{label:'Will do',fn:ix.closeDialog}]);return}
 if(ix.objIdx>1){ix.dialog(T,'Your test sheet is signed and filed. Dara in the Site Office is waiting for you.',[{label:'Thanks, Tomás',fn:ix.closeDialog}]);return}
 if(lab.done){afterLab(ix);return}
 ix.dialog(T,`Hi ${ix.name}! This rig pushes down on the middle of a beam, just like people crowding the centre of a footbridge. Pick a material and section size and watch how much the beam bends. We need a design that’s <b>safe</b> and <b>good value</b>.`,[{label:'Open the test rig →',fn:()=>{ix.closeDialog();openLab(ix)}}]);
}

/* ------------------------------------------------------------------ site office panel */
function renderSite(ix,msg,cls){const seq=$('fgSeq');if(!seq)return;
 seq.innerHTML=STAGES.slice(0,site.n).map((s,i)=>`<div class="ix-metric" style="display:block;line-height:1.5"><b style="color:#8DE8C3">${i+1}. ${s[0]}</b> <span style="color:#aab6da">${s[1]}</span></div>`).join('');
 const el=$('fgStages');el.innerHTML=DISPLAY.map(i=>`<button data-st="${i}" class="${i<site.n?'on':''}" ${i<site.n?'disabled':''}>${i<site.n?'✓ ':''}${STAGES[i][0]}</button>`).join('');
 el.querySelectorAll('[data-st]').forEach(b=>b.onclick=()=>{const i=+b.dataset.st;if(i<site.n||site.n>=STAGES.length)return;
  if(i===site.n){site.n++;showStages();renderSite(ix,site.n>=STAGES.length?'✓ Sequence complete. The model on the table is fully built.':`✓ Correct: <b>${STAGES[i][0]}</b>.`,'ok')}
  else{site.mistakes++;renderSite(ix,`Not yet. ${STAGE_HINT[site.n]}`,'no')}});
 const t=$('fgSiteTask'),n=site.n;t.className='ix-task '+(cls||'');
 t.innerHTML=(msg?msg+'<br>':'')+(n<STAGES.length?`<span style="opacity:.85"><b>Stage ${n+1} of ${STAGES.length}:</b> which stage comes next?</span>`:'')+`<div class="bar"><div style="width:${n/STAGES.length*100}%"></div></div>`;
 $('fgSiteDone').style.display=n>=STAGES.length?'block':'none'}
function openSite(ix){
 daraTag.visible=false;
 ix.openPanel({hideAvatar:true,
  html:`<div class="k">Site Office · Riverside Library</div><h3>Plan the build sequence</h3>
   <div class="ix-info"><b>Your task</b>Tap the six construction stages in the order they happen on site. The model on the table grows as you go.</div>
   <div id="fgSeq" style="display:grid;gap:6px"></div>
   <div class="layers" id="fgStages"></div>
   <div class="ix-task" id="fgSiteTask"></div>
   <button class="ix-primary" id="fgSiteDone" style="display:none">Next: a safety call →</button>
   <div class="ix-note">A simplified sequence for a small building. Real projects overlap stages and include permits, design approvals and many inspections along the way.</div>`,
  bind(){renderSite(ix);$('fgSiteDone').onclick=()=>{if(site.done)return;site.done=true;score+=site.mistakes===0?1:0;ix.closePanel();safetyCall(ix)}},
  camera(p,l){const m=innerWidth<=760;if(m){p.set(12,5.2,-6.6);l.set(12,-.3,-11.8)}else{p.set(12.8,2.55,-8.7);l.set(12.8,.95,-11.8)}},
  onClose(){daraTag.visible=true}});
}
function safetyCall(ix){
 ix.question('Dara · Site manager','Week 6, frame stage. Walking the site, you see a worker on the first-floor edge where a guardrail is missing, right above a busy walkway. What do you do?',
  ['Stop work in that area, keep people clear, report it to the site manager straight away, and keep your own PPE on','Say nothing: the programme is already behind schedule','Climb up and fix the guardrail yourself without telling anyone'],0,
  'On site, <b>anyone</b> can and should stop work when they see danger. Make the area safe, <b>report</b> it so it’s fixed properly and recorded, and always wear your <b>PPE</b> (hard hat, safety boots, hi-vis). Falls from height are one of the biggest causes of serious injury in construction.',f=>{score+=f;
   ix.dialog('Dara · Site manager',`Exactly right, ${ix.name}. Good sequencing and good safety habits: that’s what keeps a site running. Nadia will want to hear how you got on.`,[{label:'Back to Nadia →',fn:()=>{ix.closeDialog();const g=ix.awardOnce('forge_site',60);ix.advance(3);ix.toast('✓ Build plan approved'+(g?` · +${g} XP`:''))}}])});
}
function talkSite(ix){
 const D='Dara · Site manager';
 if(ix.objIdx<2){ix.dialog(D,`Hi! ${ix.objIdx<1?'Check in with Nadia first, then':'Finish the beam test with Tomás in the Structures Lab first, then'} come and help me plan the Riverside Library build.`,[{label:'Got it',fn:ix.closeDialog}]);return}
 if(ix.objIdx>2){ix.dialog(D,'The programme is pinned on the wall. Thanks for the help!',[{label:'Anytime',fn:ix.closeDialog}]);return}
 if(site.done){safetyCall(ix);return}
 ix.dialog(D,`${ix.name}, welcome to the Site Office. We break ground on the <b>Riverside Library</b> next month. Before the crews arrive, we need the stages in the right order.`,[{label:'Show me the plan →',fn:()=>{ix.closeDialog();openSite(ix)}}]);
}

/* ------------------------------------------------------------------ chief engineer */
function talkChief(ix){
 const N='Nadia · Chief engineer';
 if(ix.objIdx===0){
  ix.dialog(N,`Welcome to Forge & Form, <b>${ix.name}</b>! I’m Nadia, the chief engineer. Today you’ll test a footbridge beam in our Structures Lab and plan a real build in the Site Office. Everything here is fictional, but the thinking is real. What interests you most?`,
   [['Structures and bridges','structures'],['Architecture and design','architecture'],['Building sites and construction','construction']].map(([label,v])=>({label,fn:()=>{interest=v;
    ix.dialog(N,(v==='architecture'?'Great! Architects and engineers work side by side: beauty only works if it stands up. ':v==='construction'?'Great! You’ll love the Site Office, where plans meet reality. ':'Great! Structural engineers make sure things carry their loads safely. ')+'Start with Tomás in the <b>Structures Lab</b>: up the corridor, first door on the left.',
     [{label:'Let’s go →',fn:()=>{ix.closeDialog();ix.nova.visible=true;ix.advance(1);ix.toast('✓ Checked in. NOVA has joined you.')}}])}})));return}
 if(ix.objIdx<3){ix.dialog(N,`Keep going, ${ix.name}! Next: <b>${CFG.objectives[ix.objIdx][0].toLowerCase()}</b>.`,[{label:'On it',fn:ix.closeDialog}]);return}
 if(ix.objIdx>3){ix.dialog(N,'Brilliant work today. The drawing board is always here for you.',[{label:'Thanks, Nadia',fn:ix.closeDialog}]);return}
 const r=lab.result||{mat:'concrete',size:1,u:.75,cost:760};
 ix.dialog(N,`Design review time. Here’s what you delivered today:<div class="vitals"><div>Beam<b>${MATS[r.mat].short}</b></div><div>Utilisation<b>${Math.round(r.u*100)}%</b></div><div>Cost<b>${money(r.cost)}</b></div><div>Build stages<b>6 / 6</b></div></div>`,[{label:'Start the review',fn:q1}]);
 function q1(){ix.question('Design review · Sustainability','The Riverside Library will be used for 60+ years. Which design choice will cut its energy use the most over its lifetime?',
  ['Good insulation and airtightness, with main windows facing the sun for daylight and shading against summer overheating','Large single-glazed windows on every side, with no shading','Extra decorative lighting on the facade all night'],0,
  'Buildings use most of their energy for <b>heating, cooling and lighting</b>. Insulation keeps heat where you want it, <b>orientation</b> brings in free daylight and winter sun, and <b>shading</b> stops summer overheating. It’s cheaper to design this in than to add it later.',f=>{score+=f;q2()})}
 function q2(){ix.question('Design review · Ethics','A client is pressing you to sign off the footbridge drawings tonight. Your final check shows one connection doesn’t meet the required safety margin. What do you do?',
  ['Refuse to sign until it’s fixed, explain the risk clearly, and record your decision','Sign it anyway: it will probably be fine, and the client is in a hurry','Quietly change the numbers so the check passes'],0,
  'Engineers have a duty to protect <b>public safety</b> above deadlines or pressure. Never sign off a design you know is unsafe: explain the risk, propose a fix and keep a written record. Professional codes of ethics for engineers around the world say the same.',f=>{score+=f;
   ix.dialog(N,`You checked the maths, sequenced a build safely, designed for the planet and stood firm on safety. That’s engineering, ${ix.name}.`,[{label:'Finish my shift →',fn:()=>ix.finish({icon:'⌁',title:'Forge & Form Structural Thinker',score,max:6,
    skills:['⌁ Calculating bending moment (M = P·L/4)','⚖ Balancing safety margin and cost','▦ Sequencing a construction project','⛑ Stopping work for a hazard and using PPE','☀ Designing for energy efficiency','✓ Putting public safety first']})}])})}
}
function modelsFact(ix){
 ix.dialog('NOVA · Bonus fact','Bridges come in a few basic forms. A <b>beam</b> bridge bends, like the beam in the lab. An <b>arch</b> carries its load mostly by squeezing (compression). A <b>suspension</b> bridge hangs its deck from cables that are pulled tight (tension). Engineers pick the form that suits the span, the ground and the budget.',[{label:'Interesting!',fn:()=>{ix.closeDialog();const g=ix.awardOnce('forge_models',10);if(g)ix.toast(`✦ Bonus fact · +${g} XP`)}}]);
}

const CFG={id:'forge',title:'Forge & Form Engineering',subtitle:'Junior engineer shift',enterLabel:'⌁ Enter Forge & Form Engineering: start a 3D shift →',badge:'Forge & Form Structural Thinker',
 objectives:[['Check in with Nadia, the chief engineer',[0,5.7]],['Test a footbridge beam in the Structures Lab',[-10.5,-8.4]],['Plan the build in the Site Office',[12,-9.3]],['Design review with Nadia',[0,5.7]],['Get your feedback and badge',null]],
 hints:['Welcome to <b>Forge & Form</b>! I’m <b>NOVA</b>, your learning guide. Check in with <b>Nadia</b>, the chief engineer, at the front desk.',
  'Head up the corridor to the <b>Structures Lab</b>, first door on the left. Tomás has a footbridge beam to test.',
  'Beam signed off! Cross the corridor to the <b>Site Office</b>. Dara needs a build plan.',
  'Build plan approved! Walk back to <b>Nadia</b> at the front desk for your design review.',
  'Shift complete. Open your <b>Career Passport</b> to see your new badge.'],
 build,
 interact(id,ix){const f={chief:talkChief,lab:talkLab,site:talkSite,models:modelsFact}[id];if(f)f(ix)},
 frame(dt,t){cube.rotation.y+=dt*.5;cube.rotation.x+=dt*.2;
  if(lab&&beam){beamDef+=(lab.target-beamDef)*Math.min(1,dt*4);if(Math.abs(beamDef-shownDef)>1e-4||beam.scale.y!==shownSy)bendBeam(beamDef);
   const u=evalBeam(lab.mat,lab.size,lab.L,lab.P).u;lamp.material.emissiveIntensity=u>1?.6+Math.max(0,Math.sin(t*8))*.9:1}
  for(const g of stageGroups)if(g.visible&&g.scale.x<1)g.scale.setScalar(Math.min(1,g.scale.x+dt*3))},
 reset(){score=0;interest='structures';resetLab();resetSite()}
};
resetLab();resetSite();
TI.register(CFG);
})();
