"""Ensure branch-specific quotas remain valid upper bounds for actual original Q*
for positive and zero scoring actions, not only the relaxed surrogate.
"""
import json,unittest
from bounds_andor import CATS,SCORES,compress,advance,INDEX
from run_selective_hold import native_state_u
from pathlib import Path
HERE=Path(__file__).resolve().parent
class ConditionalTest(unittest.TestCase):
 def test_frozen_score_actions_all_reference_positions(self):
  rows=json.loads((HERE/'reference_exact_q_v27.json').read_text());n=0;positive=0
  for row in rows:
   s=row['stateInput'];z=(tuple(4-x for x in s[:7]),tuple(s[7:11]),s[11],s[12],s[13],s[14]);dice=s[15:20]
   for key,exactQ in row['exactActionQ'].items():
    typ,c,hold=json.loads(key)
    if typ!='score':continue
    ci=CATS.index(c);sc=SCORES[ci][INDEX[tuple(sorted(dice))]]
    child=advance(z,ci,sc)
    v=min(native_state_u(child,a)['value_micro'] for a in (10000,14000,18000))
    self.assertGreaterEqual(v/1000000+1e-11,exactQ,(row['case'],key,sc,v/1000000,exactQ))
    positive+=sc>0;n+=1
  self.assertGreater(n,4);self.assertGreater(positive,2)
if __name__=='__main__':unittest.main(verbosity=2)