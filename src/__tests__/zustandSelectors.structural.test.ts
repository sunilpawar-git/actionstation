/**
 * Structural test: Zustand store selector enforcement
 *
 * Prevents "Maximum update depth exceeded" errors by ensuring
 * all Zustand store hooks use selectors instead of subscribing
 * to the entire store.
 *
 * == ANTI-PATTERN 1: Bare destructuring ==
 *   const { user } = useAuthStore();  // Subscribes to ENTIRE store
 *
 * == ANTI-PATTERN 2: Closure variables in selectors ==
 *   const focusedNodeId = useFocusStore((s) => s.focusedNodeId);
 *   const node = useCanvasStore((s) => getNodeMap(s.nodes).get(focusedNodeId));
 *   // ↑ focusedNodeId is a CLOSURE VARIABLE - selector recreated each render!
 *
 * == CORRECT PATTERNS ==
 *   // Selector (only re-renders when value changes):
 *   const user = useAuthStore((s) => s.user);
 *
 *   // Stable selector + useMemo derivation (avoids closure anti-pattern):
 *   const nodes = useCanvasStore((s) => s.nodes);
 *   const node = useMemo(() => getNodeMap(nodes).get(id), [nodes, id]);
 *
 *   // Actions via .getState() (stable reference, no subscription):
 *   useWorkspaceStore.getState().removeWorkspace(id);
 */
import { readFileSync, readdirSync } from 'fs';
import { join, relative } from 'path';
import { describe, it, expect } from 'vitest';

const SRC_DIR = join(process.cwd(), 'src');

/** Patterns that indicate bare store subscriptions (anti-pattern) */
const BARE_DESTRUCTURING_PATTERNS: Array<{ name: string; pattern: RegExp }> = [
    {
        name: 'Destructuring from useAuthStore()',
        pattern: /const\s*\{[^}]+\}\s*=\s*useAuthStore\(\)/,
    },
    {
        name: 'Destructuring from useWorkspaceStore()',
        pattern: /const\s*\{[^}]+\}\s*=\s*useWorkspaceStore\(\)/,
    },
    {
        name: 'Destructuring from useCanvasStore()',
        pattern: /const\s*\{[^}]+\}\s*=\s*useCanvasStore\(\)/,
    },
    {
        name: 'Destructuring from useToastStore()',
        pattern: /const\s*\{[^}]+\}\s*=\s*useToastStore\(\)/,
    },
    {
        name: 'Destructuring from useConfirmStore()',
        pattern: /const\s*\{[^}]+\}\s*=\s*useConfirmStore\(\)/,
    },
    {
        name: 'Destructuring from useSettingsStore()',
        pattern: /const\s*\{[^}]+\}\s*=\s*useSettingsStore\(\)/,
    },
    {
        name: 'Destructuring from useFocusStore()',
        pattern: /const\s*\{[^}]+\}\s*=\s*useFocusStore\(\)/,
    },
    {
        name: 'Destructuring from useKnowledgeBankStore()',
        pattern: /const\s*\{[^}]+\}\s*=\s*useKnowledgeBankStore\(\)/,
    },
];

/**
 * Closure variable anti-patterns in selectors.
 * These cause selector functions to be recreated each render,
 * leading to cascading re-renders during drag operations.
 *
 * Pattern: getNodeMap inside a store selector (should use useMemo instead)
 */
