/* Golden Peanut Legendary recipe planning — standalone, read-only.
 * Recipe catalogue: PieOrCake/crafty_legend (MIT), community-curated with GW2 Wiki sources.
 * Data is fetched WITHOUT the personal API key. All account data stays in Golden Peanut.
 * Official GW2 recipes may be used as a fallback for recipes absent from the community graph.
 */
(function(root){
'use strict';
const RAW='https://raw.githubusercontent.com/PieOrCake/crafty_legend/main/data/CraftyLegend/';
const SPECIAL={
  19675:'Mystic Clovers have multiple acquisition methods. Mystic Forge outcomes are random; the recipe tree does not imply guaranteed clovers.',
  95081:'Memory of Sunrise: requires the relevant Sunrise legendary unlock and current Armory/Mystic Forge requirements.',
  95086:'Memory of Twilight: requires the relevant Twilight legendary unlock and current Armory/Mystic Forge requirements.'
};
// Fixed documented coin payments per missing unit. Not full acquisition cost: maps, karma and other currencies remain separate.
// Gift of the Survivors and Gift of the People prices correspond to their required vendor plaques, not a second fee for the final gift.
const VENDOR_COST={19676:10000,79418:10000,106712:2500000,105804:2500000};
const VENDOR_GUIDES={
 19676:'1g per Icy Runestone from NPC (check required vendor unlocks).',
 79418:'1g per Mystic Runestone from Miyani; requires Scholar of Secrets mastery.',
 106712:'For the required Concentrated Chromatic Sap plaque: 250g, 300,000 karma, 500 Chromatic Sap. Also complete Shipwreck Strand Mastery and map completion, and obtain 500 Aether-Rich Sap. If the plaque is already held, do not rebuy it.',
 105804:'For the required Patron of the Magical Arts Plaque: 250g, 300,000 karma, 500 Raw Enchanting Stone. Also complete Starlit Weald Mastery and map completion, and obtain 500 Antiquated Ducat. If the plaque is already held, do not rebuy it.',
 20797:'Bloodstone Shard costs 200 Spirit Shards from Miyani, not 200 gold.',
 19677:'Gift of Exploration requires Core Tyria map completion, not a Trading Post purchase.',
};
function integer(v){const x=Number(v);return Number.isSafeInteger(x)&&x>=0?x:0;}
function makeBook(recipes,items){
 const recipeMap=new Map(),itemMap=new Map();
 for(const it of items||[]){const id=integer(it?.id);if(id)itemMap.set(id,{...it,id});}
 for(const r of recipes||[]){const id=integer(r?.output_id),count=integer(r?.output_count)||1;if(!id||!Array.isArray(r?.ingredients)||r.ingredients.length===0)continue;
  const ingredients=r.ingredients.map(x=>({id:integer(x.item_id),count:integer(x.count),name:String(x.name||'')})).filter(x=>x.count>0);
  if(!ingredients.length)continue;
  recipeMap.set(id,{output_id:id,output_count:count,type:String(r.type||'crafting'),disciplines:r.disciplines||[],rating:integer(r.rating),ingredients,source:r.source||'community'});
 }
 return{recipeMap,itemMap,at:Date.now()};
}
async function fetchBook(){
 const ac=new AbortController(),timer=setTimeout(()=>ac.abort(),25000);
 try{
  const [a,b]=await Promise.all(['recipes.json','items.json'].map(async name=>{
   const r=await fetch(RAW+name,{cache:'no-store',credentials:'omit',mode:'cors',signal:ac.signal,referrerPolicy:'no-referrer'});
   if(!r.ok)throw Error('community recipe data HTTP '+r.status);
   return r.json();
  }));
  if(!Array.isArray(a?.recipes)||a.recipes.length<500||!Array.isArray(b?.items)||b.items.length<900)throw Error('Community recipe data incomplete');
  return makeBook(a.recipes,b.items);
 }finally{clearTimeout(timer);}
}
function meta(book,id){return book.itemMap.get(integer(id))||{id:integer(id),name:'Item '+id,acquisition:[]};}
function isTradeable(book,id){const it=meta(book,id);return it.binding!=='account'&&Array.isArray(it.acquisition)&&it.acquisition.includes('trading_post');}
function kind(book,id){
 id=integer(id);
 if(SPECIAL[id])return 'earn';
 const it=meta(book,id);
 if(it.binding==='account'||it.binding==='soulbound')return 'earn';
 if(isTradeable(book,id))return 'buy';
 if((it.acquisition||[]).includes('vendor'))return 'vendor';
 if((it.acquisition||[]).includes('achievement')||(it.acquisition||[]).includes('legendary_armory'))return 'earn';
 if(!book.itemMap.has(id))return 'unknown';
 return 'unknown';
}
function compute(book,targetId,owned,opts={}){
 const id=integer(targetId),mode=opts.mode==='craft'?'craft':'practical';
 const stock=new Map(),leaves=new Map(),steps=[],unresolved=[],issues=[];
 if(owned&&typeof owned[Symbol.iterator]==='function')for(const [x,v] of owned)stock.set(integer(x),integer(v));
 function record(node,category,path){
  const old=leaves.get(node.id)||{id:node.id,name:node.name,category,required:0,fromStock:0,remaining:0,paths:new Set(),vendorPerUnit:VENDOR_COST[node.id]||0,note:SPECIAL[node.id]||''};
  old.required+=node.count;old.fromStock+=node.owned;old.remaining+=node.missing;old.paths.add(path.slice(0,-1).map(v=>v.name).filter(Boolean).slice(-2).join(' / ')||'Legendary');
  // When branches can be both account-bound and purchasable, always use the stricter category.
  if(old.category==='buy'&&category!=='buy')old.category=category;
  leaves.set(node.id,old);
 }
 function visit(itemId,qty,trail,depth,isRoot){
  const name=meta(book,itemId).name;
  const wanted=integer(qty),use=Math.min(wanted,integer(stock.get(itemId)));
  stock.set(itemId,integer(stock.get(itemId))-use);
  const miss=wanted-use;
  const node={id:itemId,name,count:wanted,owned:use,missing:miss,category:'covered',children:[],method:'',depth};
  if(!miss){record(node,kind(book,itemId),[...trail,{id:itemId,name}]);return node;}
  const r=book.recipeMap.get(itemId),self={id:itemId,name},cycle=trail.some(x=>x.id===itemId);
  if(cycle||depth>22){node.category='unknown';node.method='Recipe loop or depth limit — verify manually';record(node,'unknown',[...trail,self]);issues.push(node.method);return node;}
  // Forge clovers are random and account-bound; NEVER expand their stochastic recipes.
  if(SPECIAL[itemId]){node.category='earn';node.method=SPECIAL[itemId];record(node,'earn',[...trail,self]);return node;}
  // Practical mode buys tradeable finished components (notably precursors) instead of
  // forcing expensive crafting chains. Root is always expanded if a recipe is present.
  if(!isRoot&&mode==='practical'&&isTradeable(book,itemId)){
   node.category='buy';node.method=r?'Buy this tradeable component, rather than craft its submaterials':'Trading Post';
   record(node,'buy',[...trail,self]);return node;
  }
  if(r&&r.type==='vendor'&&r.ingredients.some(x=>!x.id)){
   node.category='vendor';node.method='Vendor purchase, including a currency requirement not priced in gold';record(node,'vendor',[...trail,self]);return node;
  }
  if(r){
   node.category=r.type==='vendor'?'vendor-step':'craft';node.method=r.type;node.recipe=r;
   const batches=Math.ceil(miss/r.output_count),next=[...trail,self];
   steps.push({id:itemId,name,quantity:miss,crafts:batches,method:r.type,disciplines:r.disciplines,rating:r.rating,depth});
   for(const part of r.ingredients){
    if(part.id<=0){const x={id:0,name:part.name||'Unknown currency',count:batches*part.count,owned:0,missing:batches*part.count,category:'unknown',children:[],method:'Unmapped currency requirement'};node.children.push(x);unresolved.push(x);continue;}
    node.children.push(visit(part.id,batches*part.count,next,depth+1,false));
   }
   return node;
  }
  node.category=kind(book,itemId);node.method=node.category==='buy'?'Trading Post':node.category==='earn'?'Earn, collect or unlock':node.category==='vendor'?'Buy from NPC or obtain via alternate source':'No verified item recipe / acquisition path';
  record(node,node.category,[...trail,self]);if(node.category==='unknown')unresolved.push(node);
  return node;
 }
 const tree=visit(id,1,[],0,true);
 const items=[...leaves.values()].map(v=>({...v,paths:[...v.paths]}));
 return{tree,items,steps,unresolved,issues,mode,hasRecipe:book.recipeMap.has(id),target:id,sourceAt:book.at,
 counts:{buy:items.filter(x=>x.category==='buy'&&x.remaining>0).length,earn:items.filter(x=>x.category==='earn'&&x.remaining>0).length,vendor:items.filter(x=>x.category==='vendor'&&x.remaining>0).length,unknown:items.filter(x=>x.category==='unknown'&&x.remaining>0).length}};
}
root.GPLegendaryRecipes={makeBook,fetchBook,compute,meta,isTradeable,kind,VENDOR_COST,VENDOR_GUIDES,RAW};
if(typeof module!=='undefined'&&module.exports)module.exports=root.GPLegendaryRecipes;
})(typeof globalThis!=='undefined'?globalThis:this);
