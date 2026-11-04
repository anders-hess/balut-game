// Oracle 3.0: state-boundary driver for unchanged Oracle 2.0 v46 Bellman code.
// It compiles the pinned v46 research source unchanged; only adds an entrypoint.
#define main oracle2_v46_roll_main
#include "oracle2-exact-v46.cpp"
#undef main
int main(int argc,char** argv){
 try{
  if(argc!=17){cerr<<"Usage: state k0..k6 p0..p3 st fh ba total statecap\n";return 2;}
  Input input;int off=1;
  for(int i=0;i<7;i++)input.k[i]=atoi(argv[off++]);
  for(int j=0;j<4;j++)input.p[j]=atoi(argv[off++]);
  input.st=atoi(argv[off++]);input.fh=atoi(argv[off++]);
  input.ba=atoi(argv[off++]);input.total=atoi(argv[off++]);
  limitStates=atoi(argv[off++]);
  if(limitStates<1)throw runtime_error("statecap must be positive");
  for(int k:input.k)if(k<0||k>4)throw runtime_error("remaining count invalid");
  init();const auto started=chrono::steady_clock::now();
  State s=shape(input);
  const double val=secured(input)+exactValue(s);
  const double seconds=chrono::duration<double>(chrono::steady_clock::now()-started).count();
  cout<<setprecision(17)<<"{\"status\":\"EXACT_FLOAT64\",\"kind\":\"PRE_FIRST_ROLL_STATE\",\"remaining\":"
      <<remaining(s)<<",\"value\":"<<val<<",\"states\":"<<cache.size()
      <<",\"seconds\":"<<seconds<<",\"lookups\":"<<lookups<<"}\n";
  return 0;
 }catch(exception const& e){cerr<<e.what()<<"\n";return 3;}
}
