#!/usr/bin/env bash
# ============================================================================
# verify/quick-start.sh
#
# One-liner onboarding for new interns
# Run this once, then follow the prompts
# ============================================================================
set -euo pipefail

green()  { echo -e "\033[0;32m✔  $*\033[0m"; }
red()    { echo -e "\033[0;31m✘  $*\033[0m"; }
bold()   { echo -e "\033[1m$*\033[0m"; }
yellow() { echo -e "\033[1;33m⚠️   $*\033[0m"; }

bold "╔════════════════════════════════════════════════╗"
bold "║   Welcome to Eden.so AC Verification           ║"
bold "║   (Beginner-friendly onboarding)              ║"
bold "╚════════════════════════════════════════════════╝"
echo ""

# Check setup
echo "Checking setup..."
bash verify/preflight.sh verify/spec/auth.md http://localhost:5173 > /tmp/preflight.log 2>&1 || {
  cat /tmp/preflight.log
  echo ""
  red "Setup check failed. Did you run 'npm run dev' in another terminal?"
  exit 1
}

green "Setup looks good!"
echo ""

# Show the workflow
bold "Here's your workflow:"
echo ""
echo "  1️⃣   Write AC spec in verify/spec/my-feature.md (copy auth.md as template)"
echo "  2️⃣   Build in Claude Code interactive session (claude)"
echo "  3️⃣   Run this to verify:  ./verify/run.sh verify/spec/my-feature.md"
echo "  4️⃣   Fix failures, re-run until green ✅"
echo ""

# Offer to run a demo
bold "Want to see it in action?"
echo ""
echo "Try one of these:"
echo ""
echo "  ./verify/run.sh verify/spec/auth.md       # Google login demo"
echo "  ./verify/run.sh verify/spec/canvas.md     # Canvas editing demo"
echo ""

bold "Full beginners guide:"
echo "  cat verify/BEGINNER_GUIDE.md"
echo ""

green "You're ready to go! 🚀"
