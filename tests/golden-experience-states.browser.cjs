'use strict';
// Protected Golden Experience acceptance: synthetic OSRS interactions and failure states.
// This is browser functional/visual evidence, NOT physical Android/WebView certification.
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {fixture}=require('./helpers/hub-fixture.cjs');
const out=process.env.GE_STATES_OUTPUT||'artifacts/audit/golden-experience/states';
(async()=>{
 fs.mkdirSync(out,{recursive:true});
 const f=await fixture(),samples=[],states=[];
 try{
  const {page,origin,control}=f;
  await page.goto(origin+'/?game=osrs');
  await page.waitForFunction(()=>GoldenDualHub?.diagnostics().game==='osrs'&&GoldenDualHub.diagnostics().ideas>0);
  assert.equal(await page.locator('#gh-tab-osrs').getAttribute('aria-selected'),'true');

  const startingItem=await page.locator('#gh-item-name').innerText();
  // Synchronous handler+DOM cost is an instrumentation proxy, NOT first finger-to-paint latency.
  const latencies=await page.evaluate(()=>{
   const next=document.querySelector('#gh-next'),prev=document.querySelector('#gh-previous');
   const rows=[];
   for(let i=0;i<40;i++){
    const button=i%2===0?next:prev;
    if(button.disabled)throw Error('Expected both synthetic recommendations to be navigable');
    const before=GoldenDualHub.diagnostics().selectedId,started=performance.now();
    button.click();
    const synchronousMs=performance.now()-started;
    const after=GoldenDualHub.diagnostics().selectedId;
    if(after===before)throw Error('The recommendation did not change');
    rows.push({direction:i%2===0?'next':'previous',synchronousMs,
     expectedVisibleName:document.querySelector('#gh-item-name')?.textContent||''});
   }
   return rows;
  });
  const percentile=(a,p)=>[...a].sort((x,y)=>x-y)[Math.min(a.length-1,Math.ceil(a.length*p)-1)];
  const ms=latencies.map(x=>x.synchronousMs);
  samples.push({metric:'osrs-click-handler-plus-sync-render',units:'ms',
   n:ms.length,median:percentile(ms,.5),p95:percentile(ms,.95),max:Math.max(...ms),
   note:'Synthetic JS click handler duration only; not user-perceived tap response or native frame time'});
  assert.equal(await page.locator('#gh-item-name').innerText(),startingItem,'repeated Next/Previous returns to exact starting item');
  assert.equal(await page.locator('#gh-previous').isDisabled(),true);
  states.push({state:'repeated-navigation',game:'osrs',iterations:40,startingItem,ledgerRows:0});

  // Real settings controls and valuable metadata must remain usable in portrait.
  await page.locator('#gh-settings-toggle').click();
  assert.equal(await page.locator('#gh-settings').evaluate(n=>n.open),true);
  await page.locator('#gh-budget-input').fill('250000000');
  await page.locator('#gh-mode').selectOption('members');
  await page.locator('#gh-apply').click();
  await page.waitForFunction(()=>document.querySelector('#gh-budget-metric')?.textContent.includes('250,000,000'));
  assert.match(await page.locator('#gh-account-metric').innerText(),/Members/);
  states.push({state:'settings-applied',budget:'250,000,000 gp',account:'members'});
  await page.setViewportSize({width:320,height:740});
  await page.evaluate(()=>document.documentElement.style.fontSize='24px');
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.locator('#gh-settings-toggle').click();
  await page.screenshot({path:path.join(out,'osrs-settings-320-large-font.png'),fullPage:true});
  const layout=await page.evaluate(()=>{
   const root=document.documentElement,form=document.querySelector('#gh-settings');
   const controls=[...form.querySelectorAll('button,input,select')].filter(x=>x.getClientRects().length);
   return {width:root.clientWidth,scrollWidth:root.scrollWidth,
    touched:controls.map(e=>({tag:e.tagName,id:e.id,height:Math.round(e.getBoundingClientRect().height)})),
    settingsOpen:form.open};
  });
  assert.ok(layout.scrollWidth<=layout.width+1,'OSRS settings must not overflow small-phone viewport');
  // Exact visible money must be readable as a single number at 320px with
  // enlarged Android-style text, not "250,000,00" followed by a lonely "0".
  const moneyGlyphs=await page.locator('#gh-budget-metric .gh-coin-amount span, #gh-budget-metric.gh-coin-amount span')
   .first().evaluate(span=>{
    const text=span.firstChild?.textContent||'',value='250,000,000';
    const range=document.createRange();range.setStart(span.firstChild,0);range.setEnd(span.firstChild,value.length);
    const boxes=[...range.getClientRects()].map(r=>({top:r.top,width:r.width}));
    return {text,boxes};
   });
  assert.ok(moneyGlyphs.text.startsWith('250,000,000 gp'),'the exact manually entered GP value remains visible');
  assert.equal(moneyGlyphs.boxes.length,1,
   '250,000,000 must remain a single intact readout at 320px enlarged font: '+JSON.stringify(moneyGlyphs));
  assert.equal(layout.settingsOpen,true);
  assert.ok(layout.touched.length>=4,'Settings controls remain present');
  states.push({state:'settings-visual',viewport:'320x740',font:'24px',layout});
  await page.locator('#gh-settings-toggle').click();

  // A confirmed purchase is a ledger record, not realised profit or an in-game action.
  await page.locator('#gh-add-fill').click();
  await page.locator('#gh-fill-side').selectOption('buy');
  await page.locator('#gh-fill-qty').fill('3');
  await page.locator('#gh-fill-price').fill('1000000');
  await page.locator('#gh-fill-form button[type=submit]').click();
  await page.waitForFunction(()=>GoldenDualHub.diagnostics().ledgerRows===1);
  assert.match(await page.locator('#gh-fill-feedback').innerText(),/Recorded purchase/);
  assert.match(await page.locator('#gh-today').innerText(),/0 gp/);
  assert.equal(await page.locator('#gh-holdings').isVisible(),true,'Owned-item sale entry must persist');
  assert.match(await page.locator('#gh-holdings-list').innerText(),/3 remaining/);
  await page.screenshot({path:path.join(out,'osrs-recorded-purchase-320.png'),fullPage:true});
  states.push({state:'recorded-purchase',ledgerRows:1,qty:3,realised:'0 gp'});

  // Switching desks must not lose the recorded purchase; temporary navigation is not a cold launch.
  await page.evaluate(()=>GoldenDualHub.switchGame('gw2'));
  await page.waitForFunction(()=>GoldenDualHub.diagnostics().game==='gw2');
  await page.evaluate(()=>GoldenDualHub.switchGame('osrs'));
  await page.waitForFunction(()=>GoldenDualHub.diagnostics().game==='osrs');
  assert.equal((await page.evaluate(()=>GoldenDualHub.diagnostics())).ledgerRows,1);

  // Even a completely broken Wiki endpoint must not erase the user's saved ledger.
  await page.evaluate(()=>localStorage.removeItem('gh-osrs-v1-cache'));
  control.fail='mapping';
  await page.goto(origin+'/?game=osrs');
  await page.waitForFunction(()=>GoldenDualHub.diagnostics().loading===false&&GoldenDualHub.diagnostics().priceError!==null);
  assert.equal((await page.evaluate(()=>GoldenDualHub.diagnostics())).ledgerRows,1);
  assert.match(await page.locator('#gh-status').innerText(),/unavailable/i);
  assert.match(await page.locator('#gh-holdings-list').innerText(),/3 remaining/);
  await page.screenshot({path:path.join(out,'osrs-feed-unavailable-320.png'),fullPage:true});
  states.push({state:'offline-mapping-failure',ledgerRows:1,unverified:true});

  // Recovery uses a fresh verified feed, not a made-up prior quote.
  control.fail=null;
  await page.locator('#gh-empty-retry').click();
  await page.waitForFunction(()=>GoldenDualHub.diagnostics().loading===false&&
   GoldenDualHub.diagnostics().ideas>0&&!GoldenDualHub.diagnostics().priceError);
  assert.equal((await page.evaluate(()=>GoldenDualHub.diagnostics())).ledgerRows,1);
  await page.screenshot({path:path.join(out,'osrs-recovered-320.png'),fullPage:true});
  states.push({state:'feed-recovered',ledgerRows:1});

  assert.deepEqual(f.errors,[]);
  const report={schema:'golden-experience-states-v1',
   conditions:'Synthetic browser on Chromium using mocked Wiki feeds and local-only ledger, 320px large-font plus reduced motion. No private account, physical device, production URL or permission change.',
   states,samples,calls:f.calls,errors:f.errors};
  fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');
  console.log('PASS Golden Experience state matrix: '+states.map(x=>x.state).join(', '));
  console.log('Synthetic click handler timings: '+JSON.stringify(samples));
 }finally{await f.close();}
})().catch(e=>{console.error(e.stack||e);process.exitCode=1;});
