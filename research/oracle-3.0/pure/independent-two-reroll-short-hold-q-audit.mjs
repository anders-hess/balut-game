// Iteration 32: independently reconstruct selected TWO-reroll hold Q values.
// Deliberately narrow audit: hold four dice (one die rerolled), first root in
// TRAIN and VALIDATION only. No locked test, model or production Oracle.
// Uses separate count-vector chance generator and independently computes
// optimal one-reroll continuation from all legal score and hold actions.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {CATEGORIES,applyScore} from '../phase1/simulator.mjs';
import {exactRationalLastBoundaryMemo} from './rational-boundary-memo.mjs';
const SIX=6n,DEN_LAST=SIX**15n, started=Date.now();
const factorial=[1n,1n,2n,6n,24n,120n];
const outcomesCache=new Map(),boundaryCache=new Map(),oneRerollCache=new Map();
function outcomes(k){
 if(outcomesCache.has(k))return outcomesCache.get(k);
 const out=[];
 function enumerate(face,left,counts){
  if(face===6){
   if(left)return;
   const multiplicity=factorial[k]/counts.reduce((p,n)=>p*factorial[n],1n);
   out.push({dice:counts.flatMap((n,i)=>Array(n).fill(i+1)),multiplicity});return;
  }
  for(let n=0;n<=left;n++)enumerate(face+1,left-n,[...counts,n]);
 }
 enumerate(0,k,[]);
 assert.equal(out.reduce((s,x)=>s+x.multiplicity,0n),SIX**BigInt(k));
 outcomesCache.set(k,out);return out;
}
function boundary(card){
 const key=JSON.stringify(card);
 if(!boundaryCache.has(key)){
  const proof=exactRationalLastBoundaryMemo(card);
  assert.equal(BigInt(proof.denominator),DEN_LAST);
  boundaryCache.set(key,BigInt(proof.numerator));
 }
 return boundaryCache.get(key);
}
function bestScore(card,dice){
 let best=null;
 for(const category of CATEGORIES)if(card[category].includes(null)){
  const q=boundary(applyScore(card,category,dice).card);
  if(best===null||q>best)best=q;
 }
 assert.notEqual(best,null);return best;
}
function legalHolds(dice){
 const available=Array.from({length:6},(_,i)=>dice.filter(x=>x===i+1).length);
 const result=[];
 function visit(face,counts){
  if(face===6){
   if(counts.reduce((s,x)=>s+x,0)<5)result.push(counts.flatMap((n,i)=>Array(n).fill(i+1)));
   return;
  }
  for(let n=0;n<=available[face];n++)visit(face+1,[...counts,n]);
 }
 visit(0,[]);return result;
}
// Every numerator here uses common denominator 6^20.
function bestOneReroll(card,dice){
 const key=JSON.stringify(card)+'|'+[...dice].sort((a,b)=>a-b).join('');
 if(oneRerollCache.has(key))return oneRerollCache.get(key);
 let best=bestScore(card,dice)*SIX**5n;
 for(const held of legalHolds(dice)){
  const k=5-held.length;
  let sum=0n;
  for(const o of outcomes(k))sum+=o.multiplicity*bestScore(card,[...held,...o.dice]);
  const q=sum*SIX**BigInt(held.length);
  if(q>best)best=q;
 }
 oneRerollCache.set(key,best);return best;
}
const report={status:'PARTIAL_INDEPENDENT_TWO_REROLL_SHORT_HOLD_Q_AUDIT',
 lockedTestRead:false,modelFitPerformed:false,checkedRoots:0,checkedHoldActions:0,
 chanceTerms:0,checkedSplits:[],limitations:[
 'Only first two-reroll root in each of TRAIN and VALIDATION; only four-dice holds',
 'Shares exact last-turn boundary evaluator with teacher; not independent complete Bellman',
 'No locked-test use, no 3+ turn certificate or 28-turn optimality proof']};
for(const split of ['train','validation']){
 const dataset=JSON.parse(readFileSync('oracle3-action-q-'+split+'.json','utf8'));
 const entry=dataset.cards[0],root=entry.roots.find(x=>x.rerollsRemaining===2);
 assert.ok(root);assert.equal(BigInt(root.denominator),SIX**25n);
 let count=0;
 for(const held of legalHolds(root.dice).filter(h=>h.length===4)){
  const counts=Array.from({length:6},(_,i)=>held.filter(x=>x===i+1).length);
  const key='hold:'+counts.join('');
  let sum=0n;
  for(const out of outcomes(1)){
   sum+=out.multiplicity*bestOneReroll(entry.card,[...held,...out.dice]);
   report.chanceTerms++;
  }
  const expected=sum*SIX**4n;
  assert.ok(Object.hasOwn(root.actionQNumerators,key),'missing '+key);
  assert.equal(BigInt(root.actionQNumerators[key]),expected,
   'two-reroll Q mismatch split='+split+' seed='+entry.seed+' '+key);
  count++;
 }
 assert.ok(count>0);
 report.checkedRoots++;
 report.checkedHoldActions+=count;
 report.checkedSplits.push({split,seed:entry.seed,checkedHoldActions:count});
}
assert.equal(report.checkedRoots,2);
report.uniqueOneRerollStates=oneRerollCache.size;
report.uniqueLastTurnBoundaryStates=boundaryCache.size;
report.elapsedWallMs=Date.now()-started;
report.parentRssBytes=process.memoryUsage().rss;
writeFileSync('oracle3-iteration32-two-reroll-short-hold-q.json',JSON.stringify(report,null,2)+'\n');
console.log('ORACLE3_ITERATION32='+JSON.stringify(report));
