/** useHeadingEditor - Heading editor with slash command + submit keymap support */
/* eslint-disable @typescript-eslint/no-unnecessary-condition */
import { useCallback, useEffect, useMemo, useRef } from 'react';
import type { useEditor } from '@tiptap/react';
import { useCanvasStore } from '../stores/canvasStore';
import { useTipTapEditor } from './useTipTapEditor';
import { SlashCommandSuggestion, createSlashSuggestionRender } from '../extensions/slashCommandSuggestion';
import { SubmitKeymap, type SubmitKeymapHandler } from '../extensions/submitKeymap';

export interface UseHeadingEditorOptions {
    heading: string; placeholder: string; isEditing: boolean;
    onHeadingChange: (h: string) => void; onBlur?: (h: string) => void;
    onEnterKey?: () => void; onSlashCommand?: (id: string) => void;
    onSubmitAI?: (prompt: string) => void;
}

export function useHeadingEditor(opts: UseHeadingEditorOptions): {
    editor: ReturnType<typeof useEditor>; suggestionActiveRef: React.RefObject<boolean>;
    getHeading: () => string;
} {
    const { heading, placeholder, isEditing, onHeadingChange, onBlur, onEnterKey, onSlashCommand, onSubmitAI } = opts;
    const suggestionActiveRef = useRef(false);
    const slashJustSelectedRef = useRef(false);
    const submitHandlerRef = useRef<SubmitKeymapHandler | null>(null);
    const blurRef = useRef<(md: string) => void>(() => undefined);

    // Track last committed heading to avoid redundant store writes on blur.
    const lastCommittedRef = useRef(heading);

    // Commit heading to store only when value changed — called on blur and
    // before AI submit, NOT on every keystroke. Per-keystroke updateNodeHeading
    // caused O(N) re-renders across all canvas nodes (new nodes[] array each time).
    const commitHeading = useCallback((h: string) => {
        if (h !== lastCommittedRef.current) {
            lastCommittedRef.current = h;
            onHeadingChange(h);
        }
    }, [onHeadingChange]);

    // Keep lastCommittedRef in sync with external heading changes (undo/redo,
    // AI generation) so commitHeading doesn't produce a spurious write.
    useEffect(() => {
        if (!isEditing) lastCommittedRef.current = heading;
    }, [heading, isEditing]);
    const extensions = useMemo(() => [
        SubmitKeymap.configure({ handlerRef: submitHandlerRef }),
        SlashCommandSuggestion.configure({
            suggestion: {
                render: createSlashSuggestionRender({
                    onSelect: (id) => { onSlashCommand?.(id); },
                    onActiveChange: (active) => {
                        suggestionActiveRef.current = active;
                        if (!active) slashJustSelectedRef.current = true;
                    },
                })
            }
        }),
        // eslint-disable-next-line react-hooks/exhaustive-deps
    ], []);

    const { editor, getMarkdown } = useTipTapEditor({
        initialContent: heading, placeholder, editable: isEditing,
        onBlur: useCallback((md: string) => blurRef.current(md), []),
        // Heading is committed on blur/submit, NOT per keystroke — see commitHeading.
        extraExtensions: extensions,
    });

    useEffect(() => {
        submitHandlerRef.current = {
            onEnter: () => {
                if (suggestionActiveRef.current) return true;
                const currentHeading = getMarkdown().trim();
                commitHeading(currentHeading);
                const mode = useCanvasStore.getState().inputMode;
                if (mode === 'ai') onSubmitAI?.(currentHeading);
                else onEnterKey?.();
                return true;
            },
            onEscape: () => {
                // When suggestion popup is open, let the Suggestion plugin
                // handle Escape (close popup) — don't move focus to body.
                if (suggestionActiveRef.current) return true;
                onEnterKey?.();
                return true;
            },
        };
        return () => { submitHandlerRef.current = null; };
    }, [getMarkdown, onEnterKey, onSubmitAI, commitHeading]);

    const handleBlur = useCallback((md: string) => {
        if (suggestionActiveRef.current) return;
        if (slashJustSelectedRef.current) {
            slashJustSelectedRef.current = false;
            queueMicrotask(() => { editor?.commands.focus(); }); return;
        }
        commitHeading(md);
        onBlur?.(md);
    }, [onBlur, editor, commitHeading]);
    useEffect(() => { blurRef.current = handleBlur; }, [handleBlur]);

    // Trigger placeholder re-render when text changes (e.g. switching to AI mode)
    const prevPH = useRef(placeholder);
    useEffect(() => {
        if (editor == null || placeholder === prevPH.current) return;
        prevPH.current = placeholder;
        editor.view.dispatch(editor.state.tr.setMeta('placeholderUpdate', true));
    }, [editor, placeholder]);

    return { editor, suggestionActiveRef, getHeading: getMarkdown };
}
