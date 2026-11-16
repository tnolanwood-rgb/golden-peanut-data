// Real Chromium touch streams and rendered-frame assertions. All data synthetic.
// SWIPE_ASSET_REF=<git SHA> replays old assets against the SAME acceptance tests.
// SWIPE_CPU_RATE=4 collects slower-CPU evidence; it is not a physical-phone test.
const assert=require('node:assert/strict'),fs=require('node:fs');
const {execFileSync}=require('node:child_process');
const {fixture}=require('./helpers/hub-fixture.cjs');
const output=process.env.SWIPE_OUTPUT||'artifacts/audit/swipe';
fs.mkdirSync(output,{recursive:true});
const report={conditions:'Headless Chromium mobile touch emulation; synthetic data; instrumented rAF geometry, not physical Android FPS',
 assetRef:process.env.SWIPE_ASSET_REF||'working tree',cpuRate:Number(process.env.SWIPE_CPU_RATE||1),cases:[]};

(async()=>{
 const f=await fixture(),{page,context,origin,errors}=f;
 // Thousands of noncandidates exercise bulk-response parsing and discovery,
 // while the two numbered ideas remain deterministic.
 for(let id=3;id<=4002;id++){
  f.mapping.push({id,name:'Synthetic noncandidate '+id,limit:100,members:false});
  f.prices[id]={low:100,high:100,lowTime:Math.floor(Date.now()/1000)-30,highTime:Math.floor(Date.now()/1000)-30};
 }
 const cdp=await context.newCDPSession(page);
 let tracing=false;
 const tick=()=>page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
 const idle=async game=>{
  await page.waitForFunction(g=>!GoldenDualHub.diagnostics().dragging&&!GoldenDualHub.diagnostics().transitioning&&
   (!g||GoldenDualHub.diagnostics().game===g),game,{timeout:5000});
  await tick();
 };
 const send=(type,x,y=350,extra=[])=>cdp.send('Input.dispatchTouchEvent',{type,
  touchPoints:['touchEnd','touchCancel'].includes(type)?[]:[{x,y,id:1},...extra]});
 const state=()=>page.evaluate(()=>GoldenDualHub.diagnostics());
 const switchTo=async game=>{await page.evaluate(g=>GoldenDualHub.switchGame(g),game);await idle(game);await page.waitForTimeout(80);};
 const scroll=async y=>{await page.evaluate(y=>scrollTo({top:y,behavior:'instant'}),y);await tick();};
 const startRecord=async(name,from)=>page.evaluate(({name,from})=>{
  const other=from==='gw2'?'osrs':'gw2';
  window.__swipeCapture={name,from,other,frames:[],domUpdates:0,domTargets:[],writes:[],recording:true};
  const capture=window.__swipeCapture;
  performance.mark('swipe:'+name+':start');
  const observer=new MutationObserver(records=>{
   if(!document.querySelector('#gh-game-stage.gh-stage-moving'))return;
   capture.domUpdates+=records.filter(r=>r.type==='childList'||r.type==='characterData').length;
   for(const r of records)if(capture.domTargets.length<20)capture.domTargets.push(r.target.id||r.target.parentElement?.id||String(r.target.className||r.target.nodeName));
  });
  observer.observe(document.querySelector('#gh-game-stage'),{subtree:true,childList:true,characterData:true});
  capture.observer=observer;
  const sample=t=>{
   const panel=g=>{
    const p=document.querySelector('#gh-panel-'+g),r=p.getBoundingClientRect();
    const marker=p.querySelector('.gp-guide-header')||p,m=marker.getBoundingClientRect();
    return {hidden:p.hidden,x:r.x,right:r.right,width:r.width,y:m.y,height:r.height};
   };
   capture.frames.push({t,scrollY,stageHeight:document.querySelector('#gh-game-stage').getBoundingClientRect().height,
    moving:document.querySelector('#gh-game-stage').classList.contains('gh-stage-moving'),
    from:panel(from),other:panel(other)});
   if(capture.recording)requestAnimationFrame(sample);
  };
  requestAnimationFrame(sample);
 },{name,from});
 const endRecord=async(expected,{nativeVertical=false}={})=>{
  await idle(expected);
  const data=await page.evaluate(()=>{
   const c=window.__swipeCapture;c.recording=false;c.observer.disconnect();
   performance.mark('swipe:'+c.name+':end');
   return {name:c.name,from:c.from,other:c.other,frames:c.frames,domUpdates:c.domUpdates,domTargets:c.domTargets,writes:c.writes};
  });
  fs.writeFileSync(output+'/'+data.name+'.json',JSON.stringify(data));
  const moving=data.frames.filter(r=>r.moving),deltas=data.frames.slice(1).map((r,i)=>r.t-data.frames[i].t).sort((a,b)=>a-b);
  let jump=0,gap=0;
  for(let i=1;i<data.frames.length;i++){
   const a=data.frames[i-1],b=data.frames[i];
   if(a.moving&&b.moving)gap=Math.max(gap,Math.abs(data.from==='gw2'?b.from.right-b.other.x:b.other.right-b.from.x));
   for(const g of ['from','other'])if(!a[g].hidden&&!b[g].hidden&&(a.moving||b.moving)){
    // Native vertical movement intentionally changes viewport Y. During the
    // slide, remove that measured movement; at handoff allow one 25px step.
    const dy=b[g].y-a[g].y;
    const unexpected=nativeVertical?(a.moving&&b.moving?Math.abs(dy+b.scrollY-a.scrollY):Math.max(0,Math.abs(dy)-30)):Math.abs(dy);
    jump=Math.max(jump,unexpected);
   }
  }
  const result={name:data.name,frames:data.frames.length,activeFrames:moving.length,maxVerticalJump:jump,maxPanelGap:gap,
   nativeVertical,domUpdates:data.domUpdates,storageWrites:data.writes,frameP95:deltas[Math.floor(deltas.length*.95)]||0,
   frameMax:Math.max(0,...deltas),framesOver34ms:deltas.filter(n=>n>34).length};
  report.cases.push(result);
  console.log(JSON.stringify(result));
  assert.ok(moving.length>=2,data.name+': must sample actual visible movement');
  assert.ok(jump<1.5,data.name+': visible content jumped vertically '+jump+'px');
  assert.ok(gap<1.5,data.name+': sheets overlapped or separated by '+gap+'px');
  assert.equal(data.domUpdates,0,data.name+': content must not rebuild during movement: '+data.domTargets.join(','));
  assert.deepEqual(data.writes,[],data.name+': no synchronous persistence during movement');
  return data;
 };
 const drag=async(name,from,points,{cancel=false,pause=16,y=350,expected}={})=>{
  await startRecord(name,from);
  await send('touchStart',points[0],y);
  for(const x of points.slice(1)){
   await send('touchMove',x,y);if(pause)await page.waitForTimeout(pause);
   // Native input delivery may be coalesced until the next rendering frame.
   await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(resolve)));
   const expectedOffset=from==='gw2'?Math.max(-390,Math.min(0,x-points[0])):Math.min(412,Math.max(0,x-points[0]));
   if(Math.abs(x-points[0])>=10){
    const actual=await state();
    assert.equal(actual.dragging,true,name+': touchmove must move the pages while the finger is down');
    assert.ok(Math.abs(actual.dragOffset-expectedOffset)<1.5,name+': pages must track finger distance: '+actual.dragOffset+' vs '+expectedOffset);
   }
  }
  await send(cancel?'touchCancel':'touchEnd',points.at(-1),y);
  return endRecord(expected|| (cancel?from:from==='gw2'?'osrs':'gw2'));
 };
 const flick=async(name,from,points)=>{
  await startRecord(name,from);
  // Replay device event timestamps 20ms apart. Assertion/trace overhead must
  // not turn a physical quick flick into a 150ms synthetic slow drag.
  const stamp=Date.now()/1000-.1;
  for(let i=0;i<points.length;i++)await cdp.send('Input.dispatchTouchEvent',{
   type:i?'touchMove':'touchStart',touchPoints:[{x:points[i],y:350,id:1}],timestamp:stamp+i*.02});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[],timestamp:stamp+points.length*.02});
  await endRecord(from==='gw2'?'osrs':'gw2');
  const release=(await state()).lastRelease;
  if(release)assert.ok(Math.abs(release.velocity)>.65,name+': recorded velocity must qualify as a flick');
 };
 try{
  if(process.env.SWIPE_ASSET_REF){
   for(const file of ['dual-hub.js','dual-hub.css','guided-peanut.js','focus-edition.js']){
    const body=execFileSync('git',['show',process.env.SWIPE_ASSET_REF+':app/'+file]);
    await page.route('**/'+file+'*',r=>r.fulfill({body,contentType:file.endsWith('css')?'text/css':'text/javascript'}));
   }
   const html=execFileSync('git',['show',process.env.SWIPE_ASSET_REF+':app/index.html']);
   await page.route(url=>url.origin===origin&&['/','/index.html'].includes(url.pathname),r=>r.fulfill({body:html,contentType:'text/html'}));
  }
  await page.addInitScript(()=>{
   document.addEventListener('pointerdown',event=>{if(event.pointerType==='touch')window.__touchPointer=event.pointerId;},{capture:true});
   const original=Storage.prototype.setItem;
   Storage.prototype.setItem=function(key,value){
    if(window.__swipeCapture?.recording&&document.querySelector('#gh-game-stage.gh-stage-moving'))
     window.__swipeCapture.writes.push(key);
    return original.call(this,key,value);
   };
  });
  if(report.cpuRate>1)await cdp.send('Emulation.setCPUThrottlingRate',{rate:report.cpuRate});
  // A slow GW2 script used to initialize after OSRS was visible and reset
  // its shared scroll. Keep both desks behind the boot screen until ready.
  for(const asset of ['guided-peanut.js','dual-hub.js']){
   let release;
   const pattern='**/'+asset+'*';
   const hold=async route=>{
    await new Promise(resolve=>release=resolve);await route.fallback();
   };
   await page.route(pattern,hold);
   const boot=page.goto(origin+'/?game=osrs');
   while(!release)await page.waitForTimeout(10);
   await page.waitForTimeout(150);
   if(!process.env.SWIPE_ASSET_REF){
    assert.equal(await page.evaluate(()=>document.body.classList.contains('gp-ui-booting')),true,asset+': partial setup must remain behind the boot screen');
    assert.equal(await page.evaluate(()=>!!window.GoldenDualHub),false,'both desks initialize before accepting gestures');
   }
   release();await boot;await page.unroute(pattern,hold);
   await page.waitForFunction(()=>window.GoldenDualHub&&window.GPGuided&&!document.body.classList.contains('gp-ui-booting'));
  }
  await page.waitForFunction(()=>GoldenDualHub?.diagnostics().ideas===2&&!GoldenDualHub.diagnostics().loading);
  await page.waitForFunction(()=>GoldenPeanutClean?.State?.db?.db&&window.GPGuided);
  // Stable, nonempty GW2 selected-item state, independent of external services.
  await page.evaluate(async()=>{
   const s=GoldenPeanutClean.State;s.account='SwipeFixture.1234';s.opportunityDeepPaused=true;
   s.snapshot={account:s.account,wallet:100000,at:Date.now()};
   s.opportunityPlan={ok:true};s.opportunityAt=Date.now();
   s.meta={101:{name:'Synthetic GW2 sword',rarity:'Exotic'},102:{name:'Synthetic GW2 coat',rarity:'Exotic'}};
   GPMarketBoard.build=()=>({ready:true,forecast:[101,102].map(id=>({id,buy:100,exit:200,quantity:2,cost:200,expectedProfit:120})),history:[],newMarkets:[]});
   GPGuided.render();
   await s.db.put('config',s.account,'swipe-account-preservation',{account:'synthetic',learning:[3,5,8]});
   localStorage.setItem('swipe-unrelated-saved-data','preserve-exactly');
  });
  await page.locator('#gh-next').click();
  await page.locator('#gh-add-fill').click();
  await page.locator('#gh-fill-qty').fill('7');await page.locator('#gh-fill-price').fill('2000001');
  await page.locator('#gh-show-chart').click();
  await page.waitForFunction(()=>GoldenOSRSChart.diagnostics().points>10);
  await page.locator('[data-gh-period="three"]').click();
  await page.waitForFunction(()=>GoldenOSRSChart.diagnostics().range==='three'&&GoldenOSRSChart.diagnostics().points>10);
  await page.locator('#gh-research-slider').evaluate(n=>{n.value='50';n.dispatchEvent(new Event('input',{bubbles:true}));});
  await page.locator('.gh-research-close').click();
  await switchTo('gw2');
  await page.locator('#gh-panel-gw2 .gp-guide-controls button').last().click();
  await scroll(120);
  const gwSelected=await page.evaluate(()=>GPGuided.navigation().id);
  assert.ok(gwSelected,'GW2 fixture must have a selected item');
  await switchTo('osrs');await scroll(480);
  const snapshot=()=>page.evaluate(async()=>({
   gwId:GPGuided.navigation().id,osrsId:GoldenDualHub.diagnostics().selectedId,
   chart:GoldenOSRSChart.diagnostics(),qty:document.querySelector('#gh-fill-qty').value,
   price:document.querySelector('#gh-fill-price').value,
   account:(await GoldenPeanutClean.State.db.get('config','SwipeFixture.1234','swipe-account-preservation')).value,
   unrelated:localStorage.getItem('swipe-unrelated-saved-data'),ledger:localStorage.getItem('gh-osrs-v1-ledger')
  }));
  const before=await snapshot();
  await page.evaluate(()=>document.querySelector('.gh-trade-scroll').scrollTop=65);
  await page.waitForTimeout(250);
  await cdp.send('Tracing.start',{categories:'devtools.timeline,blink.user_timing',transferMode:'ReturnAsStream'});tracing=true;

  // This failed against #57: incoming header moved by the scroll difference
  // on completion, even though all its transform/event assertions passed.
  await drag('different-scroll-slow-osrs','osrs',[65,80,95,110,125,140,155,170,185,200,215,230,245,260,275],{pause:24});
  assert.ok(Math.abs(await page.evaluate(()=>scrollY)-120)<2,'GW2 document position restored');
  await drag('different-scroll-slow-gw2','gw2',[325,310,295,280,265,250,235,220,205,190,175,160,145,130,115],{pause:24});
  assert.ok(Math.abs(await page.evaluate(()=>scrollY)-480)<2,'OSRS document position restored');

  // The target point must really be inside the overflow scroller, not just
  // dispatched at one of its DOM nodes while it is offscreen.
  const inside=await page.evaluate(()=>document.elementFromPoint(80,420)?.closest('.gh-trade-scroll')!==null);
  assert.equal(inside,true,'native touch must start inside the recommendation box');
  const nestedBefore=await page.locator('.gh-trade-scroll').evaluate(n=>n.scrollTop);
  await drag('nested-card-horizontal','osrs',[65,90,120,155,190,225,265],{y:420});
  await switchTo('osrs');
  assert.equal(await page.locator('.gh-trade-scroll').evaluate(n=>n.scrollTop),nestedBefore,'horizontal card swipe preserves its vertical position');
  const docBefore=await page.evaluate(()=>scrollY);
  await send('touchStart',180,690);
  for(let y=675;y>=450;y-=15){await send('touchMove',181,y);await page.waitForTimeout(20);}
  await page.waitForTimeout(120);await send('touchEnd',181,450);await page.waitForTimeout(180);
  assert.equal((await state()).game,'osrs');assert.equal((await state()).dragging,false);
  assert.ok(await page.locator('.gh-trade-scroll').evaluate(n=>n.scrollTop)>nestedBefore+80,'vertical native touch must actually scroll recommendation content');
  assert.ok(Math.abs(await page.evaluate(()=>scrollY)-docBefore)<2,'contained vertical scrolling must not move the document');

  await drag('cancelled-touch','osrs',[65,100,145,195],{cancel:true,expected:'osrs'});
  await drag('reversal-to-origin','osrs',[65,105,155,205,155,105,75],{expected:'osrs'});
  await drag('reversal-past-origin','osrs',[65,105,155,205,155,105,35],{expected:'osrs'});
  await flick('quick-flick','osrs',[65,100,145]);
  await flick('quick-flick-back','gw2',[325,290,245]);
  await startRecord('webview-pointer-cancel-fallback','osrs');
  await send('touchStart',65);await send('touchMove',105);
  await page.evaluate(()=>document.querySelector('#gh-game-stage').dispatchEvent(new PointerEvent('pointercancel',{
   bubbles:true,pointerId:window.__touchPointer,pointerType:'touch',isPrimary:true})));
  await send('touchMove',165);await send('touchMove',225);await send('touchMove',285);
  await tick();
  assert.equal((await state()).dragOffset,220,'touch fallback continues from original finger coordinates');
  await send('touchEnd',285);await endRecord('gw2');await switchTo('osrs');

  await startRecord('pen-finger-ownership','osrs');
  const pen=(type,x)=>page.evaluate(({type,x})=>document.querySelector('#gh-game-stage').dispatchEvent(new PointerEvent(type,{
   bubbles:true,cancelable:true,pointerId:901,pointerType:'pen',isPrimary:true,clientX:x,clientY:350})),{type,x});
  await pen('pointerdown',65);await pen('pointermove',145);
  await send('touchStart',65);await send('touchMove',225);await send('touchCancel');
  assert.equal((await state()).dragOffset,80,'an unrelated finger cannot steal or cancel pen tracking');
  await pen('pointercancel',145);await endRecord('osrs');
  await startRecord('interrupted-settle','osrs');
  await send('touchStart',65);await send('touchMove',185);await send('touchMove',235);await send('touchEnd',235);
  await page.waitForTimeout(35);
  assert.equal((await state()).transitioning,true,'interrupt must occur before settling completes');
  await send('touchStart',280);
  const acquired=await page.evaluate(()=>GoldenDualHub.diagnostics().dragOffset);
  assert.ok(acquired>170&&acquired<390,'new touch acquires the current animated offset');
  await send('touchMove',240);await send('touchMove',180);await send('touchMove',80);await send('touchMove',10);
  await send('touchEnd',10);await endRecord('osrs');

  // Vertical native scrolling can interrupt a settle too; it must not jump
  // back to a stale document position when the horizontal animation ends.
  await scroll(400);await startRecord('vertical-interrupts-settle','osrs');
  await page.evaluate(()=>GoldenDualHub.switchGame('gw2'));await page.waitForTimeout(35);
  await send('touchStart',150,500);
  for(let y=475;y>=300;y-=25){await send('touchMove',150,y);await page.waitForTimeout(20);}
  await page.waitForTimeout(140);await send('touchEnd',150,300);
  await endRecord('gw2',{nativeVertical:true});
  assert.ok(await page.evaluate(()=>scrollY)>200,'vertical takeover retains its native document movement');
  await switchTo('osrs');
  await scroll(480);
  for(let i=0;i<10;i++){
   const from=(await state()).game;
   await drag('repeat-'+i,from,from==='gw2'?[325,275,205,135,65]:[65,115,185,255,325],{pause:i%2?0:16});
  }
  await startRecord('rapid-tab-reversal','osrs');
  await page.evaluate(()=>GoldenDualHub.switchGame('gw2'));await page.waitForTimeout(45);
  await page.evaluate(()=>GoldenDualHub.switchGame('osrs'));await page.waitForTimeout(45);
  await page.evaluate(()=>GoldenDualHub.switchGame('gw2'));await endRecord('gw2');

  // Resize both a live drag and a running settle, then prove the next swipe
  // still works. Orientation naturally changes layout, so it has separate
  // assertions rather than the constant-Y requirement above.
  await send('touchStart',325);await send('touchMove',210);
  await page.setViewportSize({width:844,height:390});await send('touchCancel');await idle();
  assert.equal(await page.locator('#gh-game-stage').evaluate(n=>n.style.height),'');
  await page.evaluate(()=>GoldenDualHub.switchGame('osrs'));await page.waitForTimeout(35);
  await page.setViewportSize({width:412,height:915});await idle('osrs');
  await scroll(400);
  await drag('resized-412','osrs',[65,110,155,200,245,290],{y:350});
  await page.setViewportSize({width:390,height:844});await switchTo('osrs');await scroll(480);

  // A market response arriving during a held drag must defer JSON/scan/DOM
  // and storage work until navigation is finished.
  let release;
  await page.route('**/api/v2/osrs/latest',async route=>{
   await new Promise(resolve=>release=resolve);
   await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({data:f.prices})});
  });
  await page.locator('#gh-refresh').evaluate(n=>n.click());
  await page.waitForFunction(()=>GoldenDualHub.diagnostics().loading);
  while(!release)await page.waitForTimeout(10);
  const oldStamp=(await state()).osrsPriceTimestamp;
  await startRecord('response-during-held-drag','osrs');
  await send('touchStart',65);await send('touchMove',165);release();
  await page.waitForTimeout(160);
  assert.equal((await state()).osrsPriceTimestamp,oldStamp,'response must not rebuild markets under a held finger');
  assert.equal((await state()).dragOffset,100,'held finger must hold both sheets still');
  await send('touchCancel');await endRecord('osrs');
  await page.waitForFunction(()=>!GoldenDualHub.diagnostics().loading);
  assert.deepEqual(await snapshot(),before,'selected items, chart, drafts, account, unrelated data and ledger survive all swipes');
  await switchTo('gw2');await scroll(480);await page.evaluate(()=>GPGuided.remember());
  await page.evaluate(()=>{scrollTo({top:120,behavior:'instant'});GoldenDualHub.switchGame('osrs');});await idle('osrs');
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('gp-guided-resume-v2')).scroll),120,
   'switching immediately after scrolling must update GW2 resume before hiding it');
  // Cached GW2 startup must pre-render OSRS, and restore its existing draft
  // before the first swipe instead of leaving the blank checking card.
  await page.unroute('**/api/v2/osrs/latest');
  await page.locator('.gh-trade-scroll').evaluate(n=>n.scrollTop=90);
  await switchTo('gw2');await page.waitForTimeout(220);
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('gh-view-session-v1')).panelScroll['gh-panel-osrs']),90,
   'a hidden scroller must not overwrite its saved position with zero');
  await page.goto(origin+'/?game=gw2');await page.waitForFunction(()=>window.GoldenDualHub);
  await startRecord('cached-nested-scroll-restore','gw2');
  await send('touchStart',325);await send('touchMove',205);
  assert.equal(await page.locator('.gh-trade-scroll').evaluate(n=>n.scrollTop),90,'nested scroll must be restored before the incoming panel is painted');
  await send('touchMove',115);await send('touchEnd',115);await endRecord('osrs');
  await page.waitForFunction(()=>!GoldenDualHub.diagnostics().loading);
  assert.doesNotMatch(await page.locator('#gh-item-name').innerText(),/Checking|not yet/i);
  assert.equal(await page.locator('#gh-fill-qty').inputValue(),'7');
  assert.equal(await page.locator('#gh-fill-price').inputValue(),'2000001');
  assert.deepEqual(errors,[]);
  report.status='PASS';
 }catch(error){report.status='FAIL';report.error=error.message;throw error;}
 finally{
  if(tracing){
   const ended=new Promise(resolve=>cdp.once('Tracing.tracingComplete',resolve));
   await cdp.send('Tracing.end');const {stream}=await ended;let raw='';
   for(;;){const chunk=await cdp.send('IO.read',{handle:stream});raw+=chunk.data;if(chunk.eof)break;}
   await cdp.send('IO.close',{handle:stream});fs.writeFileSync(output+'/trace.json',raw);
   const events=JSON.parse(raw).traceEvents;
   report.trace={};
   for(const name of ['Layout','UpdateLayoutTree','Paint','FunctionCall']){
    const matches=events.filter(e=>e.name===name&&e.ph==='X');
    report.trace[name]={count:matches.length,totalMs:matches.reduce((s,e)=>s+(e.dur||0)/1000,0),maxMs:Math.max(0,...matches.map(e=>(e.dur||0)/1000))};
   }
  }
  report.browser=await f.browser.version();
  fs.writeFileSync(output+'/report.json',JSON.stringify(report,null,2)+'\n');
  await f.close();
 }
})().catch(error=>{console.error(error);process.exitCode=1;});
