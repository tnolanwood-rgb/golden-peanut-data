const {test}=require('node:test');
const assert=require('node:assert/strict');
const Board=require('../app/market-board.js');
const NOW=Date.UTC(2026,10,6,16);
const stamp=new Date(NOW).toISOString();
const source={
 ok:true,budget:40651,orders:[],
 activeBook:{entries:[{id:9,units:14,scenarioUnits:4,conditionalWeek:120000,capital:220000,nightReferenceUnits:2,historicalBuyWeeks:3,historicalSellWeeks:3}]},
 marketChoices:[
  {id:101,itemName:"Cleric's Pearl Sword",buy:15000,exit:26000,quantity:4,cap:4,conservativeOrderCap:4,
   asOf:stamp,repeatEvidence:true,buyWeeks:4,sellWeeks:4,nightUnits:2,observedNightBuys:4,
   observed24Reference:3,openBuys:0},
  {id:102,itemName:"Dire Exalted Coat",buy:25000,exit:39000,quantity:2,cap:2,conservativeOrderCap:2,
   asOf:stamp,repeatEvidence:true,buyWeeks:3,sellWeeks:3,nightUnits:0,openBuys:0},
  {id:103,itemName:"Berserker's Shattered Sword",buy:10000,exit:19000,quantity:3,cap:3,conservativeOrderCap:3,
   asOf:stamp,repeatEvidence:true,buyWeeks:2,sellWeeks:2,nightUnits:0,openBuys:0},
  {id:104,itemName:"Stale Trial",buy:10000,exit:999999,quantity:90,cap:90,asOf:new Date(NOW-86400000).toISOString(),
   repeatEvidence:true,buyWeeks:8,sellWeeks:8,nightUnits:90},
  {id:105,itemName:"Already on order",buy:10000,exit:999999,quantity:90,cap:90,asOf:stamp,
   repeatEvidence:true,buyWeeks:8,sellWeeks:8,nightUnits:90,openBuys:90}
 ],
 publicResearch:[
  {id:201,name:"Rabid Pearl Reaver",buy:7000,exit:14000,observations:1,
   buyQty:30,sellQty:25,at:stamp,openBuys:0},
  {id:202,name:"Rampager's Draconic Coat",buy:11000,exit:17000,observations:2,
   buyQty:70,sellQty:20,at:stamp,openBuys:0},
  {id:203,name:"Snow Diamond Infusion",buy:600000,exit:2000000,observations:3,
   buyQty:200,sellQty:200,at:stamp,openBuys:0},
  {id:204,name:"Overpriced Mystery",buy:250001,exit:1000000,observations:2,
   buyQty:200,sellQty:200,at:stamp,openBuys:0},
  {id:205,name:"Bad spread",buy:11000,exit:11001,observations:2,
   buyQty:200,sellQty:200,at:stamp,openBuys:0},
 ],
 candidateRefresh:{checked:6500},
 publicCatalogue:{items:27999},
 publicDiscovery:{broadMarginCandidates:1190}
};
test('never hide profitable older history or stat/weapon variants behind eight-window forecasts',()=>{
 const b=Board.build(source,{wallet:40651,now:NOW});
 assert.equal(b.ready,true);
 assert.equal(b.counts.catalogue,27999);
 assert.deepEqual(b.history.map(x=>x.id),[101,103,102]);
 assert.equal(b.history[0].nightUnits,2);
 assert.equal(b.history[0].tier,'observed-night-conditional');
 assert.equal(b.history[1].tier,'historical-conditional');
 assert.equal(b.history[2].capitalStatus,'needs-capital');
 assert.equal(b.forecast.length,0);
 assert.equal(b.standing.length,1);
});
test('no fabricated twenty-unit orders or projected public overnight income',()=>{
 const b=Board.build(source,{wallet:40651,now:NOW});
 assert.deepEqual(b.newMarkets.map(x=>x.id).sort(),[201,202]);
 for(const r of b.newMarkets){
  assert.equal(r.kind,'new');assert.equal(r.tier,'public-unverified');
  assert.equal(r.quantity,undefined);assert.equal(r.expectedProfit,undefined);
  assert.equal(r.nightProfit,undefined);assert.equal(r.cost,undefined);
  assert.ok(r.unitMargin>0);
 }
 assert.ok(!b.newMarkets.some(x=>/infusion/i.test(x.name)));
});
test('stale quote and unverified existing positions cannot become new buys',()=>{
 const b=Board.build(source,{wallet:40651,now:NOW});
 assert.ok(!b.history.some(x=>x.id===104||x.id===105));
 assert.ok(b.history.every(x=>x.cost===x.buy*x.quantity&&x.scenarioProfit>0));
 assert.ok(b.history.every(x=>x.quantity<=4));
});
test('cheap Pearl and exotic-armour leads are surfaced separately before expensive collectibles',()=>{
 const p={...source,publicResearch:[
  {...source.publicResearch[0],type:'Weapon',rarity:'Exotic'},
  {...source.publicResearch[1],type:'Armor',rarity:'Exotic'},
  {id:67276,name:"Jormag's Claw Fragment",type:'Consumable',subtype:'Unlock',rarity:'Rare',
   buy:150026,exit:450000,buyQty:65,sellQty:86,observations:2,at:stamp,openBuys:0},
  {id:901,name:"Magi's Draconic Boots",type:'Armor',rarity:'Exotic',
   buy:5000,exit:8500,buyQty:25,sellQty:35,observations:2,at:stamp,openBuys:0}
 ]};
 const b=Board.build(p,{wallet:40651,now:NOW});
 assert.deepEqual(b.pearlLeads.map(x=>x.id),[201]);
 assert.deepEqual(b.armorLeads.map(x=>x.id).sort(),[202,901]);
 assert.ok(!b.newMarkets.some(x=>x.id===67276));
 assert.ok(b.pearlLeads.every(x=>x.buy<=b.available&&x.quantity===undefined));
 assert.ok(b.armorLeads.every(x=>x.expectedProfit===undefined));
 assert.equal(b.otherLeads.length,0);
});
test('expensive gold-per-unit spreads do not outrank cheaper wallet-eligible equipment',()=>{
 const p={...source,publicResearch:[
  {id:1001,name:"Dire Pearl Siren",type:'Weapon',rarity:'Exotic',
   buy:8500,exit:15000,buyQty:30,sellQty:30,at:stamp},
  {id:1002,name:"Visage of Dwayna",type:'Consumable',rarity:'Rare',
   buy:200767,exit:430000,buyQty:80,sellQty:80,at:stamp}
 ]};
 const b=Board.build(p,{wallet:123947,now:NOW});
 assert.deepEqual(b.pearlLeads.map(x=>x.id),[1001]);
 assert.equal(b.otherLeads.length,0); // pricey speculative unlock not shown on the home page
 assert.equal(b.newMarkets.length,2); // still available for deeper research
});
test('the full public catalogue feeds diverse cheap exotic live-requote seeds',async()=>{
 const Feed=require('../app/public-market-feed.js');
 const original=global.fetch;
 const rows=Array.from({length:1000},(_,i)=>[i+1,'Generic item '+i,'Gizmo','Basic',100,102,10,10]);
 const stats=['Rabid','Dire','Rampager\'s','Cleric\'s','Magi\'s','Assassin\'s','Berserker\'s'];
 const expected=[];
 for(let i=0;i<stats.length;i++){
  const n=i*2;rows[n]=[n+1,stats[i]+' Pearl Reaver','Weapon','Exotic',5000+i*100,11000+i*100,20,20];
  rows[n+1]=[n+2,stats[i]+' Exalted Coat','Armor','Exotic',7000+i*100,13000+i*100,20,20];
  expected.push(n+1,n+2);
 }
 rows[30]=[31,"Jormag's Claw Fragment",'Consumable','Rare',150026,440000,100,100];
 const response={schema:'golden-peanut-public-v1',generated_at:Math.floor(Date.now()/1000),
  count:rows.length,items:rows};
 global.fetch=async()=>({ok:true,json:async()=>response});
 try{
  await Feed.load({meta:{},db:{putMetadataBatch:async()=>{}}},{force:true});
  const ids=Feed.equipmentSeeds({limit:50,maxBid:100000});
  for(const id of expected)assert.ok(ids.includes(id),'missing equipment id '+id);
  assert.ok(!ids.includes(31));
 }finally{global.fetch=original;}
});
test('empty/stale candidate set does not invent funded trades',()=>{
 const b=Board.build({ok:true,budget:0,marketChoices:[],publicResearch:[]},{wallet:0,now:NOW});
 assert.deepEqual(b.history,[]);assert.deepEqual(b.newMarkets,[]);assert.deepEqual(b.forecast,[]);
 assert.equal(Board.build(null).ready,false);
});

