// Actual collector -> SQLite payload -> Worker -> HTTP client -> real IndexedDB.
// All credentials, orders and fills are synthetic. No live services are contacted.
const {chromium}=require('playwright-core'),{execFileSync}=require('node:child_process');
const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const fixture=JSON.parse(execFileSync('python',['tests/competitive_fixture.py'],{encoding:'utf8'}));
const root=path.resolve('app'),account='Exposure.1234';
const key='11111111-2222-3333-4444-555555555555-aaaa-bbbb-cccc-dddddddddddd';
const server=http.createServer((req,res)=>{const url=req.url.split('?')[0],file=path.resolve(root,'.'+(url==='/'?'/index.html':url));
 if(!file.startsWith(root+path.sep))return res.writeHead(403).end();
 try{res.setHeader('content-type',file.endsWith('.js')?'application/javascript':file.endsWith('.css')?'text/css':'text/html');res.end(fs.readFileSync(file));}catch{res.writeHead(404).end();}});
(async()=>{
 const {default:worker}=await import('data:text/javascript;base64,'+Buffer.from(fs.readFileSync('services/account-monitor/worker.js','utf8')).toString('base64'));
 const env={DB:{prepare(sql){return {bind(...params){this.params=params;return this;},async first(){
  if(sql.includes('sqlite_master'))return {name:'gp_monitor_exposure'};
  if(sql.includes('COUNT'))return {n:0};
  return {account_id:'private-fixture',account_name:account,enabled:1,encrypted:null};
 },async all(){
  if(sql.includes('gp_monitor_exposure')){assert.equal(this.params[0],'private-fixture');return {results:fixture.rows.filter(r=>r.id>this.params[1]).slice(0,5)};}
  return {results:[]};
 }};}}};
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||(fs.existsSync('/usr/bin/chromium')?'/usr/bin/chromium':chromium.executablePath()),headless:true,args:['--no-sandbox']});
 try{
  const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',async route=>{
   const u=new URL(route.request().url());if(u.origin===origin)return route.continue();
   if(u.hostname==='golden-peanut-account-monitor.tnolanwood.workers.dev'){
    const response=await worker.fetch(new Request(u,{method:route.request().method(),headers:{Authorization:'Bearer '+key,Origin:'https://thegoldenpeanut.pages.dev'}}),env,{});
    return route.fulfill({status:response.status,headers:{'content-type':'application/json','access-control-allow-origin':'*','access-control-allow-headers':'authorization,content-type'},body:await response.text()});
   }
   return route.fulfill({status:200,contentType:'application/json',body:'[]'});
  });
  await page.goto(origin);await page.waitForFunction(()=>window.GoldenPeanutClean?.State?.db?.db&&window.GPCompetitive);
  const result=await page.evaluate(async({account,key,now})=>{
   const s=GoldenPeanutClean.State;s.account=account;s.key=key;s.ledger=[];s.opportunityDeepPaused=true;
   await s.db.put('config',account,'cloud-account-monitor-v1',{enabled:true,mode:'github-actions'});
   await GPCloudAccount.loadPreferences(s);
   await GPCloudAccount.refresh(s,{force:true});await GPCloudAccount.refresh(s,{force:true});
   const data=await s.db.readCompetitive(account,101,{now});
   const exposure=GPCompetitive.summarize(data,101,{now,ledger:[{id:1,item:101,side:'buy',q:2,price:100,purchased:now-1800000}]});
   const cursor=(await s.db.get('config',account,'competitive-cursor-v2'))?.value?.cursor;
   // Concurrent browser writes must merge evidence rather than overwrite it.
   const r=data.observations[0];
   await Promise.all([s.db.writeCompetitive(account,[{...r,at:r.at+1}]),s.db.writeCompetitive(account,[{...r,at:r.at+2}])]);
   const count=(await s.db.readCompetitive(account,101,{now})).observations.length;
   const other=(await s.db.readCompetitive('Other.5678',101,{now})).observations.length;
   // Cursor and evidence share a transaction; an aborted transaction saves neither.
   const original=GPCompetitive.merge;GPCompetitive.merge=()=>{throw Error('synthetic storage failure');};
   let rejected=false;try{await s.db.writeCompetitive(account,[{...r,at:r.at+3}],{cursor:99});}catch{rejected=true;}finally{GPCompetitive.merge=original;}
   const after=(await s.db.get('config',account,'competitive-cursor-v2'))?.value?.cursor;
   const backup=await PeanutBackupV2.build(s.db,account,'');
   const verified=await PeanutBackupV2.verify(backup.blob);
   await s.db.writeCompetitive(account,[{...r,at:r.at+4}]);
   await PeanutBackupV2.restore(s.db,backup.blob,account);
   const restored=(await s.db.readCompetitive(account,101,{now})).observations.length;
   // Older legacy data migrates without erasure; UI read window is explicit.
   const old={...r,at:now-180*86400000,quoteAt:now-180*86400000};
   await s.db.put('config',account,'competitive-exposure-v1',{account,observations:[old]});
   await s.db.put('config',account,'competitive-migrated-v2',false);
   await GPCompetitive.restore(s);await GPCompetitive.restore(s);
   const recent=(await s.db.readCompetitive(account,101,{now})).observations.length;
   const archived=(await s.db.readCompetitive(account,101,{now,days:200})).observations.length;
   const legacy=(await s.db.get('config',account,'competitive-exposure-v1')).value.observations.length;
   const bulk=Array.from({length:10001},(_,i)=>({...r,item:202,at:now-20000+i}));
   await s.db.writeCompetitive(account,bulk);
   const limited=await s.db.readCompetitive(account,202,{now});
   const retained=(await s.db.get('config',account,GPCompetitive.shardKey(bulk[0]))).value.observations.length;
   return {exposure,cursor,count,other,rejected,after,restored,recent,archived,legacy,limited:limited.observations.length,truncated:limited.truncated,retained,configs:verified.counts['config:'+account],status:GPCloudAccount.status(account)};
  },{account,key,now:fixture.now});
  assert.equal(result.cursor,2,JSON.stringify(result.status));assert.equal(result.exposure.observations,2);
  assert.equal(result.exposure.sampledOutbidHours,.5);assert.equal(result.exposure.sampledCompetitiveHours,0);
  assert.equal(result.exposure.lowerBoundAcquired,2);assert.equal(result.exposure.expectedAcquired24h,null);
  assert.equal(result.count,4);assert.equal(result.other,0);assert.equal(result.rejected,true);assert.equal(result.after,2);assert.ok(result.configs>0);
  assert.equal(result.restored,5);assert.equal(result.recent,5);assert.equal(result.archived,6);assert.equal(result.legacy,1);
  assert.equal(result.limited,10000);assert.equal(result.truncated,true);assert.equal(result.retained,10001);
  assert.deepEqual(errors,[]);
  console.log('PASS competitive pipeline: Python/SQLite -> Worker -> client -> atomic IndexedDB; replay, isolation, failure rollback and backup');
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
