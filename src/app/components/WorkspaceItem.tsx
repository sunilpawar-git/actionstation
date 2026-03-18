/**
 * WorkspaceItem Component - Single workspace entry in sidebar list
 * Extracted from Sidebar.tsx for SRP and file size constraints.
 */
import { useState } from 'react';
import clsx from 'clsx';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { PinWorkspaceButton } from '@/features/workspace/components/PinWorkspaceButton';
import { DragHandleIcon, TrashIcon } from '@/shared/components/icons';
import { strings } from '@/shared/localization/strings';
import {
    WI_ITEM, WI_ITEM_STYLE, WI_DIVIDER_ITEM, WI_ACTIVE, WI_DRAGGING,
    WI_DRAG_HANDLE, WI_NAME_INPUT, WI_NAME_INPUT_STYLE,
    WI_NAME, WI_NODE_COUNT, WI_NODE_COUNT_STYLE,
    WI_DIVIDER_LINE, WI_DELETE_DIVIDER_BTN, WI_DELETE_DIVIDER_BTN_STYLE,
} from './workspaceItemStyles';

interface WorkspaceItemProps {
    id: string;
    name: string;
    type?: 'workspace' | 'divider';
    isActive: boolean;
    nodeCount?: number;
    onSelect: (id: string) => void;
    onRename: (id: string, newName: string) => void;
    onDelete?: (id: string) => void;
}

interface WorkspaceContentProps {
    name: string;
    nodeCount?: number;
    id: string;
    onDoubleClick: () => void;
}

const WorkspaceNameContent = ({ name, nodeCount, id, onDoubleClick }: WorkspaceContentProps) => (
    <>
        <span className={WI_NAME} onDoubleClick={onDoubleClick}>
            {name}
            {nodeCount !== undefined && (
                <span className={WI_NODE_COUNT} style={WI_NODE_COUNT_STYLE} data-testid="node-count">
                    {strings.workspace.nodeCount(nodeCount)}
                </span>
            )}
        </span>
        <PinWorkspaceButton workspaceId={id} />
    </>
);

interface DividerContentProps {
    id: string;
    onDoubleClick: () => void;
    onDelete?: (id: string) => void;
}

const DividerContent = ({ id, onDoubleClick, onDelete }: DividerContentProps) => (
    <>
        <div className={WI_DIVIDER_LINE} onDoubleClick={onDoubleClick} data-testid="divider-line" />
        {onDelete && (
            <button
                className={WI_DELETE_DIVIDER_BTN}
                style={WI_DELETE_DIVIDER_BTN_STYLE}
                onClick={(e) => {
                    e.stopPropagation();
                    onDelete(id);
                }}
                aria-label="Delete divider"
                title="Delete divider"
            >
                <TrashIcon size={14} />
            </button>
        )}
    </>
);

export function WorkspaceItem({ id, name, type, isActive, nodeCount, onSelect, onRename, onDelete }: WorkspaceItemProps) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
    const [isEditing, setIsEditing] = useState(false);
    const [editName, setEditName] = useState(name);

    const style = {
        ...WI_ITEM_STYLE,
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        position: 'relative' as const,
        zIndex: isDragging ? 100 : 1,
    };

    const handleDoubleClick = () => {
        if (type === 'divider') return;
        setIsEditing(true);
        setEditName(name);
    };

    const handleBlur = () => {
        setIsEditing(false);
        if (editName.trim() && editName !== name) onRename(id, editName.trim());
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') handleBlur();
        // NOTE: Escape here is intentionally local — it cancels the in-place rename
        // and is NOT migrated to useEscapeLayer. Correct UX for a controlled text
        // input; does not interact with canvas-level escape handling.
        // See PHASE-ESC-N-KEY-BULLETPROOF.md §2.6.
        else if (e.key === 'Escape') {
            setIsEditing(false);
            setEditName(name);
        }
    };

    const isDivider = type === 'divider';

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={clsx(
                'group',
                WI_ITEM,
                isDivider && WI_DIVIDER_ITEM,
                isActive && WI_ACTIVE,
                isDragging && WI_DRAGGING,
            )}
            onClick={() => !isEditing && !isDivider && onSelect(id)}
            data-testid="workspace-item"
            data-dragging={isDragging || undefined}
        >
            {isEditing ? (
                <input
                    type="text"
                    className={WI_NAME_INPUT}
                    style={WI_NAME_INPUT_STYLE}
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onBlur={handleBlur}
                    onKeyDown={handleKeyDown}
                    autoFocus
                />
            ) : (
                <>
                    <button
                        className={WI_DRAG_HANDLE}
                        type="button"
                        aria-label={strings.workspace.dragHandle}
                        {...attributes}
                        {...listeners}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <DragHandleIcon width="16" height="16" />
                    </button>
                    {isDivider ? (
                        <DividerContent id={id} onDoubleClick={handleDoubleClick} onDelete={onDelete} />
                    ) : (
                        <WorkspaceNameContent name={name} nodeCount={nodeCount} id={id} onDoubleClick={handleDoubleClick} />
                    )}
                </>
            )}
        </div>
    );
}
