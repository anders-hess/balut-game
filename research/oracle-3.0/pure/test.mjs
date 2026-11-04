// Differential checks: clean mathematical simulator and custom multinomial
// expectimax versus independent Oracle 2.0 Bellman native exact values.
import assert from 'node:assert/strict';
import {CATEGORIES,initialScorecard,applyScore,totals,score} from '../phase1/simulator.mjs';
import {exactAtBoundary,exactAtRoll,actionKey,encodeCard} from '../oracle2/adapter.mjs';
import {mathSampler} from './sampler.mjs';
import {multinomialOutcomes,exactWithinTurn} from './chance.mjs';

const lengths=[1,6,21,56,126,252];
for(let n=0;n<=5;n++){
 const d=multinomialOutcomes(n);
 assert.equal(d.length,lengths[n]);
 assert.ok(Math.abs(d.reduce((a,b)=>a+b.prob,0)-1)<1e-12);
 assert.ok(d.every(x=>x.dice.length===n&&x.prob>0));
 if(n)for(let face=1;face<=6;face++){
  const expect=d.reduce((a,b)=>a+b.prob*b.dice.filter(v=>v===face).length,0);
  assert.ok(Math.abs(expect-n/6)<1e-10);
 }
}
let scratch=0,zero=0;
for(let k=0;k<3;k++)for(let i=0;i<8;i++){
 const kind=['uniform','scoreaware','scratch'][k],s=mathSampler(950100400+i*3+k,{kind});
 assert.equal(s.rows.length,4);
 assert.equal(s.rows.filter(x=>x.source==='observed').length,3);
 assert.deepEqual(s.rows.map(x=>x.remaining),[3,3,2,1]);
 assert.ok(s.rows.every(r=>encodeCard(r.card).remaining===r.remaining));
 assert.ok(s.rows.every(r=>r.dice.length===5));
 scratch+=s.forcedScratches;zero+=s.zeroScoreEntries;
}
assert.ok(zero>0);
assert.ok(scratch>0,'scratch generator must force legal zeros');
let card=initialScorecard();
for(const c of CATEGORIES)for(let i=0;i<4;i++){
 if(c==='choice'&&i===3)continue;
 card=applyScore(card,c,[4,4,4,6,6]).card;
}
assert.equal(encodeCard(card).remaining,1);
const root={card,dice:[3,4,5,6,6],rollsRemaining:2};
const native=exactAtRoll(root,{cap:250000,timeoutMs:12000});
assert.equal(native.status,'EXACT_FLOAT64',JSON.stringify(native));
const math=exactWithinTurn(root,()=>{throw Error('terminal state must not call a continuation network');});
assert.ok(Math.abs(math.value-native.value)<1e-7,'terminal turn expectimax parity');
assert.equal(Object.keys(math.actionValues).length,Object.keys(native.actions).length);
for(const [key,q] of Object.entries(native.actions))
 assert.ok(Math.abs(q-math.actionValues[key])<1e-7,'native Q mismatch '+key);
assert.ok(Math.abs(native.value-math.actionValues[actionKey(math.action,root.dice)])<1e-7);
let second=initialScorecard();
for(const c of CATEGORIES)for(let i=0;i<4;i++){
 if((c==='choice'||c==='fives')&&i===3)continue;
 second=applyScore(second,c,[3,3,3,5,5]).card;
}
assert.equal(encodeCard(second).remaining,2);
const noReroll={card:second,dice:[5,5,5,6,6],rollsRemaining:0};
const teacher=exactAtRoll(noReroll,{cap:250000,timeoutMs:12000});
assert.equal(teacher.status,'EXACT_FLOAT64',JSON.stringify(teacher));
const child=exactWithinTurn(noReroll,after=>{
 const b=exactAtBoundary(after,{cap:250000,timeoutMs:12000});
 assert.equal(b.status,'EXACT_FLOAT64');
 return b.value-totals(after).big;
});
for(const [key,q] of Object.entries(teacher.actions))
 assert.ok(Math.abs(q-child.actionValues[key])<1e-7,'mathematical value semantics mismatch '+key);
console.log('ORACLE3_PURE_MATH_PARITY='+JSON.stringify({
 status:'PASS',multinomialOutcomes:lengths,
 legalSamplerSeededGames:24,forcedLegalScratches:scratch,zeroScoreEntries:zero,
 terminalBellmanQActions:Object.keys(native.actions).length,
 twoTurnMathematicalContinuation:true,productionOracleCalls:0
}));
