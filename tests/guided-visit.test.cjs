const {test}=require('node:test'),assert=require('node:assert/strict');
const Visit=require('../app/guided-visit.js');
const store=()=>{
 const map=new Map();return {map,getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,v)};
};
const deck={v:1,ids:[101,202,303],position:1,started:true};
test('Android WebView recreation resumes only UI position, selection and non-sensitive chart state',()=>{
 const s=store(),v=Visit.create(s,()=>1000000);
 assert.equal(v.save('Fixture.1234',deck,915,{id:202,range:'all',viewSize:14,offset:0,selectedDay:20771,expanded:true}),true);
 const saved=JSON.parse(s.getItem(v.key));
 assert.equal(JSON.stringify(saved).includes('Fixture.1234'),false);
 assert.equal(/api.key|wallet|quote|price|ledger|trade/i.test(JSON.stringify(saved)),false);
 const reread=Visit.create(s,()=>1002500).load('Fixture.1234');
 assert.deepEqual(reread.deck,deck);
 assert.equal(reread.scroll,915);
 assert.deepEqual(reread.chart,{id:202,range:'all',viewSize:14,offset:0,selectedDay:20771,expanded:true});
 assert.equal(Visit.create(s,()=>1003000).load('Other.9999'),null,'no cross-account UI restore');
});
test('expired, malformed and out-of-bounds visit snapshots fail closed',()=>{
 const s=store(),v=Visit.create(s,()=>20000000);
 assert.equal(v.save('acct',deck,44,null),true);
 assert.equal(Visit.create(s,()=>20000000+2*60*60*1000+1).load('acct'),null);
 for(const d of [{...deck,ids:[1,1]}, {...deck,ids:[1,-1]}, {...deck,position:9},null]){
  assert.equal(v.save('acct',d,2,null),false);
 }
 s.map.set(v.key,'{bad JSON');
 assert.equal(v.load('acct'),null);
});
test('corrupt or huge chart input cannot inject a stored URL or stale price',()=>{
 const s=store(),v=Visit.create(s,()=>100000);
 assert.equal(v.save('a',deck,20,{id:202,range:'bogus',viewSize:99999,offset:-4,selectedDay:'evil',expanded:'yes',buy:123456,key:'secret',src:'https://not-allowed.test'}),true);
 const data=v.load('a');
 assert.deepEqual(data.chart,{id:202,range:'week',viewSize:7,offset:0,selectedDay:null,expanded:false});
});
