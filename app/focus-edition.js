/* The Golden Peanut — Market Intelligence 7.16
 * Presents a single wallet-funded portfolio from saved history + current quotes.
 * No automatic orders; existing account credentials and trade ledger remain intact.
 */
(function(root){'use strict';
const $=id=>document.getElementById(id);
const State=()=>root.GoldenPeanutClean?.State;
const STORE='gp-focus-ui-v1';const EXPECTED_MARKET_BUILD='7.16.0-evidence';
const NAMES={today:'Best trades',trades:'Compare markets',orders:'Open orders',legendaries:'Legendaries'};
const ICO={today:'⌂',trades:'⌕',orders:'☷',legendaries:'✦'};
let ui={tab:'today',tradeFilter:'best',bulkLot:5,tradeSearch:'',catalogueLimit:24,tradeAll:false,memoryLimit:14,tradeDetail:null,growthDetail:null,relatedDetail:null,tradeY:0,capitalMode:'wallet',orderLane:'review',orderSearch:'',orderAll:false,orderDetail:null,orderY:0,legendSection:'overview',capacitySelections:{},marketResearchLot:10,portfolioBudgetGold:null,sectionScrolls:{}},started=false,renderTimer=0,viewUpdating=false;
let rootGuardReady=false;let reviewCache=null,reviewKey='',lastResearchFocus=null,memoryNameLoadKey='',memoryPageItems=[],navReady=false,restoringNav=false;
// Preserve the visible history row when asynchronous icon/name refreshes repaint the list.
// Never rely on the click target to remain mounted while the list is updated.
function captureHistoryPosition(){
 if(ui.tab!=='trades'||ui.tradeFilter!=='memory')return null;
 const list=$('focus-memory-list');if(!list||!list.children.length)return null;
 const originalY=window.scrollY;const line=Math.max(60,Number($('focus-top')?.getBoundingClientRect().bottom||0)+8);
 for(const node of list.children){const rect=node.getBoundingClientRect();if(rect.bottom>=line)return {y:originalY,id:node.dataset.memoryId,offset:rect.top};}
 return {y:originalY};
}
function restoreHistoryPosition(before){
 if(!before||ui.tab!=='trades'||ui.tradeFilter!=='memory')return;
 let y=before.y;
 if(before.id){const fresh=$('focus-memory-list')?.querySelector('[data-memory-id="'+before.id+'"]');
  if(fresh)y+=fresh.getBoundingClientRect().top-before.offset;}
 window.scrollTo({top:Math.max(0,Math.round(y)),behavior:'instant'});
}
function showMoreRemembered(){
 const list=$('focus-memory-list'),more=$('focus-more-trades');
 // Add rows in place: replacing the entire history list made mobile browsers jump to top.
 if(!list||!more||ui.tab!=='trades'||ui.tradeFilter!=='memory'){ui.memoryLimit+=30;renderTrades();return;}
 const before=list.children.length;
 ui.memoryLimit=Math.min(memoryPageItems.length,Math.max(ui.memoryLimit,before)+30);
 const next=memoryPageItems.slice(before,ui.memoryLimit);
 for(const row of next)list.append(memoryRow(row));
 more.hidden=ui.memoryLimit>=memoryPageItems.length;
 more.textContent='Show 30 more of '+num(memoryPageItems.length)+' remembered markets';
 if(next.length){const first=list.children[before];const offset=Math.max(64,Math.min(112,window.innerHeight*0.12));
  const y=window.scrollY+first.getBoundingClientRect().top-offset;
  window.scrollTo({top:Math.max(0,Math.round(y)),behavior:'instant'});}
}

const iconMissing=new Map(),metaInFlight=new Set(),metaQueue=new Set();
let metaBusy=false,metaRevision=0,iconVisibilityObserver=null;
let boardCache={plan:null,metadata:null,revision:-1,wallet:null,at:0,result:null};
const num=v=>Number(v||0).toLocaleString('en-GB');
const cash=v=>{if(!Number.isFinite(v))return '—';const abs=Math.round(Math.abs(v));return (v<0?'−':'')+num(Math.floor(abs/10000))+'g '+String(Math.floor(abs%10000/100)).padStart(2,'0')+'s '+String(abs%100).padStart(2,'0')+'c';};
const h=(tag,cls,text)=>{const node=document.createElement(tag);if(cls)node.className=cls;if(text!==undefined)node.textContent=String(text);return node;};
const e=(id)=>document.getElementById(id);
function money(v,cls=''){const wrap=h('span','focus-money '+cls);wrap.title=Number.isFinite(v)?cash(v):'Not verified';if(!Number.isFinite(v)){wrap.textContent='—';return wrap;}
 const a=Math.round(Math.abs(v)),arr=[['g',Math.floor(a/10000),'gold'],['s',Math.floor(a%10000/100),'silver'],['c',a%100,'copper']];if(v<0)wrap.append(h('span','focus-negative','−'));
 for(const [unit,q,name] of arr){const part=h('span','focus-money-part');part.append(h('span','',unit==='g'?num(q):String(q).padStart(2,'0')));const img=h('img');img.src='./assets/gw2-'+name+'-coin.png';img.alt=unit;img.width=15;img.height=15;img.decoding='async';img.onerror=()=>{img.replaceWith(h('span','focus-coin-letter',unit));};part.append(img);wrap.append(part);}return wrap;}
function validIcon(m){return typeof m?.icon==='string'&&/^https:\/\/render\.guildwars2\.com\/file\/[a-f0-9]+\/\d+\.(png|jpe?g|webp)$/i.test(m.icon);}
function currentMeta(id){return State()?.meta?.[Number(id)]||null;}
function itemName(id){return currentMeta(id)?.name||'Item #'+id;}
function itemTitle(id,label=null,tag='strong',hint=''){
 const el=h(tag,'',label??itemName(id));
 root.GPRarity?.apply?.(el,currentMeta(id)?.rarity||hint);
 return el;
}
function marketBoard(state){
 const plan=state?.opportunityPlan,metadata=state?.meta,wallet=userSnapshot()?.wallet,at=Date.now();
 if(boardCache.plan===plan&&boardCache.metadata===metadata&&boardCache.revision===metaRevision&&
    boardCache.wallet===wallet&&at-boardCache.at<30000)return boardCache.result;
 const result=root.GPMarketBoard?.build?.(plan,{wallet,metadata:metadata||{}});
 boardCache={plan,metadata,revision:metaRevision,wallet,at,result};
 return result;
}
function scheduleMetadataWhenVisible(wrap,id,retry=false){
 if(typeof IntersectionObserver!=='function'){queueMeta([id],retry);return;}
 if(!iconVisibilityObserver)iconVisibilityObserver=new IntersectionObserver(entries=>{
  for(const e of entries)if(e.isIntersecting){
   iconVisibilityObserver.unobserve(e.target);
   const item=Number(e.target.dataset.itemId);
   if(item>0)queueMeta([item]);
  }
 },{rootMargin:'110px 0px'});
 wrap.dataset.itemId=String(id);iconVisibilityObserver.observe(wrap);
}
function artwork(id,large=false){const wrap=h('span','focus-item-art '+(large?'focus-item-art-lg':''));wrap.setAttribute('aria-hidden','true');const m=currentMeta(id);
 if(validIcon(m)){const img=h('img');img.src=m.icon;img.alt='';img.loading='lazy';img.decoding='async';img.onerror=()=>{const q=iconMissing.get(Number(id))||0;iconMissing.set(Number(id),q+1);wrap.replaceChildren(h('span','focus-item-fallback','◇'));if(q<2)scheduleMetadataWhenVisible(wrap,Number(id),true);};wrap.append(img);}
 else{wrap.append(h('span','focus-item-fallback','◇'));scheduleMetadataWhenVisible(wrap,Number(id));}
 return wrap;}
function queueMeta(ids,retry=false){const s=State();if(!s?.api||!s?.db)return;for(const x of ids){const id=Number(x);if(!Number.isInteger(id)||id<=0||metaInFlight.has(id))continue;const until=iconMissing.get(id)||0;if(!retry&&until===-1)continue;if(until>3)continue;metaQueue.add(id);}if(!metaBusy&&metaQueue.size)window.setTimeout(flushMeta,100);}
async function flushMeta(){if(metaBusy||!metaQueue.size)return;const s=State();if(!s?.api||!s?.db)return;const batch=[...metaQueue].slice(0,35);for(const id of batch){metaQueue.delete(id);metaInFlight.add(id);}metaBusy=true;
 let found={};const fetchPart=async ids=>{try{Object.assign(found,await s.api.itemMetadata(ids));}catch{if(ids.length>1){const mid=Math.floor(ids.length/2);await fetchPart(ids.slice(0,mid));await fetchPart(ids.slice(mid));}}};
 try{await fetchPart(batch);if(Object.keys(found).length){Object.assign(s.meta,found);metaRevision++;await s.db.putMetadataBatch(found).catch(()=>{});}for(const id of batch)if(!validIcon(s.meta[id])){const n=iconMissing.get(id)||0;iconMissing.set(id,n+1);}}finally{for(const id of batch)metaInFlight.delete(id);metaBusy=false; if(metaQueue.size)window.setTimeout(flushMeta,500);schedule();}}
function safeGet(){try{return JSON.parse(localStorage.getItem(STORE)||'null');}catch{return null;}}
/* Persist navigation and visible research during Android WebView Activity
 * recreation (including a rotation-induced page reload). No account key,
 * completed transactions, or other personal trading data is stored here. */
const UI_KEYS=['tab','tradeFilter','bulkLot','tradeSearch','tradeAll','capitalMode',
 'orderLane','orderSearch','orderAll','legendSection','marketResearchLot',
 'portfolioBudgetGold','tradeDetail','growthDetail','relatedDetail','orderDetail',
 'tradeY','orderY','scrollY','memoryLimit','catalogueLimit','capacitySelections','sectionScrolls'];
function viewMarketSnapshot(){
 const id=Number(ui.tradeDetail);
 if(!Number.isSafeInteger(id)||id<=0)return null;
 const state=State(),p=state?.opportunityPlan;
 const item=(ui.selectedMarket?.id===id?ui.selectedMarket:null)||
  [...(p?.orders||[]),...(p?.marketChoices||[]),...(p?.watch||[]),
   ...(p?.publicResearch||[])].find(x=>x.id===id);
 if(!item)return null;
 // Only save nonsensitive, bounded *display* fields. This is an old quote
 // reference, not a live executable order or independently verified price.
 const old=item.asOf||item.at;
 const snap={id,kind:'research',name:String(item.name||item.itemName||itemName(id)).slice(0,180),
  buy:Number(item.buy||item.bid||0),exit:Number(item.exit||item.ask||0),
  quantity:Number(item.quantity||0),at:typeof old==='string'?old:null,restoredView:true};
 return Number.isSafeInteger(snap.buy)&&snap.buy>0&&Number.isSafeInteger(snap.exit)&&snap.exit>snap.buy?snap:null;
}
function save(){
 try{
  const persist={version:2};
  for(const key of UI_KEYS)persist[key]=ui[key];
  persist.selectedMarket=viewMarketSnapshot();
  persist.savedAt=Date.now();
  localStorage.setItem(STORE,JSON.stringify(persist));
 }catch{/* Browsing and memory must never depend on localStorage access. */}
}
function load(){
 const old=safeGet();
 if(!old||typeof old!=='object')return;
 for(const key of UI_KEYS)if(Object.hasOwn(old,key))ui[key]=old[key];
 if(!NAMES[ui.tab])ui.tab='today';
 if(!['best','bulk','new','craft','memory'].includes(ui.tradeFilter))ui.tradeFilter='best';
 if(![5,10,20,50].includes(Number(ui.bulkLot)))ui.bulkLot=5;else ui.bulkLot=Number(ui.bulkLot);
 if(![1,3,5,10,20,50,100,250].includes(Number(ui.marketResearchLot)))ui.marketResearchLot=10;else ui.marketResearchLot=Number(ui.marketResearchLot);
 if(ui.portfolioBudgetGold!==null&&(!Number.isFinite(Number(ui.portfolioBudgetGold))||Number(ui.portfolioBudgetGold)<0||Number(ui.portfolioBudgetGold)>50000))ui.portfolioBudgetGold=null;
 if(!['wallet','selective','all'].includes(ui.capitalMode))ui.capitalMode='wallet';
 if(!['review','buy','sell'].includes(ui.orderLane))ui.orderLane='review';
 if(!['overview','shopping','crafting','collections'].includes(ui.legendSection))ui.legendSection='overview';
 for(const k of ['tradeDetail','growthDetail','relatedDetail']){
  const id=Number(ui[k]);ui[k]=Number.isSafeInteger(id)&&id>0?id:null;
 }
 if(typeof ui.orderDetail!=='string'&&typeof ui.orderDetail!=='number')ui.orderDetail=null;
 for(const k of ['tradeY','orderY','scrollY']){
  const n=Number(ui[k]);ui[k]=Number.isFinite(n)&&n>=0&&n<1e7?Math.floor(n):0;
 }
 if(!Number.isSafeInteger(ui.memoryLimit)||ui.memoryLimit<14||ui.memoryLimit>1000)ui.memoryLimit=14;
 if(!Number.isSafeInteger(ui.catalogueLimit)||ui.catalogueLimit<24||ui.catalogueLimit>1000)ui.catalogueLimit=24;
 if(typeof ui.tradeSearch!=='string')ui.tradeSearch='';else ui.tradeSearch=ui.tradeSearch.slice(0,180);
 if(typeof ui.orderSearch!=='string')ui.orderSearch='';else ui.orderSearch=ui.orderSearch.slice(0,180);
 if(!ui.capacitySelections||typeof ui.capacitySelections!=='object'||Array.isArray(ui.capacitySelections))ui.capacitySelections={};
 else{
  const valid={};
  for(const [key,val]of Object.entries(ui.capacitySelections).slice(0,300))
   if(/^\d{1,10}$/.test(key)&&[1,3,5,10,20,50,100,250].includes(Number(val)))valid[key]=Number(val);
  ui.capacitySelections=valid;
 }
 if(!ui.sectionScrolls||typeof ui.sectionScrolls!=='object'||Array.isArray(ui.sectionScrolls))ui.sectionScrolls={};
 else{
  const valid={};
  for(const [key,entry]of Object.entries(ui.sectionScrolls).slice(-50)){
   if(typeof key!=='string'||key.length>130||!entry||typeof entry!=='object')continue;
   const loaded=Number(entry.loaded),top=Number(entry.top);
   if(Number.isInteger(loaded)&&loaded>=0&&loaded<=2500&&Number.isFinite(top)&&top>=0&&top<10000000)
    valid[key]={loaded,top:Math.floor(top)};
  }
  ui.sectionScrolls=valid;
 }
 // Restore only a bounded recently viewed PUBLIC research snapshot. Never
 // silently turn it into a current recommendation after a page recreation.
 const m=old.selectedMarket,ms=Number(old.savedAt);
 if(ui.tradeDetail&&ui.tab==='trades'&&Number.isFinite(ms)&&Date.now()-ms>=0&&Date.now()-ms<7*86400000&&
  Number(m?.id)===ui.tradeDetail&&Number.isSafeInteger(m.buy)&&m.buy>0&&
  Number.isSafeInteger(m.exit)&&m.exit>m.buy){
  ui.selectedMarket={id:ui.tradeDetail,kind:'research',name:String(m.name||'').slice(0,180),
   buy:m.buy,exit:m.exit,quantity:Number.isSafeInteger(m.quantity)?Math.max(0,m.quantity):0,
   asOf:typeof m.at==='string'?m.at:null,restoredView:true};
 }
}
// Chromium can skip same-document history entries inserted without user activation.
// Never seed a synthetic pushState on startup. Push real intra-app destinations
// from user-initiated clicks, and keep a visible Back control as a PWA fallback.
function viewHistory(){return {goldenPeanutFocus:true,tab:ui.tab,tradeDetail:ui.tradeDetail,
 growthDetail:ui.growthDetail,relatedDetail:ui.relatedDetail,orderDetail:ui.orderDetail,
 tradeY:ui.tradeY,orderY:ui.orderY,research:!!$('focus-research')&&!$('focus-research').hidden};}
function routeDepth(){const n=Number(history.state?.gpIndex);return history.state?.goldenPeanutFocus&&Number.isSafeInteger(n)&&n>0?n:0;}
function routeHash(index){
 return '#gp-route-'+index+'-'+(ui.tab==='legendaries'?'legend':ui.tab);
}

function updateBackAffordance(){
 const b=$('focus-back-main');if(!b)return;
 const detail=!!(ui.tradeDetail||ui.growthDetail||ui.relatedDetail||ui.orderDetail);
 b.hidden=!(routeDepth()>0||detail||ui.tab!=='today');
}
function pushHistory(){
 if(!navReady||restoringNav)return;
 // Chromium flags ALL same-document entries as skippable if even one is
 // inserted without a user activation. Programmatic refreshes must replace,
 // not push, so Android's real Back gesture can traverse user-created routes.
 if(navigator.userActivation&&!navigator.userActivation.isActive){
  try{history.replaceState({...viewHistory(),gpIndex:routeDepth()},'');}catch{}
  updateBackAffordance();return;
 }
 try{const next=routeDepth()+1;
  // Android's native Back traverses URL-distinct, user-initiated history.
  // Only a navigation index and tab name appear in the fragment.
  history.pushState({...viewHistory(),gpIndex:next},'',routeHash(next));
 }catch{}
 updateBackAffordance();
}
function showMainRoot(){
 restoringNav=true;
 try{
  ui.tradeDetail=null;ui.growthDetail=null;ui.relatedDetail=null;ui.orderDetail=null;ui.selectedMarket=null;
  if($('focus-research')&&!$('focus-research').hidden)closeResearch();
  goto('today',{scroll:false});window.scrollTo({top:0,behavior:'instant'});
 }finally{restoringNav=false;updateBackAffordance();}
}
function navigateBack(){
 if($('focus-research')&&!$('focus-research').hidden){
  if(routeDepth()>0&&history.state?.research){history.back();return;}
  closeResearch();updateBackAffordance();return;
 }
 if(routeDepth()>0){history.back();return;}
 // If a native wrapper has discarded the page's navigation stack, its
 // original URL may be unavailable. Always make the visible Back work in-app.
 if(ui.tradeDetail||ui.growthDetail||ui.relatedDetail){ui.tradeDetail=null;ui.growthDetail=null;ui.relatedDetail=null;ui.selectedMarket=null;goto('trades',{scroll:false});window.scrollTo({top:ui.tradeY||0,behavior:'instant'});}
 else if(ui.orderDetail){ui.orderDetail=null;goto('orders',{scroll:false});window.scrollTo({top:ui.orderY||0,behavior:'instant'});}
 else if(ui.tab!=='today')showMainRoot();
 updateBackAffordance();
}
function backToList(kind='trades'){
 if(routeDepth()>0){navigateBack();return;}
 if(kind==='orders'){ui.orderDetail=null;renderOrders();window.scrollTo({top:ui.orderY||0,behavior:'instant'});}
 else {ui.tradeDetail=null;ui.growthDetail=null;ui.relatedDetail=null;ui.selectedMarket=null;renderTrades();window.scrollTo({top:ui.tradeY||0,behavior:'instant'});}
 updateBackAffordance();
}
function restoreView(ev){
 const v=ev.state;
 if(!v?.goldenPeanutFocus){showMainRoot();return;}
 if(v.gpIndex===0||v.goldenPeanutRoot){showMainRoot();return;}
 restoringNav=true;
 try{
  ui.tradeDetail=v.tradeDetail||null;ui.growthDetail=v.growthDetail||null;ui.relatedDetail=v.relatedDetail||null;
  ui.orderDetail=v.orderDetail||null;ui.tradeY=v.tradeY||0;ui.orderY=v.orderY||0;
  if(!v.research&&$('focus-research')&&!$('focus-research').hidden)closeResearch();
  goto(NAMES[v.tab]?v.tab:'today',{scroll:false});
  if(v.research&&$('focus-research')?.hidden)showResearch();
  window.scrollTo({top:ui.tradeDetail||ui.growthDetail||ui.relatedDetail||ui.orderDetail?0:ui.tradeY||0,behavior:'instant'});
 }finally{restoringNav=false;updateBackAffordance();}
}
function installEdgeSwipeBack(){
 // Fallback for edge swipes reaching the DOM; Android system gestures can
 // bypass the page entirely and must be tested on the actual installed PWA.
 let touch=null;
 document.addEventListener('touchstart',ev=>{
  const t=ev.touches?.[0];touch=t&&t.clientX<32?{x:t.clientX,y:t.clientY}:null;
 },{passive:true});
 document.addEventListener('touchend',ev=>{
  if(!touch)return;
  const t=ev.changedTouches?.[0],delta=t?{x:t.clientX-touch.x,y:t.clientY-touch.y}:null;touch=null;
  if(delta&&delta.x>100&&Math.abs(delta.y)<75)navigateBack();
 },{passive:true});
 document.addEventListener('touchcancel',()=>{touch=null;},{passive:true});
}
function labelText(id,value){const x=$(id);if(x)x.textContent=value;}
function button(text,fn,cls='focus-button'){const b=h('button',cls,text);b.type='button';b.addEventListener('click',fn);return b;}
function syncNow(){const b=$('gp57-refresh');if(b&&!b.disabled){b.click();labelText('focus-sync-state','Checking account and opportunities…');}else labelText('focus-sync-state',"Account isn't ready to refresh yet.");}
function showResearch(section){if($('focus-research')?.hidden)pushHistoryForResearch();lastResearchFocus=document.activeElement;const box=$('focus-research');box.hidden=false;document.body.classList.add('focus-modal-open');const engine=$('focus-engine');engine.hidden=false;const adv=$('gp57-advanced');if(adv)adv.open=true;
 if(section){const target=$(section);for(let p=target;p;p=p.parentElement)if(p.tagName==='DETAILS')p.open=true;}
 for(const x of [document.querySelector('main'),$('focus-top'),document.querySelector('.focus-primary-nav')])if(x)x.inert=true; $('focus-research-close')?.focus();if(section)window.setTimeout(()=>$(section)?.scrollIntoView({block:'start'}),70);
}
function pushHistoryForResearch(){
 if(!navReady||restoringNav)return;
 if(navigator.userActivation&&!navigator.userActivation.isActive)return;
 try{const next=routeDepth()+1;
  history.pushState({...viewHistory(),gpIndex:next,research:true},'',routeHash(next)+'-settings');
 }catch{}
 updateBackAffordance();
}
function dismissResearch(){if(routeDepth()>0&&history.state?.research){history.back();return;}closeResearch();updateBackAffordance();}
function closeResearch(){const box=$('focus-research');if(box)box.hidden=true;const engine=$('focus-engine');if(engine)engine.hidden=true;document.body.classList.remove('focus-modal-open');for(const x of [document.querySelector('main'),$('focus-top'),document.querySelector('.focus-primary-nav')])if(x)x.inert=false;lastResearchFocus?.focus?.();}
function goto(tab,{scroll=true}={}){if(!NAMES[tab])return;const previousTab=ui.tab;ui.tab=tab;save();const isLegend=tab==='legendaries';if(isLegend){$('nav-legend').click();}else{$('nav-desk').click();}
 for(const el of document.querySelectorAll('[data-focus-page]'))el.hidden=el.dataset.focusPage!==tab;
 for(const el of document.querySelectorAll('[data-focus-nav]')){const active=el.dataset.focusNav===tab;el.classList.toggle('is-active',active);if(active)el.setAttribute('aria-current','page');else el.removeAttribute('aria-current');}
 labelText('focus-title',NAMES[tab]);labelText('focus-subtitle',tab==='today'?'Highest-value markets first':tab==='trades'?'History-backed opportunities and new full-market research':tab==='orders'?'Your active buying and selling positions':'Your legendary projects');
 if(tab==='orders')scheduleReviews();if(tab==='legendaries')updateLegendView();if(scroll){window.scrollTo({top:0,behavior:'instant'});}if(previousTab!==tab)pushHistory();updateBackAffordance();schedule();}
function install(){if(started)return;started=true;load();document.body.classList.add('focus-edition');document.title='The Golden Peanut — Focus Edition';
 const app=document.querySelector('.app'),main=app?.querySelector('main'),desk=$('view-desk');if(!app||!main||!desk)return;
 const toolbar=h('div','focus-top');toolbar.id='focus-top';toolbar.innerHTML='<div class="focus-top-head"><button type="button" id="focus-back-main" class="focus-icon-button focus-main-back" aria-label="Back within Golden Peanut" hidden>←</button><div><p class="focus-kicker"THE GOLDEN PEANUT</p><h2 id="focus-title">Today</h2><p id="focus-subtitle" class="focus-muted">Your next useful move</p></div><div class="focus-top-buttons"><button type="button" class="focus-icon-button" id="focus-refresh" aria-label="Refresh account and investments" title="Refresh account">↻</button><button type="button" class="focus-icon-button" id="focus-more" aria-label="Account settings and research" title="Research and settings">⚙</button></div></div><p id="focus-sync-state" class="focus-small" role="status" aria-live="polite"></p>';
 main.before(toolbar);$('focus-back-main').addEventListener('click',navigateBack);$('focus-refresh').addEventListener('click',syncNow);$('focus-more').addEventListener('click',()=>showResearch('gp57-advanced'));
 const nav=h('nav','focus-primary-nav');nav.setAttribute('aria-label','Primary navigation');for(const key of ['today','trades','orders','legendaries']){const b=h('button','focus-nav-button');b.type='button';b.dataset.focusNav=key;b.setAttribute('aria-label',NAMES[key]);const glyph=h('span','focus-nav-glyph',ICO[key]);glyph.setAttribute('aria-hidden','true');b.append(glyph,h('span','focus-nav-text',key==='trades'?'Trades':key==='orders'?'Orders':NAMES[key]));b.addEventListener('click',()=>{
  if(ui.tab===key&&key==='trades'&&(ui.tradeDetail||ui.growthDetail||ui.relatedDetail)){
   ui.tradeDetail=null;ui.growthDetail=null;ui.relatedDetail=null;ui.selectedMarket=null;
   pushHistory();renderTrades();window.scrollTo({top:ui.tradeY||0,behavior:'instant'});
  }else if(ui.tab===key&&key==='orders'&&ui.orderDetail){
   ui.orderDetail=null;pushHistory();renderOrders();window.scrollTo({top:ui.orderY||0,behavior:'instant'});
  }else goto(key);
 });nav.append(b);}app.append(nav);
 const rootPage=h('div','focus-workspaces');rootPage.id='focus-workspaces';for(const key of ['today','trades','orders']){const page=h('section','focus-page');page.dataset.focusPage=key;page.id='focus-'+key;page.hidden=true;rootPage.append(page);}desk.prepend(rootPage);
 const overlay=h('div','focus-research');overlay.id='focus-research';overlay.hidden=true;overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-label','Detailed research and account settings');overlay.innerHTML='<div class="focus-research-bar"><strong>Research & settings</strong><button class="focus-button focus-button-secondary" id="focus-research-close" aria-label="Back to trading">← Back</button></div>';
 const engine=h('div','focus-engine');engine.id='focus-engine';engine.hidden=true;const original=[...desk.children].filter(x=>x!==rootPage);for(const x of original)engine.append(x);for(const id of ['connection-panel','safety-panel','stage-message']){const panel=$(id);if(panel)engine.append(panel);}const monitorShelf=h('details','focus-settings-shelf');monitorShelf.id='focus-monitor-settings';
 const monitorBody=h('div','focus-settings-body');monitorBody.id='focus-account-watcher-host';
 monitorShelf.append(h('summary','','Background monitoring'),monitorBody);
 const capitalShelf=h('details','focus-settings-shelf');capitalShelf.id='focus-capital-settings';
 const capitalBody=h('div','focus-settings-body');capitalBody.id='focus-deployment-research';
 capitalShelf.append(h('summary','','Capital deployment research'),capitalBody);
 engine.prepend(capitalShelf);engine.prepend(monitorShelf);
 overlay.append(engine);app.append(overlay);$('focus-research-close').addEventListener('click',dismissResearch);overlay.addEventListener('keydown',ev=>{if(ev.key==='Escape')dismissResearch();});
 initToday();initTrades();initOrders();initLegend();
 // Observe only the legacy output containers; mutations to the new workspaces won't loop.
 for(const id of ['gp57-wallet','gp57-week','gp57-collect','gp57-actions','allocation-plan','commander53-results','lp-materials','lp-direct','lp-tasks','lp-target-name']){const x=$(id);if(x)new MutationObserver(()=>{if(id.startsWith('lp-'))decorateLegendArtwork();schedule();}).observe(x,{childList:true,subtree:id!=='allocation-plan'});}
 // Android may destroy/recreate the WebView on a configuration change.
 // Capture actual state *before* the old document disappears, and also after
 // user actions (some Android wrappers never emit pagehide).
 let scrollSaveTimer=0;
 document.addEventListener('click',()=>window.setTimeout(save,0),{passive:true});
 document.addEventListener('change',()=>window.setTimeout(save,0),{passive:true});
 window.addEventListener('scroll',()=>{
  ui.scrollY=Math.max(0,Math.floor(window.scrollY||0));
  if(scrollSaveTimer)clearTimeout(scrollSaveTimer);
  scrollSaveTimer=setTimeout(()=>{scrollSaveTimer=0;save();},180);
 },{passive:true});
 const capture=()=>{ui.scrollY=Math.max(0,Math.floor(window.scrollY||0));save();};
 window.addEventListener('pagehide',capture);
 window.addEventListener('orientationchange',capture,{passive:true});
 document.addEventListener('visibilitychange',()=>{
  if(document.hidden)capture();
  else schedule();
 });
 const restoredScroll=ui.scrollY,restoredTab=ui.tab;
 goto(restoredTab,{scroll:false});
 // Content arrives from IndexedDB asynchronously. Restore position after it
 // renders instead of snapping to the beginning or forcing a fresh account sync.
 if(restoredScroll>0){
  let attempts=0;
  const restoreScroll=()=>{
   if(ui.tab!==restoredTab||window.scrollY>=restoredScroll-8)return;
   if(document.documentElement.scrollHeight>restoredScroll+window.innerHeight/2)
    window.scrollTo({top:restoredScroll,behavior:'instant'});
   if(++attempts<14&&window.scrollY<restoredScroll-8)setTimeout(restoreScroll,220);
  };
  setTimeout(restoreScroll,250);
 }
 window.setTimeout(schedule,350);
 root.GPFocus={buildId:EXPECTED_MARKET_BUILD,goto,showResearch,closeResearch,render:()=>{renderToday();renderTrades();renderOrders();updateLegendView();},cash};
 try{
  // Preserve the real initial history entry. Chromium skips startup-generated
  // pushState entries without user activation on Android physical Back.
  // Reloading a historic fragment starts a clean new document, not a
  // phantom stack of inaccessible pages.
  const cleanUrl=/^#gp-route-/.test(location.hash)?location.pathname+location.search:undefined;
  history.replaceState({...viewHistory(),gpIndex:0,goldenPeanutRoot:true},'',cleanUrl);
  navReady=true;rootGuardReady=true;window.addEventListener('popstate',restoreView);
  // Native Android Back already dispatches popstate; competing edge-touch
  // handlers caused two Back actions for one gesture.
  updateBackAffordance();
 }catch{}
}
function initToday(){const box=$('focus-today');box.innerHTML=`<div class="focus-summary-grid"><section class="focus-summary"><span>Available wallet</span><div id="focus-wallet" class="focus-big-money">—</div></section><section class="focus-summary"><span>7-day matched profit</span><div id="focus-week" class="focus-big-money">—</div></section></div><div id="focus-growth-goal" class="focus-growth-goal" aria-label="Weekly profit milestone"></div><div class="focus-meta-line" id="focus-account-at">Account not checked yet</div><section class="focus-single-task"><p class="focus-small-label">YOUR NEXT ACTION</p><div id="focus-next-action"><p class="focus-muted">Checking your account…</p></div></section><section class="focus-section-gap"><p class="focus-small-label">TRADING</p><button id="focus-open-trades" class="focus-destination-row"><span><strong>Find profitable trades</strong><small id="focus-trade-count">Compare your best bulk and single-item opportunities</small></span><span aria-hidden="true">›</span></button></section><div class="focus-meta-line" id="focus-capital-note"></div><section id="focus-operating-book" class="focus-capital-compare" hidden></section><section class="focus-today-best" aria-label="Recommended orders"><div class="focus-today-best-header"><strong>BEST CURRENT MARKET OPPORTUNITIES</strong><span id="focus-best-status" class="focus-muted"></span></div><div id="focus-deep-progress" class="focus-deep-progress" role="status" aria-live="polite"></div><div class="focus-deep-actions"><button type="button" id="focus-deep-stop" class="focus-button focus-button-secondary" hidden>Stop extended research</button><button type="button" id="focus-deep-retry" class="focus-button focus-button-secondary" hidden>Resume wider discovery</button></div><div id="focus-best-rows" class="focus-trade-rows"></div><button type="button" id="focus-copy-all" class="focus-button focus-button-secondary" hidden>Copy worthwhile new buy orders</button></section><section id="focus-earnings-pace" class="focus-earnings-pace" hidden></section><section id="focus-capital-compare" class="focus-capital-compare" hidden></section>`;$('focus-open-trades').addEventListener('click',()=>{ui.tradeDetail=null;ui.growthDetail=null;ui.relatedDetail=null;goto('trades');});$('focus-copy-all').addEventListener('click',copyOpportunityPlan);
 $('focus-deep-stop').addEventListener('click',()=>{const st=State();if(st)root.GPOpportunity?.stopExpanded?.(st);schedule();});
 $('focus-deep-retry').addEventListener('click',()=>{const st=State();if(st)root.GPOpportunity?.resumeExpanded?.(st);schedule();});
 // Put the actual funded opportunities above the old explanatory prompts.
 const best=$('focus-today')?.querySelector('.focus-today-best'),task=$('focus-today')?.querySelector('.focus-single-task');
 if(best&&task)task.before(best);
 const operating=$('focus-operating-book');if(operating&&best)best.before(operating);
}
function openHomeMarket(id,kind){
 // Direct home-card taps enter the trade list first, then its detail.
 // Back returns to the list, then the home screen—not the Android launcher.
 ui.tradeDetail=null;ui.growthDetail=null;ui.relatedDetail=null;ui.selectedMarket=null;
 goto('trades');
 if(kind==='growth'){ui.growthDetail=id;pushHistory();renderGrowthDetail();}
 else{ui.tradeDetail=id;pushHistory();renderTradeDetail();}
 window.scrollTo({top:0,behavior:'instant'});
}
function userSnapshot(){const s=State();return s?.snapshot?.account===s.account?s.snapshot:null;}
function renderToday(){const s=State(),snap=userSnapshot();if(!s)return;
 $('focus-wallet').replaceChildren(money(Number.isFinite(snap?.wallet)?snap.wallet:NaN,'focus-money-big'));
 $('focus-week').replaceChildren(money(Number.isFinite(s.summary?.weekP100)?s.summary.weekP100/100:NaN,'focus-money-big'));
 const at=snap?.walletAt||snap?.at;labelText('focus-account-at',at?'Account checked '+new Date(at).toLocaleString('en-GB',{timeZone:'Europe/London',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}):'Saved account · tap ↻ to check');
 labelText('focus-capital-note',snap?.buys?.length?'Already invested in buy orders: '+cash(root.PeanutCore.committedBuys(snap.buys))+' · '+num(snap.buys.length)+' active · tap below to inspect':'No standing buy orders currently verified.');
 renderGrowthGoal();
 const target=$('focus-next-action');target.replaceChildren();let title='',description='',action='',fn=()=>{};
 if(!snap){title='Check your account';description='Load your wallet, orders and recent trades.';action='Check account';fn=syncNow;}
 else if(Number(snap.delivery?.coins)>0){title='Collect your Delivery Box';description='Ready in-game: '+cash(snap.delivery.coins)+'. Not spendable until collected.';action='Open delivery details';fn=()=>showResearch('gp57-delivery-detail');}
 else{const p=s.opportunityPlan,valid=p?.orders?.length&&Date.now()-s.opportunityAt<=25*60*1000;
  if(valid&&p.source==='wallet'){const best=p.orders.find(x=>x.cost>0);
   if(best){title='Your strongest funded trade';description=itemName(best.id)+' · buy '+num(best.quantity)+' · expected 24h net '+cash(best.expectedProfit);action='See trade';fn=()=>openHomeMarket(best.id,'trade');}
  }
  if(!title){const top=root.GPGrowth?.weeklyByMarket(s.ledger||[],Date.now())?.markets?.find(x=>x.profit>0&&x.matched7>0);
   if(top){title='Inspect your strongest earning market';description=itemName(top.id)+' · actual '+cash(top.profit)+' matched net over seven UK days';action='Inspect market';fn=()=>openHomeMarket(top.id,'growth');}
   else{const mem=root.GPGrowth?.allHistory(s.ledger||[],Date.now());const old=mem?.markets.find(x=>x.proven&&x.dormant);
    title=old?'Revisit a forgotten profitable market':'Find your next profitable trade';
    description=old?itemName(old.id)+' · historical matched net '+cash(old.profit)+' · current buy not yet verified':'Compare your saved market history with fresh prices.';
    action=old?'Inspect old winner':'Find trades';fn=()=>old?openHomeMarket(old.id,'growth'):goto('trades');}}}
 // A validated portfolio replaces repetitive navigation prompts. Delivery Box
 // collection stays visible because those coins are not yet spendable.
 const hasFunded=!!(s.opportunityPlan?.orders?.length&&Date.now()-s.opportunityAt<25*60*1000);
 const needsCollection=Number(snap?.delivery?.coins)>0;
 const single=$('focus-today')?.querySelector('.focus-single-task'),shortcut=$('focus-today')?.querySelector('.focus-section-gap');
 if(single)single.hidden=hasFunded&&!needsCollection;
 if(shortcut)shortcut.hidden=hasFunded;
 if(!needsCollection&&snap?.buys?.length){const host=$('focus-capital-note');if(host){host.onclick=()=>goto('orders');host.classList.add('focus-clickable-summary');host.setAttribute('role','button');host.setAttribute('tabindex','0');host.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();goto('orders');}};}}
 const main=h('div','focus-action-body');const msg=h('div','focus-action-copy');msg.append(h('strong','',title),h('p','focus-muted',description));main.append(h('span','focus-action-symbol','◉'),msg);target.append(main,button(action,fn,'focus-button focus-button-primary'));const mem=root.GPGrowth?.allHistory(s.ledger||[],Date.now());const count=mem?.markets.filter(x=>x.proven).length||0;labelText('focus-trade-count',count?num(count)+' historical winners screened for current profit':'Find trading opportunities in your saved history');
 renderOperatingBook();renderOpportunityHome();renderPortfolioOutlook();
}
function renderOperatingBook(){
 const host=$('focus-operating-book'),s=State(),snap=userSnapshot(),p=s?.opportunityPlan;
 if(!host)return;host.replaceChildren();host.hidden=!snap||!p?.ok;if(host.hidden)return;
 const committed=root.PeanutCore?.committedBuys?.(snap.buys||[])||0,book=p.activeBook;
 host.append(h('strong','','Markets already working for you'));
 host.append(h('p','focus-muted',cash(committed)+' in standing buy orders. '+(book?.entries?.length?num(book.eligible)+' markets currently show repeat-trading evidence with positive quoted spreads.':'No current quote-verified earning comparison is available yet.')));
 if(book?.entries?.length){
  for(const x of book.entries.slice(0,4)){
   const row=h('div','focus-book-row');row.append(h('strong','',itemName(x.id)+' · '+num(x.scenarioUnits)+' possible units'),
    h('small','focus-muted',cash(x.conditionalWeek)+' conditional profit over an active week · already on order'));
   host.append(row);
  }
 }
 host.append(h('small','focus-muted','These are capacity scenarios, not guaranteed fills or expected profit.'));
 const compare=p.capitalReview,flagged=compare?.releasedSelective||0;
 if(compare?.committed>0){const line=h('p','focus-muted');line.textContent=flagged>0?
  cash(flagged)+' in orders worth reviewing for possible redeployment.':'Existing buy orders are assessed separately from your spendable wallet.';
  host.append(line);
  host.append(button('Compare better uses for committed gold',()=>{ui.capitalMode=flagged>0?'selective':'all';ui.tradeFilter='best';ui.tradeDetail=null;save();goto('trades');},'focus-button focus-button-secondary'));
 }
}
function renderEarningsPace(){
 const host=$('focus-earnings-pace'),s=State(),snap=userSnapshot(),p=s?.opportunityPlan;
 if(!host)return;host.replaceChildren();host.hidden=!snap||!p?.ok;if(host.hidden)return;
 host.append(h('strong','','Results versus scenarios'));
 const actual=Number.isFinite(s.summary?.weekP100)?s.summary.weekP100/100:null;
 if(actual!==null)host.append(h('p','focus-muted','Actually earned in the last 7 days: '+cash(actual)+' after Trading Post fees and matched acquisition costs.'));
 host.append(h('p','focus-muted','New wallet-only orders: '+cash(p.conditionalProfit)+' profit if every suggested buy AND resale succeeds once. This is not a daily forecast.'));
 if(p.activeBook?.eligible)host.append(h('p','focus-muted','Already-open buy orders: '+cash(p.activeBook.conditionalWeek)+' conditional active-week profit across '+num(p.activeBook.eligible)+' markets with relevant historical execution and fresh prices. Not additive to historical realised profit.'));
 host.append(h('p','focus-muted','Proceeds from completed sales can be reinvested, but the amount and timing are unknown. Monthly/yearly estimates are withheld until market turnover, replacement and price-decay models are calibrated. Small wallet-only opportunities do not describe the earning power of your existing trading operation.'));
 const details=h('details','focus-why');details.append(h('summary','','How these numbers differ'),h('p','focus-muted','Actual 7-day gold comes from completed matched-cost sales. New-order profit is conditional on both fills and resale. Open-order scenarios cover only markets with fresh quotes and repeat evidence. Neither scenario is a fill probability or a promise; existing orders remain untouched.'));
 host.append(details);
}
function renderCapitalComparison(){
 const host=$('focus-capital-compare'),s=State(),p=s?.opportunityPlan,comparison=p?.capitalReview;
 if(!host)return;host.replaceChildren();const valid=p?.ok&&p.source==='wallet'&&Date.now()-s.opportunityAt<=25*60000;
 host.hidden=!(valid&&comparison?.committed>0);if(host.hidden)return;
 host.append(h('strong','', 'Your gold tied up in buy orders'),h('p','focus-muted',
  cash(comparison.committed)+' is already committed. Your current recommendations only spend your wallet.'));
 const release=comparison.releasedSelective||0;
 if(release>0){const marked=comparison.reviews?.filter(r=>r.review).length||0;
  host.append(h('p','focus-muted','Review '+marked+' potentially overexposed markets. Those orders could free '+cash(release)+' if you choose to cancel them in-game.'));
 }
 host.append(button('Compare using my committed gold',()=>{ui.capitalMode='selective';ui.tradeFilter='best';ui.tradeDetail=null;save();goto('trades');},'focus-button focus-button-secondary'));
 host.append(h('small','focus-muted','Nothing is cancelled. Releasing all buy orders is shown only as a separate what-if.'));
}
function copyOpportunityPlan(){
 const t=tradeData('wallet'),list=t.p?.orders||[],btn=$('focus-copy-all');if(!t.valid||t.p?.source!=='wallet'||!list.length)return;
 const lines=['THE GOLDEN PEANUT — MANUAL BUY-ORDER PLAN',
  'Wallet '+cash(t.p.budget)+' · new commitments '+cash(t.p.spent),
  'No order has been placed automatically. Verify prices in GW2.',''];
 for(const o of list)lines.push(itemName(o.id)+' | BUY '+o.quantity+' @ '+cash(o.buy)+' each | commit '+cash(o.cost)+
  ' | cautious sell reference '+cash(o.exit)+' | conditional after-fee profit '+cash(o.scenarioProfit)+
  ' | '+o.confidence+' | '+Math.ceil(o.quantity/250)+' TP orders');
 navigator.clipboard?.writeText(lines.join('\n')).then(()=>{if(btn)btn.textContent='Trading plan copied';},()=>{if(btn)btn.textContent='Copy unavailable';});
}
/* Historical performance is not an overnight forecast. It must remain visible
 * when a newly introduced execution model lacks prospective cohorts. This uses
 * the saved FIFO-matched ledger, never standing-book quantities as trade volume. */
