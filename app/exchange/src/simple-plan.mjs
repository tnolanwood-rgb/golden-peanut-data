import {realizedLedger,recentPurchases,validGP,MAX_GP} from './core.mjs';
import {marketEvidence,researchCandidates} from './intelligence.mjs';
import {ticketMath,accountRestriction} from './workspace.mjs';
export const STANDARD_SCREENING={profile:'balanced',minVolume:'50',age:'120'};
export function simpleCapital(tickets,trades,budget,slots){
 const active=tickets.filter(t=>t.status!=='closed'),holdings=realizedLedger(trades).holdings;
 let reserved=active.reduce((s,t)=>s+t.qty*t.buy,0);
 for(const h of holdings){const exit=active.find(t=>t.id===h.id&&t.status==='selling');reserved+=exit?Math.max(0,h.cost-exit.qty*exit.buy):h.cost;}
 // Un-ticketed recorded stock also has a sell instruction on the simple screen.
 // Reserve a slot for it so a closed ticket cannot create a fourth F2P order.
 const slotsUsed=active.length+holdings.filter(h=>!active.some(t=>t.id===h.id)).length;
 return {active,holdings,reserved,slotsUsed,remaining:Math.max(0,budget-reserved),slotsRemaining:Math.max(0,slots-slotsUsed),overBudget:reserved>budget,overSlots:slotsUsed>slots};
}
function sizedIdeas(context,tickets){
 const room=simpleCapital(tickets,context.trades,context.budget,context.slots);if(context.storageError||room.slotsRemaining<1||room.overBudget||context.feedHealth?.hourFresh===false||context.feedHealth?.fiveFresh===false||context.feedHealth?.clockSkew)return [];
 const reserve=Math.floor(context.budget*(context.reserve??.1));
 const used=recentPurchases(context.trades);
 const candidates=new Map(context.candidates.map(i=>[i.id,i]));
 // A one-unit pilot is a separate policy for high-value, slower markets.
 // Do not round every sub-25/hour market down to zero or scale it by bankroll.
 if(context.items&&(context.screening?.minVolume??50)<=50){
  const pilotItems=context.items.filter(i=>i.buy>=100000&&i.flow>=5&&i.latestFlow>=1&&i.age<=15&&i.drift<=.1&&i.limit>0&&i.flow<50).map(i=>({...i,potentialQty:1,pilot:true}));
  for(const i of researchCandidates(pilotItems,{members:context.mode!=='f2p',profile:context.screening?.profile??'balanced',maxAge:15,minVolume:5}))if(!accountRestriction(i,context.mode,context.restriction)&&!candidates.has(i.id))candidates.set(i.id,i);
 }
 const prepared=[...candidates.values()].filter(i=>!context.heldIds.has(i.id)&&!room.active.some(t=>t.id===i.id)&&i.age<=30).flatMap(i=>{
  const e=marketEvidence(i);if(!e.hourly||!e.short||e.confirmedMargin<=0)return [];
  const qty=Math.min(i.potentialQty,Math.max(0,i.limit-(used[i.id]||0)),Math.floor(Math.min(room.remaining-reserve,context.budget*context.maxShare)/e.referenceBuy));
  if(qty<1)return [];
  const math=ticketMath({qty,buy:e.referenceBuy,sell:e.referenceSell,name:i.name});
  const imbalance=i.buyVol>0&&i.sellVol>0?2*Math.min(i.buyVol,i.sellVol)/(i.buyVol+i.sellVol):1;const quality=(i.age>15?.85:1)*(i.drift>.1?.75:1)*imbalance;const stress=qty*e.stressedMargin;
  const simpleScore=Math.max(0,math.margin*quality-Math.max(0,-stress)*.05);
  const limits={cash:Math.floor(Math.min(room.remaining-reserve,context.budget*context.maxShare)/e.referenceBuy),buyLimit:Math.max(0,i.limit-(used[i.id]||0)),[i.pilot?'pilot':'volume']:i.pilot?1:(i.heuristicCap??i.potentialQty)};
  const binding=Object.entries(limits).filter(([,n])=>n===qty).map(([k])=>k);
  return [{...i,qty,buy:e.referenceBuy,sell:e.referenceSell,math,simpleScore,stress,quality,binding}];
 });
 return prepared.filter(i=>i.simpleScore>0).sort((a,b)=>b.simpleScore-a.simpleScore||b.math.margin-a.math.margin||a.id-b.id).slice(0,80);
}
// Bounded portfolio search: compare combinations across slots, cash and reserve.
// Scores are a selection heuristic, never expected returns or fill probabilities.
export function capitalPortfolio(context,tickets=[]){
 const room=simpleCapital(tickets,context.trades,context.budget,context.slots),reserve=Math.floor(context.budget*(context.reserve??.1)),available=Math.max(0,room.remaining-reserve);
 const pool=sizedIdeas(context,tickets);let beam=[{rows:[],cost:0,score:0}];
 const compare=(a,b)=>b.score-a.score||a.cost-b.cost;
 function allocate(ideas){
  let left=available,score=0;const rows=[];
  for(const item of [...ideas].sort((a,b)=>b.simpleScore/b.math.cost-a.simpleScore/a.math.cost||a.id-b.id)){
   const qty=Math.min(item.qty,Math.floor(left/item.buy));if(qty<1)continue;
   const math=ticketMath({qty,buy:item.buy,sell:item.sell,name:item.name}),ratio=qty/item.qty;
   rows.push({...item,qty,math,stress:qty*marketEvidence(item).stressedMargin,simpleScore:item.simpleScore*ratio,binding:qty<item.qty?['cash']:item.binding});
   left-=math.cost;score+=item.simpleScore*ratio;
  }
  return {rows,cost:available-left,score};
 }
 const byId=new Map(pool.map(i=>[i.id,i]));
 for(const item of pool){
  const additions=[];
  for(const state of beam){if(state.rows.length>=room.slotsRemaining)continue;
   additions.push(allocate([...state.rows.map(i=>byId.get(i.id)),item]));
  }
  const seen=new Set();const frontier=[...beam,...additions].sort(compare).filter(s=>{const key=s.rows.map(i=>i.id).sort((a,b)=>a-b).join(',');if(seen.has(key))return false;seen.add(key);return true;});
  // Keep a low-capital route for each slot count, including the empty plan.
  // Otherwise a high-scoring early market can prevent later combinations.
  const cheapest=new Map();for(const state of frontier){const old=cheapest.get(state.rows.length);if(!old||state.cost<old.cost)cheapest.set(state.rows.length,state);}
  const density=new Map();for(const state of frontier){const old=density.get(state.rows.length);if(!old||state.score/Math.max(1,state.cost)>old.score/Math.max(1,old.cost))density.set(state.rows.length,state);}
  const kept=new Set([...cheapest.values(),...density.values()]);for(const state of frontier){if(kept.size>=48)break;kept.add(state);}beam=[...kept].sort(compare);
 }
 const best=beam[0]||{rows:[],cost:0,score:0};const selected=best.rows.sort((a,b)=>b.simpleScore-a.simpleScore||a.id-b.id);
 return {selected,cost:best.cost,remaining:room.remaining-best.cost,reserve,slots:room.slotsRemaining,conditionalMargin:selected.reduce((s,i)=>s+i.math.margin,0),alternatives:pool};
}
export function simpleSuggestions(context,tickets,portfolio=null){
 const p=portfolio??capitalPortfolio(context,tickets),chosen=new Set(p.selected.map(i=>i.id));
 return [...p.selected,...p.alternatives.filter(i=>!chosen.has(i.id))].slice(0,30);
}
export function simpleScreenState(c,tickets,portfolio=null){
 const ideas=simpleSuggestions(c,tickets,portfolio);if(ideas.length)return {kind:'ready',ideas};
 const room=simpleCapital(tickets,c.trades,c.budget,c.slots);
 if(c.storageError)return {kind:'recovery',message:'Restore your saved data before starting another trade.'};
 if(c.busy)return {kind:'loading',message:'Checking the market…'};
 if(room.slotsRemaining<1)return {kind:'slots',message:room.active.length||room.holdings.length?'Finish a tracked trade before using another slot.':'No GE slots are assigned to this app.',action:'slots',label:'Set available slots'};
 if(room.overBudget)return {kind:'budget',message:'Your recorded stock and plans exceed this trading pot.',action:'settings',label:'Check trading budget'};
 if(c.budget<1)return {kind:'budget',message:'Enter the GP you want to trade with.',action:'settings',label:'Set trading budget'};
 if(!c.lastRefresh||!c.items?.length)return {kind:'offline',message:'Prices are unavailable. Connect to the internet and try again.',action:'refresh',label:'Try loading prices'};
 if(c.feedHealth?.clockSkew)return {kind:'clock',message:'The feed is dated ahead of your phone. Check Android’s automatic date and time.',action:'refresh',label:'Check again'};
 if(c.feedHealth?.hourFresh===false||c.feedHealth?.fiveFresh===false){
  const block=c.feedHealth.hourFresh===false?'hourly':'five-minute';
  return {kind:'feed',message:`The ${block} volume feed is behind. Fresh quotes alone are not enough to size a trade.`,action:'refresh',label:'Check volume feed again'};
 }
 const opts={members:c.mode!=='f2p',minVolume:50,maxAge:120,profile:'balanced'};
 const standard=researchCandidates(c.items,opts).filter(i=>!accountRestriction(i,c.mode,c.restriction));
 const alternatives=simpleSuggestions({...c,candidates:standard,screening:opts},tickets);
 if(alternatives.length)return {kind:'filters',message:'Saved research filters are hiding trade ideas.',action:'reset-screening',label:'Use standard trade filters'};
 if(c.mode==='f2p'&&c.restriction!=='clear'){
  const all=researchCandidates(c.items,{...opts,...c.screening});
  if(simpleSuggestions({...c,candidates:all},tickets).length)return {kind:'restriction',message:'Available ideas are hidden by new-account sale restrictions. Check whether they apply to this character.',action:'eligibility',label:'Check account eligibility'};
 }
 const recent=c.items.filter(i=>(c.mode!=='f2p'||!i.members)&&i.age<=30);
 if(!recent.length)return {kind:'stale',message:'Recent two-sided item prices are missing. Waiting for fresh observations.',action:'refresh',label:'Check prices again'};
 const reserve=Math.floor(c.budget*(c.reserve??.1)),available=Math.min(room.remaining-reserve,c.budget*c.maxShare);
 if(c.candidates.length&&c.candidates.every(i=>marketEvidence(i).referenceBuy>available))return {kind:'budget',message:'Your available GP and cash limits do not cover a qualifying trade.',action:'capital-settings',label:'Check cash limits'};
 return {kind:'market',message:'No suitable new trade right now. No fresh trade fits your limits and price checks.',action:'refresh',label:'Check again'};
}
// All journal entry points adjust the same pot by the change in matched profit.
// Recorded inventory remains reserved at cost; editing a fill never invents cash.
export function journalChange({tickets,trades,budget},nextTrades){
 const before=realizedLedger(trades),after=realizedLedger(nextTrades),nextBudget=budget+after.profit-before.profit+(after.adjustmentAddedCost-before.adjustmentAddedCost)-(after.adjustmentCost-before.adjustmentCost);
 if(!Number.isSafeInteger(nextBudget)||nextBudget<0||nextBudget>MAX_GP)throw Error('Update the trading budget in settings before saving this journal change.');
 const nextTickets=tickets.map(t=>{
  if(t.status==='closed')return t;
  const old=before.holdings.find(h=>h.id===t.id),held=after.holdings.find(h=>h.id===t.id);
  if(old?.qty===held?.qty&&old?.cost===held?.cost)return t;
  if(held)return {...t,status:'selling',qty:held.qty,buy:Math.ceil(held.cost/held.qty)};
  return old?{...t,status:'closed'}:t;
 });
 return {trades:nextTrades,tickets:nextTickets,budget:String(nextBudget)};
}
export function applySimpleFill({ticket,side,qty,price,trades,budget,taxPaid,now=Date.now()}){
 if(ticket.status==='closed'||!['buy','sell'].includes(side)||!validGP(qty)||qty>ticket.qty||!validGP(price)||!Number.isSafeInteger(qty*price)||qty*price>MAX_GP)throw Error('Check the completed quantity and price.');
 if(taxPaid!==undefined&&(side!=='sell'||!Number.isSafeInteger(taxPaid)||taxPaid<0||taxPaid>qty*price))throw Error('Check the actual total sale tax.');
 const before=realizedLedger(trades),holding=before.holdings.find(h=>h.id===ticket.id);
 if(side==='sell'&&(!holding||holding.qty<qty))throw Error('Record the completed purchase first.');
 if(side==='buy'&&ticket.status==='selling'&&holding?.qty>0)throw Error('This purchase is already recorded.');
 const nextTrades=[...trades,{uid:crypto.randomUUID(),id:ticket.id,name:ticket.name,side,qty,price,date:new Date(now).toISOString(),ticketKey:ticket.key,...(ticket.research?{research:ticket.research}:{}),...(side==='sell'?{taxBasis:taxPaid===undefined?'current-rule-assumed':'actual-total',...(taxPaid===undefined?{}:{taxPaid})}:{})}];
 const after=realizedLedger(nextTrades),gain=side==='sell'?after.profit-before.profit:0;
 if(side==='sell'&&after.unmatchedUnits>before.unmatchedUnits)throw Error('This sale has no matching recorded purchase.');
 const nextTicket=side==='buy'?{...ticket,qty,buy:price,status:'selling'}:qty===ticket.qty?{...ticket,status:'closed'}:{...ticket,qty:ticket.qty-qty,status:'selling'};
 const nextBudget=budget+gain;if(!Number.isSafeInteger(nextBudget)||nextBudget<0||nextBudget>MAX_GP)throw Error('Update the trading budget in settings before recording this fill.');
 return {trades:nextTrades,ticket:nextTicket,budget:nextBudget,gain};
}
