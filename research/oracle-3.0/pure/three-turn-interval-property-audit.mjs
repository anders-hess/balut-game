// Oracle 3.0 iteration 37: independent exhaustive-path audit of the
// generic interval Bellman core. Synthetic trees only: NOT Balut certification.
import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {rat,add,mul,cmp,bounds,solveTurns} from './three-turn-interval-bellman.mjs';
const start=Date.now();
let seed=3705;const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed;};
const R=x=>rat(BigInt(x));const max=(a,b)=>cmp(a,b)>=0?a:b;
let cases=0,uniqueCertified=0,overlapUncertified=0,visited=0;
// Independent reference uses explicit exhaustive path recursion, no memo,
// and separately computes exact expected action values.
function reference(s,n,enumerate,terminal){
 if(n===0)return terminal(s);
 const q=enumerate(s).map(a=>{
  let value=R(0);
  for(const o of a.outcomes)value=add(value,mul(o.p,reference(o.next,n-1,enumerate,terminal)));
  return {key:a.key,q:value};
 });
 return q.reduce((best,x)=>max(best,x.q),q[0].q);
}
for(let depth=1;depth<=3;depth++)for(let test=0;test<50;test++){
 const shift=rand()%7;
 const enumerate=s=>{
  // Every action is a complete synthetic turn with two equiprobable outcomes.
  // Deliberately introduce ties and different state paths converging to one state.
  return [0,1,2].map(a=>({key:'a'+a,outcomes:[
   {p:rat(1n,2n),next:(s*3+a+shift)%11},
   {p:rat(1n,2n),next:(s*5+2*a+shift)%11}
  ]}));
 };
 const terminal=s=>R(((s*7+shift)%17)-8);
 const width=rand()%4;
 const interval=s=>bounds(add(terminal(s),R(-width)),add(terminal(s),R(width)));
 const exact=reference(0,depth,enumerate,terminal);
 const cache=new Map();const got=solveTurns(0,depth,enumerate,interval,cache);
 assert(cmp(got.value.lo,exact)<=0,'lower bound excludes exact optimum');
 assert(cmp(got.value.hi,exact)>=0,'upper bound excludes exact optimum');
 const exactGot=solveTurns(0,depth,enumerate,s=>bounds(terminal(s),terminal(s)));
 assert.equal(cmp(exactGot.value.lo,exact),0,'exact Bellman differs from exhaustive reference');
 assert.equal(cmp(exactGot.value.hi,exact),0,'exact Bellman upper differs');
 if(got.uniqueOptimalAction!==null){
  const action=enumerate(0).find(a=>a.key===got.uniqueOptimalAction);
  assert(action);
  let selected=R(0);
  for(const o of action.outcomes)selected=add(selected,mul(o.p,reference(o.next,depth-1,enumerate,terminal)));
  assert.equal(cmp(selected,exact),0,'certified action is suboptimal');
  uniqueCertified++;
 }else overlapUncertified++;
 cases++;visited+=cache.size;
}
const report={iteration:37,status:'LOCAL_TEST_EXPECTED',syntheticCases:cases,uniqueCertified,overlapUncertified,memoizedStatesAcrossCases:visited,maximumSyntheticTurns:3,independentReference:'exhaustive full-path rational recursion',balutThreeTurnCertified:false,balut28TurnCertified:false,lockedTestRead:false,productionOracleUsed:false,elapsedWallMs:Date.now()-start,rssBytes:process.memoryUsage().rss,limitations:['Synthetic turn transitions only, no actual Balut three-turn certificate','Shared BigInt rational arithmetic primitives with Bellman core','CI must independently run before any success claim']};
writeFileSync('oracle3-iteration37-property-audit.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report));
