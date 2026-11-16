import {mergeJournal} from './backup.mjs';
import {exclusive} from './actions.mjs';
import {assumptionErrors} from './research.mjs';
import {simpleCapital,journalChange} from './simple-plan.mjs';
import {createSimple} from './simple.mjs';
import {createStudio} from './studio.mjs';
import {accountRestriction} from './workspace.mjs';
import {marketEvidence,tradingMemory,positionReview,researchCandidates,researchReasons,breakEvenSale} from './intelligence.mjs';
import staticMapping from './mapping.json';
import {gp,compact,asItems,filterMarkets,rankMarkets,plan,realizedLedger,recentPurchases,periodProfit,validGP,MAX_GP,screeningReasons,taxPerItem} from './core.mjs';
import {marketSnapshot,validateSnapshot,shouldRefresh,aggregateFresh} from './api.mjs';
import {read,save as persist,validateBackup,defaults,saveMany,storageIssues,initializeStorage,eraseLocalData,convertHubBackup} from './storage.mjs';
import {Capacitor} from '@capacitor/core';
import {App} from '@capacitor/app';
import {Filesystem,Directory,Encoding} from '@capacitor/filesystem';
import {Share} from '@capacitor/share';
try{await initializeStorage();}catch(e){console.error('Local database unavailable:',e.message);}
let studio=null,simple=null,latestCandidates=[];
let snapshot=read('snapshot',null),busy=false,lastAttempt=0,feedState='Not loaded';
try{if(snapshot)validateSnapshot(snapshot);}catch{snapshot=null;}

const $=id=>document.getElementById(id);
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
document.addEventListener('error',event=>{const img=event.target;if(img instanceof HTMLImageElement&&img.closest('.glyph')){const title=img.closest('.market')?.querySelector('.itemname')?.textContent||'GE';img.parentElement.textContent=title.slice(0,2).toUpperCase();}},true);
const save=async (key,value)=>{try{await persist(key,value)}catch{message('Device storage is full or unavailable. Changes may not survive restart. Export a backup.',true);throw Error('Storage unavailable');}};
const recovered=read('imported',null);if(recovered){try{const c=validateBackup({format:'golden-exchange-backup-v1',...recovered});await saveMany({...c.settings,trades:c.trades,watch:c.watch,tickets:c.tickets,owned:c.owned});localStorage.removeItem('golden-hub-v4:imported');}catch{}}
const comparison=new Set();
let marketPageSize=40,tradePageSize=30,editing=null,editingDateInput='';const openItems=new Set();
let items=[],marketList=[],selectedPlan={selected:[],allocated:0,remaining:0,total:0},mapping=staticMapping,watch=new Set(read('watch',[])),trades=read('trades',[]);
for(const id of Object.keys(defaults)){const saved=read(id,defaults[id]);$(id).value=saved;$(id).addEventListener('change',async ()=>{if(!$(id).checkValidity()||$(id).value===''){message('Enter a valid '+$(id).previousElementSibling.textContent.toLowerCase()+'.',true);$(id).value=read(id,defaults[id]);return;}try{await save(id,$(id).value)}catch{}if(id==='goal'){renderGoal();return;}marketPageSize=40;update();});}
$('query').addEventListener('input',()=>{marketPageSize=40;update();});
$('moreMarkets').addEventListener('click',async ()=>{marketPageSize+=40;renderMarkets();});
$('moreTrades').addEventListener('click',async ()=>{tradePageSize+=30;renderJournal();});
$('watchShortcut').addEventListener('click',async ()=>{navigate('markets');$('view').value=$('view').value==='watch'?'top':'watch';await save('view',$('view').value);update();});
let activeTab='home';
function navigate(tab){activeTab=tab;document.querySelectorAll('[data-tab]').forEach(n=>{n.classList.toggle('active',n.dataset.tab===tab);n.setAttribute('aria-current',n.dataset.tab===tab?'page':'false');});document.querySelectorAll('.page').forEach(n=>n.classList.toggle('active',n.id===tab));window.scrollTo({top:0});}
for(const el of document.querySelectorAll('[data-tab]'))el.addEventListener('click',async ()=>navigate(el.dataset.tab));
function message(str,isError=false){$('notice').textContent=str;$('notice').classList.toggle('error',isError);}
function timeAgo(minutes){if(!Number.isFinite(minutes))return 'Unknown';if(minutes<1)return 'Just now';if(minutes<60)return `${Math.round(minutes)}m ago`;return `${(minutes/60).toFixed(1)}h ago`;}
function applySnapshot(){
 if(!snapshot)return;
 mapping=snapshot.mapping;items=asItems(mapping,snapshot.latest,snapshot['5m'],snapshot['1h']);populateItems();update();
 $('updated').textContent=feedState;
 $('status').textContent=`Last successful refresh: ${new Date(snapshot.times.latest).toLocaleString()} · hourly block: ${new Date(snapshot['1h'].timestamp*1000).toLocaleTimeString()}`;
}
async function refresh(){
 if(busy)return;
 const sinceAttempt=Date.now()-lastAttempt;
 if(sinceAttempt>=0&&sinceAttempt<60000){message('Refresh is limited to once a minute. Displayed data keeps its original timestamps.');$('simpleFeedback').textContent='Prices were checked less than a minute ago. Try again shortly.';return;}
 busy=true;lastAttempt=Date.now();const btn=$('refresh');btn.disabled=true;btn.textContent='↻ Updating…';message('Loading Wiki prices and volumes…');simple?.render();
 try{
  const fresh=await marketSnapshot(snapshot);snapshot=fresh;feedState=fresh.refreshed.includes('latest')?'Live':'Cached';
  let cached=true;try{await save('snapshot',snapshot)}catch{cached=false}
  applySnapshot();message('Wiki loaded · Reference prices; fills uncertain.'+(cached?'':' Device storage is full: this refresh could not be saved for offline use.'),!cached);
 }catch(err){
  feedState=snapshot?'Cached · offline':'Unavailable';
  if(snapshot)applySnapshot();else{items=[];update();$('updated').textContent=feedState;$('marketsList').innerHTML='<div class="card empty">Market data unavailable. Connect and tap Refresh. Your journal works offline.</div>';}
  message(`Market refresh failed: ${err.message}. ${snapshot?'Showing the last saved snapshot with its original timestamps.':'No saved market data. Connect to the internet and retry.'}`,true);
 }finally{busy=false;btn.disabled=false;btn.textContent='↻ Refresh market';simple?.render();}
}
function update(){const budget=Math.min(MAX_GP,Math.max(0,Math.floor(Number($('budget').value)||0))),members=$('mode').value==='members';
 const damaged=storageIssues();$('storageWarning').hidden=!damaged.length;$('storageWarning').textContent=damaged.length?`Saved ${damaged.join(', ')} could not be read. Original data has been kept. New trade ideas are paused. Restore a JSON backup in More tools → Journal.`:'';
 const opts={members,profile:$('profile').value,maxAge:parseInt($('age').value,10),minVolume:parseInt($('minVolume').value,10)};
 // Search affects visible list only; the planner always considers the entire qualified market.
 const memory=tradingMemory(trades);const candidates=rankMarkets((damaged.length?[]:researchCandidates(items,opts)).filter(i=>!accountRestriction(i,$('mode').value,$('restriction').value)),budget);latestCandidates=candidates;
 const query=$('query').value.trim().toLowerCase();
 const quoted=new Map(items.map(i=>[i.id,i]));
 const universe=mapping.map(meta=>quoted.get(meta.id)||{...meta,limit:meta.limit??null,buy:NaN,sell:NaN,profit:NaN,age:Infinity});
 const source=$('view').value==='watch'?universe.filter(i=>watch.has(i.id)):query||$('view').value==='all'?universe.filter(i=>members||!i.members):rankMarkets(candidates,budget,$('sort').value);
 marketList=source.filter(i=>!query||i.name.toLowerCase().includes(query)||String(i.id)===query).map(i=>({...i,reasons:[...researchReasons(i,opts),...(accountRestriction(i,$('mode').value,$('restriction').value)?['New F2P account sale restriction — eligibility unconfirmed']:[])]}));
 if(query||$('view').value==='all')marketList.sort((a,b)=>Number(b.name.toLowerCase()===query)-Number(a.name.toLowerCase()===query)||a.name.localeCompare(b.name));
 $('searchInfo').textContent=query||$('view').value==='all'?'Browsing item metadata, including markets excluded from recommendations. Reasons appear on each card.':$('view').value==='watch'?'Watchlist ignores opportunity filters so you can track excluded markets.':'';
 const held=$('avoidHeld').value==='yes'?new Set([...memory.ledger.holdings.map(h=>h.id),...read('owned',[]).map(h=>h.id)]):new Set();
 const paper=simpleCapital(read('tickets',[]),trades,budget,Math.min(members?8:3,$('freeSlots').value==='auto'?8:Number($('freeSlots').value)));
 selectedPlan=plan(candidates.filter(i=>!held.has(i.id)&&!paper.active.some(t=>t.id===i.id)),paper.remaining,paper.slotsRemaining,recentPurchases(trades),{maxShare:Number($('maxShare').value)/100,reserve:Number($('reserve').value)/100,capitalBase:budget});
 selectedPlan.availableSlots=paper.slotsRemaining;
 $('cash').textContent=compact(budget)+' gp';
 $('viable').textContent=candidates.length.toLocaleString('en-GB');$('profit').textContent=compact(periodProfit(memory.ledger).week)+' gp';$('allocated').textContent=compact(selectedPlan.allocated)+' gp';
 $('count').textContent=`${marketList.length.toLocaleString('en-GB')} matches · ${items.length.toLocaleString('en-GB')} quoted items`;
 renderMarkets();renderPlan();renderJournal();renderInsights(memory);studio?.render();simple?.render();window.dispatchEvent(new Event('exchange-rendered'));}
