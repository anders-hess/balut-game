#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
g++ -O3 -std=c++20 -DNDEBUG quota_bonus_automata.cpp -o bonus_automata
g++ -O3 -std=c++20 -DNDEBUG ../oracle-v47/quota_upper.cpp -o quota_upper
python3 smoke_v51.py
