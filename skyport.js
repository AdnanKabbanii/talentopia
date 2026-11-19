/* TALENTOPIA · Skyport Aviation Centre (district config for interior.js)
   Operations-supervisor check-in, a Hangar pre-flight walk-around on a tappable 3D
   aircraft with two fictional faults to find and report, a Flight Ops fuel plan
   (trip + contingency + reserve vs tank and take-off weight limits) and a crosswind
   go/delay decision, then a checklists + crew resource management debrief.
   All people, aircraft, flights, places, weights and weather are fictional. */
(()=>{
'use strict';
const TI=window.TalentopiaInterior;if(!TI)return;
const $=id=>document.getElementById(id);
const kg=n=>Math.round(n).toLocaleString('en-US')+' kg';
let mini,radar,boardTex,boardCv,beacons=[],meiTag,aikoTag,score=0,pickables=[],hangarCenter=null,selected=null,hoverId=null,boardT=0,blink=false,flightStatus='ON TIME';
const orbit={yaw:.75,pitch:.5,dist:8};

/* ------------------------------------------------------------------ walk-around data */
// [id, name, isFault, what you observe, explanation]
const PARTS=[
 ['tyres','Tyres & landing gear',true,'The <b>right main tyre</b> bulges and looks flattened where it meets the floor. The gauge reads <b>140 psi</b>; the placard says <b>200 psi ±5%</b> (illustrative values).','An under-inflated tyre can overheat or burst on take-off. This is a fault to report.'],
 ['ailerons','Ailerons (roll control)',false,'Both ailerons on the wing trailing edges move freely. Hinges and linkages are secure, with no dents or cracks.','Ailerons roll the aircraft left and right. Serviceable.'],
 ['elevator','Elevator (pitch control)',false,'The elevators on the tailplane move smoothly through their full range, with no damage.','The elevator pitches the nose up and down. Serviceable.'],
 ['rudder','Rudder (yaw control)',false,'The rudder on the tail fin is undamaged and its hinges are secure.','The rudder yaws the nose left and right. Serviceable.'],
 ['intake','Engine intakes',false,'Both engine intakes are clear: no debris, no birds’ nests, fan blades undamaged.','Loose objects sucked into an engine can wreck it. These are clear.'],
 ['pitot','Pitot tube',true,'A red cover with a <b>“REMOVE BEFORE FLIGHT”</b> streamer is still fitted over the pitot tube on the nose.','The pitot tube measures airspeed. With the cover on, the airspeed indicator would not work. This is a fault to report.'],
 ['fuel','Fuel caps',false,'Fuel caps on top of both wings are flush and locked, with no fuel stains or drips underneath.','Serviceable.'],
 ['lights','Navigation lights',false,'Red light on the left wingtip, green on the right, white on the tail. All working.','Navigation lights show other pilots which way you are heading. Serviceable.']];
const PART={};PARTS.forEach(p=>{PART[p[0]]={name:p[1],fault:p[2],obs:p[3],why:p[4]}});
let walk;
function resetWalk(){walk={judged:{},wrong:0,done:false};selected=hoverId=null;paintParts()}

/* ------------------------------------------------------------------ flight ops data (illustrative) */
const FT=2.5,BURN=2400,RES_MIN=30,CONT=.05,ZFW=52000,MTOW=60000,TANK=9000;
const TRIP=FT*BURN,CONTF=TRIP*CONT,RESF=BURN*RES_MIN/60,MINF=TRIP+CONTF+RESF,MAXF=Math.min(TANK,MTOW-ZFW);
const WX={dir:250,spd:28,gust:36,rwy:310,lim:30,later:{dir:270,spd:15}};
const angleOf=dir=>{let a=Math.abs(dir-WX.rwy)%360;return a>180?360-a:a};
const xwind=(dir,spd)=>spd*Math.abs(Math.sin(angleOf(dir)*Math.PI/180));
let ops;
function resetOps(){ops={phase:'fuel',fuel:6000,tries:0,ok:false,wsel:'spd',wxWrong:0,done:false};flightStatus='ON TIME';drawBoard()}

/* ------------------------------------------------------------------ aircraft from primitives */
function makeAircraft(B,o){
 o=o||{};const {M}=B;const g=new THREE.Group();const parts=o.parts?[]:null;
 const body=M(0xf4f6fb,{roughness:.35,metalness:.15}),accent=M(o.livery||0x945cff,{roughness:.4}),dark=M(0x1b2340,{roughness:.3,metalness:.4}),metal=M(0xb9c2d6,{metalness:.7,roughness:.25}),rubber=M(0x1c1d24,{roughness:.9});
 const lightM=c=>M(c,{emissive:c,emissiveIntensity:1});
 const add=(geo,m,x,y,z,id,parent)=>{const mesh=new THREE.Mesh(geo,parts&&id?m.clone():m);mesh.position.set(x,y,z);(parent||g).add(mesh);
  if(parts&&id){mesh.userData.part=id;mesh.userData.e0=mesh.material.emissive.getHex();mesh.userData.ei0=mesh.material.emissiveIntensity;parts.push(mesh)}return mesh};
 add(new THREE.CylinderGeometry(.42,.42,6.2,24),body,0,1.5,0).rotation.z=Math.PI/2;
 add(new THREE.SphereGeometry(.42,24,16),body,3.1,1.5,0).scale.set(1.7,1,1);
 add(new THREE.ConeGeometry(.42,1.7,24),body,-3.95,1.5,0).rotation.z=Math.PI/2;
 add(new THREE.BoxGeometry(.5,.13,.6),dark,3.35,1.72,0);
 for(const s of [-1,1])add(new THREE.BoxGeometry(5,.07,.02),dark,-.2,1.62,s*.415);
 add(new THREE.BoxGeometry(6.2,.08,.856),accent,0,1.36,0);
 for(const s of [-1,1]){
  const wing=new THREE.Group();wing.position.set(-.2,1.22,s*.38);wing.rotation.y=-s*.3;g.add(wing);
  add(new THREE.BoxGeometry(1.5,.09,3.6),body,0,0,s*1.8,null,wing);
  add(new THREE.BoxGeometry(.38,.07,1.3),body,-.9,0,s*2.75,'ailerons',wing);
  add(new THREE.CylinderGeometry(.09,.09,.04,14),metal,.1,.065,s*2.1,'fuel',wing);
  add(new THREE.SphereGeometry(.07,10,8),lightM(s<0?0xff4d5e:0x5dff9a),0,0,s*3.62,'lights',wing);
  add(new THREE.CylinderGeometry(.27,.23,1.3,20),body,-.3,.86,s*1.85).rotation.z=-Math.PI/2;
  add(new THREE.CylinderGeometry(.235,.235,.04,20),dark,.36,.86,s*1.85,'intake').rotation.z=-Math.PI/2;
  add(new THREE.BoxGeometry(.5,.22,.08),body,-.45,1.06,s*1.85);
  const tp=new THREE.Group();tp.position.set(-4.0,1.68,s*.2);tp.rotation.y=-s*.35;g.add(tp);
  add(new THREE.BoxGeometry(.8,.06,1.5),body,0,0,s*.75,null,tp);add(new THREE.BoxGeometry(.26,.05,1.4),body,-.52,0,s*.75,'elevator',tp);
  add(new THREE.CylinderGeometry(.05,.05,.8,8),metal,-.55,.65,s*.95);
  const w=add(new THREE.CylinderGeometry(.26,.26,.2,18),rubber,-.55,.26,s*.95,'tyres');w.rotation.x=Math.PI/2;
  if(o.fault&&s>0){w.scale.z=.74;w.scale.x=1.08;w.position.y=.2}}
 add(new THREE.BoxGeometry(1.2,1.4,.08),accent,-4.05,2.35,0).rotation.z=.4;
 add(new THREE.BoxGeometry(.32,1.2,.07),accent,-4.75,2.08,0,'rudder').rotation.z=.4;
 add(new THREE.SphereGeometry(.06,10,8),lightM(0xfafbff),-4.83,1.5,0,'lights');
 add(new THREE.CylinderGeometry(.04,.04,.9,8),metal,2.4,.63,0);
 add(new THREE.CylinderGeometry(.18,.18,.14,16),rubber,2.4,.18,0,'tyres').rotation.x=Math.PI/2;
 add(new THREE.CylinderGeometry(.018,.018,.32,8),metal,2.75,1.45,.45,'pitot').rotation.z=Math.PI/2;
 if(o.fault){add(new THREE.CylinderGeometry(.04,.04,.18,10),M(0xff3a4d),2.82,1.45,.45,'pitot').rotation.z=Math.PI/2;add(new THREE.BoxGeometry(.1,.42,.02),M(0xff3a4d),2.86,1.22,.47,'pitot')}
 const bc=add(new THREE.SphereGeometry(.07,10,8),lightM(0xff3a4d),0,1.95,0);beacons.push(bc);
 return {g,parts};
}

/* ------------------------------------------------------------------ canvases */
const FLIGHTS=[['13:05','TLX 118','Lumen Bay','A2','DEPARTED'],['13:40','TLX 362','Kestrel Ridge','B4','BOARDING'],['14:10','TLX 204','Harbour Point','A3',null],['14:35','TLX 077','Silverpine','C1','ON TIME'],['15:20','TLX 590','Port Amari','B2','ON TIME']];
function drawBoard(){if(!boardCv)return;const x=boardCv.getContext('2d');x.fillStyle='#0a0f2a';x.fillRect(0,0,512,300);x.strokeStyle='#67DFF0';x.lineWidth=6;x.strokeRect(3,3,506,294);
 x.fillStyle='#FFD59C';x.font='bold 30px system-ui,sans-serif';x.fillText('✈ DEPARTURES',22,44);x.font='16px system-ui,sans-serif';x.fillStyle='#93a0c8';x.fillText('Talent Air · fictional',350,42);
 x.fillStyle='#93a0c8';x.font='bold 15px ui-monospace,Menlo,monospace';['TIME','FLIGHT','TO','GATE','STATUS'].forEach((h,i)=>x.fillText(h,[22,90,180,330,385][i],78));
 FLIGHTS.forEach((f,r)=>{const y=114+r*38,st=f[4]||flightStatus;x.fillStyle=r%2?'#ffffff08':'#ffffff12';x.fillRect(14,y-24,484,34);
  x.font='18px ui-monospace,Menlo,monospace';x.fillStyle='#FAFBFF';x.fillText(f[0],22,y);x.fillText(f[1],90,y);x.fillText(f[2],180,y);x.fillText(f[3],338,y);
  const col=st==='BOARDING'?'#8DE8C3':st.indexOf('DELAY')===0?'#ff9bb2':st==='DEPARTED'?'#93a0c8':'#67DFF0';if(!(st==='BOARDING'&&blink)){x.fillStyle=col;x.font='bold 16px ui-monospace,Menlo,monospace';x.fillText(st,385,y)}});
 boardTex.needsUpdate=true}
const BLIPS=[[.6,70,'TLX362'],[2.1,96,'TLX118'],[3.7,52,'GA21'],[5.2,110,'TLX590']];
function drawRadar(t){const x=radar.cv.getContext('2d'),S=256,c=128;x.fillStyle='#04121c';x.fillRect(0,0,S,S);
 x.strokeStyle='#1f5f5a';x.lineWidth=1;for(let r=30;r<=120;r+=30){x.beginPath();x.arc(c,c,r,0,Math.PI*2);x.stroke()}
 x.beginPath();x.moveTo(c,8);x.lineTo(c,S-8);x.moveTo(8,c);x.lineTo(S-8,c);x.stroke();
 const a=(t*1.1)%(Math.PI*2);
 for(let k=0;k<22;k++){const aa=a-k*.035;x.strokeStyle=`rgba(141,232,195,${((1-k/22)*.55).toFixed(3)})`;x.lineWidth=2;x.beginPath();x.moveTo(c,c);x.lineTo(c+Math.cos(aa)*120,c+Math.sin(aa)*120);x.stroke()}
 x.font='10px system-ui,sans-serif';
 for(const [ang0,r,lb] of BLIPS){const ang=ang0+t*.012;let d=(a-ang)%(Math.PI*2);if(d<0)d+=Math.PI*2;const al=Math.max(.18,1-d/(Math.PI*2)*1.3);
  const bx=c+Math.cos(ang)*r,by=c+Math.sin(ang)*r;x.fillStyle=`rgba(141,232,195,${al.toFixed(3)})`;x.beginPath();x.arc(bx,by,3.2,0,Math.PI*2);x.fill();x.fillText(lb,bx+6,by-4)}
 x.fillStyle='#67DFF0';x.font='bold 12px system-ui,sans-serif';x.fillText('APPROACH · SIM',8,16);radar.tex.needsUpdate=true}

/* ------------------------------------------------------------------ building */
function build(B){
 const {scene,C,M,glow,box,collider,hotspot,npc,person,textSprite,panelTexture,screen,shell,plant}=B;
 beacons=[];pickables=[];
 shell({lobby:0xd9dee8,corridor:0xc5ccdb,left:0x4a505c,leftOpts:{roughness:.85},right:0x161d3a,rightOpts:{roughness:.45,metalness:.25},wall:0xe6e9f2,trim:C.cyan});
 // glaze the west lobby wall so it reads as a curtain-wall window onto the apron
 scene.traverse(m=>{if(m.isMesh&&m.geometry&&m.geometry.parameters&&m.geometry.parameters.height===2.8&&m.geometry.parameters.depth===14&&Math.abs(m.position.x+10)<.01&&Math.abs(m.position.z-7)<.01){m.material.color.setHex(0x9fd6f2);m.material.metalness=.6;m.material.roughness=.12;m.material.emissive=new THREE.Color(0x1b3a5a);m.material.emissiveIntensity=.35}});
 for(let i=0;i<8;i++)box(.1,2.8,.1,M(0x3c4458,{metalness:.6}),-9.8,1.4,.9+i*1.74);
 // check-in desk + Rafael
 box(5,1.05,1.1,M(0x1d2a55,{roughness:.35,metalness:.3}),0,.525,4);box(5.1,.06,1.2,glow(C.cyan),0,1.08,4);box(5,.16,.02,glow(C.violet),0,.62,4.56);collider(-2.6,3.4,2.6,4.6);
 for(const x of [-1.4,1.4]){box(.5,.32,.03,M(0x1b1f33),x,1.3,3.75);screen(.46,.28,panelTexture('Check-in',['TLX 204 · A3'],'#67DFF0'),x,1.3,3.725,Math.PI)}
 const rafael=npc(person({skin:0xc98e66,hair:0x5a3b22,style:'short',outfit:0xf2f4ff,coat:0x1d2a55,tie:0xffd59c,badge:true}));
 const capM=M(0x1d2a55);const cap=new THREE.Mesh(new THREE.CylinderGeometry(.165,.16,.1,18),capM);cap.position.y=1.93;rafael.add(cap);const vis=new THREE.Mesh(new THREE.BoxGeometry(.2,.02,.1),M(0x0c1031));vis.position.set(0,1.885,.16);rafael.add(vis);
 rafael.position.set(0,0,2.9);scene.add(rafael);collider(-.35,2.55,.35,3.25);
 const rt=textSprite('Rafael','#67DFF0',.75,'Operations supervisor');rt.position.set(0,2.4,2.9);scene.add(rt);
 hotspot('super',0,5.7,1.9,'Talk to Rafael, the operations supervisor',[rafael]);
 mini=makeAircraft(B,{livery:C.cyan}).g;mini.scale.setScalar(.14);mini.position.set(0,2.75,4);scene.add(mini);
 const sign=textSprite('Skyport','#67DFF0',1.25,'Aviation Centre · Talent City Airport');sign.position.set(0,3.4,.2);scene.add(sign);
 // departure boards
 boardCv=document.createElement('canvas');boardCv.width=512;boardCv.height=300;boardTex=new THREE.CanvasTexture(boardCv);boardTex.encoding=THREE.sRGBEncoding;
 box(.06,2.3,4.1,M(0x0b0f26),9.9,1.8,7.5);screen(4,2.2,boardTex,9.84,1.8,7.5,-Math.PI/2);drawBoard();
 screen(2.6,1.5,panelTexture('Arrivals',['TLX 205 · Landed','TLX 441 · 14:25','TLX 812 · 14:50'],'#8DE8C3'),9.83,1.7,11.8,-Math.PI/2);
 // self check-in kiosks
 for(const z of [2.2,3.6]){box(.6,1.4,.5,M(0x26305c,{metalness:.3}),9.3,.7,z);box(.04,.36,.3,glow(C.cyan),9.0,1.15,z);collider(9,z-.3,9.65,z+.3)}
 // seating rows
 const seatM=M(0x5b6aa8,{roughness:.6}),legM=M(0x9aa6c8,{metalness:.5});
 for(const s of [-1,1])for(const z of [8.6,10.8]){const x=s*6.4;box(3.2,.08,.6,seatM,x,.45,z);box(3.2,.5,.08,seatM,x,.74,z+.3);for(const k of [-1,1])box(.08,.42,.5,legM,x+k*1.4,.21,z);collider(x-1.6,z-.35,x+1.6,z+.4)}
 // luggage
 box(.45,.6,.28,M(C.blush),-4.6,.3,9.0).rotation.y=.3;box(.4,.5,.25,M(C.violet),5.0,.25,11.0);collider(-4.9,8.8,-4.3,9.2);collider(4.75,10.85,5.25,11.15);
 plant(-3.7,.9);plant(3.7,.9);plant(9.2,13.1);plant(-9.2,13.1);
 // apron outside the window wall with a parked aircraft and jet bridge
 box(16,.1,19.5,M(0x2d3346,{roughness:.95}),-18.2,-.06,6.25);
 const paint=M(0xffd23c,{emissive:0x5a4300,emissiveIntensity:.4});box(.15,.02,14,paint,-14.5,.0,6);box(3,.02,.15,paint,-14.5,.0,11.2);
 const ac=makeAircraft(B,{livery:C.violet});ac.g.scale.setScalar(.8);ac.g.rotation.y=-Math.PI/2;ac.g.position.set(-14.5,0,6.8);scene.add(ac.g);
 box(3.75,.9,1,M(0xc5ccdb,{metalness:.3}),-12.03,1.15,8.84);box(.3,1.15,.3,M(0x3c4458),-13.2,.575,8.84);
 box(1.2,.6,.8,M(0xffd23c),-12.6,.3,1.8);box(1.4,.5,.9,M(0x8a94ad),-14.6,.35,1.8);
 hotspot('window',-8.6,6.2,1.6,'Look at the aircraft outside',[ac.g]);
 const sh=textSprite('← Hangar','#67DFF0',.95);sh.position.set(-2.2,3.25,-10);scene.add(sh);
 const so=textSprite('Flight Ops →','#FFD59C',.95);so.position.set(2.2,3.25,-10);scene.add(so);

 // hangar: aircraft to inspect
 const hp=makeAircraft(B,{parts:true,fault:true,livery:C.violet});hp.g.position.set(-10.5,0,-11);scene.add(hp.g);pickables=hp.parts;hangarCenter=new THREE.Vector3(-10.5,1.3,-11);
 collider(-15.3,-11.45,-6.7,-10.55);collider(-12.3,-15.1,-10,-6.9);collider(-15.3,-12.6,-13.9,-9.4);
 const hl=textSprite('TX-NVA','#945CFF',.65,'Fictional training aircraft');hl.position.set(-10.5,3.6,-11);scene.add(hl);
 for(const z of [-15.4,-6.6])box(10.4,.02,.1,paint,-10.5,.005,z);for(const x of [-15.7,-5.3])box(.1,.02,8.8,paint,x,.005,-11);
 // tools cart + toolbox
 box(1.1,.08,.6,M(0xb9c2d6,{metalness:.6}),-7.6,.85,-5.2);box(1.1,.08,.6,M(0xb9c2d6,{metalness:.6}),-7.6,.35,-5.2);for(const sx of [-1,1])box(.05,.85,.55,M(0x3c4458),-7.6+sx*.52,.43,-5.2);
 box(.3,.08,.1,M(0xff6b5a),-7.8,.93,-5.2);box(.08,.25,.08,M(0xffd23c),-7.35,1.0,-5.1);collider(-8.2,-5.55,-7,-4.85);
 box(1.4,1.1,.6,M(0xd8443c,{metalness:.3,roughness:.4}),-16.9,.55,-4.75);for(let i=0;i<4;i++)box(1.3,.02,.02,M(0xeef2ff,{metalness:.8}),-16.9,.25+i*.24,-4.44);collider(-17.6,-5.1,-16.2,-4.4);
 // maintenance stand by the engine
 box(1,.06,.8,M(0xffd23c),-9.6,1.0,-7.0);collider(-10.1,-7.4,-9.1,-6.6);for(const sx of [-1,1])for(const sz of [-1,1])box(.05,1,.05,M(0x3c4458),-9.6+sx*.45,.5,-7+sz*.35);
 screen(3,1.75,panelTexture('Walk-around checklist',['Tyres · controls · intakes','Pitot · fuel caps · lights','Any doubt? Report it'],'#945CFF'),-15.4,1.75,-15.83);
 screen(3,1.75,panelTexture('Technical log',['Every defect is written','down and signed off by a','licensed engineer'],'#67DFF0'),-5.8,1.75,-15.83);
 const mei=npc(person({skin:0xf6d7c3,hair:0x1d1a1f,style:'bun',outfit:0x3a5a8a,pants:0x3a5a8a,badge:true}));mei.position.set(-5.0,0,-6.0);mei.rotation.y=-2.2;scene.add(mei);collider(-5.35,-6.35,-4.65,-5.65);
 meiTag=textSprite('Mei','#945CFF',.75,'Aircraft engineer');meiTag.position.set(-5.0,2.35,-6.0);scene.add(meiTag);
 hotspot('hangar',-5.2,-8,2.2,'Do the walk-around with Mei',[mei,hp.g]);
 const hlt=new THREE.PointLight(0xeaf2ff,.8,14);hlt.position.set(-10.5,3.4,-10);scene.add(hlt);

 // flight ops / ATC
 const consM=M(0x1b2350,{roughness:.35,metalness:.35});
 box(4.4,.85,1,consM,12,.425,-13.2);box(4.5,.05,1.1,glow(C.cyan),12,.87,-13.2);collider(9.75,-13.75,14.25,-12.65);
 for(const s of [-1,1]){const d=box(2,.85,1,consM,12+s*3.1,.425,-12.5);d.rotation.y=-s*.45;collider(12+s*3.1-1,-13.2,12+s*3.1+1,-11.8)}
 [['Flight strips',['TLX 204 · planning','TLX 362 · taxi'],'#FFD59C',10.6],['Comms',['APP 121.3 (sim)','TWR 118.7 (sim)'],'#67DFF0',12],['NOTAMs',['Rwy 13/31 open','Taxiway B shut'],'#8DE8C3',13.4]].forEach(([t,l,c,x])=>{box(.9,.55,.04,M(0x0b0f26),x,1.22,-13.55);screen(.86,.5,panelTexture(t,l,c),x,1.22,-13.525)});
 radar={cv:document.createElement('canvas')};radar.cv.width=radar.cv.height=256;radar.tex=new THREE.CanvasTexture(radar.cv);radar.tex.encoding=THREE.sRGBEncoding;
 box(2.3,2.3,.06,M(0x0b0f26),12,1.6,-15.9);screen(2.2,2.2,radar.tex,12,1.6,-15.86);drawRadar(0);
 const rl=textSprite('Approach radar','#8DE8C3',.6,'Simulated');rl.position.set(12,3.05,-15.6);scene.add(rl);
 screen(3,1.75,panelTexture('TLX 204 route','','#67DFF0',x=>{x.strokeStyle='#67DFF0';x.lineWidth=4;x.setLineDash([12,8]);x.beginPath();x.moveTo(70,230);x.quadraticCurveTo(250,60,440,170);x.stroke();x.setLineDash([]);
  x.fillStyle='#FFD59C';[[70,230],[440,170]].forEach(p=>{x.beginPath();x.arc(p[0],p[1],9,0,Math.PI*2);x.fill()});x.fillStyle='#d6e0ff';x.font='20px system-ui';x.fillText('Talent City',40,268);x.fillText('Harbour Point',340,205);x.fillText('2 h 30 min · fictional',150,110)}),8.1,1.75,-15.83);
 screen(3,1.75,panelTexture('Ops rules',['Checklists every time','Read back · cross-check','Speak up if unsure'],'#FFD59C'),15.9,1.75,-15.83);
 screen(3.4,2,panelTexture('Harbour Pt · WX 13:50',['Wind 250° 28 kt G36','Visibility 6 km · rain','Cloud base 1,400 ft','Fictional training data'],'#67DFF0',x=>{const cx=430,cy=150;x.strokeStyle='#ffffff44';x.lineWidth=2;x.beginPath();x.arc(cx,cy,52,0,Math.PI*2);x.stroke();
  const a=(250-90)*Math.PI/180;x.strokeStyle='#FFD59C';x.lineWidth=5;x.beginPath();x.moveTo(cx+Math.cos(a)*48,cy+Math.sin(a)*48);x.lineTo(cx,cy);x.stroke();x.fillStyle='#d6e0ff';x.font='bold 16px system-ui';x.fillText('N',cx-5,cy-58)}),17.83,1.75,-10.5,-Math.PI/2);
 const aiko=npc(person({skin:0xe8b896,hair:0xa86d3a,style:'long',outfit:0x24305e,badge:true}));aiko.position.set(12,0,-14.3);scene.add(aiko);collider(11.65,-14.65,12.35,-13.95);
 aikoTag=textSprite('Aiko','#FFD59C',.75,'Flight dispatcher');aikoTag.position.set(12,2.35,-14.3);scene.add(aikoTag);
 hotspot('ops',12,-9.3,2,'Plan the flight with Aiko',[aiko]);
 box(1.2,.06,1.2,M(0xe6e9f2),15.6,.75,-6.3);box(.1,.72,.1,M(0x3c4458),15.6,.36,-6.3);collider(15,-6.9,16.2,-5.7);
 const ol=new THREE.PointLight(C.cyan,.5,12);ol.position.set(12,3,-11);scene.add(ol);
}

/* ------------------------------------------------------------------ hangar: walk-around */
function paintParts(){for(const m of pickables){const id=m.userData.part,j=walk&&walk.judged[id];let c=null,i=0;
 if(id===selected){c=0x67dff0;i=.75}else if(id===hoverId){c=0x67dff0;i=.4}else if(j){c=j==='fault'?0xff6b8a:0x8de8c3;i=.35}
 if(c===null){m.material.emissive.setHex(m.userData.e0);m.material.emissiveIntensity=m.userData.ei0}else{m.material.emissive.setHex(c);m.material.emissiveIntensity=i}}}
function pickFrom(ray){const h=ray.intersectObjects(pickables,false)[0];return h?h.object.userData.part:null}
function nJudged(){return PARTS.filter(p=>walk.judged[p[0]]).length}
function renderWalk(ix,msg,cls){const el=$('spParts');if(!el)return;
 el.innerHTML=PARTS.map(([id,n])=>{const j=walk.judged[id];return `<button data-part="${id}" class="${id===selected?'on':''}">${j==='ok'?'✓ ':j==='fault'?'⚠ ':''}${n}</button>`}).join('')+`<button data-zoom="1" aria-label="Zoom in">＋</button><button data-zoom="-1" aria-label="Zoom out">−</button>`;
 el.querySelectorAll('[data-part]').forEach(b=>b.onclick=()=>pick(ix,b.dataset.part));
 el.querySelectorAll('[data-zoom]').forEach(b=>b.onclick=()=>{orbit.dist=Math.max(4,Math.min(12,orbit.dist-Number(b.dataset.zoom)*.8))});
 const info=$('spInfo'),jb=$('spJudge');
 if(selected){const p=PART[selected],j=walk.judged[selected];info.innerHTML=`<b>${p.name}</b>${p.obs}${j?`<br><span style="color:${j==='fault'?'#ff9bb2':'#8DE8C3'}">${j==='fault'?'⚠ Fault reported.':'✓ Serviceable.'}</span> ${p.why}`:''}`;jb.style.display=j?'none':'flex'}
 else jb.style.display='none';
 const n=nJudged(),t=$('spTask');t.className='ix-task '+(cls||'');
 t.innerHTML=(msg?msg+'<br>':'')+(n<PARTS.length?`<b>Check all ${PARTS.length} items.</b> Tap a part, read what you see, then decide. (${n}/${PARTS.length})`:'<b>✓ Walk-around complete.</b> Time to report what you found.')+`<div class="bar"><div style="width:${n/PARTS.length*100}%"></div></div>`;
 $('spReport').style.display=n>=PARTS.length?'block':'none'}
function pick(ix,id){selected=id;paintParts();renderWalk(ix)}
function judge(ix,v){if(!selected||walk.judged[selected])return;const p=PART[selected];
 if((v==='fault')===p.fault){walk.judged[selected]=v;paintParts();renderWalk(ix,v==='fault'?'⚠ Good catch: that one is not airworthy.':'✓ Checked and serviceable.','ok')}
 else{walk.wrong++;renderWalk(ix,p.fault?'Look again. Would you be happy to fly with what you just observed?':'Read the observation again: is anything actually damaged or out of limits?','no')}}
function openHangar(ix){
 meiTag.visible=false;orbit.dist=innerWidth<=760?10.5:8;orbit.pitch=innerWidth<=760?.75:.5;orbit.yaw=.75;
 ix.openPanel({hideAvatar:true,
  html:`<div class="k">Hangar 2 · TX-NVA (fictional)</div><h3>Pre-flight walk-around</h3>
   <div class="layers" id="spParts"></div>
   <div class="ix-info" id="spInfo" style="min-height:92px"><b>Tap a part of the aircraft</b>Drag to walk around it, scroll or use ＋/− to zoom. You can also pick an item from the list.</div>
   <div id="spJudge" style="display:none;gap:8px"><button class="ix-secondary" data-j="ok" style="margin-top:0">✓ Serviceable</button><button class="ix-secondary" data-j="fault" style="margin-top:0">⚠ Report a fault</button></div>
   <div class="ix-task" id="spTask"></div>
   <button class="ix-primary" id="spReport" style="display:none">Report my findings →</button>
   <div class="ix-note">Simplified model of a fictional aircraft. Real walk-arounds follow the manufacturer’s and airline’s checklists and cover many more items.</div>`,
  bind(){renderWalk(ix);$('spJudge').querySelectorAll('[data-j]').forEach(b=>b.onclick=()=>judge(ix,b.dataset.j));
   $('spReport').onclick=()=>{if(walk.done)return;walk.done=true;score+=walk.wrong===0?1:0;ix.closePanel();reportFaults(ix)}},
  camera(p,l){const c=hangarCenter,d=orbit.dist;let x=c.x+Math.sin(orbit.yaw)*Math.cos(orbit.pitch)*d,z=c.z+Math.cos(orbit.yaw)*Math.cos(orbit.pitch)*d;
   x=Math.max(-17.5,Math.min(-3.5,x));z=Math.max(-15.5,Math.min(-4.5,z));p.set(x,c.y+Math.sin(orbit.pitch)*d,z);l.set(c.x,c.y-(innerWidth<=760?1.2:0),c.z)},
  drag(dx,dy){orbit.yaw-=dx*.008;orbit.pitch=Math.max(.08,Math.min(1.2,orbit.pitch+dy*.005))},
  hover(ray){const id=pickFrom(ray);if(id!==hoverId){hoverId=id;paintParts();$('world').style.cursor=id?'pointer':'grab'}},
  tap(ray){const id=pickFrom(ray);if(id)pick(ix,id)},
  wheel(dy){orbit.dist=Math.max(4,Math.min(12,orbit.dist+(dy>0?.5:-.5)))},
  onClose(){meiTag.visible=true;selected=hoverId=null;paintParts()}});
}
function reportFaults(ix){
 const E='Mei · Aircraft engineer';
 ix.question(E,'You found two faults: a <b>low right main tyre</b> and a <b>pitot cover still fitted</b>. Boarding starts in 40 minutes. What do you do?',
  ['Report both to engineering and record them in the technical log; the aircraft isn’t released until they are fixed and signed off','Pull the pitot cover off yourself and ignore the tyre: it’s only a bit low','Say nothing so the flight leaves on time'],0,
  'Defects are fixed and certified by <b>licensed engineers</b>, and everything goes in the <b>technical log</b> so crew and engineering share the same picture. A short delay is always better than flying with a known fault.',f=>{score+=f;
   ix.dialog(E,`Great catch, ${ix.name}. The tyre is being re-inflated and checked for damage, and the cover is off and signed for. Aiko in <b>Flight Ops</b> needs help with the fuel plan.`,[{label:'On my way →',fn:()=>{ix.closeDialog();const g=ix.awardOnce('sky_hangar',60);ix.advance(2);ix.toast('✓ Walk-around complete'+(g?` · +${g} XP`:''))}}])});
}
function talkHangar(ix){
 const E='Mei · Aircraft engineer';
 if(ix.objIdx<1){ix.dialog(E,'Hi! Please check in with Rafael at the check-in desk first. Hangar safety comes first.',[{label:'Will do',fn:ix.closeDialog}]);return}
 if(ix.objIdx>1){ix.dialog(E,'TX-NVA is fixed, signed off and ready. Thanks for your sharp eyes!',[{label:'Thanks, Mei',fn:ix.closeDialog}]);return}
 if(walk.done){reportFaults(ix);return}
 ix.dialog(E,`Hi ${ix.name}, I’m Mei, one of the aircraft engineers. Before every flight, someone walks around the aircraft and checks it with their own eyes. Let’s do TX-NVA together. Look carefully: not everything may be right today.`,[{label:'Start the walk-around →',fn:()=>{ix.closeDialog();openHangar(ix)}}]);
}

/* ------------------------------------------------------------------ flight ops: fuel + weather */
function workHTML(full){const rows=full?[['Trip fuel = 2.5 h × 2,400 kg/h',TRIP],['Contingency = 5% × trip',CONTF],['Reserve = 0.5 h × 2,400 kg/h',RESF],['Minimum fuel',MINF],['Max by take-off weight = 60,000 − 52,000',MTOW-ZFW],['Max by tanks',TANK]]:[['Trip fuel = 2.5 h × 2,400 kg/h',TRIP]];
 return rows.map(([l,v])=>`<div class="ix-metric"><span>${l}</span><strong>${kg(v)}</strong></div>`).join('')}
function renderFuel(){if(!$('opF'))return;const f=ops.fuel,tow=ZFW+f,tank=f/TANK;
 $('opFv').textContent=kg(f);$('opF').value=f;
 const t=$('opTow');t.textContent=kg(tow)+(tow>MTOW?' ✕ over limit':'');t.style.color=tow>MTOW?'#ff9bb2':'#8DE8C3';
 const k=$('opTank');k.textContent=Math.round(tank*100)+'%'+(tank>1?' ✕ won’t fit':'');k.style.color=tank>1?'#ff9bb2':'#bceeff'}
function renderWx(){if(!$('opXw'))return;const spd=WX[ops.wsel],ang=angleOf(WX.dir),xw=xwind(WX.dir,spd);
 $('opWs').querySelectorAll('[data-w]').forEach(b=>b.classList.toggle('on',b.dataset.w===ops.wsel));
 $('opAng').textContent=`310° − 250° = ${ang}°`;const e=$('opXw');e.textContent=`${spd} × sin ${ang}° = ${xw.toFixed(1)} kt`;e.style.color=xw>WX.lim?'#ff9bb2':'#8DE8C3'}
function setPhase(ix){const fuel=ops.phase==='fuel';if(!$('opFuel'))return;$('opFuel').style.display=fuel?'flex':'none';$('opWx').style.display=fuel?'none':'flex';$('opH').textContent=fuel?'Fuel plan':'Weather decision';
 if(!fuel){renderWx();const x1=Math.round(xwind(WX.dir,WX.spd)),x2=Math.round(xwind(WX.dir,WX.gust));
  const opts=[`Go now: the steady crosswind (about ${x1} kt) is inside the limit`,`Delay until about 15:00: gusts push the crosswind to about ${x2} kt, over the ${WX.lim} kt limit`,'Go now: visibility and cloud are fine, so the wind doesn’t matter'];
  const d=$('opDec');d.innerHTML=opts.map((o,i)=>`<button class="ix-secondary" data-dec="${i}" style="margin-top:0;text-align:left">${o}</button>`).join('');
  d.querySelectorAll('[data-dec]').forEach(b=>b.onclick=()=>{if(ops.done)return;const i=+b.dataset.dec,t=$('opWxTask');
   if(i!==1){ops.wxWrong++;b.disabled=true;b.style.opacity=.5;t.className='ix-task no';t.innerHTML=i===0?'Not quite. Limits include <b>gusts</b>: the aircraft has to cope with the strongest wind it might meet on landing or take-off. Switch to the gust value and compare.':'Not quite. Visibility and cloud are fine, but <b>every</b> limit must be met, including crosswind.';return}
   ops.done=true;score+=ops.wxWrong===0?1:0;flightStatus='DELAYED 15:10';drawBoard();const later=xwind(WX.later.dir,WX.later.spd);
   d.querySelectorAll('button').forEach(x=>x.disabled=true);b.style.borderColor='#8DE8C3';
   t.className='ix-task ok';t.innerHTML=`<b>✓ Good call.</b> The forecast for 15:00 is ${WX.later.dir}° at ${WX.later.spd} kt: crosswind = ${WX.later.spd} × sin ${angleOf(WX.later.dir)}° ≈ <b>${later.toFixed(1)} kt</b>, well inside the limit. TLX 204 is delayed to 15:10 and your fuel plan still works.`;
   setTimeout(()=>{ix.closePanel();afterOps(ix)},2200)});
  const t=$('opWxTask');if(!ops.done){t.className='ix-task';t.innerHTML='<b>Step 2:</b> work out the crosswind for the steady wind <b>and</b> the gusts, compare with the limit, then decide.'}}}
function openOps(ix){
 aikoTag.visible=false;
 ix.openPanel({hideAvatar:true,
  html:`<div class="k">Flight Ops · TLX 204 (fictional)</div><h3 id="opH">Fuel plan</h3>
   <div id="opFuel" style="display:flex;flex-direction:column;gap:10px">
    <div class="ix-info"><b>Talent City → Harbour Point</b>Flight time <b>2 h 30 min</b> · fuel burn <b>2,400 kg per hour</b><br>Reserve: <b>30 min</b> of flying at the same burn · Contingency: <b>5% of trip fuel</b><br>Zero-fuel weight 52,000 kg · Max take-off weight 60,000 kg · Tanks hold 9,000 kg</div>
    <div class="ix-info" style="border-color:#945CFF66"><b>How to plan it</b>Trip fuel = flight time × burn rate<br>Minimum fuel = trip + contingency + reserve<br>Take-off weight = zero-fuel weight + fuel</div>
    <div class="ix-range"><label>Fuel to load <strong id="opFv"></strong></label><input type="range" id="opF" min="5000" max="9500" step="100" value="${ops.fuel}" aria-label="Fuel to load in kilograms"></div>
    <div class="ix-metric"><span>Take-off weight</span><strong id="opTow"></strong></div>
    <div class="ix-metric"><span>Tanks used</span><strong id="opTank"></strong></div>
    <div id="opWork" style="display:none;gap:6px"></div>
    <div class="ix-task" id="opTask"><b>Step 1:</b> load enough fuel for the trip, contingency and reserve, without going over the tank or take-off weight limits.</div>
    <button class="ix-primary" id="opCheck" style="margin-top:0">Check my fuel plan</button>
   </div>
   <div id="opWx" style="display:none;flex-direction:column;gap:10px">
    <div class="ix-info"><b>Harbour Point weather · 13:50</b>Wind <b>250° at 28 kt, gusting 36 kt</b> · visibility 6 km in light rain · cloud base 1,400 ft<br>Runway <b>31</b> (heading 310°) · Forecast: wind <b>270° at 15 kt from 15:00</b></div>
    <div class="ix-info" style="border-color:#945CFF66"><b>Aircraft limits (illustrative)</b>Max crosswind <b>30 kt, including gusts</b> · min visibility 800 m · min cloud base 200 ft</div>
    <div class="layers" id="opWs"><button data-w="spd">Steady wind 28 kt</button><button data-w="gust">Gusts 36 kt</button></div>
    <div class="ix-metric"><span>Angle between wind and runway</span><strong id="opAng"></strong></div>
    <div class="ix-metric"><span>Crosswind = wind × sin(angle)</span><strong id="opXw"></strong></div>
    <div class="ix-task" id="opWxTask"></div>
    <div id="opDec" style="display:grid;gap:6px"></div>
   </div>
   <div class="ix-note">All flights, places, weights and weather are fictional teaching values, not real performance data. Real fuel planning also includes taxi fuel, an alternate airport and airline policy.</div>`,
  bind(){renderFuel();setPhase(ix);
   $('opF').oninput=()=>{ops.fuel=+$('opF').value;renderFuel()};
   $('opWs').querySelectorAll('[data-w]').forEach(b=>b.onclick=()=>{ops.wsel=b.dataset.w;renderWx()});
   if(ops.tries>0){const w=$('opWork');w.innerHTML=workHTML(ops.tries>=2);w.style.display='grid'}
   $('opCheck').onclick=()=>{if(ops.ok)return;ops.tries++;const f=ops.fuel,t=$('opTask'),w=$('opWork');let bad='';
    if(f<MINF)bad=`<b>Not enough fuel.</b> ${kg(f)} doesn’t cover trip + contingency + reserve. Running short is never an option.`;
    else if(f>TANK)bad=`<b>Too much.</b> ${kg(f)} won’t fit: the tanks hold ${kg(TANK)}.`;
    else if(ZFW+f>MTOW)bad=`<b>Too heavy.</b> Take-off weight would be ${kg(ZFW+f)}, over the ${kg(MTOW)} limit. Extra fuel also burns extra fuel just to carry it.`;
    if(bad){t.className='ix-task no';t.innerHTML=bad+(ops.tries>=2?' Here is the full working.':' Start by working out the trip fuel.');w.innerHTML=workHTML(ops.tries>=2);w.style.display='grid';return}
    ops.ok=true;score+=ops.tries===1?1:0;w.innerHTML=workHTML(true);w.style.display='grid';
    t.className='ix-task ok';t.innerHTML=`<b>✓ Fuel plan accepted:</b> ${kg(f)}. Minimum ${kg(MINF)} (trip ${kg(TRIP)} + contingency ${kg(CONTF)} + reserve ${kg(RESF)}), take-off weight ${kg(ZFW+f)}, under ${kg(MTOW)}.`;
    setTimeout(()=>{ops.phase='wx';setPhase(ix)},1800)}},
  camera(p,l){const m=innerWidth<=760;if(m){p.set(12,4,-5.6);l.set(12,.3,-14.5)}else{p.set(12.7,2.4,-8.6);l.set(12.7,1.55,-14.5)}},
  onClose(){aikoTag.visible=true}});
}
function afterOps(ix){
 ix.dialog('Aiko · Flight dispatcher',`Plan filed: <b>${kg(ops.fuel)}</b> on board and a delay to 15:10 for the crosswind. The captain agreed straight away. Dispatchers and pilots share the decision, and the safe option always wins.`,[{label:'Thanks, Aiko →',fn:()=>{ix.closeDialog();const g=ix.awardOnce('sky_ops',60);ix.advance(3);ix.toast('✓ Flight plan filed'+(g?` · +${g} XP`:''))}}]);
}
function talkOps(ix){
 const A='Aiko · Flight dispatcher';
 if(ix.objIdx<2){ix.dialog(A,`Hi! ${ix.objIdx<1?'Check in with Rafael first, then':'Finish the walk-around with Mei in the Hangar first, then'} come and help me plan TLX 204.`,[{label:'Got it',fn:ix.closeDialog}]);return}
 if(ix.objIdx>2){ix.dialog(A,'TLX 204 is all set for 15:10. Nice planning!',[{label:'Anytime',fn:ix.closeDialog}]);return}
 if(ops.done){afterOps(ix);return}
 ix.dialog(A,`${ix.name}, perfect timing. I’m Aiko, the flight dispatcher. TLX 204 to Harbour Point needs a <b>fuel plan</b>, and the weather there is getting lively. Let’s plan it together.`,[{label:'Open the flight plan →',fn:()=>{ix.closeDialog();openOps(ix)}}]);
}

/* ------------------------------------------------------------------ supervisor */
function talkSuper(ix){
 const R='Rafael · Operations supervisor';
 if(ix.objIdx===0){
  ix.dialog(R,`Welcome to Skyport, <b>${ix.name}</b>! I’m Rafael, the operations supervisor. Today you’ll help get flight TLX 204 ready: an aircraft check in the Hangar, then fuel and weather in Flight Ops. Everything here is fictional, including the airline.`,[
   {label:'Who works at an airport?',fn:()=>ix.dialog(R,'Pilots and cabin crew, aircraft engineers, flight dispatchers, air traffic controllers, ground handlers, security teams and more. Every flight depends on all of them working as one team.',[{label:'Let’s start →',fn:start}])},
   {label:'I’m ready →',fn:start}]);return}
 if(ix.objIdx<3){ix.dialog(R,`Keep going, ${ix.name}! Next: <b>${CFG.objectives[ix.objIdx][0].toLowerCase()}</b>.`,[{label:'On it',fn:ix.closeDialog}]);return}
 if(ix.objIdx>3){ix.dialog(R,'Great work today. Blue skies!',[{label:'Thanks, Rafael',fn:ix.closeDialog}]);return}
 const found=PARTS.filter(p=>p[2]&&walk.judged[p[0]]==='fault').length;
 ix.dialog(R,`Debrief time. Here’s TLX 204:<div class="vitals"><div>Faults found<b>${found} / 2</b></div><div>Fuel<b>${Math.round(ops.fuel/100)/10}t</b></div><div>Gust crosswind<b>${Math.round(xwind(WX.dir,WX.gust))} kt</b></div><div>Decision<b>Delay</b></div></div>`,[{label:'Start the debrief',fn:q1}]);
 function q1(){ix.question('Debrief · Checklists','Today you used a walk-around checklist and a step-by-step fuel plan. Why does aviation insist on checklists, even for very experienced crews?',
  ['Because anyone can forget a step under pressure; checklists catch errors before they become accidents','They are only for new staff: experts can skip them','They are just paperwork for the authorities'],0,
  'Even experts get tired, rushed or interrupted. A <b>checklist</b> makes sure every critical item is done the same way every time, which is how the pitot cover and the low tyre were caught today.',f=>{score+=f;q2()})}
 function q2(){ix.question('Debrief · Crew resource management','Later, the first officer notices the captain has entered the wrong runway into the flight computer. Under <b>crew resource management (CRM)</b>, what should she do?',
  ['Speak up clearly straight away and cross-check it together, even though the captain is more senior','Stay quiet: the captain is in charge','Fix it secretly without telling anyone'],0,
  'CRM means using <b>everyone’s</b> eyes and brains. Crews are trained to speak up, read back and cross-check, whatever their rank. Many accidents were avoided because someone said “I’m not sure that’s right”.',f=>{score+=f;
   ix.dialog(R,`You found the faults, planned the fuel, made a safe weather call and showed you understand teamwork. That’s flight operations, ${ix.name}!`,[{label:'Finish my shift →',fn:()=>ix.finish({icon:'➤',title:'Skyport Flight Operations Cadet',score,max:6,
    skills:['✈ Doing a pre-flight walk-around','⚠ Reporting defects in the technical log','⛽ Planning trip, contingency and reserve fuel','⚖ Respecting weight and tank limits','🌬 Calculating crosswind and making a go/delay call','🤝 Checklists and crew resource management']})}])})}
 function start(){ix.closeDialog();ix.nova.visible=true;ix.advance(1);ix.toast('✓ Checked in. NOVA has joined you.')}
}
function windowFact(ix){
 ix.dialog('NOVA · Bonus fact','An aircraft’s wings are shaped and angled so that air flowing over them is pushed downwards, and the wing is pushed up: that’s <b>lift</b>. Pilots take off and land <b>into the wind</b> whenever they can, because a headwind gives more lift at a lower ground speed. That’s why the weather decision matters so much.',[{label:'Interesting!',fn:()=>{ix.closeDialog();const g=ix.awardOnce('sky_window',10);if(g)ix.toast(`✦ Bonus fact · +${g} XP`)}}]);
}

const CFG={id:'sky',title:'Skyport Aviation Centre',subtitle:'Flight operations shift',enterLabel:'➤ Enter Skyport Aviation Centre: start a 3D shift →',badge:'Skyport Flight Operations Cadet',
 objectives:[['Check in with Rafael, the operations supervisor',[0,5.7]],['Do the pre-flight walk-around in the Hangar',[-5.2,-8]],['Plan fuel and weather in Flight Ops',[12,-9.3]],['Debrief with Rafael',[0,5.7]],['Get your feedback and badge',null]],
 hints:['Welcome to <b>Skyport</b>! I’m <b>NOVA</b>, your learning guide. Check in with <b>Rafael</b>, the operations supervisor, at the check-in desk.',
  'Head up the corridor to the <b>Hangar</b>, first door on the left. Mei needs help with a pre-flight walk-around.',
  'Aircraft checked! Cross the corridor to <b>Flight Ops</b>. Aiko needs a fuel plan and a weather call.',
  'Flight plan filed! Walk back to <b>Rafael</b> at the check-in desk for your debrief.',
  'Shift complete. Open your <b>Career Passport</b> to see your new badge.'],
 build,
 interact(id,ix){const f={super:talkSuper,hangar:talkHangar,ops:talkOps,window:windowFact}[id];if(f)f(ix)},
 frame(dt,t){mini.rotation.y+=dt*.6;drawRadar(t);
  if((boardT+=dt)>.8){boardT=0;blink=!blink;drawBoard()}
  const on=(t%1.3)<.12;for(const b of beacons)b.material.emissiveIntensity=on?1.8:.12},
 reset(){score=0;resetWalk();resetOps()}
};
resetWalk();resetOps();
TI.register(CFG);
})();
