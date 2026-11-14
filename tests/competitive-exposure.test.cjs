const {test}=require('node:test'),assert=require('node:assert/strict');
const C=require('../app/competitive-exposure.js');
const H=3600000,T=Date.UTC(2026,10,1),account='Fixture.1234';
const r=(at,remaining=50,extra={})=>({account,order:1,item:10,at,remaining,price:100,bestBuy:100,bestSell:200,quoteAt:at,original:null,created:T,...extra});
const state=rows=>C.merge(null,rows,account);
const sum=(rows,ledger=[],extra={})=>C.summarize(state(rows),10,{now:Math.max(T,...rows.map(r=>r.at)),ledger,...extra});
const fill=(q,at,extra={})=>({id:1,item:10,side:'buy',price:100,q,purchased:at,...extra});
test('50 items, 2 fills across three days outbid is not slow competitive capacity',()=>{
 const rows=Array.from({length:145},(_,i)=>r(T+i*H/2,i===144?48:50,{bestBuy:110}));
 const s=sum(rows,[fill(2,T+72*H)]);assert.equal(s.sampledOutbidHours,72);assert.equal(s.sampledCompetitiveHours,0);assert.equal(s.lowerBoundAcquired,2);assert.equal(s.competitiveRatePerSampledHour,null);
});
test('same 2 of 50 with competitive endpoints retains informative zeros separately',()=>{
 const rows=Array.from({length:145},(_,i)=>r(T+i*H/2,i===144?48:50));const s=sum(rows,[fill(2,T+72*H)]);
 assert.equal(s.sampledCompetitiveHours,72);assert.equal(s.verifiedCompetitiveFills,2);assert.equal(s.competitiveZeroIntervals,143);assert.equal(s.confirmedContinuousCompetitiveHours,0);
});
test('four fully filled units prove a lower bound, never a capacity cap',()=>{
 const s=sum([r(T,4),r(T+H/2,0,{absent:true})],[fill(4,T+H/2)]);
 assert.equal(s.lowerBoundAcquired,4);assert.equal(s.maximumMarketCapacity,null);assert.equal(s.competitiveRatePerSampledHour,null);
});
test('inactivity preserves prior observations and does not create zero competitive hours',()=>{
 const old=state([r(T),r(T+H/2,48)]),before=JSON.stringify(old);
 const next=C.observe(old,{at:new Date(T+72*H).toISOString(),buysVerified:true,buys:[{id:1,item:10,q:48,price:100,created:T}]},[],account,{now:T+72*H});
 assert.equal(JSON.stringify(old),before);assert.equal(next.observations.length,3);const s=C.summarize(next,10,{now:T+72*H,ledger:[fill(2,T+H/2)]});assert.equal(s.unobservedHours,71.5);assert.equal(s.lowerBoundAcquired,2);
});
test('repriced orders and large market moves censor intervals rather than invent competitiveness',()=>{
 const s=sum([r(T),r(T+H/2,50,{price:110,bestBuy:110}),r(T+H,50,{price:120,bestBuy:1000})]);
 assert.equal(s.repricings,2);assert.equal(s.unobservedHours,1);assert.equal(s.verifiedCompetitiveFills,0);
});
test('closed app and intermittent monitoring gaps are unobserved, not zero-fill trials',()=>{
 const s=sum([r(T),r(T+3*24*H),r(T+3*24*H+H/2)]);assert.equal(s.unobservedHours,72);assert.equal(s.competitiveZeroIntervals,1);
});
test('overlapping orders do not double competitive exposure or rates',()=>{
 const rows=[r(T),r(T+H/2),r(T,50,{order:2}),r(T+H/2,50,{order:2})];const s=sum(rows);assert.equal(s.sampledCompetitiveHours,0);assert.equal(s.overlappingIntervals,2);
});
test('partial depletion without a matching actual transaction is censored',()=>{
 const s=sum([r(T),r(T+H/2,48)]);assert.equal(s.verifiedCompetitiveFills,0);assert.equal(s.censoredIntervals,1);
});
test('cancellation and replacement cannot be counted as completed acquisition',()=>{
 const s=sum([r(T),r(T+H/2,0,{absent:true}),r(T+H/2,50,{order:2}),r(T+H,50,{order:2})]);assert.equal(s.lowerBoundAcquired,0);assert.equal(s.verifiedCompetitiveFills,0);
});
test('tolerance reports near-leading separately without upgrading outbid to competitive',()=>{
 const p=C.classify(r(T,50,{bestBuy:102}),{toleranceCopper:2});assert.equal(p.position,'outbid');assert.equal(p.nearLeading,true);assert.equal(p.exactLeading,false);assert.equal(p.queuePosition,null);
});
test('unknown resale and maintenance evidence cannot fabricate any forecast or recycling',()=>{
 const s=sum([r(T),r(T+H/2,48)],[fill(2,T+H/2)]);for(const scenario of s.scenarios){assert.equal(scenario.expectedProfit,null);assert.equal(scenario.expectedResold,null);assert.equal(scenario.expectedAcquired,null);}assert.equal(s.expectedProfit,null);
});
test('duplicate refreshes and restored records never inflate evidence',()=>{
 const rows=[r(T),r(T+H/2,48)];const a=state(rows),b=C.merge(a,rows,account);assert.deepEqual(b,a);assert.deepEqual(C.summarize(b,10,{now:T+H,ledger:[fill(2,T+H/2),fill(2,T+H/2)]}),C.summarize(a,10,{now:T+H,ledger:[fill(2,T+H/2)]}));
});
test('account switching cannot inherit another account observations',()=>{
 assert.equal(C.merge(state([r(T)]),[], 'Other.5678').observations.length,0);
});
test('future-known quotes are excluded from retrospective evaluation',()=>{
 const s=sum([r(T,50,{quoteAt:T+H})],[],{now:T});assert.equal(s.observations,0);
});
test('foreground integration persists priced snapshots idempotently in account config',async()=>{
 let value=null;const snapshot={at:new Date(T).toISOString(),buysVerified:true,buys:[{id:1,item:10,q:50,price:100,created:T}]};
 const s={account,snapshot,db:{get:async()=>({value}),writeCompetitive:async(acct,rows)=>{assert.equal(acct,account);value=C.merge(value,rows,acct);}}};
 // update uses wall-clock freshness; use a current snapshot for the production path.
 const now=Date.now();snapshot.at=new Date(now).toISOString();const quotes=[{id:10,buy:110,sell:200,at:snapshot.at}];
 await C.update(s,quotes);await C.update(s,quotes);assert.equal(value.observations.length,1);assert.equal(C.classify(value.observations[0]).position,'outbid');
});
test('account changes during persistence cannot overwrite another account live state',async()=>{
 const now=Date.now(),snapshot={at:new Date(now).toISOString(),buysVerified:true,buys:[{id:1,item:10,q:50,price:100}]};
 const s={account,snapshot,competitiveExposure:null,db:{get:async()=>null,writeCompetitive:async()=>{s.account='Other.5678';}}};
 await C.update(s,[]);assert.equal(s.competitiveExposure,null);
});
test('competitive sampled rate includes zeros with recency weighting and no lot ceiling',()=>{
 const rows=[],ledger=[];let remaining=50;
 for(let d=0;d<6;d++){const at=T+d*24*H;rows.push(r(at,remaining));if(d===5){remaining-=2;ledger.push(fill(2,at+H/2));}rows.push(r(at+H/2,remaining));}
 const s=sum(rows,ledger);assert.equal(s.competitiveDays,6);assert.ok(s.competitiveRatePerSampledHour>0&&s.competitiveRatePerSampledHour<4);assert.equal(s.maximumMarketCapacity,null);
});

