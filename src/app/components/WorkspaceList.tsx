import { strings } from '@/shared/localization/strings';
import { WorkspaceItem } from './WorkspaceItem';
import type { Workspace } from '@/features/workspace/types/workspace';
import { SB_WORKSPACE_LIST, SB_WORKSPACE_LIST_STYLE } from '@/shared/components/sidebarStyles';
import { WI_ITEM, WI_ITEM_STYLE, WI_NAME } from './workspaceItemStyles';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    type DragEndEvent,
} from '@dnd-kit/core';
import {
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';

interface WorkspaceListProps {
    workspaces: Workspace[];
    currentWorkspaceId: string | null;
    onSelectWorkspace: (id: string) => void;
    onRenameWorkspace: (id: string, newName: string) => void;
    onReorderWorkspace?: (sourceIndex: number, destinationIndex: number) => void;
    onDeleteWorkspace?: (id: string) => void;
}

export function WorkspaceList({
    workspaces,
    currentWorkspaceId,
    onSelectWorkspace,
    onRenameWorkspace,
    onReorderWorkspace,
    onDeleteWorkspace,
}: WorkspaceListProps) {
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 5,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        if (over && active.id !== over.id) {
            const oldIndex = workspaces.findIndex((ws) => ws.id === active.id);
            const newIndex = workspaces.findIndex((ws) => ws.id === over.id);

            if (oldIndex !== -1 && newIndex !== -1 && onReorderWorkspace) {
                onReorderWorkspace(oldIndex, newIndex);
            }
        }
    };

    if (workspaces.length === 0) {
        return (
            <div className={SB_WORKSPACE_LIST} style={SB_WORKSPACE_LIST_STYLE}>
                <div className={WI_ITEM} style={WI_ITEM_STYLE}>
                    <span className={WI_NAME}>
                        {strings.workspace.untitled}
                    </span>
                </div>
            </div>
        );
    }

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
            modifiers={[restrictToVerticalAxis]}
        >
            <SortableContext
                items={workspaces.map((ws) => ws.id)}
                strategy={verticalListSortingStrategy}
            >
                <div className={SB_WORKSPACE_LIST} style={SB_WORKSPACE_LIST_STYLE} role="list">
                    {workspaces.map((ws) => (
                        <WorkspaceItem
                            key={ws.id}
                            id={ws.id}
                            name={ws.name}
                            type={ws.type}
                            isActive={ws.id === currentWorkspaceId}
                            nodeCount={ws.nodeCount}
                            onSelect={onSelectWorkspace}
                            onRename={onRenameWorkspace}
                            onDelete={onDeleteWorkspace}
                        />
                    ))}
                </div>
            </SortableContext>
        </DndContext>
    );
}
