#!/usr/bin/env bash
# =============================================================================
# verify/planner.sh
#
# Stage 2 – ONE Opus call.
# Reads the spec + the changed source files, then emits an execution plan.
#
# Usage: ./verify/planner.sh <spec-file> [dev-url]
# Output: .verify/plan.json
# =============================================================================
set -euo pipefail

SPEC_FILE="${1:?Usage: $0 <spec-file> [dev-url]}"
DEV_URL="${2:-http://localhost:5173}"
PLAN_FILE=".verify/plan.json"
mkdir -p .verify

# ── Collect source files mentioned in the spec ───────────────────────────────
CHANGED_FILES=$(awk '/^## Changed Files/,/^## /' "$SPEC_FILE" \
  | grep '^- ' \
  | sed 's/^- //' \
  | while read -r f; do
      [[ -f "$f" ]] && echo "=== FILE: $f ===" && cat "$f" && echo ""
    done)

SPEC_CONTENT=$(cat "$SPEC_FILE")

echo "🧠  Running planner (claude-opus-4-6)…"

# ── One Opus call via stdin (avoids shell escaping issues) ────────────────────
{
  cat <<'EOF'
You are a QA planner for Eden.so.
For each AC in the spec, produce a browser test plan using real selectors from the source code.

## SPEC FILE:
EOF
  echo "$SPEC_CONTENT"
  
  cat <<'EOF'

## SOURCE CODE:
EOF
  echo "$CHANGED_FILES"
  
  cat <<'EOF'

## YOUR TASK:
Return ONLY valid JSON (no markdown, no intro, no explanation):

{
  "devUrl": "TO_BE_REPLACED_BY_SCRIPT",
  "criteria": [
    {
      "id": "AC-1",
      "description": "description",
      "steps": [
        {"action": "navigate", "target": "/url", "value": null},
        {"action": "screenshot", "target": null, "value": null}
      ]
    }
  ]
}
EOF
} | claude -p --model claude-opus-4-6 --output-format json > "$PLAN_FILE" 2>&1

# Validate
if ! jq . "$PLAN_FILE" &>/dev/null 2>&1; then
  echo "❌ Planner error:"
  cat "$PLAN_FILE"
  exit 1
fi

# Replace placeholder with actual DEV_URL
sed -i.bak "s|TO_BE_REPLACED_BY_SCRIPT|$DEV_URL|g" "$PLAN_FILE" && rm -f "$PLAN_FILE.bak"

echo "✔  Plan written to $PLAN_FILE"
echo ""
echo "Planned criteria:"
jq -r '.criteria[] | "  " + .id + "  " + .description' "$PLAN_FILE"
