/**
 * NodeContextMenu — Portal-rendered right-click / "More..." context menu.
 * Actions are now driven by user-configurable contextMenuIcons in settingsStore.
 * Color/Share render as expandable sub-panels.
 */
import React, { useState, useRef, useEffect, useLayoutEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { strings } from '@/shared/localization/strings';
import { getPortalRoot } from '@/shared/utils/portalRoot';
import { useEscapeLayer } from '@/shared/hooks/useEscapeLayer';
import { ESCAPE_PRIORITY } from '@/shared/hooks/escapePriorities';
import { useSettingsStore } from '@/shared/stores/settingsStore';
import { type ActionId, ACTION_REGISTRY } from '@/shared/stores/iconRegistry';
import { CONTEXT_MENU_GROUPS } from '../../types/utilsBarLayout';
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
    readonly onContentModeToggle?: () => void;
    readonly isMindmapMode?: boolean;
    // Primary actions that may appear in context menu via icon placement
    readonly onDeleteClick?: () => void;
    readonly onCopyClick?: () => void;
    readonly onConnectClick?: () => void;
    readonly onAIClick?: () => void;
    readonly hasContent?: boolean;
}

/** Group definitions with ordered group keys */
const GROUP_ORDER: readonly (keyof typeof CONTEXT_MENU_GROUPS)[] = ['primary', 'organize', 'appearance', 'insert', 'sharing'];
const GROUP_LABELS: Record<string, () => string> = {
    primary: () => strings.contextMenu.primary,
    organize: () => strings.contextMenu.organize,
    appearance: () => strings.contextMenu.appearance,
    insert: () => strings.contextMenu.insert,
    sharing: () => strings.contextMenu.sharing,
};

