#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
# Standalone ZIP includes this snapshot. GitHub research branch can populate the
# same paths from the frozen neighbouring v43-45 and v37 research directories.
if [[ ! -f oracle_v43_45/exact_quotient.cpp && -d ../oracle-v43-v45 ]]; then
  mkdir -p oracle_v43_45; cp ../oracle-v43-v45/* oracle_v43_45/
fi
if [[ ! -f oracle_v37/reference_exact_q_v27.json && -d ../oracle-v37 ]]; then
  mkdir -p oracle_v37; cp ../oracle-v37/*.json oracle_v37/
fi
g++ -O3 -std=c++20 -DNDEBUG oracle_v43_45/exact_quotient.cpp -o oracle_v43_45/exact_quotient
g++ -O3 -std=c++20 -DNDEBUG exact_reachable.cpp -o exact_reachable
g++ -O2 -std=c++20 -DNDEBUG test_reachable.cpp -o test_reachable
./test_reachable
(cd oracle_v43_45 && python test_suite.py && python independent_fraction.py)
QUICK_Q_CHECK=1 python audit_differential.py
if [[ "${RUN_HEAVY:-0}" == "1" ]]; then
  python audit_differential.py
  python capacity_probe.py --extended
fi