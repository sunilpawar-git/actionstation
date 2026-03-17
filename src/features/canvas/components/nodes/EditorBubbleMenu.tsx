/**
 * EditorBubbleMenu - Floating formatting toolbar on text selection
 * Renders Bold, Italic, Strikethrough, Code, Link, and Highlight buttons.
 * Tailwind-only: EditorBubbleMenu.module.css has been deleted (Decision 30).
 */
import React, { useCallback } from 'react';
import { BubbleMenu } from '@tiptap/react/menus';
import type { Editor } from '@tiptap/react';
import { strings } from '@/shared/localization/strings';
import { LinkButtonItem } from './LinkButtonItem';
import { HighlightSwatches } from './HighlightSwatches';

interface EditorBubbleMenuProps {
    editor: Editor | null;
}

type FormatAction = (editor: Editor) => void;

/** Shared Tailwind base for every bubble-menu button. Exported for LinkButtonItem. */
export const BUBBLE_BTN_BASE =
    'flex items-center justify-center w-[var(--bubble-menu-btn-size)] h-[var(--bubble-menu-btn-size)] rounded-[var(--radius-sm)] bg-transparent text-[var(--color-text-secondary)] cursor-pointer text-[length:var(--font-size-sm)] font-bold transition-[background-color,color] duration-[var(--transition-fast)] hover:bg-[var(--color-hover)] hover:text-[var(--color-text-primary)]';

/** Active state appended when a format is currently applied to the selection. */
export const BUBBLE_BTN_ACTIVE =
    'active bg-[var(--color-primary)] text-[var(--color-text-on-primary)] hover:bg-[var(--color-primary)] hover:text-[var(--color-text-on-primary)] hover:opacity-[var(--opacity-hover-subtle)]';

const FORMATS: ReadonlyArray<{
    key: string;
    label: string;
    display: string;
    action: FormatAction;
}> = [
    { key: 'bold',   label: strings.formatting.bold,          display: strings.formatting.boldDisplay,          action: (e) => e.chain().focus().toggleBold().run() },
    { key: 'italic', label: strings.formatting.italic,        display: strings.formatting.italicDisplay,        action: (e) => e.chain().focus().toggleItalic().run() },
    { key: 'strike', label: strings.formatting.strikethrough, display: strings.formatting.strikethroughDisplay, action: (e) => e.chain().focus().toggleStrike().run() },
    { key: 'code',   label: strings.formatting.code,          display: strings.formatting.codeDisplay,          action: (e) => e.chain().focus().toggleCode().run() },
];

export const EditorBubbleMenu = React.memo(function EditorBubbleMenu({ editor }: EditorBubbleMenuProps) {
    const handleFormat = useCallback(
        (e: React.MouseEvent, action: FormatAction) => {
            e.preventDefault();
            e.stopPropagation();
            if (!editor) return;
            action(editor);
        },
        [editor],
    );

    if (!editor) return null;

    return (
        <BubbleMenu editor={editor}>
            <div
                className="flex items-center bg-[var(--bubble-menu-bg)] border border-[var(--bubble-menu-border)] rounded-[var(--bubble-menu-radius)] shadow-[var(--bubble-menu-shadow)]"
                style={{ gap: 'var(--bubble-menu-gap)', padding: 'var(--space-xs)' }}
            >
                {FORMATS.map(({ key, label, display, action }) => (
                    <button
                        key={key}
                        type="button"
                        aria-label={label}
                        className={`${BUBBLE_BTN_BASE}${editor.isActive(key) ? ` ${BUBBLE_BTN_ACTIVE}` : ''}`}
                        onMouseDown={(e) => handleFormat(e, action)}
                    >
                        {display}
                    </button>
                ))}
                <LinkButtonItem editor={editor} />
                <HighlightSwatches editor={editor} />
            </div>
        </BubbleMenu>
    );
});
