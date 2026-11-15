const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../services/account-monitor/worker.js'),'utf8');
const moduleTask=import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const site='https://golden-peanut-account-monitor.tnolanwood.workers.dev';
const origin='https://thegoldenpeanut.pages.dev';
const key='11111111-2222-3333-4444-555555555555-aaaa-bbbb-cccc-dddddddddddd';
const req=(route,method='GET',extra={})=>new Request(site+route,{method,headers:extra});
const readyEnv=()=>({
 MONITOR_ENCRYPTION_KEY:'0123456789abcdef'.repeat(4),
 DB:{prepare(sql){return {async all(){return {results:[]}}};}}
});
test('monitor /health confirms ACTUAL D1 and AES readiness rather than accepting a Worker process',async()=>{
 const {default:worker}=await moduleTask;
 const r=await worker.fetch(req('/health'),readyEnv(),{});assert.equal(r.status,200);
 const result=await r.json();
 assert.equal(result.ok,true);assert.equal(result.intervalMinutes,30);
 assert.equal(result.mode,'github-actions-fallback');assert.equal(result.privateDatabaseReady,true);
 assert.equal(result.encryptedCredentialStorageReady,true);
 assert.ok(!JSON.stringify(result).includes('0123456789abcdef'));
});
test('monitor /health fails closed when encryption or private D1 binding is unavailable',async()=>{
 const {default:worker}=await moduleTask;
 const r=await worker.fetch(req('/health'),{},{});
 assert.equal(r.status,503);const result=await r.json();
 assert.equal(result.ok,false);assert.equal(result.privateDatabaseReady,false);
 assert.equal(result.encryptedCredentialStorageReady,false);
});
test('private monitor diagnostics probes only public GW2 API without credentials',async()=>{
 const {default:worker}=await moduleTask;const old=global.fetch,calls=[];
 global.fetch=async(input,opts)=>{calls.push([String(input),opts]);return new Response('{"id":100}',{status:200});};
 try{
  const result=await worker.fetch(req('/diagnostics'),readyEnv(),{});
  assert.equal(result.status,200);
  const json=await result.json();
  assert.equal(json.guildWars2ApiReachable,true);
  assert.equal(json.keyReady,true);assert.equal(json.dbReady,true);
  assert.equal(calls.length,1);assert.match(calls[0][0],/api\.guildwars2\.com\/v2\/build/);
  assert.ok(!calls[0][1]?.headers?.Authorization);
 }finally{global.fetch=old;}
});
test('private account endpoints cannot be read or enrolled without a GW2 credential',async()=>{
 const {default:worker}=await moduleTask;
 for(const [route,method] of [['/events','GET'],['/status','GET'],['/nights?item=902','GET'],['/enroll','POST'],['/disable','POST']]){
  const r=await worker.fetch(req(route,method),{},{});
  assert.equal(r.status,401,'unguarded private route: '+route);
  assert.equal(r.headers.get('cache-control'),'no-store');
 }
});
test('origin and preflight allow only the original Golden Peanut Pages origin',async()=>{
 const {default:worker}=await moduleTask;
 const good=await worker.fetch(req('/status','OPTIONS',{Origin:origin}),{},{});
 assert.equal(good.status,204);
 assert.equal(good.headers.get('access-control-allow-origin'),origin);
 const permitted=(good.headers.get('access-control-allow-headers')||'').split(',').map(x=>x.trim().toLowerCase());
 for(const requested of ['authorization','cache-control','content-type','x-gp-account'])
  assert.ok(permitted.includes(requested),'Browser preflight must permit '+requested);
 const bad=await worker.fetch(req('/status','OPTIONS',{Origin:'https://unauthorized.example'}),{},{});
 assert.equal(bad.status,403);
 const spoof=await worker.fetch(req('/status','GET',{Origin:'https://unauthorized.example',Authorization:'Bearer '+key}),{},{});
 assert.equal(spoof.status,403);
});
test('enrollment requires positive opt-in even with a syntactically valid API token',async()=>{
 const {default:worker}=await moduleTask;
 const r=await worker.fetch(req('/enroll','POST',{Origin:origin,Authorization:'Bearer '+key}),{},{});
 assert.equal(r.status,400);
 const v=await r.json();assert.match(v.error,/consent/i);
 assert.equal(r.headers.get('Access-Control-Allow-Origin'),origin);
});
test('GW2 token rejection produces an actionable error instead of hiding behind a generic HTTP 503',async()=>{
 const {default:worker}=await moduleTask,old=global.fetch;
 global.fetch=async()=>new Response('{"text":"invalid key"}',{status:403,headers:{'content-type':'application/json'}});
 try{
  const r=await worker.fetch(new Request(site+'/enroll',{method:'POST',headers:{
   Origin:origin,Authorization:'Bearer '+key,'X-GP-Account':'Fixture.1234','Content-Type':'application/json'
  },body:JSON.stringify({consent:true})}),readyEnv(),{});
  assert.equal(r.status,403);const json=await r.json();
  assert.equal(json.code,'ARENA_NET_KEY_REJECTED');
  assert.match(json.error,/ArenaNet/);
  assert.ok(!JSON.stringify(json).includes(key));
 }finally{global.fetch=old;}
});
test('full consent workflow encrypts a verified account key before enrolling and begins nonblocking snapshots',async()=>{
 const {default:worker}=await moduleTask,orig=global.fetch;
 const queries=[],polls=[];
 const env={MONITOR_ENCRYPTION_KEY:'0123456789abcdef'.repeat(4),
  DB:{prepare(sql){
    queries.push(sql);
    return {bind(){return this;},async run(){return {success:true};},
     async first(){return null;},async all(){return {results:[]}}};
   }}
 };
 global.fetch=async url=>{
  const u=String(url);
  if(u.endsWith('/tokeninfo'))return Response.json({permissions:['account','tradingpost']});
  if(u.endsWith('/account'))return Response.json({id:'4a182def-fdc4-4de3-9ab5-067987aaaaab',name:'Fixture.1234'});
  if(u.includes('/commerce/transactions/'))return Response.json([]);
  throw Error('Unexpected ArenaNet mock fetch: '+u.replace(/Bearer\s+\S+/gi,'[secret]'));
 };
 try{
  const input=new Request(site+'/enroll',{method:'POST',headers:{
    Origin:origin,Authorization:'Bearer '+key,'X-GP-Account':'Fixture.1234','Content-Type':'application/json'
   },body:JSON.stringify({consent:true})});
  const r=await worker.fetch(input,env,{waitUntil(p){polls.push(p);}});
  assert.equal(r.status,200);const data=await r.json();
  assert.equal(data.ok,true);assert.equal(data.account,'Fixture.1234');
  assert.equal(polls.length,1);
  await Promise.all(polls);
  assert.ok(queries.some(sql=>sql.includes('INSERT INTO gp_monitor_credentials')));
  assert.ok(!JSON.stringify(data).includes(key));
 }finally{global.fetch=orig;}
});
test('browser client does not send disallowed cache-control as an authorization request header',()=>{
 const client=fs.readFileSync(path.join(__dirname,'../app/account-monitor-client.js'),'utf8');
 assert.ok(!client.includes("headers={Authorization:'Bearer '+state.key,'Cache-Control':'no-store'}"));
 assert.ok(client.includes("const headers={Authorization:'Bearer '+state.key};"));
});
test('cron with no opted-in accounts cannot fetch a personal account',async()=>{
 const {default:worker}=await moduleTask;
 const calls=[];
 const env={DB:{prepare(sql){calls.push(sql);return {async all(){return {results:[]}}};}}};
 await worker.scheduled({},env,{waitUntil(){throw Error('No accounts were enabled');}});
 assert.equal(calls.length,1);assert.match(calls[0],/enabled=1/);
});
test('private tokens must never appear literally in monitor source or a browser-visible result',async()=>{
 assert.ok(!source.includes(key));
 assert.match(source,/AES-GCM/);
 assert.match(source,/MONITOR_ENCRYPTION_KEY/);
 assert.match(source,/kind='partial'/);
 assert.match(source,/disappeared_unknown/);
 assert.match(source,/commerce\/transactions\/history/);
 assert.ok(!source.includes('console.log(key)'));
});

