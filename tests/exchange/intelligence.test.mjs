import test from 'node:test';
import assert from 'node:assert/strict';
import {breakEvenSale,marketEvidence,tradingMemory,positionReview,researchCandidates} from '../../app/exchange/src/intelligence.mjs';
import {taxPerItem,realizedLedger} from '../../app/exchange/src/core.mjs';
const item={id:1,name:'Test',buy:100,sell:120,profit:18,score:180,marketPotential:180,potentialQty:10,limit:100,flow:1000,age:1,drift:.01,spreadPct:18,members:false,avgLow:101,avgHigh:119,fiveLow:102,fiveHigh:118,hourFresh:true,fiveFresh:true};
test('break-even search is exact around rounding, exemptions and capped tax',()=>{
 for(const name of ['Test','Lobster','Old school bond','Energy potion(4)'])for(const cost of [1,49,50,98,99,100,1000,249999999,250000000,1000000000]){
  const exit=breakEvenSale(cost,name);assert.ok(exit-taxPerItem(exit,name)>=cost);assert.ok(exit===cost||exit-1-taxPerItem(exit-1,name)<cost);
 }
 assert.equal(breakEvenSale(0,'Test'),null);
});
test('corroboration uses adverse recent sides and reports stress without predicting fills',()=>{
 const e=marketEvidence(item);assert.equal(e.referenceBuy,102);assert.equal(e.referenceSell,118);assert.equal(e.confirmedMargin,14);assert.equal(e.stressedMargin,11);assert.ok(e.score<item.score);
 const thin={...item,avgLow:115,fiveLow:115};assert.ok(marketEvidence(thin).stressedMargin<=0);assert.equal(researchCandidates([thin],{profile:'cautious'}).length,0);
 assert.equal(researchCandidates([{...item,avgLow:125,fiveLow:125}],{}).length,0);assert.equal(researchCandidates([item],{profile:'cautious'}).length,1);assert.equal(researchCandidates([item],{},new Set([1])).length,0);
 assert.equal(researchCandidates([{...item,fiveFresh:false}],{profile:'cautious'}).length,0);
});
const t=(side,qty,price,date)=>({id:1,name:'Test',side,qty,price,date});
test('memory reconciles FIFO, includes losses and does not invent costs for unmatched units',()=>{
 const trades=[t('buy',10,100,'2026-11-01T00:00:00Z'),t('buy',10,120,'2026-11-02T00:00:00Z'),t('sell',15,150,'2026-11-03T00:00:00Z'),t('sell',10,110,'2026-11-04T00:00:00Z')];
 const m=tradingMemory(trades,Date.parse('2026-11-05T12:00:00Z')).markets[0];
 assert.equal(m.profit,realizedLedger(trades).profit);assert.equal(m.profit,545);assert.equal(m.matched,20);assert.equal(m.unmatched,5);assert.equal(m.coverage,.8);assert.equal(m.repeat,true);assert.equal(m.holdingQty,0);assert.ok(m.averageHoldHours>0);assert.equal(m.profit30,545);
});
test('position review preserves cost, holds unsold stock outside realised profit and blocks stale exits',()=>{
 const ledger=realizedLedger([t('buy',10,100,'2026-11-01T00:00:00Z')]);const r=positionReview(ledger.holdings[0],item,Date.parse('2026-11-04T00:00:00Z'));
 assert.equal(ledger.profit,0);assert.equal(r.ageDays,3);assert.equal(r.lowScenario,-20);assert.equal(r.highScenario,180);assert.equal(r.breakEven,102);assert.equal(positionReview(ledger.holdings[0],{...item,age:121}).highScenario,null);
});