/* Independent, touch-scrollable market sections. Keep only a handful of DOM
 * rows at first, then reveal subsequent ranked rows while the user scrolls.
 * Unlike slice(0,6), every qualified item stays reachable. State survives
 * live UI repaint and Android WebView configuration recreation. */
let sectionScrollSaveTimer=null;
function appendScrollableSection(host,{id,title,desc,items,initial=6,renderRow}){
 if(!Array.isArray(items)||!items.length)return 0;
 const section=h('section','focus-scroll-section');section.dataset.sectionId=id;
 section.append(h('div','focus-list-heading',title));
 if(desc)section.append(h('p','focus-muted focus-section-description',desc));
 const key=ui.tab+'::'+id+'::'+(ui.tab==='trades'?ui.tradeSearch.toLowerCase().trim().slice(0,60):'');
 const stored=ui.sectionScrolls?.[key]||{loaded:0,top:0};
 const view=h('div','focus-section-scroll');view.dataset.scrollId=id;
 view.tabIndex=0;view.setAttribute('role','region');
 view.setAttribute('aria-label',title+' — scroll this section for more markets');
 const content=h('div','focus-section-items');view.append(content);
 const controls=h('div','focus-section-controls'),
  status=h('small','focus-section-count'),
  more=button('Show more markets',()=>reveal(24),'focus-button focus-button-secondary focus-section-more');
 controls.append(status,more);
 let cursor=0;
 const base=Math.max(1,Math.min(20,Number(initial)||6));
 const update=()=>{
  const remaining=items.length-cursor;
  status.textContent=num(cursor)+' of '+num(items.length)+' markets'+(remaining?' · scroll inside this section for more':' · all shown');
  more.hidden=!remaining;
  if(remaining)more.textContent='Show next '+num(Math.min(24,remaining));
 };
 function remember(){
  if(!ui.sectionScrolls)ui.sectionScrolls={};
  ui.sectionScrolls[key]={loaded:cursor,top:Math.max(0,Math.floor(view.scrollTop))};
 }
 function reveal(size){
  const target=Math.min(items.length,cursor+size);
  for(;cursor<target;cursor++)content.append(renderRow(items[cursor]));
  remember();update();
  // When rows still do not fill the viewport, allow the user to see more
  // without hunting for an invisible scroll gesture.
  if(cursor<items.length&&view.isConnected&&view.scrollHeight<=view.clientHeight+1)
   window.requestAnimationFrame(()=>{if(view.isConnected&&view.scrollHeight<=view.clientHeight+1)reveal(8);});
 }
 view.addEventListener('scroll',()=>{
  remember();
  if(sectionScrollSaveTimer)clearTimeout(sectionScrollSaveTimer);
  sectionScrollSaveTimer=setTimeout(()=>{sectionScrollSaveTimer=null;save();},250);
  if(cursor<items.length&&view.scrollTop+view.clientHeight>=view.scrollHeight-160)reveal(16);
 },{passive:true});
 section.append(view,controls);host.append(section);
 reveal(Math.max(base,Math.min(2500,Number(stored.loaded)||0)));
 if(stored.top>0)window.requestAnimationFrame(()=>{if(view.isConnected)view.scrollTop=Math.min(stored.top,Math.max(0,view.scrollHeight-view.clientHeight));});
 return items.length;
}
function renderVerifiedRecentMarkets(host,s,{limit=9}={}){
 const recent=root.GPGrowth?.weeklyByMarket?.(s?.ledger||[],Date.now())?.markets||[];
 const winners=recent.filter(m=>Number.isFinite(m.profit)&&m.profit>0&&m.matched7>0);
 if(!winners.length)return 0;
 const buys=new Set((s?.snapshot?.buys||[]).map(o=>o.item));
 return appendScrollableSection(host,{
  id:'recent-earnings',title:'RECENT REAL EARNINGS · COMPLETED TRADES',
  desc:'Descending by actual matched net profit over seven days, not predicted 24-hour income. Market quotes and future fills require independent verification.',
  items:winners,initial:limit,renderRow:m=>{
   const row=h('button','focus-market-row focus-actual-winner');row.type='button';row.append(artwork(m.id));
   const middle=h('span','focus-market-title');middle.append(h('strong','',itemName(m.id)));
   const standing=buys.has(m.id)?' · buy order already standing':'';
   middle.append(h('small','','ACTUAL 7D · '+num(m.matched7)+' matched sold · '+num(m.bought7)+' bought'+standing));
   if(m.unknown7>0)middle.append(h('small','focus-muted',num(m.unknown7)+' sold units have unverified costs and are excluded from this profit'));
   row.append(middle);
   const side=h('span','focus-market-values');const value=h('strong','');value.append(money(m.profit));
   side.append(value,h('small','','real net profit · last 7 days'));row.append(side,h('span','focus-chevron','›'));
   row.setAttribute('aria-label',itemName(m.id)+'; realised seven-day matched profit '+cash(m.profit)+'; open market history');
   row.addEventListener('click',()=>{
    ui.tradeDetail=null;ui.relatedDetail=null;ui.growthDetail=null;ui.tradeFilter='memory';
    goto('trades');ui.growthDetail=m.id;pushHistory();renderGrowthDetail();
    window.scrollTo({top:0,behavior:'instant'});
   });
   return row;
  }
 });
}
/* Visible market decisions must use ALL evaluated data lanes, not only
 * the execution model's eight-window promotion gate. Unverified public
 * leads never receive a 24h profit, batch size or funded badge. */
