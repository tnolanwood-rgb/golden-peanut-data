/* Golden Peanut account monitor, isolated from the public market collector.
 * Cloudflare Worker, every 10 min; private D1; AES-GCM encrypted credential.
 * Account monitoring requires an explicit opt-in from the user's current
 * Golden Peanut app. Never commit API credentials, return them, or log them.
 * No Trading Post order placement, cancellations or currency movement.
 */
const API='https://api.guildwars2.com/v2',PUBLIC_ORIGIN='https://thegoldenpeanut.pages.dev';
const PAGE_SIZE=200,MAX_ORDER_PAGES=20,MAX_HISTORY_PAGES=60,DAY=86400000;
const now=()=>Date.now();
const encoder=new TextEncoder();
const int=(v,min=0)=>Number.isSafeInteger(Number(v))&&Number(v)>=min;
const byteHex=s=>new Uint8Array(s.match(/.{2}/g).map(h=>parseInt(h,16)));
function base64(buffer){return btoa(String.fromCharCode(...new Uint8Array(buffer)));}
function unbase64(value){return Uint8Array.from(atob(value),c=>c.charCodeAt(0));}
const headers=(request)=>{
 const origin=request.headers.get('Origin');
 return {'Cache-Control':'no-store','X-Content-Type-Options':'nosniff',
  'Content-Security-Policy':"default-src 'none'",
  'Vary':'Origin',...(origin===PUBLIC_ORIGIN?{'Access-Control-Allow-Origin':PUBLIC_ORIGIN,'Access-Control-Allow-Headers':'authorization,content-type','Access-Control-Allow-Methods':'GET,POST,OPTIONS'}:{})};
};
function response(request,status,body){return new Response(JSON.stringify(body),{status,headers:{...headers(request),'Content-Type':'application/json;charset=utf-8'}});}
function accessKey(request){
 const value=request.headers.get('Authorization')||'';
 const key=value.startsWith('Bearer ')?value.slice(7).trim():'';
 return /^[A-Za-z0-9-]{40,128}$/.test(key)?key:null;
}
async function digest(s){const bytes=await crypto.subtle.digest('SHA-256',encoder.encode('golden-peanut-monitor:v1:'+s));return [...new Uint8Array(bytes)].map(x=>x.toString(16).padStart(2,'0')).join('');}
async function aesKey(env){
 if(!/^[0-9a-fA-F]{64}$/.test(env.MONITOR_ENCRYPTION_KEY||''))throw Error('Monitor encryption not initialized');
 return crypto.subtle.importKey('raw',byteHex(env.MONITOR_ENCRYPTION_KEY),{name:'AES-GCM'},false,['encrypt','decrypt']);
}
async function seal(env,key,accountId){
 const iv=crypto.getRandomValues(new Uint8Array(12)),algorithm={name:'AES-GCM',iv,additionalData:encoder.encode(accountId)};
 const ciphertext=await crypto.subtle.encrypt(algorithm,await aesKey(env),encoder.encode(key));
 return {iv:base64(iv),encrypted:base64(ciphertext)};
}
async function unseal(env,row){
 const algorithm={name:'AES-GCM',iv:unbase64(row.iv),additionalData:encoder.encode(row.account_id)};
 const bytes=await crypto.subtle.decrypt(algorithm,await aesKey(env),unbase64(row.encrypted));
 return new TextDecoder().decode(bytes);
}
async function gw2(key,path){
 const r=await fetch(API+path,{headers:{Authorization:'Bearer '+key,Accept:'application/json','User-Agent':'GoldenPeanutMonitor/1.0'},redirect:'error'});
 if(!r.ok)throw new Error('GW2 endpoint '+path.split('?')[0]+' status '+r.status);
 return r.json();
}
async function paginated(key,path,{maxPages,stopAtExisting=null,db=null,account=null,side=null}={}){
 const all=[];let complete=false,highWaterPage=-1;
 for(let page=0;page<maxPages;page++){
  const url=API+path+'?page='+page+'&page_size='+PAGE_SIZE;
  const res=await fetch(url,{headers:{Authorization:'Bearer '+key,Accept:'application/json','User-Agent':'GoldenPeanutMonitor/1.0'}});
  if(!res.ok)throw Error('GW2 transaction endpoint status '+res.status);
  const rows=await res.json();
  if(!Array.isArray(rows))throw Error('Unexpected GW2 transactions shape');
  const totalPages=Number(res.headers.get('X-Page-Total'));
  if(Number.isFinite(totalPages)&&totalPages>0&&page+1>=totalPages)complete=true;
  if(stopAtExisting&&rows.length){
   // Historical pages are ordered recent-first. After reaching already
   // imported transactions we still inspect the whole current page, then
   // continue one overlap page to avoid ignoring out-of-order transactions.
   let seen=false;
   for(const row of [rows[0],rows.at(-1)]){
    if(!int(row?.id,1))continue;
    const exists=await db.prepare('SELECT 1 FROM gp_monitor_trades WHERE account_id=? AND side=? AND trade_id=? LIMIT 1')
     .bind(account,side,row.id).first();
    if(exists){seen=true;break;}
   }
   if(seen&&page>=1){all.push(...rows);complete=true;break;}
  }
  all.push(...rows);
  highWaterPage=page;
  if(complete||rows.length<PAGE_SIZE){complete=true;break;}
 }
 return {rows:all,complete,highWaterPage};
}
const eventInsert=(env,account,type,side,orderId,item,price,quantity,at,previousRemaining=null,newRemaining=null,keySuffix='')=>{
 const eventKey=[type,side,orderId,keySuffix||at].join(':');
 return env.DB.prepare('INSERT OR IGNORE INTO gp_monitor_events(account_id,event_key,kind,side,order_id,item_id,price,quantity,observed_at,previous_remaining,new_remaining) VALUES(?,?,?,?,?,?,?,?,?,?,?)')
  .bind(account,eventKey,type,side,orderId,item,price,quantity,at,previousRemaining,newRemaining).run();
};
async function batches(promises,limit=20){
 for(let i=0;i<promises.length;i+=limit)await Promise.all(promises.slice(i,i+limit).map(f=>f()));
}
async function monitorAccount(env,row){
 const stamp=now(),account=row.account_id,key=await unseal(env,row);
 const current={},history={},sideNames=['buys','sells'];
 try{
  // Do not mark missing orders cancelled unless BOTH full current books were
  // fetched with complete pagination and no API errors.
  for(const side of sideNames){
   const got=await paginated(key,'/commerce/transactions/current/'+side,{maxPages:MAX_ORDER_PAGES});
   if(!got.complete)throw Error('Current '+side+' has more than '+MAX_ORDER_PAGES+' pages; no order reconciliation');
   current[side]=got.rows;
  }
  for(const side of sideNames){
   const seenBefore=await env.DB.prepare('SELECT 1 FROM gp_monitor_trades WHERE account_id=? AND side=? LIMIT 1').bind(account,side).first();
   // On first enrollment preserve the most recent 400 rows/side without
   // flooding a free Worker with a 90-day backlog of 141k transactions.
   // Subsequent checks get a 60-page safety ceiling for active heavy traders.
   const pages=seenBefore?MAX_HISTORY_PAGES:2;
   const got=await paginated(key,'/commerce/transactions/history/'+side,{maxPages:pages,
    stopAtExisting:true,db:env.DB,account,side});
   history[side]=got.rows;
   // More than 60 pages before reaching history means the poll cannot claim
   // exhaustive coverage. Persist the observed pages and report gap risk.
   if(!got.complete)history[side+'_incomplete']=true; // Old backlog partial; continue sampling NEW trades.
  }
  const recorded=await env.DB.prepare('SELECT account_id,side,order_id,item_id,price,remaining,first_seen_at,closed_at FROM gp_monitor_orders WHERE account_id=? AND closed_at IS NULL').bind(account).all();
  const prior=new Map((recorded.results||[]).map(x=>[x.side+':'+x.order_id,x]));
  let tradeChanges=0,partiallyFilled=0,closedUnknown=0,newOrders=0;
  for(const side of sideNames){
   for(const x of history[side]){
    if(!int(x.id,1)||!int(x.item_id,1)||!int(x.quantity,1)||!int(x.price,1))continue;
    const purchased=Date.parse(x.purchased),created=Date.parse(x.created);
    if(!Number.isFinite(purchased)||purchased<=0||!Number.isFinite(created))continue;
    const old=await env.DB.prepare('SELECT quantity FROM gp_monitor_trades WHERE account_id=? AND side=? AND trade_id=?').bind(account,side,x.id).first();
    const previous=old?.quantity||0,quantity=x.quantity;
    if(quantity>previous){
     await env.DB.prepare('INSERT INTO gp_monitor_trades(account_id,side,trade_id,item_id,price,quantity,created_at,purchased_at,first_observed_at) VALUES(?,?,?,?,?,?,?,?,?) ON CONFLICT(account_id,side,trade_id) DO UPDATE SET quantity=MAX(quantity,excluded.quantity)')
      .bind(account,side,x.id,x.item_id,x.price,quantity,created,purchased,stamp).run();
     await eventInsert(env,account,'trade',side,x.id,x.item_id,x.price,quantity-previous,stamp,null,null,purchased);
     tradeChanges++;
    }
   }
  }
  for(const side of sideNames){
   const seen=new Set();
   for(const x of current[side]){
    if(!int(x.id,1)||!int(x.item_id,1)||!int(x.price,1)||!int(x.quantity,1))continue;
    const k=side+':'+x.id;seen.add(k);
    const prev=prior.get(k);
    if(!prev){
     await env.DB.prepare('INSERT INTO gp_monitor_orders(account_id,side,order_id,item_id,price,remaining,first_seen_at,last_changed_at,closed_at) VALUES(?,?,?,?,?,?,?,?,NULL) ON CONFLICT(account_id,side,order_id) DO UPDATE SET remaining=excluded.remaining,item_id=excluded.item_id,price=excluded.price,closed_at=NULL,last_changed_at=excluded.last_changed_at')
      .bind(account,side,x.id,x.item_id,x.price,x.quantity,stamp,stamp).run();
     newOrders++;continue;
    }
    if(prev.item_id!==x.item_id||prev.price!==x.price||x.quantity>prev.remaining){
     // Repriced/changed identity or quantity increased: NOT a fill.
     await eventInsert(env,account,'changed_unknown',side,x.id,x.item_id,x.price,0,stamp,prev.remaining,x.quantity);
     await env.DB.prepare('UPDATE gp_monitor_orders SET item_id=?,price=?,remaining=?,last_changed_at=? WHERE account_id=? AND side=? AND order_id=?')
      .bind(x.item_id,x.price,x.quantity,stamp,account,side,x.id).run();
    }else if(x.quantity<prev.remaining){
     await eventInsert(env,account,'partial',side,x.id,x.item_id,x.price,prev.remaining-x.quantity,stamp,prev.remaining,x.quantity);
     await env.DB.prepare('UPDATE gp_monitor_orders SET remaining=?,last_changed_at=? WHERE account_id=? AND side=? AND order_id=?')
      .bind(x.quantity,stamp,account,side,x.id).run();
     partiallyFilled++;
    }
   }
   for(const [key,prev] of prior){
    if(prev.side!==side||seen.has(key))continue;
    // Order disappeared: source does not distinguish cancellation from fill.
    await eventInsert(env,account,'disappeared_unknown',side,prev.order_id,prev.item_id,prev.price,0,stamp,prev.remaining,0);
    await env.DB.prepare('UPDATE gp_monitor_orders SET closed_at=? WHERE account_id=? AND side=? AND order_id=? AND closed_at IS NULL')
     .bind(stamp,account,side,prev.order_id).run();
    closedUnknown++;
   }
  }
  await env.DB.prepare('INSERT OR IGNORE INTO gp_monitor_polls(account_id,polled_at,buy_count,sell_count) VALUES(?,?,?,?)')
   .bind(account,stamp,current.buys.length,current.sells.length).run();
  const historyWarning=sideNames.some(x=>history[x+'_incomplete'])?
   'Recent completed trades saved; historical 90-day backfill exceeds per-run page budget':null;
  await env.DB.prepare('UPDATE gp_monitor_credentials SET last_polled_at=?,last_success_at=?,last_error=?,consecutive_failures=0 WHERE account_id=?')
   .bind(stamp,stamp,historyWarning,account).run();
  await finalizeNights(env,account,stamp);
  return {ok:true,account,orders:current.buys.length+current.sells.length,trades:tradeChanges,partials:partiallyFilled,newOrders,closedUnknown,
   historyComplete:!historyWarning};
 }catch(e){
  const code=String(e.message||'Unknown monitor failure').slice(0,140);
  await env.DB.prepare('UPDATE gp_monitor_credentials SET last_polled_at=?,last_error=?,consecutive_failures=consecutive_failures+1 WHERE account_id=?')
   .bind(stamp,code,account).run();
  // Never emit credential details or account trading records into public logs.
  return {ok:false,code:code.replace(/[A-Za-z0-9-]{40,128}/g,'[redacted]')};
 }
}
async function finalizeNights(env,account,stamp){
 // A zero-fill is evidence ONLY when the order remained open for the entire
 // specified 18:00–10:00 UTC window, with a near-continuous series of successful
 // account checks. No completeness claim if GitHub/Cloudflare runs were skipped.
 const t=new Date(stamp),today=Date.UTC(t.getUTCFullYear(),t.getUTCMonth(),t.getUTCDate());
 const end=today+10*3600000,start=today-1*DAY+18*3600000;
 if(stamp<end+15*60000)return;
 const label=new Date(start).toISOString().slice(0,10);
 const polls=await env.DB.prepare('SELECT polled_at FROM gp_monitor_polls WHERE account_id=? AND polled_at BETWEEN ? AND ? ORDER BY polled_at')
  .bind(account,start,end).all();
 const times=(polls.results||[]).map(x=>Number(x.polled_at));
 if(times.length<55||times[0]>start+20*60000||times.at(-1)<end-20*60000)return;
 for(let i=1;i<times.length;i++)if(times[i]-times[i-1]>25*60000)return;
 const orders=await env.DB.prepare('SELECT side,order_id,item_id,price,remaining,first_seen_at,closed_at FROM gp_monitor_orders WHERE account_id=? AND first_seen_at<=? AND (closed_at IS NULL OR closed_at>=?)')
  .bind(account,start,end).all();
 for(const x of orders.results||[]){
  const exists=await env.DB.prepare('SELECT 1 FROM gp_monitor_nights WHERE account_id=? AND side=? AND order_id=? AND night=?').bind(account,x.side,x.order_id,label).first();
  if(exists)continue;
  const changedUnknown=await env.DB.prepare("SELECT 1 FROM gp_monitor_events WHERE account_id=? AND kind='changed_unknown' AND side=? AND order_id=? AND observed_at>=? AND observed_at<=? LIMIT 1")
   .bind(account,x.side,x.order_id,start,end).first();
  if(changedUnknown)continue; // Changed order size/price invalidates continuous exposure.
  const changes=await env.DB.prepare("SELECT SUM(quantity) AS filled FROM gp_monitor_events WHERE account_id=? AND kind='partial' AND side=? AND order_id=? AND observed_at>=? AND observed_at<=?")
   .bind(account,x.side,x.order_id,start,end).first();
  await env.DB.prepare('INSERT OR IGNORE INTO gp_monitor_nights(account_id,night,side,order_id,item_id,filled,observed_polls,window_start,window_end) VALUES(?,?,?,?,?,?,?,?,?)')
   .bind(account,label,x.side,x.order_id,x.item_id,Math.max(0,Number(changes?.filled)||0),times.length,start,end).run();
 }
}
async function handle(request,env,ctx){
 const url=new URL(request.url),pathname=url.pathname;
 if(request.method==='OPTIONS'){
  if(request.headers.get('Origin')!==PUBLIC_ORIGIN)return response(request,403,{ok:false});
  return new Response(null,{status:204,headers:headers(request)});
 }
 if(request.headers.get('Origin')&&request.headers.get('Origin')!==PUBLIC_ORIGIN)
  return response(request,403,{ok:false,error:'Unrecognised app origin'});
 if(pathname==='/health'&&request.method==='GET')return response(request,200,{ok:true,service:'Golden Peanut private-account monitor',mode:'opt-in',intervalMinutes:10});
 if(!['/enroll','/status','/events','/nights','/disable'].includes(pathname))return response(request,404,{ok:false});
 const key=accessKey(request);if(!key)return response(request,401,{ok:false,error:'A connected tradingpost API key is required'});
 if(pathname==='/enroll'&&request.method==='POST'){
  const details=await gw2(key,'/tokeninfo'),permissions=details?.permissions||[];
  if(!permissions.includes('account')||!permissions.includes('tradingpost'))
   return response(request,403,{ok:false,error:'The API key needs account and tradingpost permissions'});
  const account=await gw2(key,'/account');
  if(!/^[a-zA-Z0-9-]{15,80}$/.test(account?.id||''))throw Error('Could not verify ArenaNet account ID');
  const expected=request.headers.get('X-GP-Account');
  if(expected&&expected!==account.name)return response(request,409,{ok:false,error:'Account does not match your selected Golden Peanut account'});
  const tokenDigest=await digest(key),encrypted=await seal(env,key,account.id);
  await env.DB.prepare('INSERT INTO gp_monitor_credentials(account_id,account_name,token_digest,iv,encrypted,enabled,created_at,last_polled_at) VALUES(?,?,?,?,?,1,?,NULL) ON CONFLICT(account_id) DO UPDATE SET account_name=excluded.account_name,token_digest=excluded.token_digest,iv=excluded.iv,encrypted=excluded.encrypted,enabled=1,last_error=NULL')
   .bind(account.id,account.name,tokenDigest,encrypted.iv,encrypted.encrypted,now()).run();
  // Do not wait for the next cron to take the first snapshot.
  ctx.waitUntil(monitorAccount(env,{account_id:account.id,iv:encrypted.iv,encrypted:encrypted.encrypted}));
  return response(request,200,{ok:true,account:account.name,mode:'background',intervalMinutes:10,
   privacy:'Credential encrypted in private Cloudflare D1; revoke through app or GW2 account security'});
 }
 const tokenDigest=await digest(key);
 const credentials=await env.DB.prepare('SELECT account_id,account_name,last_polled_at,last_success_at,last_error,consecutive_failures,enabled FROM gp_monitor_credentials WHERE token_digest=?')
  .bind(tokenDigest).first();
 if(!credentials||credentials.enabled!==1)return response(request,404,{ok:false,error:'Background monitoring is not enrolled'});
 if(pathname==='/status'&&request.method==='GET'){
  const [buys,sells,trades,nights]=await Promise.all([
   env.DB.prepare("SELECT COUNT(*) as n FROM gp_monitor_orders WHERE account_id=? AND side='buys' AND closed_at IS NULL").bind(credentials.account_id).first(),
   env.DB.prepare("SELECT COUNT(*) as n FROM gp_monitor_orders WHERE account_id=? AND side='sells' AND closed_at IS NULL").bind(credentials.account_id).first(),
   env.DB.prepare('SELECT COUNT(*) as n FROM gp_monitor_trades WHERE account_id=?').bind(credentials.account_id).first(),
   env.DB.prepare('SELECT COUNT(*) as n FROM gp_monitor_nights WHERE account_id=?').bind(credentials.account_id).first()
  ]);
  return response(request,200,{ok:true,account:credentials.account_name,enabled:true,
   intervalMinutes:10,lastPoll:credentials.last_polled_at,lastSuccess:credentials.last_success_at,
   lastError:credentials.last_error,failures:credentials.consecutive_failures,
   currentBuys:buys?.n||0,currentSells:sells?.n||0,savedCompletedTrades:trades?.n||0,verifiedOrderNights:nights?.n||0});
 }
 if(pathname==='/disable'&&request.method==='POST'){
  // Explicit user's erasure request: remove credential AND all private cloud
  // observations, without touching browser IndexedDB or public market tables.
  const account=credentials.account_id;
  await env.DB.batch([
   env.DB.prepare('UPDATE gp_monitor_credentials SET enabled=0,encrypted=NULL,iv=NULL WHERE account_id=?').bind(account),
   env.DB.prepare('DELETE FROM gp_monitor_events WHERE account_id=?').bind(account),
   env.DB.prepare('DELETE FROM gp_monitor_nights WHERE account_id=?').bind(account),
   env.DB.prepare('DELETE FROM gp_monitor_orders WHERE account_id=?').bind(account),
   env.DB.prepare('DELETE FROM gp_monitor_trades WHERE account_id=?').bind(account),
   env.DB.prepare('DELETE FROM gp_monitor_polls WHERE account_id=?').bind(account),
   env.DB.prepare('DELETE FROM gp_monitor_credentials WHERE account_id=?').bind(account)
  ]);
  return response(request,200,{ok:true,enabled:false,credentialDeleted:true,cloudRecordsErased:true});
 }
 if(pathname==='/events'&&request.method==='GET'){
  const cursor=Math.max(0,Math.min(1e12,Number(url.searchParams.get('after')||0)))||0;
  const result=await env.DB.prepare("SELECT e.id,e.kind,e.side,e.order_id,e.item_id,e.price,e.quantity,e.observed_at,e.previous_remaining,e.new_remaining,t.quantity AS completed_qty,t.created_at,t.purchased_at FROM gp_monitor_events e LEFT JOIN gp_monitor_trades t ON e.kind='trade' AND t.account_id=e.account_id AND t.side=e.side AND t.trade_id=e.order_id WHERE e.account_id=? AND e.id>? ORDER BY e.id LIMIT 500")
   .bind(credentials.account_id,cursor).all();
  const rows=result.results||[];
  return response(request,200,{ok:true,events:rows,nextCursor:rows.at(-1)?.id||cursor,hasMore:rows.length===500});
 }
 if(pathname==='/nights'&&request.method==='GET'){
  const item=Number(url.searchParams.get('item'));
  if(!int(item,1))return response(request,400,{ok:false,error:'A valid item ID is required'});
  const result=await env.DB.prepare('SELECT night,side,order_id,item_id,filled,observed_polls FROM gp_monitor_nights WHERE account_id=? AND item_id=? ORDER BY night DESC LIMIT 300')
   .bind(credentials.account_id,item).all();
  return response(request,200,{ok:true,nights:result.results||[],sampleKind:'fully observed UTC 18:00–10:00 order exposure',notMarketWide:true});
 }
 return response(request,405,{ok:false});
}
export default {
 async fetch(request,env,ctx){
  try{return await handle(request,env,ctx);}
  catch(e){
   // Only safe generic details. Never echo request headers or API credentials.
   return response(request,503,{ok:false,error:'Monitor temporarily unavailable; retry later'});
  }
 },
 async scheduled(event,env,ctx){
  const result=await env.DB.prepare('SELECT account_id,iv,encrypted FROM gp_monitor_credentials WHERE enabled=1 AND encrypted IS NOT NULL').all();
  for(const row of result.results||[])ctx.waitUntil(monitorAccount(env,row));
 }
};
