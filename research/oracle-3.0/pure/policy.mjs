// Clean research-only Oracle 3.0 policy: Oracle 2.0 exact Bellman on
// solvable endgames, optional learned math continuation for diagnostics.
// NO legacy advisor, no hidden fallback, and NO untrained early-horizon guesses.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {encodeCard,exactAtRoll,exactBestLegal} from '../oracle2/adapter.mjs';
import {readSupervisedModel,predictContinuation} from '../oracle2/model.mjs';
import {exactWithinTurn} from './chance.mjs';

export function loadPureModel(prefix='oracle3-math-pure'){
 const model=readSupervisedModel(prefix+'.weights.json');
 const frozen=JSON.parse(readFileSync(prefix+'.frozen-selection.json','utf8'));
 assert.equal(frozen.status,'FROZEN_BEFORE_TEST');
 assert.ok(['myopic','stage','linear','neural'].includes(frozen.selected));
 return {model,selected:frozen.selected};
}
export function pureOptimalPolicy({mode='numeric-exact',trained=null,cap=250000,timeoutMs=12000}={}){
 assert.ok(['numeric-exact','learned'].includes(mode));
 if(mode==='learned')assert.ok(trained);
 const telemetry={exactDecisions:0,learnedDecisions:0,unsupportedHorizon:0};
 const policy=root=>{
  const remaining=encodeCard(root.card).remaining;
  if(remaining>3){
   telemetry.unsupportedHorizon++;
   throw Error('UNSUPPORTED_HORIZON_MATH_Q_TEACHER_NEEDED: '+remaining+
    '; do not silently use any production fallback or extrapolate last-3-turn student');
  }
  if(remaining<1)throw Error('scorecard already complete');
  if(mode==='numeric-exact'){
   const ref=exactAtRoll(root,{cap,timeoutMs});
   if(ref.status!=='EXACT_FLOAT64')
    throw Error('EXACT_MATHEMATICAL_REFERENCE_UNAVAILABLE: '+JSON.stringify(ref));
   telemetry.exactDecisions++;
   const best=exactBestLegal(ref,root);
   return best.type==='score'?{type:'score',category:best.category}:{type:'hold',held:best.held};
  }
  const fn=trained.selected==='myopic'?()=>0:
   after=>predictContinuation(after,trained.model,trained.selected);
  const out=exactWithinTurn(root,fn);
  telemetry.learnedDecisions++;
  return out.action;
 };
 return {policy,telemetry};
}
