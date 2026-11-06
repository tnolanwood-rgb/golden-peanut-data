/* Golden Peanut 7.16 — read-only public catalogue and daily-price-history adapter.
   Neither daily standing order quantity nor changes are completed sales volume.
   Failure NEVER blocks the personal trading ledger or live account checks. */
(function(root){'use strict';
const OWN='https://raw.githubusercontent.com/tnolanwood-rgb/golden-peanut-data/main/data/';
const FLIP='https://github.com/PieOrCake/flip_out/releases/download/seed-latest/';
const DAY=86400000,MAX_CATALOGUE_AGE=3*DAY, MAX_HISTORY_AGE=3*DAY;
let loaded=null,loading=null,trendStore=null,lastError='';
function valid(v){return Number.isSafeInteger(v)&&v>0;}
async function request(url,ms=9500){
 const ctl=new AbortController(),t=setTimeout(()=>ctl.abort(),ms);
 try{const r=await fetch(url,{cache:'no-store',signal:ctl.signal,credentials:'omit',referrerPolicy:'no-referrer'});
  if(!r.ok)throw Error('public feed HTTP '+r.status);return await r.json();}
 finally{clearTimeout(t);}
}
function parseOwn(body,now=Date.now()){
 if(body?.schema!=='golden-peanut-public-v1'||!Number.isSafeInteger(body.generated_at)||!Array.isArray(body.items))throw Error('Wrong public market feed schema');
 const age=now-body.generated_at*1000;if(age< -3600000||age>MAX_CATALOGUE_AGE)throw Error('Public market feed outdated');
 const byId=new Map();
 for(const r of body.items){if(!Array.isArray(r)||r.length!==8||!valid(r[0])||typeof r[1]!=='string'||!r[1]||
  r[1].length>150||!r.slice(4).every(x=>Number.isSafeInteger(x)&&x>=0))continue;
  byId.set(r[0],{...(body.metadata?.[r[0]]||{}),id:r[0],name:r[1],type:r[2],rarity:r[3],buy:r[4],sell:r[5],buyQty:r[6],sellQty:r[7],quoteAt:body.quote_times?.[r[0]]||body.generated_at});}
 if(byId.size<1000||byId.size!==body.items.length||body.count!==byId.size||(body.coverage?.quotes_complete===true&&body.coverage.universe!==byId.size))throw Error('Public item catalogue incomplete');
 return {coverage:body.coverage||null,generation:body.generation||null,source:'golden-peanut-github-public',byId,generatedAt:body.generated_at*1000,ageMs:age,usableForLiveTrades:false};
}
function parseFlipOut(body){
 if(!Array.isArray(body))throw Error('Wrong Flip Out index format');
 const byId=new Map();for(const r of body){if(valid(r?.id)&&typeof r.n==='string'&&r.n&&r.n.length<=150)
   byId.set(r.id,{id:r.id,name:r.n,type:'',rarity:r.r||'',buy:0,sell:0,buyQty:0,sellQty:0});}
 if(byId.size<1000)throw Error('Flip Out tradeable index incomplete');
 return {source:'flip-out-community-items',byId,generatedAt:null,ageMs:null,usableForLiveTrades:false};
}
function hydrate(state,result){
 if(!state?.meta)return;
 let additions=0;
 for(const [id,r] of result.byId){const old=state.meta[id]||{};
  state.meta[id]={...r,...old,id,name:r.name,type:r.type||old.type,rarity:r.rarity||old.rarity,
   details:r.details||old.details};if(!old.name)additions++;}
 result.addedNames=additions;
 state.externalMarketStatus={source:result.source,items:result.byId.size,indexed:additions,at:result.generatedAt,
  coverage:result.coverage,warning:'Daily quotes and outstanding quantities are not executions'};
}
async function load(state,{force=false,now=Date.now()}={}){
 if(loaded&&!force&&loaded.loadedAt&&now-loaded.loadedAt<3600000){hydrate(state,loaded);return loaded;}
 if(loading&&!force)return loading;
 loading=(async()=>{
  let result;try{result=parseOwn(await request(OWN+'market_public.json'),now);}
  catch(e){lastError=String(e?.message||e).slice(0,120);try{result=parseFlipOut(await request(FLIP+'tradeable_items.json',9000));}
   catch(e2){lastError+='; '+String(e2?.message||e2).slice(0,120);return null;}}
  result.loadedAt=now;loaded=result;
  hydrate(state,result);
  if(state?.db?.putMetadataBatch)await state.db.putMetadataBatch(Object.fromEntries(result.byId));
  return result;
 })();
 try{return await loading;}finally{loading=null;}
}
function parseHistory(body,now=Date.now()){
 if(body?.schema!=='golden-peanut-daily-v1'||!Number.isSafeInteger(body.generated_at)||
    !body.history||typeof body.history!=='object')throw Error('Invalid price history data');
 if(now-body.generated_at*1000>MAX_HISTORY_AGE||now<body.generated_at*1000-3600000)throw Error('Price history stale');
 const entries=new Map();
 for(const [k,rows]of Object.entries(body.history)){
  const id=Number(k);if(!valid(id)||!Array.isArray(rows))continue;
  const clean=[...new Map(rows.filter(r=>Array.isArray(r)&&r.length===5&&r.every(x=>Number.isSafeInteger(x)&&x>=0)&&r[0]<=Math.floor(now/DAY)&&r[0]>Math.floor(now/DAY)-21).map(r=>[r[0],r])).values()].sort((a,b)=>a[0]-b[0]);
  if(clean.length>=2)entries.set(id,clean.slice(-21));
 }
 return {source:'own-public-daily-quoted-prices',entries,generatedAt:body.generated_at*1000};
}
function parseFlipOutHistory(body,now=Date.now()){
 if(!body||typeof body!=='object'||Array.isArray(body))throw Error('Invalid Flip Out history format');
 const entries=new Map();let newest=0;
 for(const [key,raw] of Object.entries(body)){
  const id=Number(key);if(!valid(id)||!Array.isArray(raw))continue;
  const clean=raw.filter(x=>x&&Number.isSafeInteger(x.t)&&Number.isSafeInteger(x.b)&&Number.isSafeInteger(x.s)&&
   Number.isSafeInteger(x.bq)&&Number.isSafeInteger(x.sq)&&x.t>0&&x.b>=0&&x.s>=0&&x.bq>=0&&x.sq>=0&&
   now-x.t*1000<=21*DAY&&x.t*1000<=now+3600000)
   .map(x=>[Math.floor(x.t/86400),x.b,x.s,x.bq,x.sq]).sort((a,b)=>a[0]-b[0]);
  const days=[...new Map(clean.map(x=>[x[0],x])).values()];
  if(days.length>=2){entries.set(id,days.slice(-21));newest=Math.max(newest,days.at(-1)[0]*86400000);}
 }
 if(entries.size<10||now-newest>MAX_HISTORY_AGE)throw Error('Flip Out seed missing recent usable price history');
 return {source:'flip-out-public-quoted-prices',entries,generatedAt:newest};
}
async function loadHistory({force=false,now=Date.now()}={}){
 if(trendStore&&!force&&now-trendStore.generatedAt<MAX_HISTORY_AGE)return trendStore;
 try{const x=parseHistory(await request(OWN+'market_history.json',11000),now);trendStore=x;return x;}
 catch(e){lastError=String(e?.message||e).slice(0,120);
  try{const x=parseFlipOutHistory(await request(FLIP+'seed_prices.json',10000),now);trendStore=x;return x;}
  catch(e2){lastError+='; '+String(e2?.message||e2).slice(0,120);return null;}}
}
function volatility(id){
 const rows=trendStore?.entries.get(id);if(!rows||rows.length<5||Date.now()-trendStore.generatedAt>MAX_HISTORY_AGE||Date.now()-rows.at(-1)[0]*DAY>MAX_HISTORY_AGE)return null;
 const asks=rows.map(x=>x[2]).filter(x=>x>0),bids=rows.map(x=>x[1]).filter(x=>x>0);
 if(asks.length<5||bids.length<5)return null;
 const mean=asks.reduce((a,b)=>a+b,0)/asks.length;
 const std=Math.sqrt(asks.reduce((a,b)=>a+(b-mean)**2,0)/asks.length);
 const high=asks.at(-1)>mean*1.5,changing=std/Math.max(1,mean);
 return {days:asks.length,relativeStd:changing,spiking:high,
  caution:high||changing>.4,source:'public daily ASK snapshots, not actual trading volume'};
}
function status(){return {source:loaded?.source||null,items:loaded?.byId.size||0,
  generatedAt:loaded?.generatedAt||null,historyMarkets:trendStore?.entries.size||0,lastError};}
root.GPMarketFeed={buildId:'7.16.0-evidence',load,loadHistory,volatility,status,parseOwn,parseFlipOut,parseHistory,parseFlipOutHistory};
if(typeof module!=='undefined'&&module.exports)module.exports=root.GPMarketFeed;
})(typeof globalThis!=='undefined'?globalThis:this);
