/* TALENTOPIA · Taste District Kitchen (district config for interior.js)
   Head-chef check-in at the host stand, recipe scaling and food-cost maths in the
   Professional Kitchen, temperature and cross-contamination checks in the Prep Lab, a
   nut-allergy order in the dining room and a service-teamwork debrief. All people,
   dishes, prices and temperatures are fictional and illustrative. */
(()=>{
'use strict';
const TI=window.TalentopiaInterior;if(!TI)return;
const $=id=>document.getElementById(id);
const money=n=>'$'+n.toFixed(2);
const PEACH='#FFBA91';
/* recipe: name, base quantity (for BASE portions), unit, cost per unit, whole item?, price label (all illustrative) */
const BASE=4,BOOKING=18,TARGET=30;
const RECIPE=[['Eggs',8,'',.30,true,'$0.30 each'],['Chopped tomatoes',800,'g',.003,false,'$3.00/kg'],['Red peppers',2,'',.80,true,'$0.80 each'],['Onions',1,'',.40,true,'$0.40 each'],
 ['Olive oil',40,'ml',.01,false,'$10.00/L'],['Feta cheese',120,'g',.014,false,'$14.00/kg'],['Ground cumin',4,'g',.03,false,'$30.00/kg'],['Sourdough slices',4,'',.50,true,'$0.50 each']];
/* commonly used guidance: chilled ≤ 5 °C, hot-hold ≥ 63 °C (local regulations vary) */
const CHILL=5,HOT=63;
const PROBES=[['Chicken Caesar salad','chill',3.4],['Vanilla custard','chill',8.6],['Beef & bean chilli','hot',71.5],['Steamed rice','hot',54.2],['Smoked salmon','chill',4.1]];
let holo,flames=[],steam=[],stoveLight,theoTag,hanaTag,fridgeLT,hotLT,score=0,kFirst=true,kit=null,fs;

/* live canvas displays (fridge + hot-hold read-outs follow the panel sliders) */
function liveTex(w,h){const cv=document.createElement('canvas');cv.width=w;cv.height=h;const tex=new THREE.CanvasTexture(cv);tex.encoding=THREE.sRGBEncoding;return{cv,x:cv.getContext('2d'),tex}}
function drawDisp(lt,label,value,color){if(!lt)return;const {cv,x}=lt;x.fillStyle='#0a0f2a';x.fillRect(0,0,cv.width,cv.height);x.strokeStyle=color;x.lineWidth=6;x.strokeRect(3,3,cv.width-6,cv.height-6);
 x.fillStyle='#aab6da';x.font='bold 22px system-ui,sans-serif';x.textAlign='center';x.fillText(label,cv.width/2,32);x.fillStyle=color;x.font='bold 54px system-ui,sans-serif';x.fillText(value,cv.width/2,98);lt.tex.needsUpdate=true}
const fridgeColor=t=>t<=CHILL?'#8DE8C3':t<=8?'#FFD59C':'#ff9bb2';
const hotColor=t=>t>=HOT?'#8DE8C3':'#ff9bb2';
function ticketTexture(){const cv=document.createElement('canvas');cv.width=512;cv.height=96;const x=cv.getContext('2d');x.fillStyle='#3a3f4f';x.fillRect(0,0,512,96);
 const T=[['T2','2× SHAK','1× SOUP'],['T7','4× SHAK','—'],['T4','2× SHAK','⚠ NUT ALLERGY'],['T9','1× SALAD','1× CHILLI']];
 T.forEach((t,i)=>{const X=10+i*126;x.fillStyle='#fffdf6';x.fillRect(X,8,114,82);x.fillStyle=i===2?'#d0342c':'#1b1f33';x.font='bold 20px ui-monospace,Menlo,monospace';x.fillText(t[0],X+8,30);x.font='15px ui-monospace,Menlo,monospace';x.fillText(t[1],X+8,54);x.fillText(t[2],X+8,76)});
 const tex=new THREE.CanvasTexture(cv);tex.encoding=THREE.sRGBEncoding;return tex}

/* ------------------------------------------------------------------ building */
function build(B){
 const {scene,C,M,glow,box,collider,hotspot,npc,person,textSprite,panelTexture,screen,shell,plant}=B;
 const TRIM=0xffba91;
 shell({lobby:0xa87a55,corridor:0x8f7d70,left:0x434858,leftOpts:{roughness:.9},right:0xdcd8e6,rightOpts:{roughness:.5},wall:0xf4e9dc,trim:TRIM});
 const woodM=M(0x6b4a33,{roughness:.5}),woodD=M(0x4a3223,{roughness:.55}),metalM=M(0x2b2f3d,{metalness:.6,roughness:.35}),chairM=M(0x7a5038,{roughness:.6});
 const steel=M(0xc9ced8,{metalness:.75,roughness:.28}),steelD=M(0x8a90a0,{metalness:.7,roughness:.35}),steelTop=M(0xe3e7ee,{metalness:.8,roughness:.2});
 const sph=(r,mat,x,y,z,sy=1)=>{const m=new THREE.Mesh(new THREE.SphereGeometry(r,12,10),mat);m.position.set(x,y,z);m.scale.y=sy;scene.add(m);return m};
 const cyl=(rt,rb,h,mat,x,y,z,seg=18)=>{const m=new THREE.Mesh(new THREE.CylinderGeometry(rt,rb,h,seg),mat);m.position.set(x,y,z);scene.add(m);return m};
 const toque=g=>{const h=new THREE.Mesh(new THREE.CylinderGeometry(.15,.14,.22,16),M(0xffffff,{roughness:.8}));h.position.set(0,1.99,0);g.add(h);
  const p=new THREE.Mesh(new THREE.SphereGeometry(.19,16,10),M(0xffffff,{roughness:.8}));p.position.set(0,2.13,0);p.scale.y=.6;g.add(p);return g};
 const seated=(o,x,z,ry)=>{const g=person(o),r=g.userData.rig;r.legL.rotation.x=r.legR.rotation.x=-Math.PI/2;r.armL.rotation.x=r.armR.rotation.x=-.55;g.position.set(x,-.43,z);g.rotation.y=ry;scene.add(g);return g};

 /* ---------- lobby: Saffron & Salt dining room */
 box(5,1.05,1.1,M(0x5a3a2a,{roughness:.45}),0,.525,4);box(5.1,.06,1.2,M(0xf3ece4,{roughness:.3}),0,1.08,4);box(5,.16,.02,glow(TRIM),0,.62,4.56);collider(-2.6,3.4,2.6,4.6);
 box(.5,.32,.03,M(0x1b1f33),1.4,1.26,4.1).rotation.x=-.25;screen(.46,.28,panelTexture('Reservations',['12:30 · Party of 18','13:00 · Table 4'],PEACH),1.4,1.26,4.12);
 cyl(.05,.05,.14,M(0x8de8c3,{roughness:.4}),-1.6,1.18,4);sph(.12,M(0xf7a9d8,{roughness:.8}),-1.6,1.33,4);
 const rosa=npc(toque(person({skin:0x7a4a2a,hair:0x1d1a1f,style:'bun',outfit:0xf6f7ff,coat:true,badge:true})));rosa.position.set(0,0,2.9);scene.add(rosa);collider(-.35,2.55,.35,3.25);
 const rt=textSprite('Chef Rosa',PEACH,.75,'Head chef');rt.position.set(0,2.55,2.9);scene.add(rt);
 hotspot('chef',0,5.7,1.9,'Talk to Chef Rosa, the head chef',[rosa]);
 // holographic plate + cloche above the host stand
 holo=new THREE.Group();const plate=new THREE.Mesh(new THREE.CylinderGeometry(.42,.34,.04,32),new THREE.MeshBasicMaterial({color:0xffba91,wireframe:true}));holo.add(plate);
 const cloche=new THREE.Mesh(new THREE.SphereGeometry(.32,16,8,0,Math.PI*2,0,Math.PI/2),new THREE.MeshBasicMaterial({color:C.cyan,wireframe:true}));cloche.position.y=.02;holo.add(cloche);
 holo.position.set(0,3.0,4);scene.add(holo);
 const sign=textSprite('Saffron & Salt',PEACH,1.25,'Taste District · Culinary arts & hospitality');sign.position.set(0,3.4,.2);scene.add(sign);
 // tables (kept clear of the central walkway and the x≈±3.8 route around the desk)
 const chair=(x,z,dx,dz)=>{box(.42,.05,.42,chairM,x,.45,z);box(.05,.43,.05,metalM,x,.215,z);box(dx?.05:.42,.48,dx?.42:.05,chairM,x+dx*.2,.72,z+dz*.2);collider(x-.22,z-.22,x+.22,z+.22)};
 const table=(x,z,two)=>{const r=two?.45:.62;cyl(r,r,.05,woodM,x,.76,z,28);box(.07,.72,.07,metalM,x,.37,z);cyl(.035,.035,.09,glow(0xffd59c),x,.83,z,10);collider(x-r,z-r,x+r,z+r);
  const d=two?.72:.95,seats=two?[[-1,0],[1,0]]:[[-1,0],[1,0],[0,-1],[0,1]];
  seats.forEach(([sx,sz])=>{chair(x+sx*d,z+sz*d,sx,sz);cyl(.12,.1,.015,M(0xffffff,{roughness:.3}),x+sx*(r-.17),.79,z+sz*(r-.17))})};
 table(-6.5,6.8);table(-6.5,10.6);table(6.5,6.8);table(6.5,10.6);table(-7.8,2.2,true);table(7.8,2.2,true);
 for(const [x,z] of [[-6.5,6.8],[-6.5,10.6],[6.5,6.8],[6.5,10.6]]){box(.02,.6,.02,metalM,x,2.5,z);const sh=new THREE.Mesh(new THREE.ConeGeometry(.3,.28,20,1,true),M(0xd88a4a,{side:THREE.DoubleSide,roughness:.4,metalness:.3}));sh.position.set(x,2.08,z);scene.add(sh);sph(.07,glow(0xffe2b0),x,1.96,z)}
 for(const s of [-1,1]){const pl=new THREE.PointLight(0xffc98a,.55,9);pl.position.set(s*6.5,2.2,8.7);scene.add(pl)}
 const tb=textSprite('Table 4','#F7A9D8',.55);tb.position.set(6.5,1.9,10.6);scene.add(tb);
 // guests (seated meshes are not NPCs, so the engine's idle bob doesn't lift them off their chairs)
 seated({skin:0xc98e66,hair:0x1d1a1f,style:'long',outfit:0xf7a9d8},6.5,11.55,Math.PI);
 seated({skin:0xf6d7c3,hair:0xa86d3a,style:'short',outfit:0x3d7bdc},7.45,10.6,-Math.PI/2);
 seated({skin:0x4e2f1c,hair:0x1d1a1f,style:'bun',outfit:0x8de8c3},-5.55,6.8,-Math.PI/2);
 const ng=textSprite('Ms. Noor','#F7A9D8',.6,'Guest · Table 4');ng.position.set(6.5,1.75,12.2);scene.add(ng);
 const sam=npc(person({skin:0xa0663f,hair:0x5a3b22,style:'short',outfit:0x1b1f33,pants:0x1b1f33,badge:true}));box(.34,.42,.02,M(0x6b4a33),0,1.0,.16,sam);
 sam.position.set(5.4,0,9.2);sam.rotation.y=-Math.PI/2;scene.add(sam);collider(5.05,8.85,5.75,9.55);
 const st=textSprite('Sam','#F7A9D8',.65,'Server');st.position.set(5.4,2.3,9.2);scene.add(st);
 hotspot('table',4.6,10.4,1.8,'Help Sam with Table 4’s order',[sam]);
 // drinks station + wall screens
 box(2.6,1,.7,woodD,-7.6,.5,13.4);box(2.66,.05,.76,M(0xf3ece4,{roughness:.3}),-7.6,1.03,13.4);box(.45,.5,.4,metalM,-8.3,1.3,13.45);box(.3,.06,.02,glow(C.cyan),-8.3,1.42,13.24);collider(-8.95,13,-6.25,13.8);
 for(let i=0;i<4;i++)cyl(.05,.04,.1,M(0xffffff,{roughness:.3}),-7.4+i*.18,1.1,13.3,10);
 screen(3,1.75,panelTexture('Lunch special',['Shakshuka with feta','Baked eggs · peppers · sourdough','Allergies? Please ask your server'],PEACH),-9.83,1.8,4.4,Math.PI/2);
 screen(3,1.75,panelTexture('Today’s service',['12:30 · Birthday party of 18','13:00 · Table 4 · 3 guests','⚠ Allergy noted: Table 4'],'#F7A9D8'),9.83,1.8,4.6,-Math.PI/2);
 plant(-3.7,.9);plant(3.7,.9);plant(9.2,13.1);
 const sk=textSprite('← Kitchen',PEACH,.95);sk.position.set(-2.2,3.25,-10);scene.add(sk);
 const sp=textSprite('Prep & Pastry Lab →','#8DE8C3',.95);sp.position.set(2.2,3.25,-10);scene.add(sp);

 /* ---------- left: Professional Kitchen */
 box(3,.9,1.1,steel,-10.5,.45,-11.2);box(3.06,.04,1.16,steelTop,-10.5,.92,-11.2);collider(-12.05,-11.8,-8.95,-10.6);
 box(.5,.03,.32,M(0xd9b98a),-11.2,.955,-11.1);for(let i=0;i<3;i++)sph(.06,M(0xe0443a,{roughness:.5}),-11.35+i*.13,1.0,-11.12);
 box(.36,.03,.24,M(0xb89a6a),-10.4,.955,-11.05);for(let i=0;i<6;i++)sph(.035,M(0xfff6e6),-10.52+(i%3)*.12,.99,-11.11+Math.floor(i/3)*.12,1.3);
 box(.26,.05,.26,M(0x2a2f45),-9.7,.965,-11.1);box(.2,.01,.2,steel,-9.7,.995,-11.1);box(.1,.03,.01,glow(C.mint),-9.7,.965,-10.965);
 box(.62,.4,.04,M(0x1b1f33),-10.5,1.25,-11.6);screen(.58,.36,panelTexture('Special · shakshuka',['Base recipe: 4 portions','12:30 booking → scale it'],PEACH),-10.5,1.25,-11.575);
 const theo=npc(toque(person({skin:0xe8b896,hair:0x5a3b22,style:'short',outfit:0xf6f7ff,coat:true})));theo.position.set(-10.5,0,-12.5);scene.add(theo);collider(-10.85,-12.85,-10.15,-12.15);
 theoTag=textSprite('Theo',PEACH,.75,'Sous chef');theoTag.position.set(-10.5,2.55,-12.5);scene.add(theoTag);
 hotspot('kitchen',-10.5,-9.3,2,'Prep the lunch special with Theo',[theo]);
 // cook line: ranges, gas flames, pans, extraction hood
 box(4.6,.9,1.1,steelD,-14.9,.45,-15.35);box(4.66,.04,1.16,M(0x2a2d38,{metalness:.5,roughness:.4}),-14.9,.92,-15.35);collider(-17.25,-15.95,-12.55,-14.75);
 box(4.4,.03,.03,steel,-14.9,.62,-14.78);
 [-16.4,-15.4,-14.4,-13.4].forEach((x,i)=>{cyl(.17,.17,.03,M(0x15171f),x,.955,-15.2,20);
  const f=new THREE.Mesh(new THREE.ConeGeometry(.13,.2,12,1,true),new THREE.MeshBasicMaterial({color:i===3?0xff9a3c:0x6fb6ff,transparent:true,opacity:.85,side:THREE.DoubleSide,depthWrite:false}));
  f.position.set(x,1.06,-15.2);f.userData.ph=i*1.7;scene.add(f);flames.push(f)});
 cyl(.26,.22,.07,M(0x22252f,{metalness:.5}),-16.4,1.14,-15.2,24);cyl(.23,.23,.01,M(0xc0392b,{roughness:.7}),-16.4,1.18,-15.2,24);
 for(let i=0;i<3;i++){const a=i*Math.PI*2/3;sph(.06,M(0xfffaf0),-16.4+Math.cos(a)*.11,1.19,-15.2+Math.sin(a)*.11,.35);sph(.025,M(0xffb020),-16.4+Math.cos(a)*.11,1.205,-15.2+Math.sin(a)*.11)}
 cyl(.22,.2,.4,steel,-14.4,1.3,-15.2,20);cyl(.18,.17,.12,steel,-13.4,1.16,-15.2,18);
 for(let i=0;i<3;i++){const s=new THREE.Mesh(new THREE.SphereGeometry(.12,10,8),new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.3,depthWrite:false}));s.position.set(-14.4,1.6,-15.2);s.userData.o=i/3;scene.add(s);steam.push(s)}
 box(4.8,.45,1.3,steel,-14.9,2.4,-15.3);box(4.5,.03,.06,glow(0xffe2b0),-14.9,2.16,-14.7);
 stoveLight=new THREE.PointLight(0xffa860,.6,7);stoveLight.position.set(-14.9,1.6,-14.3);scene.add(stoveLight);
 // walk-in fridge door
 const walkin=box(1.7,2.3,.14,steel,-6.6,1.15,-15.9);box(.08,.5,.08,M(0x333a4a),-5.95,1.15,-15.78);box(1.5,.04,.02,glow(C.cyan),-6.6,2.2,-15.82);
 screen(.5,.3,panelTexture('Walk-in',['3.2 °C ✓'],'#67DFF0'),-5.25,1.75,-15.83);
 const wt=textSprite('Walk-in fridge','#67DFF0',.6);wt.position.set(-6.6,2.75,-15.5);scene.add(wt);
 hotspot('walkin',-6.6,-14.6,1.4,'Look inside the walk-in fridge',[walkin]);
 // handwash sink
 box(.7,.85,.5,steel,-4.1,.425,-15.6);box(.5,.06,.36,M(0x9aa2b2,{metalness:.8}),-4.1,.86,-15.6);box(.04,.3,.04,steel,-4.1,1.05,-15.78);collider(-4.5,-15.95,-3.7,-15.3);
 const hw=textSprite('Handwash only','#8DE8C3',.5);hw.position.set(-4.1,1.8,-15.6);scene.add(hw);
 // the pass: heat lamps, plates, order tickets
 box(1,.95,4,steel,-17.45,.475,-7.5);box(1.04,.04,4.04,steelTop,-17.45,.97,-7.5);collider(-18,-9.55,-16.9,-5.45);
 for(const z of [-9,-7.5,-6]){box(.02,.5,.02,metalM,-17.45,2.2,z);box(.32,.08,.32,glow(0xff7a3c),-17.45,1.92,z);cyl(.14,.11,.015,M(0xffffff,{roughness:.3}),-17.4,1.0,z+.25,18);sph(.08,M(0xc0392b,{roughness:.7}),-17.4,1.02,z+.25,.45)}
 screen(3.4,.64,ticketTexture(),-17.83,1.45,-7.5,Math.PI/2);
 const pt=textSprite('The pass',PEACH,.6,'Orders go out here');pt.position.set(-17.2,2.6,-7.5);scene.add(pt);
 const passL=new THREE.PointLight(0xff8a4c,.35,4);passL.position.set(-17,1.6,-7.5);scene.add(passL);
 screen(2.6,1.5,panelTexture('Kitchen brigade',['Head chef → sous chef','Chefs de partie · line cooks','Commis chefs · kitchen porters'],PEACH),-10,1.85,-15.83);
 const kl=new THREE.PointLight(0xfff1e0,.45,12);kl.position.set(-10.5,2.7,-9);scene.add(kl);

 /* ---------- right: Prep & Pastry Lab */
 box(3,.9,1.1,steel,12,.45,-11.2);box(3.06,.04,1.16,steelTop,12,.92,-11.2);collider(10.45,-11.8,13.55,-10.6);
 box(.34,.06,.3,M(0x2a2f45),11.1,.97,-11.1);box(.28,.01,.24,steel,11.1,1.005,-11.1);box(.12,.04,.01,glow(C.mint),11.1,.97,-10.945);
 box(.06,.025,.14,M(0xffd59c),12.55,.955,-11.0);const spike=cyl(.006,.006,.22,steel,12.7,.955,-11.0,6);spike.rotation.z=Math.PI/2;
 [0xe0443a,0x3d7bdc,0x5cbf6a].forEach((c,i)=>{box(.22,.14,.16,M(0xf4f6fa,{transparent:true,opacity:.75}),12.95+i*.26,1.01,-11.0);box(.23,.025,.17,M(c),12.95+i*.26,1.09,-11.0)});
 box(.62,.4,.04,M(0x1b1f33),12,1.25,-11.6);screen(.58,.36,panelTexture('Food safety log',['Fridge · hot-hold · probes','Due before service'],'#8DE8C3'),12,1.25,-11.575);
 const hana=npc(person({skin:0xf6d7c3,hair:0x1d1a1f,style:'bun',outfit:0x2fa79a,coat:true,badge:true}));hana.position.set(12,0,-12.6);scene.add(hana);collider(11.65,-12.95,12.35,-12.25);
 hanaTag=textSprite('Hana','#8DE8C3',.75,'Food safety lead');hanaTag.position.set(12,2.35,-12.6);scene.add(hanaTag);
 hotspot('prep',12,-9.3,2,'Run the food safety checks with Hana',[hana]);
 // speed rack with pastries
 for(const s of [-1,1])box(.04,1.8,.5,steel,4.4+s*.3,.9,-14.9);
 for(let i=0;i<4;i++){box(.58,.02,.46,steelTop,4.4,.4+i*.42,-14.9);for(let k=0;k<2;k++)sph(.08,M(0xd9a05b,{roughness:.7}),4.25+k*.3,.46+i*.42,-14.9,.6)}
 collider(4.0,-15.25,4.8,-14.55);
 // hot-hold cabinet with live display
 box(2.2,1.1,.85,steel,7.1,.55,-15.5);box(1.9,.7,.02,M(0xffb070,{emissive:0xff8a3c,emissiveIntensity:.6,transparent:true,opacity:.75}),7.1,.6,-15.065);collider(5.95,-15.95,8.25,-15.05);
 box(.6,.34,.08,M(0x1b1f33),7.1,1.3,-15.3);hotLT=liveTex(256,128);screen(.56,.28,hotLT.tex,7.1,1.3,-15.255);
 const hl=new THREE.PointLight(0xff9a50,.35,4);hl.position.set(7.1,1.2,-14.6);scene.add(hl);
 const ht=textSprite('Hot-hold cabinet','#FFD59C',.55);ht.position.set(7.1,2.0,-15.3);scene.add(ht);
 // colour-coded chopping boards
 [0xe0443a,0x3d7bdc,0xf2c94c,0x5cbf6a,0x8b5a2b,0xf5f5f5].forEach((c,i)=>box(.3,.5,.03,M(c,{roughness:.6}),9.35+i*.34,1.35,-15.82));
 screen(2.3,.95,panelTexture('Colour-coded boards',['Red raw meat · Blue raw fish','Green salad · Yellow cooked','(colour schemes vary)'],'#F7A9D8'),10.2,2.2,-15.83);
 screen(2,1.15,panelTexture('Food safety basics',['Clean · separate · cook · chill','Chill ≤ 5 °C · Hot ≥ 63 °C*','*follow local regulations'],'#8DE8C3'),12.6,1.8,-15.83);
 // reach-in fridges with live display
 for(const x of [14.9,16.4]){box(1.35,2.1,.85,steel,x,1.05,-15.5);box(.05,.9,.05,M(0x333a4a),x-.55,1.2,-15.05)}collider(14.2,-15.95,17.1,-15.05);
 fridgeLT=liveTex(256,128);screen(.6,.3,fridgeLT.tex,14.9,1.85,-15.06);screen(.6,.36,panelTexture('Dairy fridge',['3 °C ✓'],'#67DFF0'),16.4,1.85,-15.06);
 const ft=textSprite('Reach-in fridges','#67DFF0',.55);ft.position.set(15.65,2.55,-15.3);scene.add(ft);
 // pastry bench: stand mixer, scales, labelled containers
 box(1,.9,4.2,steel,17.45,.45,-9);box(1.04,.04,4.24,steelTop,17.45,.92,-9);collider(16.9,-11.15,18,-6.85);
 const mixM=M(0xf7a9d8,{roughness:.35});box(.4,.06,.3,mixM,17.4,.97,-10.2);box(.14,.42,.12,mixM,17.55,1.17,-10.2);box(.42,.14,.16,mixM,17.4,1.42,-10.2);cyl(.14,.1,.2,steel,17.3,1.06,-10.2,18);
 box(.34,.06,.3,M(0x2a2f45),17.4,.97,-8.8);box(.28,.01,.24,steel,17.4,1.005,-8.8);box(.01,.04,.12,glow(C.mint),17.225,.97,-8.8);
 for(const y of [1.65,2.15])box(.45,.04,4,M(0xe3e7ee,{metalness:.5}),17.75,y,-9);
 for(let i=0;i<6;i++){const y=i<3?1.79:2.29,z=-10.3+(i%3)*1.1;box(.3,.22,.3,M(0xf4f6fa,{transparent:true,opacity:.8}),17.7,y,z);box(.31,.03,.31,M([0x67dff0,0xffd59c,0x8de8c3][i%3]),17.7,y+.125,z);box(.01,.07,.16,M(0xffffff),17.545,y,z)}
 const lt=textSprite('Every container: name · date · use-by','#FFD59C',.6);lt.position.set(17.2,2.75,-9);scene.add(lt);
 const pl2=new THREE.PointLight(0xeaf6ff,.5,12);pl2.position.set(12,2.7,-9);scene.add(pl2);
}

