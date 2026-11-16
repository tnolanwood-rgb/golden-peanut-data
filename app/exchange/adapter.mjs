// UI-only continuity; no API keys, records or portfolio data in this snapshot.
const embedded=parent!==window;
const KEY='gh-v4-ui-session-v1';let restoring=false,saved=null,ready=false,pending=true,timer;
try{if(embedded)saved=JSON.parse(localStorage.getItem(KEY)||'null');if(Date.now()-saved?.at>86400000||Date.now()<saved?.at)saved=null;}catch{}
const send=()=>{if(parent!==window)parent.postMessage({type:'golden-exchange-updated'},location.origin);};
function remember(){
 if(!embedded||restoring||!ready)return;
 const inputs={};for(const node of document.querySelectorAll('input[id],select[id],textarea[id]'))if(!['file','password'].includes(node.type)&&node.value.length<500)inputs[node.id]=node.value;
 const details=[...document.querySelectorAll('details[id][open]')].map(n=>n.id);
 const snapshot={at:Date.now(),view:window.GoldenExchangeHub?.view(),inputs,details,scrollY:window.scrollY};
 try{localStorage.setItem(KEY,JSON.stringify(snapshot));}catch{}
}
function restore(){
 if(!embedded||!ready||!pending||!saved?.view)return;
 restoring=true;window.GoldenExchangeHub.restore(saved.view);
 for(const [id,value]of Object.entries(saved.inputs||{})){const n=document.getElementById(id);if(n&&!['file','password'].includes(n.type)&&typeof value==='string'&&value.length<500)n.value=value;}
 for(const id of (Array.isArray(saved.details)?saved.details:[]))if(document.getElementById(id)?.tagName==='DETAILS')document.getElementById(id).open=true;
 restoring=false;
 requestAnimationFrame(()=>{if(pending&&Number.isFinite(saved.scrollY))window.scrollTo(0,saved.scrollY)});
}
window.addEventListener('exchange-ready',()=>{ready=true;restore();send();});
window.addEventListener('exchange-rendered',()=>{restore();send();});
// Script execution order is independent of the bundled app's storage await.
if(window.GoldenExchangeHub){ready=true;restore();send();}
for(const event of ['input','change','click','toggle'])document.addEventListener(event,()=>{if(restoring)return;pending=false;queueMicrotask(remember);},true);
window.addEventListener('scroll',()=>{clearTimeout(timer);timer=setTimeout(remember,160)},{passive:true});
window.addEventListener('pagehide',remember);
document.addEventListener('visibilitychange',()=>{if(document.hidden)remember();});
document.querySelectorAll('[data-golden-hub-link]').forEach(a=>{a.hidden=false;a.onclick=e=>{e.preventDefault();parent.postMessage({type:'golden-exchange-switch-gw2'},location.origin);};});
