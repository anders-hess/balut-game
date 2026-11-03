#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
ORACLE_V47="$PWD/../oracle_v47"
[[ -d "$ORACLE_V47" ]] || ORACLE_V47="$PWD/../oracle-v47"
export PYTHONPATH="$PWD:$ORACLE_V47"
python -m unittest -v test_adaptive_lower test_adaptive6
python verify_gate3.py
( cd "$ORACLE_V47" && bash run_checks.sh )