/* Golden Peanut deployment planner
 * Conditional capital-allocation RESEARCH. Spending never exceeds its own
 * explicitly chosen hypothetical budget; existing committed orders are never
 * silently treated as cash. Public order-book depth is NOT trade volume.
 * Prospective calibrated forecasts (when any) remain separate.
 */
(function(root){'use strict';
const cperg=10000, unit=(x)=>Number.isSafeInteger(x)&&x>=0;
const feeNet=(price,qty)=>{
 if(!unit(price)||!unit(qty))return null;
 let remaining=qty,net=0;
 while(remaining>0){const n=Math.min(250,remaining),gross=n*price;
  net+=gross-Math.ceil(gross*.05)-Math.ceil(gross*.10);remaining-=n;}
 return net;
};
const positive=x=>Number.isFinite(x)&&x>0;
const penny=x=>Math.max(0,Math.floor(x||0));
const value=x=>Math.max(0,Math.floor(x||0));
const fmtStatus=(row)=>row.research?'Personally completed buys + sales; active-week pace ONLY':
 'Public quote only, no personally measured fill rate';
function family(name){
 const m=/^([^ ]+(?:'s)?)\s+(Pearl|Exalted|Emblazoned|Draconic|Warbeast|Antique|Scallywag)\b/i.exec(name||'');
 return m?m[2].toLowerCase():/(?:log|ore|leather|cloth|jute|agony infusion)/i.test(name||'')?'materials':'other';
}
function caps(c){
 const evidenced=Math.floor(Math.min(Number(c.buyWeek25||0),Number(c.sellWeek25||0)));
 const cap=penny(c.researchCap||c.historicalWeeklyResearchCap||c.maxResearchQty||c.cap||c.quantity);
 const active=penny(c.capacityAfterPositions||cap);
 // An optional exploratory increase can be LARGER than old automatically
 // funded 24h size, but never larger than the existing historical-week research
 // ceiling or the gold already sitting in active orders.
 return {evidenced,cap:Math.min(2500,cap,active)};
}
function build(plan,{budgetGold=0,now=Date.now(),wallet=0,committed=null,maxMarkets=55,reservePercent=.05}={}){
 if(!plan?.ok)return {ok:false,reason:'Refresh trading research first'};
 if(!Number.isFinite(budgetGold)||budgetGold<0||budgetGold>50000)return {ok:false,reason:'Research gold must be 0–50,000g'};
 const budget=Math.floor(budgetGold*cperg),spendLimit=Math.floor(budget*(1-Math.max(0,Math.min(.3,reservePercent))));
 const actualWallet=unit(wallet)?wallet:0;
 const reserved=unit(committed)?committed:penny(plan.activeBook?.committed);
 const sources=[],rejected={stale:0,existing:0,margin:0,evidence:0,invalid:0};
 for(const c of plan.marketChoices||[]){
  const id=c.id,buy=c.buy,exit=c.exit,at=Date.parse(c.asOf||c.at);
  if(!unit(id)||id===0||!positive(buy)||!positive(exit)||!Number.isFinite(at)){rejected.invalid++;continue;}
  if(now-at>25*60000||at>now+30000){rejected.stale++;continue;}
  if(c.openBuys>0||c.openSells>0||c.deliveryUnits>0){rejected.existing++;continue;}
  const margin=feeNet(exit,1)-buy;
  if(!positive(margin)){rejected.margin++;continue;}
  const x=caps(c);
  if(!c.repeatEvidence||!x.evidenced||!x.cap||Math.min(c.buyWeeks||0,c.sellWeeks||0)<2){
   rejected.evidence++;continue;
  }
  sources.push({id,name:String(c.itemName||c.name||'Item #'+id),buy,exit,
   margin,lotLimit:x.cap,observedWeekUnits:x.evidenced,
   source:'historical-week',research:true,buyWeeks:c.buyWeeks||0,sellWeeks:c.sellWeeks||0,
   nightUnits:Math.min(x.cap,penny(c.nightUnits||c.earnableQty24)),group:family(c.itemName||c.name),
   recentTrade:(c.ageDays||0)<=30,raw:c});
 }
 // Unfamiliar public markets may receive at most ONE exploratory unit and do
 // NOT contribute any forecast/expected profit. Only add these if an affordable,
 // separately validated two-quote candidate and some capital remains.
 for(const c of plan.publicResearch||[]){
  const id=c.id,buy=c.buy,exit=c.exit,at=Date.parse(c.at);
  if(!unit(id)||id===0||!unit(buy)||buy<1||!unit(exit)||exit<=buy||!Number.isFinite(at)||at>now+30000||now-at>25*60000)continue;
  if(c.openBuys>0||!Number.isSafeInteger(c.observations)||c.observations<2)continue;
  if(!['Armor','Weapon','CraftingMaterial'].includes(c.type)||/infusion|tonic|miniature|skin|collection/i.test(c.name||''))continue;
  if(buy>Math.min(30000,budget*.03)||c.buyQty<4||c.sellQty<2)continue;
  const margin=feeNet(exit,1)-buy;
  if(margin<=0||margin/buy<.055||margin/buy>1.5)continue;
  if(sources.some(x=>x.id===id))continue;
  sources.push({id,name:c.name||'Item #'+id,buy,exit,margin,lotLimit:1,
   observedWeekUnits:0,source:'public-probe',research:false,nightUnits:0,group:family(c.name||''),raw:c});
 }
 // One lot per unique item, no double funding against active buy orders.
 // Work up to the item-specific observed active-week capacity but never
 // award score for stock beyond the observed pace. This stops a 50-unit order
 // winning based on the fictional idea that 50 will resell this week.
 const candidates=[];
 for(const c of sources){
  const max=Math.min(c.lotLimit,Math.floor(spendLimit/c.buy));if(max<1)continue;
  const supported=Math.min(max,c.observedWeekUnits);
  const variants=c.research?[1,2,3,4,5,8,10,15,20,30,50,75,100,150,250,500,750,1000,1500,2500,supported,max]:[1];
  const sizes=[...new Set(variants.filter(n=>unit(n)&&n>=1&&n<=max&&(!c.research||n<=Math.max(1,supported))))];
  for(const size of sizes){
   const cost=size*c.buy,round=feeNet(c.exit,size)-cost;if(round<=0)continue;
   const weekUnits=c.research?Math.min(size,c.observedWeekUnits):0;
   const weekNet=weekUnits>0?feeNet(c.exit,weekUnits)-weekUnits*c.buy:null;
   const exposureFactor=c.research?(Math.min(1,Math.min(c.buyWeeks,c.sellWeeks)/4))*(c.recentTrade?1:.75):0;
   // Score is a selection HEURISTIC, not expected profit or P(fill).
   const score=c.research?Math.max(0,weekNet)*exposureFactor/Math.pow(1+cost/200000,.32):0;
   candidates.push({...c,quantity:size,cost,conditionalRound:round,conditionalWeek:weekNet,
    evidenceWeeks:Math.min(c.buyWeeks||0,c.sellWeeks||0),
    score,opportunityPerGold:cost?score/cost:0,conditionalNight:c.nightUnits?feeNet(c.exit,Math.min(size,c.nightUnits))-c.buy*Math.min(size,c.nightUnits):null,
    researchLotSize:size});
  }
 }
 // Choose the maximum *conditional weekly throughput-adjusted profit* using
 // budget/family exposure constraints, not ROI or a huge arbitrary one-off ask.
 candidates.sort((a,b)=>b.score-a.score||b.conditionalRound-a.conditionalRound||a.id-b.id);
 let spent=0,conditionalWeek=0,conditionalNight=0,unverified=0;
 const selected=[],used=new Set(),families=new Map();
 for(const x of candidates){
  if(selected.length>=maxMarkets)break;
  if(used.has(x.id)||spent+x.cost>spendLimit)continue;
  // For one-shot unproven items, cap TOTAL probes separately at 3% of budget.
  if(!x.research&&unverified+x.cost>budget*.03)continue;
  // Diversify when enough markets exist; don't enforce a fake limit on materials.
  const cap=x.group==='materials'?budget*.65:budget*.38;
  if((families.get(x.group)||0)+x.cost>cap)continue;
  if(!x.research&&selected.filter(r=>!r.research).length>=8)continue;
  selected.push(x);used.add(x.id);spent+=x.cost;
  families.set(x.group,(families.get(x.group)||0)+x.cost);
  if(x.conditionalWeek!==null)conditionalWeek+=x.conditionalWeek;
  if(x.conditionalNight!==null)conditionalNight+=x.conditionalNight;
  if(!x.research)unverified+=x.cost;
 }
 selected.sort((a,b)=>b.score-a.score||b.conditionalRound-a.conditionalRound);
 const coverage=selected.filter(r=>r.research).length;
 const current=plan.activeBook||{};
 const existingBook={
  committed:reserved,
  coveredByCurrentQuotes:unit(current.covered)?current.covered:0,
  conditionalActiveWeek:positive(current.conditionalWeek)?current.conditionalWeek:null,
  eligible:current.eligible||0,
  unverified:current.unverified||0,
  activeItems:(current.entries||[]).length,
  reviewFlags:(plan.capitalReview?.reviews||[]).filter(r=>r.review).length,
  reviewFlaggedGold:plan.capitalReview?.releasedSelective||0
 };
 // These are deliberately TWO separate portfolios. Adding existing working
 // positions to a hypothetical cancellation/redeployment forecast would
 // double-count the same gold.
 return {ok:true,mode:'hypothetical-research',existingBook,budget,spendLimit,spent,reserve:budget-spendLimit,
  unallocated:budget-spent,actualWallet,reservedInExistingBuys:reserved,
  hypotheticalExceedsWallet:budget>actualWallet,
  qualifiedMarkets:sources.filter(x=>x.research).length,
  publicProbeMarkets:sources.filter(x=>!x.research).length,
  selectedMarkets:selected.length,observedMarketsSelected:coverage,
  conditionalWeek:coverage?conditionalWeek:null,
  conditionalNight:selected.some(x=>x.conditionalNight!==null)?conditionalNight:null,
  unsupportedCapital:budget-spent,
  sourceCoverage:rejected,
  rows:selected,
  caveat:'WHAT-IF portfolio only. Historical active-week volume and current quoted margins are conditional, NOT probabilities, guaranteed seven-day income, or capital that is already free. All outstanding buy orders retain queue priority until manually changed. Public probes contribute ZERO estimated income.'};
}
root.GPPortfolio={buildId:'7.16.0-evidence',build,feeNet};
if(typeof module!=='undefined'&&module.exports)module.exports=root.GPPortfolio;
})(typeof globalThis!=='undefined'?globalThis:this);
