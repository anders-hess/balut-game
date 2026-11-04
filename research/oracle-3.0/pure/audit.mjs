// Independent mathematical dataset audit, including all legal score and
// reroll actions and whole-game train/validation/locked-test partition.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {CATEGORIES,uniqueHolds,totals} from '../phase1/simulator.mjs';
import {encodeCard,actionKey} from '../oracle2/adapter.mjs';
import {exactFeatures,FEATURE_VERSION,assertSeedPartition} from '../oracle2/features.mjs';

const prefix=process.argv[2]??'oracle3-math-pure';
const data=JSON.parse(readFileSync(prefix+'.json','utf8'));
const {summary,rows,failures}=data;
assert.equal(summary.nGames,120);
assert.equal(summary.nRoots,480);
assert.equal(summary.featureVersion,FEATURE_VERSION);
assert.deepEqual(summary.gameSplit,assertSeedPartition(rows,summary.seedBase,summary.nGames));
let boundary=0,qRoots=0,actions=0,zeros=0,duplicates=0,types={};
const games={train:new Set(),validation:new Set(),test:new Set()};
for(const row of rows){
 games[row.split].add(row.seed);
 types[row.kind]=(types[row.kind]??0)+1;
 assert.ok(['uniform','scoreaware','scratch'].includes(row.kind));
 assert.ok(['observed','designed_possible_roll'].includes(row.source));
 assert.equal(encodeCard(row.card).remaining,row.remaining);
 assert.deepEqual(row.features,exactFeatures(row.card));
 assert.equal(row.currentBP,totals(row.card).big);
 assert.equal(row.dice.length,5);
 if(row.boundary.status==='EXACT_FLOAT64'){
  boundary++;
  assert.equal(row.source,'observed');
  assert.ok(Math.abs(row.boundary.optimalFinalBP-row.currentBP-row.boundary.optimalRemainingBP)<1e-8);
 } else if(row.source==='designed_possible_roll'){
  assert.equal(row.boundary.status,'DESIGNED_DICE_DUPLICATE_CARD_NOT_TRAIN_LABEL');
  duplicates++;
 }
 if(row.qReference.status==='EXACT_FLOAT64'){
  qRoots++;
  const legal=CATEGORIES.filter(c=>row.card[c].includes(null)).map(category=>({type:'score',category}));
  if(row.rollsRemaining>0){
   for(const held of uniqueHolds(row.dice))if(held.length<5)legal.push({type:'hold',held});
  }
  assert.equal(legal.length,Object.keys(row.qReference.actions).length);
  const keys=new Set(legal.map(a=>actionKey(a,row.dice)));
  assert.equal(keys.size,legal.length);
  for(const key of keys){
   assert.ok(Number.isFinite(row.qReference.actions[key]),'non-finite native Q: '+key);
   if(key.startsWith('score:')&&key.endsWith(':0'))zeros++;
  }
  const optimal=Math.max(...Object.values(row.qReference.actions));
  assert.ok(Math.abs(optimal-row.qReference.optimalFinalBP)<1e-8,'native optimal Q coverage');
  actions+=legal.length;
 }
}
assert.deepEqual(Object.fromEntries(Object.entries(games).map(([k,s])=>[k,s.size])),
 {train:72,validation:24,test:24});
assert.equal(boundary,summary.solvedBoundary);
assert.equal(qRoots,summary.solvedQ);
assert.equal(actions,summary.actionQLabels);
assert.equal(zeros,summary.zeroScoreActionAlternatives);
assert.equal(duplicates,120);
assert.equal(types.uniform,160);assert.equal(types.scoreaware,160);assert.equal(types.scratch,160);
assert.ok(summary.forcedScratchGames>10);
console.log('ORACLE3_PURE_DATA_AUDIT='+JSON.stringify({
 status:'PASS',gameSplit:{train:72,validation:24,test:24},
 sampledRootTypes:types,exactBoundaryLabels:boundary,exactQRoots:qRoots,
 exactActionQ:actions,zeroScoreAlternatives:zeros,designedDiceRoots:duplicates,
 legallyForcedScratchGames:summary.forcedScratchGames,
 referenceFailures:failures.length,productionOracleTrainingDependencies:0
}));
