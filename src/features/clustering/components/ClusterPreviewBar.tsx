/** ClusterPreviewBar — floating accept/dismiss bar during cluster preview */
import React from 'react';
import { clusterStrings } from '@/shared/localization/clusterStrings';
import type { ClusterPhase } from '../stores/clusterPreviewStore';
import type { ClusterGroup } from '../types/cluster';
import styles from './ClusterPreviewBar.module.css';

interface ClusterPreviewBarProps {
    readonly phase: ClusterPhase;
    readonly previewGroups: readonly ClusterGroup[] | null;
    readonly onAccept: () => void;
    readonly onDismiss: () => void;
}

export const ClusterPreviewBar = React.memo(function ClusterPreviewBar({ phase, previewGroups, onAccept, onDismiss }: ClusterPreviewBarProps) {
    if (phase === 'idle') return null;

    const isLoading = phase === 'computing' || phase === 'labeling';
    const text = isLoading
        ? clusterStrings.labels.analyzing
        : clusterStrings.labels.foundThemes(previewGroups?.length ?? 0);

    return (
        <div className={styles.bar} role="status">
            <span className={styles.text}>{text}</span>
            {phase === 'preview' && (
                <>
                    <button className={styles.button} onClick={onAccept} aria-label={clusterStrings.labels.accept}>
                        {clusterStrings.labels.accept}
                    </button>
                    <button className={styles.button} onClick={onDismiss} aria-label={clusterStrings.labels.dismiss}>
                        {clusterStrings.labels.dismiss}
                    </button>
                </>
            )}
        </div>
    );
});
