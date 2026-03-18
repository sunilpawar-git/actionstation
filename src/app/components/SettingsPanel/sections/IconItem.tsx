/**
 * IconItem — Single icon row in the ToolbarSection drag-and-drop zone.
 * Extracted from ToolbarSection to stay under the 300-line guardrail.
 */
import React from 'react';
import clsx from 'clsx';
import { strings } from '@/shared/localization/strings';
import { ACTION_REGISTRY, type ActionId } from '@/shared/stores/iconRegistry';
import {
    TB_BUTTON_ITEM, TB_BUTTON_ITEM_STYLE, TB_DRAGGING, TB_DROP_TARGET, TB_DROP_TARGET_STYLE,
    TB_DRAG_HANDLE, TB_DRAG_HANDLE_STYLE, TB_BUTTON_ICON, TB_BUTTON_LABEL, TB_BUTTON_LABEL_STYLE,
    TB_BUTTON_ACTIONS, TB_BUTTON_ACTIONS_STYLE, TB_ACTION_BTN, TB_ACTION_BTN_STYLE,
    TB_ACTION_BTN_DISABLED_STYLE,
} from './toolbarSectionStyles';

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

export const IconItem = React.memo(function IconItem({
    id, zone, index, total, isDragging, isDropTarget,
    onDragStart, onDragOver, onDragLeave, onDrop, onDragEnd,
    onMoveUp, onMoveDown, onRemove,
}: IconItemProps) {
    const meta = ACTION_REGISTRY.get(id);
    if (!meta) return null;

    const itemStyle = isDropTarget
        ? { ...TB_BUTTON_ITEM_STYLE, ...TB_DROP_TARGET_STYLE }
        : TB_BUTTON_ITEM_STYLE;

    return (
        <div
            className={clsx(TB_BUTTON_ITEM, isDragging && TB_DRAGGING, isDropTarget && TB_DROP_TARGET)}
            style={itemStyle}
            draggable
            onDragStart={() => onDragStart(id, zone)}
            onDragOver={(e) => onDragOver(e, zone, index)}
            onDragLeave={onDragLeave}
            onDrop={() => onDrop(zone, index)}
            onDragEnd={onDragEnd}
            data-testid={`toolbar-btn-${id}`}
        >
            <span className={TB_DRAG_HANDLE} style={TB_DRAG_HANDLE_STYLE} aria-hidden="true">⠿</span>
            <span className={TB_BUTTON_ICON}>{meta.icon}</span>
            <span className={TB_BUTTON_LABEL} style={TB_BUTTON_LABEL_STYLE}>{meta.label()}</span>
            <span className={TB_BUTTON_ACTIONS} style={TB_BUTTON_ACTIONS_STYLE}>
                <button
                    className={TB_ACTION_BTN}
                    style={index === 0 ? TB_ACTION_BTN_DISABLED_STYLE : TB_ACTION_BTN_STYLE}
                    onClick={() => onMoveUp(zone, id)}
                    disabled={index === 0}
                    aria-label={`${strings.settings.toolbarMoveUp} ${meta.label()}`}
                    title={strings.settings.toolbarMoveUp}
                    type="button"
                >
                    ↑
                </button>
                <button
                    className={TB_ACTION_BTN}
                    style={index === total - 1 ? TB_ACTION_BTN_DISABLED_STYLE : TB_ACTION_BTN_STYLE}
                    onClick={() => onMoveDown(zone, id)}
                    disabled={index === total - 1}
                    aria-label={`${strings.settings.toolbarMoveDown} ${meta.label()}`}
                    title={strings.settings.toolbarMoveDown}
                    type="button"
                >
                    ↓
                </button>
                <button
                    className={TB_ACTION_BTN}
                    style={TB_ACTION_BTN_STYLE}
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
});
