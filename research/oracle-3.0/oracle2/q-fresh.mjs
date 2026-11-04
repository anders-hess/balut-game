// Iteration 14: independent unseen dice/state roots, including reachable scratch
// trajectories and counterfactual dice that each have nonzero probability.
import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {performance} from 'node:perf_hooks';
import {rng,roll,score,applyScore,initialScorecard,totals,CATEGORIES} from '../phase1/simulator.mjs';
import {cachedPolicy} from '../phase1/cached-oracle.mjs';
import {exactAtRoll,encodeCard,actionRegret,ORACLE2_SOURCE_BLOB} from './adapter.mjs';
import {actionKey} from './adapter.mjs';

const n=Number(process.argv[2]??72),base=Number(process.argv[3]??920200000);
const prefix=process.argv[4]??'oracle3-q-fresh';
assert.equal(n,72,'experiment is pre-registered for exactly 72 games');
assert.equal(base,920200000,'seed range is pre-registered');
const started=performance.now(),rows=[],failures=[],counts={};
const native={cap:250000,timeoutMs:12000};
function trajectory(seed,kind){
 const random=rng(seed),syntheticRng=rng(seed^0xdead2222);
 let card=initialScorecard(),forcedScratches=0,observedZeroScores=0;
 const roots=[];
 for(let turn=0;turn<28;turn++){
  const before=card,remaining=28-turn;
  let dice=roll(random),left=2;
  const seen=[];
  while(true){
   let action=null;
   if(kind==='scratch'&&left===2&&[18,21,23].includes(turn)){
    const preferred=['straight','fullHouse','balut','fours','fives','sixes','choice'];
    const zeros=preferred.filter(c=>card[c].includes(null)&&score(c,dice)===0);
    if(zeros.length){
     action={type:'score',category:zeros[forcedScratches%zeros.length]};
     forcedScratches++;
    }
   }
   action??=cachedPolicy({card,dice,rollsRemaining:left,turn});
   seen.push({dice:[...dice],rollsRemaining:left,productionAction:cachedPolicy({
    card:before,dice,rollsRemaining:left,turn
   })});
   if(action.type==='score'){
    if(score(action.category,dice)===0)observedZeroScores++;
    card=applyScore(card,action.category,dice).card;
    break;
   }
   assert.equal(action.type,'hold');
   assert.ok(left>0&&action.held.length<5);
   dice=[...action.held,...roll(random,5-action.held.length)];
   left--;
  }
  if(remaining<=3){
   const index=remaining===3?0:remaining===2?Math.min(1,seen.length-1):seen.length-1;
   const observation=seen[index];
   roots.push({seed,kind,source:'observed',turn,remaining,card:before,...observation});
   if(remaining===3){
    const candidates=[[4,4,4,6,6],[5,5,5,4,6],[1,2,3,4,5],roll(syntheticRng),[1,1,1,1,1]];
    const atypicalDice=candidates[seed%5];
    roots.push({seed,kind,source:'possible_counterfactual_dice',
      turn,remaining,card:before,dice:atypicalDice,rollsRemaining:1,
      productionAction:cachedPolicy({card:before,dice:atypicalDice,rollsRemaining:1,turn})});
   }
  }
 }
 assert.equal(roots.length,4);
 assert.equal(encodeCard(card).remaining,0);
 return {roots,finalBig:totals(card).big,forcedScratches,observedZeroScores};
}
for(let i=0;i<n;i++){
 const seed=base+i,split=i<24?'validation':'test',kind=i%2===0?'natural':'scratch';
 const tr=trajectory(seed,kind);
 for(const root of tr.roots){
  assert.equal(encodeCard(root.card).remaining,root.remaining);
  const q=exactAtRoll(root,native);
  const row={...root,split,forcedScratchesInGame:tr.forcedScratches,
   actualZeroScoresInGame:tr.observedZeroScores,finalBigUnderGeneratingPolicy:tr.finalBig,
   qReference:q.status==='EXACT_FLOAT64'?{
    status:'EXACT_FLOAT64',optimalFinalBP:q.value,actions:q.actions,states:q.states,
    nativeSeconds:q.seconds,wallMs:q.wallMs
   }:q};
  if(q.status==='EXACT_FLOAT64'){
   row.productionRegret=actionRegret(q,root.productionAction,root.dice).regretBP;
   assert.ok(Object.keys(row.qReference.actions).includes(actionKey(row.productionAction,root.dice)));
  }else failures.push({seed,remaining:root.remaining,kind,source:root.source,
   error:q.reason??q.status,stderr:q.stderr??null});
  rows.push(row);
  const k=[split,kind,root.remaining,root.source].join('_');
  counts[k]??={attempted:0,solved:0};
  counts[k].attempted++;
  counts[k].solved+=+(q.status==='EXACT_FLOAT64');
 }
}
const solved=rows.filter(r=>r.qReference.status==='EXACT_FLOAT64');
const seen={validation:new Set(),test:new Set()};
for(const row of rows)seen[row.split].add(row.seed);
assert.equal(seen.validation.size,24);assert.equal(seen.test.size,48);
const summary={status:'EXACT_Q_REFERENCES_NOT_POLICY_EVALUATION',
 sourceBlobSha:ORACLE2_SOURCE_BLOB,nGames:n,
 seeds:[base,base+n-1],
 partition:{validation:{seeds:[base,base+23],games:24},
   test:{seeds:[base+24,base+71],games:48}},
 attempted:rows.length,solved:solved.length,failed:failures.length,
 actionQCount:solved.reduce((n,r)=>n+Object.keys(r.qReference.actions).length,0),
 counts,naturalGames:n/2,scratchGames:n/2,
 forcedScratchGames:[...new Set(rows.filter(r=>r.kind==='scratch'&&r.forcedScratchesInGame>0).map(r=>r.seed))].length,
 wallMs:performance.now()-started,parentPeakRssBytes:process.memoryUsage().rss,
 node:process.version,limitations:[
 'Oracle 2.0 exact finite-horizon float64 Q for only 1–3 remaining turns',
 'Scratch trajectories apply actual legal zero-score action before roll outcomes; no synthetic invalid scorecards',
 'Counterfactual dice are possible observed rolls, not a sampled frequency distribution; report source subgroups separately',
 'Fresh validation/test games disjoint from previous 60 training games; split was fixed before outcomes',
 'No claim of improved final-BP game policy from exact current-Q regret',
 'Parent RSS excludes native child memory'
 ]};
writeFileSync(prefix+'.json',JSON.stringify({summary,rows,failures},null,2)+'\n');
writeFileSync(prefix+'.summary.json',JSON.stringify(summary,null,2)+'\n');
console.log('ORACLE3_Q_FRESH='+JSON.stringify(summary));
assert.ok(solved.length>=Math.floor(rows.length*.9),'insufficient exact Q reference coverage');
