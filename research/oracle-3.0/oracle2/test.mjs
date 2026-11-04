// Independent differential checks: C++ Oracle 2.0 vs production-parity JS Oracle 3.0.
import assert from 'node:assert/strict';
import {CATEGORIES,initialScorecard,applyScore,totals} from '../phase1/simulator.mjs';
import {chooseExpectimax} from '../phase3/expectimax.mjs';
import {encodeCard,exactAtBoundary,exactAtRoll,exactBestLegal,actionRegret,actionKey} from './adapter.mjs';

const patterns=[
 [4,4,4,4,4],
 [5,5,5,5,5],
 [6,6,6,6,6],
 [1,2,3,4,5],
 [2,2,2,5,5],
 [2,3,4,5,6],
 [1,1,1,1,1]
];
function fixture(remaining){
 let card=initialScorecard();
 for(let c=0;c<CATEGORIES.length;c++){
  const cat=CATEGORIES[c],n=4-(remaining[cat]??0);
  for(let i=0;i<n;i++)card=applyScore(card,cat,patterns[(c*3+i)%patterns.length]).card;
 }
 return card;
}
function success(x){assert.equal(x.status,'EXACT_FLOAT64',JSON.stringify(x));return x;}
function near(a,b,eps=1e-8){assert.ok(Math.abs(a-b)<eps,'difference '+a+' vs '+b);}
const full=fixture({});
const fullState=success(exactAtBoundary(full));
assert.equal(fullState.remaining,0);
near(fullState.value,totals(full).big);
let lastTurnTests=0,fullActions=0;
for(const c of ['fours','straight','choice','balut']){
 const card=fixture({[c]:1});
 const info=encodeCard(card);assert.equal(info.remaining,1);
 const state=success(exactAtBoundary(card));
 assert.ok(Number.isFinite(state.value));
 for(const rollsRemaining of [0,1,2]){
  const dice=rollsRemaining===0?[4,4,4,6,6]:rollsRemaining===1?[1,2,3,4,5]:[2,3,4,5,6];
  const exact=success(exactAtRoll({card,dice,rollsRemaining}));
  const js=chooseExpectimax({card,dice,rollsRemaining},()=>{throw Error('should not evaluate an approximate model on final turn');});
  near(js.q,exact.value);
  const optimal=exactBestLegal(exact,{card,dice,rollsRemaining});
  near(actionRegret(exact,optimal,dice).regretBP,0);
  near(actionRegret(exact,js.action,dice).regretBP,0);
  assert.ok(exact.actions[actionKey(js.action,dice)]!==undefined);
  lastTurnTests++;
  fullActions+=Object.keys(exact.actions).length;
 }
}
// Multi-category nonlinear threshold/bonus interactions, beyond the terminal turn.
for(const missing of [{fours:1,choice:1},{straight:1,fullHouse:1,balut:1}]){
 const card=fixture(missing),n=encodeCard(card).remaining;
 const state=success(exactAtBoundary(card,{cap:250000,timeoutMs:25000}));
 const root={card,dice:[4,4,4,6,6],rollsRemaining:1};
 const q=success(exactAtRoll(root,{cap:250000,timeoutMs:25000}));
 assert.equal(q.remaining,n);
 near(actionRegret(q,exactBestLegal(q,root),root.dice).regretBP,0);
 assert.ok(Number.isFinite(state.value));
}
// HARD fail if a large Bellman search exceeds its stated cap: never fabricate a value.
const tooSmall=exactAtBoundary(fixture({straight:1,choice:1,balut:1}),{cap:1,timeoutMs:5000});
assert.equal(tooSmall.status,'RESOURCE_LIMIT_OR_ERROR');
assert.ok(tooSmall.stderr.includes('EXACT_RESOURCE_LIMIT_NO_FALLBACK'));
// Reject invalid/nonphysical scorecard formats at the integration boundary.
assert.throws(()=>encodeCard({...full,choice:[null,null]}));
console.log('ORACLE3_ORACLE2_PARITY='+JSON.stringify({
 status:'PASS',source:'pinned Oracle 2.0 v46 exact_reachable.cpp',
 terminalStateParity:1,oneTurnQParityRoots:lastTurnTests,
 checkedOneTurnActionCount:fullActions,multicategoryRoots:2,
 resourceLimitExplicit:true,globalOptimalityClaim:false
}));
