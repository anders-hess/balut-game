// Oracle 3.0 iteration 26: independent legal action-space completeness audit.
// Does not recompute Bellman Q; it independently enumerates every allowed action
// and validates that the certified Q dataset has precisely those keys.
// Does not use any production advisor, BPIV, model, or test feedback.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {CATEGORIES,score} from '../phase1/simulator.mjs';
const splits=['train','validation','locked_test'];
function scoreKey(category,dice){
 return 'score:'+CATEGORIES.indexOf(category)+':'+score(category,dice);
}
function holdKeys(dice){
 const keys=new Set();
 for(let mask=0;mask<32;mask++){
  const count=[0,0,0,0,0,0];
  for(let i=0;i<5;i++)if(mask&(1<<i))count[dice[i]-1]++;
  if(count.reduce((a,b)=>a+b,0)===5)continue;
  keys.add('hold:'+count.join(''));
 }
 return keys;
}
let roots=0,actions=0,scoreActions=0,holdActions=0;
const splitMetrics={};
for(const split of splits){
 const doc=JSON.parse(readFileSync('oracle3-action-q-'+split+'.json','utf8'));
 assert.equal(doc.split,split);
 let localRoots=0,localActions=0,localHolds=0;
 for(const card of doc.cards){
  const open=CATEGORIES.filter(c=>card.card[c].includes(null));
  assert.deepEqual(open,['fours','straight']);
  for(const root of card.roots){
   const expected=new Set(open.map(c=>scoreKey(c,root.dice)));
   if(root.rerollsRemaining>0)for(const h of holdKeys(root.dice))expected.add(h);
   const actual=Object.keys(root.actionQNumerators);
   assert.equal(actual.length,expected.size,'action cardinality mismatch');
   assert.deepEqual(actual.slice().sort(),[...expected].sort(),
    'missing, extra or malformed action keys');
   const denom=BigInt(root.denominator);
   assert.ok(denom>0n);
   for(const key of actual){
    const numerator=BigInt(root.actionQNumerators[key]);
    assert.ok(numerator>=0n,'negative action value');
    // Finite 28-turn Big Points are safely bounded in magnitude by 1000.
    assert.ok(numerator<=1000n*denom,'implausible action value');
   }
   assert.deepEqual(root.bestActionKeys.slice().sort(),
    actual.filter(k=>BigInt(root.actionQNumerators[k])===BigInt(root.bestNumerator)).sort());
   const h=actual.filter(k=>k.startsWith('hold:')).length;
   const s=actual.filter(k=>k.startsWith('score:')).length;
   assert.equal(s,2);
   assert.equal(h,root.rerollsRemaining>0?holdKeys(root.dice).size:0);
   roots++;localRoots++;actions+=actual.length;localActions+=actual.length;
   scoreActions+=s;holdActions+=h;localHolds+=h;
  }
 }
 splitMetrics[split]={roots:localRoots,actions:localActions,holdActions:localHolds};
}
assert.equal(roots,60);
assert.equal(scoreActions,120);
assert.equal(actions,scoreActions+holdActions);
const result={status:'PASS',audit:'independent exhaustive legal action-key enumeration',
 roots,actions,scoreActions,holdActions,splitMetrics,
 exactBigIntActionNumeratorsChecked:true,
 forbiddenProductionOracleImports:0,
 limitations:[
  'This validates action-space completeness and Q encoding, not Bellman optimality',
  'No model trained, selected or evaluated',
  'Constructed two-turn positions do not represent 28-turn natural gameplay'
 ]};
writeFileSync('oracle3-action-q-action-space-audit.json',JSON.stringify(result,null,2)+'\n');
console.log('ORACLE3_ACTION_SPACE_AUDIT='+JSON.stringify(result));
