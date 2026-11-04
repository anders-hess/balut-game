// Iteration14: locked unseen 48-game exact-Q holdout, no training or tuning.
// Every q regret is the exact Oracle 2.0 expected FINAL BP loss conditional
// on visible dice; this is NOT a full 28-turn final-score policy benchmark.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {performance} from 'node:perf_hooks';
import {ACTION_DIM,ACTION_FEATURE_VERSION,selectAction,qRegret} from './q-teacher.mjs';
const prefix=process.argv[2]??'oracle3-q';
const blob=JSON.parse(readFileSync(prefix+'.groups.json','utf8'));
const weight=JSON.parse(readFileSync(prefix+'.q.weights.json','utf8'));
const groups=blob.groups.filter(g=>g.split==='test');
assert.equal(blob.metrics.featureVersion,ACTION_FEATURE_VERSION);
assert.equal(weight.featureVersion,ACTION_FEATURE_VERSION);
assert.equal(weight.featureDim,ACTION_DIM);
assert.equal(weight.lockedTestGames,48);
const unique=new Set(groups.map(g=>g.seed));
assert.equal(unique.size,48);
assert.ok(groups.length>=180);
assert.ok([...unique].every(s=>s>=920200048&&s<=920200095),'test seeds changed');
const start=performance.now(),D=ACTION_DIM,H=weight.hiddenUnits;
const norm=x=>x.map((v,j)=>(v-weight.normalization.mu[j])/weight.normalization.sd[j]);
const normalized=groups.map(g=>({...g,items:g.items.map(a=>({...a,x:norm(a.features)}))}));
function linear(x){let y=weight.linear.bias;for(let j=0;j<D;j++)y+=weight.linear.weights[j]*x[j];return y;}
function neural(x){
 let y=weight.neural.b2;
 for(let k=0;k<H;k++){
  let z=weight.neural.b1[k];
  for(let j=0;j<D;j++)z+=weight.neural.w1[k][j]*x[j];
  y+=weight.neural.w2[k]*Math.tanh(z);
 }
 return y;
}
const choices={
 production:g=>g.items.find(i=>i.key===g.productionKey),
 bpiv_all_actions:g=>selectAction(g,()=>0,0),
 linear_residual:g=>selectAction(g,linear,weight.linearAlpha),
 neural_residual:g=>selectAction(g,neural,weight.neuralAlpha)
};
const selected=weight.selected.name;
assert.ok(Object.keys(choices).includes(selected),'invalid frozen selected policy');
let totalActions=0,zeroScoreActionLabels=0,teacherScratchOptimal=0;
const rows=[];
for(const g of normalized){
 const bestItems=g.items.filter(a=>a.exactGap>=-1e-8);
 const optimalScratch=bestItems.some(a=>a.scratch);
 teacherScratchOptimal+=+optimalScratch;
 zeroScoreActionLabels+=g.items.filter(a=>a.scratch).length;
 totalActions+=g.items.length;
 const out={seed:g.seed,kind:g.kind,remaining:g.remaining,rollsRemaining:g.rollsRemaining,
  source:g.source,dice:g.dice,card:g.card,
  teacherOptimalActionKeys:bestItems.map(a=>a.key),
  teacherOptimalScratch:optimalScratch,policies:{}};
 for(const [name,choose] of Object.entries(choices)){
  const t=performance.now(),a=choose(g);
  assert.ok(a&&Number.isFinite(a.exactGap));
  out.policies[name]={actionKey:a.key,regretBP:qRegret(g,a.key),
    scoreScratch:a.scratch,action:a.action,selectionWallMs:performance.now()-t};
 }
 rows.push(out);
}
function mean(a){return a.reduce((s,x)=>s+x,0)/a.length;}
function percentile(a,p){const v=a.slice().sort((x,y)=>x-y);return v[Math.floor((v.length-1)*p)];}
let bootSeed=0x7317ef43;
function random(){bootSeed=(Math.imul(bootSeed,1664525)+1013904223)>>>0;return bootSeed/4294967296;}
function gameValues(filter,fun){
 const perSeed=new Map();
 for(const r of rows.filter(filter)){
  if(!perSeed.has(r.seed))perSeed.set(r.seed,[]);
  perSeed.get(r.seed).push(fun(r));
 }
 return [...perSeed.values()].map(mean);
}
function ci(sample,n=10000){
 if(sample.length<4)return null;
 const out=[];
 for(let b=0;b<n;b++){
  let sum=0;for(let j=0;j<sample.length;j++)sum+=sample[Math.floor(random()*sample.length)];
  out.push(sum/sample.length);
 }
 out.sort((a,b)=>a-b);
 return [out[Math.floor(.025*(n-1))],out[Math.floor(.975*(n-1))]];
}
function policyStats(name,filter=()=>true){
 const r=rows.filter(filter);
 assert.ok(r.length>0);
 const regress=gameValues(filter,g=>g.policies[name].regretBP-g.policies.production.regretBP);
 const perGame=gameValues(filter,g=>g.policies[name].regretBP);
 const ps=r.map(x=>x.policies[name]);
 return {roots:r.length,games:new Set(r.map(g=>g.seed)).size,
  meanRegretBP:mean(ps.map(x=>x.regretBP)),
  exactlyOptimal:ps.filter(x=>x.regretBP<1e-8).length,
  scratchSelections:ps.filter(x=>x.scoreScratch).length,
  pairedMeanExtraRegretBP:mean(regress),
  pairedGameBootstrapCI95:ci(regress),
  regretGameBootstrapCI95:ci(perGame),
  p95InferenceOnlyMs:percentile(ps.map(x=>x.selectionWallMs),.95)};
}
const main=Object.fromEntries(Object.keys(choices).map(name=>[name,policyStats(name)]));
const subsets={};
for(const name of ['natural','scratch']){
 subsets[name]=Object.fromEntries(Object.keys(choices).map(p=>[p,policyStats(p,r=>r.kind===name)]));
}
for(const h of [1,2,3]){
 subsets['remaining_'+h]=Object.fromEntries(Object.keys(choices).map(p=>[p,policyStats(p,r=>r.remaining===h)]));
}
for(const source of ['observed','possible_counterfactual_dice']){
 subsets[source]=Object.fromEntries(Object.keys(choices).map(p=>[p,policyStats(p,r=>r.source===source)]));
}
const best=main[selected],improvedRegret=best.pairedGameBootstrapCI95?.[1]<0;
const report={status:'HELDOUT_EXACT_Q_REGRET_NO_FINAL_GAME_POLICY_CLAIM',
 independentGames:48,roots:rows.length,exactActionLabels:totalActions,
 zeroScoreActionLabels,teacherOptimalScratchRoots:teacherScratchOptimal,
 lockedSeeds:[920200048,920200095],
 selectedByValidationOnly:weight.selected,
 main,subsets,
 selectedRegret95CiExcludesZeroTowardImprovement:improvedRegret,
 selectedBeatsProductionByMeanRegret:best.pairedMeanExtraRegretBP<0,
 wallMs:performance.now()-start,parentPeakRssBytes:process.memoryUsage().rss,node:process.version,
 caveats:[
 'Exact Q comes from Oracle2 Float64 finite-horizon solver, not formal 28-turn global proof',
 'Same-seed roots within a game correlated; 95% CIs bootstrap independent seed/game clusters',
 'Synthetic dice rolls are possible but selected adversarially, so overall mean is across a designed mixture, not population distribution',
 'The regression model and shrinkage were chosen on separate validation games; this test is frozen',
 'Direct Q decision regret is not achieved 28-turn final BP and cannot establish a better gameplay policy',
 'Inference-only p95 excludes BPIV Q enumeration and feature extraction; total decision runtime separately required before deployment'
 ]};
const examples=rows.filter(r=>r.policies[selected].regretBP>1e-8)
 .sort((a,b)=>b.policies[selected].regretBP-a.policies[selected].regretBP)
 .slice(0,12);
writeFileSync(prefix+'.q.holdout.json',JSON.stringify({report,examples,allRows:rows},null,2)+'\n');
writeFileSync(prefix+'.q.holdout-summary.json',JSON.stringify(report,null,2)+'\n');
console.log('ORACLE3_Q_HOLDOUT='+JSON.stringify(report));
