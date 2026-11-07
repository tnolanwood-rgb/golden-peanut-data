const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const vm=require('node:vm');
const E=require('../app/execution-engine.js');const DAY=86400000,NOW=Date.UTC(2026,10,6,12);
function sample(i,extra={}){const start=NOW-(12-i)*DAY;return {status:'complete',source:'verified-personal-window',order:i+1,item:1,offered:5,acquired:i%3?5:0,sold:i%3?4:0,listed:i%3?5:0,buy:100,exit:200,start,end:start+DAY,knownAt:start+DAY+1000,profit:i%3?270:0,category:'Weapon',...extra};}
const samples=Array.from({length:10},(_,i)=>sample(i));
const args={samples,cohorts:[],item:1,quantity:5,buy:100,exit:200,now:NOW,stable:true};
function snapshot(at,buys=[],more={}){return {at:new Date(at).toISOString(),walletAt:new Date(at).toISOString(),buysVerified:true,sellsVerified:true,inventoryVerified:true,holdings:{},buys,sells:[],delivery:{items:[]},wallet:10000,...more};}
function quote(at,id=1){return {id,buy:99,sell:201,buyQty:100,sellQty:100,at:new Date(at).toISOString(),source:'ArenaNet /v2/commerce/prices'};}
function context(){const c={console,Date,Intl,Map,Set,structuredClone,globalThis:null};c.globalThis=c;vm.createContext(c);const html=fs.readFileSync('app/index.html','utf8');for(const id of ['gp-clean-core','gp-clean-market']){const match=html.match(new RegExp('<script id="'+id+'">([\\s\\S]*?)</script>'));if(match)vm.runInContext(match[1],c);}
 for(const f of ['growth-intelligence.js','public-market-feed.js','execution-engine.js','opportunity-engine.js'])vm.runInContext(fs.readFileSync('app/'+f,'utf8'),c);return c;}
