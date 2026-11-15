/* Guided Peanut — OSRS-style inspected chart, using only honest GW2 daily
 * quoted bid/ask snapshots. Separate modal survives every home-screen redraw.
 * It never labels standing order quantities as realised trades or volume. */
(function(root){
'use strict';
const DAY=86400000,NS='http://www.w3.org/2000/svg',MIN_POINTS=3;
const $=id=>document.getElementById(id);
const node=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=String(text);return n;};
const btn=(text,fn,cls='gp-price-button')=>{const b=node('button',cls,text);b.type='button';b.addEventListener('click',fn);return b;};
const date=d=>new Date(d*DAY).toLocaleDateString('en-GB',{day:'numeric',month:'short',timeZone:'UTC'});
const coin=v=>{if(!Number.isSafeInteger(v)||v<0)return 'Not available';return Math.floor(v/10000).toLocaleString('en-GB')+'g '+String(Math.floor(v%10000/100)).padStart(2,'0')+'s '+String(v%100).padStart(2,'0')+'c';};
const shortCoin=v=>v>=10000?(v/10000).toFixed(v>=100000?1:2)+'g':v>=100?(v/100).toFixed(1)+'s':v+'c';
let dialog,host,body,active=null,version=0,range='week',expanded=false,viewSize=7,offset=0,selected=0,drag=null;
function moneyView(value){
 const out=node('span','gp-price-money');
 out.setAttribute('aria-label',coin(value));
 if(!Number.isSafeInteger(value)||value<0){out.textContent='—';return out;}
 const parts=[['gold','g',Math.floor(value/10000)],['silver','s',Math.floor(value%10000/100)],['copper','c',value%100]];
 for(const [kind,unit,n] of parts){
  const p=node('span','gp-price-money-part '+kind),img=node('img');
  img.src='./assets/gw2-'+kind+'-coin.png';img.alt=unit;img.width=15;img.height=15;img.decoding='async';
  img.addEventListener('error',()=>{img.hidden=true;});
  p.append(node('span','',kind==='gold'?n.toLocaleString('en-GB'):String(n).padStart(2,'0')),img,node('span','gp-price-unit',unit));out.append(p);
 }
 return out;
}
function ensure(){
 if(dialog)return;
 dialog=document.createElement('dialog');dialog.id='gp-price-dialog';dialog.className='gp-price-dialog';
 dialog.setAttribute('aria-label','Guild Wars 2 market price research');
 dialog.addEventListener('close',()=>{active=null;drag=null;fingers.clear();gesture=null;version++;});
 dialog.addEventListener('pointerdown',onPointerDown);
 dialog.addEventListener('pointermove',onPointerMove);
 dialog.addEventListener('pointerup',onPointerEnd);
 dialog.addEventListener('pointercancel',onPointerEnd);
 dialog.addEventListener('wheel',onWheel,{passive:false});
 // Native dialog has its own Escape/Android Back behaviour. Outside taps
 // deliberately do NOT close a chart a user is reading.
 document.body.append(dialog);
}
function close(){if(dialog?.open)dialog.close();active=null;drag=null;version++;}
function visible(){
 if(!active?.rows?.length)return [];
 const all=active.rows,windowSize=Math.min(viewSize,all.length);
 const end=Math.max(windowSize,all.length-offset),start=Math.max(0,end-windowSize);
 return all.slice(start,end);
}
function chooseRange(next){
 if(!active?.rows?.length)return;
 range=next;viewSize=next==='week'?Math.min(7,active.rows.length):active.rows.length;
 offset=0;selected=active.rows.length-1;render();
}
function ensureSelectedVisible(){
 if(!active?.rows?.length)return;
 const n=active.rows.length,span=Math.min(viewSize,n);
 let last=Math.min(n,n-offset),first=last-span;
 if(selected<first)offset=Math.min(n-span,n-span-selected-1);
 if(selected>=last)offset=Math.max(0,n-selected-1);
}
function setSelected(index){
 if(!active?.rows?.length)return;
 selected=Math.max(0,Math.min(active.rows.length-1,index));
 ensureSelectedVisible();
 render();
}
function svg(tag,attrs={},text){
 const n=document.createElementNS(NS,tag);
 for(const [k,v] of Object.entries(attrs))n.setAttribute(k,String(v));
 if(text!==undefined)n.textContent=String(text);
 return n;
}
function mainPlot(rows){
 const frame=node('div','gp-price-plot');
 if(!rows.length)return frame;
 const W=680,H=332,L=94,R=20,T=24,B=52,px=W-L-R,py=H-T-B;
 const lows=rows.map(r=>Math.min(r[1],r[2])),highs=rows.map(r=>Math.max(r[1],r[2]));
 let lo=Math.min(...lows),hi=Math.max(...highs);
 const pad=Math.max(1,Math.ceil((hi-lo)*.09));
 lo=Math.max(0,lo-pad);hi+=pad;
 const span=Math.max(1,hi-lo),minDay=rows[0][0],maxDay=rows.at(-1)[0];
 const x=r=>L+(r[0]-minDay)/Math.max(1,maxDay-minDay)*px;
 const y=v=>T+(hi-v)/span*py;
 const v=svg('svg',{viewBox:'0 0 '+W+' '+H,class:'gp-price-svg',role:'img',
  'aria-label':'Daily public quoted buy and sell reference prices. Drag to pan, pinch to zoom, tap to inspect.'});
 const grid=svg('g',{'aria-hidden':'true'});
 for(let i=0;i<5;i++){
  const value=lo+(4-i)/4*span,yy=T+i*py/4;
  grid.append(svg('line',{x1:L,y1:yy,x2:W-R,y2:yy,stroke:'#425847','stroke-width':'1'}));
  grid.append(svg('text',{x:L-10,y:yy+5,'text-anchor':'end',fill:'#c4cfbe','font-size':15},shortCoin(value)));
 }
 v.append(grid);
 const maxGap=1; // Never join days without a source observation.
 for(const [idx,color] of [[1,'#78d2b0'],[2,'#ecc77c']]){
  let d='';
  rows.forEach((r,i)=>{
   const command=(i===0||r[0]-rows[i-1][0]>maxGap)?'M':'L';
   d+=command+x(r).toFixed(2)+' '+y(r[idx]).toFixed(2)+' ';
  });
  v.append(svg('path',{d,fill:'none',stroke:color,'stroke-width':3.7,'stroke-linejoin':'round','stroke-linecap':'round'}));
 }
 v.append(svg('text',{x:L,y:H-12,fill:'#c6d0c6','font-size':16},date(minDay)));
 v.append(svg('text',{x:W-R,y:H-12,'text-anchor':'end',fill:'#c6d0c6','font-size':16},date(maxDay)));
 const rec=active.rows[selected];
 if(rec&&rows.includes(rec)){
  const xx=x(rec);
  v.append(svg('line',{x1:xx,y1:T,x2:xx,y2:H-B,stroke:'#d7d6b0','stroke-width':1.7,'stroke-dasharray':'5 7'}));
  for(const [ix,color] of [[1,'#78d2b0'],[2,'#ecc77c']]){
   v.append(svg('circle',{cx:xx,cy:y(rec[ix]),r:7,fill:color,stroke:'#13231b','stroke-width':3}));
  }
 }
 // Pointer events are delegated to the persistent dialog, NOT this SVG.
 // The SVG is recreated when the selected day/window changes; binding touch
 // capture here would silently end every gesture after its first movement.
 v.style.touchAction='none';
 frame.append(v);
 return frame;
}
/* Interactions live on the persistent modal so a redraw never loses the
 * pointer capture (the original cause of drag/pinch stopping mid-gesture). */
const fingers=new Map();
let gesture=null;
function dayAtClientX(clientX){
 if(!active?.rows?.length)return -1;
 const plot=dialog?.querySelector('.gp-price-svg'),rows=visible();
 if(!plot||!rows.length)return -1;
 const rect=plot.getBoundingClientRect(),W=680,L=94,R=20,span=W-L-R;
 const logical=(clientX-rect.left)*W/Math.max(1,rect.width);
 const first=rows[0][0],last=rows.at(-1)[0];
 let nearest=rows[0],distance=Infinity;
 for(const row of rows){
  const xx=L+(row[0]-first)/Math.max(1,last-first)*span,delta=Math.abs(xx-logical);
  if(delta<distance){nearest=row;distance=delta;}
 }
 return active.rows.indexOf(nearest);
}
function fingersApart(){
 const p=[...fingers.values()];return p.length>=2?Math.abs(p[0]-p[1]):0;
}
function onPointerDown(e){
 if(!active?.rows?.length||!e.target?.closest?.('.gp-price-svg'))return;
 fingers.set(e.pointerId,e.clientX);
 try{dialog.setPointerCapture(e.pointerId);}catch{}
 if(fingers.size===1)gesture={x:e.clientX,originalOffset:offset,used:false,pinching:false};
 if(fingers.size===2)gesture={pinching:true,used:true,originalDistance:fingersApart(),originalSize:viewSize,originalOffset:offset};
}
function onPointerMove(e){
 if(!active?.rows?.length||!fingers.has(e.pointerId)||!gesture)return;
 fingers.set(e.pointerId,e.clientX);
 if(fingers.size>=2&&gesture.pinching){
  const desired=Math.max(MIN_POINTS,Math.min(active.rows.length,Math.round(
   gesture.originalSize*gesture.originalDistance/Math.max(20,fingersApart()))));
  if(desired!==viewSize){
   viewSize=desired;offset=Math.max(0,Math.min(active.rows.length-viewSize,gesture.originalOffset));
   range='custom';render();
  }
 }else if(fingers.size===1&&!gesture.pinching){
  const distance=e.clientX-gesture.x;
  if(Math.abs(distance)>12)gesture.used=true;
  if(gesture.used){
   const chart=dialog.querySelector('.gp-price-svg');
   const step=Math.max(40,(chart?.getBoundingClientRect().width||400)/(Math.max(4,viewSize)+1));
   const target=Math.max(0,Math.min(active.rows.length-viewSize,gesture.originalOffset+Math.round(distance/step)));
   if(target!==offset){offset=target;render();}
  }
 }
}
function onPointerEnd(e){
 if(!fingers.has(e.pointerId))return;
 const inspect=!!gesture&&!gesture.used&&!gesture.pinching&&fingers.size===1;
 fingers.delete(e.pointerId);
 if(inspect){
  const index=dayAtClientX(e.clientX);
  if(index>=0){selected=index;render();}
 }
 if(fingers.size===0)gesture=null;
}
function onWheel(e){
 if(!e.ctrlKey||!active?.rows?.length||!e.target?.closest?.('.gp-price-svg'))return;
 e.preventDefault();
 const n=active.rows.length,desired=Math.max(MIN_POINTS,Math.min(n,viewSize+(e.deltaY>0?1:-1)));
 if(viewSize!==desired){viewSize=desired;offset=Math.min(offset,n-viewSize);range='custom';render();}
}
function selectedPanel(rows){
 const card=node('section','gp-price-selection');
 if(!active?.rows?.length)return card;
 const r=active.rows[selected],label=node('h3','',date(r[0]));
 const pair=node('div','gp-price-pair');
 const b=node('div','gp-price-quote'),a=node('div','gp-price-quote');
 b.append(node('span','gp-price-buy-label','Bid reference · buy orders'),moneyView(r[1]));
 a.append(node('span','gp-price-sell-label','Ask reference · sell orders'),moneyView(r[2]));
 pair.append(b,a);
 const source=node('p','gp-price-caution','Daily Trading Post quoted prices, before fees. These are standing buy/sell references—not proof of a fill or a traded volume.');
 card.append(label,pair,source);
 return card;
}
function render(){
 if(!dialog?.open||!active)return;
 dialog.classList.toggle('is-expanded',expanded);
 dialog.replaceChildren();
 const heading=node('div','gp-price-heading');
 const headingText=node('div','gp-price-heading-text');
 headingText.append(node('div','gp-price-eyebrow','TRADE RESEARCH · GUILD WARS 2'),node('h2','',active.title));
 heading.append(headingText,btn('×',close,'gp-price-close'));
 const controls=node('div','gp-price-controls');
 const week=btn('7 days',()=>chooseRange('week'),'gp-price-button'+(range==='week'?' is-selected':''));
 const all=btn('All recorded',()=>chooseRange('all'),'gp-price-button'+(range==='all'?' is-selected':''));
 const expand=btn(expanded?'Normal size':'Expand chart',()=>{expanded=!expanded;render();},'gp-price-button gp-price-expand');
 week.setAttribute('aria-pressed',String(range==='week'));all.setAttribute('aria-pressed',String(range==='all'));
 controls.append(week,all,expand);
 const legend=node('div','gp-price-legend');
 legend.append(node('span','gp-price-buy-label','━  Buying reference · observed bid'),node('span','gp-price-sell-label','┄  Selling reference · observed ask'));
 const caption=node('p','gp-price-muted','Daily public bid/ask snapshots · missing dates are left blank. No hourly completed-trade or volume feed is available.');
 dialog.append(heading,controls,legend,caption);
 if(active.status==='loading'){
  dialog.append(node('p','gp-price-wait','Loading recorded GW2 price snapshots…'));return;
 }
 if(active.status==='error'){
  dialog.append(node('p','gp-price-wait','The price history could not load. The chart has been left open so you can retry.'));
  dialog.append(btn('Retry price history',()=>load(active.id,active.title),'gp-price-button is-selected'));return;
 }
 if(active.rows.length<2){
  dialog.append(node('p','gp-price-wait','Not enough dated public price observations are available to draw a history. This does not mean no trades happened.'));return;
 }
 const rows=visible(),count=active.rows.length;
 dialog.append(mainPlot(rows));
 const hint=node('p','gp-price-hint','Drag the chart to explore earlier days · pinch to zoom · tap a point to inspect it.');
 const inspector=node('div','gp-price-inspector');
 const l=node('label','gp-price-inspect-label','Inspect an observation');
 const slider=node('input','gp-price-slider');slider.type='range';slider.min='0';slider.max=String(count-1);
 slider.step='1';slider.value=String(selected);slider.setAttribute('aria-label','Inspect recorded price observation');
 slider.addEventListener('input',()=>setSelected(Number(slider.value)));
 inspector.append(l,slider);
 dialog.append(hint,inspector,selectedPanel(rows));
 const footer=node('p','gp-price-footnote',count+' recorded days · showing '+rows.length+' · '+(count-1-selected)+' newer observations available. '+(active.source||'Public quoted price history')+'.');
 dialog.append(footer);
}
async function load(id,title){
 const ticket=++version;
 if(!dialog)return;
 active={id,title,rows:[],status:'loading',source:''};range='week';expanded=false;viewSize=7;offset=0;selected=0;
 render();
 try{
  if(!root.GPMarketFeed?.loadItemHistory)throw Error('Public price feed unavailable');
  const result=await root.GPMarketFeed.loadItemHistory(id);
  if(ticket!==version||!dialog.open||!active||active.id!==id)return;
  const sourceRows=result?.entries?.get(id)||[];
  const seen=new Map();
  for(const row of sourceRows){
   if(Array.isArray(row)&&Number.isSafeInteger(row[0])&&Number.isSafeInteger(row[1])&&Number.isSafeInteger(row[2])&&row[1]>0&&row[2]>0)
    seen.set(row[0],[row[0],row[1],row[2]]);
  }
  active.rows=[...seen.values()].sort((a,b)=>a[0]-b[0]);active.source=result?.source||'Public bid/ask price snapshots';
  active.status='ready';selected=Math.max(0,active.rows.length-1);
  viewSize=Math.min(7,active.rows.length);render();
 }catch{
  if(ticket!==version||!dialog.open||!active||active.id!==id)return;
  active.status='error';render();
 }
}
function open(choice){
 const id=Number(choice?.id),title=String(choice?.name||choice?.label||'Item price history');
 if(!Number.isSafeInteger(id)||id<=0)return false;
 ensure();
 if(!dialog.open)dialog.showModal();
 // Repeated taps must not reset the selected day or re-fetch a chart.
 if(active?.id===id)return true;
 load(id,title);
 return true;
}
root.GPGuidedPriceChart={open,close,isOpen:()=>!!dialog?.open,
 state:()=>active?{id:active.id,range,viewSize,offset,selected,rows:active.rows.length,status:active.status}:null};
})(typeof window!=='undefined'?window:globalThis);
