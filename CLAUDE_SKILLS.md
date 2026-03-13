# Claude Code Custom Skills

This project includes custom Claude Code skills to automate development workflows and enforce CLAUDE.md standards.

## Available Skills

### 1. `/test` — Test Runner
Run Vitest for specific files, directories, or patterns.

```bash
/test                           # Run all tests
/test IdeaCard                  # Run tests matching "IdeaCard"
/test src/features/canvas       # Run tests in directory
/test --watch                   # Watch mode
/test --coverage                # Coverage report
```

**Location**: `.claude/skills/test/SKILL.md`

---

### 2. `/lint-fix` — ESLint Runner
Identify and fix code style violations.

```bash
/lint-fix                       # Lint entire project
/lint-fix src/features/canvas   # Lint a directory
/lint-fix --fix                 # Auto-fix violations
```

**Enforces**:
- ✓ No hardcoded strings (use `strings.ts`)
- ✓ No hardcoded colors (use CSS variables)
- ✓ Zustand selector pattern (no bare destructuring)
- ✓ React.memo for custom nodes
- ✓ No floating promises

**Location**: `.claude/skills/lint-fix/SKILL.md`

---

### 3. `/typecheck` — TypeScript Compiler
Run type checking without emitting JavaScript.

```bash
/typecheck                      # Check entire project
/typecheck --noEmit             # Check without JS output (faster)
/typecheck --listFiles          # Show all analyzed files
```

**Catches**:
- Missing type annotations
- Type mismatches
- Property access on wrong types
- Async/await chain errors

**Location**: `.claude/skills/typecheck/SKILL.md`

---

### 4. `/build` — Complete Build Pipeline
Run types + lint + tests + build (what CI does).

```bash
/build                          # Full pipeline
/build --quick                  # Skip tests (for quick feedback)
```

**Pipeline**:
1. TypeScript type check
2. ESLint (zero errors, ≤49 warnings)
3. Vitest (all tests pass)
4. Vite build

**Status**: ✓ Ready to push if all stages pass

**Location**: `.claude/skills/build/SKILL.md`

---

### 5. `/review` — Code Quality Audit
Review files for CLAUDE.md compliance and code quality.

```bash
/review                         # Review last commit changes
/review src/features/canvas     # Review specific directory
/review SomeFile.tsx            # Review specific file
```

**Checks**:
- ✓ File size ≤ 300 lines
- ✓ Function size ≤ 50 lines
- ✓ Component size ≤ 100 lines
- ✓ Hook size ≤ 75 lines
- ✓ All strings from `strings.ts`
- ✓ All CSS via variables
- ✓ React.memo on custom nodes
- ✓ Zustand selectors (no bare destructuring)
- ✓ Test coverage adequate
- ✓ Security (no hardcoded secrets)

**Location**: `.claude/skills/review/SKILL.md`

---

### 6. `/ci` — GitHub Actions Simulator
Simulate the GitHub CI pipeline locally before pushing.

```bash
/ci                             # Run complete pipeline
/ci --fast                      # Skip tests (quick feedback)
/ci --from typecheck            # Resume from specific stage
```

**What It Does**:
1. Type check (npx tsc)
2. Lint (npm run lint)
3. Test (npx vitest run)
4. Build (npm run build)

**Why Run It**: Catch CI failures locally in ~45 seconds instead of waiting 3-5 minutes on GitHub.

**Location**: `.claude/skills/ci/SKILL.md`

### 7. `/css-migrate` — CSS Module → Tailwind Migrator
Migrate a single component's `.module.css` to Tailwind CSS utilities. Only invoke when you are already modifying the component's `.tsx` during production work.

```bash
/css-migrate src/features/onboarding/components/HelpButton
/css-migrate src/app/components/OfflineBanner
/css-migrate src/features/search/components/SearchBar
```

**What It Does**:
- Converts every CSS rule to equivalent Tailwind utility classes
- Replaces all `styles.x` references in the TSX with inline `className` strings
- Deletes the `.module.css` file and removes the `import styles` line
- Uses `var(--color-*)` arbitrary syntax to preserve theme switching

**Rules Enforced**:
- ✓ All-in or nothing: whole `.module.css` migrated at once
- ✓ No Tailwind built-in palette colors (`bg-blue-500` → `bg-[var(--color-primary)]`)
- ✓ `variables.css`, theme files, `global.css` are never touched
- ✓ Canvas components (`IdeaCard`, `CanvasView`, etc.) skipped — too complex
- ✓ Runs lint + typecheck after migration to verify

**Location**: `.claude/skills/css-migrate/SKILL.md`

---



### Option 1: For Your Machine (Project-Level)

Skills are already set up in `.claude/skills/` in your local repo. They're project-specific and won't sync to GitHub (`.claude/` is in `.gitignore`).

**No setup required!** Just use the skills:

```bash
/test                           # Start using immediately
/lint-fix
/build
/review
/ci
```

