/**
 * Settings Store Validation Tests
 * localStorage persistence, invalid value defense, and mock compliance tests.
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
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
const mockMatchMedia = createMockMatchMedia();

describe('SettingsStore — localStorage persistence', () => {
    beforeEach(() => {
        localStorageMock.clear();
        vi.stubGlobal('localStorage', localStorageMock);
        vi.stubGlobal('matchMedia', mockMatchMedia);
        resetSettingsState();
    });

    afterEach(() => { vi.unstubAllGlobals(); });

    it('should load theme from localStorage via loadFromStorage', () => {
        localStorageMock.getItem.mockImplementation((key: string) => {
            if (key === 'settings-theme') return 'dark';
            return null;
        });
        useSettingsStore.getState().loadFromStorage();
        expect(localStorageMock.getItem).toHaveBeenCalledWith('settings-theme');
        expect(useSettingsStore.getState().theme).toBe('dark');
    });
});

describe('SettingsStore — invalid localStorage values (defense-in-depth)', () => {
    beforeEach(() => {
        localStorageMock.clear();
        vi.stubGlobal('localStorage', localStorageMock);
        vi.stubGlobal('matchMedia', mockMatchMedia);
        resetSettingsState();
    });

    afterEach(() => { vi.unstubAllGlobals(); });

    it('should fall back to default theme for invalid stored value', () => {
        localStorageMock.getItem.mockImplementation((key: string) => {
            if (key === 'settings-theme') return 'hackedTheme';
            return null;
        });
        useSettingsStore.getState().loadFromStorage();
        expect(useSettingsStore.getState().theme).toBe('system');
    });

    it('should fall back to default theme for empty string', () => {
        localStorageMock.getItem.mockImplementation((key: string) => {
            if (key === 'settings-theme') return '';
            return null;
        });
        useSettingsStore.getState().loadFromStorage();
        expect(useSettingsStore.getState().theme).toBe('system');
    });

    it('should fall back to default scroll mode for invalid stored value', () => {
        localStorageMock.getItem.mockImplementation((key: string) => {
            if (key === 'settings-canvasScrollMode') return 'fly';
            return null;
        });
        useSettingsStore.getState().loadFromStorage();
        expect(useSettingsStore.getState().canvasScrollMode).toBe('zoom');
    });

    it('should fall back to default connector style for invalid stored value', () => {
        localStorageMock.getItem.mockImplementation((key: string) => {
            if (key === 'settings-connectorStyle') return 'zigzag';
            return null;
        });
        useSettingsStore.getState().loadFromStorage();
        expect(useSettingsStore.getState().connectorStyle).toBe('regular');
    });

    it('should reject XSS payload in theme value', () => {
        localStorageMock.getItem.mockImplementation((key: string) => {
            if (key === 'settings-theme') return '<script>alert(1)</script>';
            return null;
        });
        useSettingsStore.getState().loadFromStorage();
        expect(useSettingsStore.getState().theme).toBe('system');
    });
});

describe('createLocalStorageMock — Storage interface compliance', () => {
    it('exposes a length property reflecting number of stored keys', () => {
        const mock = createLocalStorageMock();
        expect(mock.length).toBe(0);
        mock.setItem('a', '1');
        expect(mock.length).toBe(1);
        mock.setItem('b', '2');
        expect(mock.length).toBe(2);
        mock.removeItem('a');
        expect(mock.length).toBe(1);
        mock.clear();
        expect(mock.length).toBe(0);
    });

    it('returns the key at a given index via key()', () => {
        const mock = createLocalStorageMock();
        mock.setItem('x', 'val');
        expect(mock.key(0)).toBe('x');
        expect(mock.key(1)).toBeNull();
    });

    it('key() returns null for out-of-bounds index', () => {
        const mock = createLocalStorageMock();
        expect(mock.key(0)).toBeNull();
        expect(mock.key(-1)).toBeNull();
    });
});
