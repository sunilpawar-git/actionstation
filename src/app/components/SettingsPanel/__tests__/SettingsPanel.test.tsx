/**
 * SettingsPanel Integration Tests — Tab persistence and section rendering
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SettingsPanel } from '../SettingsPanel';
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

describe('SettingsPanel', () => {
    beforeEach(() => {
        localStorageMock.clear();
        vi.stubGlobal('localStorage', localStorageMock);
        vi.stubGlobal('matchMedia', createMockMatchMedia());
        resetSettingsState();
    });

    afterEach(() => { vi.unstubAllGlobals(); });

    it('renders nothing when closed', () => {
        const { container } = render(<SettingsPanel isOpen={false} onClose={vi.fn()} />);
        expect(container.innerHTML).toBe('');
    });

    it('renders the settings title when open', () => {
        render(<SettingsPanel isOpen={true} onClose={vi.fn()} />);
        expect(screen.getByText(strings.settings.title)).toBeInTheDocument();
    });

    it('renders all tab labels', () => {
        render(<SettingsPanel isOpen={true} onClose={vi.fn()} />);
        expect(screen.getByText(strings.settings.appearance)).toBeInTheDocument();
        expect(screen.getByText(strings.settings.canvas)).toBeInTheDocument();
        expect(screen.getByText(strings.settings.account)).toBeInTheDocument();
        expect(screen.getByText(strings.settings.keyboard)).toBeInTheDocument();
        expect(screen.getByText(strings.settings.about)).toBeInTheDocument();
    });

    it('updates store when tab is clicked', () => {
        render(<SettingsPanel isOpen={true} onClose={vi.fn()} />);
        fireEvent.click(screen.getByText(strings.settings.canvas));
        expect(useSettingsStore.getState().lastSettingsTab).toBe('canvas');
    });

    it('persists tab selection across unmount and remount', () => {
        const { unmount } = render(<SettingsPanel isOpen={true} onClose={vi.fn()} />);
        fireEvent.click(screen.getByText(strings.settings.canvas));
        unmount();

        render(<SettingsPanel isOpen={true} onClose={vi.fn()} />);
        expect(useSettingsStore.getState().lastSettingsTab).toBe('canvas');
    });

    it('calls onClose when backdrop is clicked', () => {
        const onClose = vi.fn();
        render(<SettingsPanel isOpen={true} onClose={onClose} />);
        fireEvent.click(screen.getByTestId('settings-backdrop'));
        expect(onClose).toHaveBeenCalledOnce();
    });
});
