import test from 'node:test';
import assert from 'node:assert/strict';
import {simpleCapital,simpleSuggestions,applySimpleFill} from '../../app/exchange/src/simple-plan.mjs';
const item={id:1,name:'Test',buy:100,sell:120,profit:18,score:180,marketPotential:180,potentialQty:10,limit:100,flow:1000,age:1,drift:.01,spreadPct:18,members:false,avgLow:101,avgHigh:119,fiveLow:102,fiveHigh:118,hourFresh:true,fiveFresh:true};
const ticket={id:1,name:'Test',key:'test',qty:10,buy:102,sell:118,status:'buying',createdAt:'2026-11-13T10:00:00Z'};
const context={candidates:[item],trades:[],budget:10000,slots:3,maxShare:.4,heldIds:new Set()};
test('simple instructions use the displayed integer prices for cost, quantity and net margin',()=>{
 const s=simpleSuggestions(context,[])[0];assert.equal(s.buy,102);assert.equal(s.sell,118);assert.equal(s.qty,10);assert.equal(s.math.cost,1020);assert.equal(s.math.margin,140);
 assert.equal(simpleSuggestions({...context,budget:100},[]).length,0);assert.equal(simpleSuggestions({...context,slots:0},[]).length,0);assert.equal(simpleSuggestions({...context,heldIds:new Set([1])},[]).length,0);
 assert.equal(simpleSuggestions({...context,candidates:[{...item,age:31}]},[]).length,0);
});
test('confirmed buys, partial sells and losses reconcile the journal and trading pot exactly',()=>{
 const bought=applySimpleFill({ticket,side:'buy',qty:8,price:100,trades:[],budget:10000,now:1000000});assert.equal(bought.ticket.qty,8);assert.equal(bought.ticket.status,'selling');assert.equal(bought.budget,10000);
 assert.equal(simpleCapital([bought.ticket],bought.trades,bought.budget,3).reserved,800);
 const sold=applySimpleFill({ticket:bought.ticket,side:'sell',qty:3,price:120,trades:bought.trades,budget:10000,now:2000000});assert.equal(sold.gain,54);assert.equal(sold.budget,10054);assert.equal(sold.ticket.qty,5);assert.equal(simpleCapital([sold.ticket],sold.trades,sold.budget,3).remaining,9554);
 const loss=applySimpleFill({ticket:sold.ticket,side:'sell',qty:5,price:90,trades:sold.trades,budget:sold.budget,now:3000000});assert.equal(loss.gain,-55);assert.equal(loss.budget,9999);assert.equal(loss.ticket.status,'closed');assert.equal(simpleCapital([loss.ticket],loss.trades,loss.budget,3).remaining,9999);
});
test('stopping a purchased trade does not pretend unsold inventory became cash',()=>{
 const b=applySimpleFill({ticket,side:'buy',qty:10,price:100,trades:[],budget:10000,now:1000000});assert.equal(simpleCapital([{...b.ticket,status:'closed'}],b.trades,10000,3).reserved,1000);
 assert.throws(()=>applySimpleFill({ticket:b.ticket,side:'buy',qty:10,price:100,trades:b.trades,budget:10000}),/already recorded/);
 assert.throws(()=>applySimpleFill({ticket,side:'sell',qty:1,price:120,trades:[],budget:10000}),/purchase first/);
 assert.throws(()=>applySimpleFill({ticket,side:'buy',qty:11,price:100,trades:[],budget:10000}),/quantity/);
});
test('capital portfolio changes with bankroll and never spends cash just to deploy it',async()=>{
 const {capitalPortfolio}=await import('../../app/exchange/src/simple-plan.mjs');
 const small={...item,id:2,buy:100,sell:120,avgLow:100,avgHigh:120,fiveLow:100,fiveHigh:120,potentialQty:100,limit:100};
 const large={...small,id:3,buy:200000000,sell:210000000,avgLow:200000000,avgHigh:210000000,fiveLow:200000000,fiveHigh:210000000,potentialQty:5,limit:8};
 const base={...context,candidates:[small,large],reserve:.1};const low=capitalPortfolio({...base,budget:100000000},[]),high=capitalPortfolio({...base,budget:100000000000},[]);
 assert.deepEqual(low.selected.map(i=>i.id),[2]);assert.equal(high.selected[0].id,3);assert.ok(high.cost>low.cost);assert.ok(high.remaining>98000000000);assert.ok(high.cost<=90000000000);assert.ok(high.selected.every(i=>i.qty<=i.limit&&i.qty<=i.potentialQty));
 const thin={...large,id:4,potentialQty:0};assert.equal(capitalPortfolio({...base,candidates:[thin],budget:100000000000},[]).selected.length,0);
});
test('portfolio compares combinations rather than filling the first slot greedily',async()=>{
 const {capitalPortfolio}=await import('../../app/exchange/src/simple-plan.mjs');const make=(id,buy,sell)=>({...item,id,buy,sell,avgLow:buy,avgHigh:sell,fiveLow:buy,fiveHigh:sell,potentialQty:1,limit:1,drift:0});
 const p=capitalPortfolio({...context,budget:1000,maxShare:1,reserve:0,slots:2,candidates:[make(10,800,1000),make(11,500,650),make(12,500,650)]},[]);
 assert.deepEqual(p.selected.map(i=>i.id).sort(),[11,12]);assert.equal(p.cost,1000);assert.equal(p.remaining,0);assert.equal(p.conditionalMargin,274);
});
test('larger budgets admit a verified high-value one-unit pilot without scaling thin-market quantities',async()=>{
 const {capitalPortfolio}=await import('../../app/exchange/src/simple-plan.mjs');
 const pilot={...item,id:99,name:'High value',buy:200000000,sell:210000000,avgLow:200000000,avgHigh:210000000,fiveLow:200000000,fiveHigh:210000000,profit:5800000,spreadPct:2.9,flow:10,latestFlow:2,potentialQty:0,limit:8,drift:.01};
 const c={...context,items:[pilot],candidates:[],mode:'members',restriction:'clear',screening:{minVolume:50,profile:'balanced'}};
 assert.equal(capitalPortfolio({...c,budget:100000000},[]).selected.length,0);
 const p=capitalPortfolio({...c,budget:100000000000},[]);assert.equal(p.selected[0].qty,1);assert.equal(p.selected[0].pilot,true);
 for(const patch of [{latestFlow:0},{flow:4},{age:16},{members:true}]){const limited={...c,mode:patch.members?'f2p':'members',items:[{...pilot,...patch}],budget:100000000000};assert.equal(capitalPortfolio(limited,[]).selected.length,0);}
});
test('bounded allocation preserves cash routes and resizes earlier quantities for better combinations',async()=>{
 const {capitalPortfolio}=await import('../../app/exchange/src/simple-plan.mjs');const make=(id,buy,sell,qty=1)=>({...item,id,buy,sell,avgLow:buy,avgHigh:sell,fiveLow:buy,fiveHigh:sell,potentialQty:qty,limit:qty,drift:0});
 const p=capitalPortfolio({...context,budget:1000,maxShare:1,reserve:0,slots:2,candidates:[make(10,100,112,10),make(11,550,650)]},[]);
 assert.equal(p.selected.find(i=>i.id===10).qty,4);assert.equal(p.cost,950);assert.equal(p.conditionalMargin,127);
 const many=Array.from({length:55},(_,n)=>make(n+100,1000000-n*1000,1120000-n*1120));many.push(make(200,500000,600000),make(201,500000,600000));
 const later=capitalPortfolio({...context,budget:1000000,maxShare:1,reserve:0,slots:2,candidates:many},[]);assert.deepEqual(later.selected.map(i=>i.id).sort(),[200,201]);assert.equal(later.cost,1000000);
});
