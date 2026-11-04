// Supervised learning of V*(s)-BigPoints(s) from EXACT Oracle 2.0 Bellman
// pre-first-roll labels. All selections use *validation* only; held-out test
// seeds and action-Q references are NOT consulted during training.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {performance} from 'node:perf_hooks';
import {FEATURE_DIM,FEATURE_VERSION,assertSeedPartition} from './features.mjs';

const prefix=process.argv[2]??'oracle3-phase4-supervised';
const output=process.argv[3]??'oracle3-phase4-supervised';
const data=JSON.parse(readFileSync(prefix+'.json','utf8'));
const meta=data.summary,all=data.rows;
assert.equal(meta.featureVersion,FEATURE_VERSION);
assertSeedPartition(all,meta.seedBase,meta.nGames);
const valid=all.filter(r=>r.boundary.status==='EXACT_FLOAT64');
for(const r of valid){
 assert.equal(r.features.length,FEATURE_DIM);
 assert.ok(Number.isFinite(r.boundary.optimalRemainingBP));
}
const tr=valid.filter(r=>r.split==='train'),va=valid.filter(r=>r.split==='validation');
assert.ok(tr.length>=40&&va.length>=12,'not enough exact training/validation labels');
for(const h of [1,2,3]){
 assert.ok(tr.some(r=>r.remaining===h));
 assert.ok(va.some(r=>r.remaining===h));
}
const mu=Array(FEATURE_DIM).fill(0),sd=Array(FEATURE_DIM).fill(0);
for(const r of tr)for(let j=0;j<FEATURE_DIM;j++)mu[j]+=r.features[j]/tr.length;
for(const r of tr)for(let j=0;j<FEATURE_DIM;j++)sd[j]+=(r.features[j]-mu[j])**2/tr.length;
for(let j=0;j<FEATURE_DIM;j++)sd[j]=Math.max(.03,Math.sqrt(sd[j]));
const rows=x=>x.map(r=>({
 seed:r.seed,remaining:r.remaining,
 x:r.features.map((v,j)=>(v-mu[j])/sd[j]),
 y:r.boundary.optimalRemainingBP/10
}));
const train=rows(tr),validation=rows(va);
const stage={};
for(const h of [1,2,3]){
 const z=tr.filter(r=>r.remaining===h);
 stage[h]=z.reduce((s,r)=>s+r.boundary.optimalRemainingBP,0)/z.length;
}
const stagePredict=r=>stage[r.remaining]/10;
function quality(data,predict){
 let squared=0,absolute=0;
 for(const r of data){const e=10*(predict(r)-r.y);squared+=e*e;absolute+=Math.abs(e);}
 return {rows:data.length,rmseBP:Math.sqrt(squared/data.length),maeBP:absolute/data.length};
}
let seed=0x7a4b39a2;
function rand(){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/2**32;}
function shuffle(n){
 const a=Array.from({length:n},(_,i)=>i);
 for(let i=n-1;i>0;i--){const j=Math.floor(rand()*(i+1));[a[i],a[j]]=[a[j],a[i]];}
 return a;
}
const started=performance.now(),D=FEATURE_DIM,H=20;
const meanY=train.reduce((s,r)=>s+r.y,0)/train.length;
function fitLinear(){
 const w=Array(D).fill(0);let b=meanY,best=Infinity,bestWeights=null,bestEpoch=0,stale=0;
 for(let epoch=1;epoch<=360;epoch++){
  for(const i of shuffle(train.length)){
   const {x,y}=train[i];
   let pred=b;for(let j=0;j<D;j++)pred+=w[j]*x[j];
   const err=Math.max(-3,Math.min(3,pred-y)),lr=.005;
   for(let j=0;j<D;j++)w[j]-=lr*(err*x[j]+.0002*w[j]);
   b-=lr*err;
  }
  const q=quality(validation,r=>{
   let y=b;for(let j=0;j<D;j++)y+=w[j]*r.x[j];return y;
  });
  if(q.rmseBP<best-1e-4){best=q.rmseBP;bestWeights={weights:w.slice(),bias:b};bestEpoch=epoch;stale=0;}
  else if(++stale>=45)break;
 }
 assert.ok(bestWeights);
 return {...bestWeights,bestEpoch,validationRMSE:best};
}
function fitNeural(){
 const w1=Array.from({length:H},()=>Array.from({length:D},()=>(rand()-.5)*.22));
 const b1=Array(H).fill(0);
 const w2=Array.from({length:H},()=>(rand()-.5)*.22);let b2=meanY;
 function forward(x){
  const h=[];
  for(let k=0;k<H;k++){
   let z=b1[k];for(let j=0;j<D;j++)z+=w1[k][j]*x[j];h[k]=Math.tanh(z);
  }
  let y=b2;for(let k=0;k<H;k++)y+=w2[k]*h[k];
  return {y,h};
 }
 let best=Infinity,bestWeights=null,bestEpoch=0,stale=0;
 for(let epoch=1;epoch<=360;epoch++){
  for(const i of shuffle(train.length)){
   const {x,y}=train[i],{y:p,h}=forward(x);
   const err=Math.max(-3,Math.min(3,p-y)),oldW2=w2.slice(),lr=.0035;
   for(let k=0;k<H;k++)w2[k]-=lr*(err*h[k]+.0001*w2[k]);
   b2-=lr*err;
   for(let k=0;k<H;k++){
    const dz=err*oldW2[k]*(1-h[k]*h[k]);
    for(let j=0;j<D;j++)w1[k][j]-=lr*(dz*x[j]+.0001*w1[k][j]);
    b1[k]-=lr*dz;
   }
  }
  const q=quality(validation,r=>forward(r.x).y);
  if(q.rmseBP<best-1e-4){
   best=q.rmseBP;bestEpoch=epoch;stale=0;
   bestWeights={w1:w1.map(x=>x.slice()),b1:b1.slice(),w2:w2.slice(),b2};
  }else if(++stale>=45)break;
 }
 assert.ok(bestWeights);
 return {...bestWeights,bestEpoch,validationRMSE:best};
}
const linear=fitLinear(),neural=fitNeural();
const predictions={
 stage:r=>stagePredict(r),
 linear:r=>linear.bias+linear.weights.reduce((s,v,j)=>s+v*r.x[j],0),
 neural:r=>{
  let y=neural.b2;
  for(let k=0;k<H;k++){
   let z=neural.b1[k];
   for(let j=0;j<D;j++)z+=neural.w1[k][j]*r.x[j];
   y+=neural.w2[k]*Math.tanh(z);
  }
  return y;
 }
};
const validationQuality=Object.fromEntries(
 Object.entries(predictions).map(([name,fn])=>[name,quality(validation,fn)])
);
const selected=Object.entries(validationQuality)
 .sort((a,b)=>a[1].rmseBP-b[1].rmseBP)[0][0];
