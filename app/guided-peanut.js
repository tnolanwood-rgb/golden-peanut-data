/* Guided Peanut — a calm, single-screen alternative to Focus Edition.
 * Only presentation state (mode/skipped IDs) is stored here. It does not alter
 * trading evidence, wallet data, API keys, buy/sell orders or forecasts.
 */
(function(root){
'use strict';
const $=id=>document.getElementById(id);
const KEY='gp-guided-mode-v1', SKIPS='gp-guided-skips-v1';
const DAY=86400000;
let installed=false, current=null, history=[], skipped=[], priceChart=null, chartOpen=false;
let chartDays=21, chartOffset=0, fingerprint='', renderTimer=0;
const read=(k,fallback)=>{try{return localStorage.getItem(k)||fallback;}catch{return fallback;}};
const save=(k,v)=>{try{localStorage.setItem(k,v);}catch{}};
try{skipped=JSON.parse(read(SKIPS,'[]')).filter(x=>Number.isSafeInteger(x)&&x>0).slice(-100);}catch{skipped=[];}
const el=(tag,cls,txt)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(txt!==undefined)n.textContent=String(txt);return n;};
const add=(parent,...children)=>{for(const x of children)if(x)parent.append(x);return parent;};
const button=(label,fn,cls='gp-guide-button')=>{const b=el('button',cls,label);b.type='button';b.addEventListener('click',fn);return b;};
const coin=value=>{if(!Number.isFinite(value))return 'Not verified';const abs=Math.round(Math.abs(value));return (value<0?'−':'')+Math.floor(abs/10000).toLocaleString('en-GB')+'g '+String(Math.floor(abs%10000/100)).padStart(2,'0')+'s '+String(abs%100).padStart(2,'0')+'c';};
const name=(s,id)=>String(s?.meta?.[id]?.name||'Item #'+id);
const snapshot=s=>s?.snapshot?.account===s?.account?s.snapshot:null;
function board(s){
 try{if(!s?.opportunityPlan?.ok||!root.GPMarketBoard?.build)return null;
  return root.GPMarketBoard.build(s.opportunityPlan,{wallet:snapshot(s)?.wallet??null,metadata:s.meta||{}});
 }catch{return null;}
}
function ideas(s){
 const b=board(s), out=[], used=new Set();
 if(!b?.ready)return out;
 const append=(rows,tier)=>{
  for(const v of rows||[]){
   const id=Number(v.id||v.item);
   if(!Number.isSafeInteger(id)||id<=0||used.has(id))continue;
   const buy=Number(v.buy),exit=Number(v.exit),qty=Number(v.quantity),cost=Number(v.cost);
   if(!(buy>0&&exit>buy))continue;
   if(tier==='forecast'&&!(Number.isSafeInteger(qty)&&qty>0&&Number.isFinite(v.expectedProfit)&&Number.isFinite(cost)))continue;
   if(tier==='history'&&!(Number.isSafeInteger(qty)&&qty>0&&Number.isFinite(v.scenarioProfit)))continue;
   if(tier==='research'&&(v.watchOnly||v.affordability!=='one-unit-affordable'||!Number.isFinite(v.unitMargin)))continue;
   if(tier==='history'&&v.capitalStatus!=='wallet-covers-lot')continue;
   used.add(id);out.push({id,tier,buy,exit,qty:tier==='research'?null:qty,cost:tier==='research'?null:cost,
    profit:tier==='forecast'?v.expectedProfit:tier==='history'?v.scenarioProfit:v.unitMargin,
    label:name(s,id),data:v});
   if(out.length>=35)return;
  }
 };
 append(b.forecast,'forecast');
 append(b.history,'history');
 append(b.newMarkets,'research');
 return out;
}
function getCurrent(rows){
 // Skipping defers an idea; it must not remove a numbered position from the deck.
 // The full list defines the stable "1 of N" count for this review session.
 return rows.find(r=>r.id===current)||rows[0]||null;
}
function setCurrent(id){current=id;priceChart=null;chartOpen=false;chartDays=21;chartOffset=0;}
function next(){
 const rows=ideas(root.GoldenPeanutClean?.State);
 if(!rows.length){setCurrent(null);render(true);return;}
 const index=rows.findIndex(r=>r.id===current);
 if(index>=0){history.push(current);if(history.length>150)history.shift();}
 // Explicit wrap: the final card offers "Start again", not a shrinking queue.
 setCurrent(rows[(index+1)%rows.length].id);
 render(true);
}
function previous(){
 while(history.length){const id=history.pop();if(ideas(root.GoldenPeanutClean?.State).some(x=>x.id===id)){setCurrent(id);render(true);return;}}
}
function skip(){
 if(current!==null&&!skipped.includes(current)){
  skipped.push(current);skipped=skipped.slice(-100);save(SKIPS,JSON.stringify(skipped));
 }
 // Take the exact same navigation path as Next; Previous must work after Skip.
 next();
}
function returnSkipped(){
 const rows=ideas(root.GoldenPeanutClean?.State);
 while(skipped.length){
  const id=skipped.pop();
  if(rows.some(x=>x.id===id)){
   if(current!==null&&current!==id){history.push(current);if(history.length>150)history.shift();}
   save(SKIPS,JSON.stringify(skipped));
   setCurrent(id);render(true);return;
  }
 }
 save(SKIPS,'[]');render(true);
}
function guided(enabled){
 if(!installed)return;
 document.body.classList.toggle('gp-guided-active',enabled);
 $('gp-guided-root').hidden=!enabled;
 $('gp-return-guided').hidden=enabled;
 save(KEY,enabled?'guided':'advanced');
 if(enabled){render(true);window.scrollTo({top:0,behavior:'instant'});}
}
function advanced(toTrades=false){
 guided(false);
 if(toTrades)document.querySelector('[data-focus-nav="trades"]')?.click();
 window.scrollTo({top:0,behavior:'instant'});
}
function moneyMetric(title,value,detail){
 const item=el('div','gp-guide-metric');
 add(item,el('span','gp-guide-label',title),el('strong','gp-guide-number',value),el('small','gp-guide-muted',detail));
 return item;
}
function renderTop(host,s){
 const head=el('header','gp-guide-header');
 const badge=el('div','gp-guide-logo','🥜');
 const identity=el('div','gp-guide-title');
 add(identity,el('h1','', 'The Golden Peanut'),el('p','gp-guide-muted','One useful move at a time · Guild Wars 2'));
 const actions=el('div','gp-guide-head-actions');
 add(actions,button('↻ Check account',()=>$('focus-refresh')?.click(),'gp-guide-light'),button('⚙ Details',()=>advanced(false),'gp-guide-light'));
 add(head,badge,identity,actions);host.append(head);
 const snap=snapshot(s),summary=s?.summary||{},day=root.PeanutCore?.ukDay?.(Date.now());
 const actual=day&&summary.days?.[day];
 const hasLedger=Number.isFinite(summary.totalRecords)||Number.isFinite(summary.weekP100);
 const today=hasLedger?coin(Number(actual?.p100||0)/100):'Not verified';
 const grid=el('section','gp-guide-metrics');
 const value=$('focus-delivery-total')?.textContent?.trim()||coin(snap?.delivery?.coins);
 const delivery=moneyMetric('Delivery Box · combined value',value,'Coins and item sale references, not all spendable now');
 delivery.classList.add('gp-guide-delivery-summary');
 delivery.addEventListener('click',()=>advanced(false));
 add(grid,delivery,moneyMetric('Today · realised trading profit',today,'Completed, cost-matched trades only'),
  moneyMetric('Wallet · available now',coin(snap?.wallet),'Excludes coins waiting in the Delivery Box'),
  moneyMetric('Last 7 days · realised',Number.isFinite(summary.weekP100)?coin(summary.weekP100/100):'Not verified','Not projected future income'));
 host.append(grid);
 // Reuse the validated, item-specific valuation already rendered by Focus;
 // never recompute purchase cost or claim missing prices are known.
 const source=$('focus-delivery-items');
 const drawer=el('details','gp-guide-delivery-drawer');
 const summaryLine=el('summary','','Delivery Box items & sale-profit details');
 const drawerBody=el('div','gp-guide-delivery-list');
 const rows=source?.querySelectorAll('.focus-delivery-row')||[];
 if(rows.length){for(const row of rows)drawerBody.append(row.cloneNode(true));}
 else drawerBody.append(el('p','gp-guide-muted',source?.textContent?.trim()||'No verified delivery items yet.'));
 add(drawer,summaryLine,drawerBody);host.append(drawer);
 const note=el('p','gp-guide-update',snap?'Account values are from the latest verified snapshot. Tap Check account for newer values.':'Connect your GW2 account in Details to load your wallet, Delivery Box and history.');
 host.append(note);
}
function buildIdea(host,s,rows,choice){
 const section=el('section','gp-guide-idea');
 const upper=el('div','gp-guide-idea-top');
 const position=choice?rows.findIndex(r=>r.id===choice.id):-1;
 add(upper,el('span','gp-guide-label','NEXT TRADE IDEA'),el('span','gp-guide-position',position>=0?String(position+1)+' of '+rows.length:'No eligible ideas'));
 section.append(upper);
 if(!choice){
  add(section,el('h2','','Nothing reliable to recommend yet'),el('p','gp-guide-muted',rows.length&&skipped.length?'You have skipped the available ideas. Return to one when you are ready.':'The app is waiting for current account data and market evidence. It will not invent a trade to fill this card.'));
  section.append(button('↻ Refresh research',()=>$('focus-refresh')?.click(),'gp-guide-primary'));
 }else{
  const tier=choice.tier;
  const state=tier==='forecast'?'Evidence-backed 24h estimate':tier==='history'?'History-backed · conditional':'Public quote · research only';
  add(section,el('p','gp-guide-tier',state),el('h2','gp-guide-item-name',choice.label));
  const art=el('div','gp-guide-item-icon');const m=s.meta?.[choice.id];
  if(typeof m?.icon==='string'&&/^https:\/\/render\.guildwars2\.com\/file\/[a-f0-9]+\/\d+\.(png|jpe?g|webp)$/i.test(m.icon)){
   const img=el('img');img.src=m.icon;img.alt='';art.append(img);
  }else art.textContent=choice.label.slice(0,1).toUpperCase();
  section.querySelector('h2').before(art);
  const instructions=el('div','gp-guide-instructions');
  if(tier==='research'){
   add(instructions,el('p','gp-guide-instruction','Research a single unit at '+coin(choice.buy)+' buy reference.'),
    el('p','gp-guide-instruction-sub','Current sell reference: '+coin(choice.exit)+' per item.'));
  }else{
   add(instructions,el('p','gp-guide-instruction','Buy '+choice.qty.toLocaleString('en-GB')+' × '+coin(choice.buy)+' each.'),
    el('p','gp-guide-instruction-sub','Then consider selling at '+coin(choice.exit)+' each.'));
  }
  section.append(instructions);
  const totals=el('div','gp-guide-totals');
  add(totals,moneyMetric(tier==='research'?'Net spread per item, if filled':tier==='forecast'?'Modelled 24h profit, uncertain':'Net profit if entire lot resells',coin(choice.profit),tier==='research'?'No quantity or future fill rate established':tier==='forecast'?'Not guaranteed or live-tested for accuracy':'Not an overnight profit prediction'),
   moneyMetric(tier==='research'?'One-unit buy reference':'Gold needed',tier==='research'?coin(choice.buy):coin(choice.cost),tier==='forecast'?'Includes modelled fees/reserves':'Only consider buying with wallet funds'));
  section.append(totals);
  let caution=tier==='research'?'Public bids/asks do not establish completed volume, fill speed or profitability.':
   tier==='history'?'Personal past completed buys and sells do not prove this lot will fill or resell tonight.':
   'This estimate requires comparable observed trade outcomes; predictive accuracy has not been established.';
  section.append(el('p','gp-guide-caution',caution));
  const primary=el('div','gp-guide-primary-row');
  add(primary,button('View price chart',()=>showChart(choice),'gp-guide-primary'),
   button('Explore all trade research',()=>advanced(true),'gp-guide-secondary'));
  section.append(primary);
 }
 const controls=el('div','gp-guide-controls');
 add(controls,button('← Previous',previous,'gp-guide-light'),button('Skip · next →',skip,'gp-guide-light'));
 controls.firstChild.disabled=!history.length;
 section.append(controls);
 const second=el('div','gp-guide-secondary-row');
 add(second,button(position===rows.length-1&&rows.length>0?'Start again ↻':'Next idea →',next,'gp-guide-text'),button('Return to skipped ('+skipped.filter(id=>rows.some(x=>x.id===id)).length+')',returnSkipped,'gp-guide-text'));
 second.lastChild.disabled=!skipped.some(id=>rows.some(x=>x.id===id));
 section.append(second);
 host.append(section);
}
function renderChartArea(host){
 const wrap=el('section','gp-guide-chart-section');wrap.id='gp-guide-chart-section';wrap.hidden=!chartOpen;
 const top=el('div','gp-guide-chart-head');
 add(top,el('h2','','Price history · zoom & move'),button('Close',()=>{chartOpen=false;render(true);},'gp-guide-light'));
 const tools=el('div','gp-guide-chart-controls');
 add(tools,button('− Zoom out',()=>zoom(false),'gp-guide-light'),button('+ Zoom in',()=>zoom(true),'gp-guide-light'),
  button('← Earlier',()=>pan(true),'gp-guide-light'),button('Later →',()=>pan(false),'gp-guide-light'),button('Reset',()=>{chartDays=21;chartOffset=0;drawChart();},'gp-guide-light'));
 const description=el('p','gp-guide-muted','Daily public bid/ask snapshots, not completed trade prices or sales volume. Missing dates are not interpolated.');
 const chart=el('div','gp-guide-chart-body');chart.id='gp-guide-chart-body';
 add(wrap,top,tools,description,chart);host.append(wrap);if(chartOpen)drawChart();
}
function showChart(choice){
 chartOpen=true;chartDays=21;chartOffset=0;priceChart=null;render(true);
 const area=$('gp-guide-chart-section');area?.scrollIntoView({block:'start',behavior:'smooth'});
 if(!root.GPMarketFeed?.loadHistory){$('gp-guide-chart-body').textContent='A compatible price-history feed is not available.';return;}
 root.GPMarketFeed.loadHistory().then(data=>{
  if(!chartOpen||current!==choice.id)return;
  const rows=data?.entries?.get(choice.id)||[];
  priceChart={id:choice.id,source:data?.source||'',rows:rows.filter(r=>Array.isArray(r)&&r.length>=3&&r[1]>0&&r[2]>0)};
  drawChart();
 }).catch(()=>{if($('gp-guide-chart-body'))$('gp-guide-chart-body').textContent='Could not load public price history. You can continue without a chart.';});
}
function zoom(inward){if(!priceChart)return;chartDays=Math.max(5,Math.min(21,chartDays+(inward?-7:7)));chartOffset=Math.min(chartOffset,Math.max(0,priceChart.rows.length-chartDays));drawChart();}
function pan(earlier){if(!priceChart)return;chartOffset=Math.max(0,Math.min(Math.max(0,priceChart.rows.length-chartDays),chartOffset+(earlier?3:-3)));drawChart();}
function drawChart(){
 const mount=$('gp-guide-chart-body');if(!mount||!chartOpen)return;mount.replaceChildren();
 if(!priceChart){mount.append(el('p','gp-guide-muted','Loading historical price observations…'));return;}
 const rows=priceChart.rows,n=rows.length;
 if(n<2){mount.append(el('p','gp-guide-muted','No sufficient recent daily price history exists for this item. This is not evidence of zero trades.'));return;}
 const last=Math.max(0,n-chartOffset),first=Math.max(0,last-chartDays),sample=rows.slice(first,last);
 if(sample.length<2){mount.append(el('p','gp-guide-muted','Not enough observations at this zoom level.'));return;}
 const minimum=Math.min(...sample.map(r=>Math.min(r[1],r[2]))),maximum=Math.max(...sample.map(r=>Math.max(r[1],r[2])));
 const pad=Math.max(1,(maximum-minimum)*.07),low=Math.max(0,minimum-pad),high=maximum+pad,span=Math.max(1,high-low);
 const chartPrice=v=>v>=10000?(v/10000).toFixed(v>=100000?0:2)+'g':v>=100?(v/100).toFixed(1)+'s':Math.round(v)+'c';
 const start=sample[0][0],end=sample[sample.length-1][0],x=r=>58+(r[0]-start)/Math.max(1,end-start)*544;
 const y=v=>155-(v-low)/span*132;
 const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 640 210');svg.setAttribute('class','gp-guide-chart');svg.setAttribute('role','img');svg.setAttribute('aria-label','Historical daily public bid and ask snapshots. Use zoom and earlier or later buttons to move around.');
 const ns='http://www.w3.org/2000/svg';
 const svgText=(xx,yy,str,anchor)=>{const t=document.createElementNS(ns,'text');t.setAttribute('x',xx);t.setAttribute('y',yy);t.setAttribute('fill','#c4d7ca');t.setAttribute('font-size','13');if(anchor)t.setAttribute('text-anchor',anchor);t.textContent=str;svg.append(t);};
 const line=(d,color,width=2)=>{const p=document.createElementNS(ns,'path');p.setAttribute('d',d);p.setAttribute('fill','none');p.setAttribute('stroke',color);p.setAttribute('stroke-width',width);p.setAttribute('stroke-linejoin','round');svg.append(p);};
 for(let i=0;i<3;i++){const yy=28+i*63;line('M58 '+yy+' H602','#345344',1);}
 const path=index=>sample.map((r,i)=>((i&&r[0]-sample[i-1][0]>1)?'M':i?'L':'M')+x(r).toFixed(2)+' '+y(r[index]).toFixed(2)).join(' ');
 line(path(1),'#9ce1b4',3);line(path(2),'#eac77e',3);
 svgText(5,35,chartPrice(high));svgText(5,165,chartPrice(low));
 svgText(58,199,new Date(start*DAY).toLocaleDateString('en-GB',{day:'numeric',month:'short',timeZone:'UTC'}));
 svgText(602,199,new Date(end*DAY).toLocaleDateString('en-GB',{day:'numeric',month:'short',timeZone:'UTC'}),'end');
 mount.append(svg,el('div','gp-guide-chart-key','● Bid reference (green)     ● Ask reference (gold)'));
 mount.append(el('p','gp-guide-muted',sample.length+' observations · '+priceChart.source+' · '+(first+1)+'–'+last+' of '+n+' recorded days'));
}
function render(force=false){
 if(!installed||!document.body.classList.contains('gp-guided-active'))return;
 const s=root.GoldenPeanutClean?.State;
 const sig=JSON.stringify([s?.snapshot?.walletAt,s?.snapshot?.at,s?.summary?.weekP100,s?.summary?.totalRecords,s?.opportunityAt,
  s?.opportunityPlan?.orders?.length,s?.opportunityPlan?.marketChoices?.length,s?.opportunityPlan?.publicResearch?.length,
  $('focus-delivery-total')?.textContent||'',current,skipped,chartOpen,chartDays,chartOffset]);
 if(!force&&sig===fingerprint)return;fingerprint=sig;
 const host=$('gp-guided-root');if(!host)return;
 const oldY=window.scrollY;host.replaceChildren();
 const content=el('div','gp-guide-content');host.append(content);
 renderTop(content,s);
 const rows=ideas(s),choice=getCurrent(rows);
 if(choice&&choice.id!==current){current=choice.id;priceChart=null;chartOpen=false;}
 buildIdea(content,s,rows,choice);
 renderChartArea(content);
 const footer=el('footer','gp-guide-foot');
 add(footer,el('p','gp-guide-muted','You place, cancel and collect orders in GW2 yourself. The Golden Peanut reads data; it never trades on your behalf.'),
  button('Open all markets, orders, legendaries & settings',()=>advanced(false),'gp-guide-secondary'));
 content.append(footer);
 if(force)window.scrollTo({top:oldY,behavior:'instant'});
}
function schedule(force=false){clearTimeout(renderTimer);renderTimer=setTimeout(()=>render(force),250);}
function install(){
 if(installed||!$('focus-today')||!document.querySelector('.app'))return false;
 const app=document.querySelector('.app');
 const host=el('div','gp-guided-root');host.id='gp-guided-root';host.hidden=true;app.prepend(host);
 const back=button('← Return to simple view',()=>guided(true),'gp-return-guided');back.id='gp-return-guided';back.hidden=true;app.prepend(back);
 installed=true;
 if(read(KEY,'guided')!=='advanced')guided(true);
 else guided(false);
 const source=$('focus-wallet'),delivery=$('focus-delivery-total');
 const observer=new MutationObserver(()=>schedule());
 for(const node of [source,delivery])if(node)observer.observe(node,{childList:true,subtree:true,characterData:true});
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)schedule(true);});
 setInterval(()=>schedule(),20000);
 root.GPGuided={render:()=>render(true),open:()=>guided(true),advanced:()=>advanced(false)};
 return true;
}
function ready(){
 if(install())return;
 const obs=new MutationObserver(()=>{if(install())obs.disconnect();});
 obs.observe(document.documentElement,{childList:true,subtree:true});
 setTimeout(()=>{obs.disconnect();install();},20000);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready,{once:true});else ready();
})(typeof window!=='undefined'?window:globalThis);
