import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
const fixtures=Object.fromEntries(['mapping','latest','5m','1h'].map(p=>[p,JSON.parse(readFileSync(`tests/exchange/fixtures/osrs-${p}.json`))]));
// Keep actual captured payloads unchanged; freeze time at their capture window.
const captured=Date.parse('2026-11-13T15:30:00Z');
async function market(page){
 await page.addInitScript(()=>localStorage.setItem('golden-hub-v4:simpleView','false'));
 await page.addInitScript(()=>{if(localStorage.getItem('golden-hub-v4:budget')===null){localStorage.setItem('golden-hub-v4:budget',JSON.stringify('10000000'));localStorage.setItem('golden-hub-v4:mode',JSON.stringify('members'));localStorage.setItem('golden-hub-v4:restriction',JSON.stringify('clear'));}});
 await page.clock.install({time:captured});
 await page.route('https://prices.runescape.wiki/api/v2/osrs/*',async r=>{const p=new URL(r.request().url()).pathname.split('/').at(-1);await r.fulfill({json:fixtures[p]});});
 await page.route('https://oldschool.runescape.wiki/images/**',r=>r.abort());
 await page.goto('/');await expect(page.locator('#updated')).toHaveText('Live');await page.locator('nav [data-tab=markets]').click();
}
test('mobile market, filters, watchlist and saved budget',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await market(page);
 await expect(page.locator('.market').first()).toBeVisible();await page.screenshot({path:'artifacts/mobile-market.png'});await expect(page.locator('#cash')).toHaveText('10m gp');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.locator('[data-detail]').first().click();await expect(page.locator('.market.open .detail')).toBeVisible();
 await page.locator('[data-star]').first().click();await page.locator('#view').selectOption('watch');await expect(page.locator('.market')).toHaveCount(1);
 await page.locator('#settingsPanel summary').click();await page.locator('#budget').fill('500000');await page.locator('#budget').dispatchEvent('change');await page.reload();await page.locator('nav [data-tab=markets]').click();await expect(page.locator('#budget')).toHaveValue('500000');await expect(page.locator('#view')).toHaveValue('watch');await expect(page.locator('.market')).toHaveCount(1);
 await page.locator('#view').selectOption('top');await page.locator('#settingsPanel summary').click();await page.locator('#mode').selectOption('f2p');await expect(page.locator('.market').first()).toBeVisible();expect(await page.locator('.market .itemsub').allTextContents()).toEqual(expect.arrayContaining([expect.stringContaining('F2P')]));expect((await page.locator('.market .itemsub').allTextContents()).every(t=>t.includes('F2P'))).toBe(true);
 await page.locator('#sort').selectOption('roi');await page.locator('#query').fill('THIS DOES NOT EXIST');await expect(page.locator('.market')).toHaveCount(0);expect(errors).toEqual([]);
});
test('journal FIFO profits, inventory, persistence and full JSON round trip',async({page})=>{
 await market(page);await page.locator('nav [data-tab=journal]').click();
 async function fill(side,qty,price){await page.locator('#tradeItem').fill('Abyssal whip');await page.locator('#tradeSide').selectOption(side);await page.locator('#tradeQty').fill(qty);await page.locator('#tradePrice').fill(price);await page.locator('#tradeForm button[type=submit]').click();}
 await fill('buy','10','1000');await expect(page.locator('#realizedProfit')).toHaveText('+0 gp');await fill('sell','4','1200');await expect(page.locator('#realizedProfit')).toHaveText('+704 gp');await expect(page.locator('#todayProfit')).toHaveText('704 gp');await expect(page.locator('#inventory')).toContainText('6 units');
 const downloadPromise=page.waitForEvent('download');await page.locator('#exportLedger').click();const download=await downloadPromise;const backup=JSON.parse(readFileSync(await download.path()));expect(backup.format).toBe('golden-exchange-backup-v3');expect(backup.trades.length).toBe(2);expect(backup.settings.budget).toBe('10000704');
 await page.reload();await page.locator('nav [data-tab=journal]').click();await expect(page.locator('#realizedProfit')).toHaveText('+704 gp');
 page.on('dialog',d=>d.accept());await page.locator('#importFile').setInputFiles({name:'backup.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(backup))});await expect(page.locator('#notice')).toHaveText('Backup imported.');await expect(page.locator('#realizedProfit')).toHaveText('+704 gp');
});
test('offline first start stays usable; cached failure and stale data remain labelled',async({page})=>{
 await page.addInitScript(()=>localStorage.setItem('golden-hub-v4:simpleView','false'));
 await page.clock.install({time:captured});await page.route('https://prices.runescape.wiki/api/v2/osrs/*',r=>r.abort());await page.goto('/');await page.clock.fastForward(5000);await expect(page.locator('#updated')).toHaveText('Unavailable');await expect(page.locator('#profit')).toHaveText('0 gp');await page.locator('nav [data-tab=journal]').click();await expect(page.locator('#tradeForm')).toBeVisible();
 await page.unroute('https://prices.runescape.wiki/api/v2/osrs/*');await page.route('https://prices.runescape.wiki/api/v2/osrs/*',r=>r.fulfill({json:fixtures[new URL(r.request().url()).pathname.split('/').at(-1)]}));await page.clock.fastForward(60000);await page.locator('#refresh').click();await expect(page.locator('#updated')).toHaveText('Live');
 await page.route('https://prices.runescape.wiki/api/v2/osrs/*',r=>r.abort());await page.clock.fastForward(61000);await page.locator('#refresh').click();await page.clock.fastForward(5000);await expect(page.locator('#updated')).toHaveText('Cached · offline');await expect(page.locator('#notice')).toContainText('last saved snapshot');
 await page.clock.fastForward(5*3600000);await page.locator('nav [data-tab=markets]').click();await expect(page.locator('.market')).toHaveCount(0);
});

test('full search explains exclusions, watches missing quotes and preserves details',async({page})=>{
 await market(page);await page.locator('#query').fill('3rd age');
 await expect(page.locator('.market').first()).toBeVisible();await expect(page.locator('#searchInfo')).toContainText('excluded');
 await page.locator('[data-detail]').first().click();await page.clock.fastForward(61000);await expect(page.locator('.market.open')).toHaveCount(1);
 await page.locator('[data-star]').first().click();await page.locator('#query').fill('');await page.locator('#view').selectOption('watch');await expect(page.locator('.market')).toHaveCount(1);
 await page.locator('#view').selectOption('all');await expect(page.locator('#moreMarkets')).toBeVisible();const before=await page.locator('.market').count();await page.locator('#moreMarkets').click();expect(await page.locator('.market').count()).toBeGreaterThan(before);
});
test('journal edits correct matched profits and planner never pre-fills a hypothetical fill',async({page})=>{
 await market(page);await page.locator('nav [data-tab=planner]').click();await page.locator('[data-plan-record]').first().click();await expect(page.locator('#journal')).toHaveClass(/active/);await expect(page.locator('#tradePrice')).toHaveValue('');await expect(page.locator('#tradeQty')).toHaveValue('');
 await page.locator('#tradeItem').fill('Abyssal whip');await page.locator('#tradeQty').fill('10');await page.locator('#tradePrice').fill('100');await page.locator('#saveTrade').click();
 await page.locator('#tradeItem').fill('Abyssal whip');await page.locator('#tradeSide').selectOption('sell');await page.locator('#tradeQty').fill('4');await page.locator('#tradePrice').fill('150');await expect(page.locator('#tradePreview')).toContainText('sale tax: 12 gp');await page.locator('#saveTrade').click();await expect(page.locator('#realizedProfit')).toHaveText('+188 gp');
 await page.locator('[data-edit]').first().click();await page.locator('#tradePrice').fill('200');await page.locator('#saveTrade').click();await expect(page.locator('#realizedProfit')).toHaveText('+384 gp');await page.reload();await page.locator('nav [data-tab=journal]').click();await expect(page.locator('#realizedProfit')).toHaveText('+384 gp');
});
test('items with missing quotes remain searchable and watchable without invented prices',async({page})=>{
 await market(page);
 const item=fixtures.mapping.find(m=>!fixtures.latest.data[m.id]?.low||!fixtures.latest.data[m.id]?.high);
 expect(item).toBeTruthy();await page.locator('#query').fill(String(item.id));await expect(page.locator('.market')).toHaveCount(1);await expect(page.locator('.market')).toContainText('No margin calculated');
 await page.locator('[data-star]').click();await page.locator('#query').fill('');await page.locator('#view').selectOption('watch');await expect(page.locator('.market')).toContainText(item.name);await expect(page.locator('.market .marketdata')).toHaveCount(0);
});
test('an unmatched sale requires confirmation and never produces fictional realised profit',async({page})=>{
 await market(page);await page.locator('nav [data-tab=journal]').click();
 await page.locator('#tradeItem').fill('Abyssal whip');await page.locator('#tradeSide').selectOption('sell');await page.locator('#tradeQty').fill('10');await page.locator('#tradePrice').fill('200');
 page.once('dialog',d=>d.dismiss());await page.locator('#saveTrade').click();await expect(page.locator('.trade')).toHaveCount(0);
 page.once('dialog',d=>d.accept());await page.locator('#saveTrade').click();await expect(page.locator('#realizedProfit')).toHaveText('+0 gp');await expect(page.locator('#ledgerInfo')).toContainText('10 sold units missing');await expect(page.locator('.trade')).toContainText('0 matched / 10 sold');
});
test('Insights measures memory, keeps inventory hypothetical and checks tax-aware prices',async({page})=>{
 await market(page);await page.locator('nav [data-tab=journal]').click();
 async function fill(side,q,p){await page.locator('#tradeItem').fill('Abyssal whip');await page.locator('#tradeSide').selectOption(side);await page.locator('#tradeQty').fill(q);await page.locator('#tradePrice').fill(p);await page.locator('#saveTrade').click();}
 await fill('buy','10','1000');await fill('sell','4','1200');await page.locator('nav [data-tab=insights]').click();
 await expect(page.locator('#goalProgress')).toContainText('704 gp realised');await expect(page.locator('#memoryMarkets')).toContainText('704 gp');await expect(page.locator('#positionReviews')).toContainText('6 held');await expect(page.locator('#positionReviews')).toContainText('1,020 gp');await expect(page.locator('#positionReviews')).toContainText('not realised');
 await page.locator('#goal').fill('2000');await page.locator('#goal').dispatchEvent('change');await page.screenshot({path:'artifacts/mobile-insights.png',fullPage:true});
 await page.locator('[data-research]').first().click();await expect(page.locator('.market')).toHaveCount(1);await page.locator('[data-detail]').click();await page.locator('[data-calc-buy]').fill('1000');await page.locator('[data-calc-sell]').fill('1200');await expect(page.locator('[data-calc-result]')).toContainText('Margin: 176 gp');await expect(page.locator('[data-calc-result]')).toContainText('Break-even sale: 1,020 gp');
 await page.reload();await page.locator('nav [data-tab=insights]').click();await expect(page.locator('#goal')).toHaveValue('2000');await expect(page.locator('#memoryMarkets')).toContainText('704 gp');
});
test('free-slot setting can reserve every GE slot and cautious mode stays usable',async({page})=>{
 await market(page);await page.locator('#settingsPanel summary').click();await page.locator('#profile').selectOption('cautious');await page.locator('#freeSlots').selectOption('0');await page.locator('nav [data-tab=planner]').click();await expect(page.locator('#planRows')).toContainText('No trades fit');await expect(page.locator('#planCost')).toHaveText('0 gp');await expect(page.locator('#allocationInfo')).toContainText('0 of 0 free slots');
});
