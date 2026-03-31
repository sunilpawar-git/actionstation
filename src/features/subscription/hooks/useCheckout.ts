/**
 * useCheckout — hook for initiating Stripe Checkout redirect
 * Creates a checkout session via Cloud Function and redirects to Stripe.
 * Uses useRef pattern for stable callback (Decision 12).
 */
import { useCallback, useRef, useState } from 'react';
import { useAuthStore } from '@/features/auth/stores/authStore';
import { getAuthToken } from '@/features/auth/services/authTokenService';
import { getAppCheckToken } from '@/features/subscription/utils/appCheckToken';
import { logger } from '@/shared/services/logger';

const CLOUD_FUNCTIONS_URL = import.meta.env.VITE_CLOUD_FUNCTIONS_URL;

interface UseCheckoutReturn {
    startCheckout: (priceId: string) => Promise<void>;
    isLoading: boolean;
    error: string | null;
}

export function useCheckout(): UseCheckoutReturn {
    const userId = useAuthStore((s) => s.user?.id);
    const userIdRef = useRef(userId);
    userIdRef.current = userId;

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const startCheckout = useCallback(async (priceId: string) => {
        const uid = userIdRef.current;
        if (!uid) {
            logger.warn('Checkout attempted without auth');
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
                `${CLOUD_FUNCTIONS_URL}/createCheckoutSession`,
                {
                    method: 'POST',
                    headers,
                    body: JSON.stringify({ priceId }),
                    signal: AbortSignal.timeout(10_000),
                },
            );

            if (!response.ok) {
                const data = (await response.json().catch(() => ({}))) as
                    { error?: string };
                const msg = data.error ?? `HTTP ${response.status}`;
                setError(msg);
                logger.error('Checkout session creation failed', new Error(msg));
                return;
            }

            const { checkoutUrl } = await response.json() as {
                checkoutUrl: string;
            };
            window.location.href = checkoutUrl;
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Checkout failed';
            setError(msg);
            logger.error('Checkout error', err instanceof Error ? err : new Error(msg));
        } finally {
            setIsLoading(false);
        }
    }, []);

    return { startCheckout, isLoading, error };
}
