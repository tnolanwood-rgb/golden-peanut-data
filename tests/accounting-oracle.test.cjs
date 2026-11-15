/* Accounting oracle: independent invoices and conservation properties.
 * Synthetic data only. No private account records.
 */
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const html=fs.readFileSync('app/index.html','utf8');
const found=html.match(/<script id="gp-clean-core">([\s\S]*?)<\/script>/);
if(!found)throw Error('Core script missing');
const c={Date,Intl,Map,Set,console};c.globalThis=c;vm.runInNewContext(found[1],c);
const P=c.PeanutCore,DAY=86400000,at=(s)=>Date.parse(s);
const row=(side,id,item,price,q,purchased)=>({key:'history/'+(side==='buy'?'buys':'sells')+':'+id,side,id,item,price,q,created:purchased,purchased});
test('UK trading day is correct at both 2026 DST changes',()=>{
 assert.equal(P.ukDay(at('2026-03-29T00:59:59Z')),'2026-03-29');
 assert.equal(P.ukDay(at('2026-03-29T23:00:00Z')),'2026-03-30');
 assert.equal(P.ukDay(at('2026-10-25T00:30:00Z')),'2026-10-25');
 assert.equal(P.ukDay(at('2026-10-25T01:30:00Z')),'2026-10-25');
 assert.equal(P.ukDay(at('2026-10-25T23:59:59Z')),'2026-10-25');
 assert.equal(P.shiftDay('2026-10-26',-6),'2026-10-20');
});
test('known cost matching, partial unknown inventory and rounded Trading Post fees are not inflated',()=>{
 const now=at('2026-11-15T18:00:00Z'),t=now-DAY;
 const rows=[
  row('buy',1,100,103,1,t-8*DAY),
  row('buy',2,100,105,1,t-7*DAY),
  row('sell',3,100,201,3,t), // one sale lacks an observed original purchase
  row('sell',4,101,200,1,t) // entirely unknown purchase basis
 ];
 const x=P.summarizeLedger(rows,now);
 const proceeds=201*3-Math.ceil(201*3*.05)-Math.ceil(201*3*.10);
 const expectedP100=Math.floor(proceeds*100*2/3)-(103+105)*100;
 assert.equal(x.p100,expectedP100);
 assert.equal(x.matchedUnits,2);
 assert.equal(x.unmatchedUnits,2);
 assert.equal(x.matchedRecords,1);
 assert.equal(x.days['2026-11-14'].unknown,2);
 assert.equal(x.weekP100,expectedP100);
 assert.equal(x.todayP100,0);
});
test('input order cannot change FIFO profit or match counts at 140,000+ records',()=>{
 const count=140100,rows=[],t=at('2026-11-15T14:00:00Z')-35*DAY;
 for(let i=0;i<count;i++){
  const side=i%2===0?'buy':'sell',item=100+i%97;
  const r=row(side,i+1,item,side==='buy'?100+i%31:170+i%37,1,t+Math.floor(i/200)*60000);
  rows.push(r);
 }
 const now=at('2026-11-15T23:00:00Z');
 const orig=P.summarizeLedger(rows,now);
 const reversed=P.summarizeLedger([...rows].reverse(),now);
 assert.equal(orig.p100,reversed.p100);
 assert.equal(orig.matchedUnits,reversed.matchedUnits);
 assert.equal(orig.unmatchedUnits,reversed.unmatchedUnits);
 assert.equal(orig.totalRecords,count);
 assert.ok(orig.items>90);
});
test('duplicate official IDs cannot overwrite a different transaction identity',()=>{
 const a=row('buy',7,100,100,1,at('2026-11-14T20:00:00Z'));
 const b={...a,price:101};
 assert.throws(()=>P.assertSameTransaction(a,b),/conflict/);
 assert.equal(P.assertSameTransaction(a,{...a,q:2}),true);
 assert.equal(P.assertSameTransaction(a,{...a,q:1}),false);
});
