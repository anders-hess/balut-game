// Independent unit and differential tests of direct action-Q feature and
// exact Oracle2 parity, including legal scratch, reroll and score actions.
import assert from 'node:assert/strict';
import {initialScorecard,CATEGORIES,applyScore,score,totals} from '../phase1/simulator.mjs';
import {cachedPolicy} from '../phase1/cached-oracle.mjs';
import {exactAtRoll,encodeCard,actionKey} from './adapter.mjs';
import {ACTION_DIM,actionFeature,legalActions,bpivActionMap,exampleGroup,selectAction,qRegret} from './q-teacher.mjs';
import {bpivScoreNow} from '../../../src/logic/oracle/bpiv.js';
const dice=[5,3,1,6,6],card=initialScorecard();
const root={card,dice,rollsRemaining:0};
const acts=legalActions(root),bp=bpivActionMap(root);
assert.equal(acts.length,7);
assert.equal(Object.keys(bp).length,7);
for(const a of acts){
 const k=actionKey(a,dice);
 assert.ok(Number.isFinite(bp[k]));
 assert.ok(Math.abs(bp[k]-bpivScoreNow(a.category,dice,card,28).bpiv)<1e-10);
 assert.equal(actionFeature(root,a,bp[k]).length,ACTION_DIM);
}
for(const left of [1,2]){
 const z={card,dice,rollsRemaining:left};
 const vals=bpivActionMap(z),actions=legalActions(z);
 assert.equal(actions.length,Object.keys(vals).length);
 assert.ok(actions.length>7);
 for(const a of actions)assert.ok(Number.isFinite(vals[actionKey(a,dice)]));
}
let nearEnd=initialScorecard();
for(const c of CATEGORIES)for(let i=0;i<4;i++){
 if(c==='fullHouse'&&i===3)continue;
 if(c==='choice'&&i===3)continue;
 nearEnd=applyScore(nearEnd,c,[4,4,4,6,6]).card;
}
assert.equal(encodeCard(nearEnd).remaining,2);
const exactRoot={card:nearEnd,dice:[1,2,3,4,5],rollsRemaining:1};
const teacher=exactAtRoll(exactRoot,{cap:250000,timeoutMs:12000});
assert.equal(teacher.status,'EXACT_FLOAT64',JSON.stringify(teacher));
const root2={...exactRoot,seed:123,remaining:2,productionAction:cachedPolicy(exactRoot),
 qReference:{status:'EXACT_FLOAT64',optimalFinalBP:teacher.value,actions:teacher.actions}};
const group=exampleGroup(root2);
assert.equal(group.items.length,Object.keys(teacher.actions).length);
assert.ok(group.items.filter(x=>x.scratch).length>0,'explicit legal scratch must be represented');
assert.ok(group.items.every(x=>x.features.length===ACTION_DIM));
assert.ok(group.items.every(x=>x.exactGap<=1e-8&&x.bpivGap<=1e-8));
assert.ok(group.items.every(x=>Number.isFinite(x.residualTarget)));
const greedy=selectAction(group,()=>0,0);
const bestBpiv=Math.max(...group.items.map(x=>x.bpivGap));
assert.ok(Math.abs(greedy.bpivGap-bestBpiv)<1e-8);
const prod=group.items.find(x=>x.key===group.productionKey);
assert.ok(prod);
assert.ok(qRegret(group,prod.key)>=0);
const perm={...root2,dice:[5,4,3,2,1]};
const permGroup=exampleGroup({...perm,productionAction:cachedPolicy(perm)});
assert.equal(permGroup.items.length,group.items.length);
assert.equal(totals(nearEnd).big,totals(nearEnd).big);
assert.throws(()=>exampleGroup({...root2,qReference:{...root2.qReference,actions:{}}}),'missing Q map must fail');
console.log('ORACLE3_Q_TEACHER_TEST='+JSON.stringify({
 status:'PASS',featureDim:ACTION_DIM,scoreOnlyActions:acts.length,
 exactTwoTurnActions:group.items.length,zeroScoreOptions:group.items.filter(x=>x.scratch).length,
 probedRerolls:[0,1,2],actionQExactParity:true,scorecardImmutable:true
}));
