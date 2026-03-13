/**
 * UtilsBarLayout — SSOT for node action classification.
 * Primary actions appear in the flat NodeUtilsBar; secondary actions live in
 * the right-click / "More..." context menu.
 *
 * NOTE: Actual icon placement is now user-configurable via iconRegistry +
 * settingsStore. These constants represent the DEFAULT classification.
 */

/** Default primary bar actions (UtilsBar Zone A) */
export const PRIMARY_ACTIONS = ['ai', 'connect', 'copy', 'delete'] as const;
export type PrimaryActionId = (typeof PRIMARY_ACTIONS)[number];

/** Default context menu actions (Zone B) */
export const CONTEXT_MENU_ACTIONS = [
    'tags', 'color', 'pin', 'collapse', 'focus', 'duplicate',
    'image', 'attachment', 'share', 'pool', 'mindmap',
] as const;
export type ContextMenuActionId = (typeof CONTEXT_MENU_ACTIONS)[number];

export type UtilsBarActionId = PrimaryActionId | ContextMenuActionId;

/** Context menu groups for visual organization */
export const CONTEXT_MENU_GROUPS = {
    primary: ['ai', 'connect', 'copy', 'delete'] as const,
    organize: ['pin', 'duplicate', 'collapse', 'focus'] as const,
    appearance: ['tags', 'color', 'mindmap'] as const,
    insert: ['image', 'attachment'] as const,
    sharing: ['share', 'pool'] as const,
} as const;
