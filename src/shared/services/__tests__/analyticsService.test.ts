/**
 * Analytics Service Tests
 * Validates lazy loading, fire-and-forget semantics, and graceful no-op behavior
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('posthog-js', () => ({
    default: {
        init: vi.fn(),
        identify: vi.fn(),
        reset: vi.fn(),
        capture: vi.fn(),
        opt_out_capturing: vi.fn(),
    },
}));

describe('analyticsService — lazy loading', () => {
    beforeEach(() => {
        vi.resetModules();
    });

    it('initAnalytics does not call posthog.init synchronously', async () => {
        const mod = await import('../analyticsService');
        const posthogMod = await import('posthog-js');
        const posthog = posthogMod.default;

        (posthog.init as ReturnType<typeof vi.fn>).mockClear();

        mod.initAnalytics();

        expect(posthog.init).not.toHaveBeenCalled();
    });

    it('track events fire-and-forget without errors when posthog not loaded', async () => {
        const mod = await import('../analyticsService');

        expect(() => mod.trackSignIn()).not.toThrow();
        expect(() => mod.trackNodeCreated('idea')).not.toThrow();
        expect(() => mod.trackWorkspaceCreated()).not.toThrow();
    });

    it('identifyUser gracefully handles uninitialized state', async () => {
        const mod = await import('../analyticsService');
        expect(() => mod.identifyUser('user-123')).not.toThrow();
    });

    it('resetAnalyticsUser gracefully handles uninitialized state', async () => {
        const mod = await import('../analyticsService');
        expect(() => mod.resetAnalyticsUser()).not.toThrow();
    });
});
