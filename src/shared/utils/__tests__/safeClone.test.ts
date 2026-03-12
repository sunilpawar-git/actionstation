/**
 * safeClone — Unit tests
 */
import { describe, it, expect, vi } from 'vitest';
import { safeClone } from '../safeClone';

describe('safeClone', () => {
    it('deep-clones a plain object', () => {
        const original = { a: 1, nested: { b: [2, 3] } };
        const clone = safeClone(original);
        expect(clone).toEqual(original);
        expect(clone).not.toBe(original);
        expect(clone.nested).not.toBe(original.nested);
    });

    it('deep-clones an array', () => {
        const original = [{ id: '1' }, { id: '2' }];
        const clone = safeClone(original);
        expect(clone).toEqual(original);
        expect(clone[0]).not.toBe(original[0]);
    });

    it('falls back to JSON round-trip when structuredClone throws', () => {
        const spy = vi.spyOn(globalThis, 'structuredClone').mockImplementation(() => {
            throw new DOMException('could not be cloned', 'DataCloneError');
        });
        const original = { x: 42, y: 'hello' };
        const clone = safeClone(original);
        expect(clone).toEqual(original);
        expect(clone).not.toBe(original);
        spy.mockRestore();
    });

    it('handles null and primitives', () => {
        expect(safeClone(null)).toBeNull();
        expect(safeClone(42)).toBe(42);
        expect(safeClone('text')).toBe('text');
    });
});
