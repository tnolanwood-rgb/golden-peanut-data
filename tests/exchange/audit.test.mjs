import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {simpleCapital,simpleSuggestions,journalChange} from '../../app/exchange/src/simple-plan.mjs';
import {realizedLedger,plan,asItems} from '../../app/exchange/src/core.mjs';
import {validate,validateSnapshot,marketSnapshot,shouldRefresh,retryDelay} from '../../app/exchange/src/api.mjs';
import {read,saveMany,storageIssues,validateBackup,defaults} from '../../app/exchange/src/storage.mjs';
import {historySummary} from '../../app/exchange/src/history.mjs';
const fixture=p=>JSON.parse(readFileSync(new URL(`./fixtures/osrs-${p}.json`,import.meta.url)));
const ticket={key:'trade',id:1,name:'Test',qty:10,buy:100,sell:120,status:'buying',createdAt:'2026-11-01T10:00:00Z'};
const trade=(side,qty,price,date='2026-11-01T10:00:00Z')=>({id:1,name:'Test',side,qty,price,date});
const item={id:1,name:'Test',buy:100,sell:120,profit:18,score:1800,marketPotential:1800,potentialQty:1000,limit:1000,age:1,avgLow:100,avgHigh:120,fiveLow:100,fiveHigh:120,hourFresh:true,fiveFresh:true};
test('reserve is a fixed share of the whole pot across sequential trades and both planners',()=>{
 const context={candidates:[item],trades:[],budget:10000,slots:3,maxShare:1,reserve:.25,heldIds:new Set()};
 assert.equal(simpleSuggestions(context,[])[0].qty,75);
 const existing={...ticket,id:2,qty:60};assert.equal(simpleSuggestions(context,[existing])[0].qty,15);
 assert.equal(simpleSuggestions(context,[{...existing,qty:80}]).length,0);
 const stock=Array.from({length:3},(_,n)=>({...trade('buy',10,100),id:n+1}));const full=simpleCapital([],stock,10000,3);assert.equal(full.slotsRemaining,0);assert.equal(full.slotsUsed,3);assert.equal(simpleCapital([{...ticket,status:'closed'}],[stock[0]],10000,3).slotsRemaining,2);
 const p=plan([{...item,profit:18,spreadPct:18}],4000,2,{}, {maxShare:1,reserve:.25,capitalBase:10000});assert.equal(p.allocated,1500);assert.equal(p.remaining,2500);
 const over=simpleCapital([{...existing,qty:101}],[],10000,0);assert.equal(over.overBudget,true);assert.equal(over.overSlots,true);
});
test('manual fills, corrections and deletion reconcile pot and tracked inventory without double reservation',()=>{
 const buy=[trade('buy',10,100)];let state=journalChange({tickets:[ticket],trades:[],budget:10000},buy);
 assert.equal(state.tickets[0].status,'selling');assert.equal(state.budget,'10000');assert.equal(simpleCapital(state.tickets,state.trades,10000,3).reserved,1000);
 const sold=[...buy,trade('sell',4,120,'2026-11-01T11:00:00Z')];state=journalChange({...state,budget:Number(state.budget)},sold);
 assert.equal(state.budget,'10072');assert.equal(state.tickets[0].qty,6);
 const corrected=[buy[0],{...sold[1],price:130}];state=journalChange({...state,budget:Number(state.budget)},corrected);assert.equal(state.budget,'10112');
 state=journalChange({...state,budget:Number(state.budget)},buy);assert.equal(state.budget,'10000');assert.equal(state.tickets[0].qty,10);
 const allSold=[...buy,trade('sell',10,120,'2026-11-01T11:00:00Z')];state=journalChange({...state,budget:Number(state.budget)},allSold);assert.equal(state.tickets[0].status,'closed');assert.equal(simpleCapital(state.tickets,state.trades,Number(state.budget),3).reserved,0);assert.equal(state.budget,'10180');
});
test('damaged personal state cannot crash readers, release capital silently or overwrite the original',()=>{
 const raw=JSON.stringify({budget:'10000',watch:{},trades:[{side:'buy'}],tickets:[]});const memory=new Map([['golden-hub-v4:state-v2',raw]]);
 globalThis.localStorage={getItem:k=>memory.get(k)??null,setItem:(k,v)=>memory.set(k,v)};
 assert.deepEqual(read('watch',[]),[]);assert.deepEqual(read('trades',[]),[]);assert.ok(storageIssues().includes('trades'));assert.throws(()=>saveMany({budget:'10001'}),/recovery/);assert.equal(memory.get('golden-hub-v4:state-v2'),raw);
 const clean=validateBackup({format:'golden-exchange-backup-v2',trades:[],settings:defaults});saveMany({...clean.settings,trades:clean.trades,watch:clean.watch,tickets:clean.tickets,owned:clean.owned},{recover:true});assert.deepEqual(storageIssues(),[]);
});
test('import whitelists settings and rejects malformed shapes before changing state',()=>{
 const data={format:'golden-exchange-backup-v2',trades:[],settings:{budget:'123',unexpected:'bad',trades:'bad'}};
 const clean=validateBackup(data);assert.equal(clean.settings.budget,'123');assert.equal(Object.hasOwn(clean.settings,'unexpected'),false);assert.equal(Object.hasOwn(clean.settings,'trades'),false);
 for(const settings of [[],null,{budget:null},{budget:''},{minVolume:1.5}])assert.throws(()=>validateBackup({...data,settings}));
});
test('future refresh timestamps expire instead of freezing cached prices; snapshot restoration validates every clock',async()=>{
 const at=fixture('5m').timestamp*1000+600000;const fetcher=async p=>fixture(p);const first=await marketSnapshot(null,at,fetcher);assert.deepEqual(first.refreshed,['mapping','latest','5m','1h']);
 const cached=await marketSnapshot(first,at+1,fetcher);assert.deepEqual(cached.refreshed,[]);
 let calls=0;await marketSnapshot(first,at-1,async p=>{calls++;return fixture(p)});assert.equal(calls,4);
 assert.equal(shouldRefresh(first,at-1),true);assert.equal(shouldRefresh(first,at+1),false);assert.equal(retryDelay({'Retry-After':'Fri, 13 Nov 2026 15:30:30 GMT'},Date.parse('2026-11-13T15:30:00Z')),30000);assert.equal(retryDelay({'retry-after':'999'}),60000);assert.equal(retryDelay({'Retry-After':'invalid'}),0);
 assert.equal(validateSnapshot(first,at),first);assert.throws(()=>validateSnapshot({...first,times:{...first.times,latest:'bad'}},at));assert.throws(()=>validateSnapshot(first,1));
});
test('mapping handles real zero limits but rejects duplicate identities and icons that would break rendering',()=>{
 const mapping=fixture('mapping');assert.equal(validate('mapping',mapping),mapping);assert.ok(mapping.some(i=>i.limit===0));
 assert.throws(()=>validate('mapping',[mapping[0],mapping[0]]));assert.throws(()=>validate('mapping',[{...mapping[0],icon:{}}]));assert.throws(()=>validate('mapping',[null]));
});
test('history charts use chronological validated rows even when cached observations were reordered',()=>{
 const raw=fixture('history-steel'),summary=historySummary({...raw,data:raw.data.slice().reverse()},'Steel bar',raw.endTimestamp*1000);
 assert.ok(summary.rows.every((r,n)=>n===0||r.timestamp>summary.rows[n-1].timestamp));assert.throws(()=>historySummary({...raw,data:[raw.data[0],raw.data[0]]},'Steel bar'));
});
test('FIFO/capital arithmetic remains exact across mixed-price partial exits and repeated losses',()=>{
 let trades=[],expectedCost=0,expectedProfit=0,qty=0,seed=7;const lots=[];
 for(let n=0;n<400;n++){
  seed=(seed*1664525+1013904223)>>>0;const buy=qty===0||seed%3!==0,units=buy?seed%17+1:Math.min(qty,seed%23+1),price=seed%1000+1;
  trades.push(trade(buy?'buy':'sell',units,price,new Date(Date.UTC(2026,0,1,0,n)).toISOString()));
  if(buy){qty+=units;expectedCost+=units*price;lots.push({qty:units,price});}else{let left=units,cost=0;while(left){const take=Math.min(left,lots[0].qty);cost+=take*lots[0].price;lots[0].qty-=take;left-=take;if(!lots[0].qty)lots.shift();}qty-=units;expectedCost-=cost;expectedProfit+=units*(price-Math.floor(price/50))-cost;}
  const ledger=realizedLedger(trades),capital=simpleCapital([],trades,1000000+expectedProfit,3);
  assert.equal(ledger.profit,expectedProfit);assert.equal(ledger.holdingUnits,qty);assert.equal(capital.reserved,expectedCost);assert.equal(capital.remaining+capital.reserved,1000000+expectedProfit);
 }
});
