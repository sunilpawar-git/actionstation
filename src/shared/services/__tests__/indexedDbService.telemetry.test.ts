/**
 * IndexedDB Telemetry Tests
 * TDD RED: Verifies captureError is called on IDB failures
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { indexedDbService, IDB_STORES } from '../indexedDbService';
import { captureError } from '../../services/sentryService';

vi.mock('idb', () => ({
    openDB: vi.fn().mockRejectedValue(new Error('IDB unavailable')),
}));

vi.mock('../../services/sentryService', () => ({
    captureError: vi.fn(),
}));

describe('indexedDbService telemetry', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        indexedDbService.resetConnection();
    });

    it('calls captureError on get failure and returns undefined', async () => {
        const result = await indexedDbService.get(IDB_STORES.workspaceData, 'k');
        expect(result).toBeUndefined();
        expect(captureError).toHaveBeenCalledOnce();
    });

    it('calls captureError on put failure and returns false', async () => {
        const result = await indexedDbService.put(IDB_STORES.workspaceData, 'k', 'v');
        expect(result).toBe(false);
        expect(captureError).toHaveBeenCalledOnce();
    });

    it('calls captureError on del failure and returns false', async () => {
        const result = await indexedDbService.del(IDB_STORES.workspaceData, 'k');
        expect(result).toBe(false);
        expect(captureError).toHaveBeenCalledOnce();
    });

    it('calls captureError on getAllKeys failure and returns empty array', async () => {
        const result = await indexedDbService.getAllKeys(IDB_STORES.workspaceData);
        expect(result).toEqual([]);
        expect(captureError).toHaveBeenCalledOnce();
    });

    it('calls captureError on clear failure and returns false', async () => {
        const result = await indexedDbService.clear(IDB_STORES.workspaceData);
        expect(result).toBe(false);
        expect(captureError).toHaveBeenCalledOnce();
    });
});
