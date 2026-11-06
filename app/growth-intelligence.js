/* Golden Peanut 6.1 Growth Intelligence.
   Read-only, FIFO-matched, item-level realised earnings for the same seven UK
   calendar dates as PeanutCore.summarizeLedger. No public book quantities are
   counted as completed trades, and no order execution is initiated. */
(function(root){
'use strict';
const DAY=86400000;
let lastLedger=null,lastLen=-1,lastTail='',lastNowDay='',lastResult=null;
const valid=(v,min=0)=>Number.isSafeInteger(v)&&v>=min;
function weeklyByMarket(ledger=[],now=Date.now()){
 const Core=root.PeanutCore;if(!Core||!Array.isArray(ledger))return {markets:[],byId:new Map(),totalP100:0,matched7:0,unknown7:0};
 const today=Core.ukDay(now),start=Core.shiftDay(today,-6),tail=ledger.length?ledger[ledger.length-1]:null;
 const signature=tail?[tail.key,tail.q,tail.purchased].join('|'):'';
 if(ledger===lastLedger&&ledger.length===lastLen&&signature===lastTail&&today===lastNowDay&&lastResult)return lastResult;
 const byId=new Map();
 const entry=id=>{let e=byId.get(id);if(!e){e={id,buys:[],sells:[],profitP100:0,matched7:0,unknown7:0,sold7:0,bought7:0,buyDays:new Set(),sellDays:new Set(),saleValueP100:0};byId.set(id,e);}return e;};
 for(const r of ledger){if(!valid(r?.item,1)||!valid(r?.q,1)||!valid(r?.price,1)||!Number.isFinite(r.purchased)||r.purchased<=0)continue;
  if(r.side!=='buy'&&r.side!=='sell')continue;
  const e=entry(r.item),d=Core.ukDay(r.purchased),inWeek=d>=start&&d<=today;
  (r.side==='buy'?e.buys:e.sells).push(r);
  if(inWeek){if(r.side==='buy'){e.bought7+=r.q;e.buyDays.add(d);}else{e.sold7+=r.q;e.sellDays.add(d);}}
 }
 const markets=[];let totalP100=0,matched7=0,unknown7=0;
 for(const e of byId.values()){
  if(!e.sells.length)continue;
  const buys=e.buys.sort((a,b)=>a.purchased-b.purchased||a.id-b.id).map(b=>({at:b.purchased,id:b.id,price:b.price,left:b.q}));
  const sells=e.sells.sort((a,b)=>a.purchased-b.purchased||a.id-b.id);let i=0;
  for(const s of sells){let remain=s.q,matched=0,cost=0;
   while(remain>0&&i<buys.length){const b=buys[i];if(b.at>s.purchased)break;
    if(b.left<=0){i++;continue;}const qty=Math.min(b.left,remain);remain-=qty;matched+=qty;cost+=qty*b.price;b.left-=qty;if(!b.left)i++;
   }
   const d=Core.ukDay(s.purchased);
   if(d<start||d>today)continue;
   const profit=Core.saleRevenueP100(s.price,s.q,matched)-cost*100;
   e.profitP100+=profit;e.matched7+=matched;e.unknown7+=remain;e.saleValueP100+=Core.saleRevenueP100(s.price,s.q,matched);
  }
  if(e.sold7||e.bought7){
   markets.push({id:e.id,profitP100:e.profitP100,profit:e.profitP100/100,matched7:e.matched7,unknown7:e.unknown7,
    sold7:e.sold7,bought7:e.bought7,buyDays7:e.buyDays.size,saleDays7:e.sellDays.size,
    coverage:e.sold7?e.matched7/e.sold7:1});
  }
  totalP100+=e.profitP100;matched7+=e.matched7;unknown7+=e.unknown7;
 }
 markets.sort((a,b)=>b.profitP100-a.profitP100||b.matched7-a.matched7||a.id-b.id);
 const result={markets,byId:new Map(markets.map(x=>[x.id,x])),totalP100,matched7,unknown7,start,end:today};
 lastLedger=ledger;lastLen=ledger.length;lastTail=signature;lastNowDay=today;lastResult=result;return result;
}
function verifiedSnapshot(s){return s?.snapshot?.account===s?.account?s.snapshot:null;}
function marketPosition(s,id){const snap=verifiedSnapshot(s);if(!snap)return {openBuys:0,openSells:0,reserved:0,listed:0};
 let openBuys=0,openSells=0,reserved=0,listed=0;
 for(const b of snap.buys||[])if(b.item===id&&valid(b.q,1)&&valid(b.price,1)){openBuys+=b.q;reserved+=b.q*b.price;}
 for(const b of snap.sells||[])if(b.item===id&&valid(b.q,1)){openSells+=b.q;listed+=b.q*b.price;}
 return {openBuys,openSells,reserved,listed};
}
function weeklyGoal(){try{const v=Number(localStorage.getItem('gp-growth-goal-v1'));if([1000,1500,2000,3000,5000].includes(v))return v;}catch{}return 2000;}
function goalProgress(s){const realised=Number.isFinite(s?.summary?.weekP100)?s.summary.weekP100/100:null,goal=weeklyGoal()*10000;
 return {realised,goal,remaining:realised===null?null:Math.max(0,goal-realised),fraction:realised===null?0:Math.max(0,Math.min(1,realised/goal))};
}

/* Market Memory — every preserved historical buy/sell row, not just the last 7–30 days.
   All currency values are hundredths of copper (p100) to reconcile to Core FIFO.
   Historical returns inform what to RESEARCH; they never establish current demand. */
let memoryCache=null,memoryLedger=null,memoryLength=-1,memoryTail='',memoryDay='';
function allHistory(ledger=[],now=Date.now()){
 const Core=root.PeanutCore;
 if(!Core||!Array.isArray(ledger))return {markets:[],byId:new Map(),totalP100:0,savedRows:0,oldest:null,newest:null};
 const today=Core.ukDay(now),last=ledger.length?ledger[ledger.length-1]:null;
 const sig=last?[last.key,last.item,last.q,last.purchased].join('|'):'';
 if(memoryCache&&ledger===memoryLedger&&ledger.length===memoryLength&&sig===memoryTail&&memoryDay===today)return memoryCache;
 const cutoff={days7:Core.shiftDay(today,-6),days30:Core.shiftDay(today,-29),days90:Core.shiftDay(today,-89),days365:Core.shiftDay(today,-364)};
 const grouped=new Map();let oldest=Infinity,newest=0;
 const take=id=>{let e=grouped.get(id);if(!e){e={id,buys:[],sells:[],matchedAll:0,unknownAll:0,matched7:0,unknown7:0,sold7:0,bought7:0,
   matched30:0,unknown30:0,sold30:0,bought30:0,sold365:0,bought365:0,profitP100:0,profit7P100:0,profit30P100:0,profit90P100:0,profit365P100:0,
   buyRows:0,sellRows:0,buyDays:new Set(),sellDays:new Set(),buyDays365:new Set(),sellDays365:new Set(),
   firstActivity:Infinity,lastActivity:0,lastBuy:0,lastSale:0};grouped.set(id,e);}return e;};
 for(const r of ledger){
  if(!valid(r?.item,1)||!valid(r?.q,1)||!valid(r?.price,1)||!Number.isFinite(r.purchased)||r.purchased<=0||r.purchased>now)continue;
  if(r.side!=='buy'&&r.side!=='sell')continue;
  const e=take(r.item),d=Core.ukDay(r.purchased);
  oldest=Math.min(oldest,r.purchased);newest=Math.max(newest,r.purchased);e.firstActivity=Math.min(e.firstActivity,r.purchased);e.lastActivity=Math.max(e.lastActivity,r.purchased);
  if(r.side==='buy'){
   e.buys.push(r);e.buyRows++;e.lastBuy=Math.max(e.lastBuy,r.purchased);
   if(d>=cutoff.days7&&d<=today)e.bought7+=r.q;
   if(d>=cutoff.days30&&d<=today)e.bought30+=r.q;
   if(d>=cutoff.days365&&d<=today){e.bought365+=r.q;e.buyDays365.add(d);}
   e.buyDays.add(d);
  }else{
   e.sells.push(r);e.sellRows++;e.lastSale=Math.max(e.lastSale,r.purchased);
   if(d>=cutoff.days7&&d<=today)e.sold7+=r.q;
   if(d>=cutoff.days30&&d<=today)e.sold30+=r.q;
   if(d>=cutoff.days365&&d<=today){e.sold365+=r.q;e.sellDays365.add(d);}
   e.sellDays.add(d);
  }
 }
 const markets=[];let totalP100=0,matchedAll=0,unknownAll=0,profit7P100=0;
 for(const e of grouped.values()){
  // FIFO matches only purchases already completed when the sale occurred.
  const buys=e.buys.sort((a,b)=>a.purchased-b.purchased||a.id-b.id).map(r=>({left:r.q,at:r.purchased,price:r.price}));
  const sells=e.sells.sort((a,b)=>a.purchased-b.purchased||a.id-b.id);let i=0;
  for(const sale of sells){let remainder=sale.q,matched=0,cost=0;
   while(remainder>0&&i<buys.length){const b=buys[i];if(b.at>sale.purchased)break;
    if(b.left<=0){i++;continue;}const units=Math.min(b.left,remainder);b.left-=units;remainder-=units;matched+=units;cost+=units*b.price;if(!b.left)i++;
   }
   const gain=Core.saleRevenueP100(sale.price,sale.q,matched)-cost*100,day=Core.ukDay(sale.purchased);
   e.matchedAll+=matched;e.unknownAll+=remainder;e.profitP100+=gain;
   if(day>=cutoff.days365&&day<=today)e.profit365P100+=gain;
   if(day>=cutoff.days90&&day<=today)e.profit90P100+=gain;
   if(day>=cutoff.days30&&day<=today){e.profit30P100+=gain;e.matched30+=matched;e.unknown30+=remainder;}
   if(day>=cutoff.days7&&day<=today){e.profit7P100+=gain;e.matched7+=matched;e.unknown7+=remainder;}
  }
  e.profit=e.profitP100/100;e.profit7=e.profit7P100/100;e.profit30=e.profit30P100/100;e.profit90=e.profit90P100/100;e.profit365=e.profit365P100/100;
  e.coverage=e.matchedAll+e.unknownAll>0?e.matchedAll/(e.matchedAll+e.unknownAll):0;
  e.firstActivity=e.firstActivity===Infinity?null:e.firstActivity;
  e.ageDays=(now-e.lastActivity)/DAY;e.buyActiveDays=e.buyDays.size;e.saleActiveDays=e.sellDays.size;
  e.buyDays365=e.buyDays365.size;e.saleDays365=e.sellDays365.size;
  delete e.buys;delete e.sells;delete e.buyDays;delete e.sellDays;
  // Verifiable earnings only; a missing purchase cost cannot count as a profit.
  e.proven=e.matchedAll>0&&e.profitP100>0&&e.coverage>=.70;
  e.dormant=e.ageDays>=30;
  markets.push(e);totalP100+=e.profitP100;matchedAll+=e.matchedAll;unknownAll+=e.unknownAll;profit7P100+=e.profit7P100;
 }
 markets.sort((a,b)=>b.profitP100-a.profitP100||b.matchedAll-a.matchedAll||a.id-b.id);
 const out={markets,byId:new Map(markets.map(m=>[m.id,m])),totalP100,profit7P100,matchedAll,unknownAll,savedRows:ledger.length,
  oldest:oldest===Infinity?null:oldest,newest:newest||null,provenCount:markets.filter(m=>m.proven).length,dormantWinners:markets.filter(m=>m.proven&&m.dormant).length};
 memoryLedger=ledger;memoryLength=ledger.length;memoryTail=sig;memoryDay=today;memoryCache=out;return out;
}
// Names are hints for finding neighbouring stats/variants, not proof of equivalent prices.
const STATS=/^(?:Berserker's|Assassin's|Celestial|Cleric's|Carrion|Dire|Magi's|Knight's|Rampager's|Valkyrie|Rabid|Soldier's|Sinister|Viper's|Trailblazer's|Marauder's|Grieving|Harrier's|Minstrel's|Ritualist's|Dragon's|Giver's|Wanderer's|Shaman's|Zealot's|Seraph's|Marshal's|Plaguedoctor's|Demolisher's|Nomad's|Sentinel's|Cavalier's|Apothecary's|Diviner's|Commander's|Bringer's|Trailblazer|Valkyrie's|DIRE)\s+/i;
function familyForName(name){if(typeof name!=='string'||!name.trim())return null;
 const trimmed=name.trim();if(/^\w+ Sigil of /i.test(trimmed))return 'Sigils · '+trimmed.split(' ')[0];
 if(/^\w+ Rune of /i.test(trimmed))return 'Runes · '+trimmed.split(' ')[0];
 if(/^Relic of /i.test(trimmed))return 'Relics';
 const bare=trimmed.replace(STATS,'');
 if(bare!==trimmed){const m=bare.match(/^([\w'-]+)(?:\s|$)/);return m?'Equipment · '+m[1]:null;}
 // Do not force unrelated commodities into manufactured item families.
 const com=bare.match(/^(?:Pile of|Vial of|Spool of|Cured |Raw |Glob of|Log of|Chunk of|Slab of)/i);if(com)return 'Materials · '+com[0].trim();
 return null;
}
function relatedMarkets(archive,metadata={},limit=60){
 if(!archive?.markets||!metadata)return [];
 const families=new Map(),known=new Set(archive.byId.keys());
 for(const m of archive.markets){if(!m.proven)continue;const key=familyForName(metadata[m.id]?.name);if(!key)continue;
  let x=families.get(key);if(!x){x={key,profitP100:0,winners:0};families.set(key,x);}x.profitP100+=Math.max(0,m.profitP100);x.winners++;
 }
 const leads=[];
 for(const [rawId,meta] of Object.entries(metadata)){const id=Number(rawId);if(!valid(id,1)||known.has(id)||!meta?.name)continue;
  const family=familyForName(meta.name),x=families.get(family);
  if(x&&x.profitP100>0)leads.push({id,name:meta.name,family,provenFamilyProfitP100:x.profitP100,relatedWinners:x.winners,status:'Name similarity only — fresh price and actual demand required'});
 }
 return leads.sort((a,b)=>b.provenFamilyProfitP100-a.provenFamilyProfitP100||b.relatedWinners-a.relatedWinners||a.id-b.id).slice(0,limit);
}
function memoryTargets(ledger,metadata={},now=Date.now(),limit=90){
 const archive=allHistory(ledger,now);
 // Prioritise historically profitable markets not already active this week;
 // include many market types, not a fixed equipment/rune/commodity allowlist.
 const winners=archive.markets.filter(x=>x.proven)
  .sort((a,b)=>((b.dormant?1.3:1)*Math.log1p(Math.max(0,b.profitP100)/10000)*Math.log1p(b.saleActiveDays))-
    ((a.dormant?1.3:1)*Math.log1p(Math.max(0,a.profitP100)/10000)*Math.log1p(a.saleActiveDays))||a.id-b.id);
 // Reserve some focused checks for one-off winners: rare successes are part of
 // the user's fragmented memory, but must not turn into large orders automatically.
 const repeated=winners.filter(x=>x.sellRows>=2&&x.matchedAll>=2).slice(0,Math.max(10,Math.floor(limit*.55))).map(x=>x.id);
 const rare=winners.filter(x=>x.sellRows===1||x.matchedAll<2).slice(0,Math.max(5,Math.floor(limit*.18))).map(x=>x.id);
 const neighbours=relatedMarkets(archive,metadata,limit).map(x=>x.id);
 const remaining=winners.map(x=>x.id);
 return [...new Set([...repeated,...rare,...neighbours,...remaining])].slice(0,limit);
}

root.GPGrowth={weeklyByMarket,allHistory,familyForName,relatedMarkets,memoryTargets,marketPosition,goalProgress,weeklyGoal};
if(typeof module!=='undefined'&&module.exports)module.exports=root.GPGrowth;
})(typeof globalThis!=='undefined'?globalThis:this);
