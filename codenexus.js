/* TALENTOPIA · Code Nexus HQ (district config for interior.js)
   Engineering-lead check-in, a Dev Lab bug fix where the unit tests genuinely run the
   student's version of the code, a Security Ops phishing investigation, and an
   AI-and-data ethics debrief. All people, emails and domains are fictional. */
(()=>{
'use strict';
const TI=window.TalentopiaInterior;if(!TI)return;
const $=id=>document.getElementById(id);
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
let holo,leds=[],alarm,leoTag,amiraTag,score=0,interest='software';

/* ------------------------------------------------------------------ building */
function codeTexture(B,lines,color){return B.panelTexture('',[],color,x=>{x.fillStyle='#0a0f2a';x.fillRect(6,6,500,288);x.font='22px ui-monospace,Menlo,monospace';lines.forEach((l,i)=>{x.fillStyle=i===2?'#ff9bb2':'#d6e0ff';x.fillText(l,24,48+i*34)})})}
function build(B){
 const {scene,C,M,glow,box,collider,hotspot,npc,person,textSprite,panelTexture,screen,shell,plant}=B;
 shell({lobby:0xbfc6e4,corridor:0xaab2d8,left:0x262c5a,leftOpts:{roughness:.8},right:0x12173a,rightOpts:{roughness:.4,metalness:.3},wall:0xdfe2f2,trim:C.cyan});
 // lobby
 box(5,1.05,1.1,M(0x1b2150,{roughness:.3,metalness:.3}),0,.525,4);box(5.1,.06,1.2,glow(C.cyan),0,1.08,4);box(5,.16,.02,glow(C.violet),0,.62,4.56);collider(-2.6,3.4,2.6,4.6);
 const priya=npc(person({skin:0xa0663f,hair:0x1d1a1f,style:'long',outfit:0x7a4fe0,badge:true}));priya.position.set(0,0,2.9);scene.add(priya);collider(-.35,2.55,.35,3.25);
 const pt=textSprite('Priya','#67DFF0',.75,'Engineering lead');pt.position.set(0,2.35,2.9);scene.add(pt);
 hotspot('lead',0,5.7,1.9,'Talk to Priya, the engineering lead',[priya]);
 holo=new THREE.Mesh(new THREE.IcosahedronGeometry(.45,1),new THREE.MeshBasicMaterial({color:C.cyan,wireframe:true}));holo.position.set(0,3.05,4);scene.add(holo);
 const sign=textSprite('Code Nexus','#67DFF0',1.25,'Software · AI · Cybersecurity');sign.position.set(0,3.4,.2);scene.add(sign);
 // server racks with blinking LEDs
 for(const [x,z] of [[-9.2,2.2],[-9.2,3.6],[9.2,2.2],[9.2,3.6]]){box(.9,2.2,1.1,M(0x141a3d,{metalness:.5,roughness:.3}),x,1.1,z);collider(x-.45,z-.55,x+.45,z+.55);
  for(let r=0;r<6;r++)for(let c=0;c<3;c++){const led=box(.04,.05,.05,M(0x8de8c3,{emissive:0x8de8c3,emissiveIntensity:1}),x+(x<0?.46:-.46),.5+r*.28,z-.3+c*.3);led.userData.phase=Math.random()*6;leds.push(led)}}
 for(const s of [-1,1]){box(2.6,.42,.9,M(0x5b5f9e),s*6.3,.21,9.4);box(2.6,.5,.15,M(0x5b5f9e),s*6.3,.55,9.85);collider(s*6.3-1.3,8.95,s*6.3+1.3,9.95)}
 screen(3,1.75,panelTexture('Build status',['✓ 128 tests passing','Deploys today: 3','Uptime: 99.9%'],'#8DE8C3'),-9.83,1.8,7.5,Math.PI/2);
 screen(3,1.75,panelTexture('Today at Code Nexus',['10:00 · Code review','14:00 · Security drill','16:00 · AI ethics talk'],'#67DFF0'),9.83,1.8,7.5,-Math.PI/2);
 plant(-3.7,.9);plant(3.7,.9);plant(-9.2,13.1);plant(9.2,13.1);
 const sd=textSprite('← Dev Lab','#67DFF0',.95);sd.position.set(-2.2,3.25,-10);scene.add(sd);
 const ss=textSprite('Security Ops →','#ff9bb2',.95);ss.position.set(2.2,3.25,-10);scene.add(ss);
 // dev lab
 const desk=(x,z,w=2.6)=>{box(w,.08,1.1,M(0xe9ecf8),x,.78,z);for(const s of [-1,1])box(.08,.74,1,M(0x9aa6c8),x+s*(w/2-.08),.37,z);collider(x-w/2-.05,z-.6,x+w/2+.05,z+.6)};
 const code=['function average(scores) {','  let total = 0;','  for (let i = 0; i <= scores.length; i++) {','    total += scores[i];','  }','  return total / scores.length;','}'];
 desk(-10.5,-11.2);for(const s of [-1,1]){box(.9,.55,.04,M(0x1b1f33),-10.5+s*.5,1.15,-11.55);screen(.86,.5,s<0?codeTexture(B,code,'#67DFF0'):panelTexture('Tests',['✕ average([80,90,100])','✕ average([50])','✕ average([])'],'#ff9bb2'),-10.5+s*.5,1.15,-11.525)}
 const leo=npc(person({skin:0xf6d7c3,hair:0xa86d3a,style:'short',outfit:0x2fa79a}));leo.position.set(-10.5,0,-12.5);scene.add(leo);collider(-10.85,-12.85,-10.15,-12.15);
 leoTag=textSprite('Leo','#67DFF0',.75,'Junior developer');leoTag.position.set(-10.5,2.35,-12.5);scene.add(leoTag);
 hotspot('dev',-10.5,-9.3,2,'Help Leo fix the bug',[leo]);
 desk(-15.6,-12.4,2);desk(-15.6,-7.2,2);for(const z of [-12.4,-7.2]){box(.8,.5,.04,M(0x1b1f33),-15.6,1.1,z-.35);screen(.76,.46,codeTexture(B,['const app = express();','app.get("/", home);','// TODO: tests'],'#8DE8C3'),-15.6,1.1,z-.325)}
 screen(3.4,1.9,panelTexture('How we fix bugs',['1. Reproduce it','2. Find the cause','3. Fix it · 4. Run the tests'],'#FFD59C'),-7,1.75,-15.83);
 const dl=new THREE.PointLight(C.cyan,.6,10);dl.position.set(-10.5,3,-10);scene.add(dl);
 // security ops
 for(let r=0;r<2;r++)for(let c=0;c<3;c++){const x=9+c*3,y=1.2+r*1.15;box(2.8,1.05,.06,M(0x0b0f26),x,y,-15.9);
  screen(2.7,.98,panelTexture(['Network traffic','Login attempts','Threat map','Email filter','Endpoint health','Alerts'][r*3+c],[],['#67DFF0','#FFD59C','#8DE8C3','#ff9bb2','#67DFF0','#ff9bb2'][r*3+c],x2=>{x2.strokeStyle='#67DFF088';x2.lineWidth=5;x2.beginPath();for(let k=0;k<10;k++){const yy=220-Math.abs(Math.sin(k*1.3+r+c))*90;k?x2.lineTo(30+k*50,yy):x2.moveTo(30,yy)}x2.stroke()}),x,y,-15.86)}
 desk(12,-11.2,3);for(const s of [-1,1]){box(.9,.55,.04,M(0x1b1f33),12+s*.6,1.15,-11.55);screen(.86,.5,panelTexture(s<0?'⚠ Phishing report':'Inbox scan',s<0?['#4471 · 37 users','reported'] :['Quarantine: 0','Pending review'],s<0?'#ff9bb2':'#67DFF0'),12+s*.6,1.15,-11.525)}
 const amira=npc(person({skin:0x7a4a2a,hair:0x1d1a1f,style:'bun',outfit:0x24305e}));amira.position.set(12,0,-12.6);scene.add(amira);collider(11.65,-12.95,12.35,-12.25);
 amiraTag=textSprite('Amira','#ff9bb2',.75,'Security analyst');amiraTag.position.set(12,2.35,-12.6);scene.add(amiraTag);
 hotspot('soc',12,-9.3,2,'Investigate the alert with Amira',[amira]);
 alarm=new THREE.PointLight(0xff4d6d,.4,12);alarm.position.set(12,2.6,-10);scene.add(alarm);
 const sl=new THREE.PointLight(C.cyan,.35,12);sl.position.set(8,2.6,-8);scene.add(sl);
}

/* ------------------------------------------------------------------ dev lab: real tests */
const BASE=['function average(scores) {','  let total = 0;','  for (let i = 0; i <= scores.length; i++) {','    total += scores[i];','  }','  return total / scores.length;','}'];
const LOOP_FIXES=[['  for (let i = 0; i < scores.length; i++) {',true],['  for (let i = 1; i <= scores.length; i++) {',false],['  for (let i = 0; i <= scores.length - 2; i++) {',false]];
const GUARDS=[['  if (scores.length === 0) return 0;',true],['  if (scores === 0) return 0;',false],['  if (scores.length === 0) return 1 / 0;',false]];
const TESTS=[[[80,90,100],90],[[50],50],[[],0]];
let dev;
function resetDev(){dev={phase:'find',lines:BASE.slice(),guard:null,loopTries:0,guardTries:0,lineFirst:true,ran:false}}
function runTests(){let fn,err=null;
 try{fn=new Function(dev.lines.join('\n')+'\nreturn average;')()}catch(e){err=e.message}
 return TESTS.map(([input,want])=>{if(err)return{input,want,got:'SyntaxError',pass:false};let got;try{got=fn(input.slice())}catch(e){got=e.name}
  return{input,want,got,pass:Object.is(got,want)}})}
function fmt(v){return typeof v==='number'?(Number.isInteger(v)||!isFinite(v)?String(v):v.toFixed(2)):String(v)}
function renderDev(ix,msg,cls=''){
 const code=$('cnCode');if(!code)return;
 code.innerHTML=dev.lines.map((l,i)=>`<button class="codeline" data-line="${i}"><i>${i+1}</i>${esc(l)}</button>`).join('');
 code.querySelectorAll('[data-line]').forEach(b=>b.onclick=()=>{if(dev.phase!=='find')return;const i=+b.dataset.line;
  if(i===2){b.classList.add('good');dev.phase='fix1';score+=dev.lineFirst?1:0;renderDev(ix,'✓ Found it. Line 3 uses <code>&lt;=</code>, so the loop runs one step too far and reads <code>scores[3]</code>, which is <code>undefined</code>. Adding <code>undefined</code> to a number gives <code>NaN</code>. Pick a fix for line 3, then run the tests.','ok')}
  else{dev.lineFirst=false;b.classList.add('bad');setTimeout(()=>b.classList.remove('bad'),600);renderDev(ix,'Not that line. Which line decides how many times the loop runs?','no')}});
 const fix=$('cnFix');
 const opts=dev.phase==='fix1'?LOOP_FIXES:dev.phase==='fix2'?GUARDS:[];
 fix.innerHTML=opts.map((o,i)=>`<button data-fix="${i}" style="font-family:ui-monospace,Menlo,monospace;text-align:left;border-radius:10px;width:100%">${esc(o[0].trim())}</button>`).join('');
 fix.querySelectorAll('[data-fix]').forEach(b=>b.onclick=()=>{const [line,good]=opts[+b.dataset.fix];
  if(dev.phase==='fix1'){dev.lines[2]=line;dev.loopTries++;dev.loopGood=good}else{if(dev.guard===null)dev.lines.splice(1,0,line);else dev.lines[1]=line;dev.guard=line;dev.guardTries++;dev.guardGood=good}
  fix.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));renderDev(ix,'Change applied. Now press <b>▶ Run tests</b> to check it.')});
 const task=$('cnTask');task.className='ix-task '+cls;
 const steps={find:'<b>Step 1:</b> Tap the line that causes the bug. Tip: run the tests first to reproduce it.',fix1:'<b>Step 2:</b> Choose a fix for line 3, then run the tests.',fix2:'<b>Step 3:</b> One test still fails: an empty list gives <code>0 / 0 = NaN</code>. The team agreed an empty list should show <b>0</b>. Choose a guard to add at the top, then run the tests.',done:'<b>✓ All tests pass.</b> Bug fixed and covered by tests.'};
 task.innerHTML=(msg?msg+'<br>':'')+`<span style="opacity:.85">${steps[dev.phase]}</span>`;
 fix.style.display=opts.length?'grid':'none';
}
function showResults(res){$('cnTests').innerHTML=res.map(r=>`<div class="ix-metric"><span style="font-family:ui-monospace,Menlo,monospace">average([${r.input.join(', ')}])</span><strong style="color:${r.pass?'#8DE8C3':'#ff9bb2'}">${r.pass?'✓':'✕'} ${esc(fmt(r.got))}${r.pass?'':` (want ${r.want})`}</strong></div>`).join('')}
function openDev(ix){
 leoTag.visible=false;
 ix.openPanel({hideAvatar:true,
  html:`<div class="k">Dev Lab · Bug ticket #212</div><h3>Fix average()</h3>
   <div class="ix-info"><b>Bug report</b>“The student dashboard shows <b style="display:inline;font-size:12px;color:#ff9bb2">NaN</b> instead of the average score.”</div>
   <div class="codebox" id="cnCode" style="margin:0"></div>
   <div class="ix-task" id="cnTask"></div>
   <div id="cnFix" style="display:none;gap:6px" class="layers"></div>
   <button class="ix-primary" id="cnRun" style="margin-top:2px">▶ Run tests</button>
   <div id="cnTests" style="display:grid;gap:6px"></div>
   <div class="ix-note">These tests genuinely run your version of the code in the browser.</div>`,
  bind(){renderDev(ix);$('cnRun').onclick=()=>{const res=runTests();showResults(res);const pass=res.filter(r=>r.pass).length;
   if(dev.phase==='find'){renderDev(ix,`Reproduced: ${3-pass} of 3 tests fail. Now find the cause.`,'no')}
   else if(dev.phase==='fix1'){if(dev.loopGood&&pass===2){score+=dev.loopTries===1?1:0;dev.phase='fix2';renderDev(ix,'✓ 2 of 3 tests pass. The loop now stops at the last item.','ok')}else renderDev(ix,`${pass} of 3 tests pass. That fix doesn’t work yet: look at where the loop starts and stops.`,'no')}
   else if(dev.phase==='fix2'){if(pass===3){score+=dev.guardTries===1?1:0;dev.phase='done';renderDev(ix,'','ok');const g=ix.awardOnce('nexus_dev',60);ix.advance(2);ix.toast('✓ Bug fixed · all tests pass'+(g?` · +${g} XP`:''));
     setTimeout(()=>{ix.closePanel();ix.dialog('Leo · Junior developer','You did it! Reproduce, find the cause, fix, then <b>test</b>, including the weird cases like an empty list. That’s real engineering. Amira in Security Ops could use a hand next.',[{label:'On my way →',fn:ix.closeDialog}])},1400)}
    else renderDev(ix,`${pass} of 3 tests pass. Check what that guard compares and what it returns.`,'no')}}},
  camera(p,l){const m=innerWidth<=760;p.set(-10.5,m?3.1:2.45,m?-6.4:-8.1);l.set(-10.5,m?.35:1.05,-12.2)},
  onClose(){leoTag.visible=true}});
}
function talkDev(ix){
 const L='Leo · Junior developer';
 if(ix.objIdx<1){ix.dialog(L,'Hey! Check in with Priya at the front desk first, then come back. I could really use help.',[{label:'Will do',fn:ix.closeDialog}]);return}
 if(ix.objIdx>1){ix.dialog(L,'The fix is live and the dashboard looks great. Thanks again!',[{label:'Anytime',fn:ix.closeDialog}]);return}
 ix.dialog(L,`Hi ${ix.name}! Students say their dashboard shows <b>NaN</b> (“not a number”) instead of their average score. Can you help me track it down?`,[{label:'Let’s debug it →',fn:()=>{ix.closeDialog();openDev(ix)}}]);
}

