'use strict';
// Synthetic design/lifecycle guard. Screenshots require human visual review too.
const assert=require('node:assert/strict'),fs=require('node:fs');
const {fixture}=require('./helpers/hub-fixture.cjs');
const out=process.env.GE_VISUAL_OUTPUT||'artifacts/audit/golden-experience/visual';
fs.mkdirSync(out,{recursive:true});
const cases=[],contrast=(a,b)=>{
 const lum=rgb=>{const c=rgb.match(/[\d.]+/g).slice(0,3).map(Number).map(x=>{x/=255;return x<=.04045?x/12.92:((x+.055)/1.055)**2.4;});return c[0]*.2126+c[1]*.7152+c[2]*.0722;};
 const x=lum(a),y=lum(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);
};
(async()=>{
 const f=await fixture();
 try{
  const {page,origin}=f;
  // Keep imagery deterministic and independent of third-party network access.
  await page.route(/https:\/\/.*\.(?:png|gif|webp)(?:\?.*)?$/,r=>r.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24"><circle cx="12" cy="12" r="8" fill="#e2be78"/></svg>'}));
  for(const viewport of [{width:320,height:740},{width:390,height:844},{width:480,height:960},{width:844,height:390}]){
   await page.setViewportSize(viewport);
   for(const fontScale of [1,2])for(const game of ['gw2','osrs']){
    await page.emulateMedia({reducedMotion:fontScale===2?'reduce':'no-preference'});
    await page.goto(origin+'/?game='+game);
    await page.waitForFunction(g=>window.GoldenDualHub?.diagnostics().game===g&&
     (g==='gw2'?!!document.querySelector('.gp-guide-idea'):GoldenDualHub.diagnostics().ideas>0),game);
    await page.evaluate(scale=>document.documentElement.style.fontSize=16*scale+'px',fontScale);
    const result=await page.evaluate(g=>{
     const root=document.querySelector(g==='gw2'?'.gp-guided-root':'#gh-osrs-root');
     const label=root.querySelector('.gp-guide-label'),surface=label.closest('.gp-guide-metric');
     const nav=document.querySelector('#gh-game-nav'),tab=nav.querySelector('[aria-selected="true"]');
     const visible=[...root.querySelectorAll('button:not(:disabled)')].filter(b=>b.getClientRects().length);
     const amounts=[...root.querySelectorAll('.gp-guide-number')].map(n=>({width:n.clientWidth,scroll:n.scrollWidth,text:n.textContent}));
     return {pageWidth:document.documentElement.clientWidth,contentWidth:document.documentElement.scrollWidth,
      minButtonHeight:Math.min(...visible.map(b=>b.getBoundingClientRect().height)),
      amounts,tabWidths:[...nav.querySelectorAll('button')].map(n=>({width:n.clientWidth,scroll:n.scrollWidth})),labelColor:getComputedStyle(label).color,surfaceColor:getComputedStyle(surface).backgroundColor,
      navBlur:getComputedStyle(nav).backdropFilter,selected:tab.id};
    },game);
    assert.ok(result.contentWidth<=result.pageWidth+1,game+' horizontal page overflow '+JSON.stringify({viewport,fontScale,result}));
    // Financial readouts must reflow as a *unit* when Android doubles text.
    // A 160px half-card containing three currency denominations is not a
    // premium accessible experience even when scrollWidth happens to fit.
    if(viewport.width===390){
     const layout=await page.evaluate(g=>{
      const cards=[...document.querySelectorAll('#gh-panel-'+g+' .gp-guide-metrics > .gp-guide-metric')];
      const a=cards[1]?.getBoundingClientRect(),b=cards[2]?.getBoundingClientRect();
      return a&&b?{secondY:a.y,thirdY:b.y,secondBottom:a.bottom,columns:getComputedStyle(cards[1].parentElement).gridTemplateColumns}:null;
     },game);
     if(layout){
      if(fontScale===2)assert.ok(layout.thirdY>=layout.secondBottom-1,
       game+' 200% text requires full-width financial readouts: '+JSON.stringify(layout));
      else assert.ok(Math.abs(layout.secondY-layout.thirdY)<=1,
       game+' regular text should preserve the compact balanced financial cluster: '+JSON.stringify(layout));
     }
     if(game==='gw2'&&fontScale===1){
      const seven=await page.locator('#gh-panel-gw2 .gp-guide-metrics > .gp-guide-metric').nth(3)
       .evaluate(n=>({height:n.getBoundingClientRect().height,
        flexDirection:getComputedStyle(n).flexDirection}));
      assert.equal(seven.flexDirection,'row','seven-day display must use horizontal compact layout');
      assert.ok(seven.height<165,
       'single-line seven-day financial readout must not stretch into a giant empty card: '+JSON.stringify(seven));
     }
    }
    assert.ok(result.minButtonHeight>=44,game+' touch targets must be at least 44px');
    for(const tab of result.tabWidths)assert.ok(tab.scroll<=tab.width+1,'clipped game tab at '+fontScale+'x');
    for(const amount of result.amounts)assert.ok(amount.scroll<=amount.width+1,'clipped amount: '+amount.text);
    assert.ok(contrast(result.labelColor,result.surfaceColor)>=4.5,'financial labels need normal-text contrast');
    assert.equal(result.navBlur,'none','sticky game dock must avoid backdrop blur');
    const name=game+'-'+viewport.width+'x'+viewport.height+'-'+fontScale+'x';
    await page.screenshot({path:out+'/'+name+'.png',fullPage:true});
    cases.push({name,...result,labelContrast:contrast(result.labelColor,result.surfaceColor)});
   }
  }
  // Explicit keyboard alternative and visible focus remain usable with reduced motion.
  await page.setViewportSize({width:390,height:844});
  await page.goto(origin+'/?game=gw2');
  await page.locator('#gh-tab-osrs').focus();await page.keyboard.press('Enter');
  await page.waitForFunction(()=>GoldenDualHub.diagnostics().game==='osrs');
  assert.equal(await page.locator('#gh-tab-osrs').getAttribute('aria-selected'),'true');
  // Large financial values remain unambiguous, through the actual settings flow.
  await page.locator('#gh-settings').evaluate(n=>n.open=true);
  await page.locator('#gh-budget-input').fill('9000000000000');
  await page.locator('#gh-apply').click();
  await page.waitForFunction(()=>document.querySelector('#gh-budget-metric')?.textContent.includes('9,000,000,000,000'));
  assert.match(await page.locator('#gh-budget-metric').innerText(),/9,000,000,000,000 gp/);
  // Deliberately extreme, synthetic metadata label with an unbroken token.
  // This is a typography stress test, NOT a claim such an item exists in
  // either game or that its values are live market prices.
  const stressName='MysteriousUnbrokenCatalogueDesignationWithExceptionalLengthXYZABCDEFGH'+
   ' · Reforged Relic of the Very Long Name and the Nearly Impossible Suffix';
  await page.setViewportSize({width:320,height:740});
  for(const game of ['osrs','gw2']){
   await page.goto(origin+'/?game='+game);
   await page.waitForFunction(g=>GoldenDualHub?.diagnostics().game===g&&
    (g==='gw2'?!!document.querySelector('#gh-panel-gw2 .gp-guide-idea h2'):
      GoldenDualHub.diagnostics().ideas>0),game);
   await page.evaluate(()=>document.documentElement.style.fontSize='32px');
   const stress=await page.evaluate(({game,name})=>{
    const root=document.querySelector('#gh-panel-'+game);
    const title=root?.querySelector('.gp-guide-idea h2');
    const card=title?.closest('.gp-guide-idea');
    if(!title||!card)return null;
    title.textContent=name;
    const rect=title.getBoundingClientRect(),boundary=card.getBoundingClientRect();
    const range=document.createRange();range.selectNodeContents(title);
    const fragments=[...range.getClientRects()];
    return {whole:title.textContent===name,
     viewport:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth,
     titleWidth:title.clientWidth,titleScroll:title.scrollWidth,
     font:parseFloat(getComputedStyle(title).fontSize),
     within:fragments.length>0&&fragments.every(x=>x.left>=rect.left-1&&
      x.right<=rect.right+1&&x.right<=boundary.right-4)};
   },{game,name:stressName});
   assert.ok(stress?.whole&&stress.font>=24,game+' extreme synthetic label remains complete/readable');
   assert.ok(stress.titleScroll<=stress.titleWidth+1,game+' unbroken item name must wrap inside its heading: '+JSON.stringify(stress));
   assert.ok(stress.within,game+' text glyphs must remain inside the card: '+JSON.stringify(stress));
   assert.ok(stress.scroll<=stress.viewport+1,game+' large label must not produce horizontal page overflow');
   if(game==='osrs'){
    const details=page.locator('#gh-osrs-root .gh-trade-scroll');
    assert.equal(await details.getAttribute('role'),'region',
     'nested OSRS trade evidence must be an accessible scroll region');
    assert.equal(await details.getAttribute('tabindex'),'0',
     'keyboard users need a focusable nested scroll region');
    const reach=await details.evaluate(scroller=>{
     const title=scroller.querySelector('#gh-item-name'),
      range=document.createRange();range.selectNodeContents(title);
     const before=[...range.getClientRects()].at(-1),box=scroller.getBoundingClientRect();
     if(!before)return {visible:false};
     scroller.scrollTop+=before.bottom-box.bottom+14;
     const after=[...range.getClientRects()].at(-1),now=scroller.getBoundingClientRect();
     return {visible:after.top>=now.top-1&&after.bottom<=now.bottom-4,
      scroll:scroller.scrollTop,max:scroller.scrollHeight-scroller.clientHeight,
      dock:document.querySelector('#gh-osrs-root .gh-action-dock')?.getBoundingClientRect().height};
    });
    assert.ok(reach.visible&&reach.scroll>0&&reach.max>=reach.scroll&&reach.dock>75,
     'the final glyphs of a long OSRS label must be reachable while trade actions remain visible: '+JSON.stringify(reach));
    await details.evaluate(n=>n.scrollTop=0);
    await details.focus();
    await page.keyboard.press('PageDown');
    await page.waitForTimeout(50);
    assert.ok((await details.evaluate(n=>n.scrollTop))>0,
     'keyboard PageDown must scroll the inner OSRS evidence without switching games');
    assert.equal((await page.evaluate(()=>GoldenDualHub.diagnostics())).game,'osrs');
   }
   await page.evaluate(()=>window.scrollTo({top:0,behavior:'instant'}));
   await page.screenshot({path:out+'/stress-long-name-'+game+'-320-2x.png',fullPage:true});
  }
  assert.deepEqual(f.errors,[]);
  fs.writeFileSync(out+'/report.json',JSON.stringify({conditions:'Synthetic headless Chromium viewport/font/reduced-motion checks; not physical Android or full accessibility certification',cases,errors:f.errors},null,2)+'\n');
  console.log('PASS Golden Experience: '+cases.length+' viewport/font/game states, contrast, touch targets, monetary overflow, reduced motion and keyboard navigation');
 }finally{await f.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
