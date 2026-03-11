# BEGINNER'S GUIDE — Acceptance Criteria Verification for Eden.so

> **For new interns who want to use the verify system without confusion.**

---

## What is this system doing? (5 min read)

### The problem it solves
When you (or Claude) build a feature, how do you know it actually works? You could:
- ❌ Open the app and click around manually (slow, error-prone)
- ❌ Write unit tests that test your own code (they'll pass even if you misunderstood the spec)
- ✅ Write down what "correct" looks like **before** building, then have a robot check it in a real browser

That's what this system does.

### The three things you need to know

1. **Acceptance Criteria (AC)** — plain English describing what should happen
   - Example: "When user clicks login button, they are redirected to /dashboard"
   - Not implementation details, just observable behavior

2. **Dev server** — your app running on http://localhost:5173
   - The browser agents will navigate here and click around

3. **claude CLI** — command-line tool that runs Claude in headless mode
   - Already installed on this machine ✓
   - Playwright MCP is connected ✓

---

## The workflow (for interns)

### Timeline

```
Day 1: You get assigned a feature
  ↓
Day 1 afternoon: You write the AC spec (30 min)
  ↓
Day 2 morning: You build the feature in Claude Code (2-3 hours)
  ↓
Day 2 afternoon: You run the verifier (1 command, takes 2 min)
  ↓
Day 3: Fix any failures and re-run (repeat until green)
```

---

## Your actual to-do list (copy-paste these commands)

### Setup (Day 1, do this once)

```bash
cd /Users/sunil/Downloads/Eden.so

# Make scripts runnable
chmod +x verify/*.sh

# Check that everything is installed (should all show ✓)
bash verify/preflight.sh verify/spec/auth.md
```

If all 6 checks pass, **you're ready.**

---

### Every time you work on a feature

#### **Phase 1 — Before you build (30 minutes)**

```bash
# Go to the root of the project
cd /Users/sunil/Downloads/Eden.so

# Copy the template spec
cp verify/spec/auth.md verify/spec/my-cool-feature.md

# Open it in your editor and fill it in
# You need:
#   1. A one-sentence Task description
#   2. List of files you'll change
#   3. 4-5 acceptance criteria (each one should be falsifiable)
```

**Example of what you write:**

```markdown
# Task
Add a "favorite" button to each canvas node

## Changed Files
- src/features/canvas/components/CanvasNode.tsx
- src/features/canvas/services/nodeService.ts

## Acceptance Criteria

### AC-1: Favorite button appears
- Each node shows a star icon (role=button)
- The button text says "Add to favorites"

### AC-2: Clicking favorite changes the star color
- Initially the star is gray (unfilled)
- After clicking, the star is yellow (filled)
- The text changes to "Remove from favorites"

### AC-3: Favorites persist
- After closing and reopening the app, the favorite status is still there
```

**That's it.** Stop here. Don't build yet.

---

#### **Phase 2 — Build the feature (2-4 hours)**

```bash
# Start Claude Code interactive session
claude

# In Claude Code, describe your task:
# "Build the feature described in verify/spec/my-cool-feature.md
#  The AC file shows exactly what should happen."

# Claude will build it. Review the code. Make sure it follows your spec.
# When it looks good, exit Claude (Cmd+C or type 'exit')
```

---

#### **Phase 3 — Verify it works (2 minutes)**

```bash
# Make sure the dev server is running (if not already)
npm run dev
# Let it start, you'll see "VITE v X.X.X ready in XXX ms"

# In a NEW terminal window, run the verifier
cd /Users/sunil/Downloads/Eden.so
./verify/run.sh verify/spec/my-cool-feature.md
```

**This single command:**
1. Checks your dev server is up (bash)
2. Reads your spec + changed files, makes a plan (Opus AI call)
3. Launches browser agents to test each AC in parallel (Sonnet AI calls)
4. Judges all the evidence (Opus AI call)
5. Prints a report

**You'll see output like:**

```
╔══════════════════════════════════════════════╗
║   Eden.so  ·  Acceptance Criteria Verifier   ║
╚══════════════════════════════════════════════╝

▶  Stage 1/4  Pre-flight
✔  All checks passed. Proceeding to planner.

▶  Stage 2/4  Planner (Opus)
🧠  Running planner...
✔  Plan written to .verify/plan.json
Planned criteria:
  AC-1  Favorite button appears
  AC-2  Clicking favorite changes the star color
  AC-3  Favorites persist

▶  Stage 3/4  Browser agents (Sonnet, parallel)
Launching 3 parallel agents: AC-1 AC-2 AC-3
🌐  [AC-1] Browser agent starting...
🌐  [AC-2] Browser agent starting...
🌐  [AC-3] Browser agent starting...
✔  [AC-1] Evidence written...
✔  [AC-2] Evidence written...
✔  [AC-3] Evidence written...

▶  Stage 4/4  Judge (Opus)
⚖️   Running judge...

═══════════════════════════════════════════════
  VERDICT
═══════════════════════════════════════════════
  3 passed, 0 failed, 0 need review

✅  AC-1  PASSED
   The favorite button appears with the correct star icon and text.

✅  AC-2  PASSED
   Clicking the button changes the star from gray to yellow.

✅  AC-3  PASSED
   Favorites persist after page reload.

✅  All criteria passed. Safe to merge.
```

---

#### **Phase 4 — If it failed (repeat)**

```bash
# If you saw ❌ or ⚠️ in the verdict, something didn't work.

# Read the failure reason in the output.
# Look at the screenshot evidence: .verify/evidence/AC-N/screenshot-*.png

# Fix the code in your editor (or ask Claude to fix it)

# Run the verifier again
./verify/run.sh verify/spec/my-cool-feature.md

# Repeat until all ACs are green ✅
```

---

## Real examples to try NOW

You have two working examples already built:

### Example 1: Login page (Google OAuth)
```bash
cd /Users/sunil/Downloads/Eden.so
npm run dev   # (keep running in background)

# New terminal:
./verify/run.sh verify/spec/auth.md
```

### Example 2: Canvas node editing
```bash
# Same terminal:
./verify/run.sh verify/spec/canvas.md
```

Both should pass (they're demo specs for already-working features).

---

## What does each file do? (reference)

```
verify/
├── README.md                 ← Full technical docs (you don't need this yet)
├── preflight.sh              ← Checks: is server up? is claude installed?
├── planner.sh                ← Reads your spec + code, makes a test plan (Opus)
├── browser-agent.sh          ← Drives the browser for ONE AC (Sonnet)
├── judge.sh                  ← Reads all evidence, makes a verdict (Opus)
├── run.sh                    ← The magic button — runs all 4 above
└── spec/
    ├── auth.md               ← Example: Google login spec
    ├── canvas.md             ← Example: canvas node spec
    └── my-cool-feature.md    ← Your custom spec goes here
```

---

## Troubleshooting (if something goes wrong)

### "Dev server not reachable"
```bash
# Make sure you ran npm run dev and it's still running
npm run dev
```

### "claude CLI not found"
```bash
# It's already installed at /Users/sunil/.local/bin/claude
# If somehow missing:
npm install -g @anthropic-ai/claude-code
```

### "AC failed but I don't know why"
```bash
# Look at the screenshots the agent took
ls -la .verify/evidence/AC-1/screenshot-*.png

# Open them and see what the browser actually saw vs. what you expected
```

### "I got a token timeout error"
This means Claude ran out of time. Try:
1. Simplify your spec (fewer ACs)
2. Reduce the number of "steps" per AC
3. Use a faster model (edit the scripts' `--model` flags)

---

## Cost (approximately)

Each full run costs:
- 1× Opus call (planner): **$0.02**
- N× Sonnet calls (browser agents): **$0.03 each**
- 1× Opus call (judge): **$0.02**

For 5 ACs: **~$0.25 per run**

So you can run this **100 times** for the cost of a single cloud deployment.

---

## Gold rules (so you don't get stuck)

1. **Write the spec BEFORE building** — this is the whole point
2. **Keep ACs falsifiable** — "it looks good" is not an AC
3. **Keep it simple** — 4-5 ACs per spec is plenty
4. **Check the screenshots** — they tell you what the browser actually saw
5. **Dev server must stay running** — in a separate terminal
6. **One `./verify/run.sh` at a time** — don't run it twice simultaneously

---

## Next steps

1. **Today:** Run the examples
   ```bash
   npm run dev
   ./verify/run.sh verify/spec/auth.md
   ./verify/run.sh verify/spec/canvas.md
   ```

2. **Tomorrow:** Write your own spec for a small feature (30 min)

3. **Tomorrow afternoon:** Build it with Claude Code, then verify

4. **Day 3:** Fix any failures, re-run until green

---

## Questions?

Check [README.md](README.md) for the full technical docs.

Or just run:
```bash
./verify/run.sh verify/spec/auth.md
```

and watch what happens — the output is designed to be self-explanatory.
