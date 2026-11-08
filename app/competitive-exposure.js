/* Account-scoped sampled price positioning. Not queue position or continuous exposure. */
(function(root){'use strict';
const HOUR=3600000,DAY=24*HOUR;
const whole=(v,min=0)=>Number.isSafeInteger(v)&&v>=min;
function classify(row,{toleranceCopper=0,maxQuoteAgeMs=15*60000}={}){
 const tolerance=whole(toleranceCopper)?toleranceCopper:0;
 const known=!row.absent&&whole(row.price,1)&&whole(row.bestBuy,1)&&whole(row.bestSell,1)&&
  Number.isFinite(row.quoteAt)&&row.quoteAt<=row.at+60000&&Math.abs(row.at-row.quoteAt)<=maxQuoteAgeMs;
 const difference=known?row.bestBuy-row.price:null;
 return {position:!known?'unobserved':difference>0?'outbid':'competitive',
  exactLeading:known&&difference===0,nearLeading:known&&Math.abs(difference)<=tolerance,
  difference,toleranceCopper:tolerance,queuePosition:null};
}
function merge(previous,incoming,account){
 if(!account)throw Error('Account required');
 const rows=new Map();
 for(const r of [...(previous?.account===account?previous.observations||[]:[]),...incoming]){
  if(r.account!==account||!whole(r.order,1)||!whole(r.item,1)||!whole(r.remaining)||!whole(r.price,1)||!Number.isFinite(r.at))continue;
  const key=r.order+':'+r.at,old=rows.get(key);
  // Identical refreshes are idempotent; conflicting same-time observations are unknown.
  if(old&&JSON.stringify(old)!==JSON.stringify(r))rows.set(key,{...old,conflict:true});
  else if(!old)rows.set(key,{...r});
 }
 return {version:1,account,observations:[...rows.values()].sort((a,b)=>a.at-b.at||a.order-b.order)};
}
function observe(previous,snapshot,quotes,account,{now=Date.now()}={}){
 if(!snapshot||snapshot.buysVerified!==true)return previous?.account===account?previous:{version:1,account,observations:[]};
 const at=Date.parse(snapshot.at);
 if(!Number.isFinite(at)||at>now||now-at>15*60000)return previous?.account===account?previous:{version:1,account,observations:[]};
 const qm=new Map(quotes.filter(Boolean).map(x=>{const q=x.latest||x;return [q.id,q];}));
 const incoming=[],current=new Set();
 for(const o of snapshot.buys||[]){
  if(!whole(o.id,1)||!whole(o.item,1)||!whole(o.q,1)||!whole(o.price,1))continue;
  current.add(o.id);const q=qm.get(o.item);
  incoming.push({account,order:o.id,item:o.item,at,remaining:o.q,price:o.price,
   original:whole(o.originalQuantity,1)&&o.originalQuantity>=o.q?o.originalQuantity:null,
   created:Number.isFinite(o.created)?o.created:null,
   bestBuy:q?.buy??null,bestSell:q?.sell??null,quoteAt:Date.parse(q?.at)||null,
   source:'foreground-verified-order-snapshot'});
 }
 const last=new Map();for(const r of previous?.account===account?previous.observations||[]:[])if(r.at<at)last.set(r.order,r);
 for(const r of last.values())if(!r.absent&&!current.has(r.order))incoming.push({...r,at,remaining:0,absent:true,bestBuy:null,bestSell:null,quoteAt:null});
 return merge(previous,incoming,account);
}
function summarize(state,item,{now=Date.now(),ledger=[],toleranceCopper=0,maxGapMs=45*60000}={}){
 const all=(state?.observations||[]).filter(r=>r.account===state.account&&r.item===item&&r.at<=now&&(!Number.isFinite(r.quoteAt)||r.quoteAt<=now));
 const groups=new Map();for(const r of all){const a=groups.get(r.order)||[];a.push(r);groups.set(r.order,a);}
 const trades=new Map();for(const r of ledger)if(r.item===item&&r.side==='buy'&&whole(r.id,1)&&whole(r.q,1)&&Number.isFinite(r.purchased)&&r.purchased<=now){
  const old=trades.get(r.id);if(!old||r.q>old.q)trades.set(r.id,r);
 }
 const result={item,observations:all.length,orders:groups.size,exactLeadingSnapshots:0,outbidSnapshots:0,
  sampledCompetitiveHours:0,sampledOutbidHours:0,unobservedHours:0,confirmedContinuousCompetitiveHours:0,
  verifiedCompetitiveFills:0,competitiveZeroIntervals:0,lowerBoundAcquired:0,censoredIntervals:0,
  overlappingIntervals:0,repricings:0,competitiveRatePerSampledHour:null,maximumMarketCapacity:null,
  expectedAcquired24h:null,expectedAcquired7d:null,expectedResold24h:null,expectedProfit:null,
  scenarios:['actively-maintained','occasionally-maintained','unattended'].map(mode=>({mode,expectedAcquired:null,expectedResold:null,expectedProfit:null,reason:'Maintenance-specific joint execution evidence unavailable'})),
  limitation:'Endpoint samples do not prove continuous competitiveness or queue priority. No login state, market-wide volume, resale probability or capital recycling is inferred.'};
 const intervals=[],days=new Map();
 for(const rows of groups.values()){
  rows.sort((a,b)=>a.at-b.at);
  for(const r of rows){const p=classify(r,{toleranceCopper});if(p.exactLeading)result.exactLeadingSnapshots++;if(p.position==='outbid')result.outbidSnapshots++;}
  for(let i=1;i<rows.length;i++){
   const a=rows[i-1],b=rows[i],hours=(b.at-a.at)/HOUR;if(hours<=0||a.absent)continue;
   if(a.price!==b.price)result.repricings++;
   const pa=classify(a,{toleranceCopper}),pb=classify(b,{toleranceCopper});
   const ambiguous=a.conflict||b.conflict||a.price!==b.price||b.remaining>a.remaining||b.at-a.at>maxGapMs||b.absent;
   const position=!ambiguous&&pa.position===pb.position?pa.position:'unobserved';
   const fills=[...trades.values()].filter(r=>r.id===a.order&&r.price===a.price&&r.purchased>a.at&&r.purchased<=b.at).reduce((n,r)=>n+r.q,0);
   if(fills>0&&fills===a.remaining-b.remaining)result.lowerBoundAcquired+=fills;
   intervals.push({a,b,hours,position,fills,delta:a.remaining-b.remaining});
  }
 }
 const unknownSegments=[];
 const overlaps=new Set();let active=[];
 for(const x of [...intervals].sort((a,b)=>a.a.at-b.a.at)){
  active=active.filter(y=>y.b.at>x.a.at);
  for(const y of active)if(y.a.order!==x.a.order){overlaps.add(x);overlaps.add(y);}
  active.push(x);
 }
 for(const x of intervals){
  const overlap=overlaps.has(x);
  if(overlap){result.overlappingIntervals++;result.censoredIntervals++;unknownSegments.push([x.a.at,x.b.at]);continue;}
  if(x.position==='competitive')result.sampledCompetitiveHours+=x.hours;
  else if(x.position==='outbid')result.sampledOutbidHours+=x.hours;
  else unknownSegments.push([x.a.at,x.b.at]);
  // A fully consumed order is a lower bound; unknown depletion/cancellation is censored.
  if(x.position!=='competitive'||x.b.remaining===0||x.delta!==x.fills){result.censoredIntervals++;continue;}
  result.verifiedCompetitiveFills+=x.fills;if(!x.fills)result.competitiveZeroIntervals++;
  const day=Math.floor(x.b.at/DAY),s=days.get(day)||{fills:0,hours:0};s.fills+=x.fills;s.hours+=x.hours;days.set(day,s);
 }
 for(const rows of groups.values()){const last=rows.at(-1);if(!last.absent&&last.at<now)unknownSegments.push([last.at,now]);}
 let end=-Infinity;for(const [from,to]of unknownSegments.sort((a,b)=>a[0]-b[0])){
  result.unobservedHours+=Math.max(0,to-Math.max(from,end))/HOUR;end=Math.max(end,to);
 }
 result.competitiveDays=days.size;
 // Descriptive, recency-weighted sampled rate only; never a funded forecast.
 if(days.size>=5){let weight=0,total=0;for(const [day,s]of days){const w=2**(-(now/DAY-day)/30);weight+=w;total+=w*s.fills/s.hours;}result.competitiveRatePerSampledHour=total/weight;}
 const last=all.at(-1);result.latest=last?{...classify(last,{toleranceCopper}),at:last.at,remaining:last.remaining,
  original:last.original,price:last.price,bestBuy:last.bestBuy,bestSell:last.bestSell,
  fresh:now-last.at<=15*60000,ageHours:Number.isFinite(last.created)?Math.max(0,(last.at-last.created)/HOUR):null}:null;
 if(result.latest){result.latest.observedPosition=result.latest.position;if(!result.latest.fresh)result.latest.position='unobserved';}
 return result;
}
async function update(state,quotes){
 const account=state?.account,snapshot=state?.snapshot;if(!account||!state.db)return;
 const key='competitive-exposure-v1',old=(await state.db.get('config',account,key))?.value;
 const value=observe(old,snapshot,quotes,account);
 if(state.account!==account||state.snapshot!==snapshot)return;
 await state.db.put('config',account,key,value);
 if(state.account===account&&state.snapshot===snapshot)state.competitiveExposure=value;
}
root.GPCompetitive={classify,merge,observe,summarize,update};
if(typeof module!=='undefined'&&module.exports)module.exports=root.GPCompetitive;
})(typeof globalThis!=='undefined'?globalThis:this);
