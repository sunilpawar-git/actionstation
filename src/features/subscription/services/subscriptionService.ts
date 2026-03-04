/**
 * Subscription Service - Reads subscription status from Firestore
 * SOLID SRP: Only handles Firestore reads for subscription data
 * Security: Subscription status is also validated server-side via Firestore rules.
 */
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { SUBSCRIPTION_TIERS, type SubscriptionInfo } from '../types/subscription';

/** Expected shape of a subscription document in Firestore */
interface SubscriptionDocument {
    tier?: string;
    expiresAt?: number | null;
    isActive?: boolean;
}

const DEFAULT_SUBSCRIPTION: SubscriptionInfo = {
    tier: SUBSCRIPTION_TIERS.free,
    expiresAt: null,
    isActive: true,
};

/** Dev-only bypass for testing gated features */
const DEV_PRO_SUBSCRIPTION: SubscriptionInfo = {
    tier: SUBSCRIPTION_TIERS.pro,
    expiresAt: null,
    isActive: true,
};

/** Check if dev bypass is enabled via env var */
function isDevBypassEnabled(): boolean {
    return import.meta.env.VITE_DEV_BYPASS_SUBSCRIPTION === 'true';
}

/** In-memory cache to avoid repeated Firestore reads */
let cachedSubscription: SubscriptionInfo | null = null;
let cachedUserId: string | null = null;
let cachedAt = 0;
const CACHE_TTL_MS = 5 * 60 * 1000;

async function getSubscription(userId: string): Promise<SubscriptionInfo> {
    if (isDevBypassEnabled()) {
        return DEV_PRO_SUBSCRIPTION;
    }

    if (Date.now() - cachedAt > CACHE_TTL_MS) {
        cachedSubscription = null;
    }

    if (cachedUserId === userId && cachedSubscription) {
        return cachedSubscription;
    }

    try {
        const subDoc = await getDoc(doc(db, 'users', userId, 'subscription', 'current'));

        if (!subDoc.exists()) {
            cachedSubscription = DEFAULT_SUBSCRIPTION;
            cachedUserId = userId;
            cachedAt = Date.now();
            return DEFAULT_SUBSCRIPTION;
        }

        const data = subDoc.data() as SubscriptionDocument;
        const info: SubscriptionInfo = {
            tier: data.tier === SUBSCRIPTION_TIERS.pro
                ? SUBSCRIPTION_TIERS.pro
                : SUBSCRIPTION_TIERS.free,
            expiresAt: data.expiresAt ?? null,
            isActive: data.isActive !== false,
        };

        // Check expiry
        if (info.expiresAt && info.expiresAt < Date.now()) {
            info.tier = SUBSCRIPTION_TIERS.free;
            info.isActive = false;
        }

        cachedSubscription = info;
        cachedUserId = userId;
        cachedAt = Date.now();
        return info;
    } catch {
        // Offline or error: return default (free)
        return DEFAULT_SUBSCRIPTION;
    }
}

function clearCache(): void {
    cachedSubscription = null;
    cachedUserId = null;
    cachedAt = 0;
}

export const subscriptionService = {
    getSubscription,
    clearCache,
    DEFAULT_SUBSCRIPTION,
};
