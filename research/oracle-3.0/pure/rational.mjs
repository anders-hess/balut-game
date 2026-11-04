// Oracle 3.0 mathematically EXACT rational endgame Bellman for ONE turn left.
// No Float64 for the optimization or action comparisons: all probabilities
// and values are integer numerators over fixed powers of six, via BigInt.
// Not a solver for any earlier state; extending N>1 requires a new proof.
import assert from 'node:assert/strict';
import {CATEGORIES,applyScore,totals,uniqueHolds} from '../phase1/simulator.mjs';
import {actionKey,encodeCard} from '../oracle2/adapter.mjs';

const FACT=[1n,1n,2n,6n,24n,120n];
const D=6n**5n;
const DEN=[1n,D,D*D];
const POW6=[1n,6n,36n,216n,1296n,7776n];
export function rationalOutcomes(n){
 assert.ok(Number.isInteger(n)&&n>=0&&n<=5);
 const results=[];
 function visit(face,left,counts){
  if(face===5){
   const cc=[...counts,left],dice=cc.flatMap((v,i)=>Array(v).fill(i+1));
   const coefficient=FACT[n]/cc.reduce((a,k)=>a*FACT[k],1n);
   results.push({dice,coefficient});
   return;
  }
  for(let k=0;k<=left;k++)visit(face+1,left-k,[...counts,k]);
 }
 visit(0,n,[]);
 assert.equal(results.reduce((s,x)=>s+x.coefficient,0n),POW6[n],
  'multinomial coefficients must exactly count all 6^n ordered rolls');
 return results;
}
const OUTCOMES=Array.from({length:6},(_,n)=>rationalOutcomes(n));

export function exactRationalLastTurn(root){
 const {card,dice,rollsRemaining}=root;
 assert.equal(encodeCard(card).remaining,1,'only formally solved LAST turn is implemented');
 assert.ok(Array.isArray(dice)&&dice.length===5&&dice.every(x=>Number.isInteger(x)&&x>=1&&x<=6));
 assert.ok(Number.isInteger(rollsRemaining)&&rollsRemaining>=0&&rollsRemaining<=2);
 const cats=CATEGORIES.filter(c=>card[c].includes(null));
 assert.equal(cats.length,1,'one last category entry');
 const scoreCache=new Map(),memo=new Map();
 let expectationTerms=0n;
 function terminalValue(category,ds){
  const k=category+':'+[...ds].sort().join('');
  if(scoreCache.has(k))return scoreCache.get(k);
  const after=applyScore(card,category,ds).card;
  assert.equal(encodeCard(after).remaining,0);
  const value=BigInt(totals(after).big);
  scoreCache.set(k,value);return value;
 }
 function bestNum(ds,r){
  const k=[...ds].sort().join('')+'|'+r;
  if(memo.has(k))return memo.get(k);
  // All scores measured in a COMMON denominator 6^(5*r).
  let best=cats.reduce((v,c)=>{
   const a=terminalValue(c,ds)*DEN[r];return v===null||a>v?a:v;
  },null);
  if(r>0)for(const held of uniqueHolds(ds)){
   if(held.length===5)continue;
   let num=0n;
   for(const {dice:rethrow,coefficient} of OUTCOMES[5-held.length]){
    num+=coefficient*bestNum([...held,...rethrow],r-1);
    expectationTerms++;
   }
   // Multiply by 6^held to convert expected score with
   // denominator [6^(5*(r-1)) * 6^(5-held)] to 6^(5*r).
   num*=POW6[held.length];
   if(num>best)best=num;
  }
  memo.set(k,best);return best;
 }
 const actions={},objects=[];
 let maximum=null,bestActions=[];
 function append(action,numerator){
  const key=actionKey(action,dice);
  assert.ok(!(key in actions),'all possible rerolls must be represented once');
  actions[key]={numerator:numerator.toString(),denominator:DEN[rollsRemaining].toString()};
  objects.push({key,action,numerator});
  if(maximum===null||numerator>maximum){maximum=numerator;bestActions=[key];}
  else if(numerator===maximum)bestActions.push(key);
 }
 for(const category of cats)
  append({type:'score',category},terminalValue(category,dice)*DEN[rollsRemaining]);
 if(rollsRemaining>0)for(const held of uniqueHolds(dice)){
  if(held.length===5)continue;
  let numerator=0n;
  for(const {dice:rethrow,coefficient} of OUTCOMES[5-held.length]){
   numerator+=coefficient*bestNum([...held,...rethrow],rollsRemaining-1);
   expectationTerms++;
  }
  append({type:'hold',held},numerator*POW6[held.length]);
 }
 assert.ok(maximum!==null&&bestActions.length>0);
 const sorted=objects.map(x=>x.numerator).sort((a,b)=>a>b?-1:a<b?1:0);
 const second=sorted.find(x=>x<maximum);
 const choice=objects.find(x=>x.key===bestActions[0]).action;
 return {
  status:'CERTIFIED_EXACT_RATIONAL_LAST_TURN',
  evidence:'All legal actions and every multinomial chance branch enumerated, BigInt rational values compared exactly; 1 turn only',
  remainingTurns:1,rerollsLeft:rollsRemaining,
  denominator:DEN[rollsRemaining].toString(),
  optimalNumerator:maximum.toString(),
  optimalExpectedFinalBP:Number(maximum)/Number(DEN[rollsRemaining]),
  bestActionKeys:bestActions,chosen:choice,
  uniqueBest:bestActions.length===1,
  strictlyPositiveMarginNumerator:second===undefined?null:(maximum-second).toString(),
  actions,nLegalActions:objects.length,
  distinctBellmanDiceStates:memo.size,
  scoredTerminalMultisets:scoreCache.size,
  exactWeightedChanceTerms:expectationTerms.toString(),
  proofDomain:'Last 1 remaining category slot, up to 2 rerolls; exact scoring and fair dice probabilities',
  limitations:[
   'A finite mathematical certificate of last-turn action optimality, not a 28-turn global optimality proof',
   'Full correctness relies on the independently checked Balut scoring and complete dice enumeration',
   'The displayed decimal is approximate; integer numerator and denominator prove comparisons'
  ]
 };
}
