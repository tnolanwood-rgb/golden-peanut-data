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
test('empty/stale candidate set does not invent funded trades',()=>{
 const b=Board.build({ok:true,budget:0,marketChoices:[],publicResearch:[]},{wallet:0,now:NOW});
 assert.deepEqual(b.history,[]);assert.deepEqual(b.newMarkets,[]);assert.deepEqual(b.forecast,[]);
 assert.equal(Board.build(null).ready,false);
});
