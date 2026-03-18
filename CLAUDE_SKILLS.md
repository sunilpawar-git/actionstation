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

---

## Production Hardening Checklist (Sprint — Mar 17 2026)

All items below are permanently complete. Do not revert.

```
✅ npm audit: 0 vulnerabilities (was 12 HIGH/MODERATE)
✅ CI audit gate: npm audit --audit-level=high blocks build on new vulns
✅ Security headers: HSTS, X-Frame-Options, CSP, Referrer-Policy,
                   Permissions-Policy, X-Content-Type-Options in firebase.json
✅ CSP: HTTP header only (not meta tag). frame-ancestors 'none' enforced
✅ VITE_GOOGLE_CLIENT_ID: in REQUIRED_VARS, deploy.yml, GitHub Secrets
✅ VITE_CLOUD_FUNCTIONS_URL: in REQUIRED_VARS, deploy.yml, GitHub Secrets
✅ VITE_GEMINI_API_KEY: absent from deploy.yml (prod-safe)
✅ KnowledgeBankPanel: React.lazy chunk (~20 KB separated)
✅ AI injection patterns: 12+ obfuscated variants (no Cyrillic false-positives)
✅ /health endpoint: deployed to us-central1-actionstation-244f0.cloudfunctions.net
✅ Firestore daily backup: scheduled export → actionstation-244f0-backups GCS bucket
✅ Build artifacts: removed from git (dist-node/, *.tsbuildinfo, wave6-*.png)
✅ Test suite: 5050/5050 green after all hardening changes
```

### Live verification commands
```bash
# Confirm headers are live
curl -sI https://actionstation-244f0.web.app | grep -i "strict-transport\|x-frame\|content-security\|referrer\|permissions\|x-content"

# Confirm health endpoint
curl -s https://us-central1-actionstation-244f0.cloudfunctions.net/health

# Confirm 0 vulns
npm audit

# Full test suite
npm run check
```

---

## Advanced Security Hardening Checklist (Sprint — Mar 17 2026)

All items below are permanently complete. Do not remove or bypass.

```
✅ securityLogger.ts:      structured JSON → Cloud Logging, WARNING/ERROR/CRITICAL routing
                           labels.eden_security=true on all entries
✅ botDetector.ts:         24 scanner UAs (sqlmap/nikto/masscan/nuclei/Burp/ZAP/curl/wget…)
                           6 headless browser patterns (HeadlessChrome/Playwright/Puppeteer…)
                           heuristic: wildcard Accept + no Accept-Language
✅ ipRateLimiter.ts:       per-IP sliding window, 30 req/min Gemini
                           Firestore-backed (production), in-memory (tests)
                           stops multi-account distributed abuse
✅ promptFilter.ts:        14 injection patterns (DAN/jailbreak/[SYSTEM]/<|im_start|>/ignore…)
                           5 exfiltration patterns (print API key / reveal system prompt…)
                           50k/100k char limits per-part and total
                           output scan: GCP API keys, Bearer tokens, private key fragments
✅ fileUploadValidator.ts: magic-byte detection (PNG/JPEG/GIF/WEBP/PDF/ZIP/GZ/RAR/7Z/ELF/PE)
                           archive hard-block (zip bomb vector)
                           polyglot detection (archive/executable disguised as image)
                           MIME mismatch block
                           30 dangerous extensions blocked (.exe/.sh/.php/.py/.ps1…)
                           per-type size limits (text 1 MB, image 10 MB, PDF 20 MB)
✅ threatMonitor.ts:       429 spike (50/min), 500 spike (20/min),
                           auth failure (30/min), bot (10/min) → CRITICAL log alert
✅ geminiProxy.ts:         all 6 layers wired: bot→IP→auth→user-rate→body→prompt→token→output
✅ securityConstants.ts:   IP_RATE_LIMIT=120, IP_RATE_LIMIT_GEMINI=30, UPLOAD_MAX_BODY_BYTES
✅ Tests:                  225/225 passing, tsc clean
```

### Cloud Monitoring alert setup (manual — one-time in GCP Console)

```
Log filter: jsonPayload.labels.eden_security="true" AND severity>="ERROR"
Notification channel: email / PagerDuty / Slack webhook
Threshold: any single occurrence
```

### Remaining gaps — ALL RESOLVED ✅

| Gap | Resolution |
|---|---|
| ~~WAF~~ | ✅ `scripts/setup-cloud-armor.sh` — OWASP CRS + LB + NEGs |
| ~~Turnstile / reCAPTCHA~~ | ✅ `functions/src/verifyTurnstile.ts` + `utils/captchaValidator.ts` |
| ~~Immutable backups~~ | ✅ `scripts/setup-immutable-backups.sh` — 30-day GCS retention |

---

## WAF / CAPTCHA / Immutable Backups Checklist (Sprint — Mar 17 2026)

All items below are permanently complete. Do not remove or bypass.

```
✅ captchaValidator.ts:    verifyTurnstileToken() + verifyRecaptchaToken() shared utility
                           Turnstile: POST /siteverify → CaptchaResult { success, errorCodes }
                           reCAPTCHA v3: action mismatch detection, score < 0.5 → blocked
✅ verifyTurnstile.ts:     POST /verifyTurnstile Cloud Function
                           IP rate-limit: IP_RATE_LIMIT_CAPTCHA = 10 req/min
                           Logs CAPTCHA_FAILED to Cloud Logging on failure
                           TURNSTILE_SECRET held in Secret Manager (never in code)
✅ CAPTCHA_FAILED:         New SecurityEventType in securityLogger.ts
✅ IP_RATE_LIMIT_CAPTCHA:  New constant (10) in securityConstants.ts
✅ functions/src/index.ts: verifyTurnstile exported
✅ setup-cloud-armor.sh:   8 OWASP CRS v3.3 rule sets (SQLi/XSS/LFI/RFI/RCE/scanner/protocol/method)
                           IP rate-limit rule: 100 req/min per IP → 5-min ban
                           Serverless NEGs for all 9 Cloud Run services
                           Backend services with Cloud Armor policy attached
                           HTTPS LB + URL-map path routing + Google-managed SSL cert
✅ setup-immutable-backups.sh:
                           New bucket: actionstation-244f0-firestore-backups-immutable
                           30-day GCS object retention policy
                           Object versioning (non-current → deleted after 90 days)
                           Optional irrevocable retention lock
                           SA write access granted
✅ firestoreBackup.ts:     Updated JSDoc with immutable bucket migration path + restore command
✅ TypeScript build:       tsc clean, 0 errors
```

### Deployment order

```bash
# 1. Turnstile secret → deploy function
gcloud secrets create TURNSTILE_SECRET --replication-policy="automatic"
echo -n "SECRET" | gcloud secrets versions add TURNSTILE_SECRET --data-file=-
firebase deploy --only functions:verifyTurnstile

# 2. Immutable backup bucket
bash scripts/setup-immutable-backups.sh
# → update BACKUP_BUCKET in functions/src/firestoreBackup.ts
firebase deploy --only functions:firestoreBackup

# 3. Cloud Armor WAF (last — DNS change required)
bash scripts/setup-cloud-armor.sh
# → update DNS A record for actionstation.so to printed LB IP
```

### Client-side integration for Turnstile

```typescript
// Before login / upload — call this first
const token = await turnstile.getResponse();
const r = await fetch(`${FUNCTIONS_URL}/verifyTurnstile`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ token }),
});
if (!r.ok) throw new Error('Bot challenge failed');
```

**Last Updated**: 2026-03-17
**Skills Version**: 1.3
**Supported**: Claude Code CLI with custom skills support
