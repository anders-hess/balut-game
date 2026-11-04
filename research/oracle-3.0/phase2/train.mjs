// Oracle 3.0 phase 2: deterministic, dependency-free MLP holdout experiment.
// node research/oracle-3.0/phase2/train.mjs oracle3-trajectories oracle3-neural
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {performance} from 'node:perf_hooks';
const input=process.argv[2]??'oracle3-trajectories',output=process.argv[3]??'oracle3-neural';
const rows=readFileSync(input+'.jsonl','utf8').trim().split('\n').map(JSON.parse);
const meta=JSON.parse(readFileSync(input+'.metrics.json','utf8'));
assert.equal(rows.length,meta.n*28);
const seeds=[...new Set(rows.map(r=>r.seed))].sort((a,b)=>a-b);
assert.equal(seeds.length,meta.n);assert.ok(seeds.length>=15);
const a=Math.floor(seeds.length*.6),b=a+Math.floor(seeds.length*.2);
const trainSeeds=new Set(seeds.slice(0,a)),valSeeds=new Set(seeds.slice(a,b)),testSeeds=new Set(seeds.slice(b));
const split=s=>rows.filter(r=>s.has(r.seed));
const train=split(trainSeeds),valid=split(valSeeds),test=split(testSeeds);
const D=59,H=32,lr=.005,l2=1e-5;
let randomSeed=0x3a21f8;
function rand(){randomSeed=(Math.imul(randomSeed,1664525)+1013904223)>>>0;return randomSeed/4294967296;}
const mu=Array(D).fill(0),sd=Array(D).fill(0);
for(const r of train)for(let j=0;j<D;j++)mu[j]+=r.state[j]/train.length;
for(const r of train)for(let j=0;j<D;j++)sd[j]+=(r.state[j]-mu[j])**2/train.length;
for(let j=0;j<D;j++)sd[j]=Math.max(.05,Math.sqrt(sd[j]));
function examples(rows){return rows.map(r=>{assert.equal(r.state.length,D);return {x:r.state.map((x,j)=>(x-mu[j])/sd[j]),y:r.remainingBigPoints/10,seed:r.seed,turn:r.turn};});}
const tr=examples(train),va=examples(valid),te=examples(test);
const w1=Array.from({length:H},()=>Array.from({length:D},()=>(rand()-.5)*.12)),b1=Array(H).fill(0),w2=Array.from({length:H},()=>(rand()-.5)*.12);let b2=0;
function forward(x){const h=[];for(let k=0;k<H;k++){let z=b1[k];for(let j=0;j<D;j++)z+=w1[k][j]*x[j];h.push(Math.tanh(z));}let y=b2;for(let k=0;k<H;k++)y+=w2[k]*h[k];return {y,h};}
function metrics(rows,predict){let s=0,abs=0;for(const r of rows){const e=10*(predict(r.x)-r.y);s+=e*e;abs+=Math.abs(e);}return {rmse:Math.sqrt(s/rows.length),mae:abs/rows.length,rows:rows.length,games:new Set(rows.map(r=>r.seed)).size};}
const mean=tr.reduce((s,r)=>s+r.y,0)/tr.length;
const constant={train:metrics(tr,()=>mean),validation:metrics(va,()=>mean),test:metrics(te,()=>mean)};
let best=Infinity,bestEpoch=0,weights=null,patience=0;const start=performance.now();
for(let epoch=1;epoch<=180;epoch++){
 const order=Array.from({length:tr.length},(_,i)=>i);
 for(let i=order.length-1;i>0;i--){const j=Math.floor(rand()*(i+1));[order[i],order[j]]=[order[j],order[i]];}
 for(const i of order){const {x,y}=tr[i],{y:p,h}=forward(x),err=Math.max(-10,Math.min(10,p-y)),old=w2.slice();
  for(let k=0;k<H;k++)w2[k]-=lr*(err*h[k]+l2*w2[k]);b2-=lr*err;
  for(let k=0;k<H;k++){const dz=err*old[k]*(1-h[k]*h[k]);for(let j=0;j<D;j++)w1[k][j]-=lr*(dz*x[j]+l2*w1[k][j]);b1[k]-=lr*dz;}
 }
 const rmse=metrics(va,x=>forward(x).y).rmse;
 if(rmse<best-1e-5){best=rmse;bestEpoch=epoch;patience=0;weights={w1:w1.map(r=>r.slice()),b1:b1.slice(),w2:w2.slice(),b2};}
 else if(++patience>=25)break;
}
assert.ok(weights);
function predict(x){let y=weights.b2;for(let k=0;k<H;k++){let z=weights.b1[k];for(let j=0;j<D;j++)z+=weights.w1[k][j]*x[j];y+=weights.w2[k]*Math.tanh(z);}return y;}
const neural={train:metrics(tr,predict),validation:metrics(va,predict),test:metrics(te,predict)};
// Rows within a game are correlated. Evaluate by independent game and stage.
function diagnostics(rows,model){
 const groups=new Map(),byStage={opening:[],middle:[],endgame:[]};
 for(const r of rows){
  const error=10*(model(r.x)-r.y),stage=r.turn<9?'opening':r.turn<19?'middle':'endgame';
  byStage[stage].push(error);
  if(!groups.has(r.seed))groups.set(r.seed,[]);
  groups.get(r.seed).push(Math.abs(error));
 }
 const gameMae=[...groups.values()].map(a=>a.reduce((s,x)=>s+x,0)/a.length);
 const mean=gameMae.reduce((s,x)=>s+x,0)/gameMae.length;
 const sd=Math.sqrt(gameMae.reduce((s,x)=>s+(x-mean)**2,0)/(gameMae.length-1));
 const stageMetrics=Object.fromEntries(Object.entries(byStage).map(([name,e])=>[name,{rows:e.length,rmse:Math.sqrt(e.reduce((s,x)=>s+x*x,0)/e.length),mae:e.reduce((s,x)=>s+Math.abs(x),0)/e.length}]));
 return {gameCount:gameMae.length,meanGameMae:mean,sdGameMae:sd,ci95Approx:[mean-1.96*sd/Math.sqrt(gameMae.length),mean+1.96*sd/Math.sqrt(gameMae.length)],stageMetrics};
}
const testDiagnostics={constant:diagnostics(te,()=>mean),neural:diagnostics(te,predict)};
const result={testDiagnostics,model:'MLP_59_32_1_tanh',objective:'remaining final BP under production Oracle',split:{trainGames:trainSeeds.size,validationGames:valSeeds.size,testGames:testSeeds.size,trainSeedRange:[seeds[0],seeds[a-1]],validationSeedRange:[seeds[a],seeds[b-1]],testSeedRange:[seeds[b],seeds.at(-1)]},bestEpoch,baselineConstant:constant,neural,validationRmseImprovement:constant.validation.rmse-neural.validation.rmse,testRmseImprovement:constant.test.rmse-neural.test.rmse,wallMs:performance.now()-start,node:process.version,limitations:['30 games are far too few for credible policy training','Entire games split before training: no row leakage','Validation used for early stopping; test not used for tuning','Predicts Oracle continuation, not optimal continuation','No measured final BP improvement or new policy']};
writeFileSync(output+'.metrics.json',JSON.stringify(result,null,2)+'\n');
writeFileSync(output+'.weights.json',JSON.stringify({architecture:'59-32-1 tanh',normalization:{mu,sd},...weights})+'\n');
console.log(JSON.stringify(result,null,2));
