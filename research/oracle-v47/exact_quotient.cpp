// Research-only exact finite-horizon Bellman on a reward-preserving quotient.
// Explicit state-cap failure, never return a heuristic as exact.
#include <bits/stdc++.h>
using namespace std;
using Hist=array<unsigned char,6>;
struct State {
 array<uint16_t,7> k{};
 array<uint16_t,4> p{}; // capped threshold progress in 4s, 5s, 6s, Choice
 uint16_t st=0,fh=0,ba=0,total=0;
 bool operator==(const State& o) const {return k==o.k&&p==o.p&&st==o.st&&fh==o.fh&&ba==o.ba&&total==o.total;}
};
struct StateHash { size_t operator()(State const& s) const {
 uint64_t h=1469598103934665603ULL;
 auto mix=[&](int x){h=(h^static_cast<uint64_t>(x+1))*1099511628211ULL;};
 for(auto x:s.k)mix(x);for(auto x:s.p)mix(x);mix(s.st);mix(s.fh);mix(s.ba);mix(s.total);return h;
}};
const int thr[4]={52,65,78,100};
int idxP(int c){return c<3?c:(c==5?3:-1);}
int bonus(int t){return t<300?-2:t<350?-1:t<400?0:t<450?1:2+(t-450)/50;}
int terminal(State const& s){
 int v=bonus(s.total)+2*s.ba;
 for(int a=0;a<4;a++)v+=s.p[a]>=thr[a]?2:0;
 v+=s.st==4?4:0;v+=s.fh==4?3:0;
 return v;
}
State advance(State s,int c,int score){
 if(s.k[c]==0)throw runtime_error("closed category");
 s.k[c]--;s.total+=score;
 int j=idxP(c);if(j>=0)s.p[j]=min<int>(thr[j],s.p[j]+score);
 if(c==3&&score>0)s.st++;
 if(c==4&&score>0)s.fh++;
 if(c==6&&score>0)s.ba++;
 return s;
}
int score(int c,Hist const& h){
 int sum=0;for(int i=0;i<6;i++)sum+=(i+1)*h[i];
 if(c<3)return (c+4)*h[c+3];
 if(c==3){bool lo=true,hi=true;for(int i=0;i<5;i++)lo&=h[i]==1;for(int i=1;i<6;i++)hi&=h[i]==1;return lo?15:hi?20:0;}
 if(c==4){bool two=false,three=false;for(auto x:h){two|=x==2;three|=x==3;}return two&&three?sum:0;}
 if(c==5)return sum;
 for(auto x:h)if(x==5)return sum+20;
 return 0;
}
vector<Hist> dice;map<Hist,int> diceID;vector<int> multiplicity;vector<vector<int>> holdIds;
struct Hold {Hist h;int n;vector<pair<int,int>> out;};
vector<Hold> holds;
static int fac(int n){int v=1;for(int j=2;j<=n;j++)v*=j;return v;}
void enumerateHists(int n,int pos,Hist h,vector<Hist>& result){
 if(pos==6){if(n==0)result.push_back(h);return;}
 for(int v=0;v<=n;v++){h[pos]=v;enumerateHists(n-v,pos+1,h,result);}
}
void init(){
 enumerateHists(5,0,{},dice);
 sort(dice.begin(),dice.end(),greater<Hist>()); // matches Python combinations_with_replacement lex order
 for(int i=0;i<(int)dice.size();i++){
  diceID[dice[i]]=i;int m=fac(5);for(auto v:dice[i])m/=fac(v);multiplicity.push_back(m);
 }
 vector<Hist> small;
 for(int n=0;n<=4;n++)enumerateHists(n,0,{},small);
 for(auto h:small){
  Hold hold;hold.h=h;hold.n=5-accumulate(h.begin(),h.end(),0);
  vector<Hist> newDice;enumerateHists(hold.n,0,{},newDice);
  int total=0;
  for(auto d:newDice){int m=fac(hold.n);for(auto v:d)m/=fac(v);Hist res=h;for(int j=0;j<6;j++)res[j]+=d[j];hold.out.push_back({diceID[res],m});total+=m;}
  if(total!=(int)round(pow(6,hold.n)))throw runtime_error("transition mass mismatch");
  holds.push_back(move(hold));
 }
 for(auto h:dice){vector<int> hs;for(int i=0;i<(int)holds.size();i++){
  bool ok=true;for(int j=0;j<6;j++)if(holds[i].h[j]>h[j])ok=false;
  if(ok)hs.push_back(i);
 }holdIds.push_back(hs);}
 if(dice.size()!=252 || holds.size()!=210)throw runtime_error("bad hist counts");
}
int limitStates=50000;long long computations=0;
unordered_map<State,double,StateHash> cache;
int rem(State const& s){return accumulate(s.k.begin(),s.k.end(),0);}
double exactValue(State const& s);
void stopValues(State const& s,vector<double>& st){
 st.assign(252,-1e40);
 for(int c=0;c<7;c++)if(s.k[c]){
  map<int,double> v;
  for(int i=0;i<252;i++){
   int sc=score(c,dice[i]);auto it=v.find(sc);
   double q;
   if(it==v.end()){State nxt=advance(s,c,sc);q=exactValue(nxt);v.emplace(sc,q);}
   else q=it->second;
   st[i]=max(st[i],q);
  }
 }
}
vector<double> rerollPass(vector<double> const& previous,vector<double> const& st){
 vector<double> next(252);
 for(int i=0;i<252;i++){
  double best=st[i];
  for(int hi:holdIds[i]){
   auto &h=holds[hi];double sum=0;
   for(auto [di,m]:h.out)sum+=m*previous[di];
   double q=sum/pow(6.0,h.n);
   if(q>best)best=q;
  }
  next[i]=best;
 }
 return next;
}
double exactValue(State const& s){
 if(!rem(s))return terminal(s);
 auto it=cache.find(s);if(it!=cache.end())return it->second;
 if((int)cache.size()+computations>=limitStates)throw runtime_error("Exact state budget exceeded; NO FALLBACK");
 computations++;
 vector<double> st;stopValues(s,st);
 auto one=rerollPass(st,st);auto two=rerollPass(one,st);
 double v=0;for(int i=0;i<252;i++)v+=multiplicity[i]*two[i]/7776.0;
 cache.emplace(s,v);computations--;
 return v;
}
Hist histFromArgs(char** argv,int off){Hist d{};for(int i=0;i<5;i++){int f=atoi(argv[off+i]);if(f<1||f>6)throw runtime_error("invalid die");d[f-1]++;}return d;}
int main(int argc,char** argv){
 try{
  // 7 quotas, 4 progress, st/fh/ba/total, 5 dice, rerolls, state cap: 22 numeric args
  if(argc==2&&string(argv[1])=="--audit-scores"){init();cout<<"[";for(int i=0;i<252;i++){if(i)cout<<",";cout<<"[";for(int c=0;c<7;c++){if(c)cout<<",";cout<<score(c,dice[i]);}cout<<"]";}cout<<"]\n";return 0;}
  if(argc!=23){cerr<<"Usage: exact_quotient k0..k6 p0..p3 st fh ba total die1..die5 rerolls statecap\n";return 2;}
  State s;int off=1;for(int i=0;i<7;i++)s.k[i]=atoi(argv[off++]);for(int i=0;i<4;i++)s.p[i]=atoi(argv[off++]);s.st=atoi(argv[off++]);s.fh=atoi(argv[off++]);s.ba=atoi(argv[off++]);s.total=atoi(argv[off++]);
  Hist hist=histFromArgs(argv,off);off+=5;int r=atoi(argv[off++]);limitStates=atoi(argv[off++]);
  if(r<0||r>2)throw runtime_error("rerolls must be 0..2");
  init();auto started=chrono::steady_clock::now();
  int id=diceID.at(hist);
  map<string,double> actionQ;
  vector<double> st(252,-1e40);
  for(int c=0;c<7;c++)if(s.k[c]){
   int sc=score(c,hist);double q=exactValue(advance(s,c,sc));
   actionQ["score:"+to_string(c)+":"+to_string(sc)]=q;
  }
  if(r){stopValues(s,st);auto prev=r==1?st:rerollPass(st,st);
   for(int hi:holdIds[id]){
    auto &h=holds[hi];double sum=0;for(auto [di,m]:h.out)sum+=m*prev[di];
    string name="hold:";for(auto v:h.h)name+=to_string((int)v);actionQ[name]=sum/pow(6.0,h.n);
   }
  }
  double best=-1e40;string action;for(auto [k,v]:actionQ)if(v>best){best=v;action=k;}
  auto elapsed=chrono::duration<double>(chrono::steady_clock::now()-started).count();
  cout<<setprecision(17)<<"{\"status\":\"EXACT_FLOAT64\",\"remaining\":"<<rem(s)<<",\"value\":"<<best<<",\"best\":\""<<action<<"\",\"states\":"<<cache.size()<<",\"seconds\":"<<elapsed<<",\"actions\":{";
  bool first=true;for(auto [k,v]:actionQ){if(!first)cout<<",";first=false;cout<<"\""<<k<<"\":"<<v;}cout<<"}}\n";
 }catch(exception const& e){cerr<<e.what()<<"\n";return 3;}
}