#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
bash run_checks.sh
python run_gate2.py --reference --start 0 --end 5
python run_gate2.py --start 0 --end 2
python run_gate2.py --start 2 --end 6
python run_gate2.py --start 6 --end 12
python run_gate2.py --start 12 --end 20
python run_gate2.py --start 20 --end 28
python run_gate2.py --start 28 --end 36
python run_leaf_portfolio.py --start 0 --end 2
python run_leaf_portfolio.py --start 2 --end 10
python run_leaf_portfolio.py --start 10 --end 20
python run_leaf_portfolio.py --start 20 --end 28
python run_leaf_portfolio.py --start 28 --end 36
python run_selective_hold.py --case 0 --leaf-budget 8
python run_selective_hold.py --case 8 --leaf-budget 8
python verify_results.py