import assert from 'node:assert/strict';
import {performance} from 'node:perf_hooks';
import {recommend} from '../../../src/logic/oracle/index.js';
import {cachedRecommend,cachedPolicy} from './cached-oracle.mjs';
import {productionPolicy} from './production-baseline.mjs';
import {rng,roll,initialScorecard,play,applyScore,CATEGORIES} from './simulator.mjs';

function signature(a){return a.type==='SCORE_NOW'?'S:'+a.category:'H:'+a.held.join(',');}
const random=rng(309091),states=[];
for(let game=0;game<4;game++){
 let card=initialScorecard();
 for(let turn=0;turn<28;turn++){
  const dice=roll(random);
  for(let left=0;left<=2;left++)states.push({scorecard:card,currentDice:dice,rollsRemaining:left});
  const legal=CATEGORIES.filter(c=>card[c].includes(null));
  card=applyScore(card,legal[Math.floor(random()*legal.length)],dice).card;
 }
}
let hits=0,misses=0,maxAbsBpivDiff=0;
const started=performance.now();
for(const state of states){
 const original=recommend(state).actions[0];
 const fast=cachedRecommend(state);
 assert.equal(signature(fast.action),signature(original),'action mismatch '+JSON.stringify(state));
 maxAbsBpivDiff=Math.max(maxAbsBpivDiff,Math.abs(fast.action.bpiv-original.bpiv));
 assert.ok(Math.abs(fast.action.bpiv-original.bpiv)<1e-8,'BPIV mismatch');
 hits+=fast.cacheHits;misses+=fast.cacheMisses;
}
const parityMs=performance.now()-started;
const seed=20261104,n=5;
function batch(policy){const t=performance.now(),out=[];for(let i=0;i<n;i++)out.push(play(seed+i,policy));return {ms:performance.now()-t,out};}
const baseline=batch(productionPolicy),cached=batch(cachedPolicy);
for(let i=0;i<n;i++)assert.deepEqual(cached.out[i],baseline.out[i],'full game divergence '+i);
const summary={statesChecked:states.length,fullGamesCompared:n,cacheHits:hits,cacheMisses:misses,hitRate:hits/(hits+misses),maxAbsBpivDiff,parityMs,productionMs:baseline.ms,cachedMs:cached.ms,speedup:baseline.ms/cached.ms,productionMeanBP:baseline.out.reduce((s,x)=>s+x.big,0)/n,allGamesIdentical:true,node:process.version,limitations:['Small timing sample: CI not established','This is BPIV acceleration, not a new AI model','Action parity on sampled states and complete games, not a universal proof']};
console.log(JSON.stringify(summary,null,2));
