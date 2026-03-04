/**
 * Firestore Rate Limiter — persistent sliding window that survives cold starts
 * Uses Firestore transactions for atomicity across function instances.
 * Documents auto-expire via TTL policy on the expiresAt field.
 */
import { getFirestore } from 'firebase-admin/firestore';
import { RATE_LIMIT_WINDOW_MS } from './securityConstants.js';
import type { RateLimiter } from './rateLimiterTypes.js';

const RATE_LIMIT_COLLECTION = '_rateLimits';

export const firestoreRateLimiter: RateLimiter = {
    async checkRateLimit(userId, endpoint, maxRequests, windowMs = RATE_LIMIT_WINDOW_MS) {
        const db = getFirestore();
        const key = `${userId}:${endpoint}`;
        const docRef = db.collection(RATE_LIMIT_COLLECTION).doc(key);

        return db.runTransaction(async (tx) => {
            const snap = await tx.get(docRef);
            const now = Date.now();
            const cutoff = now - windowMs;

            const raw = snap.data()?.timestamps;
            const timestamps: number[] = (Array.isArray(raw) ? raw : [])
                .filter((ts): ts is number => typeof ts === 'number' && ts > cutoff);

            if (timestamps.length >= maxRequests) return false;

            timestamps.push(now);
            tx.set(docRef, {
                timestamps,
                expiresAt: new Date(now + windowMs),
            });
            return true;
        });
    },

    async clearStore() {
        const db = getFirestore();
        const snapshot = await db.collection(RATE_LIMIT_COLLECTION).get();
        const batch = db.batch();
        snapshot.docs.forEach((doc) => batch.delete(doc.ref));
        await batch.commit();
    },
};
