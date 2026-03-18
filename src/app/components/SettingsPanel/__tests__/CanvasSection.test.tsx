/**
 * CanvasSection Tests — Canvas settings: display toggles, scroll mode, connector style, auto-save slider
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CanvasSection } from '../sections/CanvasSection';
import { useSettingsStore } from '@/shared/stores/settingsStore';
import { strings } from '@/shared/localization/strings';
import {
    createLocalStorageMock,
    createMockMatchMedia,
    resetSettingsState,
} from '@/shared/stores/__tests__/helpers/settingsTestSetup';

vi.mock('@/shared/services/analyticsService', () => ({
    trackSettingsChanged: vi.fn(),
}));

const localStorageMock = createLocalStorageMock();

describe('CanvasSection', () => {
    beforeEach(() => {
        localStorageMock.clear();
        vi.stubGlobal('localStorage', localStorageMock);
        vi.stubGlobal('matchMedia', createMockMatchMedia());
        resetSettingsState();
    });

    afterEach(() => { vi.unstubAllGlobals(); });

    it('renders display section with grid and free flow toggles', () => {
        render(<CanvasSection />);
        expect(screen.getByText(strings.settings.displayGroup)).toBeInTheDocument();
        expect(screen.getByText(strings.settings.canvasGrid)).toBeInTheDocument();
        expect(screen.getByText(strings.settings.freeFlow)).toBeInTheDocument();
    });

    it('renders auto-save section', () => {
        render(<CanvasSection />);
        const matches = screen.getAllByText(strings.settings.autoSave);
        expect(matches.length).toBeGreaterThanOrEqual(1);
    });

    describe('auto-save interval slider', () => {
        it('shows slider when auto-save is enabled', () => {
            useSettingsStore.setState({ autoSave: true });
            render(<CanvasSection />);
            expect(screen.getByRole('slider')).toBeInTheDocument();
        });

        it('hides slider when auto-save is disabled', () => {
            useSettingsStore.setState({ autoSave: false });
            render(<CanvasSection />);
            expect(screen.queryByRole('slider')).not.toBeInTheDocument();
        });

        it('displays current interval value', () => {
            useSettingsStore.setState({ autoSave: true, autoSaveInterval: 60 });
            render(<CanvasSection />);
            expect(screen.getByText(`60 ${strings.settings.seconds}`)).toBeInTheDocument();
        });

        it('calls setAutoSaveInterval when slider changes', () => {
            useSettingsStore.setState({ autoSave: true, autoSaveInterval: 30 });
            render(<CanvasSection />);
            const slider = screen.getByRole('slider');
            fireEvent.change(slider, { target: { value: '120' } });
            expect(useSettingsStore.getState().autoSaveInterval).toBe(120);
        });
    });

    describe('auto-analyze documents toggle', () => {
        it('renders the auto-analyze toggle with label', () => {
            render(<CanvasSection />);
            expect(screen.getByText(strings.settings.autoAnalyzeDocuments)).toBeInTheDocument();
        });

        it('reflects autoAnalyzeDocuments setting state', () => {
            useSettingsStore.setState({ autoAnalyzeDocuments: true });
            render(<CanvasSection />);
            const toggle = screen.getByRole('switch', {
                name: new RegExp(strings.settings.autoAnalyzeDocuments, 'i'),
            });
            expect(toggle).toBeChecked();
        });

        it('toggles autoAnalyzeDocuments when clicked', () => {
            useSettingsStore.setState({ autoAnalyzeDocuments: true });
            render(<CanvasSection />);
            const toggle = screen.getByRole('switch', {
                name: new RegExp(strings.settings.autoAnalyzeDocuments, 'i'),
            });
            fireEvent.click(toggle);
            expect(useSettingsStore.getState().autoAnalyzeDocuments).toBe(false);
        });
    });
});
