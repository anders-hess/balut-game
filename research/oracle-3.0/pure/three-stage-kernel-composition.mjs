// Iteration 35: independent exact three-stage chance-kernel composition.
// This is NOT three Balut turns or a Bellman optimality proof.
import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
const start=Date.now(), factorial=[1n];
for(let i=1;i<=15;i++)factorial[i]=factorial[i-1]*BigInt(i);
function comp(n,d=6,p=[]){if(d===1)return [[...p,n]];const a=[];for(let i=0;i<=n;i++)a.push(...comp(n-i,d-1,[...p,i]));return a;}
const key=a=>a.join(',');
function mass(v){return factorial[v.reduce((a,b)=>a+b,0)]/v.reduce((a,b)=>a*factorial[b],1n);}
function convolve(A,B){const out=new Map();for(const [k,a] of A)for(const [l,b] of B){const x=k.split(',').map(Number),y=l.split(',').map(Number),z=key(x.map((v,i)=>v+y[i]));out.set(z,(out.get(z)||0n)+a*b);}return out;}
const kernel=n=>new Map(comp(n).map(v=>[key(v),mass(v)]));
const pow=n=>6n**BigInt(n);
let checks=0,cases=0;
for(let a=0;a<=3;a++)for(let b=0;b<=3;b++)for(let c=0;c<=3;c++){
 if(a+b+c>6)continue;
 const A=kernel(a),B=kernel(b),C=kernel(c);
 const left=convolve(convolve(A,B),C),right=convolve(A,convolve(B,C)),direct=kernel(a+b+c);
 assert.equal(left.size,direct.size);
 let total=0n,weighted=0n,directWeighted=0n;
 for(const [k,m] of direct){
  assert.equal(left.get(k),m);assert.equal(right.get(k),m);
  const v=k.split(',').map(Number),p=BigInt(v.reduce((s,x,i)=>s+(i+1)*x*x,0));
  total+=m;weighted+=(left.get(k)||0n)*p;directWeighted+=m*p;checks+=2;
 }
 assert.equal(total,pow(a+b+c));assert.equal(weighted,directWeighted);cases++;
}
const report={status:'PASS',scope:'three sequential independent fair-dice batches, exact convolution associativity',cases,checks,elapsedWallMs:Date.now()-start,parentRssBytes:process.memoryUsage().rss,lockedTestRead:false,productionOracleUsed:false,threeBalutTurnOptimalityCertified:false,limitations:['Three dice batches are not three Balut turns','No Bellman max, scoring rules, category switching or 28-turn policy proof']};
writeFileSync('oracle3-iteration35-kernel-composition.json',JSON.stringify(report,null,2)+'\n');
console.log('ORACLE3_ITERATION35='+JSON.stringify(report));
