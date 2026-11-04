// Direct Oracle 2.0 per-action Q* supervision: train BPIV-residual models,
// select architecture/shrinkage on validation *decision regret*, NEVER test.
// Training uses actual Float64 complete Bellman Q on <=3-turn scorecards.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {performance} from 'node:perf_hooks';
import {ACTION_DIM,ACTION_FEATURE_VERSION,selectAction,qRegret} from './q-teacher.mjs';

const prefix=process.argv[2]??'oracle3-q';
const input=JSON.parse(readFileSync(prefix+'.groups.json','utf8'));
const groups=input.groups,meta=input.metrics,train=groups.filter(g=>g.split==='train'),val=groups.filter(g=>g.split==='validation');
assert.equal(meta.featureVersion,ACTION_FEATURE_VERSION);
assert.equal(meta.featureDim,ACTION_DIM);
assert.equal(meta.independentGames.train,84);
assert.equal(meta.independentGames.validation,24);
assert.equal(meta.independentGames.test,48);
assert.ok(train.length>=240&&val.length>=90);
const started=performance.now();
const D=ACTION_DIM,H=24,alphas=[.15,.3,.5,.75,1];
const trainItems=train.flatMap(g=>g.items.map(a=>({
  x:a.features,y:a.residualTarget,
  weight:Math.max(.05,Math.min(3,a.weight*18/g.items.length))
})));
const mu=Array(D).fill(0),sd=Array(D).fill(0);
for(const r of trainItems)for(let j=0;j<D;j++)mu[j]+=r.x[j]/trainItems.length;
for(const r of trainItems)for(let j=0;j<D;j++)sd[j]+=(r.x[j]-mu[j])**2/trainItems.length;
for(let j=0;j<D;j++)sd[j]=Math.max(.05,Math.sqrt(sd[j]));
function normalize(x){return x.map((v,j)=>(v-mu[j])/sd[j]);}
const samples=trainItems.map(r=>({...r,x:normalize(r.x)}));
const validation=val.map(g=>({...g,items:g.items.map(a=>({...a,x:normalize(a.features)}))}));
const training= train.map(g=>({...g,items:g.items.map(a=>({...a,x:normalize(a.features)}))}));
let randomSeed=0x6b6dc881;
function random(){randomSeed=(Math.imul(randomSeed,1664525)+1013904223)>>>0;return randomSeed/4294967296;}
function shuffle(n){const a=Array.from({length:n},(_,i)=>i);for(let i=n-1;i>0;i--){const j=Math.floor(random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
function mean(a){return a.reduce((s,x)=>s+x,0)/a.length;}
function scoring(gs,predict,alpha){
 const regret=[],byKind={natural:[],scratch:[]},byHorizon={1:[],2:[],3:[]};
 let optimal=0;
 for(const g of gs){
  const selected=selectAction(g,predict,alpha);
  const r=qRegret(g,selected.key);
  regret.push(r);byKind[g.kind].push(r);byHorizon[g.remaining].push(r);
  optimal+=+(r<1e-8);
 }
 return {meanRegretBP:mean(regret),optimalRoots:optimal,roots:gs.length,
  meanByKind:Object.fromEntries(Object.entries(byKind).map(([k,x])=>[k,x.length?mean(x):null])),
  meanByHorizon:Object.fromEntries(Object.entries(byHorizon).map(([k,x])=>[k,x.length?mean(x):null]))};
}
const production=mean(validation.map(g=>qRegret(g,g.productionKey)));
const baseVal=scoring(validation,()=>0,0);
let bestLinear={loss:Infinity},bestNeural={loss:Infinity};
function evaluateAlphas(gs,predict){
 let selected=null;
 for(const alpha of alphas){
  const score=scoring(gs,predict,alpha);
  const obj=score.meanRegretBP;
  if(!selected||obj<selected.score.meanRegretBP-1e-12)
   selected={alpha,score};
 }
 return selected;
}
const linear={weights:Array(D).fill(0),bias:0};
function linPredict(x,w=linear){let y=w.bias;for(let j=0;j<D;j++)y+=w.weights[j]*x[j];return y;}
let linStale=0;
for(let epoch=1;epoch<=115;epoch++){
 const lr=.0023/(1+epoch/130);
 for(const ix of shuffle(samples.length)){
  const {x,y,weight}=samples[ix];
  const error=Math.max(-3,Math.min(3,linPredict(x)-y))*weight;
  for(let j=0;j<D;j++)linear.weights[j]-=lr*(error*x[j]+.0004*linear.weights[j]);
  linear.bias-=lr*error;
 }
 if(epoch%5!==0&&epoch!==1)continue;
 const selected=evaluateAlphas(validation,x=>linPredict(x));
 if(selected.score.meanRegretBP<bestLinear.loss-1e-8){
  bestLinear={loss:selected.score.meanRegretBP,alpha:selected.alpha,epoch,
   score:selected.score,params:{weights:linear.weights.slice(),bias:linear.bias}};
  linStale=0;
 }else linStale+=5;
 if(linStale>=35)break;
}
const neural={
 w1:Array.from({length:H},()=>Array.from({length:D},()=>(random()-.5)*.10)),
 b1:Array(H).fill(0),w2:Array.from({length:H},()=>(random()-.5)*.10),b2:0
};
function neuralForward(x,w=neural){
 const h=[];
 for(let k=0;k<H;k++){
  let z=w.b1[k];for(let j=0;j<D;j++)z+=w.w1[k][j]*x[j];
  h[k]=Math.tanh(z);
 }
 let y=w.b2;for(let k=0;k<H;k++)y+=w.w2[k]*h[k];
 return {y,h};
}
let neuralStale=0;
for(let epoch=1;epoch<=115;epoch++){
 const lr=.0018/(1+epoch/100);
 for(const ix of shuffle(samples.length)){
  const {x,y,weight}=samples[ix],{y:p,h}=neuralForward(x);
  const error=Math.max(-3,Math.min(3,p-y))*weight,old2=neural.w2.slice();
  for(let k=0;k<H;k++)neural.w2[k]-=lr*(error*h[k]+.0004*neural.w2[k]);
  neural.b2-=lr*error;
  for(let k=0;k<H;k++){
   const grad=error*old2[k]*(1-h[k]*h[k]);
   for(let j=0;j<D;j++)neural.w1[k][j]-=lr*(grad*x[j]+.0004*neural.w1[k][j]);
   neural.b1[k]-=lr*grad;
  }
 }
 if(epoch%5!==0&&epoch!==1)continue;
 const selected=evaluateAlphas(validation,x=>neuralForward(x).y);
 if(selected.score.meanRegretBP<bestNeural.loss-1e-8){
  bestNeural={loss:selected.score.meanRegretBP,alpha:selected.alpha,epoch,
   score:selected.score,params:{w1:neural.w1.map(x=>x.slice()),b1:neural.b1.slice(),w2:neural.w2.slice(),b2:neural.b2}};
  neuralStale=0;
 }else neuralStale+=5;
 if(neuralStale>=35)break;
}
assert.ok(Number.isFinite(bestLinear.loss)&&Number.isFinite(bestNeural.loss));
const valOptions=[
 {name:'production',loss:production,alpha:0},
 {name:'bpiv_all_actions',loss:baseVal.meanRegretBP,alpha:0},
 {name:'linear_residual',loss:bestLinear.loss,alpha:bestLinear.alpha,epoch:bestLinear.epoch},
 {name:'neural_residual',loss:bestNeural.loss,alpha:bestNeural.alpha,epoch:bestNeural.epoch}
];
const selected=valOptions.slice().sort((a,b)=>a.loss-b.loss)[0];
const weights={
 status:'VALIDATION_FROZEN_FOR_LOCKED_NEW_TEST',
 featureVersion:ACTION_FEATURE_VERSION,featureDim:D,hiddenUnits:H,
 normalization:{mu,sd},
 linear:bestLinear.params,neural:bestNeural.params,
 selected:{name:selected.name,alpha:selected.alpha},
 linearAlpha:bestLinear.alpha,neuralAlpha:bestNeural.alpha,
 validationRegretByModel:valOptions,
 target:'Q_star(action)-max_a(Q_star) relative to BPIV(action)-max_b(BPIV)',
 originalOracle2SourceBlob:'4ce623ed663edffc4b1c9291f975aba778622227',
 trainGames:84,valGames:24,lockedTestGames:48
};
const metrics={
 status:'TRAINED_NO_TEST_USED_FOR_SELECTION',
 trainRoots:train.length,trainActionQRows:samples.length,
 trainGames:84,validationRoots:validation.length,validationGames:24,
 validationProductionMeanRegretBP:production,
 validationBpivAllActions:baseVal,
 validationLinear:bestLinear.score,validationNeural:bestNeural.score,
 options:valOptions,selected:weights.selected,
 bestEpoch:{linear:bestLinear.epoch,neural:bestNeural.epoch},
 trainingWallMs:performance.now()-started,parentRssBytes:process.memoryUsage().rss,
 node:process.version,
 limitations:[
 'Model learns exact finite-horizon Oracle2 Q residual at last 1–3 turns; cannot extrapolate to earlier turns',
 'Scorecard/dice/action train labels are correlated within a game; split by seed game prevents holdout leakage',
 'Validation Q regret chosen both shrinkage and epoch: locked test must not tune model',
 'Scratch action labels include zero-score alternatives and legally reached scratch scorecards',
 'Lower validation Q regret does not demonstrate better game-final BP'
 ]};
writeFileSync(prefix+'.q.weights.json',JSON.stringify(weights,null,2)+'\n');
writeFileSync(prefix+'.q.train.json',JSON.stringify(metrics,null,2)+'\n');
console.log('ORACLE3_Q_TRAIN='+JSON.stringify(metrics));
