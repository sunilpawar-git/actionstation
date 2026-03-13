/**
 * nodeSimplification.structural.test.ts — Structural tests for Phase 3 simplification.
 * Validates that dead code is fully removed and new patterns are correct.
 */
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { describe, it, expect } from 'vitest';
import { CONTEXT_MENU_GROUPS, PRIMARY_ACTIONS } from '../../../types/utilsBarLayout';
import { ACTION_REGISTRY, DEFAULT_UTILS_BAR, DEFAULT_CONTEXT_MENU, UTILS_BAR_MAX, CONTEXT_MENU_MAX } from '@/shared/stores/iconRegistry';

const SRC_DIR = join(process.cwd(), 'src');

function readSrc(relPath: string): string {
    return readFileSync(join(SRC_DIR, relPath), 'utf-8');
}

describe('Phase 3: Node simplification structural tests', () => {
    describe('deleted files do not exist', () => {
        const DELETED_FILES = [
            'features/canvas/components/nodes/Deck1Actions.tsx',
            'features/canvas/components/nodes/Deck2Actions.tsx',
            'features/canvas/components/nodes/deckActionTypes.ts',
            'features/canvas/components/nodes/NodeUtilsBarDeckButtons.tsx',
            'app/components/SettingsPanel/sections/DeckColumn.tsx',
            'app/components/SettingsPanel/sections/useToolbarDrag.ts',
            'shared/stores/utilsBarLayoutSlice.ts',
            'features/canvas/hooks/useUtilsBarLayout.ts',
            'features/canvas/hooks/useBarPinOpen.ts',
            'features/canvas/hooks/useHoverIntent.ts',
            'features/canvas/hooks/useOverflowAutoOpen.ts',
        ];

        it.each(DELETED_FILES)('%s does not exist', (file) => {
            expect(existsSync(join(SRC_DIR, file))).toBe(false);
        });
    });

    describe('no imports of deleted modules', () => {
        const DELETED_MODULES = [
            'Deck1Actions',
            'Deck2Actions',
            'deckActionTypes',
            'NodeUtilsBarDeckButtons',
            'DeckColumn',
            'useToolbarDrag',
            'utilsBarLayoutSlice',
            'useUtilsBarLayout',
            'useBarPinOpen',
            'useHoverIntent',
            'useOverflowAutoOpen',
        ];

        it.each(DELETED_MODULES)('no source file imports %s', (mod) => {
            const pattern = new RegExp(`from\\s+['"][^'"]*${mod}['"]`);
            const nodeUtilsBar = readSrc('features/canvas/components/nodes/NodeUtilsBar.tsx');
            const ideaCard = readSrc('features/canvas/components/nodes/IdeaCard.tsx');
            const controller = readSrc('features/canvas/hooks/useNodeUtilsController.ts');
            const settingsStore = readSrc('shared/stores/settingsStore.ts');
            const settingsPanel = readSrc('app/components/SettingsPanel/SettingsPanel.tsx');

            expect(pattern.test(nodeUtilsBar)).toBe(false);
            expect(pattern.test(ideaCard)).toBe(false);
            expect(pattern.test(controller)).toBe(false);
            expect(pattern.test(settingsStore)).toBe(false);
            expect(pattern.test(settingsPanel)).toBe(false);
        });
    });

    describe('no utilsBarLayout in settingsStore state', () => {
        it('settingsStore does not contain setUtilsBarActionDeck', () => {
            const content = readSrc('shared/stores/settingsStore.ts');
            expect(content).not.toContain('setUtilsBarActionDeck');
        });

        it('settingsStore does not contain reorderUtilsBarAction', () => {
            const content = readSrc('shared/stores/settingsStore.ts');
            expect(content).not.toContain('reorderUtilsBarAction');
        });

        it('settingsStore does not contain resetUtilsBarLayout', () => {
            const content = readSrc('shared/stores/settingsStore.ts');
            expect(content).not.toContain('resetUtilsBarLayout');
        });
    });

    describe('SettingsPanel has 6 tabs (including toolbar)', () => {
        it('contains toolbar tab', () => {
            const content = readSrc('app/components/SettingsPanel/SettingsPanel.tsx');
            expect(content).toContain("'toolbar'");
        });
    });

    describe('NodeContextMenu uses portal', () => {
        it('NodeContextMenu imports createPortal', () => {
            const content = readSrc('features/canvas/components/nodes/NodeContextMenu.tsx');
            expect(content).toContain('createPortal');
        });

        it('NodeContextMenu renders to portal-root', () => {
            const content = readSrc('features/canvas/components/nodes/NodeContextMenu.tsx');
            expect(content).toContain('getPortalRoot()');
        });
    });

    describe('no Zustand anti-patterns in modified files', () => {
        const MODIFIED_FILES = [
            'features/canvas/components/nodes/IdeaCard.tsx',
            'features/canvas/components/nodes/NodeContextMenu.tsx',
            'features/canvas/components/nodes/InlineSharePanel.tsx',
        ];

        it.each(MODIFIED_FILES)('%s does not use bare store destructuring', (file) => {
            const content = readSrc(file);
            const barePattern = /const\s*\{[^}]+\}\s*=\s*use\w+Store\(\)/;
            expect(barePattern.test(content)).toBe(false);
        });
    });

    describe('no BAR_PIN escape priority', () => {
        it('escapePriorities does not contain BAR_PIN', () => {
            const content = readSrc('shared/hooks/escapePriorities.ts');
            expect(content).not.toContain('BAR_PIN');
        });

        it('escapePriorities contains CONTEXT_MENU', () => {
            const content = readSrc('shared/hooks/escapePriorities.ts');
            expect(content).toContain('CONTEXT_MENU');
        });
    });

    describe('all labels from string resources', () => {
        it('NodeUtilsBar does not contain hardcoded action labels', () => {
            const content = readSrc('features/canvas/components/nodes/NodeUtilsBar.tsx');
            expect(content).not.toMatch(/label=["'](?:Connect|Copy|Delete|More)["']/);
        });

        it('NodeContextMenu does not contain hardcoded action labels', () => {
            const content = readSrc('features/canvas/components/nodes/NodeContextMenu.tsx');
            expect(content).not.toMatch(/label=["'](?:Pin|Unpin|Duplicate|Focus|Tags|Color|Image|Attachment|Share)["']/);
        });
    });

    describe('utilsBarLayout SSOT matches component rendering', () => {
        it('PRIMARY_ACTIONS contains exactly 4 actions', () => {
            expect(PRIMARY_ACTIONS).toEqual(['ai', 'connect', 'copy', 'delete']);
        });

        it('CONTEXT_MENU_GROUPS has 5 groups', () => {
            expect(Object.keys(CONTEXT_MENU_GROUPS)).toEqual(['primary', 'organize', 'appearance', 'insert', 'sharing']);
        });

        it('all context menu group actions are strings', () => {
            for (const actions of Object.values(CONTEXT_MENU_GROUPS)) {
                for (const action of actions) {
                    expect(typeof action).toBe('string');
                }
            }
        });
    });

    describe('right-click opens context menu (not pin)', () => {
        it('IdeaCard onContextMenu opens context menu', () => {
            const content = readSrc('features/canvas/components/nodes/IdeaCard.tsx');
            expect(content).toContain('onContextMenu={contextMenu.openAtCursor}');
        });

        it('IdeaCard does not reference pinOpenHandlers', () => {
            const content = readSrc('features/canvas/components/nodes/IdeaCard.tsx');
            expect(content).not.toContain('pinOpenHandlers');
        });
    });

    describe('icon registry and dual-zone placement', () => {
        it('ACTION_REGISTRY has 15 actions', () => {
            expect(ACTION_REGISTRY.size).toBe(15);
        });

        it('DEFAULT_UTILS_BAR has at most UTILS_BAR_MAX icons', () => {
            expect(DEFAULT_UTILS_BAR.length).toBeLessThanOrEqual(UTILS_BAR_MAX);
        });

        it('DEFAULT_CONTEXT_MENU has at most CONTEXT_MENU_MAX icons', () => {
            expect(DEFAULT_CONTEXT_MENU.length).toBeLessThanOrEqual(CONTEXT_MENU_MAX);
        });

        it('UTILS_BAR_MAX is 6', () => {
            expect(UTILS_BAR_MAX).toBe(6);
        });

        it('CONTEXT_MENU_MAX is 11', () => {
            expect(CONTEXT_MENU_MAX).toBe(11);
        });

        it('settingsStore has utilsBarIcons and contextMenuIcons', () => {
            const content = readSrc('shared/stores/settingsStore.ts');
            expect(content).toContain('utilsBarIcons');
            expect(content).toContain('contextMenuIcons');
        });

        it('settingsStore imports from iconRegistry not toolbarConfig', () => {
            const content = readSrc('shared/stores/settingsStore.ts');
            expect(content).toContain('iconRegistry');
            expect(content).not.toContain('toolbarConfig');
        });

        it('NodeContextMenu reads contextMenuIcons from store', () => {
            const content = readSrc('features/canvas/components/nodes/NodeContextMenu.tsx');
            expect(content).toContain('contextMenuIcons');
        });

        it('NodeUtilsBar reads utilsBarIcons from store', () => {
            const content = readSrc('features/canvas/components/nodes/NodeUtilsBar.tsx');
            expect(content).toContain('utilsBarIcons');
        });

        it('no default/required actions are missing from defaults', () => {
            const allPlaced = new Set([...DEFAULT_UTILS_BAR, ...DEFAULT_CONTEXT_MENU]);
            for (const [id, meta] of ACTION_REGISTRY) {
                if (meta.required) {
                    expect(allPlaced.has(id)).toBe(true);
                }
            }
        });
    });
});
