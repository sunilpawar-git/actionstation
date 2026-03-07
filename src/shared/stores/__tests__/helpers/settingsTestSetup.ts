/**
 * Shared test setup for settings store tests
 * SSOT for localStorage mock and matchMedia mock
 */
import { vi } from 'vitest';
import { useSettingsStore } from '../../settingsStore';

/** Creates a mock localStorage with an in-memory backing store (Storage interface compliant) */
export function createLocalStorageMock() {
    let store: Record<string, string> = {};

    const mock = {
        get length() { return Object.keys(store).length; },
        getItem: vi.fn((key: string) => store[key] ?? null),
        setItem: vi.fn((key: string, value: string) => {
            store[key] = value;
        }),
        removeItem: vi.fn((key: string) => {
            store = Object.fromEntries(
                Object.entries(store).filter(([k]) => k !== key)
            );
        }),
        clear: vi.fn(() => { store = {}; }),
        key: vi.fn((index: number) => Object.keys(store)[index] ?? null),
    };

    return mock;
}

/** Creates a mock matchMedia with configurable matches */
export function createMockMatchMedia(defaultMatches = false) {
    return vi.fn().mockImplementation((query: string) => ({
        matches: defaultMatches,
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
    }));
}

/** Default settings state for resetting between tests */
export const DEFAULT_SETTINGS_STATE = {
    theme: 'system' as const,
    canvasGrid: true,
    autoSave: true,
    autoSaveInterval: 30,
    compactMode: false,
    canvasScrollMode: 'zoom' as const,
    connectorStyle: 'solid' as const,
    isCanvasLocked: false,
    canvasFreeFlow: false,
    lastSettingsTab: 'appearance' as const,
};

/** Resets the settings store to default state */
export function resetSettingsState() {
    useSettingsStore.setState(DEFAULT_SETTINGS_STATE);
}
