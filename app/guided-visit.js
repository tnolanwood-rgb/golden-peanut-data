/* Golden Peanut view continuity. Deliberately stores UI IDs and scroll only;
 * never account keys, quote prices, portfolio, history, wallet or orders.
 * Scope hash prevents accidental cross-account view restores, not encryption.
 */
(function(root){
'use strict';
const KEY='gp-guided-resume-v2',MAX_AGE=2*60*60*1000;
function scope(account){
 let hash=2166136261;
 for(const ch of String(account||'')){
  hash^=ch.charCodeAt(0);hash=Math.imul(hash,16777619)>>>0;
 }
 return hash.toString(16).padStart(8,'0');
}
function validId(x){return Number.isSafeInteger(x)&&x>0;}
function validDeck(d){
 return !!d&&d.v===1&&Array.isArray(d.ids)&&d.ids.length>0&&d.ids.length<=35&&
 d.ids.every(validId)&&new Set(d.ids).size===d.ids.length&&
 Number.isSafeInteger(d.position)&&d.position>=0&&d.position<d.ids.length;
}
function cleanChart(c){
 if(!c||!validId(c.id))return null;
 const d=Number(c.selectedDay),range=c.range;
 return {id:c.id,range:['six','day','three','week','all','custom'].includes(range)?range:'week',
  viewSize:Number.isSafeInteger(c.viewSize)&&c.viewSize>=1&&c.viewSize<=31?c.viewSize:7,
  offset:Number.isSafeInteger(c.offset)&&c.offset>=0&&c.offset<=31?c.offset:0,
  selectedDay:Number.isSafeInteger(d)&&d>0&&d<200000?d:null,
  expanded:c.expanded===true};
}
function create(storage,clock=()=>Date.now()){
 const read=account=>{
  if(!account||!storage)return null;
  try{
   const x=JSON.parse(storage.getItem(KEY)||'null'),now=clock();
   if(x?.v!==2||x.scope!==scope(account)||!Number.isSafeInteger(x.at)||
      now<x.at||now-x.at>MAX_AGE||!validDeck(x.deck))return null;
   return {deck:x.deck,scroll:Number.isSafeInteger(x.scroll)&&x.scroll>=0&&x.scroll<1e7?x.scroll:0,
    chart:cleanChart(x.chart)};
  }catch{return null;}
 };
 const save=(account,deck,scroll,chart)=>{
  if(!account||!storage||!validDeck(deck))return false;
  const saved={v:2,scope:scope(account),at:clock(),deck,
   scroll:Number.isFinite(scroll)?Math.min(9999999,Math.max(0,Math.floor(scroll))):0,
   chart:cleanChart(chart)};
  try{storage.setItem(KEY,JSON.stringify(saved));return true;}catch{return false;}
 };
 return Object.freeze({load:read,save,key:KEY});
}
root.GPGuidedVisit={create,validDeck,cleanChart};
if(typeof module!=='undefined'&&module.exports)module.exports=root.GPGuidedVisit;
})(typeof globalThis!=='undefined'?globalThis:this);
