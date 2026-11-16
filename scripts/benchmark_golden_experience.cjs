#!/usr/bin/env node
'use strict';
// Controlled synthetic browser evidence; never report this as Android performance.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process');
const {fixture}=require('../tests/helpers/hub-fixture.cjs');
const out=process.env.GE_OUTPUT||'artifacts/audit/golden-experience/benchmark';
const runs=Number(process.env.GE_RUNS||10),ref=process.env.GE_ASSET_REF;
assert.ok(Number.isInteger(runs)&&runs>=1&&runs<=50);
fs.mkdirSync(out,{recursive:true});
const git=(...args)=>execFileSync('git',args,{encoding:'utf8'}).trim();
const assets=new Map();
if(ref)for(const file of git('ls-tree','-r','--name-only',ref,'app').split('\n')){
 if(/\.(html|css|js)$/.test(file))assets.set('/'+file.slice(4),execFileSync('git',['show',ref+':'+file]));
}
const report={schema:'golden-experience-browser-benchmark-v1',source:ref?git('rev-parse',ref):git('rev-parse','HEAD'),
 dirty:!!git('status','--porcelain'),node:process.version,platform:process.platform,runs,
 conditions:'Headless desktop Chromium, 390x844 touch emulation, synthetic two-item OSRS fixture; external responses intercepted, no private/live APIs. Cold=fresh browser/context/storage; warm=same context reload with retained app cache. GW2 useful-content metric is the unconnected desk shell, not account data. Timing from navigation start; no CPU/network throttle. No physical Android, WebView, power or real network claims.',samples:[],summary:{}};
const quantile=(values,p)=>[...values].sort((a,b)=>a-b)[Math.min(values.length-1,Math.ceil(values.length*p)-1)];
async function measure(f,game,phase,index){
 const {page,origin}=f;
 await page.goto(origin+'/?game='+game,{waitUntil:'domcontentloaded'});
 await page.waitForFunction(g=>window.GoldenDualHub?.diagnostics().game===g&&
  !document.documentElement.classList.contains('gh-booting')&&
  (g==='osrs'?/research item$/.test(document.querySelector('#gh-item-name')?.textContent||'')&&GoldenDualHub.diagnostics().ideas>0:
   !!document.querySelector('.gp-guided-root .gp-guide-idea')),game);
 const data=await page.evaluate(()=>{
  const ready=performance.now();
  const entry=performance.getEntriesByType('navigation')[0];
  const resources=performance.getEntriesByType('resource');
  return {readyMs:ready,fcpMs:performance.getEntriesByName('first-contentful-paint')[0]?.startTime??null,
   domContentMs:entry.domContentLoadedEventEnd,requests:resources.length,
   encodedBytes:resources.reduce((n,r)=>n+r.encodedBodySize,0),decodedBytes:resources.reduce((n,r)=>n+r.decodedBodySize,0),
   longTasks:window.__gePerf.longTasks,cls:window.__gePerf.cls,
   heapBytes:performance.memory?.usedJSHeapSize??null};
 });
 assert.deepEqual(f.errors,[]);
 report.samples.push({game,phase,index,...data});
 if(index===0){
  await page.screenshot({path:path.join(out,game+'-'+phase+'.png'),fullPage:true});
 }
}
(async()=>{
 for(const game of ['gw2','osrs'])for(let index=0;index<runs;index++){
  const f=await fixture();
  try{
   report.chromium=await f.browser.version();
   if(ref)await f.page.route(url=>url.origin===f.origin,route=>{
    const name=new URL(route.request().url()).pathname,body=assets.get(name==='/'?'/index.html':name);
    return body?route.fulfill({body,contentType:name.endsWith('.css')?'text/css':name.endsWith('.js')?'text/javascript':'text/html'}):route.fallback();
   });
   await f.page.addInitScript(()=>{
    window.__gePerf={longTasks:[],cls:0};
    new PerformanceObserver(list=>{for(const e of list.getEntries())window.__gePerf.longTasks.push({start:e.startTime,duration:e.duration});}).observe({type:'longtask',buffered:true});
    new PerformanceObserver(list=>{for(const e of list.getEntries())if(!e.hadRecentInput)window.__gePerf.cls+=e.value;}).observe({type:'layout-shift',buffered:true});
   });
   await measure(f,game,'cold',index);
   await measure(f,game,'warm',index);
   fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');
  }finally{await f.close();}
 }
 for(const game of ['gw2','osrs'])for(const phase of ['cold','warm']){
  const samples=report.samples.filter(s=>s.game===game&&s.phase===phase);
  report.summary[game+'-'+phase]=Object.fromEntries(['readyMs','fcpMs','requests','encodedBytes','decodedBytes','cls'].map(key=>{
   const values=samples.map(s=>s[key]).filter(Number.isFinite);
   return [key,values.length?{median:quantile(values,.5),p95:quantile(values,.95),p99:quantile(values,.99)}:null];
  }));
 }
 fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify(report.summary,null,2));
})().catch(error=>{console.error(error);process.exitCode=1;});
