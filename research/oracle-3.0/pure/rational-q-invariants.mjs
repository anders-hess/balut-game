// Iteration 33: exact algebraic invariants independent of Bellman implementation.
// TRAIN + VALIDATION only. No student inference, locked test, or production Oracle.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
const SIX=6n, started=Date.now();
const report={status:'PASS',audit:'exact rational Q divisibility and score-transition identity',
  lockedTestRead:false,modelFitPerformed:false,roots:0,actions:0,holds:0,scores:0,
  crossRootScoreIdentities:0,nontrivialHoldDivisibilityChecks:0,splits:{},
  limitations:['Necessary exact arithmetic invariants, not sufficient proof of Bellman optimality',
  'Only TRAIN and VALIDATION; no independent complete Bellman implementation',
  'No AI generalization estimate, no three-turn or 28-turn certificate']};
function checkRoot(root,seen){
 const r=root.rerollsRemaining;
 assert.ok(Number.isInteger(r)&&r>=0&&r<=2);
 const denominator=SIX**BigInt(15+5*r);
 assert.equal(BigInt(root.denominator),denominator);
 const q=Object.entries(root.actionQNumerators);
 let max=null;
 for(const [key,raw] of q){
  const n=BigInt(raw);
  assert.ok(n>=0n);
  if(max===null||n>max)max=n;
  if(key.startsWith('hold:')){
   const match=/^hold:([0-5]{6})$/.exec(key);
   assert.ok(match,'invalid hold action key');
   const held=[...match[1]].reduce((a,c)=>a+Number(c),0);
   assert.ok(held<5);
   const factor=SIX**BigInt(held);
   assert.equal(n%factor,0n,'hold Q must have factor 6^held');
   if(held>0)report.nontrivialHoldDivisibilityChecks++;
   report.holds++;
  }else{
   const match=/^score:(\d+):(-?\d+)$/.exec(key);
   assert.ok(match,'invalid score key');
   const factor=SIX**BigInt(5*r);
   assert.equal(n%factor,0n,'score Q must have factor 6^(5*r)');
   // Score placement is independent of dice beyond category + achieved score.
   // All roots on the same scorecard must agree on normalized score Q.
   const normalized=n/factor;
   const prev=seen.get(key);
   if(prev!==undefined){
    assert.equal(normalized,prev,'same card/score transition has different continuation Q');
    report.crossRootScoreIdentities++;
   }else seen.set(key,normalized);
   report.scores++;
  }
  report.actions++;
 }
 assert.equal(max,BigInt(root.bestNumerator));
 report.roots++;
}
for(const split of ['train','validation']){
 const doc=JSON.parse(readFileSync('oracle3-action-q-'+split+'.json','utf8'));
 assert.equal(doc.split,split);
 const before={roots:report.roots,actions:report.actions,holds:report.holds,scores:report.scores};
 for(const card of doc.cards){
  const seen=new Map();
  for(const root of card.roots)checkRoot(root,seen);
 }
 report.splits[split]={cards:doc.cards.length,roots:report.roots-before.roots,
  actions:report.actions-before.actions,holds:report.holds-before.holds,
  scores:report.scores-before.scores};
}
assert.equal(report.roots,48);
assert.equal(report.scores,96);
assert.equal(report.actions,report.holds+report.scores);
report.elapsedWallMs=Date.now()-started;
report.parentRssBytes=process.memoryUsage().rss;
writeFileSync('oracle3-iteration33-rational-q-invariants.json',JSON.stringify(report,null,2)+'\n');
console.log('ORACLE3_ITERATION33='+JSON.stringify(report));
