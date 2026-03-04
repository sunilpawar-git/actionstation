/**
 * Storage Quota Tests
 * TDD RED: Verifies setStorageJson/setStorageItem return false on QuotaExceededError
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { setStorageJson, setStorageItem } from '../storage';
import { captureError } from '../../services/sentryService';

vi.mock('../../services/sentryService', () => ({
    captureError: vi.fn(),
}));

describe('storage quota handling', () => {
    const originalSetItem = Storage.prototype.setItem;

    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        Storage.prototype.setItem = originalSetItem;
    });

    function mockQuotaError() {
        Storage.prototype.setItem = vi.fn(() => {
            const err = new DOMException('quota exceeded', 'QuotaExceededError');
            throw err;
        });
    }

    describe('setStorageJson', () => {
        it('returns true on success', () => {
            const result = setStorageJson('test-key', { a: 1 });
            expect(result).toBe(true);
        });

        it('returns false on QuotaExceededError and does not throw', () => {
            mockQuotaError();
            const result = setStorageJson('key', { large: 'data' });
            expect(result).toBe(false);
        });

        it('calls captureError on failure', () => {
            mockQuotaError();
            setStorageJson('key', { large: 'data' });
            expect(captureError).toHaveBeenCalledOnce();
        });
    });

    describe('setStorageItem', () => {
        it('returns true on success', () => {
            const result = setStorageItem('test-key', 'value');
            expect(result).toBe(true);
        });

        it('returns false on QuotaExceededError and does not throw', () => {
            mockQuotaError();
            const result = setStorageItem('key', 'value');
            expect(result).toBe(false);
        });

        it('calls captureError on failure', () => {
            mockQuotaError();
            setStorageItem('key', 'value');
            expect(captureError).toHaveBeenCalledOnce();
        });
    });
});
