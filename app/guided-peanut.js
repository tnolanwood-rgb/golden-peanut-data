/* Guided Peanut — a calm, single-screen alternative to Focus Edition.
 * The session-only deck is fixed on first navigation. No market data, keys,
 * browsing position or account history are persisted by this UI.
 */
(function(root){
'use strict';
const $=id=>document.getElementById(id);
const KEY='gp-guided-mode-v1', LEGACY_SKIPS='gp-guided-skips-v1';
const DAY=86400000;
const deck=root.GPGuidedDeck?.create?.();
let installed=false, current=null, fingerprint='', renderTimer=0;
let ideasCache=null,restoredAccount=null,restoredScroll=null,restoredChart=null,saveScrollTimer=0;
let renderedAccount=null,topFingerprint='',lastPrefetch='',renderCount=0;
const warmedImages=new Map();
let visit=null;
try{visit=root.GPGuidedVisit?.create?.(root.localStorage);}catch{/* Private browsing/storage denial must never break UI. */}
const read=(k,fallback)=>{try{return localStorage.getItem(k)||fallback;}catch{return fallback;}};
const save=(k,v)=>{try{localStorage.setItem(k,v);}catch{}};
const el=(tag,cls,txt)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(txt!==undefined)n.textContent=String(txt);return n;};
const add=(parent,...children)=>{for(const x of children)if(x)parent.append(x);return parent;};
const button=(label,fn,cls='gp-guide-button')=>{const b=el('button',cls,label);b.type='button';b.addEventListener('click',fn);return b;};
const coin=value=>{if(!Number.isFinite(value))return 'Not verified';const abs=Math.round(Math.abs(value));return (value<0?'−':'')+Math.floor(abs/10000).toLocaleString('en-GB')+'g '+String(Math.floor(abs%10000/100)).padStart(2,'0')+'s '+String(abs%100).padStart(2,'0')+'c';};
const name=(s,id)=>String(s?.meta?.[id]?.name||'Item #'+id);
const snapshot=s=>s?.snapshot?.account===s?.account?s.snapshot:null;
function board(s){
 try{if(!s?.opportunityPlan?.ok||!root.GPMarketBoard?.build)return null;
  return root.GPMarketBoard.build(s.opportunityPlan,{wallet:snapshot(s)?.wallet??null,metadata:s.meta||{}});
 }catch{return null;}
}
function ideas(s){
 const plan=s?.opportunityPlan,snap=snapshot(s),engine=root.GPMarketBoard?.build;
 // Heavy capital allocation and public-market sorting should not rerun for
 // every navigation click, account label repaint or visibility timer.
 // A minute boundary reevaluates freshness, even when plans are unchanged.
 const minute=Math.floor(Date.now()/60000),parts=[
  s?.account,s?.opportunityAt,plan,engine,snap?.wallet,
  plan?.orders,plan?.marketChoices,plan?.publicResearch,
  plan?.activeBook,plan?.privateNightEvidence,
  plan?.orders?.length,plan?.marketChoices?.length,plan?.publicResearch?.length,
  s?.externalMarketStatus?.indexed,s?.externalMarketStatus?.at,minute
 ];
 if(ideasCache&&parts.length===ideasCache.parts.length&&parts.every((v,i)=>v===ideasCache.parts[i]))
  return ideasCache.rows;
 const b=board(s), out=[], used=new Set();
 if(!b?.ready){ideasCache={parts,rows:out};return out;}
 const append=(rows,tier)=>{
  for(const v of rows||[]){
   const id=Number(v.id||v.item);
   if(!Number.isSafeInteger(id)||id<=0||used.has(id))continue;
   const buy=Number(v.buy),exit=Number(v.exit),qty=Number(v.quantity),cost=Number(v.cost);
   if(!(buy>0&&exit>buy))continue;
   if(tier==='forecast'&&!(Number.isSafeInteger(qty)&&qty>0&&Number.isFinite(v.expectedProfit)&&Number.isFinite(cost)))continue;
   if(tier==='history'&&!(Number.isSafeInteger(qty)&&qty>0&&Number.isFinite(v.scenarioProfit)))continue;
   if(tier==='research'&&(v.watchOnly||v.affordability!=='one-unit-affordable'||!Number.isFinite(v.unitMargin)))continue;
   if(tier==='history'&&v.capitalStatus!=='wallet-covers-lot')continue;
   used.add(id);out.push({id,tier,buy,exit,qty:tier==='research'?null:qty,cost:tier==='research'?null:cost,
    profit:tier==='forecast'?v.expectedProfit:tier==='history'?v.scenarioProfit:v.unitMargin,
    label:name(s,id),data:v});
   if(out.length>=35)return;
  }
 };
 append(b.forecast,'forecast');
 append(b.history,'history');
 append(b.newMarkets,'research');
 ideasCache={parts,rows:out};
 return out;
}
function rememberView(){
 const s=root.GoldenPeanutClean?.State;
 if(!visit||!s?.account||!document.body.classList.contains('gp-guided-active'))return;
 const state=deck?.snapshot?.(s.account);
 if(!state)return;
 visit.save(s.account,state,Math.max(0,window.scrollY||0),
  root.GPGuidedPriceChart?.snapshot?.()||null);
}
function maybeRestoreView(s,rows){
 if(!visit||!s?.account||!rows?.length||restoredAccount===s.account)return;
 restoredAccount=s.account;
 const saved=visit.load(s.account);
 if(!saved||!deck?.restore?.(saved.deck,s.account))return;
 restoredScroll=saved.scroll;
 // Restore only an inspector showing the same numbered idea; a chart from
 // an unrelated account or card must never silently reappear.
 restoredChart=saved.chart?.id===saved.deck.ids[saved.deck.position]?saved.chart:null;
}
function restoreVisiblePosition(){
 if(restoredScroll!==null){
  const y=restoredScroll;restoredScroll=null;
  for(const delay of [130,380,850])window.setTimeout(()=>{
   if(document.body.classList.contains('gp-guided-active')&&window.scrollY<y-12)
    window.scrollTo({top:y,behavior:'instant'});
  },delay);
 }
 if(restoredChart){
  const chart=restoredChart;restoredChart=null;
  window.setTimeout(()=>{if(document.body.classList.contains('gp-guided-active'))
   root.GPGuidedPriceChart?.restore?.(chart);},260);
 }
}
function setCurrent(id){current=id;}
function navigate(action){
 root.GPGuidedPriceChart?.close?.();
 const state=root.GoldenPeanutClean?.State,rows=ideas(state);
 const view=deck.move(rows,state?.account,action);
 if(view.id!==current)setCurrent(view.id);
 render(true);rememberView();
}
function guided(enabled){
 if(!installed)return;
 document.body.classList.toggle('gp-guided-active',enabled);
 $('gp-guided-root').hidden=!enabled;
 $('gp-return-guided').hidden=enabled;
 save(KEY,enabled?'guided':'advanced');
 if(enabled){render(true);window.scrollTo({top:0,behavior:'instant'});}
}
function advanced(toTrades=false){
 root.GPGuidedPriceChart?.close?.();
 guided(false);
 if(toTrades)document.querySelector('[data-focus-nav="trades"]')?.click();
 window.scrollTo({top:0,behavior:'instant'});
}
/* These are the existing GW2 coin assets already used by Focus Edition.
 * Explicit g/s/c letters remain visible, even if an image cannot load. */
function coinArtwork(value){
 if(!Number.isFinite(value))return el('span','gp-guide-unverified','—');
 const coins=Math.round(Math.abs(value));
 const wrap=el('span','gp-guide-coinset');
 wrap.setAttribute('aria-label',coin(value));
 if(value<0)wrap.append(el('span','gp-guide-negative','−'));
 const units=[
  ['g','gold',Math.floor(coins/10000).toLocaleString('en-GB')],
  ['s','silver',String(Math.floor(coins%10000/100)).padStart(2,'0')],
  ['c','copper',String(coins%100).padStart(2,'0')]];
 for(const [unit,metal,number] of units){
  const part=el('span','gp-guide-denom gp-guide-denom-'+unit);
  const icon=el('img');icon.src='./assets/gw2-'+metal+'-coin.png';
  icon.alt='';icon.setAttribute('aria-hidden','true');icon.width=17;icon.height=17;
  icon.decoding='async';icon.onerror=()=>{icon.hidden=true;};
  add(part,el('span','gp-guide-coin-quantity',number),icon,el('span','gp-guide-unit',unit));
  wrap.append(part);
 }
 return wrap;
}
function deliveryArtwork(){
 // Use the verified Focus Edition total (coins + ALL current item asks).
 // Never substitute the coin-only balance when an item quote is missing.
 const source=$('focus-delivery-total')?.querySelector('.focus-money');
 if(!source||!source.querySelector('.focus-money-part'))
  return el('span','gp-guide-unverified','—');
 const node=source.cloneNode(true);
 node.classList.add('gp-guide-coinset');
 node.setAttribute('aria-label',source.title||'Verified Delivery Box gross listing value');
 for(const [i,part] of [...node.querySelectorAll('.focus-money-part')].entries()){
  const unit=['g','s','c'][i];if(!unit)continue;
  part.classList.add('gp-guide-denom','gp-guide-denom-'+unit);
  const img=part.querySelector('img');
  if(img){img.alt='';img.setAttribute('aria-hidden','true');img.onerror=()=>{img.hidden=true;};}
  part.append(el('span','gp-guide-unit',unit));
 }
 return node;
}
function moneyMetric(title,value,detail){
 const item=el('div','gp-guide-metric'),number=el('strong','gp-guide-number');
 if(value&&typeof value.nodeType==='number')number.append(value);
 else number.textContent=String(value);
 add(item,el('span','gp-guide-label',title),number,el('small','gp-guide-muted',detail));
 return item;
}
function renderTop(host,s){
 const head=el('header','gp-guide-header');
 const badge=el('div','gp-guide-logo','🥜');
 const identity=el('div','gp-guide-title');
 add(identity,el('h1','', 'The Golden Peanut'),el('p','gp-guide-muted','One useful move at a time · Guild Wars 2'));
 const actions=el('div','gp-guide-head-actions');
 add(actions,button('↻ Check account',()=>$('focus-refresh')?.click(),'gp-guide-light'),button('⚙ Details',()=>advanced(false),'gp-guide-light'));
 add(head,badge,identity,actions);host.append(head);
 const snap=snapshot(s),summary=s?.summary||{},day=root.PeanutCore?.ukDay?.(Date.now());
 const actual=day&&summary.days?.[day];
 const hasLedger=Number.isFinite(summary.totalRecords)||Number.isFinite(summary.weekP100);
 const today=hasLedger?coinArtwork(Number(actual?.p100||0)/100):coinArtwork(NaN);
 const grid=el('section','gp-guide-metrics');
 const delivery=moneyMetric('Delivery Box · gross listing value',deliveryArtwork(),
  'Coins + all item lowest sell asks · BEFORE Trading Post fees; not spendable gold');
 delivery.classList.add('gp-guide-delivery-summary');
 add(grid,delivery,moneyMetric('Today · realised trading profit',today,'Completed, cost-matched trades only'),
  moneyMetric('Wallet · available now',coinArtwork(snap?.wallet),'Excludes coins waiting in the Delivery Box'),
  moneyMetric('Last 7 days · realised',coinArtwork(Number.isFinite(summary.weekP100)?summary.weekP100/100:NaN),'Not projected future income'));
 host.append(grid);
 // Reuse the validated, item-specific valuation already rendered by Focus;
 // never recompute purchase cost or claim missing prices are known.
 const source=$('focus-delivery-items');
 const drawer=el('details','gp-guide-delivery-drawer');
 const summaryLine=el('summary','','Delivery Box items & sale-profit details');
 const drawerBody=el('div','gp-guide-delivery-list');
 const rows=source?.querySelectorAll('.focus-delivery-row')||[];
 if(rows.length){for(const row of rows)drawerBody.append(row.cloneNode(true));}
 else drawerBody.append(el('p','gp-guide-muted',source?.textContent?.trim()||'No verified delivery items yet.'));
 add(drawer,summaryLine,drawerBody);host.append(drawer);
 const note=el('p','gp-guide-update',snap?'Account values are from the latest verified snapshot. Tap Check account for newer values.':'Connect your GW2 account in Details to load your wallet, Delivery Box and history.');
 host.append(note);
}
function buildIdea(host,s,view){
 const choice=view.item;
 const section=el('section','gp-guide-idea');
 const upper=el('div','gp-guide-idea-top');
 add(upper,el('span','gp-guide-label','NEXT TRADE IDEA'),el('span','gp-guide-position',view.total?String(view.position)+' of '+view.total:'No eligible ideas'));
 section.append(upper);
 if(!choice){
  add(section,el('h2','',view.unavailable?'This market needs a new quote':'No verified trade ideas yet'),
   el('p','gp-guide-muted',view.unavailable?
    'This idea is no longer in the current qualified research. Its old buy/sell prices are hidden. Update the idea list or move to another item.':
    'Check your account or market research. The app will not invent a trade just to fill this card.'));
  section.append(button(view.unavailable?'↻ Update idea list':'↻ Check account',
   view.unavailable?()=>navigate('restart'):()=>$('focus-refresh')?.click(),'gp-guide-primary'));
 }else{
  const tier=choice.tier;
  const state=tier==='forecast'?'Evidence-backed 24h estimate':tier==='history'?'History-backed · conditional':'Public quote · research only';
  const m=s.meta?.[choice.id],heading=el('h2','gp-guide-item-name',m?.name||choice.label);
  heading.dataset.itemId=String(choice.id);
  root.GPRarity?.apply?.(heading,m?.rarity);
  add(section,el('p','gp-guide-tier',state),heading);
  const art=el('div','gp-guide-item-icon');
  art.dataset.itemId=String(choice.id);
  root.GPRarity?.apply?.(art,m?.rarity);
  if(root.GPFocus?.validItemIcon?.(m)){
   const img=el('img');img.src=m.icon;img.alt='';img.width=54;img.height=54;
   img.loading='eager';img.decoding='async';
   img.onerror=()=>{if(art.contains(img))art.textContent=(m?.name||choice.label).slice(0,1).toUpperCase();};
   art.append(img);
  }else art.textContent=(m?.name||choice.label).slice(0,1).toUpperCase();
  heading.before(art);
  const instructions=el('div','gp-guide-instructions');
  const buyLine=el('p','gp-guide-instruction'),sellLine=el('p','gp-guide-instruction-sub');
  if(tier==='research'){
   add(buyLine,document.createTextNode('Research a single unit at '),
    coinArtwork(choice.buy),document.createTextNode(' buy reference.'));
   add(sellLine,document.createTextNode('Current sell reference: '),
    coinArtwork(choice.exit),document.createTextNode(' per item.'));
  }else{
   add(buyLine,document.createTextNode('Buy '+choice.qty.toLocaleString('en-GB')+' × '),
    coinArtwork(choice.buy),document.createTextNode(' each.'));
   add(sellLine,document.createTextNode('Then consider selling at '),
    coinArtwork(choice.exit),document.createTextNode(' each.'));
  }
  add(instructions,buyLine,sellLine);
  section.append(instructions);
  const totals=el('div','gp-guide-totals');
  add(totals,moneyMetric(tier==='research'?'Net spread per item, if filled':tier==='forecast'?'Modelled 24h profit, uncertain':'Net profit if entire lot resells',coinArtwork(choice.profit),tier==='research'?'No quantity or future fill rate established':tier==='forecast'?'Not guaranteed or live-tested for accuracy':'Not an overnight profit prediction'),
   moneyMetric(tier==='research'?'One-unit buy reference':'Gold needed',coinArtwork(tier==='research'?choice.buy:choice.cost),tier==='forecast'?'Includes modelled fees/reserves':'Only consider buying with wallet funds'));
  section.append(totals);
  let caution=tier==='research'?'Public bids/asks do not establish completed volume, fill speed or profitability.':
   tier==='history'?'Personal past completed buys and sells do not prove this lot will fill or resell tonight.':
   'This estimate requires comparable observed trade outcomes; predictive accuracy has not been established.';
  section.append(el('p','gp-guide-caution',caution));
  const primary=el('div','gp-guide-primary-row');
  add(primary,button('View price chart',()=>showChart(choice),'gp-guide-primary'),
   button('Explore all trade research',()=>advanced(true),'gp-guide-secondary'));
  section.append(primary);
 }
 const controls=el('div','gp-guide-controls');
 add(controls,button('← Previous',()=>navigate('previous'),'gp-guide-light'),
  button(view.canNext?'Next idea →':'Start again ↻',()=>navigate(view.canNext?'next':'restart'),'gp-guide-light'));
 controls.firstChild.disabled=!view.canPrevious;
 if(!view.total)controls.lastChild.disabled=true;
 section.append(controls);
 if(view.newIdeas){
  const second=el('div','gp-guide-secondary-row');
  second.append(button('Update idea list · '+view.newIdeas+' new',()=>navigate('restart'),'gp-guide-text'));
  section.append(second);
 }
 host.append(section);
}
/* The lightweight index deliberately excludes icon URLs. Prefetch art for
 * the visible idea and the next four deck positions so Next is usually
 * instant. Keep only a handful of decoded public images in memory. */
function prewarmIcon(src){
 if(!root.Image||typeof src!=='string'||!/^https:\/\/render\.guildwars2\.com\/file\/[a-f0-9]+\/\d+\.(png|jpe?g|webp)$/i.test(src)||
    warmedImages.has(src))return;
 const img=new root.Image();img.decoding='async';img.src=src;
 warmedImages.set(src,img);
 while(warmedImages.size>12)warmedImages.delete(warmedImages.keys().next().value);
 if(typeof img.decode==='function')void img.decode().catch(()=>{});
}
function prefetchNearbyArtwork(s,view){
 if(!s?.account||!view?.id)return;
 const snapshot=deck?.snapshot?.(s.account);
 if(!snapshot)return;
 const ids=snapshot.ids.slice(snapshot.position,Math.min(snapshot.position+5,snapshot.ids.length));
 const missing=ids.filter(id=>!root.GPFocus?.validItemIcon?.(s.meta?.[id]));
 const srcs=ids.map(id=>s.meta?.[id]?.icon).filter(Boolean);
 const key=s.account+'|'+ids.join(',')+'|'+srcs.join(',');
 // Current missing artwork may be retried on an explicit repaint, while
 // Focus itself deduplicates in-flight requests and caps failed attempts.
 // Nearby prefetched items are requested only when their list changes.
 const needsVisible=missing.includes(view.id);
 if(key===lastPrefetch&&!needsVisible)return;
 lastPrefetch=key;
 if(missing.length)root.GPFocus?.ensureItemArtwork?.(missing);
 for(const src of srcs)prewarmIcon(src);
}
/* Metadata arrives asynchronously, often one second AFTER the user clicks
 * Next. Patching just the fixed-size artwork/title avoids rebuilding the
 * whole card, moving the navigation controls, or resetting page scroll. */
function updateActiveArtwork(event){
 if(!installed||!document.body.classList.contains('gp-guided-active'))return;
 const s=root.GoldenPeanutClean?.State;
 if(!s?.account||event?.detail?.account&&event.detail.account!==s.account)return;
 const view=deck?.view?.(ideas(s),s.account),id=view?.id;
 if(!id)return;
 const changed=event?.detail?.ids;
 if(Array.isArray(changed)&&!changed.some(x=>Number(x)===id)){
  prefetchNearbyArtwork(s,view);
  return;
 }
 const host=$('gp-guided-root'),art=host?.querySelector('.gp-guide-item-icon'),
  heading=host?.querySelector('.gp-guide-item-name');
 if(!art||!heading||art.dataset.itemId!==String(id)||heading.dataset.itemId!==String(id))return;
 const m=s.meta?.[id];
 if(m?.name&&heading.textContent!==m.name)heading.textContent=m.name;
 // GPRarity.apply resets its own classes but appends to title, so clear any
 // old hint first when upgrading fallback metadata in place.
 heading.title='';art.title='';
 root.GPRarity?.apply?.(heading,m?.rarity);
 root.GPRarity?.apply?.(art,m?.rarity);
 if(root.GPFocus?.validItemIcon?.(m)){
  const old=art.querySelector('img');
  if(old?.getAttribute('src')!==m.icon){
   const img=el('img');img.src=m.icon;img.alt='';img.width=54;img.height=54;
   img.loading='eager';img.decoding='async';
   img.onerror=()=>{if(art.contains(img))art.textContent=(m?.name||'◇').slice(0,1).toUpperCase();};
   art.replaceChildren(img);
  }
  prewarmIcon(m.icon);
 }
 prefetchNearbyArtwork(s,view);
}
/* The chart lives outside the guided home renderer so background refreshes
 * cannot replace or close a user's active inspection. */
function showChart(choice){
 root.GPGuidedPriceChart?.open?.({id:choice.id,name:choice.label});
}
function render(force=false){
 if(!installed||!document.body.classList.contains('gp-guided-active'))return;
 const s=root.GoldenPeanutClean?.State,rows=ideas(s);
 maybeRestoreView(s,rows);
 const view=deck.view(rows,s?.account);
 if(view.id!==current)setCurrent(view.id);
 const host=$('gp-guided-root');if(!host)return;
 const snap=snapshot(s),day=root.PeanutCore?.ukDay?.(Date.now()),summary=s?.summary||{};
 const topSig=JSON.stringify([s?.account,snap?.at,snap?.wallet,snap?.deliveryAt,
  summary.totalRecords,summary.weekP100,summary.days?.[day]?.p100,
  $('focus-delivery-total')?.textContent||'',
  $('focus-delivery-items')?.textContent||'']);
 // Item icon/rarity are explicitly absent from this render fingerprint:
 // these are patched in place when ArenaNet metadata arrives. A late image
 // must never tear down the content or reset Android scroll position.
 const sig=JSON.stringify([s?.account,s?.snapshot?.walletAt,s?.snapshot?.at,
  s?.opportunityAt,s?.opportunityDeepBusy,view.id,view.position,view.total,view.newIdeas,
  view.item?.buy,view.item?.exit,view.item?.profit,view.item?.quantity,view.item?.label,
  topSig]);
 if(sig===fingerprint&&topSig===topFingerprint&&host.querySelector('.gp-guide-idea')){
  updateActiveArtwork();
  restoreVisiblePosition();
  return;
 }
 const oldY=window.scrollY;
 const oldCard=host.querySelector('.gp-guide-idea');
 const sameTop=renderedAccount===s?.account&&topFingerprint===topSig&&oldCard;
 if(sameTop){
  // The user clicked Next/Previous: only replace the *one card*. Keeping the
  // header, metric panels, Delivery Box and footer mounted prevents layout
  // reflow at the top of the document and preserves their scroll positions.
  const staging=el('div');
  buildIdea(staging,s,view);
  const focused=document.activeElement,oldControls=oldCard.querySelector('.gp-guide-controls');
  const focusedIndex=oldControls?.contains(focused)?[...oldControls.children].indexOf(focused):-1;
  const newCard=staging.firstElementChild;
  oldCard.replaceWith(newCard);
  // Android may move focus to BODY when the tapped Next button is removed.
  // Give focus to its replacement without implicit browser scroll.
  if(focusedIndex>=0){
   const nextControl=newCard.querySelector('.gp-guide-controls')?.children[focusedIndex];
   if(nextControl&&!nextControl.disabled)nextControl.focus({preventScroll:true});
  }
 }else{
  const oldDrawer=host.querySelector('.gp-guide-delivery-drawer');
  const openDelivery=oldDrawer?.open||false;
  const deliveryScroll=host.querySelector('.gp-guide-delivery-list')?.scrollTop||0;
  // Build the replacement OFF-DOM, then swap once. Clearing the mounted
  // root before rebuilding caused the browser to clamp scrollY to zero.
  const content=el('div','gp-guide-content');
  renderTop(content,s);
  buildIdea(content,s,view);
  const footer=el('footer','gp-guide-foot');
  add(footer,el('p','gp-guide-muted','You place, cancel and collect orders in GW2 yourself. The Golden Peanut reads data; it never trades on your behalf.'),
   button('Open all markets, orders, legendaries & settings',()=>advanced(false),'gp-guide-secondary'));
  content.append(footer);
  host.replaceChildren(content);
  const drawer=host.querySelector('.gp-guide-delivery-drawer');
  if(drawer){drawer.open=openDelivery;drawer.querySelector('.gp-guide-delivery-list').scrollTop=deliveryScroll;}
 }
 fingerprint=sig;topFingerprint=topSig;renderedAccount=s?.account;renderCount++;
 // Only correct an actual displacement. Never forcibly call scrollTo on
 // every background repaint or after each delayed image load.
 if(Math.abs(window.scrollY-oldY)>1)
  window.scrollTo({top:oldY,behavior:'instant'});
 updateActiveArtwork();
 prefetchNearbyArtwork(s,view);
 restoreVisiblePosition();
}
function schedule(force=false){clearTimeout(renderTimer);renderTimer=setTimeout(()=>render(force),250);}
function install(){
 if(installed||!deck||!$('focus-today')||!document.querySelector('.app'))return false;
 // Legacy versions persisted skipped IDs across reloads and accounts.
 // Remove ONLY this obsolete UI-only key: never touch account/ledger storage.
 try{localStorage.removeItem(LEGACY_SKIPS);}catch{}
 const app=document.querySelector('.app');
 const host=el('div','gp-guided-root');host.id='gp-guided-root';host.hidden=true;app.prepend(host);
 const back=button('← Return to simple view',()=>guided(true),'gp-return-guided');back.id='gp-return-guided';back.hidden=true;app.prepend(back);
 installed=true;
 if(read(KEY,'guided')!=='advanced')guided(true);
 else guided(false);
 const source=$('focus-wallet'),delivery=$('focus-delivery-total');
 const observer=new MutationObserver(()=>schedule());
 for(const node of [source,delivery])if(node)observer.observe(node,{childList:true,subtree:true,characterData:true});
 document.addEventListener('visibilitychange',()=>{
  if(document.hidden)rememberView();
  else schedule(); // Avoid needless full card reconstruction on every Android app switch.
 });
 window.addEventListener('pagehide',rememberView);
 window.addEventListener('gp-item-metadata-updated',updateActiveArtwork);
 window.addEventListener('gp-account-changed',()=>schedule(true));
 window.addEventListener('scroll',()=>{
  if(!document.body.classList.contains('gp-guided-active'))return;
  if(saveScrollTimer)clearTimeout(saveScrollTimer);
  saveScrollTimer=setTimeout(()=>{saveScrollTimer=0;rememberView();},220);
 },{passive:true});
 window.addEventListener('gp-guided-chart-changed',rememberView);
 setInterval(()=>{if(!document.hidden)schedule();},20000);
 root.GPGuided={render:()=>render(true),open:()=>guided(true),advanced:()=>advanced(false),
  remember:rememberView,
  diagnostics:()=>({cardBuilds:renderCount,position:deck.view(ideas(root.GoldenPeanutClean?.State),root.GoldenPeanutClean?.State?.account).position}),
  navigation:()=>deck.view(ideas(root.GoldenPeanutClean?.State),root.GoldenPeanutClean?.State?.account)};
 return true;
}
function ready(){
 if(install())return;
 const obs=new MutationObserver(()=>{if(install())obs.disconnect();});
 obs.observe(document.documentElement,{childList:true,subtree:true});
 setTimeout(()=>{obs.disconnect();install();},20000);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready,{once:true});else ready();
})(typeof window!=='undefined'?window:globalThis);