/* ------------------------------------------------------------------ security ops: phishing */
const FLAGS={domain:'The sender’s address is a lookalike: “ta1entopia” uses the number 1 instead of the letter l, on a different domain.',urgent:'Pressure and threats (“deleted in 1 hour”) are a classic trick to make people act before they think.',link:'The button text says “Verify my account”, but the real link goes to an unrelated address.',password:'A real IT team will never ask you to send your password by email.'};
let soc;
function resetSoc(){soc={found:new Set(),wrong:0}}
function renderSoc(ix,msg,cls=''){const t=$('pfTask');if(!t)return;const n=soc.found.size;t.className='ix-task '+cls;
 t.innerHTML=(msg?msg+'<br>':'')+`<b>Find the 4 red flags</b> by tapping suspicious parts of the email. (${n}/4)<div class="bar"><div style="width:${n*25}%"></div></div>`;
 $('pfList').innerHTML=[...soc.found].map(k=>`<div class="ix-metric" style="display:block;line-height:1.5"><span style="color:#8DE8C3">✓</span> ${FLAGS[k]}</div>`).join('');
 $('pfDone').style.display=n>=4?'block':'none';}
function openSoc(ix){
 amiraTag.visible=false;
 const span=(id,txt)=>`<span data-pf="${id}" style="cursor:pointer;border-radius:5px;padding:1px 3px;border-bottom:1px dashed #ffffff55">${txt}</span>`;
 ix.openPanel({hideAvatar:true,
  html:`<div class="k">Security Ops · Report #4471</div><h3>Is this email phishing?</h3>
   <div class="ix-info" id="pfMail" style="font-size:12.5px;line-height:1.7;background:#f4f5fb;color:#1b1f33;border-color:#ffffff">
    <div style="color:#5b6080;font-size:11px">${span('n_date','Sent: Tuesday 09:14')}</div>
    <div><b style="display:inline;font-size:12.5px;color:#1b1f33">From:</b> ${span('domain','IT Support &lt;security@ta1entopia-support.co&gt;')}</div>
    <div><b style="display:inline;font-size:12.5px;color:#1b1f33">Subject:</b> ${span('urgent','URGENT: Your account will be deleted in 1 hour')}</div>
    <hr style="border:0;border-top:1px solid #d9dcef;margin:8px 0">
    <div>${span('n_greet','Hello,')}</div>
    <div>${span('n_body','We noticed some unusual activity on your student account.')}</div>
    <div style="margin:8px 0">${span('link','<span style="display:inline-block;background:#2f6bff;color:#fff;border-radius:6px;padding:4px 10px">Verify my account</span> <span style="font-size:10.5px;color:#5b6080">(link: http://verify-login.example-secure.top)</span>')}</div>
    <div>${span('password','To keep access, reply with your password and date of birth.')}</div>
    <div style="margin-top:8px;color:#5b6080;font-size:11px">${span('n_sign','Thanks, the Talentopia team')}</div>
   </div>
   <div class="ix-task" id="pfTask"></div><div id="pfList" style="display:grid;gap:6px"></div>
   <button class="ix-primary" id="pfDone" style="display:none">Decide what to do →</button>
   <div class="ix-note">A fictional training email. Never click links in real suspicious messages: report them.</div>`,
  bind(){renderSoc(ix);$('pfMail').querySelectorAll('[data-pf]').forEach(s=>s.onclick=e=>{e.stopPropagation();const id=s.dataset.pf;
    if(FLAGS[id]){if(!soc.found.has(id)){soc.found.add(id);s.style.background='#8DE8C366';s.style.borderBottomColor='transparent'}renderSoc(ix,'✓ Red flag found.','ok')}
    else{soc.wrong++;s.style.background='#ff9bb255';setTimeout(()=>s.style.background='',600);renderSoc(ix,'That part looks normal. Keep looking.','no')}});
   $('pfDone').onclick=()=>{score+=soc.wrong===0?1:0;ix.closePanel();
    ix.question('Amira · Security analyst','All four red flags confirmed. 37 people received this email. What should the team do?',
     ['Report and block the sender, warn everyone not to click, and help anyone who already entered a password to reset it','Click the link to see where it really goes','Reply to the sender and ask whether it’s genuine'],0,
     'Security teams <b>contain</b> the threat (block the sender, remove the email), <b>warn</b> users and <b>help</b> anyone affected to reset their password. Clicking or replying could expose more information.',f=>{score+=f;ix.closeDialog();const g=ix.awardOnce('nexus_soc',60);ix.advance(3);ix.toast('✓ Threat contained'+(g?` · +${g} XP`:''))})}},
  camera(p,l){const m=innerWidth<=760;p.set(12,m?3.1:2.45,m?-6.4:-8.1);l.set(12,m?.35:1.05,-12.2)},
  onClose(){amiraTag.visible=true}});
}
function talkSoc(ix){
 const A='Amira · Security analyst';
 if(ix.objIdx<2){ix.dialog(A,'Hi! We’re busy with an alert. Leo in the Dev Lab needs help first, so come back after that.',[{label:'Got it',fn:ix.closeDialog}]);return}
 if(ix.objIdx>2){ix.dialog(A,'Inbox is clean again. Nice work, analyst!',[{label:'Thanks, Amira',fn:ix.closeDialog}]);return}
 ix.dialog(A,`${ix.name}, perfect timing. <b>37 students</b> reported this email in the last hour. Let’s work out whether it’s phishing, a fake message designed to steal passwords.`,[{label:'Show me the email →',fn:()=>{ix.closeDialog();openSoc(ix)}}]);
}

