/**
 * UndoRedoButtons — Compact undo/redo controls for the canvas toolbar.
 * Extracted from ZoomControls for separation of concerns.
 * Uses selectCanUndo/selectCanRedo selectors for minimal re-renders
 * (only re-renders when emptiness toggles, not on every stack push).
 */
import { memo, useCallback } from 'react';
import { useHistoryStore, selectCanUndo, selectCanRedo } from '../stores/historyStore';
import { strings } from '@/shared/localization/strings';
import styles from './ZoomControls.module.css';

export const UndoRedoButtons = memo(function UndoRedoButtons() {
    const canUndo = useHistoryStore(selectCanUndo);
    const canRedo = useHistoryStore(selectCanRedo);
    const hc = strings.canvas.history;

    const handleUndo = useCallback(() => {
        useHistoryStore.getState().dispatch({ type: 'UNDO', source: 'button' });
    }, []);

    const handleRedo = useCallback(() => {
        useHistoryStore.getState().dispatch({ type: 'REDO', source: 'button' });
    }, []);

    return (
        <>
            <button
                className={`${styles.button} ${!canUndo ? styles.disabled : ''}`}
                onClick={handleUndo}
                disabled={!canUndo}
                aria-label={hc.undoButton}
                title={hc.undoTooltip}
                data-testid="undo-button"
            >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 7v6h6" />
                    <path d="M3 13a9 9 0 0 1 15.36-6.36" />
                </svg>
            </button>
            <button
                className={`${styles.button} ${!canRedo ? styles.disabled : ''}`}
                onClick={handleRedo}
                disabled={!canRedo}
                aria-label={hc.redoButton}
                title={hc.redoTooltip}
                data-testid="redo-button"
            >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 7v6h-6" />
                    <path d="M21 13a9 9 0 0 0-15.36-6.36" />
                </svg>
            </button>
        </>
    );
});
