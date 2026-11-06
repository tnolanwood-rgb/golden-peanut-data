/* Golden Peanut 7.16: one evidence-labelled decision board.
 * This is a PRESENTATION adapter, not an invented execution model.
 * Prospective calibrated forecasts, personal historical conditional returns,
 * existing standing positions, and new public-market research remain distinct.
 */
(function(root){'use strict';
const MINUTE=60000;
const whole=(x,min=0)=>Number.isSafeInteger(x)&&x>=min;
const finite=x=>Number.isFinite(x);
const net=(unit,qty)=>{let left=qty,total=0;while(left>0){const n=Math.min(250,left),v=unit*n;total+=v-Math.ceil(v*.05)-Math.ceil(v*.10);left-=n;}return total;};
const when=x=>{const t=Date.parse(x);return Number.isFinite(t)?t:NaN;};
const fresh=(x,now)=>finite(when(x))&&when(x)<=now+30000&&now-when(x)<=30*MINUTE;
const souvenir=/\b(?:infusion|music box|miniature|mini |ticket|tonic|skin|recipe:|toy-|envelope)\b/i;
function equipmentKind(name,type,rarity){
 if(rarity!=='Exotic')return null;
 if(type==='Armor')return 'armor';
 if(type==='Weapon'&&/\bPearl\b/i.test(name))return 'pearl';
 return null;
}
const studyScore=x=>x.unitMargin*Math.sqrt(Math.min(80,x.buyQty,x.sellQty)/10)/
 Math.pow(1+x.buy/10000,.85);
function diverseEquipment(rows,max=150){
 // Preserve cheap price bands and stat diversity instead of repeatedly
 // showing the largest one-unit gross spread from a single stat family.
 const groups=new Map();
 for(const x of rows){
  const b=x.buy<10000?'under1g':x.buy<30000?'1to3g':x.buy<60000?'3to6g':'6to10g';
  const prefix=x.name.split(/\s+/)[0].toLowerCase();
  const key=b+'|'+prefix,a=groups.get(key)||[];
  a.push(x);groups.set(key,a);
 }
 const order=['under1g','1to3g','3to6g','6to10g'];
 const buckets=[...groups].map(([key,arr])=>({key,arr:arr.sort((a,b)=>studyScore(b)-studyScore(a)||a.id-b.id),index:0}))
  .sort((a,b)=>order.indexOf(a.key.split('|')[0])-order.indexOf(b.key.split('|')[0])||a.key.localeCompare(b.key));
 const out=[];let progressed=true;
 while(progressed&&out.length<max){
  progressed=false;
  for(const b of buckets){if(b.index>=b.arr.length)continue;
   out.push(b.arr[b.index++]);progressed=true;if(out.length>=max)break;}
 }
 return out;
}
function build(plan,{wallet=null,now=Date.now(),metadata={}}={}){
 const empty={ready:false,forecast:[],standing:[],history:[],newMarkets:[],counts:{forecast:0,standing:0,history:0,newMarkets:0,scanned:0,catalogue:0},disclaimer:'No verified market plan available'};
 if(!plan?.ok)return empty;
 const available=whole(wallet)?wallet:(whole(plan.budget)?plan.budget:0);
 const forecast=(root.GPExecution?.ranked?.(plan)?.rows||[]).filter(o=>finite(o.expectedProfit)&&o.expectedProfit>0&&whole(o.quantity,1)&&whole(o.cost,1)&&o.cost<=available)
  .map(o=>({...o,tier:'calibrated-24h',kind:'funded'}))
  .sort((a,b)=>b.expectedProfit-a.expectedProfit||a.id-b.id);
 const standing=(plan.activeBook?.entries||[]).filter(o=>whole(o.id,1)&&whole(o.scenarioUnits,1)&&finite(o.conditionalWeek)&&o.conditionalWeek>0)
  .map(o=>({id:o.id,kind:'standing',tier:'current-position',quantity:o.scenarioUnits,openUnits:o.units,
    capital:o.capital,conditionalWeek:o.conditionalWeek,nightUnits:Math.max(0,o.nightReferenceUnits||0),
    ageDays:o.ageDays,buyWeeks:o.historicalBuyWeeks||0,sellWeeks:o.historicalSellWeeks||0}))
  .sort((a,b)=>b.conditionalWeek-a.conditionalWeek||a.id-b.id);
 const activeIds=new Set(standing.map(x=>x.id));
 const forecastIds=new Set(forecast.map(x=>x.id||x.item));
 const history=[];
 for(const o of plan.marketChoices||[]){
  const id=o.id,quantity=Math.floor(Math.min(o.quantity||0,o.cap||o.quantity||0,o.conservativeOrderCap||o.quantity||0));
  if(!whole(id,1)||activeIds.has(id)||forecastIds.has(id)||!whole(quantity,1)||!whole(o.buy,1)||!whole(o.exit,1)||o.exit<=o.buy||!fresh(o.at||o.asOf,now))continue;
  if(!o.repeatEvidence&&!(o.buyWeeks>=2&&o.sellWeeks>=2))continue;
  if(o.openBuys>0)continue; // already committed; never present as a NEW spend
  const profit=net(o.exit,quantity)-o.buy*quantity;
  if(!finite(profit)||profit<=0)continue;
  const nightUnits=whole(o.nightUnits)?Math.min(quantity,o.nightUnits):0;
  const nightProfit=nightUnits?Math.max(0,net(o.exit,nightUnits)-o.buy*nightUnits):0;
  const cost=quantity*o.buy;
  history.push({id,name:o.itemName||'',kind:'history',tier:nightUnits?'observed-night-conditional':'historical-conditional',
   buy:o.buy,exit:o.exit,quantity,cost,capitalStatus:cost<=available?'wallet-covers-lot':'needs-capital',
   scenarioProfit:profit,nightUnits,nightProfit,buyWeeks:o.buyWeeks||0,sellWeeks:o.sellWeeks||0,
   observed24Reference:o.observed24Reference||0,observedNightBuys:o.observedNightBuys||0,
   sampleCount:o.sampleCount||0,ageDays:o.ageDays,at:o.asOf||o.at,
   repeatEvidence:true,evidence:'Your completed purchases and sales; current quoted margin. Quantity is a historical trial bound, not a predicted fill.'});
 }
 // Evidence-backed overnight reference > historical conditional single round.
 // Within either group, rank by actual conditional net gold, not percentage ROI.
 history.sort((a,b)=>Number(b.nightUnits>0)-Number(a.nightUnits>0)||
   (a.nightUnits>0?b.nightProfit-a.nightProfit:b.scenarioProfit-a.scenarioProfit)||
   b.scenarioProfit-a.scenarioProfit||a.id-b.id);
 const historyIds=new Set(history.map(x=>x.id));
 const newMarkets=[];
 for(const c of plan.publicResearch||[]){
  const id=c.id,name=String(c.name||''),meta=metadata?.[id]||{};
  if(!whole(id,1)||!name||activeIds.has(id)||historyIds.has(id)||forecastIds.has(id)||!fresh(c.at,now)||c.openBuys>0)continue;
  const type=c.type||meta.type||'',rarity=c.rarity||meta.rarity||'',subtype=c.subtype||meta.details?.type||'';
  // A collection unlock such as Jormag's Claw Fragment is NOT an
  // overnight turnover market just because its lowest ask is far above bid.
  if(type==='Consumable'&&/unlock/i.test(subtype))continue;
  if(!whole(c.buy,1)||!whole(c.exit,1)||c.buy>250000||c.exit<=c.buy||souvenir.test(name))continue;
  const margin=net(c.exit,1)-c.buy,roi=margin/c.buy;
  if(!finite(margin)||margin<50||roi<.055||roi>1.5||Number(c.sellQty||0)<2||Number(c.buyQty||0)<4)continue;
  // No requested lot size or overnight profit forecast on a public quote.
  newMarkets.push({id,name,kind:'new',tier:'public-unverified',type,rarity,subtype,equipmentKind:equipmentKind(name,type,rarity),
   buy:c.buy,exit:c.exit,unitMargin:margin,roi,observations:c.observations||1,buyQty:c.buyQty||0,sellQty:c.sellQty||0,
   affordability:c.buy<=available?'one-unit-affordable':'not-wallet-funded',at:c.at,
   craftableSupply:c.craftableSupply||null,
   evidence:'Public bid/ask margin only. No measured completed trades, resale time or overnight fill estimate.'});
 }
 const candidateRank=(a,b)=>
   Number(b.buy<=available)-Number(a.buy<=available)||
   studyScore(b)-studyScore(a)||b.unitMargin-a.unitMargin||a.id-b.id;
 newMarkets.sort(candidateRank);
 const cheapLimit=Math.min(100000,Math.max(10000,Math.floor(available)));
 const pearlLeads=diverseEquipment(newMarkets.filter(x=>x.equipmentKind==='pearl'&&x.buy<=cheapLimit));
 const armorLeads=diverseEquipment(newMarkets.filter(x=>x.equipmentKind==='armor'&&x.buy<=cheapLimit));
 const otherLeads=newMarkets.filter(x=>!x.equipmentKind&&x.buy<=cheapLimit&&
   x.buy<=Math.max(1,available)*.65).sort(candidateRank);
 const historyEquipment=history.filter(x=>{
  const meta=metadata?.[x.id]||{};
  return equipmentKind(x.name||meta.name||'',meta.type||'',meta.rarity||'');
 });
 const uniq=a=>{const seen=new Set();return a.filter(x=>{if(seen.has(x.id))return false;seen.add(x.id);return true;});};
 const categories={forecast:uniq(forecast),standing:uniq(standing),history:uniq(history),
  historyEquipment:uniq(historyEquipment),pearlLeads:uniq(pearlLeads),armorLeads:uniq(armorLeads),
  otherLeads:uniq(otherLeads),newMarkets:uniq(newMarkets)};
 const counts={...Object.fromEntries(Object.entries(categories).map(([k,v])=>[k,v.length])),
  scanned:plan.candidateRefresh?.checked||0,catalogue:plan.publicCatalogue?.items||0,
  affordableExoticSeeds:plan.candidateRefresh?.affordableExoticSeeds||0,
  broadCandidates:plan.publicDiscovery?.broadMarginCandidates||0,
  rawPersonalResearch:plan.marketChoices?.length||0,rawPublicResearch:plan.publicResearch?.length||0,
  recipes:plan.craftResearch?.status?.recipesIndexed||0};
 return {ready:true,...categories,counts,available,disclaimer:'Only calibrated 24h entries are expected-profit estimates. Other figures are historical or hypothetical conditional margins. No orders are placed automatically.'};
}
root.GPMarketBoard={buildId:'7.16.0-evidence',build};
if(typeof module!=='undefined'&&module.exports)module.exports=root.GPMarketBoard;
})(typeof globalThis!=='undefined'?globalThis:this);
