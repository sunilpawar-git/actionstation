/**
 * ToolbarZoneList — Renders a single icon zone (UtilsBar or ContextMenu) in the ToolbarSection.
 * Extracted from ToolbarSection to stay under max-lines-per-function.
 */
import React from 'react';
import clsx from 'clsx';
import { strings } from '@/shared/localization/strings';
import { type ActionId } from '@/shared/stores/iconRegistry';
import { IconItem, type ZoneId } from './IconItem';
import {
    TB_BUTTON_LIST, TB_BUTTON_LIST_STYLE, TB_DROP_ZONE_ACTIVE,
    TB_EMPTY_HINT, TB_EMPTY_HINT_STYLE,
} from './toolbarSectionStyles';

interface ToolbarZoneListProps {
    readonly zone: ZoneId;
    readonly icons: ActionId[];
    readonly maxCapacity: number;
    readonly dragId: ActionId | null;
    readonly dropTarget: { zone: ZoneId; index: number } | null;
    readonly onDragStart: (id: ActionId, zone: ZoneId) => void;
    readonly onDragOver: (e: React.DragEvent, zone: ZoneId, index: number) => void;
    readonly onDragLeave: () => void;
    readonly onDrop: (zone: ZoneId, index: number) => void;
    readonly onDragEnd: () => void;
    readonly onZoneDragOver: (e: React.DragEvent) => void;
    readonly onDropOnZone: (zone: ZoneId) => void;
    readonly onMoveUp: (zone: ZoneId, id: ActionId) => void;
    readonly onMoveDown: (zone: ZoneId, id: ActionId) => void;
    readonly onRemove: (zone: ZoneId, id: ActionId) => void;
}

export const ToolbarZoneList = React.memo(function ToolbarZoneList({
    zone, icons, maxCapacity, dragId, dropTarget,
    onDragStart, onDragOver, onDragLeave, onDrop, onDragEnd,
    onZoneDragOver, onDropOnZone, onMoveUp, onMoveDown, onRemove,
}: ToolbarZoneListProps) {
    const isFull = icons.length >= maxCapacity;

    return (
        <div
            className={clsx(TB_BUTTON_LIST, dragId && !isFull && TB_DROP_ZONE_ACTIVE)}
            style={TB_BUTTON_LIST_STYLE}
            onDragOver={onZoneDragOver}
            onDrop={() => onDropOnZone(zone)}
            data-testid={`toolbar-${zone === 'utilsBar' ? 'utilsbar' : 'contextmenu'}-list`}
        >
            {icons.length === 0 && (
                <span className={TB_EMPTY_HINT} style={TB_EMPTY_HINT_STYLE}>
                    {strings.settings.toolbarEmpty}
                </span>
            )}
            {icons.map((id, index) => (
                <IconItem
                    key={id}
                    id={id}
                    zone={zone}
                    index={index}
                    total={icons.length}
                    isDragging={dragId === id}
                    isDropTarget={dropTarget?.zone === zone && dropTarget.index === index}
                    onDragStart={onDragStart}
                    onDragOver={onDragOver}
                    onDragLeave={onDragLeave}
                    onDrop={onDrop}
                    onDragEnd={onDragEnd}
                    onMoveUp={onMoveUp}
                    onMoveDown={onMoveDown}
                    onRemove={onRemove}
                />
            ))}
        </div>
    );
});
