#!/usr/bin/env bash
# The merge gate. Must exit 0 before any code review or merge.
# Phase 0: only the requirement check exists. Lint, types, tests and build are added
# with the stack in Phase 3, and must be real by the first feature PR.
set -e
cd "$(dirname "$0")/.."

# echo "==> Lint";  npm run lint
# echo "==> Types"; npm run typecheck
# echo "==> Tests"; npm test
# echo "==> Build"; npm run build

echo "==> Requirements"
bash scripts/check-requirement.sh

echo
echo "All checks passed."
