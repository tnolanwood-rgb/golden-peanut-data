/* Scale regression approximating a user's 141k-trade, 312-order,
 * 6.5k scanned / 1.5k new-lead account. Synthetic, never personal data. */
const {test}=require('node:test'),assert=require('node:assert/strict');
const Capacity=require('../app/capacity-intelligence.js');
const Portfolio=require('../app/portfolio-intelligence.js');
const NOW=Date.UTC(2026,10,6,19),DAY=86400000;
test('141,879 completed transactions and 1,549 unfamiliar leads remain bounded and do not fabricate volume',()=>{
 const meta={},ledger=[],historical=[];
 for(let id=1;id<=150;id++){
  const name="Berserker's "+(id%3===0?'Pearl':id%3===1?'Exalted':'Emblazoned')+' Sample '+id;
  meta[id]={id,name,type:id%3===0?'Weapon':'Armor',rarity:'Exotic'};
  historical.push({id,itemName:name,buy:5000+id*37,exit:13000+id*50,
   asOf:new Date(NOW).toISOString(),repeatEvidence:true,buyWeeks:5,sellWeeks:5,
   buyWeek25:5+id%13,sellWeek25:4+id%10,researchCap:12+id%8,
   capacityAfterPositions:12+id%8,cap:1,quantity:1,ageDays:id%40,
   openBuys:id<=35?2:0,openSells:0,deliveryUnits:0});
 }
 for(let i=0;i<141879;i++){
  const id=1+i%150,q=i%4+1,at=NOW-(i%180)*DAY;
  ledger.push({item:id,q,price:8000+id*10,side:i%2?'sell':'buy',purchased:at,key:'test:'+i});
 }
 const price=meta[150],m={id:150,name:price.name,buy:9000,exit:16000,buyQty:60,sellQty:60};
 const e=Capacity.estimate({market:m,ledger,metadata:meta,quantity:50,now:NOW});
 assert.ok(['research','insufficient'].includes(e.status));
 assert.equal(e.quantity,50);
 const publicResearch=Array.from({length:1549},(_,i)=>({
  id:10000+i,name:'Dire Exalted Coat '+i,type:'Armor',rarity:'Exotic',
  buy:2500+i,exit:7500+i,buyQty:50,sellQty:40,observations:2,
  at:new Date(NOW).toISOString(),openBuys:0}));
 const positions=Array.from({length:312},(_,i)=>({id:20000+i,units:1,scenarioUnits:1,capital:30000,conditionalWeek:1000}));
 const p=Portfolio.build({ok:true,marketChoices:historical,publicResearch,
  activeBook:{committed:8070091,conditionalWeek:300000,covered:7000000,entries:positions,unverified:20}},
  {budgetGold:819,wallet:123947,committed:8070091,now:NOW});
 assert.equal(p.ok,true);
 assert.equal(p.existingBook.activeItems,312);
 assert.equal(p.publicProbeMarkets,1549);
 assert.ok(p.spent<=p.spendLimit);
 assert.ok(p.selectedMarkets<=55);
 assert.equal(new Set(p.rows.map(x=>x.id)).size,p.rows.length);
 assert.ok(p.rows.every(x=>x.cost>0&&x.quantity>=1&&x.conditionalRound>0));
 assert.ok(p.rows.some(x=>x.research));
});
