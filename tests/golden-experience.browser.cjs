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
  assert.deepEqual(f.errors,[]);
  fs.writeFileSync(out+'/report.json',JSON.stringify({conditions:'Synthetic headless Chromium viewport/font/reduced-motion checks; not physical Android or full accessibility certification',cases,errors:f.errors},null,2)+'\n');
  console.log('PASS Golden Experience: '+cases.length+' viewport/font/game states, contrast, touch targets, monetary overflow, reduced motion and keyboard navigation');
 }finally{await f.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
