import assert from 'node:assert/strict';
import {trajectory,featureVector,TRAIN_SEED_BASE,VALID_SEED_BASE,TEST_SEED_BASE} from './collect.mjs';
import {initialScorecard,CATEGORIES,totals} from '../phase1/simulator.mjs';
import {cachedPolicy} from '../phase1/cached-oracle.mjs';
const seed=TRAIN_SEED_BASE;
assert.ok(TRAIN_SEED_BASE+100000<VALID_SEED_BASE);
assert.ok(VALID_SEED_BASE+100000<TEST_SEED_BASE);
const empty=featureVector(initialScorecard());assert.equal(empty.length,59);
assert.ok(empty.every(x=>x===0));
const a=trajectory(seed,cachedPolicy),b=trajectory(seed,cachedPolicy);
assert.deepEqual(a,b);assert.equal(a.turns.length,28);
assert.equal(a.turns.reduce((s,t)=>s+t.observations.length,0),a.decisions);
for(let i=0;i<28;i++){
 const t=a.turns[i];assert.equal(t.turn,i);
 assert.equal(t.before.length,59);assert.equal(t.after.length,59);
 assert.equal(t.before[56],i/28);assert.equal(t.after[56],(i+1)/28);
 assert.ok(CATEGORIES.includes(t.category));
 assert.ok(t.observations.length>=1&&t.observations.length<=3);
 if(i<27)assert.deepEqual(t.after,a.turns[i+1].before);
}
assert.equal(a.turns[27].after[58]*20,a.finalBigPoints);
console.log(JSON.stringify({pass:true,seed,turns:a.turns.length,decisions:a.decisions,finalBigPoints:a.finalBigPoints,finalSmallPoints:a.finalSmallPoints}));
