import {openDatabase,databaseGet,databasePut,databaseErase} from './database.mjs';
import {validateTickets,validateOwned,validateResearch} from './workspace.mjs';
import {validGP,MAX_GP,realizedLedger} from './core.mjs';
export const defaults={budget:'0',mode:'f2p',minVolume:'50',age:'120',view:'top',sort:'opportunity',maxShare:'40',reserve:'10',profile:'balanced',avoidHeld:'yes',goal:'1000000',freeSlots:'auto',restriction:'unknown'};
const personalKeys=[...Object.keys(defaults),'trades','watch','lastBackup','tickets','owned','setupComplete','simpleView','audit','_hubSourceSuppressed'];
const arrayKeys=['trades','watch','tickets','owned','audit'];
const fallbackFor=k=>arrayKeys.includes(k)?[]:defaults[k]??null;
let database=null,databaseText,bootError=null,schemaTooNew=false,writeQueue=Promise.resolve();const auxiliary=new Map();
export async function initializeStorage(){
 if(typeof indexedDB==='undefined')return;
 try{database=await openDatabase();databaseText=await databaseGet(database,'personal');if(databaseText&&JSON.parse(databaseText)._schemaVersion>3){schemaTooNew=true;throw Error('This database needs a newer app version. Original data is retained.');}for(const key of ['snapshot','history-cache']){const value=await databaseGet(database,key);if(value!==undefined)auxiliary.set(key,value);}
 if(databaseText===undefined&&!storageIssues().length){const initial=Object.fromEntries(personalKeys.map(k=>[k,read(k,fallbackFor(k))]));const originals={};for(let n=0;n<localStorage.length;n++){const key=localStorage.key(n);if(key?.startsWith('golden-hub-v4:'))originals[key]=localStorage.getItem(key);}
 initial._schemaVersion=3;initial.trades=initial.trades.map(t=>({...t,uid:t.uid??crypto.randomUUID(),...(t.side==='sell'&&!t.taxBasis?{taxBasis:'legacy-current-rule-assumed'}:{})}));const text=JSON.stringify(initial);await databasePut(database,[['legacy-v32-originals',originals],['personal',text],['migration-time',new Date().toISOString()]]);databaseText=text;}await importHubJournal();}catch(e){bootError=e.message;throw e;}
}
function enqueue(operation){const result=writeQueue.catch(()=>{}).then(operation);writeQueue=result;return result;}
const issues=new Set();let cachedStorage,cachedText,cachedState={},checked=new Map();
const legacyRead=(key,fallback)=>{try{const v=localStorage.getItem('golden-hub-v4:'+key);return v===null?fallback:JSON.parse(v);}catch{if(personalKeys.includes(key))issues.add(key);return fallback;}};
function state(){
 if(cachedStorage!==globalThis.localStorage){cachedStorage=globalThis.localStorage;cachedText=undefined;checked.clear();issues.clear();}
 let raw;try{raw=databaseText===undefined?localStorage.getItem('golden-hub-v4:state-v2'):databaseText;}catch{issues.add('device storage');return {};}
 if(raw!==cachedText){cachedText=raw;checked.clear();issues.clear();try{cachedState=raw===null?{}:JSON.parse(raw);if(!cachedState||typeof cachedState!=='object'||Array.isArray(cachedState))throw Error();}catch{cachedState={};issues.add('saved state');}}
 return cachedState;
}
function validatePersonal(key,value){
 if(key==='audit')return validateAudit(value);
 if(key==='trades')return validateTrades(value);
 if(key==='tickets')return validateTickets(value);
 if(key==='owned')return validateOwned(value);
 if(key==='watch'){if(!Array.isArray(value)||value.length>10000||value.some(id=>!Number.isSafeInteger(id)||id<1))throw Error();return [...new Set(value)];}
 if(key==='setupComplete'||key==='simpleView'||key==='_hubSourceSuppressed'){if(value!==null&&typeof value!=='boolean')throw Error();return value;}
 if(key==='lastBackup'){if(value!==null&&(typeof value!=='string'||!Number.isFinite(Date.parse(value))))throw Error();return value;}
 return validateBackup({format:'golden-exchange-ledger-v1',trades:[],settings:{[key]:value}}).settings[key];
}
export function read(key,fallback){
 const raw=state();if(!personalKeys.includes(key))return auxiliary.has(key)?auxiliary.get(key):legacyRead(key,fallback);
 if(checked.has(key)){const entry=checked.get(key);return entry.ok?entry.value:fallback;}
 const value=Object.hasOwn(raw,key)?raw[key]:legacyRead(key,fallback);
 try{const clean=validatePersonal(key,value);checked.set(key,{ok:true,value:clean});return clean;}catch{issues.add(key);checked.set(key,{ok:false});return fallback;}
}
export function storageIssues(){for(const key of personalKeys)read(key,fallbackFor(key));return [...issues,...(bootError?['database: '+bootError]:[])];}
export function saveMany(values,options={}){if(database)return enqueue(()=>commitMany(values,options));return commitMany(values,options);}
function commitMany(values,{recover=false}={}){
 if(schemaTooNew)throw Error('A newer app version is required; refusing to overwrite its records.');
 if(typeof indexedDB!=='undefined'&&!database)throw Error('Local database unavailable; no records changed.');
 if(storageIssues().length&&!recover)throw Error('Saved data needs recovery. Restore a JSON backup in More tools → Journal. Original data has been kept.');
 const next=Object.fromEntries(personalKeys.map(k=>[k,read(k,fallbackFor(k))]));
 for(const [key,value] of Object.entries(values)){if(!personalKeys.includes(key))continue;next[key]=validatePersonal(key,value);}
 if(database){
  next._schemaVersion=3;next.trades=next.trades.map(t=>({...t,uid:t.uid??crypto.randomUUID(),...(t.side==='sell'&&!t.taxBasis?{taxBasis:'legacy-current-rule-assumed'}:{})}));
  if(Object.hasOwn(values,'trades')||Object.hasOwn(values,'owned')){
   const before=read('trades',[]),events=[];const old=new Map(before.map(t=>[t.uid,t])),after=new Map(next.trades.map(t=>[t.uid,t]));
   if(recover)events.push({action:'restore',beforeCount:before.length,afterCount:next.trades.length});
   else{for(const t of next.trades){const b=old.get(t.uid);if(JSON.stringify(b)!==JSON.stringify(t))events.push({action:b?'correct':'add',tradeUid:t.uid,before:b??null,after:t});}for(const t of before)if(!after.has(t.uid))events.push({action:'remove',tradeUid:t.uid,before:t,after:null});if(Object.hasOwn(values,'owned'))events.push({action:'owned-update',beforeCount:read('owned',[]).length,afterCount:next.owned.length});}
   next.audit=validateAudit([...next.audit,...events.map(e=>({...e,uid:crypto.randomUUID(),at:new Date().toISOString()}))]);
  }
 }
 const text=JSON.stringify(next);if(database)return databasePut(database,[['previous-personal',databaseText],['personal',text]]).then(()=>{databaseText=text;bootError=null;});localStorage.setItem('golden-hub-v4:state-v2',text);
}
export function save(key,value){if(personalKeys.includes(key))return saveMany({[key]:value});else if(database)return enqueue(async()=>{await databasePut(database,[[key,value]]);auxiliary.set(key,value);});else localStorage.setItem('golden-hub-v4:'+key,JSON.stringify(value));}
function validateTrades(rows,checkInventory=true){
 if(!Array.isArray(rows)||rows.length>100000)throw Error('Invalid journal');
 let total=0;const ids=new Set();
 const result=rows.map(t=>{
  if(!t||!['buy','sell','adjust-in','adjust-out'].includes(t.side)||!Number.isSafeInteger(t.id)||t.id<1||typeof t.name!=='string'||!t.name.trim()||t.name.length>150||!validGP(t.qty)||!validGP(t.price)||!Number.isSafeInteger(t.qty*t.price)||typeof t.date!=='string'||!Number.isFinite(Date.parse(t.date))||Date.parse(t.date)>Date.now())throw Error('Invalid journal entry; nothing imported');
  total+=t.qty*t.price;if(total>Number.MAX_SAFE_INTEGER/4)throw Error('Backup exceeds exact arithmetic limits');
  const extra={};if(t.uid!==undefined){if(typeof t.uid!=='string'||!t.uid||t.uid.length>100||ids.has(t.uid))throw Error('Duplicate or invalid transaction ID');ids.add(t.uid);extra.uid=t.uid;}
  if(t.reason!==undefined){if(typeof t.reason!=='string'||t.reason.length>250)throw Error('Invalid correction reason');extra.reason=t.reason;}
  if(t.side.startsWith('adjust-')&&(!t.reason||t.reason.trim().length<3))throw Error('Inventory adjustments require a reason');
  if(t.taxPaid!==undefined){if(t.side!=='sell'||!Number.isSafeInteger(t.taxPaid)||t.taxPaid<0||t.taxPaid>t.qty*t.price)throw Error('Invalid actual sale tax');extra.taxPaid=t.taxPaid;}
  if(t.taxBasis!==undefined){if(!['actual-total','current-rule-assumed','legacy-current-rule-assumed'].includes(t.taxBasis))throw Error('Invalid tax provenance');extra.taxBasis=t.taxBasis;}
  if(t.ticketKey!==undefined){if(typeof t.ticketKey!=='string'||t.ticketKey.length>100)throw Error('Invalid ticket reference');extra.ticketKey=t.ticketKey;}
  if(t.research)extra.research=validateResearch(t.research);
  return {id:t.id,name:t.name,side:t.side,qty:t.qty,price:t.price,date:t.date,...extra};
 });
 if(checkInventory&&realizedLedger(result).unmatchedAdjustments)throw Error('Inventory removal exceeds earlier recorded stock');return result;
}
export function validateBackup(data){
 if(!['golden-exchange-backup-v3','golden-exchange-backup-v2','golden-exchange-backup-v1','golden-exchange-ledger-v1'].includes(data?.format)||!Array.isArray(data.trades)||data.trades.length>100000)throw Error('Invalid Golden Exchange backup');
 const trades=validateTrades(data.trades);if(data.format==='golden-exchange-backup-v3'&&trades.some(t=>!t.uid))throw Error('Version 3 backups require transaction IDs');
 if(data.settings!==undefined&&(!data.settings||typeof data.settings!=='object'||Array.isArray(data.settings)))throw Error('Invalid settings');
 const settings=Object.fromEntries(Object.keys(defaults).map(k=>[k,data.settings&&Object.hasOwn(data.settings,k)?data.settings[k]:defaults[k]]));
 if(Object.values(settings).some(v=>!['string','number'].includes(typeof v)||String(v).trim()===''))throw Error('Invalid settings');
 if(!Number.isSafeInteger(Number(settings.budget))||Number(settings.budget)<0||Number(settings.budget)>MAX_GP||!['members','f2p'].includes(settings.mode)||!Number.isSafeInteger(Number(settings.minVolume))||Number(settings.minVolume)<0||![30,90,120,240].includes(Number(settings.age))||!['top','watch','all'].includes(settings.view)||!['opportunity','profit','roi'].includes(settings.sort))throw Error('Invalid settings');
 if(![20,40,100].includes(Number(settings.maxShare))||![0,10,25].includes(Number(settings.reserve)))throw Error('Invalid allocation settings');
 if(!['balanced','cautious'].includes(settings.profile)||!['yes','no'].includes(settings.avoidHeld)||!Number.isSafeInteger(Number(settings.goal))||Number(settings.goal)<0||Number(settings.goal)>MAX_GP)throw Error('Invalid intelligence settings');
 if(settings.freeSlots!=='auto'&&(!Number.isInteger(Number(settings.freeSlots))||Number(settings.freeSlots)<0||Number(settings.freeSlots)>8))throw Error('Invalid free slots');
 const watch=data.watch||[];if(!Array.isArray(watch)||watch.length>10000||watch.some(id=>!Number.isSafeInteger(id)||id<1))throw Error('Invalid watchlist');
 if(!['unknown','restricted','clear'].includes(settings.restriction))throw Error('Invalid account restrictions');
 return {trades,settings,watch,tickets:validateTickets(data.tickets||[]),owned:validateOwned(data.owned||[]),...(data.format==='golden-exchange-backup-v3'?{audit:validateAudit(data.audit||[])}:{})};
}

