/**
 * useBillingPortal — hook for redirecting to Stripe Customer Portal
 * Allows users to manage subscriptions, update payment, and cancel.
 * Uses useRef pattern for stable callback (Decision 12).
 */
import { useCallback, useRef, useState } from 'react';
import { useAuthStore } from '@/features/auth/stores/authStore';
import { getAuthToken } from '@/features/auth/services/authTokenService';
import { getAppCheckToken } from '@/features/subscription/utils/appCheckToken';
import { logger } from '@/shared/services/logger';

const CLOUD_FUNCTIONS_URL = import.meta.env.VITE_CLOUD_FUNCTIONS_URL;

interface UseBillingPortalReturn {
    openBillingPortal: () => Promise<void>;
    isLoading: boolean;
    error: string | null;
}

export function useBillingPortal(): UseBillingPortalReturn {
    const userId = useAuthStore((s) => s.user?.id);
    const userIdRef = useRef(userId);
    userIdRef.current = userId;

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const openBillingPortal = useCallback(async () => {
        const uid = userIdRef.current;
        if (!uid) {
            logger.warn('Billing portal attempted without auth');
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const [token, appCheckToken] = await Promise.all([getAuthToken(), getAppCheckToken()]);
            if (!token) {
                setError('Authentication required');
                return;
            }

            const headers: Record<string, string> = {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            };
            if (appCheckToken) headers['X-Firebase-AppCheck'] = appCheckToken;

            const response = await fetch(
                `${CLOUD_FUNCTIONS_URL}/createBillingPortalSession`,
                {
                    method: 'POST',
                    headers,
                    body: JSON.stringify({}),
                    signal: AbortSignal.timeout(10_000),
                },
            );

            if (!response.ok) {
                const data = (await response.json().catch(() => ({}))) as
                    { error?: string };
                const msg = data.error ?? `HTTP ${response.status}`;
                setError(msg);
                return;
            }

            const { portalUrl } = await response.json() as {
                portalUrl: string;
            };
            window.location.href = portalUrl;
        } catch (err: unknown) {
            const msg = err instanceof Error
                ? err.message : 'Failed to open billing portal';
            setError(msg);
            logger.error('Billing portal error', err instanceof Error ? err : new Error(msg));
        } finally {
            setIsLoading(false);
        }
    }, []);

    return { openBillingPortal, isLoading, error };
}