test('bulk order-night query is authenticated, bounded, and fails closed on incomplete samples',async()=>{
 const {default:worker}=await moduleTask;
 const seen=[];
 const env={DB:{prepare(sql){
  return {bind(...params){this.params=params;return this;},
   async first(){return {account_id:'private-uuid',account_name:'Fixture.1234',enabled:1,encrypted:null};},
   async all(){seen.push({sql,params:this.params});
    return {results:[{item_id:101,side:'buys',night:'2026-11-05',filled:0,observedOrders:1}]};}
  };
 }}};
 const headers={Origin:origin,Authorization:'Bearer '+key};
 const yes=await worker.fetch(req('/nights?items=101,102','GET',headers),env,{});
 assert.equal(yes.status,200);
 const body=await yes.json();
 assert.equal(body.complete,true);
 assert.equal(body.nights[0].filled,0,'zero-fill night cannot be discarded');
 assert.equal(seen.length,1);
 assert.equal(seen[0].params.length,4);
 assert.ok(seen[0].sql.includes('GROUP BY item_id,side,night'));
 assert.ok(seen[0].sql.includes('account_id=?'));
 assert.equal((await worker.fetch(req('/nights?items=101,101','GET',headers),env,{})).status,400);
 assert.equal((await worker.fetch(req('/nights?items='+Array.from({length:41},(_,i)=>i+1).join(','),'GET',headers),env,{})).status,400);
 assert.equal((await worker.fetch(req('/nights?items=101,102'),env,{})).status,401);
});

