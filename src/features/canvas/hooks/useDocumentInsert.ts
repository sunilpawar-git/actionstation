/**
 * useDocumentInsert — React hook providing file-picker trigger for document attachment.
 * Orchestrates: file picker → validate/parse/upload → insert TipTap node → update canvas store.
 */
import { useCallback, useRef } from 'react';
import type { Editor } from '@tiptap/core';
import { useCanvasStore } from '../stores/canvasStore';
import { processDocumentForNode } from '../services/documentInsertService';
import type { DocumentUploadFn } from '../services/documentInsertService';
import { DOCUMENT_ACCEPTED_MIME_TYPES } from '../types/document';
import type { AttachmentNodeAttrs, AttachmentStatus } from '../extensions/attachmentExtension';
import { captureError } from '@/shared/services/sentryService';
import { toast } from '@/shared/stores/toastStore';
import { strings } from '@/shared/localization/strings';

const FILE_ACCEPT = DOCUMENT_ACCEPTED_MIME_TYPES.join(',');
const UPLOADING: AttachmentStatus = 'uploading';
const READY: AttachmentStatus = 'ready';
const ERROR: AttachmentStatus = 'error';

/** Generate a unique temporary ID for tracking the pending attachment node */
function makeTempId(): string {
    return `att-pending-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

/**
 * Update a specific attachment node in the editor by its tempId.
 * No-ops silently if no matching node is found (avoids spurious transactions).
 */
function updateAttachmentByTempId(
    editor: Editor,
    tempId: string,
    newAttrs: Partial<AttachmentNodeAttrs>,
): void {
    const { doc, tr } = editor.state;
    doc.descendants((node, pos) => {
        if (node.type.name === 'attachment' && node.attrs.tempId === tempId) {
            tr.setNodeMarkup(pos, undefined, { ...node.attrs, ...newAttrs });
        }
    });
    // Only dispatch if the transaction actually contains steps (i.e. a match was found)
    if (tr.steps.length > 0) editor.view.dispatch(tr);
}

/** Optional callback fired after a document is successfully uploaded and parsed */
export type DocumentReadyCallback = (parsedText: string, filename: string) => void;

/**
 * Hook providing file-picker trigger and direct file insertion for document attachments.
 * - `triggerFilePicker`: opens OS file picker → user selects file → inserts
 * - `insertFileDirectly`: inserts a File directly (used by drag-drop / paste via FileHandlerExtension)
 *
 * @param nodeId - Canvas node ID (for canvasStore updates)
 * @param editor - Current TipTap editor instance
 * @param uploadFn - Bound upload function from useNodeDocumentUpload
 * @param getMarkdown - Returns current editor content as markdown
 * @param onDocumentReady - Optional callback for post-upload processing (e.g. document agent)
 */
export function useDocumentInsert(
    nodeId: string,
    editor: Editor | null,
    uploadFn: DocumentUploadFn,
    getMarkdown: () => string,
    onDocumentReady?: DocumentReadyCallback,
): { triggerFilePicker: () => void; insertFileDirectly: (file: File) => Promise<void> } {
    const inputRef = useRef<HTMLInputElement | null>(null);

    const insertFromFile = useCallback(async (file: File): Promise<void> => {
        if (!editor || editor.isDestroyed) return;

        // Ensure editor is focused before inserting
        if (!editor.isFocused) editor.commands.focus('end');

        const tempId = makeTempId();

        // Insert uploading placeholder node
        editor.commands.insertContent({
            type: 'attachment',
            attrs: {
                url: '',
                filename: file.name,
                thumbnailUrl: null,
                mimeType: file.type,
                status: UPLOADING,
                tempId,
            } satisfies AttachmentNodeAttrs,
        });

        toast.info(strings.canvas.docUploading);

        const result = await processDocumentForNode(file, uploadFn);

        if (!result) {
            updateAttachmentByTempId(editor, tempId, { status: ERROR, tempId: null });
            return;
        }

        const { meta } = result;

        updateAttachmentByTempId(editor, tempId, {
            url: meta.url,
            filename: meta.filename,
            thumbnailUrl: meta.thumbnailUrl ?? null,
            mimeType: meta.mimeType,
            status: READY,
            tempId: null,
        });

        const md = getMarkdown();
        const store = useCanvasStore.getState();
        store.updateNodeOutput(nodeId, md);

        const current = store.nodes.find((n) => n.id === nodeId);
        const existing = current?.data.attachments ?? [];
        store.updateNodeAttachments(nodeId, [...existing, meta]);

        if (result.parsedText && onDocumentReady) {
            onDocumentReady(result.parsedText, meta.filename);
        }
    }, [editor, nodeId, uploadFn, getMarkdown, onDocumentReady]);

    const triggerFilePicker = useCallback(() => {
        if (!editor || editor.isDestroyed) return;
        if (!editor.isFocused) editor.commands.focus('end');

        let input = inputRef.current;
        if (!input) {
            input = document.createElement('input');
            input.type = 'file';
            input.accept = FILE_ACCEPT;
            input.style.display = 'none';
            inputRef.current = input;
        }
        input.value = '';
        input.onchange = () => {
            const file = input.files?.[0];
            if (file) void insertFromFile(file).catch((e: unknown) => captureError(e as Error));
        };
        input.click();
    }, [editor, insertFromFile]);

    return { triggerFilePicker, insertFileDirectly: insertFromFile };
}
