/**
 * IdeaCardUploadOverlay — subtle node-level indicator during document upload.
 * Pure presentational component. No Zustand selectors, no store subscriptions.
 */
import React from 'react';
import { strings } from '@/shared/localization/strings';
import styles from './IdeaCard.module.css';

interface Props {
    visible: boolean;
}

export const IdeaCardUploadOverlay = React.memo(function IdeaCardUploadOverlay({ visible }: Props) {
    if (!visible) return null;

    return (
        <div className={styles.uploadOverlay} role="status" aria-live="polite">
            <span className={styles.uploadSpinner} aria-hidden="true" />
            <span className={styles.uploadLabel}>{strings.canvas.docUploading}</span>
        </div>
    );
});
