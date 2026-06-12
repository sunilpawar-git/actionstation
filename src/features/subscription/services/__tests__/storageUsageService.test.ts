/**
 * storageUsageService tests — read-only client counter
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getStorageUsageMb } from '../storageUsageService';

const mockGet = vi.fn();

vi.mock('@/config/firebase', () => ({
    db: {},
}));

vi.mock('firebase/firestore', () => ({
    doc: vi.fn().mockReturnValue('mock-doc-ref'),
    getDoc: (...args: unknown[]) => mockGet(...args),
}));

vi.mock('@/shared/services/logger', () => ({
    logger: { warn: vi.fn(), error: vi.fn() },
}));

describe('storageUsageService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('getStorageUsageMb', () => {
        it('returns usage in MB', async () => {
            mockGet.mockResolvedValue({
                exists: () => true,
                data: () => ({ totalBytes: 10 * 1024 * 1024 }),
            });

            const result = await getStorageUsageMb('user-1');
            expect(result).toBeCloseTo(10);
        });

        it('returns 0 when doc does not exist', async () => {
            mockGet.mockResolvedValue({ exists: () => false });
            const result = await getStorageUsageMb('user-1');
            expect(result).toBe(0);
        });

        it('returns 0 on error', async () => {
            mockGet.mockRejectedValue(new Error('Firestore error'));
            const result = await getStorageUsageMb('user-1');
            expect(result).toBe(0);
        });
    });
});