/* ------------------------------------------------------------------ kitchen: scaling + food cost */
function costing(cov,price){
 const items=RECIPE.map(r=>{const raw=r[1]*cov/BASE;const q=r[4]?Math.ceil(raw-1e-9):raw>=100?Math.round(raw/10)*10:Math.round(raw);return{name:r[0],base:r[1],u:r[2],raw,q,cost:q*r[3],whole:r[4],lab:r[5]}});
 const total=items.reduce((s,i)=>s+i.cost,0),plate=total/cov;return{items,total,plate,pct:plate/price*100};
}
const qty=(q,u)=>q.toLocaleString('en-US')+(u?' '+u:'');
function openKitchen(ix){
 theoTag.visible=false;
 ix.openPanel({hideAvatar:true,
  html:`<div class="k">Kitchen · Lunch special</div><h3>Scale & cost the shakshuka</h3>
  <div class="ix-info"><b>Booking sheet</b>12:30 birthday lunch: <b style="display:inline;font-size:12px;color:#FFBA91">${BOOKING} guests</b>, all ordering the shakshuka special. Theo’s base recipe serves <b style="display:inline;font-size:12px">${BASE}</b>.</div>
  <div class="ix-range"><label>Covers to prepare <strong id="tkCov"></strong></label><input type="range" id="tkC" min="4" max="30" step="1" value="8" aria-label="Number of covers"></div>
  <div class="ix-metric"><span>Scale factor = covers ÷ ${BASE}</span><strong id="tkFac"></strong></div>
  <div id="tkList" style="display:grid;gap:5px"></div>
  <div class="ix-range"><label>Menu price per plate <strong id="tkPr"></strong></label><input type="range" id="tkP" min="7" max="14" step="0.5" value="8" aria-label="Menu price per plate"></div>
  <div class="ix-metric"><span>Ingredient cost, whole batch</span><strong id="tkTot"></strong></div>
  <div class="ix-metric"><span>Food cost per plate = batch ÷ covers</span><strong id="tkPlate"></strong></div>
  <div class="ix-metric"><span>Food cost % = per plate ÷ menu price</span><strong id="tkPct"></strong></div>
  <div class="ix-task" id="tkTask"></div>
  <button class="ix-primary" id="tkGo" style="margin-top:4px">Send to Theo for approval</button>
  <div class="ix-note">Illustrative prices and targets. Whole items (eggs, peppers, onions, bread) are rounded <b>up</b>, because you can’t buy or crack part of one; weights round to a sensible amount. Many restaurants aim for a food cost of roughly 25–35%; this kitchen’s target is ${TARGET}%. The rest of the price pays for staff, rent, energy and profit.</div>`,
  bind(){
   const calc=()=>{const cov=+$('tkC').value,price=+$('tkP').value,c=costing(cov,price);
    $('tkCov').textContent=cov;$('tkFac').textContent=(cov/BASE).toFixed(2)+'×';$('tkPr').textContent=money(price);
    $('tkList').innerHTML=c.items.map(i=>`<div class="ix-metric" style="padding:6px 11px"><span>${i.name} <small style="color:#93a0c8">(${qty(i.base,i.u)} · ${i.lab})</small></span><strong>${qty(i.q,i.u)}${i.whole&&Math.abs(i.q-i.raw)>1e-9?` <small style="color:#FFD59C">(↑ from ${+i.raw.toFixed(2)})</small>`:''}</strong></div>`).join('');
    $('tkTot').textContent=money(c.total);$('tkPlate').textContent=money(c.plate);
    const ok=c.pct<=TARGET+1e-9;$('tkPct').textContent=c.pct.toFixed(1)+'%'+(ok?' ✓':' ✕');$('tkPct').style.color=ok?'#8DE8C3':'#ff9bb2';};
   const goal=()=>{const t=$('tkTask');t.className='ix-task';t.innerHTML=`<b>Your goal:</b> prepare exactly the right number of portions for the booking, then set a menu price that keeps food cost at <b>${TARGET}% or less</b>.`};
   $('tkC').oninput=()=>{calc();goal()};$('tkP').oninput=()=>{calc();goal()};calc();goal();
   $('tkGo').onclick=()=>{const cov=+$('tkC').value,price=+$('tkP').value,c=costing(cov,price),t=$('tkTask');
    if(cov!==BOOKING){kFirst=false;t.className='ix-task no';t.innerHTML=`<b>Not yet.</b> ${cov} portions doesn’t match the booking. ${cov<BOOKING?'Some guests would have no lunch!':'Extra portions mean wasted food and money.'} Check how many guests are booked.`;return}
    if(c.pct>TARGET+1e-9){kFirst=false;t.className='ix-task no';t.innerHTML=`<b>Not yet.</b> Food cost is <b>${c.pct.toFixed(1)}%</b>, above the ${TARGET}% target, so the dish would barely cover its share of wages, rent and energy. Tip: the lowest price that hits the target = cost per plate ÷ ${(TARGET/100).toFixed(2)}.`;return}
    kit={cov,price,plate:c.plate,pct:c.pct,eggs:c.items[0].q,total:c.total};score+=kFirst?1:0;ix.closePanel();afterKitchen(ix);};},
  camera(p,l){const m=innerWidth<=760;p.set(-10.5,m?3.1:2.45,m?-6.4:-8.1);l.set(-10.5,m?.35:1.05,-12.2)},
  onClose(){theoTag.visible=true}});
}
function afterKitchen(ix){
 const T='Theo · Sous chef';
 ix.dialog(T,`Yes, chef! Approved: <b>${kit.cov} portions</b> using <b>${kit.eggs} eggs</b>, about <b>${money(kit.plate)}</b> of ingredients per plate, sold at <b>${money(kit.price)}</b>.<div class="vitals"><div>Covers<b>${kit.cov}</b></div><div>Batch cost<b>${money(kit.total)}</b></div><div>Per plate<b>${money(kit.plate)}</b></div><div>Food cost<b>${kit.pct.toFixed(1)}%</b></div></div>`,[{label:'One more costing question',fn:()=>
  ix.question('Kitchen · Costing','Next month the feta supplier raises its price and the special’s food cost climbs to <b>34%</b>. What is a sensible response?',
   ['Re-cost the recipe, then compare suppliers, adjust the recipe or review the menu price with the head chef','Quietly serve smaller portions than the menu describes','Ignore it: food cost doesn’t matter if the food tastes good'],0,
   `Kitchens <b>re-cost</b> dishes whenever ingredient prices change. Options include another supplier, a recipe tweak (say, a little less feta and more seasonal vegetables) or a new menu price, agreed openly. Because food cost % = ingredient cost ÷ menu price, small changes decide whether a restaurant can pay its team.`,f=>{score+=f;ix.closeDialog();
    const g=ix.awardOnce('taste_kitchen',60);ix.advance(2);ix.toast('✓ Special scaled and costed'+(g?` · +${g} XP`:''))})}]);
}
function talkKitchen(ix){
 const T='Theo · Sous chef';
 if(ix.objIdx<1){ix.dialog(T,'Morning! Check in with Chef Rosa at the host stand first. She runs this kitchen.',[{label:'Yes, chef',fn:ix.closeDialog}]);return}
 if(ix.objIdx>1){ix.dialog(T,'The shakshuka base is simmering. Smells good, doesn’t it?',[{label:'It really does',fn:ix.closeDialog}]);return}
 ix.dialog(T,`Hi ${ix.name}, I’m Theo, the sous chef. We have a big birthday booking at 12:30 and they all want the <b>shakshuka special</b>. My recipe makes 4 portions, so we need to <b>scale it up</b> and check it still makes money.`,[{label:'Let’s scale it →',fn:()=>{ix.closeDialog();openKitchen(ix)}}]);
}

