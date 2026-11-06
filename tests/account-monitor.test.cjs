const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../services/account-monitor/worker.js'),'utf8');
const moduleTask=import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const site='https://golden-peanut-account-monitor.tnolanwood.workers.dev';
const origin='https://thegoldenpeanut.pages.dev';
const key='11111111-2222-3333-4444-555555555555-aaaa-bbbb-cccc-dddddddddddd';
const req=(route,method='GET',extra={})=>new Request(site+route,{method,headers:extra});
test('isolated Worker exposes only non-sensitive readiness, no account data',async()=>{
 const {default:worker}=await moduleTask;
 const r=await worker.fetch(req('/health'),{},{});assert.equal(r.status,200);
 const result=await r.json();
 assert.equal(result.ok,true);assert.equal(result.intervalMinutes,10);
 assert.equal(result.mode,'opt-in');
 assert.ok(!JSON.stringify(result).includes('encrypted'));
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
 assert.match(good.headers.get('access-control-allow-headers'),/authorization/);
 const bad=await worker.fetch(req('/status','OPTIONS',{Origin:'https://unauthorized.example'}),{},{});
 assert.equal(bad.status,403);
 const spoof=await worker.fetch(req('/status','GET',{Origin:'https://unauthorized.example',Authorization:'Bearer '+key}),{},{});
 assert.equal(spoof.status,403);
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
