const {test}=require('node:test'),assert=require('node:assert/strict');
const Portfolio=require('../app/portfolio-intelligence.js');
const now=Date.UTC(2026,10,6,18,0,0),at=new Date(now).toISOString();
const winner=(id,group='Pearl',options={})=>({
 id,itemName:"Berserker's "+group+' Sample '+id,asOf:at,buy:10000,exit:20000,
 repeatEvidence:true,buyWeeks:5,sellWeeks:5,buyWeek25:10,sellWeek25:10,
 researchCap:12,capacityAfterPositions:12,cap:1,quantity:1,ageDays:6,
 openBuys:0,openSells:0,deliveryUnits:0,...options
});
const mk=(arr)=>({ok:true,marketChoices:arr,publicResearch:[],activeBook:{committed:8070091,entries:[]}});
test('capability planning is NOT wallet-only: 12g free / 807g committed with a separate 820g research budget',()=>{
 const p=mk([
  winner(1),winner(2,'Exalted'),winner(3,'Emblazoned'),
  winner(4,'Draconic'),winner(5,'Warbeast'),winner(6,'Antique')
 ]);
 const r=Portfolio.build(p,{budgetGold:820,wallet:123947,committed:8070091,now});
 assert.equal(r.ok,true);
 assert.equal(r.budget,8200000);
 assert.equal(r.actualWallet,123947);
 assert.equal(r.reservedInExistingBuys,8070091);
 assert.equal(r.hypotheticalExceedsWallet,true);
 assert.ok(r.spent>123947,'should be able to RESEARCH spend beyond wallet without pretending funds released');
 assert.ok(r.selectedMarkets>=3);
 assert.ok(r.spent<=r.spendLimit);
 assert.ok(r.unallocated>=0);
 assert.equal(new Set(r.rows.map(x=>x.id)).size,r.rows.length);
});
test('repeated 3-4-unit executions may justify exploratory lots without claiming 50 resales',()=>{
 const p=mk([winner(55,'Pearl',{buyWeek25:4,sellWeek25:4,researchCap:12,capacityAfterPositions:12})]);
 const r=Portfolio.build(p,{budgetGold:100,now});
 assert.equal(r.rows.length,1);
 assert.equal(r.rows[0].quantity,4);
 assert.equal(r.rows[0].observedWeekUnits,4);
 assert.equal(r.rows[0].conditionalWeek,Portfolio.feeNet(20000,4)-40000);
 assert.ok(r.rows[0].researchLotSize<=12);
});
test('portfolio never double commits existing buys, inventory or verified delivery holdings',()=>{
 const p=mk([winner(1,'Pearl',{openBuys:5}),winner(2,'Exalted',{openSells:2}),
 winner(3,'Emblazoned',{deliveryUnits:1}),winner(4,'Draconic')]);
 const r=Portfolio.build(p,{budgetGold:1000,now});
 assert.deepEqual(r.rows.map(x=>x.id),[4]);
 assert.equal(r.sourceCoverage.existing,3);
});
test('public quoted spreads cannot be turned into fabricated throughput or consume all capital',()=>{
 const p=mk([]);
 p.publicResearch=Array.from({length:25},(_,i)=>({id:1000+i,name:'Rabid Exalted Sample '+i,type:'Armor',
 buy:5000,exit:11000,at,observations:2,buyQty:20,sellQty:25,openBuys:0}));
 const r=Portfolio.build(p,{budgetGold:500,now});
 assert.ok(r.selectedMarkets<=8);
 assert.equal(r.conditionalWeek,null);
 assert.ok(r.rows.every(x=>x.source==='public-probe'&&x.quantity===1&&x.conditionalWeek===null));
 assert.ok(r.spent<=r.budget*.03);
});
test('no made-up opportunity for stale, no-resale or excessive quote spreads',()=>{
 const p=mk([winner(1,'Pearl',{asOf:new Date(now-2*86400000).toISOString()}),
  winner(2,'Exalted',{exit:10100}),winner(3,'Draconic',{buyWeek25:0,sellWeek25:0})]);
 p.publicResearch=[{id:10,name:"Jormag's Claw Fragment",type:'Consumable',buy:150026,exit:350000,at,observations:2,buyQty:50,sellQty:50}];
 const r=Portfolio.build(p,{budgetGold:1000,now});
 assert.equal(r.selectedMarkets,0);
 assert.equal(r.conditionalWeek,null);
 assert.ok(r.unallocated>=9500000);
});
test('research budget changes allocation and keeps its own 5% capital reserve',()=>{
 const p=mk([winner(1),winner(2,'Exalted'),winner(3,'Warbeast')]);
 const low=Portfolio.build(p,{budgetGold:5,now}),high=Portfolio.build(p,{budgetGold:50,now});
 assert.ok(high.spent>low.spent);
 assert.ok(low.spent<=low.spendLimit&&high.spent<=high.spendLimit);
 assert.equal(high.reserve,25000);
 assert.equal(high.unallocated+high.spent,500000);
});
test('forecasts cannot be constructed from a 1-unit bid/ask without trade evidence',()=>{
 const r=Portfolio.build(mk([{id:1,itemName:'Pearl Weapon',asOf:at,buy:4000,exit:12000,
   repeatEvidence:false,buyWeek25:0,sellWeek25:0,cap:1,quantity:1}]),{budgetGold:1000,now});
 assert.equal(r.selectedMarkets,0);
 assert.equal(r.conditionalWeek,null);
});
