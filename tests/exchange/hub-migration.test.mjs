import test from 'node:test';
import assert from 'node:assert/strict';
import {convertHubBackup,validateBackup} from '../../app/exchange/src/storage.mjs';
import {mergeJournal} from '../../app/exchange/src/backup.mjs';
const row={id:556,name:'Air rune',side:'buy',qty:3,price:100,when:'2026-11-12T12:00:00Z'};
test('Hub conversion retains legitimate identical fills and creates repeatable v3 identities',async()=>{
 const raw={format:'golden-hub-osrs-v1',records:[row,{...row}]};const first=await convertHubBackup(raw),second=await convertHubBackup(raw);
 assert.equal(first.trades.length,2);assert.notEqual(first.trades[0].uid,first.trades[1].uid);assert.deepEqual(first,second);
 assert.equal(mergeJournal(first,second).added,0);assert.equal(raw.records[0].when,row.when);
});
test('Hub conversion preserves actual tax and rejects invalid data without modifying its input',async()=>{
 const data={format:'golden-hub-osrs-v1',records:[row,{...row,side:'sell',price:150,qty:1,when:'2026-11-12T13:00:00Z',taxPaid:0}]};
 const raw=JSON.stringify(data),v3=await convertHubBackup(data);assert.equal(v3.trades[1].taxPaid,0);assert.equal(v3.trades[1].taxBasis,'actual-total');assert.equal(JSON.stringify(data),raw);assert.equal(validateBackup(v3).trades.length,2);
 await assert.rejects(convertHubBackup({...data,records:[{...row,qty:-1}]}));assert.equal(JSON.stringify(data),raw);
});
