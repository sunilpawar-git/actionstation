/**
 * ImageExtension — Delete button tests
 *
 * The NodeImage extension injects a "×" button overlay into every image
 * node view so users can remove the image without selecting it first.
 * createImageDeleteButton() is extracted as a pure factory for testability.
 */
import { describe, it, expect, vi } from 'vitest';
import { createImageDeleteButton, applyImageDeleteButton } from '../imageExtension';
import { strings } from '@/shared/localization/strings';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeMockEditor(dispatch = vi.fn()) {
    const mockTr = {
        delete: vi.fn().mockReturnThis(),
    };
    return {
        view: {
            state: { tr: mockTr },
            dispatch,
        },
        _tr: mockTr,
    } as unknown as Parameters<typeof createImageDeleteButton>[0];
}

// ---------------------------------------------------------------------------
// createImageDeleteButton — shape
// ---------------------------------------------------------------------------

describe('createImageDeleteButton — element shape', () => {
    it('returns an HTMLButtonElement', () => {
        const btn = createImageDeleteButton(makeMockEditor(), () => 0, 1);
        expect(btn instanceof HTMLButtonElement).toBe(true);
    });

    it('has type="button" to prevent accidental form submission', () => {
        const btn = createImageDeleteButton(makeMockEditor(), () => 0, 1);
        expect(btn.type).toBe('button');
    });

    it('has class "node-image-delete-btn"', () => {
        const btn = createImageDeleteButton(makeMockEditor(), () => 0, 1);
        expect(btn.classList.contains('node-image-delete-btn')).toBe(true);
    });

    it('carries the correct aria-label from strings', () => {
        const btn = createImageDeleteButton(makeMockEditor(), () => 0, 1);
        expect(btn.getAttribute('aria-label')).toBe(strings.canvas.imageRemove);
    });

    it('displays the "×" symbol as text content', () => {
        const btn = createImageDeleteButton(makeMockEditor(), () => 0, 1);
        expect(btn.textContent).toBe('×');
    });
});

// ---------------------------------------------------------------------------
// createImageDeleteButton — delete behaviour
// ---------------------------------------------------------------------------

describe('createImageDeleteButton — delete on mousedown', () => {
    it('dispatches a delete transaction on mousedown', () => {
        const dispatch = vi.fn();
        const editor = makeMockEditor(dispatch);
        const btn = createImageDeleteButton(editor, () => 2, 3);

        btn.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));

        expect((editor.view.state.tr as unknown as { delete: ReturnType<typeof vi.fn> }).delete)
            .toHaveBeenCalledWith(2, 5); // pos=2, pos+nodeSize=2+3=5
        expect(dispatch).toHaveBeenCalled();
    });

    it('deletes the correct range: pos to pos + nodeSize', () => {
        const dispatch = vi.fn();
        const editor = makeMockEditor(dispatch);
        const btn = createImageDeleteButton(editor, () => 10, 7);

        btn.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));

        expect((editor.view.state.tr as unknown as { delete: ReturnType<typeof vi.fn> }).delete)
            .toHaveBeenCalledWith(10, 17);
    });

    it('does not dispatch when getPos returns undefined', () => {
        const dispatch = vi.fn();
        const editor = makeMockEditor(dispatch);
        const btn = createImageDeleteButton(editor, () => undefined, 3);

        btn.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));

        expect(dispatch).not.toHaveBeenCalled();
    });
});

// ---------------------------------------------------------------------------
// Integration — applyImageDeleteButton adds button to the node view DOM
// ---------------------------------------------------------------------------

describe('applyImageDeleteButton — DOM injection', () => {
    it('adds a .node-image-delete-btn button as child of the container', () => {
        const container = document.createElement('div');
        const editor = makeMockEditor();

        applyImageDeleteButton(container, editor, () => 0, 1);

        const btn = container.querySelector('.node-image-delete-btn');
        expect(btn).not.toBeNull();
        expect(btn?.tagName).toBe('BUTTON');
    });
});
