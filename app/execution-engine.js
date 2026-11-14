/* Golden Peanut 7.16: prospective, joint buy -> resale 24h empirical baseline.
 * Personal observations stay in account-scoped IndexedDB. No order mutations.
 * No global turnover inference. A censored window is NEVER a zero or a fill.
 */
(function(root){'use strict';
const DAY=86400000, MINUTE=60000, VERSION='7.16.0-evidence', MIN_SAMPLES=8;
const integer=(v,min=0)=>Number.isSafeInteger(v)&&v>=min;
const mean=a=>a.reduce((s,x)=>s+x,0)/a.length;
const quantile=(a,p)=>[...a].sort((x,y)=>x-y)[Math.floor((a.length-1)*p)];
const net=(p,q)=>q*p-Math.ceil(q*p*.05)-Math.ceil(q*p*.10);
const fee=(p,q)=>Math.ceil(p*q*.05);
const RESEARCH='Research — insufficient execution evidence';
function validSample(s){return s?.status==='complete'&&integer(s.item,1)&&integer(s.offered,1)&&s.offered<=250&&
 integer(s.acquired)&&integer(s.sold)&&integer(s.listed)&&s.sold<=s.listed&&s.listed<=s.acquired&&s.acquired<=s.offered&&
 integer(s.buy,1)&&integer(s.exit,1)&&Number.isFinite(s.start)&&s.end===s.start+DAY&&
 Number.isFinite(s.knownAt)&&s.knownAt>=s.end&&Number.isFinite(s.profit)&&s.source==='verified-personal-window';}
function holdings(snapshot,id){
 return Number(snapshot?.holdings?.[id]||0)+(snapshot?.sells||[]).filter(x=>x.item===id).reduce((n,x)=>n+x.q,0)+
  (snapshot?.delivery?.items||[]).filter(x=>x.id===id).reduce((n,x)=>n+x.count,0);
}
/* Observe ALL eligible newly seen orders, not merely model-selected winners.
 * Restrict attribution to a clean item position: no initial stock/other orders.
 * Orders first seen late remain in the legacy exposure ledger, not this cohort.
 * A market cohort cannot overlap another cohort for the same item.
 */
function observe(previous,snapshot,ledger=[],quotes=[],{now=Date.now(),historyAt=0}={}){
 const state=structuredClone(previous?.version===1?previous:{version:1,cohorts:[],samples:[],seen:{}});
 const at=Date.parse(snapshot?.at);
 if(!Number.isFinite(at)||now-at>15*MINUTE||at>now||snapshot?.buysVerified!==true||snapshot?.sellsVerified!==true||
    snapshot?.inventoryVerified!==true||historyAt<at){state.notice='Learning needs fresh complete orders, inventory and completed-history checks';return state;}
 const quoteMap=new Map(quotes.map(r=>{const q=r.latest||r;return [q.id,q];}));
 const buys=snapshot.buys||[],sells=snapshot.sells||[];
 const tradeRows=ledger.filter(r=>integer(r.item,1)&&integer(r.q,1)&&integer(r.price,1)&&Number.isFinite(r.purchased)&&r.purchased<=historyAt);
 const tradesByItem=new Map();for(const row of tradeRows){if(!tradesByItem.has(row.item))tradesByItem.set(row.item,[]);tradesByItem.get(row.item).push(row);}
 for(const c of state.cohorts){
  if(c.status!=='pending'||at<c.start)continue;
  const itemTrades=tradesByItem.get(c.item)||[];
  const all=itemTrades.filter(r=>r.purchased>c.start&&r.purchased<=Math.min(at,c.end));
  const acquired=all.filter(r=>r.side==='buy'&&r.id===c.order&&r.price===c.buy);
  const sales=all.filter(r=>r.side==='sell');
  const aq=acquired.reduce((n,r)=>n+r.q,0),sq=sales.reduce((n,r)=>n+r.q,0);
  const open=buys.find(o=>o.id===c.order);
  const otherBuys=all.some(r=>r.side==='buy'&&r.id!==c.order)||buys.some(o=>o.item===c.item&&o.id!==c.order);
  const prefill=itemTrades.some(r=>r.side==='buy'&&r.id===c.order&&r.purchased<=c.start);
  const badSale=sales.some(s=>!acquired.some(b=>b.purchased<=s.created));
  const liveSales=sells.filter(o=>o.item===c.item);
  const lostSale=(c.lastSales||[]).some(o=>!liveSales.some(x=>x.id===o.id&&x.price===o.price)&&
   !sales.some(x=>x.id===o.id&&x.price===o.price&&x.q>=o.q));
  c.lastSales=liveSales.map(o=>({id:o.id,q:o.q,price:o.price}));
  if(lostSale){c.status='censored';c.reason='Resale listing disappeared: possible cancellation or relisting fee';c.knownAt=now;continue;}
  if(otherBuys||prefill||aq>c.offered||sq>aq||badSale||(open&&(open.price!==c.buy||open.q>c.offered))){
   c.status='censored';c.reason='Position changed or transaction attribution is ambiguous';c.knownAt=now;continue;
  }
  // Conservation check catches untracked stock, withdrawals/consumption, or stale history.
  if(at<c.end&&holdings(snapshot,c.item)!==aq-sq){c.status='censored';c.reason='Inventory/history cannot be reconciled';c.knownAt=now;continue;}
  if(at<c.end)continue;
  // End inventory/order quantities cannot be projected backwards across a late check.
  // Timestamped complete buy and sale histories alone can prove an early full round.
  if(at-c.end>15*MINUTE&&!(aq===c.offered&&sq===aq)){
   c.status='censored';c.reason='No verified observation near the 24-hour boundary';c.knownAt=now;continue;
  }
  if((!open&&aq!==c.offered)||(open&&open.q+aq!==c.offered)){
   c.status='censored';c.reason='Disappeared or changed order: cancellation versus fill unknown';c.knownAt=now;continue;
  }
  const listed=sq+sells.filter(o=>o.item===c.item&&o.created>=c.start&&o.created<=c.end).reduce((n,o)=>n+o.q,0);
  if(listed>aq||(!(aq===c.offered&&sq===aq)&&holdings(snapshot,c.item)!==aq-sq)){
   c.status='censored';c.reason='Incomplete inventory or resale attribution';c.knownAt=now;continue;
  }
  const unsoldListings=sells.filter(o=>o.item===c.item&&o.created>=c.start&&o.created<=c.end);
  const profit=sales.reduce((n,s)=>n+net(s.price,s.q)-s.q*c.buy,0)-unsoldListings.reduce((n,s)=>n+fee(s.price,s.q),0);
  Object.assign(c,{status:'complete',knownAt:now,acquired:aq,sold:sq,listed,profit,source:'verified-personal-window'});
  if(validSample(c))state.samples.push({...c});
 }
 for(const o of buys){
  if(state.seen[o.id])continue;state.seen[o.id]=at;
  const q=quoteMap.get(o.item),qt=Date.parse(q?.at);
  const comparable=integer(o.q,1)&&o.q<=250&&integer(o.price,1)&&Number.isFinite(o.created)&&
   at-o.created>=0&&at-o.created<=15*MINUTE&&holdings(snapshot,o.item)===0&&
   buys.filter(x=>x.item===o.item).length===1&&!state.cohorts.some(c=>c.item===o.item&&c.end>at)&&
   Number.isFinite(qt)&&at-qt>=-15*MINUTE&&at-qt<=15*MINUTE&&integer(q.sell,1)&&q.sell>o.price&&(o.price===q.buy||o.price===q.buy+1);
  // Record skipped starts too: learning coverage must not masquerade as complete observation.
  if(!comparable){state.skipped=(state.skipped||0)+1;continue;}
  state.cohorts.push({item:o.item,order:o.id,start:at,end:at+DAY,offered:o.q,buy:o.price,exit:q.sell,
   category:q.category||'Unknown',status:'pending',ageAtStart:at-o.created});
 }
 state.at=now;state.notice='Prospective 24-hour clean-position cohorts; unknown/cancelled windows remain censored';
 return state;
}
function comparable(samples,item,quantity,buy,exit,now){
 // Resolve overlaps deterministically; one market's concurrent lots are not independent samples.
 const seen=new Set();let lastEnd=-Infinity;
 return samples.filter(s=>validSample(s)&&s.item===item&&s.offered===quantity&&s.knownAt<=now&&
  s.end<=now&&now-s.end<=90*DAY&&Math.abs(s.buy/buy-1)<=.15&&Math.abs(s.exit/exit-1)<=.15)
  .sort((a,b)=>a.start-b.start||a.order-b.order).filter(s=>{const key=s.order+':'+s.start;
   if(seen.has(key)||s.start<lastEnd)return false;seen.add(key);lastEnd=s.end;return true;});
}
const outcomeKey=s=>s.order+':'+s.start;
const outcomeSignature=s=>JSON.stringify([s.item,s.offered,s.buy,s.exit,s.end,s.status,s.acquired,s.sold,s.listed,s.profit]);
function conflictingKeys(samples){
 const signatures=new Map(),conflicts=new Set();
 for(const s of samples){const key=outcomeKey(s),sig=outcomeSignature(s);
  if(signatures.has(key)&&signatures.get(key)!==sig)conflicts.add(key);else signatures.set(key,sig);
 }return conflicts;
}
function forecast({samples=[],cohorts=[],item,quantity,buy,exit,now=Date.now(),stable=false}={}){
 const research=reason=>({status:'research',reason,expectedProfit:null,item,quantity});
 if(!integer(item,1)||!integer(quantity,1)||quantity>250||!integer(buy,1)||!integer(exit,1)||exit<=buy)return research('Invalid price or size');
 if(!stable)return research('Insufficient stable public price history');
 const known=samples.filter(s=>validSample(s)&&s.item===item&&s.knownAt<=now&&s.end<=now&&now-s.end<=90*DAY);
 if(conflictingKeys(known).size)return research('Conflicting duplicate execution outcomes require reconciliation');
 const rows=comparable(samples,item,quantity,buy,exit,now);
 // Excluding censored outcomes creates survivor bias. With this simple baseline,
 // any comparable unresolved window prevents promotion; no fitted censor weights.
 const censored=cohorts.filter(s=>s.item===item&&s.offered===quantity&&s.start+DAY<=now&&now-s.start<=90*DAY&&
  s.status!=='complete'&&Math.abs(s.buy/buy-1)<=.15&&Math.abs(s.exit/exit-1)<=.15);
 if(censored.length)return research(censored.length+' censored/unresolved comparable windows');
 if(rows.length<MIN_SAMPLES||new Set(rows.map(s=>Math.floor(s.start/DAY))).size<5)return research(RESEARCH);
 if(now-rows.at(-1).end>14*DAY)return research('Execution evidence is too old');
 const profits=rows.map(s=>net(exit,s.sold)-buy*s.sold-fee(exit,s.listed-s.sold));
 const expectedProfit=mean(profits),acquired=mean(rows.map(s=>s.acquired)),sold=mean(rows.map(s=>s.sold));
 return {status:'estimated',item,quantity,buy,exit,expectedProfit,expectedAcquired:acquired,expectedSold:sold,
  buyProbability:mean(rows.map(s=>Number(s.acquired>0))),saleProbability:mean(rows.map(s=>Number(s.sold>0))),
  acquisitionCompletionProbability:mean(rows.map(s=>Number(s.acquired===quantity))),
  roundProbability:mean(rows.map(s=>Number(s.sold===quantity))),maximumMarketCapacity:null,
  resaleFraction:acquired?sold/acquired:0,expectedCapitalAt24:(quantity-sold)*buy,
  acquisitionCost:quantity*buy,cost:quantity*buy+fee(exit,quantity),feeReserve:fee(exit,quantity),
  sampleCount:rows.length,zeroFillWindows:rows.filter(s=>s.acquired===0).length,
  historicalRange:[quantile(profits,.1),quantile(profits,.9)],worstCaseLoss:quantity*buy+fee(exit,quantity),
  model:'empirical-joint-24h-v1',calibrated:false,
  maintenancePolicy:'observed-practice',competitiveCapacityKnown:false,
  limitation:'Historical comparable outcomes under observed trading practice, including zero fills; not capacity under maintained competitive bids. Full-round probability means all proposed units were resold. Range is empirical, not a calibrated prediction interval. No capital recycling assumed.'};
}
function validateRecommendation(o){
 return o?.status==='estimated'&&integer(o.id||o.item,1)&&integer(o.quantity,1)&&o.quantity<=250&&
 integer(o.buy,1)&&integer(o.exit,1)&&Number.isFinite(o.expectedProfit)&&o.expectedProfit>0&&
 Number.isFinite(o.expectedAcquired)&&Number.isFinite(o.expectedSold)&&o.expectedSold>0&&o.expectedSold<=o.expectedAcquired&&
 o.expectedAcquired<=o.quantity&&o.expectedProfit<=Math.max(0,net(o.exit,o.quantity)-o.buy*o.quantity)&&
 // Even before rounding and unsold listing fees, income cannot exceed the
 // margin on expected COMPLETED sales. Full-lot spread is not expected income.
 o.expectedProfit<=Math.max(0,(o.exit*85-o.buy*100)/100*o.expectedSold)+1e-8&&
 integer(o.cost,1)&&o.cost===o.quantity*o.buy+fee(o.exit,o.quantity)&&integer(o.sampleCount,MIN_SAMPLES);
}
function allocate(candidates,wallet){
 if(!integer(wallet))return {orders:[],spent:0,expectedProfit:null,reason:'Wallet unverified'};
 let remaining=wallet;const orders=[],used=new Set();
 // Greedy absolute-profit allocation with re-evaluation of affordable exact observed lot sizes.
 // Deliberately no fractional/upsized orders or hypothetical recycling of sale proceeds.
 while(true){const best=candidates.filter(o=>validateRecommendation(o)&&o.cost<=remaining&&!used.has(o.id||o.item))
   .sort((a,b)=>b.expectedProfit-a.expectedProfit||a.cost-b.cost||(a.id||a.item)-(b.id||b.item))[0];
  if(!best)break;orders.push({...best});used.add(best.id||best.item);remaining-=best.cost;
 }
 orders.sort((a,b)=>b.expectedProfit-a.expectedProfit||a.id-b.id);
 return {orders,spent:wallet-remaining,unallocated:remaining,expectedProfit:orders.length?orders.reduce((n,o)=>n+o.expectedProfit,0):null,
  method:'Greedy expected absolute 24h profit under one shared wallet; not a global optimality claim'};
}
function plan({learning={},quotes=[],snapshot,metadata={},now=Date.now(),stability=()=>false}={}){
 const research=[],candidates=[],qt=new Map();
 for(const r of quotes){const q=r.latest||r;qt.set(q.id,q);}
 const walletAt=Date.parse(snapshot?.walletAt),accountAt=Date.parse(snapshot?.at);
 const accountFresh=snapshot?.buysVerified===true&&snapshot?.sellsVerified===true&&snapshot?.inventoryVerified===true&&
  accountAt<=now&&now-accountAt<=15*MINUTE&&walletAt<=now&&now-walletAt<=15*MINUTE;
 for(const [id,q]of qt){
  const at=Date.parse(q.at),buy=q.buy+1,exit=q.sell-1;
  const reject=reason=>research.push({id,item:id,status:'research',reason,expectedProfit:null});
  if(!accountFresh){reject('Fresh wallet, orders and inventory required');continue;}
  if(q.source!=='ArenaNet /v2/commerce/prices'||!Number.isFinite(at)||at>now||now-at>15*MINUTE||!integer(buy,1)||!integer(exit,1)||exit<=buy){reject('Fresh valid public quote required');continue;}
  if(!metadata[id]?.name){reject('Missing item metadata');continue;}
  if(holdings(snapshot,id)>0||(snapshot.buys||[]).some(o=>o.item===id)){reject('Existing position: keep its capital and resale capacity separate');continue;}
  const sizes=[...new Set((learning.samples||[]).filter(s=>s.item===id&&s.knownAt<=now).map(s=>s.offered))];
  if(!sizes.length){reject(RESEARCH);continue;}
  for(const quantity of sizes){const f=forecast({samples:learning.samples,cohorts:learning.cohorts,item:id,quantity,buy,exit,now,stable:stability(id)});
   if(f.status!=='estimated'||f.expectedProfit<=0){reject(f.reason||'Nonpositive expected profit');continue;}
   candidates.push({...f,id,itemName:metadata[id].name,asOf:q.at,kind:'funded',bid:buy,
    scenarioProfit:net(exit,quantity)-buy*quantity,nightProfit:f.expectedProfit,overnightProfit:f.expectedProfit,
    nightUnits:f.expectedSold,overnightUnits:f.expectedSold,rankValue:f.expectedProfit,cap:quantity,
    weeklyScenario:0,tier:'observed',confidence:'Observed 24h cohorts',evidence:f.limitation});
  }
 }
 const portfolio=allocate(candidates,accountFresh?snapshot.wallet:null);
 return {...portfolio,research,candidates,model:'empirical-joint-24h-v1',at:now};
}
function ranked(plan){
 const rows=(plan?.orders||[]).filter(validateRecommendation).map(o=>({...o,kind:plan.source==='hypothetical'?'hypothetical':'funded',
  bid:o.buy,overnightProfit:o.expectedProfit,overnightUnits:o.expectedSold,rankWeekly:0})).sort((a,b)=>b.expectedProfit-a.expectedProfit||a.id-b.id);
 const spent=rows.reduce((n,o)=>n+o.cost,0);
 if(!integer(plan?.budget)||spent>plan.budget||new Set(rows.map(o=>o.id||o.item)).size!==rows.length)return {rows:[],allRows:[],overnightPortfolioScenario:null};
 return {rows,allRows:rows,actualBookWeekly:null,newWeekly:null,combinedWeekly:null,verifiedStanding:0,
  unknownStanding:plan?.activeBook?.entries?.length||0,overnightPortfolioScenario:rows.length?rows.reduce((n,o)=>n+o.expectedProfit,0):null,
  isCalibrated:false,explanation:RESEARCH};
}
/* Expanding walk-forward: outcomes must be KNOWN before the held-out start.
 * Evaluate all captured windows, not only recommended winners. No live accuracy
 * claim follows from fixture tests. Do not automatically promote complex models.
 */
function backtest(learning,now=Date.now()){
 const raw=(learning.samples||[]).filter(s=>validSample(s)&&s.knownAt<=now),conflicts=conflictingKeys(raw);
 const unique=new Map();for(const s of raw){const key=outcomeKey(s),old=unique.get(key);
  if(!conflicts.has(key)&&(!old||s.knownAt<old.knownAt))unique.set(key,s);
 }
 const complete=[...unique.values()].sort((a,b)=>a.start-b.start),tests=[];
 for(const s of complete){const prior=raw.filter(p=>p.knownAt<s.start);
  const f=forecast({samples:prior,cohorts:(learning.cohorts||[]).filter(c=>c.knownAt<s.start),item:s.item,quantity:s.offered,buy:s.buy,exit:s.exit,now:s.start,stable:true});
  if(f.status!=='estimated')continue;
  const train=comparable(prior,s.item,s.offered,s.buy,s.exit,s.start),last=train.at(-1);
  tests.push({item:s.item,category:s.category,start:s.start,knownAt:s.knownAt,sampleCount:f.sampleCount,
   profit:{predicted:f.expectedProfit,actual:s.profit,baseline:last.profit,zeroBaseline:0},
   acquired:{predicted:f.expectedAcquired,actual:s.acquired,baseline:last.acquired},
   sold:{predicted:f.expectedSold,actual:s.sold,baseline:last.sold},
   buyProbability:f.buyProbability,bought:s.acquired>0,range:f.historicalRange});
 }
 const metrics=rows=>({n:rows.length,profitMAE:rows.length?mean(rows.map(t=>Math.abs(t.profit.predicted-t.profit.actual))):null,
  persistenceMAE:rows.length?mean(rows.map(t=>Math.abs(t.profit.baseline-t.profit.actual))):null,
  zeroMAE:rows.length?mean(rows.map(t=>Math.abs(t.profit.actual))):null,
  acquiredMAE:rows.length?mean(rows.map(t=>Math.abs(t.acquired.predicted-t.acquired.actual))):null,
  soldMAE:rows.length?mean(rows.map(t=>Math.abs(t.sold.predicted-t.sold.actual))):null,
  brier:rows.length?mean(rows.map(t=>(t.buyProbability-Number(t.bought))**2)):null,
  empiricalRangeCoverage:rows.length?mean(rows.map(t=>Number(t.profit.actual>=t.range[0]&&t.profit.actual<=t.range[1]))):null});
 const grouped=key=>Object.fromEntries([...new Set(tests.map(t=>t[key]))].map(k=>[k,metrics(tests.filter(t=>t[key]===k))]));
 return {model:'empirical-joint-24h-v1',...metrics(tests),tests,byItem:grouped('item'),byCategory:grouped('category'),
  completeWindows:complete.length,conflictingWindows:conflicts.size,
  censoredWindows:new Set((learning.cohorts||[]).filter(c=>c.status==='censored'&&c.knownAt<=now).map(outcomeKey)).size,
  skippedStarts:learning.skipped||0,promotionAllowed:false,
  limitation:'Observed user-selected markets only; no counterfactual accuracy on markets never traded. No automatic model promotion.'};
}
function mergeLearning(local,backup){
 const entries=new Map();
 for(const c of [...(backup?.cohorts||[]),...(backup?.samples||[]),...(local?.cohorts||[]),...(local?.samples||[])]){
  if(!integer(c?.order,1)||!integer(c.item,1)||!Number.isFinite(c.start))continue;
  const key=c.order+':'+c.start,prev=entries.get(key);
  if(prev&&(c.knownAt||c.start)===(prev.knownAt||prev.start)&&outcomeSignature(c)!==outcomeSignature(prev)){
   entries.set(key,{...prev,status:'censored',reason:'Conflicting same-version backup outcomes; reconciliation required'});continue;
  }
  if(!prev||(c.knownAt||c.start)>(prev.knownAt||prev.start))entries.set(key,structuredClone(c));
 }
 const cohorts=[...entries.values()].sort((a,b)=>a.start-b.start);
 return {version:1,cohorts,samples:cohorts.filter(validSample),seen:{...(backup?.seen||{}),...(local?.seen||{})},
  skipped:Math.max(local?.skipped||0,backup?.skipped||0),at:Math.max(local?.at||0,backup?.at||0)};
}
async function update(state,historyAt){
 if(!state?.db||!state.account)return;
 const account=state.account,snapshot=state.snapshot;
 const prior=(await state.db.get('config',account,'execution-learning-v1'))?.value;
 const ids=[...new Set((snapshot?.buys||[]).map(x=>x.item))];
 let quotes=await state.db.getMany('market','global',ids.map(id=>'quote:'+id));
 const missing=ids.filter(id=>!quotes.some(r=>(r?.latest||r)?.id===id&&Date.now()-Date.parse((r.latest||r).at)<15*MINUTE));
 if(missing.length&&state.api?.pricesForIds){const fresh=await state.api.pricesForIds(missing);await state.db.upsertMarketBatch(fresh);quotes=[...quotes.filter(Boolean),...fresh];}

 await root.GPCompetitive?.update?.(state,quotes.filter(Boolean));
 const learning=observe(prior,snapshot,state.ledger,quotes.filter(Boolean),{historyAt});
 if(state.account!==account||state.snapshot!==snapshot)return;
 await state.db.put('config',account,'execution-learning-v1',learning);state.executionLearning=learning;
 state.executionBacktest=backtest(learning);
}
root.GPExecution={buildId:VERSION,RESEARCH,mergeLearning,observe,forecast,allocate,plan,ranked,backtest,validSample,validateRecommendation,holdings,update,net};
if(typeof module!=='undefined'&&module.exports)module.exports=root.GPExecution;
})(typeof globalThis!=='undefined'?globalThis:this);