/* ------------------------------------------------------------------ prep lab: food safety */
function resetFs(){fs={fridge:8,hot:58,probed:{},ok:{},mistakes:0};drawDisp(fridgeLT,'FRIDGE',fs.fridge+' °C',fridgeColor(fs.fridge));drawDisp(hotLT,'HOT-HOLD',fs.hot+' °C',hotColor(fs.hot))}
const safeOf=p=>p[1]==='hot'?p[2]>=HOT:p[2]<=CHILL;
const ruleOf=p=>p[1]==='hot'?`hot-held food should be <b>${HOT} °C or above</b>`:`chilled food should be <b>${CHILL} °C or below</b>`;
const NOTES=['Safe: cold enough to slow bacterial growth.','Unsafe: above 5 °C. Report it to the supervisor, record it and follow the food safety plan; it will probably have to be thrown away.','Safe: hot enough to stop bacteria multiplying.','Unsafe: below 63 °C. Report it and follow the food safety plan, which decides whether it can be reheated thoroughly or must be discarded. Rice kept warm for too long is a known risk.','Safe: properly chilled.'];
function renderFs(msg,cls=''){
 if(!$('fsTask'))return;
 const fOk=fs.fridge<=CHILL,hOk=fs.hot>=HOT;
 $('fsFv').textContent=fs.fridge+' °C';$('fsHv').textContent=fs.hot+' °C';
 const fsS=$('fsFs');fsS.textContent=fOk?'✓ Chilled storage: safe':fs.fridge<=8?'⚠ Too warm: adjust it and log it':'✕ Unsafe: food at risk';fsS.style.color=fridgeColor(fs.fridge);
 const hsS=$('fsHs');hsS.textContent=hOk?(fs.hot>80?'✓ Safe, but food may dry out':'✓ Hot-holding: safe'):'✕ Too cool for hot-holding';hsS.style.color=hotColor(fs.hot);
 drawDisp(fridgeLT,'FRIDGE',fs.fridge+' °C',fridgeColor(fs.fridge));drawDisp(hotLT,'HOT-HOLD',fs.hot+' °C',hotColor(fs.hot));
 $('fsList').innerHTML=PROBES.map((p,i)=>{const pr=fs.probed[i],ok=fs.ok[i];
  return `<div class="ix-metric" style="display:block"><div style="display:flex;justify-content:space-between;gap:8px"><span>${p[0]} <small style="color:#93a0c8">(${p[1]==='hot'?'hot-hold':'chilled'})</small></span><strong style="color:${ok?(safeOf(p)?'#8DE8C3':'#ff9bb2'):'#bceeff'}">${pr?p[2].toFixed(1)+' °C':'– °C'}</strong></div>
   <div class="layers" style="margin-top:7px">${!pr?`<button data-probe="${i}">🌡 Probe it</button>`:ok?`<span style="font-size:11.5px;line-height:1.5;color:#c6ffeb">${NOTES[i]}</span>`:`<button data-cls="${i}" data-v="1">✓ Safe</button><button data-cls="${i}" data-v="0">✕ Unsafe</button>`}</div></div>`}).join('');
 $('fsList').querySelectorAll('[data-probe]').forEach(b=>b.onclick=()=>{fs.probed[+b.dataset.probe]=1;renderFs('Reading taken. Is it safe?')});
 $('fsList').querySelectorAll('[data-cls]').forEach(b=>b.onclick=()=>{const i=+b.dataset.cls,p=PROBES[i],said=b.dataset.v==='1';
  if(said===safeOf(p)){fs.ok[i]=1;renderFs(`✓ Correct: ${p[0].toLowerCase()} at ${p[2].toFixed(1)} °C is <b>${safeOf(p)?'safe':'unsafe'}</b>.`,'ok')}
  else{fs.mistakes++;renderFs(`Check again: ${ruleOf(p)}.`,'no')}});
 const n=Object.keys(fs.ok).length,done=fOk&&hOk&&n===PROBES.length;
 const t=$('fsTask');t.className='ix-task '+cls;
 t.innerHTML=(msg?msg+'<br>':'')+`<b>Before service:</b> set the fridge and hot-hold cabinet to safe temperatures, then probe and classify all ${PROBES.length} dishes. (${n}/${PROBES.length})<div class="bar"><div style="width:${(n+(fOk?1:0)+(hOk?1:0))/(PROBES.length+2)*100}%"></div></div>`;
 $('fsGo').disabled=!done;
}
function openPrep(ix){
 hanaTag.visible=false;
 ix.openPanel({hideAvatar:true,
  html:`<div class="k">Prep Lab · Food safety log</div><h3>Pre-service temperature checks</h3>
  <div class="ix-info"><b>Guidance used in this kitchen</b>Chilled food at <b style="display:inline;font-size:12px;color:#67DFF0">5 °C or below</b> · hot-held food at <b style="display:inline;font-size:12px;color:#FFD59C">63 °C or above</b>. Between these, bacteria can multiply quickly.</div>
  <div class="ix-range"><label>Reach-in fridge setting <strong id="fsFv"></strong></label><input type="range" id="fsF" min="0" max="12" step="1" value="${fs.fridge}" aria-label="Fridge temperature"></div>
  <div class="ix-metric"><span>Fridge check</span><strong id="fsFs"></strong></div>
  <div class="ix-range"><label>Hot-hold cabinet setting <strong id="fsHv"></strong></label><input type="range" id="fsH" min="50" max="85" step="1" value="${fs.hot}" aria-label="Hot-hold temperature"></div>
  <div class="ix-metric"><span>Hot-hold check</span><strong id="fsHs"></strong></div>
  <div class="k" style="margin-top:4px">Probe readings</div>
  <div id="fsList" style="display:grid;gap:6px"></div>
  <div class="ix-task" id="fsTask"></div>
  <button class="ix-primary" id="fsGo">Sign the safety log →</button>
  <div class="ix-note">Illustrative readings. 5 °C and 63 °C are commonly used in food safety guidance, but limits differ between countries. Always follow your local regulations and your kitchen’s food safety plan. Clean the probe between foods.</div>`,
  bind(){
   $('fsF').oninput=()=>{fs.fridge=+$('fsF').value;renderFs()};$('fsH').oninput=()=>{fs.hot=+$('fsH').value;renderFs()};renderFs();
   $('fsGo').onclick=()=>{if($('fsGo').disabled)return;score+=fs.mistakes===0?1:0;ix.closePanel();
    ix.question('Hana · Food safety lead','Log signed! One more: Theo has just trimmed <b>raw chicken</b> on a board. Now he needs to slice tomatoes for a salad that won’t be cooked. What should he do?',
     ['Use a separate, colour-coded board and clean knife (or fully clean and sanitise them) and wash his hands first','Wipe the board with a cloth and carry on','Rinse the knife under the tap and use the same board'],0,
     'Raw meat can carry bacteria such as <i>Salmonella</i> and <i>Campylobacter</i>. Food that won’t be cooked again has no “kill step”, so <b>separate</b> boards and utensils (often colour-coded), <b>handwashing</b> and proper <b>cleaning and sanitising</b> prevent cross-contamination. A quick wipe or rinse isn’t enough.',f=>{score+=f;ix.closeDialog();
      const g=ix.awardOnce('taste_safety',60);ix.advance(3);ix.toast('✓ Kitchen safe for service'+(g?` · +${g} XP`:''))})};},
  camera(p,l){const m=innerWidth<=760;p.set(12,m?3.1:2.45,m?-6.4:-8.1);l.set(12,m?.35:1.05,-12.2)},
  onClose(){hanaTag.visible=true}});
}
function talkPrep(ix){
 const H='Hana · Food safety lead';
 if(ix.objIdx<2){ix.dialog(H,'Hi! I’ll need you for the safety checks, but Theo needs the special prepped first.',[{label:'I’ll be back',fn:ix.closeDialog}]);return}
 if(ix.objIdx>2){ix.dialog(H,'Everything’s logged and safe. Enjoy service!',[{label:'Thanks, Hana',fn:ix.closeDialog}]);return}
 ix.dialog(H,`Hi ${ix.name}, I’m Hana. Before every service we check temperatures and write them in the <b>food safety log</b>. Someone left the fridge and hot-hold cabinet on the wrong settings, so let’s fix them and probe today’s dishes.`,[{label:'Let’s check →',fn:()=>{ix.closeDialog();openPrep(ix)}}]);
}

