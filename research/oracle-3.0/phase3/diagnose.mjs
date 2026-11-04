// Iteration 11: prospective diagnostic, not a performance certification.
// Run after phase2 collection/training. Independent seeds never used in training.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {performance} from 'node:perf_hooks';
import {play,totals,CATEGORIES,initialScorecard,applyScore} from '../phase1/simulator.mjs';
import {cachedPolicy} from '../phase1/cached-oracle.mjs';
import {loadNeuralValue,makePolicy,chooseExpectimax} from './expectimax.mjs';

const rows=readFileSync('oracle3-trajectories.jsonl','utf8').trim().split('\n').map(JSON.parse);
const meta=JSON.parse(readFileSync('oracle3-trajectories.metrics.json','utf8'));
assert.equal(meta.baseSeed,100000000);assert.equal(meta.n,120);
const training=rows.filter(r=>r.seed<100000072);
const stageSums=Array(29).fill(0),stageN=Array(29).fill(0);
for(const r of training){const filled=r.turn+1;stageSums[filled]+=r.remainingBigPoints;stageN[filled]++;}
for(let k=1;k<=28;k++)assert.equal(stageN[k],72);
const stageValue=card=>{const filled=CATEGORIES.reduce((n,c)=>n+card[c].filter(v=>v!==null).length,0);return filled===28?0:stageSums[filled]/stageN[filled];};
const neural=loadNeuralValue('oracle3-neural.weights.json');
const policies=[['production',cachedPolicy],['stage',makePolicy(stageValue)],['neural',makePolicy(neural)]];
// Sanity: neural and stage estimators must return finite continuation values.
const empty=initialScorecard();assert.ok(Number.isFinite(stageValue(applyScore(empty,'choice',[1,2,3,4,5]).card)));
const seeds=Array.from({length:12},(_,i)=>900010000+i),games=[];
const started=performance.now();
for(const seed of seeds){const record={seed};for(const [name,policy] of policies){const t=performance.now();const result=play(seed,policy);record[name]={big:result.big,small:result.small,bonus:result.bonus,decisions:result.decisions,ms:performance.now()-t};}games.push(record);}
function paired(a,b){const diffs=games.map(g=>g[a].big-g[b].big),n=diffs.length,mean=diffs.reduce((x,y)=>x+y,0)/n,sd=Math.sqrt(diffs.reduce((s,d)=>s+(d-mean)**2,0)/(n-1));return {meanDeltaBP:mean,sd,normalCi95:[mean-1.96*sd/Math.sqrt(n),mean+1.96*sd/Math.sqrt(n)],positive:diffs.filter(x=>x>0).length,negative:diffs.filter(x=>x<0).length,ties:diffs.filter(x=>x===0).length};}
const means=Object.fromEntries(policies.map(([name])=>[name,{meanBP:games.reduce((s,g)=>s+g[name].big,0)/games.length,meanMs:games.reduce((s,g)=>s+g[name].ms,0)/games.length}]));
const result={n:games.length,seeds:[seeds[0],seeds.at(-1)],means,neuralVsProduction:paired('neural','production'),stageVsProduction:paired('stage','production'),neuralVsStage:paired('neural','stage'),games,wallMs:performance.now()-started,peakRssBytes:process.memoryUsage().rss,node:process.version,limitations:['12-game diagnostic only; CIs are normal approximations and not sufficient to certify improvement','Same integer seed but differing reroll patterns consume different RNG draws','Training-only stage baseline; neural selected using separate validation data','Previous two-game smoke showed -10 BP; no deployment or policy improvement claim']};
writeFileSync('oracle3-phase3-diagnostic.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));
