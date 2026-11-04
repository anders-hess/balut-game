// Independent, immutable post-hoc audit of iteration22 mathematical Q certificates.
// This script DOES NOT train, select, or tune any model on the locked test set.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
const input=process.argv[2]??'reference/oracle3-rational-multicard-fidelity.json';
const {report,results}=JSON.parse(readFileSync(input,'utf8'));
assert.equal(report.nIndependentMathematicallyReachableScorecards,48);
assert.equal(report.nExactRationalRootDecisions,96);
assert.equal(report.nCertifiedLegalActionQ,2168);
assert.equal(results.length,48);
const rows=[],seen=new Set();
let actionCount=0,nonzero=0,optimalMismatch=0;
for(const g of results){
 assert.ok(!seen.has(g.seed),'duplicate scorecard seed');seen.add(g.seed);
 assert.equal(g.witness.length,26);
 assert.equal(g.roots.length,2);
 for(const r of g.roots){
  const p=r.rootProof,den=BigInt(p.denominator),opt=BigInt(p.exactOptimalNumerator);
  const q=p.allActionQ,keys=Object.keys(q);
  actionCount+=keys.length;
  const exactBest=keys.filter(k=>BigInt(q[k].numerator)===opt).sort();
  assert.deepEqual([...p.bestActionKeys].sort(),exactBest,'teacher optimum inconsistent with Q');
  assert.ok(exactBest.length>0);
  const sorted=[...new Set(keys.map(k=>BigInt(q[k].numerator).toString()))].map(BigInt).sort((a,b)=>a>b?-1:a<b?1:0);
  const margin=sorted.length>1?Number(opt-sorted[1])/Number(den):0;
  if(margin>0)nonzero++;
  const dec=r.mathStudents;
  for(const name of ['myopic','stage','linear','neural']){
   const d=dec[name],val=q[d.key];
   assert.ok(val,'student chose illegal action '+name);
   const loss=opt-BigInt(val.numerator);
   assert.ok(loss>=0n);
   assert.equal(d.optimal,loss===0n);
   assert.ok(Math.abs(d.regretBP-Number(loss)/Number(den))<1e-12);
  }
  if(dec.neural.optimal!==dec.myopic.optimal)optimalMismatch++;
  rows.push({seed:g.seed,rerolls:r.rerollsRemaining,margin,spread:r.regretSpanBP,
   neural:dec.neural.regretBP,myopic:dec.myopic.regretBP,
   neuralOptimal:dec.neural.optimal,myopicOptimal:dec.myopic.optimal,
   neuralAction:dec.neural.key,myopicAction:dec.myopic.key,
   bestActions:exactBest.length,neuralScore:dec.neural.action.type==='score',
   myopicScore:dec.myopic.action.type==='score'});
 }
}
assert.equal(actionCount,2168);
assert.equal(nonzero,90);
const mean=x=>x.length?x.reduce((a,b)=>a+b,0)/x.length:null;
const summarize=rs=>({n:rs.length,independentScorecards:new Set(rs.map(r=>r.seed)).size,
 neuralOptimal:rs.filter(r=>r.neuralOptimal).length,myopicOptimal:rs.filter(r=>r.myopicOptimal).length,
 neuralMeanRegret:mean(rs.map(r=>r.neural)),myopicMeanRegret:mean(rs.map(r=>r.myopic)),
 pairedMeanNeuralMinusMyopic:mean(rs.map(r=>r.neural-r.myopic)),
 neuralWins:rs.filter(r=>r.neural<r.myopic-1e-12).length,
 myopicWins:rs.filter(r=>r.myopic<r.neural-1e-12).length,
 ties:rs.filter(r=>Math.abs(r.neural-r.myopic)<=1e-12).length});
const group=(label,fn)=>({label,...summarize(rows.filter(fn))});
const strata=[
 group('all',()=>true),
 group('one-reroll',r=>r.rerolls===1),
 group('two-rerolls',r=>r.rerolls===2),
 group('small-positive-Q-margin',r=>r.margin>0&&r.margin<=0.05),
 group('large-positive-Q-margin',r=>r.margin>0.05),
 group('all-actions-tied',r=>r.margin===0),
 group('neural-scores',r=>r.neuralScore),
 group('neural-holds',r=>!r.neuralScore),
 group('neural-disagrees-myopic',r=>r.neuralAction!==r.myopicAction)
];
const errors=rows.filter(r=>!r.neuralOptimal).sort((a,b)=>b.neural-a.neural);
assert.equal(errors.length,14,'frozen neural exact-Q errors unexpectedly changed');
assert.equal(rows.filter(r=>r.neuralOptimal).length,82);
assert.equal(rows.filter(r=>r.myopicOptimal).length,80);
const pairedByCard=results.map(g=>mean(rows.filter(r=>r.seed===g.seed).map(r=>r.neural-r.myopic)));
let state=0x7283a981;
const random=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;};
const draws=[];
for(let b=0;b<10000;b++){let sum=0;for(let j=0;j<48;j++)sum+=pairedByCard[Math.floor(random()*48)];draws.push(sum/48);}
draws.sort((a,b)=>a-b);
const output={
 status:'POST_HOC_FROZEN_EXACT_Q_ERROR_AUDIT',
 sourceRun:'https://github.com/anders-hess/balut-game/actions/runs/41915546340',
 trainingPerformed:false,modelSelectionPerformed:false,lockedTestUsedOnlyForDiagnosis:true,
 scorecards:seen.size,roots:rows.length,allLegalActionQ:actionCount,
 nonzeroActionSpreadRoots:nonzero,neuralVsMyopicOptimalityDiscordance:optimalMismatch,
 strata,topNeuralErrors:errors.slice(0,14),
 pairedScorecardClusterBootstrapCI95:[draws[249],draws[9749]],
 caveats:['Exploratory post-hoc strata: not confirmatory significance tests; do not tune on these 48 locked scorecards',
 'Source test states are intentionally constructed, not natural full-game distribution',
 'All optimality statements conditional on exact two-turn mathematical game model; no 28-turn proof']};
writeFileSync('oracle3-q-regret-diagnostics.json',JSON.stringify(output,null,2)+'\n');
console.log('ORACLE3_Q_REGRET_DIAGNOSTICS='+JSON.stringify({status:output.status,strata,ci95:output.pairedScorecardClusterBootstrapCI95,errors:errors.length}));