function renderMarkets(){$('comparisonControls').hidden=!comparison.size;$('compareOpen').textContent=`Compare selected (${comparison.size}/3)`;if($('compareDialog').open)renderComparison();let markets=marketList;$('moreMarkets').hidden=markets.length<=marketPageSize;$('moreMarkets').textContent=`Show more (${Math.min(marketPageSize,markets.length)} of ${markets.length})`;
 if($('view').value==='watch'&&!markets.length){$('marketsList').innerHTML='<div class="card empty">Your watchlist is empty. Search any item and tap its star to follow it.</div>';return;}
 if(!markets.length){$('marketsList').innerHTML=`<div class="card empty">${items.length?'No markets pass these screening rules. Try a longer price-age window or lower minimum volume.':'Market feed not loaded yet.'}</div>`;return;}
 $('marketsList').innerHTML=markets.slice(0,marketPageSize).map((i,n)=>{
 if(!validGP(i.buy)||!validGP(i.sell))return `<article class="card market ${openItems.has(i.id)?'open':''}" data-id="${i.id}"><div class="markettop"><div><div class="itemname">${esc(i.name)}</div><p class="smallmuted">${i.members?'Members':'F2P'} · Missing buy or sell observation. No margin calculated.</p></div><button class="star" data-star="${i.id}" aria-label="Toggle watchlist" aria-pressed="${watch.has(i.id)}">${watch.has(i.id)?'★':'☆'}</button></div></article>`;
 const qty=Math.min(i.potentialQty,Math.floor(Math.max(0,Number($('budget').value)||0)/i.buy));
 return `<article class="card market ${openItems.has(i.id)?'open':''}" data-id="${i.id}"><div class="markettop"><div class="lefttitle"><div class="glyph" aria-hidden="true">${esc(i.name.slice(0,2).toUpperCase())}</div><div><div class="itemname">${esc(i.name)}</div><div class="itemsub">#${i.id} · ${i.members?'Members':'F2P'} · Last trade ${timeAgo(i.age)} · Limit ${i.limit?.toLocaleString('en-GB')??'unknown'}/4h · Risk: ${i.age>30||i.drift>0.1||i.latestFlow===0?'elevated':'moderate'}</div></div></div><div class="inline-actions"><button class="btn small" data-compare="${i.id}" aria-pressed="${comparison.has(i.id)}">${comparison.has(i.id)?'Selected':'Compare'}</button><button class="detailsbtn" data-detail="${i.id}" aria-expanded="${openItems.has(i.id)}">${openItems.has(i.id)?'Hide':'Details'}</button><button class="star ${watch.has(i.id)?'selected':''}" data-star="${i.id}" aria-label="${watch.has(i.id)?'Remove from':'Add to'} watchlist" aria-pressed="${watch.has(i.id)}">${watch.has(i.id)?'★':'☆'}</button></div></div><div class="badges">${i.reasons.length?i.reasons.map(r=>`<span class="badge">${esc(r)}</span>`).join(''):''}</div><div class="marketdata"><div class="stat"><small>Reference buy / sell</small><strong>${compact(i.buy)} / ${compact(i.sell)} gp</strong></div><div class="stat"><small>Net per item after tax</small><strong class="${i.profit>=0?'positive':'negative'}">${gp(i.profit)}</strong></div><div class="stat"><small>ROI after tax · liquidity</small><strong>${i.spreadPct.toFixed(2)}% · ${i.flow>=1000?'Active':'Thin'}</strong></div><div class="stat"><small>Hourly / 5m two-way volume</small><strong>${compact(i.flow)} / ${compact(i.latestFlow)}</strong></div></div><div class="detail"><div class="intelligence-row zero-padding"><strong>Price corroboration</strong><p>Latest spread after tax: ${gp(i.profit)} / item.<br>Against available recent averages: ${gp(marketEvidence(i).confirmedMargin)} / item.<br>With a 2% lower exit: ${gp(marketEvidence(i).stressedMargin)} / item.</p><p>${marketEvidence(i).signals.map(esc).join(' · ')||'Recent references agree; execution remains uncertain.'}</p><p>These are sensitivity scenarios, not expected earnings.</p></div><strong>Your price check</strong><div class="scenario-form" data-calculator="${i.id}"><label>Buy per item (GP)<input data-calc-buy type="number" min="1" step="1" value="${i.buy}"></label><label>Sell per item (GP)<input data-calc-sell type="number" min="1" step="1" value="${i.sell}"></label><output class="scenario-result" data-calc-result>Change either price to check tax, margin and break-even.</output></div><br>Exact reference buy: ${gp(i.buy)}; sell: ${gp(i.sell)}. Risk: ${i.age>30||i.drift>0.1||i.latestFlow===0?'Elevated':'Moderate'}; execution uncertain. 4h screening cap: ${i.potentialQty}. 1h reported sides: ${i.buyVol} instant-sold / ${i.sellVol} instant-bought. 1h two-way volume: ${i.flow.toLocaleString('en-GB')} units (min of both reported directions). Latest 5-minute two-way volume: ${i.latestFlow.toLocaleString('en-GB')} units. Average-price divergence: ${(i.drift*100).toFixed(1)}%. Net margin: ${i.spreadPct.toFixed(2)}%. At your entire budget: up to ${qty.toLocaleString('en-GB')} units before sharing capital with other markets. Tax per sold item: ${gp(taxPerItem(i.sell,i.name))}. <a href="https://prices.runescape.wiki/osrs/item/${i.id}" target="_blank" rel="noopener noreferrer">OSRS price details</a>. <strong>Observed quotes do not imply queue priority or fills.</strong><br><button class="btn small" data-record="${i.id}">Record a completed fill</button></div><button class="btn new-research-button" data-open-research="${i.id}">Inspect history &amp; build a ticket →</button></article>`;
 }).join('');}
