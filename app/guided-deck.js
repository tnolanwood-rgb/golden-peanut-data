/* Golden Peanut guided navigation — deterministic presentation state only.
 * No account snapshots, personal history, prices, secrets or trade orders stored.
 * Ranking may update in the background. Before the user navigates we always
 * show current rank #1; after the first navigation we freeze the viewed deck.
 * A full reload creates a clean new deck. Skips last only until that reload.
 */
(function(root){
'use strict';
function validId(n){return Number.isSafeInteger(n)&&n>0;}
function uniqueIds(rows){
 const ids=[],seen=new Set();
 for(const row of Array.isArray(rows)?rows:[]){
  const id=Number(row?.id);
  if(!validId(id)||seen.has(id))continue;
  seen.add(id);ids.push(id);
 }
 return ids;
}
function create(){
 let account=null,deck=[],position=0,started=false;
 const skipped=new Set();
 function reset(){deck=[];position=0;started=false;skipped.clear();}
 function view(rows,accountId=''){
  const accountValue=String(accountId||'');
  if(account!==accountValue){account=accountValue;reset();}
  const latest=uniqueIds(rows);
  if(!started){
   // Keep the first idea the user actually saw, even when the background
   // researcher changes its top-ranked candidate before any taps.
   // Append newcomers in discovery order; never silently reorder or remove.
   if(!deck.length)deck=latest.slice(0,35);
   else{
    const seen=new Set(deck);
    for(const id of latest){
     if(deck.length>=35)break;
     if(!seen.has(id)){deck.push(id);seen.add(id);}
    }
   }
   position=0;skipped.clear();
  }
  if(position>=deck.length)position=Math.max(0,deck.length-1);
  const id=deck[position]??null;
  const item=(Array.isArray(rows)?rows:[]).find(r=>r?.id===id)||null;
  const additions=latest.filter(id=>!deck.includes(id)).length;
  return Object.freeze({id,position:id?position+1:0,total:deck.length,
   item,unavailable:id!==null&&!item,started,skipped:skipped.has(id),
   newIdeas:additions,canPrevious:position>0,canNext:deck.length>0&&position<deck.length-1});
 }
 function move(rows,accountId,action){
  view(rows,accountId);
  if(!deck.length)return view(rows,accountId);
  if(action==='restart'){
   reset();return view(rows,accountId);
  }
  // A disabled Next/Skip must not silently wrap or change the current idea.
  if(action==='previous'){started=true;position=Math.max(0,position-1);}
  else if(action==='next'){started=true;position=Math.min(deck.length-1,position+1);}
  else if(action==='skip'){
   if(position<deck.length-1){started=true;skipped.add(deck[position]);position++;}
  }
  else throw Error('Unsupported guided action');
  return view(rows,accountId);
 }
 return Object.freeze({view,move,reset});
}
const api=Object.freeze({create,uniqueIds});
root.GPGuidedDeck=api;
if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
