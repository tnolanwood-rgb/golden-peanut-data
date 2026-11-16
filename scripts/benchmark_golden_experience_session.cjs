#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs');
const {fixture}=require('../tests/helpers/hub-fixture.cjs');
const out=process.env.GE_SESSION_OUTPUT||'artifacts/audit/golden-experience/session.json';
(async()=>{
 const f=await fixture(),samples=[];
 try{
  const {page,context,origin}=f;
  await page.emulateMedia({reducedMotion:'reduce'});
  const cdp=await context.newCDPSession(page);
  await page.goto(origin+'/?game=osrs');await page.waitForFunction(()=>GoldenDualHub.diagnostics().ideas>0);
  const cycle=async()=>{
   for(const game of ['gw2','osrs']){
    await page.evaluate(g=>GoldenDualHub.switchGame(g),game);
    await page.waitForFunction(g=>GoldenDualHub.diagnostics().game===g&&!GoldenDualHub.diagnostics().transitioning,game);
   }
   await page.locator('#gh-show-chart').click();
   await page.waitForFunction(()=>GoldenOSRSChart.diagnostics().points===120);
   await page.locator('.gh-research-close').click();
  };
  for(let i=0;i<5;i++)await cycle();
  await page.evaluate(()=>localStorage.setItem('ge-synthetic-continuity','untouched'));
  for(let batch=0;batch<=4;batch++){
   if(batch)for(let i=0;i<25;i++)await cycle();
   await cdp.send('HeapProfiler.collectGarbage');
   const heap=await cdp.send('Runtime.getHeapUsage');
   const state=await page.evaluate(()=>({nodes:document.querySelectorAll('*').length,
    ledgerRows:GoldenDualHub.diagnostics().ledgerRows,game:GoldenDualHub.diagnostics().game,
    marker:localStorage.getItem('ge-synthetic-continuity')}));
   assert.equal(state.ledgerRows,0);assert.equal(state.marker,'untouched');
   if(samples.length)assert.ok(state.nodes<=samples[0].nodes+10,'DOM nodes grow across repeated cached navigation');
   samples.push({cycles:batch*25,heapUsedBytes:heap.usedSize,...state});
  }
  assert.equal(f.calls.timeseries,1,'bounded chart cache survives repeated navigation');
  assert.deepEqual(f.errors,[]);
  const report={conditions:'Headless desktop Chromium, synthetic two-item market, 5 warmup then 100 GW2↔OSRS + cached-chart cycles, reduced-motion navigation, explicit GC before each sample. Accelerated repeatability/leak probe, not hours of Android use or physical memory/power proof.',chromium:await f.browser.version(),samples,calls:f.calls,errors:f.errors};
  fs.mkdirSync(require('node:path').dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify(report));
 }finally{await f.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
