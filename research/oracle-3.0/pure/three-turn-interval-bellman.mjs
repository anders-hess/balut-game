// Oracle 3.0 iteration 36: exact rational interval Bellman primitives.
// Independent mathematical research core; not connected to production Oracle.
// All fractions use BigInt; never convert Q comparisons to Float64.
import assert from 'node:assert/strict';
export const rat=(n,d=1n)=>{n=BigInt(n);d=BigInt(d);assert(d!==0n);if(d<0n){n=-n;d=-d;}const gcd=(a,b)=>{a=a<0n?-a:a;while(b){[a,b]=[b,a%b];}return a||1n;};const g=gcd(n,d);return {n:n/g,d:d/g};};
export const add=(a,b)=>rat(a.n*b.d+b.n*a.d,a.d*b.d);
export const mul=(a,b)=>rat(a.n*b.n,a.d*b.d);
export const cmp=(a,b)=>a.n*b.d<b.n*a.d?-1:a.n*b.d>b.n*a.d?1:0;
export const bounds=(lo,hi)=>{assert(cmp(lo,hi)<=0);return {lo,hi};};
export const chance=(outcomes)=>{let mass=rat(0n);let lo=rat(0n),hi=rat(0n);for(const {p,value} of outcomes){assert(p.n>=0n);mass=add(mass,p);lo=add(lo,mul(p,value.lo));hi=add(hi,mul(p,value.hi));}assert.equal(cmp(mass,rat(1n)),0,'chance mass must be exactly one');return bounds(lo,hi);};
export const decision=(actions)=>{assert(actions.length>0);let lo=actions[0].value.lo,hi=actions[0].value.hi;for(const a of actions.slice(1)){if(cmp(a.value.lo,lo)>0)lo=a.value.lo;if(cmp(a.value.hi,hi)>0)hi=a.value.hi;}const certified=actions.filter((a,i)=>actions.every((b,j)=>i===j||cmp(a.value.lo,b.value.hi)>0));return {value:bounds(lo,hi),uniqueOptimalAction:certified.length===1?certified[0].key:null};};
// Three-turn finite horizon: each transition is a complete legal TURN,
// not a dice reroll. The caller must supply all legal turn actions and
// exact transition probabilities; this module does NOT implement Balut rules.
export function solveTurns(state,turns,enumerate,terminal,cache=new Map()){
 assert(Number.isInteger(turns)&&turns>=0&&turns<=3);
 const id=JSON.stringify([turns,state]);if(cache.has(id))return cache.get(id);
 if(turns===0){const v=terminal(state);const out={value:v,uniqueOptimalAction:null};cache.set(id,out);return out;}
 const actions=enumerate(state);assert(actions.length>0);
 const result=decision(actions.map(a=>({key:a.key,value:chance(a.outcomes.map(o=>({p:o.p,value:solveTurns(o.next,turns-1,enumerate,terminal,cache).value})))})));
 cache.set(id,result);return result;
}
