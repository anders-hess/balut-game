// Independent exact integer/rational proof experiment. Each test scorecard
// is legally reached via a 28-turn witness; last-turn choices are optimized
// over ALL hold/score actions by mathematically exact BigInt probabilities.
import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {performance} from 'node:perf_hooks';
import {coverageSampler,auditWitness} from './coverage-sampler.mjs';
import {rationalOutcomes,exactRationalLastTurn} from './rational.mjs';
import {exactAtRoll,actionKey,encodeCard} from '../oracle2/adapter.mjs';
import {totals} from '../phase1/simulator.mjs';

const expected=[1,6,21,56,126,252],rps=[1n,6n,36n,216n,1296n,7776n];
for(let n=0;n<=5;n++){
 const list=rationalOutcomes(n);
 assert.equal(list.length,expected[n]);
 assert.equal(list.reduce((a,x)=>a+x.coefficient,0n),rps[n]);
 for(let d=1;d<=6;d++){
  const count=list.reduce((sum,x)=>sum+x.coefficient*BigInt(x.dice.filter(v=>v===d).length),0n);
  assert.equal(count*6n,rps[n]*BigInt(n),'all six faces equiprobable exactly');
 }
}
const seedBase=970300000,nGames=12;
const started=performance.now(),rows=[],allTimes=[],categories=new Set();
let actionsVerified=0,uniqueOptimal=0,ties=0,terminalMemo=0;
for(let i=0;i<nGames;i++){
 const seed=seedBase+i,kind=['threshold','bonus','strike'][i%3];
 const game=coverageSampler(seed,{kind});
 assert.equal(encodeCard(auditWitness(game.witness)).remaining,0);
 const card=game.roots.find(r=>r.remaining===1&&r.source==='observed').card;
 assert.equal(encodeCard(card).remaining,1);
 const cat=Object.entries(card).find(([c,a])=>a.includes(null))[0];
 categories.add(cat);
 const diceOptions=[[5,5,5,6,6],[1,2,3,4,5],[2,2,2,5,6],[4,4,4,6,6],[6,6,6,3,5],[1,1,2,3,4]];
 const dice=diceOptions[i%diceOptions.length];
 for(const rollsRemaining of [0,1,2]){
  const root={card,dice,rollsRemaining};
  const tic=performance.now();
  const proof=exactRationalLastTurn(root);
  const elapsedMs=performance.now()-tic;
  allTimes.push(elapsedMs);
  assert.equal(proof.status,'CERTIFIED_EXACT_RATIONAL_LAST_TURN');
  assert.equal(proof.denominator,(6n**BigInt(5*rollsRemaining)).toString());
  const native=exactAtRoll(root,{cap:500000,timeoutMs:20000});
  assert.equal(native.status,'EXACT_FLOAT64',JSON.stringify(native));
  const nativeActions=Object.keys(native.actions);
  assert.deepEqual(Object.keys(proof.actions).sort(),nativeActions.sort());
  for(const key of nativeActions){
   const v=proof.actions[key];
   const rational=Number(BigInt(v.numerator))/Number(BigInt(v.denominator));
   assert.ok(Math.abs(rational-native.actions[key])<1e-8,
    'exact-rational vs Oracle 2.0 Float64 action Q: '+key+' values '+rational+' vs '+native.actions[key]);
   actionsVerified++;
  }
  assert.ok(Math.abs(proof.optimalExpectedFinalBP-native.value)<1e-8,
   'rational optimum vs native Bellman float result');
  assert.ok(proof.bestActionKeys.includes(actionKey(proof.chosen,dice)));
  assert.ok(proof.bestActionKeys.every(key=>
   BigInt(proof.actions[key].numerator)===BigInt(proof.optimalNumerator)));
  uniqueOptimal+=+(proof.uniqueBest);ties+=+(!proof.uniqueBest);
  terminalMemo+=proof.distinctBellmanDiceStates;
  rows.push({seed,kind,remaining:1,category:cat,dice,rollsRemaining,
   finalCardBeforeTurn:card,elapsedMs,
   numericalNativeOptimalValue:native.value,proof});
 }
}
const sorted=allTimes.slice().sort((a,b)=>a-b);
const summary={
 status:'FORMALLY_EXACT_RATIONAL_ONE_TURN_ACTION_CERTIFICATES',
 seedBase,nIndependentScorecards:nGames,nTestPositions:rows.length,
 rerollBudgets:[0,1,2],categories:[...categories].sort(),
 allLegalActionsVerified:actionsVerified,allNativeFloatQParity:true,
 exactMultinomialCoefficientConservation:true,
 uniqueBestPositions:uniqueOptimal,tiedBestPositions:ties,
 totalMemoizedDiceStateOccurrences:terminalMemo,
 avgCertificateMs:allTimes.reduce((a,b)=>a+b,0)/allTimes.length,
 p95CertificateMs:sorted[Math.floor(.95*(sorted.length-1))],
 maxCertificateMs:sorted.at(-1),
 totalWallMs:performance.now()-started,
 parentPeakRssBytes:process.memoryUsage().rss,node:process.version,
 proofDomain:'All legal holds and scoring choices in the LAST one turn only, with 0/1/2 rerolls; exact integer BigInt numerators and denominator 6^(5*rerolls)',
 limitations:[
  'No proof of optimal decisions with two or more turns remaining',
  'Exact rational arithmetic validates mathematical Bellman action comparisons; correctness still depends on tested game scoring implementation and enumeration',
  'The native Oracle2 reference is Float64 and is used only as differential corroboration, not as rational teacher in this certificate',
  'Chosen dice and states intentionally cover special outcomes and are not population-frequency samples',
  'No production Oracle, policy or fallback imports or data used'
 ]};
writeFileSync('oracle3-rational-last-turn-certificates.json',JSON.stringify({summary,rows},null,2)+'\n');
writeFileSync('oracle3-rational-last-turn-summary.json',JSON.stringify(summary,null,2)+'\n');
console.log('ORACLE3_EXACT_RATIONAL_CERTIFICATES='+JSON.stringify(summary));
