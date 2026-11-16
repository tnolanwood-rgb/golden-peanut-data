import test from 'node:test';
import assert from 'node:assert/strict';
import {taxPerItem,afterTaxMargin,asItems,filterMarkets,plan,realizedLedger} from '../../app/exchange/src/core.mjs';
test('correct tax rounding, 5m cap, and exemptions',()=>{
 assert.equal(taxPerItem(49,'Abyssal whip'),0);
 assert.equal(taxPerItem(100,'Abyssal whip'),2);
 assert.equal(taxPerItem(500_000_000,'Abyssal whip'),5_000_000);
 assert.equal(taxPerItem(1000,'Lobster'),0);
 assert.equal(afterTaxMargin(1000,1100,'Lobster'),100);
 assert.equal(afterTaxMargin(1000,1100,'Abyssal whip'),78);
});
test('market mapping, volume heuristic, budget and slots',()=>{
 const now=1_800_000_000;
 const mapping=[{id:1,name:'Example A',members:false,limit:5000},{id:2,name:'Example B',members:true,limit:1000}];
 const latest={data:{1:{low:100,high:120,lowTime:now-100,highTime:now-100},2:{low:1000,high:1200,lowTime:now-100,highTime:now-100}}};
 const one={data:{1:{lowPriceVolume:2000,highPriceVolume:1000,avgLowPrice:100,avgHighPrice:120},2:{lowPriceVolume:1000,highPriceVolume:1000,avgLowPrice:1000,avgHighPrice:1200}}};
 const markets=asItems(mapping,latest,{data:{}},one,now);
 assert.equal(markets[0].potentialQty,40);
 assert.equal(markets[0].profit,18);
 assert.equal(markets[1].profit,176);
 const filt=filterMarkets(markets,{members:false,minVolume:50,maxAge:120});
 assert.equal(filt.length,1);
 const portfolio=plan(filt,500,8);
 assert.equal(portfolio.selected.length,1);
 assert.equal(portfolio.selected[0].qty,5);
 assert.equal(portfolio.total,90);
});
test('FIFO ledger matches only provable purchased units',()=>{
 const trades=[{id:1,name:'Rune',side:'buy',qty:10,price:100,date:'2026-01-01'},
  {id:1,name:'Rune',side:'sell',qty:8,price:120,date:'2026-01-02'},
  {id:1,name:'Rune',side:'sell',qty:4,price:120,date:'2026-01-03'}];
 const ledger=realizedLedger(trades);
 assert.equal(ledger.profit,180); // (120-2-100)*10
 assert.equal(ledger.matchedUnits,10);assert.equal(ledger.unmatchedUnits,2);
});
