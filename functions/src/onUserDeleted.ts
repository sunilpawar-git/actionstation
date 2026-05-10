/**
 * Cloud Function: onUserDeleted (HTTPS Callable)
 * Called by the client immediately before deleting their Firebase Auth account.
 * Performs GDPR Article 17 (right to erasure) cleanup of ALL user data in
 * Firestore and Firebase Storage.
 *
 * The client must call this function BEFORE calling Firebase Auth `deleteUser()`.
 * It requires a live, authenticated session (request.auth.uid must match uid arg).
 *
 * Data deleted:
 *  • Firestore: users/{uid}/** (all workspaces, nodes, edges, KB, usage, subscription)
 *  • Storage:   users/{uid}/** (all uploaded images and attachments)
 *
 * The function NEVER throws cleanup errors — Firestore/Storage failures are
 * logged but do NOT prevent the deletion from completing.
 */
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { logger } from 'firebase-functions/v2';
import { logSecurityEvent, SecurityEventType } from './utils/securityLogger.js';
import { ALLOWED_ORIGINS } from './utils/corsConfig.js';

// ── Storage cleanup ────────────────────────────────────────────────────────

async function deleteUserStorage(uid: string): Promise<void> {
    const bucket = getStorage().bucket();
    const [files] = await bucket.getFiles({ prefix: `users/${uid}/` });
    if (files.length === 0) return;

    const results = await Promise.allSettled(files.map((file) => file.delete()));
    const failures = results.filter((r) => r.status === 'rejected');
    if (failures.length > 0) {
        logger.warn(`onUserDeleted: ${failures.length}/${files.length} storage files failed`, { uid });
    }
}

// ── Firestore cleanup ──────────────────────────────────────────────────────

async function deleteUserFirestore(uid: string): Promise<void> {
    const db = getFirestore();
    await db.recursiveDelete(db.collection('users').doc(uid));
}

// ── Handler ────────────────────────────────────────────────────────────────

export const onUserDeleted = onCall(
    { minInstances: 0, cors: ALLOWED_ORIGINS, enforceAppCheck: true },
    async (request) => {
        const uid = request.auth?.uid;
        if (!uid) throw new HttpsError('unauthenticated', 'Must be authenticated to delete account data.');

        logger.info(`onUserDeleted: starting cleanup for uid=${uid}`);

        try {
            await deleteUserFirestore(uid);
            logger.info(`onUserDeleted: Firestore cleanup complete for uid=${uid}`);
        } catch (err: unknown) {
            logger.error('onUserDeleted: Firestore cleanup failed', err, { uid });
        }

        try {
            await deleteUserStorage(uid);
            logger.info(`onUserDeleted: Storage cleanup complete for uid=${uid}`);
        } catch (err: unknown) {
            logger.error('onUserDeleted: Storage cleanup failed', err, { uid });
        }

        logSecurityEvent({
            type: SecurityEventType.ACCOUNT_DELETED,
            uid,
            endpoint: 'onUserDeleted',
            message: `User account data deleted for uid: ${uid}`,
        });

        return { success: true };
    },
);

