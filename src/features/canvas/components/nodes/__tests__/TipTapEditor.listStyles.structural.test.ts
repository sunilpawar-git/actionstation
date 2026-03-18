/**
 * Structural test — TipTapEditor list-style regression guard
 *
 * REGRESSION HISTORY:
 *   Tailwind CSS migration (commit 9d87aaa) added `@import "tailwindcss"` to
 *   global.css. Tailwind's preflight resets `ol, ul { list-style: none }`.
 *   TipTapEditor.module.css restored padding/margin but forgot to restore
 *   `list-style-type`, so bullets and numbers disappeared from every node card.
 *
 * WHY A STRUCTURAL TEST:
 *   JSDOM does not compute real CSS — component render tests cannot catch a
 *   missing `list-style-type` declaration in a CSS module.  Reading the CSS
 *   source file directly is the only reliable approach available in Vitest.
 *
 * CONTRACT:
 *   TipTapEditor.module.css MUST declare:
 *     list-style-type: disc    on the rule covering .ProseMirror ul
 *     list-style-type: decimal on the rule covering .ProseMirror ol
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, it, expect } from 'vitest';

const CSS_PATH = join(
    process.cwd(),
    'src/features/canvas/components/nodes/TipTapEditor.module.css',
);

const css = readFileSync(CSS_PATH, 'utf-8');

describe('TipTapEditor.module.css — list-style-type contract (Tailwind preflight regression guard)', () => {
    it('declares list-style-type: disc on ProseMirror ul so Tailwind preflight reset is overridden', () => {
        // Tailwind preflight sets `ul { list-style: none }`.
        // Without this declaration bullet points vanish from node cards.
        expect(css).toContain('list-style-type: disc');
    });

    it('declares list-style-type: decimal on ProseMirror ol so Tailwind preflight reset is overridden', () => {
        // Tailwind preflight sets `ol { list-style: none }`.
        // Without this declaration numbered lists vanish from node cards.
        expect(css).toContain('list-style-type: decimal');
    });

    it('list-style-type rules appear inside the ProseMirror ul/ol block (not in an unrelated selector)', () => {
        // Ensure the declarations are co-located with the ul/ol padding rule,
        // not accidentally present via some other unrelated selector.
        const ulBlock = css.match(/\.ProseMirror ul[^{]*\{[^}]+\}/gs) ?? [];
        const olBlock = css.match(/\.ProseMirror ol[^{]*\{[^}]+\}/gs) ?? [];

        const ulHasDisc = ulBlock.some(block => block.includes('list-style-type: disc'));
        const olHasDecimal = olBlock.some(block => block.includes('list-style-type: decimal'));

        expect(ulHasDisc).toBe(true);
        expect(olHasDecimal).toBe(true);
    });
});
