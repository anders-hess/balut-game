// Exact-rational proof that a current score/category choice is optimal
// with 2 turns remaining and NO present rerolls: future 1-turn chance/hold
// optimization is wholly rational, not a numeric continuation estimate.
import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {performance} from 'node:perf_hooks';
import {CATEGORIES,score} from '../phase1/simulator.mjs';
import {exactAtRoll,encodeCard} from '../oracle2/adapter.mjs';
import {coverageSampler,auditWitness} from './coverage-sampler.mjs';
import {exactRationalTwoTurnForcedScore} from './rational-two.mjs';

const start=performance.now(),data=[],seeds=[];
let matchedActions=0,nLastTurnCertificates=0;
const kinds=['threshold','bonus','strike'];
const dieSamples=[[5,5,5,6,6],[4,4,4,6,6],[1,2,3,4,5]];
for(let i=0;i<72&&data.length<3;i++){
 const seed=980400000+i,kind=kinds[i%3];
 const sampled=coverageSampler(seed,{kind});
 const terminal=auditWitness(sampled.witness);
 assert.equal(encodeCard(terminal).remaining,0);
 const state=sampled.roots.find(r=>r.remaining===2&&r.source==='observed');
 assert.equal(encodeCard(state.card).remaining,2);
 const cats=CATEGORIES.filter(c=>state.card[c].includes(null));
 if(cats.length!==2)continue;
 const dice=dieSamples[data.length],root={card:state.card,dice,rollsRemaining:0};
 const tic=performance.now(),proof=exactRationalTwoTurnForcedScore(root);
 const elapsedMs=performance.now()-tic;
 const native=exactAtRoll(root,{cap:500000,timeoutMs:20000});
 assert.equal(native.status,'EXACT_FLOAT64',JSON.stringify(native));
 assert.deepEqual(Object.keys(proof.scoreActions).sort(),Object.keys(native.actions).sort());
 let observedNumerators=[];
 for(const [key,x] of Object.entries(proof.scoreActions)){
  const rational=Number(BigInt(x.numerator))/Number(BigInt(x.denominator));
  assert.ok(Math.abs(rational-native.actions[key])<1e-8,
   'Oracle2 native vs exact rational two-turn Q mismatch '+key);
  observedNumerators.push(BigInt(x.numerator));
  matchedActions++;
  const trace=proof.fullFirstRollWeightedContributions[key];
  assert.equal(trace.length,252);
  let sum=0n;
  for(const v of trace){
   const term=BigInt(v.coefficient)*BigInt(v.exactLastTurnNumerator);
   assert.equal(term,BigInt(v.weightedContribution));
   sum+=term;
  }
  assert.equal(sum,BigInt(x.numerator),'complete first-roll rational expectation proof');
 }
 assert.equal(proof.totalExactLastTurnBellmanCertificates,2*252);
 assert.equal(observedNumerators.reduce((a,b)=>a>b?a:b),BigInt(proof.bestExactNumerator));
 assert.ok(proof.bestActionKeys.every(k=>
   BigInt(proof.scoreActions[k].numerator)===BigInt(proof.bestExactNumerator)));
 assert.ok(Math.abs(Number(BigInt(proof.bestExactNumerator))/Number(BigInt(proof.denominator))-native.value)<1e-8);
 nLastTurnCertificates+=proof.totalExactLastTurnBellmanCertificates;
 seeds.push(seed);
 data.push({seed,kind,card:state.card,dice,categoryScoreOptions:cats,elapsedMs,proof,
   numericNativeOptimal:native.value});
}
assert.equal(data.length,3,'must certify three 2-turn two-category switching scenarios');
const summary={
 status:'EXACT_RATIONAL_CERTIFICATE_CURRENT_CATEGORY_CHOICE_WITH_TWO_TURNS_LEFT',
 nCertifiedTwoTurnRoots:data.length,selectedReachableSeeds:seeds,
 currentRerollsRemaining:0,legalPresentScoringActions:matchedActions,
 totalExactLastTurnSubcertificates:nLastTurnCertificates,
 exactFirstRollOutcomeMultisetsPerCategory:252,
 allFloat64NativeOracle2QParity:true,
 uniqueOptimalChoices:data.filter(x=>x.proof.uniqueBest).length,
 actionDifferences:data.map(x=>({
  seed:x.seed,kind:x.kind,choiceCategories:x.categoryScoreOptions,
  exactActionKeys:x.proof.bestActionKeys,
  expectedFinalBP:Number(BigInt(x.proof.bestExactNumerator))/Number(BigInt(x.proof.denominator)),
  actionMarginBP:Object.values(x.proof.scoreActions).length===2?
   Math.abs(Object.values(x.proof.scoreActions)[0].decimalApprox-Object.values(x.proof.scoreActions)[1].decimalApprox):0
 })),
 wallMs:performance.now()-start,
 averageCertificateMs:data.reduce((s,x)=>s+x.elapsedMs,0)/data.length,
 parentPeakRssBytes:process.memoryUsage().rss,node:process.version,
 limitations:[
  'Mathematical proof covers current score/category choice with NO rerolls and exactly two turns left, not all 2-turn reroll actions',
  'All future 1-turn actions are exact-rational optimal including all chance outcomes; current BigInt action comparisons exact',
  'Created states are legally reachable but deliberately rare and not frequency-weighted',
  'No global 28-turn proof or full-game student performance claim; no legacy production Oracle input'
 ]};
writeFileSync('oracle3-rational-two-turn-choice.json',JSON.stringify({summary,rows:data},null,2)+'\n');
writeFileSync('oracle3-rational-two-turn-summary.json',JSON.stringify(summary,null,2)+'\n');
console.log('ORACLE3_RATIONAL_TWO_TURN='+JSON.stringify(summary));
