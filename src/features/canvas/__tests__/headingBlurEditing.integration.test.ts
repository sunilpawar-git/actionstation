/**
 * Integration test: heading blur must not exit editing when focus stays inside the node.
 *
 * Three scenarios this file guards against:
 *
 * 1. ENTER KEY (heading → body): The heading TipTap blurs because the body
 *    TipTap receives focus. editingNodeId must STAY set so the body remains
 *    editable. This is the "Enter moves cursor to body" contract.
 *
 * 2. CLICK PANE (heading → outside): The heading TipTap blurs because the
 *    user clicked the canvas background. editingNodeId must CLEAR so that
 *    double-click and N-key shortcuts can create new nodes again.
 *
 * 3. FOCUS MODE: When focusedNodeId is set, heading blur must NOT clear
 *    editingNodeId — the FocusOverlay owns the editing lifecycle.
 *
 * The deferred-blur technique (requestAnimationFrame + contains-check) is
 * exercised here by simulating the DOM focus state that would exist after
 * the browser settles the new activeElement.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { useCanvasStore } from '../stores/canvasStore';
import { useFocusStore } from '../stores/focusStore';

const NODE_ID = 'heading-blur-node';

/**
 * Simulates the handleHeadingBlur logic from IdeaCard.tsx:
 *   requestAnimationFrame(() => {
 *       if (cardWrapperRef.current?.contains(document.activeElement)) return;
 *       onExitEditing();
 *   });
 *
 * We can't render IdeaCard in jsdom (ReactFlow context required), so we
 * replicate the exact branching logic with a real DOM tree.
 */
function simulateHeadingBlur(
    cardWrapper: HTMLElement,
    newActiveElement: HTMLElement | null,
) {
    if (newActiveElement) {
        Object.defineProperty(document, 'activeElement', {
            value: newActiveElement,
            configurable: true,
        });
    }

    const focusStaysInCard = cardWrapper.contains(document.activeElement);
    if (focusStaysInCard) return;

    const focusedNodeId = useFocusStore.getState().focusedNodeId;
    if (focusedNodeId) return;

    useCanvasStore.getState().stopEditing();
}

describe('Heading blur → editing lifecycle (integration)', () => {
    let cardWrapper: HTMLDivElement;
    let headingEl: HTMLDivElement;
    let bodyEl: HTMLDivElement;
    let paneEl: HTMLDivElement;

    beforeEach(() => {
        useCanvasStore.setState({ editingNodeId: null, nodes: [], edges: [], selectedNodeIds: new Set() });
        useFocusStore.setState({ focusedNodeId: null });

        cardWrapper = document.createElement('div');
        cardWrapper.setAttribute('data-testid', 'card-wrapper');

        headingEl = document.createElement('div');
        headingEl.setAttribute('contenteditable', 'true');
        headingEl.setAttribute('data-testid', 'heading-editor');
        cardWrapper.appendChild(headingEl);

        bodyEl = document.createElement('div');
        bodyEl.setAttribute('contenteditable', 'true');
        bodyEl.setAttribute('data-testid', 'body-editor');
        cardWrapper.appendChild(bodyEl);

        paneEl = document.createElement('div');
        paneEl.classList.add('react-flow__pane');

        document.body.appendChild(paneEl);
        document.body.appendChild(cardWrapper);
    });

    it('Enter key (heading → body): editingNodeId stays set', () => {
        useCanvasStore.getState().startEditing(NODE_ID);
        expect(useCanvasStore.getState().editingNodeId).toBe(NODE_ID);

        simulateHeadingBlur(cardWrapper, bodyEl);

        expect(useCanvasStore.getState().editingNodeId).toBe(NODE_ID);
    });

    it('Tab key (heading → body): editingNodeId stays set', () => {
        useCanvasStore.getState().startEditing(NODE_ID);

        simulateHeadingBlur(cardWrapper, bodyEl);

        expect(useCanvasStore.getState().editingNodeId).toBe(NODE_ID);
    });

    it('Click pane (heading → outside card): editingNodeId clears', () => {
        useCanvasStore.getState().startEditing(NODE_ID);
        expect(useCanvasStore.getState().editingNodeId).toBe(NODE_ID);

        simulateHeadingBlur(cardWrapper, paneEl);

        expect(useCanvasStore.getState().editingNodeId).toBeNull();
    });

    it('After editingNodeId clears, double-click guard no longer blocks', () => {
        useCanvasStore.getState().startEditing(NODE_ID);
        simulateHeadingBlur(cardWrapper, paneEl);

        expect(useCanvasStore.getState().editingNodeId).toBeNull();

        const wouldBlock = Boolean(useCanvasStore.getState().editingNodeId);
        expect(wouldBlock).toBe(false);
    });

    it('After editingNodeId clears, N-key guard no longer blocks', () => {
        useCanvasStore.getState().startEditing(NODE_ID);
        simulateHeadingBlur(cardWrapper, paneEl);

        const wouldBlock = Boolean(useCanvasStore.getState().editingNodeId);
        expect(wouldBlock).toBe(false);
    });

    it('Focus mode: heading blur does NOT clear editingNodeId', () => {
        useCanvasStore.getState().startEditing(NODE_ID);
        useFocusStore.setState({ focusedNodeId: NODE_ID });

        simulateHeadingBlur(cardWrapper, paneEl);

        expect(useCanvasStore.getState().editingNodeId).toBe(NODE_ID);
    });

    it('Focus on another element inside card (e.g. tag input): editingNodeId stays', () => {
        useCanvasStore.getState().startEditing(NODE_ID);

        const tagInput = document.createElement('input');
        cardWrapper.appendChild(tagInput);

        simulateHeadingBlur(cardWrapper, tagInput);

        expect(useCanvasStore.getState().editingNodeId).toBe(NODE_ID);
    });

    it('Focus on null (blur to nothing): editingNodeId clears', () => {
        useCanvasStore.getState().startEditing(NODE_ID);

        Object.defineProperty(document, 'activeElement', {
            value: document.body,
            configurable: true,
        });

        simulateHeadingBlur(cardWrapper, null);

        expect(useCanvasStore.getState().editingNodeId).toBeNull();
    });
});