test('verified zero-fill nights demote stagnant high-margin markets and give evidence-weighted order ranking',()=>{
 const dates=Array.from({length:6},(_,i)=>new Date(NOW-(i+1)*86400000).toISOString().slice(0,10));
 const nights=(fills)=>({
  supported:true,
  buys:dates.map((night,i)=>({night,filled:fills[i]})),
  sells:dates.map((night,i)=>({night,filled:fills[i]}))
 });
 const p={...source,privateNightEvidence:{
  101:nights([0,0,0,0,0,0]),
  102:nights([2,2,2,2,2,2])
 }};
 const b=Board.build(p,{wallet:40651,now:NOW});
 const dormant=b.history.find(x=>x.id===101),liquid=b.history.find(x=>x.id===102);
 assert.ok(dormant.measuredNights);
 assert.equal(dormant.nightUnits,0);
 assert.equal(dormant.nightProfit,0);
 assert.equal(dormant.measuredNights.buy.zeros,6);
 assert.equal(liquid.nightUnits,2);
 assert.equal(liquid.tier,'cloud-observed-nights');
 assert.equal(b.history[0].id,102);
 assert.equal(b.history.every(x=>x.expectedProfit===undefined),true);
});
test('incomplete and stale night evidence cannot create fill predictions',()=>{
 const dates=Array.from({length:5},(_,i)=>new Date(NOW-(i+20)*86400000).toISOString().slice(0,10));
 const stale={supported:true,buys:dates.map(night=>({night,filled:5})),
  sells:dates.map(night=>({night,filled:5}))};
 const p={...source,privateNightEvidence:{101:stale}};
 const b=Board.build(p,{wallet:40651,now:NOW});
 assert.equal(b.history.find(x=>x.id===101).measuredNights,null);
 assert.equal(b.history.find(x=>x.id===101).tier,'observed-night-conditional');
});

