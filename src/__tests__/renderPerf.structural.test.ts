/**
 * Render performance structural tests — prevents inline allocations
 * and ensures ReactFlow optimization props are present.
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, it, expect } from 'vitest';

const SRC = join(__dirname, '..');
const CANVAS_VIEW = readFileSync(join(SRC, 'features/canvas/components/CanvasView.tsx'), 'utf-8');
const CONTENT_SECTION = readFileSync(
    join(SRC, 'features/canvas/components/nodes/IdeaCardContentSection.tsx'), 'utf-8',
);
const UTILS_BAR = readFileSync(
    join(SRC, 'features/canvas/components/nodes/NodeUtilsBar.tsx'), 'utf-8',
);

describe('render performance — inline allocation prevention', () => {
    it('CanvasView passes onlyRenderVisibleElements to ReactFlow', () => {
        expect(CANVAS_VIEW).toContain('onlyRenderVisibleElements');
    });

    it('IdeaCardContentSection uses a constant for hidden style', () => {
        expect(CONTENT_SECTION).not.toMatch(/style=\{.*\{ display: 'none' \}/);
        expect(CONTENT_SECTION).toMatch(/HIDDEN_STYLE|EDITOR_HIDDEN_STYLE/);
    });

    it('NodeUtilsBar does NOT have inline arrow for onCopyClick', () => {
        expect(UTILS_BAR).not.toMatch(/onClick=\{\(\)\s*=>\s*props\.onCopyClick/);
    });
});
