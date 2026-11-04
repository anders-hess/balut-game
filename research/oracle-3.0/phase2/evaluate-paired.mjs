// Oracle 3.0 iteration 9: evaluate neural value against a stronger, turn-conditioned
// Oracle-continuation baseline using independent GAMES as paired units.
// node research/oracle-3.0/phase2/evaluate-paired.mjs oracle3-trajectories oracle3-neural
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
const input=process.argv[2]??'oracle3-trajectories',modelPrefix=process.argv[3]??'oracle3-neural';
const rows=readFileSync(input+'.jsonl','utf8').trim().split('\n').map(JSON.parse);
const weights=JSON.parse(readFileSync(modelPrefix+'.weights.json','utf8'));
const seeds=[...new Set(rows.map(r=>r.seed))].sort((a,b)=>a-b);
const a=Math.floor(seeds.length*.6),b=a+Math.floor(seeds.length*.2);
const trainSeeds=new Set(seeds.slice(0,a)),testSeeds=new Set(seeds.slice(b));
const train=rows.filter(r=>trainSeeds.has(r.seed)),test=rows.filter(r=>testSeeds.has(r.seed));
assert.ok(test.length>0&&train.length>0);assert.equal(train.length,trainSeeds.size*28);assert.equal(test.length,testSeeds.size*28);
const means=Array(28).fill(0),counts=Array(28).fill(0);
for(const r of train){assert.ok(r.turn>=0&&r.turn<28);means[r.turn]+=r.remainingBigPoints;counts[r.turn]++;}
for(let i=0;i<28;i++){assert.equal(counts[i],trainSeeds.size);means[i]/=counts[i];}
const {mu,sd}=weights.normalization;assert.equal(mu.length,59);assert.equal(sd.length,59);
function predict(state){const x=state.map((v,j)=>(v-mu[j])/sd[j]);let y=weights.b2;for(let k=0;k<weights.w2.length;k++){let z=weights.b1[k];for(let j=0;j<x.length;j++)z+=weights.w1[k][j]*x[j];y+=weights.w2[k]*Math.tanh(z);}return y*10;}
const grouped=new Map();
for(const r of test){const errN=predict(r.state)-r.remainingBigPoints,errT=means[r.turn]-r.remainingBigPoints;
 if(!grouped.has(r.seed))grouped.set(r.seed,[]);
 grouped.get(r.seed).push({turn:r.turn,neural:Math.abs(errN),turnBaseline:Math.abs(errT),neuralSq:errN*errN,turnSq:errT*errT});
}
const gameRows=[...grouped].map(([seed,rs])=>({seed,neuralMae:rs.reduce((s,r)=>s+r.neural,0)/rs.length,turnMae:rs.reduce((s,r)=>s+r.turnBaseline,0)/rs.length,neuralMse:rs.reduce((s,r)=>s+r.neuralSq,0)/rs.length,turnMse:rs.reduce((s,r)=>s+r.turnSq,0)/rs.length}));
const n=gameRows.length;assert.ok(n>=5);
const diffs=gameRows.map(r=>r.turnMae-r.neuralMae);
const avg=xs=>xs.reduce((a,b)=>a+b,0)/xs.length;
const delta=avg(diffs),sdDiff=Math.sqrt(diffs.reduce((s,x)=>s+(x-delta)**2,0)/(n-1));
// Reproducible cluster bootstrap: resample GAMES, never correlated turns.
let seed=0x30a1109;function rand(){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;}
const boot=[];for(let rep=0;rep<10000;rep++){let sum=0;for(let i=0;i<n;i++)sum+=diffs[Math.floor(rand()*n)];boot.push(sum/n);}
boot.sort((a,b)=>a-b);const quantile=p=>boot[Math.floor(p*(boot.length-1))];
const result={nTrainGames:trainSeeds.size,nTestGames:n,testRows:test.length,baseline:'mean remaining BP conditioned on turn, learned only from training games',neural:'frozen validation-selected 59-32-1 model',turnConditionedMae:avg(gameRows.map(r=>r.turnMae)),neuralMae:avg(gameRows.map(r=>r.neuralMae)),turnConditionedRmse:Math.sqrt(avg(gameRows.map(r=>r.turnMse))),neuralRmse:Math.sqrt(avg(gameRows.map(r=>r.neuralMse))),pairedMaeImprovementBP:delta,pairedSdBP:sdDiff,pairedNormalCi95:[delta-1.96*sdDiff/Math.sqrt(n),delta+1.96*sdDiff/Math.sqrt(n)],pairedGameBootstrapCi95:[quantile(.025),quantile(.975)],positiveGames:diffs.filter(x=>x>0).length,negativeGames:diffs.filter(x=>x<0).length,gameSeeds:[seeds[b],seeds.at(-1)],limitations:['Measures prediction of Oracle 1.0 continuation only, not improved final game score','Only 24 independent holdout games; bootstrap is approximate','Test data was inspected in prior iteration, so this analysis is diagnostic rather than pristine locked prospective validation','Turn-conditioned baseline is stronger than a global constant; no proof of optimality']};
assert.ok(Object.values(result).every(x=>typeof x!=='number'||Number.isFinite(x)));
writeFileSync(modelPrefix+'.paired.json',JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result,null,2));
