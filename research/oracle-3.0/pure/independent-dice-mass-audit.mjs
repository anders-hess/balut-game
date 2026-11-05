// Independent fair-dice transition audit, iteration 34.
// Pure exact combinatorics. No advisor, model, scorecard or legacy dependencies.
// Compare multinomial probability masses against direct enumeration of ordered dice.
import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
const start=Date.now(), SIX=6n;
const factorial=[1n]; for(let i=1;i<=5;i++) factorial[i]=factorial[i-1]*BigInt(i);
const key=v=>v.join(',');
function compositions(n,parts=6,prefix=[]){
 if(parts===1)return [[...prefix,n]];
 const out=[];for(let i=0;i<=n;i++)out.push(...compositions(n-i,parts-1,[...prefix,i]));
 return out;
}
function multinomial(v){let m=factorial[v.reduce((a,b)=>a+b,0)];for(const x of v)m/=factorial[x];return m;}
// Avoid chained division: factorial[n]/prod factorial[count].
function exactMultinomial(v){const n=v.reduce((a,b)=>a+b,0);return factorial[n]/v.reduce((p,x)=>p*factorial[x],1n);}
function orderedHistogram(n){
 const hist=new Map(),v=[0,0,0,0,0,0];
 function visit(depth){
  if(depth===n){const k=key(v);hist.set(k,(hist.get(k)||0n)+1n);return;}
  for(let face=0;face<6;face++){v[face]++;visit(depth+1);v[face]--;}
 }
 visit(0);return hist;
}
let heldVectors=0, outcomesChecked=0, qIdentityChecks=0;
const perReroll=[];
for(let k=0;k<=5;k++){
 const hist=orderedHistogram(k),vectors=compositions(k);
 let mass=0n,weighted=0n;
 for(const v of vectors){
  const m=exactMultinomial(v),brute=hist.get(key(v));
  assert.equal(m,brute,'multinomial disagrees with ordered enumeration');
  mass+=m;
  // Arbitrary integer terminal values: independent exact expectation numerator.
  const payoff=BigInt(v.reduce((s,c,i)=>s+(i+3)*(c*c+2*c),0));
  weighted+=m*payoff;outcomesChecked++;
 }
 assert.equal(mass,SIX**BigInt(k));
 let bruteWeighted=0n;
 for(const [s,m] of hist){
  const v=s.split(',').map(Number);
  bruteWeighted+=m*BigInt(v.reduce((a,c,i)=>a+(i+3)*(c*c+2*c),0));
 }
 assert.equal(weighted,bruteWeighted);qIdentityChecks++;
 perReroll.push({diceRerolled:k,distinctOutcomes:vectors.length,orderedOutcomes:mass.toString()});
}
// For every distinct legal held multiset, test that resulting full-five-dice
// transition mass and exact integer payoff numerator agree by two methods.
for(let h=0;h<=4;h++){
 for(const held of compositions(h)){
  heldVectors++;
  const k=5-h,ordered=orderedHistogram(k);
  let total=0n,weightedA=0n,weightedB=0n;
  for(const rolled of compositions(k)){
   const full=held.map((x,i)=>x+rolled[i]);
   const payoff=BigInt(full.reduce((s,c,i)=>s+(i+1)*(c*c+3*c),0));
   const mass=exactMultinomial(rolled);
   total+=mass;weightedA+=mass*payoff;outcomesChecked++;
  }
  for(const [s,mass] of ordered){
   const rolled=s.split(',').map(Number),full=held.map((x,i)=>x+rolled[i]);
   weightedB+=mass*BigInt(full.reduce((a,c,i)=>a+(i+1)*(c*c+3*c),0));
  }
  assert.equal(total,SIX**BigInt(k));
  assert.equal(weightedA,weightedB);qIdentityChecks++;
 }
}
const report={status:'PASS',scope:'independent exact fair-dice multinomial and Q-numerator mass audit',heldVectors,outcomesChecked,qIdentityChecks,perReroll,lockedTestRead:false,productionOracleUsed:false,threeTurnOptimalityCertified:false,elapsedWallMs:Date.now()-start,parentRssBytes:process.memoryUsage().rss,limitations:['Tests probability and expectation arithmetic only; does not verify Bellman max recursion or score rules','Not a 3-turn or 28-turn global optimality certificate']};
writeFileSync('oracle3-iteration34-dice-mass.json',JSON.stringify(report,null,2)+'\n');
console.log('ORACLE3_ITERATION34='+JSON.stringify(report));
