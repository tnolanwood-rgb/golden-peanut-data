// Synthetic WebView-style recreation and mobile viewport checks; no production writes.
const assert=require('node:assert/strict'),{fixture}=require('./helpers/hub-fixture.cjs');
(async()=>{
 const f=await fixture(),{page,origin,control,calls}=f;
 try{
  let navigations=0;page.on('request',request=>{if(request.isNavigationRequest()&&request.resourceType()==='document'&&request.frame()===page.mainFrame())navigations++});
  await page.goto(origin+'/?game=osrs');
  await page.waitForFunction(()=>GoldenDualHub?.diagnostics().ideas===2&&!GoldenDualHub.diagnostics().loading);
  await page.locator('#gh-mode-value').click();
  await page.locator('#gh-next').click();
  const selected=await page.locator('#gh-item-name').innerText();
  await page.locator('#gh-settings').evaluate(n=>n.open=true);
  await page.locator('#gh-budget-input').fill('123456789');
  await page.locator('#gh-add-fill').click();
  await page.locator('#gh-fill-qty').fill('7');await page.locator('#gh-fill-price').fill('1999999');
  await page.locator('#gh-panel-osrs .gh-trade-scroll').evaluate(n=>n.scrollTop=60);
  await page.locator('#gh-show-chart').click();
  await page.waitForFunction(()=>GoldenOSRSChart.diagnostics().points>10);
  await page.locator('[data-gh-period="three"]').click();
  await page.waitForFunction(()=>GoldenOSRSChart.diagnostics().range==='three'&&GoldenOSRSChart.diagnostics().points>10);
  await page.locator('#gh-research-slider').evaluate(n=>{n.value='50';n.dispatchEvent(new Event('input',{bubbles:true}));});
  await page.locator('#gh-research-plot svg').dispatchEvent('wheel',{deltaY:-1,ctrlKey:true});
  const chart=await page.evaluate(()=>GoldenOSRSChart.diagnostics());
  for(let i=0;i<6;i++){
   await page.setViewportSize(i%2?{width:390,height:844}:{width:844,height:390});
   await page.evaluate(()=>window.dispatchEvent(new Event('orientationchange')));
   assert.equal(await page.locator('#gh-item-name').innerText(),selected);
   assert.deepEqual(await page.evaluate(()=>GoldenOSRSChart.diagnostics()),chart);
   assert.equal(await page.locator('#gh-budget-input').inputValue(),'123456789');
   assert.equal(await page.locator('#gh-fill-qty').inputValue(),'7');
  }
  assert.equal(navigations,1,'rotation must not trigger a page load');
  // Synthetic background/resume notifications, distinct from physical Android lifecycle.
  await page.evaluate(()=>{document.dispatchEvent(new Event('visibilitychange'));window.dispatchEvent(new Event('pageshow'));});
  assert.equal(await page.locator('#gh-budget-input').inputValue(),'123456789');
  await page.reload();
  await page.waitForFunction(()=>GoldenOSRSChart?.diagnostics().points>10&&!GoldenDualHub.diagnostics().loading);
  assert.equal(await page.locator('#gh-item-name').innerText(),selected);
  assert.equal(await page.locator('#gh-budget-input').inputValue(),'123456789');
  assert.equal(await page.locator('#gh-fill-qty').inputValue(),'7');
  assert.equal(await page.locator('#gh-fill-price').inputValue(),'1999999');
  assert.equal(await page.locator('#gh-settings').evaluate(n=>n.open),true);
  assert.ok(await page.locator('#gh-panel-osrs .gh-trade-scroll').evaluate(n=>n.scrollTop>=50),'internal card scroll survives recreation');
  const restored=await page.evaluate(()=>GoldenOSRSChart.diagnostics());
  assert.equal(restored.range,chart.range);assert.equal(restored.selected,chart.selected);assert.deepEqual(restored.visible,chart.visible);
  await page.locator('.gh-research-close').click();
  // A refreshed ranking must not silently change the selected item, nor the fill's item binding.
  const prior=await page.locator('#gh-fill-item').inputValue();
  f.prices[1].high=2000000;
  await page.locator('#gh-refresh').click();
  await page.waitForFunction(()=>!GoldenDualHub.diagnostics().loading);
  assert.equal(await page.locator('#gh-item-name').innerText(),selected);
  await page.locator('#gh-market-search').fill('First research');
  assert.equal(await page.locator('#gh-fill-item').inputValue(),prior);
  await page.locator('#gh-fill-form button[type=submit]').click();
  const ledger=await page.evaluate(()=>JSON.parse(localStorage.getItem('gh-osrs-v1-ledger')));
  assert.equal(ledger.length,1);assert.equal(ledger[0].name,prior);assert.equal(ledger[0].qty,7);
  await page.locator('#gh-fill-form').evaluate(n=>n.dispatchEvent(new Event('submit',{cancelable:true,bubbles:true})));
  assert.equal((await page.evaluate(()=>GoldenDualHub.diagnostics())).ledgerRows,1,'repeat submit cannot create a phantom fill');
  // Immediate input save survives reload without requiring blur/change.
  await page.locator('#gh-market-search').fill('Second research');await page.reload();
  await page.waitForFunction(()=>!GoldenDualHub.diagnostics().loading&&GoldenDualHub.diagnostics().ideas===1);
  assert.equal(await page.locator('#gh-market-search').inputValue(),'second research');
  // Original GW2 DB content and key-like data are synthetic; compare exact values after rotations/switches.
  await page.waitForFunction(()=>GoldenPeanutClean?.State?.db?.db);
  const sentinel={key:'synthetic-private-key',history:[{id:987,qty:30}],learning:{observed:42}};
  await page.evaluate(async s=>{const state=GoldenPeanutClean.State;await state.db.put('config','Fixture.1234','hub-test-original',s);localStorage.setItem('gp-focus-ui-v1',JSON.stringify({version:2,tab:'trades',tradeFilter:'memory',tradeSearch:'original query',scrollY:350}));},sentinel);
  await page.locator('#gh-tab-gw2').click();await page.waitForFunction(()=>!GoldenDualHub.diagnostics().transitioning);
  for(const size of [{width:844,height:390},{width:390,height:844},{width:844,height:390}])await page.setViewportSize(size);
  assert.equal((await page.evaluate(()=>GoldenDualHub.diagnostics())).game,'gw2');
  await page.evaluate(()=>Object.defineProperty(document,'hidden',{configurable:true,get:()=>true}));
  await page.evaluate(()=>document.dispatchEvent(new Event('visibilitychange')));
  await page.locator('#gh-tab-osrs').click();await page.waitForFunction(()=>!GoldenDualHub.diagnostics().transitioning);
  await page.evaluate(()=>{delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));});
  const original=await page.evaluate(async()=>(await GoldenPeanutClean.State.db.get('config','Fixture.1234','hub-test-original'))?.value);
  assert.deepEqual(original,sentinel);
  // A slow abandoned range request must not replace a newer chart selection.
  await page.locator('#gh-show-chart').click();
  await page.waitForFunction(()=>GoldenOSRSChart.diagnostics().points>10);
  control.hold='6h';
  await page.locator('[data-gh-period="six"]').click();
  for(let i=0;i<40&&!control.release;i++)await page.waitForTimeout(10);
  assert.ok(control.release,'slow request must actually be in flight');
  await page.locator('[data-gh-period="day"]').click();
  await page.waitForFunction(()=>GoldenOSRSChart.diagnostics().range==='day'&&GoldenOSRSChart.diagnostics().points>10);
  control.release();control.hold=null;
  await page.waitForTimeout(60);
  assert.equal((await page.evaluate(()=>GoldenOSRSChart.diagnostics())).range,'day');
  await page.locator('.gh-research-close').click();
  // Lost aggregates are explained, with research retained and no liquid advice.
  control.stale=true;await page.locator('#gh-refresh').click();await page.waitForFunction(()=>!GoldenDualHub.diagnostics().loading);
  assert.ok((await page.evaluate(()=>GoldenDualHub.diagnostics())).valueCount>0);
  await page.locator('#gh-mode-liquid').click();assert.equal((await page.evaluate(()=>GoldenDualHub.diagnostics())).ideas,0);
  assert.match(await page.locator('#gh-research-counts').innerText(),/aggregate.*stale/i);
  await page.locator('#gh-mode-value').click();assert.ok((await page.evaluate(()=>GoldenDualHub.diagnostics())).ideas>0);
  assert.match(await page.locator('#gh-caution').innerText(),/aggregate.*stale/i);
  // Honest successful-empty API state: no fabricated candidates or "loading" hang.
  control.stale=false;control.empty=true;await page.locator('#gh-refresh').click();await page.waitForFunction(()=>!GoldenDualHub.diagnostics().loading);
  assert.equal((await page.evaluate(()=>GoldenDualHub.diagnostics())).priceError,null);
  assert.equal((await page.evaluate(()=>GoldenDualHub.diagnostics())).ideas,0);
  assert.match(await page.locator('#gh-instruction-extra').innerText(),/no item mappings or latest price observations/);
  assert.ok(calls.mapping<5,'manual quote refreshes must reuse fresh mapping metadata');
  // A missing essential feed on recreation is an outage, never a zero-market claim.
  control.empty=false;control.fail='latest';
  await page.evaluate(()=>localStorage.removeItem('gh-osrs-v1-cache'));
  await page.reload();await page.waitForFunction(()=>GoldenDualHub.diagnostics().priceError&&!GoldenDualHub.diagnostics().loading);
  assert.match(await page.locator('#gh-item-name').innerText(),/Market feed unavailable/);
  assert.equal((await page.evaluate(()=>GoldenDualHub.diagnostics())).ledgerRows,1);
  control.fail=null;await page.locator('#gh-empty-retry').click();
  await page.waitForFunction(()=>!GoldenDualHub.diagnostics().loading&&GoldenDualHub.diagnostics().ideas>0);
  // Corrupt optional view state must not make otherwise valid trading data inaccessible.
  await page.evaluate(()=>localStorage.setItem('gh-view-session-v1',JSON.stringify({v:1,at:Date.now(),details:{},chart:{item:{id:1,name:{}},range:'toString'}})));
  await page.reload();await page.waitForFunction(()=>!GoldenDualHub.diagnostics().loading&&GoldenDualHub.diagnostics().ideas>0);
  assert.deepEqual(f.errors,[]);
  console.log('PASS: repeated mobile rotations, recreation, chart/draft identity, background/resume, both games, exact GW2 data continuity, stale and empty feeds');
 }finally{await f.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
