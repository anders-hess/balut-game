// Oracle 3.0 phase 3: exact chance/hold expectimax within a turn, using a
// learned (approximate) continuation value at the NEXT scorecard boundary.
// The recursion is exact CONDITIONAL ON the supplied continuation estimator.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DIST,uniqueSubsets} from '../../../src/logic/oracle/probabilities.js';
import {CATEGORIES,applyScore,totals} from '../phase1/simulator.mjs';
import {featureVector} from '../phase2/collect.mjs';

export function loadNeuralValue(path){
 const w=JSON.parse(readFileSync(path,'utf8'));
 const {mu,sd}=w.normalization;
 assert.equal(mu.length,59);assert.equal(sd.length,59);assert.equal(w.w1.length,32);
 return card=>{
  const state=featureVector(card),x=state.map((v,j)=>(v-mu[j])/sd[j]);
  let y=w.b2;
  for(let k=0;k<w.w2.length;k++){
   let z=w.b1[k];for(let j=0;j<x.length;j++)z+=w.w1[k][j]*x[j];
   y+=w.w2[k]*Math.tanh(z);
  }
  return 10*y;
 };
}
export function chooseExpectimax({card,dice,rollsRemaining},continuation){
 assert.equal(dice.length,5);assert.ok(Number.isInteger(rollsRemaining)&&rollsRemaining>=0&&rollsRemaining<=2);
 const legal=CATEGORIES.filter(c=>card[c].includes(null));
 assert.ok(legal.length>0);
 const lastTurn=legal.reduce((n,c)=>n+card[c].filter(v=>v===null).length,0)===1;
 const memo=new Map(),valueCache=new Map();let continuationCalls=0;
 function scoreValue(category,ds){
  const value=ds.reduce((s,x)=>s+x,0),key=category+':'+[...ds].sort((a,b)=>a-b).join(',');
  if(valueCache.has(key))return valueCache.get(key);
  const next=applyScore(card,category,ds).card;
  const future=lastTurn?0:continuation(next);
  continuationCalls++;
  assert.ok(Number.isFinite(future));
  const q=totals(next).big+future;
  valueCache.set(key,q);return q;
 }
 function best(ds,left){
  const key=[...ds].sort((a,b)=>a-b).join(',')+'|'+left;
  if(memo.has(key))return memo.get(key);
  let q=-Infinity;
  for(const c of legal)q=Math.max(q,scoreValue(c,ds));
  if(left>0)for(const held of uniqueSubsets(ds)){
   if(held.length===5)continue;
   let v=0;for(const {values,prob} of DIST[5-held.length])v+=prob*best([...held,...values],left-1);
   q=Math.max(q,v);
  }
  memo.set(key,q);return q;
 }
 let chosen=null,max=-Infinity;
 // Score-first and subset order are deterministic, matching the simulator.
 for(const category of legal){const q=scoreValue(category,dice);if(q>max+1e-12){max=q;chosen={type:'score',category,q};}}
 if(rollsRemaining>0)for(const held of uniqueSubsets(dice)){
  if(held.length===5)continue;
  let q=0;for(const {values,prob} of DIST[5-held.length])q+=prob*best([...held,...values],rollsRemaining-1);
  if(q>max+1e-12){max=q;chosen={type:'hold',held,q};}
 }
 return {action:chosen,q:max,diagnostics:{memoStates:memo.size,continuationCalls,scoreCacheSize:valueCache.size,lastTurn}};
}
export function makePolicy(continuation){return ({card,dice,rollsRemaining})=>chooseExpectimax({card,dice,rollsRemaining},continuation).action;}
