/**
 * Image Insert Service — Progressive image insertion into TipTap editors
 * Pure functions (no React hooks) for focus restoration and image lifecycle
 */
import type { Editor } from '@tiptap/core';
import { strings } from '@/shared/localization/strings';
import { toast } from '@/shared/stores/toastStore';
import { isSafeImageSrc } from '../extensions/imageExtension';
import { sanitizeFilename } from '@/shared/utils/sanitize';
import { captureError } from '@/shared/services/sentryService';

export type ImageUploadFn = (file: File) => Promise<string>;

export type AfterImageInsertFn = (file: File, permanentUrl: string) => void;

/**
 * Restore focus to the TipTap editor if it is blurred.
 * Places cursor at end so inserted content appends naturally.
 * No-op when the editor already has focus (preserves cursor position).
 */
export function ensureEditorFocus(editor: Editor | null): void {
    if (!editor || editor.isDestroyed) return;
    if (!editor.isFocused) {
        editor.commands.focus('end');
    }
}

/** Read a File as a base64 data URL */
function readAsDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error(strings.canvas.imageReadFailed));
        reader.readAsDataURL(file);
    });
}

/** Known localized error messages that should be shown as-is */
const KNOWN_ERROR_MESSAGES = new Set([
    strings.canvas.imageFileTooLarge,
    strings.canvas.imageUnsupportedType,
    strings.canvas.imageReadFailed,
]);

/** Extract a user-facing message from an upload error */
function getUploadErrorMessage(error: unknown): string {
    if (error instanceof Error && KNOWN_ERROR_MESSAGES.has(error.message)) {
        return error.message;
    }
    return strings.canvas.imageUploadFailed;
}

/**
 * Insert an image into the editor using progressive upload:
 * 1. Insert base64 placeholder immediately
 * 2. Upload to permanent storage
 * 3. Replace base64 src with permanent URL
 */
export async function insertImageIntoEditor(
    editor: Editor | null,
    file: File,
    uploadFn: ImageUploadFn,
    onAfterInsert?: AfterImageInsertFn,
): Promise<void> {
    if (!editor || editor.isDestroyed) return;

    ensureEditorFocus(editor);

    const dataUrl = await readAsDataUrl(file);
    editor.chain().focus().setImage({ src: dataUrl, alt: sanitizeFilename(file.name) }).run();

    try {
        toast.info(strings.canvas.imageUploading);
        const permanentUrl = await uploadFn(file);
        if (!isSafeImageSrc(permanentUrl)) {
            removeImageBySrc(editor, dataUrl);
            toast.error(strings.canvas.imageUnsafeUrl);
            return;
        }
        replaceImageSrc(editor, dataUrl, permanentUrl);
        try { onAfterInsert?.(file, permanentUrl); } catch (e: unknown) { captureError(e instanceof Error ? e : new Error(String(e))); }
    } catch (error: unknown) {
        removeImageBySrc(editor, dataUrl);
        toast.error(getUploadErrorMessage(error));
    }
}

/** Replace the src of an image node matching oldSrc with newSrc */
function replaceImageSrc(editor: Editor, oldSrc: string, newSrc: string): void {
    const { doc, tr } = editor.state;
    doc.descendants((node, pos) => {
        if (node.type.name === 'image' && node.attrs.src === oldSrc) {
            tr.setNodeMarkup(pos, undefined, { ...node.attrs, src: newSrc });
        }
    });
    editor.view.dispatch(tr);
}

/**
 * Remove image nodes matching the given src (cleanup on upload failure).
 * Collects positions first, then deletes bottom-to-top to avoid position shift.
 */
function removeImageBySrc(editor: Editor, src: string): void {
    const { doc, tr } = editor.state;
    const positions: Array<{ pos: number; size: number }> = [];
    doc.descendants((node, pos) => {
        if (node.type.name === 'image' && node.attrs.src === src) {
            positions.push({ pos, size: node.nodeSize });
        }
    });
    for (const { pos, size } of positions.reverse()) {
        tr.delete(pos, pos + size);
    }
    editor.view.dispatch(tr);
}
