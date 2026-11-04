// Mathematical distribution-shift audit; exact teacher, no student weights,
// no legacy policies, no performance claim. 120 independent constructed games.
import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {performance} from 'node:perf_hooks';
import {CATEGORIES,applyScore,totals,score} from '../phase1/simulator.mjs';
import {exactAtRoll,encodeCard,actionKey} from '../oracle2/adapter.mjs';
import {makeStressGame} from './stress-sampler.mjs';
const base=970600000,n=120,started=performance.now(),rows=[];
const limits={cap:250000,timeoutMs:12000};
const threshold={fours:52,fives:65,sixes:78,choice:100};
function mean(x){return x.reduce((a,b)=>a+b,0)/x.length;}
function bootstrap(data,key){
 const groups=new Map();
 for(const x of data){if(!groups.has(x.seed))groups.set(x.seed,[]);groups.get(x.seed).push(x[key]);}
 const values=[...groups.values()].map(mean);let s=0x54a2bbd3;
 const random=()=>{s=(Math.imul(s,1664525)+1013904223)>>>0;return s/2**32;};
 const boot=[];for(let b=0;b<2000;b++){let z=0;for(let j=0;j<values.length;j++)z+=values[Math.floor(random()*values.length)];boot.push(z/values.length);}
 boot.sort((a,b)=>a-b);
 return {games:values.length,mean:mean(values),ci95:[boot[49],boot[1949]]};
}
for(let i=0;i<n;i++){
 const game=makeStressGame(base+i),split=i<72?'train':i<96?'validation':'test';
 for(const root of game.roots){
  assert.equal(encodeCard(root.card).remaining,root.remaining);
  const ref=exactAtRoll(root,limits);
  if(ref.status!=='EXACT_FLOAT64')throw Error('native teacher unavailable '+JSON.stringify({seed:root.seed,remaining:root.remaining,ref}));
  const current=totals(root.card);
  const available=CATEGORIES.filter(c=>root.card[c].includes(null));
  const actions=Object.entries(ref.actions).sort((a,b)=>b[1]-a[1]);
  const margin=actions.length>1?actions[0][1]-actions[1][1]:0;
  let naive=null,naiveValue=-Infinity;
  for(const c of available){
   const after=applyScore(root.card,c,root.dice).card;
   const delta=totals(after).big-current.big;
   const proxy=delta+score(c,root.dice)*.01;
   if(proxy>naiveValue){naiveValue=proxy;naive={type:'score',category:c};}
  }
  const naiveKey=actionKey(naive,root.dice),naiveQ=ref.actions[naiveKey];
  assert.ok(Number.isFinite(naiveQ));
  const naiveRegret=Math.max(0,ref.value-naiveQ);
  const canCross=available.some(c=>{
   if(!threshold[c])return false;
   const total=root.card[c].reduce((s,x)=>s+(x??0),0);
   return total<threshold[c]&&total+score(c,root.dice)>=threshold[c];
  });
  const existingCross=Object.entries(threshold).filter(([c,t])=>
   root.card[c].reduce((s,x)=>s+(x??0),0)>=t).length;
  const possibleZero=available.filter(c=>score(c,root.dice)===0).length;
  rows.push({seed:root.seed,split,scenario:root.scenario,remaining:root.remaining,
   source:root.source,rollsRemaining:root.rollsRemaining,dice:root.dice,
   currentBP:current.big,currentSmall:current.small,
   exactValue:ref.value,exactActionQ:ref.actions,
   topActionKey:actions[0][0],secondBestGapBP:margin,
   naiveActionKey:naiveKey,naiveRegretBP:naiveRegret,
   crossingOpportunity:canCross,alreadyCrossedUpper:existingCross,
   zeroScoreOptions:possibleZero,teacherStates:ref.states,
   teacherWallMs:ref.wallMs});
 }
}
assert.equal(rows.length,360);
const audit={status:'VERIFIED_NATIVE_EXACT_STRESS_TEACHER',
 architecture:'independent legal constructed scorecards; possible dice, not frequency weighted',
 gameSeeds:[base,base+n-1],games:n,roots:rows.length,
 split:{train:72,validation:24,test:24},
 scenarios:Object.fromEntries([0,1,2,3].map(k=>[k,rows.filter(x=>x.scenario===k).length])),
 solvedExactQ:rows.length,
 fullQActions:rows.reduce((a,r)=>a+Object.keys(r.exactActionQ).length,0),
 zeroScoreActionAlternatives:rows.reduce((a,r)=>a+r.zeroScoreOptions,0),
 crossings:rows.filter(r=>r.crossingOpportunity).length,
 upperThresholdsAlreadyCrossed:rows.filter(r=>r.alreadyCrossedUpper>0).length,
 ambiguousSmallMargins:rows.filter(r=>r.secondBestGapBP<.05).length,
 highRegretNaive:rows.filter(r=>r.naiveRegretBP>.05).length,
 meanSmallPoints:mean(rows.map(x=>x.currentSmall)),
 exactTeacherTimeMs:mean(rows.map(x=>x.teacherWallMs)),
 wallMs:performance.now()-started,peakParentRssBytes:process.memoryUsage().rss,
 limitations:['Designed category scores and dice are physically possible but deliberately not probability weighted',
 'Not a final-Big-Points game-level policy benchmark',
 'Native Float64 completed DP does not prove formal optimality',
 'Native subprocess peak RSS not captured',
 'No AI student trained or selected on this stress set'],
 holdout:{
  nGames:24,nRoots:72,
  naiveExactQRegret:bootstrap(rows.filter(x=>x.split==='test'),'naiveRegretBP'),
  highRegretNaive:rows.filter(x=>x.split==='test'&&x.naiveRegretBP>.05).length,
  thresholdOpportunity:rows.filter(x=>x.split==='test'&&x.crossingOpportunity).length,
  existingThreshold:rows.filter(x=>x.split==='test'&&x.alreadyCrossedUpper>0).length
 }
};
writeFileSync('oracle3-stress-results.json',JSON.stringify({audit,rows},null,2)+'\n');
writeFileSync('oracle3-stress-summary.json',JSON.stringify(audit,null,2)+'\n');
console.log('ORACLE3_STRESS='+JSON.stringify(audit));
