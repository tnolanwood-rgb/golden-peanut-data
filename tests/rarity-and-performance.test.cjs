const test=require('node:test');
const assert=require('node:assert/strict');
const Rarity=require('../app/gw2-rarity.js');

test('GW2 rarity names map only exact API rarity values to official classes',()=>{
 const expected={
  Junk:'gp-rarity-junk',Basic:'gp-rarity-basic',
  Fine:'gp-rarity-fine',Masterwork:'gp-rarity-masterwork',
  Rare:'gp-rarity-rare',Exotic:'gp-rarity-exotic',
  Ascended:'gp-rarity-ascended',Legendary:'gp-rarity-legendary'
 };
 for(const [rarity,cls] of Object.entries(expected)){
  assert.equal(Rarity.classname(rarity),cls);
  assert.equal(Rarity.classname(rarity.toLowerCase()),cls);
 }
 assert.equal(Rarity.classname(''), '');
 assert.equal(Rarity.classname('mythic'), '');
 assert.equal(Rarity.classname('unknown'), '');
});

test('rerendering an item removes a stale rarity class and never guesses rarity',()=>{
 const classes=new Set(['gp-rarity-rare','ordinary']);
 const node={
  title:'',
  classList:{
   add(v){classes.add(v);},remove(v){classes.delete(v);},
   [Symbol.iterator](){return classes.values();}
  }
 };
 Rarity.apply(node,'Exotic');
 assert.equal(classes.has('gp-rarity-exotic'),true);
 assert.equal(classes.has('gp-rarity-rare'),false);
 assert.equal(classes.has('ordinary'),true);
 Rarity.apply(node,'');
 assert.equal(classes.has('gp-item-name'),false);
 assert.equal(classes.has('gp-rarity-exotic'),false);
});
