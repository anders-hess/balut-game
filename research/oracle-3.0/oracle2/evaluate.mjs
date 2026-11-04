// Phase 4: ground Oracle 3.0 in Oracle 2.0 exact future-value and action-Q labels.
// This creates a FROZEN diagnostic, not a train/test estimate of final-BP improvement.
import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {performance} from 'node:perf_hooks';
import {CATEGORIES,initialScorecard,rng,roll,applyScore,totals} from '../phase1/simulator.mjs';
import {cachedPolicy} from '../phase1/cached-oracle.mjs';
import {chooseExpectimax} from '../phase3/expectimax.mjs';
import {encodeCard,exactAtBoundary,exactAtRoll,actionRegret,exactBestLegal,ORACLE2_SOURCE_BLOB} from './adapter.mjs';

function naturalLateRoots(seed){
 const random=rng(seed),roots=[];
 let card=initialScorecard();
 for(let turn=0;turn<28;turn++){
  let dice=roll(random),left=2,remaining=28-turn;
  if(remaining<=3)roots.push({seed,turn,remaining,card,dice:[...dice],rollsRemaining:left});
  while(true){
   const a=cachedPolicy({card,dice,rollsRemaining:left});
   if(a.type==='score'){card=applyScore(card,a.category,dice).card;break;}
   assert.ok(left>0);
   dice=[...a.held,...roll(random,5-a.held.length)];
   left--;
  }
 }
 assert.equal(encodeCard(card).remaining,0);
 return roots;
}
const seeds=[900020000,900020001,900020002],rows=[],started=performance.now();
for(const seed of seeds)for(const root of naturalLateRoots(seed)){
 const {card,dice,rollsRemaining,remaining}=root;
 assert.equal(encodeCard(card).remaining,remaining);
 const options={cap:250000,timeoutMs:20000};
 const boundary=exactAtBoundary(card,options);
 const atRoll=exactAtRoll(root,options);
 const row={seed,turn:root.turn,remaining,dice,rollsRemaining,scorecard:card,
   currentBigPoints:totals(card).big,
   preFirstRoll:boundary.status==='EXACT_FLOAT64'?{
    value:boundary.value,optimalRemainingBP:boundary.value-totals(card).big,
    states:boundary.states,seconds:boundary.seconds,wallMs:boundary.wallMs}:boundary,
   atRoll:atRoll.status==='EXACT_FLOAT64'?{
    value:atRoll.value,states:atRoll.states,seconds:atRoll.seconds,wallMs:atRoll.wallMs,
    actions:atRoll.actions}:atRoll
 };
 if(atRoll.status==='EXACT_FLOAT64'){
  const prod=cachedPolicy(root);
  const naive=chooseExpectimax(root,()=>0).action;
  row.exactAction=exactBestLegal(atRoll,root);
  row.production={...actionRegret(atRoll,prod,dice),action:prod};
  row.naiveContinuation={...actionRegret(atRoll,naive,dice),action:naive};
  assert.ok(row.production.regretBP>=0&&row.naiveContinuation.regretBP>=0);
  if(remaining===1)assert.ok(row.naiveContinuation.regretBP<1e-8);
 }
 rows.push(row);
}
function mean(x){return x.length?x.reduce((a,b)=>a+b,0)/x.length:null;}
const groups=[1,2,3].map(h=>{
 const r=rows.filter(x=>x.remaining===h),q=r.filter(x=>x.production);
 return {remaining:h,attempted:r.length,qSolved:q.length,preRollSolved:r.filter(x=>x.preFirstRoll.value!==undefined).length,
  prodQRegretMeanBP:mean(q.map(x=>x.production.regretBP)),
  naiveQRegretMeanBP:mean(q.map(x=>x.naiveContinuation.regretBP)),
  prodOptimalChoices:q.filter(x=>x.production.regretBP<1e-8).length,
  naiveOptimalChoices:q.filter(x=>x.naiveContinuation.regretBP<1e-8).length,
  actionQLabels:q.reduce((sum,x)=>sum+Object.keys(x.atRoll.actions).length,0)};
});
assert.equal(groups[0].qSolved,3,'at least three true 1-turn Q references mandatory');
assert.equal(groups[0].preRollSolved,3,'three true 1-turn pre-roll value labels mandatory');
const summary={source:'Oracle 2.0 v46 exact reachable Bellman (vendored immutable)',
 sourceBlobSha:ORACLE2_SOURCE_BLOB,method:'EXACT_FLOAT64 within declared state cap and timeout',
 independentSeeds:seeds,attempted:rows.length,solvedQ:rows.filter(x=>x.production).length,
 solvedPreRoll:rows.filter(x=>x.preFirstRoll.value!==undefined).length,
 groups,wallMs:performance.now()-started,peakParentRssBytes:process.memoryUsage().rss,node:process.version,
 limitations:[
  'Labels are from three observed production-Oracle trajectories, not independent final-BP policy trial',
  'Pre-first-roll expected BP and present-roll Q measure different conditionings; never train one as the other',
  'Exact means Float64 finite-horizon DP, not formal rational proof',
  'Three seeds are insufficient for claims about playing improvement or Q-regret distributions',
  'Parent RSS excludes native child peak; C++ per-label wall and DP states recorded separately',
  'Unsolved roots remain explicitly RESOURCE_LIMIT_OR_ERROR and are excluded from Q summaries',
  'No AI policy trained on these labels in this iteration'
 ]};
const report={summary,rows};
writeFileSync('oracle3-phase4-exact-reference.json',JSON.stringify(report,null,2)+'\n');
writeFileSync('oracle3-phase4-exact-summary.json',JSON.stringify(summary,null,2)+'\n');
console.log('ORACLE3_EXACT_SUMMARY='+JSON.stringify(summary));
