#!/usr/bin/env bash
# =============================================================================
# verify/judge.sh
#
# Stage 4 – ONE final Opus call.
# Reads ALL evidence files, weighs them, and returns a per-AC verdict.
#
# Usage: ./verify/judge.sh [spec-file]
# Output: .verify/verdict.json  +  pretty console report
# =============================================================================
set -euo pipefail

SPEC_FILE="${1:-}"
EVIDENCE_GLOB=".verify/evidence/*/result.json"
VERDICT_FILE=".verify/verdict.json"

# ── Gather all evidence into one string ──────────────────────────────────────
EVIDENCE=""
for f in $EVIDENCE_GLOB; do
  [[ -f "$f" ]] || continue
  AC_DIR=$(basename "$(dirname "$f")")
  EVIDENCE+="=== Evidence for $AC_DIR ===\n"
  EVIDENCE+=$(cat "$f")
  EVIDENCE+="\n\n"
done

if [[ -z "$EVIDENCE" ]]; then
  echo "✘  No evidence files found at $EVIDENCE_GLOB"
  echo "   Run browser agents first: ./verify/run.sh <spec-file>"
  exit 1
fi

SPEC_CONTENT=""
[[ -n "$SPEC_FILE" && -f "$SPEC_FILE" ]] && SPEC_CONTENT=$(cat "$SPEC_FILE")

echo "⚖️   Running judge (claude-opus-4-6)…"

# ── One Opus call ─────────────────────────────────────────────────────────────
claude -p --model claude-opus-4-6 \
  --output-format json \
  "You are a QA judge for Eden.so.

## Original acceptance criteria spec
$SPEC_CONTENT

## Browser agent evidence (one JSON block per AC)
$EVIDENCE

## Your job
For each AC in the evidence:
- 'passed'           – all assertions passed, screenshots confirm expected UI
- 'failed'           – at least one assertion failed or an error was thrown
- 'needs-human-review' – conflicting signals, edge case, or screenshot unclear

Be strict: a single failed assertion means the whole AC fails.

Return ONLY this JSON (no markdown, no explanation):
{
  \"summary\": \"X passed, Y failed, Z need review\",
  \"verdicts\": [
    {
      \"id\": \"AC-1\",
      \"status\": \"passed | failed | needs-human-review\",
      \"reasoning\": \"one or two sentences\",
      \"evidence_file\": \".verify/evidence/AC-1/result.json\"
    }
  ]
}" > "$VERDICT_FILE"

echo ""
echo "═══════════════════════════════════════════════"
echo "  VERDICT"
echo "═══════════════════════════════════════════════"

# Pretty-print verdicts from the JSON
node -e "
const raw = require('./.verify/verdict.json');
const data = typeof raw === 'string' ? JSON.parse(raw) : raw;
const icons = { passed: '✅', failed: '❌', 'needs-human-review': '⚠️ ' };
console.log('  ' + (data.summary || ''));
console.log('');
(data.verdicts || []).forEach(v => {
  const icon = icons[v.status] || '?';
  console.log(icon + '  ' + v.id + '  ' + v.status.toUpperCase());
  console.log('   ' + v.reasoning);
  console.log('');
});
"

echo "Full verdict saved to: $VERDICT_FILE"
