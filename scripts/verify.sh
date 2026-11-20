#!/usr/bin/env bash
# The merge gate. Must exit 0 before any code review or merge.
set -e
cd "$(dirname "$0")/.."

echo "==> Lint (syntax check)"
npm run lint --silent

echo "==> Tests"
npm test --silent

echo "==> Requirements"
bash scripts/check-requirement.sh

echo
echo "All checks passed."
