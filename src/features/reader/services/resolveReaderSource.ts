/**
 * resolveReaderSource — Single validation path for building a ReaderSource
 * from attachment node attributes. Returns null if unsupported or invalid.
 */
import type { ReaderSource } from '../types/reader';
import { toSafeReaderUrl, isReaderSupportedMime } from '../utils/safeUrl';

interface AttachmentLike {
    url: string;
    filename: string;
    mimeType: string;
}

function hashSourceId(input: string): string {
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
        hash = ((hash << 5) - hash + input.charCodeAt(i)) | 0;
    }
    return (hash >>> 0).toString(36);
}

export function resolveReaderSource(attachment: AttachmentLike): ReaderSource | null {
    if (!isReaderSupportedMime(attachment.mimeType)) return null;

    const safeUrl = toSafeReaderUrl(attachment.url);
    if (!safeUrl) return null;

    const sourceId = `att-${hashSourceId(attachment.url)}`;

    if (attachment.mimeType === 'application/pdf') {
        return {
            type: 'pdf',
            url: safeUrl,
            filename: attachment.filename,
            sourceId,
            mime: 'application/pdf',
        };
    }

    return {
        type: 'image',
        url: safeUrl,
        filename: attachment.filename,
        sourceId,
        mime: attachment.mimeType,
    };
}
