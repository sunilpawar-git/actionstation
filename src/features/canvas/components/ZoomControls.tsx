import { memo, useCallback } from 'react';
import { useReactFlow } from '@xyflow/react';
import { useSettingsStore } from '@/shared/stores/settingsStore';
import { strings } from '@/shared/localization/strings';
import { UndoRedoButtons } from './UndoRedoButtons';
import { CanvasRadar } from './CanvasRadar';
import styles from './ZoomControls.module.css';

/**
 * Custom Zoom Controls component.
 * Replaces the default ReactFlow Controls to add Undo/Redo + Lock button
 * and allow full TDD coverage.
 */
export const ZoomControls = memo(function ZoomControls() {
    const { zoomIn, zoomOut } = useReactFlow();
    const isCanvasLocked = useSettingsStore((s) => s.isCanvasLocked);

    const handleToggleLock = useCallback(() => {
        useSettingsStore.getState().toggleCanvasLocked();
    }, []);

    const zc = strings.canvas.zoomControls;
    const lockLabel = isCanvasLocked ? zc.unlockCanvas : zc.lockCanvas;

    return (
        <div className={styles.container} data-testid="zoom-controls">
            <CanvasRadar />

            {/* Undo/Redo buttons — extracted to UndoRedoButtons for selector-based rendering */}
            <UndoRedoButtons />

            <div className={styles.divider} />

            <button
                className={styles.button}
                onClick={() => zoomIn()}
                aria-label={zc.zoomIn}
                title={zc.zoomIn}
                disabled={isCanvasLocked}
            >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
            </button>
            <button
                className={styles.button}
                onClick={() => zoomOut()}
                aria-label={zc.zoomOut}
                title={zc.zoomOut}
                disabled={isCanvasLocked}
            >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
            </button>

            <button
                className={`${styles.button} ${isCanvasLocked ? styles.active : ''}`}
                onClick={handleToggleLock}
                aria-label={lockLabel}
                title={lockLabel}
                data-testid="lock-button"
            >
                {isCanvasLocked ? (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                ) : (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                        <path d="M7 11V7a5 5 0 0 1 9.9-1" />
                    </svg>
                )}
            </button>
        </div>
    );
});
