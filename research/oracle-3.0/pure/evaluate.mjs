// Validate pure mathematical continuation students against native Oracle2 Q,
// freeze choice on validation only, then evaluate separate locked unseen games.
// Neither learning nor ranking depends on any production-advisor behaviour.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {performance} from 'node:perf_hooks';
import {score} from '../phase1/simulator.mjs';
import {actionKey,encodeCard} from '../oracle2/adapter.mjs';
import {predictContinuation,readSupervisedModel} from '../oracle2/model.mjs';
import {exactWithinTurn} from './chance.mjs';

const prefix=process.argv[2]??'oracle3-math-pure';
const data=JSON.parse(readFileSync(prefix+'.json','utf8'));
const w=readSupervisedModel(prefix+'.weights.json');
const {rows,summary}=data;
assert.equal(summary.seedBase,950100000);
assert.equal(summary.nGames,120);
assert.deepEqual(summary.gameSplit.test.seedRange,[950100096,950100119]);
const candidates=['myopic','stage','linear','neural'];
const start=performance.now();
function interpret(row,kind){
 const root={card:row.card,dice:row.dice,rollsRemaining:row.rollsRemaining};
 const cont=kind==='myopic'?()=>0:card=>predictContinuation(card,w,kind);
 const t=performance.now();
 const out=exactWithinTurn(root,cont);
 const elapsed=performance.now()-t;
 const key=actionKey(out.action,row.dice),exactQ=row.qReference.actions[key];
 assert.ok(Number.isFinite(exactQ),'chosen action missing native Q '+key);
 const regret=Math.max(0,row.qReference.optimalFinalBP-exactQ);
 const zeroScore=out.action.type==='score'&&score(out.action.category,row.dice)===0;
 return {key,regretBP:regret,optimal:regret<1e-8,
  zeroScore,elapsedMs:elapsed,approxQ:out.value,nativeExactQ:exactQ,
  localChanceStates:out.numBellmanDiceStates};
}
const seen={validation:new Set(),test:new Set(),train:new Set()};
for(const r of rows)seen[r.split].add(r.seed);
assert.deepEqual(Object.fromEntries(Object.entries(seen).map(([k,v])=>[k,v.size])),
 {validation:24,test:24,train:72});
for(const seed of seen.test)assert.ok(!seen.train.has(seed)&&!seen.validation.has(seed));
const valRoots=rows.filter(r=>r.split==='validation'&&r.qReference.status==='EXACT_FLOAT64');
const testRoots=rows.filter(r=>r.split==='test'&&r.qReference.status==='EXACT_FLOAT64');
assert.ok(valRoots.length>=90&&testRoots.length>=90);
function makePolicyRows(all){
 const output=[];
 for(const row of all){
  const decisions={};
  for(const kind of candidates)decisions[kind]=interpret(row,kind);
  output.push({seed:row.seed,kind:row.kind,source:row.source,remaining:row.remaining,
   rollsRemaining:row.rollsRemaining,dice:row.dice,
   mathematicallyOptimalValueBP:row.qReference.optimalFinalBP,decisions});
 }
 return output;
}
function mean(a){return a.reduce((s,x)=>s+x,0)/a.length;}
function summarize(data,kind){
 const samples=data.map(x=>x.decisions[kind]);
 const a=samples.map(x=>x.regretBP);
 return {roots:a.length,games:new Set(data.map(x=>x.seed)).size,
  meanExactQRegretBP:mean(a),
  mathematicalOptimalActions:samples.filter(x=>x.optimal).length,
  zeroScoreSelections:samples.filter(x=>x.zeroScore).length,
  meanDecisionMs:mean(samples.map(x=>x.elapsedMs)),
  p95DecisionMs:samples.map(x=>x.elapsedMs).sort((a,b)=>a-b)[Math.floor(.95*(samples.length-1))]};
}
const validationRows=makePolicyRows(valRoots);
const validation=Object.fromEntries(candidates.map(kind=>[kind,summarize(validationRows,kind)]));
const selected=candidates.slice().sort((a,b)=>
 validation[a].meanExactQRegretBP-validation[b].meanExactQRegretBP)[0];
