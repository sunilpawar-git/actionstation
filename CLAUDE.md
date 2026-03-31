# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# ActionStation - Project Rules

> **CRITICAL**: ZERO TECH DEBT policy. All rules are NON-NEGOTIABLE.

## 🛠️ Development Commands

```bash
# Dev server
npm run dev                          # Start Vite dev server

# Full check (typecheck + lint + test) — run before committing
npm run check

# Individual checks
npm run typecheck                    # tsc --noEmit
npm run lint                         # eslint (max 49 warnings)
npm run lint:strict                  # eslint, zero warnings — enforced pre-merge
npm run lint:fix                     # Auto-fix lint issues
npm run test                         # vitest run (all tests, single run)
npm run test:watch                   # vitest in watch mode
npm run test:coverage                # vitest with coverage report

# Run a single test file
npx vitest run src/path/to/file.test.ts

# Run tests matching a name pattern
npx vitest run -t "pattern"

# Build
npm run build                        # typecheck + lint + test + vite build
npm run build:quick                   # tsc -b + vite build (skip lint/test)

# Cloud Functions (separate package)
cd functions && npm run check         # lint + test + build
cd functions && npm test              # vitest run
firebase emulators:start --only functions  # Local emulator on :5001
```

**Dev server**: `npm run dev` starts Vite at `http://localhost:5173`.

**Path alias**: `@/` maps to `src/` (configured in tsconfig.json and vite.config.ts).

**Test framework**: Vitest + jsdom + React Testing Library. Setup in `src/test/setup.ts`. Tests co-located in `__tests__/` dirs or as `*.test.ts(x)` files.

