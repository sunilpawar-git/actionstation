/**
 * WorkspaceControls Clustering Tests — Clear themes button
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { WorkspaceControls } from '../WorkspaceControls';
import { useAuthStore } from '@/features/auth/stores/authStore';
import { useWorkspaceStore } from '../../stores/workspaceStore';
import { useCanvasStore } from '@/features/canvas/stores/canvasStore';
import { useSettingsStore } from '@/shared/stores/settingsStore';
import { clusterStrings } from '@/shared/localization/clusterStrings';

vi.mock('../../services/workspaceService', () => ({
    deleteWorkspace: vi.fn().mockResolvedValue(undefined),
}));

const mockConfirm = vi.fn().mockResolvedValue(false);
vi.mock('@/shared/stores/confirmStore', () => ({
    useConfirm: () => mockConfirm,
    useConfirmStore: vi.fn(),
}));

vi.mock('@/features/canvas/hooks/usePanToNode', () => ({
    usePanToNode: () => ({ panToPosition: vi.fn() }),
}));

vi.mock('@/shared/stores/toastStore', () => ({
    toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

const CLUSTER_FIXTURE = { id: 'c1', nodeIds: ['n1', 'n2'], label: 'Theme', colorIndex: 0 };

describe('WorkspaceControls - Clear themes button', () => {
    beforeEach(() => {
        vi.clearAllMocks();

        useAuthStore.setState({
            user: { id: 'test-user-id', email: 'test@test.com', name: 'T', avatarUrl: '', createdAt: new Date() },
            isAuthenticated: true, isLoading: false, error: null,
        });

        useWorkspaceStore.setState({
            currentWorkspaceId: 'workspace-1',
            workspaces: [{ id: 'workspace-1', userId: 'test-user-id', name: 'Test', canvasSettings: { backgroundColor: 'grid' }, createdAt: new Date(), updatedAt: new Date() }],
            isLoading: false, isSwitching: false,
        });

        useCanvasStore.setState({ nodes: [], edges: [], selectedNodeIds: new Set(), clusterGroups: [] });
        useSettingsStore.setState({ canvasFreeFlow: false });
    });

    it('is not shown when no clusters exist', () => {
        render(<WorkspaceControls />);
        expect(screen.queryByTitle(clusterStrings.labels.clearClusters)).not.toBeInTheDocument();
    });

    it('is shown when clusters exist', () => {
        useCanvasStore.setState({ clusterGroups: [CLUSTER_FIXTURE] });
        render(<WorkspaceControls />);
        expect(screen.getByTitle(clusterStrings.labels.clearClusters)).toBeInTheDocument();
    });

    it('clears cluster groups when clicked', () => {
        useCanvasStore.setState({ clusterGroups: [CLUSTER_FIXTURE] });
        render(<WorkspaceControls />);
        fireEvent.click(screen.getByTitle(clusterStrings.labels.clearClusters));
        expect(useCanvasStore.getState().clusterGroups).toHaveLength(0);
    });

    it('renders 7 dividers when clusters are active (vs 6 without)', () => {
        useCanvasStore.setState({ clusterGroups: [CLUSTER_FIXTURE] });
        const { container } = render(<WorkspaceControls />);
        const dividers = container.querySelectorAll('[class*="w-px"]');
        expect(dividers.length).toBe(7);
    });
});
