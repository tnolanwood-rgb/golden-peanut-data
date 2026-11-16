// Verify actual deployed public assets with native Chromium touch input.
// Fresh browser storage: no account credentials or private production APIs.
const {chromium}=require('playwright-core'),fs=require('node:fs'),assert=require('node:assert/strict');
(async()=>{
 const origin='https://thegoldenpeanut.pages.dev',dir='artifacts/audit/swipe-production';
 const expected=process.env.GP_EXPECTED_RELEASE_SHA||process.env.GITHUB_SHA;
 assert.match(expected||'',/^[a-f0-9]{40}$/,'Expected production commit is required');
 fs.mkdirSync(dir,{recursive:true});
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||(fs.existsSync('/usr/bin/chromium')?'/usr/bin/chromium':chromium.executablePath()),headless:true,args:['--no-sandbox']});
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 const page=await context.newPage(),cdp=await context.newCDPSession(page),errors=[];
 const report={origin,expected,conditions:'Actual public production, fresh Chromium mobile emulation; not a physical phone',results:[]};
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
   const y=from==='osrs'?420:350,x0=from==='osrs'?65:325,sign=from==='osrs'?1:-1;
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
  const before=await page.locator('.gh-trade-scroll').evaluate(n=>n.scrollTop);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:180,y:690,id:1}]});
  for(let y=675;y>=450;y-=15){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:181,y,id:1}]});await page.waitForTimeout(20);}
  await page.waitForTimeout(120);await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForTimeout(150);
  const after=await page.locator('.gh-trade-scroll').evaluate(n=>n.scrollTop);
  assert.ok(after>before+50,'Vertical touch actually scrolls the same recommendation box');
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
