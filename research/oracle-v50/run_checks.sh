#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
g++ -O3 -std=c++20 -DNDEBUG multiturn_native.cpp -o multiturn_native
g++ -O3 -std=c++20 -DNDEBUG legacy/exact_quotient.cpp -o exact_quotient
./multiturn_native 3 > native3.json
./multiturn_native 4 > native4.json
python recompute_reference.py
python verify_certificates.py
python -m unittest -v test_v50
printf 'PASS: full nonlinear Big Points multi-turn dual and independent short horizon certificate tests\n'