/* ------------------------------------------------------------------ engineering lead */
function talkLead(ix){
 const P='Priya · Engineering lead';
 if(ix.objIdx===0){
  ix.dialog(P,`Welcome to Code Nexus, <b>${ix.name}</b>! I’m Priya, the engineering lead. Today you’ll fix a real bug with our developers and help the security team with a live alert. Which part sounds most exciting?`,
   [['Building software','software'],['Cybersecurity','security'],['Artificial intelligence','ai']].map(([label,v])=>({label,fn:()=>{interest=v;
    ix.dialog(P,(v==='ai'?'Great! AI systems are software too, so they need careful testing and responsible data. We’ll talk about that at the end. ':v==='security'?'Great! You’ll love the Security Ops Center. ':'Great! Developers spend a lot of time debugging. ')+'Start with Leo in the <b>Dev Lab</b>: up the corridor, first door on the left.',
     [{label:'Let’s go →',fn:()=>{ix.closeDialog();ix.nova.visible=true;ix.advance(1);ix.toast('✓ Checked in. NOVA has joined you.')}}])}})));return}
 if(ix.objIdx<3){ix.dialog(P,`Keep going! Next: <b>${CFG.objectives[ix.objIdx][0].toLowerCase()}</b>.`,[{label:'On it',fn:ix.closeDialog}]);return}
 if(ix.objIdx>3){ix.dialog(P,'Fantastic work today. The door is always open.',[{label:'Thanks, Priya',fn:ix.closeDialog}]);return}
 ix.question('Debrief · AI and data','Priya: “Great work today. One last question: our team wants to build an AI that recommends courses using student data. What should come first?”',
  ['Get consent, collect only the data we need, protect it, and test the model for unfair bias','Collect as much personal data as possible, just in case','Skip testing so we can launch faster'],0,
  'Responsible AI starts with <b>consent</b> and <b>data minimisation</b> (only what you need), strong <b>security</b>, and <b>testing for bias</b> so recommendations are fair for every student. Just like Leo’s bug, untested AI can quietly give wrong answers.',f=>{score+=f;
   ix.dialog(P,`You debugged code, stopped a phishing attack and thought about AI responsibly. That’s the whole job, ${ix.name}!`,[{label:'Finish my shift →',fn:()=>ix.finish({icon:'⌘',title:'Code Nexus Problem Solver',score,max:6,
    skills:['⌘ Reproducing and isolating a bug','✓ Fixing code and proving it with tests','⚠ Handling edge cases (empty lists)','⛨ Spotting phishing red flags','⚖ Building AI responsibly with data']})}])});
}

