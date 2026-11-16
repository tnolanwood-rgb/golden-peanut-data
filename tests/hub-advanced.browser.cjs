const assert=require('node:assert/strict'),{fixture}=require('./helpers/hub-fixture.cjs');
(async()=>{const f=await fixture(),{page,origin}=f;
 try{
  await page.goto(origin+'/?game=osrs');await page.waitForFunction(()=>GoldenDualHub?.diagnostics().ideas>0);
  const when=new Date(Date.now()-10000).toISOString(),rows=[{rid:'old-a',id:1,name:'First research item',side:'buy',qty:10,price:100,when},{rid:'old-b',id:1,name:'First research item',side:'sell',qty:8,price:145,when:new Date().toISOString()}];
  const raw=JSON.stringify(rows);
  await page.evaluate(raw=>{localStorage.setItem('gh-osrs-v1-ledger',raw);localStorage.setItem('gp-owner-preservation-test','original GW2 key/history/learning sentinel')},raw);
  await page.reload();await page.waitForFunction(()=>!GoldenDualHub.diagnostics().loading);
  await page.locator('#gh-open-advanced').click();
  const frame=page.frameLocator('#gh-advanced-frame');
  await frame.locator('#simpleAdvanced').waitFor();
  await page.waitForFunction(()=>GoldenOSRSAdvanced?.summary()?.rows===2);
  assert.equal(await page.evaluate(()=>localStorage.getItem('gh-osrs-v1-ledger')),raw);
  assert.equal(await page.evaluate(()=>GoldenOSRSAdvanced.summary().today),344);
  const personal=()=>page.evaluate(async()=>{const r=indexedDB.open('golden-hub-osrs-v4',1);const db=await new Promise((res,rej)=>{r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)});const tx=db.transaction('records','readonly'),q=tx.objectStore('records').get('personal');const text=await new Promise(res=>q.onsuccess=()=>res(q.result));db.close();return JSON.parse(text)});
  let before=await personal();assert.equal(before.trades.length,2);assert.ok(before.trades.every(r=>r.uid.startsWith('gh-')));
  const savedIds=before.trades.map(r=>r.uid);
  await frame.locator('#simpleAdvanced').click();await frame.locator('[data-tab=journal]').click();
  await frame.locator('#tradeItem').fill('First research item');await frame.locator('#tradeSide').selectOption('sell');await frame.locator('#tradeQty').fill('1');await frame.locator('#tradePrice').fill('200');await frame.locator('#tradeTax').fill('0');
  await page.setViewportSize({width:844,height:390});await page.setViewportSize({width:390,height:844});
  assert.equal(await frame.locator('#tradeQty').inputValue(),'1');
  await page.reload();await page.waitForFunction(()=>GoldenOSRSAdvanced?.isOpen());
  await frame.locator('#tradeQty').waitFor({state:'attached'});await page.waitForFunction(()=>document.getElementById('gh-advanced-frame')?.contentWindow?.GoldenExchangeHub);
  assert.equal(await frame.locator('#tradeQty').inputValue(),'1');assert.equal(await frame.locator('#tradePrice').inputValue(),'200');
  await frame.locator('#saveTrade').click();
  await page.waitForFunction(()=>GoldenOSRSAdvanced.summary()?.rows===3);
  let after=await personal();assert.equal(after.trades.length,3);assert.deepEqual(after.trades.slice(0,2).map(r=>r.uid),savedIds);assert.equal(after.trades[2].taxPaid,0);
  // A full v3 backup carries tickets, owned stock and correction audit, not just a simplified ledger.
  const backup={format:'golden-exchange-backup-v3',trades:after.trades,settings:after,watch:[1],tickets:[{key:'paper-1',id:2,name:'Second research item',qty:1,buy:2000000,sell:2300000,status:'planned',createdAt:new Date().toISOString()}],owned:[{id:2,name:'Second research item',qty:2}],audit:after.audit};
  await frame.locator('#importMode').selectOption('replace');page.once('dialog',d=>d.accept());
  await frame.locator('#importFile').setInputFiles({name:'full-v3.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(backup))});
  await page.waitForFunction(async()=>{const api=document.getElementById('gh-advanced-frame').contentWindow.GoldenExchangeHub;return !!api});
  for(let i=0;i<40;i++){after=await personal();if(after.tickets.length)break;await page.waitForTimeout(30)}
  assert.equal(after.tickets.length,1);assert.equal(after.owned.length,1);assert.ok(after.audit.length>=1);
  await page.locator('#gh-tab-gw2').click();await page.waitForFunction(()=>!GoldenDualHub.diagnostics().transitioning);
  await page.locator('#gh-tab-osrs').click();await page.waitForFunction(()=>!GoldenDualHub.diagnostics().transitioning);
  assert.equal(await page.evaluate(()=>localStorage.getItem('gp-owner-preservation-test')),'original GW2 key/history/learning sentinel');
  assert.equal(await page.evaluate(()=>localStorage.getItem('gh-osrs-v1-ledger')),raw);
  assert.deepEqual(f.errors,[]);console.log('PASS advanced Hub: non-destructive journal handoff, actual tax, v3 tickets/owned/audit, rotation/recreation, both-game continuity');
 }finally{await f.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
