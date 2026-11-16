export const TAX_EXEMPT_NAMES = new Set([
  'old school bond','old school bonds','energy potion',
  'bronze arrow','bronze dart','iron arrow','iron dart','mind rune','steel arrow','steel dart',
  'bass','bread','cake','cooked chicken','cooked meat','herring','lobster','mackerel','meat pie','pike','salmon','shrimps','tuna',
  'ardougne teleport','camelot teleport','civitas illa fortis teleport','falador teleport','games necklace(8)','kourend castle teleport','lumbridge teleport','ring of dueling(8)','teleport to house','varrock teleport',
  'chisel','gardening trowel','glassblowing pipe','hammer','needle','pestle and mortar','rake','saw','secateurs','seed dibber','shears','spade','watering can'
]);
export const number = (v, fallback=0) => v !== null && v !== '' && Number.isFinite(Number(v)) ? Number(v) : fallback;
export const MAX_GP = 9_000_000_000_000;
export const validGP = v => Number.isSafeInteger(v) && v > 0 && v <= MAX_GP;
export const gp = n => Number.isFinite(n) ? Math.round(n).toLocaleString('en-GB') + ' gp' : '—';
export const compact = n => !Number.isFinite(n) ? '—' : Math.abs(n) >= 1e9 ? (n/1e9).toFixed(2).replace(/\.00$/,'')+'b' : Math.abs(n)>=1e6 ? (n/1e6).toFixed(2).replace(/\.00$/,'')+'m' : Math.abs(n)>=1e3 ? (n/1e3).toFixed(1).replace(/\.0$/,'')+'k' : Math.round(n).toLocaleString('en-GB');
export function taxPerItem(sellPrice, itemName='') {
  const sell = Math.max(0, Math.floor(number(sellPrice)));
  const name=String(itemName).trim().toLowerCase();
  if (TAX_EXEMPT_NAMES.has(name) || /^energy potion\([1-4]\)$/.test(name) || /^old school bond(s)?( \(untradeable\))?$/.test(name)) return 0;
  return Math.min(5_000_000, Math.floor(sell / 50));
}
export function afterTaxMargin(buy, sell, name) {return Math.floor(sell)-Math.floor(buy)-taxPerItem(sell,name);}
export function asItems(mapping,latest,five,hour,now=Date.now()/1000){
  const prices=latest?.data||{}, f=five?.data||{}, h=hour?.data||{};
  return (Array.isArray(mapping) ? mapping : []).flatMap(item=>{
    const p=prices[item.id], q=h[item.id], m=f[item.id];
    const buy=number(p?.low, NaN), sell=number(p?.high, NaN), limit=number(item.limit,NaN);
    if (!validGP(buy) || !validGP(sell)) return [];
    const profit=afterTaxMargin(buy,sell,item.name);
    const buyTime=number(p?.lowTime),sellTime=number(p?.highTime);
    const age=buyTime>0&&sellTime>0&&buyTime<=now+60&&sellTime<=now+60 ? Math.max(0,now-buyTime,now-sellTime)/60 : Infinity;
    const buyVol=number(q?.lowPriceVolume), sellVol=number(q?.highPriceVolume);
    const hourFresh=Number.isFinite(hour?.timestamp) ? now-hour.timestamp<=10800 && hour.timestamp<=now+60 : true;
    const fiveFresh=Number.isFinite(five?.timestamp)&&now-five.timestamp<=1200&&five.timestamp<=now+60;
    const flow=hourFresh?Math.min(buyVol,sellVol):0;
    const latestFlow=Math.min(number(m?.lowPriceVolume),number(m?.highPriceVolume));
    const avgLow=number(q?.avgLowPrice),avgHigh=number(q?.avgHighPrice);
    const drift=avgLow>0&&avgHigh>0? Math.max(Math.abs(buy-avgLow)/avgLow,Math.abs(sell-avgHigh)/avgHigh) : NaN;
    const heuristicCap=Math.max(0,Math.floor(flow*4*.01)); // 1% of observed min(side) hourly trade flow over 4h; NOT a fill forecast.
    const cap=Number.isFinite(limit)&&limit>0 ? Math.floor(limit):null;
    const potentialQty=cap===null?0:Math.min(cap,heuristicCap);
    const spreadPct=profit/buy*100;
    const reliability=(age>240?0:age>90?.7:1) * (!Number.isFinite(drift)?0.5:drift>0.3?0.3:drift>0.1?.75:1);
    const marketPotential=potentialQty*profit;
    return [{id:item.id,name:item.name,members:!!item.members,icon:item.icon||null,buy,sell,age,limit:cap,
      profit,spreadPct,avgHigh:avgHigh,avgLow:avgLow,fiveHigh:number(m?.avgHighPrice,NaN),fiveLow:number(m?.avgLowPrice,NaN),hourFresh,fiveFresh,buyVol,sellVol,flow,latestFlow,drift,heuristicCap,potentialQty,
      marketPotential,score:marketPotential*reliability,highTime:sellTime,lowTime:buyTime}];
  });
}
export function filterMarkets(items, opts={}){
  const query=String(opts.query||'').trim().toLowerCase();
  return items.filter(i=>i.profit>0 && i.buy>0 && i.sell>0 && i.age<=number(opts.maxAge,120)
    && (opts.members!==false || !i.members) && i.flow>=number(opts.minVolume,50)
    && i.limit!==null && i.potentialQty>0 && i.spreadPct<40 &&
    Number.isFinite(i.drift) && i.drift<=0.3 &&
    (!query || i.name.toLowerCase().includes(query) || String(i.id)===query))
    .sort((a,b)=> b.score-a.score || b.marketPotential-a.marketPotential || b.profit-a.profit);
}
export function rankMarkets(items,budget,sort='opportunity'){
 const score=i=>Math.min(i.potentialQty,Math.floor(budget/i.buy))*i.profit*(i.marketPotential>0?i.score/i.marketPotential:0);
 return [...items].filter(i=>i.buy<=budget).sort((a,b)=>(sort==='profit'?b.profit-a.profit:sort==='roi'?b.spreadPct-a.spreadPct:score(b)-score(a))||a.id-b.id);
}
export function plan(items,budget=10_000_000,slots=8,used={},options={}){
  let remaining=Math.max(0,Math.min(MAX_GP,Math.floor(number(budget)))), allocated=0;
  const capitalBase=Math.max(0,Math.min(MAX_GP,Math.floor(number(options.capitalBase,remaining))));
  const reserve=Math.floor(capitalBase*Math.max(0,Math.min(1,number(options.reserve,0))));
  const maxCost=Math.floor(capitalBase*Math.max(0,Math.min(1,number(options.maxShare,1))));
  const selected=[],seen=new Set();
  for(const item of rankMarkets(items,Math.min(maxCost,remaining-reserve))){
    if(selected.length>=slots)break;
    if(seen.has(item.id))continue;
    if(!(item.profit>0)||!Number.isSafeInteger(item.limit)||item.limit<1)continue;
    const qty=Math.min(item.potentialQty,Math.max(0,item.limit-(used[item.id]||0)),Math.floor(Math.min(maxCost,remaining-reserve)/item.buy));
    if(qty<1)continue;
    const cost=qty*item.buy, opportunity=qty*item.profit;
    seen.add(item.id);selected.push({...item,qty,cost,opportunity,remaining:remaining-cost});
    remaining-=cost;allocated+=cost;
  }
  return {selected,allocated,remaining,reserve,maxCost,total: selected.reduce((sum,i)=>sum+i.opportunity,0)};
}
export function realizedLedger(trades=[]){
  const inventory=new Map();let profit=0, matchedUnits=0, unmatchedUnits=0,adjustmentCost=0,adjustmentAddedCost=0,unmatchedAdjustments=0;
  const matched=[];
  const rows=trades.map((trade,index)=>({...trade,index})).sort((a,b)=>number(new Date(a.date).getTime())-number(new Date(b.date).getTime()));
  for(const trade of rows){
    const id=String(trade.id||trade.name||'').toLowerCase();
    const qty=Math.max(0,Math.floor(number(trade.qty))),price=Math.max(0,Math.floor(number(trade.price)));
    if(!id||!validGP(qty)||!validGP(price)||!Number.isSafeInteger(qty*price)||!Number.isFinite(Date.parse(trade.date)))continue;
    if(trade.side==='buy'||trade.side==='adjust-in'){
      const lots=inventory.get(id)||[];lots.push({qty,price,name:trade.name,id:trade.id,date:trade.date,adjusted:trade.side==='adjust-in'});if(trade.side==='adjust-in')adjustmentAddedCost+=qty*price;inventory.set(id,lots);
    }else if(trade.side==='sell'||trade.side==='adjust-out'){
      const lots=inventory.get(id)||[];let left=qty,matchCost=0,units=0;const matchedLots=[];
      while(left&&lots.length){const take=Math.min(left,lots[0].qty);matchCost+=take*lots[0].price;matchedLots.push({qty:take,date:lots[0].date,price:lots[0].price,adjusted:lots[0].adjusted});lots[0].qty-=take;left-=take;units+=take;if(!lots[0].qty)lots.shift();}
      inventory.set(id,lots);if(trade.side==='adjust-out'){adjustmentCost+=matchCost;unmatchedAdjustments+=left;continue;}unmatchedUnits+=left;
      if(units){const actualTax=Number.isSafeInteger(trade.taxPaid)&&trade.taxPaid>=0?Number((BigInt(trade.taxPaid)*BigInt(units)+BigInt(qty)-1n)/BigInt(qty)):units*taxPerItem(price,trade.name);const gain=units*price-actualTax-matchCost;matched.push({id:trade.id,cost:matchCost,lots:matchedLots,index:trade.index,name:trade.name||id,qty:units,gain,tax:actualTax,date:trade.date});profit+=gain;matchedUnits+=units;}
    }
  }
  const holdingUnits=[...inventory.values()].flat().reduce((s,x)=>s+x.qty,0);
  const holdings=[...inventory.values()].filter(l=>l.length).map(l=>({id:l[0].id,name:l[0].name,qty:l.reduce((s,x)=>s+x.qty,0),cost:l.reduce((s,x)=>s+x.qty*x.price,0),oldest:l[0].date,adjusted:l.some(x=>x.adjusted)}));
  return {profit,matchedUnits,unmatchedUnits,holdingUnits,matched,holdings,adjustmentCost,adjustmentAddedCost,unmatchedAdjustments};
}

