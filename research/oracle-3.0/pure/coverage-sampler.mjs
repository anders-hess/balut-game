// Oracle 3.0 mathematical coverage-directed *reachable* state sampler.
// Every constructed five-die multiset has strictly positive probability under
// five fair dice. Its 25-step witnessed score history is legal. It is a
// stratified mathematical stress-test distribution, NOT typical play frequency.
import assert from 'node:assert/strict';
import {CATEGORIES,initialScorecard,applyScore,score,rng,roll,totals,uniqueHolds} from '../phase1/simulator.mjs';
import {encodeCard} from '../oracle2/adapter.mjs';

const RESERVES=[
 ['fours','fives','choice'],['fours','choice','balut'],
 ['sixes','choice','balut'],['straight','fullHouse','balut'],
 ['fours','sixes','choice'],['fives','straight','fullHouse'],
 ['fours','fours','choice'],['choice','choice','sixes'],
 ['balut','balut','straight'],['straight','choice','balut'],
 ['fives','sixes','balut'],['fours','fullHouse','choice']
];
const POOLS={
 fours:{
  high:[[4,4,4,4,4],[4,4,4,4,1]],
  mid:[[4,4,4,1,2],[4,4,4,4,2]],
  low:[[4,4,2,3,6],[1,2,3,4,5]]},
 fives:{
  high:[[5,5,5,5,5],[5,5,5,5,1]],
  mid:[[5,5,5,2,3],[5,5,5,5,2]],
  low:[[5,5,1,2,6],[1,2,3,4,6]]},
 sixes:{
  high:[[6,6,6,6,6],[6,6,6,6,2]],
  mid:[[6,6,6,3,4],[6,6,6,6,1]],
  low:[[6,6,1,2,3],[1,2,3,4,5]]},
 straight:{
  high:[[2,3,4,5,6],[2,3,4,5,6]],
  mid:[[1,2,3,4,5],[1,2,3,4,5]],
  low:[[1,1,2,2,3],[2,2,3,4,4]]},
 fullHouse:{
  high:[[5,5,5,6,6],[4,4,4,6,6]],
  mid:[[3,3,3,5,5],[2,2,2,5,5]],
  low:[[1,1,2,3,4],[1,2,3,4,5]]},
 choice:{
  high:[[6,6,6,6,6],[5,5,5,6,6],[4,5,6,6,6]],
  mid:[[3,4,5,6,6],[3,4,4,5,6],[4,4,4,5,6]],
  low:[[1,2,3,4,5],[1,1,2,3,4]]},
 balut:{
  high:[[6,6,6,6,6],[5,5,5,5,5],[4,4,4,4,4]],
  mid:[[3,3,3,3,3],[2,2,2,2,2]],
  low:[[1,2,3,4,5],[1,1,2,2,3]]}
};

