// Oracle3 clean-math: independent exact chance distribution and Bellman
// within-turn expectimax, independent of production Oracle probability modules.
import assert from 'node:assert/strict';
import {CATEGORIES,applyScore,totals,uniqueHolds} from '../phase1/simulator.mjs';
import {actionKey,encodeCard} from '../oracle2/adapter.mjs';

const FACT=[1,1,2,6,24,120];
export function multinomialOutcomes(n){
 assert.ok(Number.isInteger(n)&&n>=0&&n<=5);
 const outcomes=[];
 function walk(i,left,counts){
  if(i===5){
   const c=[...counts,left];
   const dice=c.flatMap((v,j)=>Array(v).fill(j+1));
   const p=FACT[n]/c.reduce((a,k)=>a*FACT[k],1)/Math.pow(6,n);
   outcomes.push({dice,prob:p});
   return;
  }
  for(let count=0;count<=left;count++)walk(i+1,left-count,[...counts,count]);
 }
 walk(0,n,[]);
 assert.equal(Math.abs(outcomes.reduce((s,x)=>s+x.prob,0)-1)<1e-10,true);
 return outcomes;
}
const OUTCOMES=Array.from({length:6},(_,i)=>multinomialOutcomes(i));

export function exactWithinTurn(root,continuation){
 const {card,dice,rollsRemaining}=root;
 const h=encodeCard(card).remaining;
 assert.ok(h>0&&h<=28&&Number.isInteger(rollsRemaining)&&rollsRemaining>=0&&rollsRemaining<=2);
 assert.ok(Array.isArray(dice)&&dice.length===5&&dice.every(d=>Number.isInteger(d)&&d>=1&&d<=6));
 const cats=CATEGORIES.filter(c=>card[c].includes(null));
 const scoringCache=new Map(),bestCache=new Map();
 function scoreValue(category,ds){
  const key=category+':'+[...ds].sort().join('');
  if(scoringCache.has(key))return scoringCache.get(key);
  const after=applyScore(card,category,ds).card;
  const future=h===1?0:continuation(after);
  assert.ok(Number.isFinite(future),'non-finite next-card optimal continuation');
  const q=totals(after).big+future;
  scoringCache.set(key,q);return q;
 }
 function best(ds,r){
  const key=[...ds].sort().join('')+'|'+r;
  if(bestCache.has(key))return bestCache.get(key);
  let value=-Infinity;
  for(const c of cats)value=Math.max(value,scoreValue(c,ds));
  if(r>0)for(const held of uniqueHolds(ds)){
   if(held.length===5)continue;
   let expectation=0;
   for(const {dice:rethrow,prob} of OUTCOMES[5-held.length])
    expectation+=prob*best([...held,...rethrow],r-1);
   if(expectation>value)value=expectation;
  }
  bestCache.set(key,value);
  return value;
 }
 let chosen=null,bestQ=-Infinity;
 const actionValues={};
 for(const cat of cats){
  const action={type:'score',category:cat},q=scoreValue(cat,dice);
  actionValues[actionKey(action,dice)]=q;
  if(q>bestQ+1e-12){chosen=action;bestQ=q;}
 }
 if(rollsRemaining>0)for(const held of uniqueHolds(dice)){
  if(held.length===5)continue;
  let q=0;
  for(const {dice:rethrow,prob} of OUTCOMES[5-held.length])
   q+=prob*best([...held,...rethrow],rollsRemaining-1);
  const action={type:'hold',held};
  actionValues[actionKey(action,dice)]=q;
  if(q>bestQ+1e-12){chosen=action;bestQ=q;}
 }
 assert.ok(chosen);
 return {action:chosen,value:bestQ,actionValues,
  numScoreValues:scoringCache.size,numBellmanDiceStates:bestCache.size};
}
