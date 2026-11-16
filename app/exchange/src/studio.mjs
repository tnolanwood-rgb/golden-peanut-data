import {exclusive} from './actions.mjs';
import {scenarioMarkup} from './presentation.mjs';
import {simpleCapital} from './simple-plan.mjs';
import {gp,compact,validGP,MAX_GP,taxPerItem,recentPurchases} from './core.mjs';
import {marketEvidence} from './intelligence.mjs';
import {loadHistory} from './api.mjs';
import {historySummary,historyVerdict} from './history.mjs';
import {ticketMath,validateTickets,validateOwned,accountRestriction,candidateReason} from './workspace.mjs';
import {read,save,saveMany} from './storage.mjs';
const $=id=>document.getElementById(id);
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const countActivity=v=>Number.isFinite(v)?v.toLocaleString('en-GB'):'unavailable';
const active=t=>t.status!=='closed';
export function createStudio(host){
 let selectedId=null,historyCache=read('history-cache',{}),historyBusy=false,historyGeneration=0;
 if(!historyCache||typeof historyCache!=='object'||Array.isArray(historyCache))historyCache={};
 const tickets=()=>read('tickets',[]),owned=()=>read('owned',[]);
 const meta=id=>host.context().mapping.find(m=>m.id===id);
 const quote=id=>host.context().items.find(m=>m.id===id);
 const find=text=>host.context().mapping.find(m=>m.name.toLowerCase()===text.trim().toLowerCase()||String(m.id)===text.trim());
 const capital=()=>{const c=host.context();return simpleCapital(tickets(),c.trades,c.budget,c.slots);};
 function feedback(id,text,error=false){$(id).textContent=text;$(id).classList.toggle('negative',error);}
 // Existing saved balances are never changed until the user confirms this form.
 $('sessionCash').value=read('setupComplete',false)?host.context().budget:100000000;
 $('sessionMode').value=read('setupComplete',false)?host.context().mode:'f2p';
 $('sessionRestriction').value=read('restriction','unknown');
 $('sessionSetup').open=!read('setupComplete',false);
 function syncSessionForm(){const c=host.context();$('sessionCash').value=c.budget;$('sessionMode').value=c.mode;$('sessionRestriction').value=c.restriction;}
 $('sessionSetup').addEventListener('toggle',async ()=>{if($('sessionSetup').open&&read('setupComplete',false))syncSessionForm();});
 $('sessionForm').addEventListener('submit',exclusive(async event=>{
  event.preventDefault();const budget=Number($('sessionCash').value);if(!Number.isSafeInteger(budget)||budget<0||budget>MAX_GP){feedback('sessionFeedback','Enter a valid whole-GP budget.',true);return;}
  try{await saveMany({budget:String(budget),mode:$('sessionMode').value,restriction:$('sessionRestriction').value,setupComplete:true});host.applySettings();$('sessionSetup').open=false;feedback('sessionFeedback','Session saved on this device.');host.update();}catch(e){feedback('sessionFeedback','Could not save: '+e.message,true);}
 }));
 $('openOwned').addEventListener('click',async ()=>host.navigate('owned'));
 $('homeCandidates').addEventListener('click',async event=>{const b=event.target.closest('[data-home-research]');if(b)openResearch(Number(b.dataset.homeResearch));});
 $('ownedForm').addEventListener('submit',exclusive(async event=>{
  event.preventDefault();const item=find($('ownedItem').value),qty=Number($('ownedQty').value);
  if(!item||!validGP(qty)){feedback('ownedStatus','Choose an exact item name or ID and a whole quantity.',true);return;}
  const next=[...owned().filter(r=>r.id!==item.id),{id:item.id,name:item.name,qty}];
  try{await save('owned',validateOwned(next));$('ownedForm').reset();feedback('ownedStatus',item.name+' saved. No profit or cash was added.');host.update();}catch(e){feedback('ownedStatus','Could not save: '+e.message,true);}
 }));
 $('ownedCards').addEventListener('click',async event=>{
  const research=event.target.closest('[data-owned-research]');if(research){openResearch(Number(research.dataset.ownedResearch));return;}
  const remove=event.target.closest('[data-owned-remove]');if(remove){try{await save('owned',owned().filter(r=>r.id!==Number(remove.dataset.ownedRemove)));host.update();}catch(e){feedback('ownedStatus',e.message,true);}return;}
  const record=event.target.closest('[data-owned-record]');if(record){host.startTrade(Number(record.dataset.ownedRecord));$('tradeSide').value='sell';$('tradePreview').textContent='Enter the actual completed sale. Without a recorded purchase, sale proceeds will not count as realised profit.';}
 });
 $('savedTickets').addEventListener('click',async event=>{
  const research=event.target.closest('[data-ticket-research]');if(research){openResearch(Number(research.dataset.ticketResearch));return;}
  const record=event.target.closest('[data-ticket-record]');if(record){const t=tickets().find(t=>t.key===record.dataset.ticketRecord);if(t){host.startTrade(t.id);$('tradeSide').value=t.status==='selling'?'sell':'buy';}return;}
  const remove=event.target.closest('[data-ticket-remove]');if(remove&&confirm('Delete this research ticket? Journal fills remain unchanged.')){try{await save('tickets',tickets().filter(t=>t.key!==remove.dataset.ticketRemove));host.update();}catch(e){host.message(e.message,true);}}
 });
 $('savedTickets').addEventListener('change',async event=>{
  const select=event.target.closest('[data-ticket-status]');if(!select)return;
  try{const next=tickets().map(t=>t.key===select.dataset.ticketStatus?{...t,status:select.value}:t);await save('tickets',validateTickets(next));host.update();}catch(e){host.message('Could not save ticket state: '+e.message,true);host.update();}
 });
 $('closeResearch').addEventListener('click',async ()=>$('researchDialog').close());
 $('researchDialog').addEventListener('close',()=>{historyGeneration++;selectedId=null;});
 $('loadHistory').addEventListener('click',fetchHistory);
 $('ticketForm').addEventListener('input',previewTicket);
 $('ticketForm').addEventListener('submit',exclusive(async event=>{
  event.preventDefault();const c=host.context(),item=quote(selectedId),m=meta(selectedId);
  if(!m||!item)return;
  try{
   if(c.storageError)throw Error('Restore your saved data before saving a new trade ticket.');
   const qty=Number($('ticketQty').value),buy=Number($('ticketBuy').value),sell=Number($('ticketSell').value),math=ticketMath({qty,buy,sell,name:m.name});
   if(c.mode==='f2p'&&m.members)throw Error('Members items are excluded from new F2P purchases.');
   if(accountRestriction(m,c.mode,c.restriction))throw Error('This item is restricted on new F2P accounts. Confirm your account eligibility in session settings first.');
   if(item.age>Number($('age').value)||!Number.isFinite(item.age))throw Error('Refresh stale prices before saving a new trade ticket.');
   if(!Number.isSafeInteger(item.limit)||item.limit<1)throw Error('The four-hour buy limit is unknown. Do not size this trade from the app.');
   const used=recentPurchases(c.trades)[m.id]||0;if(qty>Math.max(0,item.limit-used))throw Error('Quantity exceeds the remaining recorded four-hour buy limit.');
   if(qty>item.potentialQty)throw Error('Quantity exceeds the conservative recent-volume screening cap of '+item.potentialQty.toLocaleString()+'.');
   if(math.perItem<=0)throw Error('These prices do not leave a positive margin after tax.');
   const existing=tickets().find(t=>t.id===m.id&&active(t));const others=tickets().filter(t=>t.key!==existing?.key);
   const room=simpleCapital(others,c.trades,c.budget,c.slots);if(room.slotsRemaining<1)throw Error('No unallocated GE slots remain. Close a ticket or update your free-slot setting.');
   if(math.cost>room.remaining)throw Error('This ticket exceeds the remaining session budget.');
   if(math.cost>room.remaining-Math.floor(c.budget*c.reserve))throw Error('This ticket would use your reserved cash. Change the reserve in screening settings to use it.');
   if(math.cost>Math.floor(c.budget*c.maxShare))throw Error('This ticket exceeds your per-item cash cap. Adjust Maximum cash per item in screening settings to change it.');
   const t={key:existing?.key||crypto.randomUUID(),id:m.id,name:m.name,qty,buy,sell,status:existing?.status||'planned',createdAt:existing?.createdAt||new Date().toISOString(),research:{version:'4.0-v1',at:new Date().toISOString(),buy,sell,qty}};
   await save('tickets',validateTickets([...others,t]));feedback('ticketStatus','Saved to your desk. This is not a placed order or a completed fill.');host.update();
  }catch(e){feedback('ticketStatus',e.message,true);}
 }));
 $('researchWatch').addEventListener('click',async ()=>{if(selectedId!==null){await host.toggleWatch(selectedId);renderWatch();}});
 $('researchRecord').addEventListener('click',async ()=>{const id=selectedId;$('researchDialog').close();if(id!==null)host.startTrade(id);});
 function renderWatch(){$('researchWatch').textContent=host.context().watch.has(selectedId)?'★ Watching item':'☆ Watch item';}
 function openResearch(id){
 $('researchDialog').classList.remove('simple-chart');$('researchDialog').querySelector('.research-block h3').textContent='Does the spread persist?';
  const m=meta(id),i=quote(id);if(!m)return;selectedId=id;historyGeneration++;historyBusy=false;$('loadHistory').disabled=false;$('loadHistory').textContent='Load 7 days';
  $('researchTitle').textContent=m.name;feedback('ticketStatus','');renderWatch();
  if(i){const e=marketEvidence(i);$('researchFacts').innerHTML=`<span class="status-pill">${m.members?'Members':'F2P'} · #${m.id} · Older reference side ${Math.round(i.age)}m ago</span><div class="facts-grid spaced-facts"><div class="fact"><small>Observed low · buying reference</small><strong>${gp(i.buy)}</strong></div><div class="fact"><small>Observed high · selling reference</small><strong>${gp(i.sell)}</strong></div><div class="fact"><small>After-tax spread / item</small><strong>${gp(i.profit)}</strong></div><div class="fact"><small>Recent-average margin / item</small><strong>${gp(e.confirmedMargin)}</strong></div></div><ul class="reason-list">${candidateReason(i).map(r=>`<li>${esc(r)}</li>`).join('')}</ul><p class="smallmuted">4h buy limit ${i.limit?.toLocaleString()??'unknown'} · Hourly two-way flow ${compact(i.flow)} · Screening cap ${i.potentialQty.toLocaleString()} units. These are observed transactions, not live bids and asks.</p>${accountRestriction(m,host.context().mode,host.context().restriction)?'<p class="restriction-note">This item is restricted for new F2P accounts. It is excluded while eligibility is restricted or unknown.</p>':''}`;
   const old=tickets().find(t=>t.id===id&&active(t));$('ticketQty').value=old?.qty||Math.max(1,Math.min(Math.max(1,Math.floor((i.potentialQty||1)*.1)),Math.floor(Math.min(capital().remaining,host.context().budget*host.context().maxShare)/Math.max(1,e.referenceBuy))||1,Math.max(1,(i.limit||1)-(recentPurchases(host.context().trades)[i.id]||0))));$('ticketBuy').value=old?.buy||e.referenceBuy;$('ticketSell').value=old?.sell||e.referenceSell;
  }else{$('researchFacts').innerHTML='<p class="restriction-note">Two-sided current prices are unavailable. No margin or ticket can be calculated.</p>';$('ticketQty').value='';$('ticketBuy').value='';$('ticketSell').value='';}
  if(i)$('researchFacts').insertAdjacentHTML('beforeend',scenarioMarkup(i,1));$('saveTicket').disabled=!i;previewTicket();renderHistory(id);
  if(!$('researchDialog').open)$('researchDialog').showModal();$('researchDialog').scrollTop=0;
 }
 function previewTicket(){try{const m=meta(selectedId);if(!m)return;const values={qty:Number($('ticketQty').value),buy:Number($('ticketBuy').value),sell:Number($('ticketSell').value),name:m.name};const p=ticketMath(values);$('ticketPreview').innerHTML=`Capital required <b>${gp(p.cost)}</b><br>Tax on the sale <b>${gp(p.tax)}</b> · Net sale proceeds <b>${gp(p.proceeds)}</b><br><span class="${p.margin>0?'positive':'negative'}">Conditional margin <b>${gp(p.margin)}</b> (${p.roi.toFixed(2)}%)</span><br>Break-even exit <b>${gp(p.breakEven)} / item</b><br><span class="smallmuted">Only if every unit buys and sells at your entered prices. Not expected or realised profit.</span>`;}catch{$('ticketPreview').textContent='Enter positive whole quantities and prices to inspect this scenario.';}}
 async function fetchHistory(){
  if(historyBusy||selectedId===null)return;const id=selectedId,generation=++historyGeneration;historyBusy=true;$('loadHistory').disabled=true;$('loadHistory').textContent='Loading…';$('historyView').textContent='Fetching seven days of actual Wiki observations…';
  try{const result=await loadHistory(id,historyCache);historyCache[id]=result;
   const newest=Object.entries(historyCache).sort((a,b)=>b[1].fetchedAt-a[1].fetchedAt).slice(0,12);historyCache=Object.fromEntries(newest);
   try{await save('history-cache',historyCache);}catch{if(generation===historyGeneration)host.message('History loaded but could not be cached: device storage is full.',true);}
   if(generation===historyGeneration&&selectedId===id)renderHistory(id);
  }catch(e){if(generation===historyGeneration&&selectedId===id)$('historyView').textContent='History unavailable: '+e.message+'. Current market references remain separate; no history was invented.';}
  finally{if(generation===historyGeneration){historyBusy=false;$('loadHistory').disabled=false;$('loadHistory').textContent=$('researchDialog').classList.contains('simple-chart')?'Update':'Load 7 days';}}
 }
 function renderHistory(id){
  const cached=historyCache[id],m=meta(id);if(!cached||!m){$('historyView').innerHTML='<p class="smallmuted">Load seven days before deciding whether the latest spread is typical or a one-off observation. This makes one item-specific request and caches it for an hour.</p>';return;}
  let summary;try{summary=historySummary(cached.raw,m.name);}catch{$('historyView').textContent='Saved historical data could not be read. Load it again.';return;}
  const verdict=historyVerdict(summary,quote(id));
  if(summary.status==='empty'){$('historyView').textContent=summary.note;return;}
  const stale=Date.now()-cached.fetchedAt>=3600000||summary.status==='stale';
  $('historyView').innerHTML=`<p><span class="status-pill">${stale?'Cached · review freshness':cached.cached?'Cached history':'Fetched history'}</span> Last fetched ${esc(new Date(cached.fetchedAt).toLocaleString())}${cached.error?' · Last update failed: '+esc(cached.error):''}</p><p class="${verdict.tone==='good'?'positive':'orange'}"><b>${esc(verdict.label)}</b></p><ul class="reason-list">${verdict.reasons.map(r=>`<li>${esc(r)}</li>`).join('')}</ul>${chart(summary.rows)}<p class="simple-activity">Market in the last reported hour: ${countActivity(quote(id)?.buyVol)} instant-sold / ${countActivity(quote(id)?.sellVol)} instant-bought. Your own fills are unknown.</p><div class="chart-legend"><span>Instant-sell average</span><span>Instant-buy average</span></div><div class="history-summary"><div>Typical observed low / high<b>${gp(summary.lowMedian)} / ${gp(summary.highMedian)}</b></div><div>Typical margin after current tax<b>${gp(summary.medianMargin)} / item</b></div><div>Positive-spread buckets<b>${summary.positiveBuckets} / ${summary.samples}</b></div><div>Central price range / change<b>${summary.rangePct.toFixed(1)}% / ${summary.changePct.toFixed(1)}%</b></div></div><p>${(summary.coverage*100).toFixed(0)}% two-sided coverage · actual bucket size ${(summary.timestep/60).toFixed(0)} minutes. Last two-sided bucket ${esc(new Date(summary.lastAt).toLocaleString())}. ${esc(summary.note)}</p><details><summary>Inspect recent observations</summary><table class="history-table"><thead><tr><th>Bucket start</th><th>Low avg</th><th>High avg</th></tr></thead><tbody>${summary.rows.slice(-12).reverse().map(r=>`<tr><td>${esc(new Date(r.timestamp*1000).toLocaleString())}</td><td>${r.avgLowPrice.toLocaleString()}</td><td>${r.avgHighPrice.toLocaleString()}</td></tr>`).join('')}</tbody></table></details>`;
 }
 function chart(rows){
  if(rows.length<2)return '<p>Too few observations to draw a trend.</p>';
  const min=Math.min(...rows.flatMap(r=>[r.avgLowPrice,r.avgHighPrice])),max=Math.max(...rows.flatMap(r=>[r.avgLowPrice,r.avgHighPrice])),range=Math.max(1,max-min),start=rows[0].timestamp,span=Math.max(1,rows.at(-1).timestamp-start);
  const x=t=>45+(t-start)/span*570,y=p=>155-(p-min)/range*130;
  const path=key=>rows.map((r,n)=>{const gap=n>0&&r.timestamp-rows[n-1].timestamp>1.5*(historyCache[selectedId]?.raw.timestep||3600);return `${n===0||gap?'M':'L'}${x(r.timestamp).toFixed(1)},${y(r[key]).toFixed(1)}`;}).join(' ');
  return `<svg class="history-chart" viewBox="0 0 640 190" role="img" aria-label="Historical observed instant-sell and instant-buy averages. Gaps are not interpolated."><text x="5" y="22" fill="#a6b5ac" font-size="10">${compact(max)}</text><text x="5" y="159" fill="#a6b5ac" font-size="10">${compact(min)}</text><path d="M45 25H615 M45 90H615 M45 155H615" stroke="#304338" stroke-dasharray="4 4" fill="none"/><path d="${path('avgLowPrice')}" stroke="#82cba3" fill="none" stroke-width="2"/><path d="${path('avgHighPrice')}" stroke="#e8bd68" fill="none" stroke-width="2"/><text x="45" y="180" fill="#a6b5ac" font-size="10">${esc(new Date(start*1000).toLocaleDateString())}</text><text x="615" y="180" text-anchor="end" fill="#a6b5ac" font-size="10">${esc(new Date(rows.at(-1).timestamp*1000).toLocaleDateString())}</text></svg>`;
 }
 function render(){
  const c=host.context(),paper=capital();document.body.classList.toggle('session-ready',!!read('setupComplete',false));$('sessionLabel').textContent=read('setupComplete',false)?`${c.mode==='f2p'?'Free-to-play':'Members'} session · ${compact(c.budget)} GP`:'Set up your trading session';
  $('sessionStrip').innerHTML=`<div class="session-cell"><small>Session budget</small><strong>${compact(c.budget)} GP</strong><p>Entered capital + recorded net profit</p></div><div class="session-cell"><small>Not earmarked</small><strong>${compact(paper.remaining)} GP</strong><p>${compact(paper.reserved)} in tickets / inventory</p></div><div class="session-cell"><small>New trade slots</small><strong>${paper.slotsRemaining} / ${c.slots}</strong><p>${c.mode==='f2p'?'Free-to-play':'Members'}</p></div>`;
  $('homeShortlistNote').textContent=c.budget===0?'Confirm a working budget above to see affordable candidates.':c.mode==='f2p'?`F2P items only. The current volume-guarded plan uses ${gp(c.allocation.allocated)} across ${c.allocation.selected.length} slots. Buy limits and turnover can matter more than bankroll size; fills remain unverified.`:'Ranked by recent price agreement, affordable margin and two-way activity.';
  const choices=(paper.slotsRemaining>0?c.allocation.selected:[]).filter(i=>!paper.active.some(t=>t.id===i.id)&&!c.heldIds.has(i.id)&&i.buy<=paper.remaining).slice(0,3);
  $('homeCandidates').innerHTML=choices.length?choices.map(i=>{const e=marketEvidence(i);return `<article class="card candidate-card"><div class="candidate-top"><span class="status-pill">${i.members?'Members':'F2P'}</span><h3>${esc(i.name)}</h3></div><div class="candidate-numbers"><div><small>Recent-average margin / item</small><strong>${gp(e.confirmedMargin)}</strong></div><div><small>Hourly two-way flow</small><strong>${compact(i.flow)}</strong></div></div><p>References ${gp(e.referenceBuy)} buy → ${gp(e.referenceSell)} sell · ${(e.confirmedMargin/e.referenceBuy*100).toFixed(2)}% ROI after tax<br>Four-hour limit ${i.limit?.toLocaleString()??'unknown'} · Screened allocation up to ${(i.qty??i.potentialQty).toLocaleString()} units (not a fill estimate)</p><ul class="reason-list">${candidateReason(i).slice(0,2).map(r=>`<li>${esc(r)}</li>`).join('')}</ul><button class="btn primary" data-home-research="${i.id}">Inspect history &amp; prices →</button></article>`;}).join(''):`<div class="card empty">${c.budget===0?'Enter the budget you want to deploy. No balance has been read from your character.':paper.slotsRemaining===0?'Your available slots are earmarked. Review the desk before adding another trade.':'No suitable new candidates fit right now. Keep cash unallocated, or inspect all markets to understand the exclusions.'}</div>`;
  $('ticketCapital').innerHTML=`<div class="session-cell"><small>Capital tied up</small><strong>${compact(paper.reserved)} GP</strong></div><div class="session-cell"><small>Plan cash remaining</small><strong>${compact(paper.remaining)} GP</strong></div><div class="session-cell"><small>Planned / stock slots</small><strong>${paper.slotsUsed} / ${c.slots}</strong></div>`;
  const rows=tickets().slice().sort((a,b)=>Number(active(b))-Number(active(a))||Date.parse(b.createdAt)-Date.parse(a.createdAt));
  $('savedTickets').innerHTML=(paper.overBudget||paper.overSlots?'<p class="restriction-note">Saved tickets exceed the current cash or free-slot setting. No more capital will be allocated; review and close tickets manually.</p>':'')+(rows.length?rows.map(t=>{const p=ticketMath(t),m=meta(t.id);return `<article class="card ticket-card"><span class="status-pill">${t.status==='closed'?'Closed research':'Paper plan · not an account order'}</span><h3 class="ticket-title">${esc(t.name)} · ${t.qty.toLocaleString()} units</h3><p>Your prices: ${gp(t.buy)} buy → ${gp(t.sell)} sell<br>Earmarked cost ${gp(p.cost)} · Conditional margin ${gp(p.margin)}<br>Break-even ${gp(p.breakEven)} per item · Created ${esc(new Date(t.createdAt).toLocaleString())}</p>${c.mode==='f2p'&&m?.members?'<p class="restriction-note">Members item: it can be sold while F2P; new purchases require membership.</p>':''}<div class="ticket-controls"><label class="smallmuted">Manual stage <select data-ticket-status="${esc(t.key)}" aria-label="Ticket stage for ${esc(t.name)}">${['planned','buying','selling','closed'].map(status=>`<option value="${status}" ${status===t.status?'selected':''}>${{planned:'Researching',buying:'Buying in game',selling:'Selling in game',closed:'Closed / release plan capital'}[status]}</option>`).join('')}</select></label><button class="btn small" data-ticket-research="${t.id}">Inspect / adjust</button><button class="btn small" data-ticket-record="${esc(t.key)}">Record actual fill</button><button class="text-button" data-ticket-remove="${esc(t.key)}">Delete</button></div></article>`;}).join(''):'<div class="card empty">Your desk is clear. Open a market, inspect its seven-day history and save a research ticket. Tickets earmark cash and slots in this plan; they never place orders or add realised profit.</div>');
  $('ownedCards').innerHTML=owned().length?owned().map(r=>{const i=quote(r.id),m=meta(r.id),fresh=i&&i.age<=120,proceeds=fresh&&Number.isSafeInteger(r.qty*i.buy)?r.qty*(i.buy-taxPerItem(i.buy,r.name)):null;return `<article class="card ticket-card"><h3>${esc(r.name)} · ${r.qty.toLocaleString()} available</h3><p>${proceeds===null?'Fresh sell-side observations unavailable.':`Net proceeds at the observed instant-sell reference: <b class="owned-total">${gp(proceeds)}</b><br>Reference ${gp(i.buy)} per item. Executable price and available quantity are unknown.`}</p><p class="smallmuted">Proceeds are not profit. No purchase cost is assigned. Do not add this stock again as a fabricated journal purchase.</p>${m?.members&&c.mode==='f2p'?'<p class="restriction-note">Members item: it can be sold on the GE while F2P; new purchases require membership.</p>':''}${accountRestriction(r,c.mode,c.restriction)?'<p class="restriction-note">New-account sale restriction may apply. Confirm eligibility before relying on sale proceeds.</p>':''}<div class="ticket-controls"><button class="btn small" data-owned-research="${r.id}">Research market</button><button class="btn small" data-owned-record="${r.id}">Record completed sale</button><button class="text-button" data-owned-remove="${r.id}">Remove from list</button></div></article>`;}).join(''):'<div class="card empty">Add an item you already have. This works without knowing its original purchase cost or assuming bank access.</div>';
 }
 return {remember:()=>({id:$('researchDialog').open?selectedId:null,chart:$('researchDialog').classList.contains('simple-chart'),scroll:$('researchDialog').scrollTop}),restore:s=>{if(Number.isSafeInteger(s?.id)){openResearch(s.id);if(s.chart)fetchHistory();requestAnimationFrame(()=>{$('researchDialog').scrollTop=Number(s.scroll)||0});}},render,openResearch,openChart:id=>{openResearch(id);$('researchDialog').classList.add('simple-chart');$('researchDialog').querySelector('.research-block h3').textContent='7-day price chart';fetchHistory();},reloadPersonal:()=>{if(read('setupComplete',false))syncSessionForm();$('sessionSetup').open=!read('setupComplete',false);},closeResearch:()=>{if($('researchDialog').open){$('researchDialog').close();return true;}return false;}};
}
