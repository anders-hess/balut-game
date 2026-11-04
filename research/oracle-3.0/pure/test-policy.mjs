// End-to-end clean policy smoke: exact endgame decision, learned endgame
// decision, and REQUIRED early-horizon refusal instead of a legacy fallback.
import assert from 'node:assert/strict';
import {CATEGORIES,initialScorecard,applyScore} from '../phase1/simulator.mjs';
import {exactAtRoll,actionRegret} from '../oracle2/adapter.mjs';
import {loadPureModel,pureOptimalPolicy} from './policy.mjs';
let card=initialScorecard();
for(const category of CATEGORIES)for(let i=0;i<4;i++){
 if(category==='fives'&&i===3)continue;
 card=applyScore(card,category,[5,5,5,6,6]).card;
}
const root={card,dice:[5,5,3,4,6],rollsRemaining:1};
const expected=exactAtRoll(root,{cap:250000,timeoutMs:12000});
assert.equal(expected.status,'EXACT_FLOAT64');
const teacher=pureOptimalPolicy({mode:'numeric-exact'});
const action=teacher.policy(root);
assert.ok(actionRegret(expected,action,root.dice).regretBP<1e-8);
assert.equal(teacher.telemetry.exactDecisions,1);
const trained=loadPureModel(process.argv[2]??'oracle3-math-pure');
const student=pureOptimalPolicy({mode:'learned',trained});
const chosen=student.policy(root);
assert.ok(actionRegret(expected,chosen,root.dice).regretBP<1e-8,'single remaining turn must be exact within-turn');
const initial={card:initialScorecard(),dice:[1,2,3,4,5],rollsRemaining:2};
assert.throws(()=>teacher.policy(initial),/UNSUPPORTED_HORIZON_MATH_Q_TEACHER_NEEDED/);
assert.throws(()=>student.policy(initial),/UNSUPPORTED_HORIZON_MATH_Q_TEACHER_NEEDED/);
assert.equal(teacher.telemetry.unsupportedHorizon,1);
assert.equal(student.telemetry.unsupportedHorizon,1);
console.log('ORACLE3_PURE_POLICY_TEST='+JSON.stringify({
 status:'PASS',oneTurnTeacherExact:true,oneTurnLearnerExact:true,
 earlyHorizonRefusesExtrapolation:true,productionFallbacks:0,
 selectedUsingValidationOnly:trained.selected
}));
