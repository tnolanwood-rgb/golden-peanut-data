#!/usr/bin/env node
'use strict';
// Fresh CI Android emulator, independent preview package. This test NEVER
// touches the owner's installation, stored accounts, GitHub trade collectors
// or Cloudflare production services. Emulator != physical device.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {execFileSync}=require('node:child_process');
const {chromium}=require('playwright-core');
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
async function locateWebView(){
 let last='unknown';
 for(let i=0;i<40;i++){
  try{
   const current=adb('shell','pidof',APP).split(/\s+/)[0];
   if(!/^\d+$/.test(current))throw Error('Android preview process not started');
   adb('forward','tcp:9222','localabstract:webview_devtools_remote_'+current);
   const browser=await chromium.connectOverCDP('http://127.0.0.1:9222',{timeout:3000});
   const pages=browser.contexts().flatMap(context=>context.pages());
   const page=pages.find(p=>p.url().includes('private-dual-hub-preview.thegoldenpeanut.pages.dev'))||pages[0];
   if(page)return {browser,page,processId:current};
   await browser.close();
   last='WebView browser target not exposed';
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
  adb('shell','input','swipe',String(Math.round(sw*.78)),String(y),
      String(Math.round(sw*.18)),String(y),'350');
  await game(page,'osrs');
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
