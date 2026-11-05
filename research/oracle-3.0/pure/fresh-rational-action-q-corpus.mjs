// Oracle 3.0 iteration 24: NEW mathematically labelled action-Q corpus.
// Independent constructed legal scorecards; no production policy or model used.
// Entire scorecard is the atomic partition unit. Locked test never used to fit.
import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {performance} from 'node:perf_hooks';
import {CATEGORIES,rng,initialScorecard,applyScore,score} from '../phase1/simulator.mjs';
import {encodeCard} from '../oracle2/adapter.mjs';
import {createTwoTurnRationalSolver} from './rational-two-rerolls.mjs';
const started=performance.now();
const pools={
 fours:[[4,4,1,2,3],[4,4,4,1,2],[4,4,4,4,1],[4,4,4,4,4]],
 straight:[[2,3,4,5,6],[1,2,3,4,5],[1,1,2,3,4]],
 fives:[[5,5,1,2,3],[5,5,5,2,3],[5,5,5,5,2]],
 sixes:[[6,6,1,2,3],[6,6,6,2,3],[6,6,6,6,3]],
 fullHouse:[[2,2,2,5,5],[4,4,4,6,6],[1,1,1,5,5],[1,2,3,4,5]],
 choice:[[3,3,4,5,5],[4,4,4,6,6],[5,5,5,6,6],[1,2,3,4,5]],
 balut:[[1,1,2,3,4],[3,3,3,3,3],[4,4,4,4,4]]
};
const possible=[[4,4,4,4,4],[1,2,3,4,5],[4,4,1,2,5],[2,3,4,5,6],
 [2,2,3,4,5],[4,4,4,1,2],[4,4,4,4,2],[1,1,2,3,4]];
function makeCard(seed){
 const random=rng(seed);let card=initialScorecard();const witness=[];
 for(const category of CATEGORIES){
  const limit=(category==='fours'||category==='straight')?3:4;
  for(let i=0;i<limit;i++){
   const options=pools[category],dice=options[Math.floor(random()*options.length)];
   const placed=applyScore(card,category,dice);
   assert.equal(placed.value,score(category,dice));
   witness.push({category,dice,value:placed.value,column:placed.column});
   card=placed.card;
  }
 }
 assert.equal(witness.length,26);
 assert.equal(encodeCard(card).remaining,2);
 assert.deepEqual(CATEGORIES.filter(c=>card[c].includes(null)),['fours','straight']);
 return {card,witness,random};
}
const specs=[
 {split:'train',base:992100000,n:18},
 {split:'validation',base:992200000,n:6},
 {split:'locked_test',base:992300000,n:6}
];
const allSeeds=new Set(),counts={};let actions=0,roots=0;
for(const {split,base,n} of specs){
 const cards=[];
 for(let i=0;i<n;i++){
  const seed=base+i;assert.ok(!allSeeds.has(seed));allSeeds.add(seed);
  const {card,witness,random}=makeCard(seed);
  const solver=createTwoTurnRationalSolver(card);
  const first=Math.floor(random()*possible.length);
  const second=(first+1+Math.floor(random()*(possible.length-1)))%possible.length;
  const rootInputs=[{dice:possible[first],rerollsRemaining:1},
   {dice:possible[second],rerollsRemaining:2}];
  const labelledRoots=rootInputs.map(root=>{
   const proof=solver.certify(root.dice,root.rerollsRemaining);
   const q=Object.fromEntries(Object.entries(proof.allActionQ).map(([key,value])=>
    [key,value.numerator]));
   const denominator=proof.denominator;
   const best=BigInt(proof.exactOptimalNumerator);
   assert.ok(Object.values(q).every(v=>BigInt(v)<=best));
   assert.deepEqual(Object.keys(q).filter(k=>BigInt(q[k])===best).sort(),
    [...proof.bestActionKeys].sort());
   actions+=Object.keys(q).length;roots++;
   return {...root,denominator,actionQNumerators:q,
    bestNumerator:best.toString(),bestActionKeys:proof.bestActionKeys,
    strictlyPositiveMarginNumerator:proof.strictlyPositiveMarginNumerator};
  });
  cards.push({seed,card,witness,roots:labelledRoots,proofMetrics:solver.metrics()});
 }
 counts[split]={scorecards:cards.length,roots:cards.length*2,
  actions:cards.reduce((s,c)=>s+c.roots.reduce((a,r)=>a+Object.keys(r.actionQNumerators).length,0),0)};
 writeFileSync('oracle3-action-q-'+split+'.json',
  JSON.stringify({schema:'oracle3-exact-rational-action-q-v1',split,
   modelTrainingAllowed:split==='train',
   modelSelectionAllowed:split==='validation',
   lockedTestForFinalEvaluationOnly:split==='locked_test',
   proofDomain:'two remaining boxes, all legal current actions, full final-turn continuation',
   cards},null,2)+'\n');
}
assert.equal(allSeeds.size,30);
assert.equal(roots,60);
const summary={status:'NEW_FRESH_EXACT_RATIONAL_ACTION_Q_DATASET',
 noProductionOracleDependencies:true,source:'independent legal 26-step mathematical scorecard witnesses',
 scorecardAtomicSplit:true,seedSetsDisjoint:true,
 previousIteration22LockedSeedsDisjoint:true,
 splits:counts,allActions:actions,allRoots:roots,allScorecards:30,
 caveats:['Constructed cards, not natural game-frequency samples',
  'No student trained, selected or tested in this iteration',
  'Exact BigInt 2-turn action-Q only, not 28-turn global optimum'],
 elapsedWallMs:performance.now()-started,node:process.version,parentRssBytes:process.memoryUsage().rss};
writeFileSync('oracle3-action-q-corpus-summary.json',JSON.stringify(summary,null,2)+'\n');
console.log('ORACLE3_ACTION_Q_CORPUS='+JSON.stringify(summary));
