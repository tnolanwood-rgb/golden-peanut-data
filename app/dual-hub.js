(function installPrivateDualHub(win,doc){
"use strict";
const VERSION="osrs-research-2.0-2026-11-15";
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
/* Actual official OSRS Mobile / Steam ground-items overlay defaults.
 * This is a *value* colour, not a fixed item rarity. Source:
 * https://oldschool.runescape.wiki/w/Settings#Ground_Items_Overlay
 * Live OSRS Wiki high/low observations do not equal the Jagex GE guide price,
 * so the Hub labels its midpoint-based classification as an estimate. */
const OFFICIAL_OSRS_TIERS=Object.freeze([
 Object.freeze({tier:5,min:10000000,name:"Tier 5 · 10m+ GP",color:"#ff66b2"}),
 Object.freeze({tier:4,min:1000000,name:"Tier 4 · 1m–9,999,999 GP",color:"#ff9600"}),
 Object.freeze({tier:3,min:100000,name:"Tier 3 · 100k–999,999 GP",color:"#99ff99"}),
 Object.freeze({tier:2,min:20000,name:"Tier 2 · 20k–99,999 GP",color:"#66b2ff"}),
 Object.freeze({tier:1,min:0,name:"Tier 1 · under 20k GP",color:"#ffffff"})
]);
function classifyValueTier(price){
 if(!Number.isSafeInteger(price)||price<0)return null;
 return OFFICIAL_OSRS_TIERS.find(t=>price>=t.min)||null;
}
function ideaValueTier(idea){
 const low=idea?.observedBuy,high=idea?.observedSell;
 if(!Number.isSafeInteger(low)||!Number.isSafeInteger(high)||low<=0||high<=0||low>high)return null;
 const midpoint=Math.round(low+(high-low)/2);
 const tier=classifyValueTier(midpoint);
 return tier?{...tier,midpoint}:null;
}
function renderValueTier(idea){
 const heading=get("gh-item-name"),note=get("gh-value-tier");
 if(!heading||!note)return;
 delete heading.dataset.osrsValueTier;
 const t=ideaValueTier(idea);
 note.hidden=!t;
 note.textContent=t?`Ground-item value colour · Tier ${t.tier} · ~${gp(t.midpoint)} observed midpoint`:"";
 if(t)heading.dataset.osrsValueTier=String(t.tier);
}
win.GoldenOSRSValueTiers=Object.freeze({classify:classifyValueTier});
const state={mappingById:new Map(),game:"gw2",budget:100000000,mode:"f2p",restricted:"unknown",records:[],snap:null,ideas:[],index:0,loading:false,builtAt:0,chartOpen:false,chartRange:"7d",chartRows:[],chartVisible:null,lastResult:"",historicalCache:{},stale:false,priceError:null,researchMode:"liquid",valueFloor:100000,search:"",watchOnly:false,watchlist:new Set(),liquidIdeas:[],valueIdeas:[],scanCount:0,positiveSpreads:0};
function loadUser(){
 const c=read(CFG,{});
 state.budget=Number.isSafeInteger(n(c.budget))&&n(c.budget)>=0&&n(c.budget)<=9e12?n(c.budget):1e8;
 state.mode=c.mode==="members"?"members":"f2p";
 state.restricted=c.restricted==="clear"?"clear":"unknown";
 state.index=Number.isSafeInteger(n(c.position))&&n(c.position)>=0?n(c.position):0;
 state.researchMode=c.researchMode==="value"?"value":"liquid";
 state.valueFloor=[100000,1000000,10000000].includes(c.valueFloor)?c.valueFloor:100000;
 state.search=typeof c.search==="string"?c.search.slice(0,80):"";
 state.watchOnly=c.watchOnly===true;
 state.watchlist=new Set(Array.isArray(c.watchlist)?c.watchlist.filter(x=>Number.isSafeInteger(x)&&x>0).slice(0,200):[]);
 const records=read(LEDGER,[]);
 state.records=Array.isArray(records)?records.filter(r=>r&&Number.isSafeInteger(r.id)&&r.id>0&&["buy","sell"].includes(r.side)&&good(r.qty)&&good(r.price)&&Number.isFinite(Date.parse(r.when))).slice(-1000):[];
}
function saveUser(){
 return store(CFG,{budget:state.budget,mode:state.mode,restricted:state.restricted,position:state.index,researchMode:state.researchMode,valueFloor:state.valueFloor,search:state.search,watchOnly:state.watchOnly,watchlist:[...state.watchlist]})&&store(LEDGER,state.records);
}
/* OSRS Wiki mapping contains original in-game inventory-icon filenames. */
function iconUrl(name){
 const file=String(name||'');
 return /^[A-Za-z0-9 _().,'+!-]{2,140}\.(png|gif|webp)$/i.test(file)?
  'https://oldschool.runescape.wiki/images/'+encodeURIComponent(file.replace(/ /g,'_')):'';
}
function decorateGP(id){
 const target=get(id),value=target?.textContent;
 if(!target||!value||value==='—'||!/\d/.test(value))return;
 const icon=el('img');icon.src='https://oldschool.runescape.wiki/images/Coins_10000.png';
 icon.alt='OSRS gold coins';icon.width=22;icon.height=22;icon.loading='lazy';
 icon.referrerPolicy='no-referrer';icon.onerror=()=>{icon.remove()};
 target.replaceChildren(icon,el('span','',value));target.classList.add('gh-coin-amount');
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
 <section class="gh-market-lab" aria-label="OSRS research engine">
   <div class="gh-market-tabs" role="group" aria-label="Trade discovery type">
     <button type="button" id="gh-mode-liquid" aria-pressed="true">Verified liquid flips</button>
     <button type="button" id="gh-mode-value" aria-pressed="false">High-value research</button>
   </div>
   <div class="gh-market-controls">
     <label class="gh-market-search-label" for="gh-market-search">Find a market
       <input id="gh-market-search" type="search" placeholder="Search item names" autocomplete="off" maxlength="80">
     </label>
     <label id="gh-floor-label" for="gh-value-floor">Minimum item value
       <select id="gh-value-floor">
         <option value="100000">100k+ GP</option><option value="1000000">1m+ GP</option><option value="10000000">10m+ GP</option>
       </select>
     </label>
   </div>
   <div class="gh-market-bottom">
     <p id="gh-research-counts" class="gh-market-counts" role="status" aria-live="polite">Waiting for market evidence…</p>
     <label class="gh-watch-filter"><input type="checkbox" id="gh-only-watch"> Watched only</label>
   </div>
 </section>
 <section class="gp-guide-idea" aria-label="Next OSRS trade idea">
  <div class="gh-trade-shell"><div class="gh-trade-scroll">
  <div class="gp-guide-idea-top"><span class="gp-guide-position" id="gh-position">Markets not checked</span><span class="gp-guide-tier" id="gh-risk">Live price research</span></div>
  <div class="gp-guide-item-icon" id="gh-item-icon" aria-hidden="true">▥</div>
  <h2 id="gh-item-name">Checking eligible trades…</h2>
  <p class="gh-value-tier-caption" id="gh-value-tier" hidden></p>
  <p class="gh-research-evidence" id="gh-research-evidence" hidden></p>
  <section id="gh-order-guide" class="gh-order-guide" aria-label="RuneScape Grand Exchange listing references" hidden>
   <h3>What prices should I enter into the GE?</h3>
   <p class="gh-quote-intro">OSRS does not publish a live order book. These are recent <strong>completed transactions</strong> and experimental limit-order targets, not outstanding offers.</p>
   <div class="gh-quote-grid">
    <div><span>Last instant SELL (low)</span><strong id="gh-last-sell">—</strong><small id="gh-last-sell-age"></small></div>
    <div><span>Last instant BUY (high)</span><strong id="gh-last-buy">—</strong><small id="gh-last-buy-age"></small></div>
   </div>
   <div class="gh-quote-targets">
    <div><span>Try listing a BUY at</span><strong id="gh-bid-target">—</strong></div>
    <div><span>Try listing a SELL at</span><strong id="gh-ask-target">—</strong></div>
   </div>
   <p id="gh-quote-margin" class="gh-quote-margin">—</p>
   <p id="gh-quote-meta" class="gh-quote-meta"></p>
   <p id="gh-quote-warning" class="gh-quote-warning"></p>
  </section>
  <div class="gp-guide-instructions">
    <p class="gp-guide-instruction" id="gh-instruction">Price observations are not guaranteed fills.</p>
    <p class="gp-guide-instruction-sub" id="gh-instruction-extra"></p>
  </div>
  <button type="button" id="gh-empty-retry" class="gp-guide-secondary gh-empty-retry" hidden>↻ Retry market check</button>
  <div class="gp-guide-totals">
   <div class="gp-guide-metric"><span class="gp-guide-label" id="gh-margin-label">Potential after-tax margin</span><strong class="gp-guide-number" id="gh-margin">—</strong></div>
   <div class="gp-guide-metric"><span class="gp-guide-label" id="gh-total-label">Illustrative total</span><strong class="gp-guide-number" id="gh-total">—</strong></div>
  </div>
  <p class="gp-guide-caution" id="gh-caution">Market conditions can change before your orders fill.</p>
  <button type="button" id="gh-watch-toggle" class="gp-guide-secondary gh-watch-toggle" hidden aria-pressed="false">☆ Watch market</button>
  </div><div class="gh-action-dock"><div class="gp-guide-controls">
    <button type="button" id="gh-previous" class="gp-guide-secondary" disabled>← Previous</button>
    <button type="button" id="gh-next" class="gp-guide-primary" disabled>Next →</button>
  </div>
  <div class="gh-actions">
    <button id="gh-show-chart" class="gp-guide-light" type="button" disabled>Price chart</button>
    <button id="gh-add-fill" class="gp-guide-light" type="button" disabled>Record a fill</button>
  </div>
  </div></div>
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
    <div class="gh-tier-key" aria-label="OSRS official mobile ground item value colour defaults">
      <strong>OSRS ground-item colour defaults</strong>
      <div class="gh-tier-key-grid">
        <span data-osrs-value-tier="1">White · below 20k</span>
        <span data-osrs-value-tier="2">Blue · 20k+</span>
        <span data-osrs-value-tier="3">Green · 100k+</span>
        <span data-osrs-value-tier="4">Orange · 1m+</span>
        <span data-osrs-value-tier="5">Pink · 10m+</span>
      </div>
      <small>Official mobile/Steam colour thresholds. The Hub estimates the tier from the midpoint of recent observed GE trades, not Jagex's exact guide price. This is not an item rarity.</small>
    </div>
  </div>
 </details>
 <details class="gh-osrs-ledger" id="gh-ledger">
   <summary>My manually recorded OSRS trades</summary>
   <div class="gh-settings-body">
    <p>Keep your actual purchases and completed sales; these figures are not estimates. OSRS trades are saved separately from the GW2 account database.</p>
    <div class="gh-backup-actions"><button type="button" id="gh-export-ledger" class="gp-guide-light">Export OSRS backup</button><button type="button" id="gh-import-ledger" class="gp-guide-light">Import OSRS backup</button></div>
    <input type="file" id="gh-import-file" accept=".json,application/json" hidden>
    <p id="gh-backup-status" class="gh-inline-status" role="status" aria-live="polite"></p>
    <div id="gh-ledger-list" class="gh-ledger-list"></div>
   </div>
 </details>
 <p class="gh-meta">Independent trading research · no automated Grand Exchange orders · no Jagex affiliation.</p>`;
 return h;
}
function install(){
 if(doc.getElementById("gh-game-nav")||!doc.body)return;
 loadUser();
 const nav=el("nav");nav.id="gh-game-nav";nav.setAttribute("aria-label","Select trading game");nav.innerHTML=`<div class="gh-nav-inner" role="tablist" aria-label="Trading game"><button type="button" id="gh-tab-gw2" role="tab" aria-selected="true" aria-controls="gh-panel-gw2">Guild Wars 2</button><button type="button" id="gh-tab-osrs" role="tab" aria-selected="false" aria-controls="gh-panel-osrs">Old School RuneScape</button></div><div class="gh-swipe-hint" aria-hidden="true">← Drag sideways to change games →</div>`;
 const root=el("section");root.id="gh-osrs-root";root.setAttribute("aria-label","The Golden Exchange trading desk");
 const legacyApp=doc.querySelector("body > .app");
 const stage=el("div");stage.id="gh-game-stage";stage.setAttribute("aria-label","Trading game screens");
 const gwPanel=el("div","gh-game-panel"),osrsPanel=el("div","gh-game-panel");
 gwPanel.id="gh-panel-gw2";osrsPanel.id="gh-panel-osrs";
 osrsPanel.hidden=true;
 if(legacyApp){legacyApp.before(nav,stage);gwPanel.append(legacyApp);}
 else doc.body.prepend(nav,stage);
 osrsPanel.append(root);stage.append(gwPanel,osrsPanel);
 get("gh-tab-gw2").addEventListener("click",()=>switchGame("gw2",true));
 get("gh-tab-osrs").addEventListener("click",()=>switchGame("osrs",true));
 // Pointer Events + touch-action:pan-y preserve native vertical scrolling,
 // while horizontal movement directly tracks the finger (not a post-swipe GIF).
 doc.addEventListener("pointerdown",startGesture,{passive:true,capture:true});
 doc.addEventListener("pointermove",moveGesture,{passive:false,capture:true});
 doc.addEventListener("pointerup",endGesture,{passive:true,capture:true});
 doc.addEventListener("pointercancel",cancelGesture,{passive:true,capture:true});
 doc.addEventListener("click",guardDragClick,true);
 win.addEventListener("resize",cancelOnResize,{passive:true});
 doc.addEventListener("visibilitychange",()=>{if(doc.hidden)cancelOnResize()});
 win.addEventListener("pageshow",()=>{if(state.game==="osrs")render()});
 win.GoldenDualHub={version:VERSION,switchGame:(game)=>switchGame(game,true),diagnostics:()=>({
  game:state.game,osrsPriceTimestamp:state.builtAt,ideas:state.ideas.length,ledgerRows:state.records.length,loading:state.loading,stale:state.stale,priceError:state.priceError,researchMode:state.researchMode,liquidCount:state.liquidIdeas.length,valueCount:state.valueIdeas.length,scanCount:state.scanCount,positiveSpreads:state.positiveSpreads,
  dragging:!!gesture?.scene,dragOffset:gesture?.scene?.offset??0,transitioning
 })};
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
 get("gh-market-search").value=state.search;
 get("gh-value-floor").value=String(state.valueFloor);
 get("gh-only-watch").checked=state.watchOnly;
 get("gh-mode-liquid").addEventListener("click",()=>chooseResearchMode("liquid"));
 get("gh-mode-value").addEventListener("click",()=>chooseResearchMode("value"));
 get("gh-market-search").addEventListener("input",event=>{
  state.search=String(event.target.value||"").toLocaleLowerCase().trim().slice(0,80);
  state.index=0;applyIdeasView();render();
 });
 get("gh-value-floor").addEventListener("change",event=>{
  const floor=Number(event.target.value);
  if(![100000,1000000,10000000].includes(floor))return;
  state.valueFloor=floor;state.index=0;applyIdeasView();saveUser();render();
 });
 get("gh-only-watch").addEventListener("change",event=>{
  state.watchOnly=event.target.checked;state.index=0;applyIdeasView();saveUser();render();
 });
 get("gh-watch-toggle").addEventListener("click",toggleMarketWatch);
 get("gh-empty-retry").addEventListener("click",()=>refresh(true));
 get("gh-settings-toggle").addEventListener("click",()=>{const x=get("gh-settings");x.open=!x.open;if(x.open)x.scrollIntoView({block:"nearest",behavior:"smooth"})});
 get("gh-apply").addEventListener("click",applySettings);
 get("gh-previous").addEventListener("click",()=>navigate(-1));
 get("gh-next").addEventListener("click",()=>navigate(1));
 get("gh-show-chart").addEventListener("click",()=>{
  const current=state.ideas[state.index],meta=state.mappingById.get(current?.id);
  if(current&&win.GoldenOSRSChart?.open){
   win.GoldenOSRSChart.open({id:current.id,name:current.name,icon:meta?.icon,
    valueTier:ideaValueTier(current)?.tier});return
  }
  get("gh-chart").hidden=!get("gh-chart").hidden;state.chartOpen=!get("gh-chart").hidden;if(state.chartOpen)loadChart();
 });
 for(const b of root.querySelectorAll("[data-gh-range]"))b.addEventListener("click",()=>{state.chartRange=b.dataset.ghRange;state.chartVisible=null;loadChart()});
 get("gh-chart-reset").addEventListener("click",()=>{state.chartVisible=null;drawChart()});
 get("gh-add-fill").addEventListener("click",toggleFill);
 get("gh-cancel-fill").addEventListener("click",()=>get("gh-fill-form").hidden=true);
 get("gh-fill-form").addEventListener("submit",recordFill);
 get("gh-export-ledger").addEventListener("click",exportOsrsBackup);
 get("gh-import-ledger").addEventListener("click",()=>get("gh-import-file").click());
 get("gh-import-file").addEventListener("change",importOsrsBackup);
 get("gh-chart-svg").addEventListener("wheel",zoomChart,{passive:false});
 get("gh-chart-svg").addEventListener("pointerdown",chartStart);
 get("gh-chart-svg").addEventListener("pointerup",chartEnd);

}
/* Two-page interactive swipe controller.
 * Every pointer move directly positions both sheets. The last few pixels use
 * a settling animation; never start a full-screen animation on finger lift.
 * OSRS/W2 content and storage are never unmounted or recreated on each drag.
 */
let transitioning=false,gesture=null,activeAnimation=null,ignoreClickBefore=0;
const scrollPositions={gw2:0,osrs:0};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function setPanelAccess(game){
 for(const id of ["gw2","osrs"]){
  const panel=get("gh-panel-"+id),active=id===game;
  if(!panel)continue;
  panel.inert=!active;
  panel.setAttribute("aria-hidden",active?"false":"true");
 }
}
function setActiveGame(game){
 state.game=game;
 doc.body.classList.toggle("gh-show-osrs",game==="osrs");
 for(const id of ["gw2","osrs"])get("gh-tab-"+id).setAttribute("aria-selected",String(id===game));
 store(LAST_GAME,game);
}
function ensureGameReady(next){
 if(next==="osrs"){
  activateOsrs();
  if(!state.snap&&!state.loading)void refresh(false);
 }
}
function createScene(from,next){
 const stage=get("gh-game-stage"),out=get("gh-panel-"+from),incoming=get("gh-panel-"+next);
 if(!stage||!out||!incoming)return null;
 ensureGameReady(next);
 // The receiving panel is prepared off-screen before the first drag frame.
 const width=Math.max(1,stage.getBoundingClientRect().width);
 const height=Math.max(1,out.getBoundingClientRect().height);
 const direction=next==="osrs"?1:-1; // destination starts right (OSRS) or left (GW2).
 incoming.hidden=false;
 stage.style.height=height+"px";
 stage.classList.add("gh-stage-moving");
 incoming.inert=true;incoming.setAttribute("aria-hidden","true");
 const scene={stage,out,incoming,from,next,width,direction,offset:0};
 moveScene(scene,0);
 return scene;
}
function moveScene(scene,offset){
 const dx=clamp(offset,-scene.width,scene.width);
 scene.offset=dx;
 scene.out.style.transform="translate3d("+dx+"px,0,0)";
 scene.incoming.style.transform="translate3d("+(scene.direction*scene.width+dx)+"px,0,0)";
}
function finishScene(scene,commit){
 if(!scene||scene.closed)return;
 scene.closed=true;
 if(activeAnimation?.scene===scene){
  const {a,b,height}=activeAnimation;activeAnimation=null;
  // Clear compositor fill-forwards before removing the drag transforms.
  try{a.cancel();b.cancel();height?.cancel();}catch{}
 }
 const next=commit?scene.next:scene.from;
 scene.out.style.transform="";scene.incoming.style.transform="";
 scene.stage.style.height="";scene.stage.classList.remove("gh-stage-moving");
 scene.out.hidden=next!==scene.from;
 scene.incoming.hidden=next!==scene.next;
 setActiveGame(next);
 setPanelAccess(next);
 transitioning=false;activeAnimation=null;
 if(commit){
  // Preserve each game's document scroll instead of losing the user's place.
  win.scrollTo({top:scrollPositions[next]||0,behavior:"instant"});
 }
}
/* Critically damped easing for the release only. Finger tracking remains 1:1.
 * A short eased tail prevents the sudden speed change and hard stop caused
 * by the old 140–320ms ease-out. Motion does not overshoot or bounce.
 * Native Web Animations keep the page transforms on the compositor. */
function settleScene(scene,commit,releaseVelocity=0){
 if(!scene)return;
 transitioning=true;
 const finalX=commit?-scene.direction*scene.width:0;
 const fromX=scene.offset,delta=finalX-fromX,distance=Math.abs(delta);
 const reduced=win.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
 if(reduced||distance<1||!scene.out.animate){moveScene(scene,finalX);finishScene(scene,commit);return;}
 // A slightly longer, more gently damped release preserves direct 1:1
 // finger tracking and lets the final movement arrive without a hard stop.
 const duration=clamp(Math.round(390+260*distance/scene.width),390,650);
 const k=5.35,steps=48;
 const vToward=Math.max(0,Math.sign(delta)*clamp(releaseVelocity,-1.3,1.3));
 const velocityFactor=clamp(vToward*duration/Math.max(distance,1),0,1.0);
 const spring=t=>1-(1+k*t)*Math.exp(-k*t)+velocityFactor*t*Math.exp(-k*t);
 const end=spring(1);
 const framesOut=[],framesIn=[],framesHeight=[];
 const oldHeight=Math.max(1,scene.stage.getBoundingClientRect().height);
 // The next panel is already present and off-screen, so its height can be
 // measured without showing it. Smooth the document height as well as X.
 const nextHeight=Math.max(1,scene.incoming.scrollHeight);
 for(let i=0;i<=steps;i++){
  const t=i/steps,p=i===steps?1:clamp(spring(t)/end,0,1);
  const dx=fromX+delta*p;
  framesOut.push({offset:t,transform:"translate3d("+dx+"px,0,0)"});
  framesIn.push({offset:t,transform:"translate3d("+(scene.direction*scene.width+dx)+"px,0,0)"});
  framesHeight.push({offset:t,height:(oldHeight+(nextHeight-oldHeight)*p)+"px"});
 }
 const options={duration,easing:"linear",fill:"both"};
 const a=scene.out.animate(framesOut,options);
 const b=scene.incoming.animate(framesIn,options);
 const height=scene.stage.animate(framesHeight,options);
 activeAnimation={a,b,height,scene,duration};
 Promise.all([a.finished,b.finished,height.finished])
  .then(()=>finishScene(scene,commit),()=>finishScene(scene,commit));
}
function switchGame(game,userAction){
 const next=game==="osrs"?"osrs":"gw2";
 if(transitioning||gesture||((userAction===true)&&state.game===next))return;
 const from=state.game;
 if(!userAction||next===from){
  ensureGameReady(next);
  for(const id of ["gw2","osrs"]){const p=get("gh-panel-"+id);if(p)p.hidden=id!==next;}
  setActiveGame(next);setPanelAccess(next);
  if(next==="osrs")render();
  if(next==="osrs")win.__gpReleaseBoot?.();
  return;
 }
 scrollPositions[from]=win.scrollY||0;
 const scene=createScene(from,next);
 if(!scene)return;
 // Standard tab buttons use the same adjacent-page movement, but start from 0.
 // Touch dragging instead updates the position continuously before release.
 setActiveGame(next);
 settleScene(scene,true);
}
function startGesture(ev){
 if(transitioning||gesture||!ev.isPrimary||!["touch","pen"].includes(ev.pointerType)||doc.querySelector("dialog[open]"))return;
 const node=ev.target?.nodeType===1?ev.target:ev.target?.parentElement;
 if(!node?.closest||!node.closest("#gh-game-stage,#gh-game-nav"))return;
 // Avoid hijacking text editing, charts, slider scrubbing and pinch interactions.
 // Buttons/cards/summary text are swipeable, but their click is cancelled after
 // a real horizontal drag. This drastically expands the responsive touch area.
 if(node.closest("input,textarea,select,svg,canvas,video,iframe,[contenteditable],[role=slider],.gp-price-plot,.gh-chart-card,[data-no-game-swipe]"))return;
 const now=win.performance.now();
 gesture={pointerId:ev.pointerId,startX:ev.clientX,startY:ev.clientY,lastX:ev.clientX,
  lastTime:now,sampleX:ev.clientX,sampleTime:now,from:state.game,scene:null};
}
function moveGesture(ev){
 const g=gesture;
 if(!g||ev.pointerId!==g.pointerId)return;
 const dx=ev.clientX-g.startX,dy=ev.clientY-g.startY;
 if(!g.scene){
  if(Math.abs(dy)>10&&Math.abs(dy)>Math.abs(dx)*1.15){gesture=null;return;}
  if(Math.abs(dx)<9||Math.abs(dx)<Math.abs(dy)*1.2)return;
  if((dx<0&&g.from!=="gw2")||(dx>0&&g.from!=="osrs")){gesture=null;return;}
  const next=g.from==="gw2"?"osrs":"gw2";
  scrollPositions[g.from]=win.scrollY||0;
  g.scene=createScene(g.from,next);
  if(!g.scene){gesture=null;return;}
  // Capture after the receiving page is mounted, as specified by Pointer Events.
  try{g.scene.stage.setPointerCapture?.(ev.pointerId);}catch{}
 }
 const now=win.performance.now();
 if(now-g.sampleTime>70){g.sampleX=g.lastX;g.sampleTime=g.lastTime;}
 g.lastX=ev.clientX;g.lastTime=now;
 moveScene(g.scene,dx);
 if(ev.cancelable)ev.preventDefault();
}
function endGesture(ev){
 const g=gesture;if(!g||ev.pointerId!==g.pointerId)return;
 gesture=null;
 if(!g.scene)return;
 // An interrupted or reversed drag can return the original page.
 const dx=clamp(ev.clientX-g.startX,-g.scene.width,g.scene.width);
 moveScene(g.scene,dx);
 const elapsed=Math.max(1,win.performance.now()-g.sampleTime);
 const speed=(ev.clientX-g.sampleX)/elapsed;
 const towardNew=(dx<0&&g.from==="gw2")||(dx>0&&g.from==="osrs");
 const commit=towardNew&&(Math.abs(dx)>g.scene.width*.32||
  (Math.abs(dx)>48&&Math.sign(speed)===Math.sign(dx)&&Math.abs(speed)>.65));
 ignoreClickBefore=Date.now()+350;
 settleScene(g.scene,commit,speed);
}
function cancelGesture(ev){
 const g=gesture;
 if(!g||(ev&&ev.pointerId!==g.pointerId))return;
 gesture=null;
 if(g.scene)settleScene(g.scene,false);
}
function cancelOnResize(){
 if(gesture){const g=gesture;gesture=null;if(g.scene){moveScene(g.scene,0);finishScene(g.scene,false);}}
 if(activeAnimation){
  const {a,b,height,scene}=activeAnimation;activeAnimation=null;
  // Cancelling animations rejects .finished; guard the stale callback.
  try{a.cancel();b.cancel();height?.cancel();}catch{}
  finishScene(scene,state.game===scene.next);
 }
}
function guardDragClick(event){
 if(Date.now()>ignoreClickBefore||event.detail===0)return;
 const node=event.target?.nodeType===1?event.target:event.target?.parentElement;
 if(!node?.closest?.("#gh-game-stage,#gh-game-nav"))return;
 ignoreClickBefore=0;
 event.preventDefault();event.stopImmediatePropagation();
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
  const mergedCache=cacheLoad();mergedCache[route]={data:fresh,at:Date.now()};
  if(!store(CACHE,mergedCache)&&route==="mapping"){/* No persistence is acceptable when device storage is full. */}
  return {data:fresh,at:Date.now(),stale:false};
 }catch(err){
  if(rec&&age>=0&&age<86400000&&validate(route,rec.data))return {data:rec.data,at:rec.at,stale:true,error:String(err.message)};
  throw err;
 }
}
async function refresh(force){
 if(state.loading)return;
 state.loading=true;
 state.priceError=null;
 txt("gh-status","Checking RuneScape Wiki price observations…");
 if(get("gh-refresh"))get("gh-refresh").disabled=true;
 if(get("gh-empty-retry"))get("gh-empty-retry").hidden=true;
 render();
 try{
  const result=await Promise.all([
   getPrices("mapping",86400000,force),
   getPrices("latest",60000,force),
   getPrices("5m",300000,force),
   getPrices("1h",3600000,force)
  ]);
  state.snap={mapping:result[0].data,latest:result[1].data,five:result[2].data,hour:result[3].data};
  state.mappingById=new Map(state.snap.mapping.map(row=>[row.id,row]));
  state.stale=result.some(x=>x.stale);
  state.builtAt=Date.now();
  buildIdeas();
  txt("gh-status",(state.stale?
   "Some API requests failed; using cached market observations. No new recommendations until every feed is verified · ":
   "Price evidence checked · ")+
   new Date(state.builtAt).toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit"})+
   " · "+state.ideas.length+" eligible candidates");
 }catch(err){
  // Don't leave the card stuck in the loading state when even one endpoint
  // fails. Never manufacture trades from missing or unverified observations.
  state.priceError=safe(err?.message||"Network request failed");
  state.stale=true;
  state.ideas=[];
  txt("gh-status","RuneScape Wiki market feed unavailable: "+state.priceError+
   ". Check connection, or retry the price check.");
 }finally{
  // IMPORTANT: render only AFTER clearing the loading flag. Previously the
  // card was painted while loading=true and never painted again on empty
  // results, giving a permanent "Checking markets…" screen.
  state.loading=false;
  if(get("gh-refresh"))get("gh-refresh").disabled=false;
  render();
 }
}
/* Explore all markets once from the Wiki bulk endpoints.
 * Liquid mode is the unchanged cautious execution screen. Value mode is
 * explicitly observational research: thin/stale/members/out-of-budget items
 * remain visible with warnings, not falsely promoted to actionable fills. */
function chooseResearchMode(next){
 if(next!=="liquid"&&next!=="value")return;
 state.researchMode=next;state.index=0;state.watchOnly=false;
 const only=get("gh-only-watch");if(only)only.checked=false;
 applyIdeasView();saveUser();render();
}
function toggleMarketWatch(){
 const idea=state.ideas[state.index];if(!idea)return;
 if(state.watchlist.has(idea.id))state.watchlist.delete(idea.id);
 else if(state.watchlist.size<200)state.watchlist.add(idea.id);
 else{txt("gh-status","Watchlist full (200 markets). Unwatch another before adding this one.");return;}
 saveUser();applyIdeasView();render();
}
function applyIdeasView(){
 const base=state.researchMode==="value"?state.valueIdeas:state.liquidIdeas;
 const query=state.search.toLocaleLowerCase();
 state.ideas=base.filter(x=>(!query||x.name.toLocaleLowerCase().includes(query))&&
  (!state.watchOnly||state.watchlist.has(x.id))&&
  (state.researchMode!=="value"||Math.round((x.observedBuy+x.observedSell)/2)>=state.valueFloor));
 state.index=Math.min(state.index,Math.max(0,state.ideas.length-1));
}
function researchScore(age,flow,drift,stress){
 // Evidence quality is a transparent ranking score, NEVER fill probability.
 const freshness=clamp(1-age/86400,0,1);
 const liquidity=clamp(Math.log10(1+Math.max(0,flow))/Math.log10(101),0,1);
 const stability=Number.isFinite(drift)?clamp(1-drift/0.4,0,1):0;
 return Math.round(100*(0.35*freshness+0.35*liquidity+0.2*stability+0.1*(stress>0?1:0)));
}
function buildIdeas(){
 state.liquidIdeas=[];state.valueIdeas=[];state.scanCount=0;state.positiveSpreads=0;
 if(!state.snap){applyIdeasView();return;}
 const now=Date.now()/1000,s=state.snap,latest=s.latest.data||{},five=s.five.data||{},hour=s.hour.data||{};
 const hourFresh=n(s.hour.timestamp)<=now+60&&n(s.hour.timestamp)>=now-10800;
 const fiveFresh=n(s.five.timestamp)<=now+60&&n(s.five.timestamp)>=now-1200;
 if(!hourFresh||!fiveFresh||state.stale){applyIdeasView();return;}
 const liquid=[],value=[];
 for(const m of s.mapping){
  // Bonds require conversion/re-tradeability handling missing in normal GE math.
  if(String(m.name).toLowerCase()==="old school bond")continue;
  const p=latest[m.id],f=five[m.id],h=hour[m.id],limit=n(m.limit);
  if(!p)continue;
  const buy=n(p.low),sell=n(p.high);
  if(!good(buy)||!good(sell)||!Number.isSafeInteger(buy)||!Number.isSafeInteger(sell)||buy>=sell)continue;
  state.scanCount++;
  const age=Math.max(now-n(p.lowTime),now-n(p.highTime));
  if(!Number.isFinite(age)||age<0)continue;
  const observedProfit=sell-buy-tax(sell,m.name);
  if(observedProfit<=0||!Number.isSafeInteger(observedProfit))continue;
  state.positiveSpreads++;
  const cap=good(limit)?Math.floor(limit):0;
  const lowVol=n(h?.lowPriceVolume),highVol=n(h?.highPriceVolume);
  const flow=Number.isFinite(lowVol)&&Number.isFinite(highVol)?Math.max(0,Math.min(lowVol,highVol)):0;
  const hBuy=n(h?.avgLowPrice),hSell=n(h?.avgHighPrice);
  const drift=good(hBuy)&&good(hSell)?
   Math.max(Math.abs(hBuy-buy)/buy,Math.abs(hSell-sell)/sell):Infinity;
  const stressSell=Math.max(1,sell-Math.ceil(sell*.02));
  const stressProfit=stressSell-buy-tax(stressSell,m.name);
  const evidence=researchScore(age,flow,drift,stressProfit);
  const affordable=Math.floor(state.budget/buy);
  // High-value discovery doesn't assume the displayed ask/bid prices are
  // executable concurrently. Price age or sparse volume means elevated risk.
  // Allow out-of-budget and members markets for *research*, not a buy signal.
  if(age<=86400 && Math.round((buy+sell)/2)>=100000){
   const warnings=[];
   if(m.members&&state.mode==="f2p")warnings.push("Members item — F2P account cannot buy");
   if(buy>state.budget)warnings.push("More capital needed for one unit");
   if(age>7200)warnings.push("Last observed trade older than two hours");
   if(flow<50)warnings.push("Thin market: fewer than 50 two-way hourly trades");
   if(!Number.isFinite(drift)||drift>.3)warnings.push("Price disagrees with hourly averages");
   if(stressProfit<=0)warnings.push("A 2% lower sale price erases the spread");
   if(!cap)warnings.push("GE purchase limit not verified");
   const candidate={
    id:m.id,name:m.name,members:!!m.members,buy,sell,observedBuy:buy,observedSell:sell,
    profit:observedProfit,spread:observedProfit/buy,qty:Math.max(0,Math.min(cap||1,affordable)),
    limit:cap,flow,age,drift,stressedMargin:stressProfit,total:0,
    evidence,research:true,warnings,
    capitalGap:Math.max(0,buy-state.budget),
    score:evidence*.75+Math.log10(1+observedProfit)*5
   };
   value.push(candidate);
  }
  // Verified/liquid mode retains the established strict screening rules.
  if(state.mode==="f2p"&&m.members)continue;
  if(state.mode==="f2p"&&state.restricted!=="clear"&&RESTRICTED.has(m.name))continue;
  if(!f||!h||!good(cap)||buy>state.budget||age>7200)continue;
  if(!Number.isFinite(flow)||flow<50)continue;
  const recentFlow=Math.min(n(f.lowPriceVolume),n(f.highPriceVolume));
  if(!Number.isFinite(recentFlow)||recentFlow<1)continue;
  const refBuy=Math.ceil(Math.max(buy,hBuy,n(f.avgLowPrice)));
  const refSell=Math.floor(Math.min(sell,hSell,n(f.avgHighPrice)));
  if(!good(refBuy)||!good(refSell)||refBuy>=refSell)continue;
  const profit=refSell-refBuy-tax(refSell,m.name),spread=profit/refBuy;
  if(profit<=0||spread>=.4||spread<=0)continue;
  const currentDrift=Math.max(Math.abs(refBuy-buy)/buy,Math.abs(refSell-sell)/sell);
  if(currentDrift>.3)continue;
  const qty=Math.min(cap,Math.max(0,Math.floor(flow*.04)),Math.floor(state.budget/refBuy));
  if(!Number.isSafeInteger(qty)||qty<1||!Number.isSafeInteger(qty*refBuy))continue;
  const stressedSell=Math.max(1,refSell-Math.ceil(refSell*.02));
  const stressedMargin=stressedSell-refBuy-tax(stressedSell,m.name);
  const reliability=(age>3600?.7:1)*(currentDrift>.1?.75:1)*(stressedMargin>0?1:.5);
  liquid.push({id:m.id,name:m.name,members:!!m.members,buy:refBuy,sell:refSell,
   observedBuy:buy,observedSell:sell,profit,spread,qty,limit:cap,flow,age,drift:currentDrift,
   stressedMargin,total:qty*profit,score:qty*profit*reliability,
   evidence:researchScore(age,flow,currentDrift,stressedMargin),research:false,warnings:[]});
 }
 liquid.sort((a,b)=>b.score-a.score||a.id-b.id);
 value.sort((a,b)=>b.score-a.score||b.profit-a.profit||a.id-b.id);
 state.liquidIdeas=liquid.slice(0,80);
 state.valueIdeas=value.slice(0,500);
 applyIdeasView();
}
/* OSRS Wiki latest HIGH = a completed instant BUY, LOW = a completed
 * instant SELL. Neither is the currently open best bid or ask. We expose
 * their timestamps and trial limit prices, never invent a live order book. */
function listingGuide(idea){
 if(!idea||!state.snap)return null;
 const p=state.snap.latest?.data?.[idea.id],f=state.snap.five?.data?.[idea.id],
  h=state.snap.hour?.data?.[idea.id];
 const low=Number(p?.low),high=Number(p?.high),lowTime=Number(p?.lowTime),
  highTime=Number(p?.highTime),now=Math.floor(Date.now()/1000);
 if(!Number.isSafeInteger(low)||!Number.isSafeInteger(high)||low<=0||high<=low||
   !Number.isSafeInteger(lowTime)||!Number.isSafeInteger(highTime)||
   lowTime>now+60||highTime>now+60)return null;
 const lowAge=now-lowTime,highAge=now-highTime,spread=high-low;
 // One-GP price improvement is a *trial* to queue ahead of the last
 // observed execution anchors. It does not reveal queue depth or guarantee fills.
 const bid=low+1,ask=high-1;
 const margin=ask-bid-tax(ask,idea.name);
 const viable=Number.isSafeInteger(margin)&&bid<ask&&margin>0;
 const flow=Math.max(0,Math.min(Number(h?.lowPriceVolume)||0,Number(h?.highPriceVolume)||0));
 const fiveLow=Number(f?.avgLowPrice),fiveHigh=Number(f?.avgHighPrice),
  hourLow=Number(h?.avgLowPrice),hourHigh=Number(h?.avgHighPrice);
 const ages=[lowAge,highAge];
 const warn=[];
 if(Math.max(...ages)>900)warn.push('At least one last-trade price is over 15 minutes old');
 if(flow<50)warn.push('Low two-way volume: limit orders could take a long time');
 if(Number.isFinite(hourLow)&&hourLow>0&&Math.abs(low-hourLow)/hourLow>.15||
    Number.isFinite(hourHigh)&&hourHigh>0&&Math.abs(high-hourHigh)/hourHigh>.15)
  warn.push('Latest executions differ notably from hourly averages');
 if(!viable)warn.push('One-GP inside-spread offers do not produce a positive after-tax margin');
 if(idea.members&&state.mode==="f2p")warn.push('Members-only item; cannot trade on F2P');
 if(bid>state.budget)warn.push('Buy listing exceeds your entered cash budget');
 return {low,high,lowAge,highAge,bid:viable?bid:null,ask:viable?ask:null,
  margin:viable?margin:null,flow,warn,
  fiveLow:Number.isFinite(fiveLow)?fiveLow:null,fiveHigh:Number.isFinite(fiveHigh)?fiveHigh:null,
  hourLow:Number.isFinite(hourLow)?hourLow:null,hourHigh:Number.isFinite(hourHigh)?hourHigh:null};
}
function renderListingGuide(idea){
 const section=get('gh-order-guide');
 if(!section)return;
 const quote=listingGuide(idea);
 section.hidden=!quote;
 if(!quote)return;
 txt('gh-last-sell',gp(quote.low));txt('gh-last-buy',gp(quote.high));
 txt('gh-last-sell-age',Math.max(0,Math.round(quote.lowAge/60))+' min ago · completed seller-initiated trade');
 txt('gh-last-buy-age',Math.max(0,Math.round(quote.highAge/60))+' min ago · completed buyer-initiated trade');
 txt('gh-bid-target',quote.bid===null?'No prudent target':gp(quote.bid));
 txt('gh-ask-target',quote.ask===null?'No prudent target':gp(quote.ask));
 txt('gh-quote-margin',quote.margin===null?'No positive after-tax trial spread':
  'Illustrative net per unit, if BOTH offers fill: '+gp(quote.margin));
 const pair=(a,b)=>Number.isFinite(a)&&Number.isFinite(b)?gp(a)+' low / '+gp(b)+' high':'not recorded';
 txt('gh-quote-meta','5-minute averages: '+pair(quote.fiveLow,quote.fiveHigh)+
  ' · 1-hour averages: '+pair(quote.hourLow,quote.hourHigh)+
  ' · hourly two-way volume '+quote.flow.toLocaleString('en-GB')+
  ' · GE tax '+(quote.ask===null?'—':gp(tax(quote.ask,idea.name))));
 txt('gh-quote-warning',(quote.warn.length?quote.warn.join(' · ')+' · ':'')+
  'Prices are historical completed trades, NOT open listings. Suggested limits are one GP inside the recorded spread, not proven best bids/asks or fill predictions. Test small and adjust from your actual fills.');
}
function validateOsrsRows(raw){
 if(!Array.isArray(raw)||raw.length>1000)throw Error("Backup contains too many trade records");
 const seen=new Set(),out=[],lots=new Map();
 for(const record of raw){
  const id=record?.id,side=record?.side,qty=record?.qty,price=record?.price,when=record?.when;
  if(!Number.isSafeInteger(id)||id<=0||!["buy","sell"].includes(side)||
   !Number.isSafeInteger(qty)||qty<=0||!Number.isSafeInteger(price)||price<=0||
   !Number.isSafeInteger(qty*price)||qty*price>9e12||
   typeof when!=="string"||when.length>50||!Number.isFinite(Date.parse(when))||
   Date.parse(when)>Date.now()+3600000||typeof record?.name!=="string"||
   record.name.length<1||record.name.length>170)throw Error("Invalid trade row in backup");
  const key=[id,side,qty,price,when].join("|");
  if(seen.has(key))continue;
  seen.add(key);
  out.push({id,side,qty,price,when,name:record.name});
 }
 out.sort((a,b)=>Date.parse(a.when)-Date.parse(b.when));
 for(const trade of out){
  const stack=lots.get(trade.id)||[];
  if(trade.side==="buy"){stack.push({qty:trade.qty,price:trade.price});trade.gain=null}
  else{
   let remaining=trade.qty,cost=0;
   while(remaining>0&&stack.length){
    const lot=stack[0],matched=Math.min(remaining,lot.qty);
    cost+=matched*lot.price;remaining-=matched;lot.qty-=matched;
    if(!lot.qty)stack.shift();
   }
   if(remaining>0)throw Error("Backup contains a sale without earlier recorded purchases");
   trade.gain=trade.qty*trade.price-cost-trade.qty*tax(trade.price,trade.name);
   if(!Number.isSafeInteger(trade.gain))throw Error("Backup realised profit exceeds safe numeric limits");
  }
  lots.set(trade.id,stack);
 }
 return out;
}
function exportOsrsBackup(){
 try{
  const body={format:"golden-hub-osrs-v1",exportedAt:new Date().toISOString(),
   config:{budget:state.budget,mode:state.mode,restricted:state.restricted},
   records:state.records};
  const blob=new Blob([JSON.stringify(body,null,2)],{type:"application/json"});
  const url=URL.createObjectURL(blob),link=el("a");
  link.href=url;link.download="Golden-Hub-OSRS-"+new Date().toISOString().slice(0,10)+".json";
  doc.body.append(link);link.click();link.remove();
  win.setTimeout(()=>URL.revokeObjectURL(url),12000);
  txt("gh-backup-status","Backup prepared for download: "+state.records.length+" trade records.");
 }catch(e){txt("gh-backup-status","Backup export failed: "+safe(e.message));}
}
async function importOsrsBackup(event){
 const file=event.target.files?.[0];event.target.value="";
 if(!file)return;
 try{
  if(file.size>3000000)throw Error("OSRS backup is too large (3MB limit)");
  const data=JSON.parse(await file.text());
  if(data?.format!=="golden-hub-osrs-v1")throw Error("Unsupported backup format. This importer accepts Golden Hub OSRS backups; the original Golden Exchange v4 format needs separate migration.");
  const valid=validateOsrsRows(data.records);
  const keys=new Set(state.records.map(r=>[r.id,r.side,r.qty,r.price,r.when].join("|")));
  const additions=valid.filter(r=>!keys.has([r.id,r.side,r.qty,r.price,r.when].join("|")));
  const merged=validateOsrsRows([...state.records,...additions]);
  if(!additions.length){txt("gh-backup-status","Nothing new to import; all trades are already here.");return}
  if(!win.confirm("Add "+additions.length+" OSRS records to this device? Existing GW2 history will not be touched."))return;
  const previous=state.records;state.records=merged;
  if(!saveUser()){state.records=previous;throw Error("Device storage refused the import; previous records retained")}
  txt("gh-backup-status","Imported "+additions.length+" OSRS records. Existing records preserved.");
  render();
 }catch(e){txt("gh-backup-status","Import not applied: "+safe(e.message));}
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
 get("gh-mode-liquid").setAttribute("aria-pressed",String(state.researchMode==="liquid"));
 get("gh-mode-value").setAttribute("aria-pressed",String(state.researchMode==="value"));
 get("gh-floor-label").hidden=state.researchMode!=="value";
 txt("gh-research-counts",state.loading?"Scanning price and volume evidence…":
  state.priceError?"Market feed unavailable · retry below":
  state.stale?"Unverified cache · retry for fresh observations":
  state.snap?state.liquidIdeas.length+" liquid ideas · "+state.valueIdeas.length+
   " higher-value markets · "+state.positiveSpreads.toLocaleString("en-GB")+" positive observed spreads":
  "Markets not yet checked");
 const note=get("gh-research-evidence");if(note)note.hidden=true;
 const watch=get("gh-watch-toggle");if(watch)watch.hidden=!current;
 txt("gh-total-label",state.researchMode==="value"?"Capital needed for one unit":"Illustrative total");
 txt("gh-margin-label",state.researchMode==="value"?"Observed after-tax spread per unit":"Potential after-tax margin");
 renderValueTier(current);
 renderListingGuide(current);
 if(!current){
  const failure=!!state.priceError,uncertain=!!state.stale;
  txt("gh-position",state.loading?"Checking market evidence":
    failure?"Market feed error":
    uncertain?"Market evidence not verified":
    state.snap?"0 eligible verified candidates":"Market prices not checked");
  txt("gh-item-name",state.loading?"Checking markets…":
    failure?"Market feed unavailable":
    uncertain?"Market prices need verification":
    state.snap?(state.researchMode==="value"?"No matching high-value markets":"No trades meet the safety checks right now"):"Market prices not loaded");
  txt("gh-risk",state.loading?"Checking":failure?"Unavailable":uncertain?"Stale data":"No qualifying trades");
  txt("gh-instruction",state.loading?"Fetching prices and observed volume…":
    failure?"The RuneScape Wiki feed could not be verified.":
    uncertain?"Cached observations are not reliable enough for new trade advice.":
    state.snap?(state.researchMode==="value"?"No price pairs match your value floor, watchlist and search filters.":"No opportunities currently pass the price, volume and risk filters."):"Use Retry market check to load today's prices.");
  txt("gh-instruction-extra",state.loading?"":
    failure?"Details: "+state.priceError+" · Retry below when you're connected.":
    uncertain?"Retry to verify fresh prices before placing an order.":
    state.snap?(state.researchMode==="value"?"Try a lower value threshold, clear search, or disable Watched only.":"Switch to High-value research to inspect less liquid markets, or adjust your account settings."):"Your recorded trades and GW2 account data remain saved.");
  txt("gh-margin","—");txt("gh-total","—");
  txt("gh-caution",state.loading?"Checking current market evidence…":
    "No eligible trade has been verified. The app will not invent prices or profit forecasts.");
  const icon=get("gh-item-icon");if(icon)icon.textContent="▥";
  get("gh-previous").disabled=true;get("gh-next").disabled=true;
  get("gh-show-chart").disabled=true;get("gh-add-fill").disabled=true;
  const retry=get("gh-empty-retry");if(retry)retry.hidden=state.loading;
 }else{
  const retry=get("gh-empty-retry");if(retry)retry.hidden=true;
  txt("gh-position",(current.research?"Research market ":"Trade idea ")+(state.index+1)+" of "+state.ideas.length);
  txt("gh-item-name",current.name);
  const watch=get("gh-watch-toggle");watch.hidden=false;
  watch.setAttribute("aria-pressed",String(state.watchlist.has(current.id)));
  watch.textContent=state.watchlist.has(current.id)?"★ Watching this market":"☆ Watch this market";
  const note=get("gh-research-evidence");note.hidden=false;
  if(current.research){
   txt("gh-risk",current.warnings.length?"Research · caution":"Research · stronger evidence");
   txt("gh-instruction","Observed instant-sell (low) "+gp(current.buy)+
    " · observed instant-buy (high) "+gp(current.sell));
   txt("gh-instruction-extra","Historical transaction references, not standing GE offers. Never assume you can buy at the low and sell at the high.");
   txt("gh-margin",gp(current.profit)+" / item");
   txt("gh-total",gp(current.buy));
   const warnings=current.warnings.length?current.warnings.join(" · "):
    "No major filter flags; a fill is still not guaranteed";
   txt("gh-research-evidence","Evidence score "+current.evidence+"/100 (not a fill probability) · "+
     "Last observed "+Math.round(current.age/60)+" min ago · "+
     (current.flow>0?current.flow.toLocaleString("en-GB")+" matched two-way units in last hour":
       "No verified two-way hourly volume")+
     " · "+(current.limit?current.limit.toLocaleString("en-GB"):"unknown")+" four-hour GE limit");
   txt("gh-caution",warnings+
    " · After-tax spread "+gp(current.profit)+
    " · 2% sell-price stress: "+(current.stressedMargin>0?gp(current.stressedMargin)+" remains":
      "margin erased")+
    ". These are research observations, NOT a forecast or an executable flip.");
   get("gh-add-fill").disabled=!!(current.capitalGap>0||
     current.members&&state.mode==="f2p");
  }else{
   txt("gh-risk",current.stressedMargin>0?"Stronger evidence":"Small test only");
   txt("gh-instruction","Try buying "+current.qty.toLocaleString("en-GB")+" × at "+gp(current.buy)+" each");
   txt("gh-instruction-extra","Then list at "+gp(current.sell)+" each · not guaranteed to fill");
   txt("gh-margin",gp(current.profit)+" / item");
   txt("gh-total",gp(current.total));
   txt("gh-research-evidence","Evidence score "+current.evidence+
      "/100 (not fill probability) · "+Math.round(current.age/60)+
      " min quote age · "+current.flow.toLocaleString("en-GB")+" hourly two-way units");
   txt("gh-caution","Four-hour GE limit: "+current.limit.toLocaleString("en-GB")+
    " · recent two-way volume: "+current.flow.toLocaleString("en-GB")+"/hr · "+
    (current.stressedMargin>0?"margin survives a 2% lower sell price":
      "a 2% lower sell price could erase the margin")+". Illustrative only.");
   get("gh-add-fill").disabled=false;
  }
  const icon=get("gh-item-icon"),meta=state.mappingById.get(current.id);
  icon.replaceChildren();const url=iconUrl(meta?.icon);
  if(url){const image=el("img");image.src=url;image.alt="";image.loading="lazy";image.referrerPolicy="no-referrer";
   image.onerror=()=>{icon.textContent="▥"};icon.append(image)}
  else icon.textContent="▥";
  get("gh-previous").disabled=state.index===0;get("gh-next").disabled=state.index===state.ideas.length-1;
  get("gh-show-chart").disabled=false;
 }
 for(const id of ["gh-budget-metric","gh-today","gh-week","gh-margin","gh-total"])decorateGP(id);
 renderLedger();
}
function navigate(dir){
 if(!state.ideas.length)return;
 const index=Math.max(0,Math.min(state.ideas.length-1,state.index+dir));
 if(index===state.index)return;
 state.index=index;saveUser();state.chartRows=[];state.chartVisible=null;state.chartOpen=false;get("gh-chart").hidden=true;get("gh-fill-form").hidden=true;
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
