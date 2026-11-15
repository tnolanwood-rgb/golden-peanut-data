#!/usr/bin/env node
/* Reproducible, LOCAL, synthetic transfer/parse benchmark.
 * Not representative of a particular Android device, network or live account.
 * JSON sizes are the exact measured UTF-8 lengths of the constructed fixtures.
 */
'use strict';
const {performance}=require('node:perf_hooks');
const median=arr=>[...arr].sort((a,b)=>a-b)[Math.floor(arr.length/2)];
const measure=source=>{
 const timings=[];
 for(let i=0;i<9;i++){
  const start=performance.now();
  const result=JSON.parse(source);
  if(!result)throw Error('invalid fixture');
  if(i>=2)timings.push(Number((performance.now()-start).toFixed(3)));
 }
 return {medianMs:median(timings),samplesMs:timings};
};
const count=24000;
const rows=Array.from({length:count},(_,i)=>[
 i+1,"Berserker's Pearl Item "+(i+1),i%3?'Weapon':'Armor','Exotic',
 15000+i%1500,18000+i%1900,20+i%30,25+i%40
]);
const details=Object.fromEntries(rows.map(r=>[r[0],{
 id:r[0],name:r[1],type:r[2],rarity:r[3],level:80,
 flags:['AccountBoundOnUse'],details:{type:'Axe',stat_choices:[1,2,3],infix_upgrade:{id:101}},
 icon:'https://render.guildwars2.com/file/aabbcc/'+r[0]+'.png'
}]));
const times=Object.fromEntries(rows.map(r=>[r[0],1794700000]));
const full=JSON.stringify({schema:'golden-peanut-public-v1',generated_at:1794700000,
 count,items:rows,metadata:details,quote_times:times});
const compact=JSON.stringify({schema:'golden-peanut-index-v1',generated_at:1794700000,
 count,items:rows.map(r=>r.slice(0,4))});
const nowDay=20778,hCount=12000;
const hist=Object.fromEntries(Array.from({length:hCount},(_,i)=>[i+1,
 Array.from({length:21},(_,j)=>[nowDay-20+j,15000+i,19000+i,20+j,20+j])
]));
const fullHistory=JSON.stringify({schema:'golden-peanut-daily-v1',generated_at:1794700000,history:hist});
const oneShard=JSON.stringify({schema:'golden-peanut-history-shard-v1',modulus:32,shard:1,
 generated_at:1794700000,history:Object.fromEntries(Object.entries(hist).filter(([id])=>Number(id)%32===1))});
const entry=(source)=>({bytes:Buffer.byteLength(source,'utf8'),...measure(source)});
const a=entry(full),b=entry(compact),c=entry(fullHistory),d=entry(oneShard);
const report={conditions:'Synthetic fixture: 24,000 public rows with names/icons, 12,000 21-day history rows, warm Node 22, 2 warmups then 7 trials. Not a measured network transfer or Android render time.',
 fullPublic:a,compactIndex:b,fullHistory:c,oneHistoryShard:d,
 reductionPercent:{startupBytes:Number(((1-b.bytes/a.bytes)*100).toFixed(1)),
 chartBytes:Number(((1-d.bytes/c.bytes)*100).toFixed(1))}};
if(!(b.bytes<a.bytes&&d.bytes<c.bytes))throw Error('Compact asset did not reduce bytes');
process.stdout.write(JSON.stringify(report,null,2)+'\n');
