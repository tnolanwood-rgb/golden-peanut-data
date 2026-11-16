import {MAX_GP,validGP,taxPerItem} from './core.mjs';
import {breakEvenSale,marketEvidence} from './intelligence.mjs';
// Verified OSRS Wiki Account / New account trade restrictions, 13 Nov 2026.
export const NEW_F2P_RESTRICTED=new Set(['Oak logs','Willow logs','Yew logs','Raw shrimps','Shrimps','Raw anchovies','Anchovies','Raw lobster','Lobster','Clay','Soft clay','Copper ore','Tin ore','Iron ore','Silver ore','Gold ore','Coal','Mithril ore','Adamantite ore','Runite ore','Ashes','Vial','Vial of water','Jug of water','Fishing bait','Feather','Eye of newt','Wine of Zamorak','Air rune','Water rune','Earth rune','Fire rune','Mind rune','Chaos rune','Cowhide','Leather',"Red spiders' eggs",'Hard leather','Steel bar','Redberries']);
export function accountRestriction(item,mode,restriction){return mode==='f2p'&&restriction!=='clear'&&NEW_F2P_RESTRICTED.has(item.name);}
export function ticketMath({qty,buy,sell,name}){
 if(!validGP(qty)||!validGP(buy)||!validGP(sell)||!Number.isSafeInteger(qty*buy)||!Number.isSafeInteger(qty*sell)||qty*buy>MAX_GP)throw Error('Enter whole quantities and GP prices within supported limits');
 const cost=qty*buy,tax=qty*taxPerItem(sell,name),proceeds=qty*sell-tax;
 return {cost,tax,proceeds,margin:proceeds-cost,perItem:sell-taxPerItem(sell,name)-buy,roi:(proceeds-cost)/cost*100,breakEven:breakEvenSale(buy,name)};
}
export function workspaceCapital(tickets,budget,slots){
 const active=tickets.filter(t=>t.status!=='closed'),reserved=active.reduce((s,t)=>s+t.qty*t.buy,0);
 return {active,reserved,remaining:Math.max(0,budget-reserved),slotsRemaining:Math.max(0,slots-active.length),overBudget:reserved>budget,overSlots:active.length>slots};
}
export function validateTickets(rows){
 if(!Array.isArray(rows)||rows.length>1000)throw Error('Invalid trade tickets');const keys=new Set(),activeIds=new Set();
 return rows.map(t=>{if(!t||typeof t.key!=='string'||t.key.length>100||keys.has(t.key)||!Number.isSafeInteger(t.id)||t.id<1||typeof t.name!=='string'||t.name.length>150||!['planned','buying','selling','closed'].includes(t.status)||!Number.isFinite(Date.parse(t.createdAt)))throw Error('Invalid trade ticket');keys.add(t.key);if(t.status!=='closed'){if(activeIds.has(t.id))throw Error('Duplicate active ticket for an item');activeIds.add(t.id);}ticketMath(t);return {key:t.key,id:t.id,name:t.name,qty:t.qty,buy:t.buy,sell:t.sell,status:t.status,createdAt:t.createdAt,...(t.research?{research:validateResearch(t.research)}:{})};});
}
export function validateOwned(rows){
 if(!Array.isArray(rows)||rows.length>2000)throw Error('Invalid owned-items list');const ids=new Set();
 return rows.map(r=>{if(!r||!Number.isSafeInteger(r.id)||r.id<1||ids.has(r.id)||!validGP(r.qty)||typeof r.name!=='string'||r.name.length>150)throw Error('Invalid owned item');ids.add(r.id);return {id:r.id,name:r.name,qty:r.qty};});
}
export function candidateReason(item){
 const e=marketEvidence(item),reasons=[];
 reasons.push(item.flow>=10000?'Deep recent two-way activity':item.flow>=1000?'Active recent two-way market':'Modest recent two-way activity');
 reasons.push(e.confirmedMargin>0?'Current and recent-average references leave a margin after tax':'Recent averages do not confirm the spread');
 if(item.limit&&item.potentialQty>=item.limit)reasons.push('Four-hour buy limit caps the size');
 if(item.latestFlow===0)reasons.push('No two-sided activity in the last reported five-minute block');
 return reasons;
}

export function validateResearch(r){if(!r||r.version!=='4.0-v1'||!validGP(r.buy)||!validGP(r.sell)||!validGP(r.qty)||!Number.isFinite(Date.parse(r.at))||Date.parse(r.at)>Date.now())throw Error('Invalid research provenance');return {version:r.version,buy:r.buy,sell:r.sell,qty:r.qty,at:r.at};}
