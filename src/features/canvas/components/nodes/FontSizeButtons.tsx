/**
 * FontSizeButtons - A+ / A− granular font-size controls for the bubble menu.
 * Calls the custom increaseFontSize / decreaseFontSize TipTap commands.
 * Buttons are disabled (and visually dimmed) when already at the boundary step.
 */
import React, { useCallback } from 'react';
import type { Editor } from '@tiptap/react';
import { strings } from '@/shared/localization/strings';
import { BUBBLE_BTN_BASE } from './bubbleMenuConstants';
import { getNextFontSizeStep, getPrevFontSizeStep } from '../../extensions/fontSizeExtension';

interface FontSizeButtonsProps {
    editor: Editor;
}

/** Tailwind classes appended to a boundary-disabled button. */
const BUBBLE_BTN_DISABLED = 'opacity-40 cursor-not-allowed pointer-events-none';

export const FontSizeButtons = React.memo(function FontSizeButtons({ editor }: FontSizeButtonsProps) {
    // getAttributes may return null or throw in edge cases (e.g. test mocks)
    let currentSize: string | undefined;
    try {
        currentSize = (editor.getAttributes('fontSize') as Record<string, unknown> | null)?.size as string | undefined;
    } catch {
        currentSize = undefined;
    }

    const canIncrease = getNextFontSizeStep(currentSize ?? null) !== null;
    const canDecrease = getPrevFontSizeStep(currentSize ?? null) !== null;

    const handleIncrease = useCallback(
        (e: React.MouseEvent) => {
            e.preventDefault();
            e.stopPropagation();
            editor.chain().focus().increaseFontSize().run();
        },
        [editor],
    );

    const handleDecrease = useCallback(
        (e: React.MouseEvent) => {
            e.preventDefault();
            e.stopPropagation();
            editor.chain().focus().decreaseFontSize().run();
        },
        [editor],
    );

    return (
        <>
            <button
                type="button"
                aria-label={strings.formatting.fontSizeIncrease}
                className={`${BUBBLE_BTN_BASE}${canIncrease ? '' : ` ${BUBBLE_BTN_DISABLED}`}`}
                disabled={!canIncrease}
                onMouseDown={handleIncrease}
            >
                {strings.formatting.fontSizeIncreaseDisplay}
            </button>
            <button
                type="button"
                aria-label={strings.formatting.fontSizeDecrease}
                className={`${BUBBLE_BTN_BASE}${canDecrease ? '' : ` ${BUBBLE_BTN_DISABLED}`}`}
                disabled={!canDecrease}
                onMouseDown={handleDecrease}
            >
                {strings.formatting.fontSizeDecreaseDisplay}
            </button>
        </>
    );
});

