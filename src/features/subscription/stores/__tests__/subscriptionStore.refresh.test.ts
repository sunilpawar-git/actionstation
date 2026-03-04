/**
 * Subscription Store Refresh Tests
 * TDD RED: Verifies loadSubscription clears cache before fetching
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useSubscriptionStore } from '../subscriptionStore';

const mockGetDoc = vi.fn();
vi.mock('firebase/firestore', () => ({
    doc: vi.fn(),
    getDoc: (...args: unknown[]) => mockGetDoc(...args),
}));

vi.mock('@/config/firebase', () => ({
    db: {},
}));

describe('subscriptionStore loadSubscription refresh', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        delete (import.meta.env as Record<string, unknown>).VITE_DEV_BYPASS_SUBSCRIPTION;
        useSubscriptionStore.getState().reset();
    });

    it('calls Firestore on every loadSubscription (no stale cache)', async () => {
        mockGetDoc.mockResolvedValue({ exists: () => false });

        await useSubscriptionStore.getState().loadSubscription('user-1');
        await useSubscriptionStore.getState().loadSubscription('user-1');

        expect(mockGetDoc).toHaveBeenCalledTimes(2);
    });

    it('sets tier from Firestore response', async () => {
        mockGetDoc.mockResolvedValue({
            exists: () => true,
            data: () => ({ tier: 'pro', isActive: true }),
        });

        await useSubscriptionStore.getState().loadSubscription('user-1');

        expect(useSubscriptionStore.getState().tier).toBe('pro');
        expect(useSubscriptionStore.getState().isActive).toBe(true);
    });
});
