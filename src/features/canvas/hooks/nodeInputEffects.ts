import { useEffect, useRef } from 'react';
import type { Editor } from '@tiptap/react';
import type { SubmitKeymapHandler } from '../extensions/submitKeymap';
import { useCanvasStore } from '../stores/canvasStore';

export function useSubmitHandlerEffect(
    submitHandlerRef: React.MutableRefObject<SubmitKeymapHandler | null>,
    exitEditing: () => void,
): void {
    useEffect(() => {
        submitHandlerRef.current = {
            onEnter: () => false,
            onEscape: () => { exitEditing(); return true; },
        };
        return () => { submitHandlerRef.current = null; };
    }, [submitHandlerRef, exitEditing]);
}

export function usePasteHandlerEffect(
    isEditing: boolean,
    editor: Editor | null,
    getMarkdown: () => string,
): void {
    // Ref-stabilise getMarkdown: it is a useCallback([editor]) that recreates
    // on every ProseMirror transaction. Without the ref, the paste listener
    // would detach/re-attach ~60fps during typing.
    const getMarkdownRef = useRef(getMarkdown);
    getMarkdownRef.current = getMarkdown;

    useEffect(() => {
        if (!isEditing || !editor) return;
        const dom = editor.view.dom;
        const onPaste = () => queueMicrotask(() => useCanvasStore.getState().updateDraft(getMarkdownRef.current()));
        dom.addEventListener('paste', onPaste);
        return () => dom.removeEventListener('paste', onPaste);
    }, [isEditing, editor]);
}
