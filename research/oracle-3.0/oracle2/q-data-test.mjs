// Independent audit of the complete Q teacher table after native collection,
// before training. The locked test is never inspected by the trainer itself.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {ACTION_DIM,ACTION_FEATURE_VERSION,actionFeature,legalActions} from './q-teacher.mjs';
import {actionKey,encodeCard} from './adapter.mjs';
const prefix=process.argv[2]??'oracle3-q';
const {metrics,groups,missing}=JSON.parse(readFileSync(prefix+'.groups.json','utf8'));
assert.equal(metrics.featureVersion,ACTION_FEATURE_VERSION);
assert.equal(metrics.featureDim,ACTION_DIM);
assert.deepEqual(metrics.independentGames,{train:84,validation:24,test:48});
assert.ok(groups.filter(g=>g.split==='train').length>=260);
assert.ok(groups.filter(g=>g.split==='test').length>=180);
assert.ok(metrics.exactActionQLabels>9000);
const seeds={train:new Set(),validation:new Set(),test:new Set()};
let numberActions=0,zero=0,rootsNatural=0,rootsScratch=0;
for(const g of groups){
 seeds[g.split].add(g.seed);
 assert.ok(['natural','scratch'].includes(g.kind));
 rootsNatural+=+(g.kind==='natural');rootsScratch+=+(g.kind==='scratch');
 assert.equal(encodeCard(g.card).remaining,g.remaining);
 assert.ok(g.remaining>=1&&g.remaining<=3);
 assert.ok(g.rollsRemaining>=0&&g.rollsRemaining<=2);
 assert.ok(g.items.some(x=>x.key===g.productionKey));
 assert.equal(g.items.length,legalActions(g).length);
 let maxExact=-Infinity,maxBPIV=-Infinity;
 const seen=new Set();
 for(const a of g.items){
  numberActions++;
  if(a.scratch)zero++;
  assert.ok(!seen.has(a.key),'duplicate legal action');
  seen.add(a.key);
  assert.equal(actionKey(a.action,g.dice),a.key);
  assert.equal(a.features.length,ACTION_DIM);
  assert.deepEqual(actionFeature(g,a.action,a.bpivGap),a.features);
  assert.ok(Number.isFinite(a.exactGap)&&a.exactGap<=1e-8);
  assert.ok(Number.isFinite(a.residualTarget));
  assert.ok(Math.abs(a.exactGap-(a.bpivGap+10*a.residualTarget))<1e-8);
  maxExact=Math.max(maxExact,a.exactGap);
  maxBPIV=Math.max(maxBPIV,a.bpivGap);
 }
 assert.ok(Math.abs(maxExact)<1e-8);
 assert.ok(Math.abs(maxBPIV)<1e-8);
}
assert.equal(numberActions,metrics.exactActionQLabels);
assert.equal(zero,metrics.zeroScoreActionLabels);
assert.equal(rootsNatural+rootsScratch,groups.length);
assert.ok(seeds.train.size===84&&seeds.validation.size===24&&seeds.test.size===48);
for(const a of seeds.train)assert.ok(!seeds.test.has(a)&&!seeds.validation.has(a));
for(const a of seeds.validation)assert.ok(!seeds.test.has(a));
const scratchTest=groups.filter(g=>g.split==='test'&&g.kind==='scratch');
assert.ok(scratchTest.length>50);
console.log('ORACLE3_Q_DATA_AUDIT='+JSON.stringify({
 status:'PASS',rootCount:groups.length,actionQLabels:numberActions,
 zeroScoreAlternatives:zero,gameSplit:{train:84,validation:24,test:48},
 scratchTestRoots:scratchTest.length,omitted:missing.length
}));