function openBoardMarket(m){
 // This action can originate from a collapsed research settings shelf.
 // Close the overlay before opening the selected item's normal trade screen.
 if(!$('focus-research')?.hidden)closeResearch();
 ui.tradeDetail=null;ui.growthDetail=null;ui.relatedDetail=null;ui.selectedMarket=null;
 const wasTrade=ui.tab==='trades';
 if(!wasTrade)goto('trades');
 if(m.kind==='standing'){ui.growthDetail=m.id;}
 else{
  ui.tradeDetail=m.id;
  ui.selectedMarket={...m,kind:m.kind==='new'?'lead':'research',
   quantity:m.kind==='new'?0:m.quantity,cost:m.kind==='new'?0:m.cost,
   scenarioProfit:m.kind==='new'?0:m.scenarioProfit,
   observations:m.observations||0,confidence:m.evidence};
 }
 pushHistory();
 if(m.kind==='standing')renderGrowthDetail();else renderTradeDetail();
 window.scrollTo({top:0,behavior:'instant'});
}
function renderConnectedMarkets(host,s,{query='',limit=7,excludeIds=[]}={}){
 const board=root.GPMarketBoard?.build?.(s?.opportunityPlan,{wallet:userSnapshot()?.wallet,metadata:s?.meta||{}});
 if(!board?.ready)return {count:0,board:null};
 const q=query.toLowerCase().trim(),shown=new Set(excludeIds),lot=Number(ui.marketResearchLot)||10;
 const name=m=>m.name||m.itemName||itemName(m.id);
 const match=m=>!q||(name(m)+' '+m.id).toLowerCase().includes(q);
 // One shared research size; scroll positions and page stay put on changes.
 const controls=h('div','focus-market-lot-controls');
 const lotLabel=h('label','focus-market-lot-label','Research order size (not an order)');
 const lotSelect=h('select','focus-capacity-select focus-market-lot-select');
 lotSelect.setAttribute('aria-label','Research lot size for market list');
 for(const qty of [1,3,5,10,20,50,100,250]){
  const option=h('option','',num(qty)+' units');option.value=String(qty);lotSelect.append(option);
 }
 lotSelect.value=String(lot);lotLabel.append(lotSelect);controls.append(lotLabel);
 controls.append(h('small','focus-muted',
  'Choose any research lot, even above wallet balance. Returns require ALL proposed purchases and resales to complete; they are not fill forecasts.'));
 host.append(controls);
 lotSelect.addEventListener('change',()=>{
  ui.marketResearchLot=Number(lotSelect.value);save();
  const y=window.scrollY;
  if(ui.tab==='today')renderOpportunityHome();else renderTrades();
  window.requestAnimationFrame(()=>window.scrollTo({top:y,behavior:'instant'}));
 });
 const hypotheticalNet=m=>root.GPCapacity?.feeNet?.(m.exit,lot)-m.buy*lot;
 const group=(id,title,desc,items,metric,label,subtitle)=>{
  const rows=items.filter(m=>!shown.has(m.id)&&match(m));
  if(!rows.length)return 0;
  // Reserve ALL the items in this group, not just the first six visible
  // ones. Lazy-loading another section must not duplicate an item.
  for(const m of rows)shown.add(m.id);
  return appendScrollableSection(host,{
   id,title,desc,items:rows,initial:limit,renderRow:m=>{
    const row=h('button','focus-market-row focus-connected-market');row.type='button';
    row.dataset.marketTier=String(m.tier);row.dataset.marketId=String(m.id);
    row.append(artwork(m.id));
    const middle=h('span','focus-market-title');middle.append(h('strong','',name(m)));
    middle.append(h('small','',subtitle(m)));
    if(m.kind==='new'&&root.GPCapacity){
     const v=root.GPCapacity.estimate({market:{...m,name:name(m)},ledger:s?.ledger||[],metadata:s?.meta||{},quantity:lot});
     if(v.status==='research'&&(v.source==='own-market-active-days'||v.source==='observed-order-nights')){
      const ref=v.scenarios.find(x=>x.days===3);
      middle.append(h('small','focus-muted','YOUR completed fills · 3 active days: '+num(ref.acquiredTypical)+'–'+num(ref.acquiredHigh)+' acquired · '+
       (ref.resaleTypical===null?'resale time unknown':num(ref.resaleTypical)+'–'+num(ref.resaleHigh)+' resold')+' · conditional'));
     }else if(v.status==='research'&&v.source==='comparable-markets'){
      middle.append(h('small','focus-muted','Item-specific fill pace UNKNOWN. Comparable-market evidence in details, not a guaranteed fill.'));
     }else middle.append(h('small','focus-muted','No measured acquisition or resale pace for this item.'));
    }
    row.append(middle);
    const side=h('span','focus-market-values'),value=h('strong','');value.append(money(metric(m)));
    side.append(value,h('small','',label(m)));row.append(side,h('span','focus-chevron','›'));
    row.setAttribute('aria-label',name(m)+' · '+label(m)+' · inspect evidence');
    row.addEventListener('click',()=>openBoardMarket(m));
    return row;
   }
  });
 };
 let count=0;
 const equipmentIds=new Set((board.historyEquipment||[]).map(m=>m.id));
 const generalHistory=board.history.filter(m=>!equipmentIds.has(m.id));
 count+=group('standing-orders','YOUR EXISTING ORDERS · CURRENT PRICE CHECKS',
  'Already-committed capital is not new spending money. Conditional historical-week outcomes, not tonight’s income.',
  board.standing,m=>m.conditionalWeek,()=> 'Conditional active-week profit',
  m=>num(m.openUnits)+' on buy orders · '+num(m.quantity)+' units at historical weekly pace');
 count+=group('history-markets','HISTORY-BACKED MARKETS · CURRENT QUOTES',
  'Your completed trades beyond the last seven days, updated with current quotes. Trial quantities are not a predicted number of fills.',
  generalHistory,m=>m.nightUnits?m.nightProfit:m.scenarioProfit,
  m=>m.nightUnits?'Conditional overnight reference · not guaranteed':'Net IF one buy/resale round completes',
  m=>num(m.quantity)+' × '+cash(m.buy)+' · '+(m.nightUnits?'night evidence '+num(m.nightUnits)+' units':'no measured overnight fill rate')+
   ' · '+(m.capitalStatus==='wallet-covers-lot'?'wallet covers lot':'needs spendable gold'));
 count+=group('proven-equipment','PROVEN PEARL & EXOTIC EQUIPMENT',
  'Your completed equipment trades checked at current quotes. A small successful order does not prove a larger order will sell.',
  board.historyEquipment||[],m=>m.nightUnits?m.nightProfit:m.scenarioProfit,
  m=>m.nightUnits?'Conditional observed-night reference':'Net IF historical trial lot buys and resells',
  m=>num(m.quantity)+' × '+cash(m.buy)+' · '+(m.capitalStatus==='wallet-covers-lot'?'wallet covers lot':'more gold needed'));
 const unitSubtitle=m=>'Research '+num(lot)+' × '+cash(m.buy)+' · capital '+cash(m.buy*lot)+
  ' · ROI '+(m.roi*100).toFixed(1)+'% per unit at quoted prices'+(m.craftableSupply?' · craftable':'');
 const unitLabel=()=> 'Net IF ALL '+num(lot)+' buy AND resell · not a forecast';
 count+=group('pearl-weapons','CHEAPER PEARL WEAPONS · NEW MARKETS',
  'Exotic Pearl candidates across stat prefixes. Scroll for the full list; there is no measured market-wide bulk-fill rate.',
  board.pearlLeads,m=>hypotheticalNet(m),unitLabel,unitSubtitle);
 count+=group('exotic-armour','CHEAPER EXOTIC ARMOUR · NEW MARKETS',
  'Exotic armour across stat families. Public quotes show conditional margins, not completed turnover.',
  board.armorLeads,m=>hypotheticalNet(m),unitLabel,unitSubtitle);
 count+=group('other-affordable','OTHER AFFORDABLE NEW MARKETS',
  'More affordable public-market ideas. Verify acquisition and resale before committing to large lots.',
  board.otherLeads,m=>hypotheticalNet(m),unitLabel,unitSubtitle);
 count+=group('new-watchlist','MORE UNVERIFIED MARKET QUOTES',
  'Remaining researched price spreads, including items above your current wallet. Scroll to browse; these are NOT proven liquid markets or recommended bulk buys.',
  board.newMarkets,m=>hypotheticalNet(m),()=> 'Conditional quoted round only · turnover UNKNOWN',
  m=>'Bid '+cash(m.buy)+' · '+(m.buy>Number(userSnapshot()?.wallet||0)?'not covered by current wallet':'single unit affordable')+
   ' · '+num(lot)+'-unit what-if '+cash(m.buy*lot));
 return {count,board};
}
/* A capital choice is a WHAT-IF allocation across real currently quoted
 * markets, not a wallet balance and not authority to cancel any live order.
 * Research never spends, frees or moves Trading Post coins. */
function renderDeploymentPlanner(host,state){
 const p=state?.opportunityPlan,model=root.GPPortfolio,snap=userSnapshot();
 if(!p?.ok||!model||!snap)return;
 const wallet=Number(snap.wallet)||0;
 const committed=root.PeanutCore?.committedBuys?.(snap.buys||[])||0;
 const total=wallet+committed;
 const initial=ui.portfolioBudgetGold===null?Math.round(total/10000):Number(ui.portfolioBudgetGold);
 const requested=Math.max(0,Math.min(50000,Number.isFinite(initial)?initial:0));
 const wrapper=h('section','focus-deployment-lab');
 wrapper.append(h('h3','','CAPITAL DEPLOYMENT · WHAT IF?'),
  h('p','focus-muted','Evaluate your complete trading capacity, including coins committed to existing buy orders. No cancellations, new orders, or gold transfers are performed.'));
 const controls=h('div','focus-deployment-controls'),
   label=h('label','','Research funding (gold)');
 const input=h('input','focus-deployment-input');
 input.type='number';input.min='0';input.max='50000';input.step='1';input.value=String(requested);
 input.setAttribute('aria-label','Hypothetical deployment budget in gold');
 label.append(input);controls.append(label);
 const shortcuts=h('div','focus-deployment-shortcuts');
 const presets=[['Wallet',wallet],['Wallet + committed',total],['500g',5000000],['1,000g',10000000],['1,500g',15000000]];
 for(const [title,amount] of presets){
  const b=h('button','focus-button focus-button-secondary',title);b.type='button';
  b.addEventListener('click',()=>{ui.portfolioBudgetGold=Math.round(amount/10000);save();renderOpportunityHome();});
  shortcuts.append(b);
 }
 controls.append(shortcuts);
 wrapper.append(controls);
 const output=h('div','focus-deployment-results');wrapper.append(output);
 const calculate=()=>{
  output.replaceChildren();
  const amount=Number(input.value);
  if(!Number.isFinite(amount)||amount<0||amount>50000){output.append(h('p','focus-alert','Enter a research budget from 0 to 50,000 gold.'));return;}
  const result=model.build(p,{budgetGold:amount,wallet,committed,now:Date.now()});
  if(!result.ok){output.append(h('p','focus-alert',result.reason));return;}
  const grid=h('div','focus-deployment-metrics');
  const metric=(label,value)=>{const cell=h('div','focus-deployment-metric');cell.append(h('small','',label),h('strong','',value));grid.append(cell);};
  metric('Spendable wallet now',cash(wallet));
  metric('Already committed to buys',cash(committed));
  metric('Existing orders · CONDITIONAL active-week net',result.existingBook.conditionalActiveWeek===null?'Not measured':cash(result.existingBook.conditionalActiveWeek));
  metric('Existing book · evidence-backed items',num(result.existingBook.activeItems)+' · '+num(result.existingBook.unverified)+' unverified');
  metric('Hypothetical NEW buy allocation',cash(result.spent));
  metric('Unused research budget',cash(result.unallocated));
  metric('New plan · conditional 24h reference',result.conditionalNight===null?'No supported reference':cash(result.conditionalNight));
  metric('New plan · conditional active-week net',result.conditionalWeek===null?'Not supported':cash(result.conditionalWeek));
  metric('New markets selected',num(result.selectedMarkets)+' / '+num(result.qualifiedMarkets)+' qualified');
  output.append(grid);
  output.append(h('p','focus-deployment-warning',
   result.hypotheticalExceedsWallet?
    'WHAT-IF ONLY: this budget exceeds your free wallet by '+cash(result.budget-wallet)+'. Existing orders are not cancelled; queue positions remain intact.':
    'Wallet-sized scenario. No orders are submitted. A verified refresh is required before spending.'));
  output.append(h('p','focus-muted',
   'EXISTING and NEW plans are alternatives, NOT additive earnings. The new plan assumes its entire research budget is freely allocatable, which may require cancelling existing orders and losing queue priority. Current positions are shown separately. Active-week completed buying and selling on different dates does not prove another complete round will occur.'));
  output.append(h('p','focus-muted',
   'Missing zero-fill periods, cancellations, unlisted stock and changing resale demand prevent calibrated profit promises. Unverified public quotes add no modeled income.'));
  if(result.rows.length){
   appendScrollableSection(output,{
    id:'deployment-whatif',title:'TOP MARKETS BY CONDITIONAL ACTIVE-WEEK PROFIT',
    desc:'Scroll all '+num(result.rows.length)+' selected what-if markets. Existing orders are separate; no future fills are guaranteed.',
    items:result.rows,initial:8,renderRow:row=>{
     const button=h('button','focus-deployment-market');button.type='button';
     button.dataset.researchId=String(row.id);
     const identity=h('span','focus-deployment-market-name');
     identity.append(h('strong','',row.name),
      h('small','',num(row.quantity)+' units × '+cash(row.buy)+' · '+cash(row.cost)+' budget · '+(row.research?'personal completed-trade evidence':'UNVERIFIED one-unit public probe')));
     const side=h('span','focus-deployment-market-value');
     side.append(h('strong','',row.conditionalWeek===null?'No earnings estimate':cash(row.conditionalWeek)),
      h('small','',row.conditionalWeek===null?'Quote only · validation probe':'Conditional active-week net, NOT a forecast'));
     button.append(identity,side);
     button.addEventListener('click',()=>openBoardMarket({...row,kind:'history',scenarioProfit:row.conditionalRound,quantity:row.quantity,confidence:fmtResearch(row)}));
     return button;
    }
   });
  }else output.append(h('p','focus-muted','No independently qualified research lots fit this budget. We will not manufacture volume to use the balance.'));
  if(result.unallocated>0)output.append(h('p','focus-muted',
   cash(result.unallocated)+' remains hypothetical and unallocated. That can reflect insufficient observed throughput or risk limits; allocating it blindly would fabricate opportunity.'));
  output.append(h('p','focus-muted',result.caveat));
 };
 function fmtResearch(x){return x.research?'Personal trade history · research only':'Public quote · execution unknown';}
 input.addEventListener('change',()=>{const n=Number(input.value);
  if(Number.isFinite(n)&&n>=0&&n<=50000){ui.portfolioBudgetGold=n;save();calculate();}
  else calculate();
 });
 calculate();
 host.append(wrapper);
}
/* Secure, explicit opt-in for account monitoring independent of Android.
 * No account credential is transmitted unless Enable is pressed. */
