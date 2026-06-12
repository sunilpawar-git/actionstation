import React, { useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import type { BranchNode } from '../services/branchTraversal';
import { useExportDialog } from '../hooks/useExportDialog';
import { ExportPreview } from './ExportPreview';
import { exportStrings } from '../strings/exportStrings';
import { strings } from '@/shared/localization/strings';
import { useEscapeLayer } from '@/shared/hooks/useEscapeLayer';
import { ESCAPE_PRIORITY } from '@/shared/hooks/escapePriorities';
import { useFocusTrap } from '@/shared/hooks/useFocusTrap';
import styles from './ExportDialog.module.css';

interface ExportDialogProps {
    readonly roots: readonly BranchNode[];
    readonly onClose: () => void;
}

export const ExportDialog = React.memo(function ExportDialog({ roots, onClose }: ExportDialogProps) {
    const { markdown, isPolishing, togglePolish, copyToClipboard, download } = useExportDialog(roots);
    const dialogRef = useRef<HTMLDivElement>(null);
    useFocusTrap(dialogRef, true);

    // Escape closes the dialog at MODAL priority (80), the highest level.
    // This integrates ExportDialog into the centralized escape-layer system so
    // it respects priority ordering: dialog (80) closes before settings (70),
    // which closes before clear-selection (10), etc.
    // `true` is hardcoded — component is only rendered when the dialog is
    // visible (conditional render at parent), so the layer is always active
    // while mounted. If this ever changes to render-always/show-with-CSS,
    // wire `isVisible` as the active flag instead.
    useEscapeLayer(ESCAPE_PRIORITY.MODAL, true, onClose);

    const handleBackdropClick = useCallback(() => onClose(), [onClose]);
    const stopPropagation = useCallback((e: React.MouseEvent) => e.stopPropagation(), []);

    return createPortal(
        <div className={styles.backdrop} onClick={handleBackdropClick}>
            <div
                ref={dialogRef}
                className={styles.dialog}
                role="dialog"
                aria-modal="true"
                aria-label={exportStrings.labels.exportSelection}
                onClick={stopPropagation}
            >
                <header className={styles.header}>
                    <h2 className={styles.title}>{exportStrings.labels.exportSelection}</h2>
                    <button className={styles.closeBtn} onClick={onClose} type="button" aria-label={strings.common.closeSymbol}>
                        {strings.common.closeSymbol}
                    </button>
                </header>
                <ExportPreview content={markdown} />
                <footer className={styles.actions}>
                    <button className={styles.actionBtn} onClick={togglePolish} disabled={isPolishing} type="button">
                        {isPolishing ? exportStrings.labels.polishing : exportStrings.labels.polish}
                    </button>
                    <button className={styles.actionBtn} onClick={copyToClipboard} type="button">
                        {exportStrings.labels.copyToClipboard}
                    </button>
                    <button className={styles.actionBtnPrimary} onClick={download} type="button">
                        {exportStrings.labels.download}
                    </button>
                </footer>
            </div>
        </div>,
        document.body
    );
});