test('time since the last open-order snapshot is unobserved without inventing order presence',()=>{
 const s=sum([r(T)],[],{now:T+72*H});assert.equal(s.unobservedHours,72);
 assert.equal(s.latest.position,'unobserved');assert.equal(s.latest.observedPosition,'competitive');
 assert.equal(s.confirmedContinuousCompetitiveHours,0);
});

test('background page validates account, cursor, dates and rows before any persistence',async()=>{
 const now=Date.now(),row={...r(now),account:undefined};let writes=0;
 const s={account,db:{writeCompetitive:async()=>{writes++;}}};
 const page={account,supported:true,batches:[{id:1,version:1,at:now,observations:[row]}],nextCursor:1,hasMore:false};
 for(const bad of [{...page,account:'Other.5678'},{...page,nextCursor:2},{...page,batches:[{...page.batches[0],observations:[{...row,remaining:-1}]}]},
  {...page,batches:[{...page.batches[0],at:now+120000}]}])await assert.rejects(C.importPage(s,bad,0));
 assert.equal(writes,0);assert.equal(await C.importPage(s,page,0),1);assert.equal(writes,1);
});
test('failed background writes never acknowledge a page or publish another account cache',async()=>{
 const now=Date.now(),page={account,supported:true,batches:[{id:2,version:1,at:now,observations:[r(now)]}],nextCursor:2,hasMore:false};
 const cache=new Map(),s={account,competitiveItems:cache,db:{writeCompetitive:async()=>{throw Error('storage full');}}};
 await assert.rejects(C.importPage(s,page,1),/storage full/);assert.equal(s.competitiveItems,cache);
 s.db.writeCompetitive=async(acct,rows,options)=>{assert.equal(acct,account);assert.equal(options.cursor,2);s.account='Other.5678';};
 await C.importPage(s,page,1);assert.equal(s.competitiveItems,cache);
});
