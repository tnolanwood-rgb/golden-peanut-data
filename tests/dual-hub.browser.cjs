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
  await page.waitForFunction(()=>document.getElementById('gh-item-name')?.textContent==='Copper sword',{timeout:15000});
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
  const dockBefore=await page.locator('#gh-next').evaluate(n=>Math.round(n.getBoundingClientRect().top-n.closest('.gp-guide-idea').getBoundingClientRect().top));
  await page.locator('#gh-next').click();
  assert.match(await page.locator('#gh-item-name').innerText(),/extremely long item/);
  const dockAfter=await page.locator('#gh-next').evaluate(n=>Math.round(n.getBoundingClientRect().top-n.closest('.gp-guide-idea').getBoundingClientRect().top));
  assert.ok(Math.abs(dockBefore-dockAfter)<=2,'next/previous dock must be anchored within its card: '+dockBefore+' vs '+dockAfter);
  await page.locator('#gh-previous').click();
  assert.equal(await page.locator('#gh-item-name').innerText(),'Copper sword');
  await page.locator('#gh-show-chart').click();
  await page.waitForFunction(()=>window.GoldenOSRSChart?.diagnostics().points>=2);
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
  const swipe=async(source,target,x0,x1)=>{
   const result=await page.evaluate(({source,x0,x1})=>{
    const node=document.querySelector(source==='osrs'?'#gh-panel-osrs .gp-guide-header':'#gh-panel-gw2 .app');
    const touch=x=>new Touch({identifier:41,target:node,clientX:x,clientY:180});
    node.dispatchEvent(new TouchEvent('touchstart',{bubbles:true,touches:[touch(x0)],changedTouches:[touch(x0)],targetTouches:[touch(x0)]}));
    node.dispatchEvent(new TouchEvent('touchend',{bubbles:true,touches:[],changedTouches:[touch(x1)],targetTouches:[]}));
    return {moving:document.querySelector('#gh-game-stage').classList.contains('gh-stage-moving'),
      animated:document.querySelector('#gh-panel-'+source).getAnimations().length>0};
   },{source,x0,x1});
   assert.equal(result.moving,true,'swiping should trigger visible slide, not just swap content');
   assert.equal(result.animated,true,'outgoing page must be actively animating horizontally');
   await page.waitForFunction(t=>window.GoldenDualHub?.diagnostics().game===t&&
      !document.querySelector('#gh-game-stage').classList.contains('gh-stage-moving'),target);
   assert.equal(await page.locator('#gh-panel-'+target).isVisible(),true);
   assert.equal(await page.locator('#gh-panel-'+source).isVisible(),false);
  };
  await swipe('osrs','gw2',80,300);
  await swipe('gw2','osrs',300,80);
  await page.locator('#gh-tab-gw2').click();
  await page.waitForFunction(()=>!document.querySelector('#gh-game-stage').classList.contains('gh-stage-moving'));
  assert.equal(await page.locator('#gh-tab-gw2').getAttribute('aria-selected'),'true');
  assert.equal(await page.locator('#gh-osrs-root').isVisible(),false);
  await page.locator('#gh-tab-osrs').click();
  await page.waitForFunction(()=>!document.querySelector('#gh-game-stage').classList.contains('gh-stage-moving'));
  assert.equal(await page.locator('#gh-today').innerText(),'304 gp');
  await page.reload();
  await page.waitForFunction(()=>window.GoldenDualHub?.diagnostics().game==='osrs');
  assert.equal(await page.locator('#gh-today').innerText(),'304 gp');
  await fs.promises.mkdir('artifacts',{recursive:true});
  await page.screenshot({path:'artifacts/browser-osrs-390.png',fullPage:true});
  assert.deepEqual(errors,[],'dual game interface must be free of JS page errors');
  await context.close();
  console.log('Private dual-game hub: synthetic OSRS API, FIFO ledger, game switch and chart passed');
 }finally{await browser.close();server.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
