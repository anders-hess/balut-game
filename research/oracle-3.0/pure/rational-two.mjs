// Oracle 3.0: exact rational mathematics for a TWO-turn state only when
// the present roll has ZERO rerolls. Current actions are category placements;
// the last future turn is solved exactly over every initial roll and two rerolls.
// BigInt numerator denominator 6^15; no Float64 comparison or advisor fallback.
import assert from 'node:assert/strict';
import {CATEGORIES,applyScore} from '../phase1/simulator.mjs';
import {encodeCard,actionKey} from '../oracle2/adapter.mjs';
import {rationalOutcomes,exactRationalLastTurn} from './rational.mjs';

const D=6n**15n;
const FIRST=6n**5n;
export function exactRationalTwoTurnForcedScore(root,{recordContributions=true}={}){
 const {card,dice,rollsRemaining}=root;
 assert.equal(encodeCard(card).remaining,2,'two unfilled slots required');
 assert.equal(rollsRemaining,0,'all other present-turn actions require a different proof');
 assert.ok(Array.isArray(dice)&&dice.length===5&&dice.every(x=>Number.isInteger(x)&&x>=1&&x<=6));
 const cats=CATEGORIES.filter(c=>card[c].includes(null));
 assert.ok(cats.length>=1&&cats.length<=2);
 const rolls=rationalOutcomes(5);
 assert.equal(rolls.reduce((a,r)=>a+r.coefficient,0n),FIRST);
 const out={},evidence={};
 let best=null,bestKeys=[],totalLastTurnCertificates=0;
 for(const category of cats){
  const after=applyScore(card,category,dice).card;
  assert.equal(encodeCard(after).remaining,1);
  let numerator=0n;
  const trace=[];
  for(const item of rolls){
   const terminal=exactRationalLastTurn({card:after,dice:item.dice,rollsRemaining:2});
   assert.equal(terminal.denominator,(6n**10n).toString());
   const contribution=item.coefficient*BigInt(terminal.optimalNumerator);
   numerator+=contribution;
   totalLastTurnCertificates++;
   if(recordContributions)trace.push({
    dice:item.dice,coefficient:item.coefficient.toString(),
    exactLastTurnNumerator:terminal.optimalNumerator,
    weightedContribution:contribution.toString()
   });
  }
  const key=actionKey({type:'score',category},dice);
  out[key]={numerator:numerator.toString(),denominator:D.toString(),
   decimalApprox:Number(numerator)/Number(D)};
  if(recordContributions)evidence[key]=trace;
  if(best===null||numerator>best){best=numerator;bestKeys=[key];}
  else if(numerator===best)bestKeys.push(key);
 }
 assert.ok(best!==null);
 return {
  status:'CERTIFIED_EXACT_RATIONAL_TWO_TURN_FORCED_SCORING',
  proofDomain:'two unfilled game slots, current roll has ZERO rerolls, all currently legal category placements, future turn fully optimized over 5 fair dice and 2 rerolls',
  denominator:D.toString(),
  bestExactNumerator:best.toString(),
  bestActionKeys:bestKeys,
  uniqueBest:bestKeys.length===1,
  scoreActions:out,
  fullFirstRollWeightedContributions:evidence,
  possibleInitialRollMultisets:rolls.length,
  totalExactLastTurnBellmanCertificates:totalLastTurnCertificates,
  allComparisonsExactBigInt:true,
  limitations:[
   'Not a proof for current actions with remaining rerolls, nor three or more remaining turns',
   'Requires correct tested scoring and fair independent dice assumptions; numeric decimal only for display',
   'No learned model or legacy production-advisor policy used to generate rational action values'
  ]
 };
}
