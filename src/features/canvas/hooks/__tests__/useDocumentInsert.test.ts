/**
 * useDocumentInsert Hook Tests — toast notification on upload start
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { strings } from '@/shared/localization/strings';

const mockInsertContent = vi.fn();
const mockFocus = vi.fn();

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
            updateNodeOutput: vi.fn(),
            updateNodeAttachments: vi.fn(),
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
import { useDocumentInsert } from '../useDocumentInsert';
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
});
