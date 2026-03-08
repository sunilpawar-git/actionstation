/**
 * Tests for UndoRedoButtons component
 *
 * Covers: disabled state when stacks are empty, enabled when stacks are populated,
 * click dispatch, and correct accessibility attributes.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { UndoRedoButtons } from '../UndoRedoButtons';
import { useHistoryStore } from '../../stores/historyStore';
import type { CanvasCommand } from '../../types/history';

// Mock CSS module (ZoomControls.module.css)
vi.mock('../ZoomControls.module.css', () => ({
    default: { button: 'button', disabled: 'disabled' },
}));

// Mock analytics + toast so history dispatch has no external side effects
vi.mock('@/shared/services/analyticsService', () => ({
    trackCanvasUndo: vi.fn(),
    trackCanvasRedo: vi.fn(),
}));
vi.mock('@/shared/stores/toastStore', () => ({
    toast: { info: vi.fn(), error: vi.fn(), success: vi.fn() },
}));

function makeCmd(): CanvasCommand {
    return { type: 'deleteNode', timestamp: Date.now(), undo: vi.fn(), redo: vi.fn() };
}

describe('UndoRedoButtons', () => {
    beforeEach(() => {
        useHistoryStore.getState().dispatch({ type: 'CLEAR' });
        vi.clearAllMocks();
    });

    it('undo button is disabled when undoStack is empty', () => {
        render(<UndoRedoButtons />);
        expect(screen.getByTestId('undo-button')).toBeDisabled();
    });

    it('redo button is disabled when redoStack is empty', () => {
        render(<UndoRedoButtons />);
        expect(screen.getByTestId('redo-button')).toBeDisabled();
    });

    it('undo button is enabled when undoStack has entries', () => {
        useHistoryStore.getState().dispatch({ type: 'PUSH', command: makeCmd() });
        render(<UndoRedoButtons />);
        expect(screen.getByTestId('undo-button')).not.toBeDisabled();
    });

    it('redo button is enabled after an undo', () => {
        useHistoryStore.getState().dispatch({ type: 'PUSH', command: makeCmd() });
        useHistoryStore.getState().dispatch({ type: 'UNDO' });
        render(<UndoRedoButtons />);
        expect(screen.getByTestId('redo-button')).not.toBeDisabled();
    });

    it('clicking undo button dispatches UNDO with source=button', () => {
        const cmd = makeCmd();
        useHistoryStore.getState().dispatch({ type: 'PUSH', command: cmd });

        render(<UndoRedoButtons />);
        fireEvent.click(screen.getByTestId('undo-button'));

        expect(cmd.undo).toHaveBeenCalledOnce();
        // After UNDO the undoStack should be empty
        expect(useHistoryStore.getState().undoStack).toHaveLength(0);
        expect(useHistoryStore.getState().redoStack).toHaveLength(1);
    });

    it('clicking redo button dispatches REDO with source=button', () => {
        const cmd = makeCmd();
        useHistoryStore.getState().dispatch({ type: 'PUSH', command: cmd });
        useHistoryStore.getState().dispatch({ type: 'UNDO' });

        render(<UndoRedoButtons />);
        fireEvent.click(screen.getByTestId('redo-button'));

        expect(cmd.redo).toHaveBeenCalledOnce();
        expect(useHistoryStore.getState().undoStack).toHaveLength(1);
        expect(useHistoryStore.getState().redoStack).toHaveLength(0);
    });

    it('undo button has an aria-label', () => {
        render(<UndoRedoButtons />);
        expect(screen.getByTestId('undo-button')).toHaveAttribute('aria-label');
    });

    it('redo button has an aria-label', () => {
        render(<UndoRedoButtons />);
        expect(screen.getByTestId('redo-button')).toHaveAttribute('aria-label');
    });
});