$('marketsList').addEventListener('click',async event=>{
 const compare=event.target.closest('[data-compare]');if(compare){const id=Number(compare.dataset.compare);if(comparison.has(id))comparison.delete(id);else if(comparison.size<3)comparison.add(id);else message('Compare up to three markets. Clear a selection first.');renderMarkets();return;}
 const openResearch=event.target.closest('[data-open-research]');if(openResearch){studio.openResearch(Number(openResearch.dataset.openResearch));return;}
 const star=event.target.closest('button[data-star]');if(star){const id=Number(star.dataset.star);const next=new Set(watch);next.has(id)?next.delete(id):next.add(id);try{await save('watch',[...next]);watch=next;update();}catch{}return;}
 const record=event.target.closest('[data-record]');if(record){startTrade(Number(record.dataset.record));return;}
 const detail=event.target.closest('button[data-detail]');if(detail){const card=detail.closest('.market');const opened=card.classList.toggle('open');opened?openItems.add(Number(detail.dataset.detail)):openItems.delete(Number(detail.dataset.detail));detail.textContent=opened?'Hide':'Details';detail.setAttribute('aria-expanded',String(opened));}
});
$('marketsList').addEventListener('input',event=>{
 const form=event.target.closest('[data-calculator]');if(!form)return;const buy=Number(form.querySelector('[data-calc-buy]').value),sell=Number(form.querySelector('[data-calc-sell]').value);const item=mapping.find(i=>i.id===Number(form.dataset.calculator));
 form.querySelector('[data-calc-result]').textContent=validGP(buy)&&validGP(sell)?`Tax: ${gp(taxPerItem(sell,item.name))} · Margin: ${gp(sell-taxPerItem(sell,item.name)-buy)} / item · ROI: ${((sell-taxPerItem(sell,item.name)-buy)/buy*100).toFixed(2)}% · Break-even sale: ${gp(breakEvenSale(buy,item.name))}`:'Enter positive whole GP prices.';
});
function renderGoal(memory=tradingMemory(trades)){
 const week=periodProfit(memory.ledger).week,goal=Number($('goal').value)||0;
 $('goalProgress').textContent=`${gp(week)} realised / ${gp(goal)} target · ${gp(Math.max(0,goal-week))} remaining`;
 $('goalBar').value=goal>0?Math.max(0,Math.min(100,week/goal*100)):0;
}
function renderInsights(memory=tradingMemory(trades)){
 const errors=assumptionErrors(trades);if($('assumptionMemory'))$('assumptionMemory').innerHTML=`<h3>Recorded assumptions versus fills</h3><p>${errors.tickets} linked research tickets. Buy reference MAE: ${gp(errors.all.buy.mae)} / unit. Sale reference MAE: ${gp(errors.all.sell.mae)} / unit.</p><p>${errors.heldOutTickets?`${errors.heldOutTickets} later tickets held out chronologically; buy / sell MAE ${gp(errors.heldOut.buy.mae)} / ${gp(errors.heldOut.sell.mae)} per unit.`:'Fewer than 30 linked tickets: no held-out evaluation. Small samples cannot establish predictive quality.'}</p><p class="smallmuted">${esc(errors.note)}</p>`;
 renderGoal(memory);
 const quotes=new Map(items.map(i=>[i.id,i]));
 $('positionReviews').innerHTML=memory.ledger.holdings.length?memory.ledger.holdings.map(h=>{
  const r=positionReview(h,quotes.get(h.id));return `<article class="card intelligence-row"><h3>${esc(h.name)} · ${h.qty.toLocaleString()} held</h3><p>${gp(h.cost)} recorded cost · ${r.ageDays===null?'Age unknown':r.ageDays.toFixed(1)+' days since oldest remaining buy'}<br>Break-even exit for average cost, rounded up: ${gp(r.breakEven)} / item</p><p>${r.lowScenario===null?'Fresh exit prices unavailable':`Conditional P&amp;L at observed low / high: <b>${gp(r.lowScenario)} / ${gp(r.highScenario)}</b>`}</p><p class="smallmuted">${esc(r.caution)}. Scenarios are not realised profit or executable offers.</p><div class="buttons"><button class="btn small" data-insight-sell="${h.id}">Record an actual sale</button><button class="btn small" data-research="${h.id}">Research market</button></div></article>`;
 }).join(''):'<div class="card empty">No unsold purchases recorded. Record completed buys in Journal to review capital and break-even exits here.</div>';
 $('memoryMarkets').innerHTML=memory.markets.length?memory.markets.slice(0,50).map(m=>`<article class="card intelligence-row"><h3>${esc(m.name)}</h3><p>Realised: <b class="${m.profit>=0?'positive':'negative'}">${gp(m.profit)}</b> · Seven days: ${gp(m.profit7)} · Thirty days: ${gp(m.profit30)}</p><p>${m.matched.toLocaleString()} matched sold units · ${m.unmatched.toLocaleString()} unmatched · ${m.coverage===null?'No sales yet':(m.coverage*100).toFixed(0)+'% cost coverage'}<br>${m.buyDays} buying days / ${m.saleDays} selling days · ${m.averageHoldHours===null?'No matched holding-time evidence':m.averageHoldHours.toFixed(1)+'h quantity-weighted historical holding time'}</p><p class="smallmuted">${m.repeat?'Repeated recorded participation': 'Limited personal history'}${m.ageDays>=30?' · Dormant: worth rechecking current conditions':''}. Historical outcomes do not prove future capacity.${m.roi===null?'':` Recorded matched-cost return: ${m.roi.toFixed(2)}%.`}</p><button class="btn small" data-research="${m.id}">Research current market</button></article>`).join(''):'<div class="card empty">Your edge starts with real records. Journal completed purchases and sales; Insights will identify your winners, losses and capital tied up.</div>';
}
$('insights').addEventListener('click',async event=>{
 const research=event.target.closest('[data-research]');if(research){$('query').value=research.dataset.research;$('view').value='all';update();navigate('markets');return;}
 const sell=event.target.closest('[data-insight-sell]');if(sell){startTrade(Number(sell.dataset.insightSell));$('tradeSide').value='sell';previewTrade();}
});
function renderPlan(){const p=selectedPlan,budget=simpleCapital(read('tickets',[]),trades,Math.max(0,Number($('budget').value)||0),0).remaining;
 $('planBudget').textContent=compact(budget)+' gp';$('planCost').textContent=compact(p.allocated)+' gp';$('planRemaining').textContent=compact(p.remaining)+' gp';$('planProfit').textContent=compact(p.total)+' gp';
 $('allocationInfo').textContent=`${$('avoidHeld').value==='yes'?'Existing inventory items excluded. ':''}${$('profile').value==='cautious'?'Cautious mode requires fresh 5m/hourly references and a positive 2% exit stress. ':''}${p.selected.length} of ${p.availableSlots??0} free slots · ${$('maxShare').value}% maximum per item · ${gp(p.reserve)} reserved. Edit allocation controls under Budget & screening filters.`;
 $('planRows').innerHTML=p.selected.length?p.selected.map((i,n)=>`<div class="planrow"><strong class="ink-text">${n+1}. ${esc(i.name)}</strong><div class="smallmuted">${i.qty.toLocaleString()} units · ${gp(i.buy)} reference buy → ${gp(i.sell)} reference sell</div><div class="plan-numbers"><span>Capital<br><b>${gp(i.cost)}</b></span><span>Potential margin<br><b class="positive">${gp(i.opportunity)}</b></span></div><div class="smallmuted">${gp(i.remaining)} remaining after allocation · limit remaining ${Math.max(0,i.limit-(recentPurchases(trades)[i.id]||0))}/4h · ${i.flow>=1000?'Active':'Thin'} hourly flow. Fills uncertain.</div><div class="plan-actions"><span class="badge">${i.age>30||i.drift>0.1||i.latestFlow===0?'Elevated':'Moderate'} execution risk</span><button class="btn small" data-plan-research="${i.id}">Research</button><button class="btn small" data-plan-record="${i.id}">Record fill</button></div></div>`).join(''):'<div class="empty">No trades fit your screening, allocation and limit settings. A smaller per-item cap can exclude expensive items. Cash stays unallocated.</div>';

}
$('planRows').addEventListener('click',async e=>{const r=e.target.closest('[data-plan-research]');if(r){studio.openResearch(Number(r.dataset.planResearch));return;}const b=e.target.closest('[data-plan-record]');if(b)startTrade(Number(b.dataset.planRecord));});
function populateItems(){const dl=$('itemOptions');dl.innerHTML=mapping.slice(0,6000).map(i=>`<option value="${esc(i.name)}"></option>`).join('');}
const localNow=()=>{const d=new Date();return new Date(+d-d.getTimezoneOffset()*60000).toISOString().slice(0,16);};
let newDateInput=localNow();$('tradeDate').value=newDateInput;
$('tradeForm').addEventListener('submit',exclusive(async event=>{event.preventDefault();const input=$('tradeItem').value.trim(),i=mapping.find(x=>x.name.toLowerCase()===input.toLowerCase()||String(x.id)===input);
 if(!i){alert('Pick an exact item name from the loaded OSRS mapping (or its item ID).');return;}
 const qty=Number($('tradeQty').value),price=$('tradeSide').value==='adjust-out'?1:Number($('tradePrice').value);if(!validGP(qty)||!validGP(price)||!Number.isSafeInteger(qty*price)){alert('Enter valid whole GP prices and quantities.');return;}
 const date=editing!==null&&$('tradeDate').value===editingDateInput?trades[editing].date:editing===null&&$('tradeDate').value===newDateInput?new Date().toISOString():new Date($('tradeDate').value).toISOString();if(Date.parse(date)>Date.now()){alert('Completed fills cannot be in the future.');return;}
 const side=$('tradeSide').value,reason=$('tradeReason').value.trim();if(side.startsWith('adjust-')&&reason.length<3){alert('Give an inventory adjustment reason.');return;}const entry={...(editing!==null?Object.fromEntries(['ticketKey','research'].filter(k=>trades[editing][k]!==undefined).map(k=>[k,trades[editing][k]])):{}),uid:editing===null?crypto.randomUUID():trades[editing].uid,id:i.id,name:i.name,side,qty,price,date,...(reason?{reason}:{}),...(side==='sell'?{taxBasis:$('tradeTax').value===''?'current-rule-assumed':'actual-total',...($('tradeTax').value===''?{}:{taxPaid:Number($('tradeTax').value)})}:{})};
 const next=[...trades];if(editing===null)next.push(entry);else next[editing]=entry;
 const before=realizedLedger(trades),after=realizedLedger(next);if(after.unmatchedUnits>before.unmatchedUnits&&!confirm(`${after.unmatchedUnits-before.unmatchedUnits} additional sold units have no earlier matching purchase. Those units will not count as realised profit. Save anyway?`))return;
 try{validateBackup({format:'golden-exchange-ledger-v1',trades:next});const changed=journalChange({tickets:read('tickets',[]),trades,budget:Number($('budget').value)},next);await saveMany(changed);$('budget').value=changed.budget;}catch(err){alert(err.message);return;}trades=next;cancelEdit();$('journalStatus').textContent='Completed fill saved on this device.';update();}));
