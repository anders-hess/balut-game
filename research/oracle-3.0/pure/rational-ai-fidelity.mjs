// Oracle 3.0: frozen independent math-only AI vs exact-rational Q certificates.
// NO training on these certified states and NO advisor code/policy imports.
// All decisions independently recomputed from the mathematically trained
// stage, linear, and neural continuation models under exact one-turn chance.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {performance} from 'node:perf_hooks';
import {readSupervisedModel,predictContinuation} from '../oracle2/model.mjs';
import {exactWithinTurn} from './chance.mjs';
import {actionKey} from '../oracle2/adapter.mjs';

const certificate=process.argv[2]??'math-reference/oracle3-math-two-reroll-nondegenerate.json';
const trainedWeights=process.argv[3]??'math-student/oracle3-math-coverage.weights.json';
const frozenFile=process.argv[4]??'math-student/oracle3-math-coverage.frozen-selection.json';
const reference=JSON.parse(readFileSync(certificate,'utf8'));
const model=readSupervisedModel(trainedWeights);
const frozen=JSON.parse(readFileSync(frozenFile,'utf8'));
assert.equal(frozen.status,'FROZEN_BEFORE_TEST');
assert.equal(frozen.selected,'neural','the older math-only model was frozen independently');
assert.equal(reference.report.nTestPositions,8);
assert.equal(reference.report.exactActionsComparedWithOracle2,134);
const mathStudents=['myopic','stage','linear','neural'];
const rows=[],begin=performance.now();
for(const item of reference.roots){
 const card=reference.card,root={card,dice:item.root.dice,rollsRemaining:item.root.rollsRemaining};
 const truth=item.proof,den=BigInt(truth.denominator),opt=BigInt(truth.exactOptimalNumerator);
 assert.equal(truth.status,'CERTIFIED_EXACT_RATIONAL_TWO_TURN_WITH_REROLLS');
 const decisions={};
 for(const name of mathStudents){
  const cont=name==='myopic'?()=>0:after=>predictContinuation(after,model,name);
  const t=performance.now();
  const chosen=exactWithinTurn(root,cont).action;
  const elapsedMs=performance.now()-t;
  const key=actionKey(chosen,root.dice);
  const q=truth.allActionQ[key];
  assert.ok(q&&q.denominator===truth.denominator,'selected action must exist in exact rational Q map');
  const n=BigInt(q.numerator),loss=opt-n;
  assert.ok(loss>=0n,'negative exact rational regret');
  decisions[name]={actionKey:key,action:chosen,
   exactMathOptimal:loss===0n,
   regretNumerator:loss.toString(),regretDenominator:den.toString(),
   regretBP:Number(loss)/Number(den),inferenceMs:elapsedMs};
 }
 rows.push({dice:root.dice,rerolls:root.rollsRemaining,
  exactProofOptimalKeys:truth.bestActionKeys,truthBestBP:truth.optimalDecimalApprox,
  exactRationalDenominator:truth.denominator,decisions});
}
function mean(x){return x.reduce((a,b)=>a+b,0)/x.length;}
const stats=Object.fromEntries(mathStudents.map(name=>{
 const x=rows.map(r=>r.decisions[name]);
 return [name,{nCertifiedPositions:x.length,mathematicallyOptimalSelections:x.filter(v=>v.exactMathOptimal).length,
  meanExactRationalRegretBP:mean(x.map(v=>v.regretBP)),
  maximumExactRationalRegretBP:Math.max(...x.map(v=>v.regretBP)),
  meanInferenceMs:mean(x.map(v=>v.inferenceMs)),
  p95InferenceMs:x.map(v=>v.inferenceMs).sort((a,b)=>a-b)[Math.floor(.95*(x.length-1))],
  scoreSelections:x.filter(v=>v.action.type==='score').length,
  holdSelections:x.filter(v=>v.action.type==='hold').length}];
}));
const report={
 status:'FROZEN_ORACLE3_PURE_MATH_AI_VS_INDEPENDENT_EXACT_RATIONAL_CERTIFICATES',
 trainedModelProvenance:'Research-only Oracle3 iteration16, numeric Bellman V* labels generated from independent legal rare bonus/threshold/scratch games',
 sourceTrainingRun:'https://github.com/anders-hess/balut-game/actions/runs/41897820339',
 certifiedTeacherProvenance:'Independent mathematical BigInt 2-turn full Bellman all-actions proof; Native Oracle2 crosscheck; independently reimplemented in Python',
 sourceRationalRun:'https://github.com/anders-hess/balut-game/actions/runs/41914403880',
 modelFrozenBeforeNewProof:true,modelNotUpdatedByTest:true,
 certifiedRoots:rows.length,nIndependentScorecards:1,
 candidateAbstraction:'same mathematically exact within-turn multinomial expectimax, with different independently trained mathematical future continuation estimates',
 proofScope:'exact integer-rational expected final Big Points for all legal hold and score actions with two remaining turns',
 metrics:stats,frozenSelectedPolicy:frozen.selected,
 selectedMathModel:stats[frozen.selected],
 wallMs:performance.now()-begin,parentRssBytes:process.memoryUsage().rss,node:process.version,
 caveats:[
  'Eight roll states from ONE deliberately constructed positive-probability game scorecard; no population confidence interval or general gameplay claim',
  'The frozen model was trained only on independent mathematical Oracle2 V* labels, never any legacy advisor behaviour',
  'A learned value approximation can choose an action not proven optimal even though exact within-turn probability is complete',
  'The finite two-turn exact-rational teacher proof does not prove global 28-turn optimality or final game score improvement',
  'No deployment or live/main branch changes'
 ]};
writeFileSync('oracle3-rational-ai-fidelity.json',JSON.stringify({report,rows},null,2)+'\n');
writeFileSync('oracle3-rational-ai-fidelity-summary.json',JSON.stringify(report,null,2)+'\n');
console.log('ORACLE3_RATIONAL_AI_FIDELITY='+JSON.stringify(report));
