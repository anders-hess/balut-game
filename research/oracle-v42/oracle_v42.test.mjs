import test from 'node:test';
import assert from 'node:assert/strict';
import {small,compress,advance,terminal,histograms} from './oracle_v42.mjs';
function reference(c,d){
 const n=new Map();for(const x of d)n.set(x,(n.get(x)||0)+1);
 const sum=d.reduce((a,b)=>a+b,0);
 if(c===0||c===1||c===2)return (c+4)*(n.get(c+4)||0);
 if(c===3){const s=[...new Set(d)].sort().join('');return s==='12345'?15:s==='23456'?20:null;}
 if(c===4)return [...n.values()].includes(3)&&[...n.values()].includes(2)?sum:null;
 if(c===5)return sum;
 return [...n.values()].includes(5)?sum+20:null;
}
test('all 252 dice histograms and 7 categories against independent scorer',()=>{
 const hs=histograms();assert.equal(hs.length,252);
 for(const d of hs)for(let c=0;c<7;c++)assert.equal(small(c,d),reference(c,d),d+':'+c);
});
test('low straight 15; high straight 20; unrelated invalid',()=>{
 assert.equal(small(3,[1,2,3,4,5]),15);
 assert.equal(small(3,[2,3,4,5,6]),20);
 assert.equal(small(3,[1,2,3,4,6]),null);
});
test('20-turn quotient transitions on 2 constructed cards',()=>{
 const cards=[Array.from({length:7},(_,c)=>c===0?[4,8,null,null]:c===1?[5,10,null,null]:c===2?[6,12,null,null]:c===3?[15,20,null,null]:[null,null,null,null]),Array.from({length:7},(_,c)=>c===3?[15,20,null,null]:c===4?[18,0,null,null]:c===5?[20,25,null,null]:c===6?[0,0,null,null]:[null,null,null,null])];
 for(const card of cards){const z=compress(card);assert.equal(z.k.reduce((a,b)=>a+b),20);
  for(const d of histograms())for(let c=0;c<7;c++){
   if(z.k[c]===0)continue;const s=small(c,d)??0;
   const copy=card.map(a=>[...a]);copy[c][copy[c].indexOf(null)]=s;
   assert.deepEqual(advance(z,c,s),compress(copy));
  }
 }
});