function cancelEdit(){editing=null;$('tradeForm').reset();newDateInput=localNow();$('tradeDate').value=newDateInput;$('cancelEdit').hidden=true;$('saveTrade').textContent='Save completed fill';$('tradePreview').textContent='';previewTrade();}
$('cancelEdit').addEventListener('click',cancelEdit);
function startTrade(id){cancelEdit();$('tradeItem').value=mapping.find(i=>i.id===id)?.name||'';navigate('journal');$('tradeQty').focus();previewTrade();}
function previewTrade(){
 const side=$('tradeSide').value,adjust=side.startsWith('adjust-');$('tradePrice').required=side!=='adjust-out';$('tradePrice').closest('label').hidden=side==='adjust-out';$('tradeTax').closest('label').hidden=side!=='sell';$('tradeReason').required=adjust;
 const meta=mapping.find(i=>i.name.toLowerCase()===$('tradeItem').value.trim().toLowerCase()||String(i.id)===$('tradeItem').value.trim());const qty=Number($('tradeQty').value),price=Number($('tradePrice').value),actual=$('tradeTax').value!=='';
 const tax=actual?Number($('tradeTax').value):qty*taxPerItem(price,meta?.name);
 $('tradePreview').textContent=adjust?'Inventory correction only. A write-off removes FIFO stock and its committed cost without a sale or realised profit. An addition requires known acquisition cost.':meta&&validGP(qty)&&validGP(price)&&Number.isSafeInteger(qty*price)?`Fill value: ${gp(qty*price)}${side==='sell'?` · ${actual?'recorded':'assumed current-rule'} sale tax: ${gp(tax)} · proceeds: ${gp(qty*price-tax)}`:''}. Enter your actual fill price, not a market estimate.`:'';
}
$('tradeForm').addEventListener('input',previewTrade);previewTrade();
function renderJournal(){if($('journalAudit'))$('journalAudit').innerHTML=read('audit',[]).slice(-30).reverse().map(e=>`<p class="smallmuted">${esc(new Date(e.at).toLocaleString())} · ${esc(e.action)} · ${esc(e.after?.name||e.before?.name||'local records')}${e.after?.reason?' · '+esc(e.after.reason):''}</p>`).join('')||'No corrections recorded since migration.';const ledger=realizedLedger(trades);const periods=periodProfit(ledger);$('todayProfit').textContent=gp(periods.today);$('weekProfit').textContent=gp(periods.week);
 $('backupStatus').textContent=read('lastBackup',null)?'Last backup shared/downloaded: '+new Date(read('lastBackup',null)).toLocaleString():'No backup exported yet. Keep a JSON copy before uninstalling.';
 $('inventory').innerHTML=ledger.holdings.length?ledger.holdings.map(i=>`<p>${esc(i.name)} · ${i.qty.toLocaleString()} units · ${gp(i.cost)} cost</p>`).join(''):'No remaining purchased inventory.';$('realizedProfit').textContent=(ledger.profit>=0?'+':'')+gp(ledger.profit);$('realizedProfit').style.color=ledger.profit<0?'var(--red)':'var(--mint)';
 $('ledgerInfo').textContent=`${trades.filter(t=>t.side==='sell'&&t.taxPaid===undefined).length} sales use assumed current-rule tax; older tax rules may differ. Actual tax can be entered when correcting a sale. `+`${ledger.matchedUnits.toLocaleString('en-GB')} sold units matched · ${ledger.holdingUnits.toLocaleString('en-GB')} purchased units remaining · ${ledger.unmatchedUnits.toLocaleString('en-GB')} sold units missing matching purchases.`;
 $('tradesList').innerHTML=trades.length?[...trades].map((t,index)=>({...t,index})).sort((a,b)=>Date.parse(b.date)-Date.parse(a.date)||b.index-a.index).slice(0,tradePageSize).map(t=>`<div class="trade"><div><span class="pill ${t.side==='sell'?'sell':''}">${esc(t.side)}</span> <strong>${esc(t.name)}</strong><div class="smallmuted">${new Date(t.date).toLocaleString('en-GB')} · ${t.side.startsWith('adjust-')?t.qty.toLocaleString('en-GB')+' units · inventory adjustment':t.qty.toLocaleString('en-GB')+' × '+gp(t.price)}</div>${t.side==='sell'?`<small class="${(ledger.matched.find(m=>m.index===t.index)?.gain||0)<0?'negative':'positive'}">Realised: ${gp(ledger.matched.find(m=>m.index===t.index)?.gain||0)} · ${ledger.matched.find(m=>m.index===t.index)?.qty||0} matched / ${t.qty} sold</small>`:''}</div><div class="buttons"><button class="btn small" data-edit="${t.index}">Edit</button><button class="btn small" data-remove="${t.index}" aria-label="Delete this trade">✕</button></div></div>`).join(''):'No trades recorded yet.';$('moreTrades').hidden=trades.length<=tradePageSize;}
