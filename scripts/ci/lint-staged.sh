#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

STAGED_LINT_FILES=$(git diff --cached --name-only --diff-filter=ACMR | grep -E '\.(ts|tsx|js|jsx)$' || true)

if [[ -z "$STAGED_LINT_FILES" ]]; then
  echo "PASS: No staged TS/JS files to lint."
  exit 0
fi

npx eslint --max-warnings 0 -- $STAGED_LINT_FILES
echo "PASS: Staged lint passed."
