const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const Feed=require('../app/public-market-feed.js');

test('unchanged 1000-item public catalogue is not rewritten to IndexedDB on each startup',async()=>{
 const now=Date.now();
 const rows=Array.from({length:1000},(_,i)=>[i+1,'Item '+(i+1),'CraftingMaterial','Fine',100,140,20,15]);
 const body={schema:'golden-peanut-public-v1',generated_at:Math.floor(now/1000),count:rows.length,items:rows};
 const existing=Object.fromEntries(rows.map(([id,name,type,rarity])=>[id,{id,name,type,rarity,icon:'https://render.guildwars2.com/file/cached/123.png'}]));
 const writes=[],state={meta:existing,db:{putMetadataBatch:async x=>{writes.push(x);}}};
 const originalFetch=global.fetch;
 global.fetch=async()=>({ok:true,json:async()=>body});
 try{
  const first=await Feed.load(state,{force:true,now});
  assert.equal(first.byId.size,1000);
  assert.equal(writes.length,0,'no 1000-row rewrite when metadata already matches');
  assert.match(state.meta[1].icon,/cached/);
  state.meta[14].name='Previous item name';
  await Feed.load(state,{force:true,now});
  assert.equal(writes.length,1);
  assert.deepEqual(Object.keys(writes[0]),['14']);
  assert.equal(writes[0][14].name,'Item 14');
  assert.match(writes[0][14].icon,/cached/,'name updates retain existing icon');
  delete state.meta[99];
  await Feed.load(state,{force:true,now});
  assert.equal(writes.length,2);
  assert.deepEqual(Object.keys(writes[1]),['99']);
  await Feed.load(state,{force:true,now});
  assert.equal(writes.length,2,'no further writes after missing metadata was hydrated');
 }finally{global.fetch=originalFetch;}
});

test('full-market research is user-initiated, not launched automatically by the fast refresh',()=>{
 const root=path.join(__dirname,'..');
 const engine=fs.readFileSync(path.join(root,'app/opportunity-engine.js'),'utf8');
 const ui=fs.readFileSync(path.join(root,'app/focus-edition.js'),'utf8');
 const html=fs.readFileSync(path.join(root,'app/index.html'),'utf8');
 assert.doesNotMatch(engine,/if\(!deep&&state\.opportunityPlan\?\.ok\)queueExpanded\(state\)/);
 assert.match(engine,/function resumeExpanded\(state\)/);
 assert.match(engine,/ensurePublicUniverse\(state,\{now\}\)/);
 assert.match(ui,/Run wider discovery/);
 assert.match(ui,/retry\.hidden=scanning\|\|!s\?\.opportunityPlan\?\.ok/);
 assert.match(html,/addEventListener\('click',scanEntireMarket\)/);
});
