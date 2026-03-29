/**
 * useRazorpayCheckout — hook for initiating Razorpay checkout
 * Uses Razorpay Checkout.js (client-side modal) — card data never leaves Razorpay's iframe.
 * After payment, Razorpay fires webhook → Cloud Function updates subscription in Firestore.
 */
import { useCallback, useRef, useState } from 'react';
import { useAuthStore } from '@/features/auth/stores/authStore';
import { getAuthToken } from '@/features/auth/services/authTokenService';
import { logger } from '@/shared/services/logger';
import {
    loadRazorpayScript,
    type RazorpaySuccessResponse,
} from '../utils/razorpayScriptLoader';

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

export function useRazorpayCheckout(): UseRazorpayCheckoutReturn {
    const user = useAuthStore((s) => s.user);
    const userRef = useRef(user);
    userRef.current = user;

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const startCheckout = useCallback(
        async (planId: string, currency: 'INR' | 'USD' = 'INR') => {
            const uid = userRef.current?.id;
            if (!uid) {
                logger.warn('Razorpay checkout attempted without auth');
                return;
            }

            setIsLoading(true);
            setError(null);

            try {
                const token = await getAuthToken();
                if (!token) { setError('Authentication required'); return; }

                const response = await fetch(
                    `${CLOUD_FUNCTIONS_URL}/createRazorpayOrder`,
                    {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            Authorization: `Bearer ${token}`,
                        },
                        body: JSON.stringify({ planId, currency }),
                        signal: AbortSignal.timeout(10_000),
                    },
                );

                if (!response.ok) {
                    const data = (await response.json().catch(() => ({}))) as
                        { error?: string };
                    setError(data.error ?? `HTTP ${response.status}`);
                    return;
                }

                const orderData = (await response.json()) as OrderResponse;
                await loadRazorpayScript();

                const RazorpayClass = window.Razorpay;
                if (!RazorpayClass) {
                    setError('Razorpay checkout not available');
                    return;
                }

                const checkout = new RazorpayClass({
                    key: orderData.keyId,
                    amount: orderData.amount,
                    currency: orderData.currency,
                    order_id: orderData.orderId,
                    name: 'ActionStation',
                    description: `Pro Subscription (${currency})`,
                    prefill: {
                        name: userRef.current?.name ?? '',
                        email: userRef.current?.email ?? '',
                    },
                    theme: { color: '#4f46e5' },
                    handler: (_r: RazorpaySuccessResponse) => {
                        logger.info('Razorpay payment successful');
                    },
                    modal: { ondismiss: () => { setIsLoading(false); } },
                });

                checkout.open();
            } catch (err: unknown) {
                const msg = err instanceof Error
                    ? err.message : 'Checkout failed';
                setError(msg);
                logger.error('Razorpay checkout error',
                    err instanceof Error ? err : new Error(msg));
            } finally {
                setIsLoading(false);
            }
        },
        [],
    );

    return { startCheckout, isLoading, error };
}
