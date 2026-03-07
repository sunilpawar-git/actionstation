/**
 * Structural test: TipTap editor CSS completeness
 *
 * Ensures all editor elements rendered by the markdown pipeline
 * have explicit CSS rules. Missing rules cause visual regressions
 * (e.g., strikethrough renders as normal text, h4-h6 look like body text).
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, it, expect } from 'vitest';

const CSS = readFileSync(
    join(process.cwd(), 'src/features/canvas/components/nodes/TipTapEditor.module.css'),
    'utf-8',
);

const EDITOR_SRC = readFileSync(
    join(process.cwd(), 'src/features/canvas/hooks/useTipTapEditor.ts'),
    'utf-8',
);

describe('TipTapEditor CSS completeness', () => {
    it('has strikethrough styling for <s> / <del> elements', () => {
        expect(CSS).toMatch(/\.ProseMirror\s+s\b/);
        expect(CSS).toContain('line-through');
    });

    it('has link styling for <a> elements', () => {
        expect(CSS).toMatch(/\.ProseMirror\s+a\b/);
    });

    it.each(['h1', 'h2', 'h3', 'h4', 'h5', 'h6'])(
        'has explicit CSS rules for %s',
        (tag) => { expect(CSS).toMatch(new RegExp(`\\.ProseMirror\\s+${tag}\\b`)); },
    );
});

describe('TipTap Link extension', () => {
    it('imports and registers Link extension in useTipTapEditor', () => {
        expect(EDITOR_SRC).toContain('Link');
    });

    it('configures rel="noopener noreferrer" for security', () => {
        expect(EDITOR_SRC).toContain('noopener');
    });

    it('configures protocol whitelist (no javascript: allowed)', () => {
        expect(EDITOR_SRC).toMatch(/protocols.*https/s);
    });
});

describe('Paste sanitization', () => {
    it('wires transformPastedHTML in useTipTapEditor', () => {
        expect(EDITOR_SRC).toContain('transformPastedHTML');
    });

    it('imports sanitizePastedHtml', () => {
        expect(EDITOR_SRC).toContain('sanitizePastedHtml');
    });
});
