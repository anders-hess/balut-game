// Oracle 3.0: real production Oracle policy adapter and differential parity audit.
// Run from repo root: node research/oracle-3.0/phase1/production-baseline.mjs 20 20261104
import assert from 'node:assert/strict';
import {performance} from 'node:perf_hooks';
import {pathToFileURL} from 'node:url';
import {recommend} from '../../../src/logic/oracle/index.js';
import {calculateScore, getTargetColumn, calcTotals} from '../../../src/logic/scoring.js';
import {CATEGORIES as PROD_CATEGORIES} from '../../../src/logic/gameConstants.js';
import {CATEGORIES,initialScorecard,score,targetColumn,totals,rng,roll,applyScore,play} from './simulator.mjs';

export function productionPolicy({card,dice,rollsRemaining}) {
  const result=recommend({currentDice:dice,rollsRemaining,scorecard:card});
  const action=result.actions[0];
  if (!action) throw Error('production Oracle returned no action');
  if (action.type==='SCORE_NOW') return {type:'score',category:action.category};
  if (action.type==='REROLL') return {type:'hold',held:action.held};
  throw Error('unexpected production Oracle action '+action.type);
}

export function auditParity() {
  assert.deepEqual(CATEGORIES,PROD_CATEGORIES);
  let checks=0;
  // All 252 unique sorted five-dice multisets, every category.
  for(let a=1;a<=6;a++)for(let b=a;b<=6;b++)for(let c=b;c<=6;c++)for(let d=c;d<=6;d++)for(let e=d;e<=6;e++){
    const dice=[a,b,c,d,e];
    for(const category of CATEGORIES){
      assert.equal(score(category,dice),calculateScore(category,dice)??0,JSON.stringify({category,dice}));
      checks++;
    }
  }
  // Random reachable scorecards: compare every legal target column and total BP.
  const random=rng(0x30A11E);
  let card=initialScorecard();
  for(let i=0;i<28;i++){
    const dice=roll(random),available=CATEGORIES.filter(c=>card[c].includes(null));
    const category=available[Math.floor(random()*available.length)];
    const value=score(category,dice);
    assert.equal(targetColumn(card,category,value),getTargetColumn(card,category,value));
    card=applyScore(card,category,dice).card;
    const actual=calcTotals(card),sim=totals(card);
    assert.equal(sim.small,actual.totalSmall);
    assert.equal(sim.big,actual.totalBig);
    assert.equal(sim.bonus,actual.bonus);
    checks+=4;
  }
  // Deterministic production-policy full game: validates action legality.
  const one=play(982451653,productionPolicy);
  const two=play(982451653,productionPolicy);
  assert.deepEqual(one,two);
  checks+=2;
  return {checks,uniqueDiceStates:252,oracleGameDecisions:one.decisions};
}

export function productionBaseline(n=20,seed=20261104) {
  if(!Number.isSafeInteger(n)||n<2||!Number.isSafeInteger(seed))throw Error('n>=2 and integer seed required');
  const started=performance.now(),scores=[],bonusFrequency={},stageDecisions=0;
  for(let i=0;i<n;i++){
    const result=play((seed+i)>>>0,productionPolicy);
    scores.push(result.big);stageDecisions+=result.decisions;
    bonusFrequency[result.bonus]=(bonusFrequency[result.bonus]??0)+1;
  }
  const mean=scores.reduce((a,b)=>a+b,0)/n;
  const sd=Math.sqrt(scores.reduce((a,b)=>a+(b-mean)**2,0)/(n-1));
  return {policy:'production_Oracle_1.0_BPIV',n,seed,meanFinalBigPoints:mean,sd,ci95NormalApprox:[mean-1.96*sd/Math.sqrt(n),mean+1.96*sd/Math.sqrt(n)],bonusFrequency,decisions:stageDecisions,wallMs:performance.now()-started,node:process.version,peakRssBytes:process.memoryUsage().rss,limitations:'Small n: CI normal approximation only. Seed split must be locked before training; no AI comparison.'};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const audit=auditParity();
  const results=productionBaseline(Number(process.argv[2]??20),Number(process.argv[3]??20261104));
  console.log(JSON.stringify({audit,results},null,2));
}
