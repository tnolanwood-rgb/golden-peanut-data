const {test}=require('node:test');
const assert=require('node:assert/strict');
const {create}=require('../app/guided-deck.js');
const ids=(...numbers)=>numbers.map(id=>({id,buy:100,exit:200}));

test('initial card is never silently replaced by a newly ranked candidate',()=>{
 const d=create();
 assert.equal(d.view(ids(7,8),'acct').position,1);
 assert.equal(d.view(ids(6,7,8),'acct').id,7);
 assert.equal(d.view(ids(2,6,7,8),'acct').id,7);
 assert.equal(d.view(ids(2,6,7,8),'acct').total,4);
 assert.equal(d.view(ids(2,6,8),'acct').id,7,'disappeared top idea does not silently jump to another name');
 assert.equal(d.view(ids(2,6,8),'acct').unavailable,true,'missing quotes are withheld');
 assert.equal(d.move(ids(2,6,8),'acct','restart').id,2,'explicit restart takes the latest ranked first result');
});

test('Previous and Next move through one stable deck with no redundant skip action',()=>{
 const d=create(),rows=ids(11,22,33,44);
 assert.deepEqual([d.view(rows,'a').position,d.view(rows,'a').total],[1,4]);
 assert.equal(d.move(rows,'a','next').position,2);
 assert.equal(d.move(rows,'a','previous').position,1);
 assert.equal(d.move(rows,'a','next').position,2);
 assert.equal(d.move(rows,'a','next').position,3);
 assert.equal(d.move(rows,'a','next').position,4);
 assert.equal(d.move(rows,'a','next').position,4,'last card does not wrap invisibly');
 assert.throws(()=>d.move(rows,'a','skip'),/Unsupported guided action/,'Skip is removed completely');
});

test('late discoveries and reordered ranking never move a viewed item or alter its denominator',()=>{
 const d=create(),before=ids(1,2,3);
 d.view(before,'a');
 assert.equal(d.move(before,'a','next').id,2);
 const after=ids(9,3,8,2,1,10,11);
 const v=d.view(after,'a');
 assert.equal(v.position,2);
 assert.equal(v.total,3);
 assert.equal(v.id,2);
 assert.equal(v.item.id,2);
 assert.equal(v.newIdeas,4,'new research is a separate explicit restart choice');
 assert.equal(d.move(after,'a','previous').id,1);
 assert.equal(d.move(after,'a','next').id,2);
});

test('a disappeared or expired item keeps its position but never reuses a stale quote',()=>{
 const d=create();const rows=ids(1,2,3);
 d.move(rows,'a','next');
 const v=d.view(ids(3,1),'a');
 assert.deepEqual([v.id,v.position,v.total],[2,2,3]);
 assert.equal(v.item,null);
 assert.equal(v.unavailable,true);
 assert.equal(d.move(ids(3,1),'a','next').id,3);
 assert.equal(d.view(ids(3,1),'a').item.id,3);
});

test('account change resets navigation and a new controller has no inherited position',()=>{
 const a=create(),rows=ids(1,2,3);
 a.move(rows,'account-1','next');
 assert.equal(a.view(rows,'account-1').position,2);
 assert.equal(a.view(rows,'account-1').canPrevious,true);
 const b=a.view(ids(7,8),'account-2');
 assert.deepEqual([b.id,b.position,b.total,b.started],[7,1,2,false]);
 const fresh=create().view(rows,'account-1');
 assert.deepEqual([fresh.id,fresh.position,fresh.total],[1,1,3]);
});

test('only an explicit restart rebuilds the deck from latest research',()=>{
 const d=create();
 d.move(ids(1,2),'a','next');
 const newest=ids(5,2,7,1,8);
 assert.deepEqual([d.view(newest,'a').position,d.view(newest,'a').total],[2,2]);
 const view=d.move(newest,'a','restart');
 assert.deepEqual([view.id,view.position,view.total,view.started,view.newIdeas],[5,1,5,false,0]);
});

test('invalid and duplicate market IDs cannot corrupt the deck',()=>{
 const d=create();
 const rows=[...ids(1,2,2,3),{id:NaN},{id:-1},{id:0},{id:1.5},null];
 assert.deepEqual([d.view(rows,'a').position,d.view(rows,'a').total],[1,3]);
 assert.equal(d.move(rows,'a','next').id,2);
});

test('unattended list growth is capped and never reorders the first visible idea',()=>{
 const d=create();d.view(ids(5),'a');
 const all=Array.from({length:500},(_,i)=>({id:i+1}));
 const v=d.view(all,'a');
 assert.equal(v.id,5);
 assert.equal(v.total,35);
 assert.ok(v.newIdeas>0,'extra discoveries wait for explicit refresh');
 assert.equal(d.move(all,'a','next').total,35);
 assert.equal(d.move(all,'a','previous').id,5);
});

test('a recreated Android WebView resumes the same numbered idea without storing prices',()=>{
 const original=create(),rows=ids(101,202,303,404);
 original.move(rows,'account-a','next');
 original.move(rows,'account-a','next');
 const saved=original.snapshot('account-a');
 assert.deepEqual(saved,{v:1,ids:[101,202,303,404],position:2,started:true});
 assert.equal('buy' in saved,false);
 const recovered=create();
 assert.equal(recovered.restore(saved,'account-a'),true);
 const reshuffled=ids(999,404,202,101,303);
 const v=recovered.view(reshuffled,'account-a');
 assert.deepEqual([v.id,v.position,v.total,v.started],[303,3,4,true]);
 assert.equal(recovered.move(reshuffled,'account-a','previous').id,202);
 assert.equal(recovered.view(ids(1,2),'account-b').id,1,'account switch resets the recovered deck');
});
test('untrusted or corrupt saved UI deck cannot be used after restart',()=>{
 const d=create();
 for(const x of [
  null,{v:2,ids:[1],position:0},{v:1,ids:[],position:0},
  {v:1,ids:[1,1],position:1},{v:1,ids:[-1,2],position:0},
  {v:1,ids:[1],position:100},{v:1,ids:[1],position:'0'},
  {v:1,ids:Array.from({length:36},(_,i)=>i+1),position:1}
 ])assert.equal(d.restore(x,'account-a'),false);
 assert.deepEqual([d.view(ids(4,5),'account-a').position,d.view(ids(4,5),'account-a').total],[1,2]);
});
