/**
 * UtilsBarLayout — SSOT for node action classification.
 * Primary actions appear in the flat NodeUtilsBar; secondary actions live in
 * the right-click / "More..." context menu.
 */

/** Primary bar actions — fixed set, non-configurable */
export const PRIMARY_ACTIONS = ['ai', 'connect', 'copy', 'delete'] as const;
export type PrimaryActionId = (typeof PRIMARY_ACTIONS)[number];

/** Context menu actions — all secondary actions */
export const CONTEXT_MENU_ACTIONS = [
    'tags', 'color', 'pin', 'collapse', 'focus', 'duplicate',
    'image', 'attachment', 'share', 'pool',
] as const;
export type ContextMenuActionId = (typeof CONTEXT_MENU_ACTIONS)[number];

export type UtilsBarActionId = PrimaryActionId | ContextMenuActionId;

/** Context menu groups for visual organization */
export const CONTEXT_MENU_GROUPS = {
    organize: ['pin', 'duplicate', 'collapse', 'focus'] as const,
    appearance: ['tags', 'color'] as const,
    insert: ['image', 'attachment'] as const,
    sharing: ['share', 'pool'] as const,
} as const;
