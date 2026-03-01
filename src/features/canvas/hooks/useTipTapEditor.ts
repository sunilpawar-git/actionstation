/**
 * useTipTapEditor Hook - Encapsulates TipTap editor setup with markdown I/O
 * Bridges TipTap's document model with the store's string-based contract
 */
import { useCallback, useEffect, useRef } from 'react';
import { useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { Table, TableRow, TableCell, TableHeader } from '@tiptap/extension-table';
import type { Extension } from '@tiptap/core';
import { NodeImage } from '../extensions/imageExtension';
import { markdownToHtml, htmlToMarkdown } from '../services/markdownConverter';

interface UseTipTapEditorOptions {
    initialContent: string;
    placeholder: string;
    editable?: boolean;
    onBlur?: (markdown: string) => void;
    onUpdate?: (markdown: string) => void;
    extraExtensions?: Extension[];
}

interface UseTipTapEditorReturn {
    editor: ReturnType<typeof useEditor>;
    getMarkdown: () => string;
    getText: () => string;
    isEmpty: boolean;
    setContent: (markdown: string) => void;
}

/**
 * Pure guard: useEditor returns Editor | null at runtime despite TS types.
 * Module-level to avoid redefinition on every render and hook dep issues.
 */
function isEditorReady(e: ReturnType<typeof useEditor>): e is NonNullable<typeof e> {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    return e != null && !e.isDestroyed;
}

/** Hook for managing a TipTap editor with markdown serialization */
export function useTipTapEditor(options: UseTipTapEditorOptions): UseTipTapEditorReturn {
    const { initialContent, placeholder, editable = true, onBlur, onUpdate, extraExtensions = [] } = options;

    // Guard: skip onUpdate during programmatic setContent to avoid writing stale content back
    const skipNextUpdateRef = useRef(false);

    // Keep the placeholder in a ref so the Placeholder extension's decoration
    // function always reads the latest value (TipTap only captures options at
    // creation time, but supports a function callback that is invoked on each
    // decoration pass).
    const placeholderRef = useRef(placeholder);
    placeholderRef.current = placeholder;

    const editor = useEditor({
        extensions: [
            StarterKit,
            Placeholder.configure({ placeholder: () => placeholderRef.current }),
            Table.configure({ resizable: false }),
            TableRow,
            TableCell,
            TableHeader,
            NodeImage,
            ...extraExtensions,
        ],
        content: initialContent ? markdownToHtml(initialContent) : '',
        editable,
        onBlur: ({ editor: e }) => { onBlur?.(htmlToMarkdown(e.getHTML())); },
        onUpdate: ({ editor: e }) => {
            if (skipNextUpdateRef.current) { skipNextUpdateRef.current = false; return; }
            onUpdate?.(htmlToMarkdown(e.getHTML()));
        },
    });

    // Keep a stable ref to the editor so the editable-sync effect can read
    // the current editor without listing it as a dep (which causes a cascade).
    const editorRef = useRef(editor);
    editorRef.current = editor;

    // Sync editable reactively — TipTap only reads it at creation time.
    // Depend only on [editable]: setEditable() dispatches a ProseMirror
    // transaction which would mutate editor state → re-render → effect re-fires
    // → "Maximum update depth exceeded" if editor is also a dep.
    useEffect(() => {
        const e = editorRef.current;
        if (isEditorReady(e) && e.isEditable !== editable) {
            e.setEditable(editable);
        }
    }, [editable]);

    const getMarkdown = useCallback((): string => {
        return isEditorReady(editor) ? htmlToMarkdown(editor.getHTML()) : '';
    }, [editor]);

    const getText = useCallback((): string => {
        return isEditorReady(editor) ? editor.getText() : '';
    }, [editor]);

    const setContent = useCallback((markdown: string): void => {
        if (!isEditorReady(editor)) return;
        skipNextUpdateRef.current = true;
        if (markdown) { editor.commands.setContent(markdownToHtml(markdown)); }
        else { editor.commands.clearContent(); }
    }, [editor]);

    return { editor, getMarkdown, getText, setContent, isEmpty: isEditorReady(editor) ? editor.isEmpty : true };
}
