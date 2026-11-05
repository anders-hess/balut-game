// Iteration 31: independently reconstruct every HOLD Q at r=1 on TRAIN+VALIDATION.
// Uses its own multinomial generator and legal-hold enumerator, not the
// original two-turn solver's hold transition / memoization code.
// Reuses exact last-turn boundary (explicit limitation).
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {CATEGORIES,score,applyScore} from '../phase1/simulator.mjs';
import {exactRationalLastBoundaryMemo} from './rational-boundary-memo.mjs';
const started=Date.now(), SIX=6n, LAST_DEN=SIX**15n;
const factorial=[1n,1n,2n,6n,24n,120n];
const chance=new Map();
function outcomes(k){
 if(chance.has(k))return chance.get(k);
 const result=[];
 function visit(face,left,counts){
  if(face===6){
   if(left!==0)return;
   const dice=counts.flatMap((n,i)=>Array(n).fill(i+1));
   const multiplicity=factorial[k]/counts.reduce((p,n)=>p*factorial[n],1n);
   result.push({dice,multiplicity});return;
  }
  for(let n=0;n<=left;n++)visit(face+1,left-n,[...counts,n]);
 }
 visit(0,k,[]);
 assert.equal(result.reduce((s,x)=>s+x.multiplicity,0n),SIX**BigInt(k));
 chance.set(k,result);return result;
}
const boundaryCache=new Map();
function boundary(card){
 const key=JSON.stringify(card);
 if(!boundaryCache.has(key)){
  const proof=exactRationalLastBoundaryMemo(card);
  assert.equal(BigInt(proof.denominator),LAST_DEN);
  boundaryCache.set(key,BigInt(proof.numerator));
 }
 return boundaryCache.get(key);
}
function bestImmediate(card,dice){
 let best=null;
 for(const cat of CATEGORIES)if(card[cat].includes(null)){
  const next=applyScore(card,cat,dice).card;
  const q=boundary(next);
  if(best===null||q>best)best=q;
 }
 assert.notEqual(best,null);return best;
}
const report={status:'INDEPENDENT_ONE_REROLL_HOLD_Q_AUDIT',
 scope:'All hold actions on all train+validation roots with exactly one reroll',
 lockedTestRead:false,modelFitPerformed:false,
 checkedRoots:0,checkedHoldActions:0,weightedChanceTerms:0,
 splitCounts:{},limitations:[
  'Shares the exact one-turn boundary evaluator with the teacher; not independent full Bellman',
  'Only one-reroll roots; two-reroll hold Q remains unaudited',
  'No locked test, no 3+ turn certificate, no 28-turn optimality proof']};
for(const split of ['train','validation']){
 const dataset=JSON.parse(readFileSync('oracle3-action-q-'+split+'.json','utf8'));
 let roots=0,holds=0;
 for(const entry of dataset.cards){
  for(const root of entry.roots){
   if(root.rerollsRemaining!==1)continue;
   assert.equal(BigInt(root.denominator),SIX**20n);
   const available=Array.from({length:6},(_,i)=>root.dice.filter(d=>d===i+1).length);
   const expected=new Map();
   function enumerate(face,held){
    if(face===6){
     const h=held.reduce((s,x)=>s+x,0);
     if(h===5)return;
     const heldDice=held.flatMap((n,i)=>Array(n).fill(i+1));
     const k=5-h;
     let sum=0n;
     for(const out of outcomes(k)){
      sum+=out.multiplicity*bestImmediate(entry.card,[...heldDice,...out.dice]);
      report.weightedChanceTerms++;
     }
     const key='hold:'+held.join('');
     expected.set(key,sum*(SIX**BigInt(h)));
     return;
    }
    for(let n=0;n<=available[face];n++)enumerate(face+1,[...held,n]);
   }
   enumerate(0,[]);
   const stored=Object.entries(root.actionQNumerators).filter(([key])=>key.startsWith('hold:'));
   assert.equal(stored.length,expected.size,'hold action set mismatch seed='+entry.seed);
   for(const [key,num] of stored){
    assert.ok(expected.has(key),'unknown hold '+key);
    assert.equal(BigInt(num),expected.get(key),'Q mismatch seed='+entry.seed+' key='+key);
    holds++;
   }
   roots++;
  }
 }
 report.splitCounts[split]={roots,holdActions:holds};
 report.checkedRoots+=roots;report.checkedHoldActions+=holds;
}
assert.equal(report.checkedRoots,24);
assert.ok(report.checkedHoldActions>0);
report.uniqueLastTurnBoundaryStates=boundaryCache.size;
report.elapsedWallMs=Date.now()-started;
report.parentRssBytes=process.memoryUsage().rss;
writeFileSync('oracle3-iteration31-independent-hold-q.json',JSON.stringify(report,null,2)+'\n');
console.log('ORACLE3_ITERATION31='+JSON.stringify(report));
