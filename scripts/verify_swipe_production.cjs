// Verify actual deployed public assets with native Chromium touch input.
// Fresh browser storage: no account credentials or private production APIs.
const {chromium}=require('playwright-core'),fs=require('node:fs'),assert=require('node:assert/strict');
(async()=>{
 const origin=process.env.GP_VERIFY_ORIGIN||'https://thegoldenpeanut.pages.dev',dir=process.env.GP_VERIFY_OUTPUT||'artifacts/audit/swipe-production';
 assert.ok(['https://thegoldenpeanut.pages.dev','https://golden-experience-staging.pages.dev'].includes(origin),'Only the known public production/staging origins may be verified');
 const expected=process.env.GP_EXPECTED_RELEASE_SHA||process.env.GITHUB_SHA;
 assert.match(expected||'',/^[a-f0-9]{40}$/,'Expected production commit is required');
 fs.mkdirSync(dir,{recursive:true});
 // Cloud workspaces may require their configured egress proxy. Keep it
 // opt-in, pass credentials separately and never print the proxy URL.
 const proxyURL=process.env.GP_VERIFY_PROXY?new URL(process.env.GP_VERIFY_PROXY):null;
 const proxy=proxyURL?{server:proxyURL.origin,
  ...(proxyURL.username?{username:decodeURIComponent(proxyURL.username),password:decodeURIComponent(proxyURL.password)}:{})}:undefined;
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||(fs.existsSync('/usr/bin/chromium')?'/usr/bin/chromium':chromium.executablePath()),headless:true,args:['--no-sandbox']});
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,...(proxy?{proxy}:{})});
 const page=await context.newPage(),cdp=await context.newCDPSession(page),errors=[];
 const report={origin,expected,conditions:'Actual public served assets, fresh Chromium mobile emulation; not a physical phone',results:[]};
 page.on('pageerror',e=>errors.push(e.message));
 try{
  const identity=await page.request.get(origin+'/build-info.json',{headers:{'Cache-Control':'no-cache'}});
  assert.equal(identity.status(),200);assert.equal((await identity.json()).commit,expected);
  const response=await page.goto(origin+'/?game=osrs',{waitUntil:'domcontentloaded'});
  assert.equal(response.status(),200);
  await page.waitForFunction(()=>window.GoldenDualHub&&window.GPGuided&&!GoldenDualHub.diagnostics().loading&&!document.body.classList.contains('gp-ui-booting'));
  assert.equal(await page.locator('script[data-gp-guided-static]').count(),1,'Both desks must use the ordered startup');
  await page.evaluate(()=>scrollTo({top:480,behavior:'instant'}));await page.waitForTimeout(200);
  const selected=await page.evaluate(()=>GoldenDualHub.diagnostics().selectedId);
  for(let i=0;i<6;i++){
   const from=await page.evaluate(()=>GoldenDualHub.diagnostics().game),next=from==='osrs'?'gw2':'osrs';
   await page.evaluate(()=>{
    window.__frames=[];window.__capture=true;
    const sample=t=>{
     const panels=['osrs','gw2'].map(g=>{const p=document.querySelector('#gh-panel-'+g),r=(p.querySelector('.gp-guide-header')||p).getBoundingClientRect();return {g,hidden:p.hidden,x:r.x,y:r.y}});
     __frames.push({t,moving:!!document.querySelector('#gh-game-stage.gh-stage-moving'),panels});
     if(__capture)requestAnimationFrame(sample);
    };requestAnimationFrame(sample);
   });
   // Derive coordinates from the visible scroller after responsive layout changes.
   if(from==='osrs')await page.locator('.gh-trade-scroll').scrollIntoViewIfNeeded();
   const y=from==='osrs'?await page.locator('.gh-trade-scroll').evaluate(n=>{
    const r=n.getBoundingClientRect(),nav=document.querySelector('#gh-game-nav').getBoundingClientRect();
    return Math.max(nav.bottom+20,Math.min(innerHeight-60,r.top+Math.min(100,r.height/2)));
   }):350,x0=from==='osrs'?65:325,sign=from==='osrs'?1:-1;
   if(from==='osrs')assert.equal(await page.evaluate(y=>!!document.elementFromPoint(65,y)?.closest('.gh-trade-scroll'),y),true,'Native swipe starts inside the recommendation scroller');
   const send=(type,x)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:type==='touchEnd'?[]:[{x,y,id:1}]});
   if(i===0)await page.screenshot({path:dir+'/start.png'});
   await send('touchStart',x0);
   for(let dx=20;dx<=220;dx+=20){await send('touchMove',x0+sign*dx);await page.waitForTimeout(24);}
   if(i===0)await page.screenshot({path:dir+'/held-drag.png'});
   await send('touchEnd',x0+sign*220);
   await page.waitForFunction(next=>GoldenDualHub.diagnostics().game===next&&!GoldenDualHub.diagnostics().transitioning,next);
   await page.waitForTimeout(60);
   const frames=await page.evaluate(()=>{__capture=false;return __frames;});let maxJump=0;
   for(let j=1;j<frames.length;j++)for(let k=0;k<2;k++){
    const a=frames[j-1],b=frames[j];
    if(!a.panels[k].hidden&&!b.panels[k].hidden&&(a.moving||b.moving))maxJump=Math.max(maxJump,Math.abs(a.panels[k].y-b.panels[k].y));
   }
   assert.ok(frames.some(f=>f.moving),'Capture actual visible movement');
   assert.ok(maxJump<1.5,'Production vertical discontinuity '+maxJump);
   report.results.push({from,next,frames:frames.length,maxJump});
   fs.writeFileSync(dir+'/frames-'+i+'.json',JSON.stringify(frames));
  }
  assert.equal(await page.evaluate(()=>GoldenDualHub.diagnostics().selectedId),selected);
  // Derive a real visible contact surface from this release's layout rather
  // than assuming an old hardcoded screen coordinate hits the inner scroller.
  const inner=page.locator('#gh-panel-osrs .gh-trade-scroll').first();
  await inner.scrollIntoViewIfNeeded();
  await inner.evaluate(el=>{el.scrollTop=0;});
  await page.waitForTimeout(150);
  const geometry=await inner.evaluate(el=>{
    const rect=el.getBoundingClientRect();
    const top=Math.max(90,Math.ceil(rect.top)+24);
    const bottom=Math.min(innerHeight-28,Math.floor(rect.bottom)-24);
    return {x:Math.round(Math.max(rect.left+22,Math.min(rect.right-22,rect.left+rect.width*.5))),
      top,bottom,overflow:el.scrollHeight-el.clientHeight,docY:scrollY};
  });
  assert.ok(geometry.overflow>80,'OSRS inner scroll must contain enough content');
  assert.ok(geometry.bottom-geometry.top>135,'OSRS inner scroll must be visibly touchable');
  const x=geometry.x, y0=geometry.bottom-8, y1=Math.max(geometry.top+8,y0-200);
  const validHit=await page.evaluate(({x,y})=>!!document.elementFromPoint(x,y)?.closest('#gh-panel-osrs .gh-trade-scroll'),{x,y:y0});
  assert.equal(validHit,true,'Native vertical touch must begin inside the real OSRS scroller');
  const before=await inner.evaluate(el=>el.scrollTop);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y:y0,id:1}]});
  for(let y=y0-15;y>=y1;y-=15){
    await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y,id:1}]});
    await page.waitForTimeout(20);
  }
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await page.waitForTimeout(180);
  const after=await inner.evaluate(el=>el.scrollTop);
  const docAfter=await page.evaluate(()=>scrollY);
  assert.ok(after>before+50,'Native vertical gesture must scroll OSRS inner recommendations: '+JSON.stringify({before,after,geometry}));
  assert.equal(docAfter,geometry.docY,'Native inner scroll must not move the document');
  assert.equal(await page.evaluate(()=>GoldenDualHub.diagnostics().game),'osrs');
  assert.deepEqual(errors,[]);
  await page.screenshot({path:dir+'/end.png'});
  Object.assign(report,{status:'PASS',browser:await browser.version(),verticalScrollDelta:after-before,selectedIdPreserved:true,errors});
 }catch(error){
  Object.assign(report,{status:'FAIL',error:error.message,errors});
  report.diagnostics=await page.evaluate(()=>({hub:window.GoldenDualHub?.diagnostics(),scroll:scrollY,body:document.body?.className,hit:document.elementFromPoint(65,420)?.tagName})).catch(()=>null);
  await page.screenshot({path:dir+'/failure.png'}).catch(()=>{});throw error;
 }finally{
  fs.writeFileSync(dir+'/report.json',JSON.stringify(report,null,2)+'\n');
  console.log('PRODUCTION_SWIPE_VERIFICATION '+JSON.stringify(report));await browser.close();
 }
})().catch(error=>{console.error(error);process.exitCode=1;});
