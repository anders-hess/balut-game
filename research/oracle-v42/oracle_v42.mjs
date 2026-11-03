// Oracle v42: corrected exact scoring + exhaustive differential audit.
// Research only. Does not certify early root actions.
export const C=['fours','fives','sixes','straight','fullHouse','choice','balut'];
export const T=[52,65,78,null,null,100,null];
export function small(c,d){
 if(d.length!==5||d.some(x=>!Number.isInteger(x)||x<1||x>6))throw Error('invalid dice');
 const n=Array(7).fill(0);for(const x of d)n[x]++;
 const sum=d.reduce((a,b)=>a+b,0);
 if(c>=0&&c<3)return (c+4)*n[c+4];
 if(c===3){
  const low=[1,2,3,4,5].every(x=>n[x]===1);
  const high=[2,3,4,5,6].every(x=>n[x]===1);
  return low?15:high?20:null;
 }
 if(c===4)return n.some(x=>x===3)&&n.some(x=>x===2)?sum:null;
 if(c===5)return sum;
 if(c===6)return n.some(x=>x===5)?sum+20:null;
 throw Error('invalid category');
}
export function bonus(x){return x<300?-2:x<350?-1:x<400?0:x<450?1:2+Math.floor((x-450)/50)}
export function compress(card){
 const k=[],h=[],v=[];let total=0,baluts=0;
 for(let c=0;c<7;c++){
  const filled=card[c].filter(x=>x!==null);
  if(card[c].length!==4)throw Error('invalid card');
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
 bp+=z.v[3]===4?4:0;bp+=z.v[4]===4?3:0;
 return bp;
}
export function advance(z,c,s){
 if(z.k[c]<=0)throw Error('closed');
 const y={k:[...z.k],h:[...z.h],v:[...z.v],baluts:z.baluts,total:z.total};
 y.k[c]--;y.total+=s;
 if(T[c]!==null)y.h[c]=Math.min(T[c],y.h[c]+s);
 if(c===3||c===4)y.v[c]+=Number(s>0);
 if(c===6)y.baluts+=Number(s>0);
 return y;
}
export function histograms(){
 const out=[];function rec(a,start){if(a.length===5){out.push(a);return}for(let d=start;d<=6;d++)rec([...a,d],d)}rec([],1);return out;
}
