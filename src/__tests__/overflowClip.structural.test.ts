/**
 * Structural test: overflow-clip enforcement on fixed-size containers
 *
 * CSS `overflow: hidden` clips visual overflow but STILL allows the browser to
 * programmatically scroll the element when focus moves to a child (e.g. sr-only
 * radio inputs, hidden inputs, off-screen anchors).  This silently shifts the
 * content upward, creating a blank gap at the bottom of the container.
 *
 * CSS `overflow: clip` prevents BOTH visual overflow AND programmatic scroll.
 * It is the correct choice for any fixed-size container that should never scroll
 * (modals, panels, dialogs, popovers).
 *
 * See CLAUDE.md → "🔴 CRITICAL: overflow-hidden vs overflow-clip" for details.
 */
import { readFileSync, readdirSync, statSync } from 'fs';
import { join, relative } from 'path';
import { describe, it, expect } from 'vitest';

const SRC_DIR = join(__dirname, '..');

/* ─── helpers ─── */

function walk(dir: string, out: string[] = []): string[] {
    for (const entry of readdirSync(dir)) {
        const full = join(dir, entry);
        if (entry === 'node_modules' || entry === '__tests__' || entry === 'dist') continue;
        if (statSync(full).isDirectory()) walk(full, out);
        else if (/\.(ts|tsx)$/.test(entry)) out.push(full);
    }
    return out;
}

function rel(abs: string): string {
    return relative(SRC_DIR, abs);
}

/**
 * Fixed-size containers are identified by having BOTH a height constraint
 * (`h-[...]`, `max-h-[...]`, or `h-screen` / `h-full` in a fixed context)
 * AND `overflow-hidden` in the same className string.
 *
 * This regex matches Tailwind className strings that contain both
 * `overflow-hidden` and a height constraint on the same line.
 */
const OVERFLOW_HIDDEN_WITH_HEIGHT = /['"`][^'"`]*\b(h-\[|max-h-\[|h-screen)[^'"`]*\boverflow-hidden\b[^'"`]*['"`]|['"`][^'"`]*\boverflow-hidden\b[^'"`]*\b(h-\[|max-h-\[|h-screen)[^'"`]*['"`]/;

/**
 * Known modal/panel/dialog style files and the specific className constants
 * that MUST use overflow-clip (not overflow-hidden).
 *
 * Extend this list when adding new modal or panel components.
 */
const MODAL_CONTAINER_RULES: Array<{ file: string; constant: string }> = [
    { file: 'app/components/SettingsPanel/settingsPanelStyles.ts', constant: 'SP_PANEL' },
];

const allFiles = walk(SRC_DIR);

/* ─── tests ─── */

describe('overflow-clip enforcement (focus-scroll prevention)', () => {
    it('should scan a meaningful number of source files', () => {
        expect(allFiles.length).toBeGreaterThan(50);
    });

    it('no fixed-height container uses overflow-hidden (use overflow-clip instead)', () => {
        const violations: string[] = [];
        for (const file of allFiles) {
            const relPath = rel(file);
            const content = readFileSync(file, 'utf-8');
            if (OVERFLOW_HIDDEN_WITH_HEIGHT.test(content)) {
                // Find the specific line for the error message
                const lines = content.split('\n');
                for (let i = 0; i < lines.length; i++) {
                    const line = lines[i]!;
                    if (OVERFLOW_HIDDEN_WITH_HEIGHT.test(line)) {
                        violations.push(`${relPath}:${String(i + 1)}`);
                    }
                }
            }
        }
        expect(violations).toEqual([]);
    });

    describe.each(MODAL_CONTAINER_RULES)(
        '$constant in $file must use overflow-clip',
        ({ file, constant }) => {
            it(`${constant} uses overflow-clip, not overflow-hidden`, () => {
                const content = readFileSync(join(SRC_DIR, file), 'utf-8');
                // Find the constant definition
                const constRegex = new RegExp(
                    `export\\s+const\\s+${constant}\\s*=\\s*[\\s\\S]*?;`,
                );
                const match = constRegex.exec(content);
                expect(match).not.toBeNull();

                const definition = match![0];
                expect(definition).toContain('overflow-clip');
                expect(definition).not.toContain('overflow-hidden');
            });
        },
    );
});
