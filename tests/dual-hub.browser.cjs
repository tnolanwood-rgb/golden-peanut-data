const {chromium}=require('playwright-core');
const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve('app');
const now=Math.floor(Date.now()/1000);
const mapping=[{id:1,name:'Copper sword',members:false,limit:100,icon:''},...Array.from({length:110},(_,i)=>({id:i+2,name:'Synthetic noncandidate '+(i+2),members:false,limit:100,icon:''}))];
const prices=Object.fromEntries(mapping.map(x=>[x.id,{low:100,high:x.id===1?150:100,lowTime:now-60,highTime:now-60}]));
const volume=Object.fromEntries(mapping.map(x=>[x.id,{avgLowPrice:105,avgHighPrice:x.id===1?145:105,lowPriceVolume:1000,highPriceVolume:1000}]));
const hourly=Object.fromEntries(mapping.map(x=>[x.id,{avgLowPrice:103,avgHighPrice:x.id===1?147:103,lowPriceVolume:1000,highPriceVolume:1000}]));
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
   const u=new URL(route.request().url);
   if(u.origin===url)return route.continue();
   if(u.hostname==='prices.runescape.wiki'){
    const end=u.pathname.split('/').pop(),data=end==='mapping'?mapping:end==='latest'?{data:prices}:end==='5m'?{timestamp:now-120,data:volume}:end==='1h'?{timestamp:now-120,data:hourly}:end==='timeseries'?history:{data:{}};
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
  await page.locator('#gh-show-chart').click();
  await page.waitForFunction(()=>document.querySelectorAll('#gh-chart-svg polyline').length===2);
  assert.equal(await page.locator('#gh-chart-svg polyline').count(),2);
  await page.locator('#gh-tab-gw2').click();
  assert.equal(await page.locator('#gh-tab-gw2').getAttribute('aria-selected'),'true');
  assert.equal(await page.locator('#gh-osrs-root').isVisible(),false);
  await page.locator('#gh-tab-osrs').click();
  assert.equal(await page.locator('#gh-today').innerText(),'304 gp');
  await page.reload();
  await page.waitForFunction(()=>window.GoldenDualHub?.diagnostics().game==='osrs');
  assert.equal(await page.locator('#gh-today').innerText(),'304 gp');
  await fs.promises.mkdir('artifacts',{recursive:true});
  await page.screenshot({path:'artifacts/dual-hub-osrs-mobile.png',fullPage:true});
  assert.deepEqual(errors,[],'dual game interface must be free of JS page errors');
  await context.close();
  console.log('Private dual-game hub: synthetic OSRS API, FIFO ledger, game switch and chart passed');
 }finally{await browser.close();server.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
