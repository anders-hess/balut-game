// Balut research v46: EXACT Bellman after reward-potential shaping.
// Abandons accumulated Balut bonus and already-locked straight/house failures.
// The objective is still optimal adaptive expected FINAL Big Points (not heuristic).
// Real-valued finite-horizon Bellman; output EXACT_FLOAT64, never formal rational proof.
#include <bits/stdc++.h>
using namespace std;
using Hist=array<unsigned char,6>;
constexpr int T[4]={52,65,78,100};
int pi(int c){return c<3?c:(c==5?3:-1);}
int bonus(int total){return total<300?-2:total<350?-1:total<400?0:total<450?1:2+(total-450)/50;}
// phase: exact small total <450, 450 + remainder mod 50 thereafter.
int phase(int total){return total<450?total:450+(total-450)%50;}
struct State {
 array<uint8_t,7> k{};
 array<uint8_t,4> p{};
 uint16_t total=0; // quotient of accumulated total Small Points under potential shaping
 uint8_t alive=0;  // straight still all positive / full house still all positive
 bool operator==(const State& a) const{return k==a.k&&p==a.p&&total==a.total&&alive==a.alive;}
};
struct Hash {size_t operator()(State const& a)const{
 uint64_t x=1469598103934665603ULL;auto mix=[&](uint32_t y){x=(x^(y+1u))*1099511628211ULL;};
 for(auto v:a.k)mix(v);for(auto v:a.p)mix(v);mix(a.total);mix(a.alive);return x;
}};
struct Input{
 array<int,7> k{};array<int,4> p{};
 int st=0,fh=0,ba=0,total=0;
};
State shape(Input const& x){
 State s;for(int c=0;c<7;c++)s.k[c]=x.k[c];for(int j=0;j<4;j++)s.p[j]=min(T[j],x.p[j]);
 s.alive=(x.st==4-x.k[3]?1:0)|(x.fh==4-x.k[4]?2:0);s.total=phase(x.total);return s;
}
int secured(Input const& x){
 int v=bonus(x.total)+2*x.ba;
 for(int j=0;j<4;j++)if(x.p[j]>=T[j])v+=2;
 if(x.k[3]==0&&x.st==4)v+=4;
 if(x.k[4]==0&&x.fh==4)v+=3;
 return v;
}
int remaining(State const& a){int s=0;for(auto v:a.k)s+=v;return s;}
// One-step exact potential difference and normalized successor.
pair<State,int> advance(State s,int c,int score){
 if(s.k[c]==0)throw runtime_error("closed category");
 int reward=bonus(s.total+score)-bonus(s.total);
 int j=pi(c);if(j>=0){int old=s.p[j];s.p[j]=min(T[j],old+score);if(old<T[j]&&s.p[j]==T[j])reward+=2;}
 if(c==3){if(score==0)s.alive&=~1;else if(s.k[c]==1&&(s.alive&1))reward+=4;}
 if(c==4){if(score==0)s.alive&=~2;else if(s.k[c]==1&&(s.alive&2))reward+=3;}
 if(c==6&&score>0)reward+=2;
 s.k[c]--;s.total=phase(s.total+score);
 return {s,reward};
}
int score(int c,Hist const& h){
 int sum=0;for(int i=0;i<6;i++)sum+=(i+1)*h[i];
 if(c<3)return (c+4)*h[c+3];
 if(c==3){bool lo=true,hi=true;for(int i=0;i<5;i++)lo&=h[i]==1;for(int i=1;i<6;i++)hi&=h[i]==1;return lo?15:hi?20:0;}
 if(c==4){bool two=false,three=false;for(auto x:h){two|=x==2;three|=x==3;}return two&&three?sum:0;}
 if(c==5)return sum;
 for(auto x:h)if(x==5)return sum+20;return 0;
}
vector<Hist> dice;map<Hist,int> diceID;vector<int> multiplicity;vector<vector<int>> holdIds;
struct Hold {Hist h;int n;double inv;vector<pair<int,int>> out;};
vector<Hold> holds;array<array<uint8_t,252>,7> tableScore{};
static int fac(int n){int v=1;for(int j=2;j<=n;j++)v*=j;return v;}
void enumerate(int n,int pos,Hist h,vector<Hist>& result){
 if(pos==6){if(n==0)result.push_back(h);return;}
 for(int v=0;v<=n;v++){h[pos]=v;enumerate(n-v,pos+1,h,result);}
}
void init(){
 enumerate(5,0,{},dice);sort(dice.begin(),dice.end(),greater<Hist>());
 for(int i=0;i<(int)dice.size();i++){
  diceID[dice[i]]=i;int m=fac(5);for(auto v:dice[i])m/=fac(v);multiplicity.push_back(m);
  for(int c=0;c<7;c++)tableScore[c][i]=score(c,dice[i]);
 }
 vector<Hist> small;for(int n=0;n<=4;n++)enumerate(n,0,{},small);
 for(auto h:small){
  Hold hold;hold.h=h;hold.n=5-accumulate(h.begin(),h.end(),0);
  hold.inv=1./pow(6.,hold.n);
  vector<Hist> newDice;enumerate(hold.n,0,{},newDice);
  int total=0;
  for(auto d:newDice){int m=fac(hold.n);for(auto v:d)m/=fac(v);Hist res=h;for(int j=0;j<6;j++)res[j]+=d[j];hold.out.push_back({diceID[res],m});total+=m;}
  if(total!=(int)round(pow(6,hold.n)))throw runtime_error("transition mass mismatch");
  holds.push_back(move(hold));
 }
 for(auto h:dice){vector<int> hs;for(int i=0;i<(int)holds.size();i++){
  bool ok=true;for(int j=0;j<6;j++)if(holds[i].h[j]>h[j])ok=false;if(ok)hs.push_back(i);
 }holdIds.push_back(hs);}
 if(dice.size()!=252||holds.size()!=210)throw runtime_error("invalid histogram counts");
}
int limitStates=50000;long long computations=0;unsigned long long lookups=0;
unordered_map<State,double,Hash> cache;
double exactValue(State const& s);
void stopValues(State const& s,vector<double>& stop){
 stop.assign(252,-1e40);
 for(int c=0;c<7;c++)if(s.k[c]){
  array<double,51> v;array<bool,51> cached{};
  for(int i=0;i<252;i++){
   int sc=tableScore[c][i];
   if(!cached[sc]){auto [next,inc]=advance(s,c,sc);v[sc]=inc+exactValue(next);cached[sc]=true;}
   stop[i]=max(stop[i],v[sc]);
  }
 }
}
vector<double> rerollPass(vector<double> const& previous,vector<double> const& stop){
 vector<double> next(252);
 for(int i=0;i<252;i++){
  double best=stop[i];
  for(int hi:holdIds[i]){
   auto const& h=holds[hi];double sum=0;
   for(auto [di,m]:h.out)sum+=m*previous[di];
   best=max(best,sum*h.inv);
  }
  next[i]=best;
 }
 return next;
}
double exactValue(State const& s){
 if(!remaining(s))return 0.0;
 ++lookups;auto it=cache.find(s);if(it!=cache.end())return it->second;
 if((int)cache.size()+computations>=limitStates)throw runtime_error("EXACT_RESOURCE_LIMIT_NO_FALLBACK");
 computations++;
 vector<double> stop;stopValues(s,stop);auto one=rerollPass(stop,stop);auto two=rerollPass(one,stop);
 double v=0;for(int i=0;i<252;i++)v+=multiplicity[i]*two[i]/7776.;
 cache.emplace(s,v);computations--;return v;
}
Hist histFromArgs(char** argv,int off){Hist d{};for(int i=0;i<5;i++){int f=atoi(argv[off+i]);if(f<1||f>6)throw runtime_error("invalid die");d[f-1]++;}return d;}
int main(int argc,char** argv){
 try{
  if(argc!=23){cerr<<"Usage: shaped k0..k6 p0..p3 st fh ba total die1..die5 rerolls statecap\n";return 2;}
  Input input;int off=1;for(int i=0;i<7;i++)input.k[i]=atoi(argv[off++]);for(int j=0;j<4;j++)input.p[j]=atoi(argv[off++]);input.st=atoi(argv[off++]);input.fh=atoi(argv[off++]);input.ba=atoi(argv[off++]);input.total=atoi(argv[off++]);
  Hist hist=histFromArgs(argv,off);off+=5;int r=atoi(argv[off++]);limitStates=atoi(argv[off++]);
  if(r<0||r>2)throw runtime_error("rerolls 0..2 only");
  init();auto started=chrono::steady_clock::now();
  State s=shape(input);int id=diceID.at(hist);double accrued=secured(input);
  map<string,double> actionQ;
  for(int c=0;c<7;c++)if(s.k[c]){
   int sc=score(c,hist);auto [next,inc]=advance(s,c,sc);
   actionQ["score:"+to_string(c)+":"+to_string(sc)]=accrued+inc+exactValue(next);
  }
  if(r){vector<double> st;stopValues(s,st);auto prev=r==1?st:rerollPass(st,st);
   for(int hi:holdIds[id]){
    auto const& h=holds[hi];double sum=0;for(auto [di,m]:h.out)sum+=m*prev[di];
    string name="hold:";for(auto v:h.h)name+=to_string((int)v);actionQ[name]=accrued+sum*h.inv;
   }
  }
  double best=-1e40;string action;for(auto [k,v]:actionQ)if(v>best){best=v;action=k;}
  auto elapsed=chrono::duration<double>(chrono::steady_clock::now()-started).count();
  cout<<setprecision(17)<<"{\"status\":\"EXACT_FLOAT64\",\"remaining\":"<<remaining(s)<<",\"value\":"<<best<<",\"best\":\""<<action<<"\",\"states\":"<<cache.size()<<",\"seconds\":"<<elapsed<<",\"lookups\":"<<lookups<<",\"actions\":{";
  bool first=true;for(auto [k,v]:actionQ){if(!first)cout<<",";first=false;cout<<"\""<<k<<"\":"<<v;}cout<<"}}\n";
 }catch(exception const& e){cerr<<e.what()<<"\n";return 3;}
}