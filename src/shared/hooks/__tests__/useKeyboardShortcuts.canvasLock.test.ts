/**
 * useKeyboardShortcuts — Canvas Lock Guard Tests (TDD)
 *
 * When canvas is locked:
 *   Cmd/Ctrl+L  → toggles lock (always allowed — it's how you unlock)
 *   Cmd/Ctrl+[  → blocked (no zoom in)
 *   Cmd/Ctrl+]  → blocked (no zoom out)
 *   Cmd/Ctrl+N  → blocked (no quick capture / node creation)
 *   N key       → blocked (no add node)
 *   Delete      → blocked (no delete nodes)
 *   Backspace   → blocked (no delete nodes)
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useKeyboardShortcuts } from '@/app/hooks/useKeyboardShortcuts';
import { useSettingsStore } from '@/shared/stores/settingsStore';
import { _resetEscapeLayer } from '@/shared/hooks/useEscapeLayer.testUtils';
import { _resetNodeCreationLock } from '@/features/canvas/hooks/useQuickCapture';
import { fireKeyDown } from './keyboardShortcutTestHelpers';

// ─── Minimal canvasStore mock (node-1 pre-selected so Delete guard passes) ──
vi.mock('@/features/canvas/stores/canvasStore', () => ({
    useCanvasStore: Object.assign(
        vi.fn((selector?: (s: unknown) => unknown) => {
            const state = { selectedNodeIds: new Set<string>(['node-1']), editingNodeId: null };
            return selector ? selector(state) : state;
        }),
        {
            getState: () => ({
                selectedNodeIds: new Set<string>(['node-1']),
                editingNodeId: null,
                clearSelection: vi.fn(),
            }),
        },
    ),
}));

vi.mock('@/features/canvas/stores/historyStore', () => ({
    useHistoryStore: { getState: () => ({ dispatch: vi.fn() }) },
}));

describe('useKeyboardShortcuts — canvas lock guard', () => {
    const onZoomIn = vi.fn();
    const onZoomOut = vi.fn();
    const onAddNode = vi.fn();
    const onQuickCapture = vi.fn();
    const onDeleteNodes = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        _resetEscapeLayer();
        _resetNodeCreationLock();
        // Reset lock to off before every test
        useSettingsStore.setState({ isCanvasLocked: false });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    // ── Cmd/Ctrl+L — toggle lock ───────────────────────────────────────────

    it('Cmd+L (metaKey) toggles canvas lock on', () => {
        renderHook(() => useKeyboardShortcuts({}));
        expect(useSettingsStore.getState().isCanvasLocked).toBe(false);
        fireKeyDown('l', { metaKey: true });
        expect(useSettingsStore.getState().isCanvasLocked).toBe(true);
    });

    it('Ctrl+L (ctrlKey) toggles canvas lock on', () => {
        renderHook(() => useKeyboardShortcuts({}));
        fireKeyDown('l', { ctrlKey: true });
        expect(useSettingsStore.getState().isCanvasLocked).toBe(true);
    });

    it('Cmd+L with uppercase L also toggles lock', () => {
        renderHook(() => useKeyboardShortcuts({}));
        fireKeyDown('L', { metaKey: true });
        expect(useSettingsStore.getState().isCanvasLocked).toBe(true);
    });

    it('Cmd+L toggles lock off when already locked', () => {
        useSettingsStore.setState({ isCanvasLocked: true });
        renderHook(() => useKeyboardShortcuts({}));
        fireKeyDown('l', { metaKey: true });
        expect(useSettingsStore.getState().isCanvasLocked).toBe(false);
    });

    it('Cmd+L prevents default (stops browser focusing the address bar)', () => {
        renderHook(() => useKeyboardShortcuts({}));
        const event = fireKeyDown('l', { metaKey: true });
        expect(event.defaultPrevented).toBe(true);
    });

    it('Cmd+L fires even when canvas is already locked (it is the unlock mechanism)', () => {
        useSettingsStore.setState({ isCanvasLocked: true });
        renderHook(() => useKeyboardShortcuts({}));
        // Should not throw and should toggle
        expect(() => fireKeyDown('l', { metaKey: true })).not.toThrow();
        expect(useSettingsStore.getState().isCanvasLocked).toBe(false);
    });

    it('plain l key (no modifier) does NOT toggle lock', () => {
        renderHook(() => useKeyboardShortcuts({}));
        fireKeyDown('l'); // no metaKey / ctrlKey
        expect(useSettingsStore.getState().isCanvasLocked).toBe(false);
    });

    it('Cmd+L inside contenteditable does NOT toggle lock', () => {
        // Regression guard: user pressing Cmd+L inside a TipTap node editor
        // (e.g., to insert a hyperlink) must not accidentally lock the canvas.
        renderHook(() => useKeyboardShortcuts({}));
        const div = document.createElement('div');
        div.contentEditable = 'true';
        document.body.appendChild(div);
        const event = new KeyboardEvent('keydown', {
            key: 'l', metaKey: true, bubbles: true, cancelable: true,
        });
        div.dispatchEvent(event);
        expect(useSettingsStore.getState().isCanvasLocked).toBe(false);
        div.remove();
    });

    it('Cmd+L inside an INPUT does NOT toggle lock', () => {
        renderHook(() => useKeyboardShortcuts({}));
        const input = document.createElement('input');
        document.body.appendChild(input);
        const event = new KeyboardEvent('keydown', {
            key: 'l', metaKey: true, bubbles: true, cancelable: true,
        });
        input.dispatchEvent(event);
        expect(useSettingsStore.getState().isCanvasLocked).toBe(false);
        input.remove();
    });

    // ── Zoom blocked when locked ───────────────────────────────────────────

    it('Cmd+[ does NOT call onZoomIn when canvas is locked', () => {
        useSettingsStore.setState({ isCanvasLocked: true });
        renderHook(() => useKeyboardShortcuts({ onZoomIn }));
        fireKeyDown('[', { metaKey: true });
        expect(onZoomIn).not.toHaveBeenCalled();
    });

    it('Ctrl+[ does NOT call onZoomIn when canvas is locked', () => {
        useSettingsStore.setState({ isCanvasLocked: true });
        renderHook(() => useKeyboardShortcuts({ onZoomIn }));
        fireKeyDown('[', { ctrlKey: true });
        expect(onZoomIn).not.toHaveBeenCalled();
    });

    it('Cmd+] does NOT call onZoomOut when canvas is locked', () => {
        useSettingsStore.setState({ isCanvasLocked: true });
        renderHook(() => useKeyboardShortcuts({ onZoomOut }));
        fireKeyDown(']', { metaKey: true });
        expect(onZoomOut).not.toHaveBeenCalled();
    });

    it('Ctrl+] does NOT call onZoomOut when canvas is locked', () => {
        useSettingsStore.setState({ isCanvasLocked: true });
        renderHook(() => useKeyboardShortcuts({ onZoomOut }));
        fireKeyDown(']', { ctrlKey: true });
        expect(onZoomOut).not.toHaveBeenCalled();
    });

    // ── Quick capture blocked when locked ─────────────────────────────────

    it('Cmd+N does NOT call onQuickCapture when canvas is locked', () => {
        useSettingsStore.setState({ isCanvasLocked: true });
        renderHook(() => useKeyboardShortcuts({ onQuickCapture }));
        fireKeyDown('n', { metaKey: true });
        expect(onQuickCapture).not.toHaveBeenCalled();
    });

    it('Ctrl+N does NOT call onQuickCapture when canvas is locked', () => {
        useSettingsStore.setState({ isCanvasLocked: true });
        renderHook(() => useKeyboardShortcuts({ onQuickCapture }));
        fireKeyDown('n', { ctrlKey: true });
        expect(onQuickCapture).not.toHaveBeenCalled();
    });

    // ── Plain N blocked when locked ────────────────────────────────────────

    it('N key does NOT call onAddNode when canvas is locked', () => {
        useSettingsStore.setState({ isCanvasLocked: true });
        renderHook(() => useKeyboardShortcuts({ onAddNode }));
        fireKeyDown('n');
        expect(onAddNode).not.toHaveBeenCalled();
    });

    it('Uppercase N does NOT call onAddNode when canvas is locked', () => {
        useSettingsStore.setState({ isCanvasLocked: true });
        renderHook(() => useKeyboardShortcuts({ onAddNode }));
        fireKeyDown('N');
        expect(onAddNode).not.toHaveBeenCalled();
    });

    // ── Delete / Backspace blocked when locked ─────────────────────────────

    it('Delete does NOT call onDeleteNodes when canvas is locked', () => {
        useSettingsStore.setState({ isCanvasLocked: true });
        renderHook(() => useKeyboardShortcuts({ onDeleteNodes }));
        fireKeyDown('Delete');
        expect(onDeleteNodes).not.toHaveBeenCalled();
    });

    it('Backspace does NOT call onDeleteNodes when canvas is locked', () => {
        useSettingsStore.setState({ isCanvasLocked: true });
        renderHook(() => useKeyboardShortcuts({ onDeleteNodes }));
        fireKeyDown('Backspace');
        expect(onDeleteNodes).not.toHaveBeenCalled();
    });

    // ── Regression: all actions still work when canvas is unlocked ─────────

    it('Cmd+[ still calls onZoomIn when unlocked', () => {
        renderHook(() => useKeyboardShortcuts({ onZoomIn }));
        fireKeyDown('[', { metaKey: true });
        expect(onZoomIn).toHaveBeenCalledTimes(1);
    });

    it('Cmd+] still calls onZoomOut when unlocked', () => {
        renderHook(() => useKeyboardShortcuts({ onZoomOut }));
        fireKeyDown(']', { metaKey: true });
        expect(onZoomOut).toHaveBeenCalledTimes(1);
    });

    it('Cmd+N still calls onQuickCapture when unlocked', () => {
        renderHook(() => useKeyboardShortcuts({ onQuickCapture }));
        fireKeyDown('n', { metaKey: true });
        expect(onQuickCapture).toHaveBeenCalledTimes(1);
    });

    it('N key still calls onAddNode when unlocked', () => {
        renderHook(() => useKeyboardShortcuts({ onAddNode }));
        fireKeyDown('n');
        expect(onAddNode).toHaveBeenCalledTimes(1);
    });

    it('Delete still calls onDeleteNodes when unlocked', () => {
        renderHook(() => useKeyboardShortcuts({ onDeleteNodes }));
        fireKeyDown('Delete');
        expect(onDeleteNodes).toHaveBeenCalledTimes(1);
    });
});
