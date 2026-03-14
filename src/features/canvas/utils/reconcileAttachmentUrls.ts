/**
 * reconcileAttachmentUrls — Patches empty attachment URLs in node output
 * using the authoritative AttachmentMeta stored in the node's attachments array.
 *
 * Root cause: When a user blurs (clicks away) before a document upload
 * completes, handleBlur saves the TipTap output with url: "". The upload
 * finishes and writes the URL to the attachments array, but the TipTap
 * output is never retroactively updated.
 *
 * This utility runs at node load time to heal that data inconsistency.
 */
import type { AttachmentMeta } from '../types/document';

interface AttachmentPayload {
    url: string;
    filename: string;
    thumbnailUrl: string | null;
    mimeType: string;
}

const DATA_ATTR_REGEX = /data-attachment='(\{[^']*\})'/g;

/**
 * Reconcile attachment URLs in a node's HTML output with its attachments array.
 * Returns the patched output, or the original if nothing needed fixing.
 */
export function reconcileAttachmentUrls(
    output: string,
    attachments: AttachmentMeta[] | undefined,
): string {
    if (!output || !attachments?.length) return output;

    const attachmentsByFilename = new Map<string, AttachmentMeta>();
    for (const meta of attachments) {
        if (meta.url) attachmentsByFilename.set(meta.filename, meta);
    }
    if (attachmentsByFilename.size === 0) return output;

    let patched = false;

    const result = output.replace(DATA_ATTR_REGEX, (fullMatch, json: string) => {
        try {
            const payload = JSON.parse(json) as Partial<AttachmentPayload>;
            if (payload.url || !payload.filename) return fullMatch;

            const meta = attachmentsByFilename.get(payload.filename);
            if (!meta) return fullMatch;

            const fixed: AttachmentPayload = {
                url: meta.url,
                filename: meta.filename,
                thumbnailUrl: meta.thumbnailUrl ?? null,
                mimeType: meta.mimeType,
            };
            patched = true;
            return `data-attachment='${JSON.stringify(fixed)}'`;
        } catch {
            return fullMatch;
        }
    });

    return patched ? result : output;
}
