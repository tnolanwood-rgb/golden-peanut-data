/* Parse the compact public item index off the Android WebView UI thread.
   Transfer small bounded chunks; one giant Worker.onmessage structured clone
   still creates a long main-thread task. This worker is read-only. */
'use strict';
const ALLOWED='https://raw.githubusercontent.com/tnolanwood-rgb/golden-peanut-data/main/data/market_index.json';
const CHUNK_SIZE=250;
self.onmessage=async event=>{
 const data=event.data||{},url=data.url,timeoutMs=Number.isSafeInteger(data.timeoutMs)?Math.min(15000,Math.max(1000,data.timeoutMs)):8000;
 if(url!==ALLOWED){self.postMessage({type:'error',error:'Blocked non-canonical market-index URL'});return;}
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeoutMs);
 try{
  const response=await fetch(url,{cache:'no-cache',signal:controller.signal,credentials:'omit',referrerPolicy:'no-referrer'});
  if(!response.ok)throw Error('public feed HTTP '+response.status);
  const body=await response.json();
  if(body?.schema!=='golden-peanut-index-v1'||!Number.isSafeInteger(body.generated_at)||
     !Number.isSafeInteger(body.count)||!Array.isArray(body.items)||body.count!==body.items.length)
   throw Error('Invalid compact market index response');
  self.postMessage({type:'start',schema:body.schema,generated_at:body.generated_at,count:body.count,generation:body.generation||null});
  for(let offset=0;offset<body.items.length;offset+=CHUNK_SIZE)
   self.postMessage({type:'chunk',items:body.items.slice(offset,offset+CHUNK_SIZE)});
  self.postMessage({type:'done'});
 }catch(error){
  self.postMessage({type:'error',error:String(error?.message||error).slice(0,140)});
 }finally{clearTimeout(timer);}
};