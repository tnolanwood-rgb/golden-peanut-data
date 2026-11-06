/* Golden Peanut capacity research v1.
 * Future fill rates are UNKNOWN for unfamiliar items. All numeric results
 * below are CONDITIONAL planning analogues to completed personal trades,
 * not expected fills, probabilities or independent market-wide volume.
 * Public standing-order quantities cannot be used as executed turnover.
 */
(function(root){'use strict';
const DAY=86400000;
const whole=(x,min=0)=>Number.isSafeInteger(x)&&x>=min;
const quantile=(a,p)=>{if(!a.length)return null;const s=[...a].sort((x,y)=>x-y);return s[Math.max(0,Math.min(s.length-1,Math.floor((s.length-1)*p)))];};
const feeNet=(price,quantity)=>{
 if(!whole(price,1)||!whole(quantity,0))return 0;
 let q=quantity,total=0;
 while(q>0){const units=Math.min(250,q),v=units*price;total+=v-Math.ceil(v*.05)-Math.ceil(v*.10);q-=units;}
 return total;
};
function kind(name,type,rarity){
 if(rarity==='Exotic'&&type==='Weapon'&&/\bPearl\b/i.test(name||''))return 'pearl';
 if(rarity==='Exotic'&&type==='Armor')return 'armor';
 if(rarity==='Exotic'&&type==='Weapon')return 'exotic-weapon';
 if(type==='CraftingMaterial')return 'material';
 return 'other';
}
const cls=(id,metadata)=>{const m=metadata?.[id]||{};return kind(m.name,m.type,m.rarity);};
let cached=null;
function index(ledger=[],metadata={},now=Date.now()){
 const last=ledger.at(-1),first=ledger[0],head=first?[first.key,first.purchased,first.q].join('|'):'',tail=last?[last.key,last.purchased,last.q].join('|'):'';
 const day=Math.floor(now/DAY);
 if(cached&&cached.ledger===ledger&&cached.length===ledger.length&&cached.head===head&&cached.tail===tail&&cached.day===day&&cached.metadata===metadata)return cached.value;
 const entries=new Map(),earliest=now-365*DAY;
 for(const r of ledger){
  if(!whole(r?.item,1)||!whole(r?.q,1)||!whole(r?.price,1)||!Number.isFinite(r.purchased)||r.purchased<earliest||r.purchased>now||!['buy','sell'].includes(r.side))continue;
  let e=entries.get(r.item);if(!e){e={id:r.item,buyDays:new Map(),sellDays:new Map(),buyValue:0,buyQty:0,last:0,rows:[]};entries.set(r.item,e);}
  const target=r.side==='buy'?e.buyDays:e.sellDays,d=Math.floor(r.purchased/DAY);
  target.set(d,(target.get(d)||0)+r.q);
  if(r.side==='buy'){e.buyValue+=r.price*r.q;e.buyQty+=r.q;}
  e.last=Math.max(e.last,r.purchased);
  e.rows.push({at:r.purchased,side:r.side,q:r.q});
 }
 for(const e of entries.values()){
  e.buySamples=[...e.buyDays.values()];e.sellSamples=[...e.sellDays.values()];
  e.buyPrice=e.buyQty?e.buyValue/e.buyQty:null;
  e.marketKind=cls(e.id,metadata);
  e.lags=[];
  e.rows.sort((a,b)=>a.at-b.at||(a.side==='buy'?-1:1));
  const queued=[];let start=0;
  for(const x of e.rows){
   if(x.side==='buy'){queued.push({at:x.at,left:x.q});continue;}
   let need=x.q;
   while(need>0&&start<queued.length){
    const b=queued[start],m=Math.min(need,b.left);
    if(m>0&&x.at>=b.at)e.lags.push(Math.max(0,(x.at-b.at)/DAY));
    b.left-=m;need-=m;if(!b.left)start++;
   }
  }
  delete e.rows;delete e.buyDays;delete e.sellDays;
 }
 const value={entries,processed:ledger.length,windowDays:365};
 cached={ledger,length:ledger.length,head,tail,day,metadata,value};
 return value;
}
function sampleStats(records){
 const buys=records.map(e=>quantile(e.buySamples,.5)).filter(Number.isFinite);
 const sells=records.map(e=>quantile(e.sellSamples,.5)).filter(Number.isFinite);
 const buyHigh=records.map(e=>quantile(e.buySamples,.75)).filter(Number.isFinite);
 const sellHigh=records.map(e=>quantile(e.sellSamples,.75)).filter(Number.isFinite);
 const lag=records.flatMap(e=>e.lags.slice(-80));
 return {buyTypical:quantile(buys,.5),sellTypical:quantile(sells,.5),
  buyUpper:quantile(buyHigh,.75),sellUpper:quantile(sellHigh,.75),
  lagTypical:quantile(lag,.5),lagFast:quantile(lag,.25),
  lagRecords:lag.length,markets:records.length,
  buyDays:records.reduce((n,e)=>n+e.buySamples.length,0),
  sellDays:records.reduce((n,e)=>n+e.sellSamples.length,0)};
}
function analogous(data,id,name,metadata,buyPrice,now){
 const exact=data.entries.get(id),k=kind(name,metadata?.[id]?.type,metadata?.[id]?.rarity);
 const valid=e=>e.buySamples.length>=2&&e.sellSamples.length>=2&&e.buyQty>=2&&
  e.buyPrice>0&&e.last>=now-270*DAY;
 if(exact&&valid(exact)){
  return {source:'own-market-active-days',stats:sampleStats([exact]),
   sampleItemIds:[id],category:k,label:'Your completed fills in this item on days when you traded it'};
 }
 const pool=[...data.entries.values()].filter(e=>e.id!==id&&valid(e)&&e.marketKind===k&&k!=='other'&&
  e.buyPrice>=buyPrice*.3&&e.buyPrice<=buyPrice*3);
 const peers=pool.sort((a,b)=>{
  const da=Math.abs(Math.log(a.buyPrice/buyPrice)),db=Math.abs(Math.log(b.buyPrice/buyPrice));
  return da-db||b.last-a.last;
 }).slice(0,75);
 if(peers.length>=3)return {source:'comparable-markets',stats:sampleStats(peers),sampleItemIds:peers.map(e=>e.id),
  category:k,label:'Other personally traded '+(k==='pearl'?'Pearl weapons':k==='armor'?'exotic armours':k==='exotic-weapon'?'exotic weapons':'materials')+' at broadly similar prices'};
 return {source:'insufficient',stats:null,sampleItemIds:peers.map(e=>e.id),
  category:k,label:'Not enough comparable completed buying AND resale records'};
}
function estimate({market,ledger=[],metadata={},quantity=10,now=Date.now(),buyNights=null,sellNights=null}={}){
 if(!whole(quantity,1)||quantity>250)throw Error('Research quantity must be between 1 and 250');
 const id=market?.id,buy=market?.buy,exit=market?.exit;
 if(!whole(id,1)||!whole(buy,1)||!whole(exit,1)||exit<=buy)
  return {status:'invalid',reason:'No valid current bid and resale reference'};
 const margin=feeNet(exit,1)-buy,oneRound=Math.max(0,feeNet(exit,quantity)-buy*quantity);
 const data=index(ledger,metadata,now),name=String(market?.name||metadata?.[id]?.name||'');
 const baseline=analogous(data,id,name,metadata,buy,now);
 let stats=baseline.stats,source=baseline.source,label=baseline.label;
 if(buyNights?.supported&&sellNights?.supported&&Array.isArray(buyNights.samples)&&Array.isArray(sellNights.samples)){
  const buys=buyNights.samples.map(s=>s.filled),sells=sellNights.samples.map(s=>s.filled);
  if(buys.length>=5&&sells.length>=5){
   source='observed-order-nights';label='Your actual continuously observed overnight buy and sell orders, including zero-fill nights';
   stats={buyTypical:quantile(buys,.5),sellTypical:quantile(sells,.5),
    buyUpper:quantile(buys,.75),sellUpper:quantile(sells,.75),
    lagTypical:stats?.lagTypical??null,lagFast:stats?.lagFast??null,
    lagRecords:stats?.lagRecords||0,markets:1,buyDays:buys.length,sellDays:sells.length};
  }
 }
 const result={status:stats?'research':'insufficient',id,quantity,buy,exit,oneRound,margin,
  source,label,category:baseline.category,comparableMarkets:baseline.sampleItemIds.length,
  buyActiveDays:stats?.buyDays||0,sellActiveDays:stats?.sellDays||0,
  medianResaleLagDays:stats?.lagTypical??null,
  quoteBuyQty:market.buyQty||null,quoteSellQty:market.sellQty||null,
  scenarios:[],readiness:source==='observed-order-nights'?'Measured overnight personal fills · still not calibrated':
   source==='own-market-active-days'?'Own market, active days only · zero-fill days unknown':
   source==='comparable-markets'?'Similar items, active days only · target item turnover UNKNOWN':'No usable execution rate'};
 if(!stats){result.reason='No measured target-item fill rate or sufficiently comparable personal equipment trades';return result;}
 const lag=Number.isFinite(stats.lagTypical)?Math.min(7,Math.max(0,stats.lagTypical)):null;
 // Gross units at the completed-trade pace of days when the player participated.
 // Multiplying those paces by days is a sensitivity scenario, NOT a prediction
 // of what this exact item will transact on any given calendar day.
 for(const days of [1,3,7]){
  const buyTypical=Math.min(quantity,Math.floor(Math.max(0,stats.buyTypical)*days));
  const buyHigh=Math.min(quantity,Math.ceil(Math.max(0,stats.buyUpper)*days));
  const effectiveDays=lag===null?days:Math.max(0,days-lag);
  const sellTypical=lag===null?null:Math.min(buyTypical,Math.floor(Math.max(0,stats.sellTypical)*effectiveDays));
  const sellHigh=lag===null?null:Math.min(buyHigh,Math.ceil(Math.max(0,stats.sellUpper)*Math.max(0,days-Math.max(0,stats.lagFast||0))));
  // If no reliable buy->resale lag, independently observed selling pace is
  // offered only as a capacity reference; joint resale cannot be estimated.
  result.scenarios.push({days,acquiredTypical:buyTypical,acquiredHigh:buyHigh,
   resaleTypical:sellTypical,resaleHigh:sellHigh,
   profitTypical:sellTypical===null?null:Math.max(0,feeNet(exit,sellTypical)-buy*sellTypical),
   profitHigh:sellHigh===null?null:Math.max(0,feeNet(exit,sellHigh)-buy*sellHigh),
   conditional:true});
 }
 const throughput=Math.min(stats.buyTypical||0,stats.sellTypical||0);
 result.activeDaysToComplete=throughput>0&&lag!==null?Math.ceil(quantity/throughput+lag):null;
 result.note='0 fills remains possible. Counts are sensitivity references from personally completed trades, not market-wide volume or calibrated fill probabilities. A large original order may have filled more; past small orders do not prove a capacity ceiling. Pricing, queue priority and cancellations change actual outcomes.';
 return result;
}
root.GPCapacity={buildId:'7.16.0-evidence',estimate,index,kind,feeNet};
if(typeof module!=='undefined'&&module.exports)module.exports=root.GPCapacity;
})(typeof globalThis!=='undefined'?globalThis:this);