function validateAudit(rows){if(!Array.isArray(rows)||rows.length>100000)throw Error('Invalid or oversized audit trail');const seen=new Set();return rows.map(e=>{if(!e||typeof e.uid!=='string'||!e.uid||e.uid.length>100||seen.has(e.uid)||!Number.isFinite(Date.parse(e.at))||!['add','correct','remove','restore','owned-update'].includes(e.action))throw Error('Invalid audit entry');seen.add(e.uid);const out={uid:e.uid,at:e.at,action:e.action};if(e.tradeUid!==undefined){if(typeof e.tradeUid!=='string'||e.tradeUid.length>100)throw Error('Invalid audit reference');out.tradeUid=e.tradeUid;}for(const k of ['before','after'])if(e[k])out[k]=validateTrades([e[k]],false)[0];else if(e[k]===null)out[k]=null;for(const k of ['beforeCount','afterCount'])if(e[k]!==undefined){if(!Number.isSafeInteger(e[k])||e[k]<0||e[k]>100000)throw Error('Invalid audit count');out[k]=e[k];}return out;});}

export async function eraseLocalData(){
 if(!database||schemaTooNew)throw Error('Local database is unavailable or needs a newer app.');
 return enqueue(async()=>{
  const empty={...defaults,trades:[],watch:[],tickets:[],owned:[],audit:[],setupComplete:false,simpleView:true,lastBackup:null,_schemaVersion:3,_hubSourceSuppressed:true};
  // The empty authoritative record prevents legacy resurrection even if legacy deletion fails.
  const text=JSON.stringify(empty);await databaseErase(database,text);databaseText=text;bootError=null;auxiliary.clear();
  for(const key of Object.keys(localStorage))if(key.startsWith('golden-hub-v4:'))localStorage.removeItem(key);
 });
}

