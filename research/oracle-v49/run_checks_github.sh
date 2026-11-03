#!/usr/bin/env bash
# Run directly after checkout of research/oracle-v49-information-dual-2026-11-03
set -euo pipefail
cd "$(dirname "$0")"
export PYTHONDONTWRITEBYTECODE=1
if [[ ! -d ../oracle-v47 || ! -d ../oracle-v48 ]]; then
 echo 'Missing sibling research/oracle-v47 and research/oracle-v48 from research branch' >&2; exit 2
fi
g++ -std=c++20 -O3 -DNDEBUG ../oracle-v47/quota_upper.cpp -o ../oracle-v47/quota_upper
g++ -std=c++20 -O1 -DNDEBUG ../oracle-v47/exact_quotient.cpp -o ../oracle-v47/exact_quotient
g++ -std=c++20 -O1 -DNDEBUG ../oracle-v47/exact_reachable.cpp -o ../oracle-v47/exact_reachable
g++ -std=c++20 -O2 dual_one_step.cpp -o dual_one_step
python build_table.py
./dual_one_step last_roll_table.tsv 1,3,4,4,5 > dual_opening_raw.json
python verify_dual.py
python validate_frozen.py
python toy_two_turn_dual.py > /dev/null
python real_balut_two_turn_dual.py > /dev/null
(cd ../oracle-v47 && python -m unittest -v test_quota test_conditional test_route && python verify_results.py >/dev/null)
echo 'PASS GitHub v49 research checks, zero early certificates'