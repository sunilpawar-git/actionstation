/**
 * storageUsageService — Per-user storage usage tracking in Firestore
 *
 * Counter is written by Cloud Functions (onStorageObjectFinalized/Deleted).
 * Client is read-only.
 *
 * Firestore path: users/{userId}/usage/storage
 */
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { logger } from '@/shared/services/logger';

const USAGE_DOC = 'storage';

function storageDocRef(userId: string) {
    return doc(db, `users/${userId}/usage/${USAGE_DOC}`);
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