test('no active-days-only fallback or public-volume profit forecast',()=>{assert.equal(E.forecast({...args,samples:[]}).expectedProfit,null);assert.equal(E.forecast({...args,stable:false}).status,'research');});
test('zeros lower the joint empirical profit, fees on unsold listings count',()=>{const f=E.forecast(args);assert.equal(f.sampleCount,10);assert.equal(f.zeroFillWindows,4);assert.equal(f.expectedSold,2.4);assert.equal(f.expectedAcquired,3);assert.equal(f.expectedProfit,162);assert.equal(f.cost,550);assert.equal(f.expectedCapitalAt24,260);assert.ok(E.validateRecommendation(f));});
test('missing, stale, noncomparable and oversized lots never fabricate quantities',()=>{for(const a of [{quantity:50},{now:NOW+30*DAY},{buy:10000},{exit:NaN},{quantity:Infinity}])assert.equal(E.forecast({...args,...a}).status,'research');});
test('censoring cannot silently select only winning windows',()=>{assert.equal(E.forecast({...args,cohorts:[sample(1,{status:'censored'})]}).status,'research');});
test('future-known outcomes and overlapping duplicate episodes cannot train',()=>{assert.equal(E.forecast({...args,samples:samples.map(s=>({...s,knownAt:NOW+1}))}).status,'research');assert.equal(E.forecast({...args,samples:Array(10).fill(samples[1])}).status,'research');});
test('one wallet including listing fees, no item duplicates, descending expected profit',()=>{const a={...E.forecast(args),id:1},b={...a,id:2,item:2,expectedProfit:200};const p=E.allocate([a,b,{...a,expectedProfit:NaN}],1100);assert.equal(p.spent,1100);assert.deepEqual(p.orders.map(x=>x.id),[2,1]);assert.equal(E.allocate([a,b],1099).orders.length,1);});
test('malformed/impossible recommendations fail engine boundary',()=>{const a={...E.forecast(args),id:1};for(const patch of [{expectedSold:6},{expectedAcquired:Infinity},{expectedProfit:99999},{cost:0},{buy:1.1},{quantity:-1},{sampleCount:0}])assert.equal(E.validateRecommendation({...a,...patch}),false);});
test('stale wallet and unknown inventory block funded orders independently of fresh quotes',()=>{const opt={learning:{samples},quotes:[quote(NOW)],metadata:{1:{name:'Any item'}},snapshot:snapshot(NOW),now:NOW,stability:()=>true};assert.equal(E.plan(opt).orders.length,1);for(const patch of [{walletAt:new Date(NOW-DAY).toISOString()},{inventoryVerified:false},{holdings:{1:1}},{buys:[{item:1,q:5}]}])assert.equal(E.plan({...opt,snapshot:{...opt.snapshot,...patch}}).orders.length,0);});
test('zero-fill new order captured prospectively and retained at horizon',()=>{const o={id:100,item:1,q:5,price:100,created:NOW-1000};let l=E.observe(null,snapshot(NOW,[o]),[],[quote(NOW)],{now:NOW,historyAt:NOW});assert.equal(l.cohorts.length,1);l=E.observe(l,snapshot(NOW+DAY,[o]),[],[],{now:NOW+DAY,historyAt:NOW+DAY});assert.equal(l.samples.length,1);assert.equal(l.samples[0].acquired,0);assert.equal(l.samples[0].sold,0);assert.equal(l.samples[0].profit,0);});
test('disappeared order is censored, never treated as full fill or zero',()=>{const o={id:100,item:1,q:5,price:100,created:NOW-1000};let l=E.observe(null,snapshot(NOW,[o]),[],[quote(NOW)],{now:NOW,historyAt:NOW});l=E.observe(l,snapshot(NOW+DAY),[],[],{now:NOW+DAY,historyAt:NOW+DAY});assert.equal(l.samples.length,0);assert.equal(l.cohorts[0].status,'censored');});
test('same-item unrelated purchases censor attribution',()=>{const o={id:100,item:1,q:5,price:100,created:NOW-1000};let l=E.observe(null,snapshot(NOW,[o]),[],[quote(NOW)],{now:NOW,historyAt:NOW});l=E.observe(l,snapshot(NOW+DAY,[o]),[{id:200,item:1,q:2,price:100,side:'buy',purchased:NOW+1000}],[],{now:NOW+DAY,historyAt:NOW+DAY});assert.equal(l.cohorts[0].status,'censored');});
test('completed same-window buy and sale produce fee-adjusted realised sample',()=>{const o={id:100,item:1,q:5,price:100,created:NOW-1000};let l=E.observe(null,snapshot(NOW,[o]),[],[quote(NOW)],{now:NOW,historyAt:NOW});const ledger=[{...o,side:'buy',purchased:NOW+1000},{id:101,item:1,q:5,price:200,created:NOW+2000,side:'sell',purchased:NOW+3000}];l=E.observe(l,snapshot(NOW+DAY),ledger,[],{now:NOW+DAY,historyAt:NOW+DAY});assert.equal(l.samples[0].profit,350);assert.equal(l.samples[0].sold,5);});
test('no allocation double count in ranked interface boundary',()=>{const a={...E.forecast(args),id:1};assert.equal(E.ranked({orders:[a],budget:500}).rows.length,0);assert.equal(E.ranked({orders:[a],budget:550}).rows.length,1);});
test('walk-forward trains only outcomes known BEFORE prediction, zero windows included',()=>{const rows=Array.from({length:20},(_,i)=>sample(i,{start:NOW-(23-i)*DAY,end:NOW-(22-i)*DAY,knownAt:NOW-(22-i)*DAY+1000}));const report=E.backtest({samples:rows},NOW);assert.ok(report.n>0);assert.ok(report.tests.some(t=>t.acquired.actual===0));for(const t of report.tests)assert.ok(t.sampleCount<rows.filter(x=>x.start<t.start).length);assert.equal(report.promotionAllowed,false);assert.ok(Number.isFinite(report.brier));});
test('integrated opportunity engine funds nothing from completed-trade-only ledger',()=>{const c=context();const p=c.GPOpportunity.evaluate({ledger:[],quotes:[quote(NOW)],metadata:{1:{name:'Pearl weapon',type:'Weapon',rarity:'Exotic'}},snapshot:snapshot(NOW),now:NOW});assert.equal(p.orders.length,0);assert.equal(p.expectedProfit,null);assert.equal(c.GPOpportunity.rankedMarkets(p).rows.length,0);});
test('discovery reserves rotating universe quota even with oversized existing positions',()=>{const c=context();const metadata=Object.fromEntries(Array.from({length:120},(_,i)=>[i+1,{name:'Unknown family '+i,type:'Consumable'}]));const seen=new Set();for(let r=0;r<24;r++){const d=c.GPOpportunity.discoveryIds({ranked:[],markets:new Map()},metadata,Array.from({length:100},(_,i)=>({item:i+1000,q:1,price:1})),[],20,[],r);for(const id of d.ids)seen.add(id);}for(let i=1;i<=120;i++)assert.ok(seen.has(i));});
test('families derive from attributes, independent of displayed prefix',()=>{const c=context();const meta={type:'Weapon',rarity:'Exotic',details:{type:'Sword',infix_upgrade:{id:123}}};assert.deepEqual(c.GPOpportunity.equipmentFamily('Dire Pearl',meta),c.GPOpportunity.equipmentFamily('Entirely different name',meta));});
test('partial-order observation does not mutate previous persisted object',()=>{const c=context(),o={id:1,item:1,price:100,q:5};const prior=c.GPOpportunity.observeBuyOrderBook(null,{buysVerified:true,buys:[o]},NOW);const before=JSON.stringify(prior);const next=c.GPOpportunity.observeBuyOrderBook(prior,{buysVerified:true,buys:[{...o,q:2}]},NOW+1000);assert.equal(JSON.stringify(prior),before);assert.equal(next.events[0].q,3);});
test('gapped exposure cannot become a verified overnight zero',()=>{const c=context(),start=Date.UTC(2026,10,1,18);const interval=(from,to)=>({id:1,item:1,from:start+from*3600000,to:start+to*3600000,fromQty:5,toQty:5});assert.equal(c.GPOpportunity.nightlyExposure({intervals:[interval(0,1),interval(10,12)]},1,start+DAY).nights,0);});
module.exports={samples,sample,snapshot,quote,NOW,DAY};
test('matched realised ledger profit uses rounded fees, not an optimistic flat 15%',()=>{const c=context();assert.equal(c.PeanutCore.saleRevenueP100(3,1),100);const rows=[{id:1,item:1,q:1,price:1,side:'buy',purchased:NOW-1000},{id:2,item:1,q:1,price:3,side:'sell',purchased:NOW}];assert.equal(c.PeanutCore.summarizeLedger(rows,NOW).p100,0);});
test('backup learning merge retains older and newer disjoint observations',()=>{const a=sample(1),b=sample(2);const merged=E.mergeLearning({samples:[a],cohorts:[],seen:{1:1}},{samples:[b,a],cohorts:[],seen:{2:2}});assert.equal(merged.samples.length,2);assert.equal(Object.keys(merged.seen).length,2);});
test('recipe universe includes non-equipment outputs and interrupted cursor is resumable',async()=>{const c=context(),writes=[];const recipe={id:1,type:'Inscription',output_item_id:111,output_item_count:1,ingredients:[{item_id:1,count:1}]};assert.equal(c.GPOpportunity.recipeByOutput([recipe]).size,1);let n=0;const state={db:{get:async()=>null,put:async(...x)=>writes.push(x)},api:{get:async()=>{if(n++)throw Error('temporary');return {data:Array.from({length:200},(_,i)=>({...recipe,id:i+1})),pages:3,total:600};}}};const partial=await c.GPOpportunity.ensureRecipeUniverse(state);assert.equal(partial.complete,false);assert.equal(partial.nextPage,1);assert.equal(partial.recipes.length,200);assert.ok(writes.length);});

