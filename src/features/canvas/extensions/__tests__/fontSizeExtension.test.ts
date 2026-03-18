/**
 * fontSizeExtension — pure-function unit tests
 *
 * Tests the exported step-navigation helpers independently of TipTap so
 * that the core logic is verifiable without a live editor instance.
 */
import { describe, it, expect } from 'vitest';
import {
    FONT_SIZE_STEPS,
    DEFAULT_FONT_SIZE,
    getNextFontSizeStep,
    getPrevFontSizeStep,
    FontSizeExtension,
} from '../fontSizeExtension';

// ─── FONT_SIZE_STEPS contract ─────────────────────────────────────────────────

describe('FONT_SIZE_STEPS', () => {
    it('contains DEFAULT_FONT_SIZE', () => {
        expect(FONT_SIZE_STEPS).toContain(DEFAULT_FONT_SIZE);
    });

    it('has at least 5 levels for useful granularity', () => {
        expect(FONT_SIZE_STEPS.length).toBeGreaterThanOrEqual(5);
    });

    it('is sorted in ascending rem order', () => {
        const asNumbers = FONT_SIZE_STEPS.map((s) => parseFloat(s));
        for (let i = 1; i < asNumbers.length; i++) {
            expect(asNumbers[i]).toBeGreaterThan(asNumbers[i - 1] as number);
        }
    });
});

// ─── getNextFontSizeStep ──────────────────────────────────────────────────────

describe('getNextFontSizeStep', () => {
    it('treats null as DEFAULT_FONT_SIZE and returns the next step', () => {
        const result = getNextFontSizeStep(null);
        expect(result).not.toBeNull();
        const defIdx = FONT_SIZE_STEPS.indexOf(DEFAULT_FONT_SIZE);
        expect(result).toBe(FONT_SIZE_STEPS[defIdx + 1] as string);
    });

    it('returns the next larger step from a given step', () => {
        const third = FONT_SIZE_STEPS[2];
        const result = getNextFontSizeStep(third);
        expect(result).toBe(FONT_SIZE_STEPS[3]);
    });

    it('returns null (no-op) when already at the maximum step', () => {
        const max = FONT_SIZE_STEPS[FONT_SIZE_STEPS.length - 1] as string;
        expect(getNextFontSizeStep(max)).toBeNull();
    });

    it('returns DEFAULT_FONT_SIZE when the step below default moves up to default', () => {
        const defIdx = FONT_SIZE_STEPS.indexOf(DEFAULT_FONT_SIZE);
        if (defIdx > 0) {
            const belowDefault = FONT_SIZE_STEPS[defIdx - 1] as string;
            expect(getNextFontSizeStep(belowDefault)).toBe(DEFAULT_FONT_SIZE);
        }
    });

    it('returns the first step above the minimum when called on minimum', () => {
        const min = FONT_SIZE_STEPS[0];
        expect(getNextFontSizeStep(min)).toBe(FONT_SIZE_STEPS[1]);
    });

    it('treats an unknown size string the same as DEFAULT_FONT_SIZE', () => {
        const asDefault = getNextFontSizeStep(null);
        const asUnknown = getNextFontSizeStep('99rem');
        expect(asUnknown).toBe(asDefault);
    });
});

// ─── getPrevFontSizeStep ──────────────────────────────────────────────────────

describe('getPrevFontSizeStep', () => {
    it('treats null as DEFAULT_FONT_SIZE and returns the previous step', () => {
        const result = getPrevFontSizeStep(null);
        expect(result).not.toBeNull();
        const defIdx = FONT_SIZE_STEPS.indexOf(DEFAULT_FONT_SIZE);
        expect(result).toBe(FONT_SIZE_STEPS[defIdx - 1] as string);
    });

    it('returns the next smaller step from a given step', () => {
        const third = FONT_SIZE_STEPS[2];
        const result = getPrevFontSizeStep(third);
        expect(result).toBe(FONT_SIZE_STEPS[1]);
    });

    it('returns null (no-op) when already at the minimum step', () => {
        const min = FONT_SIZE_STEPS[0];
        expect(getPrevFontSizeStep(min)).toBeNull();
    });

    it('returns DEFAULT_FONT_SIZE when the step above default moves down to default', () => {
        const defIdx = FONT_SIZE_STEPS.indexOf(DEFAULT_FONT_SIZE);
        if (defIdx < FONT_SIZE_STEPS.length - 1) {
            const aboveDefault = FONT_SIZE_STEPS[defIdx + 1] as string;
            expect(getPrevFontSizeStep(aboveDefault)).toBe(DEFAULT_FONT_SIZE);
        }
    });

    it('returns the second-to-last step when called on maximum', () => {
        const max = FONT_SIZE_STEPS[FONT_SIZE_STEPS.length - 1] as string;
        expect(getPrevFontSizeStep(max)).toBe(FONT_SIZE_STEPS[FONT_SIZE_STEPS.length - 2] as string);
    });

    it('treats an unknown size string the same as DEFAULT_FONT_SIZE', () => {
        const asDefault = getPrevFontSizeStep(null);
        const asUnknown = getPrevFontSizeStep('99rem');
        expect(asUnknown).toBe(asDefault);
    });
});

// ─── FontSizeExtension shape ──────────────────────────────────────────────────

describe('FontSizeExtension', () => {
    it('has name "fontSize"', () => {
        expect(FontSizeExtension.name).toBe('fontSize');
    });

    it('is a mark type (not a node)', () => {
        expect(FontSizeExtension.type).toBe('mark');
    });
});
