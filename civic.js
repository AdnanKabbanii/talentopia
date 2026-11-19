/* TALENTOPIA · Civic Square Justice & Learning Centre (district config for interior.js)
   Programme-coordinator check-in, a Courtroom evidence review for a small civil claim
   (sorting evidence by relevance and reliability, building an argument, burden of proof),
   a Classroom quiz review that genuinely computes the class average and % correct per
   question, a Counselling-corner conversation about active listening and the limits of
   confidentiality, and a fairness debrief. All people, cases and numbers are fictional;
   legal explanations are simplified and real rules vary between countries. */
(()=>{
'use strict';
const TI=window.TalentopiaInterior;if(!TI)return;
const $=id=>document.getElementById(id);
const LESSON=[6.2,-10.6],COUNSEL=[15.6,-8.8];
let holo,beamG,panL,panR,orb,flags=[],boardGlow,danielTag,parkTag,score=0,lessonDone=false,counselDone=false;

/* ------------------------------------------------------------------ classroom data (fictional) */
const QUESTIONS=['Simplify 6/8','1/2 + 1/4','25% of 80','2/3 ÷ 1/6','0.6 as a fraction'];
const CLASS=[['Ari',[1,1,1,0,1]],['Bea',[1,1,1,0,1]],['Cy',[1,0,1,0,1]],['Dev',[1,1,0,1,1]],['Eli',[0,1,1,0,0]],['Fay',[1,1,1,0,1]],['Gus',[1,0,1,0,1]],['Hana',[1,1,1,1,1]]];
const N=CLASS.length,NQ=QUESTIONS.length;
const TOTALS=CLASS.map(r=>r[1].reduce((a,b)=>a+b,0));
const TOTAL=TOTALS.reduce((a,b)=>a+b,0),AVG=TOTAL/N;
const QC=QUESTIONS.map((_,q)=>CLASS.reduce((a,r)=>a+r[1][q],0));
const HARD=QC.indexOf(Math.min(...QC));
const pctOf=c=>Math.round(c/N*100);

/* ------------------------------------------------------------------ building */
function canvasTex(w,h,draw){const cv=document.createElement('canvas');cv.width=w;cv.height=h;draw(cv.getContext('2d'),w,h);const t=new THREE.CanvasTexture(cv);t.encoding=THREE.sRGBEncoding;return t}
function scalesGlyph(x,cx,cy,s,col){x.strokeStyle=col;x.fillStyle=col;x.lineWidth=4*s;x.beginPath();x.moveTo(cx,cy-60*s);x.lineTo(cx,cy+50*s);x.moveTo(cx-55*s,cy-40*s);x.lineTo(cx+55*s,cy-40*s);x.moveTo(cx-30*s,cy+50*s);x.lineTo(cx+30*s,cy+50*s);
 for(const d of [-1,1]){x.moveTo(cx+d*55*s,cy-40*s);x.lineTo(cx+d*75*s,cy+5*s);x.moveTo(cx+d*55*s,cy-40*s);x.lineTo(cx+d*35*s,cy+5*s)}x.stroke();
 for(const d of [-1,1]){x.beginPath();x.arc(cx+d*55*s,cy+5*s,20*s,0,Math.PI);x.fill()}x.beginPath();x.arc(cx,cy-62*s,6*s,0,Math.PI*2);x.fill()}
function build(B){
 const {scene,C,M,glow,box,collider,hotspot,npc,person,textSprite,panelTexture,screen,shell,plant}=B;
 const wood=M(0x6b4a32,{roughness:.6}),woodDark=M(0x4a3224,{roughness:.55}),stone=M(0xefe9df,{roughness:.5}),brass=M(0xd9b46a,{metalness:.8,roughness:.3}),lilacGlow=glow(0xb894ff);
 shell({lobby:0xd9d1c2,corridor:0xcac1b2,left:0x6b4a34,leftOpts:{roughness:.7},right:0xc4c8da,rightOpts:{roughness:.65},wall:0xefe8dc,trim:C.violet});
 const seated=(o,x,z,ry)=>{const g=person(o),r=g.userData.rig;r.legL.rotation.x=r.legR.rotation.x=-1.45;r.armL.rotation.x=r.armR.rotation.x=-.55;g.position.set(x,-.4,z);g.rotation.y=ry;scene.add(g);return g};

 // ---------------- lobby: civic hall
 box(1.6,.012,8.2,M(0x5b45a0,{roughness:.9}),0,.006,9.3);box(1.75,.014,.06,glow(C.gold),0,.007,5.2);
 box(5,1.05,1.1,wood,0,.525,4);box(5.2,.07,1.25,stone,0,1.085,4);box(5,.05,.02,glow(C.violet),0,.85,4.56);collider(-2.6,3.4,2.6,4.6);
 box(.6,.36,.04,M(0x1b1f33),-1.4,1.3,3.75).rotation.x=-.2;screen(.56,.32,panelTexture('Visitor desk',['Courtroom → left','Classroom → right'],'#C9B8FF'),-1.4,1.3,3.72,0);
 const amara=npc(person({skin:0x7a4a2a,hair:0x1d1a1f,style:'bun',outfit:0xefe9ff,coat:0x5b3fa8,badge:true}));amara.position.set(0,0,2.9);scene.add(amara);collider(-.35,2.55,.35,3.25);
 const at=textSprite('Amara','#C9B8FF',.75,'Programme coordinator');at.position.set(0,2.35,2.9);scene.add(at);
 hotspot('coord',0,5.7,1.9,'Talk to Amara, the programme coordinator',[amara]);
 holo=new THREE.Group();const hr=new THREE.Mesh(new THREE.TorusGeometry(.42,.02,8,48),glow(C.cyan));holo.add(hr);
 const hc=new THREE.Mesh(new THREE.OctahedronGeometry(.22,0),new THREE.MeshBasicMaterial({color:0xb894ff,wireframe:true}));holo.add(hc);holo.position.set(0,3.05,4);scene.add(holo);
 const sign=textSprite('Civic Square','#C9B8FF',1.25,'Law · Psychology · Education');sign.position.set(0,3.4,.2);scene.add(sign);
 // columns along the side walls (clear of the walking path)
 for(const s of [-1,1])for(const z of [2.5,6.5,10.5]){const x=s*8.6;box(.95,.15,.95,stone,x,.075,z);
  const col=new THREE.Mesh(new THREE.CylinderGeometry(.34,.38,2.5,20),M(0xf3eee4,{roughness:.45}));col.position.set(x,1.4,z);scene.add(col);box(.95,.18,.95,stone,x,2.71,z);collider(x-.48,z-.48,x+.48,z+.48)}
 // scales-of-justice sculpture
 const sc=new THREE.Group();sc.position.set(-5.2,0,8.6);scene.add(sc);
 box(1,1,1,stone,0,.5,0,sc);box(1.1,.06,1.1,lilacGlow,0,1.02,0,sc);
 const stem=new THREE.Mesh(new THREE.CylinderGeometry(.045,.07,1.2,12),brass);stem.position.y=1.6;sc.add(stem);
 const fin=new THREE.Mesh(new THREE.SphereGeometry(.07,12,10),brass);fin.position.y=2.27;sc.add(fin);
 beamG=new THREE.Group();beamG.position.y=2.15;sc.add(beamG);box(1.2,.05,.05,brass,0,0,0,beamG);
 const pan=()=>{const g=new THREE.Group();const ch=new THREE.Mesh(new THREE.CylinderGeometry(.008,.008,.5,6),brass);ch.position.y=-.25;g.add(ch);const p=new THREE.Mesh(new THREE.CylinderGeometry(.24,.16,.05,20),brass);p.position.y=-.52;g.add(p);sc.add(g);return g};
 panL=pan();panR=pan();collider(-5.75,8.05,-4.65,9.15);
 const ring=new THREE.Mesh(new THREE.RingGeometry(.85,.92,48),glow(C.violet));ring.rotation.x=-Math.PI/2;ring.position.set(-5.2,.012,8.6);scene.add(ring);
 hotspot('scales',-3.8,7.4,1.5,'Look at the scales of justice',[sc]);
 // learning sculpture: open book with a floating idea orb
 const bk=new THREE.Group();bk.position.set(5.2,0,8.6);scene.add(bk);box(1,1,1,stone,0,.5,0,bk);box(1.1,.06,1.1,lilacGlow,0,1.02,0,bk);
 for(const d of [-1,1]){const pg=box(.42,.04,.56,M(0xfafbff),d*.21,1.12,0,bk);pg.rotation.z=d*.18}
 orb=new THREE.Mesh(new THREE.SphereGeometry(.13,16,12),M(C.gold,{emissive:C.gold,emissiveIntensity:1}));orb.position.y=1.6;bk.add(orb);collider(4.65,8.05,5.75,9.15);
 // notice boards
 screen(3,1.75,panelTexture('Public notices',['Practice hearing · 11:00','Public gallery open','Quiet please in session'],'#C9B8FF'),-9.83,1.8,4.5,Math.PI/2);
 box(.06,1.1,1.8,M(0xb98b5a,{roughness:1}),-9.82,1.65,8.5);box(.08,1.2,1.9,woodDark,-9.86,1.65,8.5);
 [[1.9,8,0xfafbff],[1.55,8.55,0xf7a9d8],[1.95,9.05,0xffd59c],[1.4,8.95,0x8de8c3],[1.45,7.95,0x67dff0]].forEach(([y,z,c])=>box(.02,.26,.32,M(c),-9.78,y,z));
 screen(3,1.75,panelTexture('Today at Civic Square',['09:30 · Mediation workshop','11:00 · Practice hearing','14:00 · Wellbeing drop-in'],'#67DFF0'),9.83,1.8,4.5,-Math.PI/2);
 screen(3,1.75,panelTexture('Careers here',['Lawyer · Court clerk','Psychologist · Counsellor','Teacher · Researcher'],'#8DE8C3'),9.83,1.8,8.5,-Math.PI/2);
 for(const s of [-1,1]){box(2.4,.42,.7,wood,s*5.4,.21,12.6);box(2.4,.08,.75,stone,s*5.4,.46,12.6);collider(s*5.4-1.2,12.25,s*5.4+1.2,12.95)}
 plant(-3.7,.9);plant(3.7,.9);plant(-9.2,13.1);plant(9.2,13.1);
 const lw=new THREE.PointLight(0xffe7c4,.45,14);lw.position.set(0,3,8);scene.add(lw);
 const sl=textSprite('← Courtroom','#C9B8FF',.95);sl.position.set(-2.2,3.25,-10);scene.add(sl);
 const sr=textSprite('Classroom & Counselling →','#8DE8C3',.95);sr.position.set(2.2,3.25,-10);scene.add(sr);

 // ---------------- courtroom (left room)
 box(14.6,1,.06,wood,-10.5,.5,-15.82);
 box(5,.45,2,woodDark,-10.5,.225,-14.8);box(4.4,1.1,1,wood,-10.5,1,-14.35);box(4.5,.06,1.1,woodDark,-10.5,1.58,-14.35);box(4.4,.04,.02,lilacGlow,-10.5,1.2,-13.84);
 box(.8,1.3,.15,M(0x3d2a6e,{roughness:.8}),-10.5,1.1,-15.45);collider(-13,-16,-8,-13.75);
 const em=new THREE.Mesh(new THREE.CircleGeometry(.5,40),new THREE.MeshBasicMaterial({transparent:true,map:canvasTex(256,256,(x)=>{x.fillStyle='#2a2160';x.beginPath();x.arc(128,128,124,0,Math.PI*2);x.fill();x.strokeStyle='#ffd59c';x.lineWidth=6;x.beginPath();x.arc(128,128,112,0,Math.PI*2);x.stroke();scalesGlyph(x,128,120,.9,'#ffd59c');x.fillStyle='#efe9ff';x.font='bold 18px system-ui,sans-serif';x.textAlign='center';x.fillText('CIVIC COURT',128,214)})}));
 em.position.set(-10.5,2.25,-15.77);scene.add(em);
 for(const [x,c] of [[-13.55,C.violet],[-7.45,0x2a2f6a]]){const pole=new THREE.Mesh(new THREE.CylinderGeometry(.03,.03,2.3,8),brass);pole.position.set(x,1.15,-15.4);scene.add(pole);
  const fn=new THREE.Mesh(new THREE.SphereGeometry(.06,10,8),brass);fn.position.set(x,2.33,-15.4);scene.add(fn);
  const fg=new THREE.Group();fg.position.set(x,1.85,-15.4);scene.add(fg);box(.6,.8,.02,M(c,{roughness:.9}),.32,0,0,fg);box(.6,.08,.025,M(C.gold),.32,0,0,fg);flags.push(fg);collider(x-.1,-15.5,x+.1,-15.3)}
 // clerk's desk with live transcript screen
 box(2.4,.8,.7,wood,-10.5,.4,-13.1);box(2.5,.05,.78,woodDark,-10.5,.82,-13.1);collider(-11.7,-13.45,-9.3,-12.75);
 const ts=screen(.7,.4,panelTexture('Live transcript',['[11:00] Hearing opens','[11:02] Claimant…'],'#67DFF0'),-10.5,1.06,-13.2,0);ts.rotation.x=-.25;
 // counsel tables
 for(const x of [-13,-8]){box(2.4,.06,.8,wood,x,.76,-11.4);box(2.3,.72,.06,woodDark,x,.37,-11.75);collider(x-1.2,-11.8,x+1.2,-11);
  box(.4,.03,.28,M(0x1b1f33),x-.5,.8,-11.45);box(.12,.2,.12,M(0xa9dcff,{transparent:true,opacity:.6}),x+.7,.89,-11.5);
  for(const d of [-.55,.55]){box(.46,.05,.46,M(0x3d2a6e),x+d,.46,-10.55);box(.46,.5,.05,M(0x3d2a6e),x+d,.72,-10.33);collider(x+d-.23,-10.8,x+d+.23,-10.3)}}
 const ct1=textSprite('Claimant','#C9B8FF',.55);ct1.position.set(-13,1.45,-11.4);scene.add(ct1);const ct2=textSprite('Respondent','#C9B8FF',.55);ct2.position.set(-8,1.45,-11.4);scene.add(ct2);
 // witness box
 box(1.3,.15,1.3,woodDark,-14.6,.075,-13.6);box(1.3,1,.08,wood,-14.6,.6,-12.98);box(.08,1,1.3,wood,-13.98,.6,-13.6);box(.08,1,1.3,wood,-15.22,.6,-13.6);
 const mic=new THREE.Mesh(new THREE.CylinderGeometry(.015,.015,.4,6),M(0x1b1f33));mic.position.set(-14.3,1.25,-13.05);scene.add(mic);collider(-15.25,-14.25,-13.95,-12.95);
 const wt=textSprite('Witness box','#C9B8FF',.5);wt.position.set(-14.6,1.75,-13.6);scene.add(wt);
 // jury benches
 for(const [x,y] of [[-17.3,.45],[-16.5,.3]]){box(.7,y,5,wood,x,y/2,-11);box(.08,.5,5,woodDark,x+.3,y+.25,-11)}
 box(.08,.9,5.2,wood,-15.9,.45,-11);box(.12,.05,5.3,lilacGlow,-15.9,.92,-11);collider(-17.9,-13.6,-15.85,-8.4);
 const jt=textSprite('Jury','#C9B8FF',.5);jt.position.set(-16.8,1.6,-11);scene.add(jt);
 // public gallery
 box(11.4,.9,.08,wood,-11.9,.45,-6.9);box(11.5,.06,.16,woodDark,-11.9,.92,-6.9);collider(-17.6,-7,-6.2,-6.8);
 for(const x of [-14.2,-9.4]){box(3.6,.42,.6,wood,x,.21,-5.4);box(3.6,.5,.1,woodDark,x,.62,-5.08);collider(x-1.8,-5.75,x+1.8,-5)}
 const gt=textSprite('Public gallery','#C9B8FF',.55);gt.position.set(-11.9,1.5,-6.9);scene.add(gt);
 // evidence display + hearing list
 screen(2.8,1.7,canvasTex(512,310,(x)=>{x.fillStyle='#0f1638';x.fillRect(0,0,512,310);x.strokeStyle='#C9B8FF';x.lineWidth=6;x.strokeRect(3,3,506,304);x.fillStyle='#C9B8FF';x.font='bold 30px system-ui,sans-serif';x.fillText('Evidence · CV-0412',24,48);
  const cards=[['Receipt','#C9B8FF'],['Return photos','#67DFF0'],['Checklist','#C9B8FF'],['Online review','#67DFF0'],['Hearsay','#C9B8FF'],['Undated photo','#67DFF0']];
  cards.forEach(([t,c],i)=>{const cx=24+(i%3)*162,cy=80+Math.floor(i/3)*108;x.fillStyle='#efe9ff';x.fillRect(cx,cy,148,90);x.fillStyle=c;x.fillRect(cx,cy,148,10);x.fillStyle='#1b1f33';x.font='bold 19px system-ui,sans-serif';x.fillText(t,cx+10,cy+50,130)});
  x.strokeStyle='#67DFF088';x.lineWidth=3;x.beginPath();x.moveTo(98,170);x.lineTo(260,188);x.lineTo(422,170);x.stroke()}),-5.6,1.65,-15.76,0);
 screen(2.4,1.4,panelTexture('Hearing list',['11:00 · CV-0412','Rivera v. Wheelhouse','Small civil claim'],'#FFD59C'),-3.17,1.7,-14,-Math.PI/2);
 const daniel=npc(person({skin:0xc98e66,hair:0x1d1a1f,style:'short',outfit:0xf2f4ff,coat:0x1b2147,tie:C.violet}));daniel.position.set(-8.2,0,-12.3);scene.add(daniel);collider(-8.55,-12.65,-7.85,-11.95);
 danielTag=textSprite('Daniel','#C9B8FF',.75,'Senior lawyer · Mentor');danielTag.position.set(-8.2,2.35,-12.3);scene.add(danielTag);
 hotspot('court',-10.5,-9.3,2,'Prepare the case with Daniel',[daniel]);
 const cl1=new THREE.PointLight(0xffe2b0,.55,11);cl1.position.set(-10.5,2.7,-12);scene.add(cl1);
 const cl2=new THREE.PointLight(0xb894ff,.35,9);cl2.position.set(-5.5,2.4,-13);scene.add(cl2);

 // ---------------- classroom (right room, x 3…13.4)
 box(4.3,2.35,.06,M(0x1b1f33),10.4,1.6,-15.88);
 screen(4.1,2.15,canvasTex(1024,540,(x)=>{x.fillStyle='#f6f4ff';x.fillRect(0,0,1024,540);x.fillStyle='#3d2a6e';x.font='bold 46px system-ui,sans-serif';x.fillText('Quiz results · Fractions & percentages',40,70);
  x.font='26px system-ui,sans-serif';x.fillStyle='#5b6080';x.fillText(`${N} students · ${NQ} questions · % correct per question`,40,112);
  QC.forEach((c,q)=>{const h=c/N*300,bx=90+q*180;x.fillStyle=q===HARD?'#f7a9d8':'#945cff';x.fillRect(bx,470-h,110,h);x.fillStyle='#1b1f33';x.font='bold 28px system-ui,sans-serif';x.fillText('Q'+(q+1),bx+30,510);x.fillText(pctOf(c)+'%',bx+22,460-h)});
  x.strokeStyle='#c3c6dc';x.lineWidth=2;x.beginPath();x.moveTo(60,470);x.lineTo(990,470);x.stroke()}),10.4,1.6,-15.84,0);
 boardGlow=box(4.3,.04,.12,glow(C.violet),10.4,.4,-15.82);
 // teacher desk + Ms. Park
 box(1.8,.07,.8,woodDark,6.2,.76,-13.4);box(1.7,.7,.7,wood,6.2,.36,-13.4);collider(5.25,-13.85,7.15,-12.95);
 const tab=box(.36,.02,.26,glow(C.cyan),6.5,.82,-13.35);tab.rotation.x=-.3;box(.3,.2,.04,M(0xfafbff),5.8,.88,-13.5);
 const park=npc(person({skin:0xf6d7c3,hair:0x1d1a1f,style:'long',outfit:0x2a7d74,pants:0x2a3358,badge:true}));park.position.set(6.2,0,-14.5);scene.add(park);collider(5.85,-14.85,6.55,-14.15);
 parkTag=textSprite('Ms. Park','#8DE8C3',.75,'Teacher');parkTag.position.set(6.2,2.35,-14.5);scene.add(parkTag);
 hotspot('lesson',LESSON[0],LESSON[1],2,'Help Ms. Park review the quiz',[park]);
 // student desks (rows face the smart board) with a few seated students
 const kids=[[0,{skin:0xa0663f,hair:0x1d1a1f,style:'bun',outfit:0xf7a9d8}],[2,{skin:0xf6d7c3,hair:0xe2c07a,style:'short',outfit:0x67a8f0}],[4,{skin:0xc98e66,hair:0x5a3b22,style:'long',outfit:0x8de8c3}]];
 let k=0;for(const z of [-13.3,-11.7])for(const x of [8.4,10.2,12]){
  box(1.1,.06,.6,M(0xe0c9a6,{roughness:.6}),x,.74,z);box(1,.7,.05,M(0x8f86c9),x,.36,z-.26);
  box(.45,.05,.45,M(0x5b5f9e),x,.45,z+.55);box(.45,.45,.05,M(0x5b5f9e),x,.7,z+.78);box(.06,.43,.06,M(0x9aa6c8),x,.22,z+.55);collider(x-.58,z-.32,x+.58,z+.8);
  const kid=kids.find(q=>q[0]===k);if(kid)seated({...kid[1],pants:0x2a3358},x,z+.6,Math.PI);
  box(.3,.01,.22,M(0xfafbff),x-.2,.775,z);k++}
 box(1.6,1.2,.4,wood,4.3,.6,-15.62);collider(3.5,-15.85,5.1,-15.4);
 [0xf7a9d8,0x67dff0,0xffd59c,0x8de8c3,0x945cff,0xfafbff].forEach((c,i)=>box(.18,.34,.28,M(c),3.75+i*.22,1.02,-15.6));
 screen(1.6,.95,panelTexture('Learning goal',['Divide fractions','with confidence'],'#8DE8C3'),4.3,2.05,-15.83,0);
 screen(2.4,1.4,panelTexture('Class timetable',['09:00 · Maths','10:30 · Science','13:00 · History'],'#67DFF0'),3.17,1.7,-14,Math.PI/2);
 plant(3.6,-4.6);plant(12.9,-4.6);
 const rl=new THREE.PointLight(0xf4f2ff,.5,12);rl.position.set(9,2.8,-11);scene.add(rl);

 // ---------------- partition + counselling corner (x 13.6…18)
 box(.15,1.1,6,wood,13.5,.55,-13);box(.08,1,6,M(0xefe9ff,{transparent:true,opacity:.35,roughness:.2}),13.5,1.6,-13);box(.14,.05,6.05,glow(C.blush),13.5,2.12,-13);collider(13.4,-16,13.6,-10);
 const cs=textSprite('Counselling corner','#F7A9D8',.8,'A quiet, private space');cs.position.set(15.8,2.7,-10.2);scene.add(cs);
 const rug=new THREE.Mesh(new THREE.CylinderGeometry(1.7,1.7,.02,40),M(0xc9a4c8,{roughness:1}));rug.position.set(15.8,.01,-12.6);scene.add(rug);
 const armchair=(x,z,dir,c)=>{const m=M(c,{roughness:.9});box(.85,.45,.85,m,x,.225,z);box(.2,.85,.85,m,x+dir*.42,.6,z);for(const d of [-1,1])box(.85,.6,.15,m,x,.3,z+d*.42);collider(x-.45,z-.45,x+.45,z+.45)};
 armchair(17,-12.6,1,0x7d6bc4);armchair(14.6,-12.6,-1,0x8de8c3);
 const tbl=new THREE.Mesh(new THREE.CylinderGeometry(.38,.38,.45,24),wood);tbl.position.set(15.8,.225,-12.6);scene.add(tbl);collider(15.4,-13,16.2,-12.2);
 box(.2,.12,.12,M(0xfafbff),15.7,.51,-12.55);const gl=new THREE.Mesh(new THREE.CylinderGeometry(.04,.04,.12,10),M(0xa9dcff,{transparent:true,opacity:.6}));gl.position.set(15.95,.51,-12.7);scene.add(gl);
 const jordan=seated({skin:0xe8b896,hair:0x5a3b22,style:'short',outfit:0x6b7bd6,pants:0x2a3358},16.95,-12.6,-Math.PI/2);
 const jt2=textSprite('Jordan','#F7A9D8',.7,'Student');jt2.position.set(16.95,2,-12.6);scene.add(jt2);
 hotspot('counsel',COUNSEL[0],COUNSEL[1],2.2,'Talk with Jordan in the counselling corner',[jordan]);
 const lamp=new THREE.Mesh(new THREE.CylinderGeometry(.02,.02,1.5,8),brass);lamp.position.set(17.5,.75,-11.4);scene.add(lamp);
 const shade=new THREE.Mesh(new THREE.CylinderGeometry(.16,.24,.25,16,1,true),M(C.gold,{emissive:C.gold,emissiveIntensity:.6,side:THREE.DoubleSide}));shade.position.set(17.5,1.55,-11.4);scene.add(shade);collider(17.3,-11.6,17.7,-11.2);
 const ll=new THREE.PointLight(0xffd59c,.6,6);ll.position.set(17.4,1.6,-11.6);scene.add(ll);
 box(.35,1,1.4,wood,17.65,.5,-14.8);[0xf7a9d8,0x8de8c3,0x67dff0].forEach((c,i)=>box(.02,.3,.22,M(c),17.47,1.15,-15.2+i*.35));collider(17.45,-15.5,17.85,-14.1);
 screen(3.2,1.8,panelTexture('Wellbeing',['Talk · Listen · Support','Drop-in: weekdays 12:00','Worried? Tell a trusted adult'],'#F7A9D8'),15.8,1.7,-15.83,0);
 plant(14.2,-15.3);
}

/* ------------------------------------------------------------------ courtroom: evidence board */
const EVID=[
 {t:'Deposit receipt',d:'Printed receipt: “$150 deposit · Bike #27 · 3 May · paid by S. Rivera”, stamped by the shop.',rel:1,cred:1,why:'Dated, specific and issued by the shop itself: it proves the deposit was paid.'},
 {t:'Return photos',d:'Three phone photos of Bike #27 outside the shop. The file data shows 3 May, 17:42, the time of return.',rel:1,cred:1,why:'Timestamped photos of the right bike at the moment of return are strong evidence of its condition.'},
 {t:'Shop return checklist',d:'The shop’s own return form for Bike #27, signed by a staff member: “No visible damage.”',rel:1,cred:1,why:'A record made at the time by the other side is reliable and goes straight to the dispute.'},
 {t:'Anonymous online review',d:'“This shop ALWAYS steals deposits!!” posted by “bikefan99”.',rel:0,cred:0,why:'Anonymous and unverifiable, and it isn’t about this rental at all.'},
 {t:'Second-hand story',d:'Sam’s friend says: “My cousin heard a mechanic there say they keep deposits on purpose.”',rel:1,cred:0,why:'It touches on the dispute, but it’s hearsay: a story passed through several people that nobody can check.'},
 {t:'Photo of a bent wheel',d:'The shop’s photo of a bent wheel. No date, no bike number, no way to tell which bike it shows.',rel:1,cred:0,why:'It’s about damage, so it’s relevant, but nothing links it to Sam’s bike or the return date.'},
 {t:'Cycling certificate',d:'A genuine certificate showing Sam passed a cycling-safety course at age 10.',rel:0,cred:1,why:'Real and checkable, but riding skill years ago says nothing about the bike’s condition on 3 May.'}];
const strong=e=>e.rel===1&&e.cred===1;
let ev;
function resetCourt(){ev={phase:'sort',ans:EVID.map(()=>({rel:null,cred:null})),res:EVID.map(()=>null),tries:0,sel:new Set(),argFirst:true,sorted:false}}
function renderCourt(ix,msg,cls=''){
 const list=$('cvList');if(!list)return;
 const tog=(i,ax,label)=>{const a=ev.ans[i][ax];return `<div class="layers" style="margin-top:6px;align-items:center"><span style="font-size:11px;color:#aab6da;min-width:66px">${label}</span><button data-i="${i}" data-ax="${ax}" data-v="1" class="${a===1?'on':''}">Yes</button><button data-i="${i}" data-ax="${ax}" data-v="0" class="${a===0?'on':''}">No</button></div>`};
 list.innerHTML=EVID.map((e,i)=>{const r=ev.res[i],sel=ev.sel.has(i);
  const border=ev.phase==='sort'?(r===true?'#8DE8C3':r===false?'#ff9bb2':'#ffffff21'):(sel?'#945CFF':'#ffffff21');
  let foot='';
  if(ev.phase==='sort'){foot=tog(i,'rel','Relevant?')+tog(i,'cred','Reliable?');
   if(r===true)foot+=`<div style="margin-top:6px;color:#8DE8C3">✓ ${e.why}</div>`;else if(r===false)foot+=`<div style="margin-top:6px;color:#ff9bb2">${ev.tries>=2?'Hint: '+e.why:'Look at this one again.'}</div>`}
  else foot=`<div style="margin-top:5px;font-size:11px;font-weight:700;color:${strong(e)?'#8DE8C3':'#ff9bb2'}">${strong(e)?'Strong: relevant and reliable':!e.rel?'Weak: not relevant':'Weak: unreliable'}</div>`;
  return `<div data-card="${i}" style="border:1px solid ${border};background:${sel?'#945CFF26':'#101a38'};border-radius:12px;padding:10px 11px;font-size:12px;line-height:1.5;${ev.phase==='argue'?'cursor:pointer':''}">
   <div style="font-weight:800;color:#FAFBFF;font-size:12.5px">${ev.phase!=='sort'?(sel?'☑ ':'☐ '):''}${e.t}</div><div style="color:#c3cdee">${e.d}</div>${foot}</div>`}).join('');
 list.querySelectorAll('[data-ax]').forEach(b=>b.onclick=e=>{e.stopPropagation();if(ev.phase!=='sort')return;const i=+b.dataset.i;ev.ans[i][b.dataset.ax]=+b.dataset.v;ev.res[i]=null;renderCourt(ix)});
 list.querySelectorAll('[data-card]').forEach(c=>c.onclick=()=>{if(ev.phase!=='argue')return;const i=+c.dataset.card;if(ev.sel.has(i))ev.sel.delete(i);else ev.sel.add(i);renderCourt(ix,`${ev.sel.size} piece${ev.sel.size===1?'':'s'} of evidence selected.`)});
 const answered=ev.ans.filter(a=>a.rel!==null&&a.cred!==null).length;
 const steps={sort:`<b>Step 1 of 2 · Sort the evidence.</b> For each item, decide: is it <b>relevant</b> (does it help answer what happened to this deposit and this bike?) and is it <b>reliable</b> (can it be checked and trusted)? (${answered}/${EVID.length} sorted)<div class="bar"><div style="width:${answered/EVID.length*100}%"></div></div>`,
  argue:'<b>Step 2 of 2 · Build the argument.</b> Tap the <b>2 or 3</b> pieces that best prove Sam’s claim: that the $150 deposit was paid <i>and</i> the bike came back undamaged.',
  done:'<b>✓ Argument ready.</b> Strong evidence, clearly linked to each part of the claim.'};
 const t=$('cvTask');t.className='ix-task '+cls;t.innerHTML=(msg?msg+'<br>':'')+`<span style="opacity:.9">${steps[ev.phase]}</span>`;
 const go=$('cvGo');go.textContent=ev.phase==='sort'?'Check my sorting':'Present this argument';go.style.display=ev.phase==='done'?'none':'block';
}
function checkSort(ix){
 const left=ev.ans.filter(a=>a.rel===null||a.cred===null).length;
 if(left){renderCourt(ix,`Answer both questions for every item first (${left} left).`,'no');return}
 ev.tries++;let right=0;
 ev.res=EVID.map((e,i)=>{const a=ev.ans[i];right+=(a.rel===e.rel)+(a.cred===e.cred);return a.rel===e.rel&&a.cred===e.cred});
 const max=EVID.length*2;
 if(right===max){score+=ev.tries===1?1:0;ev.sorted=true;ev.phase='argue';renderCourt(ix,`✓ All ${max} decisions correct. Three items are strong; the rest are weak or beside the point.`,'ok')}
 else renderCourt(ix,`${right} of ${max} decisions right. Items marked in pink need another look.`,'no');
}
function checkArgument(ix){
 const sel=[...ev.sel].map(i=>EVID[i]);
 if(sel.length<2||sel.length>3){ev.argFirst=false;renderCourt(ix,'Choose <b>2 or 3</b> pieces. A focused argument is more convincing than a pile of everything.','no');return}
 const weak=sel.filter(e=>!strong(e));
 if(weak.length){ev.argFirst=false;renderCourt(ix,`<b>${weak.map(e=>e.t).join(', ')}</b> ${weak.length>1?'are':'is'} weak. A judge could dismiss ${weak.length>1?'them':'it'}, and that undermines the whole argument.`,'no');return}
 const paid=ev.sel.has(0),cond=ev.sel.has(1)||ev.sel.has(2);
 if(!cond){ev.argFirst=false;renderCourt(ix,'This proves the deposit was paid, but not that the bike came back undamaged, which is the heart of the dispute.','no');return}
 if(!paid){ev.argFirst=false;renderCourt(ix,'This shows the bike was fine, but what proves Sam actually paid a $150 deposit?','no');return}
 score+=ev.argFirst?1:0;ev.phase='done';renderCourt(ix,'','ok');
 setTimeout(()=>{ix.closePanel();burden(ix)},1300);
}
function openCourt(ix){
 danielTag.visible=false;
 ix.openPanel({hideAvatar:true,
  html:`<div class="k">Courtroom · Practice case CV-0412</div><h3>Rivera v. Wheelhouse Bike Hire</h3>
   <div class="ix-info"><b>The claim</b>Sam Rivera rented Bike #27 for a day and paid a <b style="display:inline;font-size:12px;color:#FFD59C">$150 deposit</b>. The shop kept the deposit, saying the bike came back with a bent wheel. Sam says it was returned undamaged and wants the deposit back.</div>
   <div class="ix-task" id="cvTask"></div>
   <div id="cvList" style="display:grid;gap:8px"></div>
   <button class="ix-primary" id="cvGo" style="margin-top:2px">Check my sorting</button>
   <div class="ix-note">A fictional, simplified practice case. Real courts and rules of evidence differ from country to country.</div>`,
  bind(){renderCourt(ix);$('cvGo').onclick=()=>{if(ev.phase==='sort')checkSort(ix);else if(ev.phase==='argue')checkArgument(ix)}},
  camera(p,l){const m=innerWidth<=760;p.set(-9.6,m?3.4:2.6,m?-6.4:-8.4);l.set(-9.6,m?.4:1.1,-13.2)},
  onClose(){danielTag.visible=true}});
}
function burden(ix){
 const D='Daniel · Senior lawyer';
 ix.question(D,'Strong argument. One last thing before the hearing: Sam is the one bringing this <b>civil</b> claim. Who has to prove it, and how strongly?',
  ['Sam, as the person making the claim, must show it is more likely true than not (the “balance of probabilities”)','The bike shop must prove beyond any doubt that it did nothing wrong','Nobody has to prove anything: the judge picks whoever seems more likeable'],0,
  '<b>Simplified explanation:</b> generally, the person who makes a claim carries the <b>burden of proof</b>. In many civil cases the standard is the <b>balance of probabilities</b>: more likely than not. Criminal cases usually need a much higher standard. Exact rules and terms vary between countries, so real lawyers always check the law that applies.',f=>{score+=f;
   ix.dialog(D,`Well prepared, ${ix.name}. Lawyers spend far more time sorting and testing evidence than giving speeches. Next, Ms. Park in the Classroom across the corridor could use a hand.`,[{label:'On my way →',fn:()=>{ix.closeDialog();const g=ix.awardOnce('civic_court',60);ix.advance(2);ix.toast('✓ Case prepared'+(g?` · +${g} XP`:''))}}])});
}
function talkCourt(ix){
 const D='Daniel · Senior lawyer';
 if(ix.objIdx<1){ix.dialog(D,'Hello! We’re preparing for a practice hearing. Please check in with Amara at the information desk first.',[{label:'Will do',fn:ix.closeDialog}]);return}
 if(ix.objIdx>1){ix.dialog(D,'The case file is ready for the hearing. Thanks for your careful work!',[{label:'Good luck, Daniel',fn:ix.closeDialog}]);return}
 ix.dialog(D,`Hi ${ix.name}, I’m Daniel. Today you’re my trainee. We’re helping <b>Sam Rivera</b> with a small claim: a bike-hire shop kept Sam’s <b>$150 deposit</b>. Before we argue anything, we need to know which evidence actually holds up.`,
  [{label:'Show me the evidence →',fn:()=>{ix.closeDialog();openCourt(ix)}}]);
}

/* ------------------------------------------------------------------ classroom: quiz data */
let cls;
function resetLesson(){cls={step:'avg',avgTries:0,hardFirst:true,respFirst:true,wrong:new Set()}}
const RESP=[['Move on to the next topic: the class average is above half marks',false,'The average hides the problem: three-quarters of the class missed Q4.'],
 ['Re-teach dividing fractions with a different example or a visual model, then check understanding with a quick exit question',true,''],
 ['Repeat exactly the same explanation, but faster',false,'If the first explanation didn’t work for most students, repeating it faster rarely helps.'],
 ['Ask the two students who got it right to explain it, then move on without checking',false,'Peer explanation can help, but without checking understanding you won’t know if it worked.']];
function renderLesson(ix,msg,kind=''){
 const tb=$('clTable');if(!tb)return;const showPct=cls.step!=='avg'&&cls.step!=='hard';
 const th='padding:5px 3px;border-bottom:1px solid #ffffff2a;color:#c9b8ff;font-size:11px';
 tb.innerHTML=`<tr><th style="${th};text-align:left">Student</th>${QUESTIONS.map((_,q)=>`<th style="${th}">${cls.step==='hard'?`<button data-q="${q}" style="border:1px solid #945CFF;background:#945CFF33;color:#fff;border-radius:8px;padding:3px 7px;font-size:11px;font-weight:800">Q${q+1}</button>`:'Q'+(q+1)}</th>`).join('')}<th style="${th}">Total</th></tr>`+
  CLASS.map((r,i)=>`<tr><td style="padding:4px 3px;text-align:left;color:#e2e8ff">${r[0]}</td>${r[1].map((v,q)=>`<td style="padding:4px 3px;color:${v?'#8DE8C3':'#ff9bb2'};${showPct&&q===HARD?'background:#f7a9d822':''}">${v?'✓':'✕'}</td>`).join('')}<td style="padding:4px 3px;font-weight:800;color:#FAFBFF">${TOTALS[i]}</td></tr>`).join('')+
  (showPct?`<tr><td style="padding:5px 3px;text-align:left;color:#c9b8ff;font-size:10.5px;border-top:1px solid #ffffff2a">% correct</td>${QC.map((c,q)=>`<td style="padding:5px 3px;border-top:1px solid #ffffff2a;font-weight:800;color:${q===HARD?'#ff9bb2':'#bceeff'}">${pctOf(c)}%</td>`).join('')}<td style="border-top:1px solid #ffffff2a"></td></tr>`:'');
 tb.querySelectorAll('[data-q]').forEach(b=>b.onclick=()=>{const q=+b.dataset.q;
  if(q===HARD){score+=cls.hardFirst?1:0;cls.step='resp';renderLesson(ix,`✓ Q${q+1} (${QUESTIONS[q]}): only <b>${QC[q]} of ${N}</b> correct = <b>${pctOf(QC[q])}%</b>. Every other question was ${pctOf(Math.min(...QC.filter((_,j)=>j!==HARD)))}% or higher.`,'ok')}
  else{cls.hardFirst=false;renderLesson(ix,`Q${q+1}: ${QC[q]} of ${N} correct (${pctOf(QC[q])}%). Another question has fewer ✓.`,'no')}});
 const steps={avg:'<b>Step 1 of 3 · Class average.</b> Add up every student’s total, then divide by the number of students. Give the average score out of 5, rounded to 2 decimal places.',
  hard:'<b>Step 2 of 3 · Spot the gap.</b> Which question did most students get wrong? Count the ✓ in each column, then tap that question’s heading.',
  resp:`<b>Step 3 of 3 · Plan the next lesson.</b> The average looks fine, but Q${HARD+1} tells a different story. What should Ms. Park do next?`,
  done:'<b>✓ Lesson planned.</b> Data showed where learning broke down, and the plan checks whether the re-teach works.'};
 const t=$('clTask');t.className='ix-task '+kind;t.innerHTML=(msg?msg+'<br>':'')+`<span style="opacity:.9">${steps[cls.step]}</span>`;
 const st=$('clStep');
 if(cls.step==='avg'){st.innerHTML=`<div style="display:flex;gap:8px"><input id="clAvg" type="number" inputmode="decimal" step="0.01" min="0" max="5" placeholder="e.g. 3.25" aria-label="Class average out of 5" style="flex:1;min-width:0;background:#ffffff0b;border:1px solid #d7dcff26;border-radius:11px;color:#fff;padding:10px 12px;font-size:13px"><button class="ix-primary" id="clAvgGo" style="width:auto;margin:0;padding:10px 16px">Check</button></div>`;
  const go=()=>checkAvg(ix);$('clAvgGo').onclick=go;$('clAvg').onkeydown=e=>{if(e.key==='Enter')go()}}
 else if(cls.step==='resp'){st.innerHTML=`<div style="display:grid;gap:6px">${RESP.map((r,i)=>`<button data-r="${i}" class="ix-secondary" ${cls.wrong.has(i)?'disabled':''} style="margin:0;text-align:left;font-weight:650;line-height:1.4;font-size:12px;${cls.wrong.has(i)?'opacity:.45;border-color:#ff9bb2':''}">${r[0]}</button>`).join('')}</div>`;
  st.querySelectorAll('[data-r]').forEach(b=>b.onclick=()=>{const r=RESP[+b.dataset.r];
   if(!r[1]){cls.respFirst=false;cls.wrong.add(+b.dataset.r);renderLesson(ix,r[2],'no');return}
   score+=cls.respFirst?1:0;cls.step='done';lessonDone=true;CFG.objectives[2][1]=COUNSEL;renderLesson(ix,'✓ <b>Re-teach differently, then check.</b> A new example or visual gives students another way in, and a quick exit question shows whether it worked.','ok');
   setTimeout(()=>{ix.closePanel();afterLesson(ix)},1500)})}
 else st.innerHTML='';
}
function checkAvg(ix){
 const raw=($('clAvg').value||'').replace(',','.'),v=parseFloat(raw);
 if(isNaN(v)){renderLesson(ix,'Type a number first, for example 3.25.','no');return}
 if(Math.abs(v-AVG)<=.03){score+=cls.avgTries===0?1:0;cls.step='hard';
  renderLesson(ix,`✓ ${TOTALS.join(' + ')} = <b>${TOTAL}</b> marks. ${TOTAL} ÷ ${N} students = <b>${AVG.toFixed(3)}</b> ≈ <b>${AVG.toFixed(2)} out of ${NQ}</b> (${Math.round(AVG/NQ*1000)/10}%).`,'ok');return}
 cls.avgTries++;let h;
 if(Math.abs(v-TOTAL)<.01)h=`${TOTAL} is the total number of marks. Now divide it by the ${N} students.`;
 else if(Math.abs(v-AVG/NQ*100)<1)h='That’s a percentage. Give the average as a score out of 5.';
 else if(cls.avgTries>=2)h=`Working: ${TOTALS.join(' + ')} = ${TOTAL}. Now divide by ${N}.`;
 else h='Not quite. Add up the Total column, then divide by the number of students.';
 renderLesson(ix,h,'no');
}
function openLesson(ix){
 parkTag.visible=false;
 ix.openPanel({hideAvatar:true,
  html:`<div class="k">Classroom · Quiz review</div><h3>What did the class learn?</h3>
   <div class="ix-info"><b>Fractions & percentages quiz</b>${N} students · ${NQ} questions · 1 mark each (✓ correct, ✕ wrong).<br><span style="color:#aab6da;font-size:11px">${QUESTIONS.map((q,i)=>`Q${i+1} ${q}`).join(' · ')}</span></div>
   <div style="overflow:auto"><table id="clTable" style="width:100%;border-collapse:collapse;font-size:12px;text-align:center"></table></div>
   <div class="ix-task" id="clTask"></div>
   <div id="clStep"></div>
   <div class="ix-note">A fictional class and results. Teachers use quick data like this to decide what to re-teach.</div>`,
  bind(){renderLesson(ix)},
  camera(p,l){const m=innerWidth<=760;p.set(8.6,m?3.6:2.6,m?-7.2:-9.2);l.set(8.6,m?.4:1.2,-14.3)},
  onClose(){parkTag.visible=true}});
}
function afterLesson(ix){
 const g=ix.awardOnce('civic_lesson',50);ix.toast('✓ Lesson planned'+(g?` · +${g} XP`:''));
 ix.dialog('Ms. Park · Teacher',`Thank you, ${ix.name}! Tomorrow I’ll re-teach Q${HARD+1} with fraction strips, then finish with a one-question exit ticket. By the way, <b>Jordan</b> from my class is in the counselling corner and looks really stressed. Could you go and listen?`,
  [{label:'I’ll go and listen →',fn:()=>{ix.say('Lesson planned! Step around the partition to the <b>counselling corner</b>. Jordan would like to talk.');ix.closeDialog()}}]);
}
function talkLesson(ix){
 const P='Ms. Park · Teacher';
 if(ix.objIdx<2){ix.dialog(P,'Hello! I’m Ms. Park. I’ll need a hand with my quiz results later, once you’ve finished in the Courtroom.',[{label:'See you soon',fn:ix.closeDialog}]);return}
 if(ix.objIdx>2||lessonDone){ix.dialog(P,lessonDone&&ix.objIdx===2?'Thanks again! Jordan is waiting in the counselling corner, just past the partition.':'My re-teach plan is ready. Thanks for your help!',[{label:'Okay',fn:ix.closeDialog}]);return}
 ix.dialog(P,`Hi ${ix.name}! My class just took a short <b>fractions and percentages</b> quiz. Before I plan tomorrow’s lesson, I want to know what the results are really telling me. Can you help me read the data?`,
  [{label:'Let’s look at the results →',fn:()=>{ix.closeDialog();openLesson(ix)}}]);
}

/* ------------------------------------------------------------------ counselling corner */
function talkCounsel(ix){
 const J='Jordan · Student';
 if(ix.objIdx<2){ix.dialog(J,'Oh, hi. I’m just waiting to see someone. Don’t worry about me.',[{label:'Okay, take care',fn:ix.closeDialog}]);return}
 if(ix.objIdx>2||counselDone){ix.dialog(J,'Thanks for listening earlier. I’ve booked a time to see Ms. Rao, the school counsellor.',[{label:'I’m glad, Jordan',fn:ix.closeDialog}]);return}
 if(!lessonDone){ix.dialog(J,'Hi… I think Ms. Park needs help with her class first. I’ll still be here.',[{label:'I’ll come back',fn:ix.closeDialog}]);return}
 ix.dialog('Counselling corner',`You sit down opposite Jordan, a student in Ms. Park’s class. You’re a trainee peer supporter today, supervised by <b>Ms. Rao</b>, the school counsellor and safeguarding lead. Your job is to <b>listen</b>, not to fix everything.`,[{label:'Listen to Jordan →',fn:q1}]);
 function q1(){ix.question(J,'“I’ve got four exams in two weeks and I can’t sleep. Everyone else seems fine. I just feel like I’m drowning.”',
  ['“That sounds really heavy. Can you tell me more about what’s been hardest?”','“Everyone gets stressed. Just try to calm down.”','“Here’s what you need to do: make a timetable tonight and you’ll be fine.”'],0,
  '<b>Active listening</b> starts with acknowledging the feeling and asking an open question. Telling someone to calm down dismisses them, and jumping straight to solutions can feel like you’re not really listening.',f=>{score+=f;q2()})}
 function q2(){ix.question(J,'“It’s not just the work. My family expects top grades, and if I mess up I’ll let everyone down.”',
  ['“So it’s not only the workload: you’re worried about letting your family down. Have I got that right?”','“My exams were way worse than yours, honestly.”','“Don’t worry, you’ll definitely get top grades.”'],0,
  '<b>Reflecting back</b> what you heard shows empathy and lets Jordan correct you. Making it about yourself or promising results you can’t know are well meant, but they shut the conversation down.',f=>{score+=f;q3()})}
 function q3(){ix.question(J,'“Can you promise you won’t tell anyone what I say?”',
  ['“What you share stays private, with one exception: if I’m worried you or someone else might be at risk of harm, I’d need to involve a trained adult like Ms. Rao, our safeguarding lead. I’d tell you first.”','“I promise I’ll never tell anyone, no matter what.”','“I’ll need to tell your whole class so they can support you.”'],0,
  '<b>Confidentiality</b> is respected, but it has limits. If someone may be at risk of harm, you must involve a trained professional or the safeguarding lead. Being honest about this up front builds trust. Never promise total secrecy.',f=>{score+=f;
   ix.dialog(J,'“Thanks. It actually helps to say it out loud. Maybe I’ll talk to Ms. Rao about a study plan… and about the sleep thing.”',[{label:'That sounds like a good step →',fn:()=>
    ix.dialog('NOVA · A gentle note','You showed <b>empathy</b>, <b>active listening</b> and an honest approach to <b>confidentiality</b>. In real life, friends, mentors and teachers can listen, but proper support for wellbeing comes from <b>trained professionals</b> such as school counsellors and psychologists. If you or a friend are ever struggling, talk to a trusted adult.',
     [{label:'Understood',fn:()=>{counselDone=true;ix.closeDialog();const g=ix.awardOnce('civic_counsel',50);ix.advance(3);ix.toast('✓ Listening session complete'+(g?` · +${g} XP`:''))}}])}])})}
}

/* ------------------------------------------------------------------ coordinator */
function talkCoord(ix){
 const A='Amara · Programme coordinator';
 if(ix.objIdx===0){
  ix.dialog(A,`Welcome to Civic Square, <b>${ix.name}</b>! I’m Amara, the programme coordinator. Today you’ll shadow three professions that all depend on <b>fair, evidence-based reasoning</b>: law, education and psychology. Every person and case here is fictional.`,[
   {label:'What jobs are in Civic Square?',fn:()=>ix.dialog(A,'Lawyers, court clerks, paralegals and judges work in the courtroom. Teachers, teaching assistants and education researchers work in classrooms. Psychologists and school counsellors support wellbeing. Different jobs, same core skill: weighing information fairly.',[{label:'Let’s start →',fn:start}])},
   {label:'I’m ready →',fn:start}]);return}
 if(ix.objIdx<3){ix.dialog(A,`Keep going, ${ix.name}! Next: <b>${CFG.objectives[ix.objIdx][0].toLowerCase()}</b>.`,[{label:'On it',fn:ix.closeDialog}]);return}
 if(ix.objIdx>3){ix.dialog(A,'Wonderful work today. Civic Square’s doors are always open.',[{label:'Thanks, Amara',fn:ix.closeDialog}]);return}
 ix.dialog(A,`Welcome back! Here’s your shift so far:<div class="vitals"><div>Evidence<b>${EVID.length} sorted</b></div><div>Class average<b>${AVG.toFixed(2)}/${NQ}</b></div><div>Hardest<b>Q${HARD+1} · ${pctOf(QC[HARD])}%</b></div><div>Listening<b>✓</b></div></div>`,[{label:'Start my debrief',fn:()=>
  ix.question('Debrief · Fair reasoning','Amara: “In the courtroom, the classroom and the counselling corner, what did good reasoning have in common?”',
   ['Basing decisions on reliable evidence, hearing every side fairly, and involving trained experts when something goes beyond your role','Trusting your first impression, because it’s usually right','Going with whoever sounds most confident'],0,
   'Lawyers weigh <b>evidence</b>, teachers use <b>data</b> about learning, and psychologists and counsellors <b>listen</b> before acting and know the <b>limits</b> of their role. Fairness means checking facts, considering every side and getting expert help when it’s needed.',f=>{score+=f;
    ix.dialog(A,`You sorted evidence, read a class’s data and supported a student with care. That’s fair reasoning in action, ${ix.name}!`,[{label:'Finish my shift →',fn:()=>ix.finish({icon:'⚖',title:'Civic Square Fair Reasoner',score,max:10,
     skills:['⚖ Sorting evidence by relevance and reliability','§ Building an evidence-based argument','◎ Burden of proof (simplified)','∑ Calculating a class average and % correct','✎ Planning a re-teach from data','♡ Active listening and the limits of confidentiality']})}])})}]);
 function start(){ix.closeDialog();ix.nova.visible=true;ix.advance(1);ix.toast('✓ Checked in. NOVA has joined you.')}
}
function scalesFact(ix){
 ix.dialog('NOVA · Bonus fact','The <b>scales</b> stand for weighing the evidence on each side. Many statues of justice also wear a <b>blindfold</b>: a reminder that decisions should depend on the facts, not on who someone is. It’s an ideal that courts, schools and counsellors all try to live up to.',[{label:'Interesting!',fn:()=>{ix.closeDialog();const g=ix.awardOnce('civic_scales',10);if(g)ix.toast(`✦ Bonus fact · +${g} XP`)}}]);
}

const CFG={id:'civic',title:'Civic Square Justice & Learning Centre',subtitle:'Law, education & psychology shift',enterLabel:'⚖ Enter Civic Square: start a 3D shift →',badge:'Civic Square Fair Reasoner',
 objectives:[['Check in with Amara, the programme coordinator',[0,5.7]],['Prepare the evidence in the Courtroom',[-10.5,-9.3]],['Help in the Classroom, then listen in the Counselling corner',LESSON],['Debrief with Amara',[0,5.7]],['Get your feedback and badge',null]],
 hints:['Welcome to <b>Civic Square</b>! I’m <b>NOVA</b>, your learning guide. Check in with <b>Amara</b>, the programme coordinator, at the information desk.',
  'Head up the corridor to the <b>Courtroom</b>, first door on the left. Daniel needs help preparing a case.',
  'Case prepared! Cross to the <b>Classroom</b> on the right, where Ms. Park needs help reading her quiz results. Then visit Jordan in the <b>counselling corner</b>.',
  'Well done! Walk back to <b>Amara</b> at the information desk for your debrief.',
  'Shift complete. Open your <b>Career Passport</b> to see your new badge.'],
 build,
 interact(id,ix){const f={coord:talkCoord,court:talkCourt,lesson:talkLesson,counsel:talkCounsel,scales:scalesFact}[id];if(f)f(ix)},
 frame(dt,t){holo.rotation.y+=dt*.6;holo.children[1].rotation.x+=dt*.4;
  const a=Math.sin(t*.7)*.12;beamG.rotation.z=a;const ca=Math.cos(a)*.6,sa=Math.sin(a)*.6;panR.position.set(ca,2.15+sa,0);panL.position.set(-ca,2.15-sa,0);
  orb.position.y=1.6+Math.sin(t*1.8)*.08;orb.material.emissiveIntensity=.8+Math.sin(t*2.4)*.3;
  flags.forEach((f,i)=>{f.rotation.y=Math.sin(t*.9+i*1.7)*.12});boardGlow.material.emissiveIntensity=.6+Math.sin(t*1.5)*.25},
 reset(){score=0;lessonDone=false;counselDone=false;CFG.objectives[2][1]=LESSON;resetCourt();resetLesson()}
};
TI.register(CFG);
})();
