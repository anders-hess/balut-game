// Oracle3 independently trained mathematical AI against exact RATIONAL
// 2-turn Bellman optimum across 48 DIFFERENT legally constructed scorecards.
// No production Oracle, no imitation, no model tuning on these test states.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {performance} from 'node:perf_hooks';
import {CATEGORIES,rng,initialScorecard,applyScore,totals,score} from '../phase1/simulator.mjs';
import {encodeCard,actionKey,exactAtRoll} from '../oracle2/adapter.mjs';
import {readSupervisedModel,predictContinuation} from '../oracle2/model.mjs';
import {exactWithinTurn} from './chance.mjs';
import {createTwoTurnRationalSolver} from './rational-two-rerolls.mjs';

const model=readSupervisedModel(process.argv[2]??'math-student/oracle3-math-coverage.weights.json');
const frozen=JSON.parse(readFileSync(process.argv[3]??'math-student/oracle3-math-coverage.frozen-selection.json','utf8'));
assert.equal(frozen.status,'FROZEN_BEFORE_TEST');
assert.equal(frozen.selected,'neural');
const t0=performance.now();
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
function scorecard(seed){
 const random=rng(seed),cardSeed=seed;
 let card=initialScorecard();const witness=[];
 for(const category of CATEGORIES){
  const limit=(category==='fours'||category==='straight')?3:4;
  for(let i=0;i<limit;i++){
   const draws=pools[category],dice=draws[Math.floor(random()*draws.length)];
   const placed=applyScore(card,category,dice);
   assert.equal(placed.value,score(category,dice));
   witness.push({category,dice,value:placed.value,column:placed.column});
   card=placed.card;
  }
 }
 assert.equal(witness.length,26);
 assert.equal(encodeCard(card).remaining,2);
 assert.deepEqual(CATEGORIES.filter(c=>card[c].includes(null)),['fours','straight']);
 return {card,witness,rand:random};
}
const seedBase=991000000,games=48,students=['myopic','stage','linear','neural'];
let allQ=0,exactRootCount=0;
const results=[];
for(let i=0;i<games;i++){
 const seed=seedBase+i,{card,witness,rand}=scorecard(seed),solver=createTwoTurnRationalSolver(card);
 const p=Math.floor(rand()*possible.length),second=(p+1+Math.floor(rand()*(possible.length-1)))%possible.length;
 const roots=[{dice:possible[p],rollsRemaining:1},{dice:possible[second],rollsRemaining:2}];
 const out=[];
 for(const root of roots){
  const proof=solver.certify(root.dice,root.rollsRemaining),den=BigInt(proof.denominator),opt=BigInt(proof.exactOptimalNumerator);
  const native=exactAtRoll({card,dice:root.dice,rollsRemaining:root.rollsRemaining},{cap:500000,timeoutMs:20000});
  assert.equal(native.status,'EXACT_FLOAT64',JSON.stringify(native));
  assert.equal(Object.keys(native.actions).length,Object.keys(proof.allActionQ).length);
  for(const [key,q] of Object.entries(proof.allActionQ)){
   assert.ok(Number.isFinite(native.actions[key]),'native missing action '+key);
   const estimated=Number(BigInt(q.numerator))/Number(den);
   assert.ok(Math.abs(native.actions[key]-estimated)<1e-8,'all-action native rational mismatch');
   allQ++;
  }
  exactRootCount++;
  const dec={};
  for(const name of students){
   const cont=name==='myopic'?()=>0:after=>predictContinuation(after,model,name);
   const tic=performance.now();
   const chosen=exactWithinTurn({card,dice:root.dice,rollsRemaining:root.rollsRemaining},cont).action;
   const inferenceMs=performance.now()-tic;
   const key=actionKey(chosen,root.dice),q=proof.allActionQ[key];
   assert.ok(q,'math student action not legal: '+key);
   const loss=opt-BigInt(q.numerator);
   assert.ok(loss>=0n,'invalid exact rational regret');
   dec[name]={key,action:chosen,optimal:loss===0n,
    regretBP:Number(loss)/Number(den),regretNumerator:loss.toString(),inferenceMs};
  }
  out.push({dice:root.dice,rerollsRemaining:root.rollsRemaining,
   exactBestKeys:proof.bestActionKeys,exactBestNumerator:proof.exactOptimalNumerator,
   exactDenominator:proof.denominator,
   regretSpanBP:(Math.max(...Object.values(proof.allActionQ).map(q=>Number(opt-BigInt(q.numerator))))/Number(den)),
   rootProof:proof,mathStudents:dec});
 }
 results.push({seed,currentBP:totals(card).big,currentSP:totals(card).small,
  witness,card,roots:out,subcertificates:solver.metrics()});
}
function avg(a){return a.reduce((x,y)=>x+y,0)/a.length;}
const groupDiffs=[],testRows=results.flatMap(g=>g.roots.map(r=>({seed:g.seed,dec:r.mathStudents,span:r.regretSpanBP})));
const stat=Object.fromEntries(students.map(name=>[name,{
 positions:testRows.length,independentScorecards:games,
 optimalActions:testRows.filter(x=>x.dec[name].optimal).length,
 meanExactQRegretBP:avg(testRows.map(x=>x.dec[name].regretBP)),
 medianExactQRegretBP:testRows.map(x=>x.dec[name].regretBP).sort((a,b)=>a-b)[Math.floor(testRows.length/2)],
 maxExactQRegretBP:Math.max(...testRows.map(x=>x.dec[name].regretBP)),
 averageInferenceMs:avg(testRows.map(x=>x.dec[name].inferenceMs))
}]));
let seed=0x413ad988;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/2**32;};
for(const g of results)groupDiffs.push(avg(g.roots.map(r=>r.mathStudents.neural.regretBP-r.mathStudents.myopic.regretBP)));
const boot=[];
for(let b=0;b<10000;b++){
 let sum=0;for(let j=0;j<games;j++)sum+=groupDiffs[Math.floor(random()*games)];
 boot.push(sum/games);
}
boot.sort((a,b)=>a-b);
const report={
 status:'FROZEN_PURE_MATH_NEURAL_VS_PROVEN_TWO_TURN_Q_MULTICARD',
 nIndependentMathematicallyReachableScorecards:games,nExactRationalRootDecisions:exactRootCount,
 nCertifiedLegalActionQ:allQ,oldAdvisorDependencies:0,
 completeProofScope:'2 remaining score boxes, all score and hold actions with 1 or 2 current rerolls',
 scorecardsAreDesignedNotFrequencyWeighted:true,
 modelIsFrozenBeforeCertification:true,modelNotRetrainedOrTuned:true,
 seedBase,seedEnd:seedBase+games-1,
 scorecardBeforeSP:{min:Math.min(...results.map(g=>g.currentSP)),max:Math.max(...results.map(g=>g.currentSP)),mean:avg(results.map(g=>g.currentSP))},
 proofWithNonzeroActionQSpread:testRows.filter(x=>x.span>1e-8).length,
 mathStudentMetrics:stat,
 neuralMinusMyopicGameMeanQRegretBP:avg(groupDiffs),
 neuralMinusMyopicGameBootstrapCI95:[boot[249],boot[9749]],
 fullGameScoreClaim:false,
 wallMs:performance.now()-t0,parentRssBytes:process.memoryUsage().rss,node:process.version,
 limitations:[
  'Cards intentionally mathematically constructed with positive-probability dice; distribution is not actual natural play',
  'Each seed defines an independent constructed scorecard, with two correlated dice examples; bootstrap clusters by scorecard',
  'A prior trained math-only student is frozen and evaluated: no training on these certified rational labels',
  'Exact BigInt teacher confirms up to 2 turns only; no global 28-turn optimum theorem or observed final-game BP effect'
 ]};
writeFileSync('oracle3-rational-multicard-fidelity.json',JSON.stringify({report,results},null,2)+'\n');
writeFileSync('oracle3-rational-multicard-summary.json',JSON.stringify(report,null,2)+'\n');
console.log('ORACLE3_RATIONAL_MULTICARD_FIDELITY='+JSON.stringify(report));
