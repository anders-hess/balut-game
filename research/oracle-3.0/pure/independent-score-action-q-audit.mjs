// Iteration 30: independent score-action identity audit, train + validation only.
// Recomputes score-action Q from post-score last-turn boundary, independently of
// the two-turn root action enumeration. Does NOT certify hold-action Q values.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {CATEGORIES,score,applyScore} from '../phase1/simulator.mjs';
import {encodeCard} from '../oracle2/adapter.mjs';
import {exactRationalLastBoundaryMemo} from './rational-boundary-memo.mjs';
const SIX=6n;
const boundaryCache=new Map();
const report={status:'PARTIAL_INDEPENDENT_SCORE_ACTION_Q_AUDIT',splits:{},
 checkedScoreActions:0,checkedRoots:0,uniqueBoundaryProofs:0,
 lockedTestRead:false,modelFitPerformed:false,
 scope:'Score actions on train and validation roots only; exact BigInt Q identity',
 limitations:['Reuses the same exact last-turn boundary implementation as the original solver; not a fully independent Bellman implementation',
 'Does not independently recompute hold-action Q or certify global action optimality',
 'Locked test remains untouched; no 3+ turn or 28-turn proof']};
for(const split of ['train','validation']){
 const data=JSON.parse(readFileSync('oracle3-action-q-'+split+'.json','utf8'));
 assert.equal(data.split,split);
 let roots=0,actions=0;
 for(const cardEntry of data.cards){
  assert.equal(encodeCard(cardEntry.card).remaining,2);
  for(const root of cardEntry.roots){
   const den=BigInt(root.denominator);
   const scale=SIX**BigInt(5*root.rerollsRemaining);
   assert.equal(den,(SIX**15n)*scale);
   const open=CATEGORIES.filter(c=>cardEntry.card[c].includes(null));
   for(const category of open){
    const value=score(category,root.dice);
    const key='score:'+CATEGORIES.indexOf(category)+':'+value;
    assert.ok(Object.hasOwn(root.actionQNumerators,key),'missing '+key);
    const after=applyScore(cardEntry.card,category,root.dice).card;
    assert.equal(encodeCard(after).remaining,1);
    const afterKey=JSON.stringify(after);
    let proof=boundaryCache.get(afterKey);
    if(!proof){proof=exactRationalLastBoundaryMemo(after);boundaryCache.set(afterKey,proof);}
    assert.equal(BigInt(proof.denominator),SIX**15n);
    const expected=BigInt(proof.numerator)*scale;
    const actual=BigInt(root.actionQNumerators[key]);
    assert.equal(actual,expected,'score Q mismatch seed='+cardEntry.seed+' action='+key);
    assert.ok(actual<=BigInt(root.bestNumerator));
    actions++;
   }
   roots++;
  }
 }
 report.splits[split]={scorecards:data.cards.length,roots,checkedScoreActions:actions};
 report.checkedScoreActions+=actions;
 report.checkedRoots+=roots;
}
report.uniqueBoundaryProofs=boundaryCache.size;
assert.equal(report.checkedRoots,48);
assert.equal(report.checkedScoreActions,96);
writeFileSync('oracle3-iteration30-score-action-q-audit.json',JSON.stringify(report,null,2)+'\n');
console.log('ORACLE3_ITERATION30='+JSON.stringify(report));
