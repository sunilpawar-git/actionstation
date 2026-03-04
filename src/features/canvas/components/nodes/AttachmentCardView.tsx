/**
 * AttachmentCardView — TipTap ReactNodeView for document attachment blocks.
 * Renders a rich card: thumbnail/icon, filename, upload status, and action menu.
 * Memoized per CLAUDE.md performance rules.
 */
import React, { useCallback } from 'react';
import { NodeViewWrapper } from '@tiptap/react';
import type { NodeViewProps } from '@tiptap/react';
import type { AttachmentNodeAttrs, AttachmentStatus } from '../../extensions/attachmentExtension';
import { DOCUMENT_TYPE_LABELS } from '../../types/document';
import { strings } from '@/shared/localization/strings';
import styles from './AttachmentCardView.module.css';

const SAFE_URL_SCHEMES = /^https?:\/\//i;

/** Validates URL has a safe scheme (http/https only) */
export function isSafeUrl(url: string): boolean {
    return SAFE_URL_SCHEMES.test(url);
}

/** Derive a display label from MIME type, falling back to the uppercased file extension */
export function getIconLabel(mimeType: string, filename: string): string {
    const label = DOCUMENT_TYPE_LABELS[mimeType as keyof typeof DOCUMENT_TYPE_LABELS];
    if (mimeType && label) return label;
    const ext = filename.split('.').pop()?.toUpperCase();
    return ext && ext.length > 0 ? ext : '?';
}

interface StatusBadgeProps {
    status: AttachmentStatus;
}

const StatusBadge = React.memo(function StatusBadge({ status }: StatusBadgeProps) {
    if (status === 'uploading') {
        return (
            <span className={styles.statusUploading} aria-live="polite">
                <span className={styles.spinner} aria-hidden="true" />
                {strings.canvas.docUploading}
            </span>
        );
    }
    if (status === 'ready') {
        return (
            <span className={styles.statusReady} title={strings.canvas.docAiReadyTooltip}>
                ✦ {strings.canvas.docAiReady}
            </span>
        );
    }
    return <span className={styles.statusError}>{strings.canvas.docUploadFailed}</span>;
});

export const AttachmentCardView = React.memo(function AttachmentCardView({ node, deleteNode }: NodeViewProps) {
    const attrs = node.attrs as AttachmentNodeAttrs;
    const { url, filename, thumbnailUrl, mimeType, status } = attrs;

    const handleDownload = useCallback(() => {
        if (!url || !isSafeUrl(url)) return;
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.rel = 'noopener noreferrer';
        a.click();
    }, [url, filename]);

    const handleOpenNewTab = useCallback(() => {
        if (url && isSafeUrl(url)) window.open(url, '_blank', 'noopener,noreferrer');
    }, [url]);

    const handleRemove = useCallback(() => {
        deleteNode();
    }, [deleteNode]);

    const iconLabel = getIconLabel(mimeType, filename);

    return (
        <NodeViewWrapper className={styles.wrapper} data-drag-handle>
            <div className={`${styles.card} ${status === 'uploading' ? styles.cardUploading : ''}`}
                role="group" aria-label={filename}>
                {/* Thumbnail or file-type icon */}
                <div className={styles.thumb}>
                    {thumbnailUrl && isSafeUrl(thumbnailUrl)
                        ? <img src={thumbnailUrl} alt={filename} className={styles.thumbImg} loading="lazy" />
                        : <span className={styles.thumbIcon} aria-hidden="true">{iconLabel}</span>
                    }
                </div>

                {/* Metadata */}
                <div className={styles.meta}>
                    <span className={styles.filename} title={filename}>{filename}</span>
                    <StatusBadge status={status} />
                </div>

                {/* Actions */}
                {status !== 'uploading' && (
                    <div className={styles.actions}>
                        <button type="button" className={styles.actionBtn}
                            onClick={handleDownload} title={strings.canvas.docDownload}
                            aria-label={strings.canvas.docDownload}>↓</button>
                        <button type="button" className={styles.actionBtn}
                            onClick={handleOpenNewTab} title={strings.canvas.docOpenNewTab}
                            aria-label={strings.canvas.docOpenNewTab}>↗</button>
                        <button type="button" className={`${styles.actionBtn} ${styles.removeBtn}`}
                            onClick={handleRemove} title={strings.canvas.docRemove}
                            aria-label={strings.canvas.docRemove}>×</button>
                    </div>
                )}
            </div>
        </NodeViewWrapper>
    );
});
