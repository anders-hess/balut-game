// Relative imports assume the V18 research source tree bundled in the ZIP.
import {writeFileSync} from 'node:fs';
import {FittedAdaptiveOracleV6} from '../src/fitted_adaptive_v6.mjs';
import {playFull,streams} from '../src/simulate_v16.mjs';
import {emptyScorecard,compressScorecard,remainingTurns} from '../src/balut-oracle-reference.mjs';
const guide=new FittedAdaptiveOracleV6({lookaheadTurns:0,maxTurnCache:100,maxTailCache:150});
const rows=[];const stats={};
for(let i=0;i<12;i++){
 const seed=(0x9a714b3+Math.imul(i+1,198761))>>>0;
 const game=playFull(seed,guide,{mode:'research-heuristic-tail',trace:true});
 if(game.status!=='complete'||game.history.length!==28)throw Error('Invalid game');
 const rowCard=emptyScorecard(),rolls=streams(seed);
 for(let t=0;t<28;t++){
  const rem=28-t;
  if([10,11,12].includes(rem)){
   const card=Object.fromEntries(Object.entries(rowCard).map(([k,v])=>[k,v.slice()]));
   const dice=rolls[t][0],s=compressScorecard(card);
   if(remainingTurns(s)!==rem)throw Error('Wrong turn count');
   rows.push({id:`new-${rem}-${i}`,seed,remaining:rem,card,dice,scoreOnlyRolls:0,fullRerolls:2,rawScore:game.score});
   stats[rem]=(stats[rem]??0)+1;
  }
  const h=game.history[t],a=rowCard[h.category],pos=a.indexOf(null);
  if(pos<0)throw Error('Filled row');a[pos]=h.small;
 }
}
const unique=new Set(rows.map(x=>JSON.stringify(compressScorecard(x.card))));
writeFileSync(new URL('./locked_cases.json',import.meta.url),JSON.stringify({meta:{source:'12 new seeded complete-game v6 guide simulations',independentScorecards:unique.size,horizons:stats},cases:rows},null,2));
console.log(JSON.stringify({games:12,states:rows.length,uniqueScorecards:unique.size}));
