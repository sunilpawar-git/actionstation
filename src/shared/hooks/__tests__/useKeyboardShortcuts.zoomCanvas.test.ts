/**
 * useKeyboardShortcuts — Canvas Zoom Shortcuts (TDD)
 *
 * Cmd/Ctrl + [  → zoom in
 * Cmd/Ctrl + ]  → zoom out
 *
 * These are modifier shortcuts: they are handled by handleModifierShortcuts
 * and therefore fire even while an overlay is open (same as ⌘+N, ⌘+K, etc.).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useKeyboardShortcuts } from '@/app/hooks/useKeyboardShortcuts';
import { _resetEscapeLayer } from '@/shared/hooks/useEscapeLayer.testUtils';
import { _resetNodeCreationLock } from '@/features/canvas/hooks/useQuickCapture';
import { useEscapeLayer } from '@/shared/hooks/useEscapeLayer';
import { ESCAPE_PRIORITY } from '@/shared/hooks/escapePriorities';
import { fireKeyDown } from './keyboardShortcutTestHelpers';

// ─── Minimal canvasStore mock (no selection/editing needed here) ────────────
vi.mock('@/features/canvas/stores/canvasStore', () => ({
    useCanvasStore: Object.assign(
        vi.fn((selector?: (s: unknown) => unknown) => {
            const state = { selectedNodeIds: new Set<string>(), editingNodeId: null };
            return selector ? selector(state) : state;
        }),
        {
            getState: () => ({
                selectedNodeIds: new Set<string>(),
                editingNodeId: null,
                clearSelection: vi.fn(),
            }),
        },
    ),
}));

// historyStore is imported by useKeyboardShortcuts for undo/redo
vi.mock('@/features/canvas/stores/historyStore', () => ({
    useHistoryStore: { getState: () => ({ dispatch: vi.fn() }) },
}));

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('useKeyboardShortcuts — canvas zoom shortcuts', () => {
    const onZoomIn = vi.fn();
    const onZoomOut = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        _resetEscapeLayer();
        _resetNodeCreationLock();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    // ── Zoom In (Cmd/Ctrl + [) ─────────────────────────────────────────────

    it('calls onZoomIn when Cmd+[ is pressed (metaKey)', () => {
        renderHook(() => useKeyboardShortcuts({ onZoomIn }));
        fireKeyDown('[', { metaKey: true });
        expect(onZoomIn).toHaveBeenCalledTimes(1);
    });

    it('calls onZoomIn when Ctrl+[ is pressed (ctrlKey)', () => {
        renderHook(() => useKeyboardShortcuts({ onZoomIn }));
        fireKeyDown('[', { ctrlKey: true });
        expect(onZoomIn).toHaveBeenCalledTimes(1);
    });

    it('does NOT call onZoomIn when [ is pressed without a modifier', () => {
        renderHook(() => useKeyboardShortcuts({ onZoomIn }));
        fireKeyDown('[');
        expect(onZoomIn).not.toHaveBeenCalled();
    });

    it('prevents default on Cmd+[ to stop browser from handling it', () => {
        renderHook(() => useKeyboardShortcuts({ onZoomIn }));
        const event = fireKeyDown('[', { metaKey: true });
        expect(event.defaultPrevented).toBe(true);
    });

    it('does not throw when onZoomIn is not provided and Cmd+[ is pressed', () => {
        renderHook(() => useKeyboardShortcuts({}));
        expect(() => fireKeyDown('[', { metaKey: true })).not.toThrow();
    });

    // ── Zoom Out (Cmd/Ctrl + ]) ────────────────────────────────────────────

    it('calls onZoomOut when Cmd+] is pressed (metaKey)', () => {
        renderHook(() => useKeyboardShortcuts({ onZoomOut }));
        fireKeyDown(']', { metaKey: true });
        expect(onZoomOut).toHaveBeenCalledTimes(1);
    });

    it('calls onZoomOut when Ctrl+] is pressed (ctrlKey)', () => {
        renderHook(() => useKeyboardShortcuts({ onZoomOut }));
        fireKeyDown(']', { ctrlKey: true });
        expect(onZoomOut).toHaveBeenCalledTimes(1);
    });

    it('does NOT call onZoomOut when ] is pressed without a modifier', () => {
        renderHook(() => useKeyboardShortcuts({ onZoomOut }));
        fireKeyDown(']');
        expect(onZoomOut).not.toHaveBeenCalled();
    });

    it('prevents default on Cmd+] to stop browser from handling it', () => {
        renderHook(() => useKeyboardShortcuts({ onZoomOut }));
        const event = fireKeyDown(']', { metaKey: true });
        expect(event.defaultPrevented).toBe(true);
    });

    it('does not throw when onZoomOut is not provided and Cmd+] is pressed', () => {
        renderHook(() => useKeyboardShortcuts({}));
        expect(() => fireKeyDown(']', { metaKey: true })).not.toThrow();
    });

    // ── Isolation: zoom does not interfere with other shortcuts ────────────

    it('Cmd+[ does not call onZoomOut', () => {
        renderHook(() => useKeyboardShortcuts({ onZoomIn, onZoomOut }));
        fireKeyDown('[', { metaKey: true });
        expect(onZoomOut).not.toHaveBeenCalled();
    });

    it('Cmd+] does not call onZoomIn', () => {
        renderHook(() => useKeyboardShortcuts({ onZoomIn, onZoomOut }));
        fireKeyDown(']', { metaKey: true });
        expect(onZoomIn).not.toHaveBeenCalled();
    });

    // ── Overlay resistance: modifier shortcuts bypass overlay guards ───────
    // Regression guard: if [/] are ever accidentally moved to handlePlainShortcuts
    // these tests will fail, making the regression visible immediately.

    it('Cmd+[ fires onZoomIn even when Settings overlay is active', () => {
        renderHook(() => {
            useEscapeLayer(ESCAPE_PRIORITY.SETTINGS_PANEL, true, vi.fn());
            useKeyboardShortcuts({ onZoomIn });
        });
        fireKeyDown('[', { metaKey: true });
        expect(onZoomIn).toHaveBeenCalledTimes(1);
    });

    it('Cmd+] fires onZoomOut even when Settings overlay is active', () => {
        renderHook(() => {
            useEscapeLayer(ESCAPE_PRIORITY.SETTINGS_PANEL, true, vi.fn());
            useKeyboardShortcuts({ onZoomOut });
        });
        fireKeyDown(']', { metaKey: true });
        expect(onZoomOut).toHaveBeenCalledTimes(1);
    });
});
