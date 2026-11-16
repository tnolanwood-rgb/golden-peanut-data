import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
const fixtures=Object.fromEntries(['mapping','latest','5m','1h'].map(p=>[p,JSON.parse(readFileSync(`tests/exchange/fixtures/osrs-${p}.json`))]));
const at=Date.parse('2026-11-13T15:30:00Z');
async function boot(page,seed,overrides={}){
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.clock.install({time:at});await page.addInitScript(seed=>{if(!localStorage.getItem('empty-screen-test-seeded')){for(const [k,v] of Object.entries(seed))localStorage.setItem('golden-hub-v4:'+k,JSON.stringify(v));localStorage.setItem('empty-screen-test-seeded','yes');}},seed);
 const requests=[];await page.route('https://prices.runescape.wiki/api/v2/osrs/**',r=>{const p=new URL(r.request().url()).pathname.split('/').at(-1);requests.push(p);return r.fulfill({json:overrides[p]||fixtures[p]});});await page.route('https://oldschool.runescape.wiki/images/**',r=>r.abort());await page.goto('/');await expect(page.locator('#simpleRefresh')).toBeEnabled();return {errors,requests};
}
const settings={budget:'100000000',mode:'f2p',restriction:'unknown',setupComplete:true};
test('hidden restrictive filters explain an empty screen and one tap restores standard ideas without changing capital settings',async({page})=>{
 const {errors}=await boot(page,{...settings,profile:'cautious',minVolume:'999999999',reserve:'25',maxShare:'20',watch:[556]});await expect(page.locator('[data-empty-reason=filters]')).toBeVisible();await expect(page.locator('nav.tabs')).not.toBeVisible();await page.screenshot({path:'artifacts/v302-empty-recovery.png',fullPage:true});await page.locator('[data-action=reset-screening]').click();await expect(page.locator('[data-simple-idea]')).toHaveCount(1);
 const saved=await page.evaluate(()=>new Promise((resolve,reject)=>{const r=indexedDB.open('golden-hub-osrs-v4',1);r.onerror=()=>reject(r.error);r.onsuccess=()=>{const db=r.result,q=db.transaction('records').objectStore('records').get('personal');q.onsuccess=()=>{resolve(JSON.parse(q.result));db.close();};q.onerror=()=>reject(q.error);};}));expect(saved.budget).toBe('100000000');expect(saved.restriction).toBe('unknown');expect(saved.reserve).toBe('25');expect(saved.maxShare).toBe('20');expect(saved.watch).toEqual([556]);expect(saved.trades).toEqual([]);
 await page.reload();await expect(page.locator('[data-simple-idea]')).toHaveCount(1);expect(errors).toEqual([]);
});
test('a recently cached stale hourly block is reloaded on startup and real trade ideas return',async({page})=>{
 const snapshot={...fixtures,times:Object.fromEntries(['mapping','latest','5m','1h'].map(p=>[p,at-10000])),'1h':{...fixtures['1h'],timestamp:at/1000-11000}};
 const {errors,requests}=await boot(page,{...settings,snapshot});await expect(page.locator('[data-simple-idea]')).toHaveCount(1);expect(requests).toContain('1h');expect(requests).not.toContain('mapping');expect(errors).toEqual([]);
});
test('a genuinely delayed upstream volume feed is explained and never produces an invented order',async({page})=>{
 const stale={...fixtures['1h'],timestamp:at/1000-11000};const {errors}=await boot(page,settings,{'1h':stale});await expect(page.locator('[data-empty-reason=feed]')).toContainText('hourly volume feed is behind');await expect(page.locator('#simpleStatus')).toContainText('Volume data is behind');await expect(page.locator('[data-action=start]')).toHaveCount(0);await expect(page.locator('[data-action=refresh]')).toBeVisible();expect(errors).toEqual([]);
});
