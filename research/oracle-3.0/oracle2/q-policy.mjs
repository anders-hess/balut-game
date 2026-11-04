// Inference only: direct Q* student from exact Oracle2 teacher. The learned
// student is restricted to its 1–3-turn training horizon; all earlier rounds
// use frozen production Oracle. No exact Q labels are required at inference.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {performance} from 'node:perf_hooks';
import {encodeCard,actionKey} from './adapter.mjs';
import {legalActions,bpivActionMap,actionFeature,selectAction,ACTION_FEATURE_VERSION,ACTION_DIM} from './q-teacher.mjs';
import {cachedPolicy} from '../phase1/cached-oracle.mjs';
import {score} from '../phase1/simulator.mjs';

export function loadQStudent(path='oracle3-q.q.weights.json'){
 const w=JSON.parse(readFileSync(path,'utf8'));
 assert.equal(w.featureVersion,ACTION_FEATURE_VERSION);
 assert.equal(w.featureDim,ACTION_DIM);
 assert.ok(['production','bpiv_all_actions','linear_residual','neural_residual'].includes(w.selected.name));
 return w;
}
export function makeQStudent(w,telemetry){
 const stats=telemetry??{studentDecisions:0,productionDecisions:0,decisionMs:[],actionTypes:{hold:0,score:0},scratchSelections:0};
 const norm=x=>x.map((v,j)=>(v-w.normalization.mu[j])/w.normalization.sd[j]);
 function linear(x){let y=w.linear.bias;for(let j=0;j<ACTION_DIM;j++)y+=w.linear.weights[j]*x[j];return y;}
 function neural(x){
  let y=w.neural.b2;
  for(let k=0;k<w.hiddenUnits;k++){
   let z=w.neural.b1[k];
   for(let j=0;j<ACTION_DIM;j++)z+=w.neural.w1[k][j]*x[j];
   y+=w.neural.w2[k]*Math.tanh(z);
  }
  return y;
 }
 const policy=root=>{
  const remaining=encodeCard(root.card).remaining;
  if(remaining>3||w.selected.name==='production'){
   stats.productionDecisions++;
   return cachedPolicy(root);
  }
  const started=performance.now();
  const actions=legalActions(root),q=bpivActionMap(root);
  const top=Math.max(...Object.values(q));
  const group={items:actions.map(action=>{
   const key=actionKey(action,root.dice);
   const bpivGap=q[key]-top;
   return {key,action,bpivGap,x:norm(actionFeature(root,action,bpivGap))};
  })};
  const name=w.selected.name;
  const chosen=name==='bpiv_all_actions'?selectAction(group,()=>0,0)
   :name==='linear_residual'?selectAction(group,linear,w.linearAlpha)
   :selectAction(group,neural,w.neuralAlpha);
  assert.ok(chosen?.action);
  const result=chosen.action;
  stats.studentDecisions++;
  stats.decisionMs.push(performance.now()-started);
  stats.actionTypes[result.type]++;
  if(result.type==='score'&&score(result.category,root.dice)===0)stats.scratchSelections++;
  return result;
 };
 return {policy,stats};
}
