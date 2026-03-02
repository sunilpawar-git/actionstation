/**
 * Structural tests for useAutosave hook — verifies source-level invariants
 * that prevent common anti-patterns (position in fingerprint, bare subscriptions).
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, it, expect } from 'vitest';

const SRC = readFileSync(resolve(__dirname, '../hooks/useAutosave.ts'), 'utf-8');

describe('useAutosave — structural integrity', () => {
    describe('position-excluded content fingerprinting', () => {
        it('contentJson fingerprint excludes position but includes data', () => {
            const contentBlock = SRC.slice(
                SRC.indexOf('const contentJson'),
                SRC.indexOf(');', SRC.indexOf('const contentJson')) + 2,
            );
            expect(contentBlock).not.toContain('position');
            expect(contentBlock).toContain('data');
            expect(contentBlock).toContain('id');
        });

        it('positionJson fingerprint exists for position-only saves', () => {
            expect(SRC).toContain('const positionJson');
            expect(SRC).toContain('POSITION_SAVE_DELAY_MS');
        });
    });

    describe('selector isolation (prevents full-tree rerenders)', () => {
        it('uses targeted selectors instead of bare useCanvasStore()', () => {
            expect(SRC).not.toMatch(/useCanvasStore\(\s*\)/);
            expect(SRC).toMatch(/useCanvasStore\(\s*\(\s*s\s*\)/);
        });
    });
});
