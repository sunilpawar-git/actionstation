#!/usr/bin/env bash
# =============================================================================
# verify/preflight.sh
#
# Stage 1 – Pure bash, zero LLM calls.
# Fail fast before spending any tokens.
# Usage: ./verify/preflight.sh <spec-file> [dev-server-url]
# =============================================================================
set -euo pipefail

SPEC_FILE="${1:-}"
DEV_URL="${2:-http://localhost:5173}"
PASS=0
FAIL=0

green()  { echo -e "\033[0;32m✔  $*\033[0m"; }
red()    { echo -e "\033[0;31m✘  $*\033[0m"; }
bold()   { echo -e "\033[1m$*\033[0m"; }

bold "━━━  Eden.so / verify – Pre-flight checks  ━━━"
echo ""

# ── 1. Spec file exists ──────────────────────────────────────────────────────
if [[ -z "$SPEC_FILE" ]]; then
  red "No spec file supplied.  Usage: $0 <spec-file>"
  FAIL=$((FAIL+1))
elif [[ ! -f "$SPEC_FILE" ]]; then
  red "Spec file not found: $SPEC_FILE"
  FAIL=$((FAIL+1))
else
  green "Spec file exists: $SPEC_FILE"
  PASS=$((PASS+1))
fi

# ── 2. Dev server is reachable ───────────────────────────────────────────────
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-time 3 "$DEV_URL" 2>/dev/null || echo "000")
if [[ "$HTTP_STATUS" == "200" || "$HTTP_STATUS" == "304" ]]; then
  green "Dev server is up: $DEV_URL (HTTP $HTTP_STATUS)"
  PASS=$((PASS+1))
else
  red "Dev server not reachable at $DEV_URL (HTTP $HTTP_STATUS) — run: npm run dev"
  FAIL=$((FAIL+1))
fi

# ── 3. claude CLI is installed ───────────────────────────────────────────────
if command -v claude &>/dev/null; then
  green "claude CLI found: $(command -v claude)"
  PASS=$((PASS+1))
else
  red "claude CLI not found.  Install via: npm install -g @anthropic-ai/claude-code"
  FAIL=$((FAIL+1))
fi

# ── 4. Playwright MCP is available ──────────────────────────────────────────
if npx playwright --version &>/dev/null 2>&1; then
  green "Playwright available: $(npx playwright --version 2>/dev/null)"
  PASS=$((PASS+1))
else
  red "Playwright not found.  Install via: npx playwright install"
  FAIL=$((FAIL+1))
fi

# ── 5. Evidence output dir is writable ───────────────────────────────────────
EVIDENCE_DIR=".verify/evidence"
mkdir -p "$EVIDENCE_DIR" 2>/dev/null || true
if [[ -w "$EVIDENCE_DIR" ]]; then
  green "Evidence dir writable: $EVIDENCE_DIR"
  PASS=$((PASS+1))
else
  red "Cannot write to $EVIDENCE_DIR"
  FAIL=$((FAIL+1))
fi

# ── 6. Git: changed files are tracked ────────────────────────────────────────
if git rev-parse --is-inside-work-tree &>/dev/null; then
  CHANGED=$(git diff --name-only HEAD 2>/dev/null | wc -l | tr -d ' ')
  green "Git repo detected. $CHANGED file(s) changed since HEAD"
  PASS=$((PASS+1))
else
  red "Not inside a git repository"
  FAIL=$((FAIL+1))
fi

# ── Summary ──────────────────────────────────────────────────────────────────
echo ""
bold "Pre-flight: $PASS passed, $FAIL failed"
echo ""
if [[ $FAIL -gt 0 ]]; then
  red "Aborting pipeline — fix failures above before spending tokens."
  exit 1
fi
green "All checks passed. Proceeding to planner."
