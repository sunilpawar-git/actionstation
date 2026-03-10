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
});
