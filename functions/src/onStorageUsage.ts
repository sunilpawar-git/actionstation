/**
 * Storage triggers — server-authoritative usage/storage counter.
 */
import { onObjectFinalized, onObjectDeleted } from 'firebase-functions/v2/storage';
import { logger } from 'firebase-functions/v2';
import { adjustStorageUsage, parseUserIdFromStoragePath } from './utils/storageUsageAdmin.js';

function objectSizeBytes(size: string | number | undefined): number {
    const parsed = Number(size ?? 0);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

async function handleStorageDelta(filePath: string, deltaBytes: number): Promise<void> {
    const uid = parseUserIdFromStoragePath(filePath);
    if (!uid) return;
    await adjustStorageUsage(uid, deltaBytes);
}

export const onStorageObjectFinalized = onObjectFinalized(async (event) => {
    const filePath = event.data.name;
    const size = objectSizeBytes(event.data.size);
    if (!filePath || size === 0) return;
    await handleStorageDelta(filePath, size);
    logger.info('[onStorageObjectFinalized] usage incremented', { filePath, size });
});

export const onStorageObjectDeleted = onObjectDeleted(async (event) => {
    const filePath = event.data.name;
    const size = objectSizeBytes(event.data.size);
    if (!filePath || size === 0) return;
    await handleStorageDelta(filePath, -size);
    logger.info('[onStorageObjectDeleted] usage decremented', { filePath, size });
});
