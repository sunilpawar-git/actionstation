/**
 * HeadingButtons — H1 / H2 / H3 toggle buttons for the bubble menu.
 * Clicking a heading button applies that level to the current selection;
 * clicking an active heading reverts to paragraph (toggle behaviour).
 * Tailwind-only (Decision 30).
 */
import React, { useCallback } from 'react';
import type { Editor } from '@tiptap/react';
import { strings } from '@/shared/localization/strings';
import { BUBBLE_BTN_BASE, BUBBLE_BTN_ACTIVE } from './bubbleMenuConstants';

interface HeadingButtonsProps {
    editor: Editor;
}

export const HeadingButtons = React.memo(function HeadingButtons({ editor }: HeadingButtonsProps) {
    const handleH1 = useCallback(
        (e: React.MouseEvent) => {
            e.preventDefault();
            e.stopPropagation();
            editor.chain().focus().toggleHeading({ level: 1 }).run();
        },
        [editor],
    );

    const handleH2 = useCallback(
        (e: React.MouseEvent) => {
            e.preventDefault();
            e.stopPropagation();
            editor.chain().focus().toggleHeading({ level: 2 }).run();
        },
        [editor],
    );

    const handleH3 = useCallback(
        (e: React.MouseEvent) => {
            e.preventDefault();
            e.stopPropagation();
            editor.chain().focus().toggleHeading({ level: 3 }).run();
        },
        [editor],
    );

    const h1Active = editor.isActive('heading', { level: 1 });
    const h2Active = editor.isActive('heading', { level: 2 });
    const h3Active = editor.isActive('heading', { level: 3 });

    return (
        <>
            <button
                type="button"
                aria-label={strings.formatting.heading1}
                className={`${BUBBLE_BTN_BASE}${h1Active ? ` ${BUBBLE_BTN_ACTIVE}` : ''}`}
                onMouseDown={handleH1}
            >
                {strings.formatting.heading1Display}
            </button>
            <button
                type="button"
                aria-label={strings.formatting.heading2}
                className={`${BUBBLE_BTN_BASE}${h2Active ? ` ${BUBBLE_BTN_ACTIVE}` : ''}`}
                onMouseDown={handleH2}
            >
                {strings.formatting.heading2Display}
            </button>
            <button
                type="button"
                aria-label={strings.formatting.heading3}
                className={`${BUBBLE_BTN_BASE}${h3Active ? ` ${BUBBLE_BTN_ACTIVE}` : ''}`}
                onMouseDown={handleH3}
            >
                {strings.formatting.heading3Display}
            </button>
        </>
    );
});