test('monitor reload restores prior opt-in silently and never leaks a key without consent',async()=>{
 const vm=require('node:vm'),src=fs.readFileSync(path.join(__dirname,'../app/account-monitor-client.js'),'utf8');
 const make=(fetchMock)=>{
  const ctx={document:{readyState:'loading',addEventListener(){}},window:{addEventListener(){}},
   fetch:fetchMock,AbortController,setTimeout,clearTimeout,Date,Map,Set,console};
  vm.runInNewContext(src,ctx);
  return ctx.GPCloudAccount;
 };
 let calls=0;
 const api=make(async()=>{calls++;throw Error('Unexpected request');});
 const db={async get(store,account,key){return key==='cloud-account-monitor-v1'?{value:{
  enabled:true,mode:'github-actions',confirmedAt:Date.now()}}:null;}};
 const state={db,account:'Fixture.1234',key:'private-key-never-log'};
 assert.equal(api.status(state.account).restoring,true);
 await api.loadPreferences(state);
 assert.equal(api.status(state.account).enabled,true);
 assert.equal(api.status(state.account).restoring,false);
 assert.equal(calls,0,'saved preference should not require contacting the Worker');
 const fresh=make(async()=>{calls++;throw Error('No prior consent');});
 const blank={db:{async get(){return null;}},account:'Other.1234',key:'no-opt-in'};
 await fresh.loadPreferences(blank);
 assert.equal(fresh.status(blank.account).enabled,false);
 assert.equal(calls,0,'unconsented startup must never transmit a personal API key');
});
test('monitor reload recovers server connection only when earlier opt-in evidence exists',async()=>{
 const vm=require('node:vm'),src=fs.readFileSync(path.join(__dirname,'../app/account-monitor-client.js'),'utf8');
 let requests=0,writes=0;
 const ctx={document:{readyState:'loading',addEventListener(){}},window:{addEventListener(){}},
  fetch:async()=>{requests++;return {ok:true,json:async()=>({
   ok:true,account:'Fixture.1234',enabled:true,backend:'github-actions',lastSuccess:Date.now()})};},
  AbortController,setTimeout,clearTimeout,Date,Map,Set,console};
 vm.runInNewContext(src,ctx);
 const state={account:'Fixture.1234',key:'previously-approved-key',
  db:{async get(store,account,key){
    return key==='cloud-monitor-status-v1'?{value:{enabled:true}}:null;
   },async put(){writes++;}}};
 await ctx.GPCloudAccount.loadPreferences(state);
 assert.equal(requests,1);
 assert.equal(writes,1);
 assert.equal(ctx.GPCloudAccount.status(state.account).enabled,true);
 assert.equal(ctx.GPCloudAccount.status(state.account).status.backend,'github-actions');
});

