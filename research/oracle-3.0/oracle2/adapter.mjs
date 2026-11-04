// Research-only bridge: Oracle 3.0 scorecards/actions to Oracle 2.0 v46 exact Bellman.
// Exactness is Float64 within the solver state/resource cap; errors are NEVER silently exact.
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {performance} from 'node:perf_hooks';
import {CATEGORIES,score,uniqueHolds} from '../phase1/simulator.mjs';

export const BINARY_ROLL='research/oracle-3.0/oracle2/oracle2-roll';
export const BINARY_STATE='research/oracle-3.0/oracle2/oracle2-state';
export const ORACLE2_SOURCE_BLOB='4ce623ed663edffc4b1c9291f975aba778622227';

export function encodeCard(card){
 assert.ok(card&&typeof card==='object');
 const k=[],p=[],sum=[],positives=[];
 for(const c of CATEGORIES){
  assert.ok(Array.isArray(card[c])&&card[c].length===4,'four cells per category: '+c);
  for(const v of card[c])assert.ok(v===null||(Number.isInteger(v)&&v>=0&&v<=50),'invalid cell: '+c);
  k.push(card[c].filter(v=>v===null).length);
  sum.push(card[c].reduce((s,v)=>s+(v??0),0));
  positives.push(card[c].filter(v=>v!==null&&v>0).length);
 }
 for(const ix of [0,1,2,5])p.push(sum[ix]);
 return {k,p,st:positives[3],fh:positives[4],ba:positives[6],
  total:sum.reduce((a,b)=>a+b,0),remaining:k.reduce((a,b)=>a+b,0)};
}
export function encodeArgs(card){
 const s=encodeCard(card);
 return [...s.k,...s.p,s.st,s.fh,s.ba,s.total].map(String);
}
function invoke(binary,args,{cap=150000,timeoutMs=20000}={}){
 assert.ok(Number.isSafeInteger(cap)&&cap>0);
 assert.ok(Number.isSafeInteger(timeoutMs)&&timeoutMs>=100);
 const started=performance.now();
 const child=spawnSync(binary,[...args,String(cap)],{encoding:'utf8',timeout:timeoutMs,maxBuffer:8*1024*1024});
 const wallMs=performance.now()-started;
 if(child.error||child.status!==0)return {
  status:'RESOURCE_LIMIT_OR_ERROR',reason:child.error?.code??'exit_'+child.status,
  stderr:(child.stderr??'').trim().slice(0,500),wallMs,binary
 };
 let out;try{out=JSON.parse(child.stdout);}catch(e){
  return {status:'MALFORMED_OUTPUT',reason:String(e),wallMs,binary};
 }
 assert.equal(out.status,'EXACT_FLOAT64');
 assert.ok(Number.isFinite(out.value),'non-finite Bellman value');
 return {...out,wallMs};
}
export function exactAtBoundary(card,opts={}){
 const out=invoke(opts.binary??BINARY_STATE,encodeArgs(card),opts);
 if(out.status==='EXACT_FLOAT64')assert.equal(out.remaining,encodeCard(card).remaining);
 return out;
}
export function exactAtRoll({card,dice,rollsRemaining},opts={}){
 assert.ok(Array.isArray(dice)&&dice.length===5&&dice.every(d=>Number.isInteger(d)&&d>=1&&d<=6));
 assert.ok(Number.isInteger(rollsRemaining)&&rollsRemaining>=0&&rollsRemaining<=2);
 const args=[...encodeArgs(card),...dice.map(String),String(rollsRemaining)];
 const out=invoke(opts.binary??BINARY_ROLL,args,opts);
 if(out.status==='EXACT_FLOAT64'){
  assert.equal(out.remaining,encodeCard(card).remaining);
  assert.ok(out.actions&&typeof out.actions==='object');
  for(const [k,q] of Object.entries(out.actions))assert.ok(Number.isFinite(q),k);
 }
 return out;
}
export function actionKey(action,dice){
 if(action.type==='score'){
  assert.ok(CATEGORIES.includes(action.category));
  return 'score:'+CATEGORIES.indexOf(action.category)+':'+score(action.category,dice);
 }
 if(action.type==='hold'){
  assert.ok(Array.isArray(action.held));
  const h=Array.from({length:6},(_,i)=>action.held.filter(d=>d===i+1).length);
  assert.ok(h.reduce((a,b)=>a+b,0)<5,'must reroll at least one die');
  const available=Array.from({length:6},(_,i)=>dice.filter(d=>d===i+1).length);
  assert.ok(h.every((v,i)=>v<=available[i]),'held dice unavailable');
  return 'hold:'+h.join('');
 }
 throw Error('unexpected action '+JSON.stringify(action));
}
export function actionRegret(reference,action,dice,tolerance=1e-8){
 assert.equal(reference.status,'EXACT_FLOAT64');
 const key=actionKey(action,dice),q=reference.actions[key];
 assert.ok(Number.isFinite(q),'missing Q for '+key);
 const raw=reference.value-q;
 assert.ok(raw>=-tolerance,'negative regret indicates parity error: '+raw);
 return {key,q,regretBP:Math.max(0,raw)};
}
export function exactBestLegal(reference,{card,dice,rollsRemaining}){
 assert.equal(reference.status,'EXACT_FLOAT64');
 const actions=[];
 for(const c of CATEGORIES)if(card[c].includes(null))actions.push({type:'score',category:c});
 if(rollsRemaining>0)for(const held of uniqueHolds(dice))
  if(held.length<5)actions.push({type:'hold',held});
 let best=null,bestQ=-Infinity;
 for(const action of actions){
  const key=actionKey(action,dice),q=reference.actions[key];
  assert.ok(Number.isFinite(q),'missing reference action '+key);
  if(q>bestQ+1e-10){best={...action,q,key};bestQ=q;}
 }
 assert.ok(best,'empty exact action set');
 assert.ok(Math.abs(reference.value-bestQ)<1e-7,'mismatch in legal action space: '+(reference.value-bestQ));
 return best;
}
