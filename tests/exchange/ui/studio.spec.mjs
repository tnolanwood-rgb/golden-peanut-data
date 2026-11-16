import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
const fixtures=Object.fromEntries(['mapping','latest','5m','1h'].map(p=>[p,JSON.parse(readFileSync(`tests/exchange/fixtures/osrs-${p}.json`))]));
const history=JSON.parse(readFileSync('tests/exchange/fixtures/osrs-history-steel.json'));
const captured=Date.parse('2026-11-13T15:30:00Z');
async function boot(page,{offlineHistory=false}={}){
 await page.addInitScript(()=>localStorage.setItem('golden-hub-v4:simpleView','false'));
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.clock.install({time:captured});
 await page.route('https://prices.runescape.wiki/api/v2/osrs/**',async r=>{const u=new URL(r.request().url()),path=u.pathname.split('/').at(-1);if(path==='timeseries'){if(offlineHistory)return r.abort();return r.fulfill({json:history});}await r.fulfill({json:fixtures[path]});});
 await page.route('https://oldschool.runescape.wiki/images/**',r=>r.abort());await page.goto('/');await expect(page.locator('#updated')).toHaveText('Live');return errors;
}
async function session(page,restriction='clear'){
 await page.locator('#sessionRestriction').selectOption(restriction);await page.locator('#sessionForm button').click();await expect(page.locator('#sessionLabel')).toHaveText('Free-to-play session · 100m GP');
}
async function steel(page){await page.locator('nav [data-tab=markets]').click();await page.locator('#query').fill('2353');await page.locator('[data-open-research]').click();await expect(page.locator('#researchDialog')).toBeVisible();await expect(page.locator('#researchTitle')).toHaveText('Steel bar');await page.locator('#ticketBuy').fill(String(fixtures.latest.data[2353].low));await page.locator('#ticketSell').fill(String(fixtures.latest.data[2353].high));}
test('fresh mobile session is F2P, requires budget confirmation and visibly changes the home screen',async({page})=>{
 const errors=await boot(page);await expect(page.locator('#home')).toHaveClass(/active/);await expect(page.locator('#sessionMode')).toHaveValue('f2p');await expect(page.locator('#sessionCash')).toHaveValue('100000000');await expect(page.locator('#sessionStrip')).toContainText('0 GP');
 await session(page);await expect(page.locator('#sessionStrip')).toContainText('3 / 3');await expect(page.locator('.candidate-card').first()).toBeVisible();expect((await page.locator('.candidate-card .status-pill').allTextContents()).every(t=>t==='F2P')).toBe(true);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:'artifacts/v2-home-mobile.png',fullPage:true});
 await page.reload();await expect(page.locator('#sessionLabel')).toHaveText('Free-to-play session · 100m GP');await expect(page.locator('#sessionSetup')).not.toHaveAttribute('open','');expect(errors).toEqual([]);
 await page.locator('nav [data-tab=markets]').click();await page.locator('#settingsPanel summary').click();await page.locator('#mode').selectOption('members');await page.locator('nav [data-tab=home]').click();await page.locator('#sessionSetup summary').click();await expect(page.locator('#sessionMode')).toHaveValue('members');
});
test('history-backed research ticket reserves plan cash and slots without inventing a journal fill',async({page})=>{
 const errors=await boot(page);await session(page);await steel(page);await page.locator('#loadHistory').click();await expect(page.locator('#historyView .history-chart')).toBeVisible();await expect(page.locator('#historyView')).toContainText('two-sided coverage');
 await page.locator('#ticketQty').fill('10');const buy=Number(await page.locator('#ticketBuy').inputValue());await expect(page.locator('#ticketPreview')).toContainText('Not expected or realised profit');await page.screenshot({path:'artifacts/v2-research-mobile.png',fullPage:false});
 await page.locator('#saveTicket').click();await expect(page.locator('#ticketStatus')).toContainText('Saved to your desk');await page.locator('#closeResearch').click();await page.locator('nav [data-tab=planner]').click();await expect(page.locator('#savedTickets .ticket-card')).toHaveCount(1);await expect(page.locator('#ticketCapital')).toContainText('1 / 3');
 await page.locator('nav [data-tab=journal]').click();await expect(page.locator('#realizedProfit')).toHaveText('+0 gp');await expect(page.locator('.trade')).toHaveCount(0);
 await page.reload();await page.locator('nav [data-tab=planner]').click();await expect(page.locator('#savedTickets')).toContainText('Steel bar');await page.locator('[data-ticket-status]').selectOption('selling');await expect(page.locator('#ticketCapital')).toContainText('1 / 3');
 await page.locator('[data-ticket-status]').selectOption('closed');await expect(page.locator('#ticketCapital')).toContainText('0 / 3');expect(buy).toBeGreaterThan(0);expect(errors).toEqual([]);
});
test('ticket guards enforce F2P restrictions, recorded limits and cash; owned items never invent cost basis',async({page})=>{
 const errors=await boot(page);await session(page,'unknown');await steel(page);await page.locator('#saveTicket').click();await expect(page.locator('#ticketStatus')).toContainText('restricted on new F2P');await page.locator('#closeResearch').click();await page.locator('nav [data-tab=home]').click();await page.locator('#sessionSetup summary').click();await page.locator('#sessionRestriction').selectOption('clear');await page.locator('#sessionCash').fill('100');await page.locator('#sessionForm button').click();
 await steel(page);await page.locator('#ticketQty').fill('1');await page.locator('#saveTicket').click();await expect(page.locator('#ticketStatus')).toContainText('exceeds the remaining session budget');await page.locator('#ticketQty').fill('10001');await page.locator('#saveTicket').click();await expect(page.locator('#ticketStatus')).toContainText('four-hour buy limit');await page.locator('#closeResearch').click();
 await page.locator('nav [data-tab=home]').click();await page.locator('#openOwned').click();await page.locator('#ownedItem').fill('Steel bar');await page.locator('#ownedQty').fill('500');await page.locator('#ownedForm button').click();await expect(page.locator('#ownedCards')).toContainText('500 available');await expect(page.locator('#ownedCards')).toContainText('Proceeds are not profit');
 await page.locator('nav [data-tab=journal]').click();await expect(page.locator('#realizedProfit')).toHaveText('+0 gp');await expect(page.locator('#inventory')).toContainText('No remaining');expect(errors).toEqual([]);
});
test('legacy data upgrades in place and backups include paper tickets and owned stock',async({page})=>{
 await page.addInitScript(()=>{if(!localStorage.getItem('golden-hub-v4:trades')){localStorage.setItem('golden-hub-v4:trades',JSON.stringify([{id:2353,name:'Steel bar',side:'buy',qty:10,price:400,date:'2026-11-12T10:00:00Z'},{id:2353,name:'Steel bar',side:'sell',qty:5,price:500,date:'2026-11-12T11:00:00Z'}]));localStorage.setItem('golden-hub-v4:watch','[2353]');localStorage.setItem('golden-hub-v4:budget','"10000000"');localStorage.setItem('golden-hub-v4:mode','"members"');}});
 await boot(page);await page.locator('nav [data-tab=journal]').click();await expect(page.locator('#realizedProfit')).toHaveText('+450 gp');await expect(page.locator('#inventory')).toContainText('5 units');
 await page.locator('nav [data-tab=home]').click();await session(page);await steel(page);await page.locator('#saveTicket').click();await expect(page.locator('#ticketStatus')).toContainText('Saved to your desk');await page.locator('#closeResearch').click();await page.locator('nav [data-tab=home]').click();await page.locator('#openOwned').click();await page.locator('#ownedItem').fill('Swordfish');await page.locator('#ownedQty').fill('20');await page.locator('#ownedForm button').click();
 await page.locator('nav [data-tab=journal]').click();const download=page.waitForEvent('download');await page.locator('#exportLedger').click();const file=await download,data=JSON.parse(readFileSync(await file.path()));expect(data.trades.length).toBe(2);expect(data.tickets.length).toBe(1);expect(data.owned[0].qty).toBe(20);expect(data.settings.mode).toBe('f2p');
 page.once('dialog',d=>d.accept());await page.locator('#importFile').setInputFiles({name:'backup.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(data))});await expect(page.locator('#notice')).toHaveText('Backup imported.');await expect(page.locator('#realizedProfit')).toHaveText('+450 gp');
});
test('three F2P tickets exhaust slots, a fourth is refused, and closing one releases only plan capital',async({page})=>{
 await boot(page);await session(page);
 const ids=[556,555,557,2353];
 for(let n=0;n<ids.length;n++){
  const id=ids[n];await page.locator('nav [data-tab=markets]').click();await page.locator('#query').fill(String(id));await page.locator('[data-open-research]').click();await page.locator('#ticketQty').fill('1');await page.locator('#ticketBuy').fill(String(fixtures.latest.data[id].low));await page.locator('#ticketSell').fill(String(fixtures.latest.data[id].high));await page.locator('#saveTicket').click();
  await expect(page.locator('#ticketStatus')).toContainText(n<3?'Saved to your desk':'No unallocated GE slots');await page.locator('#closeResearch').click();
 }
 await page.locator('nav [data-tab=planner]').click();await expect(page.locator('#savedTickets .ticket-card')).toHaveCount(3);await expect(page.locator('#ticketCapital')).toContainText('3 / 3');await expect(page.locator('#planRows')).toContainText('No trades fit');
 await page.locator('[data-ticket-status]').first().selectOption('closed');await expect(page.locator('#ticketCapital')).toContainText('2 / 3');await page.locator('nav [data-tab=journal]').click();await expect(page.locator('#realizedProfit')).toHaveText('+0 gp');
});
test('historical cache survives an offline refresh and never replaces data with invented prices',async({page})=>{
 await boot(page);await session(page);await steel(page);let requests=0;
 await page.route('https://prices.runescape.wiki/api/v2/osrs/timeseries?*',r=>{requests++;return r.fulfill({json:history});});
 await page.locator('#loadHistory').click();await expect(page.locator('#historyView .history-chart')).toBeVisible();expect(requests).toBe(1);
 const points=await page.locator('#historyView svg path').last().getAttribute('d');await page.locator('#loadHistory').click();await expect(page.locator('#loadHistory')).toBeEnabled();expect(requests).toBe(1);
 await page.clock.fastForward(2*3600000);await page.route('https://prices.runescape.wiki/api/v2/osrs/timeseries?*',r=>r.fulfill({status:503,json:{error:'Temporary outage'}}));await page.locator('#loadHistory').click();await page.clock.runFor(4000);
 await expect(page.locator('#historyView')).toContainText('Last update failed');await expect(page.locator('#historyView .history-chart')).toBeVisible();expect(await page.locator('#historyView svg path').last().getAttribute('d')).toBeTruthy();expect(points).toBeTruthy();
});
test('phone-sized setup and research sheet fit 360px and desktop remains usable',async({page})=>{
 await page.setViewportSize({width:360,height:800});await boot(page);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await session(page);await steel(page);expect(await page.locator('#researchDialog').evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);await page.locator('#closeResearch').click();
 await page.setViewportSize({width:1280,height:900});await page.locator('nav [data-tab=home]').click();await expect(page.locator('.candidate-card').first()).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
test('original journal-only backup imports leave the current session, tickets and owned stock intact',async({page})=>{
 await boot(page);await session(page);await steel(page);await page.locator('#saveTicket').click();await expect(page.locator('#ticketStatus')).toContainText('Saved to your desk');await page.locator('#closeResearch').click();
 await page.locator('nav [data-tab=home]').click();await page.locator('#openOwned').click();await page.locator('#ownedItem').fill('Swordfish');await page.locator('#ownedQty').fill('20');await page.locator('#ownedForm button').click();await page.locator('nav [data-tab=journal]').click();
 const legacy={format:'golden-exchange-ledger-v1',trades:[{id:2353,name:'Steel bar',side:'buy',qty:10,price:400,date:'2026-11-12T10:00:00Z'},{id:2353,name:'Steel bar',side:'sell',qty:5,price:500,date:'2026-11-12T11:00:00Z'}]};
 page.once('dialog',d=>d.accept());await page.locator('#importFile').setInputFiles({name:'old-journal.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(legacy))});await expect(page.locator('#realizedProfit')).toHaveText('+450 gp');
 await page.locator('nav [data-tab=home]').click();await expect(page.locator('#sessionLabel')).toHaveText('Free-to-play session · 100m GP');await page.locator('nav [data-tab=planner]').click();await expect(page.locator('#savedTickets')).toContainText('Steel bar');await page.locator('nav [data-tab=home]').click();await page.locator('#openOwned').click();await expect(page.locator('#ownedCards')).toContainText('20 available');
});
