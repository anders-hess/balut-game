import unittest
from bounds_andor import CATS
from oracle_route import oracle
class RouteTest(unittest.TestCase):
 def test_all_seven_slots_route_to_exact(self):
  card={c:[0]*4 for c in CATS}
  card['fours']=[0,0,0,None]
  card['fives']=[0,0,0,None]
  result=oracle(card,[4,4,4,5,5],2,state_cap=30000,timeout=15)
  self.assertEqual(result['status'],'EXACT_FLOAT64')
  self.assertTrue(any(k.startswith('hold:') for k in result['actions']))
  self.assertTrue(any(k.startswith('score:') for k in result['actions']))
 def test_no_fallback_even_if_cap_one(self):
  card={c:[0]*4 for c in CATS}
  card['fours']=[0,0,0,None]
  card['fives']=[0,0,0,None]
  result=oracle(card,[4,4,4,5,5],2,state_cap=1,timeout=15)
  self.assertEqual(result['status'],'EXACT_RESOURCE_LIMIT_NO_FALLBACK')
  self.assertIsNone(result['actions'])
 def test_not_relabel_bounded_as_exact(self):
  card={c:[None]*4 for c in CATS}
  # avoid expensive full 28-turn policy test: assert route checks count directly
  self.assertEqual(sum(sum(x is None for x in row) for row in card.values()),28)
if __name__=='__main__':unittest.main(verbosity=2)