/**
 * Shared TipTap mock state and factories for IdeaCard tests.
 * Usage: vi.mock('../../../hooks/useTipTapEditor', async () => (await import('./helpers/tipTapTestMock')).hookMock());
 */
/* eslint-disable @typescript-eslint/no-unnecessary-condition */
import React from 'react';
import { clearActionOverrides, clearStateStore } from './ideaCardActionMocks';

export {
    useIdeaCardActionsMock, useIdeaCardStateMock, setActionOverride, initStateStore,
} from './ideaCardActionMocks';

/** Shared mutable state — singleton across all mock factories in a test file */
const state = {
    content: '',
    onBlur: null as ((md: string) => void) | null,
    onUpdate: null as ((md: string) => void) | null,
    placeholder: '',
    domElement: null as HTMLElement | null,
    lastInitialContent: undefined as string | undefined,
    insertedChars: [] as string[],
    suggestionActiveRef: null as { current: boolean } | null,
};

/** Reset mock state to initial values — call in beforeEach */
export function resetMockState(): void {
    state.content = '';
    state.onBlur = null;
    state.onUpdate = null;
    state.placeholder = '';
    state.domElement = null;
    state.lastInitialContent = undefined;
    state.insertedChars = [];
    state.suggestionActiveRef = null;
    _canvasStore = null;
    _autoEditedNodes.clear();
    clearActionOverrides();
    clearStateStore();
}

/** Access shared mock state — e.g. for setting suggestionActiveRef in tests */
export function getMockState() { return state; }

/** Get characters inserted via insertContent since last reset */
export function getInsertedChars(): string[] {
    return [...state.insertedChars];
}

/** SlashCommandSuggestion extension mock — returns module shape */
export function extensionMock() {
    return {
        SlashCommandSuggestion: { configure: () => ({}) },
        createSlashSuggestionRender: () => () => ({}),
    };
}

/** No-op event emitter methods so useEditorState can subscribe without errors */
function makeEditorEventMethods() {
    return { on: () => undefined, off: () => undefined };
}

/** useTipTapEditor mock factory — returns module shape */
export function hookMock() {
    return {
        useTipTapEditor: (options: {
            initialContent: string;
            placeholder: string;
            editable?: boolean;
            onBlur?: (md: string) => void;
            onUpdate?: (md: string) => void;
            extraExtensions?: unknown[];
        }) => {
            if (options.initialContent !== state.lastInitialContent) {
                state.content = options.initialContent || '';
                state.lastInitialContent = options.initialContent;
            }
            state.onBlur = options.onBlur ?? null;
            state.onUpdate = options.onUpdate ?? null;
            state.placeholder = options.placeholder || '';
            return {
                editor: {
                    ...makeEditorEventMethods(),
                    view: { get dom() { return state.domElement ?? document.createElement('div'); } },
                    isEmpty: !state.content,
                    commands: {
                        insertContent: (text: string) => {
                            state.insertedChars.push(text);
                            state.content += text;
                        },
                    },
                },
                getMarkdown: () => state.content,
                getText: () => state.content,
                isEmpty: !state.content,
                setContent: (md: string) => { state.content = md; },
            };
        },
    };
}

/** useIdeaCardEditor mock factory — returns module shape with shared state */
export function useIdeaCardEditorMock() {
    return {
        useIdeaCardEditor: (opts: {
            isEditing: boolean;
            output?: string;
            getEditableContent: () => string;
            placeholder: string;
            saveContent: (md: string) => void;
            onExitEditing: () => void;
        }) => {
            const display = opts.isEditing ? opts.getEditableContent() : (opts.output ?? '');
            if (display !== state.lastInitialContent) {
                state.content = display || '';
                state.lastInitialContent = display;
            }
            state.placeholder = opts.placeholder || '';
            state.onBlur = (md: string) => {
                opts.saveContent(md);
                opts.onExitEditing();
            };
            return {
                editor: {
                    ...makeEditorEventMethods(),
                    view: { get dom() { return state.domElement ?? document.createElement('div'); } },
                    isEmpty: !state.content,
                    commands: {
                        insertContent: (text: string) => {
                            state.insertedChars.push(text);
                            state.content += text;
                        },
                    },
                },
                getMarkdown: () => state.content,
                setContent: (md: string) => { state.content = md; },
                submitHandlerRef: { current: null },
            };
        },
    };
}

/** Store reference for useNodeInput mock — set via initNodeInputStore() */
let _canvasStore: {
    (selector: (s: Record<string, unknown>) => unknown): unknown;
    getState: () => Record<string, unknown>;
} | null = null;
const _autoEditedNodes = new Set<string>();

/** Initialize the canvas store reference for useNodeInput mock. Call in beforeEach. */
export function initNodeInputStore(store: unknown): void {
    _canvasStore = store as typeof _canvasStore;
    _autoEditedNodes.clear();
}

