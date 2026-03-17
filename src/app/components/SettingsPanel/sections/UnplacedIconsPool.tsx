/**
 * UnplacedIconsPool — Renders the pool of unplaced (hidden) icons in the ToolbarSection.
 * Extracted from ToolbarSection to stay under max-lines-per-function.
 */
import React from 'react';
import clsx from 'clsx';
import { strings } from '@/shared/localization/strings';
import { ACTION_REGISTRY, type ActionId } from '@/shared/stores/iconRegistry';
import { type ZoneId } from './IconItem';
import {
    TB_HIDDEN_ZONE, TB_HIDDEN_ZONE_STYLE, TB_HIDDEN_ZONE_ACTIVE, TB_HIDDEN_ZONE_ACTIVE_STYLE,
    TB_EMPTY_HINT, TB_EMPTY_HINT_STYLE,
    TB_HIDDEN_ITEM, TB_HIDDEN_ITEM_STYLE, TB_DRAGGING,
    TB_BUTTON_ICON, TB_BUTTON_LABEL, TB_BUTTON_LABEL_STYLE,
    TB_ADD_BUTTONS, TB_ADD_BUTTONS_STYLE, TB_ADD_BTN, TB_ADD_BTN_STYLE, TB_ADD_BTN_DISABLED_STYLE,
} from './toolbarSectionStyles';

interface UnplacedIconsPoolProps {
    readonly icons: ActionId[];
    readonly dragId: ActionId | null;
    readonly dragSourceRef: React.RefObject<ZoneId | null>;
    readonly isUtilsBarFull: boolean;
    readonly isContextMenuFull: boolean;
    readonly onDragStart: (id: ActionId, zone: ZoneId) => void;
    readonly onDragEnd: () => void;
    readonly onZoneDragOver: (e: React.DragEvent) => void;
    readonly onRemoveFromZone: (zone: ZoneId, id: ActionId) => void;
    readonly onAddToZone: (zone: ZoneId, id: ActionId) => void;
}

export const UnplacedIconsPool = React.memo(function UnplacedIconsPool({
    icons, dragId, dragSourceRef, isUtilsBarFull, isContextMenuFull,
    onDragStart, onDragEnd, onZoneDragOver, onRemoveFromZone, onAddToZone,
}: UnplacedIconsPoolProps) {
    const zoneStyle = dragId
        ? { ...TB_HIDDEN_ZONE_STYLE, ...TB_HIDDEN_ZONE_ACTIVE_STYLE }
        : TB_HIDDEN_ZONE_STYLE;

    return (
        <div
            className={clsx(TB_HIDDEN_ZONE, dragId && TB_HIDDEN_ZONE_ACTIVE)}
            style={zoneStyle}
            onDragOver={onZoneDragOver}
            onDrop={() => {
                if (dragId && dragSourceRef.current) {
                    onRemoveFromZone(dragSourceRef.current, dragId);
                }
                onDragEnd();
            }}
            data-testid="toolbar-unplaced-list"
        >
            {icons.length === 0 ? (
                <span className={TB_EMPTY_HINT} style={TB_EMPTY_HINT_STYLE}>
                    {strings.settings.toolbarNoUnplaced}
                </span>
            ) : (
                icons.map((id) => {
                    const meta = ACTION_REGISTRY.get(id);
                    if (!meta) return null;
                    return (
                        <div
                            key={id}
                            className={clsx(TB_HIDDEN_ITEM, dragId === id && TB_DRAGGING)}
                            style={TB_HIDDEN_ITEM_STYLE}
                            draggable
                            onDragStart={() => onDragStart(id, 'unplaced')}
                            onDragEnd={onDragEnd}
                            data-testid={`toolbar-unplaced-${id}`}
                        >
                            <span className={TB_BUTTON_ICON}>{meta.icon}</span>
                            <span className={TB_BUTTON_LABEL} style={TB_BUTTON_LABEL_STYLE}>{meta.label()}</span>
                            <span className={TB_ADD_BUTTONS} style={TB_ADD_BUTTONS_STYLE}>
                                <button
                                    className={TB_ADD_BTN}
                                    style={isUtilsBarFull ? TB_ADD_BTN_DISABLED_STYLE : TB_ADD_BTN_STYLE}
                                    onClick={() => onAddToZone('utilsBar', id)}
                                    disabled={isUtilsBarFull}
                                    title={`Add to ${strings.settings.toolbarUtilsBarZone}`}
                                    type="button"
                                >
                                    {strings.settings.toolbarAddToBar}
                                </button>
                                <button
                                    className={TB_ADD_BTN}
                                    style={isContextMenuFull ? TB_ADD_BTN_DISABLED_STYLE : TB_ADD_BTN_STYLE}
                                    onClick={() => onAddToZone('contextMenu', id)}
                                    disabled={isContextMenuFull}
                                    title={`Add to ${strings.settings.toolbarContextMenuZone}`}
                                    type="button"
                                >
                                    {strings.settings.toolbarAddToMenu}
                                </button>
                            </span>
                        </div>
                    );
                })
            )}
        </div>
    );
});
