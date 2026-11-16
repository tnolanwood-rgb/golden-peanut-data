import {validGP} from './core.mjs';
import {marketEvidence} from './intelligence.mjs';
import {ticketMath} from './workspace.mjs';
export function researchScenarios(item,qty){
 if(!item||!validGP(qty))return [];
 const e=marketEvidence(item);if(!e.hourly||!e.short||!validGP(e.referenceBuy)||!validGP(e.referenceSell))return [];
 const pairs=[['Conservative',e.referenceBuy+Math.ceil(e.referenceBuy/100),Math.max(1,e.referenceSell-Math.ceil(e.referenceSell/50))],['Baseline',e.referenceBuy,e.referenceSell],['Optimistic observations',item.buy,item.sell]];
 return pairs.map(([label,buy,sell])=>{try{return {label,buy,sell,qty,...ticketMath({qty,buy,sell,name:item.name}),available:true};}catch{return {label,available:false};}});
}
export function assumptionErrors(trades){
 const eligible=trades.filter(t=>t.ticketKey&&t.research&&['buy','sell'].includes(t.side));
 const groups=new Map();for(const t of eligible)groups.set(t.ticketKey,Math.max(groups.get(t.ticketKey)||0,Date.parse(t.date)));
 const ordered=[...groups].sort((a,b)=>a[1]-b[1]);const heldKeys=ordered.length>=30?new Set(ordered.slice(Math.floor(ordered.length*.7)).map(([key])=>key)):new Set();
 const measure=rows=>{const result={buy:{rows:0,units:0,absoluteGP:0},sell:{rows:0,units:0,absoluteGP:0}};for(const t of rows){const s=result[t.side];s.rows++;s.units+=t.qty;s.absoluteGP+=Math.abs(t.price-t.research[t.side])*t.qty;}for(const side of ['buy','sell'])result[side].mae=result[side].units?result[side].absoluteGP/result[side].units:null;return result;};
 return {tickets:ordered.length,all:measure(eligible),heldOutTickets:heldKeys.size,heldOut:measure(eligible.filter(t=>heldKeys.has(t.ticketKey))),note:'Quantity-weighted absolute price error against recorded reference assumptions. Recorded fills only; no execution probability inferred. No model trained or tuned.'};
}
