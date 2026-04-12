/**
 * useNodeCreationGuard tests — verifies node-per-workspace limit guard.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { ReactNode } from 'react';
import { useNodeCreationGuard } from '../useNodeCreationGuard';
import { TierLimitsProvider } from '@/features/subscription/contexts/TierLimitsContext';
import { FREE_TIER_LIMITS } from '@/features/subscription/types/tierLimits';

// ── Mocks ────────────────────────────────────────────────────────────────────

let mockTier = 'free';
let mockNodeCount = 0;
const mockToastWithAction = vi.fn();

vi.mock('@/features/auth/stores/authStore', () => ({
    useAuthStore: (selector: (s: Record<string, unknown>) => unknown) =>
        selector({ user: { id: 'user-1' } }),
}));
vi.mock('@/features/workspace/stores/workspaceStore', () => ({
    useWorkspaceStore: (selector: (s: Record<string, unknown>) => unknown) =>
        selector({ workspaces: [{ id: 'ws-1', type: 'workspace' }] }),
}));
vi.mock('@/features/canvas/stores/canvasStore', () => ({
    useCanvasStore: (selector: (s: Record<string, unknown>) => unknown) =>
        selector({ nodes: new Array(mockNodeCount).fill(null) }),
}));
vi.mock('@/features/subscription/stores/subscriptionStore', () => ({
    useSubscriptionStore: (selector: (s: Record<string, unknown>) => unknown) =>
        selector({ tier: mockTier }),
}));
vi.mock('@/shared/stores/toastStore', () => ({
    toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() },
    toastWithAction: (...args: unknown[]) => mockToastWithAction(...args),
}));
vi.mock('@/shared/services/logger', () => ({
    logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));
vi.mock('@/features/subscription/services/usageCountService', () => ({
    loadAiDailyCount: vi.fn().mockResolvedValue({ count: 0, date: '' }),
}));
vi.mock('@/features/subscription/hooks/useRazorpayCheckout', () => ({
    useRazorpayCheckout: () => ({
        startCheckout: vi.fn().mockResolvedValue(undefined),
        isLoading: false,
        error: null,
    }),
}));

function wrapper({ children }: { children: ReactNode }) {
    return <TierLimitsProvider>{children}</TierLimitsProvider>;
}

describe('useNodeCreationGuard', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockTier = 'free';
        mockNodeCount = 0;
    });

    it('allows creation when under limit', () => {
        mockNodeCount = 5;
        const { result } = renderHook(() => useNodeCreationGuard(), { wrapper });
        let allowed = false;
        act(() => { allowed = result.current.guardNodeCreation(); });
        expect(allowed).toBe(true);
        expect(mockToastWithAction).not.toHaveBeenCalled();
    });

    it('blocks creation at free limit (12 nodes)', () => {
        mockNodeCount = FREE_TIER_LIMITS.maxNodesPerWorkspace;
        const { result } = renderHook(() => useNodeCreationGuard(), { wrapper });
        let allowed = true;
        act(() => { allowed = result.current.guardNodeCreation(); });
        expect(allowed).toBe(false);
        expect(mockToastWithAction).toHaveBeenCalledOnce();
        expect(mockToastWithAction).toHaveBeenCalledWith(
            expect.stringContaining('12-node limit'),
            'warning',
            expect.objectContaining({ label: expect.any(String) }),
        );
    });

    it('allows pro users at any node count', () => {
        mockTier = 'pro';
        mockNodeCount = 100;
        const { result } = renderHook(() => useNodeCreationGuard(), { wrapper });
        let allowed = false;
        act(() => { allowed = result.current.guardNodeCreation(); });
        expect(allowed).toBe(true);
        expect(mockToastWithAction).not.toHaveBeenCalled();
    });
});
