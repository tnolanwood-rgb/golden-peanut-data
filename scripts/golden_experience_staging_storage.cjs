// Isolated staging-only, synthetic same-origin storage continuity. No account APIs or secrets.
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright-core');
const mode=process.argv[2];
const origin='https://golden-experience-staging.pages.dev';
assert.ok(['seed','verify'].includes(mode),'Use seed or verify');
assert.ok(process.env.RUNNER_TEMP,'RUNNER_TEMP required');
const profile=path.join(process.env.RUNNER_TEMP,'ge-unchanged-origin-storage-profile');
const marker='GE-SYNTHETIC-ORIGIN-PERSISTENCE-20261118';
const database='ge-synthetic-storage-survival';
(async()=>{
 const context=await chromium.launchPersistentContext(profile,{
  executablePath:process.env.CHROMIUM_PATH||(fs.existsSync('/usr/bin/chromium')?'/usr/bin/chromium':chromium.executablePath()),
  headless:true,args:['--no-sandbox'],viewport:{width:390,height:844},
  serviceWorkers:'block'});
 const page=context.pages()[0]||await context.newPage();
 const cdp=await context.newCDPSession(page);
 await cdp.send('Network.enable');
 await cdp.send('Network.setCacheDisabled',{cacheDisabled:true});
 try{
  const response=await page.goto(origin+'/?ge_storage_release_test='+mode,{
   waitUntil:'domcontentloaded',timeout:45000});
  assert.equal(response?.status(),200,'Staging must be reachable');
  const result=await page.evaluate(async ({mode,marker,database})=>{
    const storageKey='ge-synthetic-storage-sentinel-20261118';
    function db(){
      return new Promise((resolve,reject)=>{
       const r=indexedDB.open(database,1);
       r.onupgradeneeded=()=>r.result.createObjectStore('proof');
       r.onerror=()=>reject(r.error);r.onsuccess=()=>resolve(r.result);
      });
    }
    const connection=await db();
    function transact(kind,value){
      return new Promise((resolve,reject)=>{
        const tx=connection.transaction('proof',kind);
        const request=kind==='readwrite'?
          tx.objectStore('proof').put(value,'key'):
          tx.objectStore('proof').get('key');
        request.onerror=()=>reject(request.error);
        tx.onerror=()=>reject(tx.error);
        request.onsuccess=()=>resolve(request.result);
      });
    }
    if(mode==='seed'){
      localStorage.setItem(storageKey,marker);
      await transact('readwrite',marker);
    }
    const local=localStorage.getItem(storageKey);
    const indexed=await transact('readonly');
    connection.close();
    return {localMatches:local===marker,indexedDbMatches:indexed===marker,
      documentOrigin:location.origin,stagingServed:document.documentElement!=null};
  },{mode,marker,database});
  assert.equal(result.documentOrigin,origin);
  assert.equal(result.localMatches,true,'localStorage sentinel lost across hosted release');
  assert.equal(result.indexedDbMatches,true,'IndexedDB sentinel lost across hosted release');
  assert.equal(result.stagingServed,true);
  console.log('PASS: '+mode+' synthetic same-origin localStorage and IndexedDB persisted at '+origin);
 }finally{await context.close();}
})().catch(e=>{console.error(String(e));process.exitCode=1;});
