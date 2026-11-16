import {taxPerItem,validGP} from './core.mjs';
export function validateHistory(raw,id){
 if(!raw||raw.itemId!==id||!Array.isArray(raw.data)||!Number.isSafeInteger(raw.timestep)||raw.timestep<1||!Number.isSafeInteger(raw.startTimestamp)||!Number.isSafeInteger(raw.endTimestamp)||raw.endTimestamp<=raw.startTimestamp)throw Error('Unexpected historical API response');
 const seen=new Set();const data=raw.data.map(r=>{
  if(!Number.isSafeInteger(r?.timestamp)||r.timestamp<raw.startTimestamp||r.timestamp>raw.endTimestamp||seen.has(r.timestamp))throw Error('Invalid historical timestamp');seen.add(r.timestamp);
  for(const k of ['avgHighPrice','avgLowPrice'])if(r[k]!==null&&(!Number.isFinite(r[k])||r[k]<=0))throw Error('Invalid historical price');
  for(const k of ['highPriceVolume','lowPriceVolume'])if(!Number.isSafeInteger(r[k])||r[k]<0)throw Error('Invalid historical volume');
  return {...r};
 }).sort((a,b)=>a.timestamp-b.timestamp);
 return {...raw,data};
}
export function quantile(values,p){if(!values.length)return null;const s=[...values].sort((a,b)=>a-b);return s[Math.floor((s.length-1)*p)];}
export function historySummary(raw,name,now=Date.now()){
 raw=validateHistory(raw,raw?.itemId);
 const rows=raw.data.filter(r=>r.timestamp*1000<=now&&Number.isFinite(r.avgHighPrice)&&Number.isFinite(r.avgLowPrice)&&r.highPriceVolume>0&&r.lowPriceVolume>0);
 if(!rows.length)return {status:'empty',rows:[],samples:0,note:'No two-sided historical observations; no trend or margin inferred.'};
 const low=rows.map(r=>r.avgLowPrice),high=rows.map(r=>r.avgHighPrice),mid=rows.map(r=>(r.avgLowPrice+r.avgHighPrice)/2),margins=rows.map(r=>Math.floor(r.avgHighPrice)-Math.ceil(r.avgLowPrice)-taxPerItem(Math.floor(r.avgHighPrice),name));
 const med=quantile(mid,.5),chunk=Math.max(1,Math.floor(rows.length/4));
 const first=quantile(mid.slice(0,chunk),.5),last=quantile(mid.slice(-chunk),.5);
 const lastAt=rows.at(-1).timestamp*1000;
 const span=raw.endTimestamp-raw.startTimestamp;
 const observed=Math.min(1,rows.length*raw.timestep/span);
 return {status:now-lastAt>Math.max(3*raw.timestep*1000,3*3600000)?'stale':'ready',rows,samples:rows.length,start:rows[0].timestamp,end:rows.at(-1).timestamp,timestep:raw.timestep,
  lowMedian:Math.ceil(quantile(low,.5)),highMedian:Math.floor(quantile(high,.5)),low10:Math.ceil(quantile(low,.1)),high90:Math.floor(quantile(high,.9)),
  medianMargin:quantile(margins,.5),positiveBuckets:margins.filter(n=>n>0).length,positiveShare:margins.filter(n=>n>0).length/margins.length,
  changePct:first>0?(last/first-1)*100:0,rangePct:med>0?(quantile(mid,.9)-quantile(mid,.1))/med*100:0,
  lowVolume:rows.reduce((s,r)=>s+r.lowPriceVolume,0),highVolume:rows.reduce((s,r)=>s+r.highPriceVolume,0),coverage:observed,lastAt,
  note:'Observed historical buckets, not your chance of profit. Missing and one-sided intervals are excluded, never filled with invented prices.'};
}
export function historyVerdict(summary,item){
 if(!summary||summary.status!=='ready')return {label:'History unverified',tone:'muted',reasons:['Load the seven-day history before sizing a trade.']};
 const reasons=[];let cautious=false;
 if(summary.coverage<.6){reasons.push('Patchy historical coverage');cautious=true;}
 if(summary.medianMargin<=0){reasons.push('Typical historical spread did not cover current tax');cautious=true;}
 if(summary.positiveShare<.5){reasons.push('Positive after-tax spreads appeared in fewer than half of observed buckets');cautious=true;}
 if(summary.rangePct>15){reasons.push('Wide historical price range');cautious=true;}
 if(summary.changePct< -5){reasons.push('Recent historical price level is falling');cautious=true;}
 if(validGP(item?.sell)&&item.sell>summary.high90*1.05){reasons.push('Latest high price is above the recent central range');cautious=true;}
 if(!reasons.length)reasons.push('Positive typical spread and relatively consistent observed prices');
 return {label:cautious?'Review carefully':'Worth a small manual test',tone:cautious?'warn':'good',reasons};
}
