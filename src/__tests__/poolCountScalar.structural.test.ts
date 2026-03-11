/**
 * Pool count selector enforcement — prevents O(N) reduce in Zustand selectors.
 *
 * Problem: `useCanvasStore((s) => s.nodes.reduce(...))` runs on every store
 * notification (drag, selection, viewport). With 500 nodes this is O(500)
 * per frame during drag. Fix: track `poolCount` as a scalar in the store.
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, it, expect } from 'vitest';
import { getSourceFiles, rel, isTestFile, SRC_DIR } from './zustandSelectorPatterns';

const POOL_BUTTON = readFileSync(
    join(SRC_DIR, 'features/workspace/components/WorkspacePoolButton.tsx'), 'utf-8',
);
const AI_MEMORY = readFileSync(
    join(SRC_DIR, 'app/components/SettingsPanel/sections/AIMemorySection.tsx'), 'utf-8',
);

describe('pool count — O(N) selector prevention', () => {
    it('WorkspacePoolButton does NOT use nodes.reduce', () => {
        expect(POOL_BUTTON).not.toContain('nodes.reduce');
    });

    it('AIMemorySection does NOT use nodes.reduce', () => {
        expect(AI_MEMORY).not.toContain('nodes.reduce');
    });

    it('WorkspacePoolButton selects poolCount as a scalar', () => {
        expect(POOL_BUTTON).toMatch(/useCanvasStore\(\s*\(\s*s\s*\)\s*=>\s*s\.poolCount\s*\)/);
    });

    it('AIMemorySection selects poolCount as a scalar', () => {
        expect(AI_MEMORY).toMatch(/useCanvasStore\(\s*\(\s*s\s*\)\s*=>\s*s\.poolCount\s*\)/);
    });

    it('no production file uses nodes.reduce inside a useCanvasStore context', () => {
        const files = getSourceFiles(SRC_DIR);
        const violations: string[] = [];
        for (const file of files) {
            const relPath = rel(file);
            if (isTestFile(relPath)) continue;
            const content = readFileSync(file, 'utf-8');
            if (content.includes('useCanvasStore') && content.includes('nodes.reduce')) {
                violations.push(relPath);
            }
        }
        expect(violations).toEqual([]);
    });
});