### Option 2: Share Skills with Team (Organization-Level)

To share skills across all projects:

1. Copy skill files to organization directory:
```bash
mkdir -p ~/.claude/skills/{test,lint-fix,typecheck,build,review,ci}
cp .claude/skills/*/SKILL.md ~/.claude/skills/*/
```

2. Skills are now available in **all** your Claude Code projects.

### Option 3: Disable a Skill

To prevent a skill from running:

```bash
# Rename SKILL.md to disable
mv .claude/skills/test/SKILL.md .claude/skills/test/SKILL.md.disabled

# Or delete
rm -rf .claude/skills/test
```

---

## Usage Workflow

### Before Starting Work

```bash
/ci --fast          # Quick check: types + lint + build (skip tests)
```

### During Development

```bash
/test --watch       # Run tests matching your changes in watch mode
/lint-fix           # Check and fix lint violations as you go
```

### Before Committing

```bash
/review             # Review your changes for CLAUDE.md compliance
/build              # Run full pipeline (types + lint + tests + build)
```

### Before Pushing

```bash
/ci                 # Simulate GitHub Actions locally
                    # If it passes, safe to push!
```

---

## Integration with CLAUDE.md

These skills enforce **all** rules from `CLAUDE.md`:

| Rule | Skill(s) Enforcing |
|------|-------------------|
| File size ≤ 300 lines | `/review`, `/build` |
| Function size ≤ 50 lines | `/review` |
| Component size ≤ 100 lines | `/review` |
| Hook size ≤ 75 lines | `/review` |
| No hardcoded strings | `/lint-fix`, `/review` |
| No hardcoded colors | `/lint-fix`, `/review` |
| Zustand selector pattern | `/lint-fix`, `/review` |
| React.memo on custom nodes | `/lint-fix`, `/review` |
| No floating promises | `/lint-fix` |
| Test coverage ≥ minimum | `/test`, `/build` |
| Type safety | `/typecheck`, `/build` |
| Code quality | `/lint-fix`, `/build` |
| No mixed CSS Module + Tailwind | `/review`, `/css-migrate` |
| No new `.module.css` files | `/review` |
| Tailwind uses `var(--color-*)` | `/review`, `/css-migrate` |

---

## Troubleshooting

### Skill Not Appearing

1. Verify file exists: `ls .claude/skills/test/SKILL.md`
2. Check format: SKILL.md must be exactly `SKILL.md` (case-sensitive)
3. Restart Claude Code session (they cache on startup)
4. Type `/` to see all available skills

### Skill Not Executing

1. Check `disable-model-invocation: true` - these skills are manually invoked only
2. Verify `allowed-tools: Bash(...)` includes the command you need
3. Check npm scripts exist: `npm run --list` to verify targets

### Test/Lint/Build Failures

1. Read error message carefully (shows file:line)
2. Fix the issue locally
3. Re-run the skill: `/test` → fix → `/build`

---

## Examples

### Complete Development Session

```bash
# Morning: Verify everything works
/ci --fast

# Implement feature
/test --watch          # Keep tests running in background

# Before commit
/review                # Audit code
/build                 # Full verification

# Before push
/ci                    # Final check simulating GitHub Actions
git push origin feature/intmoat
```

### Quick Feedback Loop

```bash
# Make change
vim src/App.tsx

# Check syntax
/lint-fix

# Run related tests
/test App

# Review changes
/review

# Re-verify
/typecheck
```

### Debugging a Failing Test

```bash
# Run tests in watch mode
/test IdeaCard --watch

# Edit test or code
# Watch mode auto-reruns

# Exit watch mode (Ctrl+C)
# Run full suite
/build
```

---

## FAQ

**Q: Can I add more skills?**
A: Yes! Create `.claude/skills/my-skill/SKILL.md` following the same format. See `.claude/skills/review/SKILL.md` for a complex example.

**Q: Will these sync to GitHub?**
A: No, `.claude/` is in `.gitignore`. Skills are personal to your machine (like `.vscode` settings).

**Q: Can I share skills across my team?**
A: Yes, copy to `~/.claude/skills/` (organization-level) or document in CLAUDE_SKILLS.md for team setup.

**Q: Do skills work offline?**
A: Yes! They just run local commands (npm, git, etc.). No internet needed.

**Q: What's the difference between `/test` and `/build`?**
A: `/test` runs only tests. `/build` runs the complete CI pipeline (types → lint → tests → build). Use `/build` before pushing.

---

## Related

- [CLAUDE.md](./CLAUDE.md) — Project standards and architecture
- [GitHub Workflows](./.github/workflows/) — Actual CI/CD pipelines on GitHub
- [Package.json](./package.json) — npm scripts that skills invoke

---

**Last Updated**: 2026-03-06
**Skills Version**: 1.0
**Supported**: Claude Code CLI with custom skills support
