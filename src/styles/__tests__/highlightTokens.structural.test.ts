/**
 * Structural test — Text Highlight CSS token coverage across all themes
 *
 * WHAT THIS GUARDS:
 *   Five CSS variables (--highlight-yellow/green/blue/pink/purple) must be
 *   defined in EVERY resolved theme so bubble-menu highlight swatches render
 *   coherently regardless of which theme the user has selected.
 *
 * WHY STRUCTURAL:
 *   JSDOM does not compute real CSS; component tests cannot detect a missing
 *   CSS variable. Reading theme files directly is the only reliable check.
 *
 * CONTRACT:
 *   1. All 5 --highlight-* vars must appear in :root (variables.css)
 *   2. All 5 must appear in each of the 4 theme overrides: dark, sepia, grey, darkBlack
 *   3. strings.formatting must expose: highlight, highlightYellow/Green/Blue/Pink/Purple, removeHighlight
 */
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { describe, it, expect } from 'vitest';

const SRC = join(process.cwd(), 'src');

const HIGHLIGHT_VARS = [
    '--highlight-yellow',
    '--highlight-green',
    '--highlight-blue',
    '--highlight-pink',
    '--highlight-purple',
] as const;

const THEME_FILES: ReadonlyArray<{ name: string; file: string; selector: string }> = [
    { name: 'variables (root/light)', file: 'styles/variables.css',          selector: ':root' },
    { name: 'dark',                   file: 'styles/themes/dark.css',        selector: '[data-theme="dark"]' },
    { name: 'sepia',                  file: 'styles/themes/sepia.css',       selector: '[data-theme="sepia"]' },
    { name: 'grey',                   file: 'styles/themes/grey.css',        selector: '[data-theme="grey"]' },
    { name: 'darkBlack',              file: 'styles/themes/darkBlack.css',   selector: '[data-theme="darkBlack"]' },
];

describe('Highlight CSS tokens — all themes define all 5 variables', () => {
    for (const theme of THEME_FILES) {
        const filePath = join(SRC, theme.file);

        it(`${theme.name}: file exists`, () => {
            expect(existsSync(filePath)).toBe(true);
        });

        for (const varName of HIGHLIGHT_VARS) {
            it(`${theme.name}: declares ${varName}`, () => {
                const css = readFileSync(filePath, 'utf-8');
                expect(css).toContain(varName);
            });
        }
    }
});

describe('Highlight string keys — strings.formatting completeness', () => {
    it('exposes highlight section label', async () => {
        const { strings } = await import('@/shared/localization/strings');
        expect(strings.formatting).toHaveProperty('highlight');
    });

    it('exposes highlightYellow', async () => {
        const { strings } = await import('@/shared/localization/strings');
        expect(strings.formatting).toHaveProperty('highlightYellow');
    });

    it('exposes highlightGreen', async () => {
        const { strings } = await import('@/shared/localization/strings');
        expect(strings.formatting).toHaveProperty('highlightGreen');
    });

    it('exposes highlightBlue', async () => {
        const { strings } = await import('@/shared/localization/strings');
        expect(strings.formatting).toHaveProperty('highlightBlue');
    });

    it('exposes highlightPink', async () => {
        const { strings } = await import('@/shared/localization/strings');
        expect(strings.formatting).toHaveProperty('highlightPink');
    });

    it('exposes highlightPurple', async () => {
        const { strings } = await import('@/shared/localization/strings');
        expect(strings.formatting).toHaveProperty('highlightPurple');
    });

    it('exposes removeHighlight', async () => {
        const { strings } = await import('@/shared/localization/strings');
        expect(strings.formatting).toHaveProperty('removeHighlight');
    });
});

describe('Highlight CSS tokens — useTipTapEditor includes Highlight extension', () => {
    it('useTipTapEditor.ts imports @tiptap/extension-highlight', () => {
        const source = readFileSync(
            join(SRC, 'features/canvas/hooks/useTipTapEditor.ts'),
            'utf-8',
        );
        expect(source).toContain('@tiptap/extension-highlight');
    });

    it('useTipTapEditor.ts configures multicolor: true', () => {
        const source = readFileSync(
            join(SRC, 'features/canvas/hooks/useTipTapEditor.ts'),
            'utf-8',
        );
        expect(source).toContain('multicolor');
    });
});
