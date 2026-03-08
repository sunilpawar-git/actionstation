/**
 * Structural test: useIdeaCardActions must use getState() for Zustand actions
 * to prevent unstable function references that cause re-render loops.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const src = readFileSync(
    resolve(__dirname, '../useIdeaCardActions.ts'),
    'utf-8'
);

describe('useIdeaCardActions — stable action references', () => {
    it('must NOT use useCanvasStore() without a selector', () => {
        const fullStorePattern = /useCanvasStore\(\s*\)/;
        expect(src).not.toMatch(fullStorePattern);
    });

    it('must NOT select action functions via selector (causes unstable refs)', () => {
        expect(src).not.toMatch(/useCanvasStore\(\s*\(s\)\s*=>\s*s\.deleteNode\s*\)/);
        expect(src).not.toMatch(/useCanvasStore\(\s*\(s\)\s*=>\s*s\.updateNodeHeading\s*\)/);
        expect(src).not.toMatch(/useCanvasStore\(\s*\(s\)\s*=>\s*s\.updateNodeTags\s*\)/);
    });

    it('must use getState() for store actions inside callbacks (or call undoable helpers)', () => {
        // deletion now happens via deleteNodeWithUndo so either pattern is fine
        expect(
            src.includes('useCanvasStore.getState().deleteNode') ||
            src.includes('deleteNodeWithUndo')
        ).toBe(true);
        expect(src).toMatch(/useCanvasStore\.getState\(\)\.updateNodeHeading/);
        expect(src).toMatch(/useCanvasStore\.getState\(\)\.updateNodeTags/);
    });
});
