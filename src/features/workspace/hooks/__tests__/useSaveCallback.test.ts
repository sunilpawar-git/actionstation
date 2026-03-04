/**
 * useSaveCallback Tests
 * TDD RED: Verifies save() reads from refs (not stale closure)
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSaveCallback, serializeWorkspacePoolFields } from '../useSaveCallback';

vi.mock('@/features/canvas/stores/canvasStore', () => ({
    useCanvasStore: vi.fn((selector?: (s: { nodes: unknown[]; edges: unknown[] }) => unknown) => {
        const state = { nodes: [], edges: [] };
        return typeof selector === 'function' ? selector(state) : state;
    }),
}));

vi.mock('@/features/auth/stores/authStore', () => ({
    useAuthStore: vi.fn((selector?: (s: { user: { id: string } | null }) => unknown) => {
        const state = { user: { id: 'user-1' } };
        return typeof selector === 'function' ? selector(state) : state;
    }),
}));

vi.mock('@/features/workspace/stores/workspaceStore', () => ({
    useWorkspaceStore: vi.fn((selector?: (s: { workspaces: unknown[] }) => unknown) => {
        const state = { workspaces: [], setNodeCount: vi.fn() };
        return typeof selector === 'function' ? selector(state) : state;
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

vi.mock('@/shared/stores/saveStatusStore', () => ({
    useSaveStatusStore: {
        getState: () => ({
            setSaving: vi.fn(), setSaved: vi.fn(), setError: vi.fn(), setQueued: vi.fn(),
        }),
    },
}));

vi.mock('@/shared/stores/networkStatusStore', () => ({
    useNetworkStatusStore: { getState: () => ({ isOnline: true }) },
}));

vi.mock('@/shared/stores/toastStore', () => ({
    toast: { error: vi.fn(), warning: vi.fn() },
}));

vi.mock('../../stores/offlineQueueStore', () => ({
    useOfflineQueueStore: { getState: () => ({ queueSave: vi.fn() }) },
}));

describe('useSaveCallback', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.clearAllMocks();
    });

    it('returns a stable save function', () => {
        const { result } = renderHook(() => useSaveCallback('ws-1'));
        expect(typeof result.current.save).toBe('function');
    });

    it('exposes nodes, edges, and currentWorkspace', () => {
        const { result } = renderHook(() => useSaveCallback('ws-1'));
        expect(result.current.nodes).toEqual([]);
        expect(result.current.edges).toEqual([]);
        expect(result.current.currentWorkspace).toBeNull();
    });

    it('serializeWorkspacePoolFields handles null workspace', () => {
        expect(serializeWorkspacePoolFields(null)).toBe('');
    });

    it('save callback depends only on user and workspaceId', async () => {
        const { result } = renderHook(() => useSaveCallback('ws-1'));
        const firstSave = result.current.save;

        await act(async () => {
            await result.current.save();
        });

        expect(result.current.save).toBe(firstSave);
    });
});
