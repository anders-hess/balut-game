// Oracle 3.0 iteration 28: independent pairwise mathematical action-Q ranking ablation.
// No locked-test reads, production Oracle, or legacy training policy.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {rows,dot,predict,evaluate} from './direct-action-q-student.mjs';
const read=split=>JSON.parse(readFileSync('oracle3-action-q-'+split+'.json','utf8'));
const tr=read('train'),va=read('validation');
assert.equal(tr.modelTrainingAllowed,true);
assert.equal(va.modelTrainingAllowed,false);
assert.equal(va.modelSelectionAllowed,true);
const training=rows(tr),validation=rows(va);
assert.equal(training.length,36);assert.equal(validation.length,12);
const old=JSON.parse(readFileSync('oracle3-direct-action-q-student-validation.json','utf8'));
assert.equal(old.lockedTestRead,false);
assert.equal(old.weights.length,55);
const oldValid=evaluate(old.weights,validation);
assert.ok(Math.abs(oldValid.meanRegret-old.validation.meanRegret)<1e-9);
const D=55;
const experiments=[];
for(const lr of [0.0001,0.0005,0.002]){
 for(const marginScale of [0.25,1]){
  const w=Array(D).fill(0);
  for(let epoch=0;epoch<180;epoch++){
   for(const root of training){
    const optimal=root.actions.filter(a=>a.regret<1e-12);
    assert.ok(optimal.length);
    const teacher=optimal[0];
    const grad=Array(D).fill(0);
    let comparisons=0;
    for(const a of root.actions){
     if(a.regret<1e-12)continue;
     // Want predicted regret(a) - predicted regret(optimum) >= positive target.
     const target=Math.min(2,a.regret)*marginScale;
     const delta=a.x.map((v,i)=>v-teacher.x[i]);
     const violation=target-dot(w,delta);
     if(violation<=0)continue;
     for(let j=0;j<D;j++)grad[j]-=delta[j]*Math.min(violation,2);
     comparisons++;
    }
    if(comparisons)for(let j=0;j<D;j++)w[j]-=lr*(grad[j]/comparisons+0.0001*w[j]);
   }
  }
  experiments.push({lr,marginScale,w,train:evaluate(w,training),validation:evaluate(w,validation)});
 }
}
experiments.sort((a,b)=>a.validation.meanRegret-b.validation.meanRegret||
 b.validation.optimal-a.validation.optimal||a.lr-b.lr);
const best=experiments[0];
const result={status:'VALIDATION_ONLY_PAIRWISE_EXACT_Q_RANKING_ABLATION',
 mathematicalTeacher:'BigInt exact-rational two-turn Bellman',
 trainScorecards:18,validationScorecards:6,lockedTestRead:false,
 oldLinear:{train:evaluate(old.weights,training),validation:oldValid},
 selected:{lr:best.lr,marginScale:best.marginScale,train:best.train,validation:best.validation},
 validationMeanRegretDeltaVsLinear:best.validation.meanRegret-oldValid.meanRegret,
 candidates:experiments.map(x=>({lr:x.lr,marginScale:x.marginScale,train:x.train,validation:x.validation})),
 selectedWeights:best.w,
 limitations:['Validation used for selecting six hyperparameter pairs; not a holdout estimate',
 'Only six validation scorecards; no 95% CI or generalization claim',
 'Two remaining turns and fixed Fours/Straight categories only',
 'Never read or tuned on locked-test corpus','No 28-turn optimality claim']};
writeFileSync('oracle3-pairwise-q-validation.json',JSON.stringify(result,null,2)+'\n');
console.log('ORACLE3_PAIRWISE_Q_VALIDATION='+JSON.stringify({...result,selectedWeights:'omitted'}));
