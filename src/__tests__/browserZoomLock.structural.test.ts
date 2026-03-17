/**
 * Structural test — Browser zoom lock on pinch.
 *
 * Validates that CanvasView uses the useBrowserZoomLock hook and
 * the canvas container CSS includes touch-action: none to prevent
 * the browser's native pinch-to-zoom from scaling the entire UI.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const SRC_ROOT = resolve(__dirname, '..');

describe('Browser zoom lock — pinch zoom isolation', () => {
    it('CanvasView imports useBrowserZoomLock', () => {
        const content = readFileSync(
            resolve(SRC_ROOT, 'features/canvas/components/CanvasView.tsx'),
            'utf-8',
        );
        expect(content).toContain("import { useBrowserZoomLock } from '../hooks/useBrowserZoomLock'");
    });

    it('CanvasView calls useBrowserZoomLock()', () => {
        const content = readFileSync(
            resolve(SRC_ROOT, 'features/canvas/components/CanvasView.tsx'),
            'utf-8',
        );
        expect(content).toMatch(/useBrowserZoomLock\(\)/);
    });

    it('useBrowserZoomLock hook prevents Ctrl+wheel (trackpad pinch zoom)', () => {
        const content = readFileSync(
            resolve(SRC_ROOT, 'features/canvas/hooks/useBrowserZoomLock.ts'),
            'utf-8',
        );
        expect(content).toContain('ctrlKey');
        expect(content).toContain('preventDefault');
    });

    it('useBrowserZoomLock hook handles Safari gesture events', () => {
        const content = readFileSync(
            resolve(SRC_ROOT, 'features/canvas/hooks/useBrowserZoomLock.ts'),
            'utf-8',
        );
        expect(content).toContain('gesturestart');
        expect(content).toContain('gesturechange');
    });

    it('useBrowserZoomLock registers listeners as non-passive', () => {
        const content = readFileSync(
            resolve(SRC_ROOT, 'features/canvas/hooks/useBrowserZoomLock.ts'),
            'utf-8',
        );
        expect(content).toContain('passive: false');
    });

    it('useBrowserZoomLock registers wheel listener in capture phase (stopPropagation regression guard)', () => {
        // capture: true ensures the document listener fires BEFORE any child
        // element's stopPropagation() can block the event.  Without this,
        // IdeaCard's content-scroll handler silently swallows ctrlKey wheel
        // events and the browser native zoom wins.
        const content = readFileSync(
            resolve(SRC_ROOT, 'features/canvas/hooks/useBrowserZoomLock.ts'),
            'utf-8',
        );
        expect(content).toContain('capture: true');
    });

    it('canvas container CSS has touch-action: none', () => {
        const content = readFileSync(
            resolve(SRC_ROOT, 'features/canvas/components/CanvasView.module.css'),
            'utf-8',
        );
        expect(content).toContain('touch-action: none');
    });
});
