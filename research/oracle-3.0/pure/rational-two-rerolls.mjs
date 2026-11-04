// Oracle3: fully exact-rational 2-turn Bellman INCLUDING current rerolls.
// All 5-dice chance weights are multinomial integer coefficients; all
// comparisons use BigInt. No production policy, BPIV or numeric Q teacher.
// Domain: precisely TWO remaining category entries, 0/1/2 current rerolls.
import assert from 'node:assert/strict';
import {CATEGORIES,score,applyScore,totals,uniqueHolds} from '../phase1/simulator.mjs';
import {encodeCard,actionKey} from '../oracle2/adapter.mjs';
import {rationalOutcomes,exactRationalLastTurn} from './rational.mjs';

const SIX=6n, DEN_LAST=SIX**15n;
const OUTCOMES=Array.from({length:6},(_,n)=>rationalOutcomes(n));
const SIX_POW=Array.from({length:6},(_,n)=>SIX**BigInt(n));

export function createTwoTurnRationalSolver(card){
 assert.equal(encodeCard(card).remaining,2,'two unfilled boxes required');
 const open=CATEGORIES.filter(c=>card[c].includes(null));
 assert.ok(open.length>=1&&open.length<=2);
 const continuation=new Map(),memo=new Map(),scoreCards=new Map();
 const started=Date.now();let oneTurnProofs=0n;
 // Exact V*(s_after) before the next turn's first roll, denominator 6^15.
 // Cache one Bellman continuation per distinct after-scorecard, NOT per action.
 function exactFutureAfter(category,ds){
  const value=score(category,ds),key=category+':'+value;
  if(continuation.has(key))return continuation.get(key);
  const after=applyScore(card,category,ds).card;
  assert.equal(encodeCard(after).remaining,1);
  let num=0n;
  for(const outcome of OUTCOMES[5]){
   const proof=exactRationalLastTurn({card:after,dice:outcome.dice,rollsRemaining:2});
   assert.equal(proof.denominator,(SIX**10n).toString());
   num+=outcome.coefficient*BigInt(proof.optimalNumerator);
   oneTurnProofs++;
  }
  const result={numerator:num,denominator:DEN_LAST,
   category,value,afterRemainingCategory:open.filter(c=>c!==category)};
  continuation.set(key,result);scoreCards.set(key,after);
  return result;
 }
 function bestNumerator(dice,r){
  const key=[...dice].sort((a,b)=>a-b).join('')+'|'+r;
  if(memo.has(key))return memo.get(key);
  let best=null;
  const scale=SIX**BigInt(5*r);
  for(const category of open){
   const q=exactFutureAfter(category,dice).numerator*scale;
   if(best===null||q>best)best=q;
  }
  if(r>0){
   for(const held of uniqueHolds(dice)){
    if(held.length===5)continue;
    const k=5-held.length;
    let sum=0n;
    for(const outcome of OUTCOMES[k])
     sum+=outcome.coefficient*bestNumerator([...held,...outcome.dice],r-1);
    sum*=SIX_POW[held.length];
    if(sum>best)best=sum;
   }
  }
  memo.set(key,best);
  return best;
 }
 function certify(dice,r){
  assert.ok(Array.isArray(dice)&&dice.length===5&&dice.every(d=>Number.isInteger(d)&&d>=1&&d<=6));
  assert.ok(Number.isInteger(r)&&r>=0&&r<=2);
  const scale=SIX**BigInt(5*r),denom=DEN_LAST*scale;
  const actions={},candidates=[];
  let optimum=null,bestKeys=[];
  function record(action,num){
   const key=actionKey(action,dice);
   assert.ok(!(key in actions),'duplicate legal action');
   actions[key]={numerator:num.toString(),denominator:denom.toString()};
   candidates.push({key,action,num});
   if(optimum===null||num>optimum){optimum=num;bestKeys=[key];}
   else if(num===optimum)bestKeys.push(key);
  }
  for(const category of open)
   record({type:'score',category},exactFutureAfter(category,dice).numerator*scale);
  if(r>0)for(const held of uniqueHolds(dice)){
   if(held.length===5)continue;
   const k=5-held.length;
   let sum=0n;
   for(const out of OUTCOMES[k])
    sum+=out.coefficient*bestNumerator([...held,...out.dice],r-1);
   record({type:'hold',held},sum*SIX_POW[held.length]);
  }
  assert.ok(bestKeys.length>0);
  const others=candidates.map(a=>a.num).filter(x=>x<optimum);
  const second=others.length?others.reduce((a,b)=>a>b?a:b):null;
  const choose=candidates.find(a=>a.key===bestKeys[0]);
  const scoreActionKeys=candidates.filter(x=>x.action.type==='score').map(x=>x.key);
  return {
   status:'CERTIFIED_EXACT_RATIONAL_TWO_TURN_WITH_REROLLS',
   proofDomain:'two unfilled category boxes, all legal score and hold actions, 0–2 current rerolls, optimal full last turn',
   rollsRemaining:r,rootDice:[...dice],denominator:denom.toString(),
   exactOptimalNumerator:optimum.toString(),bestActionKeys:bestKeys,
   chosen:choose.action,exactUniqueBest:bestKeys.length===1,
   strictlyPositiveMarginNumerator:second===null?null:(optimum-second).toString(),
   optimalDecimalApprox:Number(optimum)/Number(denom),
   allActionQ:actions,nLegalActions:candidates.length,scoreActionKeys,
   mathSupport:{
    completeMultinomialOutcomes:[1,6,21,56,126,252],
    uniqueAfterScoreStatesComputed:continuation.size,
    exactOneTurnSubcertificates:Number(oneTurnProofs),
    memoizedCurrentTurnDiceStates:memo.size,
    elapsedWallMs:Date.now()-started
   },
   caveats:[
    'Exact BigInt rational comparison; decimals are only for display',
    'This finite-horizon proof assumes correct Balut scoring and fair independent dice',
    'Not a proof of optimal actions with three or more turns remaining, or 28-turn global optimality',
    'No production Oracle dependency or fallback'
   ]
  };
 }
 return {certify,metrics:()=>({uniqueAfterScoreStates:continuation.size,
  exactOneTurnSubcertificates:Number(oneTurnProofs),memoStates:memo.size,
  wallMs:Date.now()-started}),
  availableCategories:open};
}