const freeze={
 status:'FROZEN_BEFORE_TEST',
 chosenBy:'validation mean exact Oracle2 current-turn Q regret',
 selected,
 selectionRule:"minimum validation exact Q regret; ties favour earlier candidate [myopic,stage,linear,neural]",
 validationSeeds:summary.gameSplit.validation.seedRange,
 testSeeds:summary.gameSplit.test.seedRange,
 training:summary.gameSplit.train,
 validation,model:prefix+'.weights.json',
 caveat:"Oracle2 numerically complete Float64 Bellman <=3 remaining turns, no 28-turn proof"
};
writeFileSync(prefix+'.frozen-selection.json',JSON.stringify(freeze,null,2)+'\n');
const testRows=makePolicyRows(testRoots);
function bootstrapPerGame(data,fun){
 const gameMap=new Map();
 for(const item of data){
  if(!gameMap.has(item.seed))gameMap.set(item.seed,[]);
  gameMap.get(item.seed).push(fun(item));
 }
 const game=[...gameMap.values()].map(mean);
 assert.ok(game.length>=4);
 let seed=0xa823b6ce;
 const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/2**32;};
 const boot=[];
 for(let b=0;b<5000;b++){
  let sum=0;for(let j=0;j<game.length;j++)sum+=game[Math.floor(rand()*game.length)];
  boot.push(sum/game.length);
 }
 boot.sort((a,b)=>a-b);
 return {nIndependentGames:game.length,meanGame:mean(game),ci95:[boot[124],boot[4874]]};
}
function reportFor(data){
 const cases=Object.fromEntries(candidates.map(kind=>[kind,{
  ...summarize(data,kind),
  regretCI95GameBootstrap:bootstrapPerGame(data,x=>x.decisions[kind].regretBP).ci95,
  deltaRegretVsMyopicGameBootstrap:bootstrapPerGame(data,x=>
    x.decisions[kind].regretBP-x.decisions.myopic.regretBP)
 }]));
 return cases;
}
const test=reportFor(testRows);
const breakdown={};
for(const group of ['uniform','scoreaware','scratch']){
 const r=testRows.filter(x=>x.kind===group);
 breakdown[group]=reportFor(r);
}
for(const rem of [1,2,3]){
 const r=testRows.filter(x=>x.remaining===rem);
 breakdown['remaining_'+rem]=reportFor(r);
}
for(const source of ['observed','designed_possible_roll']){
 breakdown[source]=reportFor(testRows.filter(x=>x.source===source));
}
const valueErrors={};
const exactStates=rows.filter(r=>r.split==='test'&&r.boundary.status==='EXACT_FLOAT64');
for(const kind of ['stage','linear','neural']){
 const errors=exactStates.map(r=>predictContinuation(r.card,w,kind)-r.boundary.optimalRemainingBP);
 valueErrors[kind]={states:errors.length,maeBP:mean(errors.map(Math.abs)),
   rmseBP:Math.sqrt(mean(errors.map(x=>x*x)))};
}
const summaryReport={
 status:'COMPLETE_INDEPENDENT_MATH_Q_HOLDOUT_NO_PRODUCTION_POLICY',
 numericalTeacher:'Oracle 2.0 finite horizon EXACT_FLOAT64 for 1-3 remaining turns',
 independentTestGames:seen.test.size,testRoots:testRoots.length,
 nativeQTestActionLabels:testRoots.reduce((s,r)=>s+Object.keys(r.qReference.actions).length,0),
 selectedUsingValidationOnly:selected,validation,
 test,breakdown,valueErrors,
 selectedRegretVsMathematicallyOptimal:test[selected].meanExactQRegretBP,
 selectedMinusMyopicBootstrap:test[selected].deltaRegretVsMyopicGameBootstrap,
 teacherOptimalExpectedQRegret:0,
 testElapsedMs:performance.now()-start,parentPeakRssBytes:process.memoryUsage().rss,
 node:process.version,
 claims:[
  'The locked test measures exact Q regret relative to Oracle2, not improvement versus production Oracle',
  'These test states cover only 1-3 remaining turns, with mathematical teacher exact within Float64 accuracy',
  'The student cannot infer a certified globally optimal 28-turn policy from these labels',
  'Synthetic dice examples are deliberately sampled and must be reported separately',
  'Training, selection, sampling and evaluation use zero production Oracle dependencies',
  'No improvement claim for full final Big Points is supported by this isolated endgame evaluation'
 ]
};
writeFileSync(prefix+'.pure-test.json',JSON.stringify({report:summaryReport,examples:testRows
 .filter(x=>x.decisions[selected].regretBP>1e-8)
 .sort((a,b)=>b.decisions[selected].regretBP-a.decisions[selected].regretBP)
 .slice(0,10),allRows:testRows},null,2)+'\n');
writeFileSync(prefix+'.pure-summary.json',JSON.stringify(summaryReport,null,2)+'\n');
console.log('ORACLE3_PURE_HELDOUT='+JSON.stringify(summaryReport));
