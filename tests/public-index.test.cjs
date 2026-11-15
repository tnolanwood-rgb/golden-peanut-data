const {test}=require('node:test'),assert=require('node:assert/strict');
const source='../app/public-market-feed.js';
const fresh=()=>{delete require.cache[require.resolve(source)];return require(source);};
const now=Date.now(),generated=Math.floor(now/1000);
const rows=Array.from({length:1000},(_,i)=>[i+1,'Market Item '+(i+1),'CraftingMaterial','Fine']);
const index={schema:'golden-peanut-index-v1',generation:'fixture',generated_at:generated,count:1000,items:rows};
const full={schema:'golden-peanut-public-v1',generation:'fixture',generated_at:generated,count:1000,
 items:rows.map(r=>[...r,100,150,20,20])};
const makeState=()=>({meta:{1:{id:1,name:'Market Item 1',type:'CraftingMaterial',rarity:'Fine',icon:'https://render.guildwars2.com/file/123/1.png'}},
 db:{putMetadataBatch:async x=>{makeState.writes.push(x);}}});

test('compact index is strictly validated, cannot pretend to be a live trade quote',()=>{
 const api=fresh();
 const good=api.parseIndex(index,now);
 assert.equal(good.byId.size,1000);
 assert.equal(good.usableForLiveTrades,false);
 assert.equal(good.byId.get(1).buy,undefined);
 assert.throws(()=>api.parseIndex({...index,count:1001},now),/Incomplete/);
 assert.throws(()=>api.parseIndex({...index,items:[rows[0],...rows.slice(1,999),rows[0]]},now),/Invalid compact/);
 assert.throws(()=>api.parseIndex({...index,generated_at:generated-4*86400},now),/outdated/);
});
test('startup requests compact index, preserves existing icons and skips redundant metadata writes',async()=>{
 const api=fresh();const original=global.fetch,urls=[];
 makeState.writes=[];
 global.fetch=async (url,opts)=>{urls.push({url:String(url),cache:opts.cache});return {ok:true,json:async()=>index};};
 try{
  const state=makeState();
  const first=await api.loadIndex(state,{now});
  assert.equal(first.source,'golden-peanut-index-labels-only');
  assert.equal(urls.length,1);
  assert.match(urls[0].url,/market_index\.json$/);
  assert.equal(urls[0].cache,'no-cache','revalidation reduces unnecessary full transfers');
  assert.match(state.meta[1].icon,/render.guildwars2.com/);
  assert.equal(state.meta[2].name,'Market Item 2');
  assert.equal(makeState.writes.length,1);
  assert.equal(Object.keys(makeState.writes[0]).length,999);
  const oldRef=state.meta[1],oldRef2=state.meta[2];
  await api.loadIndex(state,{now:now+1000});
  assert.equal(urls.length,1,'warm startup avoids second network transfer');
  assert.equal(state.meta[1],oldRef,'unchanged metadata must keep its object reference');
  assert.equal(state.meta[2],oldRef2,'second cold hydration does not rebuild item objects');
  assert.equal(makeState.writes.length,1);
 }finally{global.fetch=original;}
});
test('deep discovery still requests complete, validated public quotations when a compact index is loaded',async()=>{
 const api=fresh(),original=global.fetch,urls=[];
 makeState.writes=[];
 global.fetch=async(url)=>{urls.push(String(url));return {ok:true,json:async()=>String(url).includes('market_index')?index:full};};
 try{
  const state=makeState();
  await api.loadIndex(state,{now});
  const result=await api.load(state,{now});
  assert.equal(result.byId.get(1).buy,100);
  assert.equal(result.source,'golden-peanut-github-public');
  assert.equal(urls.filter(x=>x.includes('market_public.json')).length,1);
 }finally{global.fetch=original;}
});
test('old deployment without the compact file falls back to validated full feed',async()=>{
 const api=fresh(),original=global.fetch,urls=[];
 makeState.writes=[];
 global.fetch=async(url)=>{
  urls.push(String(url));
  if(String(url).endsWith('market_index.json'))return {ok:false,status:404};
  return {ok:true,json:async()=>full};
 };
 try{
  const state=makeState(),result=await api.loadIndex(state,{now});
  assert.equal(result.source,'golden-peanut-github-public');
  assert.equal(urls.length,2);
  assert.equal(state.meta[1000].name,'Market Item 1000');
 }finally{global.fetch=original;}
});
test('two simultaneous chart openings only fetch one 21-day history',async()=>{
 const api=fresh(),original=global.fetch;
 let requests=0;
 global.fetch=async()=>{requests++;await new Promise(r=>setTimeout(r,10));return {ok:true,
  json:async()=>({schema:'golden-peanut-daily-v1',generated_at:generated,
  history:{1:[[Math.floor(now/86400000)-1,100,200,10,10],[Math.floor(now/86400000),110,210,10,10]]}})};};
 try{
  const [a,b]=await Promise.all([api.loadHistory({now}),api.loadHistory({now})]);
  assert.equal(requests,1);assert.equal(a,b);assert.equal(a.entries.get(1).length,2);
 }finally{global.fetch=original;}
});

test('individual price chart fetches a validated item history slice once, not the whole-market history',async()=>{
 const api=fresh(),original=global.fetch,urls=[];
 const day=Math.floor(now/86400000);
 const shard={schema:'golden-peanut-history-shard-v1',generation:'fixture',generated_at:generated,
  modulus:32,shard:65%32,history:{65:[[day-2,100,205,20,20],[day-1,111,221,25,22],[day,120,232,30,26]]}};
 global.fetch=async url=>{urls.push(String(url));await new Promise(r=>setTimeout(r,10));return {ok:true,json:async()=>shard};};
 try{
  const [a,b]=await Promise.all([api.loadItemHistory(65,{now}),api.loadItemHistory(65,{now})]);
  assert.equal(urls.length,1,'coalesced chart clicks share one request');
  assert.match(urls[0],/market_history_shards\/1\.json$/);
  assert.equal(a,b);
  assert.equal(a.entries.get(65).length,3);
  const warm=await api.loadItemHistory(65,{now:now+100});
  assert.equal(warm,a);assert.equal(urls.length,1,'subsequent chart reuses cached history');
  assert.throws(()=>api.parseHistoryShard({...shard,shard:12},65,now),/Invalid/);
  assert.throws(()=>api.parseHistoryShard({...shard,history:{65:[[day-1,100,-1,10,10]]}},65,now),/Malformed/);
  assert.throws(()=>api.parseHistoryShard({...shard,generated_at:generated-4*86400},65,now),/outdated/);
 }finally{global.fetch=original;}
});
test('missing chart slice gracefully falls back to full 21-day public history',async()=>{
 const api=fresh(),original=global.fetch,urls=[],day=Math.floor(now/86400000);
 global.fetch=async url=>{
  urls.push(String(url));
  if(String(url).includes('market_history_shards'))return {ok:false,status:404};
  return {ok:true,json:async()=>({schema:'golden-peanut-daily-v1',generated_at:generated,
   history:{65:[[day-1,100,200,10,10],[day,111,201,10,10]]}})};
 };
 try{
  const data=await api.loadItemHistory(65,{now});
  assert.equal(data.entries.get(65).length,2);
  assert.equal(urls.length,2,'only one unsuccessful slice request and one full-data fallback');
 }finally{global.fetch=original;}
});
