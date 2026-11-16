const assert=require('node:assert/strict'),fs=require('node:fs'),{fixture}=require('./helpers/hub-fixture.cjs');
(async()=>{const f=await fixture(),{page,origin}=f;try{
 const html=fs.readFileSync('tests/fixtures/rondache-stats.html','utf8');let release,heldName,mode='valid';
 await page.route('https://oldschool.runescape.wiki/api.php?*',async route=>{
 const name=new URL(route.request().url()).searchParams.get('page');
 if(!heldName){heldName=name;await new Promise(resolve=>release=resolve);}
 if(mode==='outage')return route.fulfill({status:503,body:'{}'}).catch(()=>{});
 await route.fulfill({json:{parse:{text:{'*':html+'<script>throw Error("untrusted")</script>'}}}}).catch(()=>{});
 });
 await page.goto(origin+'/?game=osrs');await page.waitForFunction(()=>GoldenDualHub?.diagnostics().ideas>0);
 assert.equal(await page.locator('#gh-item-context').isVisible(),true);
 assert.equal(await page.locator('#gh-item-context h3').innerText(),'Item stats');
 await page.locator('#gh-next').click();
 await page.waitForFunction(()=>document.getElementById('gh-item-stats').textContent.includes('Ranged defence'));
 const selected=await page.locator('#gh-item-name').innerText();release?.();await page.waitForTimeout(80);
 const stats=await page.locator('#gh-item-stats').innerText();assert.match(stats,/80 Defence/);assert.match(stats,/Shield/);assert.match(stats,/-8/);assert.doesNotMatch(stats,/\+0(?:\D|$)/);assert.doesNotMatch(stats,/Stab attack/);assert.match(stats,/\+55/);assert.match(stats,/\+8/);
 assert.equal(await page.locator('#gh-item-context script').count(),0);
 assert.equal(await page.locator('#gh-item-wiki').getAttribute('href'),'https://oldschool.runescape.wiki/w/'+encodeURIComponent(selected.replace(/ /g,'_')));
 // Exercise the production parser directly against actual public Wiki table structure.
 const source=fs.readFileSync('app/dual-hub.js','utf8');const parser=source.slice(source.indexOf('function parseItemStats('),source.indexOf('const itemContextCache'));
 const parsed=await page.evaluate(({parser,html})=>{const parse=Function(parser+';return parseItemStats')();return {normal:parse(html),variant:parse(html+html),plain:parse('<table class="infobox-item"><tr><th>Stackable</th><td>Yes</td></tr></table>')};},{parser,html});
 assert.equal(parsed.normal.combat.find(g=>g.group==='Defence bonuses').stats.find(x=>x[0]==='Ranged')[1],'+55');
 assert.equal(parsed.variant.combat.length,0);assert.equal(parsed.variant.basic.some(p=>p[0]==='Equip requirement'),false);assert.equal(parsed.variant.ambiguous,true);assert.deepEqual(parsed.plain.combat,[]);assert.deepEqual(parsed.plain.basic,[['Stackable','Yes']]);
 mode='outage';await page.reload();await page.waitForFunction(()=>document.getElementById('gh-item-description').textContent.includes('unavailable'));
 assert.equal(await page.locator('#gh-item-context').isVisible(),true);assert.match(await page.locator('#gh-item-description').innerText(),/unavailable/);assert.equal(await page.locator('.gh-item-bonuses').count(),0);
 assert.deepEqual(f.errors,[]);console.log('PASS item stats: real Wiki bonuses/requirements, variants, non-equipment, outage fallback, stale selection and safe rendering');
 }finally{await f.close()}})().catch(e=>{console.error(e);process.exitCode=1});
