#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
export PYTHONPATH="$PWD:$PWD/../oracle_v47"
python -m unittest -v test_adaptive_lower test_adaptive6
python verify_gate3.py
( cd ../oracle_v47 && bash run_checks.sh )