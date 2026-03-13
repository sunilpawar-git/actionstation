/**
 * IconItem — Single icon row in the ToolbarSection drag-and-drop zone.
 * Extracted from ToolbarSection to stay under the 300-line guardrail.
 */
import React from 'react';
import { strings } from '@/shared/localization/strings';
import { ACTION_REGISTRY, type ActionId } from '@/shared/stores/iconRegistry';
import styles from './ToolbarSection.module.css';

export type ZoneId = 'utilsBar' | 'contextMenu' | 'unplaced';

export interface IconItemProps {
    id: ActionId;
    zone: ZoneId;
    index: number;
    total: number;
    isDragging: boolean;
    isDropTarget: boolean;
    onDragStart: (id: ActionId, zone: ZoneId) => void;
    onDragOver: (e: React.DragEvent, zone: ZoneId, index: number) => void;
    onDragLeave: () => void;
    onDrop: (zone: ZoneId, index: number) => void;
    onDragEnd: () => void;
    onMoveUp: (zone: ZoneId, id: ActionId) => void;
    onMoveDown: (zone: ZoneId, id: ActionId) => void;
    onRemove: (zone: ZoneId, id: ActionId) => void;
}

export function IconItem({
    id, zone, index, total, isDragging, isDropTarget,
    onDragStart, onDragOver, onDragLeave, onDrop, onDragEnd,
    onMoveUp, onMoveDown, onRemove,
}: IconItemProps) {
    const meta = ACTION_REGISTRY.get(id);
    if (!meta) return null;

    return (
        <div
            className={`${styles.buttonItem} ${isDragging ? styles.dragging : ''} ${isDropTarget ? styles.dropTarget : ''}`}
            draggable
            onDragStart={() => onDragStart(id, zone)}
            onDragOver={(e) => onDragOver(e, zone, index)}
            onDragLeave={onDragLeave}
            onDrop={() => onDrop(zone, index)}
            onDragEnd={onDragEnd}
            data-testid={`toolbar-btn-${id}`}
        >
            <span className={styles.dragHandle} aria-hidden="true">⠿</span>
            <span className={styles.buttonIcon}>{meta.icon}</span>
            <span className={styles.buttonLabel}>{meta.label()}</span>
            <span className={styles.buttonActions}>
                <button
                    className={styles.actionBtn}
                    onClick={() => onMoveUp(zone, id)}
                    disabled={index === 0}
                    aria-label={`${strings.settings.toolbarMoveUp} ${meta.label()}`}
                    title={strings.settings.toolbarMoveUp}
                    type="button"
                >
                    ↑
                </button>
                <button
                    className={styles.actionBtn}
                    onClick={() => onMoveDown(zone, id)}
                    disabled={index === total - 1}
                    aria-label={`${strings.settings.toolbarMoveDown} ${meta.label()}`}
                    title={strings.settings.toolbarMoveDown}
                    type="button"
                >
                    ↓
                </button>
                <button
                    className={`${styles.actionBtn} ${styles.removeBtn}`}
                    onClick={() => onRemove(zone, id)}
                    aria-label={`${strings.settings.toolbarRemove} ${meta.label()}`}
                    title={strings.settings.toolbarRemove}
                    type="button"
                >
                    ✕
                </button>
            </span>
        </div>
    );
}
