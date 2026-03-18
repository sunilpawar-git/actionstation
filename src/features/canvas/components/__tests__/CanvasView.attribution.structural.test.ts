/**
 * CanvasView Attribution Structural Test
 *
 * Guards against regression where the default React Flow "React Flow"
 * attribution watermark reappears in the bottom-right corner of the canvas.
 *
 * Requirements:
 *   1. The built-in React Flow attribution must be suppressed via
 *      `proOptions={{ hideAttribution: true }}` on the <ReactFlow> element.
 *   2. A custom "Action Station" branded attribution must be rendered
 *      using a <Panel position="bottom-right"> child of <ReactFlow>.
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, it, expect } from 'vitest';

const src = readFileSync(resolve(__dirname, '../CanvasView.tsx'), 'utf-8');

describe('CanvasView — attribution branding', () => {
    it('hides the default React Flow attribution via proOptions', () => {
        expect(src).toMatch(/proOptions\s*=\s*\{\{[^}]*hideAttribution\s*:\s*true[^}]*\}\}/);
    });

    it('imports Panel from @xyflow/react', () => {
        expect(src).toMatch(/\bPanel\b.*from\s+['"]@xyflow\/react['"]/);
    });

    it('renders a bottom-right Panel for custom branding', () => {
        expect(src).toMatch(/position\s*=\s*["']bottom-right["']/);
    });

    it('displays "Action Station" as the attribution text', () => {
        expect(src).toContain('Action Station');
    });

    it('does NOT reference the string "React Flow" as visible UI text', () => {
        // Strip JSX comments and string literals used for logic — only check
        // that "React Flow" does not appear as a rendered text label.
        // (The import/type references from @xyflow are fine; we exclude those.)
        const withoutComments = src.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
        const jsxTextMatches = withoutComments.match(/>React Flow</g);
        expect(jsxTextMatches).toBeNull();
    });
});
