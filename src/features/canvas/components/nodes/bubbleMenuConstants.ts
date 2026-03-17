/**
 * Shared Tailwind class strings for every button rendered inside the
 * bubble-menu toolbar.  Extracted here so child components
 * (HeadingButtons, FontSizeButtons, HighlightSwatches, LinkButtonItem)
 * can import them without creating a circular dependency on EditorBubbleMenu.
 */

/** Base Tailwind classes applied to every bubble-menu button. */
export const BUBBLE_BTN_BASE =
    'flex items-center justify-center w-[var(--bubble-menu-btn-size)] h-[var(--bubble-menu-btn-size)] rounded-[var(--radius-sm)] bg-transparent text-[var(--color-text-secondary)] cursor-pointer text-[length:var(--font-size-sm)] font-bold transition-[background-color,color] duration-[var(--transition-fast)] hover:bg-[var(--color-hover)] hover:text-[var(--color-text-primary)]';

/** Tailwind classes appended when the format is active in the current selection. */
export const BUBBLE_BTN_ACTIVE =
    'active bg-[var(--color-primary)] text-[var(--color-text-on-primary)] hover:bg-[var(--color-primary)] hover:text-[var(--color-text-on-primary)] hover:opacity-[var(--opacity-hover-subtle)]';
