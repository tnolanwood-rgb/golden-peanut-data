import {exclusive} from './actions.mjs';
import {scenarioMarkup} from './presentation.mjs';
import {gp,compact,MAX_GP,realizedLedger,taxPerItem} from './core.mjs';
import {simpleSuggestions,simpleCapital,applySimpleFill,simpleScreenState,STANDARD_SCREENING,capitalPortfolio} from './simple-plan.mjs';
import {read,save,saveMany,validateBackup} from './storage.mjs';
import {validateTickets} from './workspace.mjs';
const $=id=>document.getElementById(id);
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const count=n=>n.toLocaleString('en-GB');
export function createSimple(host){
 let choiceId=null,fillTicket=null,fillSide=null,selectionSignature=null,previousIdeas=[];
 async function setSimple(enabled,persist=true){if(persist){try{await save('simpleView',enabled);}catch(e){$('simpleFeedback').textContent=e.message;}}document.body.classList.toggle('simple-view',enabled);$('returnSimple').hidden=enabled;if(enabled){host.navigate('home');render();}window.scrollTo({top:0});}
 setSimple(read('simpleView',true)!==false,false);
 $('simpleBudget').value=read('setupComplete',false)?host.context().budget:100000000;
 $('simpleMode').value=read('setupComplete',false)?host.context().mode:'f2p';
 $('simpleRestriction').value=host.context().restriction;
 function openSettings(eligibility=false){const c=host.context();$('simpleSetup').hidden=false;$('simpleBudget').value=c.budget;$('simpleMode').value=c.mode;$('simpleRestriction').value=c.restriction;if(eligibility)$('simpleRestriction').closest('details').open=true;$('simpleSetup').scrollIntoView({block:'start'});if(eligibility)$('simpleRestriction').focus();}
 $('simpleSettingsButton').addEventListener('click',async ()=>{if($('simpleSetup').hidden)openSettings();else $('simpleSetup').hidden=true;});
 async function applySettings(close=false){
  const budget=Number($('simpleBudget').value);if($('simpleBudget').value===''||!Number.isSafeInteger(budget)||budget<0||budget>MAX_GP){$('simpleSetupError').textContent='Enter a whole GP amount.';return;}
  try{await saveMany({budget:String(budget),mode:$('simpleMode').value,restriction:$('simpleRestriction').value,setupComplete:true});if(close)$('simpleSetup').hidden=true;$('simpleSetupError').textContent='';choiceId=null;previousIdeas=[];host.reload();$('simpleFeedback').textContent='Trade ideas recalculated for your saved settings.';if(close)window.scrollTo({top:0,behavior:'instant'});}catch(e){$('simpleSetupError').textContent='Could not save. '+e.message;}
 }
 $('simpleSetup').addEventListener('submit',exclusive(async event=>{event.preventDefault();await applySettings(true);}));
 for(const id of ['simpleBudget','simpleMode','simpleRestriction'])$(id).addEventListener('change',async ()=>applySettings());
 $('simpleSetup').hidden=!!read('setupComplete',false);
 $('simpleRefresh').addEventListener('click',async ()=>host.refresh());
 $('simpleAdvanced').addEventListener('click',async ()=>setSimple(false,false));$('returnSimple').addEventListener('click',async ()=>setSimple(true));
 $('simpleCredits').addEventListener('click',async ()=>{setSimple(false,false);host.navigate('about');});
 const action=exclusive(async event=>{
  const button=event.target.closest('button');if(!button)return;
  const id=Number(button.dataset.id);
  if(button.dataset.action==='refresh'){host.refresh();return;}
  if(button.dataset.action==='settings'||button.dataset.action==='eligibility'){openSettings(button.dataset.action==='eligibility');return;}
  if(button.dataset.action==='slots'||button.dataset.action==='capital-settings'){host.openControls(button.dataset.action==='slots'?'freeSlots':'reserve');return;}
  if(button.dataset.action==='reset-screening'){try{await saveMany(STANDARD_SCREENING);choiceId=null;host.reload();$('simpleFeedback').textContent='Standard filters applied. Your cash, account, slots and trade records are unchanged.';}catch(e){$('simpleFeedback').textContent=e.message;}return;}

  if(button.dataset.action==='chart'){host.chart(id);return;}
  if(button.dataset.action==='different'){const options=simpleSuggestions(host.context(),read('tickets',[]));const at=options.findIndex(i=>i.id===choiceId);if(choiceId!==null){previousIdeas.push(choiceId);previousIdeas=previousIdeas.slice(-100);}choiceId=options[(at+1)%options.length]?.id??null;render();return;}
  if(button.dataset.action==='previous'){const eligible=new Set(simpleSuggestions(host.context(),read('tickets',[])).map(i=>i.id));while(previousIdeas.length){const id=previousIdeas.pop();if(eligible.has(id)){choiceId=id;break;}}render();return;}
  if(button.dataset.action==='start'){
   const current=simpleSuggestions(host.context(),read('tickets',[])).find(i=>i.id===id);if(!current){$('simpleFeedback').textContent='Prices changed. Update prices before choosing a trade.';return;}
   try{const next=[...read('tickets',[]),{key:crypto.randomUUID(),id:current.id,name:current.name,qty:current.qty,buy:current.buy,sell:current.sell,status:'buying',createdAt:new Date().toISOString(),research:{version:'4.0-v1',at:new Date().toISOString(),buy:current.buy,sell:current.sell,qty:current.qty}}];await save('tickets',validateTickets(next));choiceId=null;$('simpleFeedback').textContent='Go to the Grand Exchange and place the buy order yourself.';host.reload();}catch(e){$('simpleFeedback').textContent='Could not save: '+e.message;}return;
  }
  const rows=trackedTickets(),ticket=rows.find(t=>t.key===button.dataset.key);if(!ticket)return;
  if(button.dataset.action==='stop'){
   if(!confirm('Stop tracking this trade? Cancel any open order yourself in OSRS. Recorded stock stays reserved until sold.'))return;
   try{const saved=read('tickets',[]);await save('tickets',saved.map(t=>t.key===ticket.key?{...t,status:'closed'}:t));choiceId=null;host.reload();}catch(e){$('simpleFeedback').textContent=e.message;}return;
  }
  if(button.dataset.action==='fill'){
   const inventory=realizedLedger(host.context().trades).holdings.find(h=>h.id===ticket.id);
   fillTicket=ticket;fillSide=ticket.status==='selling'&&inventory?.qty>0?'sell':'buy';
   $('simpleFillTitle').textContent=fillSide==='buy'?'Confirm what you bought':'Confirm what you sold';$('simpleFillName').textContent=ticket.name;
   $('simpleFillQty').value=Math.min(ticket.qty,fillSide==='sell'?inventory.qty:ticket.qty);$('simpleFillPrice').value='';$('simpleFillTax').value='';$('simpleFillTax').closest('details').hidden=fillSide!=='sell';$('simpleFillError').textContent='';
   $('simpleFillSave').textContent=fillSide==='buy'?'Record completed purchase':'Record completed sale';
   $('simpleFillHint').textContent=fillSide==='buy'?'Only record units that have actually bought. Cancel any unfilled remainder yourself before moving on to sell.':'Only record units that have actually sold. Unsold units remain tracked.';
   $('simpleFillDialog').showModal();
  }
 });
 $('simpleTrades').addEventListener('click',action);$('simpleNext').addEventListener('click',action);
 $('simpleFillClose').addEventListener('click',async ()=>$('simpleFillDialog').close());
 $('simpleFillForm').addEventListener('submit',exclusive(async event=>{
  event.preventDefault();if(!fillTicket)return;
  try{
   const c=host.context(),result=applySimpleFill({ticket:fillTicket,side:fillSide,qty:Number($('simpleFillQty').value),price:Number($('simpleFillPrice').value),taxPaid:fillSide==='sell'&&$('simpleFillTax').value!==''?Number($('simpleFillTax').value):undefined,trades:c.trades,budget:c.budget});
   const tickets=read('tickets',[]),next=[...tickets.filter(t=>t.key!==fillTicket.key),result.ticket];validateTickets(next);validateBackup({format:'golden-exchange-ledger-v1',trades:result.trades});
   await saveMany({trades:result.trades,tickets:next,budget:String(result.budget)});
   $('simpleFillDialog').close();$('simpleFeedback').textContent=fillSide==='buy'?'Purchase recorded. Next: place the sell order in OSRS.':`Sale recorded. Realised profit: ${gp(result.gain)}.`;fillTicket=null;choiceId=null;host.reload();
  }catch(e){$('simpleFillError').textContent=e.message;}
 }));
 function trackedTickets(){
  const c=host.context();const signature=JSON.stringify([c.budget,c.mode,c.restriction,c.maxShare,c.reserve,c.slots,c.screening]);if(selectionSignature!==signature){selectionSignature=signature;choiceId=null;previousIdeas=[];}const tickets=read('tickets',[]).filter(t=>t.status!=='closed');
  for(const h of realizedLedger(c.trades).holdings)if(!tickets.some(t=>t.id===h.id))tickets.push({key:'stock-'+h.id,id:h.id,name:h.name,qty:h.qty,buy:Math.ceil(h.cost/h.qty),sell:c.items.find(i=>i.id===h.id)?.sell||Math.ceil(h.cost/h.qty),status:'selling',createdAt:h.oldest});
  return tickets;
 }
 function itemTitle(t){return `<div class="simple-item"><span class="category-mark" aria-hidden="true">${esc(t.name.slice(0,1).toUpperCase())}</span><h2>${esc(t.name)}</h2></div>`;}
 function ideaCard(i){return `<article class="simple-trade" data-simple-idea="${i.id}"><div class="simple-step">Next trade idea · ${i.pilot?'One-unit test · slower market':i.math.cost>=1000000?'Larger capital':i.flow>=10000?'Active market':'Smaller market'}</div>${itemTitle(i)}<p class="simple-instruction">Buy <strong>${count(i.qty)}</strong><br>at <strong>${gp(i.buy)}</strong> each.</p><p class="simple-price-line">Then aim to sell at <strong>${gp(i.sell)}</strong> each.</p><div class="simple-totals"><div><small>Gold needed</small><b>${gp(i.math.cost)}</b></div><div><small>If every unit sells · after tax</small><b class="profit">+${gp(i.math.margin)}</b></div><div><small>After-tax ROI · if filled</small><b class="profit" data-roi>${i.math.roi.toFixed(2)}%</b></div></div><p class="simple-help">${i.pilot?'One-unit test only. Recent activity is lower; you may need to wait or cancel. ':''}Size limited by ${i.binding.map(k=>({cash:'cash allocation',buyLimit:'four-hour buy limit',volume:'observed market volume',pilot:'the one-unit test cap'}[k])).join(' and ')}. At a 2% lower exit: ${gp(i.stress)} after tax against purchase cost.</p><button class="simple-primary" data-action="start" data-id="${i.id}">I’ll try this trade</button><div class="simple-row"><button class="quiet-button" data-action="chart" data-id="${i.id}">Chart &amp; activity</button></div><div class="simple-row"><button class="quiet-button" data-action="previous" ${previousIdeas.length?'':'disabled'}>← Previous</button><button class="quiet-button" data-action="different">Next idea →</button></div>${scenarioMarkup(i,i.qty)}<details><summary>How was this chosen?</summary><p class="simple-help">Compares affordable combinations across your free slots. A lower exit-price scenario reduces the rank of fragile margins. Standard trades use a small share of recent activity; slower high-value markets are limited to one-unit tests. Quantities are not fill forecasts.</p></details></article>`;}
 function render(){
  const c=host.context();const signature=JSON.stringify([c.budget,c.mode,c.restriction,c.maxShare,c.reserve,c.slots,c.screening]);if(selectionSignature!==signature){selectionSignature=signature;choiceId=null;previousIdeas=[];}const tickets=read('tickets',[]),room=simpleCapital(tickets,c.trades,c.budget,c.slots),tracked=trackedTickets();
  $('simpleRefresh').disabled=!!c.busy;
  $('simpleStatus').textContent=c.busy?'Updating prices…':!c.lastRefresh?'Prices unavailable. Tap Update prices.':`${c.feedState==='Live'?'Prices updated':'Saved prices'} ${new Date(c.lastRefresh).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}.${c.feedHealth?.hourFresh===false||c.feedHealth?.fiveFresh===false?' Volume data is behind.':''}`;
  $('simpleStatus').classList.toggle('error',!c.lastRefresh||c.feedState.includes('offline')||c.feedHealth?.hourFresh===false||c.feedHealth?.fiveFresh===false||!!c.feedHealth?.clockSkew);
  $('simplePot').hidden=!read('setupComplete',false);$('simplePot').innerHTML=`${c.mode==='f2p'?'Free-to-play':'Members'} · <strong>${compact(c.budget)} GP</strong> trading pot · ${compact(room.remaining)} GP not tied up${room.overBudget?'<br><span class="simple-error">Recorded stock / plans exceed this pot. Check your budget.</span>':room.overSlots?'<br><span class="simple-error">More positions than slots. Sell one at a time.</span>':''}`;
  if(!read('setupComplete',false)){$('simpleTrades').innerHTML='';$('simpleNext').innerHTML='';return;}
  $('simpleTrades').innerHTML=tracked.map(t=>{const held=realizedLedger(c.trades).holdings.find(h=>h.id===t.id),sell=t.status==='selling'&&held?.qty>0,roi=(t.sell-taxPerItem(t.sell,t.name)-t.buy)/t.buy*100;return `<article class="simple-trade" data-simple-tracked="${esc(t.key)}"><div class="simple-step">${sell?'Next: sell your bought units':'Next: place your buy order'}</div>${itemTitle(t)}<p class="simple-instruction">${sell?'Sell':'Buy'} <strong>${count(t.qty)}</strong><br>at <strong>${gp(sell?t.sell:t.buy)}</strong> each.</p><p class="simple-price-line" data-target-roi>Target ROI after tax: <strong>${roi.toFixed(2)}%</strong> if sold at ${gp(t.sell)}.</p><p class="simple-help">${!c.items.some(i=>i.id===t.id&&i.age<=30)||c.feedState.includes('offline')?'Saved target. Check current prices in OSRS. ':''}${sell?'Cancel any unfilled buy remainder. Place the sell order yourself, then record units after they sell.':'If nothing has bought, leave it pending or cancel it yourself. No fill time is promised.'}</p><button class="simple-primary" data-action="fill" data-key="${esc(t.key)}">${sell?'Some / all have sold':'Some / all have bought'}</button><div class="simple-row"><button class="quiet-button" data-action="chart" data-id="${t.id}">Chart &amp; activity</button>${t.key.startsWith('stock-')?'':`<button class="quiet-button" data-action="stop" data-key="${esc(t.key)}">Stop tracking</button>`}</div></article>`;}).join('');
  const portfolio=capitalPortfolio(c,tickets);$('simpleAllocation').hidden=!portfolio.selected.length;$('simpleAllocation').innerHTML=portfolio.selected.length?`<details><summary>Proposed allocation: ${compact(portfolio.cost)} GP across ${portfolio.selected.length} / ${portfolio.slots} free slots</summary><p class="simple-help">${gp(portfolio.remaining)} stays unallocated, including ${gp(portfolio.reserve)} reserved. Buy limits and market activity can cap deployment even with a large bankroll. No fill time is assumed.</p>${portfolio.selected.map(i=>`<p class="simple-help">${esc(i.name)} · ${count(i.qty)} units · ${gp(i.math.cost)} capital · ${i.math.roi.toFixed(2)}% ROI after tax</p>`).join('')}<p class="simple-help">${gp(portfolio.conditionalMargin)} conditional combined margin after tax, only if every unit fills at the references. This basket can differ from the alternative you are browsing. Choosing a trade recalculates it. No orders are placed.</p></details>`:'';
  const state=simpleScreenState(c,tickets,portfolio),options=state.ideas||[];
  if(choiceId===null&&options.length)choiceId=options[0].id;
  const idea=options.find(i=>i.id===choiceId);
  const content=idea?ideaCard(idea):options.length?'<div class="simple-idle simple-empty">Prices changed. Choose a different idea.<button class="simple-primary" data-action="different">Show another idea</button></div>':`<div class="simple-idle simple-empty" data-empty-reason="${state.kind}"><p>${esc(state.message)}</p>${state.action?`<button class="simple-primary" data-action="${state.action}">${esc(state.label)}</button>`:''}<details><summary>Why no trade?</summary><p class="simple-help">${c.mode==='f2p'?'Free-to-play':'Members'} · ${c.screening?.profile==='cautious'?'Cautious':'Balanced'} filters · minimum hourly volume ${count(c.screening?.minVolume??50)}. ${c.restriction==='clear'?'Account marked unrestricted.':c.mode==='f2p'?'New-account sale restrictions are being checked conservatively.':''} Prices, cash, recorded buy limits and available slots must all pass.</p></details></div>`;
  $('simpleNext').innerHTML=tracked.length?(room.slotsRemaining>0?`<details class="simple-more"><summary>Use another GE slot</summary>${content}</details>`:''):content;
 }
 return {remember:()=>({choiceId,previousIdeas:[...previousIdeas]}),restore:s=>{if(Number.isSafeInteger(s?.choiceId))choiceId=s.choiceId;if(Array.isArray(s?.previousIdeas))previousIdeas=s.previousIdeas.filter(Number.isSafeInteger).slice(-100);render();},render,closeDialog:()=>{if($('simpleFillDialog').open){$('simpleFillDialog').close();return true;}return false;},goHome:()=>setSimple(true,false),refreshMode:()=>setSimple(read('simpleView',true)!==false,false)};
}
