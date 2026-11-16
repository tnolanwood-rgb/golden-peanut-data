import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {asItems,taxPerItem,TAX_EXEMPT_NAMES,filterMarkets,rankMarkets,plan,realizedLedger,periodProfit,recentPurchases} from '../../app/exchange/src/core.mjs';
import {validate,request,marketSnapshot} from '../../app/exchange/src/api.mjs';
import {validateBackup,defaults,save,read,saveMany} from '../../app/exchange/src/storage.mjs';
const fixtures=Object.fromEntries(await Promise.all(['mapping','latest','5m','1h'].map(async p=>[p,JSON.parse(await readFile(new URL(`./fixtures/osrs-${p}.json`,import.meta.url)))])));
const now=Math.max(...Object.values(fixtures.latest.data).flatMap(p=>[p.lowTime||0,p.highTime||0]));
test('actual v2 responses parse with low = reference buy and high = reference sell',()=>{
 for(const p of Object.keys(fixtures))assert.equal(validate(p,fixtures[p]),fixtures[p]);
 const items=asItems(fixtures.mapping,fixtures.latest,fixtures['5m'],fixtures['1h'],now);
 assert.ok(items.length>2000);const rune=items.find(i=>i.id===2);assert.equal(rune.buy,fixtures.latest.data[2].low);assert.equal(rune.sell,fixtures.latest.data[2].high);
 assert.equal(rune.profit,rune.sell-rune.buy-taxPerItem(rune.sell,rune.name));
 assert.ok(filterMarkets(items).length>0);
});
test('tax exact whole GP boundaries, cap and every verified exemption',()=>{
 for(const [p,t] of [[0,0],[49,0],[50,1],[99,1],[100,2],[249999999,4999999],[250000000,5000000],[9000000000000,5000000]])assert.equal(taxPerItem(p,'Abyssal whip'),t);
 for(const n of TAX_EXEMPT_NAMES)assert.equal(taxPerItem(1000000000,n),0,n);
 for(let dose=1;dose<=4;dose++)assert.equal(taxPerItem(10000,`Energy potion(${dose})`),0);
 assert.equal(taxPerItem(10000,'Super energy(4)'),200);assert.equal(taxPerItem(10000,'Games necklace(6)'),200);
});
const base={id:1,name:'Test',buy:100,sell:110,profit:8,spreadPct:8,limit:10,potentialQty:10,marketPotential:80,score:80,flow:1000,age:1,drift:0.01,members:false};
test('budget-aware ranking and all sort orders',()=>{
 const b={...base,id:2,buy:200,profit:20,spreadPct:10,marketPotential:200,score:200};const expensive={...base,id:3,buy:1000000,profit:100000};
 for(const sort of ['profit','roi','opportunity'])assert.deepEqual(rankMarkets([base,b,expensive],1000,sort).map(i=>i.id),[2,1]);
 assert.deepEqual(rankMarkets([base,b],150).map(i=>i.id),[1]);
});
test('planner enforces budget, known limits, recorded buys, integer quantities, slots',()=>{
 const items=Array.from({length:12},(_,i)=>({...base,id:i+1}));
 for(const slots of [3,8]){const p=plan(items,10000,slots);assert.equal(p.selected.length,slots);assert.ok(p.allocated<=10000);assert.equal(p.allocated+p.remaining,10000);}
 assert.equal(plan([base],599,8).selected[0].qty,5);assert.equal(plan([base],1000,8,{1:9}).selected[0].qty,1);
 assert.equal(plan([{...base,limit:null}],10000).selected.length,0);assert.equal(plan([base],0).selected.length,0);
 assert.equal(plan([base],1000,8,{1:10}).selected.length,0);
 const used=recentPurchases([{id:1,side:'buy',qty:7,date:new Date(100000000-3600000).toISOString()},{id:1,side:'buy',qty:99,date:new Date(100000000-5*3600000).toISOString()}],100000000);assert.equal(used[1],7);
});
test('screening excludes stale, missing, inverted, thin and divergent prices',()=>{
 for(const patch of [{age:121},{limit:null},{profit:0},{flow:0},{drift:NaN},{drift:.31},{spreadPct:40}])assert.equal(filterMarkets([{...base,...patch}]).length,0);
 assert.equal(filterMarkets([{...base,members:true}],{members:false}).length,0);
 assert.equal(filterMarkets([base],{query:'missing'}).length,0);
 const mapping=[{id:1,name:'Example',members:false,limit:100}];const h={timestamp:now-18000,data:{1:{avgLowPrice:100,avgHighPrice:110,lowPriceVolume:1000,highPriceVolume:1000}}};
 assert.equal(asItems(mapping,{data:{1:{low:null,high:110}}},{data:{}},h,now).length,0);
 const parsed=asItems(mapping,{data:{1:{low:100,high:110,lowTime:now,highTime:now}}},{data:{}},h,now);assert.equal(filterMarkets(parsed).length,0);
 assert.equal(asItems(mapping,{data:{1:{low:100,high:110}}},{data:{}},h,now)[0].age,Infinity);
});
test('FIFO supports multiple lots, partial sales, inventory, losses and periods',()=>{
 const t=(side,qty,price,date)=>({id:1,name:'Test',side,qty,price,date});
 const ledger=realizedLedger([t('buy',10,100,'2026-11-01'),t('buy',10,120,'2026-11-10'),t('sell',15,150,'2026-11-13T10:00:00Z')]);
 assert.equal(ledger.profit,10*47+5*27);assert.equal(ledger.holdings[0].qty,5);assert.equal(ledger.holdings[0].cost,600);
 const periods=periodProfit(ledger,new Date('2026-11-13T23:00:00Z'));assert.equal(periods.today,605);assert.equal(periods.week,605);
 const loss=realizedLedger([t('buy',10,100,'2026-11-01'),t('sell',5,90,'2026-11-02')]);assert.equal(loss.profit,-55);
 const orphan=realizedLedger([t('sell',5,500,'2026-11-01'),t('buy',5,100,'2026-11-02')]);assert.equal(orphan.profit,0);assert.equal(orphan.unmatchedUnits,5);assert.equal(orphan.holdingUnits,5);
});
test('backup validation rejects malformed entries and persists full settings',()=>{
 const data={format:'golden-exchange-backup-v1',trades:[{id:1,name:'Test',side:'buy',qty:5,price:100,date:'2026-01-01'}],settings:defaults,watch:[1,2]};assert.deepEqual(validateBackup(data),{trades:data.trades,settings:defaults,watch:[1,2],tickets:[],owned:[]});
 for(const patch of [{qty:1.5},{date:'bad'},{price:-1},{name:{}},{qty:Number.MAX_SAFE_INTEGER},{date:'2099-01-01'}])assert.throws(()=>validateBackup({...data,trades:[{...data.trades[0],...patch}]}));
 const memory=new Map();globalThis.localStorage={getItem:k=>memory.get(k)??null,setItem:(k,v)=>memory.set(k,v)};
 save('watch',[1,2]);assert.deepEqual(read('watch',[]),[1,2]);save('backup',data);assert.deepEqual(read('backup',{}),data);memory.set('golden-hub-v4:state-v2','broken');memory.set('golden-hub-v4:watch','broken');assert.deepEqual(read('watch',[]),[]);
});
test('timeouts/failures retry, 4xx do not retry, malformed responses fail',async()=>{
 let calls=0;await assert.rejects(request('latest',async()=>{calls++;throw Error('Timeout');},async()=>{}),/Timeout/);assert.equal(calls,3);
 calls=0;await assert.rejects(request('latest',async()=>{calls++;return {status:404};},async()=>{}),/404/);assert.equal(calls,1);
 calls=0;const result=await request('latest',async()=>({status:++calls<3?503:200,data:fixtures.latest}),async()=>{});assert.equal(result,fixtures.latest);
 assert.throws(()=>validate('latest',{data:null}));assert.throws(()=>validate('1h',{data:{1:{}},timestamp:null}));
});
test('cache TTLs and atomic snapshot on partial request failure',async()=>{
 const calls=[];const fetcher=async p=>{calls.push(p);return fixtures[p]};const at=now*1000;const snapshot=await marketSnapshot(null,at,fetcher);assert.equal(calls.length,4);
 calls.length=0;await marketSnapshot(snapshot,at+10000,fetcher);assert.equal(calls.length,0);
 await marketSnapshot(snapshot,at+61000,fetcher);assert.deepEqual(calls,['latest']);
 await assert.rejects(marketSnapshot(snapshot,at+100000000,async p=>{if(p==='1h')throw Error('Offline');return fixtures[p]}),/Offline/);
 assert.equal(snapshot.checkedAt,at);assert.equal(snapshot.latest,fixtures.latest);
});

