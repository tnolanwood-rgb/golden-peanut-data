import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {asItems} from '../../app/exchange/src/core.mjs';
import {researchCandidates} from '../../app/exchange/src/intelligence.mjs';
import {accountRestriction} from '../../app/exchange/src/workspace.mjs';
import {simpleScreenState,simpleSuggestions} from '../../app/exchange/src/simple-plan.mjs';
import {marketSnapshot,aggregateFresh} from '../../app/exchange/src/api.mjs';
const captured=JSON.parse(readFileSync(new URL('./fixtures/osrs-f2p-empty-screen.json',import.meta.url)));
const at=captured.capturedAt;
const items=asItems(captured.mapping,captured.latest,captured['5m'],captured['1h'],at/1000);
const screening={members:false,profile:'balanced',minVolume:50,maxAge:120};
const candidates=researchCandidates(items,screening).filter(i=>!accountRestriction(i,'f2p','unknown'));
const context={items,candidates,trades:[],heldIds:new Set(),budget:100000000,slots:3,maxShare:.4,reserve:.1,mode:'f2p',restriction:'unknown',lastRefresh:at,screening,feedHealth:{hourFresh:true,fiveFresh:true}};
test('actual current F2P capture yields sized ideas without assuming unrestricted account eligibility',()=>{
 const ideas=simpleSuggestions(context,[]);assert.ok(ideas.length>0);assert.ok(ideas.every(i=>!i.members&&!accountRestriction(i,'f2p','unknown')));assert.equal(simpleScreenState(context,[]).kind,'ready');
});
test('a recently fetched volume block expires when its source data becomes stale',async()=>{
 const times=Object.fromEntries(['mapping','latest','5m','1h'].map(p=>[p,at-10000]));
 const old={...captured,times,'5m':{...captured['5m'],timestamp:at/1000-1300},'1h':{...captured['1h'],timestamp:at/1000-11000}};
 const calls=[];const fresh=await marketSnapshot(old,at,async p=>{calls.push(p);return captured[p];});
 assert.deepEqual(calls,['5m','1h']);assert.deepEqual(fresh.refreshed,['5m','1h']);assert.equal(aggregateFresh('1h',fresh['1h'],at),true);assert.equal(aggregateFresh('5m',old['5m'],at),false);
});
test('stale feed, hidden filters, absent slots and account restrictions have distinct recovery actions',()=>{
 assert.equal(simpleSuggestions({...context,feedHealth:{hourFresh:false,fiveFresh:true}},[]).length,0);
 assert.equal(simpleScreenState({...context,feedHealth:{hourFresh:false,fiveFresh:true}},[]).kind,'feed');
 const filtered=simpleScreenState({...context,candidates:[],screening:{...screening,profile:'cautious',minVolume:1000000}},[]);assert.equal(filtered.kind,'filters');assert.equal(filtered.action,'reset-screening');
 assert.equal(simpleScreenState({...context,candidates:[],slots:0},[]).kind,'slots');
 const runes=items.filter(i=>[554,555,556,557].includes(i.id));assert.equal(simpleScreenState({...context,items:runes,candidates:[]},[]).kind,'restriction');
 assert.equal(simpleScreenState({...context,candidates:[],feedHealth:{clockSkew:true}},[]).kind,'clock');
});