const weights={objective:'optimal remaining final BP at pre-first-roll scorecard',
 featureVersion:FEATURE_VERSION,normalization:{mu,sd},
 stage,linear,neural,selected,validatedOnlyWith:'validation',node:process.version,
 trainingSeedRange:meta.gameSplit.train.seedRange,
 validationSeedRange:meta.gameSplit.validation.seedRange,
 heldoutTestSeedRange:meta.gameSplit.test.seedRange};
const metrics={status:'TRAINED_VALIDATION_ONLY_TEST_LOCKED',
 training:{exactLabels:train.length,games:meta.gameSplit.train.games},
 validation:{exactLabels:validation.length,games:meta.gameSplit.validation.games,models:validationQuality},
 selectedByValidationRMSE:selected,neuralBestEpoch:neural.bestEpoch,
 linearBestEpoch:linear.bestEpoch,trainingWallMs:performance.now()-started,node:process.version,
 limitations:[
  'Supervised V* labels only for naturally observed final 1-3 turn states',
  'No test labels or test-Q used for model/epoch selection',
  'No global 28-turn optimality proof, no final-BP policy improvement claim',
  'Stage and linear regressors are required stronger ablations; neural may be worse'
 ]};
writeFileSync(output+'.weights.json',JSON.stringify(weights,null,2)+'\n');
writeFileSync(output+'.train.json',JSON.stringify(metrics,null,2)+'\n');
console.log('ORACLE3_EXACT_TRAIN='+JSON.stringify(metrics));
