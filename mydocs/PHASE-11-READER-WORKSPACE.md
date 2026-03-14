# Phase 11 (Revised): Reader Workspace for BASB (PDF/Image First, Security-First)

## Summary

This is the complete replacement plan for Phase 11.

- Scope locked: PDF/Image reader first.
- Link preview click behavior stays external by default.
- Web iframe reader is deferred (CSP and cross-origin constraints).
- Reader lifecycle stays in focus mode.
- High-frequency reader UI state uses local `useReducer` (isolated dispatch chain from canvas store).
- Reader opens are allowed only through a typed safe-URL contract at API boundaries.
- Async viewer work is session-scoped (`sessionId` + cancellation) to prevent stale writes.
- Quote insertion is single-transaction, undo-safe, and idempotent per session.
- Each phase has strict quality gates: TDD, integration coverage, full lint/typecheck/tests.

## Incorporated Findings (Ordered by Severity)

1. Critical CSP conflict resolved by removing web iframe scope from Phase 11.
2. URL safety moved from checklist-only to compile-time and runtime API boundary.
3. Async race risk resolved with explicit session and cancellation contract.
4. Quote insertion upgraded from markdown-string insertion to deterministic ProseMirror transaction insertion.
5. Link preview default behavior preserved (external open remains primary).
6. PDF rendering constrained to paged mode with measurable, testable performance constraints.
7. Error/recovery and accessibility criteria made explicit and test-gated.
8. Test scope expanded to match FocusOverlay and editor lifecycle complexity.

## Public Interfaces and Type Contracts

### Reader source types for Phase 11

```ts
type SafeReaderUrl = string & { readonly __brand: 'SafeReaderUrl' };

type ReaderSource =
  | {
      type: 'pdf';
      url: SafeReaderUrl;
      filename: string;
      sourceId: string;
      mime: 'application/pdf';
    }
  | {
      type: 'image';
      url: SafeReaderUrl;
      filename: string;
      sourceId: string;
      mime: `image/${string}`;
    };
```

### Safe URL contract (single source of truth)

- `toSafeReaderUrl(raw: string): SafeReaderUrl | null`
- `SafeReaderUrl` can be produced only by `toSafeReaderUrl`.
- Accept only `https:` URLs from trusted origins:
- current app origin
- explicitly configured attachment CDN/storage origins
- signed attachment URLs are allowed only when host is trusted.
- Reject `javascript:`, `data:`, `file:`, and any malformed URL.
- All reader open paths must fail closed (`null` -> no open, show safe fallback).

### Focus store additions

- `readerContext: { nodeId: string; source: ReaderSource; sessionId: number } | null`
- `openReader(nodeId: string, source: ReaderSource): { sessionId: number }`
- `closeReader(reason: 'escape' | 'user' | 'navigation'): void`

### Async lifecycle contract

- `openReader` increments `sessionId` monotonically.
- Viewer load/select/quote effects carry `sessionId` and `AbortController`.
- Close or source-switch aborts in-flight work and invalidates prior sessions.
- Any async result with stale `sessionId` is ignored.

### Reader local reducer (UI state only, no canvas store writes)

State:
- `paneSide`
- `splitRatio`
- `currentPage`
- `selectionDraft`
- `loadState` (`idle` | `loading` | `ready` | `error` | `blocked`)
- `isQuotePending`

Actions:
- `SET_SPLIT`
- `FLIP_PANES`
- `SET_PAGE`
- `SET_SELECTION`
- `CLEAR_SELECTION`
- `SET_LOAD_STATE`
- `SET_QUOTE_PENDING`

### Attachment extension callback contract

- `nodeId` passed via extension options.
- `resolveReaderSource(attachment): ReaderSource | null` validates mime + URL and builds typed source.
- `onOpenReader?: (nodeId: string, source: ReaderSource) => void`

### Quote insertion contract

Insert ProseMirror nodes, not raw markdown, in one transaction:
- `blockquote` node with selected text.
- attribution paragraph with localized visible text (`filename`, `page`).
- attribution node attrs for machine-readable metadata (`sourceId`, `nodeId`, `page`, `sourceType`).
- Guardrails:
- normalize whitespace and sanitize selection text.
- max quote length guard.
- disable duplicate insertion while `isQuotePending` is true.
- dedupe same `(sourceId, page, normalizedSelectionHash)` within active session.
- Undo/redo must treat quote insertion as one editor step.

### Error and recovery contract

- Explicit load states and UX copy for:
- corrupt/password-protected PDF
- expired or unavailable URL
- network fetch/render failure
- Recovery actions:
- retry current source
- open externally (safe fallback)
- return focus to note editor without leaving focus mode

