// Oracle3 exact-rational pre-first-roll Bellman V* for LAST turn.
// Shared memo across ALL 252 possible initial dice multisets: O(252*3)
// canonical dice/reroll states, not 252 independent Bellman solutions.
// Exact BigInt integers, no old advisor, Float64 used only for display.
import assert from 'node:assert/strict';
import {CATEGORIES,applyScore,totals,uniqueHolds} from '../phase1/simulator.mjs';
import {encodeCard} from '../oracle2/adapter.mjs';
import {rationalOutcomes} from './rational.mjs';

const SIX=6n, OUTCOMES=Array.from({length:6},(_,n)=>rationalOutcomes(n));
const POW6=Array.from({length:31},(_,i)=>SIX**BigInt(i));

export function exactRationalLastBoundaryMemo(card){
 assert.equal(encodeCard(card).remaining,1,'one remaining turn required');
 const remaining=CATEGORIES.filter(c=>card[c].includes(null));
 assert.equal(remaining.length,1);const category=remaining[0];
 const memo=new Map(),payoffs=new Map();
 let chanceTerms=0;
 function reward(ds){
  const key=[...ds].sort().join('');
  if(payoffs.has(key))return payoffs.get(key);
  const after=applyScore(card,category,ds).card;
  assert.equal(encodeCard(after).remaining,0);
  const result=BigInt(totals(after).big);
  payoffs.set(key,result);return result;
 }
 function val(ds,r){
  const dice=[...ds].sort((a,b)=>a-b);
  const key=dice.join('')+'|'+r;
  if(memo.has(key))return memo.get(key);
  let best=reward(dice)*POW6[5*r];
  if(r>0)for(const held of uniqueHolds(dice)){
   if(held.length===5)continue;
   let num=0n;
   for(const {dice:outcome,coefficient} of OUTCOMES[5-held.length]){
    num+=coefficient*val([...held,...outcome],r-1);
    chanceTerms++;
   }
   num*=POW6[held.length];
   if(num>best)best=num;
  }
  memo.set(key,best);return best;
 }
 let numerator=0n;
 for(const {dice,coefficient} of OUTCOMES[5]){
  numerator+=coefficient*val(dice,2);
  chanceTerms++;
 }
 const denominator=POW6[15];
 return {status:'EXACT_RATIONAL_LAST_TURN_BOUNDARY_MEMO',
  numerator:numerator.toString(),denominator:denominator.toString(),
  decimalApprox:Number(numerator)/Number(denominator),
  remainingCategory:category,
  distinctDiceStates:memo.size,terminalDicePayoffs:payoffs.size,
  weightedChanceContributions:chanceTerms,
  oneTurnBellmanRecursion:'all canonical dice multisets and all legal holds for each 0/1/2 reroll budget',
  allValuesAreExactBigInt:true};
}
