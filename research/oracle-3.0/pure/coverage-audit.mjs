// Independent reward-rich reachable-state witness and Oracle2 Q/V audit.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {CATEGORIES,uniqueHolds,totals} from '../phase1/simulator.mjs';
import {encodeCard,actionKey} from '../oracle2/adapter.mjs';
import {exactFeatures,assertSeedPartition} from '../oracle2/features.mjs';
import {auditWitness} from './coverage-sampler.mjs';

const prefix=process.argv[2]??'oracle3-math-coverage';
const {summary,rows,games,failures}=JSON.parse(readFileSync(prefix+'.json','utf8'));
assert.equal(summary.nGames,120);
assert.equal(rows.length,480);
assert.equal(games.length,120);
assert.deepEqual(summary.gameSplit,assertSeedPartition(rows,summary.seedBase,summary.nGames));
let witnessed=0,solvedQ=0,solvedBoundary=0,QCount=0,zeroOptions=0;
const type={},sets={train:new Set(),validation:new Set(),test:new Set()};
for(const g of games){
 const final=auditWitness(g.witness);
 assert.equal(totals(final).big,g.finalBP);
 assert.equal(totals(final).small,g.finalSP);
 witnessed+=g.witness.length;
 const roots=rows.filter(r=>r.seed===g.seed);
 assert.equal(roots.length,4);
 const before=roots.find(r=>r.remaining===3&&r.source==='observed').card;
 assert.equal(encodeCard(before).remaining,3);
 const actualSP=Object.values(before).flat().reduce((s,v)=>s+(v??0),0);
 assert.equal(actualSP,g.beforeSmall);
 const replayFirst25=auditWitness; // full witness validated above
 assert.ok(g.witness.every(w=>w.dice.every(d=>d>=1&&d<=6)));
}
for(const row of rows){
 sets[row.split].add(row.seed);
 type[row.kind]=(type[row.kind]??0)+1;
 assert.ok(['threshold','bonus','strike'].includes(row.kind));
 assert.ok(['observed','designed_possible_roll'].includes(row.source));
 assert.equal(encodeCard(row.card).remaining,row.remaining);
 assert.equal(totals(row.card).big,row.currentBP);
 assert.deepEqual(exactFeatures(row.card),row.features);
 if(row.boundary.status==='EXACT_FLOAT64'){
  solvedBoundary++;
  assert.equal(row.source,'observed');
  assert.ok(Math.abs(row.boundary.optimalFinalBP-row.currentBP-row.boundary.optimalRemainingBP)<1e-8);
 }
 if(row.qReference.status==='EXACT_FLOAT64'){
  solvedQ++;
  const valid=CATEGORIES.filter(c=>row.card[c].includes(null)).map(category=>({type:'score',category}));
  if(row.rollsRemaining>0)for(const held of uniqueHolds(row.dice))
   if(held.length<5)valid.push({type:'hold',held});
  const expected=new Set(valid.map(a=>actionKey(a,row.dice)));
  assert.equal(expected.size,valid.length);
  assert.equal(Object.keys(row.qReference.actions).length,valid.length);
  const max=Math.max(...Object.values(row.qReference.actions));
  assert.ok(Math.abs(max-row.qReference.optimalFinalBP)<1e-8);
  for(const key of expected){
   assert.ok(Number.isFinite(row.qReference.actions[key]),'missing native exact Q '+key);
   if(key.startsWith('score:')&&key.endsWith(':0'))zeroOptions++;
  }
  QCount+=valid.length;
 }
}
assert.deepEqual(Object.fromEntries(Object.entries(sets).map(([k,s])=>[k,s.size])),
 {train:72,validation:24,test:24});
assert.equal(witnessed,3360);
assert.equal(solvedQ,summary.solvedQ);
assert.equal(solvedBoundary,summary.solvedBoundary);
assert.equal(QCount,summary.actionQLabels);
assert.equal(zeroOptions,summary.zeroScoreActionAlternatives);
assert.deepEqual(type,{threshold:160,bonus:160,strike:160});
assert.ok(summary.coverage.beforeSmallAtLeast300Games>10,
 'bonus-rich constructed states are required');
assert.ok(summary.coverage.nearThresholdWithAvailableSlotGames>10,
 'deliberate threshold-near reachable states are required');
console.log('ORACLE3_COVERAGE_AUDIT='+JSON.stringify({
 status:'PASS',nWitnessGames:games.length,legallyReplayedTurnScores:witnessed,
 independentTrainGames:72,validationGames:24,lockedTestGames:24,
 QRootCount:solvedQ,preRollOptimalValues:solvedBoundary,allLegalQ:QCount,
 zeroScoreAlternatives:zeroOptions,rootProfiles:type,
 bonusRichStates:summary.coverage.beforeSmallAtLeast300Games,
 nearThresholdStates:summary.coverage.nearThresholdWithAvailableSlotGames,
 productionOracleDependencies:0,failures:failures.length
}));
