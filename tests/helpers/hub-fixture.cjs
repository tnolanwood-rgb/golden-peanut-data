const fs=require('node:fs'),http=require('node:http'),path=require('node:path');
const {chromium}=require('playwright-core');
async function fixture(){
 const root=path.resolve('app'),server=http.createServer((req,res)=>{
  const file=path.resolve(root,'.'+(req.url.split('?')[0]==='/'?'/index.html':req.url.split('?')[0]));
  if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
  try{res.setHeader('Content-Type',(file.endsWith('.js')||file.endsWith('.mjs'))?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.png')?'image/png':'text/html');res.end(fs.readFileSync(file));}catch{res.writeHead(404).end();}
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const origin='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||(fs.existsSync('/usr/bin/chromium')?'/usr/bin/chromium':chromium.executablePath()),headless:true,args:['--no-sandbox']});
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 const page=await context.newPage(),errors=[],calls={},sec=Math.floor(Date.now()/1000);
 const mapping=[{id:1,name:'First research item',limit:100,members:false},{id:2,name:'Second research item',limit:100,members:false}];
 const prices={1:{low:1000000,high:1200000,lowTime:sec-30,highTime:sec-60},2:{low:2000000,high:2300000,lowTime:sec-30,highTime:sec-60}};
 const volumes=Object.fromEntries(mapping.map(m=>[m.id,{avgLowPrice:prices[m.id].low,avgHighPrice:prices[m.id].high,lowPriceVolume:1000,highPriceVolume:1000}]));
 const control={empty:false,fail:null,stale:false,hold:null,release:null};
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',async route=>{
  const u=new URL(route.request().url());if(u.origin===origin)return route.continue();
  if(u.hostname==='prices.runescape.wiki'){
   const k=u.pathname.split('/').pop();calls[k]=(calls[k]||0)+1;
   if(control.hold&&control.hold===u.searchParams.get('lookback'))await new Promise(resolve=>control.release=resolve);
   if(k===control.fail)return route.fulfill({status:503,body:'{}',contentType:'application/json'}).catch(()=>{});
   let data=k==='mapping'?(control.empty?[]:mapping):k==='latest'?{data:control.empty?{}:prices}:k==='timeseries'?{timestep:3600,data:Array.from({length:120},(_,i)=>({timestamp:sec-(120-i)*3600,avgLowPrice:1000000+i,avgHighPrice:1200000+i,lowPriceVolume:50,highPriceVolume:60}))}:{timestamp:sec-(control.stale?20000:300),data:control.empty?{}:volumes};
   return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(data),headers:{'access-control-allow-origin':'*'}}).catch(()=>{});
  }
  return route.fulfill({status:200,contentType:'application/json',body:'{}',headers:{'access-control-allow-origin':'*'}});
 });
 return {browser,context,page,origin,errors,calls,control,prices,mapping,close:async()=>{await context.close();await browser.close();await new Promise(r=>server.close(r));}};
}
module.exports={fixture};
