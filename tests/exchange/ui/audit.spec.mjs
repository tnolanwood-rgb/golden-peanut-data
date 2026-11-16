import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {taxPerItem} from '../../../app/exchange/src/core.mjs';
const fixtures=Object.fromEntries(['mapping','latest','5m','1h'].map(p=>[p,JSON.parse(readFileSync(`tests/exchange/fixtures/osrs-${p}.json`))]));
const at=Date.parse('2026-11-13T15:30:00Z');
async function boot(page,{offline=false,delay=0}={}){
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.clock.install({time:at});
 await page.route('https://prices.runescape.wiki/api/v2/osrs/**',async r=>{if(offline)return r.abort();if(delay)await new Promise(resolve=>setTimeout(resolve,delay));return r.fulfill({json:fixtures[new URL(r.request().url()).pathname.split('/').at(-1)]});});
 await page.route('https://oldschool.runescape.wiki/images/**',r=>r.abort());await page.goto('/');
 if(offline)await page.clock.runFor(4000);else await expect(page.locator('#simpleStatus')).toContainText('Prices updated');return errors;
}
async function setup(page){await page.locator('#simpleSetup summary').click();await page.locator('#simpleRestriction').selectOption('clear');await page.locator('#simpleSetup button[type=submit]').click();}
async function manual(page,name,side,qty,price){await page.locator('#tradeItem').fill(name);await page.locator('#tradeSide').selectOption(side);await page.locator('#tradeQty').fill(String(qty));await page.locator('#tradePrice').fill(String(price));await page.locator('#saveTrade').click();}
test('journal fills and corrections update the simple trade, pot and inventory together',async({page})=>{
 const errors=await boot(page);await setup(page);await page.locator('[data-action=start]').click();const name=await page.locator('[data-simple-tracked] h2').textContent();
 await page.locator('#simpleAdvanced').click();await page.locator('nav [data-tab=journal]').click();await manual(page,name,'buy',10,100);await expect(page.locator('#budget')).toHaveValue('100000000');
 await page.locator('#returnSimple').click();await expect(page.locator('[data-simple-tracked] .simple-instruction')).toContainText('Sell 10');
 await page.locator('#simpleAdvanced').click();await page.locator('nav [data-tab=journal]').click();await manual(page,name,'sell',4,120);
 const state=await page.evaluate(()=>new Promise((resolve,reject)=>{const r=indexedDB.open('golden-hub-osrs-v4',1);r.onerror=()=>reject(r.error);r.onsuccess=()=>{const db=r.result,q=db.transaction('records').objectStore('records').get('personal');q.onsuccess=()=>{resolve(JSON.parse(q.result));db.close();};q.onerror=()=>reject(q.error);};}));const gain=4*(120-taxPerItem(120,name)-100);
 expect(Number(state.budget)).toBe(100000000+gain);
 await page.locator('[data-edit]').first().click();await page.locator('#tradePrice').fill('200');await page.locator('#saveTrade').click();const editedGain=4*(200-taxPerItem(200,name)-100);await expect(page.locator('#budget')).toHaveValue(String(100000000+editedGain));
 await page.locator('#returnSimple').click();await expect(page.locator('[data-simple-tracked] .simple-instruction')).toContainText('Sell 6');
 await page.locator('[data-action=fill]').first().click();await page.locator('#simpleFillPrice').fill('200');await page.locator('#simpleFillSave').click();await expect(page.locator('[data-simple-tracked]')).toHaveCount(0);
 await page.reload();await expect(page.locator('[data-simple-tracked]')).toHaveCount(0);expect(errors).toEqual([]);
});
test('a journal sale in the same minute as a simple-screen buy matches its actual timestamp',async({page})=>{
 const errors=await boot(page);await setup(page);await page.clock.fastForward(21000);await page.locator('[data-action=start]').click();const name=await page.locator('[data-simple-tracked] h2').textContent();
 await page.locator('[data-action=fill]').click();await page.locator('#simpleFillQty').fill('10');await page.locator('#simpleFillPrice').fill('100');await page.locator('#simpleFillSave').click();await page.clock.fastForward(1000);
 await page.locator('#simpleAdvanced').click();await page.locator('nav [data-tab=journal]').click();await manual(page,name,'sell',10,120);await expect(page.locator('#ledgerInfo')).toContainText('10 sold units matched');await expect(page.locator('#ledgerInfo')).toContainText('0 sold units missing');expect(errors).toEqual([]);
});
test('malformed personal state pauses suggestions, retains the original and recovers from a clean backup',async({page})=>{
 const raw=JSON.stringify({budget:'100000000',setupComplete:true,watch:{bad:true},trades:{bad:true}});
 await page.addInitScript(raw=>localStorage.setItem('golden-hub-v4:state-v2',raw),raw);const errors=await boot(page);await expect(page.locator('#storageWarning')).toContainText('Original data has been kept');await expect(page.locator('[data-simple-idea]')).toHaveCount(0);expect(await page.evaluate(()=>localStorage.getItem('golden-hub-v4:state-v2'))).toBe(raw);
 await page.locator('#simpleAdvanced').click();await page.locator('#returnSimple').click();await expect(page.locator('#simpleApp')).toBeVisible();await page.locator('#simpleAdvanced').click();await page.locator('nav [data-tab=journal]').click();const data={format:'golden-exchange-backup-v2',trades:[],settings:{budget:'100000000',restriction:'clear',unexpectedField:'ignored'},watch:[],tickets:[],owned:[]};page.once('dialog',d=>d.accept());await page.locator('#importFile').setInputFiles({name:'recovery.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(data))});await expect(page.locator('#notice')).toHaveText('Backup imported.');await expect(page.locator('#storageWarning')).not.toBeVisible();await page.locator('#returnSimple').click();await expect(page.locator('[data-simple-idea]')).toHaveCount(1);expect(errors).toEqual([]);
});
test('an incomplete saved market snapshot cannot crash offline startup or erase the journal',async({page})=>{
 await page.addInitScript(()=>{localStorage.setItem('golden-hub-v4:snapshot',JSON.stringify({mapping:[]}));localStorage.setItem('golden-hub-v4:trades',JSON.stringify([{id:556,name:'Air rune',side:'buy',qty:10,price:5,date:'2026-11-12T12:00:00Z'}]));});const errors=await boot(page,{offline:true});await expect(page.locator('#simpleStatus')).toContainText('Prices unavailable');await expect(page.locator('[data-simple-idea]')).toHaveCount(0);await page.locator('#simpleAdvanced').click();await page.locator('nav [data-tab=journal]').click();await expect(page.locator('#inventory')).toContainText('10 units');expect(errors).toEqual([]);
});
test('a failed trade save leaves no phantom ticket or fill',async({page})=>{
 const errors=await boot(page);await setup(page);await page.evaluate(()=>{const original=IDBDatabase.prototype.transaction;IDBDatabase.prototype.transaction=function(...args){const tx=original.apply(this,args);if(args[1]==='readwrite')queueMicrotask(()=>tx.abort());return tx;};});await page.locator('[data-action=start]').click();await expect(page.locator('#simpleFeedback')).toContainText('Could not save');await expect(page.locator('[data-simple-tracked]')).toHaveCount(0);
 const state=await page.evaluate(()=>new Promise((resolve,reject)=>{const r=indexedDB.open('golden-hub-osrs-v4',1);r.onerror=()=>reject(r.error);r.onsuccess=()=>{const db=r.result,q=db.transaction('records').objectStore('records').get('personal');q.onsuccess=()=>{resolve(JSON.parse(q.result));db.close();};q.onerror=()=>reject(q.error);};}));expect(state.trades).toEqual([]);expect(state.tickets).toEqual([]);expect(errors).toEqual([]);
});
test('a slow successful API refresh is live and the manual refresh cooldown gives visible feedback',async({page})=>{
 const errors=await boot(page,{delay:1500});await setup(page);await expect(page.locator('#simpleStatus')).toContainText('Prices updated');await page.locator('#simpleRefresh').click();await expect(page.locator('#simpleFeedback')).toContainText('less than a minute');expect(errors).toEqual([]);
});
test('Android-style status and gesture insets keep small-screen content and dialogs clear of system bars',async({page})=>{
 await page.setViewportSize({width:320,height:700});const errors=await boot(page);await setup(page);await page.evaluate(()=>{document.documentElement.style.setProperty('--safe-area-inset-top','36px');document.documentElement.style.setProperty('--safe-area-inset-bottom','24px');window.scrollTo({top:0,behavior:'instant'});});
 expect(await page.locator('.simple-banner').evaluate(el=>el.getBoundingClientRect().top)).toBeGreaterThanOrEqual(36);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.locator('[data-action=start]').click();await page.locator('[data-action=fill]').click();const box=await page.locator('#simpleFillDialog').boundingBox();expect(box.y).toBeGreaterThanOrEqual(36);expect(box.y+box.height).toBeLessThanOrEqual(676);await page.locator('#simpleFillClose').click();expect(errors).toEqual([]);
});
