// Oracle 3.0 phase 2: reproducible Oracle-1.0 trajectory dataset.
// Usage: node research/oracle-3.0/phase2/collect.mjs 30 20261104 oracle3-trajectories
import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {performance} from 'node:perf_hooks';
import {rng,roll,initialScorecard,applyScore,totals,uniqueHolds,CATEGORIES} from '../phase1/simulator.mjs';
import {cachedPolicy} from '../phase1/cached-oracle.mjs';
import {productionPolicy} from '../phase1/production-baseline.mjs';

export const TRAIN_SEED_BASE=100000000, VALID_SEED_BASE=500000000, TEST_SEED_BASE=900000000;
export function featureVector(card){
 const a=[];
 for(const c of CATEGORIES)for(const v of card[c]){a.push(v===null?0:1,v===null?0:v/60);}
 const filled=CATEGORIES.reduce((s,c)=>s+card[c].filter(v=>v!==null).length,0);
 const t=totals(card);a.push(filled/28,t.small/700,t.big/20);
 assert.equal(a.length,59);return a;
}
export function trajectory(seed,policy=cachedPolicy){
 const random=rng(seed);let card=initialScorecard(),decisions=0;const turns=[];
 for(let turn=0;turn<28;turn++){
  const before=card,observations=[];let dice=roll(random),left=2;
  while(true){
   const a=policy({card,dice,rollsRemaining:left,turn});decisions++;
   observations.push({dice:[...dice],rollsRemaining:left,action:a});
   if(a.type==='score'){
    assert.ok(CATEGORIES.includes(a.category)&&card[a.category].includes(null));
    const x=applyScore(card,a.category,dice);card=x.card;
    turns.push({turn,before:featureVector(before),after:featureVector(card),category:a.category,score:x.value,column:x.column,observations});break;
   }
   assert.equal(a.type,'hold');assert.ok(left>0);
   assert.ok(uniqueHolds(dice).some(h=>h.join(',')===[...a.held].sort((x,y)=>x-y).join(',')));
   assert.ok(a.held.length<5);dice=[...a.held,...roll(random,5-a.held.length)];left--;
  }
 }
 const result=totals(card);
 return {seed,finalBigPoints:result.big,finalSmallPoints:result.small,bonus:result.bonus,decisions,turns};
}
export function collect(n=30,baseSeed=TRAIN_SEED_BASE,policy=cachedPolicy){
 assert.ok(Number.isInteger(n)&&n>=2&&n<=100000);
 assert.ok(Number.isInteger(baseSeed)&&baseSeed>=0&&baseSeed+n<2**32);
 const started=performance.now(),games=[];
 for(let i=0;i<n;i++)games.push(trajectory(baseSeed+i,policy));
 const mean=games.reduce((s,g)=>s+g.finalBigPoints,0)/n;
 const sd=Math.sqrt(games.reduce((s,g)=>s+(g.finalBigPoints-mean)**2,0)/(n-1));
 const bonusCounts={};for(const g of games)bonusCounts[g.bonus]=(bonusCounts[g.bonus]??0)+1;
 return {meta:{n,baseSeed,policy:policy===productionPolicy?'production_Oracle_1.0_BPIV':'cached_production_equivalent_BPIV',node:process.version,wallMs:performance.now()-started,meanFinalBigPoints:mean,sd,ci95NormalApprox:[mean-1.96*sd/Math.sqrt(n),mean+1.96*sd/Math.sqrt(n)],bonusCounts,turnRows:games.length*28,limitations:['Outcome labels are Monte Carlo samples under Oracle 1.0, not optimal values','Normal CI approximate; sample too small for improvement claim','Different seed ranges must be used for training, validation and locked test']},games};
}
if(process.argv[1]?.endsWith('/collect.mjs')){
 const n=Number(process.argv[2]??30),seed=Number(process.argv[3]??TRAIN_SEED_BASE),prefix=process.argv[4]??'oracle3-trajectories';
 const result=collect(n,seed);const rows=result.games.flatMap(g=>g.turns.map(t=>({seed:g.seed,turn:t.turn,state:t.after,targetFinalBigPoints:g.finalBigPoints,remainingBigPoints:g.finalBigPoints-totalsFromVector(t.after),category:t.category,score:t.score})));
 writeFileSync(prefix+'.jsonl',rows.map(x=>JSON.stringify(x)).join('\n')+'\n');
 writeFileSync(prefix+'.metrics.json',JSON.stringify(result.meta,null,2)+'\n');
 console.log(JSON.stringify(result.meta,null,2));
}
// Total current BP is encoded in the last feature; for residual training use the
// exact unnormalized scorecard total instead (avoid floating-point rounding).
function totalsFromVector(vec){return vec[58]*20;}