export const NodeContextMenu = React.memo(function NodeContextMenu(props: NodeContextMenuProps) {
    const { position, onClose } = props;
    const menuRef = useRef<HTMLDivElement>(null);
    const [expandedPanel, setExpandedPanel] = useState<'color' | 'share' | null>(null);
    const [clampedPos, setClampedPos] = useState(position);

    // Read configurable context menu icons (scalar selector)
    const contextMenuIcons = useSettingsStore((s) => s.contextMenuIcons);

    useEscapeLayer(ESCAPE_PRIORITY.CONTEXT_MENU, true, onClose);
    useContextMenuPosition(menuRef, position, setClampedPos);
    useContextMenuOutsideClick(menuRef, onClose);

    const action = useCallback((fn?: () => void) => () => { fn?.(); onClose(); }, [onClose]);
    const togglePanel = useCallback((panel: 'color' | 'share') => {
        setExpandedPanel((prev) => (prev === panel ? null : panel));
    }, []);

    // Build grouped items from the configurable list
    const groupedItems = useMemo(() => {
        const contextSet = new Set(contextMenuIcons);
        const groups: { key: string; items: ActionId[] }[] = [];

        for (const groupKey of GROUP_ORDER) {
            const groupActions = CONTEXT_MENU_GROUPS[groupKey] as readonly string[];
            const items = groupActions.filter((a) => contextSet.has(a as ActionId)) as ActionId[];
            if (items.length > 0) {
                groups.push({ key: groupKey, items });
            }
        }
        return groups;
    }, [contextMenuIcons]);

    /** Render a single context menu item */
    const renderItem = useCallback((id: ActionId) => {
        const meta = ACTION_REGISTRY.get(id);
        if (!meta) return null;

        switch (id) {
            case 'pin':
                if (!props.onPinToggle) return null;
                return <MenuItem key={id} icon="📌"
                    label={props.isPinned ? strings.nodeUtils.unpin : strings.nodeUtils.pin}
                    onClick={action(props.onPinToggle)} />;
            case 'duplicate':
                if (!props.onDuplicateClick) return null;
                return <MenuItem key={id} icon="📑" label={strings.nodeUtils.duplicate}
                    onClick={action(props.onDuplicateClick)} />;
            case 'collapse':
                if (!props.onCollapseToggle) return null;
                return <MenuItem key={id} icon={props.isCollapsed ? '🔽' : '🔼'}
                    label={props.isCollapsed ? strings.nodeUtils.expand : strings.nodeUtils.collapse}
                    onClick={action(props.onCollapseToggle)} />;
            case 'focus':
                if (!props.onFocusClick) return null;
                return <MenuItem key={id} icon="🔍" label={strings.nodeUtils.focus}
                    onClick={action(props.onFocusClick)} />;
            case 'tags':
                return <MenuItem key={id} icon="🏷️" label={strings.nodeUtils.tags}
                    onClick={action(props.onTagClick)} />;
            case 'mindmap':
                if (!props.onContentModeToggle) return null;
                return <MenuItem key={id} icon="🗺️"
                    label={props.isMindmapMode ? strings.nodeUtils.textView : strings.nodeUtils.mindmapView}
                    onClick={action(props.onContentModeToggle)} />;
            case 'color':
                if (!props.onColorChange) return null;
                return (
                    <React.Fragment key={id}>
                        <ExpandToggle icon="🎨" label={strings.nodeUtils.color}
                            expanded={expandedPanel === 'color'} onToggle={() => togglePanel('color')} />
                        {expandedPanel === 'color' && (
                            <div className={styles.expandableContent}>
                                <InlineColorPicker selectedColorKey={normalizeNodeColorKey(props.nodeColorKey)}
                                    onColorSelect={props.onColorChange} onClose={onClose} />
                            </div>
                        )}
                    </React.Fragment>
                );
            case 'image':
                if (!props.onImageClick) return null;
                return <MenuItem key={id} icon="🖼️" label={strings.nodeUtils.image}
                    onClick={action(props.onImageClick)} />;
            case 'attachment':
                if (!props.onAttachmentClick) return null;
                return <MenuItem key={id} icon="📎" label={strings.nodeUtils.attachment}
                    onClick={action(props.onAttachmentClick)} />;
            case 'share':
                if (!props.onShareClick) return null;
                return (
                    <React.Fragment key={id}>
                        <ExpandToggle icon="📤" label={strings.nodeUtils.share}
                            expanded={expandedPanel === 'share'} onToggle={() => togglePanel('share')} />
                        {expandedPanel === 'share' && (
                            <div className={styles.expandableContent}>
                                <InlineSharePanel onShare={props.onShareClick}
                                    isSharing={props.isSharing ?? false} onClose={onClose} />
                            </div>
                        )}
                    </React.Fragment>
                );
            case 'pool':
                if (!props.onPoolToggle) return null;
                return <MenuItem key={id} icon="🧠"
                    label={props.isInPool ? strings.nodePool.removeFromPool : strings.nodePool.addToPool}
                    onClick={action(props.onPoolToggle)} />;
            // Primary actions that might appear in context menu
            case 'ai':
                if (!props.onAIClick) return null;
                return <MenuItem key={id} icon={meta.icon} label={meta.label()}
                    onClick={action(props.onAIClick)} />;
            case 'connect':
                if (!props.onConnectClick) return null;
                return <MenuItem key={id} icon={meta.icon} label={meta.label()}
                    onClick={action(props.onConnectClick)} />;
            case 'copy':
                if (!props.onCopyClick) return null;
                return <MenuItem key={id} icon={meta.icon} label={meta.label()}
                    onClick={action(props.onCopyClick)} />;
            case 'delete':
                if (!props.onDeleteClick) return null;
                return <MenuItem key={id} icon={meta.icon} label={meta.label()}
                    onClick={action(props.onDeleteClick)} />;
            default:
                return null;
        }
    }, [props, action, expandedPanel, togglePanel, onClose]);

    return createPortal(
        <div className={styles.menu} ref={menuRef} role="menu"
            style={{ top: clampedPos.y, left: clampedPos.x }}>
            {groupedItems.map((group, gi) => (
                <React.Fragment key={group.key}>
                    {gi > 0 && <MenuSeparator />}
                    <GroupLabel>{GROUP_LABELS[group.key]?.() ?? group.key}</GroupLabel>
                    {group.items.map(renderItem)}
                </React.Fragment>
            ))}
        </div>,
        getPortalRoot(),
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
            if (!(e.target instanceof Node)) return;
            if (menuRef.current?.contains(e.target)) return;
            onClose();
        };
        document.addEventListener('pointerdown', handler, true);
        return () => document.removeEventListener('pointerdown', handler, true);
    }, [menuRef, onClose]);
}
