// Oracle3 iteration16: legal, probability-unweighted high-value scorecard
// stress states. Only pure Balut scoring, not any prior advisor's policy.
import assert from 'node:assert/strict';
import {CATEGORIES,initialScorecard,applyScore,score,rng,totals} from '../phase1/simulator.mjs';
import {encodeCard} from '../oracle2/adapter.mjs';
const diceByCategory={
 fours:[[4,4,4,4,6],[4,4,4,4,4],[4,4,4,2,3],[1,1,2,3,6]],
 fives:[[5,5,5,5,6],[5,5,5,5,5],[5,5,5,2,3],[1,1,2,3,6]],
 sixes:[[6,6,6,6,5],[6,6,6,6,6],[6,6,6,2,3],[1,1,2,3,5]],
 straight:[[2,3,4,5,6],[1,2,3,4,5],[2,3,4,5,6],[1,1,2,2,3]],
 fullHouse:[[6,6,6,5,5],[5,5,5,4,4],[4,4,4,3,3],[1,2,3,4,6]],
 choice:[[6,6,6,6,6],[6,6,6,5,5],[6,6,5,5,5],[1,1,2,2,3]],
 balut:[[6,6,6,6,6],[5,5,5,5,5],[4,4,4,4,4],[1,2,3,4,6]]
};
function shuffle(items,rand){
 const a=[...items];for(let i=a.length-1;i>0;i--){
  const j=Math.floor(rand()*(i+1));[a[i],a[j]]=[a[j],a[i]];
 }return a;
}
export function makeStressGame(seed){
 const rand=rng(seed),card0=initialScorecard();
 let card=card0;
 // Every assignment is legal and physically achievable in a single
 // 5-die roll. Synthetic roll histories are not frequency weighted.
 const targets=CATEGORIES.flatMap(c=>Array.from({length:4},(_,slot)=>({c,slot})));
 const shuffled=shuffle(targets,rand),roots=[];
 for(let turn=0;turn<28;turn++){
  const before=card,remaining=28-turn;
  const {c,slot}=shuffled[turn];
  const pattern=diceByCategory[c];
  const scenario=seed%4;
  // Scenario 0: near all high thresholds. Scenario 1: exactly two
  // strong upper-category scores. Scenario 2: mixed weak/strong with
  // strikes. Scenario 3: high Small Points + combination-heavy.
  let index;
  if(scenario===0)index=slot===3?2:slot%2;
  else if(scenario===1)index=slot<2?0:3;
  else if(scenario===2)index=(slot+Math.floor(rand()*4))%4;
  else index=(c==='straight'||c==='fullHouse'||c==='balut')?slot%3:slot===3?3:0;
  const dice=[...pattern[index]];
  assert.ok(dice.length===5&&dice.every(x=>x>=1&&x<=6));
  assert.ok(before[c].includes(null));
  card=applyScore(card,c,dice).card;
  if(remaining<=3){
   // This is a physically possible observed roll after an independent
   // legal scorecard history; no production advisor, no trajectory prior.
   const roll=[...diceByCategory[c][(index+1)%4]];
   roots.push({seed,scenario,remaining,turn,card:before,
     dice:roll,rollsRemaining:remaining===3?1:0,
     source:'constructed_possible_roll',assignedCategory:c,
     assignmentScore:score(c,dice)});
  }
 }
 assert.equal(encodeCard(card).remaining,0);
 assert.equal(roots.length,3);
 return {seed,scenario,roots,terminal:totals(card)};
}
