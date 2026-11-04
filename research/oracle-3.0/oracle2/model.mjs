// Frozen inference for exact-Bellman continuation models.
// Outputs FUTURE optimal Big Points after the present scorecard (not final BP).
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {encodeCard} from './adapter.mjs';
import {exactFeatures,FEATURE_DIM,FEATURE_VERSION} from './features.mjs';

export function readSupervisedModel(path='oracle3-phase4-supervised.weights.json'){
 const w=JSON.parse(readFileSync(path,'utf8'));
 assert.equal(w.featureVersion,FEATURE_VERSION);
 assert.equal(w.normalization.mu.length,FEATURE_DIM);
 assert.equal(w.normalization.sd.length,FEATURE_DIM);
 assert.ok(['stage','linear','neural'].includes(w.selected));
 return w;
}
export function predictContinuation(card,w,which=w.selected){
 const h=encodeCard(card).remaining;
 if(h===0)return 0;
 if(h<1||h>3)throw Error('exact-supervised model only trained on 1-3-turn states, got '+h);
 if(which==='stage'){
  const v=w.stage[h];
  assert.ok(Number.isFinite(v));return v;
 }
 const x=exactFeatures(card).map((v,j)=>(v-w.normalization.mu[j])/w.normalization.sd[j]);
 let y;
 if(which==='linear'){
  const {weights,bias}=w.linear;
  assert.equal(weights.length,FEATURE_DIM);
  y=bias+weights.reduce((s,a,j)=>s+a*x[j],0);
 }else if(which==='neural'){
  const {w1,b1,w2,b2}=w.neural;
  assert.equal(w1.length,w2.length);
  y=b2;
  for(let k=0;k<w1.length;k++){
   let z=b1[k];
   for(let j=0;j<FEATURE_DIM;j++)z+=w1[k][j]*x[j];
   y+=w2[k]*Math.tanh(z);
  }
 }else throw Error('unknown exact-supervised model '+which);
 assert.ok(Number.isFinite(y),'nonfinite learned continuation');
 return 10*y;
}
