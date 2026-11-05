// Oracle 3.0 iteration 27: direct mathematical action-Q student, TRAIN/VALIDATION only.
// No production policy, no test-file reads, no iteration22 test feedback.
// Input labels are exact BigInt two-turn Bellman action Q; convert differences
// BEFORE floating-point conversion to preserve precision near ties.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {CATEGORIES} from '../phase1/simulator.mjs';
const read=split=>{
 const d=JSON.parse(readFileSync('oracle3-action-q-'+split+'.json','utf8'));
 assert.equal(d.split,split);
 assert.equal(d.schema,'oracle3-exact-rational-action-q-v1');
 return d;
};
const train=read('train'),validation=read('validation');
assert.equal(train.modelTrainingAllowed,true);
assert.equal(validation.modelTrainingAllowed,false);
assert.equal(validation.modelSelectionAllowed,true);
const ids=new Set(train.cards.map(c=>c.seed));
for(const c of validation.cards)assert.ok(!ids.has(c.seed),'train/validation seed leakage');
const dimension=55;
function features(card,root,key){
 const x=Array(dimension).fill(0);
 x[0]=1;x[1]=root.rerollsRemaining/2;
 const count=[0,0,0,0,0,0];
 for(const d of root.dice)count[d-1]++;
 for(let i=0;i<6;i++)x[2+i]=count[i]/5;
 for(let j=0;j<CATEGORIES.length;j++){
  const vals=card[CATEGORIES[j]];
  x[8+j]=vals.filter(v=>v!==null).length/4;
  x[15+j]=vals.reduce((s,v)=>s+(v??0),0)/100;
 }
 if(key.startsWith('score:')){
  const [,category,value]=key.split(':');
  x[22]=1;x[23+Number(category)]=1;
  x[30]=Number(value)/50;
 }else{
  assert.ok(/^hold:[0-5]{6}$/.test(key));
  x[31]=1;
  const digits=key.slice(5).split('').map(Number);
  let kept=0;
  for(let i=0;i<6;i++){assert.ok(digits[i]<=count[i]);x[32+i]=digits[i]/5;kept+=digits[i];}
  assert.ok(kept<5);
  x[38]=kept/5;
  for(let i=0;i<6;i++)x[39+i]=count[i]?digits[i]/count[i]:0;
 }
 // Interactions: action type with rerolls and current dice counts.
 x[45]=x[22]*x[1];x[46]=x[31]*x[1];
 for(let i=0;i<6;i++)x[47+i]=x[31]*x[2+i];
 x[53]=x[22]*x[30];x[54]=x[31]*x[38];
 return x;
}
function rows(doc){
 const out=[];
 for(const c of doc.cards)for(const root of c.roots){
  const best=BigInt(root.bestNumerator),den=BigInt(root.denominator);
  assert.ok(den>0n);
  const actions=Object.entries(root.actionQNumerators).map(([key,n])=>{
   const gap=best-BigInt(n);
   assert.ok(gap>=0n);
   // Difference is converted as a rational, not by subtracting two floats.
   const regret=Number(gap)/Number(den);
   assert.ok(Number.isFinite(regret)&&regret>=0);
   return {key,x:features(c.card,root,key),regret};
  });
  assert.ok(actions.length>1);
  out.push({seed:c.seed,actions});
 }
 return out;
}
const training=rows(train),valid=rows(validation);
assert.equal(training.length,36);assert.equal(valid.length,12);
const dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0);
function predict(w,root){
 let best=null;
 for(const a of root.actions){
  const score=dot(w,a.x);
  if(best===null||score<best.score-1e-12||(Math.abs(score-best.score)<=1e-12&&a.key<best.key))
   best={key:a.key,score,regret:a.regret};
 }
 return best;
}
function evaluate(w,roots){
 const chosen=roots.map(r=>predict(w,r));
 return {roots:roots.length,optimal:chosen.filter(c=>c.regret<1e-12).length,
  meanRegret:chosen.reduce((s,c)=>s+c.regret,0)/roots.length,
  maxRegret:Math.max(...chosen.map(c=>c.regret))};
}
const candidates=[];
for(const rate of [0.0005,0.002,0.008]){
 const w=Array(dimension).fill(0);
 // Supervise every legal action's exact Q regret; no heuristic action labels.
 // Root-wise weighting prevents roots with more actions dominating.
 for(let epoch=0;epoch<120;epoch++){
  for(const root of training){
   const grad=Array(dimension).fill(0);
   for(const a of root.actions){
    const residual=Math.max(-5,Math.min(5,dot(w,a.x)-a.regret));
    for(let i=0;i<dimension;i++)grad[i]+=residual*a.x[i]/root.actions.length;
   }
   for(let i=0;i<dimension;i++)w[i]-=rate*(grad[i]+0.0001*w[i]);
  }
 }
 const v=evaluate(w,valid);
 candidates.push({rate,weights:w,train:evaluate(w,training),validation:v});
}
candidates.sort((a,b)=>a.validation.meanRegret-b.validation.meanRegret||
 b.validation.optimal-a.validation.optimal||a.rate-b.rate);
const selected=candidates[0];
const result={
 status:'TRAINED_ON_EXACT_RATIONAL_Q_LABELS_VALIDATION_ONLY',
 source:'independent exact BigInt two-turn Bellman action Q',
 model:'55-feature regularized linear direct action-Q regret student',
 trainCards:18,validationCards:6,lockedTestRead:false,
 trainingRoots:training.length,validationRoots:valid.length,
 trainingActions:training.reduce((s,r)=>s+r.actions.length,0),
 validationActions:valid.reduce((s,r)=>s+r.actions.length,0),
 selectedRate:selected.rate,train:selected.train,validation:selected.validation,
 candidates:candidates.map(({rate,train,validation:v})=>({rate,train,validation:v})),
 weights:selected.weights,
 caveats:['Validation only: no locked-test generalization claim',
  'Only two-turn mathematical Q, no 28-turn global optimum',
  'Scorecard construction fixes remaining categories to fours and straight',
  'No production Oracle inputs or model'],
};
writeFileSync('oracle3-direct-action-q-student-validation.json',JSON.stringify(result,null,2)+'\n');
console.log('ORACLE3_DIRECT_ACTION_Q_STUDENT='+JSON.stringify({...result,weights:'omitted'}));

// Public mathematical training utilities for independent phase-7 ranking ablations.
export {rows,features,dot,predict,evaluate};
