/**
 * Offline Queue Store - Reactive state for offline save queue
 * SOLID SRP: Bridges offlineQueueService with UI reactivity
 * Attempts Background Sync when available, falls back to manual drain.
 */
import { create } from 'zustand';
import { offlineQueueService } from '../services/offlineQueueService';
import { backgroundSyncService } from '../services/backgroundSyncService';
import { serializeNodes, deserializeNodes } from '../services/nodeSerializer';
import { saveNodes, saveEdges, updateWorkspaceNodeCount } from '../services/workspaceService';
import { useSaveStatusStore } from '@/shared/stores/saveStatusStore';
import { useSubscriptionStore } from '@/features/subscription/stores/subscriptionStore';
import { GATED_FEATURES } from '@/features/subscription/types/subscription';
import { toast } from '@/shared/stores/toastStore';
import { strings } from '@/shared/localization/strings';
import { captureError } from '@/shared/services/sentryService';
import type { CanvasNode } from '@/features/canvas/types/node';
import type { CanvasEdge } from '@/features/canvas/types/edge';

const MAX_DRAIN_RETRIES = 3;

interface OfflineQueueState {
    pendingCount: number;
    isDraining: boolean;
    bgSyncRegistered: boolean;
}

interface OfflineQueueActions {
    queueSave: (userId: string, workspaceId: string, nodes: CanvasNode[], edges: CanvasEdge[]) => void;
    drainQueue: () => Promise<void>;
    refreshCount: () => void;
}

type OfflineQueueStore = OfflineQueueState & OfflineQueueActions;

export const useOfflineQueueStore = create<OfflineQueueStore>()((set) => ({
    pendingCount: offlineQueueService.size(),
    isDraining: false,
    bgSyncRegistered: false,

    queueSave: (userId, workspaceId, nodes, edges) => {
        const op = {
            id: `save-${workspaceId}-${Date.now()}`,
            userId,
            workspaceId,
            nodes: serializeNodes(nodes),
            edges,
            queuedAt: Date.now(),
            retryCount: 0,
        };
        const queued = offlineQueueService.enqueue(op);
        if (!queued) {
            toast.warning(strings.security.storageQuotaExceeded);
        }
        set({ pendingCount: offlineQueueService.size() });

        // Attempt Background Sync registration (non-blocking, gated to Pro)
        const hasBgSync = useSubscriptionStore.getState().hasAccess(GATED_FEATURES.backgroundSync);
        if (hasBgSync) {
            void backgroundSyncService.registerSync().then((registered) => {
                if (registered) {
                    set({ bgSyncRegistered: true });
                }
            });
        }
    },

    drainQueue: async () => {
        const ops = offlineQueueService.getQueue();
        if (ops.length === 0) {
            set({ bgSyncRegistered: false });
            return;
        }

        set({ isDraining: true });
        const { setSaving, setSaved, setError } = useSaveStatusStore.getState();

        for (const op of ops) {
            setSaving();
            try {
                const nodes = deserializeNodes(op.nodes);
                await Promise.all([
                    saveNodes(op.userId, op.workspaceId, nodes),
                    saveEdges(op.userId, op.workspaceId, op.edges),
                    updateWorkspaceNodeCount(op.userId, op.workspaceId, nodes.length),
                ]);
                offlineQueueService.dequeue(op.id);
                setSaved();
            } catch (error) {
                const newRetryCount = op.retryCount + 1;
                if (newRetryCount >= MAX_DRAIN_RETRIES) {
                    offlineQueueService.dequeue(op.id);
                    captureError(new Error(strings.offline.syncFailed), {
                        opId: op.id, workspaceId: op.workspaceId, retries: newRetryCount,
                    });
                } else {
                    offlineQueueService.updateRetryCount(op.id, newRetryCount);
                }
                const message = error instanceof Error ? error.message : strings.offline.syncFailed;
                setError(message);
                toast.error(strings.offline.syncFailed);
            }
        }

        set({ pendingCount: offlineQueueService.size(), isDraining: false, bgSyncRegistered: false });
    },

    refreshCount: () => {
        set({ pendingCount: offlineQueueService.size() });
    },
}));
