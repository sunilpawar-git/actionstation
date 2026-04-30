import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Sidebar } from '../Sidebar';
// useAuthStore is mocked below - no direct import needed
import { strings } from '@/shared/localization/strings';
import { signOut } from '@/features/auth/services/authService';
import {
    loadUserWorkspaces, saveNodes, saveEdges,
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

const mockConfirm = vi.fn().mockResolvedValue(true);
vi.mock('@/shared/stores/confirmStore', () => ({
    useConfirm: () => mockConfirm,
    useConfirmStore: vi.fn(),
}));

const mockSwitchWorkspace = vi.fn();
vi.mock('@/features/workspace/hooks/useWorkspaceSwitcher', () => ({
    useWorkspaceSwitcher: vi.fn(() => ({
        isSwitching: false,
        error: null,
        switchWorkspace: mockSwitchWorkspace,
    })),
}));

const mockPreload = vi.fn();
const mockHydrateFromIdb = vi.fn().mockResolvedValue(undefined);
vi.mock('@/features/workspace/services/workspaceCache', () => ({
    workspaceCache: {
        preload: (...args: unknown[]) => mockPreload(...args),
        hydrateFromIdb: () => mockHydrateFromIdb(),
    },
}));

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
        mockSwitchWorkspace.mockResolvedValue(undefined);
        mockPreload.mockResolvedValue(undefined);
        vi.mocked(useWorkspaceSwitcher).mockReturnValue({
            isSwitching: false,
            error: null,
            switchWorkspace: mockSwitchWorkspace,
        });
    });

    describe('workspace renaming', () => {
        it('should rename workspace on double-click and blur', async () => {
            const workspaces = [{ id: 'ws-1', name: 'Old Name', userId: 'user-1', canvasSettings: { backgroundColor: 'grid' as const }, createdAt: new Date(), updatedAt: new Date() }];
            setupWithWorkspaces(workspaces);

            render(<Sidebar />);
            fireEvent.doubleClick(screen.getByText('Old Name'));
            const input = screen.getByDisplayValue('Old Name');
            fireEvent.change(input, { target: { value: 'New Name' } });
            fireEvent.blur(input);

            await waitFor(() => expect(mockUpdateWorkspace).toHaveBeenCalledWith('ws-1', { name: 'New Name' }));
        });
    });

    describe('user section', () => {
        it('should render user info and handle sign out', async () => {
            render(<Sidebar />);
            expect(screen.getByText('Test User')).toBeInTheDocument();
            fireEvent.click(screen.getByText(strings.auth.signOut));
            expect(signOut).toHaveBeenCalledTimes(1);
        });
    });

    describe('settings button', () => {
        it('should render settings button in footer', () => {
            render(<Sidebar />);
            expect(screen.getByLabelText(strings.settings.title)).toBeInTheDocument();
        });

        it('should call onSettingsClick when settings button is clicked', () => {
            const mockOnSettingsClick = vi.fn();
            render(<Sidebar onSettingsClick={mockOnSettingsClick} />);

            fireEvent.click(screen.getByLabelText(strings.settings.title));
            expect(mockOnSettingsClick).toHaveBeenCalledTimes(1);
        });

        it('should use PlusIcon for new workspace button', () => {
            render(<Sidebar />);
            const newWorkspaceButton = screen.getByText(strings.workspace.newWorkspace);
            const svgIcon = newWorkspaceButton.parentElement?.querySelector('svg');
            expect(svgIcon).toBeInTheDocument();
        });
    });

    describe('cache preloading', () => {
        it('should preload all workspace data into cache on mount', async () => {
            vi.mocked(loadUserWorkspaces).mockResolvedValue(mockWorkspacesList);
            setupWithWorkspaces();
            render(<Sidebar />);

            await waitFor(() => {
                expect(mockPreload).toHaveBeenCalledWith('user-1', ['ws-1']);
            });
        });

        it('should handle preload errors gracefully', async () => {
            vi.mocked(loadUserWorkspaces).mockResolvedValue(mockWorkspacesList);
            mockPreload.mockRejectedValue(new Error('Preload failed'));
            const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => { });
            setupWithWorkspaces();

            render(<Sidebar />);

            await waitFor(() => {
                expect(screen.getByText('Project Alpha')).toBeInTheDocument();
            });

            consoleSpy.mockRestore();
        });
    });
});
