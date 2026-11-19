/* TALENTOPIA · Planet Lab Research Centre (district config for interior.js)
   Lead-scientist check-in, a Water Lab river investigation (hypothesis → replicate tests →
   classification → conclusion), a solar-array sizing calculation with CO₂ estimate and a
   process-safety alarm in the Energy & Process Lab, and a debrief on correlation vs causation
   and why scientists repeat and share their work. The river, school, people and all numbers
   are fictional and illustrative. */
(()=>{
'use strict';
const TI=window.TalentopiaInterior;if(!TI)return;
const $=id=>document.getElementById(id);
const MINT='#8DE8C3';
/* Water Lab: fictional Willow River samples and illustrative guideline ranges for this exercise */
const G={phMin:6.5,phMax:8.5,doMin:5,no3Max:10};
const SITES=[{id:'A',name:'Site A · Upstream forest',ph:7.4,do:9.1,no3:1.2},{id:'B',name:'Site B · Below the farmland',ph:7.9,do:3.6,no3:18.5},{id:'C',name:'Site C · Downstream, after the wetland',ph:7.2,do:6.3,no3:5.8}];
const OFFS=[[-1,2,-1],[2,-1,-1],[-1,-1,2]];
const HYPS=[['The river is polluted.','Too vague to test: which site, which measurement, compared with what?'],
 ['If fertiliser from the farms is reaching the river, Site B (below the farmland) will have higher nitrate and lower dissolved oxygen than Site A (upstream).',null],
 ['Rivers are important for wildlife.','True, but it isn’t a prediction you can check with these samples.']];
/* Energy Lab: illustrative solar sizing */
const PANEL_KW=.4,SUN=4.5,WINTER_SUN=2,PERF=.8,NEED=150,CO2F=.4,LIMIT=3.0,ALARM_BAR=3.6;
const PER_PANEL=PANEL_KW*SUN*PERF,MIN_PANELS=Math.ceil(NEED/PER_PANEL-1e-9);
let globe,globeWire,turbine,molecule,needle,beacon,alarmLight,kaiTag,mateoTag,score=0,wl,sol,alarmOn=false,bar=1.8;

/* ------------------------------------------------------------------ textures */
function earthTexture(){const cv=document.createElement('canvas');cv.width=512;cv.height=256;const x=cv.getContext('2d');
 const g=x.createLinearGradient(0,0,0,256);g.addColorStop(0,'#1d5b8f');g.addColorStop(.5,'#2a86c4');g.addColorStop(1,'#1d5b8f');x.fillStyle=g;x.fillRect(0,0,512,256);
 const land=[[95,70,48,30],[75,52,30,20],[140,165,22,42],[262,72,30,18],[272,148,32,44],[355,78,70,32],[390,110,30,22],[425,178,26,16],[200,30,40,10]];
 x.fillStyle='#5fae6e';land.forEach(([cx,cy,rx,ry])=>{x.beginPath();x.ellipse(cx,cy,rx,ry,.3,0,Math.PI*2);x.fill()});
 x.fillStyle='#c9b27a';[[285,120,14,10],[340,95,18,8]].forEach(([cx,cy,rx,ry])=>{x.beginPath();x.ellipse(cx,cy,rx,ry,0,0,Math.PI*2);x.fill()});
 x.fillStyle='#f4f8ff';x.fillRect(0,0,512,10);x.fillRect(0,238,512,18);
 x.strokeStyle='rgba(255,255,255,.55)';x.lineWidth=5;for(let i=0;i<7;i++){x.beginPath();const y=40+i*28;x.moveTo(i*70,y);x.bezierCurveTo(i*70+40,y-14,i*70+80,y+14,i*70+130,y);x.stroke()}
 const t=new THREE.CanvasTexture(cv);t.encoding=THREE.sRGBEncoding;return t}
function leafTexture(){const cv=document.createElement('canvas');cv.width=512;cv.height=300;const x=cv.getContext('2d');x.fillStyle='#173d29';x.fillRect(0,0,512,300);
 const greens=['#2f7a46','#3f9a57','#5cbe6f','#80d38a','#256b3c','#9be3a0'];
 for(let i=0;i<340;i++){x.fillStyle=greens[i%greens.length];x.beginPath();x.ellipse(Math.random()*512,Math.random()*300,8+Math.random()*12,4+Math.random()*6,Math.random()*Math.PI,0,Math.PI*2);x.fill()}
 for(let i=0;i<18;i++){x.fillStyle=['#f7a9d8','#ffd59c','#ffffff'][i%3];x.beginPath();x.arc(Math.random()*512,Math.random()*300,4,0,Math.PI*2);x.fill()}
 const t=new THREE.CanvasTexture(cv);t.encoding=THREE.sRGBEncoding;return t}
function cellTexture(){const cv=document.createElement('canvas');cv.width=256;cv.height=160;const x=cv.getContext('2d');
 const g=x.createLinearGradient(0,0,256,160);g.addColorStop(0,'#1c2f7a');g.addColorStop(1,'#0e1846');x.fillStyle=g;x.fillRect(0,0,256,160);
 x.strokeStyle='#8fb4ff';x.lineWidth=2;for(let i=0;i<=8;i++){x.beginPath();x.moveTo(i*32,0);x.lineTo(i*32,160);x.stroke()}for(let j=0;j<=5;j++){x.beginPath();x.moveTo(0,j*32);x.lineTo(256,j*32);x.stroke()}
 x.fillStyle='rgba(255,255,255,.12)';x.beginPath();x.moveTo(0,0);x.lineTo(120,0);x.lineTo(40,160);x.lineTo(0,160);x.fill();
 const t=new THREE.CanvasTexture(cv);t.encoding=THREE.sRGBEncoding;return t}
function gaugeTexture(){const cv=document.createElement('canvas');cv.width=256;cv.height=256;const x=cv.getContext('2d'),cx=128,cy=128,a=v=>(135+v*54)*Math.PI/180;
 x.fillStyle='#f7f8fb';x.beginPath();x.arc(cx,cy,124,0,Math.PI*2);x.fill();x.lineWidth=16;
 x.strokeStyle='#3fbf7f';x.beginPath();x.arc(cx,cy,96,a(0),a(LIMIT));x.stroke();x.strokeStyle='#e0443a';x.beginPath();x.arc(cx,cy,96,a(LIMIT),a(5));x.stroke();
 x.fillStyle='#1b1f33';x.font='bold 22px system-ui,sans-serif';x.textAlign='center';x.textBaseline='middle';
 for(let v=0;v<=5;v++){const r=a(v);x.fillText(v,cx+Math.cos(r)*68,cy+Math.sin(r)*68)}
 x.font='bold 20px system-ui,sans-serif';x.fillText('bar',cx,cy+56);
 const t=new THREE.CanvasTexture(cv);t.encoding=THREE.sRGBEncoding;return t}
const needleAngle=v=>-(225+54*v)*Math.PI/180;

/* ------------------------------------------------------------------ building */
function build(B){
 const {scene,C,M,glow,box,collider,hotspot,npc,person,textSprite,panelTexture,screen,shell,plant}=B;
 shell({lobby:0x9dbbad,corridor:0x8eaa9e,left:0xdfe6ee,leftOpts:{roughness:.45},right:0x283050,rightOpts:{roughness:.4,metalness:.3},wall:0xeef3f1,trim:C.mint});
 const cyl=(rt,rb,h,mat,x,y,z,seg=20)=>{const m=new THREE.Mesh(new THREE.CylinderGeometry(rt,rb,h,seg),mat);m.position.set(x,y,z);scene.add(m);return m};
 const sph=(r,mat,x,y,z)=>{const m=new THREE.Mesh(new THREE.SphereGeometry(r,14,10),mat);m.position.set(x,y,z);scene.add(m);return m};
 const whiteM=M(0xf2f4f8,{roughness:.35}),epoxy=M(0x1d2130,{roughness:.3}),woodM=M(0x8b6a4a,{roughness:.55}),steel=M(0xc9ced8,{metalness:.75,roughness:.28}),glassM=M(0xbfe8ff,{transparent:true,opacity:.3,metalness:.4,roughness:.1});

 /* ---------- lobby: research-centre atrium */
 box(5,1.05,1.1,whiteM,0,.525,4);box(5.1,.06,1.2,glow(C.mint),0,1.08,4);box(5,.4,.02,woodM,0,.45,4.56);collider(-2.6,3.4,2.6,4.6);
 box(.5,.32,.03,M(0x1b1f33),-1.4,1.26,4.1).rotation.x=-.25;screen(.46,.28,panelTexture('Visitor log',['Trainee scientist','Badge: Lab level 1'],MINT),-1.4,1.26,4.12);
 const lena=npc(person({skin:0xe8b896,hair:0xe2c07a,style:'long',outfit:0x2fa79a,coat:true,badge:true}));lena.position.set(0,0,2.9);scene.add(lena);collider(-.35,2.55,.35,3.25);
 const lt=textSprite('Dr. Vos',MINT,.75,'Lead scientist');lt.position.set(0,2.35,2.9);scene.add(lt);
 hotspot('lead',0,5.7,1.9,'Talk to Dr. Vos, the lead scientist',[lena]);
 // water-molecule hologram above the desk
 molecule=new THREE.Group();const om=new THREE.Mesh(new THREE.SphereGeometry(.2,18,14),M(0xff6b6b,{emissive:0xff6b6b,emissiveIntensity:.5}));molecule.add(om);
 for(const s of [-1,1]){const h=new THREE.Mesh(new THREE.SphereGeometry(.12,14,10),M(0xffffff,{emissive:0xbfefff,emissiveIntensity:.5}));h.position.set(s*.253,-.196,0);molecule.add(h)}
 molecule.position.set(0,3.05,4);scene.add(molecule);
 const sign=textSprite('Planet Lab',MINT,1.25,'Science & sustainability · Talent City');sign.position.set(0,3.4,.2);scene.add(sign);
 // rotating Earth on a projector pedestal
 cyl(.55,.75,.8,M(0xe8eef2,{roughness:.3}),-6.2,.4,8.4,28);const pr=new THREE.Mesh(new THREE.RingGeometry(.35,.5,36),glow(C.cyan));pr.rotation.x=-Math.PI/2;pr.position.set(-6.2,.81,8.4);scene.add(pr);
 const beam=new THREE.Mesh(new THREE.CylinderGeometry(.5,.35,.6,28,1,true),new THREE.MeshBasicMaterial({color:C.cyan,transparent:true,opacity:.12,side:THREE.DoubleSide,depthWrite:false}));beam.position.set(-6.2,1.1,8.4);scene.add(beam);
 globe=new THREE.Mesh(new THREE.SphereGeometry(.9,40,28),M(0xffffff,{map:earthTexture(),roughness:.7,emissive:0x0c2a44,emissiveIntensity:.35}));globe.position.set(-6.2,2.05,8.4);globe.rotation.z=.41;scene.add(globe);
 globeWire=new THREE.Mesh(new THREE.SphereGeometry(1.02,20,14),new THREE.MeshBasicMaterial({color:C.cyan,wireframe:true,transparent:true,opacity:.22}));globeWire.position.copy(globe.position);scene.add(globeWire);
 const orbit=new THREE.Mesh(new THREE.TorusGeometry(1.25,.012,8,64),glow(C.violet));orbit.position.copy(globe.position);orbit.rotation.x=Math.PI/2.4;scene.add(orbit);
 collider(-7.0,7.6,-5.4,9.2);hotspot('globe',-4.6,8.4,1.5,'Look at the Earth model',[globe]);
 // living green wall
 const gw=new THREE.Mesh(new THREE.PlaneGeometry(4.2,2.4),new THREE.MeshStandardMaterial({map:leafTexture(),roughness:.95}));gw.position.set(-9.83,1.45,4.5);gw.rotation.y=Math.PI/2;scene.add(gw);
 box(.5,.35,4.4,M(0x6b5a48,{roughness:.8}),-9.6,.175,4.5);collider(-10,2.25,-9.3,6.75);
 const leafM=[M(0x3f9a57,{roughness:1}),M(0x5cbe6f,{roughness:1}),M(0x2f7a46,{roughness:1})];
 for(let i=0;i<10;i++){const c=new THREE.Mesh(new THREE.IcosahedronGeometry(.16+(i%3)*.05,0),leafM[i%3]);c.position.set(-9.68,.6+((i*7)%10)/10*1.9,2.7+i*.38);scene.add(c)}
 const gl=new THREE.PointLight(0xc8ffd8,.35,5);gl.position.set(-8.4,2,4.5);scene.add(gl);
 const gt=textSprite('Living green wall',MINT,.6,'Shades, cools & filters');gt.position.set(-9.2,3.05,4.5);scene.add(gt);
 // wind turbine model
 cyl(.4,.5,.3,M(0xe8eef2),6.4,.15,8.4);cyl(.06,.1,2.4,M(0xf7f9fb,{roughness:.3}),6.4,1.5,8.4,14);box(.2,.2,.5,M(0xf7f9fb,{roughness:.3}),6.4,2.75,8.3);
 turbine=new THREE.Group();turbine.add(new THREE.Mesh(new THREE.SphereGeometry(.09,12,10),M(0xffffff)));
 for(let i=0;i<3;i++){const piv=new THREE.Group();piv.rotation.z=i*Math.PI*2/3;const bl=new THREE.Mesh(new THREE.BoxGeometry(.08,.9,.02),M(0xffffff,{roughness:.3}));bl.position.y=.48;piv.add(bl);turbine.add(piv)}
 turbine.position.set(6.4,2.75,8.6);scene.add(turbine);collider(5.9,7.9,6.9,8.9);
 const wt=textSprite('Wind energy model','#67DFF0',.6);wt.position.set(6.4,3.75,8.4);scene.add(wt);
 // benches, screens, plants
 for(const s of [-1,1]){box(2.4,.08,.7,woodM,s*6.3,.45,12.3);for(const k of [-1,1])box(.08,.42,.6,M(0x5b6478),s*6.3+k*1.05,.21,12.3);collider(s*6.3-1.2,11.95,s*6.3+1.2,12.65)}
 screen(3,1.75,panelTexture('Air quality · today',['PM2.5: 9 µg/m³','Indoor CO₂: 620 ppm','(illustrative sensor demo)'],MINT),9.83,1.8,4.6,-Math.PI/2);
 screen(3,1.75,panelTexture('Research at Planet Lab',['Water quality in rivers','Clean energy & processes','Climate & ecosystems'],'#67DFF0'),-9.83,1.8,11.2,Math.PI/2);
 plant(-3.7,.9);plant(3.7,.9);plant(9.2,13.1);plant(-9.2,13.1);
 const sw=textSprite('← Water Lab','#67DFF0',.95);sw.position.set(-2.2,3.25,-10);scene.add(sw);
 const se=textSprite('Energy & Process Lab →','#FFD59C',.95);se.position.set(2.2,3.25,-10);scene.add(se);

 /* ---------- left: Water Lab */
 box(3,.88,1.1,whiteM,-10.5,.44,-11.2);box(3.06,.05,1.16,epoxy,-10.5,.905,-11.2);collider(-12.05,-11.8,-8.95,-10.6);
 [[0x9fd8ff,-11.3],[0x8fa860,-11.0],[0xb7d9c8,-10.7]].forEach(([c,x])=>{cyl(.06,.06,.2,M(c,{transparent:true,opacity:.8,roughness:.1}),x,1.03,-11.0,14);cyl(.035,.035,.04,M(0x1b1f33),x,1.15,-11.0,10)});
 box(.3,.08,.22,M(0xffd59c),-9.8,.97,-11.0);box(.18,.01,.1,glow(C.cyan),-9.8,1.015,-11.0);const cable=cyl(.008,.008,.4,M(0x1b1f33),-10.05,1.0,-11.0,6);cable.rotation.z=Math.PI/2;
 for(const x of [-12.5,-12.2])cyl(.07,.06,.16,glassM,x+1.3,1.01,-11.3,14);
 box(.62,.4,.04,M(0x1b1f33),-10.5,1.25,-11.6);screen(.58,.36,panelTexture('Willow River',['Samples A · B · C','Tests: pH · DO · nitrate'],'#67DFF0'),-10.5,1.25,-11.575);
 const kai=npc(person({skin:0xc98e66,hair:0x1d1a1f,style:'short',outfit:0x2fa79a,coat:true}));box(.24,.05,.04,M(0x9fe8ff,{transparent:true,opacity:.6}),0,1.8,.14,kai);
 kai.position.set(-10.5,0,-12.5);scene.add(kai);collider(-10.85,-12.85,-10.15,-12.15);
 kaiTag=textSprite('Kai','#67DFF0',.75,'Water scientist');kaiTag.position.set(-10.5,2.35,-12.5);scene.add(kaiTag);
 hotspot('water',-10.5,-9.3,2,'Test the river samples with Kai',[kai]);
 // fume hood
 box(2.4,.9,.9,whiteM,-15.6,.45,-15.45);box(2.44,.04,.94,epoxy,-15.6,.92,-15.45);box(2.4,.5,.9,whiteM,-15.6,2.4,-15.45);
 for(const s of [-1,1])box(.08,1.2,.9,whiteM,-15.6+s*1.16,1.55,-15.45);
 box(2.24,1.1,.02,glassM,-15.6,1.5,-15.0);box(2.2,.03,.05,glow(0xeaffff),-15.6,2.13,-15.3);
 for(let i=0;i<3;i++)cyl(.07,.06,.18-i*.03,glassM,-16.2+i*.5,1.03,-15.5,14);
 collider(-16.85,-15.95,-14.35,-14.95);const fh=textSprite('Fume hood','#67DFF0',.55);fh.position.set(-15.6,3.0,-15.4);scene.add(fh);
 // microscopes on the side bench
 box(1,.88,4,whiteM,-17.45,.44,-8.5);box(1.04,.05,4.04,epoxy,-17.45,.905,-8.5);collider(-18,-10.55,-16.9,-6.45);
 for(const z of [-9.6,-7.4]){const mm=M(0x2b2f3d,{roughness:.4});box(.28,.04,.22,mm,-17.4,.95,z);box(.06,.36,.06,mm,-17.55,1.13,z);box(.14,.02,.14,M(0xe3e7ee),-17.38,1.05,z);
  const tube=cyl(.035,.035,.24,M(0xf2f4f8),-17.45,1.32,z,12);tube.rotation.z=.35;sph(.02,glow(C.cyan),-17.38,1.07,z)}
 const ms=textSprite('Microscopes','#67DFF0',.55);ms.position.set(-17.3,2.0,-8.5);scene.add(ms);
 // river sampling map
 screen(3.4,1.95,panelTexture('Willow River · sampling sites',[],'#67DFF0',x=>{
  x.fillStyle='#2a6e3e';for(let i=0;i<7;i++){x.beginPath();x.moveTo(30+i*22,260);x.lineTo(41+i*22,226);x.lineTo(52+i*22,260);x.fill()}
  x.fillStyle='#c9b25a';for(let i=0;i<3;i++)for(let j=0;j<2;j++)x.fillRect(200+i*40,90+j*40,34,34);
  x.fillStyle='#5cbe6f88';x.beginPath();x.ellipse(400,235,55,22,0,0,Math.PI*2);x.fill();
  x.fillStyle='#aab6da';for(let i=0;i<3;i++)x.fillRect(440+i*20,90-i*8,14,30+i*8);
  x.strokeStyle='#67DFF0';x.lineWidth=12;x.beginPath();x.moveTo(20,200);x.bezierCurveTo(160,150,220,250,330,200);x.bezierCurveTo(400,170,430,215,500,160);x.stroke();
  [['A',90,180],['B',270,215],['C',430,195]].forEach(([l,X,Y])=>{x.fillStyle='#FFD59C';x.beginPath();x.arc(X,Y,17,0,Math.PI*2);x.fill();x.fillStyle='#0C1031';x.font='bold 22px system-ui';x.fillText(l,X-7,Y+8)});
  x.fillStyle='#93a0c8';x.font='16px system-ui';x.fillText('forest',30,284);x.fillText('farmland',205,180);x.fillText('wetland',370,284);x.fillText('town',440,140);x.fillText('fictional river',360,58)}),-10,1.8,-15.83);
 // sample fridge + eyewash
 box(1.2,1.6,.8,whiteM,-5.4,.8,-15.5);box(1,1.3,.02,glassM,-5.4,.85,-15.09);for(let i=0;i<4;i++)cyl(.05,.05,.18,M([0x9fd8ff,0x8fa860,0xb7d9c8,0x9fd8ff][i],{transparent:true,opacity:.85}),-5.75+i*.23,1.0,-15.4,10);
 box(1.04,.03,.7,whiteM,-5.4,.9,-15.45);collider(-6.05,-15.95,-4.75,-15.05);
 const sf=textSprite('Sample fridge · 4 °C','#67DFF0',.5);sf.position.set(-5.4,2.0,-15.4);scene.add(sf);
 box(.3,.3,.06,glow(C.mint),-3.6,1.7,-15.8);const ew=textSprite('Eyewash','#8DE8C3',.45);ew.position.set(-3.6,2.2,-15.6);scene.add(ew);
 const wl1=new THREE.PointLight(0xdff6ff,.55,11);wl1.position.set(-10.5,2.8,-10);scene.add(wl1);

 /* ---------- right: Energy & Process Lab */
 box(3,.9,1.1,M(0x39425f,{roughness:.4}),12,.45,-11.2);box(3.06,.04,1.16,epoxy,12,.92,-11.2);collider(10.45,-11.8,13.55,-10.6);
 const sample=new THREE.Group();const sb=new THREE.Mesh(new THREE.BoxGeometry(.6,.03,.4),M(0x1b1f33));sample.add(sb);const sc=new THREE.Mesh(new THREE.PlaneGeometry(.56,.36),new THREE.MeshStandardMaterial({map:cellTexture(),roughness:.3,metalness:.4}));sc.rotation.x=-Math.PI/2;sc.position.y=.017;sample.add(sc);
 sample.position.set(11.0,1.05,-11.0);sample.rotation.x=.5;scene.add(sample);
 box(.3,.12,.2,M(0xffd59c),12.9,.98,-11.0);box(.18,.06,.01,glow(C.mint),12.9,1.0,-10.895);
 box(.62,.4,.04,M(0x1b1f33),12,1.25,-11.6);screen(.58,.36,panelTexture('Brookside School',['Science block','Need: 150 kWh/day'],'#FFD59C'),12,1.25,-11.575);
 const mateo=npc(person({skin:0x7a4a2a,hair:0x1d1a1f,style:'short',outfit:0x24305e,badge:true}));
 const hat=new THREE.Mesh(new THREE.SphereGeometry(.18,16,10,0,Math.PI*2,0,Math.PI/2),M(0xffd23f,{roughness:.4}));hat.position.y=1.83;mateo.add(hat);
 const brim=new THREE.Mesh(new THREE.CylinderGeometry(.21,.21,.015,18),M(0xffd23f,{roughness:.4}));brim.position.y=1.83;mateo.add(brim);
 mateo.position.set(12,0,-12.6);scene.add(mateo);collider(11.65,-12.95,12.35,-12.25);
 mateoTag=textSprite('Mateo','#FFD59C',.75,'Process engineer');mateoTag.position.set(12,2.4,-12.6);scene.add(mateoTag);
 hotspot('energy',12,-9.3,2,'Design the solar array with Mateo',[mateo]);
 // pilot process plant (model): tank, vessel, pipes, valves, pressure gauge, alarm beacon
 const tankM=M(0xd6dbe4,{metalness:.7,roughness:.3}),pipeM=M(0x9aa6c8,{metalness:.6,roughness:.35}),valveM=M(0xe0443a,{roughness:.4});
 cyl(.55,.55,1.8,tankM,15.9,.95,-14.7,28);const dome=new THREE.Mesh(new THREE.SphereGeometry(.55,24,12,0,Math.PI*2,0,Math.PI/2),tankM);dome.position.set(15.9,1.85,-14.7);scene.add(dome);
 collider(15.3,-15.3,16.5,-14.1);
 const vs=cyl(.3,.3,1.4,tankM,13.6,.75,-15.2,22);vs.rotation.z=Math.PI/2;for(const s of [-1,1])box(.12,.45,.4,M(0x5b6478),13.6+s*.45,.22,-15.2);collider(12.8,-15.6,14.4,-14.8);
 const pipe=(x,y,z,len,ax)=>{const p=cyl(.05,.05,len,pipeM,x,y,z,10);if(ax==='x')p.rotation.z=Math.PI/2;return p};
 pipe(14.83,1.1,-15.0,1.05,'x');pipe(15.9,2.45,-14.9,.5);pipe(14.75,2.7,-14.9,2.35,'x');pipe(13.6,1.85,-14.9,1.7);
 for(const [x,y] of [[14.6,1.1],[13.6,2.0]]){const v=new THREE.Mesh(new THREE.TorusGeometry(.09,.02,8,20),valveM);v.position.set(x,y,-14.83);scene.add(v)}
 cyl(.2,.2,.05,M(0x2b2f3d),15.9,1.45,-14.12,24).rotation.x=Math.PI/2;
 const face=new THREE.Mesh(new THREE.PlaneGeometry(.36,.36),new THREE.MeshBasicMaterial({map:gaugeTexture(),transparent:true}));face.position.set(15.9,1.45,-14.09);scene.add(face);
 needle=new THREE.Group();const nd=new THREE.Mesh(new THREE.BoxGeometry(.012,.15,.005),M(0xe0443a));nd.position.y=.065;needle.add(nd);needle.add(new THREE.Mesh(new THREE.SphereGeometry(.015,8,6),M(0x1b1f33)));
 needle.position.set(15.9,1.45,-14.08);needle.rotation.z=needleAngle(bar);scene.add(needle);
 box(.05,2.2,.05,M(0x5b6478),17.2,1.1,-14.2);beacon=sph(.1,M(0xff4d6d,{emissive:0xff4d6d,emissiveIntensity:.15}),17.2,2.3,-14.2);collider(17.05,-14.35,17.35,-14.05);
 alarmLight=new THREE.PointLight(0xff4d6d,0,9);alarmLight.position.set(16.6,2.4,-13.6);scene.add(alarmLight);
 const pp=textSprite('Pilot process plant','#FFD59C',.6,'Teaching model');pp.position.set(15,3.1,-14.6);scene.add(pp);
 // solar test rig under a sun-simulator lamp
 const ct=cellTexture();
 for(const x of [5.0,6.7]){const pg=new THREE.Group();pg.add(new THREE.Mesh(new THREE.BoxGeometry(1.5,.04,.95),M(0xb8c0d0,{metalness:.6})));
  const pc=new THREE.Mesh(new THREE.PlaneGeometry(1.42,.88),new THREE.MeshStandardMaterial({map:ct,roughness:.25,metalness:.4}));pc.rotation.x=-Math.PI/2;pc.position.y=.022;pg.add(pc);
  pg.position.set(x,1.0,-14.7);pg.rotation.x=.55;scene.add(pg);box(.05,.75,.05,M(0x5b6478),x,.38,-14.4);box(.05,1.15,.05,M(0x5b6478),x,.58,-15.05)}
 box(3.6,.12,.7,M(0x2b2f3d),5.85,2.55,-14.5);box(3.4,.02,.55,glow(0xfff0b0),5.85,2.48,-14.5);
 const sunL=new THREE.PointLight(0xfff1c4,.55,5);sunL.position.set(5.85,2.2,-14.3);scene.add(sunL);
 collider(4.15,-15.4,7.55,-14.0);const sr=textSprite('Solar test rig','#FFD59C',.6,'Sun simulator');sr.position.set(5.85,3.15,-14.5);scene.add(sr);
 screen(2.8,1.6,panelTexture('Energy basics',['kWh = kW × hours','Peak sun hours ≈ full-sun hours','CO₂ factor varies by grid'],'#FFD59C'),10.5,1.85,-15.83);
 screen(3,1.75,panelTexture('Plant status (model)',['Normal: about 1.8 bar','Safe limit: 3.0 bar','Relief valve + alarm armed'],'#ff9bb2'),17.83,1.8,-8,-Math.PI/2);
 const el=new THREE.PointLight(C.mint,.4,12);el.position.set(11,2.7,-9);scene.add(el);
}

/* ------------------------------------------------------------------ water lab */
function resetWl(){wl={hyp:false,hypFirst:true,tested:{},judged:{},mistakes:0}}
const reps=(s,i)=>{const o=OFFS[i];return{ph:o.map(k=>+(s.ph+k*.05).toFixed(2)),do:o.map(k=>+(s.do+k*.1).toFixed(2)),no3:o.map(k=>+(s.no3+k*.2).toFixed(2))}};
const mean=a=>a.reduce((x,y)=>x+y,0)/a.length;
const checks=m=>({ph:m.ph>=G.phMin&&m.ph<=G.phMax,do:m.do>=G.doMin,no3:m.no3<=G.no3Max});
function siteMeans(i){const r=reps(SITES[i],i);return{r,m:{ph:mean(r.ph),do:mean(r.do),no3:mean(r.no3)}}}
const within=m=>{const c=checks(m);return c.ph&&c.do&&c.no3};
function renderWl(ix,msg,cls=''){
 const t=$('wlTask');if(!t)return;
 const H=$('wlHyp');
 if(!wl.hyp){H.innerHTML=`<div class="k">Step 1 · Hypothesis</div><div style="font-size:12px;color:#d5dcf6;margin:6px 0">Question: <b>Is the farmland affecting Willow River?</b> Pick a testable hypothesis.</div><div style="display:grid;gap:6px">${HYPS.map((h,i)=>`<button class="ix-secondary" style="margin:0;text-align:left;font-weight:600;font-size:12px;line-height:1.45" data-hyp="${i}">${h[0]}</button>`).join('')}</div>`;
  H.querySelectorAll('[data-hyp]').forEach(b=>b.onclick=()=>{const h=HYPS[+b.dataset.hyp];if(h[1]){wl.hypFirst=false;renderWl(ix,h[1],'no');return}wl.hyp=true;renderWl(ix,'✓ A good hypothesis is a <b>specific, testable prediction</b>. Now test all three samples.','ok')});}
 else H.innerHTML=`<div class="ix-metric" style="display:block;line-height:1.5"><span style="color:#8DE8C3">✓ Hypothesis:</span> ${HYPS[1][0]}</div>`;
 const S=$('wlSites');
 S.innerHTML=!wl.hyp?'':`<div class="k">Step 2 · Test and classify</div>`+SITES.map((s,i)=>{const tested=wl.tested[i],j=wl.judged[i];let body='';
  if(!tested)body=`<div class="layers" style="margin-top:7px"><button data-test="${i}">🧪 Test sample (3 replicates)</button></div>`;
  else{const {r,m}=siteMeans(i),c=checks(m),mk=k=>j?(c[k]?' <span style="color:#8DE8C3">✓</span>':' <span style="color:#ff9bb2">✕</span>'):'';
   body=`<div style="font-size:11.5px;color:#c9d2f0;line-height:1.7;margin-top:6px">pH ${r.ph.map(v=>v.toFixed(2)).join(' · ')} → mean <b style="color:#fff">${m.ph.toFixed(1)}</b>${mk('ph')}<br>Dissolved oxygen ${r.do.map(v=>v.toFixed(1)).join(' · ')} → mean <b style="color:#fff">${m.do.toFixed(1)} mg/L</b>${mk('do')}<br>Nitrate ${r.no3.map(v=>v.toFixed(1)).join(' · ')} → mean <b style="color:#fff">${m.no3.toFixed(1)} mg/L</b>${mk('no3')}</div>`+
    (j?`<div style="font-size:12px;margin-top:4px;color:${within(m)?'#8DE8C3':'#ff9bb2'}">${within(m)?'✓ Within all guideline ranges':'✕ Outside the guidelines: a concern'}</div>`:`<div class="layers" style="margin-top:7px"><button data-judge="${i}" data-v="1">Within guidelines</button><button data-judge="${i}" data-v="0">Outside guidelines</button></div>`)}
  return `<div class="ix-metric" style="display:block;margin-top:6px"><b style="font-size:12.5px">${s.name}</b>${body}</div>`}).join('');
 S.querySelectorAll('[data-test]').forEach(b=>b.onclick=()=>{wl.tested[+b.dataset.test]=1;renderWl(ix,'Three replicate readings taken; the mean reduces the effect of random error. Now compare the means with the guideline ranges.')});
 S.querySelectorAll('[data-judge]').forEach(b=>b.onclick=()=>{const i=+b.dataset.judge,said=b.dataset.v==='1',ok=within(siteMeans(i).m);
  if(said===ok){wl.judged[i]=1;renderWl(ix,`✓ Correct for ${SITES[i].name.split(' · ')[0]}.`,'ok')}else{wl.mistakes++;renderWl(ix,'Not quite. Compare <b>each</b> mean with its range: pH, dissolved oxygen <b>and</b> nitrate.','no')}});
 const n=Object.keys(wl.judged).length;t.className='ix-task '+cls;
 t.innerHTML=(msg?msg+'<br>':'')+`<b>Hypothesis → test → conclusion.</b> ${wl.hyp?`Samples classified: ${n}/3`:'Start with a hypothesis.'}<div class="bar"><div style="width:${((wl.hyp?1:0)+n)/4*100}%"></div></div>`;
 $('wlGo').style.display=n===3?'block':'none';
}
function openWater(ix){
 kaiTag.visible=false;
 ix.openPanel({hideAvatar:true,
  html:`<div class="k">Water Lab · Willow River study</div><h3>Is the river healthy?</h3>
  <div class="ix-info"><b>Guideline ranges for this exercise</b>pH <b style="display:inline;font-size:12px;color:#67DFF0">6.5–8.5</b> · dissolved oxygen <b style="display:inline;font-size:12px;color:#67DFF0">≥ 5 mg/L</b> (healthy for most fish) · nitrate <b style="display:inline;font-size:12px;color:#67DFF0">≤ 10 mg/L</b></div>
  <div id="wlHyp"></div><div id="wlSites"></div>
  <div class="ix-task" id="wlTask"></div>
  <button class="ix-primary" id="wlGo" style="display:none">Step 3 · Draw a conclusion →</button>
  <div class="ix-note">Fictional river and simulated readings. The guideline values are illustrative teaching ranges; real water-quality standards vary by country, river type and use.</div>`,
  bind(){renderWl(ix);
   $('wlGo').onclick=()=>{score+=(wl.hypFirst?1:0)+(wl.mistakes===0?1:0);ix.closePanel();const b=siteMeans(1).m;
    ix.question('Kai · Water scientist','Time for the conclusion. Which site is the problem, and what is the most likely cause?',
     ['Site B: fertiliser runoff added nitrate, which feeds algae; when the algae die, decomposing bacteria use up the oxygen','Site A: the forest is making the water far too acidic','Site C: the wetland is adding nitrate to the river'],0,
     `Site B has <b>high nitrate</b> (${b.no3.toFixed(1)} mg/L) and <b>low dissolved oxygen</b> (${b.do.toFixed(1)} mg/L). Extra nutrients from fertiliser can trigger <b>algal blooms</b>; when the algae die, bacteria decompose them and use up oxygen, which stresses fish (this is called <b>eutrophication</b>). Site C has partly recovered, which fits with dilution and wetland plants taking up nutrients. Conclusion: the evidence <b>supports</b> your hypothesis, and more sampling would make it stronger.`,f=>{score+=f;ix.closeDialog();
      const g=ix.awardOnce('planet_water',60);ix.advance(2);ix.toast('✓ River investigation complete'+(g?` · +${g} XP`:''))})};},
  camera(p,l){const m=innerWidth<=760;p.set(-10.5,m?3.1:2.45,m?-6.4:-8.1);l.set(-10.5,m?.35:1.05,-12.2)},
  onClose(){kaiTag.visible=true}});
}
function talkWater(ix){
 const K='Kai · Water scientist';
 if(ix.objIdx<1){ix.dialog(K,'Hi! Please check in with Dr. Vos at reception first. Lab safety briefing and all that.',[{label:'Will do',fn:ix.closeDialog}]);return}
 if(ix.objIdx>1){ix.dialog(K,'I’m writing up our Willow River results now. Great teamwork!',[{label:'Thanks, Kai',fn:ix.closeDialog}]);return}
 ix.dialog(K,`Hi ${ix.name}, I’m Kai. Locals say fish have disappeared from part of <b>Willow River</b>. This morning we collected samples from three sites. Let’s investigate it properly, like scientists.`,[{label:'Goggles on. Let’s test →',fn:()=>{ix.closeDialog();openWater(ix)}}]);
}

/* ------------------------------------------------------------------ energy lab */
function resetSol(){sol={first:true};alarmOn=false}
const pct1=v=>(Math.floor(v*10+1e-9)/10).toFixed(1)+'%';
function solarCalc(n){const E=n*PER_PANEL;return{E,share:E/NEED*100,winter:n*PANEL_KW*WINTER_SUN*PERF,co2Day:E*CO2F,co2Year:E*CO2F*365/1000}}
function openEnergy(ix){
 mateoTag.visible=false;
 ix.openPanel({hideAvatar:true,
  html:`<div class="k">Energy Lab · Solar design</div><h3>Power the school with sunlight</h3>
  <div class="ix-info"><b>Brief: Brookside School science block</b>Uses about <b style="display:inline;font-size:12px;color:#FFD59C">${NEED} kWh per day</b>. Each panel is rated ${PANEL_KW} kW. Average peak sun hours: ${SUN} per day. Performance factor: ${PERF} (heat, dust, wiring and inverter losses).</div>
  <div class="ix-metric"><span>Energy per panel = ${PANEL_KW} kW × ${SUN} h × ${PERF}</span><strong>${PER_PANEL.toFixed(2)} kWh/day</strong></div>
  <div class="ix-range"><label>Number of panels <strong id="slN"></strong></label><input type="range" id="slR" min="40" max="160" step="1" value="70" aria-label="Number of solar panels"></div>
  <div class="layers"><button id="slM">− 1 panel</button><button id="slP">+ 1 panel</button></div>
  <div class="ix-metric"><span>Array output = panels × ${PER_PANEL.toFixed(2)}</span><strong id="slE"></strong></div>
  <div class="ix-metric"><span>Share of daily need</span><strong id="slS"></strong></div>
  <div class="ix-metric"><span>Winter day (≈${WINTER_SUN} peak sun hours)</span><strong id="slW"></strong></div>
  <div class="ix-metric"><span>CO₂ avoided = kWh × ${CO2F} kg/kWh</span><strong id="slC"></strong></div>
  <div class="ix-metric"><span>Over a year (× 365 days)</span><strong id="slY"></strong></div>
  <div class="ix-task" id="slTask"></div>
  <button class="ix-primary" id="slGo" style="margin-top:4px">Submit my design</button>
  <div class="ix-note">Illustrative teaching numbers. Real peak sun hours depend on location and season, and grid emission factors range from close to zero on mostly renewable grids to around 0.8–0.9 kg CO₂/kWh on coal-heavy grids. ${CO2F} kg/kWh is a made-up example value.</div>`,
  bind(){
   const r=$('slR'),calc=()=>{const n=+r.value,c=solarCalc(n),ok=c.E>=NEED-1e-9;
    $('slN').textContent=n;$('slE').textContent=c.E.toFixed(1)+' kWh/day';$('slS').textContent=pct1(c.share)+(ok?' ✓':' ✕');$('slS').style.color=ok?'#8DE8C3':'#ff9bb2';
    $('slW').textContent=c.winter.toFixed(1)+' kWh/day';$('slC').textContent=c.co2Day.toFixed(1)+' kg/day';$('slY').textContent=c.co2Year.toFixed(1)+' tonnes';
    const t=$('slTask');t.className='ix-task';t.innerHTML=`<b>Your goal:</b> find the <b>smallest</b> number of panels whose average daily output covers the ${NEED} kWh need. Every extra panel costs money and roof space.`};
   r.oninput=calc;$('slM').onclick=()=>{r.value=Math.max(+r.min,+r.value-1);calc()};$('slP').onclick=()=>{r.value=Math.min(+r.max,+r.value+1);calc()};calc();
   $('slGo').onclick=()=>{const n=+r.value,c=solarCalc(n),t=$('slTask');
    if(c.E<NEED-1e-9){sol.first=false;t.className='ix-task no';t.innerHTML=`<b>Not enough yet.</b> ${n} panels give ${c.E.toFixed(1)} kWh/day, only ${pct1(c.share)} of the need. Tip: panels needed = need ÷ energy per panel, rounded <b>up</b>.`;return}
    if(n>MIN_PANELS){sol.first=false;t.className='ix-task no';t.innerHTML=`<b>Meets the need, but over-sized.</b> ${n} panels give ${c.E.toFixed(1)} kWh/day. Could fewer panels still reach ${NEED} kWh?`;return}
    score+=sol.first?1:0;ix.closePanel();afterSolar(ix,n,c);};},
  camera(p,l){const m=innerWidth<=760;p.set(11,m?3.2:2.6,m?-6.3:-7.9);l.set(11,m?.4:1.1,-12.8)},
  onClose(){mateoTag.visible=true}});
}
function afterSolar(ix,n,c){
 const E='Mateo · Process engineer';
 ix.dialog(E,`Nice design: <b>${n} panels</b> making about <b>${c.E.toFixed(1)} kWh</b> on an average day. That avoids roughly <b>${c.co2Day.toFixed(0)} kg of CO₂</b> a day with our example grid factor. On a winter day it would only make ${c.winter.toFixed(0)} kWh, so the school would still need the grid or storage.<div class="vitals"><div>Panels<b>${n}</b></div><div>kWh/day<b>${c.E.toFixed(0)}</b></div><div>Winter<b>${c.winter.toFixed(0)}</b></div><div>CO₂/yr<b>${c.co2Year.toFixed(1)} t</b></div></div>`,[{label:'Great! What’s next?',fn:()=>{alarmOn=true;
  ix.question(E,`Wait, the pilot plant’s <b>pressure alarm</b> is going off! The gauge reads <b>${ALARM_BAR.toFixed(1)} bar</b>, above the <b>${LIMIT.toFixed(1)} bar safe limit</b> (model values). What do you do?`,
   ['Follow the approved shutdown procedure and alert the supervisor straight away','Switch the alarm off: it’s probably a faulty sensor','Increase the pressure so the test run finishes faster'],0,
   'Safety systems exist for exactly this moment. Follow the <b>approved shutdown procedure</b>, alert the <b>supervisor</b> and keep people clear. <b>Never</b> disable or bypass an alarm: if a sensor is faulty, authorised people check and fix it once the plant is safe. Designing these layers of protection is a big part of process engineering.',f=>{score+=f;alarmOn=false;ix.closeDialog();
    const g=ix.awardOnce('planet_energy',60);ix.advance(3);ix.toast('✓ Plant shut down safely'+(g?` · +${g} XP`:''))})}}]);
}
function talkEnergy(ix){
 const E='Mateo · Process engineer';
 if(ix.objIdx<2){ix.dialog(E,'Hey! Kai needs help in the Water Lab first. Come back after that and we’ll do some energy maths.',[{label:'See you soon',fn:ix.closeDialog}]);return}
 if(ix.objIdx>2){ix.dialog(E,'Pressure’s back to normal and the plant is safely shut down. Thanks for keeping a cool head!',[{label:'Any time',fn:ix.closeDialog}]);return}
 ix.dialog(E,`Hi ${ix.name}, I’m Mateo, a process engineer. Brookside School wants solar panels on its science block. Let’s work out <b>how many panels</b> it needs and how much CO₂ that could avoid.`,[{label:'Let’s calculate →',fn:()=>{ix.closeDialog();openEnergy(ix)}}]);
}

/* ------------------------------------------------------------------ lead scientist */
function talkLead(ix){
 const V='Dr. Lena Vos · Lead scientist';
 if(ix.objIdx===0){
  ix.dialog(V,`Welcome to <b>Planet Lab</b>, <b>${ix.name}</b>! I’m Dr. Lena Vos, the lead scientist. Today you’re a trainee field scientist: first Kai needs help testing river samples in the <b>Water Lab</b>, then Mateo is designing a solar system in the <b>Energy & Process Lab</b>. The river, the school and every number here are fictional.`,[
   {label:'What does a field scientist do?',fn:()=>ix.dialog(V,'We ask questions about the natural world, collect samples, test them carefully and follow the evidence, even when it surprises us. Many of us work with engineers, farmers and governments to solve real environmental problems.',[{label:'Let’s start →',fn:start}])},
   {label:'I’m ready →',fn:start}]);return}
 if(ix.objIdx<3){ix.dialog(V,`Keep going, ${ix.name}! Next: <b>${CFG.objectives[ix.objIdx][0].toLowerCase()}</b>.`,[{label:'On it',fn:ix.closeDialog}]);return}
 if(ix.objIdx>3){ix.dialog(V,'Wonderful work today. Science needs curious people like you.',[{label:'Thanks, Dr. Vos',fn:ix.closeDialog}]);return}
 ix.question('Debrief · Evidence','Dr. Vos: “Great work. A local blog says summers with more <b>ice-cream sales</b> also have more <b>algae blooms</b> in Willow River. Does ice cream cause algae blooms?”',
  ['No. That’s a correlation; a third factor, like hot sunny weather, could drive both. We’d need a controlled test to show a cause','Yes. The numbers rise together, so one must cause the other','Yes, so banning ice cream would clean the river'],0,
  '<b>Correlation is not causation.</b> Warm, sunny weather boosts both ice-cream sales and algae growth: a <b>confounding variable</b>. Scientists look for a plausible mechanism and design tests that control other factors, like comparing upstream and downstream sites as you did today.',f=>{score+=f;
   ix.question('Debrief · Evidence','Dr. Vos: “Last question. Before we announce the Site B result, why would we <b>repeat</b> the sampling and <b>share</b> our data?”',
    ['Repeating checks the result is reliable and not a one-off error, and sharing lets other scientists check it and build on it','To make the report look longer','Because the first result is always wrong'],0,
    'One sample can be thrown off by a storm, a dirty bottle or a badly calibrated meter. <b>Repeating</b> measurements (like your replicates) shows whether a result is consistent, and <b>sharing data and methods</b> lets others reproduce, question and improve the work. That’s how science corrects itself.',f2=>{score+=f2;
     ix.dialog(V,`You tested a river, sized a solar array, handled a safety alarm and thought like a scientist about evidence. Brilliant first shift, ${ix.name}!`,[{label:'Finish my shift →',fn:()=>ix.finish({icon:'◉',title:'Planet Lab Field Scientist',score,max:7,
      skills:['? Writing a testable hypothesis','🧪 Testing water quality with replicates','≈ Comparing results with guideline ranges','☀ Sizing a solar array and estimating CO₂','⚠ Following process-safety procedures','⚖ Telling correlation from causation']})}])})});
 function start(){ix.closeDialog();ix.nova.visible=true;ix.advance(1);ix.toast('✓ Checked in. NOVA has joined you.')}
}
function globeFact(ix){
 ix.dialog('NOVA · Bonus fact','Climate and environmental scientists combine data from satellites, ocean buoys, weather balloons and thousands of ground stations around the world. Because the data is <b>shared openly</b>, teams in different countries can check each other’s work.',[{label:'Amazing!',fn:()=>{ix.closeDialog();const g=ix.awardOnce('planet_globe',10);if(g)ix.toast(`✦ Bonus fact · +${g} XP`)}}]);
}

const CFG={id:'planet',title:'Planet Lab Research Centre',subtitle:'Trainee scientist shift',enterLabel:'◉ Enter Planet Lab Research Centre: start a 3D shift →',badge:'Planet Lab Field Scientist',
 objectives:[['Check in with Dr. Vos, the lead scientist',[0,5.7]],['Test the river samples in the Water Lab',[-10.5,-9.3]],['Design the solar array in the Energy Lab',[12,-9.3]],['Debrief with Dr. Vos',[0,5.7]],['Get your feedback and badge',null]],
 hints:['Welcome to <b>Planet Lab</b>! I’m <b>NOVA</b>, your learning guide. Check in with <b>Dr. Vos</b>, the lead scientist, at reception.',
  'Head up the corridor to the <b>Water Lab</b>, first door on the left. Kai has river samples to test.',
  'Investigation done! Cross the corridor to the <b>Energy & Process Lab</b>. Mateo needs a solar design.',
  'Plant safe! Walk back to <b>Dr. Vos</b> at reception for your debrief.',
  'Shift complete. Open your <b>Career Passport</b> to see your new badge.'],
 build,
 interact(id,ix){const f={lead:talkLead,water:talkWater,energy:talkEnergy,globe:globeFact}[id];if(f)f(ix)},
 frame(dt,t){globe.rotation.y+=dt*.25;globeWire.rotation.y-=dt*.08;turbine.rotation.z-=dt*2.2;molecule.rotation.y+=dt*.8;
  const target=alarmOn?ALARM_BAR+Math.sin(t*7)*.04:1.8+Math.sin(t*1.3)*.05;bar+=(target-bar)*Math.min(1,dt*2.5);needle.rotation.z=needleAngle(bar);
  const on=alarmOn&&Math.sin(t*10)>0;beacon.material.emissiveIntensity=alarmOn?(on?2:.3):.15;alarmLight.intensity=alarmOn?(on?1.1:.15):0},
 reset(){score=0;bar=1.8;resetWl();resetSol()}
};
TI.register(CFG);
})();
