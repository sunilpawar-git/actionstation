/**
 * IdeaCardSimilarResultsSection — Floating panel showing TF-IDF similar nodes.
 * Extracted from IdeaCard to keep it under max-lines-per-function.
 * Triggered by "Find Similar" in the node context menu.
 */
import React from 'react';
import { searchStrings } from '@/features/search/strings/searchStrings';
import type { SimilarResult } from '@/features/search/services/findSimilar';
import styles from './IdeaCardSimilarResults.module.css';

interface IdeaCardSimilarResultsSectionProps {
    readonly results: SimilarResult[];
    readonly isComputing: boolean;
    readonly onClose: () => void;
    readonly onNodeClick: (nodeId: string) => void;
}

export const IdeaCardSimilarResultsSection = React.memo(
    function IdeaCardSimilarResultsSection({
        results,
        isComputing,
        onClose,
        onNodeClick,
    }: IdeaCardSimilarResultsSectionProps) {
        return (
            <div className={styles.panel} role="dialog" aria-label={searchStrings.similarResults}>
                <div className={styles.header}>
                    <span className={styles.title}>{searchStrings.similarResults}</span>
                    <button
                        type="button"
                        className={styles.closeBtn}
                        onClick={onClose}
                        aria-label="Close similar nodes"
                    >
                        ✕
                    </button>
                </div>
                {isComputing ? (
                    <div className={styles.computing}>…</div>
                ) : results.length === 0 ? (
                    <div className={styles.empty}>{searchStrings.noSimilarResults}</div>
                ) : (
                    <ul className={styles.list}>
                        {results.map((r) => (
                            <li key={r.nodeId} className={styles.item}>
                                <button
                                    type="button"
                                    className={styles.itemBtn}
                                    onClick={() => onNodeClick(r.nodeId)}
                                    title={r.heading || r.nodeId}
                                >
                                    <span className={styles.itemHeading}>{r.heading || r.nodeId}</span>
                                    <span className={styles.itemScore}>
                                        {Math.round(r.similarity * 100)}%
                                    </span>
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        );
    },
);
