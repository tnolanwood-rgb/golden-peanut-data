/* Unified OSRS journal handoff. The GW2 database is never opened here. */
(function(win,doc){
'use strict';let frame=null,opened=false,summary=null,pendingRecord=null;
const active=()=>{try{return localStorage.getItem('gh-osrs-v4-active')==='true'}catch{return false}};
const storage=()=>new Promise((resolve,reject)=>{const r=indexedDB.open('golden-hub-osrs-v4',1);r.onerror=()=>reject(r.error);r.onupgradeneeded=()=>{r.transaction.abort();reject(Error('Advanced workspace not initialized'))};r.onsuccess=()=>resolve(r.result)});
async function refresh(){
 if(!active())return null;
 const db=await storage();
 try{
  const text=await new Promise((resolve,reject)=>{const tx=db.transaction('records','readonly'),r=tx.objectStore('records').get('personal');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)});
  if(typeof text!=='string')return null;
  const data=JSON.parse(text),core=await import('./exchange/src/core.mjs');
  const ledger=core.realizedLedger(data.trades||[]),profit=core.periodProfit(ledger);
  summary={today:profit.today,lastWeek:profit.week,rows:data.trades.length,trades:data.trades};
  win.dispatchEvent(new Event('golden-exchange-summary'));return summary;
 }finally{db.close()}
}
function open(recordId){
 const panel=doc.getElementById('gh-panel-osrs');if(!panel)return;
 if(!frame){
  const shell=doc.createElement('section');shell.id='gh-advanced-shell';
  const back=doc.createElement('button');back.type='button';back.className='gp-guide-secondary';back.textContent='← Return to market research';back.onclick=close;
  frame=doc.createElement('iframe');frame.id='gh-advanced-frame';frame.title='Golden Exchange advanced trading desk';frame.src='./exchange/index.html';
  frame.style.cssText='display:block;width:100%;height:calc(100dvh - 120px);min-height:550px;border:0';shell.append(back,frame);panel.append(shell);
 }
 opened=true;doc.getElementById('gh-osrs-root').hidden=true;frame.parentElement.hidden=false;
 if(Number.isSafeInteger(recordId))pendingRecord=recordId;
 if(pendingRecord&&frame.contentWindow?.GoldenExchangeHub?.record?.(pendingRecord))pendingRecord=null;
 win.dispatchEvent(new Event('golden-exchange-view'));
}
function close(){opened=false;if(frame)frame.parentElement.hidden=true;const root=doc.getElementById('gh-osrs-root');if(root)root.hidden=false;void refresh().catch(()=>{});win.dispatchEvent(new Event('golden-exchange-view'))}
win.addEventListener('message',event=>{
 if(!frame||event.source!==frame.contentWindow||event.origin!==location.origin)return;
 if(event.data?.type==='golden-exchange-switch-gw2'){win.GoldenDualHub?.switchGame?.('gw2');return;}
 if(event.data?.type==='golden-exchange-updated'){
  void refresh().catch(()=>{});
  if(pendingRecord&&frame.contentWindow.GoldenExchangeHub?.record?.(pendingRecord))pendingRecord=null;
 }
});
win.GoldenOSRSAdvanced={active,open,close,refresh,summary:()=>summary,isOpen:()=>opened,
 back:()=>{if(!opened)return false;if(frame.contentWindow.GoldenExchangeHub?.back?.())return true;close();return true;}};
})(window,document);
