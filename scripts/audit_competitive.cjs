// Deterministic synthetic replay. Optional argument: extracted baseline capacity module.
const path=require('node:path');
const Capacity=require(path.resolve(process.argv[2]||'app/capacity-intelligence.js'));
const now=Date.UTC(2026,10,8,12),DAY=86400000,ledger=[];
for(let day=1;day<=6;day++){
 const purchased=now-day*DAY;
 ledger.push({item:1,side:'buy',q:4,price:100,purchased});
 ledger.push({item:1,side:'sell',q:4,price:200,purchased:purchased+3600000});
}
const args={market:{id:1,buy:100,exit:200},ledger,metadata:{1:{name:'Synthetic material',type:'CraftingMaterial'}},quantity:50,now};
const nights={supported:true,samples:Array.from({length:6},()=>({filled:0}))};
const compact=result=>({source:result.source,conditional24h:result.scenarios[0],expectedProfit:result.expectedProfit??null});
console.log(JSON.stringify({conditions:'Synthetic six active days: four buys and four sales per day; six unpriced zero-fill nights',
 history:compact(Capacity.estimate(args)),
 withUnpricedNights:compact(Capacity.estimate({...args,buyNights:nights,sellNights:nights}))},null,2));
