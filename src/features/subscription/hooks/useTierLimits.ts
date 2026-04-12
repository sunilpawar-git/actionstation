/**
 * useTierLimits Hook — React bridge between Zustand stores and the
 * tier limits useReducer state machine.
 *
 * Reads from Zustand via scalar selectors only. Syncs counts into the
 * reducer via useEffect with primitive dependencies.
 * Exposes check(kind) for guard hooks.
 *
 * MUST be used inside TierLimitsProvider.
 */
import { useEffect, useRef, useCallback } from 'react';
import { useSubscriptionStore } from '../stores/subscriptionStore';
import { useWorkspaceStore } from '@/features/workspace/stores/workspaceStore';
import { useCanvasStore } from '@/features/canvas/stores/canvasStore';
import { useAuthStore } from '@/features/auth/stores/authStore';
import { useTierLimitsState, useTierLimitsDispatch } from '../contexts/TierLimitsContext';
import { checkLimit } from '../utils/limitChecker';
import { loadAiDailyCount } from '../services/usageCountService';
import { getStorageUsageMb } from '../services/storageUsageService';
import { logger } from '@/shared/services/logger';
import type { LimitKind, LimitCheckResult } from '../types/tierLimits';

export function useTierLimits() {
    const state = useTierLimitsState();
    const dispatch = useTierLimitsDispatch();

    // Scalar selectors — critical for avoiding cascade re-renders
    const tier = useSubscriptionStore((s) => s.tier);
    const userId = useAuthStore((s) => s.user?.id);
    const workspaceCount = useWorkspaceStore(
        (s) => s.workspaces.filter((w) => w.type !== 'divider').length,
    );
    const nodeCount = useCanvasStore((s) => s.nodes.length);

    // Sync workspace count
    useEffect(() => {
        dispatch({ type: 'WORKSPACE_COUNT_CHANGED', count: workspaceCount });
    }, [workspaceCount, dispatch]);

    // Sync node count
    useEffect(() => {
        dispatch({ type: 'NODE_COUNT_CHANGED', count: nodeCount });
    }, [nodeCount, dispatch]);

    // Load AI daily count + storage usage once on mount / userId change
    const hasLoadedRef = useRef(false);
    const prevUserIdRef = useRef(userId);

    useEffect(() => {
        // Reset on user change
        if (prevUserIdRef.current !== userId) {
            hasLoadedRef.current = false;
            prevUserIdRef.current = userId;
        }
        if (!userId || hasLoadedRef.current) return;
        hasLoadedRef.current = true;

        loadAiDailyCount(userId)
            .then((usage) => dispatch({ type: 'AI_DAILY_LOADED', count: usage.count, date: usage.date }))
            .catch((err: unknown) => logger.warn('[useTierLimits] AI daily load failed', err));

        getStorageUsageMb(userId)
            .then((storageMb) => dispatch({ type: 'STORAGE_UPDATED', storageMb }))
            .catch((err: unknown) => logger.warn('[useTierLimits] Storage load failed', err));
    }, [userId, dispatch]);

    const check = useCallback(
        (kind: LimitKind): LimitCheckResult => checkLimit(kind, state, tier),
        [state, tier],
    );

    return { state, dispatch, check, tier } as const;
}
