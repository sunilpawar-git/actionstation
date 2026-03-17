/**
 * Cloud Function: onNodeDeleted
 * Triggered when a node document is deleted from Firestore.
 * Cleans up associated Firebase Storage files (images, attachments, thumbnails).
 */
import { onDocumentDeleted } from 'firebase-functions/v2/firestore';
import { getStorage } from 'firebase-admin/storage';
import { logger } from 'firebase-functions/v2';
import { FIREBASE_STORAGE_HOST } from './constants.js';

interface AttachmentMeta {
    url?: string;
    thumbnailUrl?: string;
    parsedTextUrl?: string;
}

function extractStorageUrls(text: string): string[] {
    const regex = /https:\/\/firebasestorage\.googleapis\.com\/[^\s"')}\]]+/g;
    const urls: string[] = [];
    let match: RegExpExecArray | null;
    while ((match = regex.exec(text)) !== null) {
        urls.push(match[0]);
    }
    return urls;
}

function storagePathFromUrl(url: string): string | null {
    try {
        const urlObj = new URL(url);
        const match = /\/o\/(.+?)(\?|$)/.exec(urlObj.pathname);
        if (!match?.[1]) return null;
        return decodeURIComponent(match[1]);
    } catch {
        return null;
    }
}

function collectUrlsFromNodeData(data: Record<string, unknown>): string[] {
    const urls: string[] = [];
    for (const value of Object.values(data)) {
        if (typeof value === 'string' && value.includes(FIREBASE_STORAGE_HOST)) {
            urls.push(...extractStorageUrls(value));
        }
    }
    const attachments = data['attachments'] as AttachmentMeta[] | undefined;
    if (Array.isArray(attachments)) {
        for (const att of attachments) {
            if (att.url) urls.push(att.url);
            if (att.thumbnailUrl) urls.push(att.thumbnailUrl);
            if (att.parsedTextUrl) urls.push(att.parsedTextUrl);
        }
    }
    return [...new Set(urls)];
}

export const onNodeDeleted = onDocumentDeleted(
    { document: 'users/{userId}/workspaces/{workspaceId}/nodes/{nodeId}', minInstances: 0 },
    async (event) => {
        const snap = event.data;
        if (!snap) return;

        const nodeData = snap.data()?.['data'] as Record<string, unknown> | undefined;
        if (!nodeData) return;

        const urls = collectUrlsFromNodeData(nodeData);
        if (urls.length === 0) return;

        const bucket = getStorage().bucket();
        const paths = urls.map(storagePathFromUrl).filter((p): p is string => p !== null);

        logger.info(`Cleaning up ${paths.length} Storage files for deleted node ${event.params['nodeId']}`);

        await Promise.allSettled(
            paths.map((path) => bucket.file(path).delete().catch(() => { /* already deleted */ })),
        );
    },
);
