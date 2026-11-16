const assert=require('node:assert/strict'),{fixture}=require('./helpers/hub-fixture.cjs');
(async()=>{const f=await fixture(),{page,origin}=f;
 try{
  await page.goto(origin+'/?game=osrs');await page.waitForFunction(()=>GoldenDualHub?.diagnostics().ideas>0);
  const row={id:556,name:'Air rune',side:'buy',qty:1,price:100,when:new Date(Date.now()-10000).toISOString()},raw=JSON.stringify(Array.from({length:1002},()=>({...row})));
  await page.evaluate(async raw=>{
   localStorage.setItem('gh-osrs-v1-ledger',raw);
   const q=indexedDB.open('golden-exchange',1);const db=await new Promise((res,rej)=>{q.onupgradeneeded=()=>q.result.createObjectStore('records');q.onsuccess=()=>res(q.result);q.onerror=()=>rej(q.error)});
   const tx=db.transaction('records','readwrite');tx.objectStore('records').put('ORIGINAL GOLDEN EXCHANGE SENTINEL','personal');await new Promise(res=>tx.oncomplete=res);db.close();
  },raw);
  await page.locator('#gh-open-advanced').click();await page.waitForFunction(()=>GoldenOSRSAdvanced?.summary()?.rows===1002);
  const read=key=>page.evaluate(key=>new Promise((resolve,reject)=>{const q=indexedDB.open('golden-hub-osrs-v4',1);q.onerror=()=>reject(q.error);q.onsuccess=()=>{const db=q.result,r=db.transaction('records').objectStore('records').get(key);r.onsuccess=()=>{db.close();resolve(r.result)}}}),key);
  const state=JSON.parse(await read('personal'));assert.equal(new Set(state.trades.map(r=>r.uid)).size,1002);
  const info=await read('hub-source-import');const archive=await read('hub-source-original-'+info.fingerprint);assert.equal(archive.raw,raw);
  await page.reload();await page.waitForFunction(()=>GoldenOSRSAdvanced?.summary()?.rows===1002);
  assert.equal(await page.evaluate(()=>localStorage.getItem('gh-osrs-v1-ledger')),raw);
  // Reject a conflicting change to an already imported source identity.
  const corrected=JSON.stringify([{...row,rid:'identity',qty:3}]);
  await page.evaluate(v=>localStorage.setItem('gh-osrs-v1-ledger',v),corrected);await page.reload();await page.waitForFunction(()=>GoldenOSRSAdvanced?.summary()?.rows===1003);
  await page.evaluate(v=>localStorage.setItem('gh-osrs-v1-ledger',v),JSON.stringify([{...row,rid:'identity',qty:4}]));
  await page.reload();await page.waitForFunction(()=>document.getElementById('gh-advanced-frame')?.contentWindow?.GoldenExchangeHub);
  const frame=page.frameLocator('#gh-advanced-frame');assert.match(await frame.locator('#storageWarning').innerText(),/corrected after handoff/);
  assert.equal(JSON.parse(await read('personal')).trades.length,1003);
  // Restore the unambiguous source, then explicitly clear ONLY the isolated workspace.
  await page.evaluate(v=>localStorage.setItem('gh-osrs-v1-ledger',v),corrected);await page.reload();await page.waitForFunction(()=>document.getElementById('gh-advanced-frame')?.contentWindow?.GoldenExchangeHub);
  await frame.locator('#simpleAdvanced').click();await frame.locator('nav [data-tab=journal]').click();page.once('dialog',d=>d.accept());await frame.locator('#eraseData').click();
  await page.waitForFunction(()=>GoldenOSRSAdvanced.summary()?.rows===0);
  await page.reload();await page.waitForFunction(()=>document.getElementById('gh-advanced-frame')?.contentWindow?.GoldenExchangeHub);
  assert.equal(JSON.parse(await read('personal')).trades.length,0,'explicit clear must not silently resurrect the retained source');
  assert.equal(await page.evaluate(()=>localStorage.getItem('gh-osrs-v1-ledger')),corrected);
  const original=await page.evaluate(()=>new Promise(res=>{const q=indexedDB.open('golden-exchange',1);q.onsuccess=()=>{const db=q.result,r=db.transaction('records').objectStore('records').get('personal');r.onsuccess=()=>{db.close();res(r.result)}}}));
  assert.equal(original,'ORIGINAL GOLDEN EXCHANGE SENTINEL');
  assert.deepEqual(f.errors,[]);console.log('PASS advanced integrity: 1002 duplicate legacy fills retained, originals archived, conflicts rejected, original DB untouched, no deletion resurrection');
 }finally{await f.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
