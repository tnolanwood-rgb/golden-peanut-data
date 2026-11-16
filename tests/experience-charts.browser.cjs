'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs');
const {fixture}=require('./helpers/hub-fixture.cjs');
const out='artifacts/audit/golden-experience/chart-visual';fs.mkdirSync(out,{recursive:true});
(async()=>{
 const f=await fixture(),states=[];
 try{
  const {page,origin}=f;
  await page.goto(origin+'/?game=osrs');
  await page.waitForFunction(()=>GoldenDualHub.diagnostics().ideas>0);
  f.control.hold='7d';await page.locator('#gh-show-chart').click();
  const box=async selector=>page.locator(selector).evaluate(n=>{const r=n.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height};});
  const before=await box('#gh-research-dialog');
  for(let i=0;i<50&&!f.control.release;i++)await page.waitForTimeout(20);
  assert.equal(typeof f.control.release,'function','history response must be deliberately held');
  f.control.hold=null;f.control.release();
  await page.waitForFunction(()=>GoldenOSRSChart.diagnostics().points>0);
  assert.deepEqual(await box('#gh-research-dialog'),before,'chart modal geometry is stable while observations load');
  const calls=f.calls.timeseries;
  await page.locator('.gh-research-close').click();await page.locator('#gh-show-chart').click();
  await page.waitForFunction(()=>GoldenOSRSChart.diagnostics().points>0);
  assert.equal(f.calls.timeseries,calls,'reopening cached OSRS history does not refetch');
  for(const game of ['osrs','gw2']){
   if(game==='gw2'){
    await page.evaluate(()=>{
     GoldenOSRSChart.close();GoldenDualHub.switchGame('gw2');
     GPMarketFeed.loadItemHistory=()=>new Promise(resolve=>window.__geHistory=resolve);
     GPGuidedPriceChart.open({id:1,name:'Synthetic daily price instrument'});
    });
    const before=await box('#gp-price-dialog');
    await page.evaluate(()=>{
     const day=Math.floor(Date.now()/86400000);
     window.__geHistory({source:'Synthetic daily observations',entries:new Map([[1,Array.from({length:90},(_,i)=>[day-89+i,123456+i,145678+i])]])});
    });
    await page.waitForFunction(()=>GPGuidedPriceChart.state()?.status==='ready');
    assert.deepEqual(await box('#gp-price-dialog'),before,'GW2 loading does not move the modal');
   }
   for(const viewport of [{width:320,height:740},{width:390,height:844},{width:844,height:390}]){
    await page.setViewportSize(viewport);
    await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
    const selector=game==='osrs'?'#gh-research-dialog':'#gp-price-dialog';
    const info=await page.locator(selector).evaluate(n=>{
     const chart=n.querySelector('svg'),text=chart.querySelector('text'),r=chart.getBoundingClientRect();
     return {width:n.clientWidth,scroll:n.scrollWidth,axisLabelPx:parseFloat(getComputedStyle(text).fontSize)*r.width/chart.viewBox.baseVal.width,open:n.open};
    });
    assert.ok(info.scroll<=info.width+1,game+' modal horizontal overflow');
    assert.ok(info.axisLabelPx>=12,game+' axes shrink below readable size');
    assert.equal(info.open,true);
    await page.screenshot({path:out+'/'+game+'-'+viewport.width+'.png'});
    states.push({game,viewport,...info});
   }
  }
  // Advanced tools retain their original entry point; capture the actual view.
  await page.evaluate(()=>GPGuidedPriceChart.close());
  await page.setViewportSize({width:390,height:844});
  await page.getByRole('button',{name:'Open all markets, orders, legendaries & settings'}).click();
  await page.screenshot({path:out+'/gw2-advanced.png',fullPage:true});
  assert.deepEqual(f.errors,[]);
  fs.writeFileSync(out+'/report.json',JSON.stringify({conditions:'Synthetic Chromium chart loading/cache/viewport checks; no real account or Android claims',states},null,2)+'\n');
  console.log('PASS: stable modal loading, cached reopen, readable adaptive axes, responsive charts and advanced-view entry');
 }finally{await f.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