test('diversified plan respects per-item exposure and reserved cash',()=>{
 const items=Array.from({length:8},(_,i)=>({...base,id:i+1,limit:1000,potentialQty:1000}));
 const p=plan(items,10000,8,{}, {maxShare:.4,reserve:.1});
 assert.equal(p.reserve,1000);assert.ok(p.remaining>=1000);assert.ok(p.selected.length>=3);
 assert.ok(p.selected.every(t=>t.cost<=4000));assert.equal(p.allocated+p.remaining,10000);
 assert.equal(plan([base,base],10000,8).selected.length,1);
});
test('personal data migrates from legacy keys and import failure is atomic',()=>{
 const memory=new Map([['golden-hub-v4:watch','[7]'],['golden-hub-v4:budget','"1234"']]);let fail=false;
 globalThis.localStorage={getItem:k=>memory.get(k)??null,setItem:(k,v)=>{if(fail)throw Error('QuotaExceeded');memory.set(k,v)}};
 save('reserve','25');assert.equal(read('budget','0'),'1234');assert.deepEqual(read('watch',[]),[7]);
 fail=true;assert.throws(()=>saveMany({watch:[99],budget:'9999'}),/QuotaExceeded/);assert.deepEqual(read('watch',[]),[7]);assert.equal(read('budget','0'),'1234');
 fail=false;saveMany({watch:[99],budget:'9999'});assert.deepEqual(read('watch',[]),[99]);assert.equal(read('budget','0'),'9999');
});
