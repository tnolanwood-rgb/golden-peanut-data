import {validateHistory} from './history.mjs';
import {Capacitor,CapacitorHttp} from '@capacitor/core';
export const API='https://prices.runescape.wiki/api/v2/osrs';
export const USER_AGENT='TheGoldenExchange/4.0-QA (Android; personal OSRS GE research; bulk cached requests)';
export function validate(path,data){
 if(path.startsWith('timeseries?')){const params=new URLSearchParams(path.split('?')[1]);return validateHistory(data,Number(params.get('id')));}
 if(path==='mapping'){
  const ids=new Set();
  if(!Array.isArray(data)||!data.length||data.some(i=>{if(!i||!Number.isSafeInteger(i.id)||i.id<1||ids.has(i.id)||typeof i.name!=='string'||!i.name.trim()||i.name.length>150||typeof i.members!=='boolean'||(i.icon!=null&&typeof i.icon!=='string')||(i.limit!=null&&(!Number.isSafeInteger(i.limit)||i.limit<0)))return true;ids.add(i.id);return false;}))throw Error('Invalid mapping response');
 }else if(!data||typeof data.data!=='object'||Array.isArray(data.data)||data.data===null||!Object.keys(data.data).length||(path!=='latest'&&!Number.isSafeInteger(data.timestamp)))throw Error(`Invalid ${path} response`);
 return data;
}
export function validateSnapshot(snapshot,now=Date.now()){
 if(!snapshot||!snapshot.times||typeof snapshot.times!=='object')throw Error('Invalid saved market snapshot');
 for(const p of ['mapping','latest','5m','1h']){validate(p,snapshot[p]);if(!Number.isSafeInteger(snapshot.times[p])||snapshot.times[p]<1||snapshot.times[p]>now+60000)throw Error('Invalid saved refresh time');}
 return snapshot;
}
export function shouldRefresh(snapshot,now=Date.now()){
 const at=snapshot?.times?.latest;
 return !Number.isSafeInteger(at)||now-at<0||now-at>300000;
}
export function aggregateFresh(path,data,now=Date.now()){
 if(!['5m','1h'].includes(path))return true;
 const age=now/1000-data?.timestamp;
 return Number.isFinite(age)&&age>=-60&&age<=(path==='5m'?1200:10800);
}
export function retryDelay(headers={},now=Date.now()){
 const raw=headers['retry-after']??headers['Retry-After'];if(raw===undefined)return 0;
 const seconds=Number(raw),wait=Number.isFinite(seconds)?seconds*1000:Date.parse(raw)-now;
 return Number.isFinite(wait)?Math.min(60000,Math.max(0,wait)):0;
}
export async function request(path,transport,delay=ms=>new Promise(r=>setTimeout(r,ms))){
 let last;
 for(let attempt=0;attempt<3;attempt++){
  let retry=true;
  try{
   const response=await (transport||nativeOrWeb)(path);
   if(response.status<200||response.status>=300){retry=response.status===429||response.status>=500;throw Object.assign(Error(`${path}: HTTP ${response.status}`),{status:response.status,wait:retryDelay(response.headers)});}
   return validate(path,typeof response.data==='string'?JSON.parse(response.data):response.data);
  }catch(error){last=error;if(!retry||attempt===2)throw last;await delay(Math.max(error.wait||0,1000*2**attempt));}
 }
 throw last;
}
async function nativeOrWeb(path){
 if(Capacitor.isNativePlatform())return CapacitorHttp.get({url:`${API}/${path}`,headers:{'User-Agent':USER_AGENT,Accept:'application/json'},connectTimeout:12000,readTimeout:18000,responseType:'json'});
 const response=await fetch(`${API}/${path}`,{signal:AbortSignal.timeout(18000),headers:{Accept:'application/json','User-Agent':USER_AGENT}});
 return {status:response.status,headers:Object.fromEntries(response.headers),data:response.ok?await response.json():null};
}
export async function marketSnapshot(previous,now=Date.now(),fetcher=request){
 // Metadata is cached one day; bulk volume endpoints follow their publication cadence.
 const get=async(path,ttl)=>previous?.[path]&&Number.isSafeInteger(previous.times?.[path])&&now-previous.times[path]>=0&&now-previous.times[path]<ttl&&aggregateFresh(path,previous[path],now) ? {data:previous[path],time:previous.times[path],refreshed:false} : {data:await fetcher(path),time:now,refreshed:true};
 const result=await Promise.all(['mapping','latest','5m','1h'].map((p,i)=>get(p,[86400000,60000,300000,3600000][i])));
 const snapshot={checkedAt:now,times:{},refreshed:[]};['mapping','latest','5m','1h'].forEach((p,i)=>{snapshot[p]=result[i].data;snapshot.times[p]=result[i].time;if(result[i].refreshed)snapshot.refreshed.push(p);});return snapshot;
}

const historiesInFlight=new Map();
export async function loadHistory(id,cache={},fetcher=request,now=Date.now()){
 if(!Number.isSafeInteger(id)||id<1)throw Error('Invalid item ID');
 let saved=cache[id];try{if(saved){if(!Number.isSafeInteger(saved.fetchedAt)||saved.fetchedAt<1)throw Error('Invalid cache time');validateHistory(saved.raw,id);}}catch{saved=null;}if(saved&&Number.isFinite(saved.fetchedAt)&&now-saved.fetchedAt>=0&&now-saved.fetchedAt<3600000){validateHistory(saved.raw,id);return {...saved,cached:true};}
 if(historiesInFlight.has(id))return historiesInFlight.get(id);
 const task=(async()=>{try{const raw=await fetcher(`timeseries?lookback=7d&id=${id}`);validateHistory(raw,id);return {raw,fetchedAt:now,cached:false};}catch(error){if(saved){validateHistory(saved.raw,id);return {...saved,cached:true,error:error.message};}throw error;}finally{historiesInFlight.delete(id);}})();
 historiesInFlight.set(id,task);return task;
}
