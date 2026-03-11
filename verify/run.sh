#!/usr/bin/env bash
# =============================================================================
# verify/run.sh
#
# Top-level orchestrator — wires all 4 stages together.
#
# Usage:
#   ./verify/run.sh verify/spec/auth.md
#   ./verify/run.sh verify/spec/canvas.md http://localhost:5174
#
# Requires: claude CLI, npx playwright, node, curl, git
# =============================================================================
set -euo pipefail

SPEC_FILE="${1:?Usage: $0 <spec-file> [dev-url]}"
DEV_URL="${2:-http://localhost:5173}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

bold()  { echo -e "\033[1m$*\033[0m"; }
dim()   { echo -e "\033[2m$*\033[0m"; }
green() { echo -e "\033[0;32m$*\033[0m"; }
red()   { echo -e "\033[0;31m$*\033[0m"; }

bold "╔══════════════════════════════════════════════╗"
bold "║   Eden.so  ·  Acceptance Criteria Verifier   ║"
bold "╚══════════════════════════════════════════════╝"
dim  "Spec: $SPEC_FILE"
dim  "URL:  $DEV_URL"
echo ""

# ── Clean previous run ────────────────────────────────────────────────────────
rm -rf .verify/evidence .verify/plan.json .verify/verdict.json
mkdir -p .verify/evidence

# ─────────────────────────────────────────────────────────────────────────────
# STAGE 1 – Pre-flight  (pure bash, no LLM)
# ─────────────────────────────────────────────────────────────────────────────
bold "▶  Stage 1/4  Pre-flight"
bash "$SCRIPT_DIR/preflight.sh" "$SPEC_FILE" "$DEV_URL"
echo ""

# ─────────────────────────────────────────────────────────────────────────────
# STAGE 2 – Planner  (1 × Opus call)
# ─────────────────────────────────────────────────────────────────────────────
bold "▶  Stage 2/4  Planner (Opus)"
bash "$SCRIPT_DIR/planner.sh" "$SPEC_FILE" "$DEV_URL"
echo ""

# ─────────────────────────────────────────────────────────────────────────────
# STAGE 3 – Browser agents  (1 × Sonnet per AC, all parallel)
# ─────────────────────────────────────────────────────────────────────────────
bold "▶  Stage 3/4  Browser agents (Sonnet, parallel)"

# Extract AC ids from the plan
AC_IDS=$(node -e "
const raw = require('./.verify/plan.json');
const plan = typeof raw === 'string' ? JSON.parse(raw) : raw;
const criteria = plan.criteria || plan;
criteria.forEach(c => console.log(c.id));
")

AC_COUNT=$(echo "$AC_IDS" | wc -l | tr -d ' ')
dim "  Launching $AC_COUNT parallel agents: $(echo "$AC_IDS" | tr '\n' ' ')"
echo ""

# Run all agents in parallel, collect PIDs
declare -A PIDS
for AC_ID in $AC_IDS; do
  bash "$SCRIPT_DIR/browser-agent.sh" "$AC_ID" ".verify/plan.json" &
  PIDS[$AC_ID]=$!
done

# Wait for all agents, track failures
AGENT_FAILURES=0
for AC_ID in "${!PIDS[@]}"; do
  if ! wait "${PIDS[$AC_ID]}"; then
    red "  ✘  Agent for $AC_ID failed"
    AGENT_FAILURES=$((AGENT_FAILURES+1))
  fi
done

echo ""
if [[ $AGENT_FAILURES -gt 0 ]]; then
  red "$AGENT_FAILURES agent(s) crashed — partial evidence may still be judged"
else
  green "All $AC_COUNT agents completed"
fi
echo ""

# ─────────────────────────────────────────────────────────────────────────────
# STAGE 4 – Judge  (1 × Opus call)
# ─────────────────────────────────────────────────────────────────────────────
bold "▶  Stage 4/4  Judge (Opus)"
bash "$SCRIPT_DIR/judge.sh" "$SPEC_FILE"
echo ""

# ─────────────────────────────────────────────────────────────────────────────
# Exit code: 0 = all passed, 1 = failures or needs-human-review
# ─────────────────────────────────────────────────────────────────────────────
OUTCOME=$(node -e "
const raw = require('./.verify/verdict.json');
const data = typeof raw === 'string' ? JSON.parse(raw) : raw;
const bad = (data.verdicts || []).filter(v => v.status !== 'passed');
process.exit(bad.length > 0 ? 1 : 0);
" 2>/dev/null && echo "ok" || echo "fail")

if [[ "$OUTCOME" == "ok" ]]; then
  green "✅  All criteria passed. Safe to merge."
  exit 0
else
  red "❌  Some criteria failed or need review. See .verify/verdict.json"
  exit 1
fi
