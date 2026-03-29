/**
 * Razorpay Client — singleton SDK instance with Secret Manager integration
 * Secrets resolved at runtime via defineSecret — never hardcoded.
 * Cached per Cloud Function instance (cold-start only).
 */
import { defineSecret } from 'firebase-functions/params';
import Razorpay from 'razorpay';

// Re-derive type from defineSecret return
type SecretParam = ReturnType<typeof defineSecret>;

/** Razorpay Key ID — stored in GCP Secret Manager */
export const razorpayKeyId: SecretParam = defineSecret('RAZORPAY_KEY_ID');

/** Razorpay Key Secret — stored in GCP Secret Manager */
export const razorpayKeySecret: SecretParam = defineSecret('RAZORPAY_KEY_SECRET');

/** Razorpay Webhook Secret — stored in GCP Secret Manager */
export const razorpayWebhookSecret: SecretParam = defineSecret('RAZORPAY_WEBHOOK_SECRET');

let razorpayInstance: Razorpay | null = null;

/**
 * Returns a Razorpay client instance. Cached per Cloud Function instance.
 */
export function getRazorpayClient(): Razorpay {
    if (!razorpayInstance) {
        razorpayInstance = new Razorpay({
            key_id: razorpayKeyId.value(),
            key_secret: razorpayKeySecret.value(),
        });
    }
    return razorpayInstance;
}

/** Reset cached instance (for testing / key rotation scenarios) */
export function resetRazorpayClient(): void {
    razorpayInstance = null;
}
