// Prepare direct Q*(s,d,a) supervision with *one identical BPIV prior per root*.
// Old archived 60 games are now all train. New separate seeds provide legal
// scratch augmentation (train), fresh validation and truly locked test.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {performance} from 'node:perf_hooks';
import {exampleGroup,qRegret,ACTION_DIM,ACTION_FEATURE_VERSION} from './q-teacher.mjs';
const priorFile=process.argv[2]??'oracle3-phase4-supervised.json';
const freshFile=process.argv[3]??'oracle3-q-fresh.json';
const prefix=process.argv[4]??'oracle3-q';
const old=JSON.parse(readFileSync(priorFile,'utf8'));
const fresh=JSON.parse(readFileSync(freshFile,'utf8'));
assert.equal(old.summary.nGames,60);
assert.equal(old.summary.seedBase,910100000);
assert.equal(old.rows.length,180);
assert.equal(fresh.summary.nGames,96);
assert.deepEqual(fresh.summary.seeds,[920200000,920200095]);
const started=performance.now(),groups=[],missing=[];
for(const row of old.rows){
 assert.ok(row.seed>=910100000&&row.seed<=910100059);
 if(row.qReference.status!=='EXACT_FLOAT64'){missing.push({seed:row.seed,source:'old'});continue;}
 const g=exampleGroup({...row,kind:'natural',source:'archived_13'});
 g.split='train';g.source='archived_13';
 groups.push(g);
}
for(const row of fresh.rows){
 if(row.qReference.status!=='EXACT_FLOAT64'){
  missing.push({seed:row.seed,source:'fresh',kind:row.kind});continue;
 }
 const g=exampleGroup(row);
 g.split=row.split;g.source=row.source;
 assert.ok(['train','validation','test'].includes(g.split));
 groups.push(g);
}
const gameSeeds=Object.fromEntries(['train','validation','test'].map(k=>[k,new Set(groups.filter(g=>g.split===k).map(g=>g.seed))]));
assert.equal(gameSeeds.train.size,84,'60 old+24 scratch new games');
assert.equal(gameSeeds.validation.size,24);
assert.equal(gameSeeds.test.size,48);
for(const k of ['train','validation'])for(const seed of gameSeeds[k])assert.ok(!gameSeeds.test.has(seed));
for(const seed of gameSeeds.train)assert.ok(!gameSeeds.validation.has(seed));
assert.ok(groups.filter(g=>g.split==='test').length>=180,'minimum locked test coverage');
const metrics={status:'EXACT_Q_ACTION_TRAINING_TABLE',
 datasetSource:['iteration13 verified GitHub Actions artifact 13349458382',
 'fresh 96-game exact Oracle2 action-Q evaluation'],
 featureVersion:ACTION_FEATURE_VERSION,featureDim:ACTION_DIM,
 rootCount:groups.length,solvedQRoots:groups.length,omittedRoots:missing.length,
 independentGames:Object.fromEntries(Object.entries(gameSeeds).map(([k,v])=>[k,v.size])),
 splitRootCounts:Object.fromEntries(['train','validation','test'].map(k=>[k,groups.filter(g=>g.split===k).length])),
 exactActionQLabels:groups.reduce((s,g)=>s+g.items.length,0),
 actionLabelsBySplit:Object.fromEntries(['train','validation','test'].map(k=>[k,groups.filter(g=>g.split===k).reduce((s,g)=>s+g.items.length,0)])),
 zeroScoreActionLabels:groups.reduce((s,g)=>s+g.items.filter(a=>a.scratch).length,0),
 scratchTrajectoryRoots:groups.filter(g=>g.kind==='scratch').length,
 trainScratchTrajectoryRoots:groups.filter(g=>g.kind==='scratch'&&g.split==='train').length,
 validationObservedRoots:groups.filter(g=>g.split==='validation'&&g.source==='observed').length,
 testObservedRoots:groups.filter(g=>g.split==='test'&&g.source==='observed').length,
 testSyntheticRoots:groups.filter(g=>g.split==='test'&&g.source==='possible_counterfactual_dice').length,
 preparationWallMs:performance.now()-started,parentRssBytes:process.memoryUsage().rss,
 node:process.version,limitations:[
 'Prior iteration13 holdout may be used as training in this NEW experiment; it is never used as this experiments validation/test',
 'Only Oracle2 Float64 Bellman values with <=3 turns left; direct Q labels include all legal holds and score/scratch choices',
 'Synthetic dice roots are physically possible but not frequency-weighted; stratify and report separately',
 'BPIV feature comes from frozen actual production scoring and is not a ground truth Q',
 'A table of supervised Q values does not imply 28-turn optimal policy or higher final game score'
 ]};
writeFileSync(prefix+'.groups.json',JSON.stringify({metrics,groups,missing})+'\n');
writeFileSync(prefix+'.preparation.json',JSON.stringify(metrics,null,2)+'\n');
console.log('ORACLE3_Q_PREPARATION='+JSON.stringify(metrics));
