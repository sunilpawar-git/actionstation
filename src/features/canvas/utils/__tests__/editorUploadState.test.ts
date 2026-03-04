/**
 * editorUploadState Tests — pure function: detects uploading attachment in TipTap doc
 */
import { describe, it, expect, vi } from 'vitest';
import { hasUploadingAttachment } from '../editorUploadState';

function makeNode(typeName: string, attrs: Record<string, unknown> = {}) {
    return { type: { name: typeName }, attrs };
}

function makeEditor(nodes: Array<ReturnType<typeof makeNode>>, destroyed = false) {
    return {
        isDestroyed: destroyed,
        state: {
            doc: {
                descendants: vi.fn((cb: (node: ReturnType<typeof makeNode>) => boolean) => {
                    for (const n of nodes) {
                        if (!cb(n)) break;
                    }
                }),
            },
        },
    } as never;
}

describe('hasUploadingAttachment', () => {
    it('returns false for null editor', () => {
        expect(hasUploadingAttachment(null)).toBe(false);
    });

    it('returns false for destroyed editor', () => {
        const editor = makeEditor([], true);
        expect(hasUploadingAttachment(editor)).toBe(false);
    });

    it('returns false when no attachment nodes exist', () => {
        const editor = makeEditor([makeNode('paragraph')]);
        expect(hasUploadingAttachment(editor)).toBe(false);
    });

    it('returns false when attachment exists but status is ready', () => {
        const editor = makeEditor([makeNode('attachment', { status: 'ready' })]);
        expect(hasUploadingAttachment(editor)).toBe(false);
    });

    it('returns true when an attachment has status uploading', () => {
        const editor = makeEditor([makeNode('attachment', { status: 'uploading' })]);
        expect(hasUploadingAttachment(editor)).toBe(true);
    });

    it('returns true when uploading attachment is among other nodes', () => {
        const editor = makeEditor([
            makeNode('paragraph'),
            makeNode('attachment', { status: 'ready' }),
            makeNode('attachment', { status: 'uploading' }),
        ]);
        expect(hasUploadingAttachment(editor)).toBe(true);
    });

    it('short-circuits after finding uploading attachment', () => {
        const descendantsFn = vi.fn((cb: (node: ReturnType<typeof makeNode>) => boolean) => {
            cb(makeNode('attachment', { status: 'uploading' }));
            // Should not be called again since the first returned false
            const shouldContinue = cb(makeNode('attachment', { status: 'ready' }));
            expect(shouldContinue).toBe(false);
        });

        const editor = {
            isDestroyed: false,
            state: { doc: { descendants: descendantsFn } },
        } as never;

        hasUploadingAttachment(editor);
        expect(descendantsFn).toHaveBeenCalledOnce();
    });

    it('returns false when editor.state.doc is undefined', () => {
        const editor = { isDestroyed: false, state: {} } as never;
        expect(hasUploadingAttachment(editor)).toBe(false);
    });
});
