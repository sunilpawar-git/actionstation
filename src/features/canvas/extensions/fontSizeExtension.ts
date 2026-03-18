/**
 * FontSizeExtension - TipTap Mark for granular inline font-size control.
 *
 * Renders as <span style="font-size: Xrem">…</span>.
 * Step helpers are exported as pure functions so they can be tested without
 * a live TipTap editor instance.
 */
import { Mark, mergeAttributes } from '@tiptap/core';

// ─── Step table ───────────────────────────────────────────────────────────────

/** Ordered font-size steps aligned to the design-token rem scale. */
export const FONT_SIZE_STEPS = [
    '0.75rem',
    '0.875rem',
    '1rem',
    '1.125rem',
    '1.25rem',
    '1.5rem',
    '2rem',
] as const;

export type FontSizeStep = (typeof FONT_SIZE_STEPS)[number];

/** The body default — having no mark is equivalent to this value. */
export const DEFAULT_FONT_SIZE: FontSizeStep = '1rem';

const DEFAULT_IDX = FONT_SIZE_STEPS.indexOf(DEFAULT_FONT_SIZE);

// ─── Pure step navigators ─────────────────────────────────────────────────────

/**
 * Returns the next larger step, or `null` when already at the maximum.
 * `null` input is treated as {@link DEFAULT_FONT_SIZE}.
 * An unrecognised size falls back to the default index.
 */
export function getNextFontSizeStep(current: string | null): string | null {
    const idx = current ? FONT_SIZE_STEPS.indexOf(current as FontSizeStep) : -1;
    const from = idx < 0 ? DEFAULT_IDX : idx;
    if (from >= FONT_SIZE_STEPS.length - 1) return null;
    return FONT_SIZE_STEPS[from + 1] ?? null;
}

/**
 * Returns the next smaller step, or `null` when already at the minimum.
 * `null` input is treated as {@link DEFAULT_FONT_SIZE}.
 * An unrecognised size falls back to the default index.
 */
export function getPrevFontSizeStep(current: string | null): string | null {
    const idx = current ? FONT_SIZE_STEPS.indexOf(current as FontSizeStep) : -1;
    const from = idx < 0 ? DEFAULT_IDX : idx;
    if (from <= 0) return null;
    return FONT_SIZE_STEPS[from - 1] ?? null;
}

// ─── TipTap module augmentation ───────────────────────────────────────────────

declare module '@tiptap/core' {
    interface Commands<ReturnType> {
        fontSize: {
            /** Step up to the next font-size. No-op at maximum. */
            increaseFontSize: () => ReturnType;
            /** Step down to the previous font-size. No-op at minimum. */
            decreaseFontSize: () => ReturnType;
        };
    }
}

// ─── Extension ────────────────────────────────────────────────────────────────

export const FontSizeExtension = Mark.create({
    name: 'fontSize',

    addAttributes() {
        return {
            size: {
                default: null,
                parseHTML: (element) => element.style.fontSize || null,
                renderHTML: (attributes: Record<string, unknown>) => {
                    const size = attributes.size;
                    if (!size || typeof size !== 'string') return {};
                    return { style: `font-size: ${size}` };
                },
            },
        };
    },

    parseHTML() {
        return [{
            tag: 'span',
            getAttrs: (element) => {
                const size = element.style.fontSize;
                return size ? { size } : false;
            },
        }];
    },

    renderHTML({ HTMLAttributes }) {
        return ['span', mergeAttributes(HTMLAttributes), 0];
    },

    addCommands() {
        return {
            increaseFontSize: () => ({ editor, commands }) => {
                const raw = editor.getAttributes(this.name).size as string | undefined;
                const next = getNextFontSizeStep(raw ?? null);
                if (!next) return false;
                if (next === DEFAULT_FONT_SIZE) return commands.unsetMark(this.name);
                return commands.setMark(this.name, { size: next });
            },
            decreaseFontSize: () => ({ editor, commands }) => {
                const raw = editor.getAttributes(this.name).size as string | undefined;
                const prev = getPrevFontSizeStep(raw ?? null);
                if (!prev) return false;
                if (prev === DEFAULT_FONT_SIZE) return commands.unsetMark(this.name);
                return commands.setMark(this.name, { size: prev });
            },
        };
    },
});
