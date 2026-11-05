// Independent corpus-integrity gate. Reads only mathematically certified JSON;
// no production policy, AI model, or oracle training/test feedback.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {CATEGORIES,initialScorecard,applyScore,score} from '../phase1/simulator.mjs';
import {encodeCard} from '../oracle2/adapter.mjs';
const names=['train','validation','locked_test'];
const expected={train:18,validation:6,locked_test:6};
const seedRanges={train:[992100000,992100017],validation:[992200000,992200005],locked_test:[992300000,992300005]};
const seenSeeds=new Set(),seenCards=new Map(),seenRoots=new Set();
const counts={};let totalActions=0,uniqueOptimal=0,positiveMargins=0;
const sha=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
for(const split of names){
 const doc=JSON.parse(readFileSync('oracle3-action-q-'+split+'.json','utf8'));
 assert.equal(doc.schema,'oracle3-exact-rational-action-q-v1');
 assert.equal(doc.split,split);
 assert.equal(doc.cards.length,expected[split]);
 assert.equal(doc.modelTrainingAllowed,split==='train');
 assert.equal(doc.modelSelectionAllowed,split==='validation');
 assert.equal(doc.lockedTestForFinalEvaluationOnly,split==='locked_test');
 let splitActions=0;
 for(const entry of doc.cards){
  const {seed,witness,card,roots}=entry;
  assert.ok(Number.isSafeInteger(seed)&&seed>=seedRanges[split][0]&&seed<=seedRanges[split][1]);
  assert.ok(!seenSeeds.has(seed),'duplicate seed across groups');seenSeeds.add(seed);
  assert.equal(witness.length,26);
  let replay=initialScorecard();
  for(const step of witness){
   assert.ok(CATEGORIES.includes(step.category));
   assert.ok(Array.isArray(step.dice)&&step.dice.length===5&&step.dice.every(d=>Number.isInteger(d)&&d>=1&&d<=6));
   assert.equal(score(step.category,step.dice),step.value);
   const applied=applyScore(replay,step.category,step.dice);
   assert.equal(applied.column,step.column);
   assert.equal(applied.value,step.value);
   replay=applied.card;
  }
  assert.deepEqual(replay,card,'witness must reconstruct the exact scorecard');
  assert.equal(encodeCard(card).remaining,2);
  assert.deepEqual(CATEGORIES.filter(c=>card[c].includes(null)),['fours','straight']);
  const cardHash=sha(card);
  assert.ok(!seenCards.has(cardHash),'duplicate scorecard across splits or within split: '+seenCards.get(cardHash));
  seenCards.set(cardHash,split+':'+seed);
  assert.equal(roots.length,2);
  assert.deepEqual(roots.map(r=>r.rerollsRemaining),[1,2]);
  for(const root of roots){
   assert.ok(root.dice.length===5&&root.dice.every(d=>Number.isInteger(d)&&d>=1&&d<=6));
   const rootHash=sha([cardHash,[...root.dice].sort(),root.rerollsRemaining]);
   assert.ok(!seenRoots.has(rootHash));seenRoots.add(rootHash);
   const denom=BigInt(root.denominator);
   assert.equal(denom,6n**BigInt(15+5*root.rerollsRemaining));
   const vals=Object.entries(root.actionQNumerators);
   assert.ok(vals.length>=2);
   const numerators=vals.map(([key,value])=>{assert.ok(key.length>0);const n=BigInt(value);assert.ok(n>=0n);return n;});
   const best=numerators.reduce((a,b)=>a>b?a:b);
   assert.equal(best,BigInt(root.bestNumerator));
   assert.deepEqual(vals.filter(([,v])=>BigInt(v)===best).map(([k])=>k).sort(),[...root.bestActionKeys].sort());
   assert.ok(root.bestActionKeys.length>0);
   if(root.bestActionKeys.length===1)uniqueOptimal++;
   const worse=numerators.filter(n=>n<best);
   const margin=worse.length?best-worse.reduce((a,b)=>a>b?a:b):null;
   assert.equal(root.strictlyPositiveMarginNumerator,margin===null?null:margin.toString());
   if(margin!==null)positiveMargins++;
   splitActions+=vals.length;
  }
 }
 counts[split]={cards:doc.cards.length,roots:doc.cards.length*2,actions:splitActions};
 totalActions+=splitActions;
}
assert.equal(seenSeeds.size,30);
assert.equal(seenCards.size,30);
assert.equal(seenRoots.size,60);
const summary={status:'PASS',scorecards:30,roots:60,actions:totalActions,
 uniqueOptimalRoots:uniqueOptimal,positiveMarginRoots:positiveMargins,
 counts,distinctScorecardHashes:seenCards.size,
 exactDenominatorsChecked:true,legalWitnessReplayChecked:true,
 groupLeakageChecked:true,modelTrainingOrEvaluationPerformed:false,
 caveat:'Integrity gate is not an independent Bellman recomputation; the solver still needs independent numerical audit.'};
writeFileSync('oracle3-action-q-integrity.json',JSON.stringify(summary,null,2)+'\n');
console.log('ORACLE3_ACTION_Q_INTEGRITY='+JSON.stringify(summary));
