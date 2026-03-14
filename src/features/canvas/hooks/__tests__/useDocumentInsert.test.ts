/**
 * useDocumentInsert Hook Tests — toast + immediate persistence on upload start
 * + updateAttachmentByTempId fallback for blur-during-upload race
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { strings } from '@/shared/localization/strings';
import type { Editor } from '@tiptap/core';

const mockInsertContent = vi.fn();
const mockFocus = vi.fn();
const mockUpdateNodeOutput = vi.fn();
const mockUpdateNodeAttachments = vi.fn();

function createMockEditor(destroyed = false) {
    return {
        isDestroyed: destroyed,
        isFocused: true,
        commands: { focus: mockFocus, insertContent: mockInsertContent },
        state: {
            doc: { descendants: vi.fn() },
            tr: { steps: [], setNodeMarkup: vi.fn() },
        },
        view: { dispatch: vi.fn() },
    } as unknown;
}

vi.mock('../../stores/canvasStore', () => ({
    useCanvasStore: Object.assign(vi.fn(), {
        getState: () => ({
            nodes: [{ id: 'n1', data: { attachments: [] } }],
            updateNodeOutput: mockUpdateNodeOutput,
            updateNodeAttachments: mockUpdateNodeAttachments,
        }),
    }),
}));

vi.mock('../../services/documentInsertService', () => ({
    processDocumentForNode: vi.fn().mockResolvedValue({
        meta: { filename: 'f.pdf', url: 'https://cdn.example.com/f.pdf', mimeType: 'application/pdf', sizeBytes: 1024 },
        parsedText: 'hello',
    }),
}));

vi.mock('../../types/document', () => ({
    DOCUMENT_ACCEPTED_MIME_TYPES: ['application/pdf'],
}));

vi.mock('@/shared/services/sentryService', () => ({ captureError: vi.fn() }));

vi.mock('@/shared/stores/toastStore', () => ({
    toast: { info: vi.fn(), error: vi.fn() },
}));

/* eslint-disable import-x/first -- Must import after vi.mock */
import { useDocumentInsert, updateAttachmentByTempId } from '../useDocumentInsert';
import { toast } from '@/shared/stores/toastStore';
/* eslint-enable import-x/first */

describe('useDocumentInsert', () => {
    const mockUploadFn = vi.fn().mockResolvedValue({
        documentUrl: 'https://cdn.example.com/f.pdf',
        parsedTextUrl: 'https://cdn.example.com/f.txt',
    });
    const mockGetMarkdown = vi.fn().mockReturnValue('md');

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('shows toast.info when document upload starts', async () => {
        const editor = createMockEditor();
        const { result } = renderHook(() =>
            useDocumentInsert('n1', editor as never, mockUploadFn, mockGetMarkdown),
        );

        const file = new File([new ArrayBuffer(100)], 'test.pdf', { type: 'application/pdf' });

        await act(async () => {
            await result.current.insertFileDirectly(file);
        });

        expect(toast.info).toHaveBeenCalledWith(strings.canvas.docUploading);
    });

    it('does not show toast when editor is null', async () => {
        const { result } = renderHook(() =>
            useDocumentInsert('n1', null, mockUploadFn, mockGetMarkdown),
        );

        const file = new File([new ArrayBuffer(100)], 'test.pdf', { type: 'application/pdf' });

        await act(async () => {
            await result.current.insertFileDirectly(file);
        });

        expect(toast.info).not.toHaveBeenCalled();
    });

    it('does not show toast when editor is destroyed', async () => {
        const editor = createMockEditor(true);
        const { result } = renderHook(() =>
            useDocumentInsert('n1', editor as never, mockUploadFn, mockGetMarkdown),
        );

        const file = new File([new ArrayBuffer(100)], 'test.pdf', { type: 'application/pdf' });

        await act(async () => {
            await result.current.insertFileDirectly(file);
        });

        expect(toast.info).not.toHaveBeenCalled();
    });

    it('persists editor content to store immediately after inserting placeholder', async () => {
        const editor = createMockEditor();
        const { result } = renderHook(() =>
            useDocumentInsert('n1', editor as never, mockUploadFn, mockGetMarkdown),
        );

        const file = new File([new ArrayBuffer(100)], 'test.pdf', { type: 'application/pdf' });

        await act(async () => {
            await result.current.insertFileDirectly(file);
        });

        expect(mockUpdateNodeOutput).toHaveBeenCalledWith('n1', 'md');
        const firstOutputCall = mockUpdateNodeOutput.mock.invocationCallOrder[0] ?? 0;
        const firstToastCall = (toast.info as ReturnType<typeof vi.fn>).mock.invocationCallOrder[0] ?? 0;
        expect(firstOutputCall).toBeLessThan(firstToastCall);
    });
});

