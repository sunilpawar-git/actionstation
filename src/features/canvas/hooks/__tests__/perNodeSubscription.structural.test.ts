/**
 * Structural test: Per-node hooks must NOT subscribe to full nodes array.
 * They must use useNodeData / useNodeDimensions instead.
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, it, expect } from 'vitest';

const HOOKS_DIR = join(process.cwd(), 'src', 'features', 'canvas', 'hooks');

const PER_NODE_FILES = ['useIdeaCard.ts', 'useNodeInput.ts', 'useNodeResize.ts'];

const FULL_NODES_SELECTOR = /useCanvasStore\(\s*\(\s*\w+\s*\)\s*=>\s*\w+\.nodes\s*\)/;

describe('per-node subscription enforcement', () => {
    it.each(PER_NODE_FILES)(
        '%s must NOT contain useCanvasStore((s) => s.nodes)',
        (file) => {
            const content = readFileSync(join(HOOKS_DIR, file), 'utf-8');
            expect(
                FULL_NODES_SELECTOR.test(content),
                `${file} subscribes to s.nodes — use useNodeData/useNodeDimensions instead`,
            ).toBe(false);
        },
    );

    it.each([
        { file: 'useIdeaCard.ts', hook: 'useNodeData' },
        { file: 'useNodeInput.ts', hook: 'useNodeData' },
        { file: 'useNodeResize.ts', hook: 'useNodeDimensions' },
    ])(
        '$file must import $hook',
        ({ file, hook }) => {
            const content = readFileSync(join(HOOKS_DIR, file), 'utf-8');
            expect(
                content.includes(hook),
                `${file} should import ${hook}`,
            ).toBe(true);
        },
    );
});
