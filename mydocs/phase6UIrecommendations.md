# Phase 6: UI Architectural Recommendations (DEFERRED)

> **Status**: PARKED — revisit after Phases 1-5 ship and user feedback is collected.
>
> **Strategic context**: The guiding light (00futureLight) identified that the project risk
> is strategic, not technical. These recommendations are internal refactors with zero
> user-facing value. They should only be pursued when: (a) Phases 1-5 are shipped,
> (b) user feedback reveals performance or maintainability pain points, or
> (c) the team grows beyond 2 developers and needs stricter architectural conventions.

---

## Recommendation 1: Localized State Selectors — ALREADY IMPLEMENTED

**Status**: COMPLETE (no action needed)

The codebase already enforces this pattern:
- Zustand selector pattern is mandatory per CLAUDE.md
- Structural test `zustandSelectors.structural.test.ts` scans for all 8 anti-patterns and fails the build
- Closure variable anti-pattern fixed (structural test detects `getNodeMap` inside selectors)
- `useIdeaCard` is already split into granular hooks: `useIdeaCardImageHandlers`, `useNodeResize`, `useNodeInput`, `useNodeUtilsBar`, `useBarPinOpen`, etc.
- `React.memo` applied to all custom nodes per CLAUDE.md performance rules

**Original concern about "God Hooks"**: Not applicable — largest hook is 106 lines (`useIdeaCardImageHandlers`), well under the 75-line CLAUDE.md limit (with approved exception for image handler complexity). No hook subscribes to entire store objects.

---

## Recommendation 2: Compound Components — DEFERRED

**Original problem**: "Monolithic components requiring 30+ props"

**Current reality**: IdeaCard is **85 lines** with ~12 props (not 30+). Phase 3 further simplifies it by removing `pinOpenHandlers`, `isPinnedOpen`, and deck-related props. After Phase 3, IdeaCard will have ~8 props.

**When to revisit**: Only if IdeaCard grows past 150+ lines or gains 20+ props. This would indicate a genuine need for composition. Current trajectory (Phase 3 removes complexity) makes this unlikely.

**If implemented later**, the compound pattern would look like:
```tsx
<IdeaCard id={nodeId}>
  <IdeaCard.Header onAction={handleAction} />
  <IdeaCard.Content editor={editorInstance} />
  {hasTags && <IdeaCard.Footer tags={tags} />}
</IdeaCard>
```

**Risk of premature adoption**: Compound components add a React Context layer and split rendering logic across files. For a component that's already 85 lines, this adds complexity rather than reducing it. The Open/Closed Principle is already satisfied by the feature-first architecture (new node types = new components, not IdeaCard modifications).

---

## Recommendation 3: `clsx` Adoption — CHERRY-PICK (Low Priority)

**Status**: Adopt opportunistically — add `clsx` as a dependency, use it when touching files that have conditional class logic. No dedicated migration sprint.

**What to adopt now**:
- `clsx` (~1KB, zero runtime cost) for cleaner conditional classes
- Use pattern: `className={clsx(styles.card, { [styles.collapsed]: isCollapsed })}`
- Apply only to files being modified in Phases 1-5 (no separate migration pass)

**What to skip**:
- **Tailwind CSS migration**: Hard no at this stage. Reasons:
  - 292 lines of CSS variables in `variables.css` already enforce design tokens
  - Every `.module.css` file would need rewriting (~40 CSS module files)
  - CSS variable system supports 4 themes (dark/darkBlack/grey/sepia) via `:root` overrides — Tailwind would need equivalent `@apply` or `theme()` wiring
  - Zero user-facing value — the styling system works correctly
  - Massive churn risk for a solo/small team
- **Re-evaluate Tailwind**: Only when (a) team grows to 3+ developers, or (b) CSS module files exceed 50 total and drift becomes measurable

---

## Recommendation 4: Headless Primitives (Radix UI) — DEFERRED

**Original problem**: "Custom dropdowns, popovers, tooltips re-inventing the wheel"

**Current reality**: The codebase has ~5 interactive overlay types, all working correctly:
- `useEscapeLayer` (107 lines) — 8-level priority dispatch, handles keyboard dismissal
- `escapePriorities.ts` (27 lines) — deterministic priority levels
- Portal pattern via `createPortal(el, document.body)` — proven in ColorMenu, ShareMenu, TransformMenu
- Phase 3 adds `NodeContextMenu` with viewport clamping + canvas pan guard

**When to revisit**:
- If an accessibility audit reveals failures in focus trapping or screen reader support
- If overlay count grows past 10 types and the custom system becomes a maintenance burden
- If the app needs complex components like comboboxes, date pickers, or multi-select dropdowns

**Risk of premature adoption**: Radix/Headless UI adds 50-100KB of dependencies for behavior the codebase already handles in ~150 lines of shared hooks. The escape priority system is purpose-built for ReactFlow's unique interaction model (canvas pan, node drag, nested submenus) — generic headless primitives may not handle these edge cases correctly without significant customization.

---

## Summary

| Recommendation | Action | When |
|---------------|--------|------|
| 1. State Selectors | Already done | N/A |
| 2. Compound Components | Defer | If IdeaCard exceeds 150 lines or 20+ props |
| 3a. `clsx` | Cherry-pick opportunistically | During Phases 1-5 file touches |
| 3b. Tailwind | Skip | If team grows to 3+ devs |
| 4. Headless Primitives | Defer | If a11y audit fails or overlay count > 10 |
