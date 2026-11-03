// Test the exact quotient invariant against independently carried raw state.
#define main exact_reachable_disabled_main
#include "exact_reachable.cpp"
#undef main
#include <iostream>
int main(){
 init();std::mt19937_64 rng(20261103);
 long long steps=0,bonustransitions=0,deadp=0,deadbonus=0;
 for(int game=0;game<2500;game++){
  Input raw;raw.k.fill(4);
  for(int turn=0;turn<28;turn++){
   std::vector<int> legal;for(int c=0;c<7;c++)if(raw.k[c])legal.push_back(c);
   int c=legal[rng()%legal.size()],di=rng()%252;
   if(rng()%4!=0){ // force frequent positive rewards to stress thresholds & bonus rows
    Hist target{};
    if(c==0){target[3]=4;target[5]=1;}
    else if(c==1){target[4]=4;target[5]=1;}
    else if(c==2){target[5]=4;target[2]=1;}
    else if(c==3){for(int q=0;q<5;q++)target[q]=1;}
    else if(c==4){target[3]=3;target[4]=2;}
    else if(c==5||c==6)target[5]=5;
    di=diceID.at(target);
   }
   int sc=score(c,dice[di]);
   State prior=shape(raw);
   int oldsecured=secured(raw);
   auto [next,inc]=advance(prior,c,sc);
   raw.k[c]--;raw.total+=sc;
   int j=pi(c);if(j>=0)raw.p[j]=std::min(T[j],raw.p[j]+sc);
   if(c==3&&sc>0)raw.st++;
   if(c==4&&sc>0)raw.fh++;
   if(c==6&&sc>0)raw.ba++;
   if(secured(raw)-oldsecured!=inc){cerr<<"BAD POTENTIAL game="<<game<<" turn="<<turn<<" cat="<<c<<" score="<<sc<<" raw delta="<<secured(raw)-oldsecured<<" shaped="<<inc<<"\n";return 1;}
   if(!(next==shape(raw))){cerr<<"BAD CANONICAL STATE game="<<game<<" turn="<<turn<<" cat="<<c<<" score="<<sc<<"\n";return 2;}
   if(inc!=0)bonustransitions++;
   for(int v:next.p)if(v==DEAD)deadp++;
   if(next.total==BONUS_LOCKED)deadbonus++;
   steps++;
  }
 }
 // Deliberately stress all Small Points bonus boundary crossings, >450 periodicity.
 for(int total=0;total<1000;total++)for(int sc=0;sc<=50;sc++){
  if(bonus(phase(total)+sc)-bonus(phase(total))!=bonus(total+sc)-bonus(total)){
   cerr<<"BAD PERIODIC SMALL BONUS t="<<total<<" sc="<<sc<<"\n";return 3;
  }
 }
 cout<<"{\"status\":\"PASS\",\"legal_raw_shaped_transitions\":"<<steps<<",\"nonzero_reward_events\":"<<bonustransitions<<",\"dead_threshold_canonicalizations\":"<<deadp<<",\"dead_small_bonus_canonicalizations\":"<<deadbonus<<",\"periodic_bonus_checks\":51000}\n";
}