function choose(a,rand){return a[Math.floor(rand()*a.length)];}
function shuffle(a,rand){
 const b=a.slice();
 for(let i=b.length-1;i>0;i--){const j=Math.floor(rand()*(i+1));[b[i],b[j]]=[b[j],b[i]];}
 return b;
}
function chooseConstructed(category,kind,isReserved,rand){
 const u=rand();
 let strength;
 if(kind==='bonus')strength=u<.76?'high':u<.94?'mid':'low';
 else if(kind==='threshold')strength=u<(isReserved?.12:.28)?'high':u<.91?'mid':'low';
 else strength=u<.30?'high':u<.58?'mid':'low';
 return choose(POOLS[category][strength],rand);
}
function remainingTargetHold(category,dice){
 if(category==='fours')return dice.filter(x=>x===4);
 if(category==='fives')return dice.filter(x=>x===5);
 if(category==='sixes')return dice.filter(x=>x===6);
 if(category==='choice')return dice.filter(x=>x>=5);
 if(category==='straight')return [...new Set(dice)].slice(0,4);
 const counts=Array.from({length:6},(_,i)=>dice.filter(x=>x===i+1).length);
 const max=Math.max(...counts),fav=counts.indexOf(max)+1;
 if(category==='balut')return dice.filter(x=>x===fav);
 if(category==='fullHouse'){
  const rank=counts.map((n,i)=>({n,face:i+1})).sort((a,b)=>b.n-a.n);
  const set=new Set(rank.slice(0,2).map(x=>x.face));
  return dice.filter(x=>set.has(x));
 }
 throw Error('unrecognized category');
}
export function coverageSampler(seed,{kind='threshold'}={}){
 assert.ok(['threshold','bonus','strike'].includes(kind));
 const rand=rng(seed),counterfactual=rng((seed^0x31942e07)>>>0);
 const reserved=RESERVES[seed%RESERVES.length],reserveCounts={};
 for(const c of reserved)reserveCounts[c]=(reserveCounts[c]??0)+1;
 assert.equal(reserved.length,3);
 let card=initialScorecard(),witness=[],zeroScores=0;
 const plan=shuffle(CATEGORIES.flatMap(c=>
  Array(4-(reserveCounts[c]??0)).fill(c)),rand);
 assert.equal(plan.length,25);
 for(const category of plan){
  const dice=chooseConstructed(category,kind,!!reserveCounts[category],rand);
  assert.equal(dice.length,5);
  const value=score(category,dice),after=applyScore(card,category,dice);
  if(value===0)zeroScores++;
  witness.push({category,dice,value,column:after.column});
  card=after.card;
 }
 assert.equal(encodeCard(card).remaining,3);
 const roots=[],finalPlan=shuffle(reserved,rand);
 for(const category of finalPlan){
  const before=card,remaining=encodeCard(before).remaining;
  let dice=roll(rand),left=2,observations=[],finalDice=null;
  while(true){
   observations.push({dice:[...dice],rollsRemaining:left});
   if(left<=0||rand()>.79){finalDice=dice;break;}
   let held=remainingTargetHold(category,dice);
   if(held.length>=5)held=held.slice(0,4);
   if(rand()<.10)held=choose(uniqueHolds(dice).filter(h=>h.length<5),rand);
   dice=[...held,...roll(rand,5-held.length)];left--;
  }
  const index=remaining===3?0:remaining===2?Math.min(1,observations.length-1):observations.length-1;
  roots.push({seed,kind,remaining,source:'observed',
   card:before,dice:observations[index].dice,rollsRemaining:observations[index].rollsRemaining});
  if(remaining===3){
   const options=[[4,4,4,6,6],[5,5,5,6,6],[5,6,6,6,3],[1,2,3,4,5],[2,3,4,5,6],roll(counterfactual)];
   const alt=options[seed%options.length];
   roots.push({seed,kind,remaining,source:'designed_possible_roll',card:before,
    dice:alt,rollsRemaining:1});
  }
  const after=applyScore(card,category,finalDice);
  if(after.value===0)zeroScores++;
  witness.push({category,dice:finalDice,value:after.value,column:after.column});
  card=after.card;
 }
 assert.equal(roots.length,4);
 assert.equal(witness.length,28);
 assert.equal(encodeCard(card).remaining,0);
 const scoredBefore=roots.find(r=>r.remaining===3).card;
 const beforeSP=Object.values(scoredBefore).flat().reduce((s,v)=>s+(v??0),0);
 const threshold=[['fours',52],['fives',65],['sixes',78],['choice',100]]
  .map(([c,t])=>({category:c,score:scoredBefore[c].reduce((s,v)=>s+(v??0),0),
    threshold:t,unfilled:scoredBefore[c].filter(v=>v===null).length}));
 return {seed,kind,roots,witness,
  finalBP:totals(card).big,finalSP:totals(card).small,
  beforeSmall:beforeSP,beforeBig:totals(scoredBefore).big,
  zeroScores,threshold,positiveStraight:scoredBefore.straight.filter(v=>v!==null&&v>0).length,
  positiveFullHouse:scoredBefore.fullHouse.filter(v=>v!==null&&v>0).length,
  positiveBalut:scoredBefore.balut.filter(v=>v!==null&&v>0).length
 };
}
export function auditWitness(witness){
 let card=initialScorecard();
 assert.equal(witness.length,28);
 for(const [i,step] of witness.entries()){
  assert.ok(CATEGORIES.includes(step.category));
  assert.ok(Array.isArray(step.dice)&&step.dice.length===5);
  assert.ok(step.dice.every(d=>Number.isInteger(d)&&d>=1&&d<=6));
  assert.ok(card[step.category].includes(null));
  const applied=applyScore(card,step.category,step.dice);
  assert.equal(applied.value,step.value);
  assert.equal(applied.column,step.column);
  card=applied.card;
  assert.equal(encodeCard(card).remaining,27-i);
 }
 return card;
}