$('tradesList').addEventListener('click',exclusive(async event=>{
 const edit=event.target.closest('[data-edit]');if(edit){editing=Number(edit.dataset.edit);const t=trades[editing];$('tradeItem').value=t.name;$('tradeSide').value=t.side;$('tradeQty').value=t.qty;$('tradePrice').value=t.price;$('tradeReason').value=t.reason||'';$('tradeTax').value=t.taxPaid??'';const d=new Date(t.date);$('tradeDate').value=new Date(+d-d.getTimezoneOffset()*60000).toISOString().slice(0,16);editingDateInput=$('tradeDate').value;$('saveTrade').textContent='Save corrected fill';$('cancelEdit').hidden=false;previewTrade();$('tradeForm').scrollIntoView({behavior:'smooth'});return;}
 const b=event.target.closest('[data-remove]');if(!b)return;
 const next=trades.filter((_,index)=>index!==Number(b.dataset.remove));const orphan=realizedLedger(next).unmatchedUnits-realizedLedger(trades).unmatchedUnits;
 if(!confirm('Remove this trade?'+(orphan>0?` ${orphan} sold units will lose their purchase match and be excluded from realised profit.`:'')))return;
 try{const changed=journalChange({tickets:read('tickets',[]),trades,budget:Number($('budget').value)},next);await saveMany(changed);$('budget').value=changed.budget;trades=next;cancelEdit();update();}catch(e){alert(e.message);}
}));
$('exportLedger').addEventListener('click',async()=>{
 try{
  if(storageIssues().length)throw Error('Saved data needs recovery; the original data has been kept. Restore a valid backup before exporting.');
  const settings=Object.fromEntries(Object.keys(defaults).map(id=>[id,$(id).value]));
  const text=JSON.stringify({format:'golden-exchange-backup-v3',audit:read('audit',[]),exportedAt:new Date().toISOString(),trades,watch:[...watch],settings,tickets:read('tickets',[]),owned:read('owned',[])},null,2);
  const filename='golden-exchange-backup-'+new Date().toISOString().slice(0,10)+'.json';
  if(Capacitor.isNativePlatform()){
   const file=await Filesystem.writeFile({path:'backups/'+filename,recursive:true,data:text,directory:Directory.Cache,encoding:Encoding.UTF8});
   await Share.share({title:'Golden Exchange backup',files:[file.uri]});
  }else{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([text],{type:'application/json'}));a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),5000);}
 await save('lastBackup',new Date().toISOString());renderJournal();
 }catch(error){message('Backup export failed: '+error.message,true);}
});
$('importLedger').addEventListener('click',async ()=>$('importFile').click());
$('importFile').addEventListener('change',async event=>{
 const file=event.target.files?.[0];if(!file)return;
 try{
  if(file.size>32000000)throw Error('Backup too large (32 MB maximum)');
  let imported=JSON.parse(await file.text());const hubOnly=imported.format==='golden-hub-osrs-v1';
  if(hubOnly)imported=await convertHubBackup(imported);
  const clean=validateBackup(imported),journalOnly=hubOnly||imported.format==='golden-exchange-ledger-v1';
  if($('importMode').value==='merge'){
   if(storageIssues().length)throw Error('Recover damaged saved data with a full replacement backup first.');
   const merged=mergeJournal({trades,watch:[...watch],tickets:read('tickets',[]),owned:read('owned',[]),audit:read('audit',[]),settings:Object.fromEntries(Object.keys(defaults).map(k=>[k,$(k).value]))},imported);
   const changed=journalChange({tickets:read('tickets',[]),trades,budget:Number($('budget').value)},merged.trades);
   if(!confirm(`Add ${merged.added} new journal entries and merge watchlists? Matching IDs are skipped; conflicting IDs are rejected. Current settings and owned lists stay. Trading pot becomes ${gp(Number(changed.budget))}. Export a backup first.`))return;
   await saveMany({...changed,watch:merged.watch});trades=read('trades',[]);watch=new Set(merged.watch);$('budget').value=changed.budget;cancelEdit();studio?.reloadPersonal();update();message(`Merged ${merged.added} journal entries.`);return;
  }
  if(journalOnly&&storageIssues().some(k=>k!=='trades'))throw Error('A journal-only backup cannot recover the other damaged settings or lists. Restore a full Golden Exchange backup.');
  if(journalOnly){clean.settings=Object.fromEntries(Object.keys(defaults).map(id=>[id,$(id).value]));clean.watch=[...watch];clean.tickets=read('tickets',[]);clean.owned=read('owned',[]);}
  if(!confirm(journalOnly?`Replace only the journal with ${clean.trades.length} fills? Session settings, watchlist, tickets and owned items stay saved.`:`Replace journal, session settings, watchlist, tickets and owned items with this backup (${clean.trades.length} fills)?`))return;
  await saveMany({...clean.settings,trades:clean.trades,watch:clean.watch,tickets:clean.tickets,owned:clean.owned,...(clean.audit?{audit:clean.audit}:{}),setupComplete:journalOnly?read('setupComplete',false):true},{recover:true});
  cancelEdit();
  trades=read('trades',[]);watch=new Set(clean.watch);for(const [k,v] of Object.entries(clean.settings))$(k).value=v;studio?.reloadPersonal();update();message('Backup imported.');
 }catch(err){alert('Import failed: '+err.message);}finally{event.target.value='';}
});
$('refresh').addEventListener('click',refresh);
if(Capacitor.isNativePlatform()){
 App.addListener('backButton',()=>{if($('compareDialog').open){$('compareDialog').close();return;}if($('privacyDialog').open){$('privacyDialog').close();return;}if(simple?.closeDialog())return;if(studio?.closeResearch())return;const open=activeTab==='markets'?document.querySelector('.market.open'):null;if(open){openItems.delete(Number(open.dataset.id));open.classList.remove('open');open.querySelector('[data-detail]').textContent='Details';}else if(editing!==null){cancelEdit();}else if(activeTab!=='home')navigate('home');else if(!document.body.classList.contains('simple-view'))simple?.goHome();else App.minimizeApp();});
 App.addListener('appStateChange',({isActive})=>{if(isActive){applySnapshot();if(shouldRefresh(snapshot))refresh();}});
}
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'){applySnapshot();if(shouldRefresh(snapshot))refresh();}});
window.addEventListener('offline',()=>{feedState=snapshot?'Cached · offline':'Offline';applySnapshot();message('Offline. Saved data retains its original timestamps.',true);});
window.addEventListener('online',()=>refresh());
setInterval(()=>{if(snapshot){items=asItems(mapping,snapshot.latest,snapshot['5m'],snapshot['1h']);if(shouldRefresh(snapshot)){feedState='Cached';$('updated').textContent=feedState;}update();}},60000);
studio=createStudio({
 context:()=>({mapping,items,candidates:latestCandidates,allocation:selectedPlan,trades,watch,heldIds:$('avoidHeld').value==='yes'?new Set([...realizedLedger(trades).holdings.map(h=>h.id),...read('owned',[]).map(h=>h.id)]):new Set(),budget:Number($('budget').value)||0,mode:$('mode').value,restriction:$('restriction').value,maxShare:Number($('maxShare').value)/100,reserve:Number($('reserve').value)/100,storageError:storageIssues().length>0,slots:Math.min($('mode').value==='members'?8:3,$('freeSlots').value==='auto'?8:Number($('freeSlots').value))}),
 navigate,startTrade,update,message,
 applySettings:()=>{for(const id of Object.keys(defaults))$(id).value=read(id,defaults[id]);},
 toggleWatch:async id=>{const next=new Set(watch);next.has(id)?next.delete(id):next.add(id);await save('watch',[...next]);watch=next;update();}
});
simple=createSimple({context:()=>({mapping,items,candidates:latestCandidates,trades,heldIds:$('avoidHeld').value==='yes'?new Set([...realizedLedger(trades).holdings.map(h=>h.id),...read('owned',[]).map(h=>h.id)]):new Set(),budget:Number($('budget').value)||0,mode:$('mode').value,restriction:$('restriction').value,maxShare:Number($('maxShare').value)/100,reserve:Number($('reserve').value)/100,storageError:storageIssues().length>0,slots:Math.min($('mode').value==='members'?8:3,$('freeSlots').value==='auto'?8:Number($('freeSlots').value)),busy,feedState,lastRefresh:snapshot?.times?.latest||null,feedHealth:{clockSkew:['5m','1h'].some(p=>snapshot?.[p]?.timestamp>Date.now()/1000+60),hourFresh:aggregateFresh('1h',snapshot?.['1h']),fiveFresh:aggregateFresh('5m',snapshot?.['5m'])},screening:{members:$('mode').value==='members',profile:$('profile').value,maxAge:Number($('age').value),minVolume:Number($('minVolume').value)}}),navigate,refresh,
 reload:()=>{trades=read('trades',[]);for(const id of Object.keys(defaults))$(id).value=read(id,defaults[id]);update();},
 chart:id=>studio.openChart(id),
 openControls:field=>{document.body.classList.remove('simple-view');$('returnSimple').hidden=false;navigate('markets');$('settingsPanel').open=true;$(field).scrollIntoView({block:'center'});$(field).focus();}
});
if(snapshot){feedState='Cached';applySnapshot();}
populateItems();update();refresh();

