/**
 * WorkspaceControls Clear Canvas Tests
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { WorkspaceControls } from '../WorkspaceControls';
import { useAuthStore } from '@/features/auth/stores/authStore';
import { useWorkspaceStore } from '../../stores/workspaceStore';
import { useCanvasStore } from '@/features/canvas/stores/canvasStore';
import { useHistoryStore } from '@/features/canvas/stores/historyStore';
import { useSettingsStore } from '@/shared/stores/settingsStore';
import { strings } from '@/shared/localization/strings';

vi.mock('../../services/workspaceService', () => ({
    deleteWorkspace: vi.fn().mockResolvedValue(undefined),
}));

const mockConfirm = vi.fn().mockResolvedValue(false);
vi.mock('@/shared/stores/confirmStore', () => ({
    useConfirm: () => mockConfirm,
    useConfirmStore: vi.fn(),
}));

vi.mock('@/features/canvas/hooks/usePanToNode', () => ({
    usePanToNode: () => ({ panToPosition: vi.fn() }),
}));

vi.mock('@/shared/stores/toastStore', () => ({
    toast: { success: vi.fn(), error: vi.fn() },
    toastWithAction: vi.fn(),
}));

// Capture the toastWithAction mock so we can inspect it in assertions
import { toastWithAction as mockToastWithAction } from '@/shared/stores/toastStore';

const NODE_FIXTURE = {
    id: 'node-1',
    workspaceId: 'workspace-1',
    type: 'idea' as const,
    position: { x: 0, y: 0 },
    data: { content: '', prompt: '', output: '', isGenerating: false, isPromptCollapsed: false },
    createdAt: new Date(),
    updatedAt: new Date(),
};

describe('WorkspaceControls - Clear Canvas', () => {
    beforeEach(() => {
        vi.clearAllMocks();

        useAuthStore.setState({
            user: { id: 'test-user-id', email: 'test@test.com', name: 'T', avatarUrl: '', createdAt: new Date() },
            isAuthenticated: true, isLoading: false, error: null,
        });

        useWorkspaceStore.setState({
            currentWorkspaceId: 'workspace-1',
            workspaces: [{ id: 'workspace-1', userId: 'test-user-id', name: 'Test', canvasSettings: { backgroundColor: 'grid' }, createdAt: new Date(), updatedAt: new Date() }],
            isLoading: false, isSwitching: false,
        });

        useCanvasStore.setState({ nodes: [], edges: [], selectedNodeIds: new Set() });
        useHistoryStore.getState().dispatch({ type: 'CLEAR' });
        useSettingsStore.setState({ canvasFreeFlow: false });
        mockConfirm.mockResolvedValue(false);
    });

    it('should be disabled when there are no nodes', () => {
        render(<WorkspaceControls />);
        expect(screen.getByTitle(strings.canvas.clearCanvas)).toBeDisabled();
    });

    it('should be enabled when there are nodes', () => {
        useCanvasStore.setState({ nodes: [NODE_FIXTURE] });
        render(<WorkspaceControls />);
        expect(screen.getByTitle(strings.canvas.clearCanvas)).not.toBeDisabled();
    });

    it('should show confirmation dialog when clicked', async () => {
        useCanvasStore.setState({ nodes: [NODE_FIXTURE] });
        render(<WorkspaceControls />);

        await act(async () => { fireEvent.click(screen.getByTitle(strings.canvas.clearCanvas)); });

        expect(mockConfirm).toHaveBeenCalledWith(expect.objectContaining({
            message: strings.canvas.clearConfirm,
            isDestructive: true,
        }));
    });

    it('should clear canvas when confirmed', async () => {
        useCanvasStore.setState({ nodes: [NODE_FIXTURE] });
        mockConfirm.mockResolvedValue(true);
        render(<WorkspaceControls />);

        await act(async () => { fireEvent.click(screen.getByTitle(strings.canvas.clearCanvas)); });

        expect(useCanvasStore.getState().nodes).toHaveLength(0);
    });

    it('should not clear canvas when cancelled', async () => {
        useCanvasStore.setState({ nodes: [NODE_FIXTURE] });
        mockConfirm.mockResolvedValue(false);
        render(<WorkspaceControls />);

        await act(async () => { fireEvent.click(screen.getByTitle(strings.canvas.clearCanvas)); });

        expect(useCanvasStore.getState().nodes).toHaveLength(1);
    });

    it('should push a clearCanvas history entry when confirmed', async () => {
        useCanvasStore.setState({ nodes: [NODE_FIXTURE] });
        mockConfirm.mockResolvedValue(true);
        render(<WorkspaceControls />);

        await act(async () => { fireEvent.click(screen.getByTitle(strings.canvas.clearCanvas)); });

        expect(useHistoryStore.getState().undoStack).toHaveLength(1);
        expect(useHistoryStore.getState().undoStack[0]!.type).toBe('clearCanvas');
    });

    it('should show an actionable undo toast when confirmed', async () => {
        useCanvasStore.setState({ nodes: [NODE_FIXTURE] });
        mockConfirm.mockResolvedValue(true);
        render(<WorkspaceControls />);

        await act(async () => { fireEvent.click(screen.getByTitle(strings.canvas.clearCanvas)); });

        expect(mockToastWithAction).toHaveBeenCalledOnce();
        const [msg, type] = (mockToastWithAction as ReturnType<typeof vi.fn>).mock.calls[0]!;
        expect(typeof msg).toBe('string');
        expect(type).toBe('info');
    });

    it('undo via historyStore restores the cleared node', async () => {
        useCanvasStore.setState({ nodes: [NODE_FIXTURE] });
        mockConfirm.mockResolvedValue(true);
        render(<WorkspaceControls />);

        await act(async () => { fireEvent.click(screen.getByTitle(strings.canvas.clearCanvas)); });
        expect(useCanvasStore.getState().nodes).toHaveLength(0);

        act(() => useHistoryStore.getState().dispatch({ type: 'UNDO' }));
        expect(useCanvasStore.getState().nodes).toHaveLength(1);
    });
});
