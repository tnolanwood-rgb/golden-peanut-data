/* Integrated REAL PUBLIC DATA contract test. Uses the repository's actual
 * published 27,999-item quote catalogue, not synthetic price fixtures.
 * No account credentials and no claimed public transaction turnover. */
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const Feed=require('../app/public-market-feed.js');
const file=path.join(__dirname,'../data/market_public.json');
test('real collected snapshot loads without losing any tradable quote IDs or stat-family metadata',async()=>{
 const body=JSON.parse(fs.readFileSync(file,'utf8'));
 assert.equal(body.schema,'golden-peanut-public-v1');
 assert.ok(body.items.length>=25000,'the market catalogue must not be a 1k sample');
 assert.equal(body.count,body.items.length);
 assert.ok(body.coverage?.quotes_complete===true);
 const parsed=Feed.parseOwn(body,body.generated_at*1000+60000);
 assert.equal(parsed.byId.size,body.items.length);
 assert.ok(parsed.byId.size>=25000);
 assert.equal(parsed.usableForLiveTrades,false);
 const original=global.fetch,meta={};
 global.fetch=async()=>({ok:true,json:async()=>body});
 try{
  const loaded=await Feed.load({meta,db:{putMetadataBatch:async()=>{}}},{force:true,now:body.generated_at*1000+60000});
  assert.equal(loaded.byId.size,body.items.length);
  const seeds=Feed.equipmentSeeds({limit:1750,maxBid:100000});
  assert.ok(seeds.length>=30,'insufficient qualifying exotic-equipment seeds after filtering');
  assert.equal(new Set(seeds).size,seeds.length,'duplicate expensive exotics steal reserved quote slots');
  const pearl=seeds.filter(id=>meta[id]?.type==='Weapon'&&/\bPearl\b/i.test(meta[id]?.name||''));
  const armor=seeds.filter(id=>meta[id]?.type==='Armor');
  assert.ok(pearl.length>=1,'no Pearl exotic weapons reached scan');
  assert.ok(armor.length>=10,'no exotic armor reached scan');
  assert.ok(new Set(armor.map(id=>meta[id].name.split(' ')[0])).size>=2,'only one exotic stat prefix discovered');
  assert.ok(seeds.every(id=>(meta[id].buy+1)<=100000),'exotic high-ticket prices were not capped');
  assert.ok(seeds.every(id=>meta[id].rarity==='Exotic'));
 }finally{global.fetch=original;}
});
