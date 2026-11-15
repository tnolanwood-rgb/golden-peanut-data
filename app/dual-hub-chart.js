/* OSRS market inspector: same interaction grammar as the GW2 inspected chart.
   Observations are OSRS Wiki averages, not executable orders or fill predictions. */
(function(win,doc){
'use strict';
const API='https://prices.runescape.wiki/api/v2/osrs/',NS='http://www.w3.org/2000/svg';
// v2 timeseries accepts lookback, not timestep. 3d is filtered from 7d.
const periods={six:['6h','6h',21600],day:['24h','24h',86400],three:['3d','7d',259200],week:['7d','7d',604800],month:['30d','30d',2592000]};
let dialog=null,item=null,rows=[],range='week',size=0,offset=0,selected=0,sequence=0,gesture=null;
const touch=new Map(),cache=new Map();
const e=(tag,cls,text)=>{const n=doc.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=String(text);return n};
const svg=(tag,props,text)=>{const n=doc.createElementNS(NS,tag);for(const [k,v] of Object.entries(props||{}))n.setAttribute(k,String(v));if(text!==undefined)n.textContent=String(text);return n};
const gp=x=>Number.isFinite(x)?Math.round(x).toLocaleString('en-GB')+' gp':'—';
const compact=x=>x>=1e9?(x/1e9).toFixed(2)+'b':x>=1e6?(x/1e6).toFixed(2)+'m':x>=1e3?(x/1e3).toFixed(1)+'k':Math.round(x).toLocaleString('en-GB');
const at=x=>new Date(x*1000).toLocaleString('en-GB',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'});
const date=x=>new Date(x*1000).toLocaleDateString('en-GB',{day:'numeric',month:'short'});
function iconUrl(name){const n=String(name||'');return /^[a-z0-9 _().,'+!-]{2,140}\.(png|gif|webp)$/i.test(n)?'https://oldschool.runescape.wiki/images/'+encodeURIComponent(n.replace(/ /g,'_')):'';}
function ensure(){
 if(dialog)return;
 dialog=e('dialog','gh-research-dialog');dialog.id='gh-research-dialog';
 dialog.setAttribute('aria-label','Old School RuneScape historical trading research');
 dialog.innerHTML="<header class='gh-research-head'><div><span class='gh-research-kicker'>TRADE RESEARCH · OLD SCHOOL RUNESCAPE</span><h2 id='gh-research-item'>Price research</h2></div><button class='gh-research-close' type='button' aria-label='Close chart'>×</button></header>"+
 "<div id='gh-research-icon' class='gh-research-icon' aria-hidden='true'></div>"+
 "<nav class='gh-research-ranges' aria-label='Choose chart period'><button type='button' data-gh-period='six'>6h</button><button type='button' data-gh-period='day'>24h</button><button type='button' data-gh-period='three'>3 days</button><button type='button' data-gh-period='week'>7 days</button><button type='button' data-gh-period='month'>30 days</button><button type='button' id='gh-research-reset'>Reset</button></nav>"+
 "<p class='gh-research-note' id='gh-research-status' role='status' aria-live='polite'>Loading history…</p>"+
 "<div class='gh-research-legend'><span><b class='gh-line-key low'></b>Observed low · instant sells</span><span><b class='gh-line-key high'></b>Observed high · instant buys</span></div>"+
 "<div class='gh-research-plot' id='gh-research-plot'></div>"+
 "<section class='gh-range-summary' id='gh-range-summary' aria-live='polite'></section>"+
 "<label class='gh-research-inspect' for='gh-research-slider'>Inspect an observation</label><input type='range' id='gh-research-slider' class='gh-research-slider' min='0' max='0' value='0'>"+
 "<section class='gh-research-selected' id='gh-research-selected' aria-live='polite'></section>"+
 "<p class='gh-research-foot'>Public bucket averages, before any resale fees; not live offers. Drag to pan, pinch to zoom, use the slider to inspect exact prices. Missing observations are left as gaps.</p>";
 doc.body.append(dialog);
 dialog.querySelector('.gh-research-close').onclick=()=>dialog.close();
 dialog.querySelectorAll('[data-gh-period]').forEach(b=>b.onclick=()=>void load(b.dataset.ghPeriod));
 dialog.querySelector('#gh-research-reset').onclick=()=>{size=rows.length;offset=0;selected=Math.max(0,rows.length-1);render()};
 dialog.querySelector('#gh-research-slider').oninput=ev=>select(+ev.target.value);
 dialog.addEventListener('pointerdown',pointerDown);dialog.addEventListener('pointermove',pointerMove);
 dialog.addEventListener('pointerup',pointerUp);dialog.addEventListener('pointercancel',pointerUp);
 dialog.addEventListener('wheel',wheel,{passive:false});
 dialog.addEventListener('close',()=>{touch.clear();gesture=null;sequence++});
}
function bounds(){const count=Math.max(2,Math.min(rows.length,size||rows.length)),off=Math.max(0,Math.min(rows.length-count,offset));return [rows.length-count-off,rows.length-off]}
function select(i){if(!rows.length)return;selected=Math.max(0,Math.min(rows.length-1,Math.round(i)));const [a,b]=bounds();if(selected<a)offset=rows.length-(b-a)-selected;if(selected>=b)offset=rows.length-1-selected;render()}
function renderRange(){
 const box=dialog.querySelector('#gh-range-summary');if(!box)return;box.replaceChildren();
 if(!rows.length)return;
 const [a,b]=bounds(),subset=rows.slice(a,b);if(!subset.length)return;
 // Instant buying pays the observed HIGH; instant selling receives the LOW.
 const buy=subset.reduce((best,row)=>row.avgHighPrice<best.avgHighPrice?row:best);
 const sell=subset.reduce((best,row)=>row.avgLowPrice>best.avgLowPrice?row:best);
 box.append(e('h3','','Range indicator · '+subset.length+' observed buckets'));
 const cells=e('div','gh-range-pair');
 const metric=(title,row,field,cls)=>{
  const card=e('div','gh-range-metric '+cls);
  card.append(e('span','',title),e('strong','',gp(row[field])),e('small','',at(row.timestamp)));
  return card;
 };
 cells.append(metric('Lowest observed cost to buy',buy,'avgHighPrice','low'),
              metric('Highest observed proceeds to sell',sell,'avgLowPrice','high'));
 box.append(cells,e('p','gh-range-caveat',
  'Best observed historical averages in the visible window, possibly from different times. Before GE tax; not guaranteed available orders or a tradeable spread.'));
}
function render(){
 if(!dialog)return;
 dialog.querySelectorAll('[data-gh-period]').forEach(b=>b.classList.toggle('is-selected',b.dataset.ghPeriod===range));
 const slider=dialog.querySelector('#gh-research-slider');slider.max=String(Math.max(0,rows.length-1));slider.value=String(selected);slider.disabled=rows.length<2;
 const pane=dialog.querySelector('#gh-research-selected');pane.replaceChildren();
 const q=rows[selected];
 if(q){
  pane.append(e('h3','',at(q.timestamp)));
  const pair=e('div','gh-research-pair');
  for(const [cls,label,key] of [['low','Observed low · instant sells','avgLowPrice'],['high','Observed high · instant buys','avgHighPrice']]){
   const card=e('div','gh-research-value '+cls);card.append(e('span','',label),e('strong','',gp(q[key])));pair.append(card);
  }
  pane.append(pair);
  pane.append(e('p','gh-research-volume','Bucket volumes: '+Number(q.lowPriceVolume||0).toLocaleString('en-GB')+' instant-sold / '+Number(q.highPriceVolume||0).toLocaleString('en-GB')+' instant-bought'));
 }else pane.append(e('p','','No observations available.'));
 const plot=dialog.querySelector('#gh-research-plot');plot.replaceChildren();renderRange();
 if(rows.length<2){plot.append(e('p','gh-research-empty','No usable two-sided historical buckets.'));return}
 const [a,b]=bounds(),view=rows.slice(a,b),W=700,H=330,L=100,R=20,T=24,B=57;
 if(view.length<2)return;
 const all=view.flatMap(x=>[x.avgLowPrice,x.avgHighPrice]);let low=Math.min(...all),high=Math.max(...all);
 const pad=Math.max(1,(high-low)*.08);low=Math.max(0,low-pad);high+=pad;
 const sx=W-L-R,sy=H-T-B,span=Math.max(1,high-low),first=view[0].timestamp,last=view.at(-1).timestamp;
 const X=t=>L+(t-first)/Math.max(1,last-first)*sx,Y=v=>T+(high-v)/span*sy;
 const chart=svg('svg',{viewBox:'0 0 '+W+' '+H,role:'img','aria-label':'Historical low and high prices; GP axis at left and dates below'});
 for(let k=0;k<5;k++){const yy=T+k*sy/4;chart.append(svg('line',{x1:L,x2:W-R,y1:yy,y2:yy,stroke:'#415c49'}));chart.append(svg('text',{x:L-10,y:yy+5,'text-anchor':'end',fill:'#d0dccd','font-size':15},compact(low+(4-k)*span/4)));}
 chart.append(svg('text',{x:8,y:16,fill:'#cedbca','font-size':13},'GP'));
 const gap=view.slice(1).map((r,i)=>r.timestamp-view[i].timestamp).filter(x=>x>0).sort((x,y)=>x-y);
 const typical=gap[Math.floor(gap.length/2)]||3600;
 for(const [key,color] of [['avgLowPrice','#75d4b1'],['avgHighPrice','#eccc7c']]){
  let d='';view.forEach((r,i)=>{d+=(i===0||r.timestamp-view[i-1].timestamp>typical*2.5?'M':'L')+X(r.timestamp).toFixed(1)+' '+Y(r[key]).toFixed(1)+' '});
  chart.append(svg('path',{d,fill:'none',stroke:color,'stroke-width':3.6,'stroke-linejoin':'round','stroke-linecap':'round'}));
 }
 for(let k=0;k<3;k++)chart.append(svg('text',{x:L+k*sx/2,y:H-15,'text-anchor':k===0?'start':k===2?'end':'middle',fill:'#c8d4c6','font-size':15},date(first+(last-first)*k/2)));
 if(q&&q.timestamp>=first&&q.timestamp<=last){const xx=X(q.timestamp);chart.append(svg('line',{x1:xx,x2:xx,y1:T,y2:H-B,stroke:'#e7d7b6','stroke-dasharray':'5 7'}));for(const [key,color] of [['avgLowPrice','#75d4b1'],['avgHighPrice','#eccc7c']])chart.append(svg('circle',{cx:xx,cy:Y(q[key]),r:6,fill:color,stroke:'#112318','stroke-width':3}));}
 plot.append(chart);
}
async function load(key){
 if(!item)return;range=periods[key]?key:'week';const [label,step,horizon]=periods[range],ref=item.id+'-'+step,token=++sequence;
 rows=[];size=0;offset=0;selected=0;render();
 dialog.querySelector('#gh-research-status').textContent='Loading '+label+' of RuneScape Wiki market observations…';
 try{
  let entry=cache.get(ref);
  if(!entry||Date.now()-entry.at>300000){
   const response=await win.fetch(API+'timeseries?id='+encodeURIComponent(item.id)+'&lookback='+step,{headers:{Accept:'application/json'},signal:AbortSignal.timeout(17000)});
   if(!response.ok)throw Error('Wiki HTTP '+response.status);
   const data=await response.json();
   if(!Array.isArray(data?.data))throw Error('Unexpected response');
   entry={at:Date.now(),timestep:Number.isSafeInteger(data.timestep)?data.timestep:null,rows:data.data.filter(r=>Number.isSafeInteger(r?.timestamp)&&r.timestamp>0&&Number.isFinite(r.avgLowPrice)&&Number.isFinite(r.avgHighPrice)&&r.avgLowPrice>0&&r.avgHighPrice>0).sort((a,b)=>a.timestamp-b.timestamp)};
   cache.set(ref,entry);
  }
  if(token!==sequence||!dialog.open)return;
  rows=entry.rows.filter(r=>r.timestamp>=Math.floor(Date.now()/1000)-horizon).slice(-1000);
  if(rows.length<2)throw Error('Insufficient recent observations');
  size=rows.length;offset=0;selected=rows.length-1;
  dialog.querySelector('#gh-research-status').textContent=label+' · '+rows.length+' observed buckets · '+(entry.timestep?Math.round(entry.timestep/60)+'-minute ':'API-selected ')+'averages';
  render();
 }catch(error){if(token!==sequence||!dialog.open)return;rows=[];dialog.querySelector('#gh-research-status').textContent='Chart unavailable: '+error.message+' · try another range';render();}
}
function open(next){
 if(!Number.isSafeInteger(next?.id)||next.id<=0)return false;
 ensure();item={id:next.id,name:String(next.name||'Item #'+next.id),icon:next.icon};
 dialog.querySelector('#gh-research-item').textContent=item.name;
 const imageBox=dialog.querySelector('#gh-research-icon');imageBox.replaceChildren();
 const src=iconUrl(item.icon);
 if(src){const img=e('img');img.src=src;img.alt='';img.referrerPolicy='no-referrer';img.onerror=()=>{imageBox.textContent='▥'};imageBox.append(img)}else imageBox.textContent='▥';
 if(!dialog.open)dialog.showModal();void load('week');return true;
}
function chartIndex(clientX){
 const chart=dialog.querySelector('#gh-research-plot svg');if(!chart||!rows.length)return -1;
 const b=chart.getBoundingClientRect(),x=((clientX-b.left)/Math.max(1,b.width)*700-100)/(700-100-20),[a,end]=bounds();
 return Math.max(a,Math.min(end-1,Math.round(a+x*(end-a-1))));
}
function pointerDown(ev){
 if(!ev.target?.closest?.('#gh-research-plot svg')||rows.length<2)return;
 touch.set(ev.pointerId,ev.clientX);try{dialog.setPointerCapture(ev.pointerId)}catch{}
 if(touch.size===1)gesture={x:ev.clientX,offset,used:false,pinch:false};
 if(touch.size===2){const x=[...touch.values()];gesture={pinch:true,used:true,size,distance:Math.max(1,Math.abs(x[0]-x[1])),offset};}
}
function pointerMove(ev){
 if(!touch.has(ev.pointerId)||!gesture)return;
 touch.set(ev.pointerId,ev.clientX);
 if(touch.size===2&&gesture.pinch){const x=[...touch.values()],distance=Math.max(20,Math.abs(x[0]-x[1])),s=Math.max(8,Math.min(rows.length,Math.round(gesture.size*gesture.distance/distance)));if(s!==size){size=s;offset=Math.min(rows.length-size,gesture.offset);render();}}
 else if(touch.size===1&&!gesture.pinch){const dx=ev.clientX-gesture.x;if(Math.abs(dx)>12)gesture.used=true;if(gesture.used){const width=dialog.querySelector('#gh-research-plot').clientWidth||400,c=size||rows.length,o=Math.max(0,Math.min(rows.length-c,gesture.offset+Math.round(dx/width*c)));if(o!==offset){offset=o;render();}}}
}
function pointerUp(ev){if(!touch.has(ev.pointerId))return;const inspect=gesture&&!gesture.used&&!gesture.pinch&&touch.size===1;touch.delete(ev.pointerId);if(inspect){const i=chartIndex(ev.clientX);if(i>=0)select(i)}if(!touch.size)gesture=null}
function wheel(ev){if(!ev.ctrlKey||!ev.target?.closest?.('#gh-research-plot svg')||rows.length<8)return;ev.preventDefault();const s=Math.max(8,Math.min(rows.length,size+(ev.deltaY>0?8:-8)));if(s!==size){size=s;offset=Math.min(offset,rows.length-size);render();}}
win.GoldenOSRSChart={open,close:()=>dialog?.close(),diagnostics:()=>({id:item?.id||null,points:rows.length,range,selected,visible:bounds()})};
})(window,document);