/* ------------------------------------------------------------------ dining room: allergy order + debrief */
function talkTable(ix){
 const S='Sam · Server',R='Chef Rosa · Head chef';
 if(ix.objIdx<3){ix.dialog(S,'Hi! Guests aren’t here yet. Help the kitchen get ready first, and I’ll shout when service starts.',[{label:'Sounds good',fn:ix.closeDialog}]);return}
 if(ix.objIdx>3){ix.dialog(S,'Table 4 loved their lunch. Thanks for keeping Ms. Noor safe!',[{label:'Teamwork!',fn:ix.closeDialog}]);return}
 ix.dialog(S,`${ix.name}, service has started! Ms. Noor at <b>Table 4</b> has a <b>nut allergy</b>. She’d like the roasted vegetable salad and asks: “Is it safe for me?”`,[{label:'Let’s get this right →',fn:q1}]);
 function q1(){ix.question('Table 4 · Step 1 of 2','What should happen before anyone answers her?',
  ['Check the recipe and ingredient records (including labels on bought-in products), tell the chef, and only confirm once you know for sure','Say it’s just vegetables, so it’s probably fine','Guess, and suggest she picks out anything that looks like a nut'],0,
  'Never guess with allergies. Check the <b>recipe and ingredient records</b>, including labels on bought-in sauces, and tell the <b>chef</b>. Here the records show the salad’s <b>romesco dressing contains almonds and hazelnuts</b>, so as written the dish is <b>not</b> safe for her.',f=>{score+=f;q2()})}
 function q2(){ix.question('Table 4 · Step 2 of 2','Chef Rosa offers to make the salad with a plain lemon and olive-oil dressing, which has no nuts in its ingredient records. How do you prevent <b>cross-contact</b> with nuts?',
  ['Clean surfaces, use clean utensils, bowls and boards, wash hands, flag the ticket “ALLERGY” and keep the plate separate until it reaches her','Use the same bowl as the romesco salad after a quick wipe','Finish it with toasted almonds so it looks the same as the menu photo'],0,
  'Even a tiny trace can cause a severe reaction. Clean equipment and surfaces, fresh utensils, handwashing, a clearly flagged ticket and carrying the plate straight to the guest all reduce cross-contact. If a kitchen can’t make a dish safely, the honest answer is to say so.',f=>{score+=f;debrief()})}
 function debrief(){ix.question(R,'Back at the pass, Chef Rosa calls the next tickets: “Table 4: two shakshuka, one salad, <b>nut allergy</b>! Table 7: four shakshuka! Away!” How should you respond?',
  ['Call back “Yes, chef!”, then time your dishes so every plate for a table is ready at the pass together','Stay quiet and cook whichever dish you feel like first','Send each plate out the moment it’s ready, even if the rest of the table is still waiting'],0,
  'Calling back (“Yes, chef!” or “Heard!”) tells the chef the order was received. Each station times its cooking so <b>all the plates for one table are ready together</b>, hot and at the same moment, and the pass checks every plate before it goes out. A kitchen brigade works because everyone communicates clearly.',f=>{score+=f;
   ix.dialog(R,`Service went brilliantly, ${ix.name}. You scaled a recipe, kept the food safe and protected a guest with an allergy. That’s what a real line cook does every day.`,[{label:'Finish my shift →',fn:()=>ix.finish({icon:'♨',title:'Taste District Line Cook',score,max:7,
    skills:['✕ Scaling a recipe with ratios','$ Costing a dish and food cost %','🌡 Checking safe food temperatures','⚑ Preventing cross-contamination','⚠ Handling an allergy order safely','✋ Calling orders and timing service as a team']})}])})}
}

