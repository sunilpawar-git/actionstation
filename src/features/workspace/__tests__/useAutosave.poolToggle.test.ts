/**
 * Pool Toggle Persistence Tests for useAutosave
 * Regression: brain icon (WorkspacePoolButton) was reverting because
 * lastSavedRef was updated before save(), making workspaceFieldsChanged always false.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAutosave } from '../hooks/useAutosave';
import { useCanvasStore } from '@/features/canvas/stores/canvasStore';
import { saveWorkspace } from '@/features/workspace/services/workspaceService';
import { useWorkspaceStore } from '@/features/workspace/stores/workspaceStore';
import type { Workspace } from '@/features/workspace/types/workspace';
import { useSaveStatusStore } from '@/shared/stores/saveStatusStore';
import { useNetworkStatusStore } from '@/shared/stores/networkStatusStore';

vi.mock('@/features/canvas/stores/canvasStore', () => ({
    useCanvasStore: Object.assign(vi.fn(), {
        getState: () => ({ nodes: [], edges: [], clearClusterGroups: vi.fn(), setClusterGroups: vi.fn(), pruneDeletedNodes: vi.fn() }),
    }),
}));

const mockAuthState: { user: { id: string } | null } = { user: { id: 'user-123' } };
vi.mock('@/features/auth/stores/authStore', () => ({
    useAuthStore: vi.fn((selector?: (s: typeof mockAuthState) => unknown) => {
        return typeof selector === 'function' ? selector(mockAuthState) : mockAuthState;
    }),
}));

vi.mock('@/features/workspace/services/workspaceService', () => ({
    saveNodes: vi.fn().mockResolvedValue(undefined),
    saveEdges: vi.fn().mockResolvedValue(undefined),
    saveWorkspace: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/features/workspace/services/workspaceCache', () => ({
    workspaceCache: { update: vi.fn() },
}));

vi.mock('@/shared/stores/toastStore', () => ({
    toast: { error: vi.fn(), info: vi.fn(), success: vi.fn(), warning: vi.fn() },
}));

vi.mock('../stores/offlineQueueStore', () => ({
    useOfflineQueueStore: {
        getState: () => ({ queueSave: vi.fn() }),
    },
}));

function setCanvasState(state: { nodes: unknown[]; edges: unknown[] }) {
    vi.mocked(useCanvasStore).mockImplementation(
        ((selector?: (s: typeof state) => unknown) =>
            selector ? selector(state) : state
        ) as typeof useCanvasStore
    );
}

const WS_ID = 'ws-pool-test';

function makeWorkspace(pooled: boolean): Workspace {
    return {
        id: WS_ID,
        userId: 'user-123',
        name: 'Test Workspace',
        canvasSettings: { backgroundColor: 'grid' },
        createdAt: new Date(),
        updatedAt: new Date(),
        orderIndex: 0,
        type: 'workspace',
        nodeCount: 0,
        includeAllNodesInPool: pooled,
    };
}

describe('useAutosave — workspace pool toggle persistence', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.clearAllMocks();
        setCanvasState({ nodes: [], edges: [] });
        useSaveStatusStore.setState({ status: 'idle', lastSavedAt: null, lastError: null });
        useNetworkStatusStore.setState({ isOnline: true });
        useWorkspaceStore.setState({ workspaces: [], currentWorkspaceId: null, isLoading: false, isSwitching: false });
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('saves to Firestore when includeAllNodesInPool is toggled off', async () => {
        useWorkspaceStore.setState({ workspaces: [makeWorkspace(true)], currentWorkspaceId: WS_ID });

        const { rerender } = renderHook(
            ({ loading }: { loading: boolean }) => useAutosave(WS_ID, loading),
            { initialProps: { loading: true } },
        );
        rerender({ loading: false });

        act(() => { useWorkspaceStore.getState().toggleWorkspacePool(WS_ID); });
        await act(async () => { vi.advanceTimersByTime(2500); });

        expect(saveWorkspace).toHaveBeenCalledWith('user-123', expect.objectContaining({
            id: WS_ID,
            includeAllNodesInPool: false,
        }));
    });

    it('saves to Firestore when includeAllNodesInPool is toggled on', async () => {
        useWorkspaceStore.setState({ workspaces: [makeWorkspace(false)], currentWorkspaceId: WS_ID });

        const { rerender } = renderHook(
            ({ loading }: { loading: boolean }) => useAutosave(WS_ID, loading),
            { initialProps: { loading: true } },
        );
        rerender({ loading: false });

        act(() => { useWorkspaceStore.getState().toggleWorkspacePool(WS_ID); });
        await act(async () => { vi.advanceTimersByTime(2500); });

        expect(saveWorkspace).toHaveBeenCalledWith('user-123', expect.objectContaining({
            id: WS_ID,
            includeAllNodesInPool: true,
        }));
    });

    it('does not call saveWorkspace when pool state has not changed since load', async () => {
        useWorkspaceStore.setState({ workspaces: [makeWorkspace(false)], currentWorkspaceId: WS_ID });

        const { rerender } = renderHook(
            ({ loading }: { loading: boolean }) => useAutosave(WS_ID, loading),
            { initialProps: { loading: true } },
        );
        rerender({ loading: false });

        await act(async () => { vi.advanceTimersByTime(5000); });
        expect(saveWorkspace).not.toHaveBeenCalled();
    });

    it('saves workspace when node-edit timeout fires alongside a pool toggle', async () => {
        useWorkspaceStore.setState({ workspaces: [makeWorkspace(true)], currentWorkspaceId: WS_ID });

        const { rerender } = renderHook(
            ({ loading }: { loading: boolean }) => useAutosave(WS_ID, loading),
            { initialProps: { loading: true } },
        );
        rerender({ loading: false });

        act(() => { useWorkspaceStore.getState().toggleWorkspacePool(WS_ID); });
        setCanvasState({ nodes: [{ id: 'n-1', workspaceId: WS_ID, type: 'idea', position: { x: 0, y: 0 }, data: {} }], edges: [] });
        rerender({ loading: false });

        await act(async () => { vi.advanceTimersByTime(2500); });

        expect(saveWorkspace).toHaveBeenCalledWith('user-123', expect.objectContaining({
            id: WS_ID,
            includeAllNodesInPool: false,
        }));
    });
});
