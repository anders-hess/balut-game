// Research-only Oracle 2.0 + 3.0 hybrid: delegate solvable late turns to exact Bellman.
// No production edits, and no false exactness if the C++ solver times out or hits its cap.
import {CATEGORIES} from '../phase1/simulator.mjs';
import {cachedPolicy} from '../phase1/cached-oracle.mjs';
import {exactAtRoll,exactBestLegal,encodeCard} from './adapter.mjs';

export function makeOracle2Hybrid({exactHorizon=2,cap=250000,timeoutMs=20000,stats}={}){
 if(!Number.isInteger(exactHorizon)||exactHorizon<1||exactHorizon>7)throw Error('bad horizon');
 const telemetry=stats??{exactDecisions:0,estimatedDecisions:0,resourceFallbacks:0,exactWallMs:0,dpStates:0};
 const policy=({card,dice,rollsRemaining})=>{
  const remaining=encodeCard(card).remaining;
  if(remaining>exactHorizon){telemetry.estimatedDecisions++;return cachedPolicy({card,dice,rollsRemaining});}
  const exact=exactAtRoll({card,dice,rollsRemaining},{cap,timeoutMs});
  telemetry.exactWallMs+=exact.wallMs;
  if(exact.status!=='EXACT_FLOAT64'){
   telemetry.resourceFallbacks++;
   telemetry.estimatedDecisions++;
   return cachedPolicy({card,dice,rollsRemaining});
  }
  telemetry.dpStates+=exact.states;
  telemetry.exactDecisions++;
  const best=exactBestLegal(exact,{card,dice,rollsRemaining});
  return best.type==='score'?{type:'score',category:best.category}:{type:'hold',held:best.held};
 };
 return {policy,telemetry};
}
