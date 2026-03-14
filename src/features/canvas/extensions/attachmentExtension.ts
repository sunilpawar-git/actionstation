/**
 * AttachmentExtension — TipTap block-level Node for document attachments
 *
 * Stores url, filename, thumbnailUrl, status as node attrs.
 * Atomic: the whole node is selected/deleted as a single unit.
 * Serializes to <div data-attachment='{json}'> for lossless markdown round-trips.
 *
 * Supports optional `onOpenReader` callback threaded via .configure() for
 * opening PDF/image attachments in the reader workspace (Phase 11).
 */
import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { AttachmentCardView } from '../components/nodes/AttachmentCardView';

export type AttachmentStatus = 'uploading' | 'ready' | 'error';

/** Typed attrs for the attachment node */
export interface AttachmentNodeAttrs {
    url: string;
    filename: string;
    thumbnailUrl: string | null;
    /** MIME type of the original file — used by AttachmentCardView for icon display */
    mimeType: string;
    status: AttachmentStatus;
    /** Transient ID used to locate the node during an in-progress upload */
    tempId: string | null;
}

/** JSON payload persisted in data-attachment (tempId + status are excluded — transient) */
interface AttachmentPayload {
    url: string;
    filename: string;
    thumbnailUrl: string | null;
    mimeType: string;
}

/** Extension options threaded via .configure() */
export interface AttachmentExtensionOptions {
    /** Canvas node ID — identifies which IdeaCard owns this editor */
    nodeId?: string;
    /** Callback to open an attachment in the reader workspace */
    onOpenReader?: (nodeId: string, url: string, filename: string, mimeType: string) => void;
}

export const AttachmentExtension = Node.create<AttachmentExtensionOptions, object>({
    name: 'attachment',
    group: 'block',
    atom: true,
    selectable: true,
    draggable: true,

    addOptions() {
        return { nodeId: undefined, onOpenReader: undefined };
    },

    addAttributes(): Record<keyof AttachmentNodeAttrs, object> {
        return {
            url: { default: '' },
            filename: { default: '' },
            thumbnailUrl: { default: null },
            mimeType: { default: '' },
            status: { default: 'ready' as AttachmentStatus },
            tempId: { default: null },
        };
    },

    parseHTML() {
        return [
            {
                tag: 'div[data-attachment]',
                getAttrs: (el) => {
                    try {
                        const raw = el.getAttribute('data-attachment') ?? '{}';
                        const parsed = JSON.parse(raw) as Partial<AttachmentPayload>;
                    return {
                        url: parsed.url ?? '',
                        filename: parsed.filename ?? '',
                        thumbnailUrl: parsed.thumbnailUrl ?? null,
                        mimeType: parsed.mimeType ?? '',
                        status: 'ready' as AttachmentStatus,
                        tempId: null,
                    };
                    } catch {
                        return false;
                    }
                },
            },
        ];
    },

    renderHTML({ node }) {
        const payload: AttachmentPayload = {
            url: node.attrs.url as string,
            filename: node.attrs.filename as string,
            thumbnailUrl: (node.attrs.thumbnailUrl as string | null) ?? null,
            mimeType: node.attrs.mimeType as string,
        };
        return ['div', mergeAttributes({
            'data-attachment': JSON.stringify(payload),
            class: 'attachment-node',
        })];
    },

    addNodeView() {
        return ReactNodeViewRenderer(AttachmentCardView);
    },
});
