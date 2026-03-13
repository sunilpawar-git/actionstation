# ActionStation - Project Rules

> **CRITICAL**: ZERO TECH DEBT policy. All rules are NON-NEGOTIABLE.

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
│   ├── calendar/          # Google Calendar sync
│   └── documentAgent/     # Image analysis, auto-spawn
├── shared/
│   ├── components/        # Reusable UI (Button, Toast)
│   ├── hooks/             # Generic hooks (useDebounce)
│   ├── utils/             # Pure functions
│   └── localization/      # String resources
├── config/                # Environment, constants
└── styles/                # CSS variables, global styles
```

### SOLID Principles Enforcement
- **S**: One file = One responsibility
- **O**: Extend via composition, not modification
- **NO HARDCODED STRINGS**: Use `stringResource(R.string.key)` or `context.getString()`.
- **NO HARDCODED COLORS**: Use `MaterialTheme.colorScheme.primary`.
- **NO HARDCODED DIMENSIONS**: Use `dp` or `sp` resources/constants.
- **SECURITY: NO SECRETS IN CODE**: NEVER hardcode API keys, passwords, or tokens. Use `.env.local` for local development. Use environment variables in CI/CD.
- **L**: Interfaces define contracts
- **I**: Small, focused interfaces
- **D**: Depend on abstractions (services via interfaces)

## 🗣️ NO HARDCODING (ZERO TOLERANCE)

```typescript
// ❌ FORBIDDEN
<button>Submit</button>
style={{ color: '#3b82f6' }}

// ✅ REQUIRED
import { strings } from '@/shared/localization/strings';
<button>{strings.common.submit}</button>
className={styles.primaryButton}  // Uses CSS variable
```

## � CSS → TAILWIND INCREMENTAL MIGRATION

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

// ✅ CORRECT — full migration, Tailwind only
<button className="mt-4 px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg">...</button>

// ✅ CORRECT — CSS variable values in Tailwind arbitrary syntax
className="text-[var(--color-text-primary)] bg-[var(--color-surface)]"

// ✅ CORRECT — Tailwind spacing maps to our tokens
// --space-sm: 8px  → use p-2, gap-2 (0.5rem ≈ 8px)
// --space-md: 16px → use p-4, gap-4
// --space-lg: 24px → use p-6, gap-6
```

### Hard rules during migration

1. **All-in or leave it**: Never partially convert a `.module.css` — convert the whole file or none
2. **Delete the `.module.css` file** when done — do not leave empty or orphaned files
3. **No new `.module.css` files** may be created for any component going forward
4. **Theme-aware colors** must use `var(--color-*)` arbitrary syntax, never Tailwind's built-in palette (e.g. `bg-blue-500` → `bg-[var(--color-primary)]`)
5. **Canvas components stay in CSS** — `IdeaCard`, `CanvasView`, node/edge files are last-resort migrations

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

// 5. Memoize callbacks
const onNodeDrag = useCallback(() => {}, []);
```

## 🔒 SECURITY PROTOCOL

### Firebase Rules Structure
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // DENY ALL by default
    match /{document=**} {
      allow read, write: if false;
    }
    
    // User isolation
    match /users/{userId} {
      allow read, write: if request.auth != null 
                        && request.auth.uid == userId;
      
      match /workspaces/{workspaceId} {
        allow read, write: if request.auth.uid == userId;
        
        match /nodes/{nodeId} {
          allow read, write: if request.auth.uid == userId;
        }
        match /edges/{edgeId} {
          allow read, write: if request.auth.uid == userId;
        }
      }
    }
  }
}
```

### API Key Protection
- `.env.local` for all secrets (NEVER commit)
- Firebase App Check enabled (recaptcha v3)
- Gemini API calls via Cloud Function (hide API key)

### Code Security
- NO `any` types in production
- Input validation on all user content
- XSS prevention: sanitize markdown output
- CORS configured for production domain only

## 🧪 TDD PROTOCOL (STRICT)

```
1. RED:    Write failing test first
2. GREEN:  Minimal code to pass
3. REFACTOR: Clean while green
4. COMMIT: Only when tests pass
```

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

**Why This Matters:**
- Bare destructuring subscribes to ENTIRE store object
- ANY field change → component re-renders → useEffect fires → updates store → cascades
- With 500+ nodes in ReactFlow, this causes "Maximum update depth exceeded" errors
- Selectors ensure component only re-renders when SPECIFIC field changes

**All Zustand Stores Require Selectors:**
- `useAuthStore` → `const user = useAuthStore((s) => s.user)`
- `useWorkspaceStore` → `const currentId = useWorkspaceStore((s) => s.currentWorkspaceId)`
- `useCanvasStore` → `const nodes = useCanvasStore((s) => s.nodes)`
- `useToastStore` → `const toasts = useToastStore((s) => s.toasts)`
- `useConfirmStore` → `const isOpen = useConfirmStore((s) => s.isOpen)`
- `useSettingsStore` → `const theme = useSettingsStore((s) => s.theme)`
- `useFocusStore` → `const focusedId = useFocusStore((s) => s.focusedNodeId)`
- `useKnowledgeBankStore` → `const entries = useKnowledgeBankStore((s) => s.entries)`

**Enforcement:** Regression test `src/__tests__/zustandSelectors.structural.test.ts` scans for all 8 anti-patterns and fails the build if any are found.

**Common Mistakes to Avoid:**

```typescript
// ❌ WRONG: Including selector in useEffect dependency
useEffect(() => {
  const currentId = useWorkspaceStore((s) => s.currentWorkspaceId);
  // ... do something
}, [useWorkspaceStore((s) => s.currentWorkspaceId)]); // DON'T DO THIS!

// ✅ CORRECT: Call selector outside useEffect, use value in dependency
const currentId = useWorkspaceStore((s) => s.currentWorkspaceId);
useEffect(() => {
  // ... do something with currentId
}, [currentId]);

// ❌ WRONG: Mixing selector and action in one hook call
const { user, setUser } = useAuthStore((s) => ({ user: s.user, setUser: s.setUser }));

// ✅ CORRECT: Selectors for state, getState() for actions
const user = useAuthStore((s) => s.user);
const handleUpdate = useCallback(() => {
  useAuthStore.getState().setUser(newUser);
}, []);
```

**Testing/Mocking:** See `src/shared/components/__tests__/Toast.test.tsx` for the canonical Zustand mock pattern (handles both selectors and `getState()`).

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

**Why Closure Variables Cause Problems:**
1. Selector function captures `focusedNodeId` in closure
2. When component re-renders, NEW selector function is created
3. Zustand sees different function reference → triggers re-subscription logic
4. During drag (60 updates/sec), this compounds across all visible nodes
5. Eventually causes "Maximum update depth exceeded"

**Enforcement:** Structural test detects `getNodeMap` inside selectors.

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

## 🚫 TECH DEBT PREVENTION

Before ANY commit:
1. `npm run lint` → 0 errors
2. `npm run test` → 100% pass
3. `npm run build` → success
4. File audit: `find src -name "*.ts*" | xargs wc -l | awk '$1 > 300'` → empty
5. String audit: No inline strings in components

**NO EXCEPTIONS. NO "TODO: fix later". NO SHORTCUTS.**
