/**
 * Structural test: draftContent selector scope enforcement
 *
 * Prevents O(N) per-keystroke re-render regression where useNodeInput subscribed
 * to the global `draftContent` store field without scoping to the editing node.
 *
 * == ROOT CAUSE ==
 *   useNodeInput used `useCanvasStore((s) => s.draftContent)` — an unscoped selector.
 *   useNodeInput is called in every IdeaCard (a per-node component).
 *   When ANY node types, updateDraft() fires → draftContent changes →
 *   ALL N IdeaCards receive the Zustand notification → ALL N cards re-render.
 *   With 50 nodes: 50 re-renders per keystroke — causes visible typing stutter.
 *
 * == CORRECT PATTERN ==
 *   Selector must be scoped: `(s) => s.editingNodeId === nodeId ? s.draftContent : null`
 *   Non-editing nodes return null (unchanged) → Zustand skips their re-renders.
 *   Result: O(1) re-renders per keystroke (only the actively-editing card).
 *
 * == WHY THIS ALSO FIXES FOCUS MODE ==
 *   FocusOverlay calls updateDraft() via useIdeaCardEditor on every keystroke.
 *   With the old unscoped selector, all N canvas IdeaCards would re-render even
 *   while the user types inside the FocusOverlay (a portal, separate from the canvas).
 *   The scoped selector fixes both regular node typing and focus mode typing.
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, it, expect } from 'vitest';

const SRC_DIR = join(process.cwd(), 'src');

describe('draftContent selector scope enforcement (prevents O(N) keystroke re-renders)', () => {
    const useNodeInputPath = join(SRC_DIR, 'features/canvas/hooks/useNodeInput.ts');
    const content = readFileSync(useNodeInputPath, 'utf-8');
    const headingEditorPath = join(SRC_DIR, 'features/canvas/hooks/useHeadingEditor.ts');
    const headingContent = readFileSync(headingEditorPath, 'utf-8');

    it('useNodeInput does NOT use the unscoped (s) => s.draftContent selector', () => {
        // This pattern subscribes ALL N IdeaCards to draftContent — O(N) re-renders per keystroke.
        const unscopedPattern = /useCanvasStore\(\s*\(\s*\w+\s*\)\s*=>\s*\w+\.draftContent\s*\)/;
        expect(
            unscopedPattern.test(content),
            'useNodeInput.ts uses unscoped (s) => s.draftContent — this causes O(N) re-renders per keystroke.\n\n' +
            '  Fix: scope the selector to the editing node:\n' +
            '    const draftContent = useCanvasStore((s) => s.editingNodeId === nodeId ? s.draftContent : null);\n\n' +
            '  Why: useNodeInput is called in every IdeaCard. With N=50 nodes on canvas,\n' +
            '  unscoped draftContent subscription means 50 re-renders on every keystroke.',
        ).toBe(false);
    });

    it('useNodeInput uses a scoped draftContent selector (editingNodeId === nodeId)', () => {
        // Must contain the scoped selector pattern that returns null for non-editing nodes.
        const scopedPattern = /editingNodeId\s*===\s*nodeId/;
        expect(
            scopedPattern.test(content),
            'useNodeInput.ts is missing the scoped draftContent selector.\n\n' +
            '  Required pattern:\n' +
            '    const draftContent = useCanvasStore((s) => s.editingNodeId === nodeId ? s.draftContent : null);\n\n' +
            '  This ensures only the actively-editing IdeaCard re-renders on each keystroke.',
        ).toBe(true);
    });

    // == HEADING EDITOR: deferred-save enforcement ==
    // Previously, useHeadingEditor passed onUpdate/onHeadingChange to useTipTapEditor,
    // calling updateNodeHeading() on every keystroke. Since updateNodeHeading mutates the
    // nodes[] array, ALL N IdeaCards re-rendered per keystroke (O(N) stutter).
    // Fix: heading is committed on blur/submit only, NOT per keystroke.

    it('useHeadingEditor must NOT pass onUpdate to useTipTapEditor', () => {
        // If onUpdate is passed, every keystroke in the heading fires a callback.
        // Any callback that mutates nodes[] (e.g. updateNodeHeading) causes O(N) re-renders.
        // Heading must be committed on blur/submit only (via commitHeading).
        const tiptapCallBlock = /useTipTapEditor\(\{[\s\S]*?\}\)/.exec(headingContent);
        const hasOnUpdate = tiptapCallBlock?.[0].includes('onUpdate');
        expect(
            hasOnUpdate,
            'useHeadingEditor passes onUpdate to useTipTapEditor — this causes O(N) re-renders.\n\n' +
            '  The heading editor must NOT write to the store per keystroke.\n' +
            '  Heading saves must be deferred to blur/submit via commitHeading().\n' +
            '  Remove onUpdate from the useTipTapEditor options object.',
        ).toBeFalsy();
    });

    it('useHeadingEditor uses deferred commitHeading pattern', () => {
        expect(
            headingContent.includes('commitHeading'),
            'useHeadingEditor.ts is missing the commitHeading pattern.\n\n' +
            '  Heading saves must be deferred to blur/submit — never per keystroke.\n' +
            '  updateNodeHeading per keystroke mutates nodes[] → O(N) re-renders.',
        ).toBe(true);
    });

    // == PER-NODE SELECTOR SCOPING: editingNodeId / focusedNodeId ==
    // useIdeaCard subscribes to editingNodeId and focusedNodeId. These are global
    // fields that change whenever editing starts/stops or focus changes.
    // Unscoped selectors (returning the raw string) cause ALL N IdeaCards to re-render
    // on every edit/focus transition. Scoped selectors (returning boolean `=== id`)
    // reduce this to O(1) — only the affected cards re-render.

    it('useIdeaCard must NOT use unscoped editingNodeId selector', () => {
        const ideaCardHook = readFileSync(
            join(SRC_DIR, 'features/canvas/hooks/useIdeaCard.ts'), 'utf-8',
        );
        // Unscoped: returns the raw string → ALL N cards re-render on edit start/stop
        const unscopedPattern = /useCanvasStore\(\s*\(\s*\w+\s*\)\s*=>\s*\w+\.editingNodeId\s*\)/;
        expect(
            unscopedPattern.test(ideaCardHook),
            'useIdeaCard.ts uses unscoped (s) => s.editingNodeId — O(N) re-renders on edit start/stop.\n\n' +
            '  Fix: scope to boolean:\n' +
            '    const isEditingThisNode = useCanvasStore((s) => s.editingNodeId === id);',
        ).toBe(false);
    });

    it('useIdeaCard must NOT use unscoped focusedNodeId selector', () => {
        const ideaCardHook = readFileSync(
            join(SRC_DIR, 'features/canvas/hooks/useIdeaCard.ts'), 'utf-8',
        );
        const unscopedPattern = /useFocusStore\(\s*\(\s*\w+\s*\)\s*=>\s*\w+\.focusedNodeId\s*\)/;
        expect(
            unscopedPattern.test(ideaCardHook),
            'useIdeaCard.ts uses unscoped (s) => s.focusedNodeId — O(N) re-renders on focus change.\n\n' +
            '  Fix: scope to boolean:\n' +
            '    const isFocusedOnThisNode = useFocusStore((s) => s.focusedNodeId === id);',
        ).toBe(false);
    });

    // == useNodeShortcuts: NO Zustand subscription for editingNodeId ==
    // useNodeShortcuts is called per-node via useIdeaCardHandlers. Previously it
    // subscribed to `(s) => s.editingNodeId !== null` — a boolean that flips for
    // ALL N subscribers on edit start (null→non-null) and stop (non-null→null).
    // Fix: read editingNodeId via getState() inside the event handler.

    it('useNodeShortcuts must NOT subscribe to editingNodeId via selector', () => {
        const shortcutsContent = readFileSync(
            join(SRC_DIR, 'features/canvas/hooks/useNodeShortcuts.ts'), 'utf-8',
        );
        // Any useCanvasStore((s) => ...) selector pattern — this hook should only use getState()
        const selectorPattern = /useCanvasStore\(\s*\(/;
        expect(
            selectorPattern.test(shortcutsContent),
            'useNodeShortcuts.ts subscribes to canvasStore via selector — O(N) re-renders.\n\n' +
            '  useNodeShortcuts is called per-node. Any Zustand selector subscription\n' +
            '  fires for ALL N IdeaCards on every store change.\n' +
            '  Fix: read editingNodeId via getState() inside the keydown handler.',
        ).toBe(false);
    });

    it('useNodeShortcuts uses getState() for editingNodeId check', () => {
        const shortcutsContent = readFileSync(
            join(SRC_DIR, 'features/canvas/hooks/useNodeShortcuts.ts'), 'utf-8',
        );
        expect(
            shortcutsContent.includes('getState().editingNodeId'),
            'useNodeShortcuts.ts must check editingNodeId via getState() inside the handler.\n' +
            '  This avoids O(N) Zustand subscription re-renders on edit start/stop.',
        ).toBe(true);
    });

    // == useNodeInput: must NOT have redundant useNodeData subscription ==
    // useNodeInput is called per-node. useIdeaCard already calls useNodeData(id),
    // so useNodeInput must NOT call it again — that would create 2N snapshot
    // functions firing on every store change.

    it('useNodeInput must NOT import or call useNodeData', () => {
        expect(
            content.includes('useNodeData'),
            'useNodeInput.ts imports/calls useNodeData — redundant subscription.\n\n' +
            '  useIdeaCard already subscribes to useNodeData(id). Adding a second\n' +
            '  subscription in useNodeInput doubles the snapshot computations (2N).\n' +
            '  Fix: pass nodeOutput as a parameter from useIdeaCardHandlers.',
        ).toBe(false);
    });
});