let watcherConsentPending=false,watcherConsentChecked=false,watcherConsentAccount=null,watcherEnrollmentBusy=false,watcherFeedback=null;
function renderAccountWatcher(host,state){
 const cloud=root.GPCloudAccount,account=state?.account;
 const wrapper=h('section','focus-account-watcher');wrapper.id='focus-account-watcher';
 wrapper.append(h('strong','','ACCOUNT TRADE WATCHER'));
 // Monitoring is a connection/security control, not a market forecast:
 // always display it, even while quotes are old or the account sync is busy.
 if(!cloud){
  wrapper.append(h('p','focus-muted','Trade monitor component is unavailable in this build. Refresh the app without clearing stored trading history.'));
  host.append(wrapper);return;
 }
 if(!account||!state?.key){
  wrapper.append(h('p','focus-muted','Connect your GW2 Trading Post API key using ⚙ Account settings to activate background monitoring. Your existing stored trading history remains intact.'));
  host.append(wrapper);return;
 }
 if(watcherConsentAccount!==account){watcherConsentAccount=account;watcherConsentPending=false;watcherConsentChecked=false;watcherEnrollmentBusy=false;watcherFeedback=null;}
 const info=cloud.status(account);
 const last=Number(info.status?.lastSuccess)||0,elapsed=last>0?Date.now()-last:Infinity;
 const watcherState=info.restoring?'restoring':!info.enabled?(info.restoreError?'unverified':'off'):info.lastError?'error':info.syncing?'checking':
  Number.isFinite(elapsed)&&elapsed>=0&&elapsed<(info.status?.backend==='github-actions'?85:40)*60000?'active':last?'stale':'pending';
 const states={
  restoring:'Restoring saved background monitoring…',
   unverified:'CONNECTION NOT VERIFIED — check cloud account status',
   off:'OFF — background monitoring has not been enabled',
  checking:'CHECKING — confirming cloud account status',
  active:'ACTIVE — last successful cloud check '+new Date(last).toLocaleString('en-GB',{timeZone:'Europe/London'})+' (UK)',
  stale:'CHECKS OVERDUE — last confirmed cloud check '+new Date(last).toLocaleString('en-GB',{timeZone:'Europe/London'})+' (UK)',
  pending:'ENROLLED — awaiting the first successful cloud account check',
  error:'CHECK FAILED — cloud monitoring has not been verified'
 };
 const live=h('p','focus-watcher-state',states[watcherState]);
 live.dataset.monitorState=watcherState;live.setAttribute('role','status');live.setAttribute('aria-live','polite');
 wrapper.append(live);
 const shortcut=$('focus-watcher-jump');
 if(shortcut){
  shortcut.textContent=watcherState==='active'?'Watch ✓':
   watcherState==='error'||watcherState==='stale'?'Watch !':
   watcherState==='pending'?'Watch …':'Watch';
  shortcut.title='Account Trade Watcher — '+states[watcherState];
 }
 const intro=h('p','focus-muted');
 if(!info.enabled){
  if(info.serviceMode==='github-actions-fallback'){
   intro.textContent='ArenaNet is rate-limiting Cloudflare’s shared outgoing IP. Golden Peanut can instead use your private GitHub Actions runner to check completed buys, sells and order changes every ~30 minutes, even with this phone closed.';
   wrapper.append(intro);
   const setup=h('div','focus-watcher-setup');
   setup.append(
    h('p','','1. Use the EXACT SAME GW2 API key already connected to Golden Peanut (account + tradingpost permissions), so the private collector can match your account securely. If you create a new key, update Golden Peanut to that same key as well.'),
    h('p','','2. In GitHub Actions Secrets, select New repository secret. Name it GW2_PRIVATE_MONITOR_KEY, then paste the key there. Never paste it into this chat or into source files.'),
    h('p','','3. Run the private account collector once, or let the next scheduled check run. Then tap Connect below.')
   );
   const links=h('div','focus-watcher-actions');
   for(const [label,url]of [
    ['GW2 API keys','https://account.arena.net/applications'],
    ['Add GitHub secret','https://github.com/tnolanwood-rgb/golden-peanut-data/settings/secrets/actions'],
    ['Run collector now','https://github.com/tnolanwood-rgb/golden-peanut-data/actions/workflows/private-account-collector.yml']
   ]){
    const a=h('a','focus-button focus-button-secondary',label);
    a.href=url;a.target='_blank';a.rel='noopener noreferrer';links.append(a);
   }
   setup.append(links);
   const copy=h('button','focus-button focus-button-secondary','Copy connected GW2 key');
   copy.type='button';copy.title='Sensitive: copies the API key already stored locally in Golden Peanut.';
   copy.addEventListener('click',async()=>{
    try{
     await navigator.clipboard.writeText(state.key);
     copy.textContent='Copied — paste into GitHub Secret';
    }catch{copy.textContent='Clipboard unavailable — obtain the key from ArenaNet';}
   });
   setup.append(copy,h('p','focus-muted',
    'The key is only copied if you tap this button. After pasting it into GitHub Secrets, clear your phone clipboard for privacy. Nothing is sent to this chat.'));
   wrapper.append(setup);
   if(watcherFeedback?.account===account)wrapper.append(
    h('p',watcherFeedback.ok?'focus-watcher-feedback':'focus-alert focus-watcher-feedback',watcherFeedback.message));
   const connect=h('button','focus-button focus-button-secondary','Connect GitHub background monitor');
   connect.type='button';connect.disabled=watcherEnrollmentBusy||info.syncing;
   connect.addEventListener('click',async()=>{
    if(watcherEnrollmentBusy)return;
    watcherEnrollmentBusy=true;connect.disabled=true;connect.textContent='Checking account collector…';
    try{
     const result=await cloud.connectGithub(state);
     watcherFeedback={account,ok:true,message:result?.lastSuccess?
      'CONNECTED — the private GitHub collector has checked this account.':
      'CONNECTED — awaiting a successful scheduled account check.'};
    }catch(e){watcherFeedback={account,ok:false,message:
     'Not connected: '+String(e?.message||e).slice(0,185)+
     ' Ensure your GitHub Actions secret is set and the private collector has run.'};}
    finally{watcherEnrollmentBusy=false;root.GPFocus?.render?.();}
   });
   wrapper.append(connect);host.append(wrapper);return;
  }

  intro.textContent=info.serviceReady?
   'Local trade history checks work while this app is open. To record buy and sell order changes while closed, you can explicitly enable the encrypted Cloudflare monitor.':
   'Account trade history is checked while this app is open. The private cloud monitor is currently unreachable, so no background enrollment or key transfer is available.';
  wrapper.append(intro);
  if(watcherFeedback?.account===account&&!watcherFeedback.ok){
   const msg=h('p','focus-alert focus-watcher-feedback',watcherFeedback.message);msg.setAttribute('role','alert');wrapper.append(msg);
  }
  if(watcherConsentPending&&info.serviceReady){
   const notice=h('p','focus-muted',
    'Your existing Guild Wars 2 API key will be sent securely to your own Cloudflare Worker, encrypted for storage, and used to check Trading Post orders and completed transactions about every 10 minutes, even while your phone is closed. This cannot place or cancel orders. Intermediate fills between checks may not be observable. You can disable monitoring and erase its cloud records.');
   wrapper.append(notice);
   const consent=h('label','focus-watcher-consent');
   const check=h('input');check.type='checkbox';check.setAttribute('aria-label','I agree to encrypted GW2 key storage for off-phone monitoring');
   check.checked=watcherConsentChecked;
   consent.append(check,h('span','','I agree to encrypted storage of my GW2 API key for background trade monitoring.'));
   wrapper.append(consent);
   const actions=h('div','focus-watcher-actions');
   const activate=buttonNode(info.syncing?'Connecting…':'Start background monitoring');
   activate.disabled=!watcherConsentChecked||watcherEnrollmentBusy||info.syncing;
   check.addEventListener('change',()=>{watcherConsentChecked=check.checked;activate.disabled=!watcherConsentChecked||watcherEnrollmentBusy||cloud.status(account).syncing;});
   activate.addEventListener('click',async()=>{
    if(!watcherConsentChecked||watcherEnrollmentBusy||activate.disabled)return;
    watcherEnrollmentBusy=true;activate.disabled=true;activate.textContent='Connecting to Cloudflare…';
    watcherFeedback={account,ok:true,message:'Verifying account enrollment…'};
    try{
     await cloud.enable(state);
     watcherConsentPending=false;watcherConsentChecked=false;
     const result=await cloud.refresh(state,{force:true});
     watcherFeedback={account,ok:true,message:result?.lastSuccess?
      'Monitoring ACTIVE — the account has been checked successfully.':
      'Account enrolled. First successful background collection is pending.'};
    }catch(e){
     watcherFeedback={account,ok:false,message:'Enrollment unsuccessful: '+String(e?.message||e).slice(0,200)};
    }finally{watcherEnrollmentBusy=false;}
    root.GPFocus?.render?.();
   });
   const cancel=buttonNode('Cancel');
   cancel.addEventListener('click',()=>{watcherConsentPending=false;watcherConsentChecked=false;watcherFeedback=null;root.GPFocus?.render?.();});
   actions.append(activate,cancel);wrapper.append(actions);
  }else{
   const enable=buttonNode(info.serviceReady?'Enable background trade watching':'Background monitoring unavailable');
   enable.disabled=info.syncing||!info.serviceReady;
   enable.addEventListener('click',()=>{
    watcherConsentPending=true;watcherConsentChecked=false;watcherFeedback=null;root.GPFocus?.render?.();
    setTimeout(()=>document.querySelector('#focus-account-watcher .focus-watcher-consent')?.scrollIntoView({block:'center',behavior:'instant'}),60);
   });
   wrapper.append(enable);
  }
 }else{
  if(watcherFeedback?.account===account&&watcherFeedback.ok){
   const feedback=h('p','focus-watcher-feedback',watcherFeedback.message);feedback.setAttribute('role','status');wrapper.append(feedback);
  }
  const status=info.status,last=Number(status?.lastSuccess);
  intro.textContent='Background monitor enabled · '+(status?.backend==='github-actions'?
    'a private GitHub Actions runner checks every ~30 minutes. ':
    'Cloudflare checks about every 10 minutes. ')+
   (last?'Last success '+new Date(last).toLocaleString('en-GB',{timeZone:'Europe/London'})+'. ':'First collection pending. ')+
   (status?'Completed transaction records '+num(status.savedCompletedTrades||0)+
    ' · active buys '+num(status.currentBuys||0)+' · active sells '+num(status.currentSells||0)+
    ' · observed order nights '+num(status.verifiedOrderNights||0)+'. ':'')+
   ' Cancellations are not counted as fills, and missing observations are never assumed successful.';
  wrapper.append(intro);
  const actions=h('div','focus-watcher-actions');
  const check=buttonNode(info.syncing?'Checking cloud…':'Refresh cloud learning');
  check.disabled=info.syncing;
  check.addEventListener('click',async()=>{
   check.disabled=true;check.textContent='Checking Cloudflare…';
   await cloud.refresh(state,{force:true});
   root.GPFocus?.render?.();
  });
  actions.append(check);
  const disable=buttonNode('Stop & erase cloud monitoring');
  disable.addEventListener('click',async()=>{
   if(!window.confirm('Stop cloud monitoring and delete its encrypted credential and cloud observations? Your local trading history stays intact.'))return;
   disable.disabled=true;
   try{await cloud.disable(state);}catch(e){window.alert('Could not disable monitor: '+String(e?.message||e));}
   root.GPFocus?.render?.();
  });
  actions.append(disable);wrapper.append(actions);
 }
 if(info.lastError)wrapper.append(h('p','focus-alert','Cloud monitor: '+info.lastError));
 host.append(wrapper);
 function buttonNode(text){const b=h('button','focus-button focus-button-secondary',text);b.type='button';return b;}
}
/* Show immediately useful candidates ABOVE the monitor. The old eight-cohort
 * forecasting gate must not hide historical buying/resale research for weeks.
 * This section distinguishes hypothetical full-round profit from measured
 * night throughput and does not claim the whole lot will actually turn over.
 */
function renderTopResearch(host,state){
 const board=root.GPMarketBoard?.build?.(state?.opportunityPlan,{
  wallet:userSnapshot()?.wallet,metadata:state?.meta||{}
 });
 if(!board?.ready||!board.history?.length)return;
 const rows=board.history.slice(0,8);
 const section=h('section','focus-top-research');
 section.append(h('h3','','TOP BUY RESEARCH · MOST PROMISING FIRST'));
 section.append(h('p','focus-muted',
  'Ranked by evidence-weighted gold opportunity, not percentage ROI. These are manually considered buys, NOT calibrated profit forecasts. Already-open orders are separate.'));
 for(const m of rows){
  const button=h('button','focus-market-row focus-top-research-row');
  button.type='button';button.dataset.marketId=String(m.id);
  button.dataset.marketTier=m.tier;
  button.append(artwork(m.id));
  const middle=h('span','focus-market-title');
  middle.append(h('strong','',m.name||itemName(m.id)));
  middle.append(h('small','','BUY '+num(m.quantity)+' × '+cash(m.buy)+' · sell reference '+cash(m.exit)+
   ' · '+(m.capitalStatus==='wallet-covers-lot'?'wallet covers lot':'requires additional wallet gold')));
  if(m.measuredNights){
   const x=m.measuredNights;
   middle.append(h('small','focus-muted',
    'VERIFIED NIGHTS: '+num(x.buy.days)+' buy / '+num(x.sell.days)+' sell · zeros '+num(x.buy.zeros)+' / '+num(x.sell.zeros)+
    ' · cautious separate-side capacity '+num(x.units)+' units (not a round-trip forecast)'));
  }else middle.append(h('small','focus-muted','Active-day trade history only · zero-fill nights not yet established'));
  button.append(middle);
  const side=h('span','focus-market-values'),val=h('strong','');
  val.append(money(m.scenarioProfit));
  side.append(val,h('small','','Net IF ALL '+num(m.quantity)+' buy and resell · NOT a forecast'));
  button.append(side,h('span','focus-chevron','›'));
  button.addEventListener('click',()=>openBoardMarket(m));
  section.append(button);
 }
 host.append(section);
}
function renderOpportunityHome(){
 const host=$('focus-best-rows'),status=$('focus-best-status'),copy=$('focus-copy-all');if(!host)return;
 if(root.GPOpportunity?.buildId!==EXPECTED_MARKET_BUILD){
  host.replaceChildren(h('p','focus-alert','Market recommendations disabled: app components are from different releases. Reload the current Production deployment.'));
  if(status)status.textContent='Market engine version mismatch';
  if(copy)copy.hidden=true;
  return;
 }
 const t=tradeData('wallet'),s=State(),p=t.p;
 const progress=$('focus-deep-progress'),stop=$('focus-deep-stop'),retry=$('focus-deep-retry');
 if(progress){
  const scanning=!!s?.opportunityDeepBusy,paused=!!s?.opportunityDeepPaused;
  progress.textContent=scanning?(s.opportunityDeepStatus||'Expanded discovery is running. Your current trade list remains available.'):
   (s?.opportunityDeepStatus||'First showing your account-backed markets. Independent market discovery runs separately.');
  progress.classList.toggle('focus-deep-active',scanning);
  if(stop)stop.hidden=!scanning;
  if(retry)retry.hidden=scanning||(!paused&&!/incomplete|failed|stopped/i.test(s?.opportunityDeepStatus||''));
 }
 host.replaceChildren();
 const fresh=t.valid,book=root.GPOpportunity?.rankedMarkets?.(p);
 if(fresh)renderTopResearch(host,s);
 // Keep operational details in ⚙ Settings, not the trade list.
 const monitorHost=$('focus-account-watcher-host');
 if(monitorHost){monitorHost.replaceChildren();renderAccountWatcher(monitorHost,s);}
 const capitalHost=$('focus-deployment-research');
 if(capitalHost){capitalHost.replaceChildren();if(fresh)renderDeploymentPlanner(capitalHost,s);}
 // Alert only if a previously connected collector has truly missed several
 // scheduled checks, never while restoring local session state.
 const cloud=root.GPCloudAccount?.status?.(s?.account);
 const lastCloud=Number(cloud?.status?.lastSuccess)||0;
 if(cloud?.enabled===true&&!cloud?.restoring&&!cloud?.syncing&&lastCloud>0&&
    Date.now()-lastCloud>(cloud.status?.backend==='github-actions'?95:55)*60000){
  const warning=h('button','focus-monitor-warning',
   'Background checks overdue · Review in settings');
  warning.type='button';warning.addEventListener('click',()=>showResearch('focus-monitor-settings'));
  host.append(warning);
 }
 copy.hidden=!fresh||!(p?.orders||[]).some(o=>o.scenarioProfit>=30000||o.quantity>=3);
 if(!fresh){
  status.textContent=s?.opportunityBusy?'Checking your historical markets and current prices…':s?.opportunityStatus||'Checking markets…';
  host.append(h('p','focus-empty','Fresh, verified market quotations are needed before showing buy instructions. Your saved trades are intact.'));
  renderVerifiedRecentMarkets(host,s);
  return;
 }
 const rows=book?.rows||[],board=root.GPMarketBoard?.build?.(p,{wallet:userSnapshot()?.wallet,metadata:s?.meta||{}});
 status.textContent=(p?.candidateRefresh?.phase==='quick'?'INITIAL RESEARCH · ':'')+
  num(rows.length)+' calibrated 24h orders · '+num(board?.counts?.history||0)+' history-backed markets · '+num(board?.counts?.newMarkets||0)+' new quoted leads';
 if(!rows.length){
  const connected=renderConnectedMarkets(host,s,{limit:6,excludeIds:(board?.history||[]).slice(0,8).map(x=>x.id)});
  if(!connected.count)host.append(h('p','focus-empty','No quote-supported markets surfaced in this scan. Full-market discovery is separate from execution calibration; check Trades for the complete catalogue and refresh market checks.'));
  renderVerifiedRecentMarkets(host,s,{limit:5});
  return;
 }
 // A market already buying/selling with verified margin is part of the trading
 // operation. Display it *above* minor wallet-only orders when its evidenced
 // weekly profit scenario is higher.
 const strongest=rows;
 appendScrollableSection(host,{
  id:'calibrated-orders',title:'CALIBRATED 24-HOUR OPPORTUNITIES',
  desc:'Verified prospective observations only. Scroll within this section for every currently qualifying market.',
  items:strongest,initial:9,renderRow:o=>{
  const row=h('button','focus-market-row focus-home-order');row.type='button';row.append(artwork(o.id));
  const middle=h('span','focus-market-title');middle.append(h('strong','',itemName(o.id)));
  let summary='',metric=o.expectedProfit,label='Expected 24h net · '+Number(o.expectedSold).toFixed(1)+' sold';
  if(o.kind==='standing')summary='ALREADY ON ORDER · '+num(o.openUnits)+' open · '+num(o.quantity)+' within historical active-week pace';
  else if(o.kind==='funded')summary='NEW BUY '+num(o.quantity)+' × '+cash(o.bid)+' · '+cash(o.cost)+' from wallet';
  else summary=o.kind==='potential'?'MARKET TO CONSIDER · '+num(o.quantity)+' × '+cash(o.bid)+' · '+cash(o.cost)+' needed':'WHAT-IF ONLY · '+num(o.quantity)+' × '+cash(o.bid)+' · '+cash(o.cost)+' hypothetical';
  middle.append(h('small','',summary));if(o.historicalRange)middle.append(h('small','focus-muted','Observed range '+cash(o.historicalRange[0])+' to '+cash(o.historicalRange[1])+' · '+o.sampleCount+' windows · '+o.zeroFillWindows+' zero-fill'));row.append(middle);
  const side=h('span','focus-market-values'),value=h('strong','');value.append(money(metric));
  side.append(value,h('small','',label));row.append(side,h('span','focus-chevron','›'));
  row.setAttribute('aria-label',itemName(o.id)+'; '+summary+'; expected net 24-hour profit '+cash(metric)+'. View market.');
  row.addEventListener('click',()=>{
   ui.tradeDetail=null;ui.growthDetail=null;ui.relatedDetail=null;ui.selectedMarket=null;
   ui.capitalMode='wallet';
   goto('trades'); // first history entry is the trade list
   ui.tradeY=0;
   if(o.kind==='standing')ui.growthDetail=o.id;else{ui.tradeDetail=o.id;ui.selectedMarket=o;}
   pushHistory(); // second entry is the item detail; Android Back returns to list
   if(o.kind==='standing')renderGrowthDetail();else renderTradeDetail();
   window.scrollTo({top:0,behavior:'instant'});
  });
  return row;
  }
 });
 renderConnectedMarkets(host,s,{limit:6,excludeIds:(board?.history||[]).slice(0,8).map(x=>x.id)});
}
function renderPortfolioOutlook(){
 const host=$('focus-earnings-pace'),s=State(),t=tradeData('wallet');if(!host)return;
 host.replaceChildren();host.hidden=!t.valid; if(!t.valid)return;
 const book=root.GPOpportunity?.rankedMarkets?.(t.p);if(!book)return;
 const cover=h('div','focus-outlook-title');cover.append(h('strong','','Trading outlook · currently verified markets'));
 host.append(cover);
 const grid=h('div','focus-pace-grid');
 const make=(name,c)=>{const cell=h('div','focus-pace-cell');cell.append(h('small','',name),h('strong','',c===null?'Not estimated':cash(c)));grid.append(cell);};
 make('Expected net profit by tomorrow',book.overnightPortfolioScenario);
 make('Buy capital + listing-fee reserve',t.p.spent||0);
 make('Wallet left unallocated',t.p.unallocated||0);
 host.append(grid);
 host.append(h('p','focus-muted','Only funded new purchases are totalled. Existing holdings and cancellation scenarios are separate. Unspent sale proceeds are not recycled in this forecast. No estimate is available without comparable execution evidence.'));
 const audit=s?.executionBacktest||root.GPExecution?.backtest(s?.executionLearning||{});
 if(audit)host.append(h('p','focus-muted','Walk-forward checks: '+audit.n+' held-out windows; '+audit.censoredWindows+' censored; '+audit.skippedStarts+' starts not observable. '+(audit.n?'Profit MAE '+cash(audit.profitMAE)+'; last-window baseline MAE '+cash(audit.persistenceMAE)+'.':'Live forecasting accuracy has not been established.')));
 host.append(h('p','focus-muted','Learning: '+num((s?.ledger||[]).length)+' preserved completed trade records feed the forecasts. Last recorded trade: '+
  (s?.ledger?.length?new Date(Math.max(...s.ledger.slice(-1000).map(x=>x.purchased||0))).toLocaleString('en-GB',{timeZone:'Europe/London'}):'none')+
  '. History refreshes are retained across app releases in this browser. Actual 7-day profit: '+cash(Number(s?.summary?.weekP100||0)/100)+'.'));
}

