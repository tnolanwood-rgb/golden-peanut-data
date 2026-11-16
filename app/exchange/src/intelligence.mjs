import {realizedLedger,taxPerItem,validGP,screeningReasons} from './core.mjs';
const DAY=86400000;
// Adapted from Golden Peanut's market memory and position review; these describe
// recorded outcomes or conditional scenarios, never execution probabilities.
export function breakEvenSale(cost,name){
 if(!validGP(cost))return null;
 let low=cost,high=cost+5000000;
 while(low<high){const mid=Math.floor((low+high)/2);if(mid-taxPerItem(mid,name)>=cost)high=mid;else low=mid+1;}
 return low;
}
export function marketEvidence(item){
 const hourly=Number.isFinite(item.avgHigh)&&item.avgHigh>0&&Number.isFinite(item.avgLow)&&item.avgLow>0&&item.hourFresh;
 const short=Number.isFinite(item.fiveHigh)&&item.fiveHigh>0&&Number.isFinite(item.fiveLow)&&item.fiveLow>0&&item.fiveFresh;
 const referenceBuy=hourly?Math.max(item.buy,Math.ceil(item.avgLow),short?Math.ceil(item.fiveLow):0):item.buy;
 const referenceSell=hourly?Math.min(item.sell,Math.floor(item.avgHigh),short?Math.floor(item.fiveHigh):Infinity):item.sell;
 const confirmedMargin=referenceSell-referenceBuy-taxPerItem(referenceSell,item.name);
 const stressedSell=Math.max(1,referenceSell-Math.ceil(referenceSell/50));
 const stressedMargin=stressedSell-referenceBuy-taxPerItem(stressedSell,item.name);
 const signals=[];
 if(!hourly)signals.push('Hourly corroboration unavailable');
 if(!short)signals.push('Fresh five-minute corroboration unavailable');
 if(hourly&&confirmedMargin<=0)signals.push('Spread disappears against recent averages');
 if(stressedMargin<=0)signals.push('A 2% lower exit wipes out the reference margin');
 if(short&&item.fiveHigh<item.avgHigh*.98)signals.push('Recent instant-buy average is falling');
 const ratio=item.profit>0?Math.max(0,Math.min(1,confirmedMargin/item.profit)):0;
 return {referenceBuy,referenceSell,confirmedMargin,stressedMargin,signals,hourly,short,
  score:(item.score||0)*ratio*(short?1:.5)*(stressedMargin>0?1:.5)};
}
export function tradingMemory(trades,now=Date.now()){
 const ledger=realizedLedger(trades),byId=new Map();
 const today=new Date(now);today.setHours(0,0,0,0);const week=new Date(today);week.setDate(week.getDate()-6);const month=new Date(today);month.setDate(month.getDate()-29);
 const entry=(id,name)=>{if(!byId.has(id))byId.set(id,{id,name,adjustedLots:false,profit:0,profit7:0,profit30:0,matched:0,unmatched:0,buyDays:new Set(),saleDays:new Set(),last:0,costSold:0,lagSum:0,holdingQty:0,holdingCost:0,oldest:null});return byId.get(id);};
 for(const t of trades){const at=Date.parse(t.date);if(!Number.isFinite(at)||at>now||!['buy','sell'].includes(t.side))continue;const e=entry(t.id,t.name);e.last=Math.max(e.last,at);(t.side==='buy'?e.buyDays:e.saleDays).add(new Date(at).toDateString());if(t.side==='sell')e.unmatched+=t.qty;}
 for(const m of ledger.matched){if(Date.parse(m.date)>now)continue;const e=entry(m.id,m.name);e.profit+=m.gain;e.matched+=m.qty;e.unmatched-=m.qty;e.costSold+=m.cost;e.adjustedLots ||=m.lots.some(l=>l.adjusted);for(const lot of m.lots)if(!lot.adjusted)e.lagSum+=lot.qty*(Date.parse(m.date)-Date.parse(lot.date));if(Date.parse(m.date)>=+week)e.profit7+=m.gain;if(Date.parse(m.date)>=+month)e.profit30+=m.gain;}
 for(const h of ledger.holdings){const e=entry(h.id,h.name);e.holdingQty=h.qty;e.holdingCost=h.cost;e.oldest=h.oldest;}
 const markets=[...byId.values()].map(e=>({...e,buyDays:e.buyDays.size,saleDays:e.saleDays.size,coverage:e.matched+e.unmatched?e.matched/(e.matched+e.unmatched):null,roi:e.costSold?e.profit/e.costSold*100:null,averageHoldHours:e.matched&&!e.adjustedLots?e.lagSum/e.matched/3600000:null,ageDays:(now-e.last)/DAY,repeat:e.buyDays.size>=2&&e.saleDays.size>=2&&e.matched>0})).sort((a,b)=>b.profit-a.profit||a.id-b.id);
 return {markets,byId:new Map(markets.map(e=>[e.id,e])),ledger,weekStart:+week,monthStart:+month};
}
export function positionReview(holding,item,now=Date.now()){
 const unitCost=Math.ceil(holding.cost/holding.qty),breakEven=breakEvenSale(unitCost,holding.name);
 const fresh=item&&Number.isFinite(item.age)&&item.age<=120;
 const scenario=price=>holding.qty*(price-taxPerItem(price,holding.name))-holding.cost;
 return {...holding,unitCost,breakEven,ageDays:holding.oldest&&!holding.adjusted?Math.max(0,(now-Date.parse(holding.oldest))/DAY):null,
  lowScenario:fresh?scenario(item.buy):null,highScenario:fresh?scenario(item.sell):null,
  caution:!fresh?'No fresh two-sided market observation':scenario(item.sell)<0?'Even the higher observed exit is below recorded cost':'Check real offers before selling'};
}
export function researchReasons(item,opts={}){
 const reasons=screeningReasons(item,opts);if(!validGP(item.buy)||!validGP(item.sell))return reasons;
 const e=marketEvidence(item);
 if(e.confirmedMargin<=0)reasons.push('Spread disappears against recent averages');
 if(opts.profile==='cautious'){
  if(!e.hourly||!e.short)reasons.push('Cautious mode needs fresh hourly and five-minute evidence');
  if(e.stressedMargin<=0)reasons.push('Does not survive the 2% exit-price stress');
 }
 return reasons;
}
export function researchCandidates(items,opts={},heldIds=new Set()){
 return items.map(item=>{const evidence=marketEvidence(item);return {...item,evidence,score:evidence.score};})
 .filter(item=>researchReasons(item,opts).length===0&&!heldIds.has(item.id));
}
