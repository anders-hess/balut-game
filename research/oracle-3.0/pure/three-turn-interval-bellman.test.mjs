import assert from 'node:assert/strict';
import {rat,cmp,bounds,chance,decision,solveTurns} from './three-turn-interval-bellman.mjs';
import {writeFileSync} from 'node:fs';
const t=Date.now();let checks=0;
const r=n=>rat(BigInt(n));
assert.equal(cmp(rat(2n,4n),rat(1n,2n)),0);checks++;
assert.deepEqual(chance([{p:rat(1n,3n),value:bounds(r(0),r(3))},{p:rat(2n,3n),value:bounds(r(3),r(6))}]),bounds(r(2),r(5)));checks++;
assert.equal(decision([{key:'a',value:bounds(r(5),r(6))},{key:'b',value:bounds(r(2),r(4))}]).uniqueOptimalAction,'a');checks++;
assert.equal(decision([{key:'a',value:bounds(r(3),r(6))},{key:'b',value:bounds(r(4),r(5))}]).uniqueOptimalAction,null);checks++;
assert.throws(()=>chance([{p:rat(1n,2n),value:bounds(r(0),r(0))}]));checks++;
// Independent synthetic three-turn decision tree, NOT Balut certification.
// At each turn choose a deterministic +1 or +2 state increment.
// After three complete turns the exact optimum is +6.
const enumTurns=s=>[{key:'one',outcomes:[{p:r(1),next:s+1}]},{key:'two',outcomes:[{p:r(1),next:s+2}]}];
const exact=s=>bounds(r(s),r(s));
const solved=solveTurns(0,3,enumTurns,exact);
assert.equal(cmp(solved.value.lo,r(6)),0);assert.equal(cmp(solved.value.hi,r(6)),0);
assert.equal(solved.uniqueOptimalAction,'two');checks++;
// Bounds containing exact terminal values must enclose true optimum.
const loose=s=>bounds(r(s-1),r(s+1));
const enclosure=solveTurns(0,3,enumTurns,loose);
assert(cmp(enclosure.value.lo,r(6))<=0&&cmp(enclosure.value.hi,r(6))>=0);checks++;
const report={iteration:36,status:'PASS',checks,syntheticThreeTurnExactValue:'6',syntheticThreeTurnCertifiedAction:'two',balutThreeTurnCertified:false,balut28TurnCertified:false,lockedTestRead:false,productionOracleUsed:false,elapsedWallMs:Date.now()-t,parentRssBytes:process.memoryUsage().rss,limitations:['Generic exact-rational interval Bellman core only; synthetic three-turn tree, not Balut transitions','Must connect independently implemented legal Balut scorecard and full-turn chance transitions','No GitHub Actions success implied by local or committed code']};
writeFileSync('oracle3-iteration36-interval-core.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report));
