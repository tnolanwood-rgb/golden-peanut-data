// Assembled browser regression test. All account/market outcomes here are SYNTHETIC.
const {chromium}=require('playwright-core');const http=require('node:http');const fs=require('node:fs');const path=require('node:path');const assert=require('node:assert/strict');
const root=path.resolve('app');
const server=http.createServer((req,res)=>{const file=path.resolve(root,'.'+(req.url.split('?')[0]==='/'?'/index.html':req.url.split('?')[0]));if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}try{res.setHeader('Content-Type',file.endsWith('.js')?'application/javascript':file.endsWith('.css')?'text/css':file.endsWith('.png')?'image/png':'text/html');res.end(fs.readFileSync(file));}catch{res.writeHead(404).end();}});
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||(fs.existsSync('/usr/bin/chromium')?'/usr/bin/chromium':chromium.executablePath()),headless:true,args:['--no-sandbox']});
try{for(const viewport of [{width:1440,height:1000},{width:390,height:844}]){
 const context=await browser.newContext({viewport});const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',async route=>{const u=new URL(route.request().url());if(u.origin===origin)return route.continue();
  const now=Math.floor(Date.now()/1000),day=Math.floor(now/86400);let data=[];
  if(u.pathname.endsWith('market_public.json'))data={schema:'golden-peanut-public-v1',generated_at:now,count:1100,items:Array.from({length:1100},(_,i)=>[i+1,i<2?'Fixture opportunity '+(i+1):'Catalogue family '+(i+1),'Weapon','Exotic',99,201,100,100])};
  else if(u.pathname.endsWith('market_history.json'))data={schema:'golden-peanut-daily-v1',generated_at:now,history:Object.fromEntries([1,2].map(id=>[id,Array.from({length:8},(_,i)=>[day-7+i,99,id===2?241:201,100,100])]))};
  else if(u.pathname.endsWith('/account/wallet'))data=[{id:1,value:10000}];
  else if(u.pathname.endsWith('/commerce/delivery'))data={coins:0,items:[]};
  else if(u.pathname.endsWith('/commerce/prices'))data=(u.searchParams.get('ids')||'1,2').split(',').map(Number).map(id=>({id,buys:{unit_price:99,quantity:100},sells:{unit_price:id===2?241:201,quantity:100}}));
  else if(u.pathname.endsWith('/items')){
   const family={301:["Cleric's Pearl Sword",'Weapon'],302:['Dire Pearl Reaver','Weapon'],
    303:["Berserker's Shattered Sword",'Weapon'],304:["Magi's Exalted Coat",'Armor'],
    401:["Berserker's Pearl Peer 401",'Weapon'],402:["Berserker's Pearl Peer 402",'Weapon'],
    403:["Berserker's Pearl Peer 403",'Weapon']};
   data=(u.searchParams.get('ids')||'1,2').split(',').map(Number).map(id=>({
    id,name:family[id]?.[0]||'Fixture opportunity '+id,type:family[id]?.[1]||'Weapon',
    rarity:'Exotic',level:80,flags:[],details:{type:'Sword'},icon:''
   }));
  }
  else if(u.pathname.endsWith('/commerce/listings'))data=[];
  await route.fulfill({status:200,headers:{'content-type':'application/json','access-control-allow-origin':'*','x-page-total':'1','x-result-total':String(Array.isArray(data)?data.length:0)},body:JSON.stringify(data)});
 });
 await page.goto(origin);await page.waitForFunction(()=>window.GPFocus&&window.GoldenPeanutClean?.State?.db?.db);
 assert.match(await page.locator('#gp-build-integrity').innerText(),/components verified/);
 // Never rely on an activation-less startup pushState: Android skips it.
 assert.equal(await page.evaluate(()=>history.state?.gpIndex),0);

 const setup=await page.evaluate(async()=>{
  const s=GoldenPeanutClean.State;s.account='Fixture.1234';s.opportunityDeepPaused=true; // isolate synthetic fixtures from a racing auto-discovery refresh
  s.snapshot=await s.api.snapshot('fixture-key-not-a-credential',s.account);s.ledger=[];
  await GPMarketFeed.load(s,{force:true});await GPMarketFeed.loadHistory({force:true});
  const now=Date.now(),DAY=86400000;
  s.executionLearning={version:1,cohorts:[],samples:[1,2].flatMap(item=>Array.from({length:10},(_,i)=>{
   const start=now-(12-i)*DAY;return {status:'complete',source:'verified-personal-window',order:item*100+i,item,offered:5,acquired:i%3?5:0,sold:i%3?4:0,listed:i%3?5:0,buy:100,exit:item===2?240:200,start,end:start+DAY,knownAt:start+DAY+1000,profit:270,category:'Weapon'};}))};
  await s.db.put('config',s.account,'execution-learning-v1',s.executionLearning);
  await s.db.put('snapshots',s.account,'last',s.snapshot);
  const p=await GPOpportunity.refresh(s,{phase:'quick'});GPFocus.render();
  return {orders:p.orders.map(x=>({id:x.id,cost:x.cost,expected:x.expectedProfit})),spent:p.spent,budget:p.budget,inventory:s.snapshot.inventoryVerified};
 });
 assert.equal(setup.inventory,true);assert.deepEqual(setup.orders.map(x=>x.id),[2,1]);assert.ok(setup.spent<=setup.budget);
 await page.waitForFunction(()=>document.querySelectorAll('#focus-best-rows .focus-home-order').length===2);
 assert.match(await page.locator('#focus-best-rows').innerText(),/Expected 24h net/);
 await page.locator('#focus-best-rows .focus-home-order').first().click();
 assert.match(await page.locator('#focus-trade-detail').innerText(),/Expected net profit · 24h/);
 assert.doesNotMatch(await page.locator('#focus-trade-detail').innerText(),/NaN|undefined/);
 await page.evaluate(()=>{GPFocus.goto('trades');});
 await page.getByRole('button',{name:'← Back to opportunities',exact:true}).click();
 await page.locator('#focus-trade-search').fill('Catalogue family');
 await page.waitForFunction(()=>document.querySelector('#focus-trade-rows')?.textContent.includes('Show more catalogue matches'));
 const before=await page.locator('#focus-trade-rows .focus-memory-related').count();
 await page.getByRole('button',{name:/Show more catalogue matches/}).click();
 assert.ok(await page.locator('#focus-trade-rows .focus-memory-related').count()>before);
 await page.evaluate(()=>GPFocus.goto('legendaries'));assert.equal(await page.locator('#lp-search').isVisible(),true);
 const backup=await page.evaluate(async()=>{const s=GoldenPeanutClean.State;const b=await PeanutBackupV2.build(s.db,s.account,'');const v=await PeanutBackupV2.verify(b.blob);return {bytes:b.blob.size,configs:v.counts['config:'+s.account]};});
 assert.ok(backup.bytes>0&&backup.configs>0);
 await page.evaluate(()=>{const s=GoldenPeanutClean.State;s.opportunityPlan.orders[0].expectedProfit=Infinity;GPFocus.goto('today');GPFocus.render();});
 assert.equal(await page.locator('#focus-best-rows .focus-home-order').count(),0);
 await page.evaluate(()=>{const s=GoldenPeanutClean.State;s.opportunityPlan.orders=[];s.opportunityPlan.expectedProfit=null;s.opportunityPlan.spent=0;s.opportunityPlan.unallocated=s.snapshot.wallet;s.opportunityPlan.marketChoices=[];s.opportunityPlan.publicResearch=[];s.opportunityPlan.activeBook={entries:[]};GPFocus.render();});
 assert.match(await page.locator('#focus-best-rows').innerText(),/No quote-supported markets surfaced in this scan/);
 // Integrated regression: old profitable equipment and unfamiliar public markets
 // MUST survive the strict no-cohort forecast, with no invented daily volume.
 await page.evaluate(()=>{
  const s=GoldenPeanutClean.State,stamp=new Date().toISOString();
  s.meta[301]={id:301,name:"Cleric's Pearl Sword",type:'Weapon',rarity:'Exotic'};
  s.meta[302]={id:302,name:"Dire Pearl Reaver",type:'Weapon',rarity:'Exotic'};
  s.meta[303]={id:303,name:"Berserker's Shattered Sword",type:'Weapon',rarity:'Exotic'};
  s.meta[304]={id:304,name:"Magi's Exalted Coat",type:'Armor',rarity:'Exotic'};
  s.meta[67276]={id:67276,name:"Jormag's Claw Fragment",type:'Consumable',rarity:'Rare',details:{type:'Unlock'}};
  s.opportunityPlan.marketChoices=[
   {id:301,itemName:"Cleric's Pearl Sword",buy:10000,exit:20000,quantity:3,cap:3,conservativeOrderCap:3,
    asOf:stamp,repeatEvidence:true,buyWeeks:4,sellWeeks:4,nightUnits:2,observedNightBuys:3,openBuys:0},
   {id:303,itemName:"Berserker's Shattered Sword",buy:8000,exit:16000,quantity:2,cap:2,conservativeOrderCap:2,
    asOf:stamp,repeatEvidence:true,buyWeeks:3,sellWeeks:3,nightUnits:0,openBuys:0}
  ];
  s.opportunityPlan.publicResearch=[
   {id:302,name:"Dire Pearl Reaver",type:'Weapon',rarity:'Exotic',buy:4500,exit:8500,
    buyQty:70,sellQty:60,observations:1,openBuys:0,at:stamp},
   {id:304,name:"Magi's Exalted Coat",type:'Armor',rarity:'Exotic',buy:5000,exit:9700,
    buyQty:50,sellQty:48,observations:2,openBuys:0,at:stamp},
   {id:67276,name:"Jormag's Claw Fragment",type:'Consumable',subtype:'Unlock',rarity:'Rare',
    buy:150026,exit:450000,buyQty:65,sellQty:86,observations:2,openBuys:0,at:stamp}
  ];
  s.opportunityPlan.publicCatalogue={items:27999};
  s.opportunityPlan.candidateRefresh={checked:6500,phase:'expanded'};
  GPFocus.goto('today');GPFocus.render();
 });
 const enriched=await page.locator('#focus-best-rows').innerText();
 assert.match(enriched,/TOP BUY RESEARCH · MOST PROMISING FIRST/);
 assert.equal(await page.locator('#focus-best-rows .focus-top-research-row').count(),2);
 assert.match(await page.locator('#focus-best-rows .focus-top-research-row').first().innerText(),/BUY 3 ×|BUY 2 ×/);
 assert.match(await page.locator('#focus-best-rows .focus-top-research-row').first().innerText(),/NOT a forecast/);
 assert.match(enriched,/HISTORY-BACKED MARKETS/);
 assert.match(enriched,/Cleric's Pearl Sword/);
 assert.match(enriched,/Berserker's Shattered Sword/);
 assert.match(enriched,/CHEAPER PEARL WEAPONS/);
 assert.match(enriched,/CHEAPER EXOTIC ARMOUR/);
 assert.match(enriched,/Dire Pearl Reaver/);
 assert.match(enriched,/Magi's Exalted Coat/);
 assert.match(enriched,/Net IF ALL 10 buy AND resell/);
 assert.doesNotMatch(enriched,/Jormag's Claw Fragment|20 units.*Dire Pearl Reaver/);
 assert.equal(await page.locator('#focus-best-rows .focus-connected-market').count(),4);
 // The quantity control MUST live on the market LIST, not only item details.
 const marketLot=page.locator('#focus-best-rows .focus-market-lot-select');
 assert.equal(await marketLot.inputValue(),'10');
 await marketLot.selectOption('50');
 const resized=await page.locator('#focus-best-rows').innerText();
 assert.match(resized,/Research 50 ×/);
 assert.match(resized,/Net IF ALL 50 buy AND resell/);
 assert.doesNotMatch(resized,/3-day comparable ACTIVE-pace: 6–10/);
 await page.locator('#focus-best-rows .focus-connected-market').last().click();
 assert.match(await page.locator('#focus-trade-detail').innerText(),/Bid reference/);
 assert.equal(await page.locator('#focus-trade-detail .focus-capacity-select').inputValue(),'50');
 // History was pushed by the actual item tap; the Android-equivalent browser
 // Back must return to the in-app list, not navigate out of our app.
 assert.ok((await page.evaluate(()=>history.state?.gpIndex))>0);
 await page.goBack();
 await page.waitForFunction(()=>!document.querySelector('#focus-trade-list-view').hidden);
 assert.equal(new URL(page.url()).origin,origin);
 const topBack=page.getByRole('button',{name:'Back within Golden Peanut'});
 assert.equal(await topBack.isVisible(),true);
 const detailReturnDepth=await page.evaluate(()=>history.state?.gpIndex);
 await topBack.click();
 await page.waitForFunction(()=>!document.querySelector('#focus-today').hidden);
 assert.equal(new URL(page.url()).origin,origin);
 assert.equal(await page.evaluate(()=>history.state?.gpIndex),detailReturnDepth-1);
 // A second genuine tab tap creates a working Back path as well.
 await page.locator('[data-focus-nav="trades"]').click();
 assert.equal(await topBack.isVisible(),true);
 await page.goBack();
 await page.waitForFunction(()=>!document.querySelector('#focus-today').hidden);
 assert.equal(new URL(page.url()).origin,origin);
 // Re-enter the Pearl detail for the execution benchmark regression.
 await page.locator('#focus-best-rows .focus-connected-market').filter({hasText:'Dire Pearl Reaver'}).click();
 assert.match(await page.locator('#focus-trade-detail').innerText(),/Bid reference/);
 // Capacity explorer must work beyond wallet funds, with source-aware peers.
 await page.evaluate(()=>{
  const s=GoldenPeanutClean.State,now=Date.now(),day=86400000;
  for(const id of [401,402,403]){
   s.meta[id]={id,name:"Berserker's Pearl Peer "+id,type:'Weapon',rarity:'Exotic'};
   for(let i=0;i<4;i++){
    const at=now-(80-i*3)*day,q=2+i%2;
    s.ledger.push({key:'peer-buy-'+id+'-'+i,item:id,id:7000+id*100+i,side:'buy',q,price:4500,purchased:at,created:at-3600000});
    s.ledger.push({key:'peer-sell-'+id+'-'+i,item:id,id:8000+id*100+i,side:'sell',q,price:8000,purchased:at+day,created:at+day-3600000});
   }
  }
  GPFocus.goto('today');GPFocus.render();
 });
 await page.locator('#focus-best-rows .focus-connected-market[data-market-tier="public-unverified"]').filter({hasText:'Dire Pearl Reaver'}).click();
 assert.match(await page.locator('#focus-trade-detail').innerText(),/HOW MUCH COULD FILL & RESELL/);
 const qtyPicker=page.locator('#focus-trade-detail .focus-capacity-select');
 await qtyPicker.selectOption('50');
 assert.match(await page.locator('#focus-trade-detail .focus-capacity-overview').innerText(),/Gold required IF order placed/);
 const capacityDiagnostic=await page.evaluate(()=>{
  const st=GoldenPeanutClean.State;
  const m=st.opportunityPlan?.publicResearch?.find(x=>x.id===302);
  const e=GPCapacity.estimate({market:{...m,name:st.meta[302]?.name},ledger:st.ledger,metadata:st.meta,quantity:50});
  return {ledgerLength:st.ledger.length,meta302:st.meta[302],meta401:st.meta[401],
   market:m,capacity:e,shown:document.querySelector('#focus-trade-detail .focus-capacity-explorer')?.textContent?.slice(0,1200)};
 });
 if(!(await page.locator('#focus-trade-detail .focus-capacity-line[data-horizon]').count()))
  console.log('CAPACITY_BROWSER_DIAG '+JSON.stringify(capacityDiagnostic));
 const forecastRows=page.locator('#focus-trade-detail .focus-capacity-line[data-horizon]');
 assert.equal(await forecastRows.count(),3);
 assert.match(await forecastRows.nth(1).innerText(),/3 days/);
 assert.match(await page.locator('#focus-trade-detail .focus-capacity-evidence').innerText(),/Similar items/);
 assert.match(await page.locator('#focus-trade-detail .focus-capacity-peer-warning').innerText(),/NOT an estimate of how many of this particular item will fill/);
 assert.doesNotMatch(await page.locator('#focus-trade-detail .focus-capacity-explorer').innerText(),/NaN|undefined/);
 await page.evaluate(()=>GPFocus.render());
 assert.equal(await page.locator('#focus-trade-detail .focus-capacity-select').inputValue(),'50');
 await page.evaluate(()=>{const s=GoldenPeanutClean.State;
  s.opportunityPlan.marketChoices=[];s.opportunityPlan.publicResearch=[];
  GPFocus.goto('today');GPFocus.render();
 });
 // Regression: the prospective-only model MUST NOT make real recent winners vanish.
 // Retain a useful read-only ranked market list when no exact-size cohorts qualify.
 await page.evaluate(()=>{
  const s=GoldenPeanutClean.State,now=Date.now(),day=86400000;
  s.ledger=[
   {key:'recent-buy',item:1,id:9021,side:'buy',q:4,price:100,purchased:now-2*day,created:now-2*day-3600000},
   {key:'recent-sell',item:1,id:9022,side:'sell',q:4,price:240,purchased:now-day,created:now-day-3600000}
  ];
  GPFocus.goto('today');GPFocus.render();
 });
 assert.match(await page.locator('#focus-best-rows').innerText(),/RECENT REAL EARNINGS/);
 assert.equal(await page.locator('#focus-best-rows .focus-actual-winner').count(),1);
 assert.match(await page.locator('#focus-best-rows .focus-actual-winner').innerText(),/real net profit · last 7 days/);
 await page.locator('#focus-best-rows .focus-actual-winner').click();
 assert.equal(await page.locator('#focus-trade-detail').isVisible(),true);

 // Genuine capital workflow regression: the planner must value committed capital
 // as a separate WHAT-IF, not erase it with the tiny spendable wallet.
 await page.evaluate(()=>{
  const st=GoldenPeanutClean.State,at=new Date().toISOString();
  st.snapshot.wallet=123947;st.snapshot.walletAt=at;
  st.snapshot.buys=[{id:8001,item:990,q:1,price:8070091,created:Date.now()-86400000}];
  const families=['Pearl','Exalted','Draconic','Emblazoned','Warbeast'];
  st.opportunityPlan.marketChoices=families.map((family,i)=>({
   id:2001+i,itemName:"Berserker's "+family+' Sample '+i,asOf:at,buy:10000,exit:20000,
   repeatEvidence:true,buyWeeks:5,sellWeeks:5,buyWeek25:10,sellWeek25:10,
   researchCap:12,capacityAfterPositions:12,cap:1,quantity:1,
   ageDays:6,openBuys:0,openSells:0,deliveryUnits:0
  }));
  st.opportunityPlan.publicResearch=[];
  st.opportunityPlan.activeBook={committed:8070091,entries:[]};
  GPFocus.goto('today');GPFocus.render();
 });
 const lab=page.locator('#focus-best-rows .focus-deployment-lab');
 assert.equal(await lab.count(),1);
 assert.match(await lab.innerText(),/CAPITAL DEPLOYMENT/);
 assert.match(await lab.innerText(),/WHAT-IF ONLY/);
 assert.match(await lab.innerText(),/Already committed to buys/);
 assert.equal(await lab.locator('.focus-deployment-input').inputValue(),'819');
 assert.ok((await lab.locator('.focus-deployment-market').count())>=3);
 assert.match(await lab.innerText(),/New plan · conditional active-week net/);
 const beforeAllocation=await lab.locator('.focus-deployment-metrics').innerText();
 assert.match(beforeAllocation,/Hypothetical NEW buy allocation/);
 assert.doesNotMatch(beforeAllocation,/NaN|undefined/);
 await lab.locator('.focus-deployment-input').fill('500');
 await lab.locator('.focus-deployment-input').press('Tab');
 assert.equal(await lab.locator('.focus-deployment-input').inputValue(),'500');
 const elected=await page.evaluate(()=>JSON.parse(localStorage.getItem('gp-focus-ui-v1')).portfolioBudgetGold);
 assert.equal(elected,500);
 const chosen=await page.evaluate(()=>{
  const st=GoldenPeanutClean.State,b=GPPortfolio.build(st.opportunityPlan,
   {budgetGold:500,wallet:st.snapshot.wallet,committed:8070091});
  return {spent:b.spent,budget:b.budget,freeWallet:b.actualWallet,rows:b.rows.length};
 });
 assert.ok(chosen.spent>chosen.freeWallet,'500g WHAT-IF should not be wallet-capped');
 assert.ok(chosen.spent<=chosen.budget);
 assert.ok(chosen.rows>=3);
 await lab.locator('.focus-deployment-market').first().click();
 assert.equal(await page.locator('#focus-trade-detail').isVisible(),true);
 assert.match(await page.locator('#focus-trade-detail').innerText(),/Bid reference/);
 await page.evaluate(()=>{GPFocus.goto('today');GPFocus.render();});
 assert.equal(await lab.locator('.focus-deployment-input').inputValue(),'500');
 // Android orientation can recreate the WebView document. The PWA requests
 // portrait, and the app must retain the exact research screen on reload.
 const requestedOrientation=await page.evaluate(async()=>(
  await(await fetch('/manifest.webmanifest')).json()).orientation);
 assert.equal(requestedOrientation,'portrait');
 await page.evaluate(()=>{
  const state=GoldenPeanutClean.State;
  state.opportunityPlan.publicResearch=[{id:302,name:'Dire Pearl Reaver',type:'Weapon',rarity:'Exotic',
   buy:4000,exit:8500,buyQty:30,sellQty:30,observations:2,at:new Date().toISOString(),openBuys:0}];
  GPFocus.goto('today');GPFocus.render();
 });
 await page.locator('#focus-best-rows .focus-connected-market').filter({hasText:'Dire Pearl Reaver'}).click();
 await page.waitForFunction(()=>{
  const v=JSON.parse(localStorage.getItem('gp-focus-ui-v1')||'null');
  return v?.tab==='trades'&&v?.tradeDetail===302&&v?.selectedMarket?.id===302;
 });
 assert.equal(await page.locator('#focus-trade-detail').isVisible(),true);
 await page.setViewportSize({width:844,height:390});
 assert.equal(await page.locator('#focus-trade-detail').isVisible(),true);
 await page.setViewportSize({width:390,height:844});
 assert.equal(await page.locator('#focus-trade-detail').isVisible(),true);
 await page.reload(); // Worst-case native Activity teardown/recreation.
 await page.waitForFunction(()=>window.GPFocus&&document.querySelector('#focus-trade-detail')&&!document.querySelector('#focus-trade-detail').hidden,
  {timeout:7500}).catch(async error=>{
  const state=await page.evaluate(()=>({saved:JSON.parse(localStorage.getItem('gp-focus-ui-v1')||'null'),
   headline:document.querySelector('#focus-title')?.textContent,
   selectedHidden:document.querySelector('#focus-trade-detail')?.hidden,
   selectedText:document.querySelector('#focus-trade-detail')?.textContent?.slice(0,450),
   selectedTab:[...document.querySelectorAll('[data-focus-page]')].filter(x=>!x.hidden).map(x=>x.dataset.focusPage),
   errorText:document.querySelector('#focus-sync-state')?.textContent}));
  console.log('ORIENTATION_RECOVERY_DIAG '+JSON.stringify(state));
  throw error;
 });
 assert.equal(await page.locator('#focus-trade-detail').isVisible(),true,
  'page recreation must not redirect to Best Trades or erase the selected market');
 assert.match(await page.locator('#focus-trade-detail').innerText(),/Dire Pearl Reaver/);
 assert.match(await page.locator('#focus-trade-detail').innerText(),/Restored this market after the phone reloaded/);
 assert.match(await page.locator('#focus-trade-detail').innerText(),/Refresh before trading/i);
 assert.equal(await page.locator('#focus-title').innerText(),'Compare markets');
 // After the Android wrapper loses its native backstack, in-app Back still works.
 await page.getByRole('button',{name:'Back within Golden Peanut'}).click();
 await page.waitForFunction(()=>document.querySelector('#focus-trade-list-view')&&!document.querySelector('#focus-trade-list-view').hidden,{timeout:7500});
 assert.equal(await page.locator('#focus-trade-list-view').isVisible(),true);
 // Real portrait UX: all 72 candidates reachable within ONE section,
 // without mounting 72 cards on the main screen at once.
 await page.evaluate(()=>{
  const s=GoldenPeanutClean.State,stamp=new Date().toISOString();
  s.account='Fixture.1234';s.key='fixture-key-not-a-real-key';
  s.snapshot={...(s.snapshot||{}),account:s.account,at:stamp,walletAt:stamp,wallet:125000,buys:[],sells:[],
   buysVerified:true,sellsVerified:true,delivery:{items:[],coins:0}};
  const items=Array.from({length:72},(_,i)=>({
   id:6000+i,name:"Magi's Exalted Test Coat "+i,type:'Armor',rarity:'Exotic',
   buy:2100+i,exit:4300+i,buyQty:55,sellQty:42,observations:2,openBuys:0,at:stamp
  }));
  for(const item of items)s.meta[item.id]={id:item.id,name:item.name,type:'Armor',rarity:'Exotic'};
  s.opportunityPlan={...s.opportunityPlan,ok:true,at:Date.now(),source:'wallet',budget:s.snapshot.wallet,
   spent:0,unallocated:s.snapshot.wallet,asOf:stamp,publicResearch:items,
   marketChoices:[],orders:[],activeBook:{entries:[]}};
  GPFocus.goto('today');GPFocus.render();
 });
 const armorSection=page.locator('#focus-best-rows [data-section-id="exotic-armour"]');
 await page.waitForFunction(()=>document.querySelector('#focus-best-rows [data-section-id="exotic-armour"]'),null,{timeout:9000}).catch(async e=>{
  const diag=await page.evaluate(()=>({text:document.querySelector('#focus-best-rows')?.textContent?.slice(0,900),
   source:GoldenPeanutClean.State.opportunityPlan?.source,
   at:GoldenPeanutClean.State.opportunityPlan?.at,
   walletAt:GoldenPeanutClean.State.snapshot?.walletAt,
   researchCount:GoldenPeanutClean.State.opportunityPlan?.publicResearch?.length}));
  console.log('SCROLL_DIAG '+JSON.stringify(diag));throw e;
 });
 assert.equal(await armorSection.count(),1);
 assert.match(await armorSection.innerText(),/of 72 markets/);
 const armorScroll=armorSection.locator('.focus-section-scroll');
 const earlyRows=await armorSection.locator('.focus-connected-market').count();
 assert.ok(earlyRows>=6&&earlyRows<72,'first render should not truncate candidates or mount 72 cards at once');
 await armorSection.locator('.focus-section-more').click();
 const extended=await armorSection.locator('.focus-connected-market').count();
 assert.ok(extended>earlyRows,'Show more should reveal more equipment');
 await armorScroll.evaluate(el=>{el.scrollTop=el.scrollHeight;el.dispatchEvent(new Event('scroll',{bubbles:true}));});
 await page.waitForTimeout(350);
 assert.ok((await armorSection.locator('.focus-connected-market').count())>extended,
  'scrolling the exotic section should reveal further equipment');
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'no horizontal overflow');
 const scrollSaved=await page.evaluate(()=>JSON.parse(localStorage.getItem('gp-focus-ui-v1')||'null')?.sectionScrolls);
 assert.ok(Object.keys(scrollSaved||{}).some(k=>k.includes('exotic-armour')),'section scroll memory persisted');
 const watch=page.locator('#focus-best-rows .focus-account-watcher');
 assert.equal(await watch.count(),1);
 assert.match(await watch.innerText(),/The private cloud monitor is currently unreachable/);
 assert.equal(await watch.getByRole('button',{name:'Background monitoring unavailable'}).isDisabled(),true);
 // This is an account setting, not a trading forecast: it must remain
 // visible when price/forecast research goes stale.
 await page.evaluate(()=>{GoldenPeanutClean.State.opportunityPlan.at=0;GPFocus.render();});
 await page.waitForFunction(()=>document.querySelector('#focus-account-watcher'));
 assert.equal(await page.locator('#focus-account-watcher').isVisible(),true);
 assert.match(await page.locator('#focus-account-watcher').innerText(),/ACCOUNT TRADE WATCHER/);
 await page.evaluate(()=>GPFocus.goto('trades'));
 await page.getByRole('button',{name:'Account Trade Watcher'}).click();
 await page.waitForFunction(()=>document.querySelector('#focus-account-watcher')?.getBoundingClientRect().top<innerHeight);
 assert.equal(await page.locator('#focus-account-watcher').isVisible(),true);
 assert.match(await page.locator('#focus-account-watcher').innerText(),/The private cloud monitor is currently unreachable/);
 assert.match(await page.locator('#focus-account-watcher [data-monitor-state=off]').innerText(),/OFF — background monitoring/);
 // WebViews may suppress native confirm()/alert(). Enrollment must use
 // explicit in-page consent and must NEVER send a key just from Watch click.
 await page.evaluate(()=>{
  window.__watchConsentOriginal={
   status:GPCloudAccount.status,enable:GPCloudAccount.enable,refresh:GPCloudAccount.refresh
  };
  window.__enrollmentCalls=0;window.__mockEnrolled=false;
  GPCloudAccount.status=()=>({enabled:window.__mockEnrolled,syncing:false,serviceReady:true,
   lastError:null,status:window.__mockEnrolled?{lastSuccess:Date.now(),currentBuys:4}:null});
  GPCloudAccount.enable=async()=>{window.__enrollmentCalls++;window.__mockEnrolled=true;return {enabled:true};};
  GPCloudAccount.refresh=async()=>({ok:true,lastSuccess:Date.now(),currentBuys:4});
  GPFocus.render();
 });
 await page.getByRole('button',{name:'Enable background trade watching'}).click();
 assert.equal(await page.evaluate(()=>window.__enrollmentCalls),0,'first click must not upload any key');
 assert.equal(await page.getByRole('button',{name:'Start background monitoring'}).isDisabled(),true);
 await page.getByRole('checkbox',{name:'I agree to encrypted GW2 key storage for off-phone monitoring'}).check();
 assert.equal(await page.getByRole('button',{name:'Start background monitoring'}).isEnabled(),true);
 await page.getByRole('button',{name:'Start background monitoring'}).click();
 await page.waitForFunction(()=>document.querySelector('#focus-account-watcher [data-monitor-state=active]'));
 assert.equal(await page.evaluate(()=>window.__enrollmentCalls),1,'only explicit consent submits enrollment');
 assert.match(await page.locator('#focus-account-watcher').innerText(),/Monitoring ACTIVE/);
 await page.evaluate(()=>{
  GPCloudAccount.status=window.__watchConsentOriginal.status;
  GPCloudAccount.enable=window.__watchConsentOriginal.enable;
  GPCloudAccount.refresh=window.__watchConsentOriginal.refresh;
  GPFocus.render();
 });
 // Confirm state distinguishes enrollment from a mere Worker health response.
 await page.evaluate(()=>{
  window.__originalWatchStatus=GPCloudAccount.status;
  GPCloudAccount.status=()=>({enabled:true,syncing:false,serviceReady:true,lastError:null,
   status:{lastSuccess:Date.now(),savedCompletedTrades:24,currentBuys:17,currentSells:6,verifiedOrderNights:12}});
  GPFocus.render();
 });
 await page.waitForFunction(()=>document.querySelector('#focus-account-watcher [data-monitor-state=active]'));
 assert.match(await page.locator('#focus-account-watcher [data-monitor-state=active]').innerText(),/ACTIVE — last successful cloud check/);
 assert.match(await page.locator('#focus-watcher-jump').innerText(),/Watch ✓/);
 await page.evaluate(()=>{
  GPCloudAccount.status=()=>({enabled:true,syncing:false,serviceReady:true,lastError:null,
   status:{lastSuccess:Date.now()-3*3600000,currentBuys:17}});
  GPFocus.render();
 });
 await page.waitForFunction(()=>document.querySelector('#focus-account-watcher [data-monitor-state=stale]'));
 assert.match(await page.locator('#focus-account-watcher').innerText(),/CHECKS OVERDUE/);
 await page.evaluate(()=>{
  GPCloudAccount.status=window.__originalWatchStatus;
  GPFocus.render();
 });
 assert.deepEqual(errors,[]);
 fs.mkdirSync('artifacts',{recursive:true});await page.screenshot({path:`artifacts/browser-${viewport.width}.png`,fullPage:true});
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'horizontal overflow');
 const persisted=await page.evaluate(async()=>{const s=GoldenPeanutClean.State;return (await s.db.get('config','Fixture.1234','execution-learning-v1'))?.value?.samples?.length||0;});assert.equal(persisted,20,'WebView reload must preserve account-scoped IndexedDB learning');
 assert.deepEqual(errors,[]);console.log(`PASS assembled ${viewport.width}px: HTTP ingestion -> IndexedDB -> ranking -> UI; detail/search/legendary/backup/invalid recommendation guards`);
 await context.close();
}}finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
