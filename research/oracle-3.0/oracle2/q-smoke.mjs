// Prospective final-BP smoke on entirely fresh games. A counter-based dice
// stream keyed by game+turn+reroll index gives fair common-random-number
// coupling even if the two policies choose different numbers of held dice.
import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {performance} from 'node:perf_hooks';
import {rng,roll,applyScore,initialScorecard,totals,uniqueHolds} from '../phase1/simulator.mjs';
import {cachedPolicy} from '../phase1/cached-oracle.mjs';
import {loadQStudent,makeQStudent} from './q-policy.mjs';
const prefix=process.argv[2]??'oracle3-q';
const n=Number(process.argv[3]??32),base=940000000;
assert.equal(n,32,'pre-registered 32-game exploratory smoke');
const weights=loadQStudent(prefix+'.q.weights.json');
function randFor(seed,turn,index){
 const mix=(seed^Math.imul(turn+1,0x9e3779b1)^Math.imul(index+1,0x85ebca6b))>>>0;
 return rng(mix);
}
function pairedPlay(seed,policy){
 let card=initialScorecard(),decisions=0,rerolls=0;
 for(let turn=0;turn<28;turn++){
  let dice=roll(randFor(seed,turn,0)),left=2;
  while(true){
   const action=policy({card,dice,rollsRemaining:left,turn});
   decisions++;
   if(action.type==='score'){
    assert.ok(card[action.category].includes(null));
    card=applyScore(card,action.category,dice).card;break;
   }
   assert.equal(action.type,'hold');
   assert.ok(left>0&&action.held.length<5);
   assert.ok(uniqueHolds(dice).some(h=>h.join(',')===[...action.held].sort((a,b)=>a-b).join(',')));
   dice=[...action.held,...roll(randFor(seed,turn,3-left),5-action.held.length)];
   left--;rerolls++;
  }
 }
 return {...totals(card),decisions,rerolls};
}
const started=performance.now(),rows=[],latency=[];
for(let i=0;i<n;i++){
 const seed=base+i;
 const a=performance.now(),production=pairedPlay(seed,cachedPolicy),prodMs=performance.now()-a;
 const {policy,stats}=makeQStudent(weights);
 const b=performance.now(),candidate=pairedPlay(seed,policy),candidateMs=performance.now()-b;
 latency.push(...stats.decisionMs);
 rows.push({seed,productionBigBP:production.big,studentBigBP:candidate.big,
  deltaBP:candidate.big-production.big,productionSmall:production.small,
  studentSmall:candidate.small,productionMs:prodMs,candidateMs,
  studentDecisions:stats.studentDecisions,productionDecisions:stats.productionDecisions,
  scratchSelections:stats.scratchSelections});
}
function mean(a){return a.reduce((s,x)=>s+x,0)/a.length;}
let seed=0x517bf044;
function random(){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;}
function bootstrap(values){
 const means=[];for(let b=0;b<10000;b++){
  let v=0;for(let i=0;i<values.length;i++)v+=values[Math.floor(random()*values.length)];
  means.push(v/values.length);
 }
 means.sort((a,b)=>a-b);
 return [means[249],means[9749]];
}
const delta=rows.map(r=>r.deltaBP),m=mean(delta),sd=Math.sqrt(mean(delta.map(d=>(d-m)**2))*n/(n-1));
const latencySorted=latency.slice().sort((a,b)=>a-b);
const result={status:'EXPLORATORY_32_GAME_FINAL_BP_SMOKE_NOT_DEPLOYMENT_GATE',
 commonRandomNumbers:'counter-based seed+turn+reroll_index, independent uniform dice per roll',
 n,seeds:[base,base+n-1],student:weights.selected,
 productionMeanBP:mean(rows.map(r=>r.productionBigBP)),
 studentMeanBP:mean(rows.map(r=>r.studentBigBP)),
 meanPairedStudentMinusProductionBP:m,
 normalApproxCi95:[m-1.96*sd/Math.sqrt(n),m+1.96*sd/Math.sqrt(n)],
 wholeGameBootstrapCi95:bootstrap(delta),
 wins:delta.filter(x=>x>0).length,ties:delta.filter(x=>x===0).length,
 losses:delta.filter(x=>x<0).length,
 studentDecisions:rows.reduce((s,r)=>s+r.studentDecisions,0),
 meanProductionMs:mean(rows.map(r=>r.productionMs)),
 meanStudentMs:mean(rows.map(r=>r.candidateMs)),
 studentInferredDecisionP95Ms:latencySorted.length?latencySorted[Math.floor(.95*(latencySorted.length-1))]:null,
 wallMs:performance.now()-started,parentPeakRssBytes:process.memoryUsage().rss,node:process.version,
 limitations:[
  'Only 32 entire games; intervals are exploratory, not evidence of a material improvement',
  'Student changes only last 3 turns, not globally optimally from first 28 rounds',
  'Frozen production Oracle used in all earlier turns; all wins/losses include actual final nonlinear BP',
  'Common-random-number stream uses fixed seed+turn+roll, not a stateful RNG that diverges when holds differ',
  'Model selected on separate validation exact-Q references and frozen before these 32 fresh game seeds',
  'No deployment or main branch updates'
 ]};
writeFileSync(prefix+'.q.game-smoke.json',JSON.stringify({result,rows},null,2)+'\n');
console.log('ORACLE3_Q_GAME_SMOKE='+JSON.stringify(result));
