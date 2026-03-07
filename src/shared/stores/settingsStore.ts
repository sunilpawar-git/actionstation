/**
 * Settings Store - State management for app preferences
 * SSOT for theme, canvas settings, and user preferences
 */
import { create } from 'zustand';
import { getStorageItem, getValidatedStorageItem, setStorageItem } from '@/shared/utils/storage';
import { trackSettingsChanged } from '@/shared/services/analyticsService';

export type ThemeOption = 'light' | 'dark' | 'system' | 'sepia' | 'grey' | 'darkBlack';
type ResolvedTheme = 'light' | 'dark' | 'sepia' | 'grey' | 'darkBlack';

/** Direct themes that resolve to themselves (not 'system') */
const DIRECT_THEMES: ReadonlySet<string> = new Set(['light', 'dark', 'sepia', 'grey', 'darkBlack']);

export type CanvasScrollMode = 'zoom' | 'navigate';
export type ConnectorStyle = 'solid' | 'subtle' | 'thick' | 'dashed' | 'dotted';
export type SettingsTabId = 'appearance' | 'canvas' | 'account' | 'keyboard' | 'about';

/** Allow-lists for validated storage reads (defense-in-depth) */
const VALID_THEMES: readonly ThemeOption[] = ['light', 'dark', 'system', 'sepia', 'grey', 'darkBlack'];
const VALID_SCROLL_MODES: readonly CanvasScrollMode[] = ['zoom', 'navigate'];
const VALID_CONNECTOR_STYLES: readonly ConnectorStyle[] = ['solid', 'subtle', 'thick', 'dashed', 'dotted'];
const VALID_SETTINGS_TABS: readonly SettingsTabId[] = ['appearance', 'canvas', 'account', 'keyboard', 'about'];

// Storage keys
const STORAGE_KEYS = {
    theme: 'settings-theme',
    canvasGrid: 'settings-canvasGrid',
    autoSave: 'settings-autoSave',
    autoSaveInterval: 'settings-autoSaveInterval',
    compactMode: 'settings-compactMode',
    canvasScrollMode: 'settings-canvasScrollMode',
    connectorStyle: 'settings-connectorStyle',
    isCanvasLocked: 'settings-isCanvasLocked',
    canvasFreeFlow: 'settings-canvasFreeFlow',
    autoAnalyzeDocuments: 'settings-autoAnalyzeDocuments',
    lastSettingsTab: 'settings-lastSettingsTab',
} as const;

// Constants
const AUTO_SAVE_MIN = 10;
const AUTO_SAVE_MAX = 300;
const AUTO_SAVE_DEFAULT = 30;

interface SettingsState {
    theme: ThemeOption;
    canvasGrid: boolean;
    autoSave: boolean;
    autoSaveInterval: number;
    compactMode: boolean;
    canvasScrollMode: CanvasScrollMode;
    connectorStyle: ConnectorStyle;
    isCanvasLocked: boolean;
    canvasFreeFlow: boolean;
    autoAnalyzeDocuments: boolean;
    lastSettingsTab: SettingsTabId;
    setTheme: (theme: ThemeOption) => void;
    toggleCanvasGrid: () => void;
    setAutoSave: (enabled: boolean) => void;
    setAutoSaveInterval: (seconds: number) => void;
    toggleCompactMode: () => void;
    setCanvasScrollMode: (mode: CanvasScrollMode) => void;
    setConnectorStyle: (style: ConnectorStyle) => void;
    toggleCanvasLocked: () => void;
    toggleCanvasFreeFlow: () => void;
    toggleAutoAnalyzeDocuments: () => void;
    setLastSettingsTab: (tab: SettingsTabId) => void;
    getResolvedTheme: () => ResolvedTheme;
    loadFromStorage: () => void;
}

function clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
}

function getClampedStorageItem(key: string, defaultVal: number, min: number, max: number): number {
    return clamp(getStorageItem<number>(key, defaultVal), min, max);
}

