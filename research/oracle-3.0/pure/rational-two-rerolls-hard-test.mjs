// A NON-DEGENERATE two-turn proof: all 28-score category entries have legal
// fair-dice outcomes; precisely Fours and Straight remain, with both their
// Big Points thresholds in play. No old advisor scorecard generation.
import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {performance} from 'node:perf_hooks';
import {CATEGORIES,initialScorecard,applyScore,totals,score} from '../phase1/simulator.mjs';
import {encodeCard,exactAtRoll,actionKey} from '../oracle2/adapter.mjs';
import {createTwoTurnRationalSolver} from './rational-two-rerolls.mjs';
import {exactRationalLastBoundaryMemo} from './rational-boundary-memo.mjs';

const targets=[
 ['fours',[4,4,4,1,2],3],
 ['straight',[2,3,4,5,6],3],
 ['fives',[5,5,5,2,3],4],
 ['sixes',[6,6,6,2,3],4],
 ['fullHouse',[2,2,2,5,5],4],
 ['choice',[3,3,4,5,5],4],
 ['balut',[1,1,2,3,4],4]
];
let card=initialScorecard(),witness=[];
for(const [category,dice,count] of targets){
 for(let i=0;i<count;i++){
  const after=applyScore(card,category,dice);
  assert.equal(after.value,score(category,dice));
  witness.push({category,dice,value:after.value,column:after.column});
  card=after.card;
 }
}
assert.equal(witness.length,26);
assert.equal(encodeCard(card).remaining,2);
assert.deepEqual(CATEGORIES.filter(c=>card[c].includes(null)),['fours','straight']);
assert.equal(totals(card).small,372);
assert.equal(totals(card).big,3);
assert.equal(card.fours.reduce((a,v)=>a+(v??0),0),36);
assert.equal(card.straight.filter(v=>v!==null&&v>0).length,3);

const started=performance.now();
const solver=createTwoTurnRationalSolver(card);
const tests=[
 {dice:[4,4,4,4,4],rollsRemaining:0},
 {dice:[4,4,4,4,4],rollsRemaining:1},
 {dice:[4,4,4,4,4],rollsRemaining:2},
 {dice:[1,2,3,4,5],rollsRemaining:0},
 {dice:[1,2,3,4,5],rollsRemaining:1},
 {dice:[1,2,3,4,5],rollsRemaining:2},
 {dice:[4,4,1,2,5],rollsRemaining:1},
 {dice:[4,4,1,2,5],rollsRemaining:2}
];
let legalQ=0,uniqueOptima=0,holdOptimal=0,scoreOptimal=0,nonzeroMargins=0;
const roots=[];
for(const root of tests){
 const t=performance.now();
 const p=solver.certify(root.dice,root.rollsRemaining);
 const elapsedMs=performance.now()-t;
 const ref=exactAtRoll({...root,card},{cap:500000,timeoutMs:20000});
 assert.equal(ref.status,'EXACT_FLOAT64','native C++ differential: '+JSON.stringify(ref));
 assert.equal(p.denominator,(6n**BigInt(15+5*root.rollsRemaining)).toString());
 assert.equal(Object.keys(p.allActionQ).length,Object.keys(ref.actions).length);
 let max=null,keys=[];
 for(const [key,nativeQ] of Object.entries(ref.actions)){
  const q=p.allActionQ[key];assert.ok(q,'exact action missing: '+key);
  const n=BigInt(q.numerator);legalQ++;
  const approx=Number(n)/Number(BigInt(q.denominator));
  assert.ok(Math.abs(approx-nativeQ)<1e-8,
   'native numeric vs rational action '+key+': '+approx+' vs '+nativeQ);
  if(max===null||n>max){max=n;keys=[key];}
  else if(n===max)keys.push(key);
 }
 assert.equal(max,BigInt(p.exactOptimalNumerator));
 assert.deepEqual(new Set(keys),new Set(p.bestActionKeys));
 assert.ok(Math.abs(p.optimalDecimalApprox-ref.value)<1e-8);
 assert.ok(p.bestActionKeys.includes(actionKey(p.chosen,root.dice)));
 if(p.exactUniqueBest)uniqueOptima++;
 if(p.bestActionKeys.some(k=>k.startsWith('hold:')))holdOptimal++;
 if(p.bestActionKeys.some(k=>k.startsWith('score:')))scoreOptimal++;
 if(p.strictlyPositiveMarginNumerator!==null&&BigInt(p.strictlyPositiveMarginNumerator)>0n)nonzeroMargins++;
 roots.push({root,proof:p,nativeNumericExpectedFinalBP:ref.value,caseMs:elapsedMs});
}
const stats=solver.metrics();
assert.equal(stats.uniqueAfterScoreStates,9);
assert.equal(stats.exactOneTurnSubcertificates,9*252);
assert.ok(nonzeroMargins>=5,'reward-rich state must have real action margins');
assert.ok(uniqueOptima>=2,'must actually distinguish optimal choices mathematically');
assert.ok(holdOptimal>0,'must certify at least one optimal reroll');
assert.ok(scoreOptimal>0,'must certify at least one optimal immediate category score');
const report={
 status:'CERTIFIED_EXACT_RATIONAL_TWO_TURN_ALL_HOLDS_NONDEGENERATE',
 nTestPositions:roots.length,nWitnessScores:26,
 independentDesignedState:'Four-or-Straight bonus decision with 372 Small Points and both category bonuses unresolved',
 currentSmallPoints:totals(card).small,currentBigPoints:totals(card).big,
 activeCategories:['fours','straight'],
 exactActionsComparedWithOracle2:legalQ,
 uniquelyOptimalRoots:uniqueOptima,rootsWithOptimalHold:holdOptimal,
 rootsWithOptimalScore:scoreOptimal,positiveGapRoots:nonzeroMargins,
 sharedDenominators:'6^(15+5*r), r=0..2',
 continuationScorecardCacheCount:stats.uniqueAfterScoreStates,
 lastTurnInitialRollProofBranches:stats.exactOneTurnSubcertificates,
 currentRerollMemoStates:stats.memoStates,
 rootChoices:roots.map(x=>({dice:x.root.dice,rerollsRemaining:x.root.rollsRemaining,
  bestActions:x.proof.bestActionKeys,expectedFinalBP:x.proof.optimalDecimalApprox,
  gapNumerator:x.proof.strictlyPositiveMarginNumerator,
  exactDenominator:x.proof.denominator,legalActions:x.proof.nLegalActions,
  caseMs:x.caseMs})),
 exactNativeOracle2AllActionParity:true,
 wallMs:performance.now()-started,parentRssBytes:process.memoryUsage().rss,
 node:process.version,
 limitations:[
  'One deliberately designed and legally reachable scorecard, 8 selected roll states, not a random game population',
  'Mathematical proof covers all legal actions with 2 turns left and r=0,1,2 rerolls; not 3–28 turns',
  'Exact rational comparisons rely on tested scoring rules and fair independent dice, not proof assistant verification',
  'No production advisor input, no copied training policy, no live changes'
 ]
};
writeFileSync('oracle3-math-two-reroll-nondegenerate.json',JSON.stringify({report,witness,card,roots},null,2)+'\n');
writeFileSync('oracle3-math-two-reroll-nondegenerate-summary.json',JSON.stringify(report,null,2)+'\n');
console.log('ORACLE3_RATIONAL_TWO_TURN_HARD='+JSON.stringify(report));
