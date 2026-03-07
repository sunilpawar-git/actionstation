/**
 * TipTap FileHandler Extension — Handles drag-drop and paste of image AND document files
 * Routes images to imageInsertService and documents to documentInsertService.
 */
import { FileHandler } from '@tiptap/extension-file-handler';
import { IMAGE_ACCEPTED_MIME_TYPES } from '../types/image';
import { DOCUMENT_ACCEPTED_MIME_TYPES } from '../types/document';
import { insertImageIntoEditor, type ImageUploadFn, type AfterImageInsertFn } from '../services/imageInsertService';
import type { Editor } from '@tiptap/core';

/** Convert MIME type readonly array to mutable string array for FileHandler config */
const IMAGE_MIME_TYPES = [...IMAGE_ACCEPTED_MIME_TYPES] as string[];
const DOCUMENT_MIME_TYPES = [...DOCUMENT_ACCEPTED_MIME_TYPES] as string[];
const ALL_ALLOWED_MIME_TYPES = [...IMAGE_MIME_TYPES, ...DOCUMENT_MIME_TYPES];

/** Callback type for document insertion (bound to a specific node context) */
export type DocumentInsertFn = (editor: Editor, file: File) => Promise<void>;

/**
 * Create a configured FileHandler extension bound to upload functions.
 * Must be called per-editor instance since upload functions capture node context.
 */
export function createFileHandlerExtension(
    imageUploadFn: ImageUploadFn,
    documentInsertFn?: DocumentInsertFn,
    onAfterImageInsert?: AfterImageInsertFn,
) {
    return FileHandler.configure({
        allowedMimeTypes: ALL_ALLOWED_MIME_TYPES,
        onDrop: (currentEditor, files, pos) => {
            const imageFile = files.find((f) => IMAGE_MIME_TYPES.includes(f.type));
            if (imageFile) {
                currentEditor.commands.focus(pos);
                void insertImageIntoEditor(currentEditor, imageFile, imageUploadFn, onAfterImageInsert);
                return;
            }
            const docFile = files.find((f) => DOCUMENT_MIME_TYPES.includes(f.type));
            if (docFile && documentInsertFn) {
                currentEditor.commands.focus(pos);
                void documentInsertFn(currentEditor, docFile);
            }
        },
        onPaste: (currentEditor, files) => {
            const imageFile = files.find((f) => IMAGE_MIME_TYPES.includes(f.type));
            if (imageFile) {
                void insertImageIntoEditor(currentEditor, imageFile, imageUploadFn, onAfterImageInsert);
                return;
            }
            const docFile = files.find((f) => DOCUMENT_MIME_TYPES.includes(f.type));
            if (docFile && documentInsertFn) {
                void documentInsertFn(currentEditor, docFile);
            }
        },
    });
}
