/**
 * Structural test: TipTap extension uniqueness
 *
 * StarterKit v3 bundles the Link extension. Adding a separate Link.configure()
 * causes "Duplicate extension names found: ['link']" warnings — one per editor
 * instance, compounding to 800+ warnings per session with many nodes.
 *
 * This test prevents regression by scanning the source for the banned import.
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, it, expect } from 'vitest';

const SRC_DIR = join(process.cwd(), 'src');

describe('TipTap duplicate extension prevention', () => {
    it('useTipTapEditor must NOT import Link separately (StarterKit includes it)', () => {
        const filePath = join(SRC_DIR, 'features/canvas/hooks/useTipTapEditor.ts');
        const content = readFileSync(filePath, 'utf-8');

        const hasSeparateLinkImport = /import\s+Link\s+from\s+['"]@tiptap\/extension-link['"]/.test(content);

        expect(
            hasSeparateLinkImport,
            'useTipTapEditor.ts imports Link from @tiptap/extension-link separately. ' +
            'This causes duplicate extension warnings. Configure Link via StarterKit.configure({ link: {...} }) instead.',
        ).toBe(false);
    });

    it('useTipTapEditor must configure Link through StarterKit', () => {
        const filePath = join(SRC_DIR, 'features/canvas/hooks/useTipTapEditor.ts');
        const content = readFileSync(filePath, 'utf-8');

        const hasStarterKitConfigure = content.includes('StarterKit.configure(');

        expect(
            hasStarterKitConfigure,
            'useTipTapEditor.ts must use StarterKit.configure() to pass Link options.',
        ).toBe(true);
    });
});
