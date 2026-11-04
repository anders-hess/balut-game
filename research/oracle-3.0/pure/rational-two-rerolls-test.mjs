// Independent finite-domain test of fully exact two-turn rational Bellman.
// The 26 scored turns are explicitly replayed, each five-die result having
// strictly positive probability; NO legacy advisor trajectory/model is used.
import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {performance} from 'node:perf_hooks';
import {CATEGORIES,initialScorecard,score,applyScore,totals} from '../phase1/simulator.mjs';
import {encodeCard,exactAtRoll,actionKey} from '../oracle2/adapter.mjs';
import {coverageSampler} from './coverage-sampler.mjs';
import {createTwoTurnRationalSolver} from './rational-two-rerolls.mjs';

const seed=990500000,source=coverageSampler(seed,{kind:'bonus'});
const drop=new Set();
for(const c of ['fours','straight']){
 const ix=source.witness.map(w=>w.category).lastIndexOf(c);
 assert.ok(ix>=0);drop.add(ix);
}
assert.equal(drop.size,2);
let card=initialScorecard(),witness=[];
for(const [i,w] of source.witness.entries()){
 if(drop.has(i))continue;
 const out=applyScore(card,w.category,w.dice);
 assert.equal(out.value,w.value);
 assert.equal(out.column,w.column);
 card=out.card;
 witness.push(w);
}
assert.equal(witness.length,26);
assert.equal(encodeCard(card).remaining,2);
assert.deepEqual(CATEGORIES.filter(c=>card[c].includes(null)).sort(),['fours','straight']);
const started=performance.now(),solver=createTwoTurnRationalSolver(card);
const cases=[
 {dice:[4,4,4,4,4],rerolls:0},
 {dice:[4,4,4,4,4],rerolls:1},
 {dice:[4,4,4,4,4],rerolls:2},
 {dice:[1,2,3,4,5],rerolls:1},
 {dice:[1,2,3,4,5],rerolls:2}
];
const rows=[],issues=[];let actionQComparisons=0,uniqueOptimal=0;
for(const item of cases){
 const root={card,dice:item.dice,rollsRemaining:item.rerolls};
 const t=performance.now();
 const proof=solver.certify(root.dice,root.rollsRemaining);
 const elapsedMs=performance.now()-t;
 assert.equal(proof.status,'CERTIFIED_EXACT_RATIONAL_TWO_TURN_WITH_REROLLS');
 assert.equal(proof.denominator,(6n**BigInt(15+5*root.rollsRemaining)).toString());
 const native=exactAtRoll(root,{cap:500000,timeoutMs:20000});
 assert.equal(native.status,'EXACT_FLOAT64','native reference failed '+JSON.stringify(native));
 assert.equal(Object.keys(proof.allActionQ).length,Object.keys(native.actions).length,
  'Native vs exact rational legal action domain mismatch');
 for(const [key,nativeQ] of Object.entries(native.actions)){
  const rational=proof.allActionQ[key];
  assert.ok(rational,'Missing exact rational legal action '+key);
  const value=Number(BigInt(rational.numerator))/Number(BigInt(rational.denominator));
  const diff=Math.abs(value-nativeQ);
  assert.ok(diff<1e-8,'Oracle2 float and exact rational mismatch '+key+
   ': '+value+' vs '+nativeQ+', diff '+diff);
  actionQComparisons++;
 }
 assert.ok(Math.abs(proof.optimalDecimalApprox-native.value)<1e-8);
 assert.ok(proof.bestActionKeys.includes(actionKey(proof.chosen,root.dice)));
 uniqueOptimal+=+(proof.exactUniqueBest);
 rows.push({root:{dice:item.dice,rerolls:item.rerolls},elapsedMs,proof,
  nativeFloat:{optimalFinalBP:native.value,numStates:native.states,
   nativeSeconds:native.seconds}});
 // Each root is self-contained: every Q numerator is over the same EXACT
 // denominator, so recompute argmax and strict margin independently here.
 const p=Object.entries(proof.allActionQ).map(([key,val])=>({
  key,n:BigInt(val.numerator)}));
 const best=p.reduce((m,x)=>x.n>m?x.n:m,p[0].n);
 assert.equal(best,BigInt(proof.exactOptimalNumerator));
 assert.deepEqual(p.filter(x=>x.n===best).map(x=>x.key),proof.bestActionKeys);
 const rivals=p.filter(x=>x.n<best).map(x=>x.n);
 const runnerUp=rivals.length?rivals.reduce((m,x)=>x>m?x:m):null;
 assert.equal(proof.strictlyPositiveMarginNumerator,runnerUp===null?null:(best-runnerUp).toString());
 if(root.rollsRemaining>0)assert.ok(p.some(x=>x.key.startsWith('hold:')),'must certify holds and scoring');
}
const stats=solver.metrics();
assert.ok(stats.exactOneTurnSubcertificates>1000,'full exact last-turn chance coverage required');
assert.ok(stats.uniqueAfterScoreStates>=7&&stats.uniqueAfterScoreStates<=12,
 'mathematical quotient caching was ineffective or incomplete');
const summary={
 status:'CERTIFIED_EXACT_RATIONAL_TWO_TURN_ALL_CURRENT_HOLDS_AND_SCORING',
 mathematicalProofScope:'Two category slots remain, 0/1/2 current rerolls, full last turn optimal',
 legalWitnessScoredTurns:26,sourceSeed:seed,
 availableCategories:solver.availableCategories,
 exactRationalQRoots:rows.length,exactRationalLegalActionQ:actionQComparisons,
 uniqueOptimalRoots:uniqueOptimal,ties:rows.length-uniqueOptimal,
 independentNativeOracle2QParity:true,
 sharedDenominator:'6^(15+5*current rerolls)',
 afterScoreStatesCached:stats.uniqueAfterScoreStates,
 exactLastTurnProofsReused:stats.exactOneTurnSubcertificates,
 memoizedCurrentRollDiceStates:stats.memoStates,
 resultChoices:rows.map(x=>({dice:x.root.dice,rerolls:x.root.rerolls,
  bestActionKeys:x.proof.bestActionKeys,
  optimalExpectedFinalBP:x.proof.optimalDecimalApprox,
  exactGapNumerator:x.proof.strictlyPositiveMarginNumerator,
  exactDenominator:x.proof.denominator,
  actions:x.proof.nLegalActions,caseWallMs:x.elapsedMs})),
 wallMs:performance.now()-started,
 parentPeakRssBytes:process.memoryUsage().rss,node:process.version,
 limitations:[
  'The proof is finite-horizon for two remaining score slots and up to 2 rerolls; not 3–28 remaining turns',
  'Constructed, lawful witness has strictly positive but generally tiny probability in a natural game',
  'All integer numerator Q comparisons exact, but the Balut scoring implementation is validated by tests not a formal proof assistant',
  'Native Oracle2 float Q is a separate differential check, not the source of integer optimum',
  'No copied advisor-policy dataset and no external decision fallback'
 ]};
writeFileSync('oracle3-rational-rerolls-two-turn.json',JSON.stringify({summary,witness,card,rows},null,2)+'\n');
writeFileSync('oracle3-rational-rerolls-two-turn-summary.json',JSON.stringify(summary,null,2)+'\n');
console.log('ORACLE3_TWO_TURN_RATIONAL_REROLLS='+JSON.stringify(summary));
