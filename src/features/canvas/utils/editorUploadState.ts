/**
 * Editor Upload State — derives document upload status from TipTap editor state.
 * Pure function, no side effects. Used by useIdeaCard via useEditorState selector.
 */
import type { Editor } from '@tiptap/core';

/** Returns true if any attachment node in the editor has status 'uploading' */
export function hasUploadingAttachment(editor: Editor | null): boolean {
    if (!editor || editor.isDestroyed) return false;
    /* eslint-disable @typescript-eslint/no-unnecessary-condition, @typescript-eslint/strict-boolean-expressions -- state/doc may be undefined in test mocks */
    const doc = editor.state?.doc;
    if (!doc) return false;
    /* eslint-enable @typescript-eslint/no-unnecessary-condition, @typescript-eslint/strict-boolean-expressions */
    let found = false;
    doc.descendants((node) => {
        if (!found && node.type.name === 'attachment' && node.attrs.status === 'uploading') {
            found = true;
        }
        return !found;
    });
    return found;
}
