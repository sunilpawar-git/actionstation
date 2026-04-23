/**
 * NodeImage Theme Tests — Ensures design tokens exist for image styling
 */
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const stylesDir = path.resolve(__dirname, '../../../../../styles/themes');

describe('variables.css defines image tokens', () => {
    const css = fs.readFileSync(path.resolve(stylesDir, '../variables.css'), 'utf-8');

    it('defines --node-image-radius', () => {
        expect(css).toContain('--node-image-radius');
    });

    it('defines --node-image-max-height', () => {
        expect(css).toContain('--node-image-max-height');
    });

    it('defines --node-image-focus-max-height for focus mode panel', () => {
        expect(css).toContain('--node-image-focus-max-height');
    });

    it('defines --node-image-applied-max-height for context-aware sizing', () => {
        expect(css).toContain('--node-image-applied-max-height');
    });

    it('overrides --node-image-max-height in compact mode', () => {
        const compactSection = css.slice(css.indexOf('.compact-mode'));
        expect(compactSection).toContain('--node-image-max-height');
    });
});

describe('NodeImage.module.css uses context-aware max-height token', () => {
    const nodeCss = fs.readFileSync(
        path.resolve(__dirname, '../NodeImage.module.css'),
        'utf-8',
    );

    it('uses --node-image-applied-max-height (not raw --node-image-max-height)', () => {
        expect(nodeCss).toContain('--node-image-applied-max-height');
    });
});

describe('TipTapEditor.module.css overrides committed inline height in view mode', () => {
    const tiptapCss = fs.readFileSync(
        path.resolve(__dirname, '../TipTapEditor.module.css'),
        'utf-8',
    );

    it('overrides inline height in view mode via contenteditable=false selector', () => {
        expect(tiptapCss).toContain('[contenteditable="false"]');
        expect(tiptapCss).toContain('height: auto !important');
    });
});

describe('FocusOverlay.css applies focus-specific image sizing via CSS custom property', () => {
    const focusCss = fs.readFileSync(
        path.resolve(__dirname, '../../FocusOverlay.css'),
        'utf-8',
    );

    it('sets --node-image-applied-max-height on contentArea to use focus token', () => {
        expect(focusCss).toContain('--node-image-applied-max-height');
        expect(focusCss).toContain('--node-image-focus-max-height');
    });
});
