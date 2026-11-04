// Oracle 3.0 iteration 14: action-aware exact-Q supervision with frozen production
// BPIV as a strong prior. All Q* labels originate from Oracle 2.0 Bellman, not
// Monte Carlo end scores; BPIV values are only estimated prior features.
import assert from 'node:assert/strict';
import {CATEGORIES,score,applyScore,totals} from '../phase1/simulator.mjs';
import {exactFeatures} from './features.mjs';
import {actionKey,encodeCard} from './adapter.mjs';
import {bpivScoreNow} from '../../../src/logic/oracle/bpiv.js';
import {DIST,uniqueSubsets} from '../../../src/logic/oracle/probabilities.js';

export const ACTION_FEATURE_VERSION='oracle3-q-action-43-v1';
export const ACTION_DIM=43;
function histogram(ds){const h=Array(6).fill(0);for(const d of ds){assert.ok(Number.isInteger(d)&&d>=1&&d<=6);h[d-1]++;}return h;}
function sorted(ds){return [...ds].sort((a,b)=>a-b).join('');}
export function legalActions(root){
 const cats=CATEGORIES.filter(c=>root.card[c].includes(null));
 const actions=cats.map(category=>({type:'score',category}));
 if(root.rollsRemaining>0){
  for(const held of uniqueSubsets(root.dice))if(held.length<5)actions.push({type:'hold',held});
 }
 assert.ok(actions.length>0);
 return actions;
}
// Independently rebuild every possible ONE-TURN BPIV Q using production scoring,
// exact multinomial probabilities and all legal holds. Unlike recommend(), this
// also provides unselected/scratch actions and does not discard negative BPIV.
export function bpivActionMap(root){
 const {card,dice,rollsRemaining}=root,remaining=encodeCard(card).remaining;
 assert.ok(remaining>0&&remaining<=28);
 const cats=CATEGORIES.filter(c=>card[c].includes(null));
 const scoreCache=new Map(),memo=new Map();
 const scoreBPIV=(cat,ds)=>{
  const k=cat+':'+sorted(ds);
  if(scoreCache.has(k))return scoreCache.get(k);
  const bp=bpivScoreNow(cat,ds,card,remaining);
  assert.ok(bp&&Number.isFinite(bp.bpiv),'bad BPIV '+cat);
  scoreCache.set(k,bp.bpiv);return bp.bpiv;
 };
 const best=(ds,left)=>{
  const k=sorted(ds)+'|'+left;
  if(memo.has(k))return memo.get(k);
  let bestQ=-Infinity;
  for(const c of cats)bestQ=Math.max(bestQ,scoreBPIV(c,ds));
  if(left>0)for(const held of uniqueSubsets(ds)){
   if(held.length===5)continue;
   let q=0;
   for(const {values,prob} of DIST[5-held.length])
    q+=prob*best([...held,...values],left-1);
   bestQ=Math.max(bestQ,q);
  }
  memo.set(k,bestQ);return bestQ;
 };
 const map={};
 for(const a of legalActions(root)){
  let q;
  if(a.type==='score')q=scoreBPIV(a.category,dice);
  else{
   q=0;for(const {values,prob} of DIST[5-a.held.length])
    q+=prob*best([...a.held,...values],rollsRemaining-1);
  }
  const k=actionKey(a,dice);
  assert.ok(!(k in map),'duplicate action key '+k);
  map[k]=q;
 }
 return map;
}
export function actionFeature(root,action,bpivGap){
 assert.ok(Number.isFinite(bpivGap));
 const {card,dice,rollsRemaining}=root;
 const ds=histogram(dice),held=action.type==='hold'?histogram(action.held):Array(6).fill(0);
 const cat=CATEGORIES.map(c=>+(action.type==='score'&&action.category===c));
 const isScore=action.type==='score',small=isScore?score(action.category,dice):0;
 const immediate=isScore?totals(applyScore(card,action.category,dice).card).big-totals(card).big:0;
 const x=[...exactFeatures(card),...ds.map(v=>v/5),rollsRemaining/2,
   +isScore,...cat,...held.map(v=>v/5),
   small/50,held.reduce((a,b)=>a+b,0)/5,immediate/10,bpivGap/10,
   +(isScore&&small===0)];
 assert.equal(x.length,ACTION_DIM,'feature size');
 assert.ok(x.every(Number.isFinite));
 return x;
}
export function exampleGroup(root){
 assert.equal(root.qReference.status,'EXACT_FLOAT64');
 const actions=legalActions(root),baseline=bpivActionMap(root),gold=root.qReference.actions;
 const keys=actions.map(a=>actionKey(a,root.dice));
 assert.equal(keys.length,Object.keys(gold).length,'native legal action coverage mismatch');
 for(const k of keys)assert.ok(Number.isFinite(gold[k])&&Number.isFinite(baseline[k]),'missing action '+k);
 const optimum=Math.max(...keys.map(k=>gold[k])),bpivMax=Math.max(...keys.map(k=>baseline[k]));
 assert.ok(Math.abs(optimum-root.qReference.optimalFinalBP)<1e-8);
 const items=actions.map((a,i)=>{
  const key=keys[i],exactGap=gold[key]-optimum,heuristicGap=baseline[key]-bpivMax;
  assert.ok(exactGap<=1e-8&&heuristicGap<=1e-8);
  const scratch=a.type==='score'&&score(a.category,root.dice)===0;
  return {key,action:a,features:actionFeature(root,a,heuristicGap),exactGap,
   bpivGap:heuristicGap,residualTarget:(exactGap-heuristicGap)/10,
   scratch,weight:Math.max(.15,Math.exp(Math.max(-12,exactGap)/2.5))*(scratch?1.35:1)};
 });
 return {seed:root.seed,kind:root.kind??'natural',remaining:root.remaining,
  rollsRemaining:root.rollsRemaining,dice:root.dice,card:root.card,
  productionKey:actionKey(root.productionAction,root.dice),
  trueValue:optimum,items};
}
export function selectAction(group,predictResidual,alpha=1){
 assert.ok(alpha>=0&&alpha<=1&&Number.isFinite(alpha));
 let chosen=null,best=-Infinity;
 for(const item of group.items){
  const q=item.bpivGap+10*alpha*predictResidual(item.x??item.features);
  if(q>best+1e-10){chosen=item;best=q;}
 }
 assert.ok(chosen);
 return chosen;
}
export function qRegret(group,key){
 const item=group.items.find(a=>a.key===key);
 assert.ok(item,'unknown Q action '+key);
 return Math.max(0,-item.exactGap);
}