function renderGrowthGoal(){
 const target=$('focus-growth-goal'),s=State(),goal=root.GPGrowth?.goalProgress(s);if(!target||!goal)return;
 target.replaceChildren();
 if(goal.realised===null){target.append(h('span','focus-muted','Weekly gold milestone: earnings history not checked yet.'));return;}
 const heading=h('div','focus-growth-goal-label');heading.append(h('span','','First weekly milestone'),h('strong','',cash(goal.realised)+' / '+cash(goal.goal)));target.append(heading);
 const track=h('div','focus-growth-track');track.setAttribute('role','progressbar');track.setAttribute('aria-label','Weekly profit goal');track.setAttribute('aria-valuemin','0');track.setAttribute('aria-valuemax',String(goal.goal));track.setAttribute('aria-valuenow',String(Math.max(0,goal.realised)));const fill=h('div','focus-growth-fill');fill.style.width=(goal.fraction*100).toFixed(2)+'%';track.append(fill);target.append(track);
 target.append(h('p','focus-muted',goal.remaining===0?'First milestone reached for the current seven UK days.':cash(goal.remaining)+' more matched profit needed to reach 2,000g. Goal, not a forecast.'));
}
function growthSnapshot(){const s=State(),growth=root.GPGrowth?.weeklyByMarket(s?.ledger||[],Date.now()),goal=root.GPGrowth?.goalProgress(s),snap=userSnapshot(),t=tradeData();return {s,growth,goal,snap,t};}
function renderGrowthContext(){const host=$('focus-growth-context');if(!host)return;host.replaceChildren();const {s,growth,goal,snap,t}=growthSnapshot();
 if(!s||!snap)return;
 if(goal && goal.realised!==null){const box=h('div','focus-growth-summary');const upper=h('div','focus-growth-summary-top');upper.append(h('strong','','Actual 7-day profit'),money(goal.realised));box.append(upper,h('p','focus-muted','Target: '+cash(goal.goal)+' · '+(goal.remaining?'gap '+cash(goal.remaining):'milestone reached')));host.append(box);}
 const reserve=Array.isArray(snap.buys)?root.PeanutCore.committedBuys(snap.buys):null;
 const brief=h('p','focus-muted focus-growth-capital','');brief.textContent='Wallet '+cash(snap.wallet)+(reserve!==null?' · already reserved '+cash(reserve):'')+'. Reserved gold is not spendable.';host.append(brief);
}
function growthRow(m,plan){const row=h('button','focus-market-row focus-growth-market');row.type='button';row.append(artwork(m.id));const center=h('span','focus-market-title');center.append(h('strong','',itemName(m.id)));
 const live=plan?.valid?plan.orders.find(o=>o.id===m.id&&o.tier!=='quote-only'):null;
 const note='Bought '+num(m.bought7)+' · sold '+num(m.sold7)+' in 7 days'+(live?' · new buy '+num(live.quantity)+' supported':'');center.append(h('small','',note));row.append(center);
 const side=h('span','focus-market-values');const val=h('strong','');val.append(money(m.profit));side.append(val,h('small','','actual matched net'));row.append(side,h('span','focus-chevron','›'));
 row.setAttribute('aria-label',itemName(m.id)+', earned '+cash(m.profit)+' net in seven days, matched cost only. Inspect market');
 row.addEventListener('click',()=>{ui.tradeY=window.scrollY;ui.growthDetail=m.id;pushHistory();renderGrowthDetail();window.scrollTo({top:0,behavior:'instant'});});return row;
}
function rememberedReviewStore(){try{return JSON.parse(localStorage.getItem('gp-memory-reviewed:'+String(State()?.account||''))||'{}');}catch{return {};}}
function memoryReviewed(id){const last=Number(rememberedReviewStore()[id])||0;return last>0&&Date.now()-last<7*86400000;}
function markMemoryReviewed(id){const next=rememberedReviewStore();next[id]=Date.now();try{localStorage.setItem('gp-memory-reviewed:'+String(State()?.account||''),JSON.stringify(next));}catch{}}
function quoteInspector(id,host){host.replaceChildren();const b=button('↻ Check live Trading Post prices',async()=>{
 const s=State();if(!s?.api||!s?.db){host.append(h('p','focus-muted','Connect your account to check this item.'));return;}
 b.disabled=true;b.textContent='Checking current bid and ask…';try{
  const quotes=await s.api.pricesForIds([id]);const q=quotes?.find(x=>Number(x.id)===Number(id));
  if(!q||!Number.isSafeInteger(q.buy)||!Number.isSafeInteger(q.sell)){host.append(h('p','focus-muted','No current buy-and-sell quote is available for this item.'));return;}
  await s.db.upsertMarketBatch([q],{priorityIds:[id]});
  const entry=q.buy+1<q.sell?q.buy+1:q.buy;
  const net=root.PeanutMarket.batchSaleNet(q.sell,1),edge=net===null?null:net-entry;
  const box=h('div','focus-info-box');box.append(h('strong','','Current market quote · research only'),
   h('p','focus-muted','Bid +1 reference: '+cash(entry)+' · lowest ask: '+cash(q.sell)+'.'),
   h('p','',edge===null?'After-fee margin unavailable.':'Conditional 1-unit spread after TP fees: '+cash(edge)+'.'),
   h('p','focus-muted','This is not realised profit, turnover data, or approval for a bulk order. Check recent fills and existing orders before trading.'));
  host.append(box);
 }catch(e){host.append(h('p','focus-alert','Current quote could not be checked. Existing history is unchanged.'));}
 finally{b.disabled=false;b.textContent='↻ Recheck market quote';}
 },'focus-button focus-button-secondary');host.append(b);
}
function renderRelatedDetail(){const l=ui.relatedDetail;if(!l)return;const el=$('focus-trade-detail');$('focus-trade-list-view').hidden=true;el.hidden=false;el.replaceChildren();
 el.append(button('← Back to market memory',()=>backToList('trades'),'focus-back'));
 const head=h('div','focus-detail-title');head.append(artwork(l.id,true));const title=h('div');title.append(h('h3','',l.name),h('p','focus-muted','Related by item name · no verified completed sales'));head.append(title);el.append(head);
 el.append(h('p','focus-muted','This item is discoverable independently of your prior trades. Its price, order fills and resale pace are not verified. Check its live quote before considering a trade.'));
 const quote=h('div','focus-quote-inspector');el.append(quote);quoteInspector(l.id,quote);
 el.append(button('Copy item name for GW2 search',async()=>{try{await navigator.clipboard.writeText(l.name);}catch{}},'focus-button focus-button-secondary'));
}
function memoryRow(m){const row=h('button','focus-market-row focus-memory-market');row.type='button';row.dataset.memoryId=String(m.id);row.append(artwork(m.id));
 const center=h('span','focus-market-title');center.append(h('strong','',itemName(m.id)));
 const when=m.lastActivity?new Date(m.lastActivity).toLocaleDateString('en-GB',{month:'short',year:'numeric'}):'unknown';
 center.append(h('small','',num(m.matchedAll)+' matched sold units · last traded '+when+(m.unknownAll?' · incomplete costs':'')));
 row.append(center);const side=h('span','focus-market-values');const value=h('strong','');value.append(money(m.profit));side.append(value,h('small','',m.proven?'saved matched profit':'matched net / partial'));row.append(side,h('span','focus-chevron','›'));
 row.addEventListener('click',()=>{ui.tradeY=window.scrollY;ui.tradeDetail=null;ui.growthDetail=m.id;pushHistory();renderGrowthDetail();window.scrollTo({top:0,behavior:'instant'});});return row;
}
function relatedRow(l){const row=h('button','focus-market-row focus-memory-related');row.type='button';row.append(artwork(l.id));const center=h('span','focus-market-title');center.append(h('strong','',l.name),h('small','',l.family+' · similar naming, not verified profits'));row.append(center);const side=h('span','focus-market-values');side.append(h('small','','Research only'));row.append(side,h('span','focus-chevron','›'));row.addEventListener('click',()=>{ui.tradeY=window.scrollY;ui.growthDetail=null;ui.tradeDetail=null;ui.relatedDetail=l;pushHistory();renderRelatedDetail();window.scrollTo({top:0,behavior:'instant'});});return row;}
function renderGrowthDetail(){const t=tradeData(),d=root.GPGrowth?.allHistory(State()?.ledger||[],Date.now())?.byId?.get(ui.growthDetail);if(!d){ui.growthDetail=null;renderTrades();return;}
 const el=$('focus-trade-detail');$('focus-trade-list-view').hidden=true;el.hidden=false;el.replaceChildren();el.append(button('← Back to trades',()=>backToList('trades'),'focus-back'));
 const head=h('div','focus-detail-title');head.append(artwork(d.id,true));const title=h('div');title.append(h('h3','',itemName(d.id)),h('p','focus-muted','Your saved historical trades · matched costs only'));head.append(title);el.append(head);
 const openScenario=State()?.opportunityPlan?.activeBook?.entries?.find(x=>x.id===d.id);
 if(openScenario){const current=h('div','focus-info-box');current.append(h('strong','','Already on order · current margin opportunity'),
  h('p','focus-muted',num(openScenario.units)+' units standing; '+num(openScenario.scenarioUnits)+' units within estimated active-week capacity. Conditional profit '+cash(openScenario.conditionalWeek)+' over a comparable active week, if purchases and resales complete at the modelled prices. Historical active-day buys '+num(openScenario.observedBuyMedian||0)+'; sales '+num(openScenario.observedSellMedian||0)+'. No measured fill probability.'));
  el.append(current);}
 const position=root.GPGrowth?.marketPosition(State(),d.id),suggestion=t.valid?t.orders.find(o=>o.id===d.id&&o.tier!=='quote-only'):null;const spendable=t.p?.source==='wallet';
 const grid=h('div','focus-detail-grid'),metric=(key,value)=>{const e=h('div','focus-detail-metric');e.append(h('span','focus-muted',key),h('strong','',value));grid.append(e);};
 metric('Actual matched net · saved history',cash(d.profit));metric('7-day matched net',cash(d.profit7));metric('90-day matched net',cash(d.profit90));metric('Bought / sold in 7 days',num(d.bought7)+' / '+num(d.sold7));metric('Matched sale units · saved history',num(d.matchedAll));metric('Unknown-cost units · saved history',num(d.unknownAll));metric('Different historical sell days',num(d.saleActiveDays));metric('Open buy / sell units',num(position?.openBuys||0)+' / '+num(position?.openSells||0));metric('Gold on existing buys',cash(position?.reserved||0));el.append(grid);
 if(d.unknownAll>0)el.append(h('p','focus-alert','Some historical sales have no saved purchase cost. These units are excluded from matched profit; old data may be incomplete.'));
 if(suggestion){const box=h('div','focus-info-box');box.append(h('strong','',spendable?'Additional order supported by fresh evidence':'Hypothetical order — funds not yet verified in wallet'),h('p','focus-muted','Buy '+num(suggestion.quantity)+' @ '+cash(suggestion.buy)+' each · commit '+cash(suggestion.cost)+' · conditional after-fee profit '+cash(suggestion.scenarioProfit)+'. Existing orders and capital limits are already considered.'));el.append(box);
  if(spendable){const b=button('Copy manual buy instruction',async()=>{if(!tradeData().valid){b.disabled=true;b.textContent='Quote expired — recalculate';return;}try{await navigator.clipboard.writeText(`${itemName(d.id)} | BUY ${suggestion.quantity} @ ${cash(suggestion.buy)} | commit ${cash(suggestion.cost)} | quote-only exit ${cash(suggestion.exit)} | conditional profit ${cash(suggestion.scenarioProfit)}`);b.textContent='Copied';}catch{b.textContent='Clipboard unavailable';}},'focus-button focus-button-primary');el.append(b);}
  else el.append(h('p','focus-muted','First collect the coins or manually cancel the relevant standing orders, then recheck your wallet and rebuild under Wallet now.'));
 }else el.append(h('div','focus-info-box','No additional buy is currently supported by a fresh funded plan. This market may still be earning gold through existing orders. Review exposure before adding more.'));
 const quote=h('div','focus-quote-inspector');el.append(quote);quoteInspector(d.id,quote);
 if(d.dormant){const mark=button(memoryReviewed(d.id)?'Already hidden from daily suggestions for 7 days':'Reviewed · hide from daily suggestions for 7 days',()=>{markMemoryReviewed(d.id);mark.textContent='Hidden from daily suggestions for 7 days';},'focus-button focus-button-secondary');el.append(mark);}
 el.append(h('p','focus-muted focus-legal','Old successful flips are research leads, not current buy signals. Only fresh quotes and recent executions can support a larger order.'));el.append(button('Review active orders',()=>{ui.growthDetail=null;goto('orders');},'focus-button focus-button-secondary'));
 el.append(button('Inspect market evidence',()=>showResearch('execution52-panel'),'focus-button focus-button-secondary'));
}
function initTrades(){const box=$('focus-trades');box.innerHTML=`<div id="focus-trade-list-view"><div class="focus-page-intro"><strong>Your best trades right now</strong><span class="focus-muted">Standing positions and evidence-backed orders; unfamiliar markets in Alternatives and Bulk.</span></div><div id="focus-growth-context" class="focus-growth-context"></div><section id="focus-trade-forecasts" class="focus-trade-forecasts" aria-label="Portfolio profit scenarios"></section><div class="focus-capital-modes" role="group" aria-label="Capital funding scenarios"><button data-capital-mode="wallet" type="button">Wallet now</button><button data-capital-mode="selective" type="button">Review overexposure</button><button data-capital-mode="all" type="button">If all buys cancelled</button></div><p id="focus-mode-caution" class="focus-muted focus-mode-caution"></p><div id="focus-cancel-reviews" class="focus-cancel-reviews" hidden></div><div class="focus-segments focus-trade-segments" role="group" aria-label="Trade type"><button data-trade-filter="best">Best</button><button data-trade-filter="bulk">Bulk 5+</button><button data-trade-filter="new">New markets</button><button data-trade-filter="craft">Craft & stock</button><button data-trade-filter="memory">My history</button></div><div class="focus-toolbar"><label class="focus-search-label"><span class="focus-visually-hidden">Search trades</span><input type="search" id="focus-trade-search" placeholder="Search items…" autocomplete="off"></label><button class="focus-button focus-button-primary" id="focus-build-trades">Refresh market checks</button></div><div id="focus-lot-controls" class="focus-lot-controls" role="group" aria-label="Minimum number of units per candidate"><span>Minimum proposed order</span><div class="focus-lot-buttons"><button type="button" data-bulk-lot="5">5+</button><button type="button" data-bulk-lot="10">10+</button><button type="button" data-bulk-lot="20">20+</button><button type="button" data-bulk-lot="50">50+</button></div></div><p id="focus-trade-research-progress" class="focus-muted focus-deep-progress" role="status" aria-live="polite"></p><div class="focus-deep-actions"><button id="focus-trade-stop-deep" type="button" class="focus-button focus-button-secondary" hidden>Stop extended research</button><button id="focus-trade-retry-deep" type="button" class="focus-button focus-button-secondary" hidden>Resume wider discovery</button></div><details id="focus-family-diagnostics" class="focus-family-diagnostics"><summary>Market-wide discovery coverage</summary><div id="focus-family-diagnostics-content"></div></details><p id="focus-trade-state" class="focus-muted focus-status"></p><div id="focus-trade-rows" class="focus-trade-rows"></div><button id="focus-more-trades" class="focus-button focus-button-secondary" hidden>View more opportunities</button></div><div id="focus-trade-detail" hidden class="focus-detail-panel"></div>`;
 $('focus-trade-search').value=ui.tradeSearch;$('focus-trade-search').addEventListener('input',ev=>{ui.tradeSearch=ev.target.value;ui.tradeAll=false;ui.memoryLimit=14;ui.tradeY=0;save();renderTrades();});
 for(const b of box.querySelectorAll('[data-capital-mode]'))b.addEventListener('click',()=>{ui.capitalMode=b.dataset.capitalMode;ui.tradeDetail=null;ui.tradeAll=false;save();renderTrades();});
 for(const b of box.querySelectorAll('[data-trade-filter]'))b.addEventListener('click',()=>{ui.tradeFilter=b.dataset.tradeFilter;ui.tradeAll=false;ui.memoryLimit=14;save();renderTrades();});
 $('focus-trade-stop-deep').addEventListener('click',()=>{const st=State();if(st)root.GPOpportunity?.stopExpanded?.(st);schedule();});
 $('focus-trade-retry-deep').addEventListener('click',()=>{const st=State();if(st)root.GPOpportunity?.resumeExpanded?.(st);schedule();});
 $('focus-build-trades').addEventListener('click',async()=>{const s=State();if(!s?.db)return;const b=$('focus-build-trades');b.disabled=true;labelText('focus-trade-state','Screening your entire saved trading history and refreshing current markets…');try{await root.GoldenPeanutClean.buildAllocation();}catch{labelText('focus-trade-state','Could not refresh opportunities. Your existing data was preserved.');}finally{b.disabled=false;schedule();}});
 $('focus-more-trades').addEventListener('click',()=>{if(ui.tradeFilter==='memory'){showMoreRemembered();return;}ui.tradeAll=!ui.tradeAll;save();renderTrades();});
 for(const b of box.querySelectorAll('[data-bulk-lot]'))b.addEventListener('click',()=>{ui.bulkLot=Number(b.dataset.bulkLot);ui.tradeAll=false;save();renderTrades();});
}
function tradeData(which='selected'){const s=State(),base=s?.opportunityPlan,mode=which==='wallet'?'wallet':ui.capitalMode;
 const p=mode==='wallet'?base:mode==='selective'?base?.capitalReview?.selective:base?.capitalReview?.allReleased;
 const valid=!!p&&p.ok===true&&Number(p.at)>0&&Date.now()-p.at<=15*60*1000&&Date.now()-Date.parse(s?.snapshot?.walletAt)<=15*60*1000&&
   (p.orders||[]).every(o=>root.GPExecution?.validateRecommendation(o)&&Date.now()-Date.parse(o.asOf)<=15*60*1000)&&
   (p.orders||[]).reduce((n,o)=>n+o.cost,0)<=p.budget&&
   (p.source==='wallet'||p.source==='hypothetical');return {p,valid,orders:p?.orders||[],watch:p?.watch||[],mode};} 
