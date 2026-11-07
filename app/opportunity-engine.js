/* THE GOLDEN PEANUT — Opportunity Engine 7.16
 * Single source for new trading decisions. Historical discovery is separate
 * from fresh-quote approval. All quantities are scenario caps, NOT calibrated
 * probabilities, observed global turnover or executable orders.
 * Zero account secrets or order placement; no external service beyond existing
 * read-only ArenaNet API adapter and optional existing cloud quotes.
 */
(function(root){
'use strict';
const DAY=86400000, HOUR=3600000, MAX_HIST=2500000;
const UK_PARTS=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',hourCycle:'h23'});
function ukParts(ms){const parts={};for(const p of UK_PARTS.formatToParts(new Date(ms)))if(p.type!=='literal')parts[p.type]=Number(p.value);return parts;}
function isOvernightTrade(ms){const h=ukParts(ms).hour;return h>=18||h<10;}
function tradingNightKey(ms){const p=ukParts(ms);const d=new Date(Date.UTC(p.year,p.month-1,p.day-(p.hour<10?1:0)));return d.toISOString().slice(0,10);}
/* Only complete evening-to-morning exposure intervals establish zero-fill nights.
 * Market-wide order-book changes are NOT personal order executions. A vanished
 * order or a gap with no verified snapshots is UNKNOWN, never a zero or fill. */
function nightlyExposure(evidence,item,now=Date.now()){
 const intervals=(evidence?.intervals||[]).slice().sort((a,b)=>a.from-b.from).filter(x=>x.item===item&&Number.isFinite(x.from)&&Number.isFinite(x.to)&&x.from< x.to&&x.to<=now&&now-x.to<=90*DAY);
 const byOrder=new Map();
 for(const x of intervals){
  if(!valid(x.id)||!Number.isSafeInteger(x.fromQty)||!Number.isSafeInteger(x.toQty)||x.fromQty<1||x.toQty<1||x.toQty>x.fromQty)continue;
  if(!isOvernightTrade(x.from)||!isOvernightTrade(x.to))continue;
  const night=tradingNightKey(x.from);if(night!==tradingNightKey(x.to))continue;
  const key=night+':'+x.id,old=byOrder.get(key);
  if(!old)byOrder.set(key,{night,id:x.id,first:x.from,last:x.to,firstQty:x.fromQty,lastQty:x.toQty});
  else {if(x.from>old.last||x.from<old.last&&x.to>old.last){old.gapped=true;}if(x.from<old.first){old.first=x.from;old.firstQty=x.fromQty;}if(x.to>old.last){old.last=x.to;old.lastQty=x.toQty;}}
 }
 const nights=new Map();
 for(const x of byOrder.values()){
  const a=ukParts(x.first).hour,b=ukParts(x.last).hour;
  if(x.gapped||a<18||b>=10||x.last-x.first<5*HOUR||x.last-x.first>18*HOUR)continue;
  const n=nights.get(x.night)||{night:x.night,filled:0,orderCount:0,exposedUnits:0};
  n.filled+=Math.max(0,x.firstQty-x.lastQty);n.exposedUnits+=x.firstQty;n.orderCount++;nights.set(x.night,n);
 }
 const samples=[...nights.values()].sort((a,b)=>a.night.localeCompare(b.night));
 const quantities=samples.map(x=>x.filled),zeros=samples.filter(x=>x.filled===0).length;
 const sufficientlyObserved=samples.length>=5;
 return {nights:samples.length,zeroNights:zeros,positiveNights:samples.length-zeros,
  filledTotal:quantities.reduce((a,b)=>a+b,0),mean:samples.length?quantities.reduce((a,b)=>a+b,0)/samples.length:null,
  p25:quantile(quantities,.25),median:median(quantities),supported:sufficientlyObserved,
  lastNight:samples.at(-1)?.night||null,samples,
  limitation:sufficientlyObserved?'Observed personal order fills including zero-fill nights; execution conditions may change':'Fewer than five fully observed evening-to-morning exposure windows; do not claim an overnight fill forecast'};
}

/* Walk-forward validation: predict each held-out night from PRIOR observed nights,
 * including zeros, never fitting or testing on the same night. Never call this
 * a live-execution probability. Samples have verified continuous exposure only. */
function validateOvernightModel(evidence,item,now=Date.now()){
 const observed=nightlyExposure(evidence,item,now),rows=observed.samples||[],tests=[];
 for(let i=5;i<rows.length;i++){
  const past=rows.slice(0,i).map(x=>x.filled);
  const prediction=Math.max(0,Math.floor(quantile(past,.25)||0));
  tests.push({night:rows[i].night,predicted:prediction,actual:rows[i].filled});
 }
 if(tests.length<2)return {ready:false,nights:rows.length,testNights:tests.length,
  reason:'At least seven fully observed nights required for walk-forward validation'};
 const meanError=tests.reduce((n,x)=>n+Math.abs(x.actual-x.predicted),0)/tests.length;
 const bias=tests.reduce((n,x)=>n+x.predicted-x.actual,0)/tests.length;
 const zeroRate=rows.filter(x=>x.filled===0).length/rows.length;
 return {ready:true,nights:rows.length,testNights:tests.length,
  meanAbsError:Math.round(meanError*100)/100,meanBias:Math.round(bias*100)/100,
  zeroNightRate:Math.round(zeroRate*1000)/1000,
  latest:tests.at(-1),method:'walk-forward lower quartile of preceding verified overnight exposures (including zeros)'};
}
const finite=(x)=>Number.isFinite(x), valid=(x)=>Number.isSafeInteger(x)&&x>0;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const median=a=>quantile(a,.5);
function quantile(a,p){if(!a?.length)return null;const s=[...a].sort((x,y)=>x-y);return s[Math.floor((s.length-1)*p)];}
function weekKey(ms){return Math.floor(ms/(7*DAY));}
const mapAdd=(m,k,x)=>m.set(k,(m.get(k)||0)+x);
const sign=(p)=>p>0?1:p<0?-1:0;
const last=(x)=>x.length?x[x.length-1]:null;
const saleNet=(price,quantity)=>{
 if(!valid(price)||!valid(quantity))return null;
 // Use the same GW2 fee rounding as the original calculator, including 250-stacks.
 const fn=root.PeanutMarket?.batchSaleNet; if(typeof fn!=='function')return null;
 let net=0,left=quantity;while(left>0){const n=Math.min(250,left),v=fn(price,n);if(!finite(v))return null;net+=v;left-=n;}return net;
};
let cached=null,prevLedger=null,prevLen=0,prevTail='',prevDay='';
function history(ledger=[],now=Date.now()){
 const stamp=String(Math.floor(now/DAY)),tail=last(ledger),sig=tail?[tail.key,tail.q,tail.purchased].join('|'):'';
 if(cached&&ledger===prevLedger&&ledger.length===prevLen&&sig===prevTail&&stamp===prevDay)return cached;
 const archive=root.GPGrowth?.allHistory(ledger,now),markets=new Map();
 function take(id){let x=markets.get(id);if(!x){x={id, buyWeeks:new Map(),sellWeeks:new Map(),buyDays:new Map(),sellDays:new Map(),buyNights:new Map(),sellNights:new Map(),buyFillHours:[],sellFillHours:[],buyCount:0,sellCount:0,buyUnits:0,sellUnits:0,lastBuy:0,lastSale:0,createdBuyRows:0,createdSellRows:0,history:null};markets.set(id,x);}return x;}
 for(const r of ledger){if(!valid(r?.item)||!valid(r?.q)||!valid(r?.price)||!finite(r.purchased)||r.purchased<=0||r.purchased>now||!['buy','sell'].includes(r.side))continue;
  const x=take(r.item),w=weekKey(r.purchased),day=Math.floor(r.purchased/DAY),buy=r.side==='buy';
  mapAdd(buy?x.buyWeeks:x.sellWeeks,w,r.q);mapAdd(buy?x.buyDays:x.sellDays,day,r.q);
  if(r.purchased>=now-120*DAY&&isOvernightTrade(r.purchased))mapAdd(buy?x.buyNights:x.sellNights,tradingNightKey(r.purchased),r.q);
  if(buy){x.buyCount++;x.buyUnits+=r.q;x.lastBuy=Math.max(x.lastBuy,r.purchased);}else{x.sellCount++;x.sellUnits+=r.q;x.lastSale=Math.max(x.lastSale,r.purchased);}
  if(finite(r.created)&&r.created>0&&r.created<=r.purchased){const wait=(r.purchased-r.created)/HOUR;if(buy)x.createdBuyRows++;else x.createdSellRows++;
   const target=buy?x.buyFillHours:x.sellFillHours;if(target.length<1200&&wait>=0&&wait<24*365)target.push(wait);}
 }
 const all=archive?.markets||[];
 for(const a of all){let x=take(a.id);x.history=a;
  x.buyWeekMedian=median([...x.buyWeeks.values()])||0;x.buyWeekP25=quantile([...x.buyWeeks.values()],.25)||0;
  x.sellWeekMedian=median([...x.sellWeeks.values()])||0;x.sellWeekP25=quantile([...x.sellWeeks.values()],.25)||0;
  x.buyDayMedian=median([...x.buyDays.values()])||0;x.sellDayMedian=median([...x.sellDays.values()])||0;
  x.buyDayP25=quantile([...x.buyDays.values()],.25)||0;x.sellDayP25=quantile([...x.sellDays.values()],.25)||0;
  x.buyActiveDays=x.buyDays.size;x.sellActiveDays=x.sellDays.size;
  x.buyNightP25=quantile([...x.buyNights.values()],.25)||0;
  x.buyNightMedian=median([...x.buyNights.values()])||0;
  x.sellNightP25=quantile([...x.sellNights.values()],.25)||0;
  x.buyActiveNights=x.buyNights.size;x.sellActiveNights=x.sellNights.size;
  x.bothWeeks=[...x.buyWeeks.keys()].filter(w=>x.sellWeeks.has(w)).length;
  x.buyWeeksCount=x.buyWeeks.size;x.sellWeeksCount=x.sellWeeks.size;
  x.buyWaitP50=median(x.buyFillHours);x.sellWaitP50=median(x.sellFillHours);
  x.buyWaitP75=quantile(x.buyFillHours,.75);x.sellWaitP75=quantile(x.sellFillHours,.75);
  x.ageDays=a.lastActivity?Math.max(0,(now-a.lastActivity)/DAY):Infinity;
  x.recentBuy7=0;x.recentSell7=0;x.recentBuy30=0;x.recentSell30=0;
  for(const [d,n]of x.buyDays){if(now-d*DAY<8*DAY)x.recentBuy7+=n;if(now-d*DAY<31*DAY)x.recentBuy30+=n;}
  for(const [d,n]of x.sellDays){if(now-d*DAY<8*DAY)x.recentSell7+=n;if(now-d*DAY<31*DAY)x.recentSell30+=n;}
  const coverage=a.coverage||0,periods=Math.min(x.buyWeeksCount,x.sellWeeksCount);
  x.strength=clamp((coverage*.5)+(.17*Math.min(1,periods/3))+(.16*Math.min(1,x.bothWeeks/2))+
    (.17*Math.min(1,a.matchedAll/20)),0,1);
  x.profitable=coverage>=.65&&a.matchedAll>0&&a.profitP100>0;
  // Every old market is discoverable; no inactivity cutoff here.
  const oldProfit=Math.max(0,a.profitP100/100),repeat=Math.sqrt(1+Math.min(12,periods));
  const historyScore=Math.log1p(oldProfit/10000)*repeat*x.strength;
  const recency=.75+.25*Math.exp(-x.ageDays/45); // older results downweighted, never discarded
  x.discoveryScore=historyScore*recency+(x.lastSale>now-21*DAY?Math.log1p(x.recentSell7)*.08:0);
  // finished-order waits suffer survivor bias; do not expose as P(fill).
  delete x.buyFillHours;delete x.sellFillHours;delete x.buyDays;delete x.sellDays;delete x.buyWeeks;delete x.sellWeeks;delete x.buyNights;delete x.sellNights;
 }
 const ranked=[...markets.values()].sort((a,b)=>(b.discoveryScore||0)-(a.discoveryScore||0)||b.history?.profitP100-a.history?.profitP100||a.id-b.id);
 const result={markets,ranked,archive,total:ledger.length,oldest:archive?.oldest||null,newest:archive?.newest||null,
  positive:ranked.filter(x=>x.profitable).length,older:ranked.filter(x=>x.profitable&&x.ageDays>90).length};
 prevLedger=ledger;prevLen=ledger.length;prevTail=sig;prevDay=stamp;cached=result;return result;
}
/* Complete-catalogue equipment exploration. Do NOT infer a product-family universe
 * from the names already traded. Cached item metadata is extended progressively
 * from the public tradable quote index, with a persistent traversal cursor.
 * All stat families are eligible; Shattered swords and daggers share a family.
 */
function equipmentFamily(name,meta={}){
 if(!['Weapon','Armor','UpgradeComponent','CraftingMaterial','Consumable','Container'].includes(meta.type))return null;
 const d=meta.details||{},attributes=d.infix_upgrade?.attributes||[];
 const stat=d.infix_upgrade?.id?'stats:'+d.infix_upgrade.id:
  attributes.length?attributes.map(x=>x.attribute+':'+x.modifier).sort().join(','):
  Array.isArray(d.stat_choices)?'choices:'+d.stat_choices.slice().sort((a,b)=>a-b).join(','):'unknown-stats';
 return {stat,family:[meta.type,d.type||'any',d.weight_class||'any',meta.rarity||'unknown'].join(':'),category:meta.type};
}
function equipmentVariantSeeds(hist,metadata={},limit=120,offset=0){
 const buckets=new Map(),known=hist?.markets instanceof Map?hist.markets:new Map();
 for(const [idText,meta] of Object.entries(metadata||{})){
  const id=Number(idText),name=String(meta?.name||'');
  if(!valid(id)||!name||known.has(id))continue;
  const g=equipmentFamily(name,meta);if(!g)continue;
  const key=g.category+':'+g.family+':'+g.stat;
  if(!buckets.has(key))buckets.set(key,[]);
  buckets.get(key).push(id);
 }
 for(const ids of buckets.values())ids.sort((a,b)=>a-b);
 const keys=[...buckets.keys()].sort();
 const ordered=[],seen=new Set();
 const catalogueSize=Object.keys(metadata||{}).length;
 let depth=0;while(ordered.length<catalogueSize){
  let added=false;
  for(const key of keys){const id=buckets.get(key)[depth];if(valid(id)&&!seen.has(id)){ordered.push(id);seen.add(id);added=true;}}
  if(!added)break;depth++;
 }
 if(!ordered.length)return [];
 const amount=Math.min(Math.max(0,Math.floor(limit)),ordered.length),start=((Math.floor(offset)||0)*Math.max(1,amount))%ordered.length;
 return Array.from({length:amount},(_,i)=>ordered[(start+i)%ordered.length]);
}
function discoveryIds(hist,metadata={},openOrders=[],radar=[],max=495,craftSeeds=[],rotation=0,affordableEquipmentIds=[]){
 const ids=[],seen=new Set(),reasons=new Map();
 const push=(id,reason)=>{id=Number(id);if(valid(id)&&!seen.has(id)&&ids.length<max){seen.add(id);ids.push(id);reasons.set(id,reason);}};
 const take=(entries,quota,reason)=>{let n=0;for(const x of entries){if(n>=quota||ids.length>=max)break;const id=typeof x==='number'?x:x?.id,prior=ids.length;push(id,reason);if(ids.length>prior)n++;}};
 const profitable=(hist?.ranked||[]).filter(x=>x.profitable);
 const byGold=new Map();for(const o of openOrders||[])if(valid(o?.item))byGold.set(o.item,(byGold.get(o.item)||0)+(o.q||0)*(o.price||0));
 // Reserve disjoint budget shares before filling spare slots. The former
 // 25%+25%+16%+23%+34% prefix could consume everything before public/recipe
 // discovery ran. Quotes/depth select research only, never execution capacity.
 const catalogueIds=Object.keys(metadata).map(Number).filter(valid).sort((a,b)=>a-b);
 const quota=Math.min(catalogueIds.length,Math.max(1,Math.floor(max*.25)));
 const start=(rotation*quota)%Math.max(1,catalogueIds.length);
 take(Array.from({length:quota},(_,i)=>catalogueIds[(start+i)%catalogueIds.length]),quota,'complete-catalogue-rotation');
 take([...byGold].sort((a,b)=>b[1]-a[1]).map(x=>x[0]),Math.floor(max*.20),'existing-position');
 take(profitable,Math.min(425,Math.floor(max*.10)),'lifetime');
 take(radar,Math.floor(max*.15),'full-market-public-discovery');
 take(craftSeeds,Math.floor(max*.10),'recipe-backed-discovery');
 take(affordableEquipmentIds,Math.floor(max*.10),'affordable-exotic-equipment');
 const familyQuota=Math.floor(max*.10);
 take(equipmentVariantSeeds(hist,metadata,familyQuota,rotation),familyQuota,'complete-equipment-family-index');
 const related=root.GPGrowth?.relatedMarkets(hist.archive,metadata,150)||[];
 take(related,150,'related-unverified');
 // Remaining slots go to ALL remembered winners, including older ones, and
 // fresh public discoveries. No per-stat preference or name-only blacklist.
 take(profitable,max,'additional-history');
 take(craftSeeds,max,'additional-recipe');
 take(radar,max,'additional-public');
 return {ids,reasons,rotation};
}
function position(snapshot){const map=new Map();const add=id=>{let x=map.get(id);if(!x){x={buyUnits:0,sellUnits:0,buyGold:0,buyOrders:0,sellOrders:0,deliveryUnits:0,oldBuyAgeHours:0};map.set(id,x);}return x;};
 for(const o of snapshot?.buys||[]){if(!valid(o?.item)||!valid(o?.q))continue;let x=add(o.item);x.buyUnits+=o.q;x.buyGold+=o.q*(o.price||0);x.buyOrders++;
  if(finite(o.created)&&o.created>0)x.oldBuyAgeHours=Math.max(x.oldBuyAgeHours,(Date.now()-o.created)/HOUR);}
 for(const o of snapshot?.sells||[]){if(!valid(o?.item)||!valid(o?.q))continue;let x=add(o.item);x.sellUnits+=o.q;x.sellOrders++;}
 for(const o of snapshot?.delivery?.items||[]){if(valid(o?.id)&&valid(o?.count))add(o.id).deliveryUnits+=o.count;}
 return map;
}
function findQuantity(x,quote,exposure,budget,options={}){
 const h=x?.history,now=options.now||Date.now(),age=x?.ageDays??Infinity;
 const bid=quote.buy+1<quote.sell?quote.buy+1:quote.buy;
 if(!valid(bid)||!valid(quote.sell)||bid>=quote.sell||bid>budget)return {blocked:'invalid-buy-sell-or-budget'};
 const roi=((saleNet(quote.sell,1)||0)-bid)/bid;
 if(roi<.055||roi>20)return {blocked:'quoted-margin-outside-policy'};
 const sampled=(x?.buyWeeksCount||0)>0&&(x?.sellWeeksCount||0)>0;
 // Public order-book size is not evidence of market turnover. A new, untraded
 // item must have at least two independent quotes before earning even 1 test unit.
 if(!sampled){const independent=(options.recent||[]).filter(r=>Date.parse(r.at)>=now-5*DAY&&
   finite(Date.parse(r.at))&&Number.isInteger(r.b)&&Number.isInteger(r.s)&&r.s>r.b)
   .sort((a,b)=>Date.parse(a.at)-Date.parse(b.at));
  if(independent.length<2||Date.parse(last(independent).at)-Date.parse(independent[0].at)<90*60000)
   return {blocked:'new-market-needs-second-observation',tier:'unverified'};
 }
 // Multiple successful small lots on different days are meaningful evidence,
 // even if all executions occurred within one calendar week. Requiring two
 // distinct weeks discarded 3–4-unit trades that were repeatedly completed.
 const repeatedDays=(x?.buyActiveDays||0)>=2&&(x?.sellActiveDays||0)>=2&&
  (x?.buyCount||0)>=3&&(x?.sellCount||0)>=3&&h?.coverage>=.80&&h?.matchedAll>=5;
 const repeat=(((x?.buyWeeksCount||0)>=2&&(x?.sellWeeksCount||0)>=2&&h?.coverage>=.70&&h?.matchedAll>=3)||repeatedDays);
 const strong=repeat&&(x?.buyWeeksCount||0)>=4&&(x?.sellWeeksCount||0)>=4&&x?.bothWeeks>=2;
 const sparse=!!h&&!repeat;
 let tier=strong?'repeated':repeat?'historical':sampled?'limited':'unverified';
 // Rate is historical *when actually active*, not an estimate of world demand.
 const histBuy=x?.buyWeekP25||0,histSell=x?.sellWeekP25||0;
 let activeWeekCap=Math.floor(Math.min(histBuy,histSell));
 if(!activeWeekCap&&sampled)activeWeekCap=Math.floor(Math.min(x.buyWeekMedian||0,x.sellWeekMedian||0));
 // Discount older records and limited observations; still allow rediscovery with 5+ when warranted.
 const recency=age<=14?1:age<=45?.88:age<=120?.72:age<=365?.65:.32;
 const evidence=strong?.85:repeat?.70:sparse?.28:.13;
 let capacity=Math.floor(activeWeekCap*recency*evidence);
 const recently=Math.max(0,Math.min(x?.recentBuy7||0,x?.recentSell7||0));
 if(recently>0)capacity=Math.max(capacity,Math.floor(recently*.65));
 // Past completed quantities are LOWER BOUNDS on what the user could have
 // acquired, not proof of a maximum. Their historical orders may have been
 // placed for only three or four units. The API's completed entries do not
 // reliably contain the original *requested* size (nor cancelled remainder),
 // so NEVER label these as fully-filled orders or infer P(fill).
 // Repeated, quickly completed buys AND resales can justify a small,
 // explicitly exploratory step above the observed active-week quantities.
 const fastRepeat=repeat&&(((x?.buyWeeksCount||0)>=3&&(x?.sellWeeksCount||0)>=3&&
   (x?.bothWeeks||0)>=2)||repeatedDays)&&(x?.createdBuyRows||0)>=3&&
   Number.isFinite(x?.buyWaitP75)&&x.buyWaitP75<=24&&
   Number.isFinite(x?.sellWaitP75)&&x.sellWaitP75<=72&&age<=365;
 // An active-WEEK throughput model is a research ceiling, not an overnight order.
 // Keep the exploratory amount visible in research without ever funding it
 // or calling it a supported 24-hour acquisition quantity.
 const demonstratedCap=capacity;
 const probeMultiplier=age<=45?1.75:age<=120?1.5:1.25;
 const probeCeiling=fastRepeat?Math.floor(activeWeekCap*probeMultiplier*recency):0;
 const weeklyResearchCeiling=Math.max(capacity,probeCeiling);
 // Completed records do NOT reveal the unfilled remainder of historic orders.
 // Small fills could have been deliberately small orders (right censoring).
 const waiting=exposure?.buyUnits||0,unlisted=(exposure?.sellUnits||0)+(exposure?.deliveryUnits||0);
 const afterExposure=Math.max(0,weeklyResearchCeiling-waiting-unlisted);
 const maybeQueue=waiting>=Math.max(2,weeklyResearchCeiling*.7)?'Current buys already occupy the historical active-week capacity.':'Nothing standing at this price.';
 if(afterExposure<1)return {blocked:'existing-capacity',tier,capacity:weeklyResearchCeiling,waiting,unlisted,reason:maybeQueue};
 // Do not infer 24h buying capacity from a weekly total or from the public
 // BUY book (that book is outstanding demand, not executed turnover).
 // Require distinct active buying and selling days for an observed-day pace;
 // compare the *lower quartile* of completed buys and resales.
 const activeBuyDay=Math.max(0,Number(x?.buyDayP25)||0);
 const activeSellDay=Math.max(0,Number(x?.sellDayP25)||0);
 const independentDays=(x?.buyActiveDays||0)>=2&&(x?.sellActiveDays||0)>=2;
 const observed24Reference=independentDays?Math.floor(Math.min(activeBuyDay,activeSellDay)):0;
 const nightlyBuyReference=(x?.buyActiveNights||0)>=2?Number(x.buyNightP25)||0:0;
 const overnightReference=Math.floor(Math.min(nightlyBuyReference,activeSellDay));
 const waitBuy=finite(x?.buyWaitP75)?x.buyWaitP75:null;
 const waitSell=finite(x?.sellWaitP75)?x.sellWaitP75:null;
 // A finished order's wait time is survivor-biased. We use it only as a
 // downward adjustment, never to imply a P(fill) or a guaranteed night.
 const overnightWaitScale=waitBuy===null?.65:clamp(24/Math.max(24,waitBuy),.2,1);
 const ageScale=age<=30?1:age<=90?.78:age<=180?.55:age<=365?.40:.25;
 // Overnight purchase evidence is required. A trade at 2pm does not establish
 // how many buy orders will fill overnight. Sale capacity can occur later.
 const recentBothSides=(x?.recentBuy30||0)>0&&(x?.recentSell30||0)>0;
 const nightAgeFactor=recentBothSides?1:age<=60?.5:0;
 const observedDayTrial=overnightReference>0?
   Math.max(0,Math.floor(overnightReference*overnightWaitScale*ageScale*nightAgeFactor)):0;
 // If repeated buying/selling history exists but no comparable daily sample,
 // allow ONE explicitly cautious validation unit, not a 50/90-unit order.
 const conservativeOrderCap=Math.min(afterExposure,Math.max(1,observedDayTrial));
 const exploratoryExtra=Math.max(0,afterExposure-conservativeOrderCap);
 const projectedWeeklyUnits=Math.min(activeWeekCap,conservativeOrderCap);
 // Asks are quotes, not guaranteed exits. Bound the cautious quote exit by recent sampled low, when present.
 let exit=quote.sell;
 const sampledAsks=(options.recent||[]).filter(q=>Date.parse(q.at)>=now-7*DAY&&Number.isInteger(q.s)&&q.s>0).map(q=>q.s);
 if(sampledAsks.length>=3){const low=quantile(sampledAsks,.25);if(finite(low)&&low>0)exit=Math.min(exit,low);}
 // Default 3% concession on current ask; helps avoid turning a transient ask into implied guaranteed profit.
 exit=Math.floor(exit*.97);
 if(exit<=bid)return {blocked:'cautious-exit-below-bid'};
 const unitNet=saleNet(exit,1),netUnit=unitNet===null?0:unitNet-bid;
 if(netUnit<=0||netUnit/bid<.045)return {blocked:'after-fee-margin-too-small'};
 const quality=clamp((x?.strength||0),0,1);
 // Use visible depth only as a broad warning, NOT a proxy for completed trading volume.
 const bidDepth=Number(quote.buyQty)||0,askDepth=Number(quote.sellQty)||0;
 if(bidDepth<4||askDepth<2)return {blocked:'thin-book',tier};
 // IMPORTANT: displayed order-book quantity is a standing stock, not daily volume.
 // The old 12% *visible-depth* hard cap reduced even highly traded equipment to
 // one unit. Depth is a liquidity flag only; personal completed executions set
 // the size ceiling. Unproven markets remain at one research unit.
 const depthCap=repeat?Math.max(1,afterExposure):1;
 const budgetCap=Math.floor(budget/bid);
 // Every funded and history-backed Best/Bulk recommendation is constrained
 // by the completed-trade 24h trial evidence, NOT the historical weekly or
 // 1.75x experimental capacity ceiling.
 let hardCap=Math.min(conservativeOrderCap,depthCap,budgetCap,2500);
 if(!repeat)hardCap=Math.min(hardCap,1);
 if(options.volatile)hardCap=Math.min(hardCap,Math.max(1,Math.floor(hardCap*.25)));
 if(hardCap<1)return {blocked:'capacity-or-wallet',tier};
 const baseCap=Math.max(1,hardCap);
 const recencyLabel=age>90?'older evidence · reconfirm':age>30?'historical evidence':'recent + historical';
 const slow=waitBuy===null||waitSell===null?0.65:clamp(48/(Math.max(24,waitBuy+waitSell)),.25,1);
 const sellWaitScale=waitSell===null?.55:clamp(48/Math.max(24,waitSell),.2,1);
 // This is a conservative trial bound derived from personal completed trades,
 // NOT an estimated number that will actually fill overnight.
 const overnightScenario=observedDayTrial>0?Math.min(baseCap,observedDayTrial):0;
 const confidence=strong&&age<=30&&waitBuy!==null&&waitSell!==null?'Stronger history':repeat?'Historical evidence': 'Limited evidence';
 return {id:quote.id,buy:bid,exit,ask:quote.sell,scenarioExit:exit,ageDays:age,staleness:recencyLabel,quality,tier,
  cap:baseCap,netUnit,roi:netUnit/bid,waitBuy,waitSell,slow,confidence,activeWeekCap,
  repeatEvidence:repeat,repeatedDays,
  openBuys:waiting,openSells:exposure?.sellUnits||0,deliveryUnits:exposure?.deliveryUnits||0,
  buyWeeks:x?.buyWeeksCount||0,sellWeeks:x?.sellWeeksCount||0,buyDayMedian:x?.buyDayMedian||0,sellDayMedian:x?.sellDayMedian||0,
  buyActiveDays:x?.buyActiveDays||0,sellActiveDays:x?.sellActiveDays||0,buyWeek25:histBuy,sellWeek25:histSell,
  capacityBeforePositions:weeklyResearchCeiling,capacityAfterPositions:afterExposure,depthLimit:depthCap,budgetLimit:budgetCap,
  researchCap:Math.min(afterExposure,budgetCap,2500),conservativeOrderCap:baseCap,
  observed24Reference,overnightReference,observedNightBuys:x?.buyActiveNights||0,independentActiveDays:independentDays,
  historicalWeeklyResearchCap:weeklyResearchCeiling,
  overnightEvidence:observedDayTrial>0?'Completed overnight buy observations and completed resale-day pace; not P(fill)':'No sufficiently recent comparable overnight buys AND subsequent resale pace',
  demonstratedCap,exploratoryExtra,fastRepeat,projectedWeeklyUnits,
  capacityLabel:exploratoryExtra>0?'Unverified expansion beyond personal 24h trade pace':'Conservative personal completed-trade 24h trial',
  matched:h?.matchedAll||0,unknown:h?.unknownAll||0,
  lifetimeP100:h?.profitP100||0,recentProfitP100:h?.profit7P100||0,earnableQty24:overnightScenario,
  earnableQty48:Math.min(baseCap,Math.floor(overnightScenario*1.8)),earnableQty7:Math.min(baseCap,activeWeekCap),
  overnightScenario,activeBuyDay,activeSellDay,sellWaitScale,
  estimated:false // never promote to calibrated probability without evaluated forecast outcomes
 };
}
/* CONDITIONAL EARNINGS PACE, NEVER A CALIBRATED EXPECTATION.
 * The public GW2 API does not expose actual market-wide turnover; this is a
 * historical *active-week* throughput scenario, not P(fill) or earned gold.
 * Evaluating a portfolio from its selected lot sizes prevents a 1-unit test
 * from being extrapolated at the throughput of an enormous unrelated book.
 * Multi-horizon values assume orders can be replenished and the same spread
 * continues: those assumptions become unreliable over months or years.
 */
function earningsPace(plan){
 if(!plan?.ok)return null;
 const rows=[], missing=[];
 let weeklyCopper=0,oneRoundCopper=0,projectableConditional=0;
 for(const o of plan.orders||[]){
  oneRoundCopper+=o.scenarioProfit||0;
  const units=Math.max(0,Math.floor(o.quantity||0));
  const historicalBuy=Number(o.buyWeek25||0),historicalSell=Number(o.sellWeek25||0);
  const knownWeeks=Math.min(Number(o.buyWeeks||0),Number(o.sellWeeks||0));
  const repeatable=knownWeeks>=3&&Number(o.matched||0)>=3&&Number(o.unknown||0)>=0&&
   historicalBuy>0&&historicalSell>0&&o.tier!=='unverified'&&units>0;
  if(!repeatable){missing.push({id:o.id,name:o.itemName,reason:'Insufficient repeatable, matched-cost buy/sell history'});continue;}
  const buyHours=Number.isFinite(o.waitBuy)?Math.max(0,o.waitBuy):null;
  const sellHours=Number.isFinite(o.waitSell)?Math.max(0,o.waitSell):null;
  // Conservative missing-wait fallback: at most one complete buy/sell turn per week.
  const cycleHours=buyHours!==null&&sellHours!==null?Math.max(24,buyHours+sellHours):168;
  // This is an *active-week* comparison, not calendar-day rate or worldwide trading volume.
  const historicalWeek=Math.min(historicalBuy,historicalSell);
  const affordableRotations=units*Math.max(1,168/cycleHours);
  const perWeek=Math.min(historicalWeek,affordableRotations);
  const weeklyPotential=Math.max(0,Math.floor(perWeek*(o.netUnit||0)));
  if(!Number.isSafeInteger(weeklyPotential)){
   missing.push({id:o.id,name:o.itemName,reason:'Arithmetic bounds unavailable'});continue;
  }
  projectableConditional+=o.scenarioProfit||0;
  weeklyCopper+=weeklyPotential;
  rows.push({id:o.id,name:o.itemName,orderUnits:units,historicalWeeklyUnits:historicalWeek,
   cycleHours:Math.round(cycleHours),modeledWeeklyUnits:Number(perWeek.toFixed(2)),
   weeklyCopper:weeklyPotential,dayCopper:Math.floor(weeklyPotential/7),
   status:'conditional active-week throughput; not calibrated'});
 }
 const within=Number.isSafeInteger(weeklyCopper)&&weeklyCopper>=0;
 if(!within)return {available:false,reason:'Projected amount exceeded safe calculation bounds'};
 const mult=(days)=>Math.floor(weeklyCopper*(days/7));
 return {available:rows.length>0,oneRoundCopper,projectableConditional,
  dayCopper:mult(1),weekCopper:weeklyCopper,monthCopper:null,yearCopper:null,
  daysInMonth:30,daysInYear:365,marketsModelled:rows.length,marketsExcluded:missing.length,
  rows,missing,
  status:'uncalibrated conditional run-rate scenario, NOT a profit expectation',
  assumptions:'This covers only the selected orders, not the existing portfolio. No month/year extrapolation until market churn, cash recycling and actual fill performance are measured.',
  limitation:'No verified market-wide completed sales, queue position, cancellation history, or calibrated 24-hour fill probability. Year figures are annualisations, not forecasts.'};
}
function evaluateResearch({ledger=[],quotes=[],metadata={},snapshot=null,now=Date.now(),budget=null,avoid=[],cloudSignals=null,style='balanced'}={}){
 const hist=history(ledger,now),wallet=budget===null?snapshot?.wallet:budget;
 if(!Number.isSafeInteger(wallet)||wallet<0)return {ok:false,reason:'A verified wallet is required',history:hist};
 const exposures=position(snapshot),avoidSet=new Set(avoid),quoteCount=quotes.length;
 const inspected=[],blocked=[],missing=[],candidates=[];
 const quoteIds=new Set();
 for(const record of quotes){const q=record.latest||record;let id=q?.id||record?.id;
  if(!valid(id)||quoteIds.has(id)||avoidSet.has(id))continue;quoteIds.add(id);
  const at=Date.parse(q.at);if(q.source&&q.source!=='ArenaNet /v2/commerce/prices')continue;if(!finite(at)||at>now||now-at>25*60000){missing.push(id);continue;}
  if(!metadata[id]?.name){blocked.push({id,reason:'item-metadata-unverified'});continue;}
  const h=hist.markets.get(id),signals=cloudSignals instanceof Map?cloudSignals.get(id):null;
  // Research market capacity independently from how much is currently in the wallet.
  // Funding constraints are applied later by the portfolio allocator; otherwise
  // a 4g wallet would erase historically viable 50-unit opportunities.
  const capacityResearchBudget=Math.max(wallet,15000000); // up to 1500g hypothetical only
  const item=findQuantity(h,q,exposures.get(id),capacityResearchBudget,{now,recent:record.recent||[],volatile:!!(signals?.risky&&signals?.fresh)});
  inspected.push(id);if(item?.id){item.itemName=metadata[id]?.name||'Item #'+id;item.asOf=q.at;
   item.source=h?.history?'saved-trades':'new-market';item.cloudSamples=signals?.samples||0;
   // One-off public-only ideas cannot displace repeatable proven trades.
   candidates.push(item);
  }else if(item?.blocked){blocked.push({id,reason:item.blocked,waiting:exposures.get(id)?.buyUnits||0});}
 }
 // A capped, risk-aware portfolio: choose among funded quantities and revise cost after each addition.
 const reserve=style==='full'?.035:.09,maxSpend=Math.floor(wallet*(1-reserve)),maxMarkets=style==='full'?18:14;
 const variants=[1,2,3,5,8,10,12,15,20,25,30,40,50,75,100,150,200,250,400,500,750,1000,1500,2000,2500];
 const families=new Map(),orders=[],used=new Set();let spent=0;
 const family=(name)=>{
  const stats=name?.match(/^((?:Celestial|Assassin's|Berserker's|Sinister|Dire|Soldier's|Shaman's|Viper's|Marauder's|Knight's|Cleric's)\s+(?:Pearl|Draconic|Exalted|Emblazoned|Intricate|Warbeast))\b/i);
  return stats?stats[1]:name?.startsWith('Superior Rune')?'Runes':name?.startsWith('Superior Sigil')?'Sigils':name?.startsWith('Relic of')?'Relics':null;
 };
 function adjusted(c,n){
  const net=saleNet(c.exit,n);if(net===null)return null;
  const conditional=net-c.buy*n;if(conditional<=0)return null;
  // Not a calibrated E[profit]. Capacity-adjusted scenario with confidence penalty.
  const confidence=c.tier==='repeated'?.78:c.tier==='historical'?.62:c.tier==='limited'?.33:.10;
  const agePenalty=c.ageDays>90?.65:c.ageDays>30?.83:1;
  const sizeFactor=.8+.2*Math.sqrt(n/Math.max(1,c.cap));
  const uncertainty=confidence*agePenalty*sizeFactor;
  // Opportunity cost is measured against a comparable ACTIVE trading week,
  // not the theoretical profit from selling an arbitrary whole order once.
  // Historical execution sets the ceiling; a large stagnant lot cannot win
  // simply by multiplying its attractive quoted margin by more units.
  const cycleHours=Number.isFinite(c.waitBuy)&&Number.isFinite(c.waitSell)?
   Math.max(24,c.waitBuy+c.waitSell):168;
  const historicalUnits=Math.max(0,Math.min(c.buyWeek25||0,c.sellWeek25||0));
  // Each recommendation is ONE order lot. Crediting 7 rotations to an
  // unplaced one-unit order fabricated weekly profit and caused the optimizer
  // to prefer 1 unit even when a 5–10 unit order was a better test.
  // Optionally permit a modest exploratory extension with a separate flag.
  const weeklyUnits=historicalUnits>0?Math.min(historicalUnits,n):
   (c.tier==='unverified'?Math.min(n,1)*.15:Math.min(n,1)*.5);
  const weeklyScenario=Math.max(0,Math.floor(weeklyUnits*c.netUnit));
  const projectedNightQty=Math.min(n,Math.max(0,Number(c.earnableQty24)||0));
  const resaleTimeScale=Number.isFinite(c.waitSell)?Math.min(1,24/Math.max(24,c.waitSell)):0.40;
  const nightlyScenario=Math.max(0,Math.floor(projectedNightQty*c.netUnit*resaleTimeScale));
  // Ranking uses an uncertainty haircut; the displayed amount remains an
  // observed-pace *conditional* scenario, never a calibrated expected value.
  const rankingValue=Math.floor(nightlyScenario*uncertainty*c.slow);
  return {conditional,rankingValue,uncertainty,weeklyScenario,weeklyUnits,
    nightUnits:projectedNightQty,nightlyScenario};
 }
 let iterations=0;
 while(orders.length<maxMarkets&&iterations++<maxMarkets+2){let best=null;
  for(const c of candidates){if(used.has(c.id))continue;const marketBudget=Math.max(0,maxSpend-spent),familyName=family(c.itemName),familyUsed=families.get(familyName)||0;
   const familyLimit=familyName?Math.floor(wallet*.50):Infinity;
   // Risk-managed but permit meaningful multi-unit orders where repeat
   // executions justify them. Older hard-coded 24-32% caps hid the scale.
   const available=Math.min(marketBudget,familyLimit-familyUsed,Math.floor(wallet*(c.tier==='repeated'?.58:c.tier==='historical'?.42:c.tier==='limited'?.14:.025)));
   if(available<c.buy)continue;
   const maxQty=Math.min(c.cap,Math.floor(available/c.buy));if(maxQty<1)continue;
   const sizes=[...new Set([...variants.filter(n=>n<=maxQty),maxQty])];
   for(const n of sizes){const ev=adjusted(c,n);if(!ev)continue;
    const cost=n*c.buy,touches=Math.ceil(n/250);
    const actionDiscount=Math.pow(1+.07*(touches-1),-1);
    // Profit per order and repeatable capacity outrank percentage ROI.
    // Capital cost is a modest penalty, not a power-law penalty that repeatedly
    // pushes large worthwhile lots behind isolated one-unit flips.
    const capitalDrag=Math.pow(1+cost/400000,.28);
    const score=ev.rankingValue*actionDiscount/capitalDrag;
    if(!best||score>best.score){best={...c,quantity:n,cost,scenarioProfit:ev.conditional,
      rankValue:ev.rankingValue,score,weeklyScenario:ev.weeklyScenario,weeklyUnits:ev.weeklyUnits,
      nightProfit:ev.nightlyScenario,nightUnits:ev.nightUnits,uncertainty:ev.uncertainty,tpOrders:touches,
      sizeConstraint:n<c.cap?'Cash allocation / family concentration':'Historical throughput, active orders or quote depth',
      equipmentLot:n>=5&&/Pearl|Draconic|Exalted|Emblazoned|Warbeast/i.test(c.itemName)};}
   }
  }
  if(!best)break;
  // Do not fill the action list with pennies just to use every coin.
  if(best.rankValue<1000&&orders.length>=3)break;
  orders.push(best);used.add(best.id);spent+=best.cost;
  const group=family(best.itemName);if(group)families.set(group,(families.get(group)||0)+best.cost);
 }
 // Retain evaluated market capacities beyond the funded plan. This is the
 // source for the 5/10/50-unit research view, NOT a claim that cash is free.
 const marketChoices=candidates.map(c=>{
   const maximum=Math.min(c.cap,Math.floor(15000000/c.buy),2500);
   if(maximum<1)return null;
   const sizes=[...new Set([...variants.filter(n=>n<=maximum),maximum])];
   let best=null;
   for(const n of sizes){const ev=adjusted(c,n);if(!ev)continue;
     const score=ev.rankingValue/Math.pow(1+n*c.buy/400000,.28);
     if(!best||score>best.score)best={...c,quantity:n,cost:n*c.buy,
       scenarioProfit:ev.conditional,weeklyScenario:ev.weeklyScenario,
       rankValue:ev.rankingValue,score,modelledWeeklyUnits:ev.weeklyUnits,
       nightProfit:ev.nightlyScenario,nightUnits:ev.nightUnits,
       maxSupportedQty:c.cap,maxResearchQty:c.researchCap,availableWallet:wallet};
   }
   return best;
 }).filter(Boolean).sort((a,b)=>b.rankValue-a.rankValue||b.scenarioProfit-a.scenarioProfit);
 const other=candidates.filter(x=>!used.has(x.id)).map(x=>{
  const n=Math.min(x.cap,Math.max(1,Math.floor(Math.min(wallet*.12,Math.max(0,maxSpend-spent))/x.buy)));
  const ev=adjusted(x,n);return {...x,quantity:n,cost:n*x.buy,scenarioProfit:ev?.conditional||0,rankValue:ev?.rankingValue||0};
 }).sort((a,b)=>b.rankValue-a.rankValue).slice(0,30);
 orders.sort((a,b)=>b.rankValue-a.rankValue||b.scenarioProfit-a.scenarioProfit);
 const conditionalProfit=orders.reduce((n,o)=>n+o.scenarioProfit,0),reliability=orders.reduce((n,o)=>n+o.rankValue,0);
 const pace=earningsPace({ok:true,orders});
 return {ok:true,source:'wallet',style,budget:wallet,spent,unallocated:wallet-spent,reserveTarget:wallet-maxSpend,
  earningsPace:pace,marketChoices,model:'conservative historical active-day trial + current quote; larger lots separate and unverified',at:now,orders,watch:other,
  candidateCount:candidates.length,quoteCount,verifiedQuotes:inspected.length,staleOrMissing:missing.length,
  blocked,history:hist,conditionalProfit,rankingScenario:reliability,
  note:'Ranking scenarios are not calibrated forecasts or guaranteed earnings. Exact queue positions, cancellations and world-wide trade turnover are unavailable.'};
}
/* Funded decisions use joint 24h observation windows; legacy sizing stays research-only. */
function evaluate(options={}){
 const legacy=evaluateResearch(options);if(!legacy.ok)return legacy;
 const stable=id=>{const v=root.GPMarketFeed?.volatility(id);return !!v&&v.days>=5&&!v.caution&&v.relativeStd<=.15;};
 const e=root.GPExecution?.plan({...options,learning:options.learning||{},stability:stable});
 if(!e)return {...legacy,orders:[],spent:0,unallocated:legacy.budget,conditionalProfit:0,expectedProfit:null};
 return {...legacy,...e,ok:true,source:'wallet',budget:options.budget??options.snapshot?.wallet,
  conditionalProfit:e.orders.reduce((n,o)=>n+o.scenarioProfit,0),earningsPace:null,
  researchOrders:legacy.orders,model:e.model,note:'Expected 24h profit from comparable personal outcomes; estimates are uncertain. Research is not funded.'};
}
/* CURRENT OPEN ORDERS: scenario based on positions actually standing in GW2.
 * Do not call this an expected profit or a global volume forecast. Unlike the
 * wallet-only six-order projection it accounts for already-committed capital.
 */
function activeBookScenario({ledger=[],quotes=[],snapshot=null,now=Date.now()}={}){
 const hist=history(ledger,now),fresh=new Map(),groups=new Map();
 for(const r of quotes){const q=r.latest||r;if(!valid(q?.id)||!valid(q?.sell)||!finite(Date.parse(q.at))||Math.abs(now-Date.parse(q.at))>25*60000)continue;fresh.set(q.id,q);}
 let committed=0,covered=0,conditionalWeek=0,eligible=0,unverified=0,unprofitable=0;
 const entries=[];
 for(const o of snapshot?.buys||[]){if(!valid(o?.item)||!valid(o?.q)||!valid(o?.price))continue;
  const g=groups.get(o.item)||{id:o.item,units:0,gold:0,orders:[]};g.units+=o.q;g.gold+=o.q*o.price;g.orders.push(o);groups.set(o.item,g);committed+=o.q*o.price;
 }
 for(const g of groups.values()){
  const q=fresh.get(g.id),x=hist.markets.get(g.id),repeat=x?.buyWeeksCount>=2&&x?.sellWeeksCount>=2&&x?.history?.coverage>=.65;
  if(!q||!repeat){unverified++;continue;}
  const exit=Math.floor(q.sell*.97),net=saleNet(exit,1);if(!valid(exit)||net===null){unverified++;continue;}
  const priced=g.orders.filter(o=>net>o.price);
  if(!priced.length){unprofitable++;continue;}
  const priceSafeUnits=priced.reduce((n,o)=>n+o.q,0);
  // Historical active-week volume (only weeks in which the user placed and
  // completed trades). Never infer the world's rate from public book quantity.
  const weekBuy=x.buyWeekP25||x.buyWeekMedian||0,weekSell=x.sellWeekP25||x.sellWeekMedian||0;
  const recent=Math.max(0,Math.min(x.recentBuy7||0,x.recentSell7||0));
  const ageScale=x.ageDays<=30?1:x.ageDays<=120?.65:.35;
  const activeCap=Math.max(recent*.55,Math.min(weekBuy,weekSell)*ageScale);
  const openSales=(snapshot.sells||[]).filter(o=>o.item===g.id).reduce((n,o)=>n+Math.max(0,o.q||0),0);
  const delivery=(snapshot.delivery?.items||[]).filter(o=>o.id===g.id).reduce((n,o)=>n+Math.max(0,o.count||0),0);
  const qty=Math.max(0,Math.min(priceSafeUnits,Math.floor(activeCap-openSales-delivery)));
  let left=qty,profit=0;
  for(const o of priced){const n=Math.min(left,o.q);if(n<=0)break;profit+=(net-o.price)*n;left-=n;}
  covered+=g.gold;
  if(qty&&profit>0){conditionalWeek+=profit;eligible++;entries.push({id:g.id,units:g.units,scenarioUnits:qty,capital:g.gold,conditionalWeek:profit,netUnit:Math.round(profit/qty),historicalBuyWeeks:x.buyWeeksCount,historicalSellWeeks:x.sellWeeksCount,
    historicalBuyWeek:weekBuy,historicalSellWeek:weekSell,observedBuyDays:x.buyActiveDays,observedSellDays:x.sellActiveDays,
    nightReferenceUnits:(x.buyActiveNights>=2&&x.sellActiveDays>=2&&x.recentBuy30>0&&x.recentSell30>0)?
      Math.max(0,Math.min(qty,Math.floor(Math.min(x.buyNightP25||0,x.sellDayP25||0)))):0,
    overnightNetPerUnit:Math.floor(profit/Math.max(1,qty)),
    observedBuyMedian:x.buyDayMedian||0,observedSellMedian:x.sellDayMedian||0,ageDays:x.ageDays||0,
    buyWaitP75:x.buyWaitP75,sellWaitP75:x.sellWaitP75});}
 }
 entries.sort((a,b)=>b.conditionalWeek-a.conditionalWeek);
 return {committed,covered,conditionalWeek,eligible,unverified,unprofitable,entries,
  note:'Standing-buy scenario based on historical active-week fills and current quoted margins; excludes unknown inventory cost and does not establish probability or guarantee resales.'};
}
// Capital comparisons are simulations. Cancelled gold is never marked spendable
// unless the user's next *verified wallet snapshot* actually contains those coins.
function capitalReview({ledger=[],quotes=[],metadata={},snapshot=null,learning={},now=Date.now(),avoid=[],cloudSignals=null,style='balanced',current=null}={}){
 if(!snapshot||!Number.isSafeInteger(snapshot.wallet)||snapshot.wallet<0)return null;
 const buys=(snapshot.buys||[]).filter(o=>valid(o?.item)&&valid(o?.q)&&valid(o?.price));
 const committed=buys.reduce((n,o)=>n+o.q*o.price,0);
 if(!buys.length||!committed)return {committed:0,allReleased:null,selective:null,reviews:[],releasedSelective:0};
 const hist=history(ledger,now),byId=new Map(),quoteMap=new Map();
 for(const row of quotes){const q=row.latest||row;if(valid(q?.id)&&Number.isInteger(q.buy)&&Number.isInteger(q.sell)&&
   finite(Date.parse(q.at))&&now-Date.parse(q.at)<=25*60000)quoteMap.set(q.id,q);}
 for(const o of buys){let x=byId.get(o.item);if(!x){x={id:o.item,orders:[],units:0,gold:0,oldestHours:0};byId.set(o.item,x);}
  x.orders.push(o);x.units+=o.q;x.gold+=o.q*o.price;
  if(finite(o.created)&&o.created>0)x.oldestHours=Math.max(x.oldestHours,(now-o.created)/HOUR);
 }
 const reviews=[];
 for(const group of byId.values()){
  const h=hist.markets.get(group.id),q=quoteMap.get(group.id),typical=Math.min(h?.buyWeekMedian||0,h?.sellWeekMedian||0);
  const cautiousExit=q?Math.floor(q.sell*.97):0;
  const orderNet=q?group.orders.reduce((n,o)=>n+o.q*((saleNet(cautiousExit,1)||0)-o.price),0):null;
  const marginProblem=q&&orderNet!==null&&orderNet<0;
  // Historical throughput counts active weeks, not arbitrary idle calendar weeks.
  const excess=typical>0&&group.units>Math.max(5,typical*1.75);
  const idle=h&&h.recentBuy7===0&&group.oldestHours>=72;
  const stock= (snapshot.sells||[]).filter(s=>s.item===group.id).reduce((n,s)=>n+(s.q||0),0)+
   (snapshot.delivery?.items||[]).filter(s=>s.id===group.id).reduce((n,s)=>n+(s.count||0),0);
  const stockPressure=typical>0&&stock>=typical;
  const flags=[];
  if(marginProblem)flags.push('Current cautious resale reference is below these bid costs after fees');
  if(excess)flags.push('Standing buy units exceed historical active-week buy/sell throughput');
  if(stockPressure)flags.push('Unfinished resale inventory already occupies historical throughput');
  if(idle)flags.push('No completed acquisitions in seven days; oldest buy at least three days');
  const review=marginProblem||excess||((idle||stockPressure)&&group.gold>=100000);
  reviews.push({...group,name:metadata[group.id]?.name||'Item #'+group.id,typicalWeek:typical,
   recentBought:h?.recentBuy7||0,recentSold:h?.recentSell7||0,flags,
   status:review?'review':'retain-or-check',review,quoteVerified:!!q,
   valueAtCurrentBid:orderNet,quoteAgeMs:q?now-Date.parse(q.at):null});
 }
 reviews.sort((a,b)=>Number(b.review)-Number(a.review)||b.gold-a.gold);
 const selected=new Set(reviews.filter(r=>r.review).slice(0,8).map(r=>r.id));
 const removeBuys=(ids)=>buys.filter(o=>!ids.has(o.item));
 const budgetFor=(excluded)=>snapshot.wallet+buys.filter(o=>excluded.has(o.item)).reduce((n,o)=>n+o.q*o.price,0);
 function evaluateReleased(excluded,label){if(!excluded.size)return null;
  const plan=evaluate({ledger,quotes,metadata,learning,snapshot:{...snapshot,wallet:budgetFor(excluded),buys:removeBuys(excluded)},now,
    budget:budgetFor(excluded),avoid,cloudSignals,style});
  plan.source='hypothetical';plan.releaseLabel=label;plan.assumedCanceled=[...excluded];
  plan.released=plan.budget-snapshot.wallet;plan.originalWallet=snapshot.wallet;
  plan.notSpendable=true;return plan;
 }
 const all=new Set(byId.keys());
 return {committed,allReleased:evaluateReleased(all,'All standing buys cancelled'),
  selective:evaluateReleased(selected,'Review-flagged buys cancelled'),
  releasedSelective:budgetFor(selected)-snapshot.wallet,reviews,
  reviewCount:reviews.filter(r=>r.review).length,
  safeguard:'Scenarios are research only. Keep good standing orders: cancellation loses queue position and cannot be reversed. Only a fresh verified wallet can fund new orders.'};
}
/* Primary market presentation: compare *existing holdings* and new capital in
 * the same 7-day reference window. A weekly scenario is conditional, not
 * expected profit. Never claim an unfunded what-if order is spendable.
 * Huge isolated one-offs are lower-priority than repeatable, substantial lots.
 */
/* All results are in the SAME conditional active-week reference. A buy-order
 * preference is never an eligibility filter on funded orders. Mark scenario
 * funding separately from market capacity. Nothing is an exact P(fill). */
function rankedResearchMarkets(plan,{minLot=1,bulkOnly=false}={}){
 if(!plan?.ok)return {rows:[],actualBookWeekly:0,newWeekly:0,combinedWeekly:0,verifiedStanding:0,unknownStanding:0};
 const rows=[],used=new Set(),hypothetical=plan.source==='hypothetical',
  lot=Math.max(1,Math.floor(minLot)||1);
 const add=(r)=>{if(!r||!valid(r.id)||used.has(r.id)||!finite(r.rankWeekly)||r.rankWeekly<=0)return;
  used.add(r.id);rows.push(r);};
 for(const a of plan.activeBook?.entries||[]){
  const weekly=Number(a.conditionalWeek)||0;if(weekly<=0)continue;
  add({id:a.id,kind:'standing',quantity:a.scenarioUnits,maxSupportedQty:a.scenarioUnits,
   openUnits:a.units,cost:a.capital,conditionalProfit:weekly,weeklyScenario:weekly,
   overnightUnits:a.nightReferenceUnits||0,
   overnightProfit:Math.floor((a.nightReferenceUnits||0)*(a.overnightNetPerUnit||0)*
     (Number.isFinite(a.sellWaitP75)?Math.min(1,24/Math.max(24,a.sellWaitP75)):0.4)),
   rankWeekly:weekly*.72,bid:null,buy:null,exit:null,matchedWeeks:Math.min(a.historicalBuyWeeks||0,a.historicalSellWeeks||0),
   confidence:'Recorded buys and sells',buy24Active:a.observedBuyMedian,sell24Active:a.observedSellMedian,
   buyWaitP75:a.buyWaitP75,sellWaitP75:a.sellWaitP75,
   evidence:'Existing active orders · conditional historical-week scenario'});
 }
 for(const o of plan.orders||[]){
  if(used.has(o.id))continue;
  const weekly=Number(o.weeklyScenario)||0;
  // One completed round is not a weekly earnings estimate. Non-repeatable
  // quote opportunities belong in research, not the headline shortlist.
  if(weekly<=0||(Math.min(o.buyWeeks||0,o.sellWeeks||0)<2&&!o.repeatEvidence))continue;
  add({id:o.id,kind:hypothetical?'hypothetical':'funded',quantity:o.quantity,
   maxSupportedQty:o.cap||o.quantity,cost:o.cost,conditionalProfit:o.scenarioProfit,
   weeklyScenario:weekly,rankWeekly:o.rankValue||0,overnightProfit:o.nightProfit||0,
   overnightUnits:o.nightUnits||0,bid:o.buy,buy:o.buy,exit:o.exit,
   matchedWeeks:Math.min(o.buyWeeks||0,o.sellWeeks||0),confidence:o.confidence,
   exploratoryExtra:o.exploratoryExtra||0,demonstratedCap:o.demonstratedCap||0,capacityLabel:o.capacityLabel,
   buyWeeks:o.buyWeeks||0,sellWeeks:o.sellWeeks||0,buyDayMedian:o.buyDayMedian||0,sellDayMedian:o.sellDayMedian||0,
   cap:o.cap,earnableQty24:o.earnableQty24,earnableQty48:o.earnableQty48,earnableQty7:o.earnableQty7,
   tier:o.tier,matched:o.matched||0,repeatEvidence:!!o.repeatEvidence,ask:o.ask,sizeConstraint:o.sizeConstraint||'',
   buy24Active:o.earnableQty24,sell24Active:o.activeSellDay,ageDays:o.ageDays,
   observed24Reference:o.observed24Reference||0,researchCap:o.researchCap||0,
   overnightEvidence:o.overnightEvidence||'',conservativeOrderCap:o.conservativeOrderCap||o.cap,
   evidence:hypothetical?'Requires cancelling and rechecking standing orders':'Wallet-funded recommendation'});
 }
 // Consider profitable, historically supported markets that were NOT funded.
 // They remain visible without pretending the player has spendable gold.
 for(const c of plan.marketChoices||[]){
  if(used.has(c.id)||(Math.min(c.buyWeeks||0,c.sellWeeks||0)<2&&!c.repeatEvidence))continue;
  const weekly=Number(c.weeklyScenario)||0;if(weekly<=0)continue;
  add({id:c.id,kind:'potential',quantity:c.quantity,maxSupportedQty:c.cap,
   cost:c.cost,conditionalProfit:c.scenarioProfit,weeklyScenario:weekly,rankWeekly:c.rankValue||0,
   overnightProfit:c.nightProfit||0,overnightUnits:c.nightUnits||0,
   bid:c.buy,buy:c.buy,exit:c.exit,matchedWeeks:Math.min(c.buyWeeks||0,c.sellWeeks||0),
   confidence:c.confidence,exploratoryExtra:c.exploratoryExtra||0,demonstratedCap:c.demonstratedCap||0,capacityLabel:c.capacityLabel,
   buyWeeks:c.buyWeeks||0,sellWeeks:c.sellWeeks||0,buyDayMedian:c.buyDayMedian||0,sellDayMedian:c.sellDayMedian||0,
   cap:c.cap,earnableQty24:c.earnableQty24,earnableQty48:c.earnableQty48,earnableQty7:c.earnableQty7,
   tier:c.tier,matched:c.matched||0,repeatEvidence:!!c.repeatEvidence,ask:c.ask,
   buy24Active:c.earnableQty24,sell24Active:c.activeSellDay,ageDays:c.ageDays,
   observed24Reference:c.observed24Reference||0,researchCap:c.researchCap||0,
   overnightEvidence:c.overnightEvidence||'',conservativeOrderCap:c.conservativeOrderCap||c.cap,
   evidence:'Viable market research; quantity requires funding and current quote verification'});
 }
 let output=rows;
 if(bulkOnly){
  // This is an actual MINIMUM-ORDER-SIZE filter, not a "might be larger"
  // search tag. Every returned row must show at least `lot` units.
  // A funded one-unit order does not become funded for five units just because
  // the historical research cap is five: any escalation is unfunded research.
  const choices=new Map((plan.marketChoices||[]).map(c=>[c.id,c]));
  output=rows.flatMap(r=>{
   if(Number(r.quantity)>=lot)return [r];
   const c=choices.get(r.id);
   if(!c||Number(c.cap)<lot||!valid(c.buy)||!valid(c.exit)||!Number.isFinite(c.netUnit)||c.netUnit<=0)return [];
   const qty=lot,cost=qty*c.buy,net=saleNet(c.exit,qty);
   if(net===null||net<=cost)return [];
   // Model at most a *single* proposed lot; do not invent seven repeat orders.
   const historicalUnits=Math.max(0,Math.min(Number(c.buyWeek25)||0,Number(c.sellWeek25)||0));
   const exploredUnits=c.fastRepeat?Math.max(historicalUnits,Number(c.projectedWeeklyUnits)||0):historicalUnits;
   const weeklyUnits=Math.min(exploredUnits,qty);
   const weeklyScenario=Math.max(0,Math.floor(weeklyUnits*c.netUnit));
   if(weeklyScenario<=0)return [];
   const discountedRank=Number(c.rankValue)||0;
   return [{...r,kind:'potential',quantity:qty,cost,bid:c.buy,buy:c.buy,
    overnightProfit:Math.min(Number(c.nightProfit)||0,Math.floor(Math.min(qty,Number(c.earnableQty24)||0)*c.netUnit)),
    overnightUnits:Math.min(qty,Number(c.earnableQty24)||0),
    exit:c.exit,conditionalProfit:net-cost,weeklyScenario,
    rankWeekly:Math.max(1,discountedRank*Math.min(1,qty/Math.max(1,Number(c.quantity)||1))),
    maxSupportedQty:c.cap,demonstratedCap:c.demonstratedCap,
    exploratoryExtra:c.exploratoryExtra,capacityLabel:c.capacityLabel,
    evidence:'Unfunded minimum-lot scenario; current order book and personal executions do NOT prove this quantity will fill'}];
  });
  // Defence in depth: never leak a sub-threshold suggestion into bulk results.
  output=output.filter(r=>Number.isSafeInteger(r.quantity)&&r.quantity>=lot);
 }
 // Personal overnight exposure takes precedence over optimistic completed-only
 // active-day pacing WHEN BOTH buy and resale observation windows exist.
 // Lower quartile includes nights with zero fills; it is a historical scenario,
 // NOT an exact probability or a promise of proceeds in the same night.
 for(const r of output){
  const buys=nightlyExposure(plan.buyOrderEvidence,r.id);
  const sells=nightlyExposure(plan.sellOrderEvidence,r.id);
  r.observedBuyNights=buys.nights;r.observedZeroBuyNights=buys.zeroNights;
  r.observedSellNights=sells.nights;r.observedZeroSellNights=sells.zeroNights;
  r.buyBacktest=validateOvernightModel(plan.buyOrderEvidence,r.id);r.sellBacktest=validateOvernightModel(plan.sellOrderEvidence,r.id);
  r.overnightModel='historical-completed-trades-conditional';
  if(buys.supported&&sells.supported&&valid(r.buy)&&valid(r.exit)&&valid(r.quantity)){
   const units=Math.max(0,Math.min(r.quantity,buys.p25||0,sells.p25||0));
   r.overnightUnits=units;
   r.overnightProfit=units?Math.max(0,(saleNet(r.exit,units)||0)-r.buy*units):0;
   r.overnightModel='observed-lower-quartile-including-zero-nights';
   // If walk-forward error is high relative to the predicted amount, the model
   // is not considered calibrated; keep the conservative conditional scenario
   // but do not market it as dependable expected earnings.
   r.overnightCalibrated=!!(r.buyBacktest?.ready&&r.sellBacktest?.ready&&
     r.buyBacktest.meanAbsError<=Math.max(1,units)*0.75&&
     r.sellBacktest.meanAbsError<=Math.max(1,units)*0.75);
  }
 }
 output.sort((a,b)=>(b.overnightProfit||0)-(a.overnightProfit||0)||b.rankWeekly-a.rankWeekly||a.id-b.id);
 const actualBookWeekly=rows.filter(r=>r.kind==='standing').reduce((n,r)=>n+(r.weeklyScenario||0),0);
 const newWeekly=rows.filter(r=>r.kind==='funded').reduce((n,r)=>n+(r.weeklyScenario||0),0);
 return {rows:output,allRows:rows,actualBookWeekly,newWeekly,combinedWeekly:actualBookWeekly+newWeekly,
  overnightPortfolioScenario:rows.filter(x=>x.kind==='standing'||x.kind==='funded').reduce((n,x)=>n+(x.overnightProfit||0),0),
  verifiedStanding:plan.activeBook?.eligible||0,unknownStanding:plan.activeBook?.unverified||0,
  isCalibrated:false,explanation:'Sorted by evidence-bounded 24h buy AND resale scenarios using completed personal trades and fresh quotes. Not calibrated expected returns or guaranteed overnight fills.'};
}
function rankedMarkets(plan,{minLot=1}={}){
 const book=root.GPExecution?.ranked(plan)||{rows:[],allRows:[],overnightPortfolioScenario:null};
 book.rows=book.rows.filter(x=>x.quantity>=minLot);return book;
}
/* Keep *speculative* larger historical lots visible WITHOUT making them funded,
 * without weekly expected profit, and without calling them overnight capacity.
 * A 5+ filter shows a small measured escalation first, not a 90-unit order.
 * Higher explicit filters let users examine 20/50-unit WHAT-IF economics.
 */
function historicalExperiments(plan,{minLot=5,limit=120}={}){
 const lot=Math.max(1,Math.floor(Number(minLot))||5),rows=[];
 for(const c of plan?.marketChoices||[]){
  if(!c.repeatEvidence||!valid(c.buy)||!valid(c.exit)||!valid(c.id))continue;
  const cap=Math.max(0,Math.floor(c.researchCap||0));
  const supported=Math.max(1,Math.floor(c.cap||1));
  if(cap<lot||cap<=supported)continue;
  // Escalate by ~50% from the observed-day trial, or to the deliberately
  // selected research floor; do not suggest the full speculative ceiling.
  const qty=Math.min(cap,Math.max(lot,Math.ceil(supported*1.5)));
  if(qty<=supported)continue;
  const cost=c.buy*qty,net=saleNet(c.exit,qty);
  if(!Number.isSafeInteger(cost)||!finite(net)||net<=cost)continue;
  const scenarioProfit=net-cost;
  const rankValue=Math.min(scenarioProfit,Math.max(1,Number(c.weeklyScenario)||0))*0.18;
  rows.push({...c,kind:'capacity-research',quantity:qty,cost,scenarioProfit,
   weeklyScenario:null,rankWeekly:0,rankValue,
   observed24Reference:c.observed24Reference||0,
   supportedOrderQty:supported,researchCap:cap,
   confidence:'Experimental size ONLY — no proof this much will fill overnight',
   sizeConstraint:'Unverified escalation from observed personal daily completions',
   evidence:'Distinct research experiment; never a wallet-funded order, overnight target or 7-day profit forecast'});
 }
 rows.sort((a,b)=>b.rankValue-a.rankValue||b.scenarioProfit-a.scenarioProfit||a.id-b.id);
 return rows.slice(0,limit);
}
function equipmentCoverageAudit({metadata={},discoveryIds=[],quotes=[],plan=null}={}){
 const requested=new Set(discoveryIds),quoted=new Set(quotes.map(q=>q?.id||q?.latest?.id)),
  approved=new Map((plan?.marketChoices||[]).map(x=>[x.id,x])),
  blocked=new Map((plan?.blocked||[]).map(x=>[x.id,x.reason]));
 const groups={};
 for(const [idString,meta] of Object.entries(metadata||{})){
  const id=Number(idString),name=String(meta?.name||'');if(!valid(id))continue;
  const category=[meta.type||'Unknown',meta.rarity||'Unknown',meta.details?.type||''].filter(Boolean).join(' / ');
  const group=groups[category]||(groups[category]={known:0,requested:0,quoted:0,eligible:0,bulk5:0,examples:[],reasonCounts:{}}),
   market=approved.get(id),asked=requested.has(id),fresh=quoted.has(id);
  group.known++;if(asked)group.requested++;if(fresh)group.quoted++;
  if(market)group.eligible++;if(market?.cap>=5)group.bulk5++;
  const reason=!asked?'not-in-recent-candidate-scan':!fresh?'no-current-quote':market?'eligible':blocked.get(id)||'excluded-by-market-or-history-check';
  group.reasonCounts[reason]=(group.reasonCounts[reason]||0)+1;
  if(group.examples.length<5&&reason!=='eligible')group.examples.push({name,id,reason});
 }
 return {groups,source:'locally indexed names only — not a complete GW2 item catalog',
  candidates:plan?.candidateCount||0,quotes:quotes.length};
}
/* Discover from EVERY stored public commerce quote, without item names/history.
 * Stratify by price and book-size: one popular/expensive category must not
 * crowd out lower-price bulk opportunities. A quote is NOT a turnover sample.
 */
function researchQuoteScore(q){
 const buy=q?.buy,sell=q?.sell;
 if(!valid(q?.id)||!valid(buy)||!valid(sell)||sell<=buy||
    !valid(q.buyQty)||!valid(q.sellQty))return null;
 // Research at one copper inside each quote, not an arbitrary 3% exit discount.
 const bid=buy+1,exit=sell-1;
 if(!valid(bid)||!valid(exit)||exit<=bid)return null;
 const afterFee=saleNet(exit,1);if(!finite(afterFee))return null;
 const net=afterFee-bid,roi=net/bid;
 if(!valid(net))return null;
 const book=Math.max(1,Math.min(Number(q.buyQty)||0,Number(q.sellQty)||0));
 // Discovery ranking ONLY. Book quantities signal competition, not transactions.
 const score=Math.log1p(net)*Math.log1p(Math.min(book,800))*(.7+Math.min(roi,2)) *
    Math.log1p(Math.min(bid,200000))/6;
 const priceBand=bid<100?'copper':bid<10000?'silver':bid<100000?'gold':'premium';
 const bookBand=book<6?'thin':book<50?'middle':'deep';
 return {id:q.id,score,net,roi,buy:bid,exit,priceBand,bookBand};
}
async function gatherPublicSeeds(state,hist,limit=1450){
 if(seedCache&&Date.now()-seedCache.at<8*60000&&seedCache.limit===limit)return seedCache.value;
 let after='',seen=0,fresh=0,eligible=0;
 const groups=new Map(),global=[];
 if(!state?.db?.marketPage)return {ids:[],seen:0,fresh:0,eligible:0,coverage:'no-saved-public-quotes'};
 const keep=(arr,r,max)=>{arr.push(r);if(arr.length>max*2){arr.sort((a,b)=>b.score-a.score||a.id-b.id);arr.length=max;}};
 for(let n=0;n<600;n++){
  const page=await state.db.marketPage(after,500);
  for(const r of page.values){seen++;
   const q=r.latest;
   const at=Date.parse(q?.at);if(!finite(at)||Date.now()-at>18*HOUR||at>Date.now()+60000)continue;
   fresh++;
   const c=researchQuoteScore(q);if(!c)continue;
   eligible++;const category=String(state.meta?.[c.id]?.type||'Unknown');
   const g=JSON.stringify([category,c.priceBand,c.bookBand]);
   if(!groups.has(g))groups.set(g,[]);
   keep(groups.get(g),c,125);keep(global,c,330);
  }
  if(page.done||!page.values.length)break;after=page.afterPk;
 }
 for(const arr of groups.values())arr.sort((a,b)=>b.score-a.score||a.id-b.id);
 global.sort((a,b)=>b.score-a.score||a.id-b.id);
 const ids=[],used=new Set(),push=x=>{if(x&&!used.has(x.id)&&ids.length<limit){used.add(x.id);ids.push(x.id);}};
 // Interleave price/depth bands instead of letting all top slots be one gear class.
 const buckets=[...groups].sort((a,b)=>a[0].localeCompare(b[0])).map(x=>x[1]);
 for(let j=0;j<120&&ids.length<limit;j++)for(const bucket of buckets)push(bucket[j]);
 for(const c of global)push(c);
 const value={ids,seen,fresh,eligible,groups:groups.size,
  coverage:state.marketStatus?.complete?'full-public-quote-snapshot':'partial/stored-public-quotes'};
 seedCache={at:Date.now(),limit,value};return value;
}
/* Craftable supply and manufacturing: official public recipe catalogue. We cache
 * the complete indexed result, and retain partial progress if mobile drops offline.
 * A recipe proves production is possible, NOT that sellers fill bids overnight. */
const ARMOR_WEAPON_TYPES=new Set(['Axe','Dagger','Focus','Greatsword','Hammer','Harpoon','LongBow','Mace','Pistol','Rifle','Scepter','Shield','ShortBow','Speargun','Staff','Sword','Torch','Trident','Warhorn','Boots','Coat','Gloves','Helm','Leggings','Shoulders']);
const recipeByOutput=(recipes)=>{const m=new Map();for(const r of recipes||[]){if(!valid(r?.output_item_id)||!Array.isArray(r.ingredients))continue;
 const a=m.get(r.output_item_id)||[];a.push(r);m.set(r.output_item_id,a);}return m;};
async function ensureRecipeUniverse(state,{now=Date.now(),maxAgeMs=72*HOUR}={}){
 const old=(await state.db.get('config','global','tradable-recipe-index-v2'))?.value;
 const oldAt=Date.parse(old?.at);
 if(old?.complete&&finite(oldAt)&&now-oldAt<maxAgeMs)return {...old,fromCache:true};
 if(typeof state.api?.get!=='function')return {...(old||{}),complete:false,reason:'recipe-api-not-available'};
 const recipes=old?.complete?[]:[...(old?.recipes||[])];
 let next=old?.complete?0:Number(old?.nextPage)||0,expected=null,total=null,received=old?.complete?0:Number(old?.received)||0;
 try{
  for(let page=next;page<250;page++){
   if(state.opportunityDeepController?.signal.aborted)throw Error('Extended discovery stopped');
   const r=await state.api.get('/recipes?page='+page+'&page_size=200',{retries:1,signal:state.opportunityDeepController?.signal});
   if(!Array.isArray(r.data))throw Error('Invalid public recipe page');
   if(expected===null&&Number.isInteger(r.pages))expected=r.pages;
   if(total===null&&Number.isInteger(r.total))total=r.total;
   if(expected!==null&&expected>250)throw Error('Recipe index exceeds safety limit');
   received+=r.data.length;for(const recipe of r.data)if(valid(recipe?.output_item_id))recipes.push(recipe);
   next=page+1;
   state.opportunityStatus='Indexing all public crafting recipes · recipe page '+(page+1)+(expected?' / '+expected:'');
   state.opportunityDeepStatus=state.opportunityStatus;
   if(page%8===7){await state.db.put('config','global','tradable-recipe-index-v2',{complete:false,nextPage:page+1,received,recipes,at:new Date(now).toISOString()});root.GPFocus?.render?.();}
   if((expected!==null&&page+1>=expected)||r.data.length<200){
    if(total!==null&&received!==total)throw Error('Recipe index incomplete: paginated totals disagree');
    const result={complete:true,recipes,nextPage:page+1,at:new Date(now).toISOString(),recipePages:page+1,recipeOutputs:recipeByOutput(recipes).size};
    await state.db.put('config','global','tradable-recipe-index-v2',result);
    return result;
   }
  }
  throw Error('Recipe scan exceeded safety limit');
 }catch(err){const reason=String(err?.message||err).slice(0,160),partial={complete:false,nextPage:next,received,recipes,at:new Date(now).toISOString(),reason};
  // Preserve finished old cache on transient errors. Don't discard already indexed recipes.
  if(recipes.length)await state.db.put('config','global','tradable-recipe-index-v2',partial);
  return {...partial,reason};
 }
}
/* Persist all discovered item names by traversing the complete locally saved
 * tradable quote catalogue, not only whatever won today's spread score.
 * Index a bounded portion on each extended scan. Cache survives releases.
 */
async function extendTradableCatalogue(state,{priorityIds=[],maxNew=4800,rotateQuota=1600,signal}={}){
 const key='tradable-catalogue-cursor-v1',cached=(await state.db.get('config','global',key))?.value||{};
 let cursor=typeof cached.cursor==='string'?cached.cursor:'',visited=0,wrapped=false;
 const ids=[],seen=new Set();const add=id=>{id=Number(id);if(valid(id)&&!seen.has(id)&&!state.meta?.[id]?.name){ids.push(id);seen.add(id);}};
 const priorityLimit=Math.max(0,maxNew-rotateQuota);
 for(const id of priorityIds){if(ids.length>=priorityLimit)break;add(id);}
 // Rotate through the entire tradable-item catalogue even if its price-spread
 // ranking is low. This is how otherwise forgotten sword/insignia siblings enter.
 let pages=0;
 while(ids.length<maxNew&&pages++<60){
  if(signal?.aborted)throw Error('Extended discovery stopped');
  const page=await state.db.marketPage(cursor,500);
  if(!page?.values?.length){if(wrapped)break;cursor='';wrapped=true;continue;}
  for(const r of page.values){visited++;if(ids.length<maxNew)add(r?.latest?.id||r?.id);}
  cursor=page.afterPk||cursor;
  if(page.done){cursor='';wrapped=true;if(!ids.length)break;}
  if(wrapped&&ids.length>=maxNew)break;
 }
 let added=0,failed='';
 for(let i=0;i<ids.length;i+=100){
  if(signal?.aborted)throw Error('Extended discovery stopped');
  try{const meta=await safeMetadata(state.api,ids.slice(i,i+100),{signal});
   Object.assign(state.meta,meta);await state.db.putMetadataBatch(meta);added+=Object.keys(meta).length;
  }catch(e){if(signal?.aborted)throw e;failed=String(e?.message||e).slice(0,150);break;}
  if(i%500===0){state.opportunityDeepStatus='Cataloguing tradable item families · '+Math.min(i+100,ids.length)+' / '+ids.length;root.GPFocus?.render?.();}
 }
 await state.db.put('config','global',key,{cursor,at:new Date().toISOString(),lastIndexed:added,lastRequested:ids.length});
 return {indexed:added,requested:ids.length,visited,failed,cursor,partial:!!failed};
}
async function craftableEquipmentSeeds(state,recipes,{limit=3600}={}){
 const indexed=recipeByOutput(recipes),buckets=new Map(),all=[];
 let after='';let scanned=0;
 for(let page=0;page<600;page++){
  const r=await state.db.marketPage(after,500);
  for(const record of r.values){scanned++;const q=record?.latest,types=indexed.get(q?.id);
   if(!types||!valid(q?.sell)||!valid(q?.buy)||!valid(q?.sellQty)||!valid(q?.buyQty))continue;
   const at=Date.parse(q.at);if(!finite(at)||Date.now()-at>18*HOUR)continue;
   const rating= Math.log1p(q.sell)*Math.log1p(Math.min(q.buyQty,500)) / Math.max(1,Math.log1p(q.sellQty));
   const bucket=types[0].type+':'+(q.sell<10000?'low':q.sell<100000?'mid':'high');
   if(!buckets.has(bucket))buckets.set(bucket,[]);
   const entry={id:q.id,score:rating};buckets.get(bucket).push(entry);all.push(entry);
  }
  if(r.done||!r.values.length)break;after=r.afterPk;
 }
 for(const b of buckets.values())b.sort((a,b)=>b.score-a.score);
 const output=[],used=new Set();const push=r=>{if(r&&!used.has(r.id)&&output.length<limit){output.push(r.id);used.add(r.id);}};
 const sets=[...buckets.values()];for(let i=0;i<100&&output.length<limit;i++)for(const set of sets)push(set[i]);
 all.sort((a,b)=>b.score-a.score);for(const entry of all)push(entry);
 return {ids:output,known:indexed.size,quoted:all.length,scanned};
}
function analyseCraftRoutes({recipes=[],quotes=[],metadata={},now=Date.now()}={}){
 const byOutput=recipeByOutput(recipes),quoteMap=new Map();
 for(const record of quotes){const q=record?.latest||record;if(valid(q?.id)&&valid(q?.sell)&&finite(Date.parse(q?.at))&&Math.abs(now-Date.parse(q.at))<25*60000)quoteMap.set(q.id,q);}
 const rows=[],unpriced=new Set(),blocked=new Set();let checked=0;
 for(const [id, variants] of byOutput){const out=quoteMap.get(id);if(!out)continue;
  checked++;let best=null;
  for(const recipe of variants){if(!valid(recipe.output_item_count)||!Array.isArray(recipe.ingredients)||!recipe.ingredients.length)continue;
   let materials=0,validRecipe=true;const parts=[];
   for(const ing of recipe.ingredients){const type=ing.type||'Item',iid=Number(ing.id??ing.item_id),count=Number(ing.count);
    if(type!=='Item'||!valid(iid)||!valid(count)){validRecipe=false;blocked.add(id);break;}
    const q=quoteMap.get(iid);if(!q?.sell){validRecipe=false;unpriced.add(iid);break;}
    materials+=q.sell*count;parts.push({id:iid,count,ask:q.sell,available:q.sellQty||0});
   }
   if(!validRecipe||!finite(materials)||materials<=0)continue;
   const outputCount=recipe.output_item_count;
   const unitCost=Math.ceil(materials/outputCount),exit=Math.floor(out.sell*.97);
   if(!valid(exit))continue;
   const profit=saleNet(exit,outputCount)-materials;
   if(!finite(profit)||profit<=0)continue;
   const row={id,name:metadata[id]?.name||'Item #'+id,rarity:metadata[id]?.rarity||'',kind:'craft',recipeId:recipe.id,recipeType:recipe.type,
    minRating:recipe.min_rating,disciplines:recipe.disciplines||[],flags:recipe.flags||[],outputCount,
    ingredients:parts,materialsCost:materials,craftCostPer:unitCost,buy:unitCost,exit,ask:out.sell,
    bid:out.buy, buyQty:out.buyQty,sellQty:out.sellQty,perOutputProfit:Math.floor(profit/outputCount),at:out.at,
    makerProfitAtCurrentBid:valid(out.buy)?saleNet(out.buy,outputCount)-materials:null,
    makerProfitAtImprovedBid:valid(out.buy+1)?saleNet(out.buy+1,outputCount)-materials:null};
   if(!best||row.perOutputProfit>best.perOutputProfit)best=row;
  }
  if(best)rows.push(best);
 }
 rows.sort((a,b)=>b.perOutputProfit-a.perOutputProfit||a.id-b.id);
 return {rows,checked,unpricedIngredientIds:[...unpriced],blocked:blocked.size,craftablesInRecipes:byOutput.size};
}
function craftLots(plan,{minLot=5,limit=1000}={}){
 const target=Math.max(1,Math.floor(Number(minLot))||5),out=[],
  budget=Math.min(1000000,Math.max(250000,Math.floor((plan?.budget||0)*.5),target>=50?500000:0));
 for(const c of plan?.craftResearch?.rows||[]){const qty=Math.max(target,c.outputCount),batches=Math.ceil(qty/c.outputCount),actualUnits=batches*c.outputCount,
   cost=c.materialsCost*batches,net=saleNet(c.exit,actualUnits);
  if(!finite(net)||!finite(cost)||cost<=0||cost>budget||c.buy>120000||net<=cost)continue;
  // No aggregate book capacity is interpreted as daily sales. Only the
  // after-fee one-round margin is shown, *conditional* on buying inputs and selling outputs.
  const ingredientDepthOk=c.ingredients.every(i=>i.available>=i.count*batches);
  out.push({...c,kind:'craft',quantity:actualUnits,cost,scenarioProfit:net-cost,weeklyScenario:null,
   rankValue:((net-cost)*Math.min(1,Math.log1p(c.buyQty||0)/6)*(ingredientDepthOk?0.75:0.22))/Math.pow(1+cost/100000,.75),
   ingredientDepthOk,confidence:'Crafting route · theoretical buy-materials then sell-finished-items',
   evidence:'RECIPE-BACKED CRAFT · margins from best ask snapshots · no guaranteed output sales',
   unverifiedBulk:true,demonstratedCap:0,cap:0});
 }
 out.sort((a,b)=>b.rankValue-a.rankValue||b.scenarioProfit-a.scenarioProfit);
 return out.slice(0,limit);
}
/* First-party public API exposes current listings, not completed worldwide
 * turnover. Preserve partial scans but call them incomplete; never infer sales.
 * The primary engine now *owns* a full market scan (once per 12h). */
async function ensurePublicUniverse(state,{now=Date.now(),maxAgeMs=12*HOUR}={}){
 const existing=state.marketStatus,at=Date.parse(existing?.at);
 const count=Number(existing?.count)||0;
 const stored=state.db?.count?await state.db.count('market','global'):0;
 if(existing?.complete&&finite(at)&&now-at<maxAgeMs&&stored>=Math.floor(count*.9))
  return {complete:true,refreshed:false,count,at:existing.at};
 if(state.scanning||state.universeScanning)return {complete:false,reason:'another-full-scan-running',count:stored};
 if(state.universeLastAttempt&&now-state.universeLastAttempt<45*60000)return {complete:false,reason:'scan-retry-deferred: '+(state.universeScanError||'incomplete scan'),count:stored};
 if(typeof state.api.scanPublicPrices!=='function')return {complete:false,reason:'full-market-api-unavailable',count:stored};
 state.universeScanning=true;state.universeLastAttempt=now;let received=0,pages=0;
 try{
  const done=await state.api.scanPublicPrices({maxPages:350,pageSize:200,signal:state.opportunityDeepController?.signal,onPage:async(rows,progress)=>{
   if(rows.length)await state.db.upsertMarketBatch(rows);
   received+=rows.length;pages=progress.page;
   state.opportunityStatus='Scanning all tradable markets: '+received.toLocaleString('en-GB')+' quotes'+(progress.totalExpected?' / '+progress.totalExpected.toLocaleString('en-GB'):'')+' · page '+pages;
   state.opportunityDeepStatus=state.opportunityStatus;
   if(pages%3===0)root.GPFocus?.render?.();
  }});
  const scan={complete:true,count:done.count,pages:done.pages,at:done.at,source:'ArenaNet full commerce/prices scan'};
  state.marketStatus=scan;
  state.marketTotal=await state.db.count('market','global');
  await state.db.put('config','global','market-scan',scan);
  seedCache=null;
  return {complete:true,refreshed:true,count:done.count,pages:done.pages,at:done.at};
 }catch(err){
  const reason=String(err?.message||err).slice(0,160);
  // A failed scan is not a verified complete universe. Prior market quotes
  // remain, and the screen MUST say discovery was incomplete.
  state.universeScanError=reason;
  return {complete:false,refreshed:false,count:received,stored,reason};
 }finally{state.universeScanning=false;}
}
/* Affordable, evidence-aware MARKET RESEARCH, not a buy recommendation.
 * The previous version created twenty-unit hypothetical lots for 40–60g EACH,
 * then ranked the fabricated gross lot profit as an opportunity. It could
 * promote a 1,200g infusion test over practical 2g crafted equipment.
 *
 * We now choose quantities bounded by a reasonable experiment CASH budget,
 * cap single-unit exposure on unfamiliar items, and rank by margin/evidence/
 * capital efficiency, never by an unbounded quantity multiplier. The budget is
 * deliberately hypothetical if the wallet has less cash; UI must say so.
 * Without completed account fills and subsequent sales, no weekly profit or
 * overnight fill number is estimated.
 */
/* Practical investigation triage, NOT estimated overnight throughput.
 * A research idea is not a funded order and has no expected weekly earnings.
 * Prefer bounded, repeatable, capital-efficient trials over spectacular spreads.
 * Never infer turnover from the standing book. Fail closed for stale/malformed quotes.
 */
const MARKET_BUILD='7.16.0-evidence';
function researchPolicy(plan,{minLot=5}={}){
 const target=[5,10,20,50].includes(Number(minLot))?Number(minLot):5;
 const wallet=Math.max(0,Math.floor(Number(plan?.budget)||0));
 // All costs are copper. A trial must be reasonable relative to *wallet*
 // regardless of how much capital is locked in standing orders. If wallet is
 // insufficient, the research shortlist simply has no fundable experiments.
 const perMarketBudget=Math.min(wallet,350000,Math.floor(wallet*0.35));
 const unitPriceCeiling=Math.min(50000,Math.floor(perMarketBudget/target));
 return {target,wallet,perMarketBudget,unitPriceCeiling};
}
function validateResearchCandidate(o,policy){
 if(!o||o.kind!=='research'||!valid(o.id)||!valid(o.buy)||!valid(o.exit)||
   !valid(o.quantity)||!valid(o.cost)||!valid(o.scenarioProfit))return false;
 if(o.quantity<policy.target||o.cost!==o.buy*o.quantity||o.cost>policy.perMarketBudget||
   o.cost>policy.wallet||o.buy>policy.unitPriceCeiling)return false;
 if(o.exit<=o.buy||o.fillForecast!==null||o.weeklyScenario!==null)return false;
 const afterFees=saleNet(o.exit,o.quantity);
 if(!finite(afterFees)||afterFees-o.cost!==o.scenarioProfit)return false;
 return true;
}
function researchLots(plan,{minLot=5,limit=220}={}){
 const policy=researchPolicy(plan,{minLot}),rows=[];
 if(policy.perMarketBudget<=0||policy.unitPriceCeiling<=0)return [];
 for(const c of (plan?.publicResearch||[])){
  // Quoted price spikes are a research caution, never evidence of traded volume.
  if(root.GPMarketFeed?.volatility?.(c?.id)?.caution)continue;
  if(!valid(c?.id)||!valid(c?.buy)||!valid(c?.exit)||c.buy>policy.unitPriceCeiling)continue;
  if(!finite(Date.parse(c.at))||Date.now()-Date.parse(c.at)>30*60000)continue;
  const observedQuotes=Number(c.observations)||0;
  // A single quote is a discovery lead, never a suggested experiment.
  if(observedQuotes<2||Number(c.buyQty||0)<policy.target||Number(c.sellQty||0)<2)continue;
  if(c.openBuys>0)continue; // already exposed; don't propose another probe
  const qty=Math.min(50,Math.floor(policy.perMarketBudget/c.buy),policy.target);
  if(qty<policy.target)continue;
  const cost=qty*c.buy,net=saleNet(c.exit,qty);
  if(!finite(net)||!Number.isSafeInteger(cost)||net<=cost)continue;
  const profit=net-cost,roi=profit/cost;
  if(!finite(roi)||roi<0.08||roi>1.50)continue;
  const lowRepeatability=/\b(infusion|skin|music box|ticket|tonic|miniature|recipe:?)\b/i.test(String(c.name||''));
  // Collectibles with a transient spread are not equivalent to re-stockable
  // equipment and materials. Research-only, and not promoted on spread alone.
  if(lowRepeatability && policy.target>=10)continue;
  const cashFactor=1/(1+cost/150000);
  const grossDensity=Math.min(1.5,roi);
  const competition=clamp(Math.log1p(Number(c.sellQty||0))/8,.25,1);
  const rankValue=cashFactor*competition*grossDensity*(lowRepeatability?.15:1);
  const record={...c,kind:'research',quantity:qty,cost,scenarioProfit:profit,
   rankValue,rankWeekly:0,weeklyScenario:null,fillForecast:null,tradeForecast:null,
   supportedOrderQty:0,observed24Reference:0,estimatedOvernightUnits:null,
   confidence:'Unproven discovery: NO measured fill or resale rate',
   evidence:'RESEARCH ONLY · valid quotes and bounded capital, not demonstrated overnight demand',
   sizeConstraint:'Explicitly chosen pilot quantity, NOT inferred overnight capacity',
   demonstratedCap:0,cap:0,exploratoryExtra:qty,unverifiedBulk:true,
   researchBudget:policy.perMarketBudget,unfunded:false};
  if(validateResearchCandidate(record,policy))rows.push(record);
 }
 rows.sort((a,b)=>b.rankValue-a.rankValue||a.cost-b.cost||a.id-b.id);
 return rows.slice(0,Math.max(0,Math.floor(Number(limit)||220)));
}
function researchWatchLeads(plan,{limit=30}={}){
 // Watch candidates are NOT buy proposals: no quantity or profit projection.
 // They stay visible during the first public scan, before repeat quotations exist.
 const wallet=Math.max(0,Number(plan?.budget)||0),out=[];
 for(const c of plan?.publicResearch||[]){
  if(!valid(c?.id)||!valid(c?.buy)||!valid(c?.exit)||c.openBuys>0)continue;
  if(!finite(Date.parse(c.at))||Date.now()-Date.parse(c.at)>30*60000)continue;
  if(c.buy>50000||c.buy>Math.max(1,wallet)*0.15)continue;
  const net=saleNet(c.exit,1);if(!finite(net)||net<=c.buy)continue;
  const roi=(net-c.buy)/c.buy;
  if(roi<.08||roi>1.50)continue;
  if(/\b(infusion|skin|music box|ticket|recipe:?)\b/i.test(String(c.name||'')))continue;
  const score=roi/(1+c.buy/25000)*Math.min(1,Math.log1p(c.sellQty||0)/5);
  out.push({...c,kind:'lead',quantity:0,cost:0,scenarioProfit:0,rankValue:score,
    fillForecast:null,weeklyScenario:null,confidence:'WATCH ONLY · quote needs measured buy/resale execution',
    evidence:'Unverified public quote; NO trade volume, cash commitment or income projection'});
 }
 out.sort((a,b)=>b.rankValue-a.rankValue||a.id-b.id);
 return out.slice(0,limit);
}
/* Observe actual remaining quantities on BUY orders over successive verified
 * account refreshes. A decrease for the SAME order ID is observed acquired
 * quantity. A disappeared order is unknown (canceled OR completed), so don't
 * call that a fill without a history match. API order book cannot give us the
 * original requested size for orders first seen partway through execution.
 */
function observeBuyOrderBook(previous,snapshot,now=Date.now()){
 if(snapshot?.buysVerified!==true||!Array.isArray(snapshot?.buys))return previous||{version:1,tracked:{},events:[],at:null};
 const old=previous?.version===1?previous:{version:1,tracked:{},events:[],at:null};
 const tracked=structuredClone(old.tracked||{}),events=(old.events||[]).filter(x=>finite(x.at)&&now-x.at<120*DAY),intervals=(old.intervals||[]).filter(x=>finite(x.to)&&now-x.to<120*DAY);
 const visible=new Set();
 for(const o of snapshot.buys){
  if(!valid(o?.id)||!valid(o?.item)||!valid(o?.price)||!valid(o?.q))continue;
  const key=String(o.id);visible.add(key);
  const prev=tracked[key];
  if(!prev){tracked[key]={id:o.id,item:o.item,price:o.price,firstSeenAt:now,lastSeenAt:now,firstRemaining:o.q,lastRemaining:o.q,observedFilled:0,closed:false};continue;}
  if(prev.item!==o.item||prev.price!==o.price||o.q>prev.lastRemaining){prev.closed=true;prev.closedAt=now;prev.censorReason='identity-price-or-size-change';continue;}
  if(prev.closed){continue;}
  if(now>prev.lastSeenAt&&o.q<=prev.lastRemaining){intervals.push({id:o.id,item:o.item,price:o.price,from:prev.lastSeenAt,to:now,fromQty:prev.lastRemaining,toQty:o.q});}
  if(o.q<prev.lastRemaining){const filled=prev.lastRemaining-o.q;
   events.push({id:o.id,item:o.item,price:o.price,q:filled,at:now,priorAt:prev.lastSeenAt});
   prev.observedFilled=(prev.observedFilled||0)+filled;
  }
  prev.lastRemaining=o.q;prev.lastSeenAt=now;
 }
 for(const [key,o]of Object.entries(tracked))if(!visible.has(key)&&!o.closed){
  o.closed=true;o.closedAt=now; // unknown cancellation vs completion
 }
 // Storage bound: retain enough observations for cross-night tests, not every
 // refresh of every order forever. Never lose current-open observations.
 const keys=Object.keys(tracked).sort((a,b)=>(tracked[b].lastSeenAt||0)-(tracked[a].lastSeenAt||0));
 for(const key of keys.slice(5000))delete tracked[key];
 return {version:1,at:now,tracked,events:events.slice(-12000),intervals:intervals.slice(-24000),
  limitation:'Observed reductions between verified snapshots only; missing orders are not assumed filled, and no market-wide turnover or predicted overnight fill probability is inferred.'};
}
function observeSellOrderBook(previous,snapshot,now=Date.now()){
 // Reuse the exact snapshot-delta algorithm on verified SELL orders. A
 // disappearing order remains ambiguous (cancelled or completely filled).
 return observeBuyOrderBook(previous,{buysVerified:snapshot?.sellsVerified===true,
   buys:Array.isArray(snapshot?.sells)?snapshot.sells:[]},now);
}
function observedFillsByItem(evidence,item,now=Date.now()){
 const events=(evidence?.events||[]).filter(x=>x.item===item&&finite(x.at)&&x.at<=now);
 // A 48-hour gap between checks must NOT be reported as a 24-hour fill.
 const recent=events.filter(x=>now-x.at<=24*HOUR&&finite(x.priorAt)&&x.at-x.priorAt<=24*HOUR&&x.priorAt>=now-24*HOUR),
  all=events.reduce((n,x)=>n+(x.q||0),0);
 return {last24h:recent.reduce((n,x)=>n+(x.q||0),0),sinceTracking:all,
  observations:events.length,firstObservationAt:events[0]?.at||null,
  trackedOrders:Object.values(evidence?.tracked||{}).filter(x=>x.item===item).length};
}
function publicResearchCandidates({quotes=[],metadata={},hist=null,exposures=new Map(),orderEvidence=null,sellOrderEvidence=null,now=Date.now()}={}){
 const seen=new Set(),out=[];
 for(const record of quotes){const q=record?.latest||record,id=q?.id;
  if(!valid(id)||seen.has(id))continue;seen.add(id);
  if(hist?.markets?.get(id)?.profitable)continue; // historical picks have their own lane
  if(!metadata[id]?.name)continue;
  const age=Date.parse(q.at);if(!finite(age)||age>now||now-age>25*60000)continue;
  const score=researchQuoteScore(q);if(!score)continue;
  const snapshots=(record.recent||[]).filter(r=>finite(Date.parse(r.at))&&now-Date.parse(r.at)<7*DAY);
  const distinct=snapshots.map(x=>Date.parse(x.at)).sort((a,b)=>a-b);
  const observations=distinct.length>=2&&last(distinct)-distinct[0]>=90*60000?2:1;
  const observed=observedFillsByItem(orderEvidence,id,now),sold=observedFillsByItem(sellOrderEvidence,id,now);
  out.push({...score,id,name:metadata[id].name,type:metadata[id].type||'',rarity:metadata[id].rarity||'',subtype:metadata[id]?.details?.type||'',buyQty:q.buyQty||0,sellQty:q.sellQty||0,
    observedOrderFills24h:observed.last24h,observedOrderFillsAll:observed.sinceTracking,observedOrderChecks:observed.observations,observedSellFills24h:sold.last24h,observedSellFillsAll:sold.sinceTracking,
    observations,at:q.at,openBuys:exposures.get(id)?.buyUnits||0,
    confidence:'Public quote only · completed trading volume unknown'});
 }
 out.sort((a,b)=>b.score-a.score||a.id-b.id);
 return out;
}
async function safeMetadata(api,ids,{signal}={}){
 const found={};
 async function visit(chunk){if(!chunk.length)return;
  if(signal?.aborted)throw Error('Extended discovery stopped');
  try{Object.assign(found,await api.itemMetadata(chunk,{signal}));}
  catch(e){
   // Only a 404 proves one or more item IDs are unusable. A 429 or network
   // timeout is NOT evidence of a bad ID: splitting it creates an API storm.
   if(e?.status!==404)throw e;
   if(chunk.length===1)return;
   const mid=Math.floor(chunk.length/2);
   await visit(chunk.slice(0,mid));await visit(chunk.slice(mid));
  }
 }
 for(let i=0;i<ids.length;i+=75)await visit(ids.slice(i,i+75));
 return found;
}
async function safePrices(api,ids,failures=[],{signal}={}){
 const found=[];
 async function visit(chunk){if(!chunk.length)return;
  if(signal?.aborted)throw Error('Extended discovery stopped');
  try{found.push(...await api.pricesForIds(chunk,{signal}));}
  catch(e){
   if(e?.status!==404)throw e;
   if(chunk.length===1){failures.push('Unavailable item '+chunk[0]);return;}
   const mid=Math.floor(chunk.length/2);
   await visit(chunk.slice(0,mid));await visit(chunk.slice(mid));
  }
 }
 await visit(ids);return found;
}
let seedCache=null;
let busy=false,queuedExpansion=null;
function queueExpanded(state,{immediate=false}={}){
 if(typeof setTimeout!=='function'||!state?.api||!state?.db)return false;
 if(state.opportunityDeepPaused||state.opportunityDeepBusy||queuedExpansion)return false;
 if(state.opportunityDeepLastStarted&&Date.now()-state.opportunityDeepLastStarted<45*60000)return false;
 queuedExpansion=setTimeout(()=>{
  queuedExpansion=null;
  if(busy){queueExpanded(state);return;}
  state.opportunityDeepBusy=true;
  state.opportunityDeepLastStarted=Date.now();
  state.opportunityDeepController=new AbortController();
  state.opportunityDeepStatus='Extended discovery started · saved trade recommendations remain available';
  root.GPFocus?.render?.();
  Promise.resolve().then(()=>refresh(state,{phase:'deep'})).then(()=>{
   state.opportunityDeepStatus='Expanded market and crafting research finished · refreshed results available';
  },e=>{
   state.opportunityDeepStatus=state.opportunityDeepController?.signal.aborted?'Expanded discovery stopped; earlier recommendations remain available':
    'Expanded discovery incomplete: '+String(e?.message||e).slice(0,130)+' · earlier recommendations remain available';
  }).finally(()=>{
   state.opportunityDeepBusy=false;state.opportunityDeepController=null;
   root.GPFocus?.render?.();
  });
 },immediate?20:2200);
 return true;
}
function stopExpanded(state){
 state.opportunityDeepPaused=true;
 if(queuedExpansion){clearTimeout(queuedExpansion);queuedExpansion=null;}
 state.opportunityDeepController?.abort();
 state.opportunityDeepStatus='Expanded discovery paused. Current recommendations remain available.';
 root.GPFocus?.render?.();
}
function resumeExpanded(state){
 state.opportunityDeepPaused=false;state.opportunityDeepLastStarted=0;
 return queueExpanded(state,{immediate:true});
}
async function refresh(state,{force=true,phase='quick'}={}){
 const deep=phase==='deep';
 if(busy)return state.opportunityPlan||null;
 if(!state?.api||!state?.db||!state?.account)throw Error('Connect your account first');
 const snap=state.snapshot;if(!snap||snap.account!==state.account||!Number.isSafeInteger(snap.wallet)||snap.wallet<0)throw Error('Verified wallet is unavailable');
 const at=Math.min(Date.parse(snap.at),Date.parse(snap.walletAt));if(!Number.isFinite(at)||Date.now()-at>40*60000)throw Error('Account snapshot is old. Refresh your account first.');
 if(snap.buysVerified!==true||snap.sellsVerified!==true)throw Error('Buy and sell orders were not both verified. Refresh your account.');
 busy=true;state.opportunityBusy=true;state.opportunityStatus='Analysing your saved trading history…';if(deep)state.opportunityDeepStatus=state.opportunityStatus;root.GPFocus?.render?.();
 try{
  const now=Date.now(),hist=history(state.ledger||[],now),open=[...(snap.buys||[]),...(snap.sells||[])];
  // FAST phase: never wait for a full public scan or recipe indexing just to
  // display the account's existing profitable trades. The background phase
  // completes wide discovery and safely replaces the provisional plan.
  state.opportunityStatus=deep?'Checking complete public-market coverage…':'Refreshing your existing market shortlist…';
  if(deep)state.opportunityDeepStatus=state.opportunityStatus;
  root.GPFocus?.render?.();
  const universe=deep?await ensurePublicUniverse(state,{now}):
    {complete:!!state.marketStatus?.complete,count:state.marketStatus?.count||0,at:state.marketStatus?.at||null,refreshed:false,phase:'existing-market-shortlist'};
  if(deep&&state.opportunityDeepController?.signal.aborted)throw Error('Extended discovery stopped');
  // Join an independently collected full public name catalogue BEFORE choosing
  // discovery candidates. This runs only during deep research; cached personal
  // recommendations remain usable if the external source is missing or slow.
  if(deep&&root.GPMarketFeed?.load){
   state.opportunityDeepStatus='Linking complete independent item catalogue…';root.GPFocus?.render?.();
   try{await root.GPMarketFeed.load(state);await root.GPMarketFeed.loadHistory();}
   catch(e){state.externalMarketStatus={error:String(e?.message||e).slice(0,100)};}
  }
  const recipeIndex=deep?await ensureRecipeUniverse(state,{now}):
    {complete:false,recipes:[],reason:'Craft recipes are indexing separately'};
  if(deep&&state.opportunityDeepController?.signal.aborted)throw Error('Extended discovery stopped');
  const craftSeeds=deep?await craftableEquipmentSeeds(state,recipeIndex.recipes||[],{limit:3600}):{ids:[],known:0,quoted:0};
  const publicSeeds=deep?await gatherPublicSeeds(state,hist,2100):{ids:[],seen:0,fresh:0,eligible:0};
  // Full snapshot item metadata + quotes select diverse AFFORDABLE exotic
  // equipment for a new LIVE quote check. Snapshot prices are never used as
  // trade instructions or proof of completed overnight volume.
  const affordableEquipmentIds=deep&&root.GPMarketFeed?.equipmentSeeds?
   root.GPMarketFeed.equipmentSeeds({limit:1750,maxBid:100000}):[];
  // Catalogue names are prerequisite to evaluating exotics; otherwise the
  // quote scanner silently rejects valid items as metadata-unverified.
  const catalogue=deep?await extendTradableCatalogue(state,{priorityIds:[...craftSeeds.ids,...publicSeeds.ids],maxNew:4800,rotateQuota:1600,
    signal:state.opportunityDeepController?.signal}):{indexed:0,requested:0,visited:0};
  const rotationKey='equipment-family-rotation-v1';
  const previousRotation=deep?(await state.db.get('config','global',rotationKey))?.value?.value||0:0;

  // Preserve all personally proven and existing positions; public discovery gets
  // substantial share, not the previous 95 candidate crumbs.
  const discovery=discoveryIds(hist,state.meta,open,[...publicSeeds.ids.map(id=>({id})),...(state.marketRadar||[])],deep?6500:800,craftSeeds.ids,previousRotation,affordableEquipmentIds);
  state.opportunityStatus='Refreshing current prices for '+discovery.ids.length+' candidate markets…';root.GPFocus?.render?.();
  const quotes=[],failures=[];
  // A just-completed public scan already supplies current price snapshots.
  // Reading them locally avoids immediately re-requesting thousands of IDs.
  const saved=await state.db.getMany('market','global',discovery.ids.map(id=>'quote:'+id));
  const freshIds=new Set();
  const quoteAgeLimit=deep?8*60000:6*60000;
  // The full scan can take minutes. Evaluate freshness at the time this
  // cache is read, not using the timestamp BEFORE the scan started; otherwise
  // new quotes look like future-dated records and thousands are fetched twice.
  const quoteClock=Date.now();
  for(const rec of saved){const q=rec?.latest,stamp=Date.parse(q?.at);
   if(q&&valid(q.id)&&finite(stamp)&&stamp<=quoteClock+30000&&quoteClock-stamp<quoteAgeLimit){quotes.push(q);freshIds.add(q.id);}}
  const needQuotes=discovery.ids.filter(id=>!freshIds.has(id));
  for(let i=0;i<needQuotes.length;i+=75){
   if(deep&&state.opportunityDeepController?.signal.aborted)throw Error('Extended discovery stopped');
   const batch=needQuotes.slice(i,i+75);
   quotes.push(...await safePrices(state.api,batch,failures,{signal:deep?state.opportunityDeepController?.signal:undefined}));
   state.opportunityStatus='Quote checks '+Math.min(i+75,needQuotes.length)+' / '+needQuotes.length+' · '+quotes.length+' current prices';
   if(deep)state.opportunityDeepStatus=state.opportunityStatus;
   if(i%450===0)root.GPFocus?.render?.();
  }
  if(!quotes.length)throw Error('No current market prices could be verified');
  const newQuotes=quotes.filter(q=>!freshIds.has(q.id));
  if(newQuotes.length)await state.db.upsertMarketBatch(newQuotes,{priorityIds:discovery.ids.slice(0,200)});
  const relevant=await state.db.getMany('market','global',quotes.map(q=>'quote:'+q.id));
  // Cost a broad pool of equipment recipes against current *material asks*.
  // Fetch only ingredients actually needed by the refreshed output candidates.
  const recipesByOutput=deep?recipeByOutput(recipeIndex.recipes||[]):new Map();
  const activeOutputIds=new Set(quotes.map(q=>q.id));
  const ingredientIds=new Set();
  for(const id of craftSeeds.ids)if(activeOutputIds.has(id))for(const recipe of recipesByOutput.get(id)||[]){
   if(recipe.ingredients?.every(i=>(i.type||'Item')==='Item'))for(const i of recipe.ingredients){const iid=Number(i.id??i.item_id);if(valid(iid))ingredientIds.add(iid);}
  }
  const allIngredientIds=[...ingredientIds],pricedIds=allIngredientIds.slice(0,3200);
  // Reuse quotes from a fresh full-market scan. On later refreshes, only
  // missing/stale inputs require an extra API call.
  const savedIngredientRecords=await state.db.getMany('market','global',pricedIds.map(id=>'quote:'+id));
  const freshSaved=savedIngredientRecords.filter(r=>r?.latest&&finite(Date.parse(r.latest.at))&&Math.abs(Date.now()-Date.parse(r.latest.at))<25*60000);
  const freshSavedIds=new Set(freshSaved.map(r=>r.latest.id));
  const missingIngredients=pricedIds.filter(id=>!activeOutputIds.has(id)&&!freshSavedIds.has(id));
  state.opportunityStatus='Checking '+missingIngredients.length+' stale crafting ingredient prices…';
  const ingredientQuotes=[];
  for(let i=0;i<missingIngredients.length;i+=75){
   if(deep&&state.opportunityDeepController?.signal.aborted)throw Error('Extended discovery stopped');
   ingredientQuotes.push(...await safePrices(state.api,missingIngredients.slice(i,i+75),failures,{signal:deep?state.opportunityDeepController?.signal:undefined}));
  }
  if(ingredientQuotes.length)await state.db.upsertMarketBatch(ingredientQuotes);
  const updatedIngredientRecords=await state.db.getMany('market','global',ingredientQuotes.map(q=>'quote:'+q.id));
  const ingredientRecords=[...freshSaved,...updatedIngredientRecords.filter(Boolean)];
  // Evaluate named item families rather than anonymous Item # IDs: stat-family
  // concentration limits must apply on the *first* build, not only after rerun.
  // Missing metadata is not a reason to discard valid quotes.
  const missingNames=[...new Set(quotes.map(q=>q.id))].filter(id=>!state.meta[id]?.name);
  let metaFetched=0;
  // Some retired item IDs 404 when batched. Split failures recursively rather
  // than abandoning 67 of 75 metadata results because one ID was invalid.
  let metadataWarning='';
  // Metadata hydration is deliberately bounded and never the critical gate
  // for displaying an otherwise quote-verified trade on a slow connection.
  try{const resolved=await safeMetadata(state.api,missingNames.slice(0,deep?5000:120),
    {signal:deep?state.opportunityDeepController?.signal:undefined});
   Object.assign(state.meta,resolved);metaFetched=Object.keys(resolved).length;
   if(metaFetched)await state.db.putMetadataBatch(resolved);
  }catch(e){if(deep&&state.opportunityDeepController?.signal.aborted)throw e;
   metadataWarning='Some item names could not be refreshed: '+String(e?.message||e).slice(0,70);}
  if(deep)state.opportunityDeepStatus='Evaluating '+quotes.length+' prices with '+metaFetched+' updated item names…';
  // Optional independent cloud evidence; absence never fabricates trade volume.
  let signals=state.cloudSignals instanceof Map?state.cloudSignals:new Map();
  try{if(deep&&root.PeanutCloud?.load){
   const top=quotes.slice(0,48),ids=top.map(q=>q.id),prices=Object.fromEntries(top.map(q=>[q.id,{ask:q.sell,buy:q.buy}]));
   const cloud=await root.PeanutCloud.load(ids,prices,undefined,Date.now());
   if(cloud?.signals instanceof Map){signals=cloud.signals;state.cloudSignals=signals;}
  }}catch{ /* Do not fail a verified personal-data evaluation if cloud is unavailable. */ }
  // Fetch account-scoped, zero-inclusive cloud fill evidence for the
  // highest-priority QUOTED markets. Only complete 18:00–10:00 UTC nights
  // qualify. Legacy active-day trades remain useful, but distinct from this
  // new evidence. A failed background lookup never invents a fill rate.
  const privateNights=new Map(),cloudMonitor=root.GPCloudAccount;
  if(cloudMonitor?.primeNights&&cloudMonitor.status?.(state.account)?.enabled){
   const quoted=new Set(quotes.map(q=>q.id));
   const ids=[...new Set([
    ...hist.ranked.slice(0,35).map(x=>x.id),
    ...(snap.buys||[]).slice(0,30).map(x=>x.item),
    ...(snap.sells||[]).slice(0,20).map(x=>x.item)
   ])].filter(id=>quoted.has(id)).slice(0,40);
   try{
    const result=await cloudMonitor.primeNights(state,ids);
    for(const [id,data]of result)privateNights.set(id,data);
   }catch(e){state.privateNightStatus='Cloud night lookup incomplete; saved market history retained';}
  }
  const plan=evaluate({learning:state.executionLearning||{},ledger:state.ledger,quotes:relevant.filter(Boolean),metadata:state.meta,snapshot:snap,now:Date.now(),budget:snap.wallet,
   avoid:[...(state.avoidMarkets||[])],cloudSignals:signals,style:document?.getElementById('allocation-style')?.value||'balanced'});
  if(!plan.ok)throw Error(plan.reason);
  const freshRecords=relevant.filter(Boolean);
  plan.craftResearch=analyseCraftRoutes({recipes:recipeIndex.recipes||[],quotes:[...freshRecords,...ingredientRecords.filter(Boolean)],metadata:state.meta,now:Date.now()});
  plan.craftResearch.status={recipeIndexComplete:!!recipeIndex.complete,recipesIndexed:(recipeIndex.recipes||[]).length,
   recipeEquipmentOutputs:craftSeeds.known,availableOutputQuotes:craftSeeds.quoted,seeded:craftSeeds.ids.length,
   selectedOutputQuotes:craftSeeds.ids.filter(id=>activeOutputIds.has(id)).length,
   ingredientQuotesRequested:missingIngredients.length,ingredientIdsTotal:allIngredientIds.length,
   ingredientCoverageComplete:allIngredientIds.length===pricedIds.length,recipeError:recipeIndex.reason||null};
  plan.publicResearch=publicResearchCandidates({quotes:freshRecords,metadata:state.meta,hist,
   exposures:position(snap),orderEvidence:state.orderEvidence,sellOrderEvidence:state.sellOrderEvidence,now:Date.now()});
  plan.buyOrderEvidence=state.orderEvidence;plan.sellOrderEvidence=state.sellOrderEvidence;
  // The market board consumes measured cloud nights and adjusts its cautious
  // buy/resale capacity research. These do NOT become fabricated 24h cohorts.
  plan.privateNightEvidence=Object.fromEntries([...privateNights].map(([id,v])=>[id,v]));
  plan.privateNightMarkets=[...privateNights.values()].filter(v=>v.supported).length;
  // Craftability is a supply hypothesis, not a verified overnight fill rate.
  const makerMap=new Map(plan.craftResearch.rows.map(x=>[x.id,x]));
  const markSupply=(c)=>{const recipes=recipesByOutput.get(c?.id);if(!recipes?.length)return;
   const maker=makerMap.get(c.id);
   c.craftableSupply={recipeCount:recipes.length,source:'public craft recipes · no measured overnight turnover',
      makerProfitAtCurrentBid:maker?.makerProfitAtCurrentBid??null};};
  for(const c of plan.publicResearch)markSupply(c);
  for(const c of [...(plan.marketChoices||[]),...(plan.orders||[]),...(plan.watch||[])])markSupply(c);
  plan.fullMarketScan=universe;
  plan.publicDiscovery={knownQuoteItems:publicSeeds.seen,freshQuotes:publicSeeds.fresh,
   broadMarginCandidates:publicSeeds.eligible,shortlisted:publicSeeds.ids.length,
   quoted:quotes.length,research:plan.publicResearch.length,complete:!!universe.complete};
  plan.equipmentAudit=equipmentCoverageAudit({metadata:state.meta,discoveryIds:discovery.ids,quotes,plan});
  plan.equipmentAudit.source='Market-wide tradable quote scan with selective metadata hydration; not limited to locally known names';
  plan.candidateRefresh={checked:discovery.ids.length,returned:quotes.length,publicSeedCount:publicSeeds.ids.length,affordableExoticSeeds:affordableEquipmentIds.length,
   storedMarketsScreened:publicSeeds.seen,historyMarkets:hist.markets.size,metaFetched,sourceCounts:{},failures,
   phase:deep?'expanded':'quick',metadataWarning,catalogue};
  for(const id of discovery.ids)plan.candidateRefresh.sourceCounts[discovery.reasons.get(id)||'other']=(plan.candidateRefresh.sourceCounts[discovery.reasons.get(id)||'other']||0)+1;
  // Same fresh quotes, same economic evaluation, different *hypothetical* existing-buy exposure.
  // This does not mutate the account, place orders, or release committed coins.
  try{plan.activeBook=activeBookScenario({ledger:state.ledger,quotes:relevant.filter(Boolean),snapshot:snap,now:Date.now()});
   plan.capitalReview=capitalReview({learning:state.executionLearning||{},ledger:state.ledger,quotes:relevant.filter(Boolean),metadata:state.meta,snapshot:snap,
      now:Date.now(),avoid:[...(state.avoidMarkets||[])],cloudSignals:signals,
      style:document?.getElementById('allocation-style')?.value||'balanced',current:plan});}
  catch{plan.capitalReview={error:'Capital comparison temporarily unavailable; wallet allocation remains verified.'};}
  for(const scenario of [plan.capitalReview?.selective,plan.capitalReview?.allReleased])
   for(const c of [...(scenario?.marketChoices||[]),...(scenario?.orders||[])])markSupply(c);
  for(const scenario of [plan.capitalReview?.selective,plan.capitalReview?.allReleased])if(scenario){
   scenario.buyOrderEvidence=state.orderEvidence;scenario.sellOrderEvidence=state.sellOrderEvidence;
  }
  // Never overwrite a newer account check with a portfolio built from an
  // older wallet/order snapshot while an extended scan was running.
  if(state.account!==snap.account||state.snapshot?.at!==snap.at)
   throw Error('Account changed during discovery; refresh the current shortlist');
  plan.publicCatalogue=state.externalMarketStatus||{source:'official-API-only',items:0};
  plan.marketHistoryStatus=root.GPMarketFeed?.status?.()||null;
  state.opportunityPlan=plan;state.opportunityAt=Date.now();
  // Daily public price history is optional corroborating PRICE evidence only;
  // it cannot supply unknown personal overnight fill probabilities.
  if(deep&&root.GPMarketFeed?.loadHistory)void root.GPMarketFeed.loadHistory().then(()=>{
   if(state.opportunityPlan===plan){plan.marketHistoryStatus=root.GPMarketFeed.status();root.GPFocus?.render?.();}
  }).catch(()=>{});
  root.GPFocus?.render?.(); // Visible as soon as the plan is valid; metadata polish is optional.
  try{
   const key='opportunity-journal-v7',old=(await state.db.get('config',state.account,key))?.value?.entries||[],
     same=old[0]&&now-old[0].at<30*60000&&old[0].hash===plan.orders.map(o=>o.id+':'+o.quantity+':'+o.buy).join(',');
   if(!same){const entry={at:now,account:state.account,hash:plan.orders.map(o=>o.id+':'+o.quantity+':'+o.buy).join(','),
    source:'wallet',wallet:plan.budget,committed:plan.spent,orders:plan.orders.slice(0,30).map(o=>({id:o.id,buy:o.buy,qty:o.quantity,exit:o.exit,scenario:o.scenarioProfit,tier:o.tier}))};
    await state.db.put('config',state.account,key,{version:7,entries:[entry,...old].slice(0,45)});}
  }catch{plan.journalWarning='Recommendation research journal could not be saved; no historical trades were changed.';}
  if(deep)try{await state.db.put('config','global',rotationKey,{value:previousRotation+1,at:new Date().toISOString()});}catch{}
  state.opportunityStatus=(deep?'Expanded market scan · ':'Initial shortlist · ')+
   (plan.orders.length?'best funded opportunities calculated.':'no wallet-funded orders met the current checks; review alternatives.');
  // Hydrate only the ranked item artwork and short-list names, so first use is fast.
  const need=[...new Set([...plan.orders,...plan.watch.slice(0,16)].map(x=>x.id))].filter(id=>!state.meta[id]?.name||!state.meta[id]?.icon).slice(0,deep?70:20);
  if(need.length&&!state.opportunityDeepController?.signal.aborted)try{const metadata=await state.api.itemMetadata(need,{signal:deep?state.opportunityDeepController?.signal:undefined});Object.assign(state.meta,metadata);await state.db.putMetadataBatch(metadata);}catch{}
  root.GPFocus?.render?.();
  return plan;
 }catch(e){
  // A failed background scan NEVER removes the last quote-verified shortlist.
  state.opportunityStatus=(deep?'Expanded research failed: ':'Could not refresh current shortlist: ')+String(e?.message||'Unknown error').slice(0,150);
  if(deep)state.opportunityDeepStatus=state.opportunityStatus;
  throw e;
 }
 finally{busy=false;state.opportunityBusy=false;root.GPFocus?.render?.();
  if(!deep&&state.opportunityPlan?.ok)queueExpanded(state);
 }
}
root.GPOpportunity={buildId:MARKET_BUILD,validateOvernightModel,equipmentFamily,extendTradableCatalogue,observeSellOrderBook,nightlyExposure,tradingNightKey,researchPolicy,validateResearchCandidate,researchWatchLeads,history,discoveryIds,equipmentVariantSeeds,equipmentCoverageAudit,position,findQuantity,evaluate,capitalReview,activeBookScenario,rankedMarkets,historicalExperiments,earningsPace,gatherPublicSeeds,ensurePublicUniverse,researchQuoteScore,publicResearchCandidates,researchLots,observeBuyOrderBook,observedFillsByItem,ensureRecipeUniverse,craftableEquipmentSeeds,analyseCraftRoutes,craftLots,recipeByOutput,safeMetadata,safePrices,refresh,queueExpanded,stopExpanded,resumeExpanded,saleNet};
if(typeof module!=='undefined'&&module.exports)module.exports=root.GPOpportunity;
})(typeof globalThis!=='undefined'?globalThis:this);
