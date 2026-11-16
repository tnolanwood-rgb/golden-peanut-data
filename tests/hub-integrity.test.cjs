const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm'),fs=require('node:fs');
const source=fs.readFileSync('app/dual-hub.js','utf8');
const now=Date.now(),sec=Math.floor(now/1000);
function hub(saved={}){
 const storage=new Map(Object.entries(saved)),nodes=new Map();
 const window={localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},performance:{now:()=>0}};
 const document={readyState:'loading',addEventListener(){},getElementById:id=>nodes.get(id)||null};
 vm.runInNewContext(source.replace('})(window,document);','window.audit={state,loadUser,saveUser,saveLedger,validate,buildIdeas,applyIdeasView,validateOsrsRows,recordFill,inventory,ledgerTotals,tax,importOsrsBackup,purchaseUsage,cacheLoad,getPrices,flushMarketCache,restoreCachedMarkets};})(window,document);'),{window,document,Date,Map,Set,Number,Math,Array,JSON,Error,AbortSignal});
 return {api:window.audit,storage,nodes,window};
}
function snapshot(){return {mapping:[{id:1,name:'Expensive research item',limit:8,members:false}],latest:{data:{1:{low:1000000,high:1200000,lowTime:sec-30,highTime:sec-60}}},five:{timestamp:sec-300,data:{1:{avgLowPrice:1000000,avgHighPrice:1200000,lowPriceVolume:100,highPriceVolume:100}}},hour:{timestamp:sec-3600,data:{1:{avgLowPrice:1000000,avgHighPrice:1200000,lowPriceVolume:100,highPriceVolume:100}}}};}
test('high-value research remains visible with explicitly stale aggregate evidence',()=>{
 const {api}=hub();api.state.snap=snapshot();api.state.snap.hour.timestamp=sec-20000;api.buildIdeas();
 assert.equal(api.state.liquidIdeas.length,0);assert.equal(api.state.valueIdeas.length,1);
 assert.match(api.state.valueIdeas[0].warnings.join(' '),/hour|aggregate/i);
});
test('future-dated quotes cannot become research or recommendations',()=>{
 const {api}=hub();api.state.snap=snapshot();api.state.snap.latest.data[1].lowTime=sec+100000;api.buildIdeas();
 assert.equal(api.state.valueIdeas.length,0);assert.equal(api.state.liquidIdeas.length,0);
});
test('a valid empty public feed is distinct from a malformed response',()=>{
 const {api}=hub();assert.equal(api.validate('mapping',[]),true);assert.equal(api.validate('latest',{data:{}}),true);
 assert.equal(api.validate('latest',{data:[]}),false);assert.equal(api.validate('mapping',[{id:1,name:null}]),false);
});
test('loading a ledger recomputes realised FIFO profit rather than trusting a saved gain',()=>{
 const rows=[{id:1,name:'Test item',side:'buy',qty:2,price:100,when:new Date(now-20000).toISOString()}, {id:1,name:'Test item',side:'sell',qty:1,price:150,gain:999999,when:new Date(now-10000).toISOString()}];
 const {api}=hub({'gh-osrs-v1-ledger':JSON.stringify(rows)});api.loadUser();
 assert.equal(api.state.records[1].gain,47);
});
test('ledger loading never truncates or silently filters the original records',()=>{
 const rows=Array.from({length:1002},(_,i)=>({id:1,name:'Test item',side:'buy',qty:1,price:100,when:new Date(now-2000000+i).toISOString()}));
 const {api,storage}=hub({'gh-osrs-v1-ledger':JSON.stringify(rows)});api.loadUser();
 assert.equal(api.state.records.length,1002);assert.equal(JSON.parse(storage.get('gh-osrs-v1-ledger')).length,1002);
});
test('actual sale tax overrides the clearly labelled current-tax assumption',()=>{
 const {api}=hub();const rows=[{id:1,name:'Test item',side:'buy',qty:2,price:100,when:new Date(now-20000).toISOString()}, {id:1,name:'Test item',side:'sell',qty:2,price:150,taxPaid:0,when:new Date(now-10000).toISOString()}];
 assert.equal(api.validateOsrsRows(rows)[1].gain,100);
});
test('identical legitimate legacy fills are retained, never mistaken for duplicate imports',()=>{
 const {api}=hub();const row={id:1,name:'Test item',side:'buy',qty:1,price:100,when:new Date(now-20000).toISOString()};
 assert.equal(api.validateOsrsRows([row,{...row}]).length,2);
});
test('GE purchase quantities account for manually recorded buys in the current 4-hour window',()=>{
 const {api}=hub();api.state.snap=snapshot();api.state.records=[{id:1,side:'buy',qty:8,price:1000000,when:new Date(now-10000).toISOString()}];api.buildIdeas();
 assert.equal(api.state.liquidIdeas.length,0);
 assert.match(api.state.valueIdeas[0].warnings.join(' '),/limit/i);
});
test('GE tax matches integer oracle at thresholds and cap, and exemptions remain correct',()=>{
 const {api}=hub();for(const price of [1,49,50,51,99,100,249999999,250000000,250000001,9000000000000])assert.equal(api.tax(price,'Test item'),Number(BigInt(price)/50n>5000000n?5000000n:BigInt(price)/50n));
 for(const name of ['Old school bond','Energy potion(4)','Bronze arrow','Spade'])assert.equal(api.tax(10000000,name),0);
});
test('unreadable original ledger is retained byte-for-byte and ordinary setting saves cannot reset it',()=>{
 const raw='{damaged but valuable original';const {api,storage}=hub({'gh-osrs-v1-ledger':raw});
 api.loadUser();assert.match(api.state.ledgerError,/recovery/);api.saveUser();
 assert.equal(api.saveLedger([]),false);assert.equal(storage.get('gh-osrs-v1-ledger'),raw);
});
test('storage quota failure retains the original ledger and failed writes do not change memory',()=>{
 const raw='[]',{api,window,storage}=hub({'gh-osrs-v1-ledger':raw});api.loadUser();
 const normal=window.localStorage.setItem;
 window.localStorage.setItem=(key,value)=>{if(key==='gh-osrs-v1-ledger')throw Error('quota');normal(key,value)};
 assert.equal(api.saveLedger([{id:123}]),false);assert.equal(storage.get('gh-osrs-v1-ledger'),raw);
 assert.equal(JSON.parse(storage.get('gh-osrs-ledger-recovery-v1')).raw,raw);assert.equal(api.state.records.length,0);
});
test('stable-ID backup merge is repeatable and conflicting rows fail without overwriting records',async()=>{
 const {api,window,nodes,storage}=hub();api.loadUser();window.confirm=()=>true;
 nodes.set('gh-backup-status',{textContent:''});
 const row={rid:'unique-event-a',id:1,name:'Item',side:'buy',qty:2,price:200,when:new Date(now-10000).toISOString()};
 const apply=records=>api.importOsrsBackup({target:{value:'file',files:[{size:100,text:async()=>JSON.stringify({format:'golden-hub-osrs-v1',records})}]}});
 await apply([row]);assert.equal(api.state.records.length,1);
 const original=storage.get('gh-osrs-v1-ledger');await apply([row]);assert.equal(api.state.records.length,1);
 await apply([{...row,qty:4}]);assert.match(nodes.get('gh-backup-status').textContent,/Conflicting/);
 assert.equal(storage.get('gh-osrs-v1-ledger'),original);
});
test('purchase limit recovers at a recorded four-hour window boundary',()=>{
 const {api}=hub();api.state.records=[{id:1,side:'buy',qty:8,when:new Date(now-14400000).toISOString()}];
 assert.equal(api.purchaseUsage(now).get(1)||0,0);
 api.state.records.push({id:1,side:'buy',qty:2,when:new Date(now).toISOString()});
 assert.equal(api.purchaseUsage(now).get(1),2);
});
test('discovery scans a long ledger once rather than once per mapped market',()=>{
 const {api}=hub();api.state.snap=snapshot();api.state.snap.mapping.push(...Array.from({length:4000},(_,i)=>({id:i+2,name:'Unquoted item',limit:10})));
 let iterations=0;const rows=Array.from({length:20000},(_,i)=>({id:i%50+1,side:'buy',qty:1,when:new Date(now-86400000+i).toISOString()}));
 api.state.records={*[Symbol.iterator](){iterations++;yield*rows;}};api.buildIdeas();assert.equal(iterations,1);
});
test('aggregate profit refuses unsafe display instead of rounding a large preserved ledger',()=>{
 const {api}=hub();api.state.records=Array.from({length:1002},()=>({side:'sell',gain:9000000000000,when:new Date(now-1000).toISOString()}));
 assert.equal(api.ledgerTotals().lastWeek,null);
});

