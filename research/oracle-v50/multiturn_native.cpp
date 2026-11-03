// Oracle v50, stand-alone ORIGINAL nonlinear Balut reward
// Exact INTEGER full 3-roll Bellman for 1-3 FUTURE turns.
// Conditional future event E (sum of FINAL future first roll >=19) may be
// observed by preceding future-turn choices: valid information relaxation.
// No heuristic Q, no truncated action set, no production/main code changed.
#include <bits/stdc++.h>
using namespace std;
using I=__int128_t;
using Hist=array<uint8_t,6>;
const long long D=7776;
int THR[4]={52,65,78,100};
int pi(int c){return c<3?c:c==5?3:-1;}
int bonus(int t){return t<300?-2:t<350?-1:t<400?0:t<450?1:2+(t-450)/50;}
struct State {array<uint8_t,7> k{};array<uint8_t,4> p{};uint8_t st=0,fh=0,ba=0;uint16_t total=0;
 bool operator==(State const&o)const{return k==o.k&&p==o.p&&st==o.st&&fh==o.fh&&ba==o.ba&&total==o.total;}
};
struct Key {State s;int e;bool operator==(Key const& o)const{return s==o.s&&e==o.e;}};
struct Hash {size_t operator()(Key const& k) const {
  uint64_t h=1469598103934665603ULL;auto mix=[&](uint64_t x){h=(h^(x+1))*1099511628211ULL;};
  for(auto x:k.s.k)mix(x);for(auto x:k.s.p)mix(x);mix(k.s.st);mix(k.s.fh);mix(k.s.ba);mix(k.s.total);mix(k.e+1);
  return h;}};
struct Hold {Hist h;vector<pair<int,int>> trans;};
vector<Hist> DICE;map<Hist,int> IDX;vector<int> WEIGHT;vector<Hold> HOLDS;vector<vector<int>> HOLD_IDS;
int SCORE[7][252];array<vector<int>,2> eventIDs;int eventMass[2]={};
int fac(int n){int x=1;for(int i=2;i<=n;i++)x*=i;return x;}
void enumerate(int n,int p,Hist h,vector<Hist>&v){if(p==6){if(!n)v.push_back(h);return;}for(int i=0;i<=n;i++){h[p]=i;enumerate(n-i,p+1,h,v);}}
int score(int c,Hist const&h){int sum=0;for(int i=0;i<6;i++)sum+=(i+1)*h[i];
 if(c<3)return (c+4)*h[c+3];
 if(c==3){bool lo=1,hi=1;for(int j=0;j<5;j++)lo&=(h[j]==1);for(int j=1;j<6;j++)hi&=(h[j]==1);return lo?15:hi?20:0;}
 if(c==4){bool two=0,three=0;for(int x:h){two|=x==2;three|=x==3;}return two&&three?sum:0;}
 if(c==5)return sum;
 for(int x:h)if(x==5)return sum+20;
 return 0;}
State advance(State s,int c,int x){if(!s.k[c])throw runtime_error("CLOSED");s.k[c]--,s.total+=x;int j=pi(c);if(j>=0)s.p[j]=min(THR[j],int(s.p[j])+x);
 if(c==3&&x>0)s.st++;if(c==4&&x>0)s.fh++;if(c==6&&x>0)s.ba++;return s;}
int terminal(State s){int v=bonus(s.total)+2*s.ba+4*(s.st==4)+3*(s.fh==4);
 for(int j=0;j<4;j++)v+=2*(s.p[j]>=THR[j]);return v;}
int remaining(State const&s){int n=0;for(int x:s.k)n+=x;return n;}
void init(){enumerate(5,0,{},DICE);sort(DICE.begin(),DICE.end(),greater<Hist>());if(DICE.size()!=252)throw runtime_error("BAD HIST");
 for(int i=0;i<252;i++){IDX[DICE[i]]=i;int m=fac(5);for(int x:DICE[i])m/=fac(x);WEIGHT.push_back(m);
  int sum=0;for(int j=0;j<6;j++)sum+=(j+1)*DICE[i][j];int e=sum>=19;eventIDs[e].push_back(i);eventMass[e]+=m;
  for(int c=0;c<7;c++)SCORE[c][i]=score(c,DICE[i]);}
 vector<Hist> part;for(int n=0;n<=4;n++)enumerate(n,0,{},part);
 for(auto h:part){Hold a;a.h=h;int n=5-accumulate(h.begin(),h.end(),0);vector<Hist> extra;enumerate(n,0,{},extra);int mass=0;
  for(auto q:extra){int w=fac(n);for(int x:q)w/=fac(x);w*=int(pow(6,5-n));Hist res=h;for(int j=0;j<6;j++)res[j]+=q[j];a.trans.push_back({IDX.at(res),w});mass+=w;}
  if(mass!=D)throw runtime_error("BAD TRANS");HOLDS.push_back(move(a));}
 if(HOLDS.size()!=210)throw runtime_error("BAD HOLDS");
 for(auto d:DICE){vector<int> hs;for(int i=0;i<(int)HOLDS.size();i++){bool good=1;for(int j=0;j<6;j++)if(HOLDS[i].h[j]>d[j])good=0;if(good)hs.push_back(i);}HOLD_IDS.push_back(move(hs));}
 if(eventMass[0]+eventMass[1]!=D)throw runtime_error("BAD EVENTS");}
