/* The Golden Peanut — Legendary Planner 1.2: automatic verified recipe planning. Read-only and independent from Trading Desk. */
(function(root){
'use strict';
const BASE='https://api.guildwars2.com/v2';
const STORE='gp-legendary-planner-1:';
const $=id=>document.getElementById(id);
const GEN1={
 'Frostfang':'Tooth of Frostfang', 'Incinerator':'Spark', 'The Moot':'The Energizer',
 'Quip':'Chaos Gun','Meteorlogicus':'Storm','Bolt':'Zap','Sunrise':'Dawn',
 'Twilight':'Dusk','The Juggernaut':'The Colossus','Kudzu':'Leaf of Kudzu',
 'The Predator':'The Hunter','The Dreamer':'The Lover','The Bifrost':'The Legend',
 'Frenzy':'Rage',"Kamohoali'i Kotaki":'Carcharias','Kraitkin':'Venom',
 'Howler':'Howl','Rodgort':"Rodgort's Flame",'The Minstrel':'The Bard',
 'The Flameseeker Prophecies':'The Chosen'
};
const PRECURSOR_IDS={'Sunrise':29169,'Twilight':29185,'The Predator':29175};
const ITEMS={
 19626:'Gift of Fortune',19674:'Gift of Mastery',19673:'Gift of Magic',19672:'Gift of Might',
 19675:'Mystic Clover',19721:'Glob of Ectoplasm',20797:'Bloodstone Shard',19925:'Obsidian Shard',
 19677:'Gift of Exploration',19678:'Gift of Battle',19676:'Icy Runestone',
 29169:'Dawn',29185:'Dusk',29175:'The Hunter',
 24295:'Vial of Powerful Blood',24283:'Powerful Venom Sac',24300:'Elaborate Totem',24277:'Pile of Crystalline Dust',
 24357:'Vicious Fang',24289:'Armored Scale',24351:'Vicious Claw',24358:'Ancient Bone'
};
const T6_MAGIC=[24295,24283,24300,24277],T6_MIGHT=[24357,24289,24351,24358];
const cache={book:null,bookError:'',bookPromise:null,bookAt:0,plan:null,route:'practical',itemNames:new Map(),catalog:[],catalogAt:0,catalogLoaded:false,chosen:null,search:'',filter:'all',owned:new Map(),ownedKnown:false,bag:new Map(),storageParts:[],storageFresh:false,price:new Map(),priceAt:0,busy:false,account:'',list:{goals:[],checked:{},custom:{}},need:[],needKnown:false,lastSaved:'',selectedId:null};
const n=v=>Math.max(0,Math.trunc(Number(v)||0));
const fmt=v=>new Intl.NumberFormat('en-GB').format(n(v));
const cash=v=>{let p=n(v);return `${Math.floor(p/10000).toLocaleString('en-GB')}g ${String(Math.floor(p%10000/100)).padStart(2,'0')}s ${String(p%100).padStart(2,'0')}c`;};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const linkName=name=>'https://wiki.guildwars2.com/wiki/'+encodeURIComponent(String(name).replaceAll(' ','_'));
const status=(s,bad=false)=>{const e=$('lp-status');if(e){e.textContent=s;e.className='lp-status'+(bad?' lp-error':'');}};
const safeIcon=s=>typeof s==='string'&&/^https:\/\/render\.guildwars2\.com\/file\/[A-Fa-f0-9]+\/\d+\.(?:png|jpg|jpeg|webp)$/.test(s)?s:'';
const itemName=id=>cache.catalog.find(x=>x.id===id)?.name||cache.book?.itemMap.get(id)?.name||cache.itemNames.get(id)||ITEMS[id]||Object.values(cache.list.custom||{}).flat().find(x=>x.id===id)?.name||`Item ${id}`;
const account=()=>root.GoldenPeanutClean?.State?.account||root.__GP_PERSONAL_PROFILE?.account||'';
const key=()=>root.GoldenPeanutClean?.State?.key||root.__GP_PERSONAL_PROFILE?.key||'';
function loadPersonal(){
 const who=account()||'local';if(who===cache.account)return;
 cache.account=who;cache.ownedKnown=false;cache.storageFresh=false;cache.bag.clear();cache.owned.clear();cache.price.clear();
 try{const v=JSON.parse(localStorage.getItem(STORE+who)||'null');cache.list={goals:Array.isArray(v?.goals)?v.goals.filter(Number.isInteger).slice(0,80):[],chosen:n(v?.chosen)||null,checked:v?.checked&&typeof v.checked==='object'?v.checked:{},custom:v?.custom&&typeof v.custom==='object'?v.custom:{}};}catch{cache.list={goals:[],checked:{},custom:{}};}
 cache.chosen=cache.list.chosen||cache.list.goals[0]||null;
}
function save(){try{localStorage.setItem(STORE+cache.account,JSON.stringify(cache.list));cache.lastSaved='Saved locally for '+cache.account;}catch{cache.lastSaved='Browser could not save; check available storage';}}
async function api(path,withKey=false){
 if(!path.startsWith('/')||path.startsWith('//'))throw Error('Invalid API path');
 const url=new URL(BASE+path);if(url.origin!=='https://api.guildwars2.com')throw Error('API host blocked');
 if(withKey){let token=key();if(!token)throw Error('Saved GW2 account key unavailable');url.searchParams.set('access_token',token);}
 for(let a=0;a<2;a++){
  let controller=new AbortController(),timer=setTimeout(()=>controller.abort(),17000);
  try{const r=await fetch(url.href,{signal:controller.signal,headers:{Accept:'application/json'},cache:'no-store',credentials:'omit',referrerPolicy:'no-referrer'});
   if(!r.ok){if(r.status===429&&a===0){await new Promise(ok=>setTimeout(ok,800));continue;}throw Error(`GW2 API HTTP ${r.status}${r.status===403?' — missing permission':''}`);}
   return await r.json();
  }finally{clearTimeout(timer);}
 }
 throw Error('GW2 API temporarily unavailable');
}
async function batches(ids,size=120){
 const out=[];async function subset(group){if(!group.length)return;try{const result=await api('/items?ids='+group.join(','));if(Array.isArray(result))out.push(...result);}
 catch(e){if(group.length===1)return;const i=Math.ceil(group.length/2);await subset(group.slice(0,i));await subset(group.slice(i));}}
 for(let i=0;i<ids.length;i+=size)await subset(ids.slice(i,i+size));return out;
}
function marketable(it){return it&&!(it.flags||[]).includes('AccountBound')&&!(it.flags||[]).includes('SoulbindOnAcquire')&&!(it.flags||[]).includes('NoSell')&&!(it.flags||[]).includes('NotSalvageable_XXX');}
async function catalog(){
 if(cache.catalogLoaded)return;
 // Fast saved catalogue while the live API is being checked.
 try{const stored=JSON.parse(localStorage.getItem('gp-legendary-catalog-v1')||'null');if(Array.isArray(stored?.items)&&stored.items.length>50){cache.catalog=stored.items;cache.catalogAt=n(stored.at);renderCatalog();}}catch{}
 const arm=await api('/legendaryarmory?ids=all');if(!Array.isArray(arm)||arm.length<50)throw Error('Legendary Armory catalogue incomplete');
 const ids=arm.map(x=>n(x.id)).filter(Boolean),meta=await batches(ids),info=new Map(meta.map(x=>[x.id,x]));
 const next=arm.map(x=>({id:n(x.id),max_count:n(x.max_count),name:info.get(x.id)?.name||'Unidentified legendary',type:info.get(x.id)?.type||'Other',icon:safeIcon(info.get(x.id)?.icon),rarity:info.get(x.id)?.rarity||'Legendary',flags:info.get(x.id)?.flags||[],details:info.get(x.id)?.details||{}})).filter(x=>x.id>0&&x.name!=='Unidentified legendary').sort((a,b)=>a.name.localeCompare(b.name));
 if(next.length<50)throw Error('Legendary item metadata incomplete');
 cache.catalog=next;cache.catalogAt=Date.now();cache.catalogLoaded=true;
 try{localStorage.setItem('gp-legendary-catalog-v1',JSON.stringify({at:cache.catalogAt,items:next}));}catch{}
 renderCatalog();
}
async function ensureBook(retry=false){
 if(cache.book&&!(retry&&cache.bookError))return cache.book;
 if(retry&&cache.bookError)cache.book=null;
 if(cache.bookPromise)return cache.bookPromise;
 const R=root.GPLegendaryRecipes;
 if(!R)throw Error('Recipe engine script not loaded. Refresh the application.');
 cache.bookPromise=(async()=>{
  try{
   status('Loading real legendary recipes and Mystic Forge components…');
   const book=await R.fetchBook();
   if(book.recipeMap.size<500)throw Error('Recipe library is incomplete');
   cache.book=book;cache.bookAt=Date.now();cache.bookError='';
   for(const it of cache.catalog)if(!book.itemMap.has(it.id))book.itemMap.set(it.id,{id:it.id,name:it.name,acquisition:[],binding:it.flags?.includes('AccountBound')?'account':''});
   render();return book;
  }catch(error){cache.bookError=error.message;
   // An official crafting recipe can still be queried individually if community recipes fail.
   if(!cache.book)cache.book=R.makeBook([],cache.catalog.map(it=>({id:it.id,name:it.name,binding:it.flags?.includes('AccountBound')?'account':'',acquisition:[]})));
   render();return cache.book;
  }finally{cache.bookPromise=null;}
 })();return cache.bookPromise;
}
async function officialRecipeFor(target){
 if(!target||!cache.book||cache.book.recipeMap.has(target)||cache.bookChecked?.has(target))return;
 if(!cache.bookChecked)cache.bookChecked=new Set();cache.bookChecked.add(target);
 try{
  const ids=await api('/recipes/search?output='+target);
  if(!Array.isArray(ids)||!ids.length)return;
  const recipe=await api('/recipes/'+n(ids[0]));
  if(n(recipe.output_item_id)!==target||!Array.isArray(recipe.ingredients)||!recipe.ingredients.length)return;
  const ingredients=recipe.ingredients.map(i=>({id:n(i.item_id??(i.type==='Item'?i.id:0)),count:n(i.count),name:i.type==='Currency'?'Currency '+i.id:''})).filter(i=>i.count>0);
  if(!ingredients.length)return;
  const missing=ingredients.map(x=>x.id).filter(id=>id&&!cache.book.itemMap.has(id));
  if(missing.length){const rows=await batches(missing);for(const it of rows)cache.book.itemMap.set(it.id,{...it,binding:it.flags?.includes('AccountBound')?'account':'',acquisition:it.flags?.includes('NoSell')?[]:['trading_post']});}
  cache.book.recipeMap.set(target,{output_id:target,output_count:n(recipe.output_item_count)||1,type:'crafting',ingredients,disciplines:recipe.disciplines||[],rating:n(recipe.min_rating),source:'official'});
 }catch(error){cache.bookError='Official recipe check incomplete: '+error.message;}
}
async function loadSelection(){
 if(!cache.chosen)return;
 await ensureBook();await officialRecipeFor(cache.chosen);
 const d=derive();
 // Refresh only the actually purchasable missing materials, not account-bound currencies.
 const ids=d.plan?.items.filter(x=>x.category==='buy'&&x.remaining>0).map(x=>x.id)||[];
 if(d.it&&!(d.it.flags||[]).includes('AccountBound'))ids.push(d.it.id);
 await prices(ids);render();
}
function addEntry(map,id,count){id=n(id);count=n(count);if(id>0&&count>0)map.set(id,n(map.get(id))+count);}
function parseSlots(slots,dest){if(!Array.isArray(slots))return;for(const it of slots)if(it&&typeof it==='object')addEntry(dest,it.id,it.count??1);}
async function syncAccount(){
 const problems=[],keyAvailable=Boolean(key());cache.ownedKnown=false;cache.storageFresh=false;
 if(!keyAvailable){status('Saved account key not available yet. Open the Trading Desk once, then retry.',true);return;}
 const fresh=new Map(),pieces=[];
 cache.characterNames=[];const calls=[
  {name:'material storage',path:'/account/materials',fn:rows=>parseSlots(rows,fresh)},
  {name:'bank',path:'/account/bank',fn:rows=>parseSlots(rows,fresh)},
  {name:'shared inventory',path:'/account/inventory',fn:rows=>parseSlots(rows,fresh)},
  {name:'Legendary Armory',path:'/account/legendaryarmory',fn:rows=>{cache.owned=new Map((Array.isArray(rows)?rows:[]).map(x=>[n(x.id),n(x.count)]));cache.ownedKnown=true;}},
  {name:'character names',path:'/characters',fn:rows=>{cache.characterNames=Array.isArray(rows)?rows:[];}}
 ];
 for(const c of calls){try{const val=await api(c.path,true);c.fn(val);pieces.push(c.name);}catch(e){problems.push(c.name+': '+e.message);}}
 const names=cache.characterNames||[];let scanned=0;
 for(let offset=0;offset<names.length;offset+=3){
  await Promise.all(names.slice(offset,offset+3).map(async name=>{
   try{const r=await api('/characters/'+encodeURIComponent(name)+'/inventory',true);if(Array.isArray(r?.bags))for(const b of r.bags)if(b?.inventory)parseSlots(b.inventory,fresh);scanned++;}
   catch(e){if(problems.length<7)problems.push('Character '+String(name).slice(0,25)+': '+e.message);}
  }));
  status(`Checking character bags · ${scanned}/${names.length} accessible…`);
 }
 cache.bag=fresh;cache.storageParts=pieces;cache.storageFresh=!problems.length&&scanned===names.length;
 const when=new Date().toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'});
 status(`${fmt(fresh.size)} distinct item types seen · ${scanned}/${names.length} characters · ${when}${problems.length?' · partial access: '+problems.slice(0,2).join('; '):' · account holdings checked'}`,Boolean(problems.length));
 render();
}
const NONMARKET=new Set([19626,19674,19673,19672,19675,20797,19925,19677,19678,19676]);
async function prices(ids){
 const need=[...new Set(ids)].filter(x=>n(x)>0&&!NONMARKET.has(n(x))&&(!cache.price.has(x)||Date.now()-cache.price.get(x).at>15*60*1000));
 async function group(ids){if(!ids.length)return;try{
  const rows=await api('/commerce/prices?ids='+ids.join(','));for(const r of rows||[])cache.price.set(n(r.id),{buy:n(r.buys?.unit_price),sell:n(r.sells?.unit_price),at:Date.now()});
 }catch(e){if(ids.length>1){const mid=Math.ceil(ids.length/2);await group(ids.slice(0,mid));await group(ids.slice(mid));}
 else cache.price.set(ids[0],{buy:0,sell:0,at:Date.now(),unsupported:true});}}
 for(let i=0;i<need.length;i+=80)await group(need.slice(i,i+80));
}

function addNeed(needs,id,count,scope){if(!n(count))return;const v=needs.get(id)||{id,count:0,scope:new Set()};v.count+=n(count);v.scope.add(scope);needs.set(id,v);}
function unlocked(id){return n(cache.owned.get(id))>0;}
function guideFor(it){
 if(!it)return{kind:'none',tasks:[],needs:new Map()};
 const tasks=[];const task=(id,text)=>tasks.push({id,text});
 const name=it.name;
 if(name.startsWith('Obsidian ')){
  task('obsidian-recipe','Unlock Obsidian Armor Crafting mastery and purchase the legendary recipe from Lyhr (Wizard’s Tower).');
  task('obsidian-skins','Unlock the appropriate Astral Ward and Oneiros-Spun armor skins to acquire the Arcanum.');
  task('obsidian-workshop','Craft at a level-500 armor station in the Wizard’s Tower, or check Lyhr’s vendor alternative.');
 }else if(name==='Endless Summer'){
  task('summer-hylek','Gift of the Hylek: complete Radiance of the Sun God if you do not already hold the gift.');
  task('summer-ship-mastery','Complete Shipwreck Strand Mastery and full Shipwreck Strand map exploration.');
  task('summer-ship-currency','Acquire 500 Chromatic Sap, 500 Aether-Rich Sap and 300,000 karma; purchase the 250g Concentrated Chromatic Sap component from Sharpwhisker. Then obtain Gift of the Survivors from Castaway Agnes.');
  task('summer-star-mastery','Complete Starlit Weald Mastery and full Starlit Weald map exploration.');
  task('summer-star-currency','Acquire 500 Raw Enchanting Stone, 500 Antiquated Ducat and 300,000 karma; purchase the 250g Patron of the Magical Arts Plaque from Huntmaster Arnorr. Then obtain Gift of the People from Canach.');
  task('summer-rays','Craft Gift of Rays from Gift of the Sun, Gift of the Beach, Gift of Infused Gems and 10 Purified Rift Essences. Account-bound currencies and recipe unlock fees may be needed.');
  task('summer-forge','Combine the four gifts in the Mystic Forge to obtain Endless Summer.');
 }else if(name==='Eternity'){
  task('eternity-memories','Obtain Memory of Sunrise and Memory of Twilight through the required legendary unlock route.');
  task('eternity-check','Check the current Eternity Mystic Forge combination on the wiki before committing legendaries.');
 }else if(Object.prototype.hasOwnProperty.call(GEN1,name)){
  task('precursor','Acquire '+GEN1[name]+' (buy directly or use the precursor crafting/collection path).');
  task('clovers','Acquire Mystic Clovers from a preferred guaranteed source or optional probabilistic Mystic Forge method.');
  task('map','Complete Core Tyria world exploration for Gift of Exploration if required.');
  task('wvw','Complete the Gift of Battle reward track if required.');
 }else if(name==='Prismatic Champion\'s Regalia'){
  task('return-to','Complete the Seasons of the Dragons / Return To achievement chain.');
 }else if(it.type==='Armor'){
  task('armor-route','Confirm legendary armor acquisition route and the associated currencies or achievements.');
 }else if(it.type==='Trinket'||it.type==='Back'){
  task('collection','Review account-bound collections, achievements and acquisition currencies.');
 }
 task('verify','Confirm the recipe and account-bound unlock requirements in the linked GW2 Wiki page before spending gold.');
 return{kind:'Automatic recipe planner',tasks,needs:new Map()};
}
function derive(){
 const it=cache.catalog.find(x=>x.id===cache.chosen);const g=guideFor(it);
 const plan=it&&cache.book?root.GPLegendaryRecipes.compute(cache.book,it.id,cache.bag,{mode:cache.route}):null;
 const rows=plan?plan.items.map(x=>({...x,owned:x.fromStock,count:x.required,missing:x.remaining,scope:new Set(x.paths)})):[];
 // Custom ingredients are optional additional shopping requirements, never necessary to use the planner.
 for(const row of cache.list.custom[String(cache.chosen)]||[]){if(n(row.id)>0&&n(row.count)>0){const id=n(row.id),qty=n(row.count),held=n(cache.bag.get(id));const existing=rows.find(x=>x.id===id);if(existing){existing.count+=qty;existing.missing+=Math.max(0,qty-Math.max(0,held-existing.owned));existing.scope.add('Your optional manual addition');}else{rows.push({id,count:qty,owned:Math.min(qty,held),missing:Math.max(0,qty-held),category:cache.book?root.GPLegendaryRecipes.kind(cache.book,id):'unknown',scope:new Set(['Your optional manual addition'])});}}}
 return{it,g,plan,need:rows};
}
async function updatePrices(){await loadSelection();}
function kind(it){if(it.type==='Weapon')return'Weapons';if(it.type==='Armor')return'Armor';if(it.type==='Trinket')return'Trinkets';if(it.type==='Back')return'Backpieces';if(it.type==='UpgradeComponent')return'Upgrades';return'Other';}
function renderCatalog(){
 const count=$('lp-catalog-count');if(count)count.textContent=`${fmt(cache.catalog.length)} legendary equipment entries · ${cache.catalogAt?new Date(cache.catalogAt).toLocaleDateString('en-GB'):'not loaded'}`;
 const select=$('lp-choose');if(!select)return;
 const items=cache.catalog.filter(it=>cache.filter==='all'||kind(it)===cache.filter).filter(it=>!cache.search||it.name.toLowerCase().includes(cache.search));
 const existing=String(cache.chosen||'');select.replaceChildren(new Option('Choose a legendary…',''),...items.map(it=>new Option(it.name+(cache.ownedKnown&&unlocked(it.id)?' · OWNED':''),String(it.id))));
 if(items.some(x=>String(x.id)===existing))select.value=existing;
 const note=$('lp-results');if(note)note.textContent=fmt(items.length)+' matching results';
 renderGoals();
}
function renderGoals(){const node=$('lp-goals');if(!node)return;const all=cache.list.goals.map(id=>cache.catalog.find(it=>it.id===id)).filter(Boolean);
 node.replaceChildren();if(!all.length){node.textContent='No tracked goals yet. Choose a legendary and add it below.';return;}
 for(const it of all){const row=document.createElement('div');row.className='lp-goal';
  const button=document.createElement('button');button.type='button';button.className='secondary lp-goal-select';button.textContent=it.name+(cache.ownedKnown&&unlocked(it.id)?' ✓ Armory':'');root.GPRarity?.apply?.(button,it.rarity||'Legendary');button.addEventListener('click',()=>{cache.chosen=it.id;cache.list.chosen=it.id;save();renderCatalog();render();});
  const remove=document.createElement('button');remove.type='button';remove.className='secondary lp-small';remove.textContent='×';remove.setAttribute('aria-label','Remove '+it.name+' goal');remove.addEventListener('click',()=>{cache.list.goals=cache.list.goals.filter(x=>x!==it.id);if(cache.chosen===it.id)cache.chosen=cache.list.goals[0]||null;save();renderCatalog();render();});
  row.append(button,remove);node.append(row);
 }
}
function render(){
 renderCatalog();const d=derive(),detail=$('lp-detail');if(!detail)return;
 if(!d.it){detail.hidden=true;return;}detail.hidden=false;
 const it=d.it,ownedCount=cache.owned.get(it.id)||0,plan=d.plan;
 $('lp-target-name').textContent=it.name;root.GPRarity?.apply?.($('lp-target-name'),it.rarity||'Legendary');
 $('lp-target-kind').textContent=kind(it)+(it.details?.type?' · '+it.details.type:'')+(cache.ownedKnown?` · Armory: ${ownedCount}/${it.max_count||'?'} owned`:' · Armory ownership not refreshed');
 const icon=$('lp-target-icon');if(safeIcon(it.icon)){icon.src=it.icon;icon.hidden=false;}else icon.hidden=true;
 $('lp-wiki').href=linkName(it.name);
 $('lp-add').disabled=cache.list.goals.includes(it.id);
 $('lp-add').textContent=cache.list.goals.includes(it.id)?'Already tracking':'Track this legendary';
 if($('lp-route'))$('lp-route').value=cache.route;
 const note=$('lp-completeness'),book=cache.book;
 if(!book)note.textContent='Checking verified crafting recipes…';
 else if(!plan?.hasRecipe)note.textContent=cache.bookError?`Recipe source unavailable: ${cache.bookError}. Try checking again. This is not a zero-cost craft.`:'This item has no verified crafting recipe in the loaded sources; it may require an achievement, collection or vendor purchase. No fake cost is shown.';
 else note.textContent=`Automatic ${plan.steps.length} step recipe tree · ${plan.items.length} unique base ingredients · ${book.recipeMap.get(it.id)?.source==='official'?'ArenaNet crafting recipe':'community-curated recipe data'}. Prices reflect missing purchasable materials only; earnable currencies and uncertain clover recipes are separate.`;
 const direct=$('lp-direct');if(direct){direct.replaceChildren();
  if(plan?.hasRecipe){
   const r=book.recipeMap.get(it.id);
   const intro=document.createElement('p');intro.className='muted';intro.textContent=`${r.type==='mystic_forge'?'Mystic Forge':r.type==='vendor'?'Vendor':'Crafting'} · ${r.disciplines?.join('/')||'Any discipline'}${r.rating?' '+r.rating:''} · ${r.ingredients.length} immediate components`;
   direct.append(intro);
   for(const branch of plan.tree.children){const div=document.createElement('div');div.className='lp-direct-row';
    const name=document.createElement('a');name.href=linkName(branch.name);name.target='_blank';name.rel='noopener noreferrer';name.textContent=branch.name;root.GPRarity?.apply?.(name,book?.itemMap?.get(branch.id)?.rarity||branch.rarity);
    const val=document.createElement('strong');val.textContent=`×${fmt(branch.count)}${branch.owned?' · '+fmt(branch.owned)+' held':''}`;
    div.append(name,val);direct.append(div);
   }
  }else{const p=document.createElement('p');p.className='muted';p.textContent='No complete crafting tree can be verified for this item yet. Its wiki acquisition route is linked above.';direct.append(p);}
 }
 const steps=$('lp-craft-steps');if(steps){steps.replaceChildren();if(plan?.steps.length){for(const x of plan.steps.slice(0,12)){
   const div=document.createElement('div');div.className='lp-direct-row';
   const link=document.createElement('a');link.href=linkName(x.name);link.target='_blank';link.rel='noopener noreferrer';link.textContent=x.name;root.GPRarity?.apply?.(link,book?.itemMap?.get(x.id)?.rarity||x.rarity);
   const val=document.createElement('small');val.textContent=`${x.method==='mystic_forge'?'Forge':x.method==='vendor'?'Vendor':'Craft'} ×${fmt(x.quantity)}`;div.append(link,val);steps.append(div);
  }if(plan.steps.length>12){const small=document.createElement('p');small.className='muted';small.textContent=`+ ${plan.steps.length-12} more crafting steps included in the shopping calculations`;steps.append(small);}}else steps.textContent='No craftable route available yet.';}
 const tasks=$('lp-tasks');tasks.replaceChildren();for(const t of d.g.tasks){const label=document.createElement('label');label.className='lp-task';const input=document.createElement('input');input.type='checkbox';input.checked=Boolean(cache.list.checked[`${it.id}:${t.id}`]);input.addEventListener('change',()=>{cache.list.checked[`${it.id}:${t.id}`]=input.checked;save();renderBreakdown();});const txt=document.createElement('span');txt.textContent=t.text;label.append(input,txt);tasks.append(label);}
 const custom=cache.list.custom[String(it.id)]||[];const rows=$('lp-custom-list');rows.replaceChildren();for(let i=0;i<custom.length;i++){const rr=custom[i],line=document.createElement('div');line.className='lp-custom-row';const name=document.createElement('span');name.textContent=`${itemName(rr.id)} ×${fmt(rr.count)}`;const b=document.createElement('button');b.className='secondary lp-small';b.type='button';b.textContent='Remove';b.addEventListener('click',()=>{custom.splice(i,1);save();render();});line.append(name,b);rows.append(line);}
 renderBreakdown();
}
function renderBreakdown(){
 const d=derive(),plan=d.plan,list=$('lp-materials');if(!list)return;list.replaceChildren();
 const sorted=d.need.slice().filter(x=>x.missing>0).sort((a,b)=>{
  const ca=a.category==='buy'?0:a.category==='earn'?1:a.category==='vendor'?2:3;
  const cb=b.category==='buy'?0:b.category==='earn'?1:b.category==='vendor'?2:3;
  if(ca!==cb)return ca-cb;
  const pa=cache.price.get(a.id)?.sell||0,pb=cache.price.get(b.id)?.sell||0;
  return pb*b.missing-pa*a.missing||a.id-b.id;
 });
 let askTotal=0,bidTotal=0,priced=0,unpriced=0,vendor=0,nonTP=0;
 const buyers=[],earners=[],vendors=[],unknown=[];
 for(const row of sorted){const price=cache.price.get(row.id);const category=row.category||'unknown';
  if(category==='buy'){buyers.push(row);if(price?.sell>0){askTotal+=row.missing*price.sell;priced++;}else unpriced++;if(price?.buy>0)bidTotal+=row.missing*(price.buy+1);}
  else if(category==='vendor'||(root.GPLegendaryRecipes.VENDOR_COST[row.id]||0)>0){vendors.push(row);vendor++;}
  else if(category==='earn'){earners.push(row);nonTP++;}
  else {unknown.push(row);nonTP++;}
 }
 const box=$('lp-summary');if(box){box.textContent=plan?.hasRecipe?`${fmt(buyers.length)} types to buy · ${fmt(earners.length+vendors.length)} earn/vendor types · ${fmt(unknown.length)} unknown item IDs · ${fmt(d.need.filter(x=>x.missing===0).length)} already held. Vendor payments and achievement progress are separate.`:'Automatic recipe unavailable. Open the wiki acquisition instructions; no shopping cost is assumed.';}
 $('lp-missing-types').textContent=plan?.hasRecipe?fmt(sorted.length)+' missing types':'Not known';
 $('lp-instant-cost').textContent=!plan?.hasRecipe?'—':!buyers.length?'0g 00s 00c':priced?cash(askTotal)+(unpriced?' +':''):'—';
 $('lp-bid-cost').textContent=!plan?.hasRecipe?'—':!buyers.length?'0g 00s 00c':bidTotal?cash(bidTotal)+(unpriced?' +':''):'—';
 // Known direct NPC coin charges, respecting paid-for intermediate plaques already in bags/storage.
 const NPC_PREREQUISITE={106712:105848,105804:105933};
 const paidFor=new Map();
 const chargeQty=row=>{
  const plaque=NPC_PREREQUISITE[row.id];
  return Math.max(0,row.missing-(plaque?n(cache.bag.get(plaque)):0));
 };
 let npcCost=0;for(const row of sorted){const amount=(root.GPLegendaryRecipes.VENDOR_COST[row.id]||0)*chargeQty(row);if(amount){npcCost+=amount;paidFor.set(row.id,amount);}}
 const missingSurvivor=sorted.find(x=>x.id===106712),missingPeople=sorted.find(x=>x.id===105804);
 const karmaNeeded=300000*((missingSurvivor?chargeQty(missingSurvivor):0)+(missingPeople?chargeQty(missingPeople):0));
 const feeBox=$('lp-known-spend');if(feeBox){feeBox.hidden=!plan?.hasRecipe;const total=$('lp-known-total');if(total)total.textContent=plan?.hasRecipe?cash(askTotal+npcCost)+(unpriced?' + unpriced materials':''):'—';const npc=$('lp-npc-breakdown');if(npc)npc.textContent=`Tradeable materials ${cash(askTotal)} + documented NPC coin payments ${cash(npcCost)}. This is NOT the complete cost; achievement, karma, spirit-shard, dungeon-currency and optional recipe fees may remain.`;}
 const karma=$('lp-known-karma');if(karma)karma.textContent=karmaNeeded?`Known extra karma: at least ${fmt(karmaNeeded)} (for remaining gift plaques). Two zone masteries and map completions are also required if not already done.`:'';
 const warning=[];
 if(!plan?.hasRecipe)warning.push('No verified recipe. The blank cost does NOT mean free.');
 else {warning.push('Tradeable-material shopping subtotal only, not the total cost of a legendary.');
  if(unpriced)warning.push(`${unpriced} missing market price(s).`);
  if(npcCost)warning.push(`${cash(npcCost)} known NPC coin expenses included in combined known spend below.`);
  if(vendor)warning.push(`${vendor} vendor item types may involve unpriced currency or coin costs.`);
  if(plan.unresolved.length||unknown.length)warning.push(`${plan.unresolved.length+unknown.length} unverified recipe/currency requirements.`);
  warning.push('Mystic Clovers are earnable and Mystic Forge outcomes are not guaranteed.');
 }
 $('lp-cost-note').textContent=warning.join(' ');
 const finished=cache.price.get(d.it?.id);$('lp-finished-price').textContent=finished?.sell>0?`Finished item: public buy-now ask ${cash(finished.sell)} (separate from crafting expenses).`:'Finished item: not currently priced as a public buy-now purchase, or not tradeable.';
 $('lp-account-note').textContent=cache.storageFresh?'Owned quantities checked against material storage, bank, shared slots and character bags; these materials are not reserved for projects.':'Account holdings are incomplete or still loading; missing quantities may be overstated.';
 function renderSection(title,rows,showPrices=true){if(!rows.length)return;const heading=document.createElement('h4');heading.className='lp-group-label';heading.textContent=title+' · '+fmt(rows.length)+' types';list.append(heading);
  const top=rows.slice(0,9),rest=rows.slice(9);
  function draw(items,container){for(const row of items){const line=document.createElement('div');line.className='lp-material-row';const header=document.createElement('div');header.className='lp-material-title';const link=document.createElement('a');link.href=linkName(itemName(row.id));link.target='_blank';link.rel='noopener noreferrer';link.textContent=itemName(row.id);root.GPRarity?.apply?.(link,cache.book?.itemMap?.get(row.id)?.rarity||row.rarity);const qty=document.createElement('strong');qty.textContent=fmt(row.missing)+' missing';header.append(link,qty);const desc=document.createElement('small');desc.className='muted';
   const p=cache.price.get(row.id);let detail=`${fmt(row.owned)} owned / ${fmt(row.count)} required`;
   if(showPrices){if(p?.sell>0)detail+=` · ${cash(p.sell*row.missing)} at current lowest asks`;else detail+=' · market price unavailable';}
   else if(row.id===19675)detail+=' · choose a guaranteed/earned clover source; random forging not costed';
   else if((root.GPLegendaryRecipes.VENDOR_COST[row.id]||0)>0){detail+=` · documented NPC coin charge ${cash(paidFor.get(row.id)||0)}`;if(NPC_PREREQUISITE[row.id]&&n(cache.bag.get(NPC_PREREQUISITE[row.id])))detail+=' (held prerequisite plaque subtracted)';}
   else if(row.category==='unknown')detail+=' · verify vendor, collection or special recipe';
   else detail+=' · collect, unlock or obtain';
   desc.textContent=detail;line.append(header,desc);const guide=root.GPLegendaryRecipes.VENDOR_GUIDES[row.id];if(guide&&!showPrices){const extras=document.createElement('small');extras.className='muted lp-npc-guide';extras.textContent=guide;line.append(extras);}container.append(line);}}
  draw(top,list);
  if(rest.length){const details=document.createElement('details');details.className='lp-more';const summary=document.createElement('summary');summary.textContent=`Show ${rest.length} more ${title.toLowerCase()} materials`;details.append(summary);draw(rest,details);list.append(details);}
 }
 if(!plan||!plan.hasRecipe){const p=document.createElement('p');p.className='muted';p.textContent='No verified automatic ingredient requirements for this target. Visit the GW2 Wiki for its acquisition or collection route.';list.append(p);}
 else if(!sorted.length){const p=document.createElement('p');p.className='muted';p.textContent='All represented material requirements are covered by your recorded holdings. Check collections, currencies and untracked equipped materials before crafting.';list.append(p);}
 else{renderSection('Buy from Trading Post',buyers,true);renderSection('Earn or collect',earners,false);renderSection('Purchase at NPC',vendors,false);renderSection('Needs verification',unknown,false);}
 const copy=$('lp-copy');if(copy){copy.disabled=!d.it||!plan?.hasRecipe;copy.onclick=()=>{
  const lines=[`The Golden Peanut · ${d.it.name}`,`Trading Post subtotal (known asks): ${priced?cash(askTotal):'No priced items yet'}`,`Known direct NPC gold: ${cash(npcCost)}`,`Combined known spend (NOT total cost): ${cash(askTotal+npcCost)}`,...(karmaNeeded?[`Additional known karma: ${fmt(karmaNeeded)}`]:[]),'This excludes unpriced, account-bound, achievement and other acquisition costs.','BUY:'];for(const x of buyers)lines.push(`${itemName(x.id)} × ${x.missing}`);lines.push('EARN / COLLECT:');for(const x of [...earners,...vendors])lines.push(`${itemName(x.id)} × ${x.missing}`);if(unknown.length)lines.push('VERIFY: '+unknown.map(x=>itemName(x.id)+' ×'+x.missing).join(', '));
  if(navigator.clipboard?.writeText)navigator.clipboard.writeText(lines.join('\n')).then(()=>status('Complete known shopping/earning list copied.')).catch(()=>status('Clipboard unavailable on this browser.',true));else status('Clipboard unavailable on this browser.',true);};}
}
async function refresh(full=true){if(cache.busy)return;cache.busy=true;$('lp-refresh').disabled=true;
 try{loadPersonal();status('Loading legendary catalogue and complete crafting routes…');await catalog();await ensureBook(true);if(full)await syncAccount();await loadSelection();
 status(cache.book?.recipeMap.size>500?`Ready · ${fmt(cache.catalog.length)} legendary entries · ${fmt(cache.book.recipeMap.size)} curated recipes · ${new Date().toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'})}${cache.storageFresh?' · holdings checked':' · inventory partial'}`:`Account checked · complete recipe dataset unavailable (${cache.bookError||'unknown'}), official crafting fallback attempted`,Boolean(cache.bookError));
 }catch(e){status('Planner refresh incomplete: '+e.message+'. Goals preserved.',true);render();}finally{cache.busy=false;$('lp-refresh').disabled=false;}}
function init(){
 const nav=$('nav-legend');if(!nav||!$('lp-choose'))return;
 loadPersonal();renderCatalog();render();
 nav.addEventListener('click',()=>{if(!cache.catalogLoaded){void refresh(true);}else if(!cache.storageFresh){void syncAccount();}});
 $('lp-refresh').addEventListener('click',()=>refresh(true));
 $('lp-search').addEventListener('input',e=>{cache.search=String(e.target.value||'').toLowerCase().trim();renderCatalog();});
 $('lp-filter').addEventListener('change',e=>{cache.filter=e.target.value;renderCatalog();});
 $('lp-choose').addEventListener('change',e=>{cache.chosen=n(e.target.value)||null;cache.list.chosen=cache.chosen;save();render();void loadSelection().catch(ex=>status('Recipe check failed: '+ex.message,true));});
 $('lp-route')?.addEventListener('change',e=>{cache.route=e.target.value==='craft'?'craft':'practical';render();void loadSelection();});
 $('lp-add').addEventListener('click',()=>{if(!cache.chosen||cache.list.goals.includes(cache.chosen))return;cache.list.goals.push(cache.chosen);save();renderCatalog();render();});
 $('lp-add-custom').addEventListener('click',async()=>{const id=n($('lp-custom-id').value),count=n($('lp-custom-count').value);if(!cache.chosen||!id||!count||count>100000){status('Enter a valid ingredient ID and quantity, then choose a legendary.',true);return;}
   try{const rows=await batches([id]);if(!rows.length||rows[0]?.id!==id)throw Error('Unrecognised item');
    const obj=cache.list.custom[String(cache.chosen)]||[];const prev=obj.find(x=>x.id===id);if(prev)prev.count=Math.min(999999,prev.count+count);else obj.push({id,count,name:rows[0].name});cache.list.custom[String(cache.chosen)]=obj;ITEMS[id]=rows[0].name;save();$('lp-custom-id').value='';$('lp-custom-count').value='1';await updatePrices();render();status('Custom ingredient added for this goal only.');
   }catch(e){status('Could not verify item ID: '+e.message,true);}
 });
 $('lp-export').addEventListener('click',()=>{
  try{const safe={version:1,account:cache.account,exportedAt:new Date().toISOString(),goals:cache.list.goals,chosen:cache.chosen,checked:cache.list.checked,custom:cache.list.custom};
    const data=new Blob([JSON.stringify(safe,null,2)],{type:'application/json'});const url=URL.createObjectURL(data);const a=document.createElement('a');a.href=url;a.download='Golden_Peanut_Legendary_Goals_'+new Date().toISOString().slice(0,10)+'.json';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);status('Planner goals export prepared. Check your Downloads folder. No API key is included.');
  }catch(e){status('Could not export goal backup: '+e.message,true);}
 });
 $('lp-import').addEventListener('change',async ev=>{const file=ev.target.files?.[0];if(!file)return;try{
   if(file.size>1024*1024)throw Error('File too large');const obj=JSON.parse(await file.text());
   if(obj.version!==1||!Array.isArray(obj.goals)||!obj.checked||!obj.custom)throw Error('Not a recognised Legendary Planner backup');
   if(obj.account&&obj.account!==cache.account)throw Error('Backup belongs to another GW2 account');
   const goodGoals=obj.goals.filter(x=>Number.isInteger(x)&&x>0).slice(0,80);
   const safeChecked={};for(const [k,v]of Object.entries(obj.checked).slice(0,2000))if(/^\d+:[a-z0-9-]+$/i.test(k)&&typeof v==='boolean')safeChecked[k]=v;
   const safeCustom={};for(const [k,arr]of Object.entries(obj.custom).slice(0,100))if(/^\d+$/.test(k)&&Array.isArray(arr))safeCustom[k]=arr.filter(x=>Number.isInteger(x.id)&&x.id>0&&Number.isInteger(x.count)&&x.count>0&&x.count<=999999).slice(0,100).map(x=>({id:x.id,count:x.count,name:String(x.name||'').slice(0,100)}));
   cache.list={goals:goodGoals,chosen:n(obj.chosen)||goodGoals[0]||null,checked:safeChecked,custom:safeCustom};cache.chosen=cache.list.chosen;save();render();status('Planner goals imported for '+cache.account+'. No trading history or API settings changed.');
  }catch(e){status('Planner import rejected: '+e.message,true);}finally{ev.target.value='';}
 });
 $('lp-copy').disabled=true;
}
root.GPLegendaryPlanner={init,refresh,derive,guideFor,ensureBook,loadSelection,cache,constants:{GEN1,ITEMS}};
if(typeof module!=='undefined'&&module.exports)module.exports=root.GPLegendaryPlanner;
if(typeof document!=='undefined')document.addEventListener('DOMContentLoaded',init,{once:true});
})(typeof globalThis!=='undefined'?globalThis:this);
