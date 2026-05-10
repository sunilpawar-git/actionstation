/**
 * onUserDeleted Cloud Function Tests — GDPR data cleanup on account deletion
 *
 * Uses the mock-onCall technique from calendarEvents.test.ts:
 *   onCall(_opts, handler) => handler  — returns the inner handler directly.
 *
 * Verifies that all user data (Firestore + Storage) is cleaned up when a
 * client calls onUserDeleted before deleting their Firebase Auth account.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { logSecurityEvent } from '../utils/securityLogger.js';

// ── Admin SDK mocks ────────────────────────────────────────────────────────

const mockRecursiveDelete = vi.fn().mockResolvedValue(undefined);
const mockDocFn = vi.fn().mockReturnThis();
const mockCollection = vi.fn(() => ({
    doc: mockDocFn,
}));

vi.mock('firebase-admin/firestore', () => ({
    getFirestore: () => ({
        collection: mockCollection,
        doc: mockDocFn,
        recursiveDelete: mockRecursiveDelete,
    }),
}));

const mockGetFiles = vi.fn().mockResolvedValue([[]]);
const mockDeleteFile = vi.fn().mockResolvedValue(undefined);
const mockBucket = vi.fn(() => ({
    getFiles: mockGetFiles,
    file: vi.fn(() => ({ delete: mockDeleteFile })),
}));
vi.mock('firebase-admin/storage', () => ({
    getStorage: () => ({ bucket: mockBucket }),
}));

vi.mock('firebase-admin/app', () => ({
    initializeApp: vi.fn(),
}));

vi.mock('firebase-functions/v2', () => ({
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

// Extract the inner handler via mock-onCall technique
vi.mock('firebase-functions/v2/https', () => ({
    onCall: (_opts: unknown, handler: unknown) => handler,
    HttpsError: class HttpsError extends Error {
        readonly code: string;
        constructor(code: string, message: string) {
            super(message);
            this.code = code;
        }
    },
}));

vi.mock('../utils/securityLogger.js', () => ({
    logSecurityEvent: vi.fn(),
    SecurityEventType: { ACCOUNT_DELETED: 'account_deleted' },
}));

vi.mock('../utils/corsConfig.js', () => ({
    ALLOWED_ORIGINS: ['https://example.com'],
}));

import { onUserDeleted } from '../onUserDeleted.js';

const mockLogSecurityEvent = vi.mocked(logSecurityEvent);

function makeRequest(uid: string) {
    return { auth: { uid, token: {} } };
}

describe('onUserDeleted', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockGetFiles.mockResolvedValue([[]]);
    });

    it('calls recursiveDelete on the user Firestore document', async () => {
        await (onUserDeleted as Function)(makeRequest('user-123'));
        expect(mockRecursiveDelete).toHaveBeenCalledOnce();
    });

    it('deletes Storage files under users/{uid}/', async () => {
        const mockFile = { delete: mockDeleteFile, name: 'users/user-123/image.png' };
        mockGetFiles.mockResolvedValue([[mockFile]]);

        await (onUserDeleted as Function)(makeRequest('user-123'));

        expect(mockGetFiles).toHaveBeenCalledWith({ prefix: 'users/user-123/' });
        expect(mockDeleteFile).toHaveBeenCalledOnce();
    });

    it('handles multiple storage files gracefully', async () => {
        const files = [
            { delete: vi.fn().mockResolvedValue(undefined), name: 'users/user-123/a.png' },
            { delete: vi.fn().mockResolvedValue(undefined), name: 'users/user-123/b.pdf' },
            { delete: vi.fn().mockResolvedValue(undefined), name: 'users/user-123/c.jpg' },
        ];
        mockGetFiles.mockResolvedValue([files]);

        await (onUserDeleted as Function)(makeRequest('user-123'));

        for (const file of files) {
            expect(file.delete).toHaveBeenCalledOnce();
        }
    });

    it('proceeds without throwing when there are no storage files', async () => {
        mockGetFiles.mockResolvedValue([[]]);
        await expect(
            (onUserDeleted as Function)(makeRequest('user-123')),
        ).resolves.not.toThrow();
    });

    it('proceeds without throwing when a storage file delete fails', async () => {
        const failingFile = { delete: vi.fn().mockRejectedValue(new Error('Not found')), name: 'a.png' };
        mockGetFiles.mockResolvedValue([[failingFile]]);
        await expect(
            (onUserDeleted as Function)(makeRequest('user-123')),
        ).resolves.not.toThrow();
    });

    it('proceeds without throwing when Firestore recursiveDelete fails', async () => {
        mockRecursiveDelete.mockRejectedValue(new Error('Firestore error'));
        await expect(
            (onUserDeleted as Function)(makeRequest('user-123')),
        ).resolves.not.toThrow();
    });

    it('logs a security event for the account deletion', async () => {
        await (onUserDeleted as Function)(makeRequest('user-123'));
        expect(mockLogSecurityEvent).toHaveBeenCalledOnce();
        const call = mockLogSecurityEvent.mock.calls[0]?.[0];
        expect(call?.uid).toBe('user-123');
        expect(call?.endpoint).toBe('onUserDeleted');
    });

    it('throws HttpsError when caller is not authenticated', async () => {
        await expect(
            (onUserDeleted as Function)({ auth: null }),
        ).rejects.toThrow();
    });
});
