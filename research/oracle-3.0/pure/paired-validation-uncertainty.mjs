// Iteration 29: independent, exhaustive scorecard-cluster paired validation uncertainty.
// No locked test reads, production Oracle, model fitting or selection.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
const read=p=>JSON.parse(readFileSync(p,'utf8'));
const corpus=read('oracle3-action-q-validation.json');
const linear=read('oracle3-direct-action-q-student-validation.json');
const pair=read('oracle3-pairwise-q-validation.json');
assert.equal(corpus.split,'validation');
assert.equal(corpus.modelTrainingAllowed,false);
assert.equal(corpus.modelSelectionAllowed,true);
assert.equal(linear.lockedTestRead,false);
assert.equal(pair.lockedTestRead,false);
assert.equal(corpus.cards.length,6);
assert.equal(linear.weights.length,55);
assert.equal(pair.selectedWeights.length,55);
const dot=(w,x)=>w.reduce((s,v,i)=>s+v*x[i],0);
const {features}=await import('./direct-action-q-student.mjs');
function choose(w,card,root){
 let best=null;
 const den=BigInt(root.denominator);
 for(const [key,n] of Object.entries(root.actionQNumerators)){
  const x=features(card.card,root,key);
  const score=dot(w,x);
  const regret=Number(BigInt(root.bestNumerator)-BigInt(n))/Number(den);
  assert.ok(Number.isFinite(regret)&&regret>=0);
  if(best===null||score<best.score-1e-12||(Math.abs(score-best.score)<=1e-12&&key<best.key))
   best={key,score,regret};
 }
 return best;
}
const perCard=corpus.cards.map(c=>{
 assert.equal(c.roots.length,2);
 const roots=c.roots.map(r=>{
  const a=choose(linear.weights,c,r),b=choose(pair.selectedWeights,c,r);
  return {linearRegret:a.regret,pairRegret:b.regret,delta:b.regret-a.regret,
   linearOptimal:a.regret<1e-12,pairOptimal:b.regret<1e-12,sameAction:a.key===b.key};
 });
 return {seed:c.seed,roots,meanDelta:roots.reduce((s,r)=>s+r.delta,0)/2};
});
const all=perCard.flatMap(c=>c.roots);
const mean=a=>a.reduce((s,v)=>s+v,0)/a.length;
const observed=mean(perCard.map(c=>c.meanDelta));
assert.ok(Math.abs(observed-pair.validationMeanRegretDeltaVsLinear)<1e-9);
assert.equal(all.length,12);
assert.equal(all.filter(r=>r.linearOptimal).length,linear.validation.optimal);
assert.equal(all.filter(r=>r.pairOptimal).length,pair.selected.validation.optimal);
const n=perCard.length;
const distribution=[];
for(let i=0;i<n**n;i++){
 let z=i,sum=0;
 for(let j=0;j<n;j++){sum+=perCard[z%n].meanDelta;z=Math.floor(z/n);}
 distribution.push(sum/n);
}
distribution.sort((a,b)=>a-b);
const quantile=p=>distribution[Math.floor(p*(distribution.length-1))];
const result={
 status:'EXHAUSTIVE_PAIRED_VALIDATION_CLUSTER_UNCERTAINTY',
 evidence:'all 6^6 scorecard-bootstrap resamples enumerated deterministically',
 source:'independent BigInt two-turn Q labels, no production Oracle',
 lockedTestRead:false,modelFitPerformed:false,hyperparameterSelectionPerformed:false,
 scorecards:n,roots:all.length,bootstrapResamples:distribution.length,
 pairwiseMinusLinearMeanRegret:observed,
 percentile95CI:[quantile(.025),quantile(.975)],
 bootstrapProbabilityPairwiseBetter:distribution.filter(x=>x<0).length/distribution.length,
 optimalChoices:{linear:all.filter(r=>r.linearOptimal).length,pairwise:all.filter(r=>r.pairOptimal).length},
 actionAgreement:all.filter(r=>r.sameAction).length,
 pairwiseLowerRegret:all.filter(r=>r.delta< -1e-12).length,
 pairwiseHigherRegret:all.filter(r=>r.delta>1e-12).length,
 sameRegret:all.filter(r=>Math.abs(r.delta)<=1e-12).length,
 perScorecard:perCard,
 limitations:['Validation was used to select pairwise hyperparameters: this bootstrap CI is descriptive, not an unbiased generalization CI',
 'Only six scorecards and two roots per card; CI cannot establish deployment benefit',
 'No locked test access or full 28-turn claim','Independent Bellman recomputation of new corpus remains outstanding']
};
writeFileSync('oracle3-iteration29-paired-validation-audit.json',JSON.stringify(result,null,2)+'\n');
console.log('ORACLE3_ITERATION29='+JSON.stringify({...result,perScorecard:'omitted'}));
