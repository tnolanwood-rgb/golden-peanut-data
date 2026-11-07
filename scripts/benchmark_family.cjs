// Usage: node scripts/benchmark_family.cjs /path/to/baseline-opportunity-engine.js
const fs=require('node:fs'),vm=require('node:vm'),{performance}=require('node:perf_hooks'),assert=require('node:assert/strict');
const metadata=Object.fromEntries(Array.from({length:1000},(_,i)=>[i+1,{name:'Family '+i,type:'Weapon',rarity:'Exotic'}]));
const sources={before:fs.readFileSync(process.argv[2],'utf8'),after:fs.readFileSync('app/opportunity-engine.js','utf8')};
const result={conditions:'Local Node, 1000 same-family metadata rows, 2 warmups then 7 repetitions; engine function only, not physical Android'};
for(const [name,source]of Object.entries(sources)){
 const c={};vm.createContext(c);vm.runInContext(source,c);const times=[];
 for(let i=0;i<9;i++){const start=performance.now();const ids=c.GPOpportunity.equipmentVariantSeeds({},metadata,1000,0);const ms=performance.now()-start;assert.deepEqual(Array.from(ids),Array.from({length:1000},(_,j)=>j+1));if(i>=2)times.push(ms);}
 result[name]={milliseconds:times,median:times.slice().sort((a,b)=>a-b)[3]};
}
console.log(JSON.stringify(result,null,2));
