'use strict';
// Protected Golden Experience acceptance: synthetic OSRS interactions and failure states.
// This is browser functional/visual evidence, NOT physical Android/WebView certification.
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {fixture}=require('./helpers/hub-fixture.cjs');
const out=process.env.GE_STATES_OUTPUT||'artifacts/audit/golden-experience/states';
(async()=>{
 fs.mkdirSync(out,{recursive:true});
 const f=await fixture(),samples=[],states=[];
 try{
  const {page,origin,control}=f;
  await page.goto(origin+'/?game=osrs');
  await page.waitForFunction(()=>GoldenDualHub?.diagnostics().game==='osrs'&&GoldenDualHub.diagnostics().ideas>0);
  assert.equal(await page.locator('#gh-tab-osrs').getAttribute('aria-selected'),'true');

  // The primary trade plan must precede optional Wiki item properties and
  // detailed quote references, both visually and in accessible DOM order.
  const hierarchy=await page.evaluate(()=>{
   const box=document.querySelector('#gh-osrs-root .gh-trade-scroll');
   const selectors=['#gh-item-name','.gh-research-evidence','.gp-guide-instructions',
    '.gp-guide-totals','#gh-caution','#gh-watch-toggle','#gh-order-guide','#gh-item-context'];
   return selectors.map(sel=>({selector:sel,index:[...box.children].indexOf(box.querySelector(sel))}));
  });
  assert.ok(hierarchy.every(x=>x.index>=0),'The original trade panels must all remain: '+JSON.stringify(hierarchy));
  assert.deepEqual(hierarchy.map(x=>x.index),[...hierarchy.map(x=>x.index)].sort((a,b)=>a-b),
   'Primary buy/sell instructions must precede optional market and Wiki panels: '+JSON.stringify(hierarchy));
  await page.evaluate(()=>window.scrollTo({top:0,behavior:'instant'}));
  await page.screenshot({path:path.join(out,'osrs-action-first-390.png'),fullPage:true});
  const startingItem=await page.locator('#gh-item-name').innerText();
  // Synchronous handler+DOM cost is an instrumentation proxy, NOT first finger-to-paint latency.
  const latencies=await page.evaluate(()=>{
   const realFetch=window.fetch;
   window.__geOriginalFetch=realFetch;
   window.__geStatsFetches=0;
   window.fetch=function(resource,...args){
    if(String(resource).startsWith('https://oldschool.runescape.wiki/api.php?'))window.__geStatsFetches++;
    return realFetch.call(this,resource,...args);
   };
   const next=document.querySelector('#gh-next'),prev=document.querySelector('#gh-previous');
   const rows=[];
   for(let i=0;i<40;i++){
    const button=i%2===0?next:prev;
    if(button.disabled)throw Error('Expected both synthetic recommendations to be navigable');
    const before=GoldenDualHub.diagnostics().selectedId,started=performance.now();
    button.click();
    const synchronousMs=performance.now()-started;
    const after=GoldenDualHub.diagnostics().selectedId;
    if(after===before)throw Error('The recommendation did not change');
    rows.push({direction:i%2===0?'next':'previous',synchronousMs,
     expectedVisibleName:document.querySelector('#gh-item-name')?.textContent||''});
   }
   return rows;
  });
  // Fast card changes are synchronous; supplementary Wiki requests should
  // be coalesced rather than dispatched for every transient card.
  await page.waitForTimeout(220);
  const wikiStatsFetches=await page.evaluate(()=>{
   const count=window.__geStatsFetches;
   window.fetch=window.__geOriginalFetch;
   delete window.__geOriginalFetch;delete window.__geStatsFetches;
   return count;
  });
  assert.ok(wikiStatsFetches<=1,
   '40 rapid Next/Previous changes must cause <=1 optional Wiki stat request, got '+wikiStatsFetches);
  const percentile=(a,p)=>[...a].sort((x,y)=>x-y)[Math.min(a.length-1,Math.ceil(a.length*p)-1)];
  const ms=latencies.map(x=>x.synchronousMs);
  samples.push({metric:'osrs-click-handler-plus-sync-render',units:'ms',
   n:ms.length,median:percentile(ms,.5),p95:percentile(ms,.95),max:Math.max(...ms),
   note:'Synthetic JS click handler duration only; not user-perceived tap response or native frame time'});
  assert.equal(await page.locator('#gh-item-name').innerText(),startingItem,'repeated Next/Previous returns to exact starting item');
  assert.equal(await page.locator('#gh-previous').isDisabled(),true);
  states.push({state:'repeated-navigation',game:'osrs',iterations:40,startingItem,ledgerRows:0,wikiStatsFetches});

  // Real settings controls and valuable metadata must remain usable in portrait.
  await page.locator('#gh-settings-toggle').click();
  assert.equal(await page.locator('#gh-settings').evaluate(n=>n.open),true);
  await page.locator('#gh-budget-input').fill('250000000');
  await page.locator('#gh-mode').selectOption('members');
  await page.locator('#gh-apply').click();
  await page.waitForFunction(()=>document.querySelector('#gh-budget-metric')?.textContent.includes('250,000,000'));
  assert.match(await page.locator('#gh-account-metric').innerText(),/Members/);
  states.push({state:'settings-applied',budget:'250,000,000 gp',account:'members'});
  await page.setViewportSize({width:320,height:740});
  await page.evaluate(()=>document.documentElement.style.fontSize='24px');
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.locator('#gh-settings-toggle').click();
  // Full-page screenshots with a sticky game dock must start at document top;
  // otherwise Chromium can capture the dock over the upper title from an
  // earlier scroll position, giving a false visual-overlap diagnosis.
  await page.evaluate(()=>window.scrollTo({top:0,behavior:'instant'}));
  await page.screenshot({path:path.join(out,'osrs-settings-320-large-font.png'),fullPage:true});
  const layout=await page.evaluate(()=>{
   const root=document.documentElement,form=document.querySelector('#gh-settings');
   const controls=[...form.querySelectorAll('button,input,select')].filter(x=>x.getClientRects().length);
   return {width:root.clientWidth,scrollWidth:root.scrollWidth,
    touched:controls.map(e=>({tag:e.tagName,id:e.id,height:Math.round(e.getBoundingClientRect().height)})),
    settingsOpen:form.open};
  });
  assert.ok(layout.scrollWidth<=layout.width+1,'OSRS settings must not overflow small-phone viewport');
  // Exact visible money must be readable as a single number at 320px with
  // enlarged Android-style text, not "250,000,00" followed by a lonely "0".
  const moneyGlyphs=await page.locator('#gh-budget-metric .gh-coin-amount span, #gh-budget-metric.gh-coin-amount span')
   .first().evaluate(span=>{
    const text=span.firstChild?.textContent||'',value='250,000,000';
    const range=document.createRange();range.setStart(span.firstChild,0);range.setEnd(span.firstChild,value.length);
    const boxes=[...range.getClientRects()].map(r=>({top:r.top,width:r.width}));
    return {text,boxes};
   });
  assert.ok(moneyGlyphs.text.startsWith('250,000,000 gp'),'the exact manually entered GP value remains visible');
  assert.equal(moneyGlyphs.boxes.length,1,
   '250,000,000 must remain a single intact readout at 320px enlarged font: '+JSON.stringify(moneyGlyphs));
  assert.equal(layout.settingsOpen,true);
  assert.ok(layout.touched.length>=4,'Settings controls remain present');
  states.push({state:'settings-visual',viewport:'320x740',font:'24px',layout});
  await page.locator('#gh-settings-toggle').click();

  // On 320px/24px text, scroll deeply inside a market; Next/Previous must
  // start the *new* item at its name, not inherit the previous item's offset.
  const cardNavigation=await page.evaluate(()=>{
   const box=document.querySelector('#gh-osrs-root .gh-trade-scroll');
   const first=document.querySelector('#gh-item-name').textContent;
   const max=box.scrollHeight-box.clientHeight;
   if(max<80)throw Error('Fixture card must have substantial inner scroll');
   box.scrollTop=max;
   const initial=box.scrollTop;
   document.querySelector('#gh-next').click();
   const next={name:document.querySelector('#gh-item-name').textContent,top:box.scrollTop};
   box.scrollTop=max;
   document.querySelector('#gh-previous').click();
   const previous={name:document.querySelector('#gh-item-name').textContent,top:box.scrollTop};
   return {max,initial,first,next,previous,width:document.documentElement.clientWidth,
    scrollWidth:document.documentElement.scrollWidth};
  });
  assert.ok(cardNavigation.initial>=80,'test must scroll substantially inside card');
  assert.notEqual(cardNavigation.next.name,cardNavigation.first,'Next changes item');
  assert.equal(cardNavigation.next.top,0,'Next opens at beginning of new item');
  assert.equal(cardNavigation.previous.name,cardNavigation.first,'Previous restores first item');
  assert.equal(cardNavigation.previous.top,0,'Previous opens at beginning of item');
  assert.ok(cardNavigation.scrollWidth<=cardNavigation.width+1,'Navigation must not overflow');
  states.push({state:'nested-recommendation-scroll-reset',game:'osrs',
   priorScroll:cardNavigation.initial,nextScroll:cardNavigation.next.top,
   previousScroll:cardNavigation.previous.top});

  // A confirmed purchase is a ledger record, not realised profit or an in-game action.
  await page.locator('#gh-add-fill').click();
  await page.locator('#gh-fill-side').selectOption('buy');
  await page.locator('#gh-fill-qty').fill('3');
  await page.locator('#gh-fill-price').fill('1000000');
  await page.locator('#gh-fill-form button[type=submit]').click();
  await page.waitForFunction(()=>GoldenDualHub.diagnostics().ledgerRows===1);
  assert.match(await page.locator('#gh-fill-feedback').innerText(),/Recorded purchase/);
  assert.match(await page.locator('#gh-today').innerText(),/0 gp/);
  assert.equal(await page.locator('#gh-holdings').isVisible(),true,'Owned-item sale entry must persist');
  assert.match(await page.locator('#gh-holdings-list').innerText(),/3 remaining/);
  // Real 320px/200%-text geometry: an owned item's sale button must not be
  // squeezed next to the label or rendered outside its record row.
  const saleLayout=await page.locator('#gh-holdings-list .gh-ledger-row').first().evaluate(row=>{
    const [label,button]=row.children,a=label.getBoundingClientRect(),
      b=button.getBoundingClientRect(),r=row.getBoundingClientRect(),root=document.documentElement;
    return {labelBottom:a.bottom,buttonTop:b.top,buttonRight:b.right,
      buttonHeight:b.height,rowRight:r.right,width:root.clientWidth,scroll:root.scrollWidth};
  });
  assert.ok(saleLayout.buttonTop>=saleLayout.labelBottom-1,
    'owned-sale action must stack at enlarged font sizes: '+JSON.stringify(saleLayout));
  assert.ok(saleLayout.buttonHeight>=44,'sale control must remain tappable');
  const ownedLabel=await page.locator('#gh-holdings-list .gh-ledger-row').first().evaluate(row=>{
    const title=row.querySelector('strong'),remaining=row.querySelector('small');
    const t=title.getBoundingClientRect(),q=remaining.getBoundingClientRect();
    return {titleBottom:t.bottom,remainingTop:q.top,
      titleText:title.textContent,remainingText:remaining.textContent};
  });
  assert.ok(ownedLabel.remainingTop>=ownedLabel.titleBottom-1,
    'item title and remaining quantity must appear on separate visual rows: '+JSON.stringify(ownedLabel));
  assert.match(ownedLabel.remainingText,/3 remaining/);

  assert.ok(saleLayout.buttonRight<=saleLayout.rowRight+1,'sale control may not escape its card');
  assert.ok(saleLayout.scroll<=saleLayout.width+1,'ledger must not overflow the viewport');
  await page.evaluate(()=>window.scrollTo({top:0,behavior:'instant'}));
  await page.screenshot({path:path.join(out,'osrs-recorded-purchase-320.png'),fullPage:true});
  states.push({state:'recorded-purchase',ledgerRows:1,qty:3,realised:'0 gp'});

  // Switching desks must not lose the recorded purchase; temporary navigation is not a cold launch.
  await page.evaluate(()=>GoldenDualHub.switchGame('gw2'));
  await page.waitForFunction(()=>GoldenDualHub.diagnostics().game==='gw2');
  await page.evaluate(()=>GoldenDualHub.switchGame('osrs'));
  await page.waitForFunction(()=>GoldenDualHub.diagnostics().game==='osrs');
  assert.equal((await page.evaluate(()=>GoldenDualHub.diagnostics())).ledgerRows,1);

  // Even a completely broken Wiki endpoint must not erase the user's saved ledger.
  await page.evaluate(()=>localStorage.removeItem('gh-osrs-v1-cache'));
  control.fail='mapping';
  await page.goto(origin+'/?game=osrs');
  await page.waitForFunction(()=>GoldenDualHub.diagnostics().loading===false&&GoldenDualHub.diagnostics().priceError!==null);
  assert.equal((await page.evaluate(()=>GoldenDualHub.diagnostics())).ledgerRows,1);
  assert.match(await page.locator('#gh-status').innerText(),/unavailable/i);
  assert.equal(await page.locator('#gh-status').getAttribute('data-state'),'unavailable',
   'failed market evidence must carry an explicit semantic error state');
  const errorChrome=await page.locator('#gh-status').evaluate(n=>({
   border:getComputedStyle(n).borderLeftWidth,
   label:getComputedStyle(n,'::before').content,
   role:n.getAttribute('role')}));
  assert.equal(errorChrome.role,'status','preserve a live accessible feed status');
  assert.equal(errorChrome.border,'3px','degraded market evidence requires a visible signal');
  assert.match(errorChrome.label,/UNAVAILABLE/,'unavailable styling must be visually explicit');
  assert.match(await page.locator('#gh-holdings-list').innerText(),/3 remaining/);
  await page.screenshot({path:path.join(out,'osrs-feed-unavailable-320.png'),fullPage:true});
  states.push({state:'offline-mapping-failure',ledgerRows:1,unverified:true});

  // Recovery uses a fresh verified feed, not a made-up prior quote.
  control.fail=null;
  await page.locator('#gh-empty-retry').click();
  await page.waitForFunction(()=>GoldenDualHub.diagnostics().loading===false&&
   GoldenDualHub.diagnostics().ideas>0&&!GoldenDualHub.diagnostics().priceError);
  assert.equal((await page.evaluate(()=>GoldenDualHub.diagnostics())).ledgerRows,1);
  assert.equal(await page.locator('#gh-status').getAttribute('data-state'),'verified',
   'fresh complete market feed should recover out of the warning presentation');
  assert.match(await page.locator('#gh-status').evaluate(n=>getComputedStyle(n,'::before').content),/CHECKED/,
   'verified market evidence must have a distinct visual label');
  await page.screenshot({path:path.join(out,'osrs-recovered-320.png'),fullPage:true});
  states.push({state:'feed-recovered',ledgerRows:1});

  assert.deepEqual(f.errors,[]);
  const report={schema:'golden-experience-states-v1',
   conditions:'Synthetic browser on Chromium using mocked Wiki feeds and local-only ledger, 320px large-font plus reduced motion. No private account, physical device, production URL or permission change.',
   states,samples,calls:f.calls,errors:f.errors};
  fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');
  console.log('PASS Golden Experience state matrix: '+states.map(x=>x.state).join(', '));
  console.log('Synthetic click handler timings: '+JSON.stringify(samples));
 }finally{await f.close();}
})().catch(e=>{console.error(e.stack||e);process.exitCode=1;});
