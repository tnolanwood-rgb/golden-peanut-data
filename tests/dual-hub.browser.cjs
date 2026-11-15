const {chromium}=require('playwright-core');
const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve('app');
const now=Math.floor(Date.now()/1000);
const mapping=[{id:1,name:'Copper sword',members:false,limit:100,icon:'Copper_sword.png'},{id:2,name:'An extremely long item description for fixed layout regression',members:false,limit:100,icon:'Bronze_sword.png'},{id:3,name:'Old school bond',members:false,limit:100,icon:'Old_school_bond.png'},...Array.from({length:110},(_,i)=>({id:i+4,name:'Synthetic noncandidate '+(i+4),members:false,limit:100,icon:''}))];
const prices=Object.fromEntries(mapping.map(x=>[x.id,{low:100,high:[1,2,3].includes(x.id)?150:100,lowTime:now-60,highTime:now-60}]));
const volume=Object.fromEntries(mapping.map(x=>[x.id,{avgLowPrice:105,avgHighPrice:[1,2,3].includes(x.id)?145:105,lowPriceVolume:1000,highPriceVolume:1000}]));
const hourly=Object.fromEntries(mapping.map(x=>[x.id,{avgLowPrice:103,avgHighPrice:[1,2,3].includes(x.id)?147:103,lowPriceVolume:1000,highPriceVolume:1000}]));
const history={data:Array.from({length:24},(_,i)=>({timestamp:now-(24-i)*3600,avgLowPrice:100+i,avgHighPrice:140+i,lowPriceVolume:100,highPriceVolume:100}))};
const server=http.createServer((req,res)=>{
 const pathname=req.url.split('?')[0],file=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
 if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return}
 try{res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.png')?'image/png':'text/html');res.end(fs.readFileSync(file))}
 catch{res.writeHead(404).end()}
});
(async()=>{
 await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
 const url='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({executablePath:fs.existsSync('/usr/bin/chromium')?'/usr/bin/chromium':chromium.executablePath(),headless:true,args:['--no-sandbox']});
 try{
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  const page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',async route=>{
   const u=new URL(route.request().url());
   if(u.origin===url)return route.continue();
   if(u.hostname==='prices.runescape.wiki'){
    const end=u.pathname.split('/').pop();
    if(end==='timeseries')assert.ok(['6h','24h','7d','30d'].includes(u.searchParams.get('lookback')),'v2 API requires lookback; timestep is not supported');
    const data=end==='mapping'?mapping:end==='latest'?{data:prices}:end==='5m'?{timestamp:now-120,data:volume}:end==='1h'?{timestamp:now-120,data:hourly}:end==='timeseries'?{...history,timestep:3600}:{data:{}};
    return route.fulfill({status:200,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:JSON.stringify(data)});
   }
   return route.fulfill({status:200,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:'{}'});
  });
  await page.goto(url+'/?game=osrs');
  await page.waitForFunction(()=>window.GoldenDualHub?.diagnostics().game==='osrs');
  await page.waitForFunction(()=>window.GoldenPeanutClean?.State?.db?.db && window.PeanutStorage?.DB_NAME==='golden-peanut-clean-v1');
  // Preserve the original same-origin GW2 storage while switching games.
  // Test-only synthetic marker in the real GW2 IndexedDB store, not an OSRS store.
  await page.evaluate(async()=>{
   localStorage.setItem('gp-hub-continuity-probe','original-account-data-sentinel');
   const req=indexedDB.open('golden-peanut-clean-v1',1);
   const db=await new Promise((resolve,reject)=>{req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)});
   const tx=db.transaction('config','readwrite');
   tx.objectStore('config').put({pk:'Fixture.1234|hub-continuity-test',account:'Fixture.1234',key:'hub-continuity-test',value:{marker:'untouched'}});
   await new Promise((resolve,reject)=>{tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error)});
   db.close();
  });
  await page.waitForFunction(()=>document.getElementById('gh-item-name')?.textContent==='Copper sword',{timeout:15000});
  // Official OSRS mobile/Steam value colour thresholds, not GW2 rarity.
  const tierCases=await page.evaluate(()=>{
    const classify=window.GoldenOSRSValueTiers.classify;
    return [-1,0,19999,20000,99999,100000,999999,1000000,9999999,10000000,
      Number.NaN,null].map(x=>classify(x)?.tier??null);
  });
  assert.deepEqual(tierCases,[null,1,1,2,2,3,3,4,4,5,null,null],
    'exact OSRS 0/20k/100k/1m/10m official threshold boundaries');
  assert.equal(await page.locator('#gh-item-name').getAttribute('data-osrs-value-tier'),'1');
  assert.equal(await page.locator('#gh-item-name').evaluate(n=>getComputedStyle(n).color),
    'rgb(255, 255, 255)','inexpensive OSRS items should use official white');
  assert.match(await page.locator('#gh-value-tier').innerText(),/Tier 1.*observed midpoint/);
  const officialRgb=await page.locator('#gh-item-name').evaluate(n=>{
    const original=n.dataset.osrsValueTier,values=[];
    for(let tier=1;tier<=5;tier++){
      n.dataset.osrsValueTier=String(tier);
      values.push(getComputedStyle(n).color);
    }
    n.dataset.osrsValueTier=original;
    return values;
  });
  assert.deepEqual(officialRgb,[
    'rgb(255, 255, 255)','rgb(102, 178, 255)','rgb(153, 255, 153)',
    'rgb(255, 150, 0)','rgb(255, 102, 178)'
  ],'rendered text must use official OSRS Mobile/Steam default colours');
  assert.equal(await page.locator('#gh-osrs-root .gh-tier-key-grid span').count(),5);
  const osrsArtwork=await page.locator('#gh-item-icon').evaluate(frame=>{
    const icon=document.createElement('img');
    icon.src='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScL/nwAAAABJRU5ErkJggg==';
    frame.replaceChildren(icon);
    const f=frame.getBoundingClientRect(),i=icon.getBoundingClientRect();
    return {size:[f.width,f.height],fit:getComputedStyle(icon).objectFit,
      inset:[i.left-f.left,i.top-f.top,f.right-i.right,f.bottom-i.bottom]};
  });
  assert.deepEqual(osrsArtwork.size,[70,70],'OSRS artwork uses the same framed dimensions');
  assert.equal(osrsArtwork.fit,'contain','OSRS thumbnail cannot use cover cropping');
  assert.ok(osrsArtwork.inset.every(v=>v>=6),'OSRS artwork must be fully inside its padded frame');
  assert.equal(await page.locator('#gh-game-nav [role="tab"]').count(),2);
  assert.equal(await page.locator('#gh-tab-osrs').getAttribute('aria-selected'),'true');
  assert.equal(await page.locator('#gh-margin').innerText(),'38 gp / item');
  assert.match(await page.locator('#gh-total').innerText(),/1,520 gp/);
  assert.equal(await page.locator('.hub-desk-nav').count(),0,'native duplicate switch bar must not be in Cloudflare build');
  await page.locator('#gh-add-fill').click();
  await page.locator('#gh-fill-qty').fill('10');
  await page.locator('#gh-fill-price').fill('105');
  await page.locator('#gh-fill-form button[type="submit"]').click();
  assert.match(await page.locator('#gh-fill-feedback').innerText(),/Recorded purchase/);
  await page.locator('#gh-fill-side').selectOption('sell');
  await page.locator('#gh-fill-qty').fill('8');
  await page.locator('#gh-fill-price').fill('145');
  await page.locator('#gh-fill-form button[type="submit"]').click();
  assert.match(await page.locator('#gh-today').innerText(),/304 gp/); 
  await page.locator('#gh-ledger').evaluate(el=>el.open=true);
  const backupDownload=page.waitForEvent('download');
  await page.locator('#gh-export-ledger').click();
  const downloaded=await backupDownload;
  assert.match(downloaded.suggestedFilename(),/Golden-Hub-OSRS-.*\.json/);
  const beforeImport=await page.evaluate(()=>window.GoldenDualHub.diagnostics().ledgerRows);
  assert.equal(beforeImport,2);
  const bad={format:'golden-hub-osrs-v1',records:[{id:1,name:'Copper sword',side:'sell',qty:99,price:160,when:new Date(now*1000).toISOString()}]};
  await page.locator('#gh-import-file').setInputFiles({name:'invalid.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(bad))});
  await page.waitForFunction(()=>document.querySelector('#gh-backup-status')?.textContent?.includes('Import not applied'));
  assert.match(await page.locator('#gh-backup-status').innerText(),/Import not applied/);
  assert.equal((await page.evaluate(()=>window.GoldenDualHub.diagnostics())).ledgerRows,2,'invalid backup cannot mutate OSRS ledger');
  page.once('dialog',dialog=>dialog.accept());
  const addition={format:'golden-hub-osrs-v1',records:[{id:1,name:'Copper sword',side:'buy',qty:2,price:105,when:new Date(now*1000+1000).toISOString()}]};
  await page.locator('#gh-import-file').setInputFiles({name:'valid.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(addition))});
  await page.waitForFunction(()=>document.querySelector('#gh-backup-status')?.textContent?.includes('Imported 1 OSRS records'));
  assert.match(await page.locator('#gh-backup-status').innerText(),/Imported 1 OSRS records/);
  assert.equal((await page.evaluate(()=>window.GoldenDualHub.diagnostics())).ledgerRows,3);
  assert.match(await page.locator('#gh-today').innerText(),/304 gp/,'OSRS import must preserve earlier profits');

  const dockBefore=await page.locator('#gh-next').evaluate(n=>Math.round(n.getBoundingClientRect().top-n.closest('.gp-guide-idea').getBoundingClientRect().top));
  await page.locator('#gh-next').click();
  assert.match(await page.locator('#gh-item-name').innerText(),/extremely long item/);
  const dockAfter=await page.locator('#gh-next').evaluate(n=>Math.round(n.getBoundingClientRect().top-n.closest('.gp-guide-idea').getBoundingClientRect().top));
  assert.ok(Math.abs(dockBefore-dockAfter)<=2,'next/previous dock must be anchored within its card: '+dockBefore+' vs '+dockAfter);
  await page.locator('#gh-previous').click();
  assert.equal(await page.locator('#gh-item-name').innerText(),'Copper sword');
  await page.locator('#gh-show-chart').click();
  await page.waitForFunction(()=>window.GoldenOSRSChart?.diagnostics().points>=2);
  assert.equal(await page.locator('#gh-research-item').getAttribute('data-osrs-value-tier'),'1',
    'chart item heading must match the main OSRS price tier');
  assert.equal(await page.locator('#gh-research-plot svg path').count(),2);
  assert.equal(await page.locator('#gh-research-plot svg text').count(),9,'chart must label price axis, GP and date axis');
  assert.equal(await page.locator('#gh-research-slider').getAttribute('max'),'23');
  const selectionBefore=await page.locator('#gh-research-selected h3').innerText();
  await page.locator('#gh-research-slider').evaluate(n=>{n.value='0';n.dispatchEvent(new Event('input',{bubbles:true}));});
  const selectionAfter=await page.locator('#gh-research-selected h3').innerText();
  assert.notEqual(selectionBefore,selectionAfter,'slider should inspect a different observed bucket');
  assert.match(await page.locator('#gh-research-selected').innerText(),/instant-sold/);
  assert.match(await page.locator('#gh-range-summary').innerText(),/Lowest observed cost to buy/);
  assert.match(await page.locator('#gh-range-summary').innerText(),/Highest observed proceeds to sell/);
  await page.locator('[data-gh-period="six"]').click();
  await page.waitForFunction(()=>window.GoldenOSRSChart?.diagnostics().range==='six'&&window.GoldenOSRSChart?.diagnostics().points>=2);
  assert.match(await page.locator('#gh-range-summary').innerText(),/15[89] gp/,'6h low buy cost from observed high-side prices');
  assert.match(await page.locator('#gh-range-summary').innerText(),/123 gp/,'6h high sell proceeds from observed low-side prices');
  await page.locator('[data-gh-period="day"]').click();
  await page.waitForFunction(()=>window.GoldenOSRSChart?.diagnostics().range==='day'&&window.GoldenOSRSChart?.diagnostics().points>=22);
  await page.locator('[data-gh-period="three"]').click();
  await page.waitForFunction(()=>window.GoldenOSRSChart?.diagnostics().range==='three'&&window.GoldenOSRSChart?.diagnostics().points===24);
  assert.match(await page.locator('#gh-range-summary').innerText(),/\d+ observed buckets/);
  await page.locator('.gh-research-close').click();
  assert.equal(await page.locator('#gh-research-dialog').isVisible(),false);
  // Finger-tracked transition tests: the two full pages move while pointer
  // is STILL DOWN, stop mid-way when the finger stops, and reverse on demand.
  const trace=async(source,selector,x0,steps,release=true)=>{
   return page.evaluate(({source,selector,x0,steps,release})=>{
    const node=document.querySelector(selector),from=document.querySelector('#gh-panel-'+source),
     other=document.querySelector('#gh-panel-'+(source==='gw2'?'osrs':'gw2'));
    assertNode(node,'test gesture target');
    const dispatch=(type,x,y=180)=>{
      node.dispatchEvent(new PointerEvent(type,{bubbles:true,cancelable:true,pointerId:41,pointerType:'touch',
       isPrimary:true,clientX:x,clientY:y,button:0,buttons:type==='pointerup'?0:1}));
    };
    function assertNode(el,label){if(!el)throw Error(label+' missing');}
    dispatch('pointerdown',x0);
    const records=[];
    for(const x of steps){
      dispatch('pointermove',x);
      records.push({x,out:from.style.transform,other:other.style.transform,
       sideBySide:!other.hidden,moving:document.querySelector('#gh-game-stage').classList.contains('gh-stage-moving'),
       state:window.GoldenDualHub.diagnostics()});
    }
    if(release)dispatch('pointerup',steps.at(-1));
    return records;
   },{source,selector,x0,steps,release});
  };
  const half=await trace('osrs','#gh-panel-osrs .gp-guide-header',65,[125,215],false);
  assert.equal(half[1].moving,true,'touch drag should open adjacent game while finger is DOWN');
  assert.equal(half[1].sideBySide,true,'both complete pages remain mounted halfway through');
  assert.equal(Number(half[1].out.match(/translate3d\((-?[\d.]+)px/)?.[1]),150);
  assert.equal(Number(half[1].other.match(/translate3d\((-?[\d.]+)px/)?.[1]),-240);
  assert.equal(half[1].state.game,'osrs','selected game must not change before finger release');
  const paused=await page.locator('#gh-panel-osrs').evaluate(n=>n.style.transform);
  await page.waitForTimeout(120);
  assert.equal(await page.locator('#gh-panel-osrs').evaluate(n=>n.style.transform),paused,
    'held finger must hold the page still at half transition');
  const reverse=await page.evaluate(()=>{
    const node=document.querySelector('#gh-panel-osrs .gp-guide-header');
    const dispatch=(type,x)=>node.dispatchEvent(new PointerEvent(type,{
      bubbles:true,cancelable:true,pointerId:41,pointerType:'touch',isPrimary:true,clientX:x,clientY:180,button:0,buttons:type==='pointerup'?0:1}));
    dispatch('pointermove',125);
    const transform=document.querySelector('#gh-panel-osrs').style.transform;
    dispatch('pointermove',270);
    dispatch('pointerup',270);
    return {transform};
  });
  assert.equal(Number(reverse.transform.match(/translate3d\((-?[\d.]+)px/)?.[1]),60,'dragging backward must reverse the page live');
  await page.waitForFunction(()=>window.GoldenDualHub?.diagnostics().game==='gw2' &&
   !document.querySelector('#gh-game-stage').classList.contains('gh-stage-moving'));
  assert.equal(await page.locator('#gh-panel-gw2').isVisible(),true);
  assert.equal(await page.locator('#gh-panel-osrs').isVisible(),false);
  // Vertical swipes leave the game unchanged and keep native page scrolling.
  await page.evaluate(()=>{
    const node=document.querySelector('#gh-panel-gw2 .app');
    const fire=(type,x,y)=>node.dispatchEvent(new PointerEvent(type,{bubbles:true,cancelable:true,
      pointerId:42,pointerType:'touch',isPrimary:true,clientX:x,clientY:y,button:0}));
    fire('pointerdown',250,160);fire('pointermove',252,235);fire('pointerup',252,235);
  });
  assert.equal((await page.evaluate(()=>window.GoldenDualHub.diagnostics())).dragging,false);
  assert.equal((await page.evaluate(()=>window.GoldenDualHub.diagnostics())).game,'gw2');
  // Reversed short swipe: should settle back, not change games.
  const back=await trace('gw2','#gh-panel-gw2 .app',325,[170,303]);
  assert.equal(back[0].sideBySide,true);
  assert.equal(Number(back[1].out.match(/translate3d\((-?[\d.]+)px/)?.[1]),-22);
  // On release, the remaining movement should glide rather than finish
  // inside the old jarring 140–320ms window; both pages and height settle.
  const gentle=await page.evaluate(()=>{
   const stage=document.querySelector('#gh-game-stage'),panel=document.querySelector('#gh-panel-gw2');
   const shift=panel.getAnimations().find(a=>a.effect?.getKeyframes?.().some(k=>String(k.transform||'').includes('translate3d')));
   const grow=stage.getAnimations().find(a=>a.effect?.getKeyframes?.().some(k=>typeof k.height==='string'));
   return {duration:shift?.effect?.getTiming()?.duration,
     stillMoving:stage.classList.contains('gh-stage-moving'),
     heightAnimated:!!grow,frames:shift?.effect?.getKeyframes?.().length||0};
  });
  assert.ok(gentle.stillMoving,'settling should visibly continue after release');
  assert.ok(gentle.duration>=390&&gentle.duration<=650,'settling should glide softly rather than snap');
  assert.ok(gentle.frames>=45,'damped glide should use smooth sampled positions');
  assert.ok(gentle.heightAnimated,'different page heights should transition instead of suddenly jumping');
  await page.waitForFunction(()=>!document.querySelector('#gh-game-stage').classList.contains('gh-stage-moving'));
  assert.equal((await page.evaluate(()=>window.GoldenDualHub.diagnostics())).game,'gw2');
  // Complete GW2 -> OSRS from the whole page and then OSRS -> GW2 over a
  // button, verifying the larger touch area. Both preserve the ledger.
  await trace('gw2','#gh-panel-gw2 .app',330,[220,80]);
  await page.waitForFunction(()=>window.GoldenDualHub?.diagnostics().game==='osrs' &&
   !document.querySelector('#gh-game-stage').classList.contains('gh-stage-moving'));
  await trace('osrs','#gh-next',70,[145,270]);
  await page.waitForFunction(()=>window.GoldenDualHub?.diagnostics().game==='gw2' &&
   !document.querySelector('#gh-game-stage').classList.contains('gh-stage-moving'));
  await page.locator('#gh-tab-gw2').click();
  await page.waitForFunction(()=>!document.querySelector('#gh-game-stage').classList.contains('gh-stage-moving'));
  assert.equal(await page.locator('#gh-tab-gw2').getAttribute('aria-selected'),'true');
  assert.equal(await page.locator('#gh-osrs-root').isVisible(),false);
  await page.locator('#gh-tab-osrs').click();
  await page.waitForFunction(()=>!document.querySelector('#gh-game-stage').classList.contains('gh-stage-moving'));
  assert.equal(await page.locator('#gh-today').innerText(),'304 gp');
  await page.reload();
  await page.waitForFunction(()=>window.GoldenDualHub?.diagnostics().game==='osrs');
  const preservedGW2=await page.evaluate(async()=>{
   const req=indexedDB.open('golden-peanut-clean-v1',1);
   const db=await new Promise((resolve,reject)=>{req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)});
   const tx=db.transaction('config','readonly'),read=tx.objectStore('config').get('Fixture.1234|hub-continuity-test');
   const row=await new Promise((resolve,reject)=>{read.onsuccess=()=>resolve(read.result);read.onerror=()=>reject(read.error)});
   db.close();
   return {local:localStorage.getItem('gp-hub-continuity-probe'),indexed:row?.value?.marker};
  });
  assert.deepEqual(preservedGW2,{local:'original-account-data-sentinel',indexed:'untouched'},
    'moving between OSRS and GW2 must not erase same-origin GW2 browser history or settings');
  assert.equal(await page.locator('#gh-today').innerText(),'304 gp');
  await fs.promises.mkdir('artifacts',{recursive:true});
  await page.screenshot({path:'artifacts/browser-osrs-390.png',fullPage:true});
  assert.deepEqual(errors,[],'dual game interface must be free of JS page errors');
  await context.close();
  console.log('Private dual-game hub: synthetic OSRS API, FIFO ledger, game switch and chart passed');
 }finally{await browser.close();server.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
