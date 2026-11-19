/* TALENTOPIA · Creative Quarter Studio (district config for interior.js)
   Creative-director check-in, a Design Studio poster brief where the WCAG 2.x contrast
   ratio is genuinely calculated from the student's colour choices, a Campaign Room budget
   split using a transparent illustrative reach model, and an honest-advertising debrief.
   All people, clients and numbers are fictional; the campaign model is a teaching
   assumption, not real advertising data. */
(()=>{
'use strict';
const TI=window.TalentopiaInterior;if(!TI)return;
const $=id=>document.getElementById(id);
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const money=n=>'$'+Math.round(n).toLocaleString('en-US');
const num=n=>Math.round(n).toLocaleString('en-US');
let rings,noorTag,jonasTag,kaiTag,posterTex,budgetTex,studioLight,score=0,interest='design';

/* ------------------------------------------------------------------ colour maths (WCAG 2.x) */
const SW=[['White','#FFFFFF'],['Cream','#FFF6E0'],['Leaf green (brand)','#2E9E5B'],['Forest','#14532D'],['Sky','#67DFF0'],['Blush','#F7A9D8'],['Sun yellow','#FFD23F'],['Midnight','#0C1031']];
const BRAND=2,SIZES=[18,24,32],LARGE_PX=24;
const channel=v=>{const c=v/255;return c<=0.04045?c/12.92:Math.pow((c+0.055)/1.055,2.4)};
function luminance(hex){const n=parseInt(hex.slice(1),16);return 0.2126*channel((n>>16)&255)+0.7152*channel((n>>8)&255)+0.0722*channel(n&255)}
function contrast(a,b){const A=luminance(a),B=luminance(b);return (Math.max(A,B)+0.05)/(Math.min(A,B)+0.05)}
const ratio2=r=>(Math.floor(r*100)/100).toFixed(2); // WCAG: never round a ratio up

/* ------------------------------------------------------------------ campaign model (teaching assumptions) */
const BUDGET=10000,TARGET=470;
const CH=[
 {id:'social',name:'Short-video social ads',cost:0.02,per:'view',cap:150000,rate:0.0015},
 {id:'search',name:'Search ads',cost:1.20,per:'click',cap:2000,rate:0.05},
 {id:'creator',name:'Creator partnership (#ad)',cost:0.05,per:'view',cap:60000,rate:0.0025},
 {id:'events',name:'School & community events',cost:4,per:'person met',cap:1500,rate:0.06}];
const DEFAULT_SPLIT=[15,15,15,55];
function model(split){let reach=0,signups=0,wasted=0,total=0;
 const rows=CH.map((c,i)=>{const pct=split[i],spend=BUDGET*pct/100,reached=Math.min(spend/c.cost,c.cap),waste=Math.max(0,spend-c.cap*c.cost),s=reached*c.rate;
  total+=pct;reach+=reached;signups+=s;wasted+=waste;return {pct,spend,reached,waste,signups:s}});
 return {rows,total,reach,signups,wasted}}

/* ------------------------------------------------------------------ live canvas textures */
function liveTex(w,h){const cv=document.createElement('canvas');cv.width=w;cv.height=h;const t=new THREE.CanvasTexture(cv);t.encoding=THREE.sRGBEncoding;return t}
function drawPoster(t,st){if(!t)return;const cv=t.image,x=cv.getContext('2d'),W=cv.width,H=cv.height,fg=SW[st.text][1];
 x.fillStyle=SW[st.bg][1];x.fillRect(0,0,W,H);
 x.globalAlpha=.16;x.fillStyle=fg;x.beginPath();x.moveTo(0,H*.62);for(let i=0;i<=8;i++)x.quadraticCurveTo(i*64+32,H*(.52+(i%2?.08:-.04)),i*64+64,H*.62);x.lineTo(W,H);x.lineTo(0,H);x.fill();x.globalAlpha=1;
 x.fillStyle=fg;x.textBaseline='top';const px=Math.round(st.size*2.1);x.font=`800 ${px}px system-ui,sans-serif`;x.fillText('Clean the coast.',26,34,W-52);x.fillText('Join the wave.',26,34+px*1.12,W-52);
 x.fillStyle='#0C1031';x.fillRect(0,H-48,W,48);x.fillStyle='#FAFBFF';x.font='600 20px system-ui,sans-serif';x.fillText('Sat 10:00 · North Beach · GreenWave Youth',26,H-35,W-52);
 t.needsUpdate=true}
function drawBudget(t,split){if(!t)return;const cv=t.image,x=cv.getContext('2d'),W=cv.width,H=cv.height,r=model(split),cols=['#F7A9D8','#67DFF0','#FFD59C','#8DE8C3'];
 const g=x.createLinearGradient(0,0,W,H);g.addColorStop(0,'#141a4a');g.addColorStop(1,'#0C1031');x.fillStyle=g;x.fillRect(0,0,W,H);x.strokeStyle='#F7A9D8';x.lineWidth=6;x.strokeRect(3,3,W-6,H-6);
 x.fillStyle='#F7A9D8';x.font='bold 30px system-ui,sans-serif';x.fillText('Live budget split',24,46);
 x.fillStyle='#d6e0ff';x.font='20px system-ui,sans-serif';x.fillText(`Allocated ${r.total}% · est. sign-ups ${num(r.signups)} / ${TARGET}`,24,80);
 CH.forEach((c,i)=>{const y=108+i*44;x.fillStyle='#ffffff18';x.fillRect(24,y,360,28);x.fillStyle=cols[i];x.fillRect(24,y,360*Math.min(100,split[i])/100,28);x.fillStyle='#FAFBFF';x.font='18px system-ui,sans-serif';x.fillText(`${c.name.split(' (')[0]} · ${split[i]}%`,396,y+20,110)});
 x.fillStyle='#93a0c8';x.font='15px system-ui,sans-serif';x.fillText('Illustrative teaching model · not real data',24,H-14);t.needsUpdate=true}

/* ------------------------------------------------------------------ building */
function art(draw){const t=liveTex(256,340);const x=t.image.getContext('2d');draw(x,256,340);t.needsUpdate=true;return t}
function build(B){
 const {scene,C,M,glow,box,collider,hotspot,npc,person,textSprite,panelTexture,screen,shell,plant}=B;
 shell({lobby:0xeee4ea,corridor:0xdcd2e2,left:0xcfb08a,leftOpts:{roughness:.7},right:0x2b2552,rightOpts:{roughness:.9},wall:0xf5f0f6,trim:C.blush});
 const white=M(0xfaf7fc,{roughness:.35}),dark=M(0x1b1f33,{roughness:.4}),oak=M(0xb88a5a,{roughness:.6}),metal=M(0x9aa6c8,{metalness:.5,roughness:.35});
 // lobby: welcome desk + Noor
 box(5,1.05,1.1,white,0,.525,4);box(5.1,.06,1.2,glow(C.blush),0,1.08,4);box(5,.16,.02,glow(C.violet),0,.62,4.56);collider(-2.6,3.4,2.6,4.6);
 box(.8,.5,.04,dark,-1.5,1.4,3.75);screen(.76,.46,panelTexture('Briefs today',['GreenWave Youth','Open-day video'],'#F7A9D8'),-1.5,1.4,3.775);
 box(.12,.16,.12,M(C.gold),1.6,1.19,3.8);for(let i=0;i<3;i++)box(.02,.22,.02,M([C.blush,C.cyan,C.violet][i]),1.57+i*.03,1.3,3.8);
 const noor=npc(person({skin:0x7a4a2a,hair:0x1d1a1f,style:'bun',outfit:0xffd59c,coat:0x2a2f58,badge:true}));noor.position.set(0,0,2.9);scene.add(noor);collider(-.35,2.55,.35,3.25);
 noorTag=textSprite('Noor','#F7A9D8',.75,'Creative director');noorTag.position.set(0,2.35,2.9);scene.add(noorTag);
 hotspot('director',0,5.7,1.9,'Talk to Noor, the creative director',[noor]);
 rings=new THREE.Group();[C.blush,C.cyan,C.gold].forEach((c,i)=>{const r=new THREE.Mesh(new THREE.TorusGeometry(.36,.035,8,40),glow(c));r.rotation.set(i*1.05,i*.6,0);rings.add(r)});rings.position.set(0,3.05,4);scene.add(rings);
 const sign=textSprite('Creative Quarter','#F7A9D8',1.25,'Marketing · Media · Design');sign.position.set(0,3.4,.2);scene.add(sign);
 // gallery wall (west) with framed campaign posters
 const posters=[
  (x,W,H)=>{x.fillStyle='#945CFF';x.fillRect(0,0,W,H);x.fillStyle='#FFD59C';x.beginPath();x.arc(W/2,130,70,0,7);x.fill();x.fillStyle='#FAFBFF';x.font='800 34px system-ui';x.fillText('Open Day',30,270);x.font='18px system-ui';x.fillText('Talent City Uni',30,300)},
  (x,W,H)=>{x.fillStyle='#0C1031';x.fillRect(0,0,W,H);for(let i=0;i<6;i++){x.fillStyle=['#F7A9D8','#67DFF0','#8DE8C3'][i%3];x.fillRect(30+i*34,60+i*20,26,160-i*20)}x.fillStyle='#FAFBFF';x.font='800 30px system-ui';x.fillText('Data Fest',30,290)},
  (x,W,H)=>{x.fillStyle='#FFF6E0';x.fillRect(0,0,W,H);x.strokeStyle='#14532D';x.lineWidth=10;for(let i=0;i<4;i++){x.beginPath();x.arc(W/2,150,30+i*22,0,7);x.stroke()}x.fillStyle='#14532D';x.font='800 30px system-ui';x.fillText('Plant Week',26,290)}];
 [3.6,7,10.4].forEach((z,i)=>{box(.06,1.62,1.25,M(0x2a2f58),-9.81,1.75,z);screen(1.1,1.46,art(posters[i]),-9.775,1.75,z,Math.PI/2);box(.3,.05,.12,glow(0xfff4ea),-9.8,2.62,z)});
 const gl=textSprite('Our work','#F7A9D8',.7);gl.position.set(-9.4,2.95,7);scene.add(gl);
 // photo corner (east): backdrop, camera on tripod, softbox
 box(.05,2.4,3,M(0xf7a9d8,{roughness:.9}),9.8,1.2,10.6);box(1.4,.02,2.6,M(0xf7a9d8,{roughness:.9}),9.2,.02,10.6);
 for(let i=0;i<3;i++){const a=i*2.1,l=box(.03,1.35,.03,dark,6.9+Math.cos(a)*.22,.66,10.6+Math.sin(a)*.22);l.rotation.set(Math.sin(a)*.18,0,-Math.cos(a)*.18)}
 box(.32,.22,.2,dark,6.9,1.42,10.6);const lens=new THREE.Mesh(new THREE.CylinderGeometry(.07,.07,.18,16),dark);lens.rotation.z=Math.PI/2;lens.position.set(7.12,1.42,10.6);scene.add(lens);collider(6.55,10.25,7.25,10.95);
 box(.04,1.7,.04,metal,8.6,.85,8.6);const soft=box(.6,.6,.25,glow(0xfff4ea),8.6,1.85,8.75);soft.rotation.y=-.6;collider(8.35,8.35,8.85,8.85);
 const pl=new THREE.PointLight(0xfff4ea,.45,6);pl.position.set(8.4,2.2,9.5);scene.add(pl);
 const pc=textSprite('Photo studio','#67DFF0',.7);pc.position.set(9.3,2.75,10.6);scene.add(pc);
 // lounge (west front): sofa, coffee table, bean bags
 box(3,.45,.85,M(0x5b5f9e),-6.6,.225,11.9);box(3,.55,.18,M(0x5b5f9e),-6.6,.6,12.3);collider(-8.1,11.45,-5.1,12.4);
 box(1.4,.38,.7,oak,-6.6,.19,10.4);box(.4,.05,.3,M(C.blush),-6.9,.41,10.4);box(.35,.05,.28,M(C.cyan),-6.4,.44,10.45);collider(-7.3,10.05,-5.9,10.75);
 for(const [x,z,c] of [[-8.9,10.2,C.gold],[-4.6,12.6,C.mint]]){const bb=new THREE.Mesh(new THREE.SphereGeometry(.45,16,12),M(c,{roughness:.9}));bb.scale.y=.6;bb.position.set(x,.27,z);scene.add(bb);collider(x-.4,z-.4,x+.4,z+.4)}
 screen(3,1.75,panelTexture('Campaign of the month',['“Clean the coast”','for GreenWave Youth','Launch: next Saturday'],'#F7A9D8'),9.83,1.8,4.6,-Math.PI/2);
 plant(-3.7,.9);plant(3.7,.9);plant(-9.2,13.1);plant(9.2,13.1);
 const lw=new THREE.PointLight(C.blush,.35,10);lw.position.set(0,3,7);scene.add(lw);
 const sd=textSprite('← Design Studio','#F7A9D8',.95);sd.position.set(-2.2,3.25,-10);scene.add(sd);
 const sc=textSprite('Campaign Room →','#67DFF0',.95);sc.position.set(2.2,3.25,-10);scene.add(sc);

 // design studio
 box(2.8,.08,1.1,white,-10.5,.78,-11.2);for(const s of [-1,1])box(.08,.74,1,metal,-10.5+s*1.32,.37,-11.2);collider(-11.95,-11.8,-9.05,-10.6);
 box(1.3,.8,.05,dark,-10.5,1.32,-11.62);box(.08,.36,.08,metal,-10.5,1,-11.68);
 posterTex=liveTex(512,320);drawPoster(posterTex,{text:BRAND,bg:6,size:18});screen(1.22,.74,posterTex,-10.5,1.32,-11.592);
 box(.62,.03,.42,dark,-9.85,.835,-10.95);const tab=screen(.54,.34,panelTexture('',[],'#F7A9D8',x=>{x.strokeStyle='#F7A9D8';x.lineWidth=8;x.beginPath();x.moveTo(60,220);x.bezierCurveTo(160,60,300,280,450,90);x.stroke()}),-9.85,.852,-10.95);tab.rotation.x=-Math.PI/2;
 const pen=new THREE.Mesh(new THREE.CylinderGeometry(.012,.012,.22,8),M(C.violet));pen.rotation.z=1.2;pen.position.set(-9.45,.85,-10.85);scene.add(pen);
 const jonas=npc(person({skin:0xf6d7c3,hair:0xe2c07a,style:'short',outfit:0x2fa79a}));jonas.position.set(-10.5,0,-12.5);scene.add(jonas);collider(-10.85,-12.85,-10.15,-12.15);
 jonasTag=textSprite('Jonas','#F7A9D8',.75,'Graphic designer');jonasTag.position.set(-10.5,2.35,-12.5);scene.add(jonasTag);
 hotspot('studio',-10.5,-9.3,2,'Design the poster with Jonas',[jonas]);
 // mood board on the back wall
 box(4.2,2.2,.06,M(0xc89f73,{roughness:1}),-14.6,1.7,-15.8);
 [['#F7A9D8',-16.1,2.3],['#67DFF0',-15.2,2.1],['#8DE8C3',-14.1,2.35],['#FFD59C',-13.1,2.2],['#2E9E5B',-16,1.25],['#945CFF',-14.9,1.15],['#FFF6E0',-13.8,1.3],['#14532D',-12.9,1.1]].forEach(([c,x,y],i)=>{const n=box(.72,.5,.02,M(parseInt(c.slice(1),16),{roughness:.9}),x,y,-15.76);n.rotation.z=(i%3-1)*.06});
 const mb=textSprite('Mood board','#F7A9D8',.7);mb.position.set(-14.6,3.1,-15.6);scene.add(mb);
 screen(3,1.75,panelTexture('Brief · GreenWave Youth',['Goal: 470 volunteer sign-ups','Audience: ages 15–20','Must be readable by all'],'#8DE8C3'),-7,1.75,-15.83);
 // swatch wall (west wall)
 screen(3.6,2,panelTexture('Colour library',[],'#F7A9D8',x=>{const cs=['#FFFFFF','#FFF6E0','#2E9E5B','#14532D','#67DFF0','#F7A9D8','#FFD23F','#0C1031','#945CFF','#ff9bb2','#8DE8C3','#FFD59C'];cs.forEach((c,i)=>{x.fillStyle=c;x.fillRect(30+(i%6)*78,90+Math.floor(i/6)*96,62,74)})}),-17.83,1.7,-10,Math.PI/2);
 hotspot('swatches',-16.3,-10,1.5,'Look at the colour library');
 // drawing desks, easel
 for(const [x,z] of [[-6.2,-13.8],[-6.2,-6.2],[-15.2,-13.8],[-15.2,-6.2]]){const top=box(1.8,.06,1,white,x,.9,z);top.rotation.x=.18;for(const s of [-1,1])box(.06,.86,.06,metal,x+s*.82,.43,z);
  box(.04,.5,.04,metal,x+.7,1.2,z-.3);box(.22,.1,.14,glow(0xfff4ea),x+.62,1.45,z-.25);collider(x-.95,z-.55,x+.95,z+.55)}
 for(const s of [-1,1]){const l=box(.05,1.8,.05,oak,-13.4+s*.3,.9,-7.2);l.rotation.z=s*.12}box(.05,1.6,.05,oak,-13.4,.8,-6.95).rotation.x=-.2;
 const cvs=screen(.9,.7,art((x,W,H)=>{x.fillStyle='#FFF6E0';x.fillRect(0,0,W,H);x.fillStyle='#2E9E5B';x.font='800 40px system-ui';x.fillText('Join',30,140);x.fillText('the wave',30,190);x.fillStyle='#67DFF0';x.fillRect(0,250,W,90)}),-13.4,1.3,-7.25);cvs.rotation.x=-.1;collider(-13.8,-7.5,-13,-6.8);
 studioLight=new THREE.PointLight(0xfff0e0,.65,11);studioLight.position.set(-10.5,3,-10);scene.add(studioLight);

 // campaign room: video wall, whiteboard, meeting table
 budgetTex=liveTex(512,300);drawBudget(budgetTex,DEFAULT_SPLIT);
 box(9.4,2.3,.08,M(0x0b0f26),12,1.65,-15.8);
 screen(2.9,1.7,panelTexture('Audience',['Ages 15–20','Talent City + nearby','Cares about: climate'],'#67DFF0'),8.9,1.65,-15.75);
 screen(3,1.76,budgetTex,12,1.65,-15.75);
 screen(2.9,1.7,panelTexture('Funnel',['See → Think → Act'],'#FFD59C',x=>{[[60,400],[110,300],[160,200]].forEach(([y0,w],i)=>{x.fillStyle=['#F7A9D8','#67DFF0','#8DE8C3'][i];x.fillRect(256-w/2,140+i*48,w,36)})}),15.1,1.65,-15.75);
 box(.06,1.9,3.6,M(0xffffff,{roughness:.25}),17.8,1.6,-10);
 screen(3.4,1.7,panelTexture('',[],'#2a2f58',x=>{x.fillStyle='#f6f7fb';x.fillRect(6,6,500,288);x.strokeStyle='#945CFF';x.lineWidth=4;x.font='bold 26px system-ui';x.fillStyle='#2a2f58';x.fillText('Campaign plan',24,44);
  ['1. Who is the audience?','2. Where do they spend time?','3. What do we want them to do?','4. Measure, learn, adjust'].forEach((l,i)=>{x.font='21px system-ui';x.fillText(l,24,92+i*44)});x.beginPath();x.arc(430,200,46,0,7);x.stroke()}),17.76,1.6,-10,-Math.PI/2);
 box(3.2,.08,1.2,white,12,.76,-11.2);for(const s of [-1,1])box(.08,.72,1.1,metal,12+s*1.5,.36,-11.2);collider(10.35,-11.85,13.65,-10.55);
 box(.5,.03,.36,dark,11.3,.815,-11);const lp=box(.5,.32,.02,dark,11.3,.98,-11.2);lp.rotation.x=-.25;box(.24,.02,.32,M(C.blush),12.6,.81,-11);
 for(const x of [9.95,14.05])box(.5,.45,.5,M(0x8f86c9),x,.225,-11.2),collider(x-.25,-11.45,x+.25,-10.95);
 const kai=npc(person({skin:0xe8b896,hair:0x9b8cff,style:'long',outfit:0x7a4fe0}));kai.position.set(12,0,-12.6);scene.add(kai);collider(11.65,-12.95,12.35,-12.25);
 kaiTag=textSprite('Kai','#67DFF0',.75,'Marketing strategist');kaiTag.position.set(12,2.35,-12.6);scene.add(kaiTag);
 hotspot('campaign',12,-9.3,2,'Plan the campaign with Kai',[kai]);
 // storyboard stand + bean bags
 box(2.4,1.4,.06,M(0xffffff,{roughness:.3}),16,1.3,-5.2);for(const s of [-1,1])box(.05,1.6,.05,metal,16+s*1.15,.8,-5.2);collider(14.75,-5.4,17.25,-5);
 for(let i=0;i<6;i++)box(.6,.4,.02,M([C.blush,C.cyan,C.gold][i%3],{roughness:.9}),15.3+(i%3)*.7,1.55-Math.floor(i/3)*.55,-5.16);
 for(const [x,z,c] of [[5.2,-5.4,C.blush],[6.4,-5.2,C.cyan]]){const bb=new THREE.Mesh(new THREE.SphereGeometry(.42,16,12),M(c,{roughness:.9}));bb.scale.y=.6;bb.position.set(x,.25,z);scene.add(bb);collider(x-.38,z-.38,x+.38,z+.38)}
 const cl=new THREE.PointLight(C.cyan,.45,12);cl.position.set(12,2.8,-10);scene.add(cl);
 const cl2=new THREE.PointLight(C.blush,.3,10);cl2.position.set(8,2.6,-7);scene.add(cl2);
}

/* ------------------------------------------------------------------ design studio: real contrast */
let design;
function resetDesign(){design={text:BRAND,bg:6,size:18,tries:0,done:false}}
function needFor(size){return size>=LARGE_PX?3:4.5}
function renderDesign(msg,cls){
 const el=$('cqPoster');if(!el)return;const fg=SW[design.text][1],bg=SW[design.bg][1],r=contrast(fg,bg),need=needFor(design.size),ok=r>=need;
 el.style.background=bg;$('cqHead').style.color=fg;$('cqHead').style.fontSize=design.size+'px';$('cqWave').style.background=fg;
 const pick=(id,key)=>$(id).querySelectorAll('button').forEach(b=>b.classList.toggle('on',+b.dataset.i===design[key]));pick('cqText','text');pick('cqBg','bg');
 $('cqSize').querySelectorAll('button').forEach(b=>b.classList.toggle('on',+b.dataset.s===design.size));
 $('cqRatio').textContent=ratio2(r)+' : 1';$('cqRatio').style.color=ok?'#8DE8C3':'#ff9bb2';
 $('cqNeed').textContent=(design.size>=LARGE_PX?'large text → ':'normal text → ')+need+' : 1';
 const yes='#8DE8C3',no='#ff9bb2';$('cqNorm').textContent=r>=4.5?'✓ pass':'✕ fail';$('cqNorm').style.color=r>=4.5?yes:no;$('cqLarge').textContent=r>=3?'✓ pass':'✕ fail';$('cqLarge').style.color=r>=3?yes:no;
 const t=$('cqTask');t.className='ix-task '+(cls||'');
 t.innerHTML=msg||`<b>Your goal:</b> use <b>Leaf green</b> for the headline or the background, and reach <b>WCAG AA</b> for your headline size (${need} : 1 or more).`;
 drawPoster(posterTex,design);
}
function openStudio(ix){
 jonasTag.visible=false;
 const sw=(id,key)=>`<div class="swatches" id="${id}">${SW.map((s,i)=>`<button data-i="${i}" style="background:${s[1]}" aria-label="${esc(s[0])}" title="${esc(s[0])}"></button>`).join('')}</div>`;
 ix.openPanel({hideAvatar:true,
  html:`<div class="k">Design Studio · Client brief</div><h3>GreenWave Youth poster</h3>
   <div class="ix-info"><b>The brief</b>A youth climate charity needs a poster for its beach clean-up. The headline or the background must use their brand colour, <b style="display:inline;font-size:12px;color:#8DE8C3">Leaf green</b>, and everyone must be able to read it.</div>
   <div id="cqPoster" style="position:relative;height:172px;border-radius:14px;overflow:hidden;border:1px solid #ffffff40;transition:background .2s">
    <div id="cqWave" style="position:absolute;left:-10%;right:-10%;bottom:-40px;height:110px;border-radius:50%;opacity:.16"></div>
    <div id="cqHead" style="position:relative;padding:14px 16px;font-weight:800;line-height:1.1;letter-spacing:-.3px">Clean the coast.<br>Join the wave.</div>
    <div style="position:absolute;left:0;right:0;bottom:0;background:#0C1031;color:#FAFBFF;font-size:11px;padding:7px 16px">Sat 10:00 · North Beach · GreenWave Youth</div></div>
   <div class="ed-row" style="margin-top:2px"><label>Headline colour</label>${sw('cqText','text')}</div>
   <div class="ed-row" style="margin-top:4px"><label>Background colour</label>${sw('cqBg','bg')}</div>
   <div class="ed-row" style="margin-top:4px"><label>Headline size</label><div class="chips" id="cqSize">${SIZES.map(s=>`<button data-s="${s}">${s}px${s>=LARGE_PX?' · large':''}</button>`).join('')}</div></div>
   <div class="ix-metric"><span>Contrast ratio</span><strong id="cqRatio"></strong></div>
   <div class="ix-metric"><span>Needed for this headline</span><strong id="cqNeed"></strong></div>
   <div class="ix-metric"><span>AA normal text (4.5 : 1)</span><strong id="cqNorm"></strong></div>
   <div class="ix-metric"><span>AA large text (3 : 1)</span><strong id="cqLarge"></strong></div>
   <div class="ix-task" id="cqTask"></div>
   <button class="ix-primary" id="cqSend" style="margin-top:2px">Send to the client →</button>
   <div class="ix-note">Calculated live with the WCAG 2.x formula: ratio = (L1 + 0.05) ÷ (L2 + 0.05), where L1 and L2 are the relative luminance of the lighter and darker colour. AA needs 4.5 : 1 for normal text and 3 : 1 for large text (24px+, or 18.66px+ bold). The client and charity are fictional.</div>`,
  bind(){
   $('cqText').querySelectorAll('button').forEach(b=>b.onclick=()=>{if(design.done)return;design.text=+b.dataset.i;renderDesign()});
   $('cqBg').querySelectorAll('button').forEach(b=>b.onclick=()=>{if(design.done)return;design.bg=+b.dataset.i;renderDesign()});
   $('cqSize').querySelectorAll('button').forEach(b=>b.onclick=()=>{if(design.done)return;design.size=+b.dataset.s;renderDesign()});
   const finishBtn=()=>{const s=$('cqSend');s.textContent='Continue →';s.onclick=()=>{ix.closePanel();afterDesign(ix)}};
   if(design.done){renderDesign(`<b>✓ Approved.</b> ${ratio2(contrast(SW[design.text][1],SW[design.bg][1]))} : 1 meets AA. Press Continue.`,'ok');finishBtn();return}
   renderDesign();
   $('cqSend').onclick=()=>{const fg=SW[design.text][1],bg=SW[design.bg][1],r=contrast(fg,bg),need=needFor(design.size);
    if(design.text===design.bg){renderDesign('<b>Not yet.</b> The headline and background are the same colour, so the text is invisible.','no');return}
    design.tries++;
    if(design.text!==BRAND&&design.bg!==BRAND){renderDesign('<b>Not yet.</b> The brief says the brand colour <b>Leaf green</b> must be the headline or the background.','no');return}
    if(r<need){renderDesign(`<b>Not yet.</b> ${ratio2(r)} : 1 is below the ${need} : 1 that AA needs for ${design.size>=LARGE_PX?'large':'normal-size'} text. ${design.size<LARGE_PX&&r>=3?'Your colours would pass at 24px or bigger. Try a larger headline, or a stronger colour pair.':'Pair Leaf green with a much lighter or much darker colour.'}`,'no');return}
    design.done=true;design.ratio=r;score+=design.tries===1?1:0;
    renderDesign(`<b>✓ Client approved!</b> ${ratio2(r)} : 1 meets WCAG AA for ${design.size>=LARGE_PX?'large':'normal'} text${r>=7?' (it even reaches AAA, 7 : 1)':''}.`,'ok');finishBtn()}},
  camera(p,l){const m=innerWidth<=760,o=m?0:.75;p.set(-10.5+o,m?3.1:2.6,m?-6.4:-7.7);l.set(-10.5+o,m?.4:1.2,-12.2)},
  onClose(){jonasTag.visible=true}});
}
function afterDesign(ix){
 ix.question('Jonas · Graphic designer','The client asks: “Why can’t we just use our light green on a white background? It looks fresher.” What is the best answer?',
  ['Low-contrast text is hard or impossible to read for many people, including people with low vision or colour-vision deficiency, and anyone reading a phone in bright sunlight','Contrast only matters for printed posters, not for screens','Contrast is just a matter of personal taste'],0,
  'Good design is <b>accessible design</b>. Low contrast shuts people out: commonly cited figures say about 1 in 12 men and 1 in 200 women have some colour-vision deficiency, and many more people have low vision. Checking contrast with the WCAG formula is a normal part of a designer’s job.',f=>{score+=f;
   ix.dialog('Jonas · Graphic designer','Poster signed off! Now it needs people to actually see it. Kai in the <b>Campaign Room</b> is planning the media budget: across the corridor, door on the right.',[{label:'On my way →',fn:()=>{ix.closeDialog();const g=ix.awardOnce('creative_design',60);ix.advance(2);ix.toast('✓ Poster approved'+(g?` · +${g} XP`:''))}}])});
}
function talkStudio(ix){
 const J='Jonas · Graphic designer';
 if(ix.objIdx<1){ix.dialog(J,'Hi! Check in with Noor at the front desk first. She’ll give you today’s brief.',[{label:'Will do',fn:ix.closeDialog}]);return}
 if(ix.objIdx>1){ix.dialog(J,'The poster is at the printer. Readable, on-brand and on time. Great work!',[{label:'Thanks, Jonas',fn:ix.closeDialog}]);return}
 ix.dialog(J,`Hi ${ix.name}! Our client, <b>GreenWave Youth</b>, wants a poster for a beach clean-up. My draft uses green on yellow and… honestly, it’s hard to read. Can you fix the colours?`,[{label:'Open the design →',fn:()=>{ix.closeDialog();openStudio(ix)}}]);
}
function swatchFact(ix){
 ix.dialog('NOVA · Bonus fact','Screens mix light in <b>RGB</b> (red, green, blue), while printers mix ink in <b>CMYK</b> (cyan, magenta, yellow, black). The same colour can look different on screen and on paper, so designers check printed proofs before a big print run.',[{label:'Good to know!',fn:()=>{ix.closeDialog();const g=ix.awardOnce('creative_swatch',10);if(g)ix.toast(`✦ Bonus fact · +${g} XP`)}}]);
}

/* ------------------------------------------------------------------ campaign room: illustrative budget model */
let camp;
function resetCamp(){camp={split:DEFAULT_SPLIT.slice(),tries:0,done:false,result:null}}
function renderCamp(msg,cls){
 if(!$('ccTotal'))return;const r=model(camp.split);
 CH.forEach((c,i)=>{const row=r.rows[i];$('ccV'+i).textContent=`${row.pct}% · ${money(row.spend)}`;
  $('ccR'+i).innerHTML=`≈ ${num(row.reached)} ${c.per}s · ${num(row.signups)} sign-ups${row.waste>0?` · <span style="color:#ffc0ad">⚠ ${money(row.waste)} beyond this audience</span>`:''}`});
 const left=100-r.total;$('ccTotal').textContent=`${r.total}% (${money(BUDGET*r.total/100)})`;$('ccTotal').style.color=r.total===100?'#8DE8C3':'#ffc0ad';
 $('ccLeft').textContent=left===0?'✓ $0':left>0?money(BUDGET*left/100)+' unspent':money(-BUDGET*left/100)+' over budget';$('ccLeft').style.color=left===0?'#8DE8C3':'#ffc0ad';
 $('ccReach').textContent=num(r.reach);
 const ok=r.signups>=TARGET;$('ccSign').textContent=`${num(r.signups)} ${ok?'✓':'✕'}`;$('ccSign').style.color=ok?'#8DE8C3':'#ff9bb2';
 $('ccBar').style.width=Math.min(100,r.signups/TARGET*100)+'%';
 const t=$('ccTask');t.className='ix-task '+(cls||'');
 t.innerHTML=msg||`<b>Your goal:</b> spend exactly <b>${money(BUDGET)}</b> (100%) and reach at least <b>${TARGET} volunteer sign-ups</b>. Tip: compare sign-ups per dollar for each channel.`;
 drawBudget(budgetTex,camp.split);
}
function openCamp(ix){
 kaiTag.visible=false;
 ix.openPanel({hideAvatar:true,
  html:`<div class="k">Campaign Room · Media plan</div><h3>Split the $10,000 budget</h3>
   <div class="ix-info" style="font-size:11.5px"><b>Teaching assumptions, not real data</b>
    ${CH.map(c=>`${esc(c.name)}: $${c.cost.toFixed(2)} per ${c.per}, up to ${num(c.cap)} ${c.per}s, ${(c.rate*100).toFixed(2).replace(/\.?0+$/,'')}% sign up`).join('<br>')}
    <br><span style="color:#bceeff">Reached = spend ÷ cost (capped at the audience size) · Sign-ups = reached × sign-up rate</span></div>
   ${CH.map((c,i)=>`<div class="ix-range"><label>${esc(c.name)} <strong id="ccV${i}"></strong></label><input type="range" id="ccS${i}" min="0" max="100" step="5" value="${camp.split[i]}" aria-label="${esc(c.name)} share of budget"><div class="ix-note" id="ccR${i}" style="margin-top:3px"></div></div>`).join('')}
   <div class="ix-metric"><span>Budget allocated</span><strong id="ccTotal"></strong></div>
   <div class="ix-metric"><span>Remaining</span><strong id="ccLeft"></strong></div>
   <div class="ix-metric"><span>People reached (est.)</span><strong id="ccReach"></strong></div>
   <div class="ix-metric"><span>Volunteer sign-ups (target ${TARGET})</span><strong id="ccSign"></strong></div>
   <div class="meter"><div id="ccBar" style="background:linear-gradient(90deg,#945CFF,#67DFF0)"></div></div>
   <div class="ix-task" id="ccTask"></div>
   <button class="ix-primary" id="ccGo" style="margin-top:2px">Launch the plan →</button>
   <div class="ix-note">An illustrative model to practise budget trade-offs. Real campaigns use audience research and measured results, and real costs vary a lot. The charity and its numbers are fictional.</div>`,
  bind(){
   CH.forEach((c,i)=>{const s=$('ccS'+i);s.oninput=()=>{if(camp.done){s.value=camp.split[i];return}camp.split[i]=+s.value;renderCamp()}});
   const finishBtn=()=>{const g=$('ccGo');g.textContent='Continue →';g.onclick=()=>{ix.closePanel();afterCamp(ix)}};
   if(camp.done){renderCamp(`<b>✓ Plan approved:</b> about ${num(camp.result.signups)} sign-ups for ${money(BUDGET)}.`,'ok');finishBtn();return}
   renderCamp();
   $('ccGo').onclick=()=>{const r=model(camp.split);
    if(r.total!==100){renderCamp(`<b>Not yet.</b> Your plan uses ${r.total}% of the budget. Allocate <b>exactly 100%</b>: ${r.total>100?'you can’t spend money the client doesn’t have':'unspent money reaches nobody'}.`,'no');return}
    camp.tries++;
    if(r.signups<TARGET){const w=r.wasted>0?` ${money(r.wasted)} is being spent beyond what some channels can reach: move it somewhere that still has audience left.`:'';
     renderCamp(`<b>Not yet.</b> About ${num(r.signups)} sign-ups, short of ${TARGET}. Compare <b>sign-ups per dollar</b>, not just sign-up rate: events convert well but cost a lot per person.${w}`,'no');return}
    camp.done=true;camp.result=r;score+=camp.tries===1?1:0;
    renderCamp(`<b>✓ Target reached!</b> About <b>${num(r.signups)} sign-ups</b> and ${num(r.reach)} people reached for ${money(BUDGET)}${r.wasted>0?`, though ${money(r.wasted)} went beyond a channel’s audience`:''}.`,'ok');finishBtn()}},
  camera(p,l){const m=innerWidth<=760,o=m?0:.8;p.set(12+o,m?3.2:2.5,m?-6.4:-8.3);l.set(12+o,m?.5:1.25,-12.4)},
  onClose(){kaiTag.visible=true}});
}
function afterCamp(ix){
 ix.question('Kai · Marketing strategist','The plan works on paper. Now we set up the ads. GreenWave wants volunteers aged 15–20 who live in or near Talent City. Which targeting makes most sense?',
  ['People aged 15–20 in and around Talent City who follow climate, outdoors or volunteering topics, within each platform’s age and privacy rules','Everyone in the world, so the reach number looks as big as possible','Buy a list of students’ private phone numbers and text them all'],0,
  'Good targeting means reaching the <b>right people</b>, not the most people: impressions in another country produce no beach volunteers. And marketers must respect <b>privacy law</b> and platform rules, especially for young audiences. Buying personal data without consent is not acceptable.',f=>{score+=f;
   ix.dialog('Kai · Marketing strategist','Love it. Right message, right people, right budget. Go and tell Noor the campaign is ready to launch.',[{label:'Back to Noor →',fn:()=>{ix.closeDialog();const g=ix.awardOnce('creative_campaign',60);ix.advance(3);ix.toast('✓ Campaign planned'+(g?` · +${g} XP`:''))}}])});
}
function talkCamp(ix){
 const K='Kai · Marketing strategist';
 if(ix.objIdx<2){ix.dialog(K,'Hey! We need the poster finished before we can plan the media. Jonas in the Design Studio could use you first.',[{label:'Got it',fn:ix.closeDialog}]);return}
 if(ix.objIdx>2){ix.dialog(K,'The plan’s locked in. Fingers crossed for a packed beach!',[{label:'Thanks, Kai',fn:ix.closeDialog}]);return}
 ix.dialog(K,`${ix.name}, perfect timing. GreenWave has <b>${money(BUDGET)}</b> to find <b>${TARGET} volunteers</b>. We need to split it across four channels. Let’s model it.`,[{label:'Open the media plan →',fn:()=>{ix.closeDialog();openCamp(ix)}}]);
}

/* ------------------------------------------------------------------ creative director */
function talkDirector(ix){
 const N='Noor · Creative director';
 if(ix.objIdx===0){
  ix.dialog(N,`Welcome to the Creative Quarter, <b>${ix.name}</b>! I’m Noor, the creative director. Today our client is <b>GreenWave Youth</b>, a youth climate charity (fictional, like everyone here). You’ll design their poster, then plan their campaign. What interests you most?`,
   [['Graphic design','design'],['Marketing and advertising','marketing'],['Media and content creation','media']].map(([label,v])=>({label,fn:()=>{interest=v;
    ix.dialog(N,(v==='design'?'Great! Designers solve problems with type, colour and layout. ':v==='marketing'?'Great! Marketers work out who to reach and how to spend the budget well. ':'Great! Content creators turn a message into something people want to watch. ')+'Start with Jonas in the <b>Design Studio</b>: up the corridor, first door on the left.',
     [{label:'Let’s go →',fn:()=>{ix.closeDialog();ix.nova.visible=true;ix.advance(1);ix.toast('✓ Checked in. NOVA has joined you.')}}])}})));return}
 if(ix.objIdx<3){ix.dialog(N,`Keep going, ${ix.name}! Next: <b>${CFG.objectives[ix.objIdx][0].toLowerCase()}</b>.`,[{label:'On it',fn:ix.closeDialog}]);return}
 if(ix.objIdx>3){ix.dialog(N,'Brilliant work today. The studio door is always open.',[{label:'Thanks, Noor',fn:ix.closeDialog}]);return}
 const ratio=design.ratio?ratio2(design.ratio)+':1':'AA',su=camp.result?num(camp.result.signups):'—';
 ix.dialog(N,`Let’s review the campaign before it goes live.<div class="vitals"><div>Contrast<b>${ratio}</b></div><div>Budget<b>${money(BUDGET)}</b></div><div>Est. sign-ups<b>${su}</b></div><div>Target<b>${TARGET}</b></div></div>`,[{label:'Present the campaign',fn:()=>
  ix.question('Debrief · Honest advertising','Noor: “One last thing. We’re paying a local creator to post about the clean-up, and someone suggested the slogan ‘Every sign-up plants 1,000 trees’, which isn’t true. What should we do?”',
   ['Clearly label the creator’s post as a paid partnership (for example #ad) and only make claims we can prove','Hide that the creator is paid so it feels more authentic','Keep the tree slogan: it’s for a good cause, so it doesn’t matter'],0,
   'Advertising must be <b>honest</b>. In many countries, rules require paid influencer posts to be clearly <b>disclosed</b>, and claims must be <b>truthful and backed by evidence</b>. False claims break trust, can break the law and can harm a good cause.',f=>{score+=f;
    ix.dialog(N,`Accessible design, a smart budget and honest messaging: that’s what great creative work looks like, ${ix.name}!`,[{label:'Finish my shift →',fn:()=>ix.finish({icon:'✦',title:'Creative Quarter Brand Builder',score,max:5,
     skills:['◐ Checking colour contrast with the WCAG formula','✎ Designing to a client brief and brand','$ Splitting a media budget across channels','◎ Targeting the right audience responsibly','✓ Honest advertising and clear #ad disclosure']})}])})}]);
}

const CFG={id:'creative',title:'Creative Quarter Studio',subtitle:'Junior creative shift',enterLabel:'✦ Enter Creative Quarter Studio: start a 3D shift →',badge:'Creative Quarter Brand Builder',
 objectives:[['Check in with Noor, the creative director',[0,5.7]],['Design the poster in the Design Studio',[-10.5,-9.3]],['Plan the campaign in the Campaign Room',[12,-9.3]],['Debrief with Noor',[0,5.7]],['Get your feedback and badge',null]],
 hints:['Welcome to the <b>Creative Quarter</b>! I’m <b>NOVA</b>, your learning guide. Check in with <b>Noor</b>, the creative director, at the front desk.',
  'Head up the corridor to the <b>Design Studio</b>, first door on the left. Jonas needs a readable poster.',
  'Poster approved! Cross the corridor to the <b>Campaign Room</b>. Kai has a $10,000 budget to plan.',
  'Campaign planned! Walk back to <b>Noor</b> at the front desk for your debrief.',
  'Shift complete. Open your <b>Career Passport</b> to see your new badge.'],
 build,
 interact(id,ix){const f={director:talkDirector,studio:talkStudio,campaign:talkCamp,swatches:swatchFact}[id];if(f)f(ix)},
 frame(dt,t){rings.rotation.y+=dt*.5;rings.children.forEach((r,i)=>{r.rotation.x+=dt*(.3+i*.15)});studioLight.intensity=.6+Math.sin(t*1.3)*.05},
 reset(){score=0;interest='design';resetDesign();resetCamp();drawPoster(posterTex,design);drawBudget(budgetTex,camp.split);if(noorTag)noorTag.visible=true;if(jonasTag)jonasTag.visible=true;if(kaiTag)kaiTag.visible=true}
};
TI.register(CFG);
})();
