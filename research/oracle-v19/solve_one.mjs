// Run under an external per-process timeout. Exact results only on successful completion.
// Relative imports assume the standalone V18 research code bundled in the ZIP.
import {readFileSync} from 'node:fs';
import {ExactSolverV18} from '../src/exact_score_root_v18.mjs';
import {FittedAdaptiveOracleV6} from '../src/fitted_adaptive_v6.mjs';
const {cases}=JSON.parse(readFileSync(new URL('./locked_cases.json',import.meta.url),'utf8'));
const id=process.argv[2],r=Number(process.argv[3]??0);
const item=cases.find(x=>x.id===id);if(!item)throw Error('Invalid id');
const guide=new FittedAdaptiveOracleV6({lookaheadTurns:0,maxTurnCache:150,maxTailCache:200});
const provisional=guide.recommend(item.card,item.dice,r);
const solver=new ExactSolverV18({maxStates:Number(process.env.EXACT_MAX_STATES??380000),maxScoreEvaluations:20000000});
const start=performance.now();let exact=null,error=null;
try{exact=solver.recommend(item.card,item.dice,r)}catch(e){error={name:e.name,message:e.message};}
const winner=exact?.actions[0],pred=provisional.actions[0];
const found=exact?.actions.find(a=>a.type===pred.type&&(a.type==='score'?a.category===pred.category:a.holdCounts.join(',')===pred.holdCounts.join(',')));
console.log(JSON.stringify({id,r,elapsedMs:+(performance.now()-start).toFixed(1),exact:!!exact,error,states:solver.stats.states,guideTop:{type:pred.type,category:pred.category,holdCounts:pred.holdCounts},exactTop:winner?{type:winner.type,category:winner.category,holdCounts:winner.holdCounts,value:winner.expectedFinalBigPoints}:null,regret:winner?+(winner.expectedFinalBigPoints-found.expectedFinalBigPoints).toFixed(10):null,allActions:exact?.actions.length}));
