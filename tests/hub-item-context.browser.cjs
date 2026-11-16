const assert=require('node:assert/strict'),{fixture}=require('./helpers/hub-fixture.cjs');
(async()=>{const f=await fixture(),{page,origin}=f;try{
 let release;await page.route('https://oldschool.runescape.wiki/api.php?*',async route=>{
 const name=new URL(route.request().url()).searchParams.get('titles');
 if(name==='First research item')await new Promise(resolve=>release=resolve);
 await route.fulfill({json:{query:{pages:{1:{extract:name==='Second research item'?'A shield obtained from a raid. <script>unsafe()</script>':'A different item.'}}}}}).catch(()=>{});
 });
 await page.goto(origin+'/?game=osrs');await page.waitForFunction(()=>GoldenDualHub?.diagnostics().ideas>0);
 await page.locator('#gh-item-context summary').click();
 const first=await page.locator('#gh-item-name').innerText();
 await page.locator('#gh-next').click();
 const selected=await page.locator('#gh-item-name').innerText();assert.notEqual(first,selected);
 if(selected==='Second research item')await page.waitForFunction(()=>document.getElementById('gh-item-description').textContent.includes('raid'));
 release?.();await page.waitForTimeout(100);
 assert.match(await page.locator('#gh-item-obtain').innerText(),/Grand Exchange/);
 assert.equal(await page.locator('#gh-item-wiki').getAttribute('href'),'https://oldschool.runescape.wiki/w/'+encodeURIComponent(selected.replace(/ /g,'_')));
 assert.equal(await page.locator('#gh-item-description script').count(),0);
 assert.deepEqual(f.errors,[]);console.log('PASS item context: selected-item Wiki source, acquisition link, stale response protection and escaped text');
 }finally{await f.close()}})().catch(e=>{console.error(e);process.exitCode=1});
