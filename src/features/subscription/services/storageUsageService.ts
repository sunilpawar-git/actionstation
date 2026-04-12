/**
 * storageUsageService — Per-user storage usage tracking in Firestore
 *
 * Tracks cumulative bytes uploaded to Firebase Storage.
 * Written at upload time by the client (fire-and-forget).
 * Read at app mount to initialize the tier limits reducer.
 *
 * Firestore path: users/{userId}/usage/storage
 * Security rule: client read + write allowed (no sensitive data).
 */
import { doc, runTransaction, getDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { logger } from '@/shared/services/logger';

const USAGE_DOC = 'storage';

function storageDocRef(userId: string) {
    return doc(db, `users/${userId}/usage/${USAGE_DOC}`);
}

/**
 * Add deltaBytes to the user's cumulative storage counter.
 * Fire-and-forget: errors are logged, never thrown.
 */
export async function addStorageUsage(userId: string, deltaBytes: number): Promise<void> {
    try {
        await runTransaction(db, async (tx) => {
            const snap = await tx.get(storageDocRef(userId));
            const current: number = snap.exists() ? ((snap.data() as { totalBytes?: number }).totalBytes ?? 0) : 0;
            tx.set(storageDocRef(userId), { totalBytes: current + deltaBytes }, { merge: true });
        });
    } catch (err) {
        logger.warn('[storageUsage] addStorageUsage failed', err);
    }
}

/**
 * Get the user's total storage usage in MB.
 * Returns 0 on error or missing doc — fail open, don't block the UI.
 */
export async function getStorageUsageMb(userId: string): Promise<number> {
    try {
        const snap = await getDoc(storageDocRef(userId));
        if (!snap.exists()) return 0;
        const bytes: number = (snap.data() as { totalBytes?: number }).totalBytes ?? 0;
        return bytes / (1024 * 1024);
    } catch (err) {
        logger.warn('[storageUsage] getStorageUsageMb failed', err);
        return 0;
    }
}

/**
 * Subtract deltaBytes from the user's storage counter, clamping at 0.
 * Called during file deletion. Fire-and-forget.
 */
export async function subtractStorageUsage(userId: string, deltaBytes: number): Promise<void> {
    try {
        await runTransaction(db, async (tx) => {
            const snap = await tx.get(storageDocRef(userId));
            const current: number = snap.exists() ? ((snap.data() as { totalBytes?: number }).totalBytes ?? 0) : 0;
            const next = Math.max(0, current - deltaBytes);
            tx.set(storageDocRef(userId), { totalBytes: next }, { merge: true });
        });
    } catch (err) {
        logger.warn('[storageUsage] subtractStorageUsage failed', err);
    }
}
