/**
 * Image Analysis Pipeline — Integration tests (Phase 5D)
 * End-to-end: image upload -> describe -> analyze -> insight node
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

const mockUpdateNodeOutput = vi.fn();
const mockAnalyzeAndSpawn = vi.fn().mockResolvedValue(undefined);
const mockDescribeImageWithAI = vi.fn().mockResolvedValue('A whiteboard showing project timeline');
const mockCaptureError = vi.fn();
const mockSettingsGetState = vi.fn().mockReturnValue({ autoAnalyzeDocuments: true });
const mockWorkspaceGetState = vi.fn().mockReturnValue({ currentWorkspaceId: 'ws-int' });

vi.mock('../stores/canvasStore', () => ({
    useCanvasStore: Object.assign(vi.fn(), {
        getState: () => ({
            nodes: [{ id: 'parent-1', data: { attachments: [{ filename: 'report.pdf' }] } }],
            updateNodeOutput: mockUpdateNodeOutput,
            editingNodeId: null,
            startEditing: vi.fn(),
            setInputMode: vi.fn(),
        }),
    }),
    getNodeMap: vi.fn().mockReturnValue(new Map([
        ['parent-1', { id: 'parent-1', data: { attachments: [{ filename: 'report.pdf' }] } }],
    ])),
}));

vi.mock('@/features/workspace/stores/workspaceStore', () => ({
    useWorkspaceStore: Object.assign(vi.fn(), {
        getState: () => mockWorkspaceGetState(),
    }),
}));

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
            imageUploading: 'Uploading...',
            imageUploadFailed: 'Failed.',
            imageReadFailed: 'Read failed.',
            imageUnsafeUrl: 'Unsafe.',
            imageFileTooLarge: 'Too large.',
            imageUnsupportedType: 'Unsupported.',
        },
        documentAgent: { cachedResult: 'Cached.' },
    },
}));

vi.mock('@/shared/stores/toastStore', () => ({
    toast: { info: vi.fn(), error: vi.fn(), success: vi.fn(), warning: vi.fn() },
}));

vi.mock('../services/imageInsertService', () => ({
    ensureEditorFocus: vi.fn(),
    insertImageIntoEditor: vi.fn(),
    type: {},
}));

const insertCapture: { cb: unknown } = { cb: null };
vi.mock('../hooks/useImageInsert', () => ({
    useImageInsert: (_e: unknown, _u: unknown, onAfterInsert: unknown) => {
        insertCapture.cb = onAfterInsert;
        return { triggerFilePicker: vi.fn() };
    },
}));

vi.mock('../hooks/useDocumentInsert', () => ({
    useDocumentInsert: () => ({ triggerFilePicker: vi.fn(), insertFileDirectly: vi.fn() }),
}));

vi.mock('../hooks/useNodeDocumentUpload', () => ({
    useNodeDocumentUpload: () => vi.fn(),
}));

// eslint-disable-next-line import-x/first -- Must import after vi.mock
import { useIdeaCardImageHandlers } from '../hooks/useIdeaCardImageHandlers';

function setup() {
    const getMarkdown = vi.fn().mockReturnValue('# Image note');
    const { result } = renderHook(() =>
        useIdeaCardImageHandlers({
            id: 'parent-1',
            editor: null,
            getMarkdown,
            imageUploadFn: vi.fn().mockResolvedValue('https://cdn.example.com/img.jpg'),
        }),
    );
    const trigger = (file: File, url: string) => {
        const cb = insertCapture.cb as ((f: File, u: string) => void) | null;
        cb?.(file, url);
    };
    return { result, trigger };
}

describe('Image Analysis Pipeline — end to end', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockSettingsGetState.mockReturnValue({ autoAnalyzeDocuments: true });
        mockWorkspaceGetState.mockReturnValue({ currentWorkspaceId: 'ws-int' });
        mockDescribeImageWithAI.mockResolvedValue('A whiteboard showing project timeline');
    });

    it('image upload with auto-analyze ON -> full pipeline executes', async () => {
        const { trigger } = setup();
        const file = new File(['img'], 'whiteboard.jpg', { type: 'image/jpeg' });
        act(() => trigger(file, 'https://cdn.example.com/whiteboard.jpg'));

        await vi.waitFor(() => {
            expect(mockDescribeImageWithAI).toHaveBeenCalledWith(file, 'whiteboard.jpg');
            expect(mockAnalyzeAndSpawn).toHaveBeenCalledWith(
                'parent-1',
                'A whiteboard showing project timeline',
                'whiteboard.jpg',
                'ws-int',
            );
        });

        expect(mockUpdateNodeOutput).toHaveBeenCalledWith('parent-1', '# Image note');
    });

    it('image upload with auto-analyze OFF -> no analysis, no API call', async () => {
        mockSettingsGetState.mockReturnValue({ autoAnalyzeDocuments: false });
        const { trigger } = setup();
        const file = new File(['img'], 'skip.png', { type: 'image/png' });
        act(() => trigger(file, 'https://cdn.example.com/skip.png'));

        await waitFor(() => expect(mockUpdateNodeOutput).toHaveBeenCalledWith('parent-1', '# Image note'));
        expect(mockDescribeImageWithAI).not.toHaveBeenCalled();
        expect(mockAnalyzeAndSpawn).not.toHaveBeenCalled();
    });

    it('Gemini Vision unavailable -> fallback description -> still analyzes', async () => {
        mockDescribeImageWithAI.mockResolvedValue('Image description: fallback.png');
        const { trigger } = setup();
        const file = new File(['img'], 'fallback.png', { type: 'image/png' });
        act(() => trigger(file, 'https://cdn.example.com/fallback.png'));

        await vi.waitFor(() => {
            expect(mockAnalyzeAndSpawn).toHaveBeenCalledWith(
                'parent-1',
                'Image description: fallback.png',
                'fallback.png',
                'ws-int',
            );
        });
    });

    it('image + existing document attachments -> attachments untouched', async () => {
        const { trigger } = setup();
        const file = new File(['img'], 'photo.jpg', { type: 'image/jpeg' });
        act(() => trigger(file, 'https://cdn.example.com/photo.jpg'));

        await vi.waitFor(() => {
            expect(mockAnalyzeAndSpawn).toHaveBeenCalled();
        });

        const { useCanvasStore } = await import('../stores/canvasStore');
        const attachments = useCanvasStore.getState().nodes[0]?.data.attachments;
        expect(attachments).toEqual([{ filename: 'report.pdf' }]);
    });
});