export const useSettingsStore = create<SettingsState>()((set, get) => ({
    theme: getValidatedStorageItem(STORAGE_KEYS.theme, 'system', VALID_THEMES),
    canvasGrid: getStorageItem<boolean>(STORAGE_KEYS.canvasGrid, true),
    autoSave: getStorageItem<boolean>(STORAGE_KEYS.autoSave, true),
    autoSaveInterval: getClampedStorageItem(STORAGE_KEYS.autoSaveInterval, AUTO_SAVE_DEFAULT, AUTO_SAVE_MIN, AUTO_SAVE_MAX),
    compactMode: getStorageItem<boolean>(STORAGE_KEYS.compactMode, false),
    canvasScrollMode: getValidatedStorageItem(STORAGE_KEYS.canvasScrollMode, 'zoom', VALID_SCROLL_MODES),
    connectorStyle: getValidatedStorageItem(STORAGE_KEYS.connectorStyle, 'solid', VALID_CONNECTOR_STYLES),
    isCanvasLocked: getStorageItem<boolean>(STORAGE_KEYS.isCanvasLocked, false),
    canvasFreeFlow: getStorageItem<boolean>(STORAGE_KEYS.canvasFreeFlow, false),
    autoAnalyzeDocuments: getStorageItem<boolean>(STORAGE_KEYS.autoAnalyzeDocuments, true),
    lastSettingsTab: getValidatedStorageItem(STORAGE_KEYS.lastSettingsTab, 'appearance', VALID_SETTINGS_TABS),
    setTheme: (theme: ThemeOption) => { set({ theme }); setStorageItem(STORAGE_KEYS.theme, theme); trackSettingsChanged('theme', theme); },
    toggleCanvasGrid: () => {
        const v = !get().canvasGrid; set({ canvasGrid: v }); setStorageItem(STORAGE_KEYS.canvasGrid, v); trackSettingsChanged('canvasGrid', v);
    },
    setAutoSave: (enabled: boolean) => { set({ autoSave: enabled }); setStorageItem(STORAGE_KEYS.autoSave, enabled); trackSettingsChanged('autoSave', enabled); },
    setAutoSaveInterval: (seconds: number) => {
        const clamped = clamp(seconds, AUTO_SAVE_MIN, AUTO_SAVE_MAX);
        set({ autoSaveInterval: clamped }); setStorageItem(STORAGE_KEYS.autoSaveInterval, clamped); trackSettingsChanged('autoSaveInterval', clamped);
    },
    toggleCompactMode: () => {
        const v = !get().compactMode; set({ compactMode: v }); setStorageItem(STORAGE_KEYS.compactMode, v); trackSettingsChanged('compactMode', v);
    },
    setCanvasScrollMode: (mode: CanvasScrollMode) => { set({ canvasScrollMode: mode }); setStorageItem(STORAGE_KEYS.canvasScrollMode, mode); trackSettingsChanged('canvasScrollMode', mode); },
    setConnectorStyle: (style: ConnectorStyle) => { set({ connectorStyle: style }); setStorageItem(STORAGE_KEYS.connectorStyle, style); trackSettingsChanged('connectorStyle', style); },
    toggleCanvasLocked: () => {
        const v = !get().isCanvasLocked; set({ isCanvasLocked: v }); setStorageItem(STORAGE_KEYS.isCanvasLocked, v); trackSettingsChanged('isCanvasLocked', v);
    },
    toggleCanvasFreeFlow: () => {
        const v = !get().canvasFreeFlow; set({ canvasFreeFlow: v }); setStorageItem(STORAGE_KEYS.canvasFreeFlow, v); trackSettingsChanged('canvasFreeFlow', v);
    },
    toggleAutoAnalyzeDocuments: () => {
        const v = !get().autoAnalyzeDocuments; set({ autoAnalyzeDocuments: v }); setStorageItem(STORAGE_KEYS.autoAnalyzeDocuments, v); trackSettingsChanged('autoAnalyzeDocuments', v);
    },
    setLastSettingsTab: (tab: SettingsTabId) => { set({ lastSettingsTab: tab }); setStorageItem(STORAGE_KEYS.lastSettingsTab, tab); },
    getResolvedTheme: (): ResolvedTheme => {
        const { theme } = get();
        if (DIRECT_THEMES.has(theme)) return theme as ResolvedTheme;
        if (typeof window !== 'undefined') {
            return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        }
        return 'light';
    },
    loadFromStorage: () => {
        set({
            theme: getValidatedStorageItem(STORAGE_KEYS.theme, 'system', VALID_THEMES),
            canvasGrid: getStorageItem<boolean>(STORAGE_KEYS.canvasGrid, true),
            autoSave: getStorageItem<boolean>(STORAGE_KEYS.autoSave, true),
            autoSaveInterval: getClampedStorageItem(STORAGE_KEYS.autoSaveInterval, AUTO_SAVE_DEFAULT, AUTO_SAVE_MIN, AUTO_SAVE_MAX),
            compactMode: getStorageItem<boolean>(STORAGE_KEYS.compactMode, false),
            canvasScrollMode: getValidatedStorageItem(STORAGE_KEYS.canvasScrollMode, 'zoom', VALID_SCROLL_MODES),
            connectorStyle: getValidatedStorageItem(STORAGE_KEYS.connectorStyle, 'solid', VALID_CONNECTOR_STYLES),
            isCanvasLocked: getStorageItem<boolean>(STORAGE_KEYS.isCanvasLocked, false),
            canvasFreeFlow: getStorageItem<boolean>(STORAGE_KEYS.canvasFreeFlow, false),
            autoAnalyzeDocuments: getStorageItem<boolean>(STORAGE_KEYS.autoAnalyzeDocuments, true),
            lastSettingsTab: getValidatedStorageItem(STORAGE_KEYS.lastSettingsTab, 'appearance', VALID_SETTINGS_TABS),
        });
    },
}));