const CLOSURE_VARIABLE_PATTERNS: Array<{ name: string; pattern: RegExp }> = [
    {
        name: 'getNodeMap inside useCanvasStore selector',
        pattern: /useCanvasStore\(\s*(?:useShallow\s*\()?\s*\(\s*\w+\s*\)\s*=>\s*[^)]*getNodeMap\s*\(/,
    },
    {
        name: 'method call (s.fn(arg)) inside any store selector',
        pattern: /use\w+Store\(\s*\(\s*\w+\s*\)\s*=>\s*\w+\.(?:hasAccess|isPinned|isSelected|getById)\s*\(/,
    },
];

/**
 * Action-via-selector anti-patterns.
 * Actions should be accessed via getState(), not selected via hooks.
 * Selecting actions causes unnecessary subscriptions to the store.
 */
const ACTION_SELECTOR_PATTERNS: Array<{ name: string; pattern: RegExp }> = [
    {
        name: 'action selected via useSettingsStore selector',
        pattern: /use(?:Settings|Auth|Canvas|Workspace|Toast|Confirm|Focus|KnowledgeBank)Store\(\s*\(\s*\w+\s*\)\s*=>\s*\w+\.(?:set\w+|toggle\w+|reset\w+|remove\w+|add\w+|clear\w+|load\w+|update\w+|start\w+|stop\w+|confirm)\b/,
    },
];

/** Directories and file patterns to skip */
const SKIP_DIRS = ['node_modules', 'dist', '.git'];

/** Files allowed to use bare store calls (e.g., store definition files) */
const ALLOWLIST: string[] = [
    // Store definition files create the store, not subscribe to it
    'features/auth/stores/authStore.ts',
    'features/workspace/stores/workspaceStore.ts',
    'features/canvas/stores/canvasStore.ts',
    'shared/stores/toastStore.ts',
    'shared/stores/confirmStore.ts',
    'shared/stores/settingsStore.ts',
    'shared/stores/focusStore.ts',
    'features/knowledgeBank/stores/knowledgeBankStore.ts',
];

function getSourceFiles(dir: string, results: string[] = []): string[] {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = join(dir, entry.name);
        if (entry.isDirectory()) {
            if (SKIP_DIRS.includes(entry.name)) continue;
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

describe('Zustand selector enforcement', () => {
    const files = getSourceFiles(SRC_DIR);

    it('should scan a meaningful number of source files', () => {
        expect(files.length).toBeGreaterThan(50);
    });

    it.each(BARE_DESTRUCTURING_PATTERNS)(
        'no file uses $name',
        ({ pattern }) => {
            const violations: string[] = [];

            for (const file of files) {
                const relPath = rel(file);
                if (ALLOWLIST.includes(relPath)) continue;
                // Skip test files - they may mock stores differently
                if (relPath.includes('__tests__')) continue;
                if (relPath.endsWith('.test.ts') || relPath.endsWith('.test.tsx')) continue;

                const content = readFileSync(file, 'utf-8');
                if (pattern.test(content)) {
                    violations.push(relPath);
                }
            }

            expect(
                violations,
                `Files with bare store subscriptions (use selectors instead):\n` +
                `  Pattern: ${pattern.toString()}\n` +
                `  Fix: const value = useStore((s) => s.value)\n\n` +
                `  Violations:\n${violations.map((v) => `    - ${v}`).join('\n')}`
            ).toEqual([]);
        }
    );

    it.each(CLOSURE_VARIABLE_PATTERNS)(
        'no file uses $name',
        ({ pattern }) => {
            const violations: string[] = [];

            for (const file of files) {
                const relPath = rel(file);
                if (ALLOWLIST.includes(relPath)) continue;
                if (relPath.includes('__tests__')) continue;
                if (relPath.endsWith('.test.ts') || relPath.endsWith('.test.tsx')) continue;

                const content = readFileSync(file, 'utf-8');
                if (pattern.test(content)) {
                    violations.push(relPath);
                }
            }

            expect(
                violations,
                `Files with closure variables in selectors (use useMemo instead):\n` +
                `  Pattern: ${pattern.toString()}\n` +
                `  Fix: const nodes = useCanvasStore(s => s.nodes); useMemo(() => getNodeMap(nodes)...)\n\n` +
                `  Violations:\n${violations.map((v) => `    - ${v}`).join('\n')}`
            ).toEqual([]);
        }
    );

    it.each(ACTION_SELECTOR_PATTERNS)(
        'no file uses $name',
        ({ pattern }) => {
            const violations: string[] = [];

            for (const file of files) {
                const relPath = rel(file);
                if (ALLOWLIST.includes(relPath)) continue;
                if (relPath.includes('__tests__')) continue;
                if (relPath.endsWith('.test.ts') || relPath.endsWith('.test.tsx')) continue;

                const content = readFileSync(file, 'utf-8');
                if (pattern.test(content)) {
                    violations.push(relPath);
                }
            }

            expect(
                violations,
                `Files selecting actions via selectors (use getState() instead):\n` +
                `  Pattern: ${pattern.toString()}\n` +
                `  Fix: useStore.getState().action() instead of useStore((s) => s.action)\n\n` +
                `  Violations:\n${violations.map((v) => `    - ${v}`).join('\n')}`
            ).toEqual([]);
        }
    );

    describe('per-node hook enforcement', () => {
        const PER_NODE_FILES = [
            'features/canvas/hooks/useIdeaCard.ts',
            'features/canvas/hooks/useNodeInput.ts',
            'features/canvas/hooks/useNodeResize.ts',
            'features/canvas/hooks/useFocusMode.ts',
        ];

        it.each(PER_NODE_FILES)(
            '%s must NOT contain useCanvasStore((s) => s.nodes)',
            (filePath) => {
                const content = readFileSync(join(SRC_DIR, filePath), 'utf-8');
                const hasFullNodesSub = /useCanvasStore\(\s*\(\s*\w+\s*\)\s*=>\s*\w+\.nodes\s*\)/.test(content);
                expect(
                    hasFullNodesSub,
                    `${filePath} subscribes to s.nodes — use useNode/useNodeData/useNodeDimensions instead`,
                ).toBe(false);
            },
        );

        const PER_NODE_IMPORTS = [
            { file: 'features/canvas/hooks/useIdeaCard.ts', hook: 'useNodeData' },
            { file: 'features/canvas/hooks/useNodeInput.ts', hook: 'useNodeData' },
            { file: 'features/canvas/hooks/useNodeResize.ts', hook: 'useNodeDimensions' },
            { file: 'features/canvas/hooks/useFocusMode.ts', hook: 'useNode' },
        ];

        it.each(PER_NODE_IMPORTS)(
            '$file must import $hook',
            ({ file, hook }) => {
                const content = readFileSync(join(SRC_DIR, file), 'utf-8');
                expect(
                    content.includes(hook),
                    `${file} should import ${hook}`,
                ).toBe(true);
            },
        );
    });

    it('canvasStoreActions must not have nested set() calls (prevents cascading re-renders)', () => {
        const actionsFile = readFileSync(
            join(SRC_DIR, 'features/canvas/stores/canvasStoreActions.ts'),
            'utf-8',
        );
        // After a set() call, calling get() followed by another set/pruneDeletedNodes is the nested pattern.
        // The fix: batch all mutations in a single set() updater function.
        const nestedSetPattern = /set\(\s*\([\s\S]*?\)\s*\);\s*\n\s*const\s+\w+\s*=\s*get\(\)/;
        expect(
            nestedSetPattern.test(actionsFile),
            'canvasStoreActions has nested set() calls — batch mutations in single set() to prevent cascade',
        ).toBe(false);
    });

    it('provides documentation on correct patterns', () => {
        const correctPatterns = [
            '// ✅ CORRECT: Selector pattern - only re-renders when value changes',
            'const user = useAuthStore((s) => s.user);',
            'const nodes = useCanvasStore((s) => s.nodes);',
            '',
            '// ✅ CORRECT: Stable selector + useMemo derivation',
            'const nodes = useCanvasStore((s) => s.nodes);',
            'const node = useMemo(() => getNodeMap(nodes).get(id), [nodes, id]);',
            '',
            '// ✅ CORRECT: Actions via getState() - stable reference, no subscription',
            'useWorkspaceStore.getState().removeWorkspace(id);',
            'useCanvasStore.getState().clearCanvas();',
            '',
            '// ❌ ANTI-PATTERN 1: Subscribes to ENTIRE store',
            '// const { user } = useAuthStore();',
            '',
            '// ❌ ANTI-PATTERN 2: Closure variable in selector',
            '// const node = useCanvasStore((s) => getNodeMap(s.nodes).get(externalId));',
        ];
        // This test always passes but serves as documentation
        expect(correctPatterns.length).toBeGreaterThan(0);
    });
});
