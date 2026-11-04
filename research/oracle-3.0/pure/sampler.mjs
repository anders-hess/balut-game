// Oracle 3.0 pure-math research: legal, seeded scorecard sampling.
// No production Oracle, BPIV, imitation, production-state distribution, or fallbacks.
// Sampling is intentionally diversified; ONLY Oracle 2.0 Bellman supplies labels.
import assert from 'node:assert/strict';
import {CATEGORIES,initialScorecard,applyScore,score,totals,rng,roll,uniqueHolds} from '../phase1/simulator.mjs';
import {encodeCard} from '../oracle2/adapter.mjs';

const THRESHOLD={fours:52,fives:65,sixes:78,choice:100};
const forcedScratchTurns=new Set([10,14,18,22,25]);

function choice(items,rand){assert.ok(items.length);return items[Math.floor(rand()*items.length)];}
function weighted(items,weights,rand){
 const total=weights.reduce((a,b)=>a+b,0),r=rand()*total;let sum=0;
 for(let i=0;i<items.length;i++){sum+=weights[i];if(r<sum)return items[i];}
 return items.at(-1);
}
function holdToward(category,dice,rand){
 const counts=Array.from({length:6},(_,i)=>dice.filter(x=>x===i+1).length);
 if(category==='fours')return dice.filter(d=>d===4);
 if(category==='fives')return dice.filter(d=>d===5);
 if(category==='sixes')return dice.filter(d=>d===6);
 if(category==='choice')return dice.filter(d=>d>=5);
 if(category==='straight'){
  const run1=[1,2,3,4,5],run2=[2,3,4,5,6];
  const hit=r=>r.filter(d=>counts[d-1]>0).length;
  const run=hit(run1)>=hit(run2)?run1:run2;
  return run.filter(d=>counts[d-1]>0);
 }
 if(category==='fullHouse'){
  const pairs=counts.map((n,i)=>({face:i+1,n})).sort((a,b)=>b.n-a.n||a.face-b.face);
  const targets=pairs.slice(0,2).map(x=>x.face);
  return dice.filter(d=>targets.includes(d));
 }
 if(category==='balut'){
  const max=Math.max(...counts),target=counts.map((c,i)=>c===max?i+1:null).filter(Boolean);
  const t=choice(target,rand);return dice.filter(d=>d===t);
 }
 throw Error('bad target');
}
function bestMathCategory(card,dice,rand){
 const available=CATEGORIES.filter(c=>card[c].includes(null));
 const old=totals(card),values=available.map(cat=>{
  const next=applyScore(card,cat,dice),future=totals(next.card);
  const immediateBonus=(future.big-old.big);
  const small=next.value;
  const progress=THRESHOLD[cat]
    ? Math.min(1,small/Math.max(1,THRESHOLD[cat]-card[cat].reduce((a,b)=>a+(b??0),0)))
    : +(small>0);
  return {cat,weightedValue:immediateBonus*3+small*.11+progress*.5};
 });
 const best=Math.max(...values.map(x=>x.weightedValue));
 const elite=values.filter(x=>x.weightedValue>=best-1.5);
 return rand()<.80?choice(elite,rand).cat:choice(available,rand);
}
export function mathSampler(seed,{kind='scoreaware',alternateDice=true}={}){
 assert.ok(['uniform','scoreaware','scratch'].includes(kind));
 const rand=rng(seed),alternate=rng((seed^0xa55b8ed1)>>>0);
 let card=initialScorecard(),forcedScratches=0,zeroScoreEntries=0,rows=[];
 for(let turn=0;turn<28;turn++){
  const before=card,remaining=28-turn;
  let dice=roll(rand),left=2;
  const available=CATEGORIES.filter(c=>card[c].includes(null));
  assert.equal(available.length>0,true);
  const target=kind==='uniform'?choice(available,rand):
    weighted(available,available.map(c=>{
      const unfilled=card[c].filter(v=>v===null).length;
      const deficit=THRESHOLD[c]?Math.max(0,THRESHOLD[c]-card[c].reduce((s,x)=>s+(x??0),0)):0;
      return 1+.2*unfilled+((c in THRESHOLD)&&deficit<=22?2:0);
    }),rand);
  const observations=[];
  let finish=null;
  for(let rollStep=0;rollStep<3;rollStep++){
   observations.push({dice:[...dice],rollsRemaining:left});
   if(kind==='scratch'&&forcedScratchTurns.has(turn)&&left===2){
    const zeros=available.filter(c=>score(c,dice)===0);
    if(zeros.length&&rand()<.87){
     finish=choice(zeros,rand);
     forcedScratches++;break;
    }
   }
   const shouldReroll=left>0&&(kind==='uniform'?rand()<.7:rand()<.83);
   if(shouldReroll){
    let held;
    if(kind==='uniform'){
     const list=uniqueHolds(dice).filter(h=>h.length<5);
     held=choice(list,rand);
    }else{
     held=holdToward(target,dice,rand);
     if(held.length===5)held=held.slice(0,4);
     // Independent mathematical diversification of the hold distribution.
     if(rand()<.12)held=choice(uniqueHolds(dice).filter(h=>h.length<5),rand);
    }
    assert.ok(held.length<5);
    dice=[...held,...roll(rand,5-held.length)];
    left--;
    continue;
   }
   finish=kind==='uniform'?choice(available,rand):bestMathCategory(card,dice,rand);
   break;
  }
  if(finish===null)finish=kind==='uniform'?choice(available,rand):bestMathCategory(card,dice,rand);
  assert.ok(before[finish].includes(null),'cannot score filled category');
  const gained=score(finish,dice);
  if(gained===0)zeroScoreEntries++;
  card=applyScore(card,finish,dice).card;
  if(remaining<=3){
   // The observed state is always BEFORE this turn; follow legal trajectory.
   // Fixed stochastic coverage: first roll, second decision, last decision.
   const index=remaining===3?0:remaining===2?Math.min(1,observations.length-1):observations.length-1;
   rows.push({seed,kind,remaining,turn,source:'observed',
     card:before,dice:observations[index].dice,
     rollsRemaining:observations[index].rollsRemaining});
   if(remaining===3&&alternateDice){
    const candidates=[[5,6,6,6,3],[4,4,4,6,6],[1,2,3,4,5],[2,2,3,3,4],[1,1,1,1,1]];
    // A possible dice result, not a probability-weighted population sample.
    const injected=candidates[seed%candidates.length];
    rows.push({seed,kind,remaining,turn,source:'designed_possible_roll',
      card:before,dice:injected,rollsRemaining:1});
   }
  }
 }
 assert.equal(encodeCard(card).remaining,0,'must play 28 legally completed category entries');
 assert.equal(rows.length,alternateDice?4:3);
 return {seed,kind,rows,finalBP:totals(card).big,forcedScratches,zeroScoreEntries};
}
