import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ZoomControls } from '../ZoomControls';
import { useSettingsStore } from '@/shared/stores/settingsStore';
import { useHistoryStore } from '../../stores/historyStore';
import { strings } from '@/shared/localization/strings';
import { ReactFlowProvider } from '@xyflow/react';

// Mock useReactFlow
const mockZoomIn = vi.fn();
const mockZoomOut = vi.fn();

vi.mock('@xyflow/react', async (importOriginal) => {
    const original = await importOriginal<typeof import('@xyflow/react')>();
    return {
        ...original,
        useReactFlow: () => ({
            zoomIn: mockZoomIn,
            zoomOut: mockZoomOut,
        }),
    };
});

describe('ZoomControls', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Reset settings store
        useSettingsStore.setState({ isCanvasLocked: false });
        // Reset history store
        useHistoryStore.getState().dispatch({ type: 'CLEAR' });
    });

    const renderWithProvider = (component: React.ReactNode) => {
        return render(<ReactFlowProvider>{component}</ReactFlowProvider>);
    };

    const zc = strings.canvas.zoomControls;

    it('should render all 3 buttons with localized labels', () => {
        renderWithProvider(<ZoomControls />);

        expect(screen.getByLabelText(zc.zoomIn)).toBeInTheDocument();
        expect(screen.getByLabelText(zc.zoomOut)).toBeInTheDocument();
        expect(screen.getByLabelText(new RegExp(`${zc.lockCanvas}|${zc.unlockCanvas}`))).toBeInTheDocument();
    });

    it('should call zoomIn when + is clicked', () => {
        renderWithProvider(<ZoomControls />);

        fireEvent.click(screen.getByLabelText(zc.zoomIn));
        expect(mockZoomIn).toHaveBeenCalledTimes(1);
    });

    it('should call zoomOut when - is clicked', () => {
        renderWithProvider(<ZoomControls />);

        fireEvent.click(screen.getByLabelText(zc.zoomOut));
        expect(mockZoomOut).toHaveBeenCalledTimes(1);
    });



    it('should toggle lock state when lock button is clicked', () => {
        renderWithProvider(<ZoomControls />);

        const lockButton = screen.getByTestId('lock-button');

        expect(useSettingsStore.getState().isCanvasLocked).toBe(false);
        expect(lockButton).toHaveAttribute('aria-label', zc.lockCanvas);

        fireEvent.click(lockButton);
        expect(useSettingsStore.getState().isCanvasLocked).toBe(true);
        expect(lockButton).toHaveAttribute('aria-label', zc.unlockCanvas);

        fireEvent.click(lockButton);
        expect(useSettingsStore.getState().isCanvasLocked).toBe(false);
    });

    it('should reflect initial locked state', () => {
        useSettingsStore.setState({ isCanvasLocked: true });
        renderWithProvider(<ZoomControls />);

        const lockButton = screen.getByTestId('lock-button');
        expect(lockButton).toHaveAttribute('aria-label', zc.unlockCanvas);
    });

    // ── Undo/Redo button tests ─────────────────────────────────────────────

    const hc = strings.canvas.history;

    it('should render undo button with correct aria-label', () => {
        renderWithProvider(<ZoomControls />);
        expect(screen.getByTestId('undo-button')).toHaveAttribute('aria-label', hc.undoButton);
    });

    it('should render redo button with correct aria-label', () => {
        renderWithProvider(<ZoomControls />);
        expect(screen.getByTestId('redo-button')).toHaveAttribute('aria-label', hc.redoButton);
    });

    it('undo button is disabled when undoStack is empty', () => {
        renderWithProvider(<ZoomControls />);
        expect(screen.getByTestId('undo-button')).toBeDisabled();
    });

    it('redo button is disabled when redoStack is empty', () => {
        renderWithProvider(<ZoomControls />);
        expect(screen.getByTestId('redo-button')).toBeDisabled();
    });

    it('undo button is enabled when undoStack has entries', () => {
        useHistoryStore.getState().dispatch({
            type: 'PUSH',
            command: { type: 'deleteNode', timestamp: Date.now(), undo: vi.fn(), redo: vi.fn() },
        });
        renderWithProvider(<ZoomControls />);
        expect(screen.getByTestId('undo-button')).not.toBeDisabled();
    });

    it('clicking undo button dispatches UNDO to historyStore', () => {
        const undoFn = vi.fn();
        useHistoryStore.getState().dispatch({
            type: 'PUSH',
            command: { type: 'deleteNode', timestamp: Date.now(), undo: undoFn, redo: vi.fn() },
        });
        renderWithProvider(<ZoomControls />);
        fireEvent.click(screen.getByTestId('undo-button'));
        expect(undoFn).toHaveBeenCalledOnce();
    });

    it('clicking redo button dispatches REDO to historyStore', () => {
        const redoFn = vi.fn();
        useHistoryStore.getState().dispatch({
            type: 'PUSH',
            command: { type: 'deleteNode', timestamp: Date.now(), undo: vi.fn(), redo: redoFn },
        });
        useHistoryStore.getState().dispatch({ type: 'UNDO' });
        renderWithProvider(<ZoomControls />);
        fireEvent.click(screen.getByTestId('redo-button'));
        expect(redoFn).toHaveBeenCalledOnce();
    });

    it('divider renders between undo/redo and zoom buttons', () => {
        const { container } = renderWithProvider(<ZoomControls />);
        const dividers = container.querySelectorAll('[class*="divider"]');
        expect(dividers.length).toBeGreaterThanOrEqual(1);
    });

    // ── Locked canvas — zoom buttons disabled ──────────────────────────────

    it('+ button is disabled when canvas is locked', () => {
        useSettingsStore.setState({ isCanvasLocked: true });
        renderWithProvider(<ZoomControls />);
        expect(screen.getByLabelText(zc.zoomIn)).toBeDisabled();
    });

    it('− button is disabled when canvas is locked', () => {
        useSettingsStore.setState({ isCanvasLocked: true });
        renderWithProvider(<ZoomControls />);
        expect(screen.getByLabelText(zc.zoomOut)).toBeDisabled();
    });

    it('does not call zoomIn when + button clicked while locked', () => {
        useSettingsStore.setState({ isCanvasLocked: true });
        renderWithProvider(<ZoomControls />);
        fireEvent.click(screen.getByLabelText(zc.zoomIn));
        expect(mockZoomIn).not.toHaveBeenCalled();
    });

    it('does not call zoomOut when − button clicked while locked', () => {
        useSettingsStore.setState({ isCanvasLocked: true });
        renderWithProvider(<ZoomControls />);
        fireEvent.click(screen.getByLabelText(zc.zoomOut));
        expect(mockZoomOut).not.toHaveBeenCalled();
    });

    it('+ and − buttons are enabled when canvas is unlocked', () => {
        renderWithProvider(<ZoomControls />);
        expect(screen.getByLabelText(zc.zoomIn)).not.toBeDisabled();
        expect(screen.getByLabelText(zc.zoomOut)).not.toBeDisabled();
    });
});
