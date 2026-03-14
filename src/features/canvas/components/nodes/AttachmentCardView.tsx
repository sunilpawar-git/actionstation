/**
 * AttachmentCardView — TipTap ReactNodeView for document attachment blocks.
 * Renders a rich card: thumbnail/icon, filename, upload status, and action menu.
 * Includes "Open in Reader" action for PDF/image attachments (Phase 11).
 * Memoized per CLAUDE.md performance rules.
 */
import React, { useCallback } from 'react';
import { NodeViewWrapper } from '@tiptap/react';
import type { NodeViewProps } from '@tiptap/react';
import type { AttachmentNodeAttrs, AttachmentStatus, AttachmentExtensionOptions } from '../../extensions/attachmentExtension';
import { isReaderSupportedMime } from '@/features/reader/utils/safeUrl';
import { strings } from '@/shared/localization/strings';
import { isSafeUrl, getIconLabel } from './AttachmentCardView.utils';
import styles from './AttachmentCardView.module.css';

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

export const AttachmentCardView = React.memo(function AttachmentCardView({ node, deleteNode, extension }: NodeViewProps) {
    const attrs = node.attrs as AttachmentNodeAttrs;
    const { url, filename, thumbnailUrl, mimeType, status } = attrs;
    const extOptions = extension.options as AttachmentExtensionOptions;

    const canOpenInReader = isReaderSupportedMime(mimeType) && isSafeUrl(url) && !!extOptions.onOpenReader;

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

    const handleOpenReader = useCallback(() => {
        if (!canOpenInReader || !extOptions.onOpenReader) return;
        extOptions.onOpenReader(extOptions.nodeId ?? '', url, filename, mimeType);
    }, [canOpenInReader, extOptions, url, filename, mimeType]);

    const iconLabel = getIconLabel(mimeType, filename);

    return (
        <NodeViewWrapper className={styles.wrapper} data-drag-handle>
            <div className={`${styles.card} ${status === 'uploading' ? styles.cardUploading : ''}`}
                role="group" aria-label={filename}>
                <div className={styles.thumb}>
                    {thumbnailUrl && isSafeUrl(thumbnailUrl)
                        ? <img src={thumbnailUrl} alt={filename} className={styles.thumbImg} loading="lazy" />
                        : <span className={styles.thumbIcon} aria-hidden="true">{iconLabel}</span>
                    }
                </div>

                <div className={styles.meta}>
                    <span className={styles.filename} title={filename}>{filename}</span>
                    <StatusBadge status={status} />
                </div>

                {status !== 'uploading' && (
                    <div className={styles.actions}>
                        {canOpenInReader && (
                            <button type="button" className={`${styles.actionBtn} ${styles.readerBtn}`}
                                onClick={handleOpenReader} title={strings.reader.openInReader}
                                aria-label={strings.reader.openInReader}>📖</button>
                        )}
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
