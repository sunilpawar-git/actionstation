/**
 * useIdeaCardImageHandlers — Image analysis pipeline tests (Phase 5C)
 * Verifies: describeImageWithAI + analyzeAndSpawn wiring, early-exit gates
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

const mockUpdateNodeOutput = vi.fn();
const mockAnalyzeAndSpawn = vi.fn().mockResolvedValue(undefined);
const mockDescribeImageWithAI = vi.fn().mockResolvedValue('AI-generated description');
const mockCaptureError = vi.fn();

vi.mock('../../stores/canvasStore', () => ({
    useCanvasStore: Object.assign(vi.fn(), {
        getState: () => ({
            nodes: [{ id: 'node-1', data: { attachments: [{ filename: 'doc.pdf' }] } }],
            updateNodeOutput: mockUpdateNodeOutput,
            editingNodeId: null,
            startEditing: vi.fn(),
            setInputMode: vi.fn(),
        }),
    }),
    getNodeMap: vi.fn().mockReturnValue(new Map([
        ['node-1', { id: 'node-1', data: { attachments: [{ filename: 'doc.pdf' }] } }],
    ])),
}));

const mockWorkspaceGetState = vi.fn().mockReturnValue({ currentWorkspaceId: 'ws-123' });
vi.mock('@/features/workspace/stores/workspaceStore', () => ({
    useWorkspaceStore: Object.assign(vi.fn(), {
        getState: () => mockWorkspaceGetState(),
    }),
}));

const mockSettingsGetState = vi.fn().mockReturnValue({ autoAnalyzeDocuments: true });
vi.mock('@/shared/stores/settingsStore', () => ({
    useSettingsStore: Object.assign(vi.fn(), {
        getState: () => mockSettingsGetState(),
    }),
}));

vi.mock('@/features/documentAgent/hooks/useDocumentAgent', () => ({
    useDocumentAgent: () => ({
        analyzeAndSpawn: mockAnalyzeAndSpawn,
        agentState: { status: 'idle', result: null, error: null },
    }),
}));

vi.mock('@/features/documentAgent/hooks/useOfflineQueue', () => ({
    useOfflineQueue: () => ({ enqueueIfOffline: vi.fn().mockReturnValue(true) }),
}));

vi.mock('@/features/documentAgent/services/analyzeCommandService', () => ({
    resolveAnalyzeCommand: vi.fn(),
}));

vi.mock('@/features/knowledgeBank/services/imageDescriptionService', () => ({
    describeImageWithAI: (...args: unknown[]) => mockDescribeImageWithAI(...args),
}));

vi.mock('@/shared/utils/sanitize', () => ({
    sanitizeFilename: (name: string) => name.replace(/[/\\]/g, '_'),
}));

vi.mock('@/shared/services/sentryService', () => ({
    captureError: (...args: unknown[]) => mockCaptureError(...args),
}));

vi.mock('@/shared/localization/strings', () => ({
    strings: {
        canvas: {
            imageUploading: 'Uploading image...',
            imageUploadFailed: 'Image upload failed.',
            imageReadFailed: 'Failed to read image.',
            imageUnsafeUrl: 'Unsafe URL.',
            imageFileTooLarge: 'Too large.',
            imageUnsupportedType: 'Unsupported.',
        },
        documentAgent: { cachedResult: 'Cached.' },
    },
}));

vi.mock('@/shared/stores/toastStore', () => ({
    toast: { info: vi.fn(), error: vi.fn(), success: vi.fn(), warning: vi.fn() },
}));

vi.mock('../../services/imageInsertService', () => ({
    ensureEditorFocus: vi.fn(),
    insertImageIntoEditor: vi.fn(),
    type: {},
}));

vi.mock('../useImageInsert', () => ({
    useImageInsert: (_e: unknown, _u: unknown, onAfterInsert: unknown) => {
        (useImageInsertCapture as { cb: unknown }).cb = onAfterInsert;
        return { triggerFilePicker: vi.fn() };
    },
}));

const useImageInsertCapture: { cb: unknown } = { cb: null };

vi.mock('../useDocumentInsert', () => ({
    useDocumentInsert: () => ({
        triggerFilePicker: vi.fn(),
        insertFileDirectly: vi.fn(),
    }),
}));

vi.mock('../useNodeDocumentUpload', () => ({
    useNodeDocumentUpload: () => vi.fn(),
}));

// eslint-disable-next-line import-x/first -- Must import after vi.mock
import { useIdeaCardImageHandlers } from '../useIdeaCardImageHandlers';

function renderHandler() {
    const getMarkdown = vi.fn().mockReturnValue('# Hello');
    const imageUploadFn = vi.fn().mockResolvedValue('https://cdn.example.com/img.jpg');
    const editor = null;

    const { result } = renderHook(() =>
        useIdeaCardImageHandlers({ id: 'node-1', editor, getMarkdown, imageUploadFn }),
    );

    const triggerAfterInsert = (file: File, url: string) => {
        const cb = useImageInsertCapture.cb as ((f: File, u: string) => void) | null;
        cb?.(file, url);
    };

    return { result, triggerAfterInsert, getMarkdown };
}

describe('useIdeaCardImageHandlers — image analysis', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockSettingsGetState.mockReturnValue({ autoAnalyzeDocuments: true });
        mockWorkspaceGetState.mockReturnValue({ currentWorkspaceId: 'ws-123' });
    });

    it('updates node output with current markdown on image insert', () => {
        const { triggerAfterInsert } = renderHandler();
        const file = new File(['x'], 'photo.png', { type: 'image/png' });
        act(() => triggerAfterInsert(file, 'https://cdn.example.com/photo.png'));

        expect(mockUpdateNodeOutput).toHaveBeenCalledWith('node-1', '# Hello');
    });

    it('calls describeImageWithAI with file blob and sanitized filename', async () => {
        const { triggerAfterInsert } = renderHandler();
        const file = new File(['img'], 'my/photo.png', { type: 'image/png' });
        act(() => triggerAfterInsert(file, 'https://cdn.example.com/photo.png'));

        await vi.waitFor(() => {
            expect(mockDescribeImageWithAI).toHaveBeenCalledWith(file, 'my_photo.png');
        });
    });

    it('calls analyzeAndSpawn with image description as parsedText', async () => {
        mockDescribeImageWithAI.mockResolvedValue('A whiteboard with project timeline');
        const { triggerAfterInsert } = renderHandler();
        const file = new File(['img'], 'board.jpg', { type: 'image/jpeg' });
        act(() => triggerAfterInsert(file, 'https://cdn.example.com/board.jpg'));

        await vi.waitFor(() => {
            expect(mockAnalyzeAndSpawn).toHaveBeenCalledWith(
                'node-1',
                'A whiteboard with project timeline',
                'board.jpg',
                'ws-123',
            );
        });
    });

    it('does NOT call describeImageWithAI when autoAnalyzeDocuments is false', async () => {
        mockSettingsGetState.mockReturnValue({ autoAnalyzeDocuments: false });
        const { triggerAfterInsert } = renderHandler();
        const file = new File(['img'], 'skip.png', { type: 'image/png' });
        act(() => triggerAfterInsert(file, 'https://cdn.example.com/skip.png'));

        await waitFor(() => expect(mockUpdateNodeOutput).toHaveBeenCalled());
        expect(mockDescribeImageWithAI).not.toHaveBeenCalled();
        expect(mockAnalyzeAndSpawn).not.toHaveBeenCalled();
    });

    it('still saves markdown even when autoAnalyzeDocuments is false', () => {
        mockSettingsGetState.mockReturnValue({ autoAnalyzeDocuments: false });
        const { triggerAfterInsert } = renderHandler();
        const file = new File(['img'], 'skip.png', { type: 'image/png' });
        act(() => triggerAfterInsert(file, 'https://cdn.example.com/skip.png'));

        expect(mockUpdateNodeOutput).toHaveBeenCalledWith('node-1', '# Hello');
    });

    it('still calls analyzeAndSpawn when describeImageWithAI returns fallback', async () => {
        mockDescribeImageWithAI.mockResolvedValue('Image description: photo.png');
        const { triggerAfterInsert } = renderHandler();
        const file = new File(['img'], 'photo.png', { type: 'image/png' });
        act(() => triggerAfterInsert(file, 'https://cdn.example.com/photo.png'));

        await vi.waitFor(() => {
            expect(mockAnalyzeAndSpawn).toHaveBeenCalledWith(
                'node-1',
                'Image description: photo.png',
                'photo.png',
                'ws-123',
            );
        });
    });

    it('captures error when analyzeAndSpawn throws', async () => {
        const error = new Error('analysis failed');
        mockAnalyzeAndSpawn.mockRejectedValueOnce(error);
        const { triggerAfterInsert } = renderHandler();
        const file = new File(['img'], 'crash.png', { type: 'image/png' });
        act(() => triggerAfterInsert(file, 'https://cdn.example.com/crash.png'));

        await vi.waitFor(() => {
            expect(mockCaptureError).toHaveBeenCalledWith(error);
        });
    });

    it('captures error when describeImageWithAI throws', async () => {
        const error = new Error('vision API crashed');
        mockDescribeImageWithAI.mockRejectedValueOnce(error);
        const { triggerAfterInsert } = renderHandler();
        const file = new File(['img'], 'crash.png', { type: 'image/png' });
        act(() => triggerAfterInsert(file, 'https://cdn.example.com/crash.png'));

        await vi.waitFor(() => {
            expect(mockCaptureError).toHaveBeenCalledWith(error);
        });
        expect(mockAnalyzeAndSpawn).not.toHaveBeenCalled();
    });

    it('skips analysis when no workspaceId', async () => {
        mockWorkspaceGetState.mockReturnValue({ currentWorkspaceId: null });

        const { triggerAfterInsert } = renderHandler();
        const file = new File(['img'], 'orphan.png', { type: 'image/png' });
        act(() => triggerAfterInsert(file, 'https://cdn.example.com/orphan.png'));

        await waitFor(() => expect(mockUpdateNodeOutput).toHaveBeenCalled());
        expect(mockDescribeImageWithAI).not.toHaveBeenCalled();
    });
});