/* ------------------------------------------------------------------ head chef */
function talkChef(ix){
 const R='Chef Rosa · Head chef';
 if(ix.objIdx===0){
  ix.dialog(R,`Welcome to <b>Saffron & Salt</b>, <b>${ix.name}</b>! I’m Rosa, the head chef. Lunch service starts soon. Today you’re a trainee line cook: prep the special with Theo in the <b>Kitchen</b>, run the safety checks with Hana in the <b>Prep Lab</b>, then help front-of-house during service. Everyone and every number here is fictional.`,[
   {label:'What does a line cook do?',fn:()=>ix.dialog(R,'Line cooks run one station during service, like grill, sauté or cold starters. It’s fast, precise teamwork: prep, timing, hygiene and lots of clear communication. Many head chefs started exactly there.',[{label:'Yes, chef! →',fn:start}])},
   {label:'Yes, chef! →',fn:start}]);return}
 if(ix.objIdx<3){ix.dialog(R,`Keep moving, ${ix.name}! Next: <b>${CFG.objectives[ix.objIdx][0].toLowerCase()}</b>.`,[{label:'Yes, chef',fn:ix.closeDialog}]);return}
 if(ix.objIdx===3){ix.dialog(R,'Service has started! Sam needs you at <b>Table 4</b> in the dining room, to the right of the entrance.',[{label:'On my way',fn:ix.closeDialog}]);return}
 ix.dialog(R,'Great shift. There’s always a place on my line for you.',[{label:'Thanks, chef',fn:ix.closeDialog}]);
 function start(){ix.closeDialog();ix.nova.visible=true;ix.advance(1);ix.toast('✓ Checked in. NOVA has joined you.')}
}
function walkinFact(ix){
 ix.dialog('NOVA · Bonus fact','Walk-in fridges run on <b>FIFO</b>: “first in, first out”. New deliveries go behind older stock, every container is labelled with what it is and its use-by date, and raw meat is stored <b>below</b> ready-to-eat food so nothing can drip onto it.',[{label:'Good to know!',fn:()=>{ix.closeDialog();const g=ix.awardOnce('taste_walkin',10);if(g)ix.toast(`✦ Bonus fact · +${g} XP`)}}]);
}

