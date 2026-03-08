/**
 * Structural test: Canvas undo/redo wiring correctness
 *
 * Ensures the history system remains isolated from the canvas store,
 * keyboard shortcuts are wired correctly, and no undo state
 * leaks into Firestore persistence.
 */
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { describe, it, expect } from 'vitest';

const SRC = (path: string) =>
    readFileSync(join(process.cwd(), 'src', path), 'utf-8');

describe('Undo/Redo structural wiring', () => {
    // 1. historyStore is a separate file from canvasStore (import path check)
    it('historyStore is a separate file from canvasStore', () => {
        const historyStore = SRC('features/canvas/stores/historyStore.ts');
        const canvasStore = SRC('features/canvas/stores/canvasStore.ts');
        expect(historyStore).toBeTruthy();
        expect(canvasStore).toBeTruthy();
        expect(historyStore).not.toBe(canvasStore);
    });

    // 2. historyReducer is a pure function export (no Zustand imports)
    it('historyReducer has no Zustand imports (pure function)', () => {
        const reducer = SRC('features/canvas/stores/historyReducer.ts');
        expect(reducer).not.toMatch(/from\s+['"]zustand['"]/);
        expect(reducer).toContain('export function historyReducer');
    });

    // 3. useHistoryStore does NOT appear in canvasStore.ts (isolation check)
    it('canvasStore does NOT reference useHistoryStore', () => {
        const canvasStore = SRC('features/canvas/stores/canvasStore.ts');
        expect(canvasStore).not.toContain('useHistoryStore');
        expect(canvasStore).not.toContain('historyStore');
    });

    // 4. useCanvasStore does NOT import from historyStore (no coupling)
    it('historyStore does NOT import from canvasStore', () => {
        const historyStore = SRC('features/canvas/stores/historyStore.ts');
        expect(historyStore).not.toContain('canvasStore');
    });

    // 5. useKeyboardShortcuts imports useHistoryStore for undo/redo dispatch
    it('useKeyboardShortcuts imports useHistoryStore', () => {
        const shortcuts = SRC('app/hooks/useKeyboardShortcuts.ts');
        expect(shortcuts).toContain('useHistoryStore');
        expect(shortcuts).toContain("dispatch({ type: 'UNDO' })");
        expect(shortcuts).toContain("dispatch({ type: 'REDO' })");
    });

    // 6. useKeyboardShortcuts uses isEditableTarget guard before undo/redo
    it('useKeyboardShortcuts guards undo/redo with isEditableTarget', () => {
        const shortcuts = SRC('app/hooks/useKeyboardShortcuts.ts');
        // isEditableTarget must appear BEFORE the undo dispatch
        const undoIdx = shortcuts.indexOf("dispatch({ type: 'UNDO' })");
        const guardIdx = shortcuts.lastIndexOf('isEditableTarget', undoIdx);
        expect(guardIdx).toBeGreaterThan(-1);
        expect(guardIdx).toBeLessThan(undoIdx);
    });

    // 7. useWorkspaceLoader calls dispatch({ type: 'CLEAR' })
    it('useWorkspaceLoader clears history on workspace switch', () => {
        const loader = SRC('features/workspace/hooks/useWorkspaceLoader.ts');
        expect(loader).toContain('useHistoryStore');
        expect(loader).toContain("dispatch({ type: 'CLEAR' })");
    });

    // 8. No undoStack/redoStack strings in workspaceService.ts (no Firestore persistence)
    it('workspaceService does NOT persist undo/redo stacks', () => {
        const service = SRC('features/workspace/services/workspaceService.ts');
        expect(service).not.toContain('undoStack');
        expect(service).not.toContain('redoStack');
    });

    // 9. No undoStack/redoStack strings in any *Service.ts file
    it('no service file persists undo/redo stacks', () => {
        const joinPath = join;

        function findServiceFiles(dir: string, results: string[] = []): string[] {
            for (const entry of readdirSync(dir, { withFileTypes: true })) {
                const full = joinPath(dir, entry.name);
                if (entry.isDirectory()) {
                    if (['node_modules', 'dist', '.git', '__tests__'].includes(entry.name)) continue;
                    findServiceFiles(full, results);
                } else if (entry.name.endsWith('Service.ts')) {
                    results.push(full);
                }
            }
            return results;
        }

        const srcDir = join(process.cwd(), 'src');
        const serviceFiles = findServiceFiles(srcDir);
        expect(serviceFiles.length).toBeGreaterThan(0);

        for (const file of serviceFiles) {
            const content = readFileSync(file, 'utf-8');
            expect(content).not.toContain('undoStack');
            expect(content).not.toContain('redoStack');
        }
    });

    // 10. UndoRedoButtons imports useHistoryStore and ZoomControls renders it
    it('UndoRedoButtons imports useHistoryStore for undo/redo buttons', () => {
        const undoRedo = SRC('features/canvas/components/UndoRedoButtons.tsx');
        expect(undoRedo).toContain('useHistoryStore');
        expect(undoRedo).toContain('UNDO');
        expect(undoRedo).toContain('REDO');
    });

    it('ZoomControls renders UndoRedoButtons (extracted component)', () => {
        const zoom = SRC('features/canvas/components/ZoomControls.tsx');
        expect(zoom).toContain('UndoRedoButtons');
    });

    // 11. canvasStrings.ts contains 'history' object with undo/redo labels
    it('canvasStrings has history section with undo/redo labels', () => {
        const strings = SRC('shared/localization/canvasStrings.ts');
        expect(strings).toMatch(/history\s*:\s*\{/);
        expect(strings).toContain('undoButton');
        expect(strings).toContain('redoButton');
        expect(strings).toContain('undoTooltip');
        expect(strings).toContain('redoTooltip');
    });

    // 12. KeyboardSection includes undo/redo entries
    it('KeyboardSection lists undo/redo shortcuts', () => {
        const section = SRC('app/components/SettingsPanel/sections/KeyboardSection.tsx');
        expect(section).toMatch(/undo/i);
        expect(section).toMatch(/redo/i);
    });

    // 13. useCanvasEdgeHandlers imports useHistoryStore (edge undo wired)
    it('useCanvasEdgeHandlers wires edge undo via useHistoryStore', () => {
        const edgeHandlers = SRC('features/canvas/hooks/useCanvasEdgeHandlers.ts');
        expect(edgeHandlers).toContain('useHistoryStore');
        expect(edgeHandlers).toContain("type: 'deleteEdge'");
        expect(edgeHandlers).toContain("type: 'addEdge'");
    });

    // 14. useAddNode uses addNodeWithUndo (not raw addNode)
    it('useAddNode uses addNodeWithUndo for undoable node creation', () => {
        const addNode = SRC('features/canvas/hooks/useAddNode.ts');
        expect(addNode).toContain('useUndoableActions');
        expect(addNode).toContain('addNodeWithUndo');
        expect(addNode).not.toMatch(/getState\(\)\.addNode\b/);
    });

    // 15. useQuickCapture uses addNodeWithUndo (not raw addNode)
    it('useQuickCapture uses addNodeWithUndo for undoable node creation', () => {
        const quickCapture = SRC('features/canvas/hooks/useQuickCapture.ts');
        expect(quickCapture).toContain('useUndoableActions');
        expect(quickCapture).toContain('addNodeWithUndo');
        expect(quickCapture).not.toMatch(/getState\(\)\.addNode\b/);
    });

    // 16. historyStore fires analytics on undo/redo
    it('historyStore wires analytics tracking in dispatch', () => {
        const historyStore = SRC('features/canvas/stores/historyStore.ts');
        expect(historyStore).toContain('trackCanvasUndo');
        expect(historyStore).toContain('trackCanvasRedo');
    });

    // 17. historyStore fires toast for destructive undo
    it('historyStore wires toast feedback for destructive undo', () => {
        const historyStore = SRC('features/canvas/stores/historyStore.ts');
        expect(historyStore).toContain('toast.info');
        expect(historyStore).toContain('TOAST_ON_UNDO');
    });

    // 18. ClearCanvasButton uses useClearCanvasWithUndo (not raw clearCanvas)
    it('ClearCanvasButton delegates to useClearCanvasWithUndo', () => {
        const btn = SRC('features/workspace/components/ClearCanvasButton.tsx');
        expect(btn).toContain('useClearCanvasWithUndo');
        expect(btn).not.toMatch(/useCanvasStore.*clearCanvas\b/);
    });

    // 19. TOAST_ON_UNDO set does NOT contain deleteNode or batchDelete
    it('historyStore TOAST_ON_UNDO excludes deleteNode and batchDelete (handled at call site)', () => {
        const historyStore = SRC('features/canvas/stores/historyStore.ts');
        // TOAST_ON_UNDO must not list deleteNode/batchDelete — those toasts
        // are shown by useUndoableActions at the point of action.
        expect(historyStore).not.toMatch(/TOAST_ON_UNDO.*deleteNode/s);
        expect(historyStore).not.toMatch(/TOAST_ON_UNDO.*batchDelete/s);
    });

    // 20. historyStore exports selectCanUndo and selectCanRedo
    it('historyStore exports selectCanUndo and selectCanRedo selectors', () => {
        const historyStore = SRC('features/canvas/stores/historyStore.ts');
        expect(historyStore).toContain('export const selectCanUndo');
        expect(historyStore).toContain('export const selectCanRedo');
    });

    // 21. useUndoableActions uses toastWithAction for undo toasts
    it('useUndoableActions uses toastWithAction for node deletion undo toasts', () => {
        const undoableActions = SRC('features/canvas/hooks/useUndoableActions.ts');
        expect(undoableActions).toContain('toastWithAction');
    });

    // 22. useClearCanvasWithUndo uses toastWithAction for undo toast
    it('useClearCanvasWithUndo uses toastWithAction for clear-canvas undo toast', () => {
        const clearUndo = SRC('features/canvas/hooks/useClearCanvasWithUndo.ts');
        expect(clearUndo).toContain('toastWithAction');
    });

    // 23. withUndo and pushCmd live in historyUtils (not duplicated in hook files)
    it('withUndo and pushCmd are defined in historyUtils (canonical location)', () => {
        const utils = SRC('features/canvas/utils/historyUtils.ts');
        expect(utils).toContain('export function withUndo');
        expect(utils).toContain('export function pushCmd');
    });
});
