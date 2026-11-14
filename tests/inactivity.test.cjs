const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const DAY=86400000,NOW=Date.UTC(2026,10,8,20);
function context(){const c={console,Date,Intl,Map,Set,structuredClone};c.globalThis=c;vm.createContext(c);
 const html=fs.readFileSync('app/index.html','utf8');for(const id of ['gp-clean-core','gp-clean-market'])vm.runInContext(html.match(new RegExp('<script id="'+id+'">([\\s\\S]*?)</script>'))[1],c);
 for(const file of ['growth-intelligence.js','execution-engine.js','opportunity-engine.js'])vm.runInContext(fs.readFileSync('app/'+file,'utf8'),c);return c;}
const record={history:{coverage:1,matchedAll:24,profitP100:100000},buyWeeksCount:6,sellWeeksCount:6,bothWeeks:6,buyActiveDays:6,sellActiveDays:6,buyCount:6,sellCount:6,buyWeekP25:12,sellWeekP25:12,buyWeekMedian:12,sellWeekMedian:12,buyDayP25:4,sellDayP25:4,buyActiveNights:6,buyNightP25:4,createdBuyRows:6,buyWaitP75:1,sellWaitP75:1,strength:1};
const quote={id:101,buy:100,sell:200,buyQty:100,sellQty:100,at:new Date(NOW).toISOString()};
function history(age){return Array.from({length:6},(_,i)=>{const purchased=NOW-(age+i*7)*DAY;return [{id:10+i,item:101,q:4,price:100,side:'buy',created:purchased-3600000,purchased},{id:20+i,item:101,q:4,price:200,side:'sell',created:purchased+1800000,purchased:purchased+3600000}];}).flat();}
test('inactivity alone cannot shrink the same conditional historical reference or research lot',()=>{
 const c=context(),fresh=c.GPOpportunity.findQuantity({...record,ageDays:7,recentBuy7:4,recentSell7:4,recentBuy30:12,recentSell30:12},quote,null,100000,{now:NOW});
 const old=c.GPOpportunity.findQuantity({...record,ageDays:400,recentBuy7:0,recentSell7:0,recentBuy30:0,recentSell30:0},quote,null,100000,{now:NOW});
 for(const field of ['cap','researchCap','earnableQty24','historicalWeeklyResearchCap'])assert.equal(old[field],fresh[field],field);
 assert.equal(old.estimated,false);assert.equal(old.expectedProfit,undefined);assert.match(old.staleness,/older/);
});
test('old successful fills remain discoverable without a fabricated zero overnight reference',()=>{
 const c=context(),fresh=c.GPOpportunity.history(history(7),NOW).markets.get(101),old=c.GPOpportunity.history(history(371),NOW).markets.get(101);
 assert.equal(old.buyActiveNights,fresh.buyActiveNights);assert.equal(old.buyNightP25,fresh.buyNightP25);
 assert.equal(old.discoveryScore,fresh.discoveryScore);
});
test('current open-book conditional example does not discount elapsed inactivity',()=>{
 const c=context(),snapshot={buys:[{id:1,item:101,q:4,price:100}],sells:[],delivery:{items:[]}};
 const a=c.GPOpportunity.activeBookScenario({ledger:history(7),quotes:[quote],snapshot,now:NOW});
 const b=c.GPOpportunity.activeBookScenario({ledger:history(371),quotes:[quote],snapshot,now:NOW});
 assert.equal(b.entries[0]?.scenarioUnits,a.entries[0]?.scenarioUnits);assert.equal(b.conditionalWeek,a.conditionalWeek);
 assert.equal(b.entries[0]?.nightReferenceUnits,a.entries[0]?.nightReferenceUnits);
});
test('future quotes cannot establish a second observation for an untraded market',()=>{
 const c=context();const q=c.GPOpportunity.findQuantity(null,quote,null,100000,{now:NOW,recent:[{at:new Date(NOW).toISOString(),b:100,s:200},{at:new Date(NOW+DAY).toISOString(),b:100,s:200}]});
 assert.equal(q.blocked,'new-market-needs-second-observation');
});
module.exports={context,record,quote,history,NOW};
test('inactivity alone cannot flag otherwise profitable standing orders for capital redeployment',()=>{
 const c=context(),ledger=history(371).map(r=>({...r,price:r.price*500}));
 const snapshot={wallet:10000,buys:[{id:1,item:101,q:4,price:50000,created:NOW-5*DAY}],sells:[],delivery:{items:[]}};
 const result=c.GPOpportunity.capitalReview({ledger,quotes:[{...quote,buy:50000,sell:100000}],snapshot,now:NOW});
 assert.equal(result.reviews[0].review,false);assert.equal(result.releasedSelective,0);
 assert.match(result.reviews[0].flags.join(' '),/competitiveness.*unknown/);
});
test('conditional history alone never becomes a funded recommendation after inactivity repair',()=>{
 const c=context(),snapshot={wallet:100000,buys:[],sells:[],delivery:{items:[]},buysVerified:true,sellsVerified:true,inventoryVerified:true,at:new Date(NOW).toISOString()};
 const p=c.GPOpportunity.evaluate({ledger:history(371),quotes:[quote],snapshot,now:NOW});
 assert.equal(p.orders.length,0);assert.equal(p.expectedProfit,null);assert.equal(p.spent,0);
});
