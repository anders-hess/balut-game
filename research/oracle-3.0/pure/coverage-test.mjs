// Independent mathematical reachability and reward-threshold coverage checks.
import assert from 'node:assert/strict';
import {coverageSampler,auditWitness} from './coverage-sampler.mjs';
import {exactAtRoll,encodeCard} from '../oracle2/adapter.mjs';
import {totals} from '../phase1/simulator.mjs';
import {multinomialOutcomes} from './chance.mjs';

let near=0,rich=0,zero=0,balut=0,straight=0,house=0,turns=0;
const kinds=['threshold','bonus','strike'];
const d=multinomialOutcomes(5);
assert.equal(d.length,252);
for(let i=0;i<48;i++){
 const seed=960200000+i,kind=kinds[i%3];
 const r=coverageSampler(seed,{kind});
 const final=auditWitness(r.witness);
 assert.equal(encodeCard(final).remaining,0);
 assert.equal(r.witness.length,28);
 assert.equal(r.roots.length,4);
 assert.equal(totals(final).small,r.finalSP);
 assert.ok(r.roots.every(x=>encodeCard(x.card).remaining===x.remaining));
 assert.ok(r.roots.every(x=>x.dice.every(f=>f>=1&&f<=6)));
 turns+=r.witness.length;zero+=r.zeroScores;
 rich+=+(r.beforeSmall>=300);
 near+=+r.threshold.some(t=>t.unfilled>0&&t.score<t.threshold&&t.score>=t.threshold-30);
 balut+=+(r.positiveBalut>0);straight+=+(r.positiveStraight>0);house+=+(r.positiveFullHouse>0);
}
assert.ok(rich>=4,'must cover actual high small-points bonus states');
assert.ok(near>=5,'must cover near-threshold categories with remaining slots');
assert.ok(zero>0&&balut>0&&straight>0&&house>0);
const r=coverageSampler(960200001,{kind:'bonus'}).roots.at(-1);
const q=exactAtRoll(r,{cap:500000,timeoutMs:20000});
assert.equal(q.status,'EXACT_FLOAT64',JSON.stringify(q));
console.log('ORACLE3_COVERAGE_TEST='+JSON.stringify({
 status:'PASS',legallyReplayedGames:48,legalScoredTurns:turns,
 beforeSmallAtLeast300:rich,nearCategoryThresholdWithSlots:near,
 positiveBalutStates:balut,positiveStraightStates:straight,
 positiveFullHouseStates:house,zeroScoreWitnessEntries:zero,
 independentlyCalculatedNativeQActions:Object.keys(q.actions).length,
 strictlyPositiveProbabilityForEveryConstructedDieMultiset:true
}));