$('closePrivacy').addEventListener('click',()=>$('privacyDialog').close());
document.addEventListener('click',e=>{const a=e.target.closest('a[href]');if(!a)return;if(a.hasAttribute('data-privacy')){e.preventDefault();$('privacyDialog').showModal();return;}const u=new URL(a.href,location.href);const allowed=['oldschool.runescape.wiki','prices.runescape.wiki','legal.jagex.com','support.google.com','github.com'];if(u.origin!==location.origin&&(u.protocol!=='https:'||!allowed.includes(u.hostname))){e.preventDefault();message('External link blocked.',true);}});

$('eraseData').addEventListener('click',exclusive(async()=>{
 if(!confirm('Delete ALL journal records, settings, research, watchlists, cached markets and retained migration originals on this device? Export a backup first. Shared backup copies are not deleted. This cannot be undone.'))return;
 try{
  if(Capacitor.isNativePlatform()){
   const cache=await Filesystem.readdir({path:'',directory:Directory.Cache});
   for(const entry of cache.files){if(entry.name==='backups')await Filesystem.rmdir({path:'backups',directory:Directory.Cache,recursive:true});else if(/^golden-exchange-backup-.*\.json$/.test(entry.name))await Filesystem.deleteFile({path:entry.name,directory:Directory.Cache});}
  }
  await eraseLocalData();location.reload();
 }catch(e){message('Deletion could not finish: '+e.message+'. Exported copies outside app storage are unaffected.',true);}
}));

