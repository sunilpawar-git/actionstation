/**
 * NodeContextMenu — Portal-rendered right-click / "More..." context menu.
 * Groups secondary actions; Color/Share render as expandable sub-panels.
 */
import React, { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { strings } from '@/shared/localization/strings';
import { useEscapeLayer } from '@/shared/hooks/useEscapeLayer';
import { ESCAPE_PRIORITY } from '@/shared/hooks/escapePriorities';
import { MenuItem, ExpandToggle, MenuSeparator, GroupLabel } from './ContextMenuItems';
import { InlineColorPicker } from './InlineColorPicker';
import { InlineSharePanel } from './InlineSharePanel';
import { normalizeNodeColorKey, type NodeColorKey } from '../../types/node';
import styles from './NodeContextMenu.module.css';

const VIEWPORT_PADDING_PX = 8;

export interface NodeContextMenuProps {
    readonly nodeId: string;
    readonly position: { x: number; y: number };
    readonly onClose: () => void;
    readonly onTagClick: () => void;
    readonly onImageClick?: () => void;
    readonly onAttachmentClick?: () => void;
    readonly onFocusClick?: () => void;
    readonly onDuplicateClick?: () => void;
    readonly onShareClick?: (targetWorkspaceId: string) => Promise<void>;
    readonly isSharing?: boolean;
    readonly onPinToggle?: () => void;
    readonly onCollapseToggle?: () => void;
    readonly onPoolToggle?: () => void;
    readonly onColorChange?: (colorKey: NodeColorKey) => void;
    readonly nodeColorKey?: NodeColorKey;
    readonly isPinned: boolean;
    readonly isCollapsed: boolean;
    readonly isInPool: boolean;
}

export const NodeContextMenu = React.memo(function NodeContextMenu(props: NodeContextMenuProps) {
    const { position, onClose } = props;
    const menuRef = useRef<HTMLDivElement>(null);
    const [expandedPanel, setExpandedPanel] = useState<'color' | 'share' | null>(null);
    const [clampedPos, setClampedPos] = useState(position);

    useEscapeLayer(ESCAPE_PRIORITY.CONTEXT_MENU, true, onClose);
    useContextMenuPosition(menuRef, position, setClampedPos);
    useContextMenuOutsideClick(menuRef, onClose);

    const action = useCallback((fn?: () => void) => () => { fn?.(); onClose(); }, [onClose]);
    const togglePanel = useCallback((panel: 'color' | 'share') => {
        setExpandedPanel((prev) => (prev === panel ? null : panel));
    }, []);

    const pinLabel = props.isPinned ? strings.nodeUtils.unpin : strings.nodeUtils.pin;
    const collapseLabel = props.isCollapsed ? strings.nodeUtils.expand : strings.nodeUtils.collapse;

    return createPortal(
        <div className={styles.menu} ref={menuRef} role="menu"
            style={{ top: clampedPos.y, left: clampedPos.x }}>
            <GroupLabel>{strings.contextMenu.organize}</GroupLabel>
            {props.onPinToggle && <MenuItem icon="📌" label={pinLabel} onClick={action(props.onPinToggle)} />}
            {props.onDuplicateClick && <MenuItem icon="📑" label={strings.nodeUtils.duplicate} onClick={action(props.onDuplicateClick)} />}
            {props.onCollapseToggle && <MenuItem icon={props.isCollapsed ? '🔽' : '🔼'} label={collapseLabel} onClick={action(props.onCollapseToggle)} />}
            {props.onFocusClick && <MenuItem icon="🔍" label={strings.nodeUtils.focus} onClick={action(props.onFocusClick)} />}
            <MenuSeparator />
            <GroupLabel>{strings.contextMenu.appearance}</GroupLabel>
            <MenuItem icon="🏷️" label={strings.nodeUtils.tags} onClick={action(props.onTagClick)} />
            {props.onColorChange && (
                <>
                    <ExpandToggle icon="🎨" label={strings.nodeUtils.color}
                        expanded={expandedPanel === 'color'} onToggle={() => togglePanel('color')} />
                    {expandedPanel === 'color' && (
                        <div className={styles.expandableContent}>
                            <InlineColorPicker selectedColorKey={normalizeNodeColorKey(props.nodeColorKey)}
                                onColorSelect={props.onColorChange} onClose={onClose} />
                        </div>
                    )}
                </>
            )}
            <MenuSeparator />
            <GroupLabel>{strings.contextMenu.insert}</GroupLabel>
            {props.onImageClick && <MenuItem icon="🖼️" label={strings.nodeUtils.image} onClick={action(props.onImageClick)} />}
            {props.onAttachmentClick && <MenuItem icon="📎" label={strings.nodeUtils.attachment} onClick={action(props.onAttachmentClick)} />}
            <MenuSeparator />
            <GroupLabel>{strings.contextMenu.sharing}</GroupLabel>
            {props.onShareClick && (
                <>
                    <ExpandToggle icon="📤" label={strings.nodeUtils.share}
                        expanded={expandedPanel === 'share'} onToggle={() => togglePanel('share')} />
                    {expandedPanel === 'share' && (
                        <div className={styles.expandableContent}>
                            <InlineSharePanel onShare={props.onShareClick}
                                isSharing={props.isSharing ?? false} onClose={onClose} />
                        </div>
                    )}
                </>
            )}
            {props.onPoolToggle && (
                <MenuItem icon="🧠" label={props.isInPool ? strings.nodePool.removeFromPool : strings.nodePool.addToPool}
                    onClick={action(props.onPoolToggle)} />
            )}
        </div>,
        document.body,
    );
});

function useContextMenuPosition(
    menuRef: React.RefObject<HTMLDivElement | null>,
    position: { x: number; y: number },
    setClamped: (pos: { x: number; y: number }) => void,
) {
    useLayoutEffect(() => {
        const el = menuRef.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        
        let x = position.x;
        let y = position.y;
        
        if (x + rect.width > window.innerWidth - VIEWPORT_PADDING_PX) {
            x = window.innerWidth - rect.width - VIEWPORT_PADDING_PX;
        }
        
        if (y + rect.height > window.innerHeight - VIEWPORT_PADDING_PX) {
            y = window.innerHeight - rect.height - VIEWPORT_PADDING_PX;
        }
        
        setClamped({
            x: Math.max(VIEWPORT_PADDING_PX, x),
            y: Math.max(VIEWPORT_PADDING_PX, y),
        });
    }, [menuRef, position, setClamped]);
}

function useContextMenuOutsideClick(
    menuRef: React.RefObject<HTMLDivElement | null>,
    onClose: () => void,
) {
    useEffect(() => {
        const handler = (e: PointerEvent) => {
            if (menuRef.current?.contains(e.target as Node)) return;
            onClose();
        };
        document.addEventListener('pointerdown', handler, true);
        return () => document.removeEventListener('pointerdown', handler, true);
    }, [menuRef, onClose]);
}
