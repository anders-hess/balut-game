#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
g++ -O3 -std=c++20 -DNDEBUG exact_quotient.cpp -o exact_quotient
python test_suite.py
python independent_fraction.py
python finish_metrics.py
python exact_benchmark.py
# For full replication of 36 observed roots, batch 0..8,...,32..36:
# for i in 0 8 16 24 32; do python run_partial.py "$i" "$((i+8>36?36:i+8))"; done