test('uncalibrated empirical results must never become calibrated opportunities',()=>{
 const execution=require('../app/execution-engine.js');
 const previous=execution.ranked;
 execution.ranked=()=>({rows:[{id:3501,item:3501,quantity:5,buy:100,exit:200,
  cost:550,expectedProfit:180,expectedAcquired:4,expectedSold:3,
  calibrated:false,model:'empirical-joint-24h-v1'}]});
 try{
  const result=Board.build({...source,activeBook:{entries:[]},marketChoices:[]},
   {wallet:40651,now:NOW});
  assert.equal(result.forecast.length,1);
  assert.equal(result.forecast[0].tier,'empirical-24h-unvalidated');
  assert.equal(result.forecast[0].calibrated,false);
  assert.match(result.disclaimer,/NOT calibrated/);
 }finally{execution.ranked=previous;}
});
test('personally observed BUY AND SELL reductions improve discovery priority without inventing fill forecasts',()=>{
 const candidate=(id)=>({
  id,name:'Crystalline Dust Parcel '+id,type:'CraftingMaterial',rarity:'Rare',
  buy:3200,exit:7200,buyQty:60,sellQty:60,observations:2,
  at:stamp,openBuys:0
 });
 const matched={...candidate(5102),observedOrderFillsAll:26,observedSellFillsAll:23,
  observedOrderFills24h:13,observedSellFills24h:10};
 const oneSide={...candidate(5103),observedOrderFillsAll:300,observedSellFillsAll:0};
 const result=Board.build({...source,activeBook:{entries:[]},marketChoices:[],
  publicResearch:[candidate(5101),matched,oneSide]},{wallet:40651,now:NOW});
 assert.deepEqual(result.newMarkets.map(x=>x.id).slice(0,2),[5102,5101]);
 assert.equal(result.newMarkets[0].observedOrderFillsAll,26);
 assert.equal(result.newMarkets[0].observedSellFillsAll,23);
 assert.match(result.newMarkets[0].evidence,/NOT an attributed round trip/);
 assert.equal(result.newMarkets.find(x=>x.id===5103).observedSellFillsAll,0);
 for(const r of result.newMarkets){
  assert.equal(r.expectedProfit,undefined);
  assert.equal(r.quantity,undefined);
  assert.equal(r.nightProfit,undefined);
 }
});

test('cheap materials with modest individual margins are visible as volume RESEARCH without inventing sales',()=>{
 const publicResearch=[
  {id:9101,name:'Jute Scrap',type:'CraftingMaterial',rarity:'Basic',
   buy:50,exit:80,buyQty:1200,sellQty:1800,at:stamp},
  {id:9102,name:'Wood Log',type:'CraftingMaterial',rarity:'Basic',
   buy:60,exit:80,buyQty:1200,sellQty:1800,at:stamp},
  {id:9103,name:'Thin Book Item',type:'CraftingMaterial',
   buy:50,exit:80,buyQty:2,sellQty:2,at:stamp},
  {id:9104,name:'Cheap Armor',type:'Armor',rarity:'Exotic',
   buy:50,exit:80,buyQty:1200,sellQty:1800,at:stamp}
 ];
 const b=Board.build({...source,activeBook:{entries:[]},
  marketChoices:[],publicResearch},{wallet:40651,now:NOW});
 assert.ok(b.commodityLeads.some(x=>x.id===9101),'Jute-like material should reach new-market research');
 assert.ok(b.commodityLeads.some(x=>x.id===9102),'Wood-like material should reach new-market research');
 assert.ok(!b.newMarkets.some(x=>x.id===9103),'thin order book alone cannot promote microspread research');
 assert.ok(!b.newMarkets.some(x=>x.id===9104),'do not lower the equipment minimum margin');
 assert.ok(b.newMarkets.filter(x=>x.id===9101||x.id===9102).every(x=>
  x.kind==='new'&&x.tier==='public-unverified'&&x.quantity===undefined&&
  x.expectedProfit===undefined&&x.nightProfit===undefined));
});
