import assert from 'node:assert/strict';
import {DIST} from '../../../src/logic/oracle/probabilities.js';
import {initialScorecard,applyScore,totals,score,CATEGORIES} from '../phase1/simulator.mjs';
import {chooseExpectimax,loadNeuralValue} from './expectimax.mjs';

// Distribution normalization: exact multinomial chance weights.
for(let n=0;n<=5;n++)assert.ok(Math.abs(DIST[n].reduce((s,x)=>s+x.prob,0)-1)<1e-12);
const card=initialScorecard(),dice=[1,2,3,4,5];
// With zero rolls, expectimax must choose the best immediate terminal Q.
const zero=chooseExpectimax({card,dice,rollsRemaining:0},()=>0);
const brute=CATEGORIES.map(c=>({category:c,q:totals(applyScore(card,c,dice).card).big})).sort((a,b)=>b.q-a.q)[0];
assert.equal(zero.action.type,'score');assert.equal(zero.action.category,brute.category);
assert.equal(zero.q,brute.q);
// Terminal case: neural continuation must never be evaluated on a completed game.
let almost=initialScorecard();for(const c of CATEGORIES){for(let i=0;i<4;i++){
 if(c==='balut'&&i===3)continue;
 almost=applyScore(almost,c,[1,1,1,1,1]).card;
}}
let called=0;
const terminal=chooseExpectimax({card:almost,dice:[6,6,6,6,6],rollsRemaining:2},()=>{called++;throw Error('terminal value must be zero');});
assert.equal(called,0);assert.ok(Number.isFinite(terminal.q));
assert.ok(terminal.diagnostics.lastTurn);
// All actions must be legal for each reroll budget; no mutation of scorecard.
const original=JSON.stringify(card);
for(const left of [0,1,2]){
 const r=chooseExpectimax({card,dice,rollsRemaining:left},()=>0);
 assert.ok(Number.isFinite(r.q));
 if(r.action.type==='hold'){assert.ok(left>0);assert.ok(r.action.held.length<5);}
 else assert.ok(CATEGORIES.includes(r.action.category));
}
assert.equal(JSON.stringify(card),original);
console.log(JSON.stringify({status:'pass',tests:'distribution, zero-roll terminal Q, last-turn boundary, action legality, purity',node:process.version}));
