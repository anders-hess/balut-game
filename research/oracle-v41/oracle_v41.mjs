// Oracle v41: exact terminal-reward-preserving quotient state (research only).
// Node 20+, no dependencies. Run: node --test oracle_v41.test.mjs
export const C=['fours','fives','sixes','straight','fullHouse','choice','balut'];
export const T=[52,65,78,null,null,100,null];
export const P=[2,2,2,4,3,2,2];
export function bonus(x){return x<300?-2:x<350?-1:x<400?0:x<450?1:2+Math.floor((x-450)/50)}
export function small(c,d){
 const n=Array(7).fill(0);for(const v of d)n[v]++;
 const sum=d.reduce((a,b)=>a+b,0);
 if(c<3)return (c+4)*n[c+4];
 if(c===3)return n.slice(1).every((v,i)=>v===(i===0||i===5?0:1))?20:
    n.slice(1).every((v,i)=>v===(i===5?0:1))?15:null;
 if(c===4)return n.includes(3)&&n.includes(2)?sum:null;
 if(c===5)return sum;
 return n.includes(5)?sum+20:null;
}
export function compress(card){
 const k=[],h=[],v=[];let total=0,baluts=0;
 for(let c=0;c<7;c++){
  const a=card[c], filled=a.filter(x=>x!==null);
  k.push(4-filled.length);
  const s=filled.reduce((x,y)=>x+y,0);total+=s;
  h.push(T[c]===null?0:Math.min(T[c],s));
  v.push(c===3||c===4?filled.filter(x=>x>0).length:0);
  if(c===6)baluts=filled.filter(x=>x>0).length;
 }
 return {k,h,v,baluts,total};
}
export function terminal(z){
 if(z.k.some(x=>x!==0))throw Error('nonterminal');
 let bp=bonus(z.total)+2*z.baluts;
 for(const c of [0,1,2,5])bp+=z.h[c]>=T[c]?2:0;
 bp+=z.v[3]===4?4:0;
 bp+=z.v[4]===4?3:0;
 return bp;
}
export function advance(z,c,score){
 if(z.k[c]<=0)throw Error('closed');
 const y={k:[...z.k],h:[...z.h],v:[...z.v],baluts:z.baluts,total:z.total};
 y.k[c]--;y.total+=score;
 if(T[c]!==null)y.h[c]=Math.min(T[c],y.h[c]+score);
 if(c===3||c===4)y.v[c]+=Number(score>0);
 if(c===6)y.baluts+=Number(score>0);
 return y;
}
export function score(card){
 const z=compress(card);if(z.k.some(x=>x!==0))throw Error('nonterminal');
 return terminal(z);
}
export function histograms(){
 const out=[];function walk(i,left,a){if(i===5){out.push([...a,left]);return}
 for(let n=0;n<=left;n++)walk(i+1,left-n,[...a,n]);}
 walk(0,5,[]);return out;
}
export function dice(h){return h.flatMap((n,i)=>Array(n).fill(i+1))}