describe('updateAttachmentByTempId', () => {
    function makeMockEditor(nodes: Array<{ type: string; attrs: Record<string, unknown> }>) {
        const setNodeMarkup = vi.fn();
        const dispatch = vi.fn();
        const steps: unknown[] = [];
        setNodeMarkup.mockImplementation(() => { steps.push({}); });

        return {
            editor: {
                state: {
                    doc: {
                        descendants: vi.fn((cb: (n: { type: { name: string }; attrs: Record<string, unknown> }, pos: number) => void) => {
                            nodes.forEach((n, i) => cb({ type: { name: n.type }, attrs: { ...n.attrs } }, i));
                        }),
                    },
                    tr: { steps, setNodeMarkup },
                },
                view: { dispatch },
            } as unknown as Editor,
            setNodeMarkup,
            dispatch,
        };
    }

    it('updates node by exact tempId match', () => {
        const { editor, setNodeMarkup, dispatch } = makeMockEditor([
            { type: 'attachment', attrs: { url: '', filename: 'a.pdf', tempId: 'tmp-1' } },
        ]);

        updateAttachmentByTempId(editor, 'tmp-1', {
            url: 'https://cdn.example.com/a.pdf',
            filename: 'a.pdf',
            status: 'ready',
            tempId: null,
        });

        expect(setNodeMarkup).toHaveBeenCalledWith(0, undefined, expect.objectContaining({
            url: 'https://cdn.example.com/a.pdf',
        }));
        expect(dispatch).toHaveBeenCalled();
    });

    it('falls back to filename + empty url when tempId is lost (blur race)', () => {
        const { editor, setNodeMarkup, dispatch } = makeMockEditor([
            { type: 'attachment', attrs: { url: '', filename: 'doc.pdf', tempId: null } },
        ]);

        updateAttachmentByTempId(editor, 'tmp-gone', {
            url: 'https://cdn.example.com/doc.pdf',
            filename: 'doc.pdf',
            status: 'ready',
            tempId: null,
        });

        expect(setNodeMarkup).toHaveBeenCalledWith(0, undefined, expect.objectContaining({
            url: 'https://cdn.example.com/doc.pdf',
            filename: 'doc.pdf',
        }));
        expect(dispatch).toHaveBeenCalled();
    });

    it('does not update when neither tempId nor filename matches', () => {
        const { editor, setNodeMarkup, dispatch } = makeMockEditor([
            { type: 'attachment', attrs: { url: '', filename: 'other.pdf', tempId: null } },
        ]);

        updateAttachmentByTempId(editor, 'tmp-gone', {
            url: 'https://cdn.example.com/doc.pdf',
            filename: 'doc.pdf',
            status: 'ready',
            tempId: null,
        });

        expect(setNodeMarkup).not.toHaveBeenCalled();
        expect(dispatch).not.toHaveBeenCalled();
    });

    it('does not fallback-match nodes that already have a url', () => {
        const { editor, setNodeMarkup, dispatch } = makeMockEditor([
            { type: 'attachment', attrs: { url: 'https://existing.com/x.pdf', filename: 'doc.pdf', tempId: null } },
        ]);

        updateAttachmentByTempId(editor, 'tmp-gone', {
            url: 'https://cdn.example.com/doc.pdf',
            filename: 'doc.pdf',
            status: 'ready',
            tempId: null,
        });

        expect(setNodeMarkup).not.toHaveBeenCalled();
        expect(dispatch).not.toHaveBeenCalled();
    });

    it('only updates first matching placeholder when duplicates exist', () => {
        const { editor, setNodeMarkup } = makeMockEditor([
            { type: 'attachment', attrs: { url: '', filename: 'dup.pdf', tempId: null } },
            { type: 'attachment', attrs: { url: '', filename: 'dup.pdf', tempId: null } },
        ]);

        updateAttachmentByTempId(editor, 'tmp-gone', {
            url: 'https://cdn.example.com/dup.pdf',
            filename: 'dup.pdf',
            status: 'ready',
            tempId: null,
        });

        expect(setNodeMarkup).toHaveBeenCalledTimes(1);
        expect(setNodeMarkup).toHaveBeenCalledWith(0, undefined, expect.objectContaining({
            url: 'https://cdn.example.com/dup.pdf',
        }));
    });
});
