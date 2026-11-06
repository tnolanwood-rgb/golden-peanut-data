/* Golden Peanut private account-monitor client (explicit opt-in).
 * Never uploads a GW2 key to GitHub, logs, or a query parameter. A key is sent
 * to the user's isolated Cloudflare Worker only after Enable is pressed.
 * Completed transactions are imported through the existing validated,
 * append-only ledger importer; local browser history is never cleared.
 */
(function(root){'use strict';
const BASE='https://golden-peanut-account-monitor.tnolanwood.workers.dev';
const STATUS_MINUTES=5;
const active=new Map(),nights=new Map(),nightPending=new Map(),nightFailures=new Map();
const availability={ready:false,mode:null,at:0,checking:false,flight:null};
async function probeHealth({force=false}={}){
 if(availability.flight)return availability.flight;
 if(!force&&availability.at&&Date.now()-availability.at<5*60000)return availability.ready;
 availability.checking=true;
 availability.flight=(async()=>{
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),7000);
  try{
   const r=await fetch(BASE+'/health',{method:'GET',signal:controller.signal,
    cache:'no-store',headers:{Accept:'application/json'}});
   if(!r.ok)throw Error('Monitor not deployed');
   const v=await r.json();
   availability.mode=v?.mode||null;
   availability.ready=!!(v?.ok&&['opt-in','github-actions-fallback'].includes(v?.mode)&&Number(v?.intervalMinutes)>0);
  }catch{availability.ready=false;}
  finally{clearTimeout(timer);availability.at=Date.now();availability.checking=false;}
  root.GPFocus?.render?.();
  return availability.ready;
 })().finally(()=>{availability.flight=null;});
 return availability.flight;
}
const now=()=>Date.now();
const valid=x=>Number.isSafeInteger(x)&&x>0;
const current=()=>root.GoldenPeanutClean?.State||null;
async function request(state,path,opts={}){
 if(!state?.key||!state?.account)throw Error('Connect the GW2 trading account first');
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),20000);
 try{
  const headers={Authorization:'Bearer '+state.key};
  if(opts.body!==undefined){headers['Content-Type']='application/json';headers['X-GP-Account']=state.account;}
  const response=await fetch(BASE+path,{method:opts.method||'GET',
   headers,body:opts.body!==undefined?JSON.stringify(opts.body):undefined,signal:controller.signal,cache:'no-store'});
  const json=await response.json().catch(()=>null);
  if(!response.ok||!json?.ok)throw Error(json?.error||'Monitor returned HTTP '+response.status);
  if(json.account&&json.account!==state.account)throw Error('Cloud monitor account mismatch; no data was imported');
  return json;
 }finally{clearTimeout(timer);}
}
const getEntry=account=>{
 let x=active.get(account);
 if(!x){x={enabled:false,checkedAt:0,status:null,lastError:null,syncing:false,consent:false};active.set(account,x);}
 return x;
};
function status(account){return {...getEntry(account||current()?.account||''),serviceReady:availability.ready,serviceMode:availability.mode,serviceChecked:!!availability.at,serviceChecking:availability.checking};}
function wake(){root.GPFocus?.render?.();}
async function loadPreferences(state){
 if(!state?.db||!state.account)return;
 const stored=(await state.db.get('config',state.account,'cloud-account-monitor-v1'))?.value;
 if(stored?.enabled){const x=getEntry(state.account);x.enabled=true;x.consent=true;x.lastError=null;return true;}
 return false;
}
async function enable(state=current()){
 if(!state?.key||!state?.account)throw Error('Connect your GW2 trading account first');
 if(!state.db)throw Error('Open your saved account data before enabling');
 if(!(await probeHealth({force:true})))throw Error('Background monitor is not deployed or reachable. Your API key was not sent.');
 const x=getEntry(state.account);
 if(x.syncing)throw Error('Monitor is already checking its connection');
 x.syncing=true;x.lastError=null;wake();
 try{
  // Secure one-time key escrow: the Cloudflare Worker verifies the account
  // and encrypts the key in private D1 using a Worker-only AES secret.
  const result=await request(state,'/enroll',{method:'POST',body:{consent:true}});
  if(result.account!==state.account)throw Error('Monitor account differs from your selected account');
  await state.db.put('config',state.account,'cloud-account-monitor-v1',{enabled:true,confirmedAt:now(),intervalMinutes:result.intervalMinutes});
  x.enabled=true;x.consent=true;
  return {enabled:true,account:state.account};
 }catch(e){x.lastError=String(e.message||e).slice(0,180);throw e;}
 finally{x.syncing=false;wake();}
}
/* Opt in to a GitHub Actions-secret-backed collector AFTER its first
 * successful run. The user must put their key into GitHub Actions Secrets
 * themselves; this function never sends or writes a GitHub secret. */
