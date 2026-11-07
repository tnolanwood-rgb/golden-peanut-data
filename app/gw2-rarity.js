/* Official GW2 item-name rarity classes from the Guild Wars 2 Wiki
 * colour-rarity definitions. Styling only; never infer rarity from item names.
 * Missing metadata is deliberately left uncoloured rather than guessed.
 */
(function(root){'use strict';
const RARITIES=new Set(['junk','basic','fine','masterwork','rare','exotic','ascended','legendary']);
function classname(rarity){
 const key=typeof rarity==='string'?rarity.toLowerCase().trim():'';
 return RARITIES.has(key)?'gp-rarity-'+key:'';
}
function apply(node,rarity){
 if(!node?.classList)return node;
 for(const old of [...node.classList])if(old.startsWith('gp-rarity-'))node.classList.remove(old);
 const cls=classname(rarity);
 if(cls){node.classList.add('gp-item-name',cls);node.title=(node.title?node.title+' · ':'')+rarity+' quality';}
 else node.classList.remove('gp-item-name');
 return node;
}
root.GPRarity={classname,apply};
if(typeof module!=='undefined'&&module.exports)module.exports=root.GPRarity;
})(typeof globalThis!=='undefined'?globalThis:this);
