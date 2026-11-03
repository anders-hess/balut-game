import test from 'node:test';
import assert from 'node:assert/strict';
import {C,small,compress,advance,terminal,bonus,histograms,dice} from './oracle_v41.mjs';
function raw(c){let b=bonus(c.flat().reduce((s,v)=>s+(v??0),0));for(let i=0;i<7;i++){
const a=c[i],sum=a.reduce((s,v)=>s+(v??0),0),valid=a.filter(v=>v>0).length;
if(i<3)b+=sum>=[52,65,78][i]?2:0;
if(i===3)b+=valid===4?4:0;
if(i===4)b+=valid===4?3:0;
if(i===5)b+=sum>=100?2:0;
if(i===6)b+=2*valid;
}return b;}
function card(){return Array.from({length:7},()=>[null,null,null,null])}
function insert(c,i,x){const j=c[i].findIndex(v=>v===null);if(j<0)throw Error('full');c[i][j]=x}
test('all 252 first-roll histograms, correct straight scoring',()=>{
const h=histograms();assert.equal(h.length,252);
assert.equal(small(3,[1,2,3,4,5]),15);
assert.equal(small(3,[2,3,4,5,6]),20);
assert.equal(small(3,[1,1,3,4,5]),null);
});
test('10k independent terminal scorecards match quotient reward',()=>{
let seed=1234567;const rnd=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed};
for(let t=0;t<10000;t++){const c=card();for(let i=0;i<7;i++)
for(let j=0;j<4;j++){let v;if(i===3)v=[0,15,20][rnd()%3];
else if(i===4)v=[0,20,21,22,23,24,25,26,27,28,29,30][rnd()%12];
else if(i===6)v=[0,25,30,35,40,45,50][rnd()%7];
else v=i===0?4*(rnd()%6):i===1?5*(rnd()%6):i===2?6*(rnd()%6):5+(rnd()%26);
insert(c,i,v)}
assert.equal(terminal(compress(c)),raw(c));}
});
test('two 20-turn boards, every 252 dice outcomes and every open category preserve exact compressed transition',()=>{
const hs=histograms();let compared=0;
for(let variant=0;variant<2;variant++){
const c=card();const rows=variant===0?[0,1,2,3,4,5,6,0]:[5,5,3,4,0,1,2,6];
for(let j=0;j<8;j++){const i=rows[j],d=dice(hs[(j*31+variant*37)%252]);insert(c,i,small(i,d)??0)}
const z=compress(c);assert.equal(z.k.reduce((a,b)=>a+b,0),20);
for(const h of hs)for(let i=0;i<7;i++)if(z.k[i]>0){
const s=small(i,dice(h))??0;
const cc=c.map(a=>[...a]);insert(cc,i,s);
assert.deepEqual(advance(z,i,s),compress(cc));compared++;
}}
assert.equal(compared,2*252*7);
});