const CFG={id:'nexus',title:'Code Nexus HQ',subtitle:'Engineering shift',enterLabel:'⌘ Enter Code Nexus HQ: start a 3D shift →',badge:'Code Nexus Problem Solver',
 objectives:[['Check in with Priya, the engineering lead',[0,5.7]],['Fix the bug in the Dev Lab',[-10.5,-9.3]],['Investigate the alert in Security Ops',[12,-9.3]],['Debrief with Priya',[0,5.7]],['Get your feedback and badge',null]],
 hints:['Welcome to <b>Code Nexus</b>! I’m <b>NOVA</b>. Check in with <b>Priya</b>, the engineering lead, at the front desk.',
  'Head up the corridor to the <b>Dev Lab</b>, first door on the left. Leo has a bug to fix.',
  'Bug squashed! Cross the corridor to <b>Security Ops</b>. Amira has a live alert.',
  'Threat contained! Walk back to <b>Priya</b> at the front desk for your debrief.',
  'Shift complete. Open your <b>Career Passport</b> to see your new badge.'],
 build,
 interact(id,ix){const f={lead:talkLead,dev:talkDev,soc:talkSoc}[id];if(f)f(ix)},
 frame(dt,t){holo.rotation.y+=dt*.6;holo.rotation.x+=dt*.25;for(const l of leds)l.material.emissiveIntensity=Math.sin(t*4+l.userData.phase)>.2?1.2:.15;alarm.intensity=.25+Math.max(0,Math.sin(t*3))*.5},
 reset(){score=0;interest='software';resetDev();resetSoc()}
};
TI.register(CFG);
})();
