import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {validateHistory,historySummary,historyVerdict} from '../../app/exchange/src/history.mjs';
import {loadHistory} from '../../app/exchange/src/api.mjs';
import {ticketMath,workspaceCapital,validateTickets,validateOwned,accountRestriction} from '../../app/exchange/src/workspace.mjs';
import {validateBackup,defaults} from '../../app/exchange/src/storage.mjs';
const real=JSON.parse(await readFile(new URL('./fixtures/osrs-history-steel.json',import.meta.url)));
test('actual v2 seven-day history parses variable timestep and nullable prices',()=>{
 const raw=validateHistory(real,2353),s=historySummary(raw,'Steel bar',raw.endTimestamp*1000);
 assert.ok(s.samples>100);assert.ok(s.lowMedian>0);assert.ok(s.highMedian>0);assert.equal(s.timestep,raw.timestep);assert.ok(s.coverage<=1);assert.equal(s.status,'ready');
 assert.throws(()=>validateHistory(real,999));assert.throws(()=>validateHistory({...real,timestep:null},2353));
 const missing={...real,data:[{...real.data[0],avgHighPrice:null,highPriceVolume:0}]};assert.equal(historySummary(validateHistory(missing,2353),'Steel bar').status,'empty');
});
test('history gaps are not treated as zero-price or guaranteed wins; stale evidence is withheld',()=>{
 const data=real.data.filter((_,n)=>n%5===0);const r={...real,data};const s=historySummary(r,'Steel bar',r.endTimestamp*1000);
 assert.ok(s.coverage<.3);assert.equal(s.samples,data.length);assert.ok(historyVerdict(s,{sell:s.high90*2}).reasons.includes('Patchy historical coverage'));
 const stale=historySummary(real,'Steel bar',(real.endTimestamp+86400)*1000);assert.equal(stale.status,'stale');assert.equal(historyVerdict(stale,{}).label,'History unverified');
});
test('history cache makes one request, honours TTL, coalesces concurrent loads and retains offline cache',async()=>{
 let calls=0;const fetcher=async path=>{calls++;assert.equal(path,'timeseries?lookback=7d&id=2353');return real;};
 const now=real.endTimestamp*1000;const [a,b]=await Promise.all([loadHistory(2353,{},fetcher,now),loadHistory(2353,{},fetcher,now)]);assert.equal(calls,1);assert.deepEqual(a,b);
 const cached=await loadHistory(2353,{2353:a},fetcher,now+1000);assert.equal(cached.cached,true);assert.equal(calls,1);
 const repaired=await loadHistory(2353,{2353:{raw:{broken:true},fetchedAt:now}},fetcher,now);assert.equal(repaired.raw,real);assert.equal(calls,2);
 const offline=await loadHistory(2353,{2353:a},async()=>{throw Error('Offline')},now+7200000);assert.equal(offline.cached,true);assert.equal(offline.error,'Offline');assert.equal(offline.fetchedAt,now);
 await assert.rejects(loadHistory(2353,{},async()=>{throw Error('Offline')}),/Offline/);
});
const ticket={key:'abc',id:2353,name:'Steel bar',qty:10,buy:100,sell:120,status:'planned',createdAt:'2026-11-13T12:00:00Z'};
test('research ticket exact tax and cost never count as journal profit',()=>{
 assert.deepEqual(ticketMath(ticket),{cost:1000,tax:20,proceeds:1180,margin:180,perItem:18,roi:18,breakEven:102});
 for(const patch of [{qty:1.5},{qty:-1},{buy:null},{qty:9000000000000,buy:100}])assert.throws(()=>ticketMath({...ticket,...patch}));
 const wallet=workspaceCapital([ticket,{...ticket,key:'def',status:'closed'}],100000000,3);assert.equal(wallet.reserved,1000);assert.equal(wallet.remaining,99999000);assert.equal(wallet.slotsRemaining,2);assert.equal(wallet.active.length,1);
 assert.equal(workspaceCapital([ticket],500,0).overBudget,true);assert.equal(workspaceCapital([ticket],500,0).overSlots,true);
});
test('F2P sale restrictions are separate from membership; owned stock preserves unknown basis',()=>{
 assert.equal(accountRestriction({name:'Steel bar'},'f2p','unknown'),true);assert.equal(accountRestriction({name:'Steel bar'},'f2p','clear'),false);assert.equal(accountRestriction({name:'Steel bar'},'members','restricted'),false);assert.equal(accountRestriction({name:'Swordfish'},'f2p','unknown'),false);
 assert.deepEqual(validateOwned([{id:2353,name:'Steel bar',qty:100}]),[{id:2353,name:'Steel bar',qty:100}]);assert.throws(()=>validateOwned([{id:1,name:'A',qty:0}]));assert.throws(()=>validateTickets([ticket,{...ticket}]));assert.throws(()=>validateTickets([ticket,{...ticket,key:'another'}]));
});
test('backups round-trip tickets, stock, F2P settings and old journals with no invented balances',()=>{
 const backup={format:'golden-exchange-backup-v2',trades:[],watch:[2353],settings:{...defaults,budget:'100000000',mode:'f2p'},tickets:[ticket],owned:[{id:2353,name:'Steel bar',qty:40}]};
 const result=validateBackup(backup);assert.deepEqual(result.tickets,[ticket]);assert.equal(result.owned[0].qty,40);assert.equal(result.settings.mode,'f2p');assert.equal(result.trades.length,0);
 const legacy=validateBackup({format:'golden-exchange-ledger-v1',trades:[]});assert.deepEqual(legacy.tickets,[]);assert.deepEqual(legacy.owned,[]);assert.equal(legacy.settings.budget,'0');assert.throws(()=>validateBackup({...backup,tickets:[{...ticket,qty:-10}]}));
});
