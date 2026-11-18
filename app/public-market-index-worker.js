/* Parse the compact public item index away from the Android WebView UI thread.
   This worker is read-only and accepts only the repository's public index URL. */
'use strict';
const ALLOWED='https://raw.githubusercontent.com/tnolanwood-rgb/golden-peanut-data/main/data/market_index.json';
self.onmessage=async event=>{
 const data=event.data||{},url=data.url,timeoutMs=Number.isSafeInteger(data.timeoutMs)?Math.min(15000,Math.max(1000,data.timeoutMs)):8000;
 if(url!==ALLOWED){self.postMessage({ok:false,error:'Blocked non-canonical market-index URL'});return;}
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeoutMs);
 try{
  const response=await fetch(url,{cache:'no-cache',signal:controller.signal,credentials:'omit',referrerPolicy:'no-referrer'});
  if(!response.ok)throw Error('public feed HTTP '+response.status);
  const body=await response.json();
  self.postMessage({ok:true,body});
 }catch(error){
  self.postMessage({ok:false,error:String(error?.message||error).slice(0,140)});
 }finally{clearTimeout(timer);}
};