/** useNodeInput mock factory — simulates store-based editing via canvasStore */
export function useNodeInputMock() {
    return {
        useNodeInput: (opts: {
            nodeId: string; editor: unknown; getMarkdown: () => string;
            setContent: (md: string) => void; getEditableContent: () => string;
            saveContent: (md: string) => void;
            isGenerating: boolean;
            isNewEmptyNode: boolean; focusHeading?: () => void;
        }) => {
            if (!_canvasStore) {
                return {
                    isEditing: false,
                    inputMode: 'note' as const,
                    handleKeyDown: () => undefined,
                    handleDoubleClick: () => undefined,
                };
            }
            // Auto-enter edit mode for new empty nodes (mirrors real useNodeInput behavior)
            if (opts.isNewEmptyNode && !_autoEditedNodes.has(opts.nodeId)
                && !(_canvasStore.getState() as { editingNodeId: string | null }).editingNodeId) {
                _autoEditedNodes.add(opts.nodeId);
                (_canvasStore.getState() as { startEditing: (id: string) => void }).startEditing(opts.nodeId);
            }
            const isEditing = _canvasStore((s) =>
                s.editingNodeId === opts.nodeId) as boolean;
            const inputMode = _canvasStore((s) => s.inputMode) as string;
            return {
                isEditing,
                inputMode,
                handleKeyDown: (e: KeyboardEvent | { key: string; preventDefault?: () => void;
                    stopPropagation?: () => void; ctrlKey?: boolean; metaKey?: boolean;
                    altKey?: boolean; shiftKey?: boolean; nativeEvent?: KeyboardEvent }) => {
                    const key = e.key;
                    const ctrl = ('ctrlKey' in e && e.ctrlKey) ?? false;
                    const meta = ('metaKey' in e && e.metaKey) ?? false;
                    const alt = ('altKey' in e && e.altKey) ?? false;
                    if (!isEditing) {
                        if (opts.isGenerating) return;
                        if (key === 'Enter') {
                            e.preventDefault?.();
                            (e as { stopPropagation?: () => void }).stopPropagation?.();
                            opts.setContent(opts.getEditableContent());
                            (_canvasStore!.getState() as { startEditing: (id: string) => void }).startEditing(opts.nodeId);
                            return;
                        }
                        const isPrintable = key.length === 1 && !ctrl && !meta && !alt;
                        if (isPrintable) {
                            e.preventDefault?.();
                            (e as { stopPropagation?: () => void }).stopPropagation?.();
                            opts.setContent(opts.getEditableContent());
                            (_canvasStore!.getState() as { startEditing: (id: string) => void }).startEditing(opts.nodeId);
                            const ed = opts.editor as { commands: { insertContent: (t: string) => void } };
                            ed.commands.insertContent(key);
                        }
                    } else {
                        if (key === 'Escape') {
                            (e as { stopPropagation?: () => void }).stopPropagation?.();
                            opts.saveContent(opts.getMarkdown());
                            (_canvasStore!.getState() as { stopEditing: () => void }).stopEditing();
                            return;
                        }
                        // Enter in edit mode: no-op (notepad behavior — StarterKit creates paragraph)
                    }
                },
                handleDoubleClick: () => {
                    if (opts.isGenerating) return;
                    if (!_canvasStore) return;
                    opts.setContent(opts.getEditableContent());
                    (_canvasStore.getState() as { startEditing: (id: string) => void }).startEditing(opts.nodeId);
                },
            };
        },
    };
}

/** useHeadingEditor mock factory — returns module shape with shared state */
export function useHeadingEditorMock() {
    return {
        useHeadingEditor: (opts: {
            heading: string; placeholder: string; isEditing: boolean;
            onHeadingChange: (h: string) => void; onBlur?: (h: string) => void;
            onEnterKey?: () => void; onSlashCommand?: (id: string) => void;
            onSubmitAI?: (prompt: string) => void;
        }) => {
            if (opts.heading !== state.lastInitialContent) {
                state.content = opts.heading ?? '';
                state.lastInitialContent = opts.heading;
            }
            state.onBlur = opts.onBlur ?? null;
            state.onUpdate = opts.onHeadingChange ?? null;
            state.placeholder = opts.placeholder || '';
            const ref = state.suggestionActiveRef ?? { current: false };
            state.suggestionActiveRef = ref;
            return {
                editor: {
                    ...makeEditorEventMethods(),
                    view: { get dom() { return state.domElement ?? document.createElement('div'); } },
                    isEmpty: !state.content,
                    commands: { focus: () => undefined, insertContent: (t: string) => { state.content += t; } },
                },
                suggestionActiveRef: ref,
            };
        },
    };
}

/** TipTapEditor component mock factory — returns module shape */
export function componentMock() {
    return {
        TipTapEditor: ({ 'data-testid': testId }: { 'data-testid'?: string }) => {
            const isViewMode = testId === 'view-editor';
            if (isViewMode) {
                return (
                    <div data-testid={testId}
                        ref={(el: HTMLDivElement | null) => { if (el) state.domElement = el; }}>
                        {state.content}
                    </div>
                );
            }
            return (
                <textarea
                    ref={(el: HTMLTextAreaElement | null) => { if (el) state.domElement = el; }}
                    data-testid={testId ?? 'tiptap-editor'}
                    placeholder={state.placeholder}
                    defaultValue={state.content}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
                        state.content = e.target.value;
                        state.onUpdate?.(e.target.value);
                    }}
                    onBlur={(e: React.FocusEvent<HTMLTextAreaElement>) => {
                        state.onBlur?.(e.currentTarget.value);
                    }}
                />
            );
        },
    };
}


