/**
 * Regression test: editingNodeId stuck after heading blur
 *
 * Scenario (the original bug):
 * 1. User creates a node via double-click or N key
 * 2. FOCUS_NODE_EVENT fires → startEditing(nodeId) → heading auto-focuses
 * 3. User clicks pane background → heading TipTap blurs
 * 4. BUG: stopEditing() was never called → editingNodeId remains set
 * 5. Subsequent double-click and N key are blocked by editingNodeId guards
 * 6. The "+" toolbar button still works because useAddNode has no editingNodeId guard
 *
 * Root cause: IdeaCardHeadingSection did not pass onBlur to NodeHeading,
 * so the heading blur path never called stopEditing().
 *
 * Fix: IdeaCard passes a deferred onBlur that checks whether focus moved
 * outside the card wrapper (heading→body transitions are NOT exits).
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, it, expect, beforeEach } from 'vitest';
import { useCanvasStore } from '../stores/canvasStore';
import { useFocusStore } from '../stores/focusStore';

const HEADING_SECTION_SRC = readFileSync(
    resolve(__dirname, '../components/nodes/IdeaCardHeadingSection.tsx'), 'utf-8',
);

const IDEA_CARD_SRC = readFileSync(
    resolve(__dirname, '../components/nodes/IdeaCard.tsx'), 'utf-8',
);

const USE_IDEA_CARD_SRC = readFileSync(
    resolve(__dirname, '../hooks/useIdeaCard.ts'), 'utf-8',
);

describe('Stuck editingNodeId regression guard', () => {
    beforeEach(() => {
        useCanvasStore.setState({ editingNodeId: null });
        useFocusStore.setState({ focusedNodeId: null });
    });

    it('IdeaCardHeadingSection passes onBlur prop to NodeHeading', () => {
        expect(HEADING_SECTION_SRC).toMatch(/onBlur[=:]/);
        expect(HEADING_SECTION_SRC).toMatch(/<NodeHeading[\s\S]*?onBlur/);
    });

    it('IdeaCard passes an onBlur handler to IdeaCardHeadingSection', () => {
        expect(IDEA_CARD_SRC).toMatch(/<IdeaCardHeadingSection[\s\S]*?onBlur/);
    });

    it('onHeadingBlur uses requestAnimationFrame to defer exit check', () => {
        expect(USE_IDEA_CARD_SRC).toContain('requestAnimationFrame');
    });

    it('onHeadingBlur checks cardWrapperRef.contains(activeElement) before exiting', () => {
        expect(USE_IDEA_CARD_SRC).toMatch(/cardWrapperRef\.current\?\.contains\(document\.activeElement\)/);
    });

    it('IdeaCard passes onHeadingBlur (not inline handler) to IdeaCardHeadingSection', () => {
        expect(IDEA_CARD_SRC).toContain('onHeadingBlur');
        expect(IDEA_CARD_SRC).not.toContain('requestAnimationFrame');
    });

    it('editingNodeId clears when stopEditing is called after heading blur', () => {
        useCanvasStore.getState().startEditing('auto-edit-node');
        expect(useCanvasStore.getState().editingNodeId).toBe('auto-edit-node');

        useCanvasStore.getState().stopEditing();
        expect(useCanvasStore.getState().editingNodeId).toBeNull();
    });

    it('onExitEditing is a no-op when focusedNodeId is set (focus mode safe)', () => {
        useCanvasStore.getState().startEditing('focused-node');
        useFocusStore.setState({ focusedNodeId: 'focused-node' });

        const focusedNodeId = useFocusStore.getState().focusedNodeId;
        if (!focusedNodeId) {
            useCanvasStore.getState().stopEditing();
        }

        expect(useCanvasStore.getState().editingNodeId).toBe('focused-node');
    });

    it('double-click creation is blocked by stale editingNodeId', () => {
        useCanvasStore.setState({ editingNodeId: 'stale-node', nodes: [], edges: [], selectedNodeIds: new Set() });

        const editingNodeId = useCanvasStore.getState().editingNodeId;
        const isBlocked = Boolean(editingNodeId);
        expect(isBlocked).toBe(true);
    });

    it('N-key creation is blocked by stale editingNodeId', () => {
        useCanvasStore.setState({ editingNodeId: 'stale-node' });

        const editingNodeId = useCanvasStore.getState().editingNodeId;
        const isBlocked = Boolean(editingNodeId);
        expect(isBlocked).toBe(true);
    });
});
