/**
 * Phase B structural tests:
 * 1. No orphaned usePanToNode mocks in IdeaCard test files
 * 2. No hardcoded emoji icons in NodeUtilsBar
 */
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { describe, it, expect } from 'vitest';

const SRC = join(__dirname, '..');
const IDEA_TESTS = join(SRC, 'features/canvas/components/nodes/__tests__');
const NODE_UTILS = readFileSync(join(SRC, 'features/canvas/components/nodes/NodeUtilsBar.tsx'), 'utf-8');

describe('orphaned usePanToNode mocks', () => {
    const testFiles = readdirSync(IDEA_TESTS)
        .filter((f) => f.startsWith('IdeaCard.') && f.endsWith('.test.tsx'));

    it('finds at least one IdeaCard test file', () => {
        expect(testFiles.length).toBeGreaterThan(0);
    });

    for (const file of testFiles) {
        it(`${file} does not mock usePanToNode`, () => {
            const src = readFileSync(join(IDEA_TESTS, file), 'utf-8');
            expect(src).not.toContain("vi.mock('@/features/canvas/hooks/usePanToNode'");
        });
    }
});

describe('NodeUtilsBar hardcoded emoji', () => {
    it('does not contain hardcoded emoji string literals for icons', () => {
        const emojiIconPattern = /icon="[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}]/u;
        expect(NODE_UTILS).not.toMatch(emojiIconPattern);
    });
});
