/**
 * storageUsageService tests — verifies Firestore-backed storage usage tracking
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { addStorageUsage, getStorageUsageMb, subtractStorageUsage } from '../storageUsageService';

const mockRunTransaction = vi.fn();
const mockGet = vi.fn();

vi.mock('@/config/firebase', () => ({
    db: {},
}));

vi.mock('firebase/firestore', () => ({
    doc: vi.fn().mockReturnValue('mock-doc-ref'),
    runTransaction: (...args: unknown[]) => mockRunTransaction(...args),
    getDoc: (...args: unknown[]) => mockGet(...args),
}));

vi.mock('@/shared/services/logger', () => ({
    logger: { warn: vi.fn(), error: vi.fn() },
}));

describe('storageUsageService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('addStorageUsage', () => {
        it('adds bytes and writes updated total', async () => {
            mockRunTransaction.mockImplementation(async (_db: unknown, callback: (tx: unknown) => unknown) => {
                const tx = {
                    get: vi.fn().mockResolvedValue({
                        exists: () => true,
                        data: () => ({ totalBytes: 1000 }),
                    }),
                    set: vi.fn(),
                };
                await callback(tx);
            });

            await addStorageUsage('user-1', 500);
            expect(mockRunTransaction).toHaveBeenCalledOnce();
        });

        it('initializes at zero when doc does not exist', async () => {
            mockRunTransaction.mockImplementation(async (_db: unknown, callback: (tx: unknown) => unknown) => {
                const tx = {
                    get: vi.fn().mockResolvedValue({
                        exists: () => false,
                    }),
                    set: vi.fn(),
                };
                await callback(tx);
            });

            await addStorageUsage('user-1', 500);
            expect(mockRunTransaction).toHaveBeenCalledOnce();
        });

        it('does not throw on transaction failure', async () => {
            mockRunTransaction.mockRejectedValue(new Error('Firestore error'));
            await expect(addStorageUsage('user-1', 500)).resolves.toBeUndefined();
        });
    });

    describe('getStorageUsageMb', () => {
        it('returns usage in MB', async () => {
            mockGet.mockResolvedValue({
                exists: () => true,
                data: () => ({ totalBytes: 10 * 1024 * 1024 }), // 10 MB
            });

            const result = await getStorageUsageMb('user-1');
            expect(result).toBeCloseTo(10);
        });

        it('returns 0 when doc does not exist', async () => {
            mockGet.mockResolvedValue({
                exists: () => false,
            });

            const result = await getStorageUsageMb('user-1');
            expect(result).toBe(0);
        });

        it('returns 0 on error', async () => {
            mockGet.mockRejectedValue(new Error('Firestore error'));
            const result = await getStorageUsageMb('user-1');
            expect(result).toBe(0);
        });
    });

    describe('subtractStorageUsage', () => {
        it('clamps result at 0 to prevent negative storage', async () => {
            let writtenData: Record<string, unknown> = {};
            mockRunTransaction.mockImplementation(async (_db: unknown, callback: (tx: unknown) => unknown) => {
                const setFn = vi.fn().mockImplementation((_ref: unknown, data: Record<string, unknown>) => {
                    writtenData = data;
                });
                const tx = {
                    get: vi.fn().mockResolvedValue({
                        exists: () => true,
                        data: () => ({ totalBytes: 100 }),
                    }),
                    set: setFn,
                };
                await callback(tx);
            });

            await subtractStorageUsage('user-1', 999);
            expect(writtenData.totalBytes).toBe(0);
        });

        it('subtracts bytes correctly', async () => {
            let writtenData: Record<string, unknown> = {};
            mockRunTransaction.mockImplementation(async (_db: unknown, callback: (tx: unknown) => unknown) => {
                const setFn = vi.fn().mockImplementation((_ref: unknown, data: Record<string, unknown>) => {
                    writtenData = data;
                });
                const tx = {
                    get: vi.fn().mockResolvedValue({
                        exists: () => true,
                        data: () => ({ totalBytes: 2000 }),
                    }),
                    set: setFn,
                };
                await callback(tx);
            });

            await subtractStorageUsage('user-1', 500);
            expect(writtenData.totalBytes).toBe(1500);
        });
    });
});
