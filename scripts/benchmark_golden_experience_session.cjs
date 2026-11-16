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
  // GW2 account/priority paints can finish after the first navigation, so a
  // 5-cycle baseline sometimes precedes a one-time 39-node startup mount.
  // Keep that initial DOM difference visible, but measure retained growth only
  // after a fuller, separately recorded initialization/warmup phase.
  for(let i=0;i<5;i++)await cycle();
  const earlyWarmupNodes=await page.evaluate(()=>document.querySelectorAll('*').length);
  for(let i=0;i<25;i++)await cycle();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(180);
  const settledWarmupNodes=await page.evaluate(()=>document.querySelectorAll('*').length);
  const warmup={earlyCycles:5,settledCycles:30,earlyNodes:earlyWarmupNodes,
   settledNodes:settledWarmupNodes,delta: settledWarmupNodes-earlyWarmupNodes};
  if(Math.abs(warmup.delta)>10)
   console.warn('Pre-measurement initialization DOM shift (not ignored): '+JSON.stringify(warmup));
  await page.evaluate(()=>localStorage.setItem('ge-synthetic-continuity','untouched'));
  for(let batch=0;batch<=4;batch++){
   if(batch)for(let i=0;i<25;i++)await cycle();
   await cdp.send('HeapProfiler.collectGarbage');
   const heap=await cdp.send('Runtime.getHeapUsage');
   const state=await page.evaluate(()=>{
    const counts={};
    for(const selector of ['#gh-osrs-root','.gp-guided-root','#gh-research-dialog','#gp-price-dialog','#gh-game-stage']){
     counts[selector]=document.querySelector(selector)?.querySelectorAll('*').length??null;
    }
    const tags={};for(const el of document.querySelectorAll('*'))tags[el.tagName]=(tags[el.tagName]||0)+1;
    // ID-scoped counts show precisely where an eventual paint differs from
    // the baseline, without altering production DOM or excluding any nodes.
    const gw2Ids={};
    for(const el of document.querySelectorAll('#gh-panel-gw2 [id]'))
     if(el.id)gw2Ids[el.id]=el.querySelectorAll('*').length;
    return {nodes:document.querySelectorAll('*').length,counts,tags,gw2Ids,
     ledgerRows:GoldenDualHub.diagnostics().ledgerRows,game:GoldenDualHub.diagnostics().game,
     marker:localStorage.getItem('ge-synthetic-continuity')};
   });
   assert.equal(state.ledgerRows,0);assert.equal(state.marker,'untouched');
   samples.push({cycles:batch*25,heapUsedBytes:heap.usedSize,...state});
   if(state.nodes>samples[0].nodes+10){
    const before=samples[0].gw2Ids,after=samples.at(-1).gw2Ids;
    const gw2Delta=[...new Set([...Object.keys(before),...Object.keys(after)])]
     .map(id=>({id,before:before[id]??null,after:after[id]??null,
      delta:(after[id]??0)-(before[id]??0)}))
     .filter(x=>x.delta!==0).sort((a,b)=>Math.abs(b.delta)-Math.abs(a.delta));
    fs.mkdirSync(require('node:path').dirname(out),{recursive:true});
    fs.writeFileSync(out,JSON.stringify({status:'FAILED_DOM_GROWTH',conditions:'Synthetic retained-session diagnostic; no real account data',warmup,gw2Delta,samples,calls:f.calls},null,2)+'\n');
    assert.fail('DOM nodes grow across repeated cached navigation: '+JSON.stringify({
      baseline:{cycles:samples[0].cycles,nodes:samples[0].nodes,counts:samples[0].counts},
      current:{cycles:samples.at(-1).cycles,nodes:samples.at(-1).nodes,counts:samples.at(-1).counts},
      gw2Delta:gw2Delta.slice(0,30)}));
   }
  }
  assert.equal(f.calls.timeseries,1,'bounded chart cache survives repeated navigation');
  assert.deepEqual(f.errors,[]);
  const report={conditions:'Headless desktop Chromium, synthetic two-item market, 5 early +25 settled initialization cycles (recorded separately), then 100 GW2↔OSRS + cached-chart measured cycles, reduced-motion navigation, explicit GC before each sample. Same strict post-warmup DOM growth guard; not hours of Android use or physical memory/power proof.',chromium:await f.browser.version(),warmup,samples,calls:f.calls,errors:f.errors};
  fs.mkdirSync(require('node:path').dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify(report));
 }finally{await f.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