// Non-destructive bridge from the early Hub journal. The raw source and every
// imported source identity are retained transactionally before it becomes canonical.
async function importHubJournal(){
 if(!database)return;
 if(JSON.parse(databaseText)?._hubSourceSuppressed){localStorage.setItem('gh-osrs-v4-active','true');return;}
 const raw=localStorage.getItem('gh-osrs-v1-ledger');
 const cfgRaw=localStorage.getItem('gh-osrs-v1-config');
 const sourceText=raw??'[]';
 const digest=async value=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)))].map(x=>x.toString(16).padStart(2,'0')).join('');
 const fingerprint=await digest(sourceText),prior=await databaseGet(database,'hub-source-import');
 if(prior?.fingerprint===fingerprint){localStorage.setItem('gh-osrs-v4-active','true');return;}
 const source=JSON.parse(sourceText);
 if(!Array.isArray(source)||source.length>100000)throw Error('Original Hub journal needs recovery; it was not changed');
 const converted=(await convertHubBackup({format:'golden-hub-osrs-v1',records:source})).trades;
 const validated=validateBackup({format:'golden-exchange-backup-v3',trades:converted});
 const current=JSON.parse(databaseText),seen=new Set(prior?.identities||[]),byId=new Map(current.trades.map(t=>[t.uid,t]));
 for(const row of validated.trades){
  if(seen.has(row.uid)){
   if(prior.sourceRows?.[row.uid]&&prior.sourceRows[row.uid]!==JSON.stringify(row))throw Error('Original Hub record was corrected after handoff; both journals retained. Export and reconcile before importing.');
   continue; // Unchanged source must not overwrite corrections made in the advanced desk.
  }
  if(byId.has(row.uid))throw Error('Conflicting Hub transaction identity; neither journal was changed');
  byId.set(row.uid,row);
 }
 const next={...current,trades:[...byId.values()]};
 const config=JSON.parse(cfgRaw||'{}');
 if((raw!==null||cfgRaw!==null)&&!prior&&!current.setupComplete&&!current.trades.length&&!current.tickets.length){
  if(Number.isSafeInteger(config.budget)&&config.budget>=0&&config.budget<=MAX_GP)next.budget=String(config.budget);
  if(['f2p','members'].includes(config.mode))next.mode=config.mode;
  next.restriction=config.restricted==='clear'?'clear':'unknown';
  next.watch=Array.isArray(config.watchlist)?config.watchlist:[];next.setupComplete=true;
 }
 validateBackup({format:'golden-exchange-backup-v3',trades:next.trades,settings:next,watch:next.watch,tickets:next.tickets,owned:next.owned,audit:next.audit});
 const text=JSON.stringify(next);
 await databasePut(database,[['hub-source-original-'+fingerprint,{raw,config:cfgRaw,at:new Date().toISOString()}],
  ['hub-source-import',{fingerprint,identities:[...new Set([...seen,...converted.map(t=>t.uid)])],sourceRows:{...(prior?.sourceRows||{}),...Object.fromEntries(converted.map(row=>[row.uid,JSON.stringify(row)]))}}],['personal',text]]);
 databaseText=text;cachedText=undefined;checked.clear();
 localStorage.setItem('gh-osrs-v4-active','true');
}

