/** SynthesisFooter — source trace and re-synthesize action for synthesis nodes */
import React, { useCallback } from 'react';
import { useCanvasStore } from '@/features/canvas/stores/canvasStore';
import { synthesisStrings } from '../strings/synthesisStrings';

interface SynthesisFooterProps {
    readonly sourceCount: number;
    readonly sourceNodeIds: readonly string[];
    readonly onReSynthesize: () => void;
}

/** Footer bar on synthesis nodes showing source count, highlight-sources action, and re-synthesize button. */
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
        <div className="flex items-center justify-between border-t border-[var(--color-border)] text-[var(--color-text-secondary)]" style={{ fontSize: 'var(--font-size-xs)', padding: '4px 8px' }}>
            <button className="border-none text-[var(--node-status-synthesis)] cursor-pointer underline underline-offset-[var(--space-xxs)] hover:opacity-[var(--opacity-hover-subtle)]" style={{ background: 'transparent', fontSize: 'var(--font-size-xs)', padding: 0 }} onClick={handleHighlightSources} type="button" aria-label={synthesisStrings.labels.highlightSources}>
                {synthesisStrings.labels.viewSources(sourceCount)}
            </button>
            <button
                className="rounded-sm text-[var(--color-text-secondary)] cursor-pointer leading-none hover:bg-[var(--color-hover)] hover:text-[var(--node-status-synthesis)]"
                style={{ background: 'transparent', border: '1px solid var(--color-border)', fontSize: 'var(--font-size-sm)', padding: '2px 4px' }}
                onClick={onReSynthesize}
                type="button"
                aria-label={synthesisStrings.labels.reSynthesize}
            >
                ↻
            </button>
        </div>
    );
});
