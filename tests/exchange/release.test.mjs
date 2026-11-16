import test from 'node:test';
import assert from 'node:assert/strict';
import {realizedLedger,taxPerItem} from '../../app/exchange/src/core.mjs';
import {journalChange} from '../../app/exchange/src/simple-plan.mjs';
import {validateBackup} from '../../app/exchange/src/storage.mjs';
import {mergeJournal} from '../../app/exchange/src/backup.mjs';
import {researchScenarios,assumptionErrors} from '../../app/exchange/src/research.mjs';
const row=(uid,side,qty,price,extra={})=>({uid,id:556,name:'Air rune',side,qty,price,date:'2026-11-01T12:00:00Z',...extra});
const backup=trades=>({format:'golden-exchange-backup-v3',trades,settings:{budget:'1000'},watch:[],tickets:[],owned:[],audit:[]});
test('actual sale tax overrides present tax rules, including conservative attribution of unmatched units',()=>{
 let l=realizedLedger([row('a','buy',3,100),row('b','sell',5,120,{taxPaid:7})]);assert.equal(l.profit,55);assert.equal(l.matched[0].tax,5);assert.equal(l.unmatchedUnits,2);
 l=realizedLedger([row('a','buy',5,100),row('b','sell',5,120,{taxPaid:0})]);assert.equal(l.profit,100);assert.notEqual(taxPerItem(120,'Air rune'),0);
 assert.throws(()=>validateBackup(backup([row('a','sell',1,100,{taxPaid:101})])),/tax/);
});
test('inventory corrections use FIFO cost, never realise write-offs, and reconcile planning capital',()=>{
 const rows=[row('a','buy',10,100),row('b','adjust-in',2,90,{reason:'Prior inventory'}),row('c','adjust-out',4,1,{reason:'Lost stock'})];const l=realizedLedger(rows);assert.equal(l.profit,0);assert.equal(l.holdings[0].qty,8);assert.equal(l.holdings[0].cost,780);assert.equal(l.adjustmentCost,400);assert.equal(l.adjustmentAddedCost,180);
 const changed=journalChange({tickets:[],trades:[rows[0]],budget:1000},rows);assert.equal(Number(changed.budget),780);
 assert.throws(()=>validateBackup(backup([row('c','adjust-out',1,1,{reason:'Lost stock'})])),/exceeds/);
 assert.throws(()=>validateBackup(backup([row('a','adjust-in',1,1)])),/reason/);
});
test('v3 identity merge is repeatable, preserves equal legitimate fills, and rejects conflicts atomically',()=>{
 const current=backup([row('a','buy',1,100)]),incoming=backup([row('a','buy',1,100),row('b','buy',1,100)]);const merged=mergeJournal(current,incoming);assert.equal(merged.added,1);assert.equal(merged.trades.length,2);assert.equal(mergeJournal(merged,incoming).added,0);
 assert.throws(()=>mergeJournal(current,backup([row('a','buy',1,101)])),/Conflicting/);assert.equal(current.trades[0].price,100);
 assert.throws(()=>validateBackup(backup([row('a','buy',1,1),row('a','buy',1,1)])),/Duplicate/);
 assert.throws(()=>mergeJournal(current,{...incoming,format:'golden-exchange-backup-v2'}),/stable/);
});
test('research sensitivities use adverse integer prices and require fresh corroboration',()=>{
 const i={name:'Air rune',buy:100,sell:120,avgLow:101,avgHigh:119,fiveLow:102,fiveHigh:118,hourFresh:true,fiveFresh:true};const s=researchScenarios(i,10);assert.equal(s.length,3);assert.equal(s[1].buy,102);assert.equal(s[1].sell,118);assert.ok(s[0].margin<s[1].margin);assert.ok(s[2].margin>s[1].margin);assert.equal(s[1].cost,1020);assert.deepEqual(researchScenarios({...i,fiveFresh:false},10),[]);
});
test('assumption error reports measured samples and chronological held-out evidence only after 30 tickets',()=>{
 const make=n=>Array.from({length:n},(_,i)=>row(String(i),'buy',i+1,102,{ticketKey:String(i),date:new Date(Date.UTC(2026,0,i+1)).toISOString(),research:{buy:100,sell:120}}));assert.equal(assumptionErrors(make(29)).heldOutTickets,0);const e=assumptionErrors(make(30));assert.equal(e.tickets,30);assert.equal(e.heldOutTickets,9);assert.equal(e.all.buy.mae,2);assert.equal(e.heldOut.buy.mae,2);assert.equal(e.all.sell.mae,null);
});
