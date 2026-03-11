/**
 * PanToNodeContext structural tests — ensures per-node hooks do NOT call
 * usePanToNode (which contains useReactFlow) directly. Instead, they must
 * receive panToPosition via PanToNodeContext.
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, it, expect } from 'vitest';

const SRC = join(__dirname, '..');

const NODE_GEN = readFileSync(join(SRC, 'features/ai/hooks/useNodeGeneration.ts'), 'utf-8');
const DUPLICATE = readFileSync(join(SRC, 'features/canvas/hooks/useIdeaCardDuplicateAction.ts'), 'utf-8');

describe('PanToNodeContext — no useReactFlow in per-node hooks', () => {
    it('useNodeGeneration does NOT import usePanToNode hook', () => {
        expect(NODE_GEN).not.toMatch(/from\s+['"][^'"]*usePanToNode['"]/);
    });

    it('useNodeGeneration does NOT import useReactFlow', () => {
        expect(NODE_GEN).not.toContain('useReactFlow');
    });

    it('useIdeaCardDuplicateAction does NOT import usePanToNode hook', () => {
        expect(DUPLICATE).not.toMatch(/from\s+['"][^'"]*usePanToNode['"]/);
    });

    it('useIdeaCardDuplicateAction does NOT import useReactFlow', () => {
        expect(DUPLICATE).not.toContain('useReactFlow');
    });

    it('useNodeGeneration gets panToPosition from PanToNodeContext', () => {
        expect(NODE_GEN).toContain('usePanToNodeContext');
    });

    it('useIdeaCardDuplicateAction gets panToPosition from PanToNodeContext', () => {
        expect(DUPLICATE).toContain('usePanToNodeContext');
    });
});