test('disable always preserves an inactive digest tombstone, even for Worker-enrolled credentials',async()=>{
 const {default:worker}=await moduleTask;
 for(const encryption of ['ciphertext',null]){
  const statements=[],batches=[];
  const env={DB:{
   prepare(sql){
    const query={sql,params:[],bind(...params){this.params=params;return this;},
     async first(){
      assert.match(sql,/FROM gp_monitor_credentials WHERE token_digest/);
      return {account_id:'acct-fixture',account_name:'Fixture.1234',enabled:1,encrypted:encryption};
     }};
    statements.push(query);return query;
   },
   async batch(q){batches.push(q);return q.map(()=>({success:true}));}
  }};
  const response=await worker.fetch(req('/disable','POST',{Origin:origin,Authorization:'Bearer '+key}),env,{});
  assert.equal(response.status,200);
  const payload=await response.json();
  assert.equal(payload.enabled,false);
  assert.equal(payload.cloudRecordsErased,true);
  assert.equal(payload.requiresGithubSecretRemoval,true);
  assert.equal(batches.length,1);
  const sql=batches[0].map(q=>q.sql).join('\n');
  assert.match(sql,/UPDATE gp_monitor_credentials SET enabled=0,encrypted=NULL,iv=NULL/);
  assert.doesNotMatch(sql,/DELETE FROM gp_monitor_credentials/,'no token digest deletion: GitHub scheduler must honour opt-out');
  assert.match(sql,/DELETE FROM gp_monitor_events/);
  assert.match(sql,/DELETE FROM gp_monitor_nights/);
  assert.match(sql,/DELETE FROM gp_monitor_trades/);
  assert.match(sql,/DELETE FROM gp_monitor_orders/);
  assert.match(sql,/DELETE FROM gp_monitor_polls/);
  const final=batches[0].at(-1);
  assert.equal(final.params[0],'[Monitoring stopped]');
  assert.equal(final.params[1],'acct-fixture');
 }
});

test('monitor import cannot write status or ledger under a newly switched account',async()=>{
 const vm=require('node:vm'),source=fs.readFileSync(path.join(__dirname,'../app/account-monitor-client.js'),'utf8');
 const writes=[],imports=[],state={account:'Fixture.1234',key:'synthetic-key',snapshot:null};
 const db={
  async get(store,account,key){
   if(key==='cloud-account-monitor-v1')return {value:{enabled:true}};
   if(key==='cloud-monitor-cursor-v1')return {value:{cursor:0}};
   return null;
  },
  async put(store,account,key,value){writes.push({store,account,key,value});},
  async importLedger(account,rows){imports.push({account,rows});return {added:0,amended:0};},
  async all(){return []}
 };
 state.db=db;
 const context={document:{readyState:'loading',addEventListener(){}},window:{addEventListener(){}},
  fetch:async url=>{
   if(String(url).endsWith('/status'))return {ok:true,json:async()=>({ok:true,enabled:true,account:'Fixture.1234',backend:'github-actions'})};
   if(String(url).includes('/events?after=')){
    state.account='Other.1234';
    return {ok:true,json:async()=>({ok:true,account:'Fixture.1234',events:[],nextCursor:0,hasMore:false})};
   }
   throw Error('Unexpected request');
  },AbortController,setTimeout,clearTimeout,Date,Map,Set,console};
 vm.runInNewContext(source,context);
 const api=context.GPCloudAccount;
 await api.loadPreferences(state);
 const result=await api.refresh(state,{force:true});
 assert.equal(result,null,'a switched account cannot complete an old import');
 assert.equal(imports.length,0);
 assert.ok(!writes.some(x=>x.account==='Other.1234'),'never write private old-account status to the new account');
 assert.match(api.status('Fixture.1234').lastError,/account/i);
});
test('invalid cursor/page cannot advance private event import',async()=>{
 const vm=require('node:vm'),source=fs.readFileSync(path.join(__dirname,'../app/account-monitor-client.js'),'utf8');
 const writes=[],state={account:'Fixture.1234',key:'synthetic-key',snapshot:null};
 state.db={
  async get(store,account,key){
   if(key==='cloud-account-monitor-v1')return {value:{enabled:true}};
   if(key==='cloud-monitor-cursor-v1')return {value:{cursor:15}};
   return null;
  },async put(store,account,key,value){writes.push({key,value})},
  async importLedger(){throw Error('Malformed cursor must fail before ledger import')}
 };
 const context={document:{readyState:'loading',addEventListener(){}},window:{addEventListener(){}},
  fetch:async url=>({ok:true,json:async()=>String(url).endsWith('/status')?
   {ok:true,enabled:true,account:'Fixture.1234',backend:'github-actions'}:
   {ok:true,account:'Fixture.1234',events:[{id:14,kind:'partial',quantity:100,side:'buys'}],nextCursor:14,hasMore:true}}),
  AbortController,setTimeout,clearTimeout,Date,Map,Set,console};
 vm.runInNewContext(source,context);
 await context.GPCloudAccount.loadPreferences(state);
 const result=await context.GPCloudAccount.refresh(state,{force:true});
 assert.equal(result,null);
 assert.ok(!writes.some(x=>x.key==='cloud-monitor-cursor-v1'));
 assert.match(context.GPCloudAccount.status(state.account).lastError,/cursor/i);
});