function renderCapitalModes(){
 const s=State(),base=s?.opportunityPlan,comp=base?.capitalReview;
 for(const b of document.querySelectorAll('[data-capital-mode]')){
  const selected=b.dataset.capitalMode===ui.capitalMode;b.classList.toggle('is-active',selected);b.setAttribute('aria-pressed',String(selected));
  if(b.dataset.capitalMode==='selective')b.textContent='Review overexposure'+(comp?.releasedSelective>0?' · '+cash(comp.releasedSelective):'');
  if(b.dataset.capitalMode==='all')b.textContent='If all buys cancelled'+(comp?.committed>0?' · '+cash(comp.committed):'');
 }
 const note=$('focus-mode-caution'),reviews=$('focus-cancel-reviews');if(!note||!reviews)return;
 reviews.hidden=true;reviews.replaceChildren();
 if(ui.capitalMode==='wallet')note.textContent='Only verified wallet gold is spendable; current standing orders stay intact.';
 else if(ui.capitalMode==='selective'){
  note.textContent='WHAT-IF ONLY · Assumes you cancel the specific review-flagged buy orders. Those coins are NOT spendable until the wallet refresh confirms release. Losing queue priority can hurt fills.';
  if(comp?.reviews?.some(r=>r.review)){reviews.hidden=false;reviews.append(h('strong','', 'Existing buy orders to review, not automatically cancel'));
   for(const r of comp.reviews.filter(r=>r.review).slice(0,8)){
    const line=h('div','focus-cancel-review');line.append(h('strong','',r.name+' · '+cash(r.gold)+' committed'),
      h('small','',r.units+' units across '+r.orders.length+' orders · '+(r.flags[0]||'Review with fresh prices')));reviews.append(line);
   }
  }else{reviews.hidden=false;reviews.append(h('p','focus-muted','No specific buys passed the review flags. That does not prove your other orders are optimal.'))}
 }else note.textContent='WHAT-IF ONLY · Assuming every standing buy order is cancelled. This does NOT mean cancelling them is profitable or recommended. Queue position and potential fills would be lost.';
}
function sortTrades(rows){return [...rows].sort((a,b)=>Number(b.overnightProfit||b.nightProfit||0)-Number(a.overnightProfit||a.nightProfit||0)||Number(b.rankValue||0)-Number(a.rankValue||0)||a.id-b.id);}
function renderTradeForecasts(t){
 const host=$('focus-trade-forecasts');if(!host)return;host.replaceChildren();host.hidden=!t.valid;if(!t.valid)return;
 const p=t.p,expected=p.expectedProfit;
 host.append(h('strong','',t.mode==='wallet'?'Your next 24 hours · funded purchases':'Capital redeployment · hypothetical only'));
 const grid=h('div','focus-forecast-grid');
 for(const [label,value] of [['Expected net profit',expected],['Purchase + listing fee reserve',p.spent],['Wallet remaining',p.unallocated]]){
  const cell=h('div','focus-forecast-metric');cell.append(h('small','',label),h('strong','',value===null?'Not estimated':cash(value||0)));grid.append(cell);
 }
 host.append(grid,h('p','focus-muted','Estimated from comparable observed purchase-and-resale windows, including zero fills. Existing stock, open orders and unverified research are excluded from this new-purchase total. No proceeds are counted twice.'));
 if(expected===null)host.append(h('p','focus-muted','Research — insufficient execution evidence. Public spread and outstanding quantities alone cannot establish achievable profit.'));
}
function renderFamilyDiagnostics(){
 const host=$('focus-family-diagnostics-content'),wrap=$('focus-family-diagnostics');if(!host||!wrap)return;
 const s=State(),audit=s?.opportunityPlan?.equipmentAudit;host.replaceChildren();
 if(!audit){host.append(h('p','focus-muted','Refresh market checks to inspect which locally known equipment variants were searched and why some were excluded.'));return;}
 for(const [name,record] of Object.entries(audit.groups||{})){
  const line=h('div','focus-family-status');line.append(h('strong','',name),
    h('span','focus-muted','Known '+num(record.known)+' · scanned '+num(record.requested)+' · quoted '+num(record.quoted)+' · candidates '+num(record.eligible)+' · 5+ units '+num(record.bulk5)));
  const reasons=Object.entries(record.reasonCounts||{}).filter(([reason])=>reason!=='eligible').sort((a,b)=>b[1]-a[1]).slice(0,3);
  if(reasons.length)line.append(h('small','focus-muted','Excluded / not checked: '+reasons.map(([reason,n])=>num(n)+' '+reason.replaceAll('-',' ')).join(' · ')));
  host.append(line);
 }
 const external=s?.opportunityPlan?.publicCatalogue||s?.externalMarketStatus;
 if(external?.items)host.prepend(h('p','focus-muted','Independent catalogue: '+num(external.items)+' tradeable item names · '+num(external.indexed||0)+' new names this check · '+(external.source||'source unknown')+'. Public prices are daily snapshots, NOT live execution evidence.'));
 const daily=s?.opportunityPlan?.marketHistoryStatus;
 if(daily?.historyMarkets)host.append(h('p','focus-muted','Price trend data: '+num(daily.historyMarkets)+' markets with dated public quotes. No public completed-sales volume is inferred.'));
 const broad=s?.opportunityPlan?.publicDiscovery,scan=s?.opportunityPlan?.fullMarketScan;
 if(broad){host.prepend(h('p','focus-muted',(s?.opportunityPlan?.candidateRefresh?.phase==='quick'?'INITIAL account-backed check; wider scan running separately':scan?.complete?'Complete stored public quote snapshot':'INCOMPLETE scan / cached public quotes')+' · '+num(broad.knownQuoteItems)+' stored tradable quotes inspected · '+num(broad.freshQuotes)+' fresh · '+num(broad.broadMarginCandidates)+' passed broad margin screening · '+num(broad.shortlisted)+' sampled across price and depth bands · '+num(broad.research)+' new research markets · catalogue names newly indexed '+num(s?.opportunityPlan?.candidateRefresh?.catalogue?.indexed||0)+'. These counts are NOT trading volume.'+(scan?.reason?' Scan issue: '+scan.reason:'')));}
 host.append(h('p','focus-muted','Wider discovery can inspect the public tradable quote universe after the initial results load. Research lots without your past buy/sell evidence have hypothetical margins only — no estimated weekly fills. Coverage is grouped by official item category, rarity and subtype.'));
 const craft=s.opportunityPlan?.craftResearch; if(craft){const st=craft.status||{};host.append(h('p','focus-muted','Crafting index: '+num(st.recipesIndexed||0)+' public recipes · '+num(st.recipeEquipmentOutputs||0)+' craftable outputs · '+num(st.selectedOutputQuotes||0)+' outputs rechecked · '+num(craft.rows?.length||0)+' priced profitable craft routes. '+(st.recipeIndexComplete?'Recipe catalogue indexed.':'Recipe catalogue INCOMPLETE; refresh to continue.')+(st.ingredientCoverageComplete?'':' Ingredient scan capped; results incomplete.')+(st.recipeError?' Error: '+st.recipeError:'')));}
}
function appendCatalogueMatches(host,q,shownIds=new Set()){
 if(!q||q.length<3)return 0;
 const matches=[];const meta=State()?.meta||{};
 for(const [idText,x]of Object.entries(meta)){
  
  const id=Number(idText),name=x?.name;
  if(!Number.isSafeInteger(id)||id<1||typeof name!=='string'||!(name+' '+id).toLowerCase().includes(q)||shownIds.has(id))continue;
  matches.push({id,name,family:'Public tradable catalogue · current price and profit unverified'});
 }
 if(!matches.length)return 0;
 host.append(h('div','focus-list-heading','CATALOGUE MATCHES · NOT YET MARKET-RANKED'));
 host.append(h('p','focus-muted','These items exist in the tradable catalogue but were not in this evaluated list. Open one and check its current Trading Post quote; no fill or profit forecast is claimed.'));
 for(const x of matches.slice(0,ui.catalogueLimit||24))host.append(relatedRow(x));
 if(matches.length>(ui.catalogueLimit||24))host.append(button('Show more catalogue matches ('+matches.length+' total)',()=>{ui.catalogueLimit=(ui.catalogueLimit||24)+50;renderTrades();},'focus-button focus-button-secondary'));
 return matches.length;
}
function renderTrades(){const s=State();if(!s||!$('focus-trade-rows'))return;const historyPosition=captureHistoryPosition();renderCapitalModes();
 const t=tradeData(),newMode=ui.tradeFilter==='new'||ui.tradeFilter==='craft',craftMode=ui.tradeFilter==='craft',q=ui.tradeSearch.toLowerCase().trim();
 for(const b of document.querySelectorAll('[data-trade-filter]')){const chosen=b.dataset.tradeFilter===ui.tradeFilter;b.classList.toggle('is-active',chosen);b.setAttribute('aria-pressed',String(chosen));if(b.dataset.tradeFilter==='bulk')b.textContent='Bulk '+ui.bulkLot+'+';}
 const lotControls=$('focus-lot-controls');if(lotControls)lotControls.hidden=ui.tradeFilter!=='bulk'&&ui.tradeFilter!=='craft';
 for(const b of document.querySelectorAll('[data-bulk-lot]')){const selected=Number(b.dataset.bulkLot)===ui.bulkLot;b.classList.toggle('is-active',selected);b.setAttribute('aria-pressed',String(selected));}
 $('focus-trade-search').value=ui.tradeSearch;
 if(ui.growthDetail){renderGrowthDetail();return;}if(ui.relatedDetail){renderRelatedDetail();return;}if(ui.tradeDetail){renderTradeDetail();return;}
 $('focus-trade-list-view').hidden=false;$('focus-trade-detail').hidden=true;renderGrowthContext();renderTradeForecasts(t);renderFamilyDiagnostics();
 const deepProgress=$('focus-trade-research-progress');if(deepProgress){
  deepProgress.textContent=s.opportunityDeepBusy?(s.opportunityDeepStatus||'Extended scan is working · current results are usable'):
   (s.opportunityDeepStatus||'Wider discovery will update this shortlist separately.');
  const stop=$('focus-trade-stop-deep'),resume=$('focus-trade-retry-deep');
  if(stop)stop.hidden=!s.opportunityDeepBusy;
  if(resume)resume.hidden=s.opportunityDeepBusy||(!s.opportunityDeepPaused&&!/incomplete|failed|stopped/i.test(s.opportunityDeepStatus||''));
 }
 const host=$('focus-trade-rows');host.replaceChildren();const more=$('focus-more-trades');more.hidden=true;
 if(root.GPOpportunity?.buildId!==EXPECTED_MARKET_BUILD){
  labelText('focus-trade-state','Code version mismatch: market engine and display are out of sync.');
  host.append(h('p','focus-alert','SAFETY STOP: Market code is out of date or mixed across deployments. No new order suggestions will be displayed. Please fully reload the latest deployment.'));
  return;
 }
 
 const appendTitle=title=>host.append(h('div','focus-list-heading',title));
 if(ui.tradeFilter==='best'){
  const book=root.GPOpportunity?.rankedMarkets?.(t.p),unfiltered=t.valid?(book?.rows||[]):[];
  const ranked=q?unfiltered.filter(x=>(itemName(x.id)+' '+x.id).toLowerCase().includes(q)):unfiltered;
  labelText('focus-trade-state',t.valid?num(ranked.length)+' calibrated orders, plus history-backed current markets and public discovery below':
   (s.opportunityBusy?'Analysing saved markets and prices…':s.opportunityStatus||'Current market quotes need checking.'));
  if(!t.valid){host.append(h('p','focus-empty','Fresh account data is needed for funded recommendations. Catalogue search remains available.'));appendCatalogueMatches(host,q);return;}
  if(!ranked.length){host.append(h('p','focus-muted','No calibrated exact-lot 24-hour forecasts yet. The active market research below remains available; conditional margins are not expected income.'));}
  const connected=renderConnectedMarkets(host,s,{query:q,limit:ui.tradeAll?70:12});
  if(!ranked.length&&connected.count===0&&!q)renderVerifiedRecentMarkets(host,s,{limit:12});
  for(const o of (ui.tradeAll?ranked.slice(0,80):ranked.slice(0,12))){
   const row=h('button','focus-market-row');row.type='button';row.append(artwork(o.id));const center=h('span','focus-market-title');center.append(h('strong','',itemName(o.id)));
   const desc=o.kind==='standing'?'ALREADY ON ORDER · '+num(o.openUnits)+' open · '+num(o.quantity)+' scenario units':
    o.kind==='potential'?'CONSERVATIVE 24H TRIAL · '+num(o.quantity)+' × '+cash(o.bid)+' · needs capital / active-order check':
    o.kind==='hypothetical'||t.p?.source==='hypothetical'?'WHAT-IF ONLY · '+num(o.quantity)+' × '+cash(o.bid)+' · NOT funded':
    'HISTORY-BOUNDED BUY · '+num(o.quantity)+' × '+cash(o.bid)+' · '+cash(o.cost);
   center.append(h('small','',desc));row.append(center);
   const side=h('span','focus-market-values');const value=h('strong','');value.append(money(o.overnightProfit||0));
   side.append(value,h('small','',Number(o.expectedSold||0).toFixed(1)+' expected sold · uncertain 24h estimate'));row.append(side,h('span','focus-chevron','›'));
   row.addEventListener('click',()=>{ui.tradeY=window.scrollY;ui.tradeDetail=null;ui.growthDetail=null;ui.relatedDetail=null;
    if(o.kind==='standing')ui.growthDetail=o.id;else{ui.tradeDetail=o.id;ui.selectedMarket=o;}
    pushHistory();if(o.kind==='standing')renderGrowthDetail();else renderTradeDetail();window.scrollTo({top:0,behavior:'instant'});
   });host.append(row);
  }
  appendCatalogueMatches(host,q,new Set(ranked.map(x=>x.id)));
  more.hidden=ranked.length<=12&&connected.board?.counts?.history<=12&&connected.board?.counts?.newMarkets<=12;more.textContent=ui.tradeAll?'Show fewer markets':'Show more current markets';return;
 }
 if(ui.tradeFilter==='memory'){
  const archive=root.GPGrowth?.allHistory(s.ledger||[],Date.now()),all=archive?.markets||[];
  // Load missing names for EVERY preserved market when History is deliberately
  // opened. Otherwise forgotten old trades remain searchable only by ID.
  const unresolved=all.filter(x=>!s.meta?.[x.id]?.name).map(x=>x.id);
  const nameLoadKey=String(s.account||'')+':'+String(archive?.savedRows||0)+':'+String(archive?.newest||0);
  if(memoryNameLoadKey!==nameLoadKey){memoryNameLoadKey=nameLoadKey;queueMeta(unresolved);}
  const selected=all.filter(x=>!q||(itemName(x.id)+' '+x.id).toLowerCase().includes(q));
  memoryPageItems=selected;
  const count=selected.length;const visible=selected.slice(0,ui.memoryLimit);
  labelText('focus-trade-state',num(count)+' markets from '+num(archive?.savedRows||0)+' saved completed trade records · '+num(archive?.provenCount||0)+' positive with matched costs.'+(unresolved.length?' Recovering '+num(unresolved.length)+' old item names…':'')+' Only preserved history can be recalled.');
  if(!all.length){host.append(h('p','focus-empty','No saved completed-trade history yet. Connect your account or import an old backup in Research & settings.'));return;}
  const coverage=h('p','focus-memory-overview');coverage.textContent='Your saved history: '+(archive.oldest?new Date(archive.oldest).toLocaleDateString('en-GB'):'unknown')+' to '+(archive.newest?new Date(archive.newest).toLocaleDateString('en-GB'):'unknown')+'. '+num(archive.dormantWinners)+' profitable markets are now dormant. Older transactions cannot be reconstructed if they were never saved.';host.append(coverage);
  if(visible.length){appendTitle(q?'Saved-market search results':'All saved markets · ranked by matched historical net');
   const list=h('div','focus-memory-list');list.id='focus-memory-list';for(const m of visible)list.append(memoryRow(m));host.append(list);}
  else host.append(h('p','focus-empty','No saved market matches this search. Search an item name or GW2 item ID.'));
  more.hidden=count<=ui.memoryLimit;more.textContent='Show 30 more of '+num(count)+' remembered markets';
  if(!q){const related=root.GPGrowth?.relatedMarkets(archive,s.meta||{},4)||[];
   if(related.length){appendTitle('Similar items worth researching · no proven profit');for(const l of related)host.append(relatedRow(l));}
  }
  restoreHistoryPosition(historyPosition);
  return;
 }
 if(!t.p||!t.valid){labelText('focus-trade-state',t.p?'Market quotes have expired. Refresh before entering any new order.':'Market data is checking. The shortlist builds automatically.');host.append(h('p','focus-empty','New buy suggestions need current verified prices. A fresh account check will refresh them.'));return;}
 let rows=craftMode?root.GPOpportunity?.craftLots?.(s.opportunityPlan,{minLot:ui.bulkLot,limit:2500})||[]:
  newMode?root.GPOpportunity?.researchLots?.(s.opportunityPlan,{minLot:ui.bulkLot,limit:2500})||[]:
  sortTrades(t.orders.filter(x=>x.cost>0&&x.scenarioProfit>0));
 // Watching a public quote is useful, but is NEVER an order instruction.
 if(ui.tradeFilter==='new'){
  const proposed=new Set(rows.map(x=>x.id));
  const watch=root.GPOpportunity?.researchWatchLeads?.(s.opportunityPlan,{limit:40})||[];
  rows.push(...watch.filter(x=>!proposed.has(x.id)));
 }
 const lot=ui.bulkLot;
 let historicalBulk=0,researchBulk=0,historicalExperiments=0;
 if(ui.tradeFilter==='bulk'){
  const proven=t.valid?(root.GPOpportunity?.rankedMarkets?.(t.p,{minLot:lot,bulkOnly:true})?.rows||[]):[];
  const historicalTests=t.valid?(root.GPOpportunity?.historicalExperiments?.(t.p,{minLot:lot,limit:2500})||[]):[];
  const exploratory=t.valid?(root.GPOpportunity?.researchLots?.(s.opportunityPlan,{minLot:lot,limit:2500})||[]):[];
  const craft=root.GPOpportunity?.craftLots?.(s.opportunityPlan,{minLot:lot,limit:2500})||[];
  historicalBulk=proven.length;historicalExperiments=historicalTests.length;researchBulk=exploratory.length;
  rows=[...proven,...historicalTests,...exploratory,...craft];
  // A hypothetical one-round profit must not masquerade as an evidence-backed
  // weekly income estimate. Each row keeps its evidence label and funding.
  rows.sort((a,b)=>{
   const group=x=>['standing','funded','potential'].includes(x.kind)?0:x.kind==='capacity-research'?1:x.kind==='craft'?2:3;
   return group(a)-group(b)||Number(b.overnightProfit||b.nightProfit||0)-Number(a.overnightProfit||a.nightProfit||0)||Number(b.rankValue||0)-Number(a.rankValue||0);
  });
 }
 // Independent UI boundary: NEVER show unaffordable/public-only 'buy' probes.
 const researchPolicy=root.GPOpportunity.researchPolicy(s.opportunityPlan,{minLot:lot});
 rows=rows.filter(x=>x.kind!=='research'||root.GPOpportunity.validateResearchCandidate(x,researchPolicy));
 if(q)rows=rows.filter(x=>(itemName(x.id)+' '+x.id).toLowerCase().includes(q));
 labelText('focus-trade-state',craftMode?
  num(rows.length)+' recipe-backed crafting ideas · '+num(lot)+'+ outputs · ingredient asks and finished-item resale are unverified execution scenarios':newMode?
  num(rows.length)+' bounded, unproven research candidates · NO predicted fills or profit · no exposure to existing orders':
  ui.tradeFilter==='bulk'?num(historicalBulk)+' 24h history-bounded '+lot+'+ lots · '+num(historicalExperiments)+' larger history-based EXPERIMENTS · '+num(researchBulk)+' new public-market tests · none of the experiments are funded':
  rows.length+' potential new orders · fundability and existing orders shown');
 if(newMode&&ui.tradeFilter==='new')host.append(h('p','focus-muted',
  'Experimental discovery, NOT proven income. Each candidate fits the current spendable wallet and a per-market risk cap, but several suggestions compete for the SAME money. The spread is not a sales forecast. Record real buy fills and actual resales before scaling.'));
 if(!rows.length){
  if(ui.tradeFilter==='bulk'){
   const pool=root.GPOpportunity?.rankedMarkets?.(t.p)?.rows||[];
   const maximum=pool.reduce((n,x)=>Math.max(n,Number(x.maxSupportedQty)||0),0);
   host.append(h('p','focus-empty','No '+lot+'+ unit candidate meets the current checks. Nothing smaller is listed as a qualifying order.'+(maximum>0?' Largest evaluated research cap: '+num(maximum)+' units (not a promised fill).':'')));
  }else host.append(h('p','focus-empty','No eligible order recommendation matches. Catalogue matches below may still be worth inspecting.'));
  appendCatalogueMatches(host,q);return;
 }
const visible=ui.tradeAll?rows.slice(0,80):rows.slice(0,12);
 let researchStarted=false;
 for(const x of visible){if((x.kind==='research'||x.kind==='craft'||x.kind==='capacity-research'||x.kind==='lead')&&!researchStarted){
   researchStarted=true;host.append(h('div','focus-list-heading',x.kind==='craft'?'CRAFT & STOCK · buy ingredients, craft, then sell · hypothetical, recipe access unverified':x.kind==='capacity-research'?'LARGER-LOT EXPERIMENTS · NOT evidence-backed overnight quantities':(x.kind==='lead'?'QUOTE WATCHLIST · no suggested orders or estimated earnings':'UNPROVEN MARKETS · small wallet-bounded pilots only, NO forecast')));
  }else if(!researchStarted&&x===visible[0]&&ui.tradeFilter==='bulk')host.append(h('div','focus-list-heading','HISTORY-BACKED BULK · completed personal buys and resales'));
  host.append(tradeRow(x,newMode||x.kind==='research'||x.kind==='craft'||x.kind==='capacity-research'));
 }
 appendCatalogueMatches(host,q,new Set(rows.map(x=>x.id)));
 more.hidden=rows.length<=12;more.textContent=ui.tradeAll?'Show top 12':'View all '+num(Math.min(80,rows.length))+' opportunities';
}
function tradeRow(o,newMode=false){const row=h('button','focus-market-row');row.type='button';row.dataset.tradeId=o.id;row.append(artwork(o.id));const center=h('span','focus-market-title');center.append(h('strong','',itemName(o.id)));
 center.append(h('small','',o.kind==='lead'?'WATCH ONLY · current spread '+cash(o.buy)+' bid → '+cash(o.exit)+' exit · no fills predicted':o.kind==='craft'?'CRAFT '+num(o.quantity)+' · materials '+cash(o.cost)+' · access & sell-through unverified':o.kind==='capacity-research'?'UNVERIFIED BIGGER TEST · '+num(o.quantity)+' units · normal 24h trial '+num(o.supportedOrderQty||0)+' · observed buy/resale pace '+num(o.observed24Reference||0)+' per active day · not funded':o.kind==='research'?'UNPROVEN PILOT · '+num(o.quantity)+' units × '+cash(o.buy)+' · '+cash(o.cost)+' max exposure · NO expected profit'+(o.observedOrderFills24h?' · '+num(o.observedOrderFills24h)+' observed buy fills in 24h':'')+(o.craftableSupply?' · craftable':''):newMode?'Not funded in this plan · inspect evidence':o.kind==='standing'?'On order · '+num(o.openUnits)+' units':o.kind==='potential'?'CONSERVATIVE 24H TRIAL · '+num(o.quantity)+' units · observed lower-quartile day '+num(o.observed24Reference||0)+' · not funded':o.kind==='hypothetical'||tradeData().p?.source==='hypothetical'?'WHAT-IF '+num(o.quantity)+' units · not spendable':'Buy '+num(o.quantity)+' unit'+(o.quantity===1?'':'s')+' · wallet plan'));row.append(center);
 const side=h('span','focus-market-values');if(o.kind==='research'||o.kind==='craft'||o.kind==='capacity-research'){
  const value=h('strong','');
  if(o.kind==='research')value.textContent='RESEARCH · not forecast';
  else value.append(money(o.scenarioProfit));
  side.append(value,h('small','',o.kind==='research'?'Cost '+cash(o.cost)+' · unproven fill / resale':o.kind==='craft'?'one round IF crafted & sold · '+cash(o.cost)+' materials':'UNVERIFIED size · one round IF bought & resold'));
 }else if(newMode){side.append(h('strong','',o.confidence||'Research alternative'),h('small','',o.buy?cash(o.buy)+' bid reference':'Inspect quotes'));}else{const value=h('strong','');value.append(money(o.overnightProfit||o.nightProfit||0));side.append(value,h('small','',num(o.overnightUnits||o.nightUnits||0)+(o.overnightModel==='observed-lower-quartile-including-zero-nights'?' units · observed 24h lower quartile':' units / 24h conditional')+' · '+(o.kind==='potential'?'not funded':cash(o.cost)+' to commit')));}row.append(side);const expand=h('span','focus-chevron','›');expand.setAttribute('aria-hidden','true');row.append(expand);
 row.setAttribute('aria-label',itemName(o.id)+'. '+(newMode?'Research candidate':'Buy '+o.quantity+'; capital '+cash(o.cost)+'; potential profit '+cash(o.scenarioProfit))+'. View details');
 row.addEventListener('click',()=>{ui.tradeY=window.scrollY;ui.growthDetail=null;ui.tradeDetail=o.id;ui.selectedMarket=o;pushHistory();renderTradeDetail();window.scrollTo({top:0,behavior:'instant'});});return row;}
