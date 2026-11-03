// Balut Oracle v49: exact integer finite one-roll information relaxation dual.
// Research only. NEVER identifies original 28-turn globally optimal actions.
// Input TSV rows: counts[6], upper_micro, lower_micro for 252 histograms.
// U is a mathematical *upper* for genuine continuation after last roll;
// L is a feasible continuation *lower*. With any deterministic psi, information
// relaxation martingale difference psi(Y_h,R)-E[psi(Y_h,R)] has zero mean for
// EVERY nonanticipative hold choice. Clairvoyant max gives an admissible U.
// Important mathematical impossibility: this dual cannot improve the exact
// one-step Bellman backup of the SAME U continuation values.
#include <bits/stdc++.h>
using namespace std;
using I=__int128_t;
using ll=long long;
constexpr int D=7776;
using H=array<uint8_t,6>;
struct Hold{H counts;int n;int id;};
string strI(I x){if(x==0)return "0";bool neg=x<0;if(neg)x=-x;string s;while(x){s.push_back('0'+int(x%10));x/=10;}if(neg)s.push_back('-');reverse(s.begin(),s.end());return s;}
I ceildiv(I x,I d){if(d<=0)throw runtime_error("bad divisor");if(x>=0)return (x+d-1)/d;return -((-x)/d);}
vector<H> dice;map<H,int> id;vector<Hold> holds;vector<vector<int>> feasible;vector<array<uint16_t,D>> lookup;
void rec(int n,int face,H h,vector<H>& out){if(face==6){if(!n)out.push_back(h);return;}for(int k=0;k<=n;k++){h[face]=k;rec(n-k,face+1,h,out);}}
void init(){rec(5,0,{},dice);sort(dice.begin(),dice.end());if(dice.size()!=252)throw runtime_error("wrong dice hist count");for(int i=0;i<252;i++)id[dice[i]]=i;
 for(int n=0;n<=4;n++){vector<H> part;rec(n,0,{},part);for(auto h:part)holds.push_back({h,5-n,(int)holds.size()});}
 if(holds.size()!=210)throw runtime_error("wrong hold count");
 for(const H& d:dice){vector<int> fh;for(auto& h:holds){bool yes=true;for(int j=0;j<6;j++)if(h.counts[j]>d[j])yes=false;if(yes)fh.push_back(h.id);}feasible.push_back(fh);}
 lookup.resize(210);for(auto& h:holds){for(int i=0;i<D;i++){H out=h.counts;int q=i;for(int t=0;t<h.n;t++){int v=q%6;q/=6;out[v]++;}lookup[h.id][i]=(uint16_t)id.at(out);}}
}
struct Stage{vector<ll> U,L;array<vector<ll>,4> psi;array<vector<I>,4> dualNumer;vector<I> baseNumer;array<vector<I>,4> m;
 Stage(vector<ll> up,vector<ll> low):U(move(up)),L(move(low)){
  for(int i=0;i<252;i++){psi[0].push_back(0);psi[1].push_back(L[i]);psi[2].push_back((L[i]+U[i])/2);psi[3].push_back(U[i]);}
  for(int t=0;t<4;t++)m[t].resize(210);
  for(int hi=0;hi<210;hi++){for(int r=0;r<D;r++){int y=lookup[hi][r];for(int t=0;t<4;t++)m[t][hi]+=psi[t][y];}}
  baseNumer.resize(252);for(int t=0;t<4;t++)dualNumer[t].resize(252);
  for(int di=0;di<252;di++){
   I bestBase=I(D)*U[di];for(int hi:feasible[di])bestBase=max(bestBase,m[3][hi]);baseNumer[di]=bestBase;
   for(int r=0;r<D;r++){
    array<I,4> best;for(int t=0;t<4;t++)best[t]=I(D)*U[di];
    for(int hi:feasible[di]){
     int out=lookup[hi][r];
     for(int t=0;t<4;t++){
      I v=I(D)*(U[out]-psi[t][out])+m[t][hi];if(v>best[t])best[t]=v;
     }
    }
    for(int t=0;t<4;t++)dualNumer[t][di]+=best[t];
   }
   for(int t=0;t<4;t++)if(dualNumer[t][di]<I(D)*baseNumer[di])throw runtime_error("weak dual violation");
   if(dualNumer[3][di]!=I(D)*baseNumer[di])throw runtime_error("perfect potential not tight");
  }
 }
};
int main(int argc,char**argv){try{
 if(argc!=3){cerr<<"Usage: dual_one_step STOP_TABLE.tsv 1,3,4,4,5\n";return 2;}
 init();vector<ll> U(252),L(252);vector<bool> seen(252);
 ifstream f(argv[1]);if(!f)throw runtime_error("input file missing");
 for(int i=0;i<252;i++){
  H h{};for(int j=0;j<6;j++){int x;if(!(f>>x))throw runtime_error("incomplete histogram table");if(x<0||x>5)throw runtime_error("bad histogram");h[j]=x;}
  ll u,l;if(!(f>>u>>l))throw runtime_error("incomplete values");int idx=id.at(h);if(seen[idx]||u<l)throw runtime_error("duplicate or infeasible leaf");seen[idx]=true;U[idx]=u;L[idx]=l;
 }
 for(bool ok:seen)if(!ok)throw runtime_error("missing dice histogram");
 H root{};string s=argv[2];replace(s.begin(),s.end(),',',' ');istringstream ss(s);int val;int count=0;while(ss>>val){if(val<1||val>6)throw runtime_error("die out of range");root[val-1]++;count++;}if(count!=5)throw runtime_error("need 5 dice");int idxRoot=id.at(root);
 auto ts=chrono::steady_clock::now();Stage stage(U,L);
 string labels[]={"zero","policy_lower","mixed","perfect_tail"};
 cout<<"{\"status\":\"RIGOROUS_ONE_REROLL_INFORMATION_RELAXATION\",\"rolled\":[";
 bool first=true;for(int j=0;j<6;j++)for(int k=0;k<root[j];k++){if(!first)cout<<",";first=false;cout<<(j+1);}cout<<"],\"reroll_stage_diagnostics\":{";
 for(int t=0;t<4;t++){
  if(t)cout<<",";I totalGap=0,maxGap=0;int positive=0;for(int i=0;i<252;i++){I gap=stage.dualNumer[t][i]-I(D)*stage.baseNumer[i];totalGap+=gap;maxGap=max(maxGap,gap);if(gap>0)positive++;}
  cout<<"\""<<labels[t]<<"\":{\"nodes_with_positive_gap\":"<<positive<<",\"sum_gaps_numerator\":\""<<strI(totalGap)<<"\",\"max_gap_bp\":"<<setprecision(12)<<(long double)maxGap/(I(D)*D*1000000)<<"}";
 }
 cout<<"},\"current_hold_actions\":{";
 int hcount=0;for(int hi:feasible[idxRoot]){
  if(hcount++)cout<<",";string label="hold:";for(int x:holds[hi].counts)label+=to_string(x);
  // Each current hold is taken before reroll R0. The new last-roll state after
  // this first reroll is one of 252 dice histograms; two rerolls at root.
  I baseSum=0;array<I,4> dualSum{};
  for(int r=0;r<D;r++){int out=lookup[hi][r];baseSum+=stage.baseNumer[out];for(int t=0;t<4;t++)dualSum[t]+=stage.dualNumer[t][out];}
  I baseDen=I(D)*D,dualDen=I(D)*D*D;
  cout<<"\""<<label<<"\":{\"ordinary_upper_micro_ceil\":\""<<strI(ceildiv(baseSum,baseDen))<<"\",\"bounds_micro_ceil\":{";
  for(int t=0;t<4;t++){if(t)cout<<",";cout<<"\""<<labels[t]<<"\":\""<<strI(ceildiv(dualSum[t],dualDen))<<"\"";}
  cout<<"},\"strict_ordering_check\":"<<(dualSum[3]==I(D)*baseSum?"true":"false")<<"}";
 }
 cout<<"},\"elapsed_seconds\":"<<setprecision(6)<<chrono::duration<double>(chrono::steady_clock::now()-ts).count()<<"}\n";
 }catch(exception const& e){cerr<<"ERROR "<<e.what()<<"\n";return 3;}
}