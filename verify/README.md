# verify/ — Acceptance-Criteria Verifier for Eden.so

> Inspired by [claudecodecamp.com – "I'm Building Agents That Run While I Sleep"](https://www.claudecodecamp.com/p/i-m-building-agents-that-run-while-i-sleep)

Run browser-based AC verification on any feature branch **without touching the CI server**.  
The whole thing is four shell scripts and two model calls per run.

---

## How the 4-stage pipeline works

```
┌──────────────────┐    ┌───────────────────┐    ┌───────────────────────────────┐    ┌──────────────────┐
│  Stage 1         │    │  Stage 2          │    │  Stage 3                      │    │  Stage 4         │
│  preflight.sh    │───▶│  planner.sh       │───▶│  browser-agent.sh × N         │───▶│  judge.sh        │
│                  │    │                   │    │  (all parallel)               │    │                  │
│  Pure bash       │    │  1 × Opus call    │    │  1 × Sonnet call per AC       │    │  1 × Opus call   │
│  Zero LLM        │    │  Reads spec +     │    │  Each navigates, clicks,      │    │  Reads all       │
│                  │    │  source files     │    │  screenshots the real browser │    │  evidence        │
│  Checks:         │    │                  │    │                               │    │                  │
│  • server up?    │    │  Emits:           │    │  Emits per AC:                │    │  Emits:          │
│  • claude CLI?   │    │  .verify/plan.json│    │  .verify/evidence/AC-N/       │    │  .verify/        │
│  • spec exists?  │    │  (real selectors) │    │    result.json + *.png        │    │  verdict.json    │
│  • git repo?     │    │                   │    │                               │    │                  │
└──────────────────┘    └───────────────────┘    └───────────────────────────────┘    └──────────────────┘
```

**Cost model per run (5 ACs):**
- Stage 1: $0 (bash)
- Stage 2: ~$0.05 (one Opus call, small context)
- Stage 3: ~$0.15 total (5 × Sonnet @ ~$0.03 each)
- Stage 4: ~$0.05 (one Opus call, evidence as input)
- **Total: ~$0.25 per full verification run**

---

## Workflow — commands to run every time

### One-time setup (already done on this machine ✓)
```bash
# claude CLI — already installed at /Users/sunil/.local/bin/claude ✓
# Playwright MCP — already connected (claude mcp list shows it) ✓

chmod +x verify/*.sh   # make scripts executable
```

### Every time you start a new feature

**Step 0 — Write (or copy) a spec BEFORE you build**
```bash
# copy the auth template as a starting point
cp verify/spec/auth.md verify/spec/my-feature.md
# edit it — fill in Task, Changed Files, and AC-1..AC-N
```

**Step 1 — Build the feature with Claude Code (normal interactive session)**
```bash
claude   # interactive mode — build your feature here
```

**Step 2 — Start your dev server (if not already running)**
```bash
npm run dev
# leaves it running in background; verify will talk to http://localhost:5173
```

**Step 3 — Run the full 4-stage pipeline**
```bash
./verify/run.sh verify/spec/my-feature.md
```

That one command runs all four stages in order:
1. Pre-flight (bash checks — no tokens)  
2. Planner (1 Opus call → `.verify/plan.json`)  
3. Browser agents (1 Sonnet per AC, all parallel → `.verify/evidence/`)  
4. Judge (1 Opus call → `.verify/verdict.json`)

**Step 4 — Read the verdict**
```bash
cat .verify/verdict.json          # full JSON with reasoning per AC
# or just look at the console output — it prints a summary table
```

**Step 5 — Fix failures, re-run**
```bash
# fix code in your editor, then re-run the same pipeline:
./verify/run.sh verify/spec/my-feature.md
```

Exit code is `0` if all ACs pass, `1` if anything fails — so CI can block a merge automatically.

---

### Run against the built-in specs (demos)
```bash
./verify/run.sh verify/spec/auth.md       # Google OAuth login page
./verify/run.sh verify/spec/canvas.md     # canvas node create/edit/drag/delete
```

---

## Output structure

```
.verify/
├── plan.json                  ← Planner output (execution plan per AC)
├── verdict.json               ← Judge output (final pass/fail per AC)
└── evidence/
    ├── AC-1/
    │   ├── result.json        ← Agent's step-by-step findings
    │   ├── screenshot-0.png
    │   └── screenshot-1.png
    ├── AC-2/
    │   └── ...
    └── ...
```

---

## Writing your own spec

Copy one of the existing specs and follow the template:

```markdown
# Task
One sentence describing the feature.

## Changed Files
- src/features/my-feature/components/MyComponent.tsx
- src/features/my-feature/stores/myStore.ts

## Acceptance Criteria

### AC-1: What it should do
- Observable behaviour 1 (what the browser sees)
- Observable behaviour 2
- No vague assertions ("it looks right" is not an AC)

### AC-2: Edge case
- Specific observable outcome
```

**Rules for good ACs:**
1. Each AC must be **falsifiable** — it either passes or it doesn't
2. Reference exact **text the user sees**, not implementation details
3. Include the **URL** the agent should start from
4. Cover **error paths**, not just the happy path

---

## Wiring into CI (GitHub Actions)

```yaml
# .github/workflows/verify.yml
name: AC Verification
on: [pull_request]

jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: npm ci
      - run: npx playwright install --with-deps chromium
      - run: npm run dev &
      - run: npx wait-on http://localhost:5173
      - run: ./verify/run.sh verify/spec/auth.md
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
        # --dangerously-skip-permissions needed in headless CI:
        # set CLAUDE_CODE_SKIP_PERMISSIONS=1
```

---

## Swapping models

Edit the `--model` flag in each script:

| Script | Default | Cheaper swap |
|--------|---------|-------------|
| `planner.sh` | `claude-opus-4-6` | `claude-sonnet-4-5` |
| `browser-agent.sh` | `claude-sonnet-4-5` | `claude-haiku-3-5` |
| `judge.sh` | `claude-opus-4-6` | `claude-sonnet-4-5` |

Use Haiku for browser agents if you have many ACs and want to cut cost further.  
Keep Opus for the planner and judge — accuracy there matters most.

---

## Philosophy

> *"You can't trust what an agent produces unless you told it what 'done' looks like before it started."*

The spec file is written **before** you prompt Claude to build the feature.  
That's the only thing that makes the verification meaningful.

If your spec was wrong, the checks will pass even when the feature is wrong.  
What this catches: integration failures, rendering bugs, and behaviour that works in theory but breaks in a real browser.

You review **failures**, not diffs.
