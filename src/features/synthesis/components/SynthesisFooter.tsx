/** SynthesisFooter — source trace and re-synthesize action for synthesis nodes */
import React, { useCallback } from 'react';
import { useCanvasStore } from '@/features/canvas/stores/canvasStore';
import { synthesisStrings } from '../strings/synthesisStrings';
import styles from './SynthesisFooter.module.css';

interface SynthesisFooterProps {
    readonly sourceCount: number;
    readonly sourceNodeIds: readonly string[];
    readonly onReSynthesize: () => void;
}

export const SynthesisFooter = React.memo(function SynthesisFooter({
    sourceCount,
    sourceNodeIds,
    onReSynthesize,
}: SynthesisFooterProps) {
    const handleHighlightSources = useCallback(() => {
        const store = useCanvasStore.getState();
        store.clearSelection();
        sourceNodeIds.forEach((id) => store.selectNode(id));
    }, [sourceNodeIds]);

    return (
        <div className={styles.footer}>
            <button className={styles.sourceLink} onClick={handleHighlightSources} type="button" aria-label={synthesisStrings.labels.highlightSources}>
                {synthesisStrings.labels.viewSources(sourceCount)}
            </button>
            <button
                className={styles.reSynthBtn}
                onClick={onReSynthesize}
                type="button"
                aria-label={synthesisStrings.labels.reSynthesize}
            >
                ↻
            </button>
        </div>
    );
});
