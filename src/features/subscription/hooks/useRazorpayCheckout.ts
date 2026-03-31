/**
 * useRazorpayCheckout — hook for initiating Razorpay checkout
 * Uses Razorpay Checkout.js (client-side modal) — card data never leaves Razorpay's iframe.
 * After payment, Razorpay fires webhook → Cloud Function updates subscription in Firestore.
 */
import { useCallback, useRef, useState } from 'react';
import { useAuthStore } from '@/features/auth/stores/authStore';
import { useSubscriptionStore } from '@/features/subscription/stores/subscriptionStore';
import { getAuthToken } from '@/features/auth/services/authTokenService';
import { getAppCheckToken } from '@/features/subscription/utils/appCheckToken';
import { logger } from '@/shared/services/logger';
import { loadRazorpayScript } from '../utils/razorpayScriptLoader';

const CLOUD_FUNCTIONS_URL = import.meta.env.VITE_CLOUD_FUNCTIONS_URL;

interface OrderResponse {
    orderId: string;
    amount: number;
    currency: string;
    keyId: string;
}

interface UseRazorpayCheckoutReturn {
    startCheckout: (planId: string, currency?: 'INR' | 'USD') => Promise<void>;
    isLoading: boolean;
    error: string | null;
}

/** Fetch a Razorpay order from the Cloud Function. */
async function fetchOrder(
    planId: string,
    currency: string,
): Promise<OrderResponse | { error: string }> {
    const [token, appCheckToken] = await Promise.all([getAuthToken(), getAppCheckToken()]);
    if (!token) return { error: 'Authentication required' };

    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
    };
    if (appCheckToken) headers['X-Firebase-AppCheck'] = appCheckToken;

    const response = await fetch(`${CLOUD_FUNCTIONS_URL}/createRazorpayOrder`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ planId, currency }),
        signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as { error?: string };
        return { error: data.error ?? `HTTP ${response.status}` };
    }
    return response.json() as Promise<OrderResponse>;
}

export function useRazorpayCheckout(): UseRazorpayCheckoutReturn {
    const user = useAuthStore((s) => s.user);
    const userRef = useRef(user);
    userRef.current = user;

    // Timer ref required by structural guardrail: setTimeout in useCallback must store ID in ref.
    const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const startCheckout = useCallback(
        async (planId: string, currency: 'INR' | 'USD' = 'INR') => {
            const uid = userRef.current?.id;
            if (!uid) { logger.warn('Razorpay checkout attempted without auth'); return; }

            setIsLoading(true);
            setError(null);

            try {
                const result = await fetchOrder(planId, currency);
                if ('error' in result) { setError(result.error); setIsLoading(false); return; }

                await loadRazorpayScript();
                const RazorpayClass = window.Razorpay;
                if (!RazorpayClass) {
                    setError('Razorpay checkout not available');
                    setIsLoading(false);
                    return;
                }

                // isLoading stays true while modal is open; cleared on success/dismiss.
                new RazorpayClass({
                    key: result.keyId,
                    amount: result.amount,
                    currency: result.currency,
                    order_id: result.orderId,
                    name: 'ActionStation',
                    description: `Pro Subscription (${currency})`,
                    prefill: { name: userRef.current?.name ?? '', email: userRef.current?.email ?? '' },
                    theme: { color: '#4f46e5' },
                    handler: () => {
                        // Webhook updates Firestore async; reload subscription after brief delay.
                        if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
                        refreshTimerRef.current = setTimeout(() => {
                            void useSubscriptionStore.getState().loadSubscription(uid).catch(
                                (e: unknown) => logger.error('Subscription refresh failed', e as Error),
                            );
                        }, 2000);
                        setIsLoading(false);
                    },
                    modal: { ondismiss: () => { setIsLoading(false); } },
                }).open();
            } catch (err: unknown) {
                const msg = err instanceof Error ? err.message : 'Checkout failed';
                setError(msg);
                logger.error('Razorpay checkout error', err instanceof Error ? err : new Error(msg));
                setIsLoading(false);
            }
        },
        [],
    );

    return { startCheckout, isLoading, error };
}
