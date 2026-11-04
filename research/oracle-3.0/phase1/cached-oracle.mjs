// Research-only drop-in Oracle BPIV policy: cache score-now value by category and
// actual small-points score for the *same* scorecard and turn. Never used in main.
import {CATEGORIES,CATEGORY_LABELS} from '../../../src/logic/gameConstants.js';
import {nextColumn} from '../../../src/logic/scoring.js';
import {bpivScoreNow} from '../../../src/logic/oracle/bpiv.js';
import {DIST,uniqueSubsets} from '../../../src/logic/oracle/probabilities.js';
import {scoreCell,computeTurnsRemaining} from '../../../src/logic/oracle/scoring.js';

export function cachedRecommend({currentDice,rollsRemaining,scorecard,turnsRemaining}) {
 const tR=turnsRemaining??computeTurnsRemaining(scorecard), cache=new Map(), memo=new Map();
 const active=CATEGORIES.filter(c=>nextColumn(scorecard,c)!==-1);
 let cacheMisses=0,cacheHits=0;
 function scoreNow(cat,dice){
   const actual=scoreCell(cat,dice),key=cat+':'+actual;
   if(cache.has(key)){cacheHits++;return cache.get(key);}
   cacheMisses++;
   const result=bpivScoreNow(cat,dice,scorecard,tR);
   cache.set(key,result);return result;
 }
 function best(dice,left){
   const key=[...dice].sort((a,b)=>a-b).join(',')+'|'+left;
   if(memo.has(key))return memo.get(key);
   let value=-Infinity;
   for(const cat of active){const r=scoreNow(cat,dice);if(r.bpiv>value)value=r.bpiv;}
   if(value===-Infinity)value=0;
   if(left>0)for(const held of uniqueSubsets(dice)){
     if(held.length===5)continue;
     let v=0;
     for(const {values,prob} of DIST[5-held.length])v+=prob*best([...held,...values],left-1);
     if(v>value)value=v;
   }
   memo.set(key,value);return value;
 }
 const actions=[];
 for(const cat of active){const r=scoreNow(cat,currentDice);actions.push({type:'SCORE_NOW',category:cat,bpiv:r.bpiv});}
 if(rollsRemaining>0)for(const held of uniqueSubsets(currentDice)){
   if(held.length===5)continue;
   let value=0;
   for(const {values,prob} of DIST[5-held.length])value+=prob*best([...held,...values],rollsRemaining-1);
   actions.push({type:'REROLL',held,bpiv:value});
 }
 // Match production's positive-BPIV filtering and stable tie order.
 const positive=actions.some(a=>a.bpiv>0);
 const ranked=(positive?actions.filter(a=>a.bpiv>0):actions).sort((a,b)=>b.bpiv-a.bpiv);
 const unfilled=active.reduce((n,c)=>n+scorecard[c].filter(v=>v===null).length,0);
 if(rollsRemaining===0&&unfilled===1)return {action:{type:'SCORE_NOW',category:active[0],bpiv:0},cacheHits,cacheMisses,memoStates:memo.size};
 return {action:ranked[0],cacheHits,cacheMisses,memoStates:memo.size};
}
export function cachedPolicy({card,dice,rollsRemaining}){
 const {action}=cachedRecommend({currentDice:dice,rollsRemaining,scorecard:card});
 if(!action)throw Error('no legal action');
 return action.type==='SCORE_NOW'?{type:'score',category:action.category}:{type:'hold',held:action.held};
}