/* Market potential is research, not permission to spend uncollected or
 * already-committed coins. User chooses quantity; the wallet never caps the
 * research model. Exact fills, active-day history and analogues stay distinct. */
function renderCapacityExplorer(el,item){
 const state=State(),capacity=root.GPCapacity;
 const cloud=root.GPCloudAccount;
 if(cloud?.status?.(state?.account)?.enabled&&state?.key&&!cloud.peekNights?.(state.account,item.id)){
  void cloud.fetchNights(state,item.id).then(()=>{
   if(ui.tradeDetail===item.id)root.GPFocus?.render?.();
  }).catch(()=>{});
 }
 const buy=Number(item.buy||item.bid||0),exit=Number(item.exit||item.ask||0);
 if(!capacity||!state||!Number.isSafeInteger(buy)||!Number.isSafeInteger(exit)||buy<=0||exit<=buy)return;
 const section=h('section','focus-info-box focus-capacity-explorer');
 section.append(h('h4','','HOW MUCH COULD FILL & RESELL?'),
  h('p','focus-muted','Choose your own test quantity, regardless of your wallet. The scenarios show historic trading pace on ACTIVE days or comparable markets, not guaranteed fills or market-wide sales.'));
 const controls=h('div','focus-capacity-controls'),label=h('label','','Hypothetical buy order size');
 const picker=h('select','focus-capacity-select');picker.setAttribute('aria-label','Hypothetical order size');
 for(const q of [1,3,5,10,20,50,100,250]){const opt=h('option','',num(q)+' units');opt.value=String(q);picker.append(opt);}
 const initial=Number(ui.capacitySelections?.[item.id]||ui.marketResearchLot||item.quantity)||10;picker.value=String([1,3,5,10,20,50,100,250].includes(initial)?initial:10);
 label.append(picker);controls.append(label);
 section.append(controls);
 const metrics=h('div','focus-capacity-grid');const note=h('p','focus-muted focus-capacity-limitation');
 section.append(metrics,note);
 const render=()=>{
  metrics.replaceChildren();
  const qty=Number(picker.value);
  const cloudNights=cloud?.peekNights?.(state.account,item.id);
  const savedBuy=root.GPOpportunity?.nightlyExposure?.(state.orderEvidence,item.id,Date.now());
  const savedSell=root.GPOpportunity?.nightlyExposure?.(state.sellOrderEvidence,item.id,Date.now());
  const buyEvidence=cloudNights?.buys?.length>=5?
   {supported:true,samples:cloudNights.buys.map(x=>({filled:x.filled})),source:'verified-cloud-nights'}:savedBuy;
  const sellEvidence=cloudNights?.sells?.length>=5?
   {supported:true,samples:cloudNights.sells.map(x=>({filled:x.filled})),source:'verified-cloud-nights'}:savedSell;
  let estimate;
  try{estimate=capacity.estimate({market:{...item,name:itemName(item.id),buy,exit},
   ledger:state.ledger||[],metadata:state.meta||{},quantity:qty,buyNights:buyEvidence,sellNights:sellEvidence});}
  catch(e){note.textContent='Research calculation unavailable: '+String(e?.message||e);return;}
  const summary=h('div','focus-capacity-overview');
  const reserve=h('div');reserve.append(h('span','focus-muted','Gold required IF order placed'),h('strong','',cash(buy*qty)));summary.append(reserve);
  const ceiling=h('div');ceiling.append(h('span','focus-muted','NET result IF every unit buys and resells'),h('strong','',cash(estimate.oneRound||0)));summary.append(ceiling);
  metrics.append(summary);
  if(estimate.status==='insufficient'||estimate.status==='invalid'){
   metrics.append(h('p','focus-alert',estimate.reason||'Not enough evidence to estimate this order.'));
   note.textContent='You can still inspect the bid, ask and margin, but the model has no defensible quantity or resale-time reference for this market.';
   return;
  }
  if(estimate.source==='comparable-markets'){
   metrics.append(h('p','focus-capacity-peer-warning','PEER-GROUP BENCHMARK ONLY — this item has NO measured buy or resale rate. The figures below describe a shared group of similar priced items, NOT an estimate of how many of this particular item will fill.'));
  }else if(estimate.source==='own-market-active-days'){
   metrics.append(h('p','focus-capacity-peer-warning','YOUR ITEM’S COMPLETED TRADES — measured on active trading days only. Inactive or zero-fill days may be absent.'));
  }
  const table=h('div','focus-capacity-scenarios');
  const head=h('div','focus-capacity-line focus-capacity-heading');
  for(const x of ['Period','Acquired','Resold','Net IF resold'])head.append(h('strong','',x));table.append(head);
  for(const sc of estimate.scenarios){
   const row=h('div','focus-capacity-line');row.dataset.horizon=String(sc.days);
   row.append(h('span','',sc.days===1?'24 hours':sc.days===3?'3 days':'7 days'),
    h('span','',num(sc.acquiredTypical)+'–'+num(sc.acquiredHigh)),
    h('span','',sc.resaleTypical===null?'Unknown':num(sc.resaleTypical)+'–'+num(sc.resaleHigh)),
    h('span','',sc.profitTypical===null?'Unknown':cash(sc.profitTypical)+' – '+cash(sc.profitHigh)));
   table.append(row);
  }
  metrics.append(table);
  metrics.append(h('p','focus-capacity-evidence',estimate.readiness+(estimate.source==='comparable-markets'?' · SAME REFERENCE may apply to multiple items':'')));
  if(cloudNights?.supported)metrics.append(h('p','focus-muted',
   'Verified off-phone monitoring supplied '+num(cloudNights.buys.length)+' buy and '+num(cloudNights.sells.length)+
   ' resale zero-inclusive overnight samples. Not market-wide turnover.'));
  metrics.append(h('p','focus-muted','Evidence: '+estimate.label+'. '+num(estimate.comparableMarkets)+' item(s), '+num(estimate.buyActiveDays)+' observed buying day(s), '+num(estimate.sellActiveDays)+' observed selling day(s).'));
  if(estimate.medianResaleLagDays!==null){
   metrics.append(h('p','focus-muted','Historical FIFO purchase-to-resale gap: median '+(estimate.medianResaleLagDays*24).toFixed(1)+' hours. This is NOT how long a newly submitted listing is guaranteed to wait.'));
  }
  if(estimate.activeDaysToComplete!==null)
   metrics.append(h('p','focus-muted','For the full lot: about '+num(estimate.activeDaysToComplete)+' COMPARABLE ACTIVE trading day(s) at historical median pace, not a calendar-time promise.'));
  note.textContent='Ranges are conditional planning references. Zero fills is always possible. Upper figures are observed higher active-day paces, not a maximum or a forecast. Only placed orders and later verified transactions can calibrate this specific market.';
 };
 picker.addEventListener('change',()=>{ui.capacitySelections[item.id]=Number(picker.value);render();});
 render();el.append(section);
}
function renderTradeDetail(){if(!ui.tradeDetail)return;const t=tradeData(),selected=ui.selectedMarket?.id===ui.tradeDetail?ui.selectedMarket:null,
 item=selected||[...t.orders,...(t.p?.marketChoices||[]),...t.watch].find(x=>x.id===ui.tradeDetail);if(!item){ui.tradeDetail=null;renderTrades();return;}
 const funded=selected?selected.kind==='funded':t.orders.some(o=>o.id===item.id),newMode=!funded,el=$('focus-trade-detail');$('focus-trade-list-view').hidden=true;el.hidden=false;el.replaceChildren();el.append(button('← Back to opportunities',()=>backToList('trades'),'focus-back'));
 const head=h('div','focus-detail-title');head.append(artwork(item.id,true));const title=h('div');title.append(h('h3','',selected?.restoredView&&selected.name?selected.name:itemName(item.id)),h('p','focus-muted',newMode?'Market research · not a funded buy order':'Suggested manual buy order · not placed'));head.append(title);el.append(head);
 if(!t.valid)el.append(h('p','focus-alert','These quotes have expired. Refresh before trading.'));
 if(selected?.restoredView)el.append(h('p','focus-alert','Restored this market after the phone reloaded. The saved bid and resale reference may be outdated — refresh current prices before making a trading decision.'));
 const metrics=h('div','focus-detail-grid');const addMetric=(label,v)=>{const x=h('div','focus-detail-metric');x.append(h('span','focus-muted',label),h('strong','',v));metrics.append(x);};
 if(newMode){if(item.kind!=='craft')addMetric('Bid reference',cash(item.buy||0));addMetric('Plausible resale reference',cash(item.exit||item.ask||0));
  if(item.quantity)addMetric('Illustrative order quantity',num(item.quantity));
  if(item.cost)addMetric('Capital required · not necessarily available',cash(item.cost));
  if(item.craftableSupply){addMetric('Craftability evidence',num(item.craftableSupply.recipeCount)+' public recipe(s) · no evidence of overnight fills');if(item.craftableSupply.makerProfitAtCurrentBid!==null)addMetric('Crafter incentive IF fulfilling current TP buy bid',cash(item.craftableSupply.makerProfitAtCurrentBid));}
  if(item.kind==='capacity-research'){addMetric('Regular cautious order size',num(item.supportedOrderQty||0));addMetric('Unverified historical-week research ceiling',num(item.researchCap||0));addMetric('Observed lower-quartile completed buy AND resale units on an active day',num(item.observed24Reference||0));addMetric('One round IF all test buys and resales complete',cash(item.scenarioProfit||0));addMetric('7-day profit for this experiment','Not estimated — no tested fill rate for this size');}
  if(item.kind==='craft'){addMetric('Recipe ID',String(item.recipeId));addMetric('Crafting discipline',item.disciplines.join(', ')+' · rating '+item.minRating);addMetric('Production batches',num(Math.ceil(item.quantity/item.outputCount)));addMetric('Materials at quoted asks',cash(item.cost));addMetric('One round IF crafted and sold',cash(item.scenarioProfit));addMetric('Best current buy-offer reference',cash(item.bid||0));addMetric('Maker proceeds minus materials IF filling current buy offer',item.makerProfitAtCurrentBid===null?'Unknown':cash(item.makerProfitAtCurrentBid));}else if(item.kind==='research')addMetric('One round IF bought and resold',cash(item.scenarioProfit||0));
  if(item.weeklyScenario)addMetric('7d conditional trading scenario',cash(item.weeklyScenario));
  if(item.buy24Active!==undefined||item.earnableQty24!==undefined)addMetric('Conservative 24h order-size trial (NOT predicted fills)',num(item.buy24Active??item.earnableQty24??0));
  addMetric('Independent quote samples (90m apart)',num(item.observations||0));
  if(item.kind==='research'){
   const actual=root.GPOpportunity?.observedFillsByItem?.(State()?.orderEvidence,item.id,Date.now());
   const now=Date.now(),completed=(State()?.ledger||[]).filter(x=>x.item===item.id&&x.purchased>=now-24*60*60*1000&&x.purchased<=now);
   const completedBuys=completed.filter(x=>x.side==='buy').reduce((n,x)=>n+(x.q||0),0),
    completedSales=completed.filter(x=>x.side==='sell').reduce((n,x)=>n+(x.q||0),0);
   addMetric('Completed buys · last 24h (saved API history)',num(completedBuys)+' units');
   addMetric('Completed sales · last 24h (saved API history)',num(completedSales)+' units');
   addMetric('Recorded partial buy fills · last 24h',num(actual?.last24h||0)+' units observed between checks (may overlap completed buys; do not add)');
   addMetric('Recorded partial buy fills · all tracked checks',num(actual?.sinceTracking||0)+' units observed');
   const soldFills=root.GPOpportunity?.observedFillsByItem?.(State()?.sellOrderEvidence,item.id,Date.now());
   addMetric('Recorded partial SELL fills · last 24h',num(soldFills?.last24h||0)+' observed (may overlap completed sales; do not add)');
   const nightBuys=root.GPOpportunity?.nightlyExposure?.(State()?.orderEvidence,item.id,Date.now());
   const nightSells=root.GPOpportunity?.nightlyExposure?.(State()?.sellOrderEvidence,item.id,Date.now());
   addMetric('Fully observed buy-order nights (zero-fill nights)',num(nightBuys?.nights||0)+' nights · '+num(nightBuys?.zeroNights||0)+' zero fills');
   addMetric('Fully observed resale-order nights (zero-fill nights)',num(nightSells?.nights||0)+' nights · '+num(nightSells?.zeroNights||0)+' zero fills');
   addMetric('Evidence quality',nightBuys?.supported&&nightSells?.supported?'Observed lower-quartile buying and selling, including zero-fill nights':'Not enough fully observed nights for a measured overnight scenario');
   addMetric('How to calibrate this market','Place a sensible manual limit order and recheck after 12–24h. A disappearing order is not automatically counted as filled.');
   addMetric('Current standing buy units',num(item.buyQty||0));addMetric('Current standing sell units',num(item.sellQty||0));addMetric('Worldwide completed turnover','Not exposed by GW2 API');}}else{
  addMetric('Buy quantity',num(item.quantity));addMetric('Buy each',cash(item.buy));addMetric('Sell reference',cash(item.exit));
  addMetric('Purchase + listing fee reserve',cash(item.cost));addMetric('Expected net profit · 24h',cash(item.expectedProfit));
  addMetric('Expected acquired / resold',Number(item.expectedAcquired).toFixed(1)+' / '+Number(item.expectedSold).toFixed(1));
  addMetric('Capital still tied up at 24h',cash(item.expectedCapitalAt24));
  addMetric('Observed 10–90% profit range',item.historicalRange.map(cash).join(' to '));
  addMetric('Comparable windows / zero fills',num(item.sampleCount)+' / '+num(item.zeroFillWindows));
 }

 el.append(metrics);
 if(item.kind!=='craft')renderCapacityExplorer(el,item);
 if(item.kind==='craft'){
  const ingredients=h('div','focus-info-box');ingredients.append(h('strong','','Recipe ingredients · one crafting batch'));
  for(const i of item.ingredients){ingredients.append(h('p','focus-muted',num(i.count)+' × '+itemName(i.id)+' @ '+cash(i.ask)+' best ask · '+num(i.available)+' currently listed across prices'));}
  ingredients.append(h('p','focus-alert','Material prices are current best asks, NOT depth-priced costs for a large purchase. Skill unlocks, recipe ownership, available production time, taxes, and guaranteed sell-through are not verified. Higher quantities may cost more.'));
  el.append(ingredients);
 }
 if(!newMode){const story=h('details','focus-info-box');story.append(h('summary','','Evidence and uncertainty'),h('p','focus-muted',item.limitation||item.evidence),h('p','focus-muted','Only the exact observed order size is eligible. Both acquisition and resale must occur within the same 24-hour window. Censored periods block promotion. Queue changes, craftable supply, price moves and manual listing delays can make future outcomes differ. The observed range is not a calibrated confidence interval.'));el.append(story);
 const walletFunded=t.p?.source==='wallet';if(!walletFunded)el.append(h('p','focus-alert','WHAT-IF ONLY: '+(t.p?.releaseLabel||'Cancelled buy orders')+'. This amount is NOT spendable until you cancel the relevant orders in-game and recheck your actual wallet.'));
 const b=button('Copy manual buy instructions',async()=>{if(!tradeData().valid){b.textContent='Quotes expired · refresh first';b.disabled=true;return;}const val=`${itemName(item.id)} | BUY ${item.quantity} @ ${cash(item.buy)} each | cash ${cash(item.cost)} | quoted sell reference ${cash(item.exit)} | conditional after-fee profit ${cash(item.scenarioProfit)} | research only, not an order`;try{await navigator.clipboard.writeText(val);b.textContent='Copied to clipboard';}catch{b.textContent='Clipboard unavailable';}},'focus-button focus-button-primary');b.disabled=!t.valid||!walletFunded;if(!walletFunded)b.textContent='Switch to Wallet now and rebuild';el.append(b);}
 if(item.kind==='capacity-research')el.append(h('p','focus-alert','EXPERIMENT ONLY: The larger quantity is NOT backed by demonstrated overnight fills. The historical active-week ceiling, craftable supply and outstanding order-book quantities do NOT establish how much you can acquire tonight. Start with observed 24h trial sizes and measure outcomes before scaling.'));
 if(item.kind==='lead')el.append(h('p','focus-alert','This is a WATCH-ONLY market. A current bid and ask cannot establish an overnight fill rate. No order size or expected profit is proposed. Recheck quotes and gather actual buy/resale observations before promoting it.'));if(item.kind==='research')el.append(h('p','focus-alert','This is a CASH-LIMITED research probe, not a verified buy recommendation. The quantity is chosen for a manageable test, not inferred nightly demand. No 7-day income is predicted. Recheck the account after a trial to capture partial fills; record resale completion before scaling.'));
 if(newMode&&item?.cap){el.append(h('p','focus-info-box','Historical capacity estimate: up to '+num(item.demonstratedCap||item.cap)+' units after accounting for other positions.'+(item.exploratoryExtra?' Fast, repeated small buys and resales suggest an additional TEST of '+num(item.exploratoryExtra)+' units; past purchase sizes do not establish maximum demand.':'')+' Current prices are references; this is not a funded order or a measured overnight fill probability.'));}
 el.append(button('Inspect full research',()=>showResearch('allocation-plan'),'focus-button focus-button-secondary'));el.append(h('p','focus-muted focus-legal','Public asks and historical sales do not guarantee a future fill or realised profit. Check live Trading Post prices before placing an order.'));
}
function initOrders(){const x=$('focus-orders');x.innerHTML=`<div id="focus-orders-list"><div class="focus-page-intro"><strong>Manage your positions</strong><span class="focus-muted">Review decisions without losing sight of what’s already on order.</span></div><div class="focus-segments" role="group" aria-label="Order category"><button data-order-lane="review">Needs review</button><button data-order-lane="buy">Buying</button><button data-order-lane="sell">Selling</button></div><label class="focus-search-label focus-search-full"><span class="focus-visually-hidden">Search orders</span><input id="focus-order-search" type="search" placeholder="Search items or families…"></label><p id="focus-order-state" class="focus-muted focus-status"></p><div id="focus-order-rows" class="focus-trade-rows"></div><button id="focus-more-orders" class="focus-button focus-button-secondary" hidden>View more</button></div><div id="focus-order-detail" class="focus-detail-panel" hidden></div>`;
 $('focus-order-search').value=ui.orderSearch;$('focus-order-search').addEventListener('input',ev=>{ui.orderSearch=ev.target.value;ui.orderAll=false;save();renderOrders();});
 for(const b of x.querySelectorAll('[data-order-lane]'))b.addEventListener('click',()=>{ui.orderLane=b.dataset.orderLane;ui.orderAll=false;ui.orderDetail=null;save();if(ui.orderLane==='review')scheduleReviews();renderOrders();});
 $('focus-more-orders').addEventListener('click',()=>{ui.orderAll=!ui.orderAll;save();renderOrders();});}
