/** ToolbarSection — Dual-zone icon placement (UtilsBar + Context Menu). */
import React, { useCallback, useRef, useState } from 'react';
import { strings } from '@/shared/localization/strings';
import { useSettingsStore } from '@/shared/stores/settingsStore';
import {
    ACTION_REGISTRY,
    UTILS_BAR_MAX,
    CONTEXT_MENU_MAX,
    getUnplacedActions,
    type ActionId,
} from '@/shared/stores/iconRegistry';
import { IconItem, type ZoneId } from './IconItem';
import panelStyles from '../SettingsPanel.module.css';
import styles from './ToolbarSection.module.css';

export const ToolbarSection = React.memo(function ToolbarSection() {
    const utilsBarIcons = useSettingsStore((s) => s.utilsBarIcons);
    const contextMenuIcons = useSettingsStore((s) => s.contextMenuIcons);

    const unplacedIcons = getUnplacedActions(utilsBarIcons, contextMenuIcons);

    // --- Drag state (local, not in store) ---
    const [dragId, setDragId] = useState<ActionId | null>(null);
    const [dropTarget, setDropTarget] = useState<{ zone: ZoneId; index: number } | null>(null);
    const dragSourceRef = useRef<ZoneId | null>(null);

    const handleDragStart = useCallback((id: ActionId, source: ZoneId) => {
        setDragId(id);
        dragSourceRef.current = source;
    }, []);
    const handleDragOver = useCallback((e: React.DragEvent, zone: ZoneId, index: number) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        setDropTarget({ zone, index });
    }, []);
    const handleZoneDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    }, []);
    const handleDragLeave = useCallback(() => {
        setDropTarget(null);
    }, []);
    const handleDragEnd = useCallback(() => {
        setDragId(null);
        setDropTarget(null);
        dragSourceRef.current = null;
    }, []);
    const handleDrop = useCallback((targetZone: ZoneId, targetIndex: number) => {
        if (!dragId) return;
        const store = useSettingsStore.getState();
        const sourceZone = dragSourceRef.current;

        // Remove from source
        let newUtilsBar = [...store.utilsBarIcons];
        let newContextMenu = [...store.contextMenuIcons];

        if (sourceZone === 'utilsBar') {
            newUtilsBar = newUtilsBar.filter((id) => id !== dragId);
        } else if (sourceZone === 'contextMenu') {
            newContextMenu = newContextMenu.filter((id) => id !== dragId);
        }
        // If from unplaced, no removal needed

        // Enforce capacity before insert
        if (targetZone === 'utilsBar') {
            if (newUtilsBar.length >= UTILS_BAR_MAX && sourceZone !== 'utilsBar') {
                // Zone full, abort
                handleDragEnd();
                return;
            }
            newUtilsBar.splice(targetIndex, 0, dragId);
        } else if (targetZone === 'contextMenu') {
            if (newContextMenu.length >= CONTEXT_MENU_MAX && sourceZone !== 'contextMenu') {
                handleDragEnd();
                return;
            }
            newContextMenu.splice(targetIndex, 0, dragId);
        }
        // If targetZone is 'unplaced', just remove (already removed above)

        store.setUtilsBarIcons(newUtilsBar);
        store.setContextMenuIcons(newContextMenu);

        handleDragEnd();
    }, [dragId, handleDragEnd]);
    const handleDropOnZone = useCallback((zone: ZoneId) => {
        const store = useSettingsStore.getState();
        const len = zone === 'utilsBar' ? store.utilsBarIcons.length
            : zone === 'contextMenu' ? store.contextMenuIcons.length : 0;
        handleDrop(zone, len);
    }, [handleDrop]);
    const moveUp = useCallback((zone: ZoneId, id: ActionId) => {
        const store = useSettingsStore.getState();
        const list = zone === 'utilsBar' ? [...store.utilsBarIcons] : [...store.contextMenuIcons];
        const idx = list.indexOf(id);
        if (idx <= 0) return;
        const prev = list[idx - 1];
        if (prev === undefined) return;
        list[idx - 1] = list[idx]!;
        list[idx] = prev;
        if (zone === 'utilsBar') store.setUtilsBarIcons(list);
        else store.setContextMenuIcons(list);
    }, []);
    const moveDown = useCallback((zone: ZoneId, id: ActionId) => {
        const store = useSettingsStore.getState();
        const list = zone === 'utilsBar' ? [...store.utilsBarIcons] : [...store.contextMenuIcons];
        const idx = list.indexOf(id);
        if (idx === -1 || idx >= list.length - 1) return;
        const next = list[idx + 1];
        if (next === undefined) return;
        list[idx + 1] = list[idx]!;
        list[idx] = next;
        if (zone === 'utilsBar') store.setUtilsBarIcons(list);
        else store.setContextMenuIcons(list);
    }, []);
    const removeFromZone = useCallback((zone: ZoneId, id: ActionId) => {
        const store = useSettingsStore.getState();
        const meta = ACTION_REGISTRY.get(id);
        // Block removal if required and not in the other zone
        if (meta?.required && !(zone === 'utilsBar' ? store.contextMenuIcons : store.utilsBarIcons).includes(id)) return;
        if (zone === 'utilsBar') store.setUtilsBarIcons(store.utilsBarIcons.filter((i) => i !== id));
        else if (zone === 'contextMenu') store.setContextMenuIcons(store.contextMenuIcons.filter((i) => i !== id));
    }, []);
    const addToZone = useCallback((zone: ZoneId, id: ActionId) => {
        const store = useSettingsStore.getState();
        if (zone === 'utilsBar' && store.utilsBarIcons.length < UTILS_BAR_MAX) {
            store.setUtilsBarIcons([...store.utilsBarIcons, id]);
        } else if (zone === 'contextMenu' && store.contextMenuIcons.length < CONTEXT_MENU_MAX) {
            store.setContextMenuIcons([...store.contextMenuIcons, id]);
        }
    }, []);
    const resetToDefault = useCallback(() => {
        useSettingsStore.getState().resetIconPlacement();
    }, []);
    const isZoneFull = (zone: ZoneId) => {
        if (zone === 'utilsBar') return utilsBarIcons.length >= UTILS_BAR_MAX;
        if (zone === 'contextMenu') return contextMenuIcons.length >= CONTEXT_MENU_MAX;
        return false;
    };

    return (
        <div className={panelStyles.section}>
            <h3 className={panelStyles.sectionTitle}>{strings.settings.toolbarTitle}</h3>
            <p className={styles.description}>{strings.settings.toolbarDescription}</p>

            {/* === Zone A: UtilsBar === */}
            <div className={styles.zoneHeader}>
                <h4 className={styles.subheading}>{strings.settings.toolbarUtilsBarZone}</h4>
                <span className={styles.capacityBadge} data-full={isZoneFull('utilsBar')}>
                    {utilsBarIcons.length} / {UTILS_BAR_MAX}
                </span>
            </div>
            <p className={styles.zoneHint}>{strings.settings.toolbarUtilsBarHint}</p>
            <div
                className={`${styles.buttonList} ${dragId && !isZoneFull('utilsBar') ? styles.dropZoneActive : ''}`}
                onDragOver={handleZoneDragOver}
                onDrop={() => handleDropOnZone('utilsBar')}
                data-testid="toolbar-utilsbar-list"
            >
                {utilsBarIcons.length === 0 && (
                    <span className={styles.emptyHint}>{strings.settings.toolbarEmpty}</span>
                )}
                {utilsBarIcons.map((id, index) => (
                    <IconItem
                        key={id}
                        id={id}
                        zone="utilsBar"
                        index={index}
                        total={utilsBarIcons.length}
                        isDragging={dragId === id}
                        isDropTarget={dropTarget?.zone === 'utilsBar' && dropTarget.index === index}
                        onDragStart={handleDragStart}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        onDragEnd={handleDragEnd}
                        onMoveUp={moveUp}
                        onMoveDown={moveDown}
                        onRemove={removeFromZone}
                    />
                ))}
            </div>
            <p className={styles.moreNote}>{strings.settings.toolbarMoreButton}</p>

            {/* === Zone B: Context Menu === */}
            <div className={styles.zoneHeader}>
                <h4 className={styles.subheading}>{strings.settings.toolbarContextMenuZone}</h4>
                <span className={styles.capacityBadge} data-full={isZoneFull('contextMenu')}>
                    {contextMenuIcons.length} / {CONTEXT_MENU_MAX}
                </span>
            </div>
            <p className={styles.zoneHint}>{strings.settings.toolbarContextMenuHint}</p>
            <div
                className={`${styles.buttonList} ${dragId && !isZoneFull('contextMenu') ? styles.dropZoneActive : ''}`}
                onDragOver={handleZoneDragOver}
                onDrop={() => handleDropOnZone('contextMenu')}
                data-testid="toolbar-contextmenu-list"
            >
                {contextMenuIcons.length === 0 && (
                    <span className={styles.emptyHint}>{strings.settings.toolbarEmpty}</span>
                )}
                {contextMenuIcons.map((id, index) => (
                    <IconItem
                        key={id}
                        id={id}
                        zone="contextMenu"
                        index={index}
                        total={contextMenuIcons.length}
                        isDragging={dragId === id}
                        isDropTarget={dropTarget?.zone === 'contextMenu' && dropTarget.index === index}
                        onDragStart={handleDragStart}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        onDragEnd={handleDragEnd}
                        onMoveUp={moveUp}
                        onMoveDown={moveDown}
                        onRemove={removeFromZone}
                    />
                ))}
            </div>

            {/* === Unplaced Icons === */}
            <div className={styles.zoneHeader}>
                <h4 className={styles.subheading}>{strings.settings.toolbarUnplacedZone}</h4>
            </div>
            <p className={styles.zoneHint}>{strings.settings.toolbarUnplacedHint}</p>
            <div
                className={`${styles.hiddenZone} ${dragId ? styles.hiddenZoneActive : ''}`}
                onDragOver={handleZoneDragOver}
                onDrop={() => {
                    // Drop to unplaced = remove from current zone
                    if (dragId && dragSourceRef.current) {
                        removeFromZone(dragSourceRef.current, dragId);
                    }
                    handleDragEnd();
                }}
                data-testid="toolbar-unplaced-list"
            >
                {unplacedIcons.length === 0 ? (
                    <span className={styles.emptyHint}>{strings.settings.toolbarNoUnplaced}</span>
                ) : (
                    unplacedIcons.map((id) => {
                        const meta = ACTION_REGISTRY.get(id);
                        if (!meta) return null;
                        return (
                            <div
                                key={id}
                                className={`${styles.hiddenItem} ${dragId === id ? styles.dragging : ''}`}
                                draggable
                                onDragStart={() => handleDragStart(id, 'unplaced')}
                                onDragEnd={handleDragEnd}
                                data-testid={`toolbar-unplaced-${id}`}
                            >
                                <span className={styles.buttonIcon}>{meta.icon}</span>
                                <span className={styles.buttonLabel}>{meta.label()}</span>
                                <span className={styles.addButtons}>
                                    <button
                                        className={styles.addBtn}
                                        onClick={() => addToZone('utilsBar', id)}
                                        disabled={isZoneFull('utilsBar')}
                                        title={`Add to ${strings.settings.toolbarUtilsBarZone}`}
                                        type="button"
                                    >
                                        + Bar
                                    </button>
                                    <button
                                        className={styles.addBtn}
                                        onClick={() => addToZone('contextMenu', id)}
                                        disabled={isZoneFull('contextMenu')}
                                        title={`Add to ${strings.settings.toolbarContextMenuZone}`}
                                        type="button"
                                    >
                                        + Menu
                                    </button>
                                </span>
                            </div>
                        );
                    })
                )}
            </div>

            {/* === Reset === */}
            <button
                className={styles.resetBtn}
                onClick={resetToDefault}
                type="button"
            >
                {strings.settings.toolbarReset}
            </button>
        </div>
    );
});

