// Offline public-catalogue replay. No account data, requests or execution forecasts.
const fs=require('node:fs'),vm=require('node:vm'),crypto=require('node:crypto');
const raw=fs.readFileSync('data/market_public.json'),data=JSON.parse(raw);
const now=data.generated_at*1000;
const c={console,Date:class extends Date{static now(){return now;}},Intl,Map,Set,structuredClone};
c.globalThis=c;vm.createContext(c);
const html=fs.readFileSync('app/index.html','utf8');
for(const id of ['gp-clean-core','gp-clean-market']){
 const body=html.match(new RegExp('<script id="'+id+'">([\\s\\S]*?)</script>'));
 if(body)vm.runInContext(body[1],c);
}
for(const name of ['execution-engine.js','opportunity-engine.js','market-board.js'])
 vm.runInContext(fs.readFileSync('app/'+name,'utf8'),c);
const metadata={},quotes=[],categories={};
for(const [id,name,type,rarity,buy,sell,buyQty,sellQty] of data.items){
 metadata[id]={...(data.metadata?.[id]||{}),id,name,type,rarity};
 quotes.push({id,buy,sell,buyQty,sellQty,at:new Date((data.quote_times?.[id]||data.generated_at)*1000).toISOString()});
 categories[type]??={catalogue:0,quoteEligible:0,research:0,board:0,seeded:0};categories[type].catalogue++;
}
const hist={markets:new Map(),ranked:[],archive:[]};
(async()=>{
 const seeds=await c.GPOpportunity.gatherPublicSeeds({meta:metadata,db:{marketPage:async(after,size)=>{
  const start=Number(after)||0,end=Math.min(start+size,quotes.length);
  return {values:quotes.slice(start,end).map(latest=>({latest})),done:end===quotes.length,afterPk:String(end)};
 }},marketStatus:{complete:true}},hist,1450);
 const research=c.GPOpportunity.publicResearchCandidates({quotes,metadata,hist,now});
 const board=c.GPMarketBoard.build({ok:true,budget:100000,orders:[],publicResearch:research},{wallet:100000,metadata,now});
 for(const q of quotes)if(c.GPOpportunity.researchQuoteScore(q))categories[metadata[q.id].type].quoteEligible++;
 for(const id of seeds.ids)categories[metadata[id].type].seeded++;
 for(const r of research)categories[metadata[r.id].type].research++;
 for(const r of board.newMarkets)categories[metadata[r.id].type].board++;
 console.log(JSON.stringify({conditions:'Offline replay at snapshot generation time; all quotes evaluated to isolate gates, seed quota separate; no live profitability inference',catalogueSHA256:crypto.createHash('sha256').update(raw).digest('hex'),generatedAt:data.generated_at,categories,publicCoverage:board.publicCoverage||null},null,2));
})().catch(e=>{console.error(e.message);process.exitCode=1;});
