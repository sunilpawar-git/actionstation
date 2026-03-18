/**
 * HighlightSwatches — Colour picker strip for text highlight in bubble menu.
 * Five theme-aware swatches + a remove button.
 * All colours are CSS variable references so they adapt to every theme.
 * Tailwind-only: no CSS module file (see MEMORY.md Decision 30).
 */
import React, { useCallback } from 'react';
import type { Editor } from '@tiptap/react';
import { strings } from '@/shared/localization/strings';
import { BUBBLE_BTN_BASE } from './bubbleMenuConstants';

const SWATCHES = [
    { varName: 'var(--highlight-yellow)', label: strings.formatting.highlightYellow },
    { varName: 'var(--highlight-green)',  label: strings.formatting.highlightGreen },
    { varName: 'var(--highlight-blue)',   label: strings.formatting.highlightBlue },
    { varName: 'var(--highlight-pink)',   label: strings.formatting.highlightPink },
    { varName: 'var(--highlight-purple)', label: strings.formatting.highlightPurple },
] as const;

/** Base Tailwind classes for each colour swatch circle */
const SWATCH_BASE = 'w-[18px] h-[18px] rounded-full border border-[var(--color-border)] cursor-pointer transition-[outline] duration-[var(--transition-fast)]';
/** Extra classes applied when the swatch colour is the active highlight */
const SWATCH_ACTIVE = 'active outline outline-2 outline-[var(--color-primary)] outline-offset-[2px]';

interface HighlightSwatchesProps {
    editor: Editor;
}

export const HighlightSwatches = React.memo(function HighlightSwatches({ editor }: HighlightSwatchesProps) {
    const handleSwatch = useCallback(
        (e: React.MouseEvent, colorVar: string) => {
            e.preventDefault();
            e.stopPropagation();
            editor.chain().focus().toggleHighlight({ color: colorVar }).run();
        },
        [editor],
    );

    const handleRemove = useCallback(
        (e: React.MouseEvent) => {
            e.preventDefault();
            e.stopPropagation();
            editor.chain().focus().unsetHighlight().run();
        },
        [editor],
    );

    return (
        <div
            role="group"
            aria-label={strings.formatting.highlight}
            className="flex items-center border-l border-[var(--color-border)]"
            style={{ gap: 'var(--space-xxs)', paddingLeft: 'var(--space-xs)' }}
        >
            {SWATCHES.map(({ varName, label }) => {
                const isActive = editor.isActive('highlight', { color: varName });
                return (
                    <button
                        key={varName}
                        type="button"
                        aria-label={label}
                        className={`${SWATCH_BASE}${isActive ? ` ${SWATCH_ACTIVE}` : ''}`}
                        style={{ backgroundColor: varName }}
                        onMouseDown={(e) => handleSwatch(e, varName)}
                    />
                );
            })}
            <button
                type="button"
                aria-label={strings.formatting.removeHighlight}
                className={BUBBLE_BTN_BASE}
                onMouseDown={handleRemove}
            >
                ×
            </button>
        </div>
    );
});