test('50-unit order shrinking to 30 then 20 becomes measured personal fill evidence in market discovery',()=>{
 const c=context(),start=NOW-2*3600000,item=5102;
 const buy=(q)=>({id:600,item,price:1000,q});
 let buys=c.GPOpportunity.observeBuyOrderBook(null,{buysVerified:true,buys:[buy(50)]},start);
 buys=c.GPOpportunity.observeBuyOrderBook(buys,{buysVerified:true,buys:[buy(30)]},start+3600000);
 buys=c.GPOpportunity.observeBuyOrderBook(buys,{buysVerified:true,buys:[buy(20)]},NOW);
 assert.equal(c.GPOpportunity.observedFillsByItem(buys,item,NOW).sinceTracking,30);
 assert.deepEqual(Array.from(buys.events,x=>x.q),[20,10]);
 const sell=(q)=>({id:601,item,price:1900,q});
 let sells=c.GPOpportunity.observeSellOrderBook(null,{sellsVerified:true,sells:[sell(40)]},start);
 sells=c.GPOpportunity.observeSellOrderBook(sells,{sellsVerified:true,sells:[sell(25)]},start+3600000);
 sells=c.GPOpportunity.observeSellOrderBook(sells,{sellsVerified:true,sells:[sell(20)]},NOW);
 assert.equal(c.GPOpportunity.observedFillsByItem(sells,item,NOW).sinceTracking,20);
 const quote={id:item,buy:1000,sell:1900,buyQty:70,sellQty:65,at:new Date(NOW).toISOString()};
 const leads=c.GPOpportunity.publicResearchCandidates({
  quotes:[quote],metadata:{[item]:{name:'Iron Ore',type:'CraftingMaterial',rarity:'Basic'}},
  hist:{markets:new Map()},orderEvidence:buys,sellOrderEvidence:sells,now:NOW
 });
 assert.equal(leads.length,1);
 assert.equal(leads[0].observedOrderFillsAll,30);
 assert.equal(leads[0].observedSellFillsAll,20);
 vm.runInContext(fs.readFileSync('app/market-board.js','utf8'),c);
 const board=c.GPMarketBoard.build({
  ok:true,budget:50000,orders:[],marketChoices:[],publicResearch:leads,
  activeBook:{entries:[]}
 },{wallet:50000,now:NOW});
 assert.equal(board.newMarkets.length,1);
 assert.equal(board.newMarkets[0].observedOrderFillsAll,30);
 assert.equal(board.newMarkets[0].observedSellFillsAll,20);
 assert.equal(board.newMarkets[0].tier,'public-unverified');
 assert.equal(board.newMarkets[0].quantity,undefined);
 assert.equal(board.newMarkets[0].expectedProfit,undefined);
});
