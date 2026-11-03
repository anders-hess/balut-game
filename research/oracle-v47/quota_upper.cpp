// Oracle v47: reconstruct ADR-026 seven-category quota-constrained additive
// upper Bellman, with integer outward rounding (one micro Big Point unit).
// Exactly optimizes the optimistic *additive surrogate*, NOT original Big Points.
// Research only: full 28-turn original optimal action remains unproven.
#include <bits/stdc++.h>
using namespace std;
using i64=long long;
using Hist=array<uint8_t,6>;
constexpr i64 SCALE=1000000, D=7776;
constexpr int POW5[7]={1,5,25,125,625,3125,15625};
constexpr int MAXS[7]={20,25,30,20,30,30,50};
constexpr int THR[4]={52,65,78,100};
constexpr const char* CAT[7]={"fours","fives","sixes","straight","fullHouse","choice","balut"};
int pi(int c){return c<3?c:(c==5?3:-1);}
i64 ceil_div(i64 n,i64 d){if(d<=0||n<0)throw runtime_error("ceil_div invalid");return (n+d-1)/d;}
int bonus(int x){return x<300?-2:x<350?-1:x<400?0:x<450?1:2+(x-450)/50;}
int fact(int n){int r=1;for(int i=2;i<=n;i++)r*=i;return r;}
void makeHist(int n,int pos,Hist h,vector<Hist>& v){if(pos==6){if(!n)v.push_back(h);return;}for(int k=0;k<=n;k++){h[pos]=k;makeHist(n-k,pos+1,h,v);}}
struct Hold{Hist h;vector<pair<int,int>> out;};
vector<Hist> dice; vector<Hold> holds;vector<vector<int>> holdOf;vector<int> multiplicities;int sc[7][252];map<Hist,int> indexOf;
void init(){
 makeHist(5,0,{},dice);
 sort(dice.begin(),dice.end(),greater<Hist>());
 if(dice.size()!=252)throw runtime_error("histogram enumeration");
 for(int i=0;i<252;i++){
  indexOf[dice[i]]=i;int m=fact(5);for(int k:dice[i])m/=fact(k);multiplicities.push_back(m);
  auto h=dice[i];int sum=0;for(int j=0;j<6;j++)sum+=(j+1)*h[j];
  for(int c=0;c<3;c++)sc[c][i]=(c+4)*h[c+3];
  bool low=true,high=true;for(int j=0;j<5;j++)low&=(h[j]==1);for(int j=1;j<6;j++)high&=(h[j]==1);
  sc[3][i]=low?15:high?20:0;
  bool two=false,three=false,five=false;for(int x:h){two|=(x==2);three|=(x==3);five|=(x==5);}
  sc[4][i]=two&&three?sum:0;sc[5][i]=sum;sc[6][i]=five?sum+20:0;
 }
 vector<Hist> partial;for(int n=0;n<=4;n++)makeHist(n,0,{},partial);
 for(auto h:partial){Hold x;x.h=h;int n=5-accumulate(h.begin(),h.end(),0);vector<Hist> extra;makeHist(n,0,{},extra);
  i64 mass=0;for(auto d:extra){int weight=fact(n);for(int x:d)weight/=fact(x);i64 wn=weight;for(int k=n;k<5;k++)wn*=6;Hist result=h;for(int j=0;j<6;j++)result[j]+=d[j];x.out.push_back({indexOf.at(result),(int)wn});mass+=wn;}
  if(mass!=D)throw runtime_error("transition mass not D");holds.push_back(move(x));
 }
 if(holds.size()!=210)throw runtime_error("hold count !=210");
 for(auto d:dice){vector<int> ans;for(int i=0;i<(int)holds.size();i++){bool ok=true;for(int j=0;j<6;j++)ok&=holds[i].h[j]<=d[j];if(ok)ans.push_back(i);}holdOf.push_back(move(ans));}
 if(accumulate(multiplicities.begin(),multiplicities.end(),0)!=D)throw runtime_error("first mass");
}
struct State{array<int,7> k;array<int,4> p;int st,fh,ba,total;};
struct Surrogate{
 State s;int alpha;int k0;int base=0;array<array<i64,252>,7> rew{};
 array<int,7> maxQuota{};
 i64 G=0,beta=0;
 Surrogate(State state,int a):s(state),alpha(a){
  if(alpha<0||alpha>1000000)throw runtime_error("alpha invalid");
  int low=5*s.k[5],high=0;for(int c=0;c<7;c++)high+=s.k[c]*MAXS[c];
  beta=LLONG_MIN;for(int x=low;x<=high;x++) beta=max(beta,SCALE*bonus(s.total+x)-(i64)alpha*x);
  G=2*SCALE*s.ba;
  for(int c:{0,1,2,5}){
   int j=pi(c);if(s.p[j]>=THR[j])G+=2*SCALE;
   else if(s.p[j]+s.k[c]*MAXS[c]>=THR[j]){
    int needed=THR[j]-s.p[j];for(int i=0;i<252;i++)rew[c][i]+=ceil_div(2*SCALE*(i64)sc[c][i],needed);
   }
  }
  for(int c:{3,4}){
   int positive=c==3?s.st:s.fh, award=c==3?4:3;
   if(s.k[c]==0){if(positive==4)G+=award*SCALE;}
   else if(positive+s.k[c]==4){for(int i=0;i<252;i++)if(sc[c][i]>0)rew[c][i]+=ceil_div(award*SCALE,s.k[c]);}
  }
  for(int i=0;i<252;i++)if(sc[6][i])rew[6][i]+=2*SCALE;
  for(int c=0;c<7;c++)for(int i=0;i<252;i++)rew[c][i]+=(i64)alpha*sc[c][i];
 }
};
struct Engine{
 Surrogate sp;
 array<i64,78125> memo;array<uint8_t,78125> known{};
 uint64_t states=0,holdOps=0;
 Engine(State s,int alpha):sp(s,alpha){memo.fill(0);}
 int key(array<int,7> const& k){int sum=0;for(int c=0;c<7;c++)sum+=k[c]*POW5[c];return sum;}
 void backward(const array<i64,252>& stop, array<i64,252>& next){
  i64 evalHold[210];
  for(int hi=0;hi<210;hi++){
   i64 n=0;for(auto [idx,w]:holds[hi].out)n+=stop[idx]*w;
   evalHold[hi]=ceil_div(n,D);holdOps+=holds[hi].out.size();
  }
  for(int i=0;i<252;i++){
   i64 v=stop[i];for(int hi:holdOf[i])v=max(v,evalHold[hi]);next[i]=v;
  }
 }
 i64 value(array<int,7>& k){
  int id=key(k);if(!id)return 0;
  if(known[id])return memo[id];
  states++;
  array<i64,7> successor{};
  for(int c=0;c<7;c++)if(k[c]){k[c]--;successor[c]=value(k);k[c]++;}
  array<i64,252> stop{},once{},twice{};
  for(int i=0;i<252;i++){
   i64 best=LLONG_MIN;for(int c=0;c<7;c++)if(k[c])best=max(best,sp.rew[c][i]+successor[c]);
   stop[i]=best;
  }
  backward(stop,once);backward(once,twice);
  i64 mass=0;for(int i=0;i<252;i++)mass+=(i64)multiplicities[i]*twice[i];
  return known[id]=1,memo[id]=ceil_div(mass,D);
 }
 map<string,i64> actionUpper(array<int,7> k,Hist rolled,int r){
  int idx=indexOf.at(rolled);
  array<i64,7> child{};for(int c=0;c<7;c++)if(k[c]){k[c]--;child[c]=value(k);k[c]++;}
  array<i64,252> stop{},once{},twice{};
  for(int i=0;i<252;i++){
   i64 best=LLONG_MIN;for(int c=0;c<7;c++)if(k[c])best=max(best,sp.rew[c][i]+child[c]);stop[i]=best;
  }
  if(r>=2)backward(stop,once);
  map<string,i64> out;
  for(int c=0;c<7;c++)if(k[c])out[string("score:")+CAT[c]+":"+to_string(sc[c][idx])]=sp.G+sp.beta+sp.rew[c][idx]+child[c];
  if(r>=1){
   auto& prev=r==2?once:stop;
   for(int hi:holdOf[idx]){
    auto& h=holds[hi];i64 n=0;for(auto [j,w]:h.out)n+=prev[j]*w;
    string name="hold:";for(int x:h.h)name+=to_string(x);
    out[name]=sp.G+sp.beta+ceil_div(n,D);
   }
  }
  return out;
 }
};
Hist diceFromArgs(char** argv,int start){Hist h{};for(int j=0;j<5;j++){int v=atoi(argv[start+j]);if(v<1||v>6)throw runtime_error("die invalid");h[v-1]++;}return h;}
int main(int argc,char** argv){
 try{
  if(argc==18&&string(argv[1])=="--value"){
   init();int off=2;State s;for(auto &x:s.k)x=atoi(argv[off++]);for(auto &x:s.p)x=atoi(argv[off++]);s.st=atoi(argv[off++]);s.fh=atoi(argv[off++]);s.ba=atoi(argv[off++]);s.total=atoi(argv[off++]);int alpha=atoi(argv[off++]);
   auto started=chrono::steady_clock::now();Engine e(s,alpha);auto k=s.k;
   i64 value=e.sp.G+e.sp.beta+e.value(k);
   cout<<"{\"status\":\"QUOTA_STATE_UPPER_INTEGER\",\"alpha_micro\":"<<alpha<<",\"value_micro\":"<<value<<",\"states\":"<<e.states<<",\"seconds\":"<<chrono::duration<double>(chrono::steady_clock::now()-started).count()<<"}\n";
   return 0;
  }
  if(argc==2&&string(argv[1])=="--audit-scores"){
   init();cout<<"[";for(int i=0;i<252;i++){if(i)cout<<",";cout<<"[";for(int c=0;c<7;c++){if(c)cout<<",";cout<<sc[c][i];}cout<<"]";}cout<<"]\n";return 0;
  }
  if(argc!=23){cerr<<"Args: k0..k6 p0..p3 st fh ba total die1..die5 rerolls alpha_micro (22 ints)\n";return 2;}
  init();int offset=1;State s;for(auto &x:s.k)x=atoi(argv[offset++]);for(auto &x:s.p)x=atoi(argv[offset++]);s.st=atoi(argv[offset++]);s.fh=atoi(argv[offset++]);s.ba=atoi(argv[offset++]);s.total=atoi(argv[offset++]);Hist rolled=diceFromArgs(argv,offset);offset+=5;int r=atoi(argv[offset++]);int alpha=atoi(argv[offset++]);
  for(int x:s.k)if(x<0||x>4)throw runtime_error("illegal quota");if(r<0||r>2)throw runtime_error("illegal reroll count");
  auto started=chrono::steady_clock::now();Engine engine(s,alpha);
  auto actions=engine.actionUpper(s.k,rolled,r);
  map<string,i64> leaf;
  for(int c=0;c<7;c++)if(s.k[c]){
   auto k=s.k;k[c]--;i64 continuation=engine.value(k);
   for(int i=0;i<252;i++){
    string key=to_string(c)+":"+to_string(sc[c][i]);
    leaf[key]=engine.sp.G+engine.sp.beta+engine.sp.rew[c][i]+continuation;
   }
  }
  cout<<"{\"status\":\"QUOTA_ADMISSIBLE_UPPER_INTEGER\",\"alpha_micro\":"<<alpha<<",\"G_micro\":"<<engine.sp.G<<",\"beta_micro\":"<<engine.sp.beta<<",\"states\":"<<engine.states<<",\"holdOps\":"<<engine.holdOps<<",\"seconds\":"<<setprecision(6)<<chrono::duration<double>(chrono::steady_clock::now()-started).count()<<",\"actions_micro\":{";
  bool first=true;for(auto [name,v]:actions){if(!first)cout<<",";first=false;cout<<"\""<<name<<"\":"<<v;}cout<<"},\"leaf_micro\":{";first=true;for(auto [key,v]:leaf){if(!first)cout<<",";first=false;cout<<"\""<<key<<"\":"<<v;}cout<<"}}\n";
 }catch(exception const& e){cerr<<"ERROR: "<<e.what()<<"\n";return 3;}
}