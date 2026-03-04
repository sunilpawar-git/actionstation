/**
 * Offline Queue Store Tests
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useOfflineQueueStore } from '../stores/offlineQueueStore';

const mockSaveNodes = vi.fn().mockResolvedValue(undefined);
const mockSaveEdges = vi.fn().mockResolvedValue(undefined);
const mockUpdateWorkspaceNodeCount = vi.fn().mockResolvedValue(undefined);

vi.mock('@/features/workspace/services/workspaceService', () => ({
    saveNodes: (...args: unknown[]) => mockSaveNodes(...args),
    saveEdges: (...args: unknown[]) => mockSaveEdges(...args),
    updateWorkspaceNodeCount: (...args: unknown[]) => mockUpdateWorkspaceNodeCount(...args),
}));

vi.mock('@/shared/stores/saveStatusStore', () => ({
    useSaveStatusStore: {
        getState: () => ({
            setSaving: vi.fn(),
            setSaved: vi.fn(),
            setError: vi.fn(),
        }),
    },
}));

vi.mock('@/shared/stores/toastStore', () => ({
    toast: { error: vi.fn(), info: vi.fn(), success: vi.fn(), warning: vi.fn() },
}));

describe('offlineQueueStore', () => {
    beforeEach(() => {
        localStorage.clear();
        vi.clearAllMocks();
        useOfflineQueueStore.setState({ pendingCount: 0, isDraining: false });
    });

    describe('queueSave', () => {
        it('should increment pendingCount', () => {
            useOfflineQueueStore.getState().queueSave('user-1', 'ws-1', [], []);
            expect(useOfflineQueueStore.getState().pendingCount).toBe(1);
        });

        it('should coalesce saves for same workspace', () => {
            const { queueSave } = useOfflineQueueStore.getState();
            queueSave('user-1', 'ws-1', [], []);
            queueSave('user-1', 'ws-1', [], []);
            expect(useOfflineQueueStore.getState().pendingCount).toBe(1);
        });

        it('should track separate workspaces independently', () => {
            const { queueSave } = useOfflineQueueStore.getState();
            queueSave('user-1', 'ws-1', [], []);
            queueSave('user-1', 'ws-2', [], []);
            expect(useOfflineQueueStore.getState().pendingCount).toBe(2);
        });
    });

    describe('drainQueue', () => {
        it('should process queued operations', async () => {
            useOfflineQueueStore.getState().queueSave('user-1', 'ws-1', [], []);

            await useOfflineQueueStore.getState().drainQueue();

            expect(mockSaveNodes).toHaveBeenCalled();
            expect(mockSaveEdges).toHaveBeenCalled();
            expect(useOfflineQueueStore.getState().pendingCount).toBe(0);
        });

        it('should set isDraining during processing', async () => {
            useOfflineQueueStore.getState().queueSave('user-1', 'ws-1', [], []);

            const drainPromise = useOfflineQueueStore.getState().drainQueue();
            expect(useOfflineQueueStore.getState().isDraining).toBe(true);

            await drainPromise;
            expect(useOfflineQueueStore.getState().isDraining).toBe(false);
        });

        it('should do nothing when queue is empty', async () => {
            await useOfflineQueueStore.getState().drainQueue();
            expect(mockSaveNodes).not.toHaveBeenCalled();
        });

        it('should keep failed op in queue when retryCount < MAX_DRAIN_RETRIES', async () => {
            mockSaveNodes.mockRejectedValueOnce(new Error('Network error'));
            useOfflineQueueStore.getState().queueSave('user-1', 'ws-1', [], []);

            await useOfflineQueueStore.getState().drainQueue();

            expect(useOfflineQueueStore.getState().pendingCount).toBe(1);
            expect(useOfflineQueueStore.getState().isDraining).toBe(false);
        });
    });

    describe('refreshCount', () => {
        it('should sync pendingCount with actual queue size', () => {
            useOfflineQueueStore.getState().queueSave('user-1', 'ws-1', [], []);
            useOfflineQueueStore.setState({ pendingCount: 99 });
            useOfflineQueueStore.getState().refreshCount();
            expect(useOfflineQueueStore.getState().pendingCount).toBe(1);
        });
    });
});
