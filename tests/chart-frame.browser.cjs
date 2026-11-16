'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs');
const {fixture}=require('./helpers/hub-fixture.cjs');
const output=process.env.GE_CHART_OUTPUT||'artifacts/audit/golden-experience/chart-frames.json';
const baseline=process.env.GE_CHART_BASELINE==='1';
(async()=>{
 const f=await fixture(),results=[];
 try{
  const {page,origin}=f;
  await page.goto(origin+'/?game=osrs');
  await page.waitForFunction(()=>GoldenDualHub.diagnostics().ideas>0);
  await page.locator('#gh-show-chart').click();
  await page.waitForFunction(()=>GoldenOSRSChart.diagnostics().points===120);
  for(const game of ['osrs','gw2']){
   if(game==='gw2'){
    await page.evaluate(()=>{
     GoldenOSRSChart.close();GoldenDualHub.switchGame('gw2');
     const day=Math.floor(Date.now()/86400000);
     GPMarketFeed.loadItemHistory=async id=>({source:'Synthetic 90-day fixture',entries:new Map([[id,Array.from({length:90},(_,i)=>[day-89+i,10000+i,12000+i])]])});
     GPGuidedPriceChart.open({id:1,name:'Synthetic instrument'});
    });
    await page.waitForFunction(()=>GPGuidedPriceChart.state()?.status==='ready');
    await page.locator('[data-gp-range="all"]').click();
   }
   const result=await page.evaluate(async game=>{
    const dialog=document.querySelector(game==='osrs'?'#gh-research-dialog':'#gp-price-dialog');
    const chart=dialog.querySelector('svg');let renders=0;
    const observer=new MutationObserver(records=>{
     for(const record of records)for(const n of record.addedNodes)
      if(n.nodeType===1&&n.matches('svg,.gp-price-plot'))renders++;
    });
    observer.observe(dialog,{subtree:true,childList:true});
    const state=()=>game==='osrs'?GoldenOSRSChart.diagnostics():GPGuidedPriceChart.state();
    const initial=state(),send=(type,id,x,target=dialog)=>target.dispatchEvent(new PointerEvent(type,{bubbles:true,pointerId:id,pointerType:'touch',clientX:x,clientY:200}));
    send('pointerdown',71,100,chart);send('pointerdown',72,140,chart);
    const started=performance.now();
    // A burst models several coalesced pointer updates between display frames.
    for(let i=1;i<=60;i++)send('pointermove',72,140+i*5);
    const synchronousMs=performance.now()-started;
    send('pointerup',72,440);send('pointerup',71,100);
    await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
    observer.disconnect();
    const after=state();
    // Cancellation must not select a different observation.
    const selected=after.selected;
    send('pointerdown',73,120,dialog.querySelector('svg'));send('pointercancel',73,360);
    await new Promise(resolve=>requestAnimationFrame(resolve));
    return {game,events:60,renders,synchronousMs,initial,after,cancelSelected:state().selected,selected,open:dialog.open,desk:GoldenDualHub.diagnostics().game};
   },game);
   assert.equal(result.open,true,'chart interaction must not close modal');
   if(game==='gw2')assert.equal(result.after.viewSize,11,'pinch preserves exact final daily window');
   else assert.equal(result.after.visible[1]-result.after.visible[0],14,'pinch preserves exact final bucket window');
   if(!baseline){assert.ok(result.renders<=1,'at most one chart rebuild per frame: '+JSON.stringify(result));assert.equal(result.cancelSelected,result.selected,'cancel is not point selection');}
   results.push(result);
  }
  assert.deepEqual(f.errors,[]);
  fs.mkdirSync(require('node:path').dirname(output),{recursive:true});
  fs.writeFileSync(output,JSON.stringify({conditions:'Headless desktop Chromium; synthetic 120-bucket OSRS / 90-day GW2 history, 60 pointer moves in a single JS task. Counts render work, not physical touch latency or FPS.',baseline,results},null,2)+'\n');
  console.log(JSON.stringify(results.map(({game,events,renders,synchronousMs})=>({game,events,renders,synchronousMs}))));
 }finally{await f.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
