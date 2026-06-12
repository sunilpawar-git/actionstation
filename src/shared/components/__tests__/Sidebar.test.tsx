import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Sidebar } from '../Sidebar';
// useAuthStore is mocked below - no direct import needed
import { toast } from '@/shared/stores/toastStore';
import { strings } from '@/shared/localization/strings';

import {
    createNewWorkspace, loadUserWorkspaces, saveNodes, saveEdges, deleteWorkspace,
} from '@/features/workspace/services/workspaceService';
import { useCanvasStore } from '@/features/canvas/stores/canvasStore';
import { useWorkspaceStore } from '@/features/workspace/stores/workspaceStore';
import { useWorkspaceSwitcher } from '@/features/workspace/hooks/useWorkspaceSwitcher';

// Mock auth store - must handle selector pattern: useAuthStore((s) => s.user)
const mockAuthState = {
    user: { id: 'user-1', name: 'Test User', avatarUrl: '' },
    isLoading: false, isAuthenticated: true, error: null,
    setUser: vi.fn(), clearUser: vi.fn(), setLoading: vi.fn(), setError: vi.fn(),
};
vi.mock('@/features/auth/stores/authStore', () => ({
    useAuthStore: vi.fn((selector?: (s: typeof mockAuthState) => unknown) => {
        return typeof selector === 'function' ? selector(mockAuthState) : mockAuthState;
    }),
}));
const mockGetState = vi.fn();
vi.mock('@/features/canvas/stores/canvasStore', () => ({
    useCanvasStore: Object.assign(vi.fn(), { getState: () => mockGetState() }),
}));
const mockWorkspaceGetState = vi.fn();
vi.mock('@/features/workspace/stores/workspaceStore', () => ({
    useWorkspaceStore: Object.assign(vi.fn(), { getState: () => mockWorkspaceGetState() })
}));
vi.mock('@/shared/stores/toastStore', () => ({
    toast: { info: vi.fn(), success: vi.fn(), error: vi.fn() },
}));
vi.mock('@/features/auth/services/authService', () => ({ signOut: vi.fn() }));
vi.mock('@/features/workspace/services/workspaceService', () => ({
    createNewWorkspace: vi.fn(), loadUserWorkspaces: vi.fn(), saveWorkspace: vi.fn(),
    saveNodes: vi.fn(), saveEdges: vi.fn(), deleteWorkspace: vi.fn(),
    updateWorkspaceOrder: vi.fn(), createNewDividerWorkspace: vi.fn(),
}));

// Mock useConfirm — resolves to true by default
const mockConfirm = vi.fn().mockResolvedValue(true);
vi.mock('@/shared/stores/confirmStore', () => ({
    useConfirm: () => mockConfirm,
    useConfirmStore: vi.fn(),
}));

// Mock the workspace switcher hook
const mockSwitchWorkspace = vi.fn();
vi.mock('@/features/workspace/hooks/useWorkspaceSwitcher', () => ({
    useWorkspaceSwitcher: vi.fn(() => ({
        isSwitching: false,
        error: null,
        switchWorkspace: mockSwitchWorkspace,
    })),
}));

// Mock the workspace cache
const mockPreload = vi.fn();
const mockHydrateFromIdb = vi.fn().mockResolvedValue(undefined);
vi.mock('@/features/workspace/services/workspaceCache', () => ({
    workspaceCache: {
        preload: (...args: unknown[]) => mockPreload(...args),
        hydrateFromIdb: () => mockHydrateFromIdb(),
    },
}));

// Mock indexedDbService (used by Sidebar for metadata persistence)
vi.mock('@/shared/services/indexedDbService', () => ({
    indexedDbService: {
        put: vi.fn().mockResolvedValue(true),
        get: vi.fn().mockResolvedValue(null),
    },
    IDB_STORES: {
        workspaceData: 'workspace-data',
        pinnedWorkspaces: 'pinned-workspaces',
        metadata: 'metadata',
    },
}));
vi.mock('@/features/subscription/hooks/useNodeCreationGuard', () => ({ useNodeCreationGuard: () => ({ guardNodeCreation: () => true }) }));
vi.mock('@/features/subscription/hooks/useTierLimits', () => ({ useTierLimits: () => ({ check: () => ({ allowed: true, current: 0, max: Infinity, kind: 'workspace' }), state: { workspaceCount: 0, nodeCount: 0, aiDailyCount: 0, aiDailyDate: '', storageMb: 0, isLoaded: true }, dispatch: () => {}, tier: 'free' }) }));

// Mock useTemplatePicker — controls picker open state in tests
const mockOpenPicker = vi.fn();
const mockClosePicker = vi.fn();
let isTemplatePickerOpen = false;
vi.mock('@/features/templates/hooks/useTemplatePicker', () => ({
    useTemplatePicker: () => ({
        isPickerOpen: isTemplatePickerOpen,
        customTemplates: [],
        isLoadingTemplates: false,
        openPicker: mockOpenPicker,
        closePicker: mockClosePicker,
    }),
}));
// Mock TemplatePicker so we can control rendering without full Firestore setup
vi.mock('@/features/templates/components/TemplatePicker', () => ({
    TemplatePicker: ({ isOpen, onSelectBlank }: { isOpen: boolean; onSelectBlank: () => void }) =>
        isOpen ? <button onClick={onSelectBlank}>Blank Canvas</button> : null,
}));

