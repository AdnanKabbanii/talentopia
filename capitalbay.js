/* TALENTOPIA · Capital Bay Bank (district config for interior.js)
   Branch-manager check-in, a teller customer (identity checks + compound interest),
   a business-loan assessment with live affordability maths (DSCR), and a stress-test
   recommendation. All customers and numbers are fictional and illustrative. */
(()=>{
'use strict';
const TI=window.TalentopiaInterior;if(!TI)return;
const $=id=>document.getElementById(id);
const money=n=>'$'+Math.round(n).toLocaleString('en-US');
const APR=.08,CASH=2100,EXISTING=600,REVENUE=18000,COSTS=15900,NEED=20000,TARGET=1.25;
const payment=(A,n)=>{const r=APR/12;return A*r/(1-Math.pow(1+r,-n))};
const dscrOf=pay=>CASH/(EXISTING+pay);
const show2=x=>(Math.floor(x*100)/100).toFixed(2);
let coin,laylaTag,score=0,loanFirst=true,loan=null;

function build(B){
 const {scene,C,M,glow,box,collider,hotspot,npc,person,textSprite,panelTexture,screen,shell,plant}=B;
 const GOLD=0xe8b85c;
 shell({lobby:0xd3cde2,corridor:0xc2bcd9,left:0x2a2f58,leftOpts:{roughness:.9},right:0x1d2247,rightOpts:{roughness:.4,metalness:.3},wall:0xe4e0ee,trim:C.gold});
 // lobby: welcome desk + Omar
 box(5,1.05,1.1,M(0x26305c,{roughness:.35,metalness:.2}),0,.525,4);box(5.1,.06,1.2,glow(C.gold),0,1.08,4);box(5,.16,.02,glow(C.gold),0,.62,4.56);collider(-2.6,3.4,2.6,4.6);
 const omar=npc(person({skin:0xc98e66,hair:0x1d1a1f,style:'short',outfit:0xf2f4ff,coat:0x24305e,tie:C.gold,badge:true}));omar.position.set(0,0,2.9);scene.add(omar);collider(-.35,2.55,.35,3.25);
 const ot=textSprite('Omar','#FFD59C',.75,'Branch manager');ot.position.set(0,2.35,2.9);scene.add(ot);hotspot('manager',0,5.7,1.9,'Talk to Omar, the branch manager',[omar]);
 coin=new THREE.Mesh(new THREE.CylinderGeometry(.42,.42,.08,40),M(GOLD,{metalness:.8,roughness:.25,emissive:0x8a6420,emissiveIntensity:.4}));coin.rotation.x=Math.PI/2;coin.position.set(0,3.05,4);scene.add(coin);
 const sign=textSprite('Capital Bay Bank','#FFD59C',1.25,'Banking & finance · Talent City');sign.position.set(0,3.4,.2);scene.add(sign);
 // teller counter (east side) + Mr. Karim
 box(1,1.1,5.6,M(0xf3f1fa,{roughness:.3}),7.3,.55,7);box(1.1,.06,5.7,glow(C.gold),7.3,1.13,7);box(.06,.7,5.6,M(0xa9dcff,{transparent:true,opacity:.3,metalness:.6,roughness:.1}),7.3,1.5,7);collider(6.8,4.2,7.8,9.8);
 const karim=npc(person({skin:0xa0663f,hair:0x8a8a8a,style:'short',outfit:0x4a6b8a}));karim.position.set(8.6,0,7);karim.rotation.y=-Math.PI/2;scene.add(karim);collider(8.3,6.7,8.9,7.3);
 const kt=textSprite('Mr. Karim','#67DFF0',.7,'Customer');kt.position.set(8.6,2.3,7);scene.add(kt);
 const tt=textSprite('Teller station','#FFD59C',.8);tt.position.set(7.3,2.75,4.6);scene.add(tt);
 hotspot('teller',5.9,7,1.7,'Serve Mr. Karim at the teller station',[karim]);
 // waiting area, ATM, queue screen
 box(3,.45,.8,M(0x5b5f9e),-6.5,.225,9);box(3,.5,.12,M(0x5b5f9e),-6.5,.6,9.4);collider(-8,8.6,-5,9.5);
 box(.7,1.6,.5,M(0x26305c),-9.55,.8,12);box(.04,.4,.3,glow(C.cyan),-9.29,1.25,12);collider(-9.9,11.7,-9.2,12.3);
 screen(3,1.75,panelTexture('Now serving',['Ticket A-042 → Teller 1','Business loans → Office 2','Vault & risk → staff only'],'#FFD59C'),-9.83,1.8,6.5,Math.PI/2);
 screen(3,1.75,panelTexture('Savings rate today',['5.0% per year','compounded yearly','(illustrative)'],'#8DE8C3'),9.83,1.8,11.6,-Math.PI/2);
 plant(-9.2,.9);plant(9.2,.9);plant(-3.7,.9);plant(3.7,.9);plant(9.2,13.1);
 const la=textSprite('← Loan Office','#67DFF0',.95);la.position.set(-2.2,3.25,-10);scene.add(la);
 const lv=textSprite('Vault & Risk Desk →','#FFD59C',.95);lv.position.set(2.2,3.25,-10);scene.add(lv);
 // loan office
 const wood=M(0x5a4636,{roughness:.6});box(2.6,.08,1.2,wood,-10.5,.78,-11.2);for(const s of [-1,1])box(.08,.74,1.1,wood,-10.5+s*1.22,.37,-11.2);collider(-11.85,-11.85,-9.15,-10.55);
 box(.5,.32,.03,M(0x1b1f33),-10.5,.98,-11.5).rotation.x=-.2;screen(.46,.28,panelTexture('Loan application',['Layla’s Café','Requested: $20,000+'],'#67DFF0'),-10.5,.98,-11.48);
 const layla=npc(person({skin:0xe8b896,hair:0x5a3b22,style:'long',outfit:0x2a7d74}));layla.position.set(-10.5,0,-12.5);scene.add(layla);collider(-10.85,-12.85,-10.15,-12.15);
 const lt=textSprite('Layla','#F7A9D8',.75,'Owner · Layla’s Café');lt.position.set(-10.5,2.35,-12.5);scene.add(lt);laylaTag=lt;
 for(const s of [-1,1]){box(.5,.45,.5,M(0x8f86c9),-10.5+s*.8,.225,-9.9);collider(-10.5+s*.8-.25,-10.15,-10.5+s*.8+.25,-9.65)}
 screen(3.2,1.9,panelTexture('Layla’s Café · monthly',['Revenue $18,000','Costs $15,900'],'#F7A9D8',x=>{const bars=[15.2,16,17.1,18,18.6,17.4];bars.forEach((v,i)=>{x.fillStyle='#F7A9D8';x.fillRect(330+i*26,270-v*7,18,v*7)})}),-14.5,1.75,-15.83);
 screen(3.2,1.9,panelTexture('Loan basics',['Principal = amount borrowed','APR = yearly interest rate','DSCR = cash ÷ debt payments'],'#67DFF0'),-7,1.75,-15.83);
 const ol=new THREE.PointLight(0xffe2b0,.5,10);ol.position.set(-10.5,3,-10.5);scene.add(ol);
 hotspot('loan',-10.5,-9.3,2,'Meet Layla about her business loan',[layla]);
 // vault & risk desk
 const vault=new THREE.Group();const door=new THREE.Mesh(new THREE.CylinderGeometry(1.35,1.35,.3,48),M(GOLD,{metalness:.85,roughness:.3}));door.rotation.x=Math.PI/2;vault.add(door);
 const hub=new THREE.Mesh(new THREE.CylinderGeometry(.25,.25,.4,24),M(0xb08a3e,{metalness:.9,roughness:.25}));hub.rotation.x=Math.PI/2;vault.add(hub);
 for(let i=0;i<3;i++){const sp=box(1.5,.07,.07,M(0xb08a3e,{metalness:.9,roughness:.25}),0,0,.2,vault);sp.rotation.z=i*Math.PI/3}
 vault.position.set(12,1.55,-15.7);scene.add(vault);vault.userData.wheel=vault.children.slice(2);
 const vt=textSprite('Vault','#FFD59C',.7,'Authorized staff only');vt.position.set(12,3.35,-15.4);scene.add(vt);
 box(3.2,.08,1,M(0x26305c),7.5,.76,-12.5);for(const s of [-1,1])box(.08,.72,.9,M(0x26305c),7.5+s*1.5,.36,-12.5);collider(5.85,-13.05,9.15,-11.95);
 [[6.6,'#8DE8C3'],[7.5,'#FFD59C'],[8.4,'#67DFF0']].forEach(([x,c],i)=>{screen(.8,.5,panelTexture(['Rates','Risk','Deposits'][i],[],c,ctx=>{ctx.strokeStyle=c;ctx.lineWidth=6;ctx.beginPath();for(let k=0;k<9;k++){const y=230-Math.sin(k*.9+i)*40-k*8;k?ctx.lineTo(40+k*55,y):ctx.moveTo(40,y)}ctx.stroke()}),x,1.2,-12.92)});
 const vl=new THREE.PointLight(0xffd59c,.6,10);vl.position.set(12,3,-12);scene.add(vl);
 hotspot('vault',12,-13.7,1.8,'Look at the vault',[vault]);
}

/* ------------------------------------------------------------------ teller */
function teller(ix){
 const K='Mr. Karim · Customer';
 if(ix.objIdx<1){ix.dialog(K,'Hello! I think the branch manager, Omar, wanted to see you first.',[{label:'I’ll go check in',fn:ix.closeDialog}]);return}
 if(ix.objIdx>1){ix.dialog(K,'Thanks again! My savings account is all set.',[{label:'Have a great day',fn:ix.closeDialog}]);return}
 ix.dialog(K,`Hello, ${ix.name}! I’d like to open a savings account and deposit <b>$2,000</b>.`,[{label:'Happy to help',fn:q1}]);
 function q1(){ix.question('Teller · Step 1 of 2','Before you open the account, what must you do first?',
  ['Verify his identity with official ID, following “know your customer” (KYC) rules','Open it straight away, since he seems friendly','Ask for his online banking password to set things up'],0,
  'Banks must confirm who their customers are (<b>know your customer</b>, or KYC) to help prevent fraud and money laundering. A bank should never ask for a customer’s password.',f=>{score+=f;q2()})}
 function q2(){ix.question('Teller · Step 2 of 2','The account pays <b>5% interest per year, compounded yearly</b>. If Mr. Karim adds nothing, how much will his $2,000 be worth after 2 years?',
  ['$2,205','$2,200','$2,100'],0,
  'Year 1: $2,000 × 1.05 = $2,100. Year 2: $2,100 × 1.05 = <b>$2,205</b>. With <b>compound interest</b> you earn interest on your interest; simple interest would give $2,200.',f=>{score+=f;
   ix.dialog(K,'Perfect, that’s clear. Thank you for explaining it so well!',[{label:'Next customer →',fn:()=>{ix.closeDialog();const g=ix.awardOnce('capital_teller',40);ix.advance(2);ix.toast('✓ Customer served'+(g?` · +${g} XP`:''))}}])})}
}

/* ------------------------------------------------------------------ loan desk */
function loanDesk(ix){
 const L='Layla · Owner, Layla’s Café';
 if(ix.objIdx<2){ix.dialog(L,'Hi! I have an appointment for a business loan, but I think you’re needed at the teller station first.',[{label:'I’ll be back',fn:ix.closeDialog}]);return}
 if(ix.objIdx>2){ix.dialog(L,`Thanks, ${ix.name}! I’ll wait to hear the bank’s final decision.`,[{label:'Speak soon',fn:ix.closeDialog}]);return}
 ix.dialog(L,`Hi, I’m Layla. I run <b>Layla’s Café</b> on Market Street. I want to add a second espresso bar and outdoor seating, so I need to borrow <b>at least $20,000</b>. Can the bank help?`,[{label:'Let’s look at the numbers →',fn:()=>{ix.closeDialog();openLoanPanel(ix)}}]);
}
function openLoanPanel(ix){
 ix.openPanel({hideAvatar:true,
  html:`<div class="k">Loan desk · Layla’s Café</div><h3>Business loan assessment</h3>
  <div class="ix-info"><b>Monthly financials</b>Revenue ${money(REVENUE)} − operating costs ${money(COSTS)} = <b style="display:inline;font-size:12px;color:#8DE8C3">${money(CASH)}</b> cash available for loan payments.<br>Existing loan payments: ${money(EXISTING)} · Credit score: 712 (good)</div>
  <div class="ix-range"><label>Loan amount <strong id="lnAmt"></strong></label><input type="range" id="lnA" min="10000" max="40000" step="1000" value="24000" aria-label="Loan amount"></div>
  <div class="ix-range"><label>Repayment term <strong id="lnTerm"></strong></label><input type="range" id="lnT" min="12" max="60" step="12" value="24" aria-label="Repayment term in months"></div>
  <div class="ix-metric"><span>Interest rate (APR, fixed)</span><strong>8.0%</strong></div>
  <div class="ix-metric"><span>New monthly payment</span><strong id="lnPay"></strong></div>
  <div class="ix-metric"><span>Total interest over the loan</span><strong id="lnInt"></strong></div>
  <div class="ix-metric"><span>DSCR = ${money(CASH)} ÷ all loan payments</span><strong id="lnDscr"></strong></div>
  <div class="ix-task" id="lnTask"></div>
  <button class="ix-primary" id="lnSubmit" style="margin-top:4px">Submit my recommendation</button>
  <div class="ix-note">Illustrative teaching numbers. DSCR (debt service coverage ratio) shows how many times cash flow covers loan payments. Many lenders look for about 1.25 or more, but real policies vary. Not a lending offer.</div>`,
  bind(){const calc=()=>{const A=+$('lnA').value,n=+$('lnT').value,p=payment(A,n),d=dscrOf(p);
    $('lnAmt').textContent=money(A);$('lnTerm').textContent=n+' months';$('lnPay').textContent=money(p);$('lnInt').textContent=money(p*n-A);
    const ok=d>=TARGET;$('lnDscr').textContent=show2(d)+(ok?' ✓':' ✕');$('lnDscr').style.color=ok?'#8DE8C3':'#ff9bb2';
    $('lnTask').className='ix-task';$('lnTask').innerHTML=`<b>Your goal:</b> lend Layla <b>at least ${money(NEED)}</b> while keeping DSCR at <b>${TARGET.toFixed(2)} or higher</b>, so she can still afford every payment.`;};
   $('lnA').oninput=calc;$('lnT').oninput=calc;calc();
   $('lnSubmit').onclick=()=>{const A=+$('lnA').value,n=+$('lnT').value,p=payment(A,n),d=dscrOf(p);const t=$('lnTask');
    if(A<NEED){loanFirst=false;t.className='ix-task no';t.innerHTML=`<b>Not yet.</b> Layla needs at least ${money(NEED)} for the expansion. A loan that’s too small won’t pay for the project.`;return}
    if(d<TARGET){loanFirst=false;t.className='ix-task no';t.innerHTML=`<b>Not yet.</b> A DSCR of ${show2(d)} is below ${TARGET.toFixed(2)}: the payments would leave Layla too little safety margin. Try a <b>longer term</b> or a <b>smaller amount</b>.`;return}
    loan={A,n,p,d};score+=loanFirst?1:0;ix.closePanel();afterLoan(ix);};},
  camera(p,l){const m=innerWidth<=760;p.set(-10.5,m?3.1:2.45,m?-6.4:-8.1);l.set(-10.5,m?.35:1.05,-12.2)},
  onClose(){laylaTag.visible=true}});laylaTag.visible=false;
}
function afterLoan(ix){
 const L='Layla · Owner, Layla’s Café';const short=payment(loan.A,12),shortInt=short*12-loan.A,myInt=loan.p*loan.n-loan.A;
 ix.dialog(L,`That works for me: <b>${money(loan.A)}</b> over <b>${loan.n} months</b> at about <b>${money(loan.p)} a month</b>. Thank you!`,[{label:'One more check',fn:()=>
  ix.question('Loan desk · Trade-off','A longer repayment term lowers Layla’s monthly payment. What is the trade-off?',
   ['She pays more interest in total over the life of the loan','There is no downside at all','The interest rate drops to 0%'],0,
   `Spreading payments out makes each one smaller, but interest is charged for longer. For ${money(loan.A)}, total interest is about <b>${money(myInt)}</b> over ${loan.n} months versus ${money(shortInt)} over 12 months.`,f=>{score+=f;ix.closeDialog();
    const g=ix.awardOnce('capital_loan',60);ix.advance(3);ix.toast('✓ Loan assessed'+(g?` · +${g} XP`:''))})}]);
}

/* ------------------------------------------------------------------ manager */
function manager(ix){
 const O='Omar · Branch manager';
 if(ix.objIdx===0){
  ix.dialog(O,`Welcome to Capital Bay, <b>${ix.name}</b>! I’m Omar, the branch manager. Today you’re a trainee banking analyst: first at the teller station, then on a business-loan decision. All customers and numbers here are fictional.`,[
   {label:'What does a banking analyst do?',fn:()=>ix.dialog(O,'We help customers manage money safely, check that borrowing is affordable and look after the bank’s risk. The numbers matter, and so does treating people fairly.',[{label:'Let’s start →',fn:start}])},
   {label:'I’m ready →',fn:start}]);return}
 if(ix.objIdx<3){ix.dialog(O,`Keep going, ${ix.name}! Next: <b>${CFG.objectives[ix.objIdx][0].toLowerCase()}</b>.`,[{label:'On it',fn:ix.closeDialog}]);return}
 if(ix.objIdx>3){ix.dialog(O,'Excellent work today. Come back any time.',[{label:'Thanks, Omar',fn:ix.closeDialog}]);return}
 ix.dialog(O,`So, what do you recommend for Layla’s Café?<div class="vitals"><div>Amount<b>${money(loan.A)}</b></div><div>Term<b>${loan.n} mo</b></div><div>Payment<b>${money(loan.p)}</b></div><div>DSCR<b>${show2(loan.d)}</b></div></div>`,[{label:'Present my recommendation',fn:()=>
  ix.question('Final review · Stress test','Omar: “Layla’s revenue usually drops about <b>20% in winter</b>.” What should a careful analyst do?',
   ['Stress-test the plan: check she can still make payments with lower winter revenue','Ignore it, because the yearly average is fine','Lend her twice as much so she has extra cash'],0,
   `A <b>stress test</b> checks whether a borrower could still repay if things get worse. If winter revenue fell 20% to ${money(REVENUE*.8)} and costs stayed at ${money(COSTS)}, the café would lose money those months, so the bank might ask for a cash reserve or a seasonal payment plan.`,f=>{score+=f;
    ix.dialog(O,`Great analysis, ${ix.name}. You protected both the customer and the bank. That’s what good banking looks like.`,[{label:'Finish my shift →',fn:()=>ix.finish({icon:'◈',title:'Capital Bay Credit Analyst',score,max:5,
     skills:['◈ Verifying customer identity (KYC)','% Calculating compound interest','⌁ Measuring affordability with DSCR','⚖ Weighing loan term against total interest','⚠ Stress-testing a lending decision']})}])})}]);
 function start(){ix.closeDialog();ix.nova.visible=true;ix.advance(1);ix.toast('✓ Checked in. NOVA has joined you.')}
}
function vaultFact(ix){
 ix.dialog('NOVA · Bonus fact','Most of a bank’s money isn’t stacked in the vault. Banks lend out much of what customers deposit and keep only part as cash and reserves. That’s why <b>trust</b>, <b>regulation</b> and deposit protection schemes matter so much.',[{label:'Interesting!',fn:()=>{ix.closeDialog();const g=ix.awardOnce('capital_vault',10);if(g)ix.toast(`✦ Bonus fact · +${g} XP`)}}]);
}

const CFG={id:'capital',title:'Capital Bay Bank',subtitle:'Trainee analyst shift',enterLabel:'🏦 Enter Capital Bay Bank: start a 3D shift →',badge:'Capital Bay Credit Analyst',
 objectives:[['Check in with Omar, the branch manager',[0,5.7]],['Serve a customer at the teller station',[5.9,7]],['Assess Layla’s business loan',[-10.5,-9.3]],['Present your recommendation to Omar',[0,5.7]],['Get your feedback and badge',null]],
 hints:['Welcome to <b>Capital Bay</b>! I’m <b>NOVA</b>, your learning guide. Check in with <b>Omar</b>, the branch manager, at the front desk.',
  'Mr. Karim is waiting at the <b>teller station</b> on the right side of the banking hall.',
  'Head up the corridor to the <b>Loan Office</b>, first door on the left. Layla wants a business loan.',
  'Recommendation ready! Walk back to <b>Omar</b> at the front desk to present it.',
  'Shift complete. Open your <b>Career Passport</b> to see your new badge.'],
 build,
 interact(id,ix){const f={manager,teller,loan:loanDesk,vault:vaultFact}[id];if(f)f(ix)},
 frame(dt){coin.rotation.z+=dt*1.2},
 reset(){score=0;loanFirst=true;loan=null}
};
TI.register(CFG);
})();