### Accessibility acceptance contract

- Reader shell:
- logical tab order and visible focus ring on all controls
- Escape closes reader first, then focus mode
- close reader restores focus to triggering attachment action
- Splitter:
- keyboard support (`Arrow` +/- 5%, `Home` 20%, `End` 80%)
- announced value and orientation via ARIA
- Viewer and note panes have labeled regions for screen readers.

## Phase-Wise Plan

## Phase 11.1: Reader Core Shell + PDF/Image Viewer [COMPLETED]

### Build

- Add typed safe URL utility and trusted-origin config constants.
- Add `readerContext` to focus store with `openReader`/`closeReader` and `sessionId`.
- Branch FocusOverlay rendering:
- default focus editor when `readerContext` is null
- reader shell when `readerContext` exists
- Implement reader shell layout controls and split ratio handling.
- Keep split/pane/page/selection/load state in local reducer.
- Add escape handling order: close reader first, then exit focus.
- Add session invalidation and cancellation hooks for future source viewers.
- Use string resources and CSS variables only.

### TDD and integration

- Unit tests for focus store reader transitions and monotonic `sessionId`.
- Unit tests for reducer action semantics and split clamping.
- Unit tests for `toSafeReaderUrl` accepted/rejected cases.
- Integration test: FocusOverlay switches modes correctly.
- Integration test: Escape priority behavior is correct with editor/focus layers.
- Integration test: stale async callback cannot update closed/switched reader session.

### Phase gate

- `npm run typecheck`
- `npm run lint:strict`
- `npm run test`
- `npm run check`

### Tech debt policy for this phase

Incurred debt allowed:
- Temporary adapter props during FocusOverlay split refactor.

Debt removal before phase close:
- Remove adapter props and duplicate constants.
- No `TODO` or `FIXME` left.
- New/changed files under 300 lines via extraction.
- Stale-closure risks audited and removed.
- No direct/raw URL writes into store API.

## Phase 11.2: Quote-to-Note Pipeline + Web Article Reader [COMPLETED]

### Built

- `quoteInsertionService`: Inserts attributed blockquote + attribution paragraph into
  TipTap editor via `editor.chain()` (single undo step). Machine-readable `data-source-*`
  attrs preserved for downstream features.
- `quoteSanitizer`: Normalizes whitespace, strips HTML, enforces max length (2000 chars),
  produces selection fingerprints for session-level deduplication.
- `useQuoteActions` hook: Coordinates "Add to Note" (insert quote) and "Create Node from
  Quote" (spawn new IdeaCard with markdown quote + source attribution).
- Dedupe guard: `selectionFingerprint(sourceId, page, text)` prevents duplicate insertions
  within the same reader session.
- `contentExtractor` service: Fetches URL, parses with `@mozilla/readability`, returns
  cleaned title/content/excerpt. Uses `captureError` for resilience.
- `ArticleReaderSource` type added to `ReaderSource` discriminated union.
- `ArticleViewer` component: Renders extracted article with selectable text, scroll
  position tracking, source link, and full text selection support.
- `toSafeArticleUrl`: Less restrictive URL validator (any `https:` URL is accepted since
  content is fetched and parsed, never embedded in iframe).
- `useOpenArticle` hook: Extracts article from URL and opens reader in one call.
- Entry point on `LinkPreviewCard`: "Read" button (📖) triggers article extraction and
  opens reader. Primary click behavior (external open) is preserved.
- `ReaderShell` updated to handle `source.type === 'article'` branch.
- Wired `SelectionBanner` → `useQuoteActions` → `quoteInsertionService` / canvas store.

### Tests (72 reader tests total, all passing)

- quoteSanitizer: normalize, max-length, fingerprint, sanitize (16 tests)
- quoteInsertionService: buildQuoteMarkdown with/without page, HTML sanitization (5 tests)
- contentExtractor: parseArticleFromHtml, buildArticleSource (5 tests)
- safeArticleUrl: https/http/empty/malformed/data URL validation (6 tests)
- focusStoreReader, readerReducer, safeUrl, resolveReaderSource (40 pre-existing tests)

### Quality gates passed

- `tsc --noEmit`: 0 errors
- `eslint`: 0 errors
- `vitest run`: 502 files, 4843 tests passed, 0 failures
- `npm run build`: success

## Phase 11.5: Release Stabilization (Mandatory Final Phase)

### Build

