// Independent dataset audit after generation; protects split integrity, Markov
// feature determinism and native action-Q consistency before ML training.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {CATEGORIES,uniqueHolds,totals} from '../phase1/simulator.mjs';
import {encodeCard} from './adapter.mjs';
import {exactFeatures,FEATURE_DIM,FEATURE_VERSION,assertSeedPartition} from './features.mjs';

const prefix=process.argv[2]??'oracle3-phase4-supervised';
const d=JSON.parse(readFileSync(prefix+'.json','utf8'));
const s=d.summary,rows=d.rows;
assert.equal(s.featureVersion,FEATURE_VERSION);
assert.equal(rows.length,s.nGames*3);
const groups=assertSeedPartition(rows,s.seedBase,s.nGames);
assert.deepEqual(groups,s.gameSplit);
let fullQ=0,fullV=0,actions=0;
for(const r of rows){
 assert.equal(r.remaining,encodeCard(r.card).remaining);
 assert.equal(r.features.length,FEATURE_DIM);
 assert.deepEqual(r.features,exactFeatures(r.card));
 assert.equal(r.currentBP,totals(r.card).big);
 assert.equal(r.rollsRemaining,2);
 assert.equal(r.dice.length,5);
 if(r.boundary.status==='EXACT_FLOAT64'){
  fullV++;
  assert.ok(Number.isFinite(r.boundary.optimalRemainingBP));
  assert.ok(Math.abs(r.boundary.optimalFinalBP-r.currentBP-r.boundary.optimalRemainingBP)<1e-8);
 }
 if(r.qReference.status==='EXACT_FLOAT64'){
  fullQ++;
  const a=r.qReference.actions;
  const legal=CATEGORIES.filter(c=>r.card[c].some(v=>v===null));
  const held=uniqueHolds(r.dice).filter(h=>h.length<5);
  const expected=legal.length+held.length;
  assert.equal(Object.keys(a).length,expected,'missing native legal action Q');
  actions+=expected;
  const best=Math.max(...Object.values(a));
  assert.ok(Math.abs(best-r.qReference.optimalFinalBP)<1e-8,'Bellman Q max mismatch');
  assert.ok(r.productionQRegret>=-1e-8);
 }
}
assert.equal(fullV,s.solvedBoundary);
assert.equal(fullQ,s.solvedQ);
assert.equal(actions,s.availableActionQLabels);
console.log('ORACLE3_DATASET_AUDIT='+JSON.stringify({
 status:'PASS',attempted:rows.length,exactStateLabels:fullV,
 exactPresentRootQ:fullQ,actionQLabels:actions,wholeGameSplit:true,
 testSeedRange:s.gameSplit.test.seedRange
}));
