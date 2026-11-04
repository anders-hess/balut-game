// Validate phase-2 dataset written by collect.mjs, including leakage safeguards.
// Usage: node research/oracle-3.0/phase2/validate-dataset.mjs oracle3-trajectories
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {TRAIN_SEED_BASE,VALID_SEED_BASE,TEST_SEED_BASE} from './collect.mjs';
const prefix=process.argv[2]??'oracle3-trajectories';
const meta=JSON.parse(readFileSync(prefix+'.metrics.json','utf8'));
const lines=readFileSync(prefix+'.jsonl','utf8').trim().split('\n');
const rows=lines.map(line=>JSON.parse(line));
assert.equal(rows.length,meta.turnRows);
assert.equal(rows.length,meta.n*28);
assert.ok(meta.baseSeed+meta.n<=VALID_SEED_BASE || meta.baseSeed>=VALID_SEED_BASE);
assert.ok(meta.baseSeed+meta.n<=TEST_SEED_BASE || meta.baseSeed>=TEST_SEED_BASE);
const bySeed=new Map();
for(const row of rows){
 assert.equal(row.state.length,59);
 assert.ok(row.state.every(Number.isFinite));
 assert.ok(Number.isFinite(row.targetFinalBigPoints));
 assert.ok(Number.isFinite(row.remainingBigPoints));
 assert.ok(Number.isInteger(row.turn)&&row.turn>=0&&row.turn<28);
 assert.ok(Math.abs(row.remainingBigPoints-(row.targetFinalBigPoints-row.state[58]*20))<1e-8);
 if(!bySeed.has(row.seed))bySeed.set(row.seed,[]);
 bySeed.get(row.seed).push(row);
}
assert.equal(bySeed.size,meta.n);
for(let i=0;i<meta.n;i++){
 const seed=meta.baseSeed+i,rs=bySeed.get(seed);
 assert.ok(rs,'missing seed '+seed);assert.equal(rs.length,28);
 for(let t=0;t<28;t++){
  assert.equal(rs[t].turn,t);
  assert.ok(Math.abs(rs[t].state[56]-(t+1)/28)<1e-12);
  assert.equal(rs[t].targetFinalBigPoints,rs[0].targetFinalBigPoints);
 }
 assert.ok(Math.abs(rs[27].remainingBigPoints)<1e-8,'terminal continuation value must be zero');
}
const result={pass:true,uniqueGames:bySeed.size,rows:rows.length,features:59,seedRange:[meta.baseSeed,meta.baseSeed+meta.n-1],meanFinalBigPoints:meta.meanFinalBigPoints,node:process.version};
console.log(JSON.stringify(result,null,2));
