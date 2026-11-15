(function installPrivateDualHub(win,doc){
"use strict";
const VERSION="dual-hub-preview-2026-11-15";
const API="https://prices.runescape.wiki/api/v2/osrs/";
const CFG="gh-osrs-v1-config",LEDGER="gh-osrs-v1-ledger",CACHE="gh-osrs-v1-cache";
const LAST_GAME="gh-last-game-v1";
const EXEMPT=new Set(("old school bond|bronze arrow|bronze dart|iron arrow|iron dart|mind rune|steel arrow|steel dart|bass|bread|cake|cooked chicken|cooked meat|herring|lobster|mackerel|meat pie|pike|salmon|shrimps|tuna|chisel|gardening trowel|glassblowing pipe|hammer|needle|pestle and mortar|rake|saw|secateurs|seed dibber|shears|spade|watering can|games necklace(8)|ring of dueling(8)|ardougne teleport|camelot teleport|falador teleport|kourend castle teleport|lumbridge teleport|teleport to house|varrock teleport|civitas illa fortis teleport|energy potion").split("|"));
const RESTRICTED=new Set(("Oak logs|Willow logs|Yew logs|Raw shrimps|Shrimps|Raw anchovies|Anchovies|Raw lobster|Lobster|Clay|Soft clay|Copper ore|Tin ore|Iron ore|Silver ore|Gold ore|Coal|Mithril ore|Adamantite ore|Runite ore|Ashes|Vial|Vial of water|Jug of water|Fishing bait|Feather|Eye of newt|Wine of Zamorak|Air rune|Water rune|Earth rune|Fire rune|Mind rune|Chaos rune|Cowhide|Leather|Red spiders' eggs|Hard leather|Steel bar|Redberries").split("|"));
const read=(key,fallback)=>{try{const v=JSON.parse(win.localStorage.getItem(key));return v===null?fallback:v}catch{return fallback}};
const store=(key,value)=>{try{win.localStorage.setItem(key,JSON.stringify(value));return true}catch{return false}};
const gp=(v)=>Number.isFinite(v)?Math.round(v).toLocaleString("en-GB")+" gp":"—";
const n=(v)=>Number(v);
const good=(v)=>Number.isFinite(v)&&v>0&&Number.isSafeInteger(Math.round(v));
const safe=(v)=>String(v==null?"":v);
const el=(tag,cls,text)=>{const x=doc.createElement(tag);if(cls)x.className=cls;if(text!=null)x.textContent=safe(text);return x};
const txt=(id,v)=>{const a=doc.getElementById(id);if(a)a.textContent=safe(v)};
const get=(id)=>doc.getElementById(id);
const tax=(price,name)=>{const sell=Math.floor(n(price));const key=safe(name).trim().toLowerCase();if(EXEMPT.has(key)||/^energy potion\([1-4]\)$/.test(key)||/^old school bonds?( \(untradeable\))?$/.test(key))return 0;return Math.min(5000000,Math.floor(Math.max(0,sell)/50))};
const state={game:"gw2",budget:100000000,mode:"f2p",restricted:"unknown",records:[],snap:null,ideas:[],index:0,loading:false,builtAt:0,chartOpen:false,chartRange:"7d",chartRows:[],chartVisible:null,lastResult:"",historicalCache:{},stale:false};
function loadUser(){
 const c=read(CFG,{});
 state.budget=Number.isSafeInteger(n(c.budget))&&n(c.budget)>=0&&n(c.budget)<=9e12?n(c.budget):1e8;
 state.mode=c.mode==="members"?"members":"f2p";
 state.restricted=c.restricted==="clear"?"clear":"unknown";
 const records=read(LEDGER,[]);
 state.records=Array.isArray(records)?records.filter(r=>r&&Number.isSafeInteger(r.id)&&r.id>0&&["buy","sell"].includes(r.side)&&good(r.qty)&&good(r.price)&&Number.isFinite(Date.parse(r.when))).slice(-1000):[];
}
function saveUser(){
 return store(CFG,{budget:state.budget,mode:state.mode,restricted:state.restricted})&&store(LEDGER,state.records);
}
function blank(){
 const h=el("div","gp-guide-content");
 h.innerHTML=`
 <header class="gp-guide-header">
   <div class="gp-guide-logo" aria-hidden="true">▥</div>
   <div class="gp-guide-title"><h1>The Golden Exchange</h1><p>One useful move at a time · Old School RuneScape</p></div>
   <div class="gp-guide-head-actions">
     <button id="gh-refresh" class="gp-guide-primary" type="button">↻ Update prices</button>
     <button id="gh-settings-toggle" class="gp-guide-secondary" type="button">⚙ Details</button>
   </div>
 </header>
 <div class="gp-guide-metrics">
  <div class="gp-guide-metric gp-guide-delivery-summary"><div class="gp-guide-label">Trading budget · entered manually</div><strong class="gp-guide-number" id="gh-budget-metric">—</strong><small id="gh-account-metric">Free to play · 3 slots</small></div>
  <div class="gp-guide-metric"><div class="gp-guide-label">Today · realised profit</div><strong class="gp-guide-number" id="gh-today">—</strong><small>Completed, recorded trades only</small></div>
  <div class="gp-guide-metric"><div class="gp-guide-label">Last 7 days · realised</div><strong class="gp-guide-number" id="gh-week">—</strong><small>Not predicted future profit</small></div>
 </div>
 <p class="gp-guide-update" id="gh-status" role="status" aria-live="polite">Loading OSRS market prices…</p>
 <section class="gp-guide-idea" aria-label="Next OSRS trade idea">
  <div class="gp-guide-idea-top"><span class="gp-guide-position" id="gh-position">Markets not checked</span><span class="gp-guide-tier" id="gh-risk">Live price research</span></div>
  <div class="gp-guide-item-icon" id="gh-item-icon" aria-hidden="true">▥</div>
  <h2 id="gh-item-name">Checking eligible trades…</h2>
  <div class="gp-guide-instructions">
    <p class="gp-guide-instruction" id="gh-instruction">Price observations are not guaranteed fills.</p>
    <p class="gp-guide-instruction-sub" id="gh-instruction-extra"></p>
  </div>
  <div class="gp-guide-totals">
   <div class="gp-guide-metric"><span class="gp-guide-label">Potential after-tax margin</span><strong class="gp-guide-number" id="gh-margin">—</strong></div>
   <div class="gp-guide-metric"><span class="gp-guide-label">Illustrative total</span><strong class="gp-guide-number" id="gh-total">—</strong></div>
  </div>
  <p class="gp-guide-caution" id="gh-caution">Market conditions can change before your orders fill.</p>
  <div class="gp-guide-controls">
    <button type="button" id="gh-previous" class="gp-guide-secondary" disabled>← Previous</button>
    <button type="button" id="gh-next" class="gp-guide-primary" disabled>Next →</button>
  </div>
  <div class="gh-actions">
    <button id="gh-show-chart" class="gp-guide-light" type="button" disabled>Price chart</button>
    <button id="gh-add-fill" class="gp-guide-light" type="button" disabled>Record a fill</button>
  </div>
  <div id="gh-chart" class="gh-chart-card" hidden>
    <div class="gh-chart-range" aria-label="Historical range">
      <button type="button" data-gh-range="24h" class="gp-guide-secondary">24h</button>
      <button type="button" data-gh-range="7d" class="gp-guide-secondary">7d</button>
      <button type="button" data-gh-range="30d" class="gp-guide-secondary">30d</button>
      <button type="button" id="gh-chart-reset" class="gp-guide-secondary">Reset</button>
    </div>
    <p class="gh-meta" id="gh-chart-status">Select a period to load historical observations.</p>
    <svg id="gh-chart-svg" viewBox="0 0 680 200" role="img" aria-label="Historical buy and sell price trends"></svg>
    <p class="gh-meta">Wheel to zoom · drag to pan · RuneScape Wiki time-series data</p>
  </div>
  <form id="gh-fill-form" hidden>
   <div class="gh-field-grid">
    <label>Side<select id="gh-fill-side"><option value="buy">Bought</option><option value="sell">Sold</option></select></label>
    <label>Quantity<input type="number" min="1" step="1" id="gh-fill-qty" value="1" required></label>
    <label>Actual unit price (gp)<input type="number" min="1" step="1" id="gh-fill-price" required></label>
    <label>Item<input type="text" id="gh-fill-item" disabled></label>
   </div>
   <p class="gh-trade-note">Record only confirmed Grand Exchange fills. Sales match recorded purchases FIFO; unmatched sales are rejected.</p>
   <div class="gh-trade-row"><button type="submit" class="gp-guide-primary">Save fill</button><button type="button" id="gh-cancel-fill" class="gp-guide-light">Cancel</button></div>
   <p class="gh-inline-status" id="gh-fill-feedback" aria-live="polite"></p>
  </form>
 </section>
 <details class="gh-osrs-settings" id="gh-settings">
  <summary>Account, budget and research settings</summary>
  <div class="gh-settings-body">
    <div class="gh-field-grid">
      <label>Budget (gp)<input id="gh-budget-input" type="number" min="0" max="9000000000000" step="1" required></label>
      <label>Account<select id="gh-mode"><option value="f2p">Free-to-play · 3 slots</option><option value="members">Members · 8 slots</option></select></label>
      <label>New-account trading restrictions<select id="gh-restricted"><option value="unknown">Unknown · screen conservatively</option><option value="clear">Restrictions cleared</option></select></label>
    </div>
    <button id="gh-apply" type="button" class="gp-guide-primary">Apply settings</button>
    <p>Prices sourced from the OSRS Wiki v2 API. This app never places in-game orders. OSRS account values and trade records are separate from GW2.</p>
  </div>
 </details>
 <details class="gh-osrs-ledger" id="gh-ledger">
   <summary>My manually recorded OSRS trades</summary>
   <div class="gh-settings-body"><p>Keep your actual purchases and completed sales; the figures here are not estimates.</p><div id="gh-ledger-list" class="gh-ledger-list"></div></div>
 </details>
 <p class="gh-meta">Independent trading research · no automated Grand Exchange orders · no Jagex affiliation.</p>`;
 return h;
}
function install(){
 if(doc.getElementById("gh-game-nav")||!doc.body)return;
 loadUser();
 const nav=el("nav");nav.id="gh-game-nav";nav.setAttribute("aria-label","Select trading game");nav.innerHTML=`<div class="gh-nav-inner" role="tablist" aria-label="Trading game"><button type="button" id="gh-tab-gw2" role="tab" aria-selected="true" aria-controls="gp-guided-root">Guild Wars 2</button><button type="button" id="gh-tab-osrs" role="tab" aria-selected="false" aria-controls="gh-osrs-root">Old School RuneScape</button></div>`;
 const root=el("section");root.id="gh-osrs-root";root.setAttribute("aria-label","The Golden Exchange trading desk");root.hidden=true; /* OSRS controls mount only on first OSRS visit. */
 const legacyApp=doc.querySelector("body > .app");
 if(legacyApp)doc.body.insertBefore(nav,legacyApp);else doc.body.prepend(nav);
 if(legacyApp)legacyApp.after(root);else doc.body.append(root);
 get("gh-tab-gw2").addEventListener("click",()=>switchGame("gw2",true));
 get("gh-tab-osrs").addEventListener("click",()=>switchGame("osrs",true));
 doc.addEventListener("touchstart",rememberSwipe,{passive:true});
 doc.addEventListener("touchend",handleSwipe,{passive:true});
 win.addEventListener("pageshow",()=>{if(state.game==="osrs")render()});
 win.GoldenDualHub={version:VERSION,switchGame:(game)=>switchGame(game,true),diagnostics:()=>({game:state.game,osrsPriceTimestamp:state.builtAt,ideas:state.ideas.length,ledgerRows:state.records.length})};
 const initial=win.location.search.includes("game=osrs")?"osrs":read(LAST_GAME,"gw2");
 switchGame(initial==="osrs"?"osrs":"gw2",false);
 if(state.game==="osrs")render();
}
function activateOsrs(){
 if(get("gh-refresh"))return;
 const root=get("gh-osrs-root");
 if(!root)return;
 root.append(blank());
 get("gh-refresh").addEventListener("click",()=>refresh(true));
 get("gh-settings-toggle").addEventListener("click",()=>{const x=get("gh-settings");x.open=!x.open;if(x.open)x.scrollIntoView({block:"nearest",behavior:"smooth"})});
 get("gh-apply").addEventListener("click",applySettings);
 get("gh-previous").addEventListener("click",()=>navigate(-1));
 get("gh-next").addEventListener("click",()=>navigate(1));
 get("gh-show-chart").addEventListener("click",()=>{get("gh-chart").hidden=!get("gh-chart").hidden;state.chartOpen=!get("gh-chart").hidden;if(state.chartOpen)loadChart()});
 for(const b of root.querySelectorAll("[data-gh-range]"))b.addEventListener("click",()=>{state.chartRange=b.dataset.ghRange;state.chartVisible=null;loadChart()});
 get("gh-chart-reset").addEventListener("click",()=>{state.chartVisible=null;drawChart()});
 get("gh-add-fill").addEventListener("click",toggleFill);
 get("gh-cancel-fill").addEventListener("click",()=>get("gh-fill-form").hidden=true);
 get("gh-fill-form").addEventListener("submit",recordFill);
 get("gh-chart-svg").addEventListener("wheel",zoomChart,{passive:false});
 get("gh-chart-svg").addEventListener("pointerdown",chartStart);
 get("gh-chart-svg").addEventListener("pointerup",chartEnd);

}
function switchGame(game,userAction){
 state.game=game==="osrs"?"osrs":"gw2";
 doc.body.classList.toggle("gh-show-osrs",state.game==="osrs");
 get("gh-osrs-root").hidden=state.game!=="osrs";
 get("gh-tab-gw2").setAttribute("aria-selected",state.game==="gw2"?"true":"false");
 get("gh-tab-osrs").setAttribute("aria-selected",state.game==="osrs"?"true":"false");
 store(LAST_GAME,state.game);
 if(state.game==="osrs"){activateOsrs();render();if(!state.snap&&!state.loading)void refresh(false);win.__gpReleaseBoot?.();}
 if(userAction){win.scrollTo({top:0,behavior:"instant"});}
}
let swipe=null;
function rememberSwipe(e){
 const t=e.target;
 if(!t||!t.closest||t.closest("button,input,select,textarea,summary,dialog,form,svg,.gh-chart-card,[contenteditable]")){swipe=null;return}
 if(!t.closest("#gh-game-nav,#gh-osrs-root,#gp-guided-root")){swipe=null;return}
 const a=e.changedTouches?.[0];swipe=a?{x:a.clientX,y:a.clientY}:null;
}
function handleSwipe(e){
 if(!swipe)return;const a=e.changedTouches?.[0];if(!a){swipe=null;return}
 const dx=a.clientX-swipe.x,dy=a.clientY-swipe.y;swipe=null;
 if(Math.abs(dx)>120&&Math.abs(dx)>Math.abs(dy)*2&&Math.abs(dy)<80){
  if(dx<0&&state.game==="gw2")switchGame("osrs",true);
  else if(dx>0&&state.game==="osrs")switchGame("gw2",true);
 }
}
function applySettings(){
 const budget=n(get("gh-budget-input").value),mode=get("gh-mode").value;
 if(!Number.isSafeInteger(budget)||budget<0||budget>9e12){txt("gh-status","Budget must be whole GP between 0 and 9 trillion.");return}
 state.budget=budget;state.mode=mode==="members"?"members":"f2p";
 state.restricted=get("gh-restricted").value==="clear"?"clear":"unknown";
 state.index=0;saveUser();buildIdeas();render();
 get("gh-settings").open=false;
}
function cacheLoad(){const c=read(CACHE,{});return c&&typeof c==="object"&&!Array.isArray(c)?c:{}}
function validate(route,data){
 if(route==="mapping")return Array.isArray(data)&&data.length>100&&data.every((x)=>Number.isSafeInteger(x?.id)&&x.id>0&&typeof x.name==="string");
 return data&&typeof data.data==="object"&&!Array.isArray(data.data)&&data.data!==null&&Object.keys(data.data).length>100;
}
async function getPrices(route,ttl,force){
 const cache=cacheLoad(),rec=cache[route],age=Date.now()-n(rec?.at);
 if(!force&&rec&&age>=0&&age<ttl&&validate(route,rec.data))return {data:rec.data,at:rec.at,stale:false};
 let fresh;
 try{
  const response=await win.fetch(API+route,{headers:{Accept:"application/json"},signal:AbortSignal.timeout(17000)});
  if(!response.ok)throw Error("Wiki API "+response.status);
  fresh=await response.json();
  if(!validate(route,fresh))throw Error("Unexpected Wiki API response for "+route);
  cache[route]={data:fresh,at:Date.now()};
  if(!store(CACHE,cache)&&route==="mapping"){/* No persistence is acceptable when device storage is full. */}
  return {data:fresh,at:Date.now(),stale:false};
 }catch(err){
  if(rec&&age>=0&&age<86400000&&validate(route,rec.data))return {data:rec.data,at:rec.at,stale:true,error:String(err.message)};
  throw err;
 }
}
async function refresh(force){
 if(state.loading)return;
 state.loading=true;txt("gh-status","Checking RuneScape Wiki price observations…");
 if(get("gh-refresh"))get("gh-refresh").disabled=true;
 try{
  const result=await Promise.all([getPrices("mapping",86400000,force),getPrices("latest",60000,force),getPrices("5m",300000,force),getPrices("1h",3600000,force)]);
  state.snap={mapping:result[0].data,latest:result[1].data,five:result[2].data,hour:result[3].data};
  state.stale=result.some(x=>x.stale);
  state.builtAt=Date.now();buildIdeas();render();
  txt("gh-status",(state.stale?"Using cached evidence; some updates failed · ":"Price evidence checked · ")+new Date(state.builtAt).toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit"})+" · "+state.ideas.length+" candidates");
 }catch(err){
  txt("gh-status","Could not load market observations: "+safe(err.message)+". Use Update prices to retry.");
  state.ideas=[];render();
 }finally{state.loading=false;if(get("gh-refresh"))get("gh-refresh").disabled=false}
}
function buildIdeas(){
 if(!state.snap){state.ideas=[];return}
 const now=Date.now()/1000,s=state.snap,latest=s.latest.data||{},five=s.five.data||{},hour=s.hour.data||{};
 const hourFresh=n(s.hour.timestamp)<=now+60&&n(s.hour.timestamp)>=now-10800;
 const fiveFresh=n(s.five.timestamp)<=now+60&&n(s.five.timestamp)>=now-1200;
 const list=[];
 if(!hourFresh||!fiveFresh||state.stale){state.ideas=[];return}
 for(const m of s.mapping){
  if(state.mode==="f2p"&&m.members)continue;
  if(state.mode==="f2p"&&state.restricted!=="clear"&&RESTRICTED.has(m.name))continue;
  const p=latest[m.id],f=five[m.id],h=hour[m.id];
  if(!p||!f||!h)continue;
  const buy=n(p.low),sell=n(p.high),cap=n(m.limit);
  if(!good(buy)||!good(sell)||!good(cap)||buy>state.budget||sell<=buy)continue;
  const age=Math.max(now-n(p.lowTime),now-n(p.highTime));
  if(!Number.isFinite(age)||age<0||age>7200)continue;
  const flow=Math.min(n(h.lowPriceVolume),n(h.highPriceVolume));
  const recentFlow=Math.min(n(f.lowPriceVolume),n(f.highPriceVolume));
  if(!Number.isFinite(flow)||flow<50||!Number.isFinite(recentFlow)||recentFlow<1)continue;
  const refBuy=Math.ceil(Math.max(buy,n(h.avgLowPrice),n(f.avgLowPrice)));
  const refSell=Math.floor(Math.min(sell,n(h.avgHighPrice),n(f.avgHighPrice)));
  if(!good(refBuy)||!good(refSell)||refBuy>=refSell)continue;
  const profit=refSell-refBuy-tax(refSell,m.name),spread=profit/refBuy;
  if(profit<=0||spread>=.4||spread<=0)continue;
  const drift=Math.max(Math.abs(refBuy-buy)/buy,Math.abs(refSell-sell)/sell);
  if(drift>.3)continue;
  const qty=Math.min(Math.floor(cap),Math.max(0,Math.floor(flow*0.04)),Math.floor(state.budget/refBuy));
  if(!Number.isSafeInteger(qty)||qty<1||!Number.isSafeInteger(qty*refBuy))continue;
  const stressSell=Math.max(1,refSell-Math.ceil(refSell*.02));
  const stressedMargin=stressSell-refBuy-tax(stressSell,m.name);
  const reliability=(age>3600?.7:1)*(drift>.1?.75:1)*(stressedMargin>0?1:.5);
  list.push({id:m.id,name:m.name,members:!!m.members,buy:refBuy,sell:refSell,observedBuy:buy,observedSell:sell,profit,spread,qty,limit:cap,flow,age,drift,stressedMargin,total:qty*profit,score:qty*profit*reliability});
 }
 list.sort((a,b)=>b.score-a.score||a.id-b.id);
 state.ideas=list.slice(0,80);
 state.index=Math.min(state.index,Math.max(0,state.ideas.length-1));
}
function ledgerTotals(){
 const now=Date.now(),day=new Date();day.setHours(0,0,0,0);
 const week=+day-6*86400000;let today=0,lastWeek=0;
 for(const r of state.records)if(r.side==="sell"&&Number.isFinite(r.gain)){const t=Date.parse(r.when);if(t>=week&&t<=now)lastWeek+=r.gain;if(t>=+day&&t<=now)today+=r.gain}
 return {today,lastWeek};
}
function render(){
 if(!get("gh-budget-metric"))return;
 txt("gh-budget-metric",gp(state.budget));txt("gh-account-metric",state.mode==="members"?"Members · 8 GE slots":"Free-to-play · 3 GE slots");
 const totals=ledgerTotals();txt("gh-today",gp(totals.today));txt("gh-week",gp(totals.lastWeek));
 get("gh-budget-input").value=String(state.budget);get("gh-mode").value=state.mode;get("gh-restricted").value=state.restricted;
 const current=state.ideas[state.index];
 if(!current){
  txt("gh-position",state.snap?"0 eligible verified candidates":"Market data not loaded");
  txt("gh-item-name",state.loading?"Checking markets…":"No verified trade ideas yet");
  txt("gh-risk","Unverified");
  txt("gh-instruction",state.loading?"Fetching prices and observed volume…":"Refresh prices or adjust your budget and account filters.");
  txt("gh-instruction-extra","The app will not invent opportunities to fill this card.");
  txt("gh-margin","—");txt("gh-total","—");txt("gh-caution","Only recent, corroborated two-way markets are eligible.");
  get("gh-previous").disabled=true;get("gh-next").disabled=true;get("gh-show-chart").disabled=true;get("gh-add-fill").disabled=true;
 }else{
  txt("gh-position","Trade idea "+(state.index+1)+" of "+state.ideas.length);
  txt("gh-item-name",current.name);
  txt("gh-risk",current.stressedMargin>0?"Stronger evidence":"Small test only");
  txt("gh-instruction","Try buying "+current.qty.toLocaleString("en-GB")+" × at "+gp(current.buy)+" each");
  txt("gh-instruction-extra","Then list at "+gp(current.sell)+" each · not guaranteed to fill");
  txt("gh-margin",gp(current.profit)+" / item");
  txt("gh-total",gp(current.total));
  txt("gh-caution","Four-hour GE limit: "+current.limit.toLocaleString("en-GB")+" · recent two-way volume: "+current.flow.toLocaleString("en-GB")+"/hr · "+(current.stressedMargin>0?"margin survives a 2% lower sell price":"a 2% lower sell price could erase the margin")+". Illustrative only.");
  const icon=get("gh-item-icon");icon.textContent="▥";
  get("gh-previous").disabled=state.index===0;get("gh-next").disabled=state.index===state.ideas.length-1;
  get("gh-show-chart").disabled=false;get("gh-add-fill").disabled=false;
 }
 renderLedger();
}
function navigate(dir){
 if(!state.ideas.length)return;
 const index=Math.max(0,Math.min(state.ideas.length-1,state.index+dir));
 if(index===state.index)return;
 state.index=index;state.chartRows=[];state.chartVisible=null;state.chartOpen=false;get("gh-chart").hidden=true;get("gh-fill-form").hidden=true;
 render();
}
function toggleFill(){
 const f=get("gh-fill-form"),item=state.ideas[state.index];if(!item)return;
 f.hidden=!f.hidden;if(f.hidden)return;
 get("gh-fill-item").value=item.name;get("gh-fill-price").value=item.buy;get("gh-fill-side").value="buy";
 get("gh-fill-qty").value=Math.max(1,Math.min(item.qty,100));
 txt("gh-fill-feedback","");
 f.scrollIntoView({behavior:"smooth",block:"nearest"});
}
function inventory(id){
 const lots=[];
 for(const r of state.records){
  if(r.id!==id)continue;
  if(r.side==="buy")lots.push({qty:r.qty,price:r.price});
  else{let remain=r.qty;while(remain>0&&lots.length){const item=lots[0];const count=Math.min(remain,item.qty);item.qty-=count;remain-=count;if(item.qty===0)lots.shift()}}
 }
 return lots;
}
function recordFill(e){
 e.preventDefault();const item=state.ideas[state.index];if(!item)return;
 const side=get("gh-fill-side").value,qty=n(get("gh-fill-qty").value),price=n(get("gh-fill-price").value);
 if(!Number.isSafeInteger(qty)||qty<=0||!Number.isSafeInteger(price)||price<=0||qty*price>9e12){txt("gh-fill-feedback","Enter valid whole quantities and GP prices.");return}
 let gain=null;
 if(side==="sell"){
  const lots=inventory(item.id);let left=qty,cost=0;
  for(const lot of lots){const used=Math.min(left,lot.qty);left-=used;cost+=used*lot.price;if(left===0)break}
  if(left>0){txt("gh-fill-feedback","Cannot record that sale: only "+(qty-left)+" units have matched recorded purchases.");return}
  gain=qty*price-cost-qty*tax(price,item.name);
 }
 if(state.records.length>=1000){txt("gh-fill-feedback","Ledger is full (1,000 events). Export your records before adding more.");return}
 state.records.push({id:item.id,name:item.name,side,qty,price,when:new Date().toISOString(),gain});
 if(!saveUser()){state.records.pop();txt("gh-fill-feedback","Device storage full or disabled; the fill was not saved.");return}
 txt("gh-fill-feedback",side==="sell"?"Recorded verified sale · realised "+gp(gain):"Recorded purchase · waiting for a matching sale");
 render();
}
function renderLedger(){
 const target=get("gh-ledger-list");if(!target)return;target.replaceChildren();
 if(!state.records.length){target.append(el("p","gh-empty","No recorded OSRS fills yet."));return}
 for(const r of state.records.slice(-20).reverse()){
  const row=el("div","gh-ledger-row");
  const title=el("div");title.append(el("strong","",r.name));title.append(el("small","",(r.side==="buy"?"Bought ":"Sold ")+r.qty+" × "+gp(r.price)));
  const right=el("div");right.append(el("strong","",r.side==="sell"?gp(r.gain):"Open purchase"));right.append(el("small","",new Date(r.when).toLocaleDateString("en-GB")));
  row.append(title,right);target.append(row);
 }
}
async function loadChart(){
 const item=state.ideas[state.index];if(!item)return;
 const key=item.id+"-"+state.chartRange;
 txt("gh-chart-status","Loading "+state.chartRange+" prices…");
 const existing=state.historicalCache[key];
 if(existing&&Date.now()-existing.at<3600000){state.chartRows=existing.rows;state.chartVisible=null;drawChart();return}
 try{
  const url=API+"timeseries?id="+encodeURIComponent(item.id)+"&lookback="+encodeURIComponent(state.chartRange);
  const r=await win.fetch(url,{headers:{Accept:"application/json"},signal:AbortSignal.timeout(17000)});
  if(!r.ok)throw Error("Wiki API "+r.status);
  const payload=await r.json();
  const rows=(Array.isArray(payload?.data)?payload.data:[]).filter(x=>Number.isFinite(x.timestamp)&&Number.isFinite(x.avgLowPrice)&&Number.isFinite(x.avgHighPrice)&&x.avgLowPrice>0&&x.avgHighPrice>0).sort((a,b)=>a.timestamp-b.timestamp);
  if(rows.length<2)throw Error("Not enough historical observations");
  state.historicalCache[key]={rows,at:Date.now()};state.chartRows=rows;state.chartVisible=null;drawChart();
 }catch(err){txt("gh-chart-status","Could not load chart: "+safe(err.message));get("gh-chart-svg").replaceChildren()}
}
function chartBounds(){
 const len=state.chartRows.length;
 let [start,end]=state.chartVisible||[0,len];
 start=Math.max(0,Math.min(Math.max(0,len-2),Math.floor(start)));
 end=Math.max(start+2,Math.min(len,Math.ceil(end)));
 return [start,end];
}
function drawChart(){
 const svg=get("gh-chart-svg");svg.replaceChildren();
 const rows=state.chartRows;if(rows.length<2)return;
 const [start,end]=chartBounds(),show=rows.slice(start,end);
 const vals=show.flatMap(x=>[x.avgHighPrice,x.avgLowPrice]);
 const low=Math.min(...vals),high=Math.max(...vals),span=Math.max(1,high-low);
 const pos=(i,v)=>[32+i/(show.length-1)*628,165-(v-low)/span*135];
 const poly=(key,color)=>{const shape=doc.createElementNS("http://www.w3.org/2000/svg","polyline");shape.setAttribute("points",show.map((x,i)=>pos(i,x[key]).join(",")).join(" "));shape.setAttribute("fill","none");shape.setAttribute("stroke",color);shape.setAttribute("stroke-width","3");shape.setAttribute("stroke-linejoin","round");svg.append(shape)};
 const line=doc.createElementNS("http://www.w3.org/2000/svg","line");line.setAttribute("x1","32");line.setAttribute("y1","165");line.setAttribute("x2","660");line.setAttribute("y2","165");line.setAttribute("stroke","#708163");svg.append(line);
 poly("avgHighPrice","#e5c580");poly("avgLowPrice","#97c8a3");
 txt("gh-chart-status",new Date(show[0].timestamp*1000).toLocaleDateString("en-GB")+" – "+new Date(show.at(-1).timestamp*1000).toLocaleDateString("en-GB")+" · high (gold) / low (green) · "+gp(low)+" to "+gp(high));
}
function zoomChart(e){
 if(!state.chartRows.length)return;
 e.preventDefault();const len=state.chartRows.length,[a,b]=chartBounds(),size=b-a;
 const newSize=Math.max(8,Math.min(len,Math.round(size*(e.deltaY>0?1.25:.8))));
 const r=(e.offsetX/Math.max(1,e.currentTarget.clientWidth))||.5,center=a+size*r;
 const start=Math.max(0,Math.min(len-newSize,Math.round(center-newSize*r)));
 state.chartVisible=[start,start+newSize];drawChart();
}
let drag=null;
function chartStart(e){if(!state.chartRows.length)return;drag={x:e.clientX,range:chartBounds()};e.currentTarget.setPointerCapture?.(e.pointerId)}
function chartEnd(e){
 if(!drag)return;const delta=e.clientX-drag.x,orig=drag.range,len=state.chartRows.length,span=orig[1]-orig[0];
 const shift=Math.round(delta/Math.max(1,e.currentTarget.clientWidth)*span);
 const start=Math.max(0,Math.min(len-span,orig[0]-shift));state.chartVisible=[start,start+span];drag=null;drawChart();
}
if(doc.readyState==="loading")doc.addEventListener("DOMContentLoaded",install,{once:true});else install();
})(window,document);
