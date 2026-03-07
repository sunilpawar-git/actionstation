/**
 * Settings Store — Tab persistence and analytics tracking tests
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { trackSettingsChanged } from '@/shared/services/analyticsService';
import { useSettingsStore } from '../settingsStore';
import {
    createLocalStorageMock,
    createMockMatchMedia,
    resetSettingsState,
} from './helpers/settingsTestSetup';

vi.mock('@/shared/services/analyticsService', () => ({
    trackSettingsChanged: vi.fn(),
}));

const localStorageMock = createLocalStorageMock();

describe('SettingsStore analytics tracking', () => {
    beforeEach(() => {
        localStorageMock.clear();
        vi.stubGlobal('localStorage', localStorageMock);
        vi.stubGlobal('matchMedia', createMockMatchMedia());
        resetSettingsState();
        vi.mocked(trackSettingsChanged).mockClear();
    });

    afterEach(() => { vi.unstubAllGlobals(); });

    it('should track theme changes', () => {
        useSettingsStore.getState().setTheme('dark');
        expect(trackSettingsChanged).toHaveBeenCalledWith('theme', 'dark');
    });

    it('should track compact mode toggle', () => {
        useSettingsStore.getState().toggleCompactMode();
        expect(trackSettingsChanged).toHaveBeenCalledWith('compactMode', true);
    });

    it('should track canvas grid toggle', () => {
        useSettingsStore.getState().toggleCanvasGrid();
        expect(trackSettingsChanged).toHaveBeenCalledWith('canvasGrid', false);
    });

    it('should track canvas free flow toggle', () => {
        useSettingsStore.getState().toggleCanvasFreeFlow();
        expect(trackSettingsChanged).toHaveBeenCalledWith('canvasFreeFlow', true);
    });

    it('should track canvas locked toggle', () => {
        useSettingsStore.getState().toggleCanvasLocked();
        expect(trackSettingsChanged).toHaveBeenCalledWith('isCanvasLocked', true);
    });

    it('should NOT track setLastSettingsTab', () => {
        useSettingsStore.getState().setLastSettingsTab('canvas');
        expect(trackSettingsChanged).not.toHaveBeenCalled();
    });

    it('should track auto-save changes', () => {
        useSettingsStore.getState().setAutoSave(false);
        expect(trackSettingsChanged).toHaveBeenCalledWith('autoSave', false);
    });

    it('should track auto-save interval changes', () => {
        useSettingsStore.getState().setAutoSaveInterval(60);
        expect(trackSettingsChanged).toHaveBeenCalledWith('autoSaveInterval', 60);
    });

    it('should track canvas scroll mode changes', () => {
        useSettingsStore.getState().setCanvasScrollMode('navigate');
        expect(trackSettingsChanged).toHaveBeenCalledWith('canvasScrollMode', 'navigate');
    });

    it('should track connector style changes', () => {
        useSettingsStore.getState().setConnectorStyle('dashed');
        expect(trackSettingsChanged).toHaveBeenCalledWith('connectorStyle', 'dashed');
    });
});

describe('SettingsStore lastSettingsTab', () => {
    beforeEach(() => {
        localStorageMock.clear();
        vi.stubGlobal('localStorage', localStorageMock);
        vi.stubGlobal('matchMedia', createMockMatchMedia());
        resetSettingsState();
    });

    afterEach(() => { vi.unstubAllGlobals(); });

    it('should default to appearance', () => {
        expect(useSettingsStore.getState().lastSettingsTab).toBe('appearance');
    });

    it('should update lastSettingsTab', () => {
        useSettingsStore.getState().setLastSettingsTab('canvas');
        expect(useSettingsStore.getState().lastSettingsTab).toBe('canvas');
    });

    it('should persist lastSettingsTab to localStorage', () => {
        useSettingsStore.getState().setLastSettingsTab('account');
        expect(localStorageMock.setItem).toHaveBeenCalledWith('settings-lastSettingsTab', 'account');
    });

    it('should load lastSettingsTab from storage', () => {
        localStorageMock.getItem.mockImplementation((key: string) => {
            if (key === 'settings-lastSettingsTab') return 'canvas';
            return null;
        });
        useSettingsStore.getState().loadFromStorage();
        expect(useSettingsStore.getState().lastSettingsTab).toBe('canvas');
    });

    it('should reject invalid lastSettingsTab value from storage', () => {
        localStorageMock.getItem.mockImplementation((key: string) => {
            if (key === 'settings-lastSettingsTab') return 'hacked';
            return null;
        });
        useSettingsStore.getState().loadFromStorage();
        expect(useSettingsStore.getState().lastSettingsTab).toBe('appearance');
    });

    it('should reject XSS payload in lastSettingsTab', () => {
        localStorageMock.getItem.mockImplementation((key: string) => {
            if (key === 'settings-lastSettingsTab') return '<script>alert(1)</script>';
            return null;
        });
        useSettingsStore.getState().loadFromStorage();
        expect(useSettingsStore.getState().lastSettingsTab).toBe('appearance');
    });
});

describe('SettingsStore autoSaveInterval clamping on load', () => {
    beforeEach(() => {
        localStorageMock.clear();
        vi.stubGlobal('localStorage', localStorageMock);
        vi.stubGlobal('matchMedia', createMockMatchMedia());
        resetSettingsState();
    });

    afterEach(() => { vi.unstubAllGlobals(); });

    it('should clamp out-of-range high value from localStorage', () => {
        localStorageMock.getItem.mockImplementation((key: string) => {
            if (key === 'settings-autoSaveInterval') return '999';
            return null;
        });
        useSettingsStore.getState().loadFromStorage();
        expect(useSettingsStore.getState().autoSaveInterval).toBe(300);
    });

    it('should clamp out-of-range low value from localStorage', () => {
        localStorageMock.getItem.mockImplementation((key: string) => {
            if (key === 'settings-autoSaveInterval') return '1';
            return null;
        });
        useSettingsStore.getState().loadFromStorage();
        expect(useSettingsStore.getState().autoSaveInterval).toBe(10);
    });

    it('should accept valid in-range value from localStorage', () => {
        localStorageMock.getItem.mockImplementation((key: string) => {
            if (key === 'settings-autoSaveInterval') return '120';
            return null;
        });
        useSettingsStore.getState().loadFromStorage();
        expect(useSettingsStore.getState().autoSaveInterval).toBe(120);
    });
});