- Run full regression sweep across canvas editing, focus mode, attachments, and shortcuts.
- Security regression checklist:
- no CSP weakening
- no unsafe HTML insertion
- no unsanitized URL open paths
- no bypass path around `toSafeReaderUrl`
- trusted-origin list is enforced and unit-tested
- Verify Zustand selector discipline in reader path.
- Verify local reducer dispatch chain remains isolated from canvas store.
- Stress test rapid open/close/switch flows for stale callback safety.

### TDD and integration

- Integration test: attachment -> reader -> quote -> save -> reopen -> content persisted.
- Integration test: invalid reader URL is blocked with safe fallback behavior.
- Integration test: stale async result cannot write after close or source switch.
- Re-run all existing suites and ensure no behavioral regressions.

### Phase gate

- `npm run typecheck`
- `npm run lint:strict`
- `npm run test`
- `npm run check`

### Tech debt policy for this phase

Incurred debt allowed:
- None.

Debt removal before phase close:
- Zero open debt policy: remove transitional APIs, dead code, duplicated constants, and temporary guards.
- Update phase doc and follow-up docs to match implemented behavior and non-goals.

## Phase 11.3: UX/Accessibility Hardening + Analytics [COMPLETED]

### Built

- **Analytics events**: `trackReaderOpened`, `trackReaderClosed`, `trackReaderQuoteInserted`
  added to `analyticsService.ts`. Events include `source_type`, `context` (focus/sidePanel),
  `reason` (escape/user/navigation), and `action` (add_to_note/create_node). No raw URLs or
  quote text sent per privacy policy.
- **Analytics wiring**: `focusStore.openReader/closeReader` tracks open/close with source type
  and context. `readerPanelStore.openPanel/closePanel` tracks side panel events.
  `useQuoteActions` tracks both add-to-note and create-node insertions.
- **ReaderToolbar keyboard navigation**: WAI-ARIA toolbar pattern with ArrowLeft/Right/Up/Down
  cycling, Home/End, visible `focus-visible` outlines on all buttons.
- **Page counter announced**: `aria-live="polite"` and `aria-atomic="true"` on page counter.
- **Load state announcements**: `aria-live="polite"` region in ReaderShell announces loading,
  ready, and error states to screen readers.
- **SelectionBanner ARIA**: `role="status"`, `role="group"`, `aria-label` on action buttons,
  visible focus rings.
- **ReaderSidePanel fully wired**: Uses `useSidePanelQuoteActions` hook for "Create Node from
  Quote" with analytics. `SelectionBanner` component replaces inline markup. `ArticleViewer`
  support added.
- **Structural tests (7 assertions)**: No hardcoded strings, no hex colors, Zustand selector
  discipline, safe URL enforcement, localization import check, analytics privacy compliance.

### Quality gates passed

- `tsc --noEmit`: 0 errors
- `eslint`: 0 errors
- `vitest run`: 503 files, 4850 tests passed, 0 failures
- `npm run build`: success

## Phase 11.4: Release Stabilization [PENDING]

### Build

- Run full regression sweep across canvas editing, focus mode, attachments, and shortcuts.
- Verify Zustand selector discipline in reader path.
- Verify local reducer dispatch chain remains isolated from canvas store.
- Stress test rapid open/close/switch flows for stale callback safety.
- Zero open debt policy: remove transitional APIs, dead code, duplicated constants.

## Global Engineering Constraints (Always On)

- Maintain MVVM, DRY, SOLID, SSOT.
- No hardcoded user-facing strings.
- No hardcoded colors; use universal color scheme variables.
- No Zustand anti-patterns (selector subscriptions only).
- No ReactFlow cascade risk from reader interactions.
- No stale-closure effect bugs.
- Zero lint errors in every phase.
- Cyber security compliance in all new/updated code paths.
- One-shot reducer dispatch chain isolated from canvas store for reader UI state.
- All reader opens must pass through `toSafeReaderUrl` with no bypass.
- All async reader side effects must enforce `sessionId` stale-result dropping.
- Accessibility bar for touched reader surfaces is WCAG 2.2 AA equivalent behavior.

## Assumptions and Defaults

- Phase 11 supports attachment-based reader sources (`pdf`, `image`) and web articles via Readability.
- Link preview cards keep external-open as primary behavior; "Read" button added as secondary action.
- No Firestore schema changes in Phase 11.
- Reader session state is ephemeral UI state.
- Persisted artifact remains node note content plus structured attribution attrs in editor document.

## Decisions Applied from Review

- Trusted origin policy: allow only `https` URLs from app origin and configured attachment origins.
- Interaction safety policy: rapid repeated open/close/switch is supported and race-safe by design.
- Metadata policy: quote attribution is both human-readable and machine-readable for reliable downstream features.