function renderComparison(){
 const selected=[...comparison].map(id=>items.find(i=>i.id===id)||mapping.find(i=>i.id===id));
 const fields=[['Observed buy',i=>gp(i.buy)],['Observed sell',i=>gp(i.sell)],['Net margin / item',i=>gp(i.profit)],['After-tax ROI',i=>Number.isFinite(i.spreadPct)?i.spreadPct.toFixed(2)+'%':'—'],['4-hour limit',i=>i.limit?.toLocaleString()??'Unknown'],['Hourly two-way units',i=>Number.isFinite(i.flow)?i.flow.toLocaleString():'—'],['Price age',i=>timeAgo(i.age)],['Evidence',i=>validGP(i.buy)?marketEvidence(i).signals.join(' · ')||'Recent references agree; fills uncertain':'No complete quotes']];
 $('compareTable').innerHTML='<table><thead><tr><th scope="col">Measure</th>'+selected.map(i=>`<th scope="col">${esc(i.name)}</th>`).join('')+'</tr></thead><tbody>'+fields.map(([label,fn])=>`<tr><th scope="row">${label}</th>${selected.map(i=>`<td>${esc(fn(i))}</td>`).join('')}</tr>`).join('')+'</tbody></table>';
}
$('compareOpen').addEventListener('click',()=>{renderComparison();$('compareDialog').showModal();});
$('compareClear').addEventListener('click',()=>{comparison.clear();renderMarkets();});
$('compareClose').addEventListener('click',()=>$('compareDialog').close());

