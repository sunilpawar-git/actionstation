import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ZoomControls } from '../ZoomControls';
import { useSettingsStore } from '@/shared/stores/settingsStore';
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
});
