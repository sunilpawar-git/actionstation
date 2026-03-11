/**
 * Structural test — CanvasView must disable ReactFlow zoom-on-double-click.
 *
 * Double-click on empty canvas creates a new node (Phase: double-click-to-create).
 * ReactFlow's default zoomOnDoubleClick must be explicitly disabled so the
 * double-click event reaches our handler instead of being consumed by zoom.
 *
 * Users can still zoom via pinch, scroll, or the toolbar ZoomControls.
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, it, expect } from 'vitest';

const SRC = join(__dirname, '..');

describe('CanvasView double-click-to-create structural', () => {
    const canvasViewSrc = readFileSync(
        join(SRC, 'features/canvas/components/CanvasView.tsx'), 'utf-8',
    );

    it('sets zoomOnDoubleClick={false} on ReactFlow', () => {
        expect(canvasViewSrc).toContain('zoomOnDoubleClick={false}');
    });

    it('does NOT enable zoomOnDoubleClick anywhere', () => {
        // Ensure no conflicting zoomOnDoubleClick={true} exists
        expect(canvasViewSrc).not.toContain('zoomOnDoubleClick={true}');
        expect(canvasViewSrc).not.toMatch(/zoomOnDoubleClick=\{(?!false)/);
    });
});