describe('Sidebar', () => {
    const mockClearCanvas = vi.fn();
    const mockSetCurrentWorkspaceId = vi.fn();
    const mockAddWorkspace = vi.fn();
    const mockSetWorkspaces = vi.fn();
    const mockUpdateWorkspace = vi.fn();

    const createMockState = (overrides = {}) => ({
        currentWorkspaceId: 'default-workspace', workspaces: [], isLoading: false,
        setCurrentWorkspaceId: mockSetCurrentWorkspaceId, addWorkspace: mockAddWorkspace,
        setWorkspaces: mockSetWorkspaces, updateWorkspace: mockUpdateWorkspace,
        removeWorkspace: vi.fn(), setLoading: vi.fn(), ...overrides,
    });

    const mockWorkspacesList = [
        { id: 'ws-1', name: 'Project Alpha', userId: 'user-1', canvasSettings: { backgroundColor: 'grid' as const }, createdAt: new Date(), updatedAt: new Date() },
        { id: 'ws-2', name: 'Project Beta', userId: 'user-1', canvasSettings: { backgroundColor: 'grid' as const }, createdAt: new Date(), updatedAt: new Date() },
    ];

    const setupWithWorkspaces = (workspaces = mockWorkspacesList, currentId = 'ws-1') => {
        vi.mocked(useWorkspaceStore).mockImplementation((selector) => {
            const state = createMockState({ currentWorkspaceId: currentId, workspaces });
            mockWorkspaceGetState.mockReturnValue(state);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            return typeof selector === 'function' ? selector(state as any) : state;
        });
    };

    beforeEach(() => {
        vi.clearAllMocks();
        // Auth state is already set up in the module mock
        vi.mocked(useCanvasStore).mockReturnValue(undefined);
        mockGetState.mockReturnValue({ nodes: [], edges: [], clearCanvas: mockClearCanvas });
        vi.mocked(useWorkspaceStore).mockImplementation((selector) => {
            const state = createMockState();
            mockWorkspaceGetState.mockReturnValue(state);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            return typeof selector === 'function' ? selector(state as any) : state;
        });
        vi.mocked(loadUserWorkspaces).mockResolvedValue([]);
        vi.mocked(saveNodes).mockResolvedValue(undefined);
        vi.mocked(saveEdges).mockResolvedValue(undefined);
        // Reset workspace switcher mock
        mockSwitchWorkspace.mockResolvedValue(undefined);
        // Reset cache preload mock
        mockPreload.mockResolvedValue(undefined);
        vi.mocked(useWorkspaceSwitcher).mockReturnValue({
            isSwitching: false,
            error: null,
            switchWorkspace: mockSwitchWorkspace,
        });
    });

    describe('workspace creation', () => {
        beforeEach(() => {
            isTemplatePickerOpen = false;
            mockOpenPicker.mockImplementation(() => { isTemplatePickerOpen = true; });
            mockClosePicker.mockImplementation(() => { isTemplatePickerOpen = false; });
        });

        it('should open template picker when New Workspace is clicked', async () => {
            render(<Sidebar />);
            fireEvent.click(screen.getByText(strings.workspace.newWorkspace));
            expect(mockOpenPicker).toHaveBeenCalledOnce();
        });

        it('should create, add, and switch to new workspace when Blank Canvas is selected', async () => {
            const mockWorkspace = { id: 'ws-new', name: 'Untitled Workspace', userId: 'user-1', canvasSettings: {}, createdAt: new Date(), updatedAt: new Date() };
            vi.mocked(createNewWorkspace).mockResolvedValue(mockWorkspace as ReturnType<typeof createNewWorkspace> extends Promise<infer T> ? T : never);
            isTemplatePickerOpen = true;

            render(<Sidebar />);
            fireEvent.click(screen.getByText('Blank Canvas'));

            await waitFor(() => {
                expect(createNewWorkspace).toHaveBeenCalledWith('user-1');
                expect(mockAddWorkspace).toHaveBeenCalledWith({ ...mockWorkspace, nodeCount: 0 });
                expect(mockSetCurrentWorkspaceId).toHaveBeenCalledWith('ws-new');
                expect(mockClearCanvas).toHaveBeenCalled();
                expect(toast.success).toHaveBeenCalled();
            });
        });

        it('should show error toast when creation fails', async () => {
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
            vi.mocked(createNewWorkspace).mockRejectedValue(new Error('Network error'));
            isTemplatePickerOpen = true;
            render(<Sidebar />);
            fireEvent.click(screen.getByText('Blank Canvas'));
            await waitFor(() => expect(toast.error).toHaveBeenCalledWith(strings.errors.generic));
            consoleSpy.mockRestore();
        });
    });

    describe('divider deletion', () => {
        it('deletes divider via workspaceService and removes from store', async () => {
            const mockRemoveWorkspace = vi.fn();
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

            // mockConfirm is already set to resolve(true) at the module level

            const state = createMockState({
                workspaces: [
                    { id: 'ws-1', name: 'Project Alpha', userId: 'user-1', createdAt: new Date(), updatedAt: new Date() },
                    { id: 'div-1', name: '---', type: 'divider', userId: 'user-1', createdAt: new Date(), updatedAt: new Date() },
                ],
                removeWorkspace: mockRemoveWorkspace
            });
            // Update getState to return the state with mockRemoveWorkspace
            mockWorkspaceGetState.mockReturnValue(state);
            vi.mocked(useWorkspaceStore).mockImplementation((selector) => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                return typeof selector === 'function' ? selector(state as any) : state;
            });

            vi.mocked(deleteWorkspace).mockResolvedValue(undefined);

            render(<Sidebar />);

            // Click delete button on the divider
            const deleteButtons = screen.getAllByLabelText('Delete divider');
            fireEvent.click(deleteButtons[0] as HTMLElement);

            await waitFor(() => {
                expect(deleteWorkspace).toHaveBeenCalledWith('user-1', 'div-1');
                expect(mockRemoveWorkspace).toHaveBeenCalledWith('div-1');
            });

            consoleSpy.mockRestore();
        });
    });

    describe('split button dropdown', () => {
        it('toggles dropdown when chevron is clicked', () => {
            render(<Sidebar />);

            // Dropdown is initially closed
            expect(screen.queryByText('Add Divider')).not.toBeInTheDocument();

            // Click chevron
            const chevronButton = screen.getByLabelText('New Workspace Options');
            fireEvent.click(chevronButton);

            // Dropdown is open
            expect(screen.getByText('Add Divider')).toBeInTheDocument();

            // Click chevron again to close
            fireEvent.click(chevronButton);
            expect(screen.queryByText('Add Divider')).not.toBeInTheDocument();
        });

        it('closes dropdown when clicking outside', () => {
            render(
                <div>
                    <div data-testid="outside">Outside Element</div>
                    <Sidebar />
                </div>
            );

            // Open dropdown
            const chevronButton = screen.getByLabelText('New Workspace Options');
            fireEvent.click(chevronButton);
            expect(screen.getByText('Add Divider')).toBeInTheDocument();

            // Click outside
            fireEvent.mouseDown(screen.getByTestId('outside'));

            // Dropdown should be closed
            expect(screen.queryByText('Add Divider')).not.toBeInTheDocument();
        });
    });

    describe('workspace display and selection', () => {
        it('should display workspaces from store', async () => {
            setupWithWorkspaces();
            render(<Sidebar />);
            expect(screen.getByText('Project Alpha')).toBeInTheDocument();
            expect(screen.getByText('Project Beta')).toBeInTheDocument();
        });

        it('should call switchWorkspace on workspace click', async () => {
            setupWithWorkspaces();
            render(<Sidebar />);
            fireEvent.click(screen.getByText('Project Beta'));
            // Uses new switchWorkspace hook (handles save + prefetch + atomic swap)
            await waitFor(() => expect(mockSwitchWorkspace).toHaveBeenCalledWith('ws-2'));
        });

        it('should NOT call clearCanvas directly (atomic swap via hook)', async () => {
            setupWithWorkspaces();
            render(<Sidebar />);
            fireEvent.click(screen.getByText('Project Beta'));
            await waitFor(() => expect(mockSwitchWorkspace).toHaveBeenCalledWith('ws-2'));
            // clearCanvas should NOT be called - hook handles atomic swap
            expect(mockClearCanvas).not.toHaveBeenCalled();
        });

        it('should display node count when available', async () => {
            const workspacesWithCounts = [
                { ...mockWorkspacesList[0]!, nodeCount: 5 },
                { ...mockWorkspacesList[1]!, nodeCount: 0 },
            ];
            setupWithWorkspaces(workspacesWithCounts);
            render(<Sidebar />);

            expect(screen.getByText('(5)')).toBeInTheDocument();
            expect(screen.getByText('(0)')).toBeInTheDocument();
        });
    });

    describe('workspace switching via hook', () => {
        it('should use useWorkspaceSwitcher for workspace switching', async () => {
            setupWithWorkspaces();
            render(<Sidebar />);
            fireEvent.click(screen.getByText('Project Beta'));
            // The hook handles: save current → prefetch new → atomic swap
            await waitFor(() => expect(mockSwitchWorkspace).toHaveBeenCalledWith('ws-2'));
        });

        it('should show error toast when switch fails', async () => {
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
            mockSwitchWorkspace.mockRejectedValue(new Error('Switch failed'));
            setupWithWorkspaces();
            render(<Sidebar />);
            fireEvent.click(screen.getByText('Project Beta'));
            await waitFor(() => expect(toast.error).toHaveBeenCalledWith(strings.workspace.switchError));
            consoleSpy.mockRestore();
        });
    });

});
