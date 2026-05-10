#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

STAGED_FILES=$(git diff --cached --name-only --diff-filter=ACMR)

if [[ -z "$STAGED_FILES" ]]; then
  echo "PASS: No staged files to scan for secrets."
  exit 0
fi

# Keep scan limited to text-like source/config files to avoid binary noise.
SCAN_FILES=$(printf '%s\n' "$STAGED_FILES" | grep -E '\.(ts|tsx|js|jsx|json|yml|yaml|sh|md|env|txt)$' || true)

if [[ -z "$SCAN_FILES" ]]; then
  echo "PASS: No staged text files requiring secret scan."
  exit 0
fi

PATTERN='(AIza[0-9A-Za-z_-]{35}|gh[pousr]_[A-Za-z0-9_]{20,}|github_pat_[A-Za-z0-9_]{20,}|sk_live_[A-Za-z0-9]{10,}|rk_live_[A-Za-z0-9]{10,}|xox[baprs]-[A-Za-z0-9-]{10,})'

if rg -n --pcre2 "$PATTERN" -- $SCAN_FILES; then
  echo "CRITICAL: Potential secret detected in staged files."
  echo "If this is a false positive, rotate/sanitize and commit safe values only."
  exit 1
fi

echo "PASS: No common secret patterns found in staged files."
