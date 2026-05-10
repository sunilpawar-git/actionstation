#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

SSOT_FILE="src/features/knowledgeBank/services/geminiClient.ts"

echo "=== Gate: VITE_GEMINI_API_KEY must only appear in SSOT ==="
KEY_VIOLATIONS=$(rg -n "VITE_GEMINI_API_KEY" src \
  -g '!**/__tests__/**' \
  -g '!**/test/**' \
  -g '!src/vite-env.d.ts' \
  -g "!$SSOT_FILE" \
  || true)

if [[ -n "$KEY_VIOLATIONS" ]]; then
  echo "SECURITY VIOLATION: VITE_GEMINI_API_KEY found outside SSOT file."
  printf '%s\n' "$KEY_VIOLATIONS" | sed 's/^/ - /'
  exit 1
fi

echo "=== Gate: Direct Gemini API URL must only appear in SSOT ==="
URL_VIOLATIONS=$(rg -n "generativelanguage.googleapis.com" src \
  -g '!**/__tests__/**' \
  -g '!**/test/**' \
  -g "!$SSOT_FILE" \
  || true)

if [[ -n "$URL_VIOLATIONS" ]]; then
  echo "SECURITY VIOLATION: Direct Gemini URL found outside SSOT file."
  printf '%s\n' "$URL_VIOLATIONS" | sed 's/^/ - /'
  exit 1
fi

echo "=== Gate: No hardcoded Google API keys ==="
HARDCODED_KEYS=$(rg -n --pcre2 "AIza[0-9A-Za-z_-]{35}" src \
  -g '!**/__tests__/**' \
  -g '!**/test/**' \
  || true)

if [[ -n "$HARDCODED_KEYS" ]]; then
  echo "CRITICAL: Hardcoded Google API key detected."
  printf '%s\n' "$HARDCODED_KEYS" | sed 's/^/ - /'
  exit 1
fi

echo "PASS: API key isolation guards passed."