// Conservative rolling window: recorded buys in the last four hours reduce capacity.
export function recentPurchases(trades,now=Date.now()){
 const used={};for(const t of trades)if(t.side==='buy'&&Date.parse(t.date)>now-4*3600000&&Date.parse(t.date)<=now)used[t.id]=(used[t.id]||0)+t.qty;return used;
}
export function periodProfit(ledger,now=new Date()){
 const start=new Date(now);start.setHours(0,0,0,0);const week=new Date(start);week.setDate(week.getDate()-6);
 return {today:ledger.matched.filter(t=>Date.parse(t.date)>=+start&&Date.parse(t.date)<=+now).reduce((s,t)=>s+t.gain,0),week:ledger.matched.filter(t=>Date.parse(t.date)>=+week&&Date.parse(t.date)<=+now).reduce((s,t)=>s+t.gain,0)};
}

export function screeningReasons(item,opts={}){
 const reasons=[];
 if(!validGP(item.buy)||!validGP(item.sell))return ['Missing buy or sell observation'];
 if(!(item.profit>0))reasons.push('No positive margin after tax');
 if(!Number.isFinite(item.age)||item.age>number(opts.maxAge,120))reasons.push('Prices are stale or undated');
 if(opts.members===false&&item.members)reasons.push('Members item');
 if(item.limit===null)reasons.push('Unknown four-hour buy limit');
 if(item.flow<number(opts.minVolume,50)||!item.potentialQty)reasons.push('Insufficient recent two-way volume');
 if(item.spreadPct>=40)reasons.push('Unusually wide spread');
 if(!Number.isFinite(item.drift)||item.drift>0.3)reasons.push('Missing or divergent hourly prices');
 return reasons;
}
