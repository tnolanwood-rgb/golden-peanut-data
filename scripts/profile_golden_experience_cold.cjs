#!/usr/bin/env node
'use strict';
// Controlled CPU-sampled Chromium startup diagnostics; not an Android benchmark.
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {execFileSync}=require('node:child_process');
const {fixture}=require('../tests/helpers/hub-fixture.cjs');
const baseline=process.env.GE_BASE_REF||'097f012c1f912411790dd7dce21434a9cdc497d2';
const rounds=Number(process.env.GE_COLD_RUNS||10);
const dest=process.env.GE_COLD_OUTPUT||'artifacts/audit/golden-experience/osrs-cold-profile.json';
assert.ok(Number.isInteger(rounds)&&rounds>0&&rounds<=30);
const git=(...args)=>execFileSync('git',args,{encoding:'utf8'}).trim();
function assets(ref){
 const files=ref?git('ls-tree','-r','--name-only',ref,'app').split('\n'):
  fs.readdirSync('app',{recursive:true}).map(x=>'app/'+x);
 const map=new Map();
 for(const file of files)if(/\.(?:html|js|css)$/.test(file)){
  map.set('/'+file.slice(4),ref?execFileSync('git',['show',ref+':'+file]):fs.readFileSync(file));
 }
 return map;
}
const sources={baseline:assets(baseline),candidate:assets(null)};
function manifest(map){
 return crypto.createHash('sha256').update([...map].sort(([a],[b])=>a.localeCompare(b))
  .map(([p,v])=>p+' '+crypto.createHash('sha256').update(v).digest('hex')).join('\n')).digest('hex');
}
const output={schema:'golden-experience-osrs-cold-cpu-v1',
 candidateHead:git('rev-parse','HEAD'),baseline:git('rev-parse',baseline),rounds,
 sourceManifest:Object.fromEntries(Object.entries(sources).map(([k,v])=>[k,manifest(v)])),
 conditions:'Headless desktop Chromium 390x844 mobile-touch emulation. Fresh browser/context each trial, two-item synthetic Wiki fixtures, blocked external requests, identical intercepted static transport; ABBA sequential order. CPU sampling adds overhead to both revisions. Not Android WebView, hardware FPS, genuine network, real-account speed or predictive accuracy.',
 runs:[],summary:{}};
const q=(rows,p)=>[...rows].sort((a,b)=>a-b)[Math.min(rows.length-1,Math.ceil(p*rows.length)-1)];
function topCpu(profile){
 const ids=new Map((profile.nodes||[]).map(n=>[n.id,n.callFrame]));
 const times=new Map();
 for(let i=0;i<(profile.samples||[]).length;i++){
  const frame=ids.get(profile.samples[i])||{};
  const name=(frame.functionName||'(anonymous)')+' @ '+(frame.url?.split('?')[0]?.split('/').pop()||'(browser)');
  times.set(name,(times.get(name)||0)+(profile.timeDeltas?.[i]||0));
 }
 const total=[...times.values()].reduce((a,b)=>a+b,0);
 return [...times].sort((a,b)=>b[1]-a[1]).slice(0,12).map(([name,us])=>({
  frame:name,ms:Math.round(us/100)/10,sharePct:total?Math.round(us/total*1000)/10:0
 }));
}
async function measure(source,index){
 const f=await fixture(),map=sources[source];
 try{
  const {page,context,origin}=f;
  output.chromium=await f.browser.version();
  await page.route(url=>url.origin===origin,route=>{
   const p=new URL(route.request().url()).pathname,name=p==='/'?'/index.html':p;
   const body=map.get(name);
   if(body)return route.fulfill({body,contentType:name.endsWith('.css')?'text/css':name.endsWith('.js')?'text/javascript':'text/html'});
   if(/\.(?:html|css|js)$/.test(name))return route.fulfill({status:404,body:'Missing in source revision'});
   return route.fallback();
  });
  await page.addInitScript(()=>{
   window.__cold={longTasks:[],cls:0};
   try{
    new PerformanceObserver(list=>{
     for(const entry of list.getEntries())window.__cold.longTasks.push({start:entry.startTime,duration:entry.duration});
    }).observe({type:'longtask',buffered:true});
    new PerformanceObserver(list=>{
     for(const entry of list.getEntries())if(!entry.hadRecentInput)window.__cold.cls+=entry.value;
    }).observe({type:'layout-shift',buffered:true});
   }catch{}
  });
  const cdp=await context.newCDPSession(page);
  await cdp.send('Profiler.enable');await cdp.send('Profiler.start');
  await page.goto(origin+'/?game=osrs',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.GoldenDualHub?.diagnostics().game==='osrs'&&
   !document.documentElement.classList.contains('gh-booting')&&
   GoldenDualHub.diagnostics().ideas>0&&
   /research item$/.test(document.querySelector('#gh-item-name')?.textContent||''),null,{timeout:20000});
  const data=await page.evaluate(()=>{
   const nav=performance.getEntriesByType('navigation')[0];
   const paint=performance.getEntriesByType('paint');
   const resources=performance.getEntriesByType('resource');
   return {readyMs:performance.now(),dclMs:nav?.domContentLoadedEventEnd??null,
    fcpMs:paint.find(x=>x.name==='first-contentful-paint')?.startTime??null,
    requestCount:resources.length,decodedBytes:resources.reduce((s,x)=>s+x.decodedBodySize,0),
    slowResources:resources.filter(x=>x.initiatorType==='script'||x.initiatorType==='link')
     .sort((a,b)=>b.duration-a.duration).slice(0,6).map(x=>({
      file:new URL(x.name).pathname,durationMs:Math.round(x.duration*10)/10
     })),
    longTasks:window.__cold.longTasks,cls:window.__cold.cls};
  });
  const {profile}=await cdp.send('Profiler.stop');
  assert.deepEqual(f.errors,[]);
  output.runs.push({source,index,...data,cpuTop:topCpu(profile)});
 }finally{await f.close();}
}
(async()=>{
 for(let i=0;i<rounds;i++){
  for(const source of (i%2?['candidate','baseline']:['baseline','candidate']))await measure(source,i);
  fs.mkdirSync(path.dirname(dest),{recursive:true});
  fs.writeFileSync(dest,JSON.stringify(output,null,2)+'\n');
 }
 for(const source of Object.keys(sources)){
  const runs=output.runs.filter(x=>x.source===source),t=runs.map(x=>x.readyMs);
  output.summary[source]={readyMs:{median:q(t,.5),p95:q(t,.95),min:Math.min(...t),max:Math.max(...t)},
   slowest:runs.slice().sort((a,b)=>b.readyMs-a.readyMs).slice(0,3).map(x=>({
    index:x.index,readyMs:x.readyMs,dclMs:x.dclMs,slowResources:x.slowResources,
    longTasks:x.longTasks,cpuTop:x.cpuTop.slice(0,8)
   }))};
 }
 fs.writeFileSync(dest,JSON.stringify(output,null,2)+'\n');
 console.log(JSON.stringify({conditions:output.conditions,sourceManifest:output.sourceManifest,
  candidateHead:output.candidateHead,baseline:output.baseline,summary:output.summary},null,2));
})().catch(error=>{console.error(error?.stack||error);process.exitCode=1;});
