import type { Editor } from '@tiptap/react';
import type { SubmitKeymapHandler } from '../extensions/submitKeymap';
import type { NodeShortcutMap } from './nodeInputKeyHandler';

export type { NodeShortcutMap };

export interface UseNodeInputOptions {
    nodeId: string;
    isEditing: boolean;
    editor: Editor | null;
    getMarkdown: () => string;
    setContent: (markdown: string) => void;
    getEditableContent: () => string;
    saveContent: (markdown: string) => void;
    submitHandlerRef: React.MutableRefObject<SubmitKeymapHandler | null>;
    isGenerating: boolean;
    isNewEmptyNode: boolean;
    focusHeading?: () => void;
    shortcuts?: NodeShortcutMap;
    /** Node output passed from parent — avoids redundant useNodeData subscription */
    nodeOutput?: string;
}

export interface UseNodeInputReturn {
    handleKeyDown: (e: KeyboardEvent) => void;
    handleDoubleClick: () => void;
}
