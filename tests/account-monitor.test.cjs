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
 assert.equal(result.ok,true);assert.equal(result.intervalMinutes,10);
 assert.equal(result.mode,'opt-in');assert.equal(result.privateDatabaseReady,true);
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
  assert.equal(calls.length,1);assert.match(calls[0][0],/api.guildwars2.com\\/v2\\/build/);
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
