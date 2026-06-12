/**
 * Cancels active payment-provider subscriptions before account deletion.
 * Razorpay annual one-time payments are logged for manual refund review.
 */
import { getFirestore } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions/v2';
import { getStripeClient } from './stripeClient.js';
import { getRazorpayClient } from './razorpayClient.js';
import { logSecurityEvent, SecurityEventType } from './securityLogger.js';

interface SubscriptionDoc {
    tier?: string;
    isActive?: boolean;
    provider?: 'stripe' | 'razorpay';
    gatewaySubscriptionId?: string | null;
    lastEventId?: string;
}

export async function cancelActiveSubscription(uid: string): Promise<void> {
    const snap = await getFirestore().doc(`users/${uid}/subscription/current`).get();
    if (!snap.exists) return;

    const data = snap.data() as SubscriptionDoc;
    if (data.tier !== 'pro' || data.isActive === false) return;

    if (data.provider === 'stripe' && data.gatewaySubscriptionId) {
        try {
            await getStripeClient().subscriptions.cancel(data.gatewaySubscriptionId);
            logSecurityEvent({
                type: SecurityEventType.SUBSCRIPTION_CHANGE,
                uid,
                endpoint: 'onUserDeleted',
                message: 'Stripe subscription cancelled on account deletion',
                metadata: { subscriptionId: data.gatewaySubscriptionId },
            });
        } catch (err: unknown) {
            logger.warn('[cancelActiveSubscription] Stripe cancel failed', { uid, err });
        }
        return;
    }

    if (data.provider === 'razorpay' && data.gatewaySubscriptionId) {
        try {
            const razorpay = getRazorpayClient();
            await razorpay.subscriptions.cancel(data.gatewaySubscriptionId);
            logSecurityEvent({
                type: SecurityEventType.SUBSCRIPTION_CHANGE,
                uid,
                endpoint: 'onUserDeleted',
                message: 'Razorpay subscription cancelled on account deletion',
                metadata: { subscriptionId: data.gatewaySubscriptionId },
            });
        } catch (err: unknown) {
            logger.warn('[cancelActiveSubscription] Razorpay subscription cancel failed', { uid, err });
        }
        return;
    }

    if (data.provider === 'razorpay' && data.lastEventId) {
        logSecurityEvent({
            type: SecurityEventType.SUBSCRIPTION_CHANGE,
            uid,
            endpoint: 'onUserDeleted',
            message: 'Razorpay annual payment active — manual refund review if within policy',
            metadata: { paymentId: data.lastEventId },
        });
    }
}