const CFG={id:'taste',title:'Taste District Kitchen',subtitle:'Trainee line cook shift',enterLabel:'♨ Enter the Taste District Kitchen: start a 3D shift →',badge:'Taste District Line Cook',
 objectives:[['Check in with Chef Rosa at the host stand',[0,5.7]],['Scale and cost the lunch special in the Kitchen',[-10.5,-9.3]],['Run the food safety checks in the Prep Lab',[12,-9.3]],['Handle Table 4’s allergy order and call it in',[4.6,10.4]],['Get your feedback and badge',null]],
 hints:['Welcome to <b>Saffron & Salt</b>! I’m <b>NOVA</b>, your learning guide. Check in with <b>Chef Rosa</b> at the host stand.',
  'Head up the corridor to the <b>Kitchen</b>, first door on the left. Theo needs the lunch special scaled up.',
  'Special costed! Cross the corridor to the <b>Prep & Pastry Lab</b>. Hana is running the safety checks.',
  'Service has started! Find <b>Sam</b> by <b>Table 4</b> in the dining room, on the right as you walk in.',
  'Shift complete. Open your <b>Career Passport</b> to see your new badge.'],
 build,
 interact(id,ix){const f={chef:talkChef,kitchen:talkKitchen,prep:talkPrep,table:talkTable,walkin:walkinFact}[id];if(f)f(ix)},
 frame(dt,t){holo.rotation.y+=dt*.7;
  for(const f of flames){const s=.85+Math.sin(t*19+f.userData.ph)*.12+Math.random()*.08;f.scale.set(1,s,1)}
  stoveLight.intensity=.55+Math.sin(t*13)*.06+Math.random()*.04;
  for(const s of steam){const k=(t*.35+s.userData.o)%1;s.position.y=1.55+k*.9;s.position.x=-14.4+Math.sin(t+s.userData.o*6)*.05;s.scale.setScalar(.6+k*1.4);s.material.opacity=.32*(1-k)}},
 reset(){score=0;kFirst=true;kit=null;resetFs()}
};
TI.register(CFG);
})();