// Same-origin Hub adapter: no credentials or private records cross message boundaries.
window.GoldenExchangeHub={
 record:id=>{if(!mapping.some(m=>m.id===id))return false;document.body.classList.remove('simple-view');$('returnSimple').hidden=false;startTrade(id);return true;},
 back:()=>{const dialog=document.querySelector('dialog[open]');if(dialog){dialog.close();return true;}if(activeTab!=='home'){navigate('home');return true;}return false;},
 view:()=>({tab:activeTab,simple:document.body.classList.contains('simple-view'),choice:simple?.remember?.(),comparison:[...comparison],openItems:[...openItems],editingUid:editing!==null?trades[editing]?.uid:null,editingDateInput,research:studio?.remember?.()}),
 restore:s=>{if(Array.isArray(s?.comparison)){comparison.clear();for(const id of s.comparison.slice(0,3))if(Number.isSafeInteger(id))comparison.add(id);}if(Array.isArray(s?.openItems))for(const id of s.openItems)if(Number.isSafeInteger(id))openItems.add(id);if(s?.editingUid){const index=trades.findIndex(t=>t.uid===s.editingUid);if(index>=0){editing=index;editingDateInput=String(s.editingDateInput||'');$('saveTrade').textContent='Save corrected fill';$('cancelEdit').hidden=false;}}if(['home','markets','planner','journal','insights'].includes(s?.tab))navigate(s.tab);document.body.classList.toggle('simple-view',s?.simple!==false);if(s?.choice)simple?.restore?.(s.choice);if(s?.research)studio?.restore?.(s.research);},
 summary:()=>({today:periodProfit(realizedLedger(trades)).today,week:periodProfit(realizedLedger(trades)).week,rows:trades.length})
};
window.dispatchEvent(new Event('exchange-ready'));
