/**
 * Server-side storage usage counter — sole writer for users/{uid}/usage/storage.
 */
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions/v2';

const USAGE_PATH = (uid: string) => `users/${uid}/usage/storage`;

export function parseUserIdFromStoragePath(filePath: string): string | null {
    const match = /^users\/([^/]+)\//.exec(filePath);
    return match?.[1] ?? null;
}

export async function adjustStorageUsage(uid: string, deltaBytes: number): Promise<void> {
    if (!uid || deltaBytes === 0) return;

    const db = getFirestore();
    const ref = db.doc(USAGE_PATH(uid));

    try {
        await db.runTransaction(async (tx) => {
            const snap = await tx.get(ref);
            const current = snap.exists
                ? ((snap.data() as { totalBytes?: number }).totalBytes ?? 0)
                : 0;
            const next = Math.max(0, current + deltaBytes);
            tx.set(ref, {
                totalBytes: next,
                updatedAt: FieldValue.serverTimestamp(),
            }, { merge: true });
        });
    } catch (err: unknown) {
        logger.warn('[storageUsageAdmin] adjust failed', { uid, deltaBytes, err });
    }
}
