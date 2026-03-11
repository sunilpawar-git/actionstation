#!/usr/bin/env bash
# =============================================================================
# verify/browser-agent.sh
#
# Stage 3 – ONE Sonnet call per AC, ALL running in parallel.
# Each agent receives its single criterion's steps, drives a real browser via
# Playwright MCP, takes screenshots, and writes evidence to:
#   .verify/evidence/<AC-ID>/result.json
#   .verify/evidence/<AC-ID>/screenshot-*.png
#
# Usage: ./verify/browser-agent.sh <ac-id> <plan-file>
#   e.g.  ./verify/browser-agent.sh AC-1 .verify/plan.json
#
# Parallelism is handled by run.sh (GNU parallel or xargs -P).
# =============================================================================
set -euo pipefail

AC_ID="${1:?Usage: $0 <ac-id> <plan-file>}"
PLAN_FILE="${2:-.verify/plan.json}"

EVIDENCE_DIR=".verify/evidence/${AC_ID}"
mkdir -p "$EVIDENCE_DIR"

# ── Extract this criterion's plan from the JSON ───────────────────────────────
CRITERION=$(node -e "
const raw = require('$PLAN_FILE');
const plan = typeof raw === 'string' ? JSON.parse(raw) : raw;
const criteria = plan.criteria || plan;
const c = criteria.find(x => x.id === '$AC_ID');
if (!c) { console.error('AC not found: $AC_ID'); process.exit(1); }
console.log(JSON.stringify(c, null, 2));
")

DEV_URL=$(node -e "
const raw = require('$PLAN_FILE');
const plan = typeof raw === 'string' ? JSON.parse(raw) : raw;
console.log(plan.devUrl || 'http://localhost:5173');
")

echo "🌐  [$AC_ID] Browser agent starting (claude-sonnet-4-5)…"

# ── One Sonnet call with Playwright MCP tools ─────────────────────────────────
# --mcp-server points to the Playwright MCP binary (adjust path if needed)
claude -p \
  --model claude-sonnet-4-5 \
  --output-format json \
  --mcp-server npx:@playwright/mcp@latest \
  --allowedTools "mcp__playwright__browser_navigate,\
mcp__playwright__browser_click,\
mcp__playwright__browser_type,\
mcp__playwright__browser_snapshot,\
mcp__playwright__browser_take_screenshot,\
mcp__playwright__browser_wait_for,\
mcp__playwright__browser_evaluate,\
mcp__playwright__browser_press_key" \
  "You are a browser QA agent for Eden.so.

## Your single acceptance criterion
$CRITERION

## Dev URL
$DEV_URL

## Instructions
1. Execute each step in the criterion plan.
2. After EVERY significant step, take a screenshot and save it as
   $EVIDENCE_DIR/screenshot-<step>.png  (use browser_take_screenshot).
3. For each assertion step, record whether it PASSED or FAILED with the
   actual value you observed.
4. At the end, return ONLY this JSON (no markdown):
   {
     \"ac_id\": \"$AC_ID\",
     \"description\": \"...\",
     \"passed\": true | false,
     \"steps\": [
       { \"action\": \"...\", \"target\": \"...\", \"result\": \"pass|fail|info\", \"detail\": \"...\"}
     ],
     \"screenshots\": [\"path1.png\", \"path2.png\"],
     \"errors\": []
   }" > "$EVIDENCE_DIR/result.json"

echo "✔  [$AC_ID] Evidence written to $EVIDENCE_DIR/result.json"
