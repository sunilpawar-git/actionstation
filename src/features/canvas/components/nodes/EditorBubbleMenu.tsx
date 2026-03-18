/**
 * EditorBubbleMenu - Floating formatting toolbar for text selections.
 * Groups: [B I S </>] | [H1 H2 H3] | [A+ A−] | [→] [swatches ×]
 * Tailwind-only: EditorBubbleMenu.module.css has been deleted (Decision 30).
 */
import React, { useCallback } from 'react';
import { BubbleMenu } from '@tiptap/react/menus';
import type { Editor } from '@tiptap/react';
import { strings } from '@/shared/localization/strings';
import { LinkButtonItem } from './LinkButtonItem';
import { HighlightSwatches } from './HighlightSwatches';
import { HeadingButtons } from './HeadingButtons';
import { FontSizeButtons } from './FontSizeButtons';
import { BUBBLE_BTN_BASE, BUBBLE_BTN_ACTIVE } from './bubbleMenuConstants';

// Re-export so any code that previously imported these from EditorBubbleMenu
// continues to compile without a migration step.
export { BUBBLE_BTN_BASE, BUBBLE_BTN_ACTIVE };

interface EditorBubbleMenuProps {
    editor: Editor | null;
}

type FormatAction = (editor: Editor) => void;

// ─── Thin vertical separator ─────────────────────────────────────────────────

function BubbleDivider() {
    return (
        <div
            aria-hidden="true"
            style={{ width: 1, alignSelf: 'stretch', background: 'var(--color-border)', margin: '2px 0' }}
        />
    );
}

// ─── Single format button (stable ref per item) ───────────────────────────────

interface FormatButtonProps {
    label: string;
    display: string;
    isActive: boolean;
    action: FormatAction;
    editor: Editor;
}

const FormatButton = React.memo(function FormatButton({ label, display, isActive, action, editor }: FormatButtonProps) {
    const handleMouseDown = useCallback(
        (e: React.MouseEvent) => {
            e.preventDefault();
            e.stopPropagation();
            action(editor);
        },
        [action, editor],
    );

    return (
        <button
            type="button"
            aria-label={label}
            className={`${BUBBLE_BTN_BASE}${isActive ? ` ${BUBBLE_BTN_ACTIVE}` : ''}`}
            onMouseDown={handleMouseDown}
        >
            {display}
        </button>
    );
});

// ─── Format item definitions ──────────────────────────────────────────────────

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

// ─── Menu ─────────────────────────────────────────────────────────────────────

export const EditorBubbleMenu = React.memo(function EditorBubbleMenu({ editor }: EditorBubbleMenuProps) {
    if (!editor) return null;

    return (
        <BubbleMenu editor={editor}>
            <div
                className="flex items-center bg-[var(--bubble-menu-bg)] border border-[var(--bubble-menu-border)] rounded-[var(--bubble-menu-radius)] shadow-[var(--bubble-menu-shadow)]"
                style={{ gap: 'var(--bubble-menu-gap)', padding: 'var(--space-xs)' }}
            >
                {FORMATS.map(({ key, label, display, action }) => (
                    <FormatButton
                        key={key}
                        label={label}
                        display={display}
                        isActive={editor.isActive(key)}
                        action={action}
                        editor={editor}
                    />
                ))}
                <BubbleDivider />
                <HeadingButtons editor={editor} />
                <BubbleDivider />
                <FontSizeButtons editor={editor} />
                <BubbleDivider />
                <LinkButtonItem editor={editor} />
                <HighlightSwatches editor={editor} />
            </div>
        </BubbleMenu>
    );
});

