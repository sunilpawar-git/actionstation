/**
 * EditorBubbleMenu - Floating formatting toolbar on text selection
 * Renders Bold, Italic, Strikethrough, Code, Link buttons via TipTap BubbleMenu
 */
import React, { useCallback } from 'react';
import { BubbleMenu } from '@tiptap/react/menus';
import type { Editor } from '@tiptap/react';
import { strings } from '@/shared/localization/strings';
import styles from './EditorBubbleMenu.module.css';

interface EditorBubbleMenuProps {
    editor: Editor | null;
}

type FormatAction = (editor: Editor) => void;

/** Protocols allowed for user-entered link URLs */
const SAFE_LINK_RE = /^https?:\/\//i;

const FORMATS: ReadonlyArray<{
    key: string;
    label: string;
    display: string;
    action: FormatAction;
}> = [
    { key: 'bold', label: strings.formatting.bold, display: strings.formatting.boldDisplay, action: (e) => e.chain().focus().toggleBold().run() },
    { key: 'italic', label: strings.formatting.italic, display: strings.formatting.italicDisplay, action: (e) => e.chain().focus().toggleItalic().run() },
    { key: 'strike', label: strings.formatting.strikethrough, display: strings.formatting.strikethroughDisplay, action: (e) => e.chain().focus().toggleStrike().run() },
    { key: 'code', label: strings.formatting.code, display: strings.formatting.codeDisplay, action: (e) => e.chain().focus().toggleCode().run() },
];

/** Handle link button: toggle (unset if active) or prompt for URL */
function handleLinkAction(editor: Editor): void {
    if (editor.isActive('link')) {
        editor.chain().focus().unsetLink().run();
        return;
    }
    const existing = (editor.getAttributes('link') as { href?: string }).href ?? '';
    const url = window.prompt(strings.formatting.linkPrompt, existing);
    if (!url || !SAFE_LINK_RE.test(url)) return;
    editor.chain().focus().setLink({ href: url }).run();
}

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

    const handleLink = useCallback(
        (e: React.MouseEvent) => {
            e.preventDefault();
            e.stopPropagation();
            if (!editor) return;
            handleLinkAction(editor);
        },
        [editor],
    );

    if (!editor) return null;

    return (
        <BubbleMenu editor={editor}>
            <div className={styles.toolbar}>
                {FORMATS.map(({ key, label, display, action }) => (
                    <button
                        key={key}
                        type="button"
                        aria-label={label}
                        className={`${styles.formatButton}${editor.isActive(key) ? ` ${styles.active}` : ''}`}
                        onMouseDown={(e) => handleFormat(e, action)}
                    >
                        {display}
                    </button>
                ))}
                <button
                    type="button"
                    aria-label={strings.formatting.link}
                    className={`${styles.formatButton}${editor.isActive('link') ? ` ${styles.active}` : ''}`}
                    onMouseDown={handleLink}
                >
                    {strings.formatting.linkDisplay}
                </button>
            </div>
        </BubbleMenu>
    );
});
