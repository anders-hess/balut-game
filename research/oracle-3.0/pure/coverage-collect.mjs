// Oracle 3.0 independent coverage experiment: all 28 turns have a legal,
// explicitly replayable witness with positive first-roll probability.
// Oracle2 native mathematics, never an old advisor, supplies all Q*/V* labels.
import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {performance} from 'node:perf_hooks';
import {totals} from '../phase1/simulator.mjs';
import {exactAtBoundary,exactAtRoll,encodeCard,ORACLE2_SOURCE_BLOB} from '../oracle2/adapter.mjs';
import {exactFeatures,FEATURE_VERSION,assertSeedPartition} from '../oracle2/features.mjs';
import {coverageSampler,auditWitness} from './coverage-sampler.mjs';

const n=Number(process.argv[2]??120),seedBase=Number(process.argv[3]??960200000);
const prefix=process.argv[4]??'oracle3-math-coverage';
assert.equal(n,120);assert.equal(seedBase,960200000);
const start=performance.now(),rows=[],failures=[],games=[],counts={};
const kinds=['threshold','bonus','strike'];
const caps={cap:500000,timeoutMs:20000};
for(let i=0;i<n;i++){
 const seed=seedBase+i,kind=kinds[i%3],split=i<72?'train':i<96?'validation':'test';
 const played=coverageSampler(seed,{kind});
 const replay=auditWitness(played.witness);
 assert.equal(totals(replay).big,played.finalBP);
 games.push({...played,split,roots:undefined});
 for(const root of played.roots){
  assert.equal(root.remaining,encodeCard(root.card).remaining);
  const currentBP=totals(root.card).big;
  const isBoundary=root.source==='observed';
  const nativeV=isBoundary?exactAtBoundary(root.card,caps):null;
  const nativeQ=exactAtRoll(root,caps);
  if(nativeV&&nativeV.status!=='EXACT_FLOAT64')
   failures.push({seed,kind,remaining:root.remaining,type:'boundary',status:nativeV.status,reason:nativeV.reason});
  if(nativeQ.status!=='EXACT_FLOAT64')
   failures.push({seed,kind,remaining:root.remaining,type:'q',status:nativeQ.status,reason:nativeQ.reason});
  rows.push({...root,split,features:exactFeatures(root.card),currentBP,
   boundary:!nativeV?{status:'DESIGNED_DICE_DUPLICATE_CARD_NOT_TRAIN_LABEL'}:
    nativeV.status==='EXACT_FLOAT64'?{
     status:'EXACT_FLOAT64',optimalFinalBP:nativeV.value,
     optimalRemainingBP:nativeV.value-currentBP,
     states:nativeV.states,wallMs:nativeV.wallMs,dpSeconds:nativeV.seconds}:nativeV,
   qReference:nativeQ.status==='EXACT_FLOAT64'?{
    status:'EXACT_FLOAT64',optimalFinalBP:nativeQ.value,
    actions:nativeQ.actions,states:nativeQ.states,
    wallMs:nativeQ.wallMs,dpSeconds:nativeQ.seconds}:nativeQ});
  const key=[split,kind,root.remaining,root.source].join('_');
  counts[key]??={attempted:0,solvedQ:0,solvedBoundary:0};
  counts[key].attempted++;
  counts[key].solvedQ+=+(nativeQ.status==='EXACT_FLOAT64');
  counts[key].solvedBoundary+=+(nativeV?.status==='EXACT_FLOAT64');
 }
}
const gameSplit=assertSeedPartition(rows,seedBase,n);
const boundarySolved=rows.filter(r=>r.boundary.status==='EXACT_FLOAT64').length;
const qSolved=rows.filter(r=>r.qReference.status==='EXACT_FLOAT64').length;
const bps=games.map(g=>g.beforeBig),sps=games.map(g=>g.beforeSmall);
const avg=a=>a.reduce((x,y)=>x+y,0)/a.length;
const bonusReachable=games.filter(g=>g.beforeSmall>=300).length;
const targetNearThreshold=games.filter(g=>g.threshold.some(t=>t.unfilled>0&&t.score<t.threshold
  &&t.score>=t.threshold-30)).length;
const summary={
 status:'MATH_ONLY_COVERAGE_CONSTRUCTED_VALID_REACHABLE_STATES',
 sourceBlobSha:ORACLE2_SOURCE_BLOB,featureVersion:FEATURE_VERSION,
 simulation:"independent legal positive-probability dice witness; deliberately stratified, not game-frequency distributed",
 seedBase,nGames:n,seeds:[seedBase,seedBase+n-1],gameSplit,
 nRoots:rows.length,boundaryAttempted:n*3,qAttempted:n*4,
 solvedBoundary:boundarySolved,solvedQ:qSolved,
 actionQLabels:rows.reduce((v,r)=>v+(r.qReference.actions?Object.keys(r.qReference.actions).length:0),0),
 zeroScoreActionAlternatives:rows.reduce((v,r)=>v+(r.qReference.actions?Object.keys(r.qReference.actions).filter(k=>k.startsWith('score:')&&k.endsWith(':0')).length:0),0),
 legalWitnessTurns:games.reduce((v,g)=>v+g.witness.length,0),
 bySplitKindHorizon:counts,failedLabels:failures.length,
 kindCounts:{threshold:40,bonus:40,strike:40},
 coverage:{meanBigPointsBefore3Turns:avg(bps),
  meanSmallPointsBefore3Turns:avg(sps),beforeSmallAtLeast300Games:bonusReachable,
  nearThresholdWithAvailableSlotGames:targetNearThreshold,
  beforeSmallRange:[Math.min(...sps),Math.max(...sps)],
  nonzeroPositiveBalutGames:games.filter(g=>g.positiveBalut>0).length,
  nonzeroPositiveStraightGames:games.filter(g=>g.positiveStraight>0).length,
  nonzeroPositiveFullHouseGames:games.filter(g=>g.positiveFullHouse>0).length,
  zeroScoreEntries:games.reduce((v,g)=>v+g.zeroScores,0)},
 wallMs:performance.now()-start,parentPeakRssBytes:process.memoryUsage().rss,
 node:process.version,
 limitations:[
  'All scorecards have an explicit 28-turn witness with dice outcomes of positive probability, not necessarily common outcomes',
  'This is a designed reward-rich test distribution, not an unbiased natural game performance estimate',
  'The designed extra roll has a possible outcome but not a frequency-weighted sample',
  'Native exact teacher is complete Float64 finite-horizon DP for up to three remaining turns, not a formal 28-turn proof',
  'Exact native cap/resource errors are explicitly captured, no fabricated labels',
  'Parent RSS excludes native C++ child peak RSS'
 ]};
writeFileSync(prefix+'.json',JSON.stringify({summary,rows,failures,games})+'\n');
writeFileSync(prefix+'.collection.json',JSON.stringify(summary,null,2)+'\n');
console.log('ORACLE3_COVERAGE_COLLECTION='+JSON.stringify(summary));
assert.ok(qSolved>=Math.floor(n*4*.85),'insufficient native Q solvability');
assert.ok(boundarySolved>=Math.floor(n*3*.85),'insufficient mathematical boundary solvability');
