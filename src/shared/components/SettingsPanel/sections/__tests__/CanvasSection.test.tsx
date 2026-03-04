/**
 * Canvas Section Tests - TDD for canvas settings UI
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CanvasSection } from '@/app/components/SettingsPanel/sections/CanvasSection';
import { useSettingsStore } from '@/shared/stores/settingsStore';
import { strings } from '@/shared/localization/strings';
import { createMockSettingsState } from '@/shared/__tests__/helpers/mockSettingsState';

const mockToggleCanvasGrid = vi.fn();
const mockToggleCanvasFreeFlow = vi.fn();
const mockSetAutoSave = vi.fn();
const mockSetCanvasScrollMode = vi.fn();
const mockSetConnectorStyle = vi.fn();
const mockToggleAutoAnalyzeDocuments = vi.fn();

function buildCanvasSettingsState(overrides?: Record<string, unknown>) {
    return createMockSettingsState({
        connectorStyle: 'solid' as const,
        toggleCanvasGrid: mockToggleCanvasGrid,
        toggleCanvasFreeFlow: mockToggleCanvasFreeFlow,
        setAutoSave: mockSetAutoSave,
        setCanvasScrollMode: mockSetCanvasScrollMode,
        setConnectorStyle: mockSetConnectorStyle,
        toggleAutoAnalyzeDocuments: mockToggleAutoAnalyzeDocuments,
        ...overrides,
    });
}

vi.mock('@/shared/stores/settingsStore', () => {
    const selectorFn = vi.fn((selector?: (s: Record<string, unknown>) => unknown) => {
        const state = buildCanvasSettingsState();
        return typeof selector === 'function' ? selector(state) : state;
    });
    Object.assign(selectorFn, { getState: () => buildCanvasSettingsState() });
    return { useSettingsStore: selectorFn };
});

function applyOverrides(overrides: Record<string, unknown>) {
    const impl = (selector?: (s: Record<string, unknown>) => unknown) => {
        const state = buildCanvasSettingsState(overrides);
        return typeof selector === 'function' ? selector(state) : state;
    };
    vi.mocked(useSettingsStore).mockImplementation(impl as unknown as typeof useSettingsStore);
    Object.assign(useSettingsStore, { getState: () => buildCanvasSettingsState(overrides) });
}

describe('CanvasSection', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        Object.assign(useSettingsStore, { getState: () => buildCanvasSettingsState() });
    });

    it('should render free flow toggle', () => {
        render(<CanvasSection />);
        expect(screen.getByText(strings.settings.freeFlow)).toBeInTheDocument();
    });

    it('should reflect canvasFreeFlow state in switch', () => {
        applyOverrides({ canvasFreeFlow: true });

        render(<CanvasSection />);
        const freeFlowSwitch = screen.getByRole('switch', { name: strings.settings.freeFlow });
        expect(freeFlowSwitch).toHaveAttribute('aria-checked', 'true');
    });

    it('should call toggleCanvasFreeFlow when free flow toggle is clicked', () => {
        render(<CanvasSection />);
        const freeFlowSwitch = screen.getByRole('switch', { name: strings.settings.freeFlow });
        fireEvent.click(freeFlowSwitch);
        expect(mockToggleCanvasFreeFlow).toHaveBeenCalledOnce();
    });

    it('should render canvas grid toggle', () => {
        render(<CanvasSection />);
        expect(screen.getAllByText(strings.settings.canvasGrid).length).toBeGreaterThan(0);
    });

    it('should render auto-save toggle', () => {
        render(<CanvasSection />);
        expect(screen.getAllByText(strings.settings.autoSave).length).toBeGreaterThan(0);
    });

    it('should render scroll mode section', () => {
        render(<CanvasSection />);
        expect(screen.getByText(strings.settings.canvasScrollMode)).toBeInTheDocument();
    });

    it('should display zoom and navigate scroll mode options', () => {
        render(<CanvasSection />);
        expect(screen.getByLabelText(strings.settings.canvasScrollZoom)).toBeInTheDocument();
        expect(screen.getByLabelText(strings.settings.canvasScrollNavigate)).toBeInTheDocument();
    });

    it('should have zoom mode selected by default', () => {
        render(<CanvasSection />);
        const zoomOption = screen.getByLabelText(strings.settings.canvasScrollZoom);
        expect(zoomOption).toBeChecked();
    });

    it('should call setCanvasScrollMode when navigate is selected', () => {
        render(<CanvasSection />);
        const navigateOption = screen.getByLabelText(strings.settings.canvasScrollNavigate);
        fireEvent.click(navigateOption);
        expect(mockSetCanvasScrollMode).toHaveBeenCalledWith('navigate');
    });

    it('should call setCanvasScrollMode when zoom is selected', () => {
        applyOverrides({ canvasScrollMode: 'navigate' as const });

        render(<CanvasSection />);
        const zoomOption = screen.getByLabelText(strings.settings.canvasScrollZoom);
        fireEvent.click(zoomOption);
        expect(mockSetCanvasScrollMode).toHaveBeenCalledWith('zoom');
    });

    it('should render connector style section', () => {
        render(<CanvasSection />);
        expect(screen.getByText(strings.settings.connectorStyle)).toBeInTheDocument();
    });

    it('should display solid, subtle, thick, dashed, and dotted connector options', () => {
        render(<CanvasSection />);
        expect(screen.getByLabelText(strings.settings.connectorSolid)).toBeInTheDocument();
        expect(screen.getByLabelText(strings.settings.connectorSubtle)).toBeInTheDocument();
        expect(screen.getByLabelText(strings.settings.connectorThick)).toBeInTheDocument();
        expect(screen.getByLabelText(strings.settings.connectorDashed)).toBeInTheDocument();
        expect(screen.getByLabelText(strings.settings.connectorDotted)).toBeInTheDocument();
    });

    it('should have solid style selected by default', () => {
        render(<CanvasSection />);
        const solidOption = screen.getByLabelText(strings.settings.connectorSolid);
        expect(solidOption).toBeChecked();
    });

    it('should call setConnectorStyle when thick is selected', () => {
        render(<CanvasSection />);
        const thickOption = screen.getByLabelText(strings.settings.connectorThick);
        fireEvent.click(thickOption);
        expect(mockSetConnectorStyle).toHaveBeenCalledWith('thick');
    });

    it('should render auto-analyze documents toggle', () => {
        render(<CanvasSection />);
        expect(screen.getByText(strings.settings.autoAnalyzeDocuments)).toBeInTheDocument();
    });

    it('should reflect autoAnalyzeDocuments state in switch', () => {
        applyOverrides({ autoAnalyzeDocuments: false });

        render(<CanvasSection />);
        const switchEl = screen.getByRole('switch', { name: /Auto-analyze documents/ });
        expect(switchEl).toHaveAttribute('aria-checked', 'false');
    });

    it('should call toggleAutoAnalyzeDocuments when the toggle switch is clicked', () => {
        render(<CanvasSection />);
        const switchEl = screen.getByRole('switch', { name: /Auto-analyze documents/ });
        fireEvent.click(switchEl);
        expect(mockToggleAutoAnalyzeDocuments).toHaveBeenCalledOnce();
    });

    it('should call toggleAutoAnalyzeDocuments when the label text is clicked', () => {
        render(<CanvasSection />);
        fireEvent.click(screen.getByText(strings.settings.autoAnalyzeDocuments));
        expect(mockToggleAutoAnalyzeDocuments).toHaveBeenCalledOnce();
    });
});
