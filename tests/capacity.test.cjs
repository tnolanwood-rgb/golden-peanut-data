const {test}=require('node:test');
const assert=require('node:assert/strict');
const Capacity=require('../app/capacity-intelligence.js');
const NOW=Date.UTC(2026,10,6,16),DAY=86400000;
const metadata={
 101:{name:"Berserker's Pearl Reaver",type:'Weapon',rarity:'Exotic'},
 102:{name:"Dire Pearl Bludgeoner",type:'Weapon',rarity:'Exotic'},
 103:{name:"Carrion Pearl Brazier",type:'Weapon',rarity:'Exotic'},
 104:{name:"Magi's Pearl Siren",type:'Weapon',rarity:'Exotic'},
 201:{name:"Cleric's Draconic Coat",type:'Armor',rarity:'Exotic'},
 202:{name:"Rabid Exalted Pants",type:'Armor',rarity:'Exotic'},
 203:{name:"Dire Scallywag Greaves",type:'Armor',rarity:'Exotic'},
 204:{name:"Rampager's Emblazoned Boots",type:'Armor',rarity:'Exotic'},
 901:{name:"Jormag's Claw Fragment",type:'Consumable',rarity:'Rare'}
};
const ledger=[];
for(const id of [101,102,103,201,202,203]){
 for(let i=0;i<4;i++){
  const when=NOW-(80-i*3)*DAY,qty=2+i%2;
  ledger.push({item:id,q:qty,price:id<200?8000:5000,side:'buy',purchased:when,key:'b:'+id+':'+i});
  ledger.push({item:id,q:qty,price:id<200?12000:8000,side:'sell',purchased:when+DAY,key:'s:'+id+':'+i});
 }
}
const pearl={id:104,name:metadata[104].name,buy:8000,exit:12000,buyQty:80,sellQty:70};
const armor={id:204,name:metadata[204].name,buy:5000,exit:8500,buyQty:50,sellQty:40};
test('unseen affordable Pearl market can show a comparable active-day capacity without inventing fills',()=>{
 const p=Capacity.estimate({market:pearl,ledger,metadata,quantity:50,now:NOW});
 assert.equal(p.status,'research');assert.equal(p.source,'comparable-markets');assert.equal(p.comparableMarkets,3);
 assert.deepEqual(p.scenarios.map(x=>x.days),[1,3,7]);
 assert.ok(p.scenarios[0].acquiredTypical>=1);
 assert.ok(p.scenarios[0].acquiredHigh<50);
 assert.ok(p.scenarios[1].resaleTypical>0);
 assert.ok(p.scenarios.every(x=>x.acquiredHigh<=50&&x.resaleHigh<=x.acquiredHigh));
 assert.ok(p.scenarios.every(x=>x.conditional===true));
 assert.equal(p.expectedProfit,undefined);
});
test('comparison is type- and price-aware; armour examples are not Pearl weapon executions',()=>{
 const p=Capacity.estimate({market:armor,ledger,metadata,quantity:20,now:NOW});
 assert.equal(p.source,'comparable-markets');assert.equal(p.comparableMarkets,3);
 assert.equal(p.category,'armor');
 assert.ok(p.scenarios[2].resaleTypical>0);
});
test('own completed market history supersedes peer analogy, but active-day records do not prove zero-fill nights',()=>{
 const p=Capacity.estimate({market:{...pearl,id:101,name:metadata[101].name},ledger,metadata,quantity:20,now:NOW});
 assert.equal(p.source,'own-market-active-days');
 assert.match(p.readiness,/zero-fill days unknown/);
 assert.equal(p.comparableMarkets,1);
});
test('unpriced zero-fill nights cannot override active-day analogues',()=>{
 const nights={supported:true,samples:[0,0,1,0,2,0,0].map(filled=>({filled}))};
 const p=Capacity.estimate({market:pearl,ledger,metadata,quantity:20,now:NOW,buyNights:nights,sellNights:nights});
 assert.equal(p.source,'comparable-markets');
 assert.deepEqual(p.scenarios,Capacity.estimate({market:pearl,ledger,metadata,quantity:20,now:NOW}).scenarios);
 assert.equal(p.observedPractice.competitiveExposure,'unknown');
});
test('large chosen quantity is independent of tiny wallet, and zero-sales means zero claimed profit',()=>{
 const p=Capacity.estimate({market:pearl,ledger,metadata,quantity:250,now:NOW});
 assert.equal(p.quantity,250);assert.equal(p.oneRound,Capacity.feeNet(pearl.exit,250)-pearl.buy*250);
 assert.ok(p.scenarios[0].profitTypical===0);
 assert.ok(p.scenarios[2].profitTypical>=0);
});
test('no analogues means no fake quantity or resale estimate',()=>{
 const p=Capacity.estimate({market:{id:901,name:"Jormag's Claw Fragment",buy:150026,exit:300000},ledger,metadata,quantity:20,now:NOW});
 assert.equal(p.status,'insufficient');assert.deepEqual(p.scenarios,[]);
 assert.equal(p.reason.startsWith('No measured'),true);
});

test('a loss after TP fees is shown as a loss, never silently clamped to zero',()=>{
 const p=Capacity.estimate({market:{...pearl,buy:9900,exit:10000},ledger,metadata,quantity:10,now:NOW});
 assert.ok(p.oneRound<0);
 assert.equal(p.status,'research');
 assert.ok(p.scenarios.find(x=>x.days===3).profitTypical<0);
});
