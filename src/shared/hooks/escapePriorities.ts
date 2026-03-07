/**
 * Escape key handler priority constants.
 * Higher value = dismissed first (closest-to-user layer).
 * Only ONE handler fires per Escape press — the highest-priority active one.
 */

export const ESCAPE_PRIORITY = {
    /** Clear canvas selection — global fallback */
    CLEAR_SELECTION: 10,
    /** Close hover sidebar — low-priority ambient UI */
    SIDEBAR_HOVER: 20,
    /** Close NodeUtilsBar submenu/deck */
    BAR_OVERFLOW: 40,
    /** Dismiss node context menu */
    CONTEXT_MENU: 45,
    /** Exit focus mode (when editor is not active) */
    FOCUS_MODE: 50,
    /** Close Knowledge Bank panel */
    KB_PANEL: 60,
    /** Close Settings panel */
    SETTINGS_PANEL: 70,
    /** Close modal dialogs (PasteTextModal, etc.) — highest priority */
    MODAL: 80,
} as const;

export type EscapePriority = (typeof ESCAPE_PRIORITY)[keyof typeof ESCAPE_PRIORITY];
