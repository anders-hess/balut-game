// Small phase-3 functional smoke, NOT a policy-performance claim.
import assert from 'node:assert/strict';
import {performance} from 'node:perf_hooks';
import {readFileSync,writeFileSync} from 'node:fs';
import {play} from '../phase1/simulator.mjs';
import {cachedPolicy} from '../phase1/cached-oracle.mjs';
import {loadNeuralValue,makePolicy} from './expectimax.mjs';
const weights=process.argv[2]??'oracle3-neural.weights.json';
const value=loadNeuralValue(weights),policy=makePolicy(value);
const seeds=[900000000,900000001],games=[];
const start=performance.now();
for(const seed of seeds){
 const t=performance.now(),baseline=play(seed,cachedPolicy),baselineMs=performance.now()-t;
 const t2=performance.now(),candidate=play(seed,policy),candidateMs=performance.now()-t2;
 assert.ok(Number.isFinite(candidate.big));
 games.push({seed,baselineBig:baseline.big,candidateBig:candidate.big,deltaBig:candidate.big-baseline.big,baselineMs,candidateMs});
}
const result={n:games.length,seedRange:[seeds[0],seeds.at(-1)],games,meanDeltaBig:games.reduce((s,x)=>s+x.deltaBig,0)/games.length,wallMs:performance.now()-start,node:process.version,limitations:['Only 2 games; no confidence interval or improvement claim','Training data contains Oracle 1.0 policy trajectories; neural value is approximate','Common seed stream is a coupling, but divergent reroll patterns consume different RNG draws','Final policy performance is NOT validated; do not deploy']};
writeFileSync('oracle3-phase3-smoke.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));
