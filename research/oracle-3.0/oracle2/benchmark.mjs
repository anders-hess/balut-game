// Prospective n-small score smoke: SAME seeded games, no performance-certification claim.
import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {performance} from 'node:perf_hooks';
import {play} from '../phase1/simulator.mjs';
import {cachedPolicy} from '../phase1/cached-oracle.mjs';
import {makeOracle2Hybrid} from './hybrid.mjs';
const n=Number(process.argv[2]??4);
assert.ok(Number.isInteger(n)&&n>=2&&n<=20);
const seeds=Array.from({length:n},(_,i)=>900030000+i),rows=[];
const started=performance.now();
for(const seed of seeds){
 const a=performance.now(),production=play(seed,cachedPolicy),prodMs=performance.now()-a;
 const {policy,telemetry}=makeOracle2Hybrid({exactHorizon:2,cap:150000,timeoutMs:6500});
 const b=performance.now(),hybrid=play(seed,policy),hybridMs=performance.now()-b;
 rows.push({seed,productionBP:production.big,hybridBP:hybrid.big,deltaBP:hybrid.big-production.big,
  productionMs:prodMs,hybridMs,telemetry});
}
function avg(a){return a.reduce((x,y)=>x+y,0)/a.length;}
const d=rows.map(x=>x.deltaBP),m=avg(d),sd=Math.sqrt(d.reduce((s,v)=>s+(v-m)**2,0)/(n-1));
const summary={n,seedStart:seeds[0],seedEnd:seeds.at(-1),productionMeanBP:avg(rows.map(x=>x.productionBP)),
 hybridMeanBP:avg(rows.map(x=>x.hybridBP)),meanPairedDeltaBP:m,
 normalApproxCi95:[m-1.96*sd/Math.sqrt(n),m+1.96*sd/Math.sqrt(n)],
 wins:d.filter(x=>x>0).length,ties:d.filter(x=>x===0).length,losses:d.filter(x=>x<0).length,
 exactDecisions:rows.reduce((s,x)=>s+x.telemetry.exactDecisions,0),
 estimatedDecisions:rows.reduce((s,x)=>s+x.telemetry.estimatedDecisions,0),
 resourceFallbacks:rows.reduce((s,x)=>s+x.telemetry.resourceFallbacks,0),
 productionMeanMs:avg(rows.map(x=>x.productionMs)),hybridMeanMs:avg(rows.map(x=>x.hybridMs)),
 wallMs:performance.now()-started,peakParentRssBytes:process.memoryUsage().rss,node:process.version,
 limitations:[
  'Only n small games: exploratory smoke, NOT statistically credible evidence of final BP improvement',
  'Paired initial seeds but different rerolls can consume different subsequent RNG draws',
  'Native C++ child-process peak memory not included in parent RSS',
  'Hybrid uses original frozen production policy above two remaining turns and exact action Q in final two turns',
  'Fallback to production if solver cap or timeout is exceeded; fallback count must be disclosed',
  'Exact action calculation is Float64 Bellman, not a rational global proof over 28 turns'
 ]};
writeFileSync('oracle3-phase4-hybrid.json',JSON.stringify({summary,rows},null,2)+'\n');
console.log('ORACLE3_HYBRID_SUMMARY='+JSON.stringify(summary));
