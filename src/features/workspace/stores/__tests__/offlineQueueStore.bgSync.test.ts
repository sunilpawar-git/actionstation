/**
 * Offline Queue Store Background Sync Tests
 * TDD: Verifies BG Sync integration with the queue store
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useOfflineQueueStore } from '../offlineQueueStore';

// Mock dependencies
vi.mock('../../services/offlineQueueService', () => ({
    offlineQueueService: {
        enqueue: vi.fn().mockReturnValue(true),
        dequeue: vi.fn(),
        getQueue: vi.fn().mockReturnValue([]),
        getOldestOperation: vi.fn().mockReturnValue(null),
        updateRetryCount: vi.fn(),
        size: vi.fn().mockReturnValue(0),
        clear: vi.fn(),
    },
}));

vi.mock('../../services/nodeSerializer', () => ({
    serializeNodes: vi.fn().mockReturnValue([]),
    deserializeNodes: vi.fn().mockReturnValue([]),
}));

vi.mock('../../services/workspaceService', () => ({
    saveNodes: vi.fn().mockResolvedValue(undefined),
    saveEdges: vi.fn().mockResolvedValue(undefined),
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
    toast: { error: vi.fn(), info: vi.fn(), warning: vi.fn() },
}));

const mockRegisterSync = vi.fn().mockResolvedValue(false);
vi.mock('../../services/backgroundSyncService', () => ({
    backgroundSyncService: {
        registerSync: () => mockRegisterSync(),
        isBackgroundSyncSupported: vi.fn().mockReturnValue(false),
        hasPendingSync: vi.fn().mockResolvedValue(false),
        SYNC_TAG: 'offline-queue-sync',
    },
}));

// Mock subscription store for feature gating
let mockHasAccessBgSync = true;
vi.mock('@/features/subscription/stores/subscriptionStore', () => ({
    useSubscriptionStore: {
        getState: () => ({
            hasAccess: () => mockHasAccessBgSync,
        }),
    },
}));

vi.mock('@/features/subscription/types/subscription', () => ({
    GATED_FEATURES: { backgroundSync: 'backgroundSync' },
}));

describe('offlineQueueStore - bgSync', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockHasAccessBgSync = true;
        useOfflineQueueStore.setState({
            pendingCount: 0,
            isDraining: false,
            bgSyncRegistered: false,
        });
    });

    it('has bgSyncRegistered in initial state', () => {
        const state = useOfflineQueueStore.getState();
        expect(state.bgSyncRegistered).toBe(false);
    });

    it('attempts BG Sync registration on queueSave when Pro', async () => {
        mockHasAccessBgSync = true;
        mockRegisterSync.mockResolvedValue(true);

        useOfflineQueueStore.getState().queueSave('user-1', 'ws-1', [], []);

        // Wait for async registration
        await vi.waitFor(() => {
            expect(mockRegisterSync).toHaveBeenCalled();
        });
    });

    it('skips BG Sync registration on free tier', async () => {
        mockHasAccessBgSync = false;
        mockRegisterSync.mockResolvedValue(true);

        useOfflineQueueStore.getState().queueSave('user-1', 'ws-1', [], []);

        // Give time for potential async call
        await new Promise((r) => setTimeout(r, 10));
        expect(mockRegisterSync).not.toHaveBeenCalled();
        expect(useOfflineQueueStore.getState().bgSyncRegistered).toBe(false);
    });

    it('sets bgSyncRegistered=true when BG Sync succeeds', async () => {
        mockRegisterSync.mockResolvedValue(true);

        useOfflineQueueStore.getState().queueSave('user-1', 'ws-1', [], []);

        await vi.waitFor(() => {
            expect(useOfflineQueueStore.getState().bgSyncRegistered).toBe(true);
        });
    });

    it('keeps bgSyncRegistered=false when BG Sync fails', async () => {
        mockRegisterSync.mockResolvedValue(false);

        useOfflineQueueStore.getState().queueSave('user-1', 'ws-1', [], []);

        // Give time for async
        await new Promise((r) => setTimeout(r, 10));
        expect(useOfflineQueueStore.getState().bgSyncRegistered).toBe(false);
    });

    it('resets bgSyncRegistered after drain completes', async () => {
        useOfflineQueueStore.setState({ bgSyncRegistered: true });

        await useOfflineQueueStore.getState().drainQueue();

        expect(useOfflineQueueStore.getState().bgSyncRegistered).toBe(false);
    });
});
