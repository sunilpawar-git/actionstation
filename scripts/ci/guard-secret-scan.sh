#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

# Prefer official scanner when available.
if command -v gitleaks >/dev/null 2>&1; then
  echo "Running gitleaks (full repository scan)..."
  gitleaks git --no-banner --redact .
  echo "PASS: gitleaks found no leaks."
  exit 0
fi

echo "gitleaks not found. Running fallback regex scan across tracked files..."

TRACKED_FILES=$(git ls-files)
PATTERN='(AIza[0-9A-Za-z_-]{35}|gh[pousr]_[A-Za-z0-9_]{20,}|github_pat_[A-Za-z0-9_]{20,}|sk_live_[A-Za-z0-9]{10,}|rk_live_[A-Za-z0-9]{10,}|xox[baprs]-[A-Za-z0-9-]{10,}|-----BEGIN (RSA|EC|OPENSSH|PGP) PRIVATE KEY-----)'

if rg -n --pcre2 "$PATTERN" -- $TRACKED_FILES \
  -g '!**/node_modules/**' \
  -g '!**/dist/**' \
  -g '!**/coverage/**'; then
  echo "CRITICAL: Potential secret detected in tracked files."
  exit 1
fi

echo "PASS: Fallback full-repo secret scan found no issues."