string outI(I x){if(x==0)return "0";bool neg=x<0;if(neg)x=-x;string y;while(x){y.push_back('0'+x%10);x/=10;}if(neg)y.push_back('-');reverse(y.begin(),y.end());return y;}
struct Solve {unordered_map<Key,I,Hash> cache;unsigned long nodes=0,holdOps=0;long long cap;Solve(long long cap):cap(cap){}
 void roll2(array<I,252>const&stop,array<I,252>&two){array<I,252>one{};
  for(int r=1;r<=2;r++){
   auto const&input=(r==1?stop:one);
   for(int i=0;i<252;i++){
    I best=stop[i]*(r==1?D:D*D);
    for(int hi:HOLD_IDS[i]){I v=0;for(auto [j,w]:HOLDS[hi].trans){v+=(I)w*input[j];holdOps++;}if(v>best)best=v;}
    if(r==1)one[i]=best;else two[i]=best;
   }
  }
 }
 I value(State const&s,int e){int rem=remaining(s);if(rem<1)throw runtime_error("BAD_ZERO");Key key{s,e};auto it=cache.find(key);if(it!=cache.end())return it->second;
  if((long long)cache.size()>=cap)throw runtime_error("EXACT_RESOURCE_LIMIT_NO_FALLBACK");++nodes;
  array<I,252>stop{};
  if(rem==1){int c=-1;for(int k=0;k<7;k++)if(s.k[k])c=k;
   for(int i=0;i<252;i++)stop[i]=terminal(advance(s,c,SCORE[c][i]));
  }else{
   // Cache each category's possible score rather than recompute for 252 histograms.
   array<array<I,51>,7> vec{};array<array<bool,51>,7> seen{};
   for(int i=0;i<252;i++){
    bool first=1;I best=0;
    for(int c=0;c<7;c++)if(s.k[c]){
     int small=SCORE[c][i];if(!seen[c][small]){seen[c][small]=true;vec[c][small]=value(advance(s,c,small),e);}
     I v=vec[c][small];if(first||v>best)best=v,first=0;
    }
    stop[i]=best;
   }
  }
  array<I,252>two{};roll2(stop,two);
  I mass=0;
  if(rem==1 && e>=0)for(int j:eventIDs[e])mass+=(I)WEIGHT[j]*two[j];
  else for(int j=0;j<252;j++)mass+=(I)WEIGHT[j]*two[j];
  if(e<0 || rem>1){ // numerator expected after full future turn
   // If rem>1 and e>=0, the event applies only to last future turn.
  }
  cache.emplace(key,mass);return mass;
 }
};
int main(int argc,char** argv){try{
 if(argc!=2 || (string(argv[1])!="3" && string(argv[1])!="4")){cerr<<"USAGE: multiturn_native 3|4\n";return 2;}
 int n=atoi(argv[1]);init();State s{};
 // full and legal 4-column historical board, bonus-active.
 int sum[7]={44,55,84,70,82,82,0};int filled[7]={3,3,4,4,4,3,4};
 if(n==4){sum[2]=60;filled[2]=3;}
 for(int c=0;c<7;c++)s.k[c]=4-filled[c],s.total+=sum[c];
 for(int c:{0,1,2,5})s.p[pi(c)]=min((int)THR[pi(c)],sum[c]);
 s.st=4,s.fh=4,s.ba=0;
 Hist d{};if(n==3){d[3]=3;d[4]=2;}else{d[3]=2;d[4]=2;d[5]=1;}
 int i=IDX.at(d);
 Solve solver(300000);
 auto start=chrono::steady_clock::now();
 cout<<"{\"horizon\":"<<n<<",\"event_mass\":["<<eventMass[0]<<","<<eventMass[1]<<"],\"actions\":{";
 bool first=true;
 for(int c=0;c<7;c++)if(s.k[c]){
  State next=advance(s,c,SCORE[c][i]);I orig=solver.value(next,-1);I ce0=solver.value(next,0);I ce1=solver.value(next,1);
  if(!first)cout<<",";first=false;
  cout<<"\""<<c<<"\":{\"score\":"<<SCORE[c][i]<<",\"original_num\":\""<<outI(orig)<<"\",\"conditional_num\":[\""<<outI(ce0)<<"\",\""<<outI(ce1)<<"\"]}";
 }
 cout<<"},\"memo_states\":"<<solver.cache.size()<<",\"nodes\":"<<solver.nodes<<",\"hold_operations\":"<<solver.holdOps<<",\"seconds\":"<<chrono::duration<double>(chrono::steady_clock::now()-start).count()<<"}\n";
 }catch(exception const&ex){cerr<<"ERROR: "<<ex.what()<<"\n";return 3;}}