export async function convertHubBackup(data){
 if(data?.format!=='golden-hub-osrs-v1'||!Array.isArray(data.records)||data.records.length>100000)throw Error('Invalid Golden Hub backup');
 const source=data.records;
 const digest=async value=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)))].map(x=>x.toString(16).padStart(2,'0')).join('');
 const occurrences=new Map(),converted=[];
 for(const row of source){
  if(!['buy','sell'].includes(row?.side)||typeof row.when!=='string')throw Error('Original Hub row needs recovery');
  const key=[row.id,row.side,row.qty,row.price,row.when].join('|'),n=(occurrences.get(key)||0)+1;occurrences.set(key,n);
  const identity=String(row.rid||'legacy:'+key+'#'+n),uid='gh-'+await digest(identity);
  converted.push({uid,id:row.id,name:row.name,side:row.side,qty:row.qty,price:row.price,date:row.when,
   ...(row.taxPaid!==undefined?{taxPaid:row.taxPaid,taxBasis:'actual-total'}:row.side==='sell'?{taxBasis:'legacy-current-rule-assumed'}:{})});
 }
 return {format:'golden-exchange-backup-v3',...validateBackup({format:'golden-exchange-backup-v3',trades:converted,watch:[],tickets:[],owned:[],audit:[]})};
}
