/**
 * dateUtils — Unit tests for toEpochMs
 */
import { describe, it, expect } from 'vitest';
import { toEpochMs } from '../dateUtils';

describe('toEpochMs', () => {
    it('converts a Date to epoch ms', () => {
        const d = new Date('2025-06-15T00:00:00Z');
        expect(toEpochMs(d)).toBe(d.getTime());
    });

    it('passes through a numeric epoch', () => {
        expect(toEpochMs(1718409600000)).toBe(1718409600000);
    });

    it('parses an ISO string', () => {
        const iso = '2025-06-15T00:00:00Z';
        expect(toEpochMs(iso)).toBe(new Date(iso).getTime());
    });

    it('handles a Firestore Timestamp-like object with toDate()', () => {
        const fakeTimestamp = { toDate: () => new Date('2025-01-01T00:00:00Z') };
        expect(toEpochMs(fakeTimestamp)).toBe(new Date('2025-01-01T00:00:00Z').getTime());
    });

    it('returns NaN for null', () => {
        expect(toEpochMs(null)).toBeNaN();
    });

    it('returns NaN for undefined', () => {
        expect(toEpochMs(undefined)).toBeNaN();
    });

    it('returns NaN for an unrecognised object', () => {
        expect(toEpochMs({ foo: 'bar' })).toBeNaN();
    });

    it('returns NaN for an invalid date string', () => {
        expect(toEpochMs('not-a-date')).toBeNaN();
    });
});
