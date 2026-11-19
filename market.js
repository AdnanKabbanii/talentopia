/* TALENTOPIA · Market Street Store (district config for interior.js)
   Store-manager check-in, an unhappy customer return on the shop floor, a Stockroom
   reorder-point calculation (daily sales × lead time + safety stock) with FIFO rotation,
   and a Pop-up Lab pricing decision where margin, markup and an illustrative demand rule
   are genuinely calculated from the student's price, ending with a founder debrief on
   testing demand. All people, products, shops and numbers are fictional. */
(()=>{
'use strict';
const TI=window.TalentopiaInterior;if(!TI)return;
const $=id=>document.getElementById(id);
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const money2=n=>'$'+n.toFixed(2);
const money=n=>'$'+Math.round(n).toLocaleString('en-US');
const pct=n=>(Math.round(n*1000)/10).toFixed(1)+'%';
let bag,blink=[],tomasTag,jordanTag,samTag,amaTag,stockTex,pitchTex,score=0,interest='retail';

/* ------------------------------------------------------------------ stockroom data (fictional) */
const SALES=[['Mon',22],['Tue',26],['Wed',25],['Thu',21],['Fri',27],['Sat',24],['Sun',23]];
const AVG=SALES.reduce((a,s)=>a+s[1],0)/SALES.length; // 24
const LEAD=5,SAFETY_DAYS=2,SAFETY=AVG*SAFETY_DAYS,ROP=AVG*LEAD+SAFETY; // 48, 168
const DAYS=['Mon','Tue','Wed','Thu','Fri','Sat','Sun'],START_STOCK=288;
const stockOn=i=>START_STOCK-AVG*i; // projected stock at the start of each day next week
const RIGHT_DAY=DAYS.findIndex((d,i)=>stockOn(i)<=ROP);

/* ------------------------------------------------------------------ pricing data (fictional, illustrative) */
const COST=6,COMP=12,MARGIN_TARGET=.40;
function demand(p){const base=Math.max(0,Math.round(260-15*p));return p>COMP?Math.round(base/2):base}
function priceStats(p){const units=demand(p);return {p,margin:(p-COST)/p,markup:(p-COST)/COST,unitProfit:p-COST,units,profit:units*(p-COST)}}
function bestAllowed(){let best=null;for(let c=COST*4;c<=COMP*4;c++){const s=priceStats(c/4);if(s.margin>=MARGIN_TARGET&&(!best||s.profit>best.profit))best=s}return best}

/* ------------------------------------------------------------------ live canvas textures */
function liveTex(w,h){const cv=document.createElement('canvas');cv.width=w;cv.height=h;const t=new THREE.CanvasTexture(cv);t.encoding=THREE.sRGBEncoding;return t}
function frameBg(x,W,H,c){const g=x.createLinearGradient(0,0,W,H);g.addColorStop(0,'#141a4a');g.addColorStop(1,'#0C1031');x.fillStyle=g;x.fillRect(0,0,W,H);x.strokeStyle=c;x.lineWidth=6;x.strokeRect(3,3,W-6,H-6)}
function drawStock(t,st){if(!t)return;const x=t.image.getContext('2d'),W=512,H=300;frameBg(x,W,H,'#8DE8C3');
 const rop=st.daily*st.lead+st.safety;x.fillStyle='#8DE8C3';x.font='bold 28px system-ui,sans-serif';x.fillText('Oat & Honey Bars · stock',22,42);
 x.fillStyle='#d6e0ff';x.font='19px system-ui,sans-serif';x.fillText(`Reorder point = ${st.daily} × ${st.lead} + ${st.safety} = ${rop}`,22,72);
 const sc=170/320,base=268;DAYS.forEach((d,i)=>{const v=stockOn(i),h=v*sc;x.fillStyle=st.day===i?'#FFD59C':v<=rop?'#ff9bb2':'#67DFF0';x.fillRect(40+i*64,base-h,40,h);x.fillStyle='#d6e0ff';x.font='15px system-ui,sans-serif';x.fillText(d,44+i*64,base+20)});
 const ry=base-rop*sc;x.strokeStyle='#FFD59C';x.setLineDash([10,8]);x.lineWidth=3;x.beginPath();x.moveTo(30,ry);x.lineTo(490,ry);x.stroke();x.setLineDash([]);x.fillStyle='#FFD59C';x.font='15px system-ui,sans-serif';x.fillText('reorder point',400,ry-6);
 t.needsUpdate=true}
function drawPitch(t,p){if(!t)return;const x=t.image.getContext('2d'),W=512,H=300,s=priceStats(p);frameBg(x,W,H,'#FFCCAB');
 x.fillStyle='#FFCCAB';x.font='bold 32px system-ui,sans-serif';x.fillText('Pitch: Loop Bottle',24,50);
 x.fillStyle='#d6e0ff';x.font='22px system-ui,sans-serif';['Reusable bottle · made locally','Unit cost $6.00 · rival price $12.00'].forEach((l,i)=>x.fillText(l,24,92+i*34));
 x.fillStyle='#FFD59C';x.fillRect(24,170,200,92);x.fillStyle='#0C1031';x.font='bold 50px system-ui,sans-serif';x.fillText(money2(p),40,234);
 x.fillStyle=s.margin>=MARGIN_TARGET&&p<=COMP?'#8DE8C3':'#ff9bb2';x.font='bold 24px system-ui,sans-serif';x.fillText('Margin '+pct(s.margin),250,204);x.fillStyle='#d6e0ff';x.font='20px system-ui,sans-serif';x.fillText(`~${s.units} sold / week`,250,240);
 t.needsUpdate=true}

/* ------------------------------------------------------------------ building */
function build(B){
 const {scene,C,M,glow,box,collider,hotspot,npc,person,textSprite,panelTexture,screen,shell,plant}=B;
 const PEACH=0xffccab;
 shell({lobby:0xe9e3d6,corridor:0xd6d0c4,left:0x8b8f9c,leftOpts:{roughness:.95},right:0xcdb59a,rightOpts:{roughness:.7},wall:0xf4f1ea,trim:PEACH});
 const navy=M(0x2f3a5e,{roughness:.35}),dark=M(0x1b1f33,{roughness:.4}),white=M(0xfaf8f3,{roughness:.35}),metal=M(0x9aa6c8,{metalness:.5,roughness:.35}),kraft=M(0xc49a6c,{roughness:.9}),wood=M(0xb88a5a,{roughness:.7});
 const prod=[0xf7a9d8,0x67dff0,0x8de8c3,0xffd59c,0x945cff,0xff9bb2,0xfafbff,0x5cbea3].map(c=>M(c,{roughness:.6}));
 // price-tag rail texture, shared by every shelf edge
 const tagTex=liveTex(512,32);{const x=tagTex.image.getContext('2d');x.fillStyle='#f4f1ea';x.fillRect(0,0,512,32);['$2.49','$3.99','$1.79','$4.50','$2.99','$5.25'].forEach((p,i)=>{x.fillStyle='#FFD23F';x.fillRect(8+i*85,4,70,24);x.fillStyle='#0C1031';x.font='bold 18px system-ui,sans-serif';x.fillText(p,16+i*85,22)});tagTex.needsUpdate=true}
 // lobby: checkout counter + Tomás at the standard desk position
 box(5,1.05,1.1,navy,0,.525,4);box(5.1,.06,1.2,glow(PEACH),0,1.08,4);box(5,.16,.02,glow(C.mint),0,.62,4.56);collider(-2.6,3.4,2.6,4.6);
 box(2,.02,.5,dark,-1.2,1.12,4.1);box(.5,.36,.05,dark,1.2,1.33,3.75).rotation.x=-.25;screen(.46,.3,panelTexture('Till 1',['Total  $14.97','Card ✓'],'#8DE8C3'),1.2,1.33,3.78);
 box(.12,.04,.18,dark,1.75,1.13,4.2);box(.08,.01,.06,glow(C.mint),1.75,1.155,4.2);box(.34,.38,.2,kraft,.4,1.3,4.15);
 const tomas=npc(person({skin:0xc98e66,hair:0x5a3b22,style:'short',outfit:0x2a7d74,badge:true}));tomas.position.set(0,0,2.9);scene.add(tomas);collider(-.35,2.55,.35,3.25);
 tomasTag=textSprite('Tomás','#FFCCAB',.75,'Store manager');tomasTag.position.set(0,2.35,2.9);scene.add(tomasTag);
 hotspot('manager',0,5.7,1.9,'Talk to Tomás, the store manager',[tomas]);
 bag=new THREE.Group();const bm=M(PEACH,{emissive:PEACH,emissiveIntensity:.35});const bb=new THREE.Mesh(new THREE.BoxGeometry(.5,.55,.24),bm);bag.add(bb);
 const hd=new THREE.Mesh(new THREE.TorusGeometry(.15,.025,8,24,Math.PI),glow(C.mint));hd.position.y=.27;bag.add(hd);bag.position.set(0,3.05,4);scene.add(bag);
 const sign=textSprite('Market Street Store','#FFCCAB',1.25,'Retail · Sales · Entrepreneurship');sign.position.set(0,3.4,.2);scene.add(sign);
 // shelving: a two-sided gondola and a wall shelf on the west side of the shop floor
 const gondola=(x,z0,z1,sides,depth,n)=>{const len=z1-z0,cz=(z0+z1)/2,back=sides.length>1?x:x-sides[0]*depth/2;
  box(depth,.14,len,navy,x,.07,cz);box(.05,1.75,len,white,back,.875,cz);
  [.4,.9,1.4].forEach((y,lv)=>{box(depth,.04,len,white,x,y,cz);
   for(const s of sides){for(let i=0;i<n;i++){const h=.22+((i+lv)%3)*.06;box(.3,h,.28,prod[(i*3+lv+(s>0?0:4))%prod.length],x+s*(depth/2-.2),y+.02+h/2,z0+.32+i*(len-.64)/(n-1))}
    screen(len,.07,tagTex,x+s*(depth/2+.006),y-.005,cz,s>0?Math.PI/2:-Math.PI/2)}});
  collider(x-depth/2,z0,x+depth/2,z1)};
 gondola(-6.6,6.6,11.6,[1,-1],.9,7);gondola(-9.5,3.4,12.4,[1],.55,8);
 const ga=textSprite('Snacks & drinks','#FFCCAB',.7);ga.position.set(-6.6,2.45,9.1);scene.add(ga);
 // self-checkout kiosks
 for(const x of [-6,-7.9]){box(.75,.95,.55,white,x,.475,1.1);const sc=box(.5,.36,.05,dark,x,1.22,1.25);sc.rotation.x=-.45;
  const sp=screen(.44,.3,panelTexture('Self checkout',['Scan an item'],'#67DFF0'),x,1.23,1.275);sp.rotation.x=-.45;
  box(.4,.02,.3,glow(C.cyan),x,.96,1.2);box(.45,.05,.4,metal,x+.6,.85,1.1);const l=box(.08,.08,.08,glow(C.mint),x-.3,1.45,1.05);blink.push(l);collider(x-.4,.8,x+.85,1.4)}
 const sct=textSprite('Self-checkout','#67DFF0',.7);sct.position.set(-6.9,2.35,1.1);scene.add(sct);
 // returns desk + Jordan (east)
 box(2.2,1.05,.8,white,7.8,.525,5.4);box(2.3,.06,.9,glow(PEACH),7.8,1.08,5.4);collider(6.65,4.95,8.95,5.85);
 const rt=textSprite('Returns & help','#FFCCAB',.75);rt.position.set(7.8,2.4,5.2);scene.add(rt);
 const jordan=npc(person({skin:0xa0663f,hair:0x1d1a1f,style:'short',outfit:0xff9bb2,pants:0x2a3358}));jordan.position.set(6.7,0,7);jordan.rotation.y=-Math.PI/4;scene.add(jordan);collider(6.35,6.65,7.05,7.35);
 const jb=box(.3,.18,.22,M(0x0c1031),6.5,1.0,7.2);jb.rotation.y=-Math.PI/4;
 jordanTag=textSprite('Jordan','#ff9bb2',.7,'Customer');jordanTag.position.set(6.7,2.3,7);scene.add(jordanTag);
 hotspot('customer',5.5,8.2,1.8,'Help Jordan at the returns desk',[jordan]);
 // new-product island, fridges, baskets, deals screen
 box(1.8,.8,1.1,wood,6.4,.4,12);collider(5.45,11.4,7.35,12.6);
 for(let r=0;r<3;r++)for(let i=0;i<3-r;i++){const b=new THREE.Mesh(new THREE.CylinderGeometry(.08,.08,.3,12),prod[(i+r)%4+1]);b.position.set(6.4+(i-(2-r)/2)*.3,.95+r*.31,12);scene.add(b)}
 const nw=textSprite('NEW · Loop Bottle','#8DE8C3',.7,'Coming to the pop-up');nw.position.set(6.4,2.35,12);scene.add(nw);
 for(const z of [10.2,12.3]){box(.9,2.1,1.9,dark,9.45,1.05,z);box(.02,1.8,1.7,M(0xbff3ff,{emissive:0x67dff0,emissiveIntensity:.35,transparent:true,opacity:.75}),8.99,1.1,z);
  for(const y of [.6,1.15,1.7])box(.5,.24,1.5,prod[Math.round(y*3)%prod.length],9.3,y,z)}
 collider(8.95,9.2,10,13.3);
 for(let i=0;i<4;i++)box(.5,.12,.36,M(C.violet),-3.5,.08+i*.13,12.9);collider(-3.8,12.65,-3.2,13.15);
 screen(3,1.75,panelTexture('Today’s deals',['Oat & Honey Bars 2 for $5','Loop Bottle pop-up: Sat','Bring your own bag ♻'],'#FFCCAB'),9.83,1.8,2.6,-Math.PI/2);
 plant(-3.7,.9);plant(3.7,.9);plant(9.2,13.6);plant(-9.2,13.3);
 const lw=new THREE.PointLight(0xfff1dd,.45,12);lw.position.set(0,3,8);scene.add(lw);
 const ss=textSprite('← Stockroom','#8DE8C3',.95);ss.position.set(-2.2,3.25,-10);scene.add(ss);
 const sp=textSprite('Pop-up Lab →','#FFCCAB',.95);sp.position.set(2.2,3.25,-10);scene.add(sp);

 // stockroom: racks, pallets, workbench + tablet, roller door
 for(const [x0,x1] of [[-17.3,-13.4],[-7.6,-3.8]])box(x1-x0,.02,.08,M(0xffd23f),(x0+x1)/2,.012,-13.9);
 box(.08,.02,8,M(0xffd23f),-12.6,.012,-10);box(.08,.02,8,M(0xffd23f),-8.4,.012,-10);
 const rack=(cx)=>{const len=3.8,z=-15.2;for(const sx of [-1,1])for(const sz of [-1,1])box(.06,2.4,.06,M(0x3d5afe,{metalness:.4,roughness:.4}),cx+sx*len/2,1.2,z+sz*.4);
  [.5,1.2,1.9].forEach((y,lv)=>{box(len,.05,.9,M(0xff8a3d,{roughness:.5}),cx,y,z);for(let i=0;i<4;i++){const h=.38+((i+lv)%2)*.12;box(.75,h,.6,kraft,cx-1.35+i*.9,y+.025+h/2,z)}});
  collider(cx-len/2-.05,-15.7,cx+len/2+.05,-14.7)};
 rack(-15.3);rack(-5.8);
 const fifo=textSprite('FIFO: oldest stock goes out first','#FFD59C',.8);fifo.position.set(-15.3,2.95,-14.9);scene.add(fifo);
 const pallet=(x,z,stack)=>{box(1.2,.14,1,wood,x,.07,z);for(let i=0;i<stack;i++){const lv=Math.floor(i/4),k=i%4;box(.55,.4,.45,kraft,x-.28+(k%2)*.56,.34+lv*.41,z-.24+Math.floor(k/2)*.48)}collider(x-.65,z-.55,x+.65,z+.55)};
 pallet(-16.4,-6.2,8);pallet(-5,-6,6);pallet(-16.4,-12.3,5);
 box(.12,2.6,3.2,M(0xb9bfd3,{metalness:.4,roughness:.5}),-17.78,1.3,-9.3);for(let i=0;i<6;i++)box(.14,.04,3.2,M(0x8a90a8),-17.72,.3+i*.42,-9.3);
 const dl=textSprite('Deliveries','#8DE8C3',.7);dl.position.set(-17.4,2.95,-9.3);scene.add(dl);
 box(2.8,.08,1.1,M(0x6b7088,{metalness:.3}),-10.5,.82,-11.2);for(const s of [-1,1])box(.08,.78,1,metal,-10.5+s*1.32,.39,-11.2);collider(-11.95,-11.8,-9.05,-10.6);
 stockTex=liveTex(512,300);drawStock(stockTex,{daily:20,lead:3,safety:0,day:-1});
 box(.62,.42,.04,dark,-10.5,1.1,-11.5).rotation.x=-.3;const tp=screen(.56,.36,stockTex,-10.5,1.105,-11.475);tp.rotation.x=-.3;
 box(.3,.25,.3,kraft,-11.5,.99,-11.1);const scn=box(.06,.16,.06,M(0xffd23f),-9.6,.94,-11);scn.rotation.z=.4;
 box(3.6,2.1,.06,M(0x0b0f26),-10.6,1.75,-15.8);screen(3.4,1.98,stockTex,-10.6,1.75,-15.76);
 const sam=npc(person({skin:0xe8b896,hair:0x1d1a1f,style:'bun',outfit:0xffd23f,pants:0x2a3358}));sam.position.set(-10.5,0,-12.5);scene.add(sam);collider(-10.85,-12.85,-10.15,-12.15);
 samTag=textSprite('Sam','#8DE8C3',.75,'Stock lead');samTag.position.set(-10.5,2.35,-12.5);scene.add(samTag);
 hotspot('stock',-10.5,-9.3,2,'Help Sam restock the bestseller',[sam]);
 const pj=box(.6,.12,1.1,M(0xff8a3d),-15.6,.1,-9.6);pj.rotation.y=.2;box(.06,1,.06,dark,-15.5,.6,-9.05);collider(-16,-10.2,-15.2,-9);
 const sl=new THREE.PointLight(0xfff3d6,.6,12);sl.position.set(-10.5,3,-10);scene.add(sl);

 // pop-up lab / founder's office
 pitchTex=liveTex(512,300);drawPitch(pitchTex,8);
 box(3.6,2.1,.06,M(0x0b0f26),12,1.75,-15.8);screen(3.4,1.98,pitchTex,12,1.75,-15.76);
 box(.06,1.9,3.6,M(0xffffff,{roughness:.25}),17.8,1.6,-10);
 screen(3.4,1.7,panelTexture('',[],'#2a2f58',x=>{x.fillStyle='#f6f7fb';x.fillRect(6,6,500,288);x.fillStyle='#2a2f58';x.font='bold 26px system-ui';x.fillText('Pop-up plan',24,44);
  ['1. Test: weekend pop-up, 100 bottles','2. Learn: sales + feedback','3. Decide: scale up or change','Price = cost + margin?'].forEach((l,i)=>{x.font='21px system-ui';x.fillText(l,24,92+i*44)});x.strokeStyle='#945CFF';x.lineWidth=4;x.beginPath();x.moveTo(380,250);x.lineTo(470,210);x.stroke()}),17.76,1.6,-10,-Math.PI/2);
 box(3,.08,1.1,wood,12,.78,-11.2);for(const s of [-1,1])box(.08,.74,1,metal,12+s*1.42,.37,-11.2);collider(10.45,-11.8,13.55,-10.6);
 box(.5,.03,.36,dark,11.2,.815,-11);const lp=box(.5,.32,.02,dark,11.2,.98,-11.2);lp.rotation.x=-.25;
 for(let i=0;i<3;i++){const b=new THREE.Mesh(new THREE.CylinderGeometry(.07,.07,.28,14),prod[i+1]);b.position.set(12.4+i*.22,.96,-11);scene.add(b)}
 const ama=npc(person({skin:0x4e2f1c,hair:0x1d1a1f,style:'long',outfit:0xf2f4ff,coat:0xffccab}));ama.position.set(12,0,-12.6);scene.add(ama);collider(11.65,-12.95,12.35,-12.25);
 amaTag=textSprite('Ama','#FFCCAB',.75,'Founder · Market Street Store');amaTag.position.set(12,2.35,-12.6);scene.add(amaTag);
 hotspot('founder',12,-9.3,2,'Price the pop-up product with Ama',[ama]);
 // pop-up stall prototype with striped awning
 box(2,.95,.8,white,6.3,.475,-13.6);for(const s of [-1,1])box(.06,2.2,.06,metal,6.3+s*.95,1.1,-13.95);
 for(let i=0;i<5;i++)box(.4,.06,1,M(i%2?0xfafbff:PEACH),5.5+i*.4,2.22,-13.75).rotation.x=.25;
 for(let i=0;i<4;i++){const b=new THREE.Mesh(new THREE.CylinderGeometry(.07,.07,.28,12),prod[i]);b.position.set(5.75+i*.36,1.09,-13.5);scene.add(b)}
 const st=textSprite('Pop-up prototype','#FFCCAB',.7);st.position.set(6.3,2.85,-13.6);scene.add(st);collider(5.25,-14.1,7.35,-13.15);
 for(const x of [15,16.4]){box(.7,.45,.7,M(0x8f86c9),x,.225,-5.4);box(.7,.5,.12,M(0x8f86c9),x,.6,-5.1);collider(x-.35,-5.75,x+.35,-5.05)}
 const fl=new THREE.PointLight(0xffe2c8,.55,12);fl.position.set(12,3,-10);scene.add(fl);
}

/* ------------------------------------------------------------------ customer return (dialogue) */
function talkCustomer(ix){
 const J='Jordan · Customer';
 if(ix.objIdx<1){ix.dialog(J,'Excuse me… oh, you’re new? Maybe check in with the manager first.',[{label:'I’ll be right back',fn:ix.closeDialog}]);return}
 if(ix.objIdx>1){ix.dialog(J,'Thanks again. That was actually a really good experience.',[{label:'Glad I could help',fn:ix.closeDialog}]);return}
 jordanTag.visible=false;
 ix.dialog(J,`<b>(clearly frustrated)</b> “I bought these wireless headphones here <b>10 days ago</b> and the left side has already stopped working! I’ve wasted my whole lunch break coming back here.”`,[{label:'Respond to Jordan',fn:q1}]);
 function q1(){ix.question('Returns · Step 1 of 3','Jordan is upset and talking loudly. What do you do first?',
  ['Stay calm, listen without interrupting, and acknowledge that it’s frustrating','Tell Jordan to calm down or leave the store','Walk off to find the manager without saying anything'],0,
  'Customers who feel <b>heard</b> calm down faster. Listening fully, staying calm and acknowledging their feelings (“I’m sorry, that’s really annoying”) is the first step in handling any complaint.',f=>{score+=f;q2()})}
 function q2(){ix.question('Returns · Step 2 of 3',`Jordan shows you the receipt. The store’s returns policy says:<div class="ix-info" style="margin-top:8px">Faulty items can be <b style="display:inline;font-size:12px">refunded or exchanged within 30 days</b> with proof of purchase.</div>What do you offer?`,
  ['Apologise, check the receipt, and offer an exchange or a refund under the policy','Refuse: Jordan probably broke them','Give a refund plus a $100 gift card so Jordan goes away happy'],0,
  'Follow the <b>policy</b>: it’s fair to every customer and protects the business. Ten days with a receipt is well within 30 days, so Jordan is entitled to a remedy. Inventing extras like a $100 gift card isn’t something a new team member can promise.',f=>{score+=f;q3()})}
 function q3(){ix.question('Returns · Step 3 of 3','Jordan would like an exchange, but that model is out of stock today. What now?',
  ['Explain honestly, then offer a refund or to order one in, and let Jordan choose','Say a new pair will definitely arrive tomorrow, even though you don’t know','Tell Jordan to try another shop'],0,
  'Be <b>honest</b> and give the customer a <b>choice</b>. Over-promising (“definitely tomorrow”) usually turns one complaint into two. A fair solution often turns an unhappy customer into a loyal one.',f=>{score+=f;
   ix.dialog(J,'“Okay… a refund is fine. Thanks for actually listening. I’ll definitely come back.”',[{label:'Back to work →',fn:()=>{ix.closeDialog();jordanTag.visible=true;const g=ix.awardOnce('market_return',40);ix.advance(2);ix.toast('✓ Return handled professionally'+(g?` · +${g} XP`:''))}}])})}
}

/* ------------------------------------------------------------------ stockroom: reorder point */
let stock;
function resetStock(){stock={daily:20,lead:3,safety:0,day:-1,tries:0,done:false}}
function renderStock(msg,cls){
 if(!$('stD'))return;const rop=stock.daily*stock.lead+stock.safety;
 $('stDv').textContent=stock.daily+' units/day';$('stLv').textContent=stock.lead+(stock.lead===1?' day':' days');$('stSv').textContent=stock.safety+' units';
 $('stRop').textContent=`${stock.daily} × ${stock.lead} + ${stock.safety} = ${rop} units`;
 $('stDays').querySelectorAll('button').forEach(b=>{const i=+b.dataset.d;b.classList.toggle('on',i===stock.day);b.style.borderColor=stockOn(i)<=rop?'#ff9bb288':''});
 if(stock.day>=0){const at=stockOn(stock.day),arrive=at-stock.daily*stock.lead;
  $('stArr').innerHTML=`${at} − ${stock.daily} × ${stock.lead} = <b style="color:${arrive<0?'#ff9bb2':'#8DE8C3'}">${arrive}</b>${arrive<0?' (stockout!)':''}`}
 else $('stArr').textContent='Pick an order day';
 const t=$('stTask');t.className='ix-task '+(cls||'');
 t.innerHTML=msg||'<b>Your goal:</b> set the three numbers from the data above, then choose the <b>first day</b> the projected stock is at or below your reorder point.';
 drawStock(stockTex,stock);
}
function openStock(ix){
 samTag.visible=false;
 ix.openPanel({hideAvatar:true,
  html:`<div class="k">Stockroom · Bestseller</div><h3>When should we reorder?</h3>
   <div class="ix-info" style="font-size:11.5px"><b>Oat &amp; Honey Bars</b>Sales last week: ${SALES.map(s=>`${s[0]} ${s[1]}`).join(' · ')}<br>Supplier note: “Deliveries arrive <b style="display:inline;font-size:11.5px">${LEAD} days</b> after you order.”<br>Store policy: “Keep <b style="display:inline;font-size:11.5px">${SAFETY_DAYS} days</b> of average sales as safety stock.”</div>
   <div class="ix-range"><label>Average daily sales <strong id="stDv"></strong></label><input type="range" id="stD" min="10" max="40" step="1" value="${stock.daily}" aria-label="Average daily sales"></div>
   <div class="ix-range"><label>Lead time <strong id="stLv"></strong></label><input type="range" id="stL" min="1" max="10" step="1" value="${stock.lead}" aria-label="Lead time in days"></div>
   <div class="ix-range"><label>Safety stock <strong id="stSv"></strong></label><input type="range" id="stS" min="0" max="120" step="6" value="${stock.safety}" aria-label="Safety stock in units"></div>
   <div class="ix-metric"><span>Reorder point = sales × lead time + safety</span><strong id="stRop"></strong></div>
   <div class="ix-note">Projected stock at the start of each day next week (no delivery yet). Days at or below your reorder point have a pink outline.</div>
   <div class="selectrow" id="stDays" style="margin:0">${DAYS.map((d,i)=>`<button data-d="${i}">${d} · ${stockOn(i)}</button>`).join('')}</div>
   <div class="ix-metric"><span>Stock left when the delivery arrives</span><strong id="stArr"></strong></div>
   <div class="ix-task" id="stTask"></div>
   <button class="ix-primary" id="stGo" style="margin-top:2px">Place the order →</button>
   <div class="ix-note">Fictional product and numbers. Real stores also adjust for seasons, promotions and supplier minimum orders.</div>`,
  bind(){
   const sl=(id,key)=>{const s=$(id);s.oninput=()=>{if(stock.done){s.value=stock[key];return}stock[key]=+s.value;renderStock()}};sl('stD','daily');sl('stL','lead');sl('stS','safety');
   $('stDays').querySelectorAll('button').forEach(b=>b.onclick=()=>{if(stock.done)return;stock.day=+b.dataset.d;renderStock()});
   const finishBtn=()=>{const g=$('stGo');g.textContent='Continue →';g.onclick=()=>{ix.closePanel();afterStock(ix)}};
   if(stock.done){renderStock(`<b>✓ Order placed on ${DAYS[RIGHT_DAY]}.</b> Reorder point ${ROP} units.`,'ok');finishBtn();return}
   renderStock();
   $('stGo').onclick=()=>{
    if(stock.daily!==AVG){stock.tries++;renderStock(`<b>Check average daily sales.</b> Add up last week’s sales and divide by 7 days.`,'no');return}
    if(stock.lead!==LEAD){stock.tries++;renderStock('<b>Check the lead time.</b> How many days does the supplier take to deliver?','no');return}
    if(stock.safety!==SAFETY){stock.tries++;renderStock(`<b>Check the safety stock.</b> The policy is ${SAFETY_DAYS} days of average sales: ${SAFETY_DAYS} × your daily sales.`,'no');return}
    if(stock.day<0){renderStock('<b>Almost!</b> Now pick the day to place the order.','no');return}
    if(stock.day!==RIGHT_DAY){stock.tries++;renderStock(stock.day<RIGHT_DAY?`<b>A bit early.</b> On ${DAYS[stock.day]} you still have ${stockOn(stock.day)} units, above the reorder point. Ordering too early ties up cash and shelf space, and bars can pass their best-before date.`:`<b>Too late.</b> By ${DAYS[stock.day]} stock is ${stockOn(stock.day)}, below the reorder point, so you’d eat into the safety stock or run out before the delivery arrives.`,'no');return}
    stock.done=true;score+=stock.tries===0?1:0;
    renderStock(`<b>✓ Order placed on ${DAYS[RIGHT_DAY]}.</b> ${AVG} × ${LEAD} + ${SAFETY} = <b>${ROP}</b>. The delivery should arrive with about ${SAFETY} bars still on the shelf: that buffer protects you if sales spike or the truck is late.`,'ok');finishBtn()}},
  camera(p,l){const m=innerWidth<=760,o=m?0:.75;p.set(-10.5+o,m?3.1:2.4,m?-6.6:-8.5);l.set(-10.5+o,m?.4:1.15,-12.2)},
  onClose(){samTag.visible=true}});
}
function afterStock(ix){
 ix.question('Sam · Stock lead','The delivery arrives. The bars already on the shelf are best before <b>next week</b>; the new ones are best before <b>next month</b>. How do you stock the shelf?',
  ['Move the older bars to the front and put the new delivery behind them (first in, first out)','Put the new bars at the front because they look fresher','Mix them up randomly, since it makes no difference'],0,
  '<b>FIFO</b> (first in, first out) means the oldest stock sells first. It cuts waste from expired products and keeps food safe, which matters for any store selling perishable goods.',f=>{score+=f;
   ix.dialog('Sam · Stock lead','Shelf rotated, order placed. You’d make a great stock lead! Ama, our founder, is in the <b>Pop-up Lab</b> across the corridor. She needs help pricing a new product.',[{label:'On my way →',fn:()=>{ix.closeDialog();const g=ix.awardOnce('market_stock',60);ix.advance(3);ix.toast('✓ Restock planned'+(g?` · +${g} XP`:''))}}])});
}
function talkStock(ix){
 const S='Sam · Stock lead';
 if(ix.objIdx<2){ix.dialog(S,'Hi! The shop floor needs you first. Come back once Tomás and the customers are sorted.',[{label:'Got it',fn:ix.closeDialog}]);return}
 if(ix.objIdx>2){ix.dialog(S,'Order’s confirmed with the supplier. Thanks for the help!',[{label:'Anytime',fn:ix.closeDialog}]);return}
 ix.dialog(S,`Hey ${ix.name}! Our <b>Oat &amp; Honey Bars</b> are a bestseller. If we reorder too late we run out; too early and they sit here going stale. Let’s work out the <b>reorder point</b>.`,[{label:'Open the stock tablet →',fn:()=>{ix.closeDialog();openStock(ix)}}]);
}

/* ------------------------------------------------------------------ pop-up lab: pricing */
let pricing;
function resetPricing(){pricing={p:8,tries:0,done:false,s:null}}
function renderPricing(msg,cls){
 if(!$('prP'))return;const s=priceStats(pricing.p),okM=s.margin>=MARGIN_TARGET,okC=pricing.p<=COMP;
 $('prPv').textContent=money2(pricing.p);
 $('prM').textContent=pct(s.margin)+(okM?' ✓':' ✕');$('prM').style.color=okM?'#8DE8C3':'#ff9bb2';
 $('prK').textContent=pct(s.markup);$('prU').textContent=money2(s.unitProfit);
 $('prC').textContent=money2(pricing.p)+(okC?' ≤ ':' > ')+money2(COMP)+(okC?' ✓':' ✕');$('prC').style.color=okC?'#8DE8C3':'#ff9bb2';
 $('prQ').textContent=s.units+' bottles'+(pricing.p>COMP?' (half switch to the rival)':'');$('prW').textContent=money2(s.profit);
 const t=$('prTask');t.className='ix-task '+(cls||'');
 t.innerHTML=msg||`<b>Your goal:</b> a profit margin of at least <b>${MARGIN_TARGET*100}%</b> while staying at or below the rival’s price of <b>${money2(COMP)}</b>.`;
 drawPitch(pitchTex,pricing.p);
}
function openPricing(ix){
 amaTag.visible=false;
 ix.openPanel({hideAvatar:true,
  html:`<div class="k">Pop-up Lab · New product</div><h3>Price the Loop Bottle</h3>
   <div class="ix-info"><b>The numbers</b>Unit cost (making + shipping): <b style="display:inline;font-size:12px;color:#FFCCAB">${money2(COST)}</b><br>A similar bottle at a rival shop: <b style="display:inline;font-size:12px;color:#FFCCAB">${money2(COMP)}</b></div>
   <div class="ix-range"><label>Selling price <strong id="prPv"></strong></label><input type="range" id="prP" min="6" max="16" step="0.25" value="${pricing.p}" aria-label="Selling price"></div>
   <div class="ix-metric"><span>Profit margin = (price − cost) ÷ price</span><strong id="prM"></strong></div>
   <div class="ix-metric"><span>Markup = (price − cost) ÷ cost</span><strong id="prK"></strong></div>
   <div class="ix-metric"><span>Profit per bottle</span><strong id="prU"></strong></div>
   <div class="ix-metric"><span>Competitive price?</span><strong id="prC"></strong></div>
   <div class="ix-metric"><span>Est. sold per week</span><strong id="prQ"></strong></div>
   <div class="ix-metric"><span>Est. weekly profit</span><strong id="prW"></strong></div>
   <div class="ix-task" id="prTask"></div>
   <button class="ix-primary" id="prGo" style="margin-top:2px">Set this price →</button>
   <div class="ix-note"><b style="color:#bceeff">Illustrative demand rule (a teaching assumption, not real data):</b> bottles sold per week = 260 − 15 × price. Above the rival’s price, half of those shoppers buy from the rival instead. Real demand must be tested with real customers.</div>`,
  bind(){
   const s=$('prP');s.oninput=()=>{if(pricing.done){s.value=pricing.p;return}pricing.p=+s.value;renderPricing()};
   const finishBtn=()=>{const g=$('prGo');g.textContent='Continue →';g.onclick=()=>{ix.closePanel();afterPricing(ix)}};
   if(pricing.done){renderPricing(`<b>✓ Price set at ${money2(pricing.p)}.</b>`,'ok');finishBtn();return}
   renderPricing();
   $('prGo').onclick=()=>{const st=priceStats(pricing.p);pricing.tries++;
    if(st.margin<MARGIN_TARGET){renderPricing(`<b>Not yet.</b> A ${pct(st.margin)} margin is below ${MARGIN_TARGET*100}%. After paying for the bottle, too little of each sale is left to cover rent, wages and other costs.`,'no');return}
    if(pricing.p>COMP){renderPricing(`<b>Not yet.</b> At ${money2(pricing.p)} you’re dearer than the rival’s ${money2(COMP)} for a similar bottle, so many shoppers would go there instead (see the weekly sales).`,'no');return}
    pricing.done=true;pricing.s=st;score+=pricing.tries===1?1:0;const best=bestAllowed();
    const near=st.profit>=best.profit-5;
    renderPricing(`<b>✓ Price set!</b> ${pct(st.margin)} margin, ${pct(st.markup)} markup, about ${money2(st.profit)} profit a week in this model. ${near?'That’s at or near the best weekly profit the model allows.':`In this model, ${money2(best.p)} would earn the most (${money2(best.profit)} a week): a higher price sells fewer bottles but earns more on each.`}`,'ok');finishBtn()}},
  camera(p,l){const m=innerWidth<=760,o=m?0:.8;p.set(12+o,m?3.2:2.45,m?-6.4:-8.3);l.set(12+o,m?.45:1.2,-12.4)},
  onClose(){amaTag.visible=true}});
}
function afterPricing(ix){
 const A='Ama · Founder';
 ix.question(A,'Ama: “Quick check before we print the price tags. A bottle costs $6 and sells for $10. Which is right?”',
  ['Margin is 40% (profit ÷ price) and markup is 66.7% (profit ÷ cost)','Margin is 66.7% and markup is 40%','Margin and markup are always the same number'],0,
  'Both use the same $4 profit, but <b>margin</b> divides by the <b>selling price</b> ($4 ÷ $10 = 40%) while <b>markup</b> divides by the <b>cost</b> ($4 ÷ $6 ≈ 66.7%). Mixing them up is a classic pricing mistake that can wipe out profit.',f=>{score+=f;
   const g=ix.awardOnce('market_pricing',60);if(g)ix.toast(`✓ Price set · +${g} XP`);
   const s=pricing.s;
   ix.dialog(A,`Great pricing work, ${ix.name}.<div class="vitals"><div>Price<b>${money2(s.p)}</b></div><div>Margin<b>${pct(s.margin)}</b></div><div>Markup<b>${pct(s.markup)}</b></div><div>Est. / week<b>${s.units}</b></div></div>Now the big decision.`,[{label:'What decision?',fn:()=>
    ix.question('Debrief · Starting a small business','Ama: “I’m excited about the Loop Bottle, but nobody has bought one yet. What should we do first?”',
     ['Run a small pilot, like a weekend pop-up with 100 bottles, to test real demand and get feedback before investing big','Order 10,000 bottles now to get the cheapest unit cost','Take out a big loan for a new shop before anyone has tried the product'],0,
     'Smart founders <b>test demand cheaply</b> first: a small pilot shows whether people really buy, at what price, and what to improve, without risking all your cash. Our demand rule is only a guess until real customers prove it. Scale up once the evidence is in.',f2=>{score+=f2;
      ix.dialog(A,`You calmed an unhappy customer, planned stock like a pro and priced a product with real maths. That’s retail and entrepreneurship in one shift, ${ix.name}!`,[{label:'Finish my shift →',fn:()=>ix.finish({icon:'▣',title:'Market Street Entrepreneur',score,max:8,
       skills:['☺ Handling a complaint calmly and fairly','↺ Following a returns policy honestly','▦ Calculating a reorder point with safety stock','⇄ Rotating stock first in, first out','% Pricing with margin vs markup','✦ Testing demand with a small pilot']})}])})}])});
}
function talkFounder(ix){
 const A='Ama · Founder';
 if(ix.objIdx<3){ix.dialog(A,'Hi! I’m Ama, I started this store. I’d love your help in the Pop-up Lab later, but Tomás and Sam need you first.',[{label:'See you soon',fn:ix.closeDialog}]);return}
 if(ix.objIdx>3){ix.dialog(A,'The pop-up is booked for Saturday. Thanks for your help!',[{label:'Good luck, Ama',fn:ix.closeDialog}]);return}
 ix.dialog(A,`${ix.name}, welcome to the Pop-up Lab! I started Market Street Store with one market stall. Now I want to sell our own <b>Loop Bottle</b>. The big question: what price?`,[{label:'Let’s do the maths →',fn:()=>{ix.closeDialog();openPricing(ix)}}]);
}

/* ------------------------------------------------------------------ store manager */
function talkManager(ix){
 const T='Tomás · Store manager';
 if(ix.objIdx===0){
  ix.dialog(T,`Welcome to Market Street Store, <b>${ix.name}</b>! I’m Tomás, the store manager. Today you’ll help on the shop floor, in the stockroom and in Ama’s Pop-up Lab. Everyone and everything here is fictional. What interests you most?`,
   [['Working with customers','retail'],['Sales and stock','sales'],['Starting my own business','startup']].map(([label,v])=>({label,fn:()=>{interest=v;
    ix.dialog(T,(v==='startup'?'Great! Ama, our founder, will love that. You’ll meet her in the Pop-up Lab. ':v==='sales'?'Great! Sam in the stockroom will show you how we never run out. ':'Great! Customer service is the heart of retail. ')+'First up: <b>Jordan</b> is waiting at the <b>returns desk</b>, to your right, and isn’t happy.',
     [{label:'I’ll handle it →',fn:()=>{ix.closeDialog();ix.nova.visible=true;ix.advance(1);ix.toast('✓ Checked in. NOVA has joined you.')}}])}})));return}
 if(ix.objIdx<4){ix.dialog(T,`Keep going, ${ix.name}! Next: <b>${CFG.objectives[ix.objIdx][0].toLowerCase()}</b>.`,[{label:'On it',fn:ix.closeDialog}]);return}
 ix.dialog(T,'Fantastic shift. You’re welcome back on the team any time.',[{label:'Thanks, Tomás',fn:ix.closeDialog}]);
}

const CFG={id:'market',title:'Market Street Store',subtitle:'Retail trainee shift',enterLabel:'▣ Enter Market Street Store: start a 3D shift →',badge:'Market Street Entrepreneur',
 objectives:[['Check in with Tomás, the store manager',[0,5.7]],['Help Jordan at the returns desk',[5.5,8.2]],['Plan the restock in the Stockroom',[-10.5,-9.3]],['Price the pop-up product with Ama',[12,-9.3]],['Get your feedback and badge',null]],
 hints:['Welcome to <b>Market Street</b>! I’m <b>NOVA</b>, your learning guide. Check in with <b>Tomás</b>, the store manager, at the checkout counter.',
  'Jordan is waiting at the <b>returns desk</b> on the right side of the shop floor. Listen first!',
  'Customer happy! Head up the corridor to the <b>Stockroom</b>, first door on the left. Sam needs a reorder plan.',
  'Order placed! Cross the corridor to the <b>Pop-up Lab</b>. Ama, the founder, needs a price.',
  'Shift complete. Open your <b>Career Passport</b> to see your new badge.'],
 build,
 interact(id,ix){const f={manager:talkManager,customer:talkCustomer,stock:talkStock,founder:talkFounder}[id];if(f)f(ix)},
 frame(dt,t){bag.rotation.y+=dt*.8;bag.position.y=3.05+Math.sin(t*1.5)*.06;blink.forEach((b,i)=>{b.material.emissiveIntensity=Math.sin(t*3+i*1.7)>0?1.1:.2})},
 reset(){score=0;interest='retail';resetStock();resetPricing();drawStock(stockTex,stock);drawPitch(pitchTex,pricing.p);[tomasTag,jordanTag,samTag,amaTag].forEach(s=>{if(s)s.visible=true})}
};
TI.register(CFG);
})();
