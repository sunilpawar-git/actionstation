/**
 * Structural test: FindSimilar singleton enforcement
 *
 * Prevents O(n²) regression where useFindSimilar() was called inside IdeaCard —
 * a per-node component. With N nodes on the canvas, every `nodes` change
 * triggered N × buildCorpusIDF() rebuilds simultaneously.
 *
 * == ROOT CAUSE ==
 *   IdeaCard called useFindSimilar() directly (line 41).
 *   useFindSimilar subscribes to the full `nodes` array and runs
 *   buildCorpusIDF() in useMemo on every change.
 *   With 100 nodes: 100 × buildCorpusIDF = 10,000 ops per any node change.
 *
 * == CORRECT PATTERN ==
 *   useFindSimilar() must be called ONCE in FindSimilarProvider (singleton).
 *   Component files use useFindSimilarContext() to access the shared instance.
 *
 * == ENFORCEMENT ==
 *   - useFindSimilar() may only be called in FindSimilarContext.tsx
 *   - IdeaCard.tsx and all other canvas node components must use useFindSimilarContext
 */
import { readFileSync, readdirSync } from 'fs';
import { join, relative } from 'path';
import { describe, it, expect } from 'vitest';

const SRC_DIR = join(process.cwd(), 'src');

function getSourceFiles(dir: string, results: string[] = []): string[] {
    const SKIP = ['node_modules', 'dist', '.git'];
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = join(dir, entry.name);
        if (entry.isDirectory()) {
            if (SKIP.includes(entry.name)) continue;
            getSourceFiles(full, results);
        } else if (/\.(ts|tsx)$/.test(entry.name)) {
            results.push(full);
        }
    }
    return results;
}

function rel(filePath: string): string {
    return relative(SRC_DIR, filePath);
}

/** Files that are allowed to reference useFindSimilar directly */
const ALLOWLIST = new Set([
    // The hook itself
    'features/search/hooks/useFindSimilar.ts',
    // The singleton provider — the ONLY place allowed to call the hook
    'features/search/context/FindSimilarContext.tsx',
    // The barrel export
    'features/search/index.ts',
]);

describe('FindSimilar singleton enforcement (prevents O(n²) buildCorpusIDF)', () => {
    const allFiles = getSourceFiles(SRC_DIR);
    const sourceFiles = allFiles.filter((f) => {
        const r = rel(f);
        return !r.includes('__tests__') && !r.endsWith('.test.ts') && !r.endsWith('.test.tsx');
    });

    it('should scan a meaningful number of source files', () => {
        expect(sourceFiles.length).toBeGreaterThan(50);
    });

    it('useFindSimilar() is only called in FindSimilarContext.tsx — not in any component', () => {
        // Matches any direct call: useFindSimilar()
        const directCallPattern = /useFindSimilar\(\)/;
        const violations: string[] = [];

        for (const file of sourceFiles) {
            const r = rel(file);
            if (ALLOWLIST.has(r)) continue;
            const content = readFileSync(file, 'utf-8');
            if (directCallPattern.test(content)) {
                violations.push(r);
            }
        }

        expect(
            violations,
            'These files call useFindSimilar() directly — use useFindSimilarContext() instead.\n' +
            'Calling useFindSimilar() in a per-node component causes O(n²) buildCorpusIDF rebuilds.\n\n' +
            '  Fix: replace useFindSimilar() → useFindSimilarContext()\n' +
            '  Ensure FindSimilarProvider wraps the canvas in App.tsx\n\n' +
            `  Violations:\n${violations.map((v) => `    - ${v}`).join('\n')}`,
        ).toEqual([]);
    });

    it('IdeaCard.tsx uses useFindSimilarContext (the singleton)', () => {
        const ideaCard = readFileSync(
            join(SRC_DIR, 'features/canvas/components/nodes/IdeaCard.tsx'),
            'utf-8',
        );
        expect(
            ideaCard.includes('useFindSimilarContext'),
            'IdeaCard.tsx must use useFindSimilarContext() — not useFindSimilar() — to avoid O(n²) IDF rebuilds',
        ).toBe(true);
    });

    it('IdeaCard.tsx does NOT import useFindSimilar directly', () => {
        const ideaCard = readFileSync(
            join(SRC_DIR, 'features/canvas/components/nodes/IdeaCard.tsx'),
            'utf-8',
        );
        // Must not import the hook directly (only the context hook is allowed)
        const directImport = /import\s+\{[^}]*\buseFindSimilar\b[^}]*\}\s+from\s+['"][^'"]*hooks\/useFindSimilar/.test(ideaCard);
        expect(
            directImport,
            'IdeaCard.tsx imports useFindSimilar from the hook directly — import useFindSimilarContext from the context instead',
        ).toBe(false);
    });

    it('FindSimilarProvider is mounted in App.tsx', () => {
        const app = readFileSync(join(SRC_DIR, 'App.tsx'), 'utf-8');
        expect(
            app.includes('FindSimilarProvider'),
            'App.tsx must mount <FindSimilarProvider> so IdeaCard can access useFindSimilarContext()',
        ).toBe(true);
    });
});
