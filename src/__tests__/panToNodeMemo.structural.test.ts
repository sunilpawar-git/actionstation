/**
 * usePanToNode memo stability — ensures the return value is memoized
 * to prevent cascading re-renders through PanToNodeContext.
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, it, expect } from 'vitest';

const SRC = join(__dirname, '..');
const PAN_HOOK = readFileSync(join(SRC, 'features/canvas/hooks/usePanToNode.ts'), 'utf-8');

describe('usePanToNode memo stability', () => {
    it('returns a useMemo-wrapped object', () => {
        expect(PAN_HOOK).toContain('useMemo');
        expect(PAN_HOOK).toMatch(/return\s+useMemo\(/);
    });

    it('does NOT return a bare object literal', () => {
        expect(PAN_HOOK).not.toMatch(/return\s+\{\s*panToPosition\s*\}/);
    });
});