async function connectGithub(state=current()){
 if(!state?.key||!state?.account||!state.db)
  throw Error('Connect your Golden Peanut trading account first.');
 const x=getEntry(state.account);
 if(x.syncing)throw Error('A monitor check is already running.');
 x.lastError=null;x.syncing=true;wake();
 try{
  const result=await request(state,'/status');
  if(result.backend!=='github-actions'||!result.enabled)
   throw Error('No active GitHub monitor for this account yet. Add the GitHub Actions secret and allow its first collection to finish.');
  await state.db.put('config',state.account,'cloud-account-monitor-v1',{
   enabled:true,mode:'github-actions',confirmedAt:now(),intervalMinutes:30
  });
  x.enabled=true;x.consent=true;x.checkedAt=0;x.status=result;
 }catch(e){x.lastError=String(e.message||e).slice(0,200);throw e;}
 finally{x.syncing=false;wake();}
 return refresh(state,{force:true});
}
async function refresh(state=current(),{force=false}={}){
 if(!state?.account||!state?.key||!state?.db)return null;
 const x=getEntry(state.account);
 if(!x.enabled||x.syncing||(!force&&now()-x.checkedAt<STATUS_MINUTES*60000))return x.status;
 x.syncing=true;x.lastError=null;
 try{
  const remote=await request(state,'/status');
  if(!remote.enabled)throw Error('Background monitoring has been disabled');
  x.checkedAt=now();x.status=remote;
  // Account-scoped event cursor: acknowledge a page ONLY after its trade
  // contents are safely imported into the original IndexedDB ledger.
  let cursor=(await state.db.get('config',state.account,'cloud-monitor-cursor-v1'))?.value?.cursor||0;
  let ledgerChanged=false,eventsCaptured=0,partialBuys=0,partialSells=0;
  for(let page=0;page<25;page++){
   if(state.account!==remote.account)break;
   const payload=await request(state,'/events?after='+encodeURIComponent(cursor));
   const rows=payload.events||[];
   const trades=[];
   for(const e of rows){
    if(e.kind==='trade'&&valid(e.order_id)&&valid(e.item_id)&&valid(e.price)&&valid(e.completed_qty)&&
       Number.isFinite(e.created_at)&&Number.isFinite(e.purchased_at)&&['buys','sells'].includes(e.side)){
     trades.push({key:'history/'+e.side+':'+e.order_id,id:e.order_id,item:e.item_id,
      price:e.price,q:e.completed_qty,created:e.created_at,purchased:e.purchased_at,
      side:e.side==='buys'?'buy':'sell'});
    }else if(e.kind==='partial'&&valid(e.quantity)){
     if(e.side==='buys')partialBuys+=e.quantity;
     else if(e.side==='sells')partialSells+=e.quantity;
    }
   }
   if(trades.length){
    const saved=await state.db.importLedger(state.account,trades,{source:'Verified ArenaNet background monitor'});
    if(saved.added||saved.amended)ledgerChanged=true;
   }
   if(rows.length){
    eventsCaptured+=rows.length;
    // Store a bounded raw change feed, separately from the historical ledger.
    // This is for after-action analyses, not a duplicate source of profit.
    const old=(await state.db.get('config',state.account,'cloud-monitor-events-v1'))?.value||[];
    const next=[...old,...rows].slice(-12000);
    await state.db.put('config',state.account,'cloud-monitor-events-v1',next);
    cursor=payload.nextCursor;
    await state.db.put('config',state.account,'cloud-monitor-cursor-v1',{cursor,at:now()});
   }
   if(!payload.hasMore)break;
  }
  if(ledgerChanged&&state.account===remote.account){
   const saved=await state.db.all('ledger',state.account);
   state.ledger=saved.map(r=>r.value);
   state.summary=root.PeanutCore?.summarizeLedger?.(state.ledger)||state.summary;
   try{await root.GPExecution?.update?.(state,now());}catch{}
  }
  x.lastImportedEvents=eventsCaptured;x.lastObservedBuyUnits=partialBuys;x.lastObservedSellUnits=partialSells;
  await state.db.put('config',state.account,'cloud-monitor-status-v1',{...remote,checkedAt:x.checkedAt,eventsCaptured});
  return remote;
 }catch(e){
  x.lastError=String(e.message||e).slice(0,180);
  return null;
 }finally{x.syncing=false;wake();}
}
function peekNights(account,item){
 return nights.get(account+'|'+item)?.data||null;
}
async function fetchNights(state=current(),item){
 if(!state?.key||!state?.account||!valid(item))return null;
 const id=state.account+'|'+item,cached=nights.get(id);
 if(cached&&now()-cached.at<10*60000)return cached.data;
 if(nightPending.has(id))return nightPending.get(id);
 if(now()-(nightFailures.get(id)||0)<10*60000)return null;
 const promise=(async()=>{
  const payload=await request(state,'/nights?item='+item);
  const grouped={buys:[],sells:[],supported:false,source:payload.sampleKind};
  const bySide=new Map();
  for(const e of payload.nights||[]){
   if(!['buys','sells'].includes(e.side)||!Number.isSafeInteger(Number(e.filled))||e.filled<0)continue;
   const key=e.side+'|'+e.night,v=bySide.get(key)||{side:e.side,night:e.night,filled:0,observedOrders:0};
   v.filled+=e.filled;v.observedOrders++;bySide.set(key,v);
  }
  for(const v of bySide.values())grouped[v.side].push(v);
  for(const x of ['buys','sells'])grouped[x].sort((a,b)=>a.night.localeCompare(b.night));
  grouped.supported=grouped.buys.length>=5&&grouped.sells.length>=5;
  nights.set(id,{at:now(),data:grouped});
  return grouped;
 })().catch(e=>{nightFailures.set(id,now());throw e;}).finally(()=>nightPending.delete(id));
 nightPending.set(id,promise);
 return promise;
}
async function disable(state=current()){
 if(!state?.key||!state?.account)throw Error('Connect your GW2 account first');
 const x=getEntry(state.account);
 await request(state,'/disable',{method:'POST',body:{erase:true}});
 await state.db.put('config',state.account,'cloud-account-monitor-v1',{enabled:false,disabledAt:now()});
 x.enabled=false;x.status=null;x.lastError=null;for(const k of nights.keys())if(k.startsWith(state.account+'|'))nights.delete(k);
 wake();return true;
}
function start(){
 const state=current();if(!state)return;
 void probeHealth();
 // The phone never polls when hidden. The Worker does the background
 // sampling once the user explicitly enables encrypted monitoring.
 const connect=async()=>{
  const s=current();
  if(s?.db&&s.account&&s.key){await loadPreferences(s).catch(()=>{});await refresh(s).catch(()=>{});}
 };
 window.addEventListener('pageshow',()=>{void probeHealth();void connect();});
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)void connect();});
 window.addEventListener('gp-account-changed',()=>{void connect();});
 setTimeout(()=>{void connect();},1500);
 setInterval(()=>{if(!document.hidden)void connect();},5*60000);
}
root.GPCloudAccount={buildId:'7.16.0-evidence',enable,refresh,status,peekNights,fetchNights,disable,loadPreferences,probeHealth,connectGithub};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})(typeof globalThis!=='undefined'?globalThis:this);