function familyName(name,id){const g=name.match(/^((?:Celestial|Assassin's|Berserker's|Soldier's|Dire|Sinister|Cleric's|Shaman's|Knight's|Magi's|Carrion|Rabid|Valkyrie|Rampager's|Zealot's)\s+(?:Pearl|Draconic|Exalted|Emblazoned|Intricate|Warbeast|Orichalcum))\b/i);return g?g[1]:name.startsWith('Item #')?'Item #'+id:name;}
function groupedOrders(rows,lane){const map=new Map();for(const o of rows){const id=o.item||o.item_id;if(!id)continue;const name=itemName(id),family=familyName(name,id),key=family.startsWith('Item #')?'item-'+id:family;let x=map.get(key);if(!x){x={key,name:family,items:new Map(),orders:[],units:0,value:0};map.set(key,x);}x.orders.push(o);x.units+=Number(o.q||o.quantity||0);x.value+=Number(o.price||0)*Number(o.q||o.quantity||0);let group=x.items.get(id);if(!group){group={id,name,qty:0,orders:[]};x.items.set(id,group);}group.qty+=Number(o.q||o.quantity||0);group.orders.push(o);}return [...map.values()].sort((a,b)=>b.value-a.value);}
function reviewedStore(){try{return JSON.parse(localStorage.getItem('gp-focus-reviewed:'+String(State()?.account||'unknown'))||'{}');}catch{return {};}}
function setReviewed(a){const data=reviewedStore();data[reviewFingerprint(a)]=Date.now();try{localStorage.setItem('gp-focus-reviewed:'+String(State()?.account||'unknown'),JSON.stringify(data));}catch{}reviewCache=null;reviewKey='';scheduleReviews();renderOrders();}
function reviewFingerprint(a){const s=userSnapshot(),all=[...(s?.buys||[]),...(s?.sells||[])];const sig=all.filter(x=>x.item===a.itemId).map(x=>[x.id,x.q,x.price].join(':')).sort().join('|');return [a.id,a.action,a.itemId,sig].join('~');}
function scheduleReviews(){const s=State(),snap=userSnapshot();if(!s||!snap||ui.tab!=='orders')return;const key=[s.account,snap.buysAt,snap.sellsAt,s.allocationAt,s.ledger.length].join('|');if(reviewKey===key&&reviewCache)return;reviewKey=key;reviewCache=null;labelText('focus-order-state','Checking your existing positions…');
 window.setTimeout(()=>{if(ui.tab!=='orders'||reviewKey!==key)return;try{const analyzed=root.PeanutExecution52.analyze({ledger:s.ledger||[],buys:snap.buys||[],sells:snap.sells||[],delivery:snap.delivery?.items||[],depth:s.exec52Depth||new Map(),now:Date.now(),filter:'active',limit:250});reviewCache=root.PeanutCommander54.decide({execution:analyzed,snapshot:snap,plan:s.allocationPlan,allocationAt:s.allocationAt,now:Date.now(),limit:20});}catch{reviewCache={actions:[],error:'Detailed order reviews could not be calculated.'};}schedule();},50);
}
function reviewGroups(){const actions=(reviewCache?.actions||[]).filter(a=>a.itemId),already=reviewedStore(),map=new Map();for(const a of actions){if(already[reviewFingerprint(a)])continue;const title=itemName(a.itemId),fam=familyName(title,a.itemId),key=fam.startsWith('Item #')?'item-'+a.itemId:fam;let group=map.get(key);if(!group){group={key,name:fam,actions:[],total:0};map.set(key,group);}group.actions.push(a);group.total+=Number(a.amountType==='reserved'?a.capitalAtStake:0);}return [...map.values()].sort((a,b)=>b.total-a.total);}
function renderOrders(){const s=State(),snap=userSnapshot();if(!s||!$('focus-order-rows'))return;for(const b of document.querySelectorAll('[data-order-lane]')){const selected=b.dataset.orderLane===ui.orderLane;b.classList.toggle('is-active',selected);b.setAttribute('aria-pressed',String(selected));}
 if(ui.orderDetail){renderOrderDetail();return;}$('focus-orders-list').hidden=false;$('focus-order-detail').hidden=true;$('focus-order-search').value=ui.orderSearch;
 const host=$('focus-order-rows');host.replaceChildren();if(!snap){host.append(h('p','focus-empty','Check your account to load open orders.'));labelText('focus-order-state','No verified account snapshot');$('focus-more-orders').hidden=true;return;}
 const lane=ui.orderLane,isReview=lane==='review';let entries=[];if(isReview){if(!reviewCache){host.append(h('p','focus-empty','Reviewing completed fills and existing orders…'));labelText('focus-order-state','Checking your trading history for meaningful review actions');$('focus-more-orders').hidden=true;return;}entries=reviewGroups();}else entries=groupedOrders(lane==='buy'?snap.buys||[]:snap.sells||[],lane);
 const search=ui.orderSearch.toLowerCase().trim();if(search)entries=entries.filter(g=>(g.name+' '+(g.items?[...g.items.values()].map(i=>i.name).join(' '):g.actions?.map(i=>itemName(i.itemId)).join(' '))).toLowerCase().includes(search));
 labelText('focus-order-state',isReview?(entries.length+' market groups need review · review does not mean cancel'):(num(entries.reduce((n,g)=>n+g.orders.length,0))+' open '+(lane==='buy'?'buy':'sell')+' orders across '+entries.length+' groups. Existing orders may be filling—no need to reset every day.'));
 if(!entries.length){host.append(h('p','focus-empty',isReview?'No outstanding reviews from the currently verified evidence. Your orders can keep working.':'No matching open '+(lane==='buy'?'buy':'sell')+' orders.'));$('focus-more-orders').hidden=true;return;}
 const archive=root.GPGrowth?.allHistory(s.ledger||[],Date.now());
 for(const g of entries.slice(0,ui.orderAll?100:10)){const btn=h('button','focus-market-row');btn.type='button';const id=isReview?g.actions[0].itemId:g.items.keys().next().value;btn.append(artwork(id));const text=h('span','focus-market-title');text.append(h('strong','',g.name));let subtitle=isReview?g.actions.length+' specific review'+(g.actions.length===1?'':'s')+' · inspect before changing orders':num(g.units)+' units · '+num(g.orders.length)+' orders';
 if(lane==='buy'&&!isReview&&g.items?.size){const active=[...g.items.keys()].map(id=>archive?.byId?.get(id)).filter(x=>x&&x.bought7>0&&x.sold7>0&&x.profit7P100>0);
  if(active.length)subtitle+=' · recent fills & profit — consider keeping';}
 text.append(h('small','',subtitle));btn.append(text);const side=h('span','focus-market-values');side.append(money(isReview?g.total:g.value),h('small','',isReview?'capital involved':lane==='buy'?'reserved':'listed value'));btn.append(side,h('span','focus-chevron','›'));
 btn.addEventListener('click',()=>{ui.orderDetail={lane,key:g.key};ui.orderY=window.scrollY;pushHistory();renderOrderDetail();window.scrollTo({top:0,behavior:'instant'});});host.append(btn);}
 const more=$('focus-more-orders');more.hidden=entries.length<=10;more.textContent=ui.orderAll?'Show top 10':'View all '+num(Math.min(entries.length,100))+' groups';
}
function renderOrderDetail(){const data=ui.orderDetail;if(!data)return;const s=State(),snap=userSnapshot();if(!snap){ui.orderDetail=null;renderOrders();return;}const isReview=data.lane==='review';const groups=isReview?reviewGroups():groupedOrders(data.lane==='buy'?snap.buys||[]:snap.sells||[],data.lane);const g=groups.find(x=>x.key===data.key);if(!g){ui.orderDetail=null;renderOrders();return;}
 const target=$('focus-order-detail');$('focus-orders-list').hidden=true;target.hidden=false;target.replaceChildren();target.append(button('← Back to '+(isReview?'reviews':data.lane==='buy'?'buy orders':'sell orders'),()=>backToList('orders'),'focus-back'));
 target.append(h('h3','focus-detail-h3',g.name));if(isReview){const report=h('p','focus-muted','These are reviews, not instructions to cancel. Check current prices and whether there is a genuinely better alternative.');target.append(report);
  for(const a of g.actions){const div=h('section','focus-review-detail');const title=h('div','focus-review-detail-head');title.append(artwork(a.itemId),h('strong','',itemName(a.itemId)));div.append(title,h('p','',a.action),h('p','focus-muted',a.next||a.reasons?.[0]||'Inspect the current position before changing an order.'));
   if(a.amountType==='reserved')div.append(h('p','focus-muted','Capital reserved: '+cash(a.capitalAtStake)));
   const why=h('details','focus-why');why.append(h('summary','','Why this was flagged'));for(const x of a.reasons||[])why.append(h('p','focus-muted',x));div.append(why,button('Mark reviewed',()=>{setReviewed(a);renderOrderDetail();},'focus-button focus-button-secondary'));target.append(div);}
 }else{target.append(h('p','focus-muted',num(g.units)+' units in '+num(g.orders.length)+' orders · '+cash(g.value)+(data.lane==='buy'?' committed':' at listed prices')));
  for(const item of [...g.items.values()].sort((a,b)=>b.qty-a.qty)){const row=h('div','focus-order-detail-row');row.append(artwork(item.id));const center=h('div','focus-order-detail-copy');center.append(h('strong','',item.name),h('small','',num(item.qty)+' units · '+num(item.orders.length)+' orders'));row.append(center);const prices=h('span','focus-order-price');prices.append(h('strong','',cash(item.orders[0].price)),h('small','','per unit · first order'));row.append(prices);target.append(row);}
  target.append(h('p','focus-muted focus-legal','Open orders may retain queue priority while filling. Replacing them can lose that position. Only change after reviewing actual fills and fresh alternatives; no automatic actions.'));}
 target.append(button('Inspect full order evidence',()=>showResearch('execution52-panel'),'focus-button focus-button-secondary'));
}
function initLegend(){const legend=$('view-legend');if(!legend)return;
 const shell=h('section','focus-legend-workspace');shell.id='focus-legend-workspace';shell.innerHTML=`<div class="focus-page-intro"><strong>Your legendary project</strong><span class="focus-muted">One goal and one next step at a time.</span></div><div class="focus-legend-hero" id="focus-legend-summary"><strong>Choose your legendary</strong><p class="focus-muted">Track a project to see its missing ingredients and steps.</p></div><div class="focus-legend-toolbar"><button class="focus-button focus-button-secondary" id="focus-choose-legend">Choose / change goal</button><button class="focus-button focus-button-secondary" id="focus-sync-legend">↻ Check materials</button></div><div id="focus-legend-picker" hidden></div><div class="focus-segments focus-legend-segments" role="group" aria-label="Legendary project view"><button data-legend-section="overview">Overview</button><button data-legend-section="shopping">Shopping</button><button data-legend-section="crafting">Crafting</button><button data-legend-section="collections">Collections</button></div><div id="focus-legend-overview" data-legend-view="overview" class="focus-legend-view"></div><div id="focus-legend-shopping" data-legend-view="shopping" class="focus-legend-view" hidden></div><div id="focus-legend-crafting" data-legend-view="crafting" class="focus-legend-view" hidden><h3>Recipe & crafting path</h3></div><div id="focus-legend-collections" data-legend-view="collections" class="focus-legend-view" hidden><h3>Collection progress</h3></div>`;
 legend.prepend(shell);const originalGrid=legend.querySelector('.lp-grid');const selection=originalGrid?.children[0],detail=$('lp-detail');if(selection)$('focus-legend-picker').append(selection);if(detail)$('focus-legend-overview').append(detail);
 const cost=legend.querySelector('.lp-panel:has(#lp-materials)');if(cost)$('focus-legend-shopping').append(cost);
 const known=$('lp-known-spend');if(known)$('focus-legend-overview').append(known);
 const direct=$('lp-direct');if(direct)$('focus-legend-crafting').append(direct);const wiki=$('lp-wiki');if(wiki)$('focus-legend-crafting').append(wiki);
 const steps=$('lp-craft-steps');if(steps){const parent=steps.closest('details');if(parent)$('focus-legend-crafting').append(parent);}
 const tasks=$('lp-tasks');if(tasks){const parent=tasks.closest('details');if(parent)$('focus-legend-collections').append(parent);}
 const advanced=legend.querySelector('details:has(#lp-custom-id)');if(advanced)$('focus-legend-collections').append(advanced);
 const source=legend.querySelector('.lp-source-note');if(source){const d=h('details','focus-why');d.append(h('summary','','Recipe sources and limitations'));d.append(source);$('focus-legend-crafting').append(d);}
 // Retain old controls and status as functioning elements, but out of the default flow.
 const oldActions=legend.querySelector('.lp-actions:has(#lp-refresh)');if(oldActions)oldActions.classList.add('focus-legend-original-refresh');
 const oldHeader=legend.querySelector('.lp-head');if(oldHeader)oldHeader.classList.add('focus-legend-old-head');
 $('focus-choose-legend').addEventListener('click',()=>{const picker=$('focus-legend-picker');picker.hidden=!picker.hidden;if(!picker.hidden)$('lp-search')?.focus();});
 $('focus-sync-legend').addEventListener('click',()=>$('lp-refresh')?.click());
 for(const b of shell.querySelectorAll('[data-legend-section]'))b.addEventListener('click',()=>{ui.legendSection=b.dataset.legendSection;save();updateLegendView();});
 const refreshSelect=()=>{updateLegendView();window.setTimeout(()=>{$('focus-legend-picker').hidden=!!root.GPLegendaryPlanner?.cache?.chosen;},90);};
 $('lp-choose')?.addEventListener('change',refreshSelect);$('lp-goals')?.addEventListener('click',()=>window.setTimeout(refreshSelect,20));updateLegendView();
}
function updateLegendView(){if(!$('focus-legend-workspace'))return;const p=root.GPLegendaryPlanner,cache=p?.cache;for(const btn of document.querySelectorAll('[data-legend-section]')){const selected=btn.dataset.legendSection===ui.legendSection;btn.classList.toggle('is-active',selected);btn.setAttribute('aria-pressed',String(selected));}
 for(const view of document.querySelectorAll('[data-legend-view]'))view.hidden=view.dataset.legendView!==ui.legendSection;
 const id=Number(cache?.chosen),it=cache?.catalog?.find(x=>x.id===id);if(!it){$('focus-legend-summary').replaceChildren(h('strong','','Choose a legendary to begin'),h('p','focus-muted','Your saved goals and the full catalogue are under Choose / change goal.'));$('focus-legend-picker').hidden=false;return;}
 const title=h('strong','',it.name),help=h('p','focus-muted');const d=p?.derive?.(),req=d?.need?.filter(x=>x.missing>0)||[];const owned=d?.need?.filter(x=>x.missing===0)?.length||0;
 let next='';if(d?.g?.tasks?.length){const t=d.g.tasks.find(x=>!cache.list.checked[`${it.id}:${x.id}`]);if(t)next=t.text;}
 if(!next&&req.length){const row=req.find(x=>x.category==='buy')||req[0];next='Acquire '+num(row.missing)+' × '+(cache.book?.itemMap?.get(row.id)?.name||cache.catalog?.find(x=>x.id===row.id)?.name||'required ingredient');}
 if(!next)next=d?.plan?.hasRecipe?'Review your remaining crafting and account-bound requirements.':'Check the wiki acquisition route and complete the associated collection.';
 help.textContent='Next step: '+next;
 const metric=h('p','focus-muted focus-legend-progress',num(owned)+' ingredient types covered · '+num(req.length)+' types missing or unverified');
 $('focus-legend-summary').replaceChildren(title,help,metric);
 decorateLegendArtwork();
}
function decorateLegendArtwork(){const cache=root.GPLegendaryPlanner?.cache;if(!cache?.book?.itemMap)return;const names=new Map();for(const item of cache.book.itemMap.values())if(item.name&&validIcon(item))names.set(item.name.toLowerCase(),item.icon);
 for(const row of document.querySelectorAll('#lp-materials .lp-material-row, #lp-direct .lp-direct-row, #lp-craft-steps .lp-direct-row')){if(row.querySelector('.focus-legend-item-art'))continue;const anchor=row.querySelector('a');if(!anchor)continue;const src=names.get(anchor.textContent.trim().toLowerCase());const wrap=h('span','focus-legend-item-art');if(src){const img=h('img');img.src=src;img.alt='';img.loading='lazy';img.onerror=()=>img.replaceWith(h('span','','◇'));wrap.append(img);}else wrap.append(h('span','','◇'));row.prepend(wrap);}
}
function schedule(){if(renderTimer)return;renderTimer=window.setTimeout(()=>{renderTimer=0;if(!started)return;renderToday();if(ui.tab==='trades'&&((!ui.tradeDetail&&!ui.growthDetail&&!ui.relatedDetail)||$('focus-trade-detail').hidden))renderTrades();if(ui.tab==='orders'&&!(ui.orderDetail&&!$('focus-order-detail').hidden))renderOrders();if(ui.tab==='legendaries')updateLegendView();const s=State();const busy=s?.busy||s?.allocationBusy;labelText('focus-sync-state',busy?'Refreshing saved account and market evidence…':s?.error?'Some account data may be unavailable; previous values were kept.':'');},170);}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})(typeof globalThis!=='undefined'?globalThis:this);
