#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
export PYTHONPATH="$PWD/research/oracle-v34:$PWD/research/oracle-v35:$PWD/research/oracle-v36"
python research/oracle-v36/test_v36.py --group quick
python research/oracle-v36/test_v36.py --group pathwise
python research/oracle-v36/test_v36.py --group exactq
if [[ "$(printenv RUN_BENCH || true)" == "1" ]]; then
  for start in 0 4 8 12 16 20 24 28 32; do
    python research/oracle-v36/run_v36.py --start "$start" --count 4 --out "/tmp/v36_$start.json"
  done
  python research/oracle-v36/run_v36.py --start 0 --count 1 --all-candidates --out /tmp/v36_all_0.json
  python research/oracle-v36/run_v36.py --start 35 --count 1 --all-candidates --out /tmp/v36_all_35.json
fi
