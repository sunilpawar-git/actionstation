/**
 * Quick Capture Collision & ID Tests
 * Structural tests to verify:
 *   1. useQuickCapture uses crypto.randomUUID() (not Date.now())
 *   2. useQuickCapture runs collision avoidance via findNearestOpenSlot
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const quickCaptureSrc = readFileSync(
    resolve(__dirname, '../hooks/useQuickCapture.ts'), 'utf-8',
);

describe('useQuickCapture — structural compliance', () => {
    it('uses crypto.randomUUID() for node IDs (not Date.now())', () => {
        expect(quickCaptureSrc).toContain('crypto.randomUUID()');
        expect(quickCaptureSrc).not.toMatch(/idea-\$\{Date\.now\(\)\}/);
    });

    it('imports findNearestOpenSlot for collision avoidance', () => {
        expect(quickCaptureSrc).toContain('findNearestOpenSlot');
    });

    it('reads nodes from canvas store for collision check', () => {
        expect(quickCaptureSrc).toMatch(/useCanvasStore|getState.*nodes/);
    });
});
