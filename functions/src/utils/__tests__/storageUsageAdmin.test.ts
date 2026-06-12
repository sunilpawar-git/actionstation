/**
 * storageUsageAdmin tests
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSet = vi.fn();
const mockGet = vi.fn();
const mockRunTransaction = vi.fn();

vi.mock('firebase-admin/firestore', () => ({
    getFirestore: () => ({
        doc: vi.fn(() => 'usage-ref'),
        runTransaction: mockRunTransaction,
    }),
    FieldValue: { serverTimestamp: () => 'SERVER_TS' },
}));

vi.mock('firebase-functions/v2', () => ({
    logger: { warn: vi.fn() },
}));

describe('storageUsageAdmin', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockRunTransaction.mockImplementation(async (cb: (tx: unknown) => Promise<void>) => {
            await cb({ get: mockGet, set: mockSet });
        });
    });

    it('parseUserIdFromStoragePath extracts uid', async () => {
        const { parseUserIdFromStoragePath } = await import('../storageUsageAdmin.js');
        expect(parseUserIdFromStoragePath('users/u1/workspaces/ws/nodes/n1/a.png')).toBe('u1');
        expect(parseUserIdFromStoragePath('shared-snapshots/x')).toBeNull();
    });

    it('adjustStorageUsage increments totalBytes', async () => {
        mockGet.mockResolvedValue({
            exists: true,
            data: () => ({ totalBytes: 100 }),
        });
        const { adjustStorageUsage } = await import('../storageUsageAdmin.js');
        await adjustStorageUsage('user-1', 50);
        expect(mockSet).toHaveBeenCalledWith(
            'usage-ref',
            expect.objectContaining({ totalBytes: 150 }),
            { merge: true },
        );
    });

    it('adjustStorageUsage clamps at zero on decrement', async () => {
        mockGet.mockResolvedValue({
            exists: true,
            data: () => ({ totalBytes: 40 }),
        });
        const { adjustStorageUsage } = await import('../storageUsageAdmin.js');
        await adjustStorageUsage('user-1', -100);
        expect(mockSet).toHaveBeenCalledWith(
            'usage-ref',
            expect.objectContaining({ totalBytes: 0 }),
            { merge: true },
        );
    });
});
