#!/usr/bin/env node
'use strict';
// Fresh CI Android emulator, independent preview package. This test NEVER
// touches the owner's installation, stored accounts, GitHub trade collectors
// or Cloudflare production services. Emulator != physical device.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {execFileSync}=require('node:child_process');
const APP='com.goldenhub.dual.preview';
const ACTIVITY='com.goldenhub.dual.MainActivity';
const OUTPUT='artifacts/audit/golden-experience/android-emulator';
fs.mkdirSync(OUTPUT,{recursive:true});
const result={schema:'golden-experience-android-webview-emulator-v1',
  environment:'Android 35 Google APIs emulator, independently identified debug APK',
  limitations:'Not original installed APK, physical phone, battery or live account validation',
  cases:[]};
const adb=(...args)=>execFileSync('adb',args,{encoding:'utf8',timeout:30000}).trim();
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const mark=(name,detail)=>result.cases.push({name,pass:true,detail});
// Android WebView exposes a PAGE CDP target, not a full Chromium browser.
// Playwright connectOverCDP sends Browser.setDownloadBehavior and is rejected;
// use Node 22's native WebSocket directly so testing stays on the real WebView.
class AndroidWebViewPage {
 constructor(socket,url) {
  this.socket=socket;this.pageUrl=url;this.next=1;this.pending=new Map();
  socket.addEventListener('message',event=>{
   let message;
   try{message=JSON.parse(String(event.data));}catch{return;}
   if(!message.id)return;
   const task=this.pending.get(message.id);if(!task)return;
   this.pending.delete(message.id);clearTimeout(task.timer);
   if(message.error)task.reject(new Error('CDP '+task.method+': '+JSON.stringify(message.error)));
   else task.resolve(message.result||{});
  });
  socket.addEventListener('close',()=>{
   for(const task of this.pending.values()){
    clearTimeout(task.timer);task.reject(new Error('WebView debugging connection closed'));
   }
   this.pending.clear();
  });
 }
 static async connect(rawUrl,pageUrl) {
  const address=new URL(rawUrl);
  address.hostname='127.0.0.1';address.port='9222';
  const socket=new WebSocket(address.href);
  await new Promise((resolve,reject)=>{
   const timer=setTimeout(()=>reject(new Error('WebView CDP socket timed out')),5000);
   socket.addEventListener('open',()=>{clearTimeout(timer);resolve();},{once:true});
   socket.addEventListener('error',()=>{clearTimeout(timer);reject(new Error('WebView CDP socket error'));},{once:true});
  });
  const page=new AndroidWebViewPage(socket,pageUrl);
  await page.send('Runtime.enable');
  await page.send('Page.enable');
  return page;
 }
 send(method,params={}) {
  const id=this.next++;
  return new Promise((resolve,reject)=>{
   const timer=setTimeout(()=>{
    this.pending.delete(id);reject(new Error('WebView CDP '+method+' timed out'));
   },15000);
   this.pending.set(id,{method,timer,resolve,reject});
   this.socket.send(JSON.stringify({id,method,params}));
  });
 }
 url(){return this.pageUrl;}
 async evaluate(fn,arg) {
  const input=typeof fn==='function'
   ? '('+fn.toString()+')('+(arguments.length>1?JSON.stringify(arg):'')+')'
   : String(fn);
  const response=await this.send('Runtime.evaluate',{
   expression:input,returnByValue:true,awaitPromise:true});
  if(response.exceptionDetails)
   throw new Error('WebView JavaScript exception: '+JSON.stringify(response.exceptionDetails).slice(0,500));
  return response.result?.value;
 }
 async waitForFunction(fn,arg,options={}) {
  const started=Date.now(),limit=options.timeout||15000;
  while(Date.now()-started<limit){
   if(await this.evaluate(fn,arg))return;
   await sleep(150);
  }
  throw new Error('Android WebView waitForFunction timed out');
 }
 async screenshot({path:destination}) {
  const screenshot=await this.send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
  assert.ok(screenshot.data,'WebView screenshot empty');
  fs.writeFileSync(destination,Buffer.from(screenshot.data,'base64'));
 }
 async close(){this.socket.close();}
}
async function locateWebView(){
 let last='unknown';
 for(let i=0;i<40;i++){
  try{
   const current=adb('shell','pidof',APP).split(/\s+/)[0];
   if(!/^\d+$/.test(current))throw Error('Android preview process not started');
   adb('forward','tcp:9222','localabstract:webview_devtools_remote_'+current);
   const response=await fetch('http://127.0.0.1:9222/json/list',{signal:AbortSignal.timeout(3000)});
   if(!response.ok)throw Error('WebView CDP HTTP '+response.status);
   const targets=await response.json();
   const found=targets.find(t=>t.url?.includes('private-dual-hub-preview.thegoldenpeanut.pages.dev'))
    ||targets.find(t=>t.type==='page');
   if(!found?.webSocketDebuggerUrl)throw Error('Android WebView page target is unavailable');
   const page=await AndroidWebViewPage.connect(found.webSocketDebuggerUrl,found.url);
   return {browser:{close:()=>page.close()},page,processId:current};
  }catch(error){last=String(error?.message||error).slice(0,240);}
  await sleep(750);
 }
 throw Error('Could not attach to debuggable Android WebView: '+last);
}
async function game(page,target){
 await page.waitForFunction(g=>window.GoldenDualHub?.diagnostics?.()?.game===g,target,{timeout:20000});
 assert.equal(await page.evaluate(()=>GoldenDualHub.diagnostics().game),target);
}
async function screenshot(page,name){
 await page.screenshot({path:path.join(OUTPUT,name+'.png'),timeout:15000});
}
async function run(){
 const apk='android/app/build/outputs/apk/debug/app-debug.apk';
 assert.ok(fs.existsSync(apk),'Missing independently built Android preview APK');
 adb('install','-r',apk);
 adb('shell','am','force-stop',APP);
 const start=adb('shell','am','start','-W','-n',APP+'/'+ACTIVITY);
 assert.match(start,/Status:\s*ok/i);
 const {browser,page,processId}=await locateWebView();
 try{
  await page.waitForFunction(()=>Boolean(window.GoldenDualHub?.diagnostics)&&
    !!document.querySelector('#gh-game-stage'),null,{timeout:30000});
  assert.match(page.url(),/^https:\/\/private-dual-hub-preview\.thegoldenpeanut\.pages\.dev\//);
  const initial=await page.evaluate(()=>({
   game:GoldenDualHub.diagnostics().game,width:innerWidth,height:innerHeight,
   tabs:!!document.querySelector('#gh-tab-gw2')&&!!document.querySelector('#gh-tab-osrs')
  }));
  assert.ok(initial.tabs && ['gw2','osrs'].includes(initial.game),'Both game tabs must be available');
  mark('cold-launch',{processId,initial});
  if(initial.game!=='gw2')await page.evaluate(()=>GoldenDualHub.switchGame('gw2'));
  await game(page,'gw2');
  await screenshot(page,'gw2-portrait');
  const contact=await page.evaluate(()=>{
   const x=innerWidth*.78;
   for(const selector of ['#gh-panel-gw2 .gp-guide-idea',
                          '#gh-panel-gw2 .gp-guide-metrics',
                          '#gh-panel-gw2 .gp-guide-header']){
    const panel=document.querySelector(selector);
    if(!panel)continue;
    const rect=panel.getBoundingClientRect();
    for(let y=Math.max(130,rect.top+12);y<Math.min(innerHeight-45,rect.bottom-10);y+=12){
     const hit=document.elementFromPoint(x,y);
     if(hit?.closest(selector)&&!hit.closest('button,input,textarea,a,select,summary,label,[role="slider"]'))
      return {x,y,cssWidth:innerWidth,cssHeight:innerHeight,dpr:devicePixelRatio};
    }
   }
   return null;
  });
  assert.ok(contact,'No touch-safe GW2 visible surface to test');
  const dims=adb('shell','wm','size').match(/(\d+)x(\d+)/);
  assert.ok(dims,'Missing emulator screen dimensions');
  const sw=Number(dims[1]),sh=Number(dims[2]),ratio=sw/contact.cssWidth;
  const verticalInset=Math.max(0,(sh-contact.cssHeight*ratio)/2);
  const y=Math.min(sh-80,Math.max(100,Math.round(verticalInset+contact.y*ratio)));
  await page.evaluate(()=>{
    const trace={start:0,move:0,end:0,cancel:0,first:null,last:null};
    window.__geAndroidTouchTrace=trace;
    for(const phase of ['start','move','end','cancel']){
      addEventListener('touch'+phase,event=>{
        trace[phase]++;
        const t=event.changedTouches?.[0];
        if(!t)return;
        const hit=event.target;
        const value={phase,x:Math.round(t.clientX),y:Math.round(t.clientY),
          target:hit?.tagName||'',className:String(hit?.className||'').slice(0,80),
          scrolling:Math.round(scrollY)};
        if(!trace.first)trace.first=value;
        trace.last=value;
      },{capture:true,passive:true});
    }
  });
  adb('shell','input','swipe',String(Math.round(sw*.78)),String(y),
      String(Math.round(sw*.18)),String(y),'350');
  let swipeFailure=null;
  try{await game(page,'osrs');}catch(error){swipeFailure=error;}
  const touch=await page.evaluate(point=>({
    trace:window.__geAndroidTouchTrace,
    game:window.GoldenDualHub?.diagnostics?.()?.game||null,
    viewport:{width:innerWidth,height:innerHeight,dpr:devicePixelRatio},
    documentScrollY:Math.round(scrollY),
    elementAtContact:document.elementFromPoint(point.x,point.y)?.outerHTML?.slice(0,300)||null
  }),{x:contact.x,y:contact.y});
  mark('native-android-input-diagnostics',{touch,contact,screen:[sw,sh],deviceY:y});
  if(swipeFailure){
    await screenshot(page,'gw2-after-unsuccessful-native-swipe');
    throw new Error('Android-native swipe did not switch games: '+
      JSON.stringify({touch,contact,screen:[sw,sh],deviceY:y}).slice(0,1900));
  }
  await screenshot(page,'osrs-native-swipe');
  mark('native-android-swipe',{from:'gw2',to:'osrs',contactY:y,screen:[sw,sh]});
  await page.evaluate(()=>window.__goldenEmulatorMarker='same-webview-document');
  adb('shell','settings','put','system','accelerometer_rotation','0');
  adb('shell','settings','put','system','user_rotation','1');
  await page.waitForFunction(()=>innerWidth>innerHeight,null,{timeout:18000});
  assert.equal(await page.evaluate(()=>window.__goldenEmulatorMarker),'same-webview-document',
               'Rotation unexpectedly reloaded the live WebView');
  await game(page,'osrs');
  await screenshot(page,'osrs-landscape');
  mark('rotation-preserves-live-document',{game:'osrs'});
  adb('shell','input','keyevent','KEYCODE_HOME');
  await sleep(700);
  adb('shell','am','start','-n',APP+'/'+ACTIVITY);
  await page.waitForFunction(()=>document.visibilityState==='visible',null,{timeout:18000});
  assert.equal(await page.evaluate(()=>window.__goldenEmulatorMarker),'same-webview-document',
               'Android resume unexpectedly reloaded active document');
  await game(page,'osrs');
  mark('background-resume-preserves-live-document',{game:'osrs'});
  await screenshot(page,'osrs-resumed');
  result.pass=true;
 } finally {
  await browser.close();
  try{adb('shell','settings','put','system','user_rotation','0');}catch{}
 }
}
run().catch(error=>{
 result.pass=false;
 result.error=String(error?.stack||error).slice(0,1500);
 console.error(result.error);process.exitCode=1;
}).finally(()=>{
 fs.writeFileSync(path.join(OUTPUT,'report.json'),JSON.stringify(result,null,2)+'\n');
 console.log('Emulator verification: '+JSON.stringify({pass:result.pass,cases:result.cases.map(x=>x.name)}));
});
