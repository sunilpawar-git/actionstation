import { useRef, useState } from 'react';
import { strings } from '@/shared/localization/strings';
import { useSidebarStore } from '@/shared/stores/sidebarStore';
import { useOutsideClick } from '@/shared/hooks/useOutsideClick';
import { useSidebarWorkspaces } from '@/app/hooks/useSidebarWorkspaces';
import { PlusIcon, ChevronDownIcon } from '@/shared/components/icons';
import { WorkspaceList } from '@/app/components/WorkspaceList';
import { SidebarHeader } from './SidebarHeader';
import { SidebarFooter } from '@/app/components/SidebarFooter';
import './Sidebar.css';
import {
    SB_SIDEBAR, SB_WORKSPACES, SB_WORKSPACES_STYLE,
    SB_NEW_WS_WRAPPER, SB_NEW_WS_WRAPPER_STYLE,
    SB_SPLIT_BTN_CONTAINER,
    SB_NEW_WS_MAIN, SB_NEW_WS_MAIN_STYLE,
    SB_SPLIT_DIVIDER,
    SB_NEW_WS_DROPDOWN_BTN, SB_NEW_WS_DROPDOWN_BTN_STYLE,
    SB_DROPDOWN_MENU, SB_DROPDOWN_MENU_STYLE,
    SB_DROPDOWN_ITEM, SB_DROPDOWN_ITEM_STYLE,
} from './sidebarStyles';

interface SidebarProps {
    onSettingsClick?: () => void;
}

export function Sidebar({ onSettingsClick }: SidebarProps) {
    const {
        workspaces,
        currentWorkspaceId,
        isCreating,
        isCreatingDivider,
        handleNewWorkspace,
        handleNewDivider,
        handleDeleteDivider,
        handleSelectWorkspace,
        handleRenameWorkspace,
        handleReorderWorkspace,
    } = useSidebarWorkspaces();

    const isPinned = useSidebarStore((s) => s.isPinned);
    const isHoverOpen = useSidebarStore((s) => s.isHoverOpen);

    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    useOutsideClick(dropdownRef, isDropdownOpen, () => setIsDropdownOpen(false));

    const onAddDivider = () => {
        setIsDropdownOpen(false);
        void handleNewDivider();
    };

    return (
        <aside
            className={SB_SIDEBAR}
            data-pinned={String(isPinned)}
            data-open={String(isHoverOpen)}
            aria-label={strings.sidebar.ariaLabel}
        >
            <SidebarHeader isPinned={isPinned} isHoverOpen={isHoverOpen} onTogglePin={() => useSidebarStore.getState().togglePin()} />

            <div className={SB_WORKSPACES} style={SB_WORKSPACES_STYLE}>
                <div className={SB_NEW_WS_WRAPPER} style={SB_NEW_WS_WRAPPER_STYLE} ref={dropdownRef}>
                    <div className={SB_SPLIT_BTN_CONTAINER}>
                        <button
                            className={SB_NEW_WS_MAIN}
                            style={SB_NEW_WS_MAIN_STYLE}
                            onClick={handleNewWorkspace}
                            disabled={isCreating || isCreatingDivider}
                        >
                            <PlusIcon size={18} />
                            <span>{isCreating ? strings.common.loading : strings.workspace.newWorkspace}</span>
                        </button>
                        <div className={SB_SPLIT_DIVIDER} />
                        <button
                            className={SB_NEW_WS_DROPDOWN_BTN}
                            style={SB_NEW_WS_DROPDOWN_BTN_STYLE}
                            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                            disabled={isCreating || isCreatingDivider}
                            aria-label="New Workspace Options"
                            aria-expanded={isDropdownOpen}
                        >
                            <ChevronDownIcon size={18} />
                        </button>
                    </div>
                    {isDropdownOpen && (
                        <div className={SB_DROPDOWN_MENU} style={SB_DROPDOWN_MENU_STYLE}>
                            <button
                                className={SB_DROPDOWN_ITEM}
                                style={SB_DROPDOWN_ITEM_STYLE}
                                onClick={onAddDivider}
                                disabled={isCreating || isCreatingDivider}
                            >
                                {isCreatingDivider ? strings.common.loading : 'Add Divider'}
                            </button>
                        </div>
                    )}
                </div>

                <WorkspaceList
                    workspaces={workspaces}
                    currentWorkspaceId={currentWorkspaceId}
                    onSelectWorkspace={handleSelectWorkspace}
                    onRenameWorkspace={handleRenameWorkspace}
                    onReorderWorkspace={handleReorderWorkspace}
                    onDeleteWorkspace={handleDeleteDivider}
                />
            </div>

            <SidebarFooter onSettingsClick={onSettingsClick} />
        </aside>
    );
}