test('OSRS cached market can appear immediately without network and never promotes old research as verified',()=>{
 const snap=snapshot(),stamp=Date.now();
 const old={
  mapping:{data:snap.mapping,at:stamp-600000},
  latest:{data:snap.latest,at:stamp-600000},
  '5m':{data:snap.five,at:stamp-600000},
  '1h':{data:snap.hour,at:stamp-600000}
 };
 const {api}=hub({'gh-osrs-v1-cache':JSON.stringify(old)});
 assert.equal(api.restoreCachedMarkets(),true);
 assert.equal(api.state.stale,true);
 assert.equal(api.state.liquidIdeas.length,0);
 assert.equal(api.state.valueIdeas.length,1,'research observations are retained, not hidden');
 assert.match(api.state.valueIdeas[0].warnings.join(' '),/awaiting fresh verification/);
 assert.equal(api.state.records.length,0);
});
test('one cache write persists all four market routes, without losing an existing cache on quota errors',async()=>{
 const {api,window,storage}=hub();
 let saves=0;const original=window.localStorage.setItem;
 window.localStorage.setItem=(key,val)=>{if(key==='gh-osrs-v1-cache')saves++;original(key,val)};
 let timer=0;window.setTimeout=()=>++timer;window.clearTimeout=()=>{};
 const values={mapping:[{id:123,name:'Fixture item'}],latest:{data:{123:{low:100,high:200}}},
  '5m':{data:{},timestamp:sec-120},'1h':{data:{},timestamp:sec-120}};
 window.fetch=async url=>new Response(JSON.stringify(values[url.split('/').pop()]));
 await Promise.all(Object.keys(values).map(route=>api.getPrices(route,0,true)));
 assert.equal(saves,0,'avoid four synchronous multi-megabyte serializations during fetch completion');
 api.flushMarketCache();
 assert.equal(saves,1);
 assert.deepEqual(Object.keys(JSON.parse(storage.get('gh-osrs-v1-cache'))).sort(),Object.keys(values).sort());
});
test('realised ledger metrics are cached across item navigation but recompute after a new fill',()=>{
 const {api}=hub();
 api.state.records=[{side:'sell',gain:250,when:new Date(now-10000).toISOString()}];
 const first=api.ledgerTotals(),again=api.ledgerTotals();
 assert.strictEqual(first,again,'repeated Next/Previous must reuse the exact totals object');
 api.state.records=[...api.state.records,{side:'sell',gain:30,when:new Date(now-1000).toISOString()}];
 const changed=api.ledgerTotals();
 assert.notStrictEqual(changed,first);
 assert.equal(changed.today,280);
});

test('explicitly deleted market cache is not silently resurrected on pagehide flush',async()=>{
 const existing={'mapping':{data:[{id:123,name:'Existing item'}],at:Date.now()}};
 const {api,window,storage}=hub({'gh-osrs-v1-cache':JSON.stringify(existing)});
 let timer=0;window.setTimeout=()=>++timer;window.clearTimeout=()=>{};
 window.fetch=async()=>new Response(JSON.stringify([{id:124,name:'New mapping'}]));
 await api.getPrices('mapping',0,true);
 storage.delete('gh-osrs-v1-cache');
 api.flushMarketCache();
 assert.equal(storage.has('gh-osrs-v1-cache'),false,'user deletion must win over a buffered write');
});
