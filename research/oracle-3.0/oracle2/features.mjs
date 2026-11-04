// Oracle 3.0 phase-4 exact-Bellman learning: compact, Markov-sufficient value features.
// Each feature is a deterministic, scale-normalized component of Oracle 2.0's
// verified quotient state. A full original 28-cell scorecard is NOT necessary.
import assert from 'node:assert/strict';
import {totals} from '../phase1/simulator.mjs';
import {encodeCard} from './adapter.mjs';

export const FEATURE_VERSION='oracle2-v46-markov-17-v1';
export const FEATURE_DIM=17;
export function exactFeatures(card){
 const s=encodeCard(card);
 const f=[
  ...s.k.map(k=>k/4),
  ...s.p.map((v,j)=>v/[52,65,78,100][j]),
  s.st/4,s.fh/4,s.ba/4,
  s.total/700,
  totals(card).big/20,
  s.remaining/28
 ];
 assert.equal(f.length,FEATURE_DIM);
 assert.ok(f.every(Number.isFinite));
 return f;
}
export function assertSeedPartition(rows,seedBase,n){
 assert.ok(Number.isInteger(seedBase)&&Number.isInteger(n)&&n>=15);
 const a=Math.floor(n*0.6),b=a+Math.floor(n*0.2);
 const seen={train:new Set(),validation:new Set(),test:new Set()};
 for(const r of rows){
  const offset=r.seed-seedBase;
  assert.ok(Number.isInteger(offset)&&offset>=0&&offset<n,'unexpected seed');
  const expected=offset<a?'train':offset<b?'validation':'test';
  assert.equal(r.split,expected,'game-level leakage');
  seen[expected].add(r.seed);
 }
 assert.equal(seen.train.size,a);
 assert.equal(seen.validation.size,b-a);
 assert.equal(seen.test.size,n-b);
 return Object.fromEntries(Object.entries(seen).map(([key,s])=>[key,{games:s.size,seedRange:[Math.min(...s),Math.max(...s)]}]));
}
