#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

# CI parity: fail if any .env* file is staged/tracked except .env.example.
ENV_FILES=$( {
  git ls-files
  git diff --cached --name-only --diff-filter=ACMR
} | awk 'NF' | sort -u | grep -E '(^|/)\.env' | grep -vE '(^|/)\.env\.example$' || true )

if [[ -n "$ENV_FILES" ]]; then
  echo "CRITICAL: Sensitive .env files detected in repository/staged changes:"
  printf '%s\n' "$ENV_FILES" | sed 's/^/ - /'
  echo "Only .env.example may be committed."
  exit 1
fi

echo "PASS: No sensitive .env files are staged/tracked."
