import assert from 'node:assert/strict';
import {initialScorecard,applyScore,totals} from '../phase1/simulator.mjs';
import {encodeCard} from './adapter.mjs';
import {exactFeatures,FEATURE_DIM,FEATURE_VERSION,assertSeedPartition} from './features.mjs';
import {predictContinuation} from './model.mjs';

const blank=initialScorecard();
assert.equal(exactFeatures(blank).length,FEATURE_DIM);
assert.equal(FEATURE_VERSION,'oracle2-v46-markov-17-v1');
for(let c=0;c<FEATURE_DIM;c++)assert.ok(Number.isFinite(exactFeatures(blank)[c]));
const one=applyScore(blank,'fours',[4,4,4,4,6]).card;
const same=structuredClone(one);
same.fours=[same.fours[3],null,null,null]; // column placement irrelevant to Bellman Markov quotient
assert.deepEqual(encodeCard(one),encodeCard(same));
assert.deepEqual(exactFeatures(one),exactFeatures(same));
assert.notDeepEqual(exactFeatures(one),exactFeatures(blank));
const full=structuredClone(blank);
for(const cat of Object.keys(full))full[cat]=[0,0,0,0];
assert.equal(encodeCard(full).remaining,0);
assert.equal(totals(full).big,-2);
const mkCard=h=>{const c=structuredClone(full);for(let i=0;i<h;i++)c.choice[i]=null;return c;};
const zeros=Array(FEATURE_DIM).fill(0),ones=Array(FEATURE_DIM).fill(1);
const stub={
 featureVersion:FEATURE_VERSION,
 normalization:{mu:zeros,sd:ones},
 stage:{1:2,2:3,3:4},
 linear:{weights:zeros,bias:0.5},
 neural:{w1:[zeros],b1:[0],w2:[0],b2:0.6},
 selected:'neural'
};
for(const h of [1,2,3]){
 assert.equal(predictContinuation(mkCard(h),stub,'stage'),h+1);
 assert.equal(predictContinuation(mkCard(h),stub,'linear'),5);
 assert.equal(predictContinuation(mkCard(h),stub,'neural'),6);
}
assert.equal(predictContinuation(full,stub,'neural'),0);
assert.throws(()=>predictContinuation(blank,stub),'extrapolation beyond exact training horizon must fail');
const rows=[];
for(let i=0;i<20;i++)rows.push({seed:900000+i,split:i<12?'train':i<16?'validation':'test'});
const split=assertSeedPartition(rows,900000,20);
assert.deepEqual([split.train.games,split.validation.games,split.test.games],[12,4,4]);
assert.throws(()=>assertSeedPartition([{...rows[13],split:'train'},...rows.filter((_,i)=>i!==13)],900000,20));
console.log('ORACLE3_EXACT_TRAIN_TEST='+JSON.stringify({
 status:'PASS',features:FEATURE_DIM,markovPermutationInvariant:true,terminalBigPoints:-2,
 modelKinds:['stage','linear','neural'],leakageCheck:true,finitePredictions:true
}));