**Test setup globals** (`src/test/setup.ts`):
- `ResizeObserver` stubbed (jsdom doesn't implement it)
- `fake-indexeddb/auto` auto-imported (IndexedDB for Firebase)
- `VITE_GEMINI_API_KEY`, `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_PROJECT_ID`, `VITE_CLOUD_FUNCTIONS_URL` stubbed via `vi.stubEnv`
- React `act()` warnings converted to test failures
- `virtual:pwa-register` → `src/test/mocks/virtualPwaRegister.ts` (alias in `vitest.config.ts`)

**Structural tests** (`src/__tests__/`): 31 tests enforce build rules at CI. They scan source files for anti-patterns and fail the build if violations are found. Never update them to match code — fix the code. Key tests:

| Test | Enforces |
|---|---|
| `zustandSelectors` | No bare store destructuring |
| `firestoreQueryCap` | All `getDocs` must have `.limit()` |
| `noConsoleLog` | Zero `console.*` — use `logger.*` |
| `noBase64InFirestore` | `stripBase64Images()` before writes |
| `cspCompleteness` | CSP in `firebase.json` only — no `<meta>` tags |
| `envValidation` | `REQUIRED_VARS` in code matches test list |
| `overflowClip` | Fixed-height containers use `overflow-clip` |
| `noHardcodedSecrets` | No API keys in source |
| `geminiKeyIsolation` | Only `geminiClient.ts` reads `VITE_GEMINI_API_KEY` |
| `guardrails.security` / `guardrails.resilience` | WAF-level security + resilience patterns |
| `calendarFunctionsSecurity` (in `functions/`) | `cors: ALLOWED_ORIGINS` on every `onCall` |

**Cloud Functions**: Separate Node 22 package in `functions/` with its own tsconfig, eslint, and vitest config. Exports from `functions/src/index.ts`.

| Function | Purpose |
|---|---|
| `geminiProxy` | Proxies all Gemini AI requests — API key never reaches client |
| `workspaceBundle` | Firestore Bundles for fast workspace metadata load |
| `onNodeDeleted` | Cleans up Storage files on node delete |
| `scheduledStorageCleanup` | Daily purge of `tmp/` files older than 7 days |
| `firestoreBackup` | Daily scheduled Firestore → GCS export |
| `health` | `GET /health` health check endpoint |
| `fetchLinkMeta` | Fetches Open Graph metadata for link preview nodes |
| `proxyImage` | Image proxy (CORS workaround for external images) |
| `verifyTurnstile` | Cloudflare Turnstile captcha verification |
| `exchangeCalendarCode` | Google Calendar OAuth code → refresh token |
| `disconnectCalendar` | Removes calendar integration |
| `calendarCreateEvent` / `calendarUpdateEvent` / `calendarDeleteEvent` / `calendarListEvents` | Server-side Calendar API proxy |

## 🧠 Product Context — Building a Second Brain (BASB)

ActionStation is a **Building a Second Brain** (BASB) application — an infinite canvas for capturing, connecting, and synthesising ideas. Every feature must serve this philosophy:

- **Capture**: Nodes are atomic ideas (text, images, documents). Creation must be frictionless — one click or keyboard shortcut.
- **Organise**: Spatial layout on an infinite canvas replaces folders. Clustering and tagging surface structure organically.
- **Distil**: AI-powered synthesis (Gemini) condenses selected nodes into new insight. Knowledge Bank entries provide reusable context.
- **Express**: Branch export, markdown output, and mind-map views transform private notes into shareable artefacts.

When building features, ask: *"Does this reduce friction between thought and capture, or between capture and insight?"* If not, it doesn't belong.

## 🔧 Available Skills (Slash Commands)

Use these skills proactively during development — invoke via `/skillname`.

| Skill | When to use |
|-------|-------------|
| `/build` | Run full build pipeline (types + lint + test + build). Use `--quick` to skip tests. |
| `/ci` | Simulate GitHub CI locally before pushing. Supports `--fast` and `--from <stage>`. |
| `/test` | Run tests for specific files/patterns. e.g. `/test src/features/canvas/__tests__/` |
| `/typecheck` | Run `tsc --noEmit` to check type errors without building. |
| `/lint-fix` | Run ESLint with auto-fix across project or specific files. |
| `/review` | Audit changed files for CLAUDE.md compliance, tech debt, file size limits, anti-patterns. |
| `/css-migrate` | Migrate a component's `.module.css` to Tailwind. Follow the Tailwind migration rules below. |
| `/migration-verify` | Verify a completed CSS-to-Tailwind migration wave (orphaned imports, forbidden patterns). |
| `/phase <n>` | Load roadmap phase plan (1-10) from `mydocs/PHASE-*.md` for implementation guidance. |
| `/simplify` | Review changed code for reuse, quality, and efficiency, then fix issues found. |

**Workflow**: After implementing a feature, run `/review` then `/build`. Before pushing, run `/ci`.

## 🚨 STRICT LIMITS

| Rule | Limit | Action |
|------|-------|--------|
| File Size | MAX 300 lines | Split immediately |
| Component | MAX 100 lines | Extract sub-components |
| Function | MAX 50 lines | Extract helpers |
| Hook | MAX 75 lines | Split by responsibility |

## 🏗️ ARCHITECTURE (MVVM + Feature-First)

```
src/
├── app/                   # App shell: Layout, routing context, global hooks
├── features/              # Feature modules (SSOT per domain)
│   ├── auth/
│   │   ├── types/         # Model: interfaces
│   │   ├── stores/        # ViewModel: Zustand slices
│   │   ├── hooks/         # Bridge: useAuth, useUser
│   │   ├── components/    # View: LoginButton, UserAvatar
│   │   ├── services/      # Side effects: authService
│   │   └── __tests__/     # Co-located tests
│   ├── canvas/            # Nodes, edges, ReactFlow integration
│   ├── ai/                # Gemini generation, transformation
│   ├── workspace/         # Workspace CRUD, loader, sync
│   ├── knowledgeBank/     # KB entries, TF-IDF scoring
│   ├── clustering/        # Similarity + cluster suggestions
│   ├── search/            # Full-text search (debounced)
│   ├── calendar/          # Google Calendar server-side OAuth + sync
│   ├── documentAgent/     # Image analysis, auto-spawn
│   ├── export/            # Branch/markdown/mind-map export
│   ├── onboarding/        # First-run onboarding flows
│   ├── settings/          # User settings UI
│   ├── subscription/      # Feature gates (free/pro tiers)
│   ├── synthesis/         # AI-powered node synthesis
│   └── tags/              # Node tagging
├── shared/
│   ├── components/        # Reusable UI (Button, Toast, ErrorBoundary)
│   ├── contexts/          # React contexts (not Zustand)
│   ├── hooks/             # Generic hooks (useDebouncedCallback, useEscapeLayer)
│   ├── services/          # logger.ts, Sentry, PostHog, web-vitals
│   ├── stores/            # Shared Zustand stores (toast, confirm, settings)
│   ├── utils/             # Pure functions (firebaseUtils, contentSanitizer)
│   ├── localization/      # String resources
│   └── validation/        # Zod schemas for all Firestore-bound inputs
├── migrations/            # Firestore schema migrations (migrationRunner.ts)
├── workers/               # Web Workers (knowledgeWorker.ts — TF-IDF off-thread)
├── config/                # Environment, firestoreQueryConfig, constants
└── styles/                # CSS variables, global styles
```

### Firestore Data Model

```
users/{userId}/
  workspaces/{workspaceId}   # + schemaVersion, userId
    nodes/{nodeId}           # + schemaVersion, userId, workspaceId
    edges/{edgeId}           # + userId, workspaceId
  knowledgeBank/{entryId}
```

Every node and edge document stores `userId` + `workspaceId`. Firestore rules validate both the path-level auth **and** `resource.data.userId == request.auth.uid`.

### Hardcoding Rules (Zero Tolerance)
- **Strings**: Use `strings` from `@/shared/localization/strings` — no inline text in components
- **Colors**: Use `var(--color-*)` CSS variables — no hex/rgb values
- **Dimensions**: Use `var(--space-*)`, `var(--radius-*)` design tokens
- **Secrets**: Never in code — `.env.local` locally, env vars in CI/CD

## 🎨 CSS → TAILWIND INCREMENTAL MIGRATION

> **Strategy**: Migrate one component at a time — only when you already touch its `.tsx` file during normal production work. Never migrate speculatively.

### The Golden Rule

> When you modify a component's `.tsx` file, migrate its **entire** `.module.css` to Tailwind in the **same PR**. Never leave a component half-migrated.

### What Tailwind replaces

- `.module.css` files for **UI components** → replaced with `className="..."` Tailwind utilities
- Hardcoded `style={{}}` props → replaced with Tailwind utilities

### What NEVER gets migrated

| File / Pattern | Reason |
|---|---|
| `src/styles/variables.css` | This IS the design system — Tailwind reads from it |
| `src/styles/themes/*.css` | Runtime theme switching relies on `:root` CSS variable overrides |
| `src/styles/global.css` | Resets and global rules must stay in CSS |
| `src/styles/semanticZoom.css` | Canvas viewport rules — pixel-precision required |
| Canvas layout: `position: absolute`, transforms, React Flow overrides | Tailwind utilities are insufficient here |
| Custom scrollbar styles (`::-webkit-scrollbar`) | Must remain in CSS |

### Migration Priority (easiest → hardest — only when touched)

| Tier | Components |
|---|---|
| ✅ Easy | `OfflineBanner`, `SyncStatusIndicator`, `CalendarBadge`, `PoolPreviewBadge`, `PinWorkspaceButton` |
| 🟡 Medium | `LoginPage`, `SearchBar`, `TagInput`, `WorkspaceItem`, `SettingsPanel/*` |
| 🔴 Hard — migrate last | `IdeaCard`, `CanvasView`, `TipTapEditor`, `ClusterBoundaries`, `ZoomControls` |
| 🚫 Never | Everything in `src/styles/` global/variables/themes |

### Tailwind class rules

```tsx
// ❌ FORBIDDEN — mixing Module CSS and Tailwind in same component
import styles from './Button.module.css';
<button className={`${styles.btn} mt-4`}>...</button>

// ❌ FORBIDDEN — Tailwind spacing utilities are zeroed by global * reset
<button className="mt-4 px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg">...</button>

// ✅ CORRECT — layout + color via Tailwind, spacing via style prop
<button
    className="flex items-center bg-[var(--color-primary)] text-white rounded-lg"
    style={{ marginTop: 16, padding: '8px 16px' }}
>...</button>

// ✅ CORRECT — CSS variable values in Tailwind arbitrary syntax (for non-spacing properties)
className="text-[var(--color-text-primary)] bg-[var(--color-surface)] rounded-[var(--radius-md)]"

// ✅ CORRECT — spacing token → style prop (NOT Tailwind class)
// --space-sm: 8px  → style={{ padding: 8 }}   or style={{ gap: 8 }}
// --space-md: 16px → style={{ padding: 16 }}  or style={{ margin: 16 }}
// --space-lg: 24px → style={{ padding: 24 }}
```

### 🔴 CRITICAL: Global CSS Reset Kills Tailwind Spacing Utilities

`src/styles/global.css` has a bare `* { margin: 0; padding: 0 }` reset outside any layer, which always wins over Tailwind's `@layer utilities`. Every Tailwind spacing class (`py-12`, `mb-4`, `gap-3`) produces **zero** output.

**Rule:** Use `style` props for all `margin`, `padding`, and `gap`. Use Tailwind only for layout (`flex`, `items-center`), colors, borders, radius, shadows — properties the reset doesn't touch. Do NOT reorder `global.css` — the reset is required for the canvas.

---

### Hard rules during migration

1. **All-in or leave it**: Never partially convert a `.module.css` — convert the whole file or none
2. **Delete the `.module.css` file** when done — do not leave empty or orphaned files
3. **No new `.module.css` files** may be created for any component going forward
4. **Theme-aware colors** must use `var(--color-*)` arbitrary syntax, never Tailwind's built-in palette (e.g. `bg-blue-500` → `bg-[var(--color-primary)]`)
5. **Canvas components stay in CSS** — `IdeaCard`, `CanvasView`, node/edge files are last-resort migrations
6. **Spacing via `style` props** — `margin`, `padding`, `gap` must use inline `style` props, not Tailwind spacing utilities (see "Global CSS Reset" section above)
7. **Fixed-height containers must use `overflow-clip`** — never `overflow-hidden` on modals, panels, or dialogs (see section below)

### 🔴 CRITICAL: overflow-hidden vs overflow-clip (Focus-Scroll Bug)

`overflow: hidden` still allows programmatic scroll — when a focusable `sr-only` child receives focus, the browser scrolls the container, creating a blank gap. `overflow-clip` prevents this.

```tsx
// ❌ BROKEN — browser can still scroll this container on focus
<div className="h-[600px] flex flex-col overflow-hidden rounded-xl">
    ...
    <input className="sr-only" type="radio" /> {/* focus causes scroll! */}
</div>

// ✅ CORRECT — overflow-clip prevents ALL scrolling (visual AND programmatic)
<div className="h-[600px] flex flex-col overflow-clip rounded-xl">
    ...
    <input className="sr-only" type="radio" /> {/* no scroll on focus */}
</div>
```

**Rule: Any fixed-height container that should NEVER scroll (modals, panels, dialogs, popovers) must use `overflow-clip`, not `overflow-hidden`.** Use `overflow-hidden` only for text truncation (`overflow-hidden text-ellipsis`) or containers where the height matches content exactly.

**Enforcement:** `overflowClip.structural.test.ts` scans for `overflow-hidden` on height-constrained containers.

---

## �🆔 ID GENERATION CONVENTION

```typescript
// ✅ ALWAYS use crypto.randomUUID() for node/edge IDs
const id = `idea-${crypto.randomUUID()}`;
const edgeId = `edge-${crypto.randomUUID()}`;

// ❌ NEVER use Date.now() — collision risk under rapid creation
// const id = `idea-${Date.now()}`; // TWO nodes in <1ms = same ID
```

## ⚡ PERFORMANCE RULES (ReactFlow 500+ Nodes)

```typescript
// 1. ALWAYS memoize custom nodes
const PromptNode = React.memo(({ data }: NodeProps) => { ... });

// 2. NEVER access nodes/edges directly in render
// ❌ const nodes = useStore(state => state.nodes);
// ✅ const nodeCount = useStore(state => state.nodes.length);

// 3. Decouple selection state
const selectedNodeIds = useStore(state => state.selectedNodeIds);

// 4. Use viewport-only rendering (lazy render)
<ReactFlow onlyRenderVisibleElements={true} />

// 5. Memoize callbacks — use useRef for reactive values, keep deps stable
const userRef = useRef(user);
userRef.current = user;
const handleAction = useCallback(async () => {
    const u = userRef.current; // always fresh, no stale closure
}, []); // ✅ stable reference
```

### Heavy computation off the main thread

TF-IDF scoring and similarity clustering must **never** block the UI thread. Use the Web Worker client:

```typescript
import { computeClustersAsync, rankEntriesAsync } from '@/workers/knowledgeWorkerClient';

// Runs in Web Worker; falls back to main thread if Workers unavailable
const result = await computeClustersAsync(nodes, { minClusterSize: 3 });
```

### Search input debouncing

All search inputs must debounce before triggering computation. Use the shared hook:

```typescript
import { useDebouncedCallback } from '@/shared/hooks/useDebounce';
const debouncedSearch = useDebouncedCallback(search, 250);
```

## 🗺️ SPATIAL CHUNKING (Tile-Based Graph Storage)

The canvas uses spatial chunking to reduce Firestore reads by ~80-95% at scale.

### Architecture

```
users/{userId}/workspaces/{workspaceId}/
├── tiles/{tileId}/nodes/{nodeId}   ← spatially-partitioned nodes
├── edges/{edgeId}                  ← edges stay flat (fewer docs)
└── (workspace doc has spatialChunkingEnabled: boolean)
```

**Tile size**: `TILE_SIZE = 2000` px (configured in `firestoreQueryConfig.ts`)
**Tile ID format**: `tile_{xIndex}_{yIndex}` — e.g. `tile_3_4` for position `(7500, 9200)`

### Key Modules

| Module | Purpose |
|--------|---------|
| `tileCalculator.ts` | Pure math: position → tile coords/ID, viewport → tile set |
| `tileLoader.ts` | Firestore reads from tile subcollections + in-memory cache |
| `tiledNodeWriter.ts` | Firestore writes grouped by tile, with orphan cleanup |
| `tileReducer.ts` | Pure `useReducer` state machine for tile lifecycle |
| `useViewportTileLoader.ts` | React hook: viewport changes → tile loads (debounced) |
| `useTiledSaveCallback.ts` | Dirty-tile tracking + tiled save function |
| `spatialChunkingMigration.ts` | One-time paginated migration from flat `nodes/` to `tiles/` |

### Rules

1. **Feature flag**: Gated by `workspace.spatialChunkingEnabled` — backwards compatible
2. **Tile eviction**: Stale tiles evicted after `TILE_EVICTION_MS` (60s) via periodic interval
3. **Dirty tracking**: Done in `useEffect` (never during render) via `prevNodesRef` comparison
4. **Zustand compliance**: `useViewportTileLoader` uses `useReducer` (isolated from canvas store), scalar selectors, `getState()` for actions, `useRef` for stale-closure prevention
5. **Migration**: `migrateFlatToTiled()` is paginated (handles >1000 nodes), idempotent, normalizes `colorKey`/`contentMode`
6. **Firestore rules**: `tiles/{tileId}/nodes/{nodeId}` mirrors `nodes/{nodeId}` auth rules

### Adding New Tile Features

- New tile-related constants go in `firestoreQueryConfig.ts`
- New string resources go in `workspaceStrings.ts` (prefixed with `tile`)
- Tile state transitions go through `tileReducer` actions — never mutate directly

## 🔒 SECURITY PROTOCOL

Firestore rules deny-all by default; every path requires `request.auth.uid == userId`. See `firestore.rules`. Always guard `resource.data` access with `resource == null` check (resource is null on creates).

### API Key Protection
- `.env.local` for all secrets (NEVER commit)
- Firebase App Check enabled (recaptcha v3)
- Gemini API calls via Cloud Function (hide API key)

### Code Security
- NO `any` types in production
- Input validation on all user content
- XSS prevention: sanitize markdown output
- CORS configured for production domain only
- Base64 stripped before every Firestore write — `stripBase64Images()` in `contentSanitizer.ts`
- `data:` URIs removed from CSP `img-src` directive
- Secret scanning enforced via Gitleaks in CI

### Storage Security
- All files stored in Firebase Storage only — Firestore holds URLs, never binary
- `onNodeDeleted` Cloud Function removes associated Storage files on node deletion
- GCS lifecycle rules (`storage-lifecycle.json`) auto-delete `tmp/` files after 7 days

## 🧪 TDD PROTOCOL (STRICT)

```
1. RED:    Write failing test first
2. GREEN:  Minimal code to pass
3. REFACTOR: Clean while green
4. COMMIT: Only when tests pass
```

### 🔴 CRITICAL: Acceptance Criteria Before Feature Tests

**ALWAYS ask for acceptance criteria before designing feature/fix tests.** Do not infer what to test — the user defines what "done" means.

```
// Workflow:
1. User requests a feature or fix
2. ASK: "What are the acceptance criteria for this change?"
3. User provides criteria (e.g., "clicking X does Y", "error shown when Z")
4. Write tests that directly verify those criteria
5. Implement code to pass those tests
```

This applies to feature and integration tests. Structural tests (selector anti-patterns, Firestore query caps, CSP completeness) and unit tests for utils/services still follow standard coverage requirements above.

### Test Coverage Requirements
| Layer | Minimum Coverage |
|-------|-----------------|
| Stores (ViewModel) | 90% |
| Services | 85% |
| Utils | 100% |
| Hooks | 80% |
| Components | 60% (critical paths) |

## 📦 STATE MANAGEMENT (Zustand + TanStack Query)

```typescript
// Zustand: Local/UI state (canvas, selections, UI flags)
// TanStack Query: Server state (user profile, workspace data)

// Store pattern
interface CanvasState {
  nodes: Node[];
  edges: Edge[];
  selectedNodeIds: Set<string>;
  // Actions are in the store
  addNode: (node: Node) => void;
  selectNode: (id: string) => void;
}
```

### Canvas Store Architecture

The canvas store uses a **factory slice pattern** to stay under 300 lines:
- `canvasStore.ts` (~120 lines) — thin orchestrator, re-exports `EMPTY_SELECTED_IDS`/`getNodeMap`
- `canvasStoreActions.ts` (~235 lines) — 6 factory functions spread into `create()`
- `canvasStoreUtils.ts` (~21 lines) — shared constants (avoids circular imports)

New store slices for upcoming features (synthesis, clustering) add ONE factory spread each.

### Toast Helpers

```typescript
// ✅ Use typed toast helpers (not raw addToast)
import { toast } from '@/shared/stores/toastStore';
toast.success(strings.canvas.nodeCopied);
toast.error(strings.errors.saveFailed);
```

### 🔴 CRITICAL: Zustand Selector Pattern (Prevents "Maximum Update Depth" Errors)

The **selector pattern is MANDATORY**. Bare store subscriptions cause cascading re-renders and infinite loops in ReactFlow.

```typescript
// ❌ ANTI-PATTERN - Subscribes to ENTIRE store (causes re-renders on ANY field change)
const { user, isLoading, setUser } = useAuthStore();

// ✅ CORRECT - Use selectors for state, getState() for actions
const user = useAuthStore((s) => s.user);
const isLoading = useAuthStore((s) => s.isLoading);

// For actions, use getState() - stable references, no re-render dependency
const handleSubmit = () => useAuthStore.getState().setUser(newUser);
```

**Enforcement:** `src/__tests__/zustandSelectors.structural.test.ts` scans for all 8 anti-patterns and fails the build. Selectors must be called outside `useEffect` (not in the deps array). Never mix state and actions in one selector call.

### 🔴 CRITICAL: Closure Variable Anti-Pattern (Causes Drag Lag)

**Never use closure variables inside selectors.** This causes selector functions to be recreated each render, leading to subscription churn during drag operations.

```typescript
// ❌ ANTI-PATTERN 2: Closure variable in selector
const focusedNodeId = useFocusStore((s) => s.focusedNodeId);
const node = useCanvasStore((s) => getNodeMap(s.nodes).get(focusedNodeId));
// ↑ focusedNodeId is a CLOSURE VARIABLE - selector recreated each render!

// ✅ CORRECT: Stable selector + useMemo derivation
const focusedNodeId = useFocusStore((s) => s.focusedNodeId);
const nodes = useCanvasStore((s) => s.nodes);
const node = useMemo(
    () => getNodeMap(nodes).get(focusedNodeId) ?? null,
    [nodes, focusedNodeId]
);
```

**Enforcement:** Structural test detects `getNodeMap` inside selectors.

### 🔴 CRITICAL: useCallback Deps Must Not Include Reactive Zustand State

When a `useCallback` includes reactive Zustand state in its deps array, the callback reference changes every time that state changes — feeding re-renders back into components that consume it.

```typescript
// ❌ WRONG — callback recreated on every workspace switch
const handleSwitch = useCallback(async (id: string) => {
    if (id === currentWorkspaceId || !user) return;
    ...
}, [user, currentWorkspaceId]); // re-created on EVERY change

// ✅ CORRECT — read live values via ref, keep deps stable
const userRef = useRef(user);
const currentIdRef = useRef(currentWorkspaceId);
userRef.current = user;
currentIdRef.current = currentWorkspaceId;

const handleSwitch = useCallback(async (id: string) => {
    const curId = currentIdRef.current; // always fresh
    const currentUser = userRef.current;
    if (id === curId || !currentUser) return;
    ...
}, []); // stable — never recreated
```

### 🔴 CRITICAL: useEffect Deps Must Use Primitive Selectors, Not Object References

Selecting a Zustand object reference (`s.user`) in a `useEffect` dep causes the effect to re-run whenever the store reconstructs that object — even if the underlying data didn't change. Always select the primitive you actually need:

```typescript
// ❌ WRONG — entire user object triggers re-runs on any auth state update
const user = useAuthStore((s) => s.user);
useEffect(() => { ... }, [user]); // re-runs even if user.id didn't change

// ✅ CORRECT — primitive string; effect only re-runs when ID actually changes
const userId = useAuthStore((s) => s.user?.id);
useEffect(() => {
    if (!userId) return;
    const uid: string = userId; // narrowed for TypeScript
    ...
}, [userId]);
```

## 🎨 CODE STYLE CONVENTIONS

### Imports — ordering
1. React/framework (`react`, `react-dom`)
2. External libraries (`@tanstack/react-query`, `reactflow`, etc.)
3. Internal `@/` imports (stores, services, components)
4. Relative imports (local files)

Use `import type` for type-only imports:
```typescript
import type { User } from '@/features/auth/types';
```

### TypeScript
- Use `interface` for object shapes (not `type alias`) — ESLint enforces this
- `readonly T[]` for immutable arrays
- Prefer `null` over `undefined` for optional values
- `as const` for literal values that won't change
- No `any` in production code

### Naming
- **Files**: kebab-case for components (`idea-card.tsx`), camelCase for non-components (`settingsStore.ts`)
- **Components**: PascalCase
- **Hooks**: camelCase prefixed with `use`
- **Constants**: `SCREAMING_SNAKE_CASE` for config/limits
- **Booleans**: prefix with `is`, `has`, `should`, `can`

## ✅ COMMIT CONVENTIONS

Format: `type(scope): description`

| Type | Use |
|------|-----|
| feat | New feature |
| fix | Bug fix |
| refactor | Code change (no feature/fix) |
| test | Adding tests |
| docs | Documentation |
| perf | Performance |
| security | Security fix |

## 🗄️ FIRESTORE PATTERNS

### Query safety
- All `getDocs` calls **must** use `limit()` from `FIRESTORE_QUERY_CAP` in `firestoreQueryConfig.ts`
- Structural test `firestoreQueryCap.structural.test.ts` enforces this — build fails without it

### Write safety
- Writes ≤500 ops: use `runTransaction()` for read-then-write consistency
- Writes >500 ops: use `chunkedBatchWrite()` from `firebaseUtils.ts` (auto-chunks at 500)
- Never create a raw `writeBatch` and add unlimited ops to it

### Schema versioning
Every workspace and node document carries `schemaVersion: number`. On load, `migrationRunner.ts` applies all pending migrations in version order. Migrations must be:
- **Pure functions** (no side effects — no network calls)
- **Idempotent** (safe to run twice)
- **Backward-compatible** (old clients must still read new docs)

```typescript
// Adding a new migration — bump CURRENT_SCHEMA_VERSION
export const CURRENT_SCHEMA_VERSION = 3;

const migrations: Migration[] = [
    ...existingMigrations,
    {
        version: 3,
        name: 'add_my_new_field',
        migrateNode: (node) => ({ ...node, myField: node.myField ?? 'default' }),
    },
];
```

### Bundle-first loading
`loadUserWorkspaces` tries `loadWorkspaceBundle()` first (fast, cached). Bundle cache is invalidated automatically on workspace create/delete. Falls back to direct Firestore queries if bundle is unavailable.

## 💰 COST MINIMISATION (Gemini & Firebase/Firestore)

Every Firestore read/write and every Gemini API call costs money. Treat them as scarce resources.

### Firestore cost rules
Firestore cost controls are enforced via the rules in **Firestore Patterns** and **Spatial Chunking** sections above (query caps, batch writes, bundle-first loading, tile eviction). Additionally:
- **Avoid full-collection reads**: Always scope queries to user path (`users/{userId}/...`), never read entire collections
- **Listener cleanup**: Every `onSnapshot` listener must be unsubscribed in cleanup functions — prefer one-time reads (`getDocs`) for data that changes infrequently

### Gemini cost rules
- **No speculative calls**: Never call Gemini for background/predictive features without explicit user action
- **Cache AI results**: Store generated content in Firestore — never regenerate the same synthesis twice
- **KB context injection**: `getKBContext()` provides focused context rather than sending entire workspace content
- **All calls via proxy**: Every Gemini call must go through the `geminiProxy` Cloud Function (never direct client-side) — token caps and rate limits are enforced there
- Prefer client-side computation (TF-IDF in Web Worker) over API calls when possible

### Cloud Function cost rules
- **`minInstances` is off until launch traffic**: `stripeWebhook` and `razorpayWebhook` had `minInstances: 1` (cost ~$11/mo). Removed pre-launch. **Re-add `minInstances: 1` to both functions once real payment volume starts** — cold starts on webhooks can cause Stripe/Razorpay to mark the endpoint as unreliable.
- **Never set `minInstances` on non-critical functions** — only payment webhooks warrant it

## 🧹 LOGGING & ERROR HANDLING

**Always use the structured logger — never `console.*` directly:**

```typescript
import { logger } from '@/shared/services/logger';
logger.error('message', error, { contextKey: value }); // → Sentry + console
logger.warn('message', ...args);                        // → console only
logger.info('message', ...args);                        // → console only in dev
```

**Fire-and-forget async calls must have `.catch()`:**

```typescript
// ❌ Silent failure
void doAsyncThing();

// ✅ Surfaced failure
doAsyncThing().catch((err) => logger.warn('[context] thing failed:', err));
```

**`useEffect` async functions must have a single outer try/catch:**

```typescript
// ❌ Code before try{} can throw and leave state unresolved
async function load() {
    await setup();         // if this throws — loading state stuck!
    try { ... } catch {}
}

// ✅ Single wrapping try/catch
async function load() {
    try {
        await setup();
        ...
    } catch (err) {
        logger.error(...);
    }
}
```

## 🛡️ SECURITY INVARIANTS (non-negotiable)

1. `VITE_GEMINI_API_KEY` must **never** appear in `deploy.yml` — Gemini calls go through Cloud Functions proxy only
2. CSP lives **only** in `firebase.json` headers — never add a `<meta http-equiv>` CSP tag
3. Any new required env var must be added to **both** `envValidation.ts` AND `envValidation.structural.test.ts`. Current `REQUIRED_VARS` (9): `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID`, `VITE_CLOUD_FUNCTIONS_URL`, `VITE_GOOGLE_CLIENT_ID`, `VITE_RECAPTCHA_SITE_KEY`
4. New Cloud Functions must export from `functions/src/index.ts` and include `cors: ALLOWED_ORIGINS`
5. `npm audit` must stay at 0 — CI blocks the build otherwise

## 🛡️ CLOUD FUNCTION SECURITY LAYER (WAF-level)

Security utilities in `functions/src/utils/` — do not remove or bypass:

| File | Purpose |
|---|---|
| `securityLogger.ts` | Structured JSON events → Cloud Logging (WARNING/ERROR/CRITICAL) |
| `botDetector.ts` | Scanner UA + headless browser detection |
| `ipRateLimiter.ts` | Per-IP sliding window — 30 req/min on Gemini |
| `promptFilter.ts` | 14 injection + 5 exfiltration patterns; also scans output for leaked keys |
| `fileUploadValidator.ts` | Magic-byte MIME detection, dangerous extension block, per-type size limits |
| `threatMonitor.ts` | Spike counters — fires CRITICAL log on threshold breach |

**Request pipeline for AI endpoints:** Bot Detection → IP Rate Limit → Auth → User Rate Limit → Body Size Cap → Prompt Filter → Token Cap → Output Scan

**Rules for new Cloud Functions:**
1. Bot check before auth (cheap rejection before Firestore/auth SDK calls)
2. Every 401/403/429 must call `logSecurityEvent()` with correct `SecurityEventType`
3. Upload endpoints must call `validateUpload()` — never accept raw bytes
4. AI endpoints must call `filterPromptInput()` before forwarding and `filterPromptOutput()` before returning
5. IP rate limit captcha at 10 req/min; log `CAPTCHA_FAILED`; validate `action` string for reCAPTCHA v3 (prevents token replay)

---

## 📅 CALENDAR INTEGRATION — Gotchas

The Calendar feature uses server-side OAuth 2.0 (tokens never reach the client). Key files: `calendarTokenHelper.ts` (caches + refreshes tokens), `CalendarCallback.tsx` (OAuth redirect handler), `calendarAuthService.ts` (frontend OAuth initiator).

**Critical rules learned the hard way:**

1. **Use `printf` not `echo` for Firebase secrets** — `echo` appends `\n`, causing `invalid_client` OAuth errors:
```bash
printf 'YOUR_SECRET_VALUE' | firebase functions:secrets:set SECRET_NAME
# Verify: firebase functions:secrets:access KEY | xxd | tail -3 (one 0a = fine, two = bad)
```

2. **Secrets before deploy** — Firebase pins to the latest secret version at deploy time. Always create/update the secret first, then deploy.

3. **`resource == null` guard in Firestore rules** — `resource` is `null` on creates; `resource.data.userId` throws without the guard:
```javascript
// ✅ Correct
allow write: if request.auth.uid == userId
                && (resource == null || !resource.data.userId || resource.data.userId == request.auth.uid);
```

4. **`useRef` guard for single-use `useEffect`** — React Strict Mode fires effects twice in dev. Use `hasRun` ref for auth code exchange, analytics init, or any one-time operation:
```typescript
const hasRun = useRef(false);
useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;
    // single-use work here
}, []);
```

---
## 💳 RAZORPAY INTEGRATION — Gotchas

**Critical rules learned the hard way:**

1. **Receipt string ≤ 40 chars** — Razorpay rejects orders with a receipt longer than 40 characters. The SDK throws a plain object (`{statusCode:400, error:{description:"..."}}`) — not an `Error` instance — so `error instanceof Error` is `false` and the message is lost. Use a short format:
```typescript
// ✅ Correct — 29 chars
receipt: `r_${uid.slice(0, 10)}_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`

// ❌ Wrong — 71 chars, Razorpay rejects with BAD_REQUEST
receipt: `order_${uid}_${crypto.randomUUID()}`
```

2. **Razorpay SDK v2 throws plain objects, not Errors** — always handle both cases in catch blocks:
```typescript
const rzrErr = error as Record<string, unknown>;
const inner = rzrErr['error'] as Record<string, unknown> | undefined;
const message = inner?.['description']
    ? `${String(inner['code'])}: ${String(inner['description'])}`
    : JSON.stringify(error);
```

3. **Secrets are bound at deploy time** — updating a GCP secret version does NOT take effect until you redeploy the function. Always `firebase deploy --only functions:<name>` after adding a new secret version.

4. **App Check header required on all onRequest functions** — include `'X-Firebase-AppCheck': token` in all Cloud Function calls from the client, or they return 401 silently. Use the shared `getAppCheckToken()` utility in `src/features/subscription/utils/appCheckToken.ts`.

---
## �🚫 TECH DEBT PREVENTION

Before ANY commit:
1. `npm run lint` → 0 errors
2. `npm run test` → 100% pass
3. `npm run build` → success
4. File audit: `find src -name "*.ts*" | xargs wc -l | awk '$1 > 300'` → empty
5. String audit: No inline strings in components
6. ID audit: No `Date.now()` for entity IDs — use `crypto.randomUUID()`
7. Selector audit: No object references in `useEffect` deps — use primitive selectors
8. Callback audit: No reactive Zustand state in `useCallback` deps — use `useRef`

**NO EXCEPTIONS. NO "TODO: fix later". NO SHORTCUTS.**
