// Completely held-out evaluation of exact-Bellman state value and present
// decision Q regret. No model selection or hyperparameter adaptation on test.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {performance} from 'node:perf_hooks';
import {chooseExpectimax} from '../phase3/expectimax.mjs';
import {actionRegret} from './adapter.mjs';
import {assertSeedPartition,FEATURE_VERSION} from './features.mjs';
import {readSupervisedModel,predictContinuation} from './model.mjs';

const prefix=process.argv[2]??'oracle3-phase4-supervised';
const outPrefix=process.argv[3]??'oracle3-phase4-supervised';
const dataset=JSON.parse(readFileSync(prefix+'.json','utf8'));
const w=readSupervisedModel(outPrefix+'.weights.json');
const {rows,summary:meta}=dataset;
assert.equal(meta.featureVersion,FEATURE_VERSION);
assertSeedPartition(rows,meta.seedBase,meta.nGames);
assert.equal(w.trainingSeedRange[1]<meta.gameSplit.validation.seedRange[0],true);
assert.equal(w.validationSeedRange[1]<meta.gameSplit.test.seedRange[0],true);
const test=rows.filter(r=>r.split==='test');
const nGames=new Set(test.map(r=>r.seed)).size;
assert.ok(nGames>=6,'not enough independent held-out games');
const candidates=['stage','linear','neural'];
const started=performance.now(),items=[],regrets=[];
for(const r of test){
 if(r.boundary.status==='EXACT_FLOAT64'){
  const row={seed:r.seed,remaining:r.remaining,
   truthOptimalRemainingBP:r.boundary.optimalRemainingBP,estimates:{}};
  for(const name of candidates){
   const p=predictContinuation(r.card,w,name);
   row.estimates[name]={prediction:p,errorBP:p-r.boundary.optimalRemainingBP};
  }
  items.push(row);
 }
 if(r.qReference.status==='EXACT_FLOAT64'){
  const root={card:r.card,dice:r.dice,rollsRemaining:r.rollsRemaining};
  const exact={status:'EXACT_FLOAT64',value:r.qReference.optimalFinalBP,actions:r.qReference.actions};
  const row={seed:r.seed,remaining:r.remaining,referenceValue:exact.value,
   actionCount:Object.keys(exact.actions).length,actions:{}};
  row.actions.production=actionRegret(exact,r.productionAction,r.dice);
  for(const name of candidates){
   const action=chooseExpectimax(root,nextCard=>predictContinuation(nextCard,w,name)).action;
   row.actions[name]=actionRegret(exact,action,r.dice);
  }
  regrets.push(row);
 }
}
function avg(vals){return vals.reduce((s,x)=>s+x,0)/vals.length;}
function perGameDelta(arr,value){
 const groups=new Map();
 for(const row of arr){
  if(!groups.has(row.seed))groups.set(row.seed,[]);
  groups.get(row.seed).push(value(row));
 }
 return [...groups.values()].map(g=>avg(g));
}
function sampleCi(d){
 if(d.length<2)return null;
 // Deterministic cluster bootstrap across WHOLE games, preserving 1-3 stage dependence.
 let seed=0x616e9bcb;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/2**32;};
 const draws=[];
 for(let b=0;b<4000;b++){
  let sum=0;for(let j=0;j<d.length;j++)sum+=d[Math.floor(random()*d.length)];
  draws.push(sum/d.length);
 }
 draws.sort((a,b)=>a-b);
 return [draws[Math.floor(.025*(draws.length-1))],draws[Math.floor(.975*(draws.length-1))]];
}
const valueMetrics={};
for(const name of candidates){
 const error=items.map(r=>r.estimates[name].errorBP);
 const gameAbsolute=perGameDelta(items,r=>Math.abs(r.estimates[name].errorBP));
 const advantage=perGameDelta(items,r=>Math.abs(r.estimates.stage.errorBP)-Math.abs(r.estimates[name].errorBP));
 valueMetrics[name]={roots:items.length,games:gameAbsolute.length,
  maeBP:avg(error.map(Math.abs)),rmseBP:Math.sqrt(avg(error.map(x=>x*x))),
  gameMae95BootstrapCi:sampleCi(gameAbsolute),
  meanGameMaeAdvantageOverStageBP:avg(advantage),
  advantageVsStage95BootstrapCi:sampleCi(advantage)};
}
const qMetrics={};
for(const name of ['production',...candidates]){
 const d=perGameDelta(regrets,r=>r.actions[name].regretBP);
 const relative=perGameDelta(regrets,r=>r.actions[name].regretBP-r.actions.production.regretBP);
 qMetrics[name]={roots:regrets.length,games:d.length,meanRegretBP:avg(d),
  gameCluster95BootstrapCi:sampleCi(d),
  meanExtraRegretVsProductionBP:avg(relative),
  extraRegret95BootstrapCi:sampleCi(relative),
  exactlyOptimalRoots:regrets.filter(r=>r.actions[name].regretBP<1e-8).length};
}
const byHorizon=[1,2,3].map(h=>{
 const v=items.filter(x=>x.remaining===h),q=regrets.filter(x=>x.remaining===h);
 return {remaining:h,valueRoots:v.length,qRoots:q.length,
  selectedValueMAE:v.length?avg(v.map(r=>Math.abs(r.estimates[w.selected].errorBP))):null,
  selectedMeanQRegret:q.length?avg(q.map(r=>r.actions[w.selected].regretBP)):null,
  productionMeanQRegret:q.length?avg(q.map(r=>r.actions.production.regretBP)):null};
});
assert.ok(items.length>=Math.floor(test.length*.7),'not enough independent test value roots');
assert.ok(regrets.length>=Math.floor(test.length*.7),'not enough solved test Q roots');
const result={status:'HELD_OUT_EXACT_REFERENCE_EVALUATED',
 seedRange:meta.gameSplit.test.seedRange,independentGames:nGames,
 exactValueRoots:items.length,exactQRoots:regrets.length,
 exactActionQLabels:regrets.reduce((n,r)=>n+r.actionCount,0),
 modelSelectedOnValidationOnly:w.selected,valueMetrics,qMetrics,byHorizon,
 wallMs:performance.now()-started,peakParentRssBytes:process.memoryUsage().rss,node:process.version,
 limitations:[
  'These are per-decision exact Q regret and value prediction errors, NOT observed 28-turn final BP differences',
  'Only naturally observed 1-3-turn positions under Oracle 1.0, not all future scorecard states',
  'Test set has a small number of independent games; bootstrap is a descriptive uncertainty estimate',
  'All chance/hold decisions within a turn exact given the approximate next-state learned continuation',
  'No training/test seed overlap, and chosen model was frozen by validation-only RMSE',
  'Exact reference Float64 finite-horizon Bellman with solver coverage bounds; not rational global 28-turn optimality',
  'A confidence interval for lower Q regret does not certify better full-game BP'
 ]};
writeFileSync(outPrefix+'.evaluation.json',JSON.stringify(result,null,2)+'\n');
writeFileSync(outPrefix+'.heldout-details.json',JSON.stringify({valueItems:items,qItems:regrets},null,2)+'\n');
console.log('ORACLE3_EXACT_EVALUATION='+JSON.stringify(result));
