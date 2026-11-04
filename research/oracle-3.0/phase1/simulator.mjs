// Oracle 3.0 phase 1: seeded, headless, self-contained simulation.
// Scoring and column placement follow main/src/logic/scoring.js.
// NOT the production Oracle 1.0 policy.
import { performance } from 'node:perf_hooks';
import { pathToFileURL } from 'node:url';
export const CATEGORIES=['fours','fives','sixes','straight','fullHouse','choice','balut'];
export const initialScorecard=()=>Object.fromEntries(CATEGORIES.map(c=>[c,[null,null,null,null]]));
export function rng(seed){let x=seed>>>0;return ()=>{x=(x+0x6D2B79F5)>>>0;let t=Math.imul(x^(x>>>15),1|x);t^=t+Math.imul(t^(t>>>7),61|t);return ((t^(t>>>14))>>>0)/4294967296;};}
export const roll=(rand,n=5)=>Array.from({length:n},()=>1+Math.floor(rand()*6));
export function score(category,dice){const sum=dice.reduce((a,b)=>a+b,0),counts=Array.from({length:7},(_,i)=>dice.filter(x=>x===i).length);
 switch(category){case 'fours':return counts[4]*4;case 'fives':return counts[5]*5;case 'sixes':return counts[6]*6;case 'choice':return sum;
 case 'straight':{const s=[...new Set(dice)].sort().join('');return s==='12345'?15:s==='23456'?20:0;}
 case 'fullHouse':return counts.includes(3)&&counts.includes(2)?sum:0;
 case 'balut':return counts.includes(5)?sum+20:0;
 default:throw Error('bad category');}}
export function targetColumn(card,category,value){const arr=card[category];const high=(category==='fours'&&value>=16)||(category==='fives'&&value>=20)||(category==='sixes'&&value>=24)||(category==='straight'&&value===20);if(high){for(let i=3;i>=0;i--)if(arr[i]===null)return i;}return arr.indexOf(null);}
export function applyScore(card,category,dice){const value=score(category,dice),col=targetColumn(card,category,value);if(col<0)throw Error('category full');const next=Object.fromEntries(CATEGORIES.map(c=>[c,[...card[c]]]));next[category][col]=value;return {card:next,value,column:col};}
export function totals(card){let small=0,big=0;const rules={fours:[52,2],fives:[65,2],sixes:[78,2],choice:[100,2]};for(const c of CATEGORIES){const a=card[c];small+=a.reduce((x,v)=>x+(v??0),0);if(rules[c]){const [threshold,pts]=rules[c];if(a.reduce((x,v)=>x+(v??0),0)>=threshold)big+=pts;}else if(c==='straight'){if(a.filter(v=>v!==null&&v>0).length===4)big+=4;}else if(c==='fullHouse'){if(a.filter(v=>v!==null&&v>0).length===4)big+=3;}else if(c==='balut')big+=a.filter(v=>v!==null&&v>0).length*2;}
 const bonus=small>=450?2+Math.floor((small-450)/50):small>=400?1:small>=350?0:small>=300?-1:-2;return {small,big:big+bonus,bonus};}
export function uniqueHolds(dice){const seen=new Set(),out=[];for(let mask=0;mask<32;mask++){const held=dice.filter((_,i)=>mask&(1<<i)).sort((a,b)=>a-b);const k=held.join(',');if(!seen.has(k)){seen.add(k);out.push(held);}}return out;}
export function play(seed,policy){const random=rng(seed);let card=initialScorecard(),decisions=0;for(let turn=0;turn<28;turn++){let dice=roll(random),left=2;while(true){const a=policy({card,dice,rollsRemaining:left,turn});decisions++;if(a.type==='score'){card=applyScore(card,a.category,dice).card;break;}if(a.type!=='hold'||left===0)throw Error('illegal action');const valid=uniqueHolds(dice).some(h=>h.join(',')===[...a.held].sort((x,y)=>x-y).join(','));if(!valid||a.held.length===5)throw Error('illegal hold');dice=[...a.held,...roll(random,5-a.held.length)];left--;}}return {...totals(card),decisions,card};}
export function greedyPolicy({card,dice,rollsRemaining}){const legal=CATEGORIES.filter(c=>card[c].includes(null));let best=legal[0],max=-Infinity;for(const c of legal){const val=score(c,dice);if(val>max){max=val;best=c;}}if(rollsRemaining>0&&max<15){const held=dice.filter(x=>x>=5);if(held.length<5)return {type:'hold',held};}return {type:'score',category:best};}
export function benchmark(n=1000,seed=1000){const t=performance.now(),vals=[],bonuses={};let totalDecisions=0;for(let i=0;i<n;i++){const x=play((seed+i)>>>0,greedyPolicy);vals.push(x.big);totalDecisions+=x.decisions;bonuses[x.bonus]=(bonuses[x.bonus]||0)+1;}const mean=vals.reduce((a,b)=>a+b,0)/n;const variance=vals.reduce((a,b)=>a+(b-mean)**2,0)/(n-1);return {model:'greedy_smoke_NOT_Oracle_1.0',seed,n,meanBigPoints:mean,sd:Math.sqrt(variance),ci95:[mean-1.96*Math.sqrt(variance/n),mean+1.96*Math.sqrt(variance/n)],bonuses,totalDecisions,wallMs:performance.now()-t,node:process.version};}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){console.log(JSON.stringify(benchmark(Number(process.argv[2]||1000),Number(process.argv[3]||1000)),null,2));}
