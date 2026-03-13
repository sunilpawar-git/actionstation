/**
 * Shared mock factory for useSettingsStore in component tests
 * SSOT: single place to update when SettingsState interface changes
 */
import { vi } from 'vitest';
import type {
    ThemeOption,
    ConnectorStyle,
    CanvasScrollMode,
    SettingsTabId,
} from '@/shared/stores/settingsStore';
import type { ActionId } from '@/shared/stores/iconRegistry';
import { DEFAULT_UTILS_BAR, DEFAULT_CONTEXT_MENU } from '@/shared/stores/iconRegistry';

/** Strongly-typed overrides — only valid SettingsState keys accepted */
export interface MockSettingsOverrides {
    theme?: ThemeOption;
    canvasGrid?: boolean;
    autoSave?: boolean;
    autoSaveInterval?: number;
    compactMode?: boolean;
    canvasScrollMode?: CanvasScrollMode;
    connectorStyle?: ConnectorStyle;
    isCanvasLocked?: boolean;
    canvasFreeFlow?: boolean;
    lastSettingsTab?: SettingsTabId;
    setTheme?: ReturnType<typeof vi.fn>;
    toggleCanvasGrid?: ReturnType<typeof vi.fn>;
    setAutoSave?: ReturnType<typeof vi.fn>;
    setAutoSaveInterval?: ReturnType<typeof vi.fn>;
    toggleCompactMode?: ReturnType<typeof vi.fn>;
    setCanvasScrollMode?: ReturnType<typeof vi.fn>;
    setConnectorStyle?: ReturnType<typeof vi.fn>;
    toggleCanvasLocked?: ReturnType<typeof vi.fn>;
    toggleCanvasFreeFlow?: ReturnType<typeof vi.fn>;
    setLastSettingsTab?: ReturnType<typeof vi.fn>;
    getResolvedTheme?: () => 'light' | 'dark' | 'sepia' | 'grey' | 'darkBlack';
    loadFromStorage?: ReturnType<typeof vi.fn>;
    autoAnalyzeDocuments?: boolean;
    toggleAutoAnalyzeDocuments?: ReturnType<typeof vi.fn>;
    utilsBarIcons?: ActionId[];
    contextMenuIcons?: ActionId[];
    setUtilsBarIcons?: ReturnType<typeof vi.fn>;
    setContextMenuIcons?: ReturnType<typeof vi.fn>;
    resetIconPlacement?: ReturnType<typeof vi.fn>;
}

/** Creates a complete mock SettingsState with optional type-safe overrides */
export function createMockSettingsState(overrides: MockSettingsOverrides = {}) {
    return {
        theme: 'system' as ThemeOption,
        canvasGrid: true,
        autoSave: true,
        autoSaveInterval: 30,
        compactMode: false,
        canvasScrollMode: 'zoom' as CanvasScrollMode,
        connectorStyle: 'solid' as ConnectorStyle,
        isCanvasLocked: false,
        canvasFreeFlow: false,
        lastSettingsTab: 'appearance' as SettingsTabId,
        setTheme: vi.fn(),
        toggleCanvasGrid: vi.fn(),
        setAutoSave: vi.fn(),
        setAutoSaveInterval: vi.fn(),
        toggleCompactMode: vi.fn(),
        setCanvasScrollMode: vi.fn(),
        setConnectorStyle: vi.fn(),
        toggleCanvasLocked: vi.fn(),
        toggleCanvasFreeFlow: vi.fn(),
        setLastSettingsTab: vi.fn(),
        getResolvedTheme: () => 'light' as const,
        loadFromStorage: vi.fn(),
        autoAnalyzeDocuments: true,
        toggleAutoAnalyzeDocuments: vi.fn(),
        utilsBarIcons: [...DEFAULT_UTILS_BAR] as ActionId[],
        contextMenuIcons: [...DEFAULT_CONTEXT_MENU] as ActionId[],
        setUtilsBarIcons: vi.fn(),
        setContextMenuIcons: vi.fn(),
        resetIconPlacement: vi.fn(),
        ...overrides,
    };
}
