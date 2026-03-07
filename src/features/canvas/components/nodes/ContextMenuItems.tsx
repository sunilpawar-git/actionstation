/**
 * ContextMenuItems — Reusable primitives for NodeContextMenu.
 * MenuItem: simple action button. ExpandToggle: expandable section trigger.
 */
import React from 'react';
import styles from './NodeContextMenu.module.css';

export const MenuItem = React.memo(function MenuItem({ icon, label, onClick }: {
    readonly icon: string; readonly label: string; readonly onClick: () => void;
}) {
    return (
        <button className={styles.menuItem} onClick={onClick} role="menuitem">
            <span className={styles.menuItemIcon}>{icon}</span>
            <span>{label}</span>
        </button>
    );
});

export const ExpandToggle = React.memo(function ExpandToggle({ icon, label, expanded, onToggle }: {
    readonly icon: string; readonly label: string; readonly expanded: boolean; readonly onToggle: () => void;
}) {
    return (
        <button
            className={`${styles.expandToggle} ${expanded ? (styles.expandToggleOpen ?? '') : ''}`}
            onClick={onToggle} role="menuitem" aria-expanded={expanded}
        >
            <span className={styles.menuItemIcon}>{icon}</span>
            <span>{label}</span>
        </button>
    );
});

export const MenuSeparator = React.memo(function MenuSeparator() {
    return <div className={styles.separator} role="separator" />;
});

export const GroupLabel = React.memo(function GroupLabel({ children }: { readonly children: string }) {
    return <div className={styles.groupLabel} role="presentation">{children}</div>;
});
