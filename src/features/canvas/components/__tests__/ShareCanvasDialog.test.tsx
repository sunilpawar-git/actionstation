import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ShareCanvasDialog } from '../ShareCanvasDialog';
import * as snapshotService from '../../services/snapshotService';

vi.mock('../../services/snapshotService', () => ({
    createSnapshot: vi.fn(),
}));

vi.mock('@/features/canvas/stores/canvasStore', () => {
    const state = { nodes: [{ id: 'n1' }], edges: [] as unknown[] };
    const useCanvasStore = (sel: (s: typeof state) => unknown) => sel(state);
    useCanvasStore.getState = () => state;
    return { useCanvasStore };
});

vi.mock('@/features/workspace/stores/workspaceStore', () => ({
    useWorkspaceStore: (sel: (s: { workspaces: Array<{ id: string; name: string }>; currentWorkspaceId: string }) => unknown) =>
        sel({ workspaces: [{ id: 'ws-1', name: 'My Board' }], currentWorkspaceId: 'ws-1' }),
}));

vi.mock('@/features/auth/stores/authStore', () => ({
    useAuthStore: (sel: (s: { user: { id: string } | null }) => unknown) =>
        sel({ user: { id: 'user-1' } }),
}));

vi.mock('@/shared/stores/toastStore', () => ({
    toast: { error: vi.fn(), success: vi.fn() },
}));

vi.mock('@/shared/services/logger', () => ({
    logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

const mockClipboard = { writeText: vi.fn(() => Promise.resolve()) };
vi.stubGlobal('navigator', { clipboard: mockClipboard });

describe('ShareCanvasDialog', () => {
    beforeEach(() => { vi.clearAllMocks(); });

    it('does not render when closed', () => {
        render(<ShareCanvasDialog isOpen={false} onClose={vi.fn()} />);
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('renders create link button when open', () => {
        render(<ShareCanvasDialog isOpen onClose={vi.fn()} />);
        expect(screen.getByRole('dialog')).toBeInTheDocument();
        expect(screen.getByText(/create.*link/i)).toBeInTheDocument();
    });

    it('shows creating state while generating', async () => {
        vi.mocked(snapshotService.createSnapshot).mockReturnValue(new Promise(() => { /* never resolves */ }));
        render(<ShareCanvasDialog isOpen onClose={vi.fn()} />);
        fireEvent.click(screen.getByText(/create.*link/i));
        await waitFor(() => expect(screen.getByText(/creating/i)).toBeInTheDocument());
    });

    it('shows share URL after successful creation', async () => {
        vi.mocked(snapshotService.createSnapshot).mockResolvedValue('snap-abc');
        vi.stubGlobal('location', { origin: 'https://app.example.com' });
        render(<ShareCanvasDialog isOpen onClose={vi.fn()} />);
        fireEvent.click(screen.getByText(/create.*link/i));
        await waitFor(() => expect(screen.getByText(/\/view\/snap-abc/i)).toBeInTheDocument());
    });

    it('shows copy button after link is ready', async () => {
        vi.mocked(snapshotService.createSnapshot).mockResolvedValue('snap-abc');
        render(<ShareCanvasDialog isOpen onClose={vi.fn()} />);
        fireEvent.click(screen.getByText(/create.*link/i));
        await waitFor(() => expect(screen.getByText(/copy/i)).toBeInTheDocument());
    });

    it('calls navigator.clipboard.writeText when copy is clicked', async () => {
        vi.mocked(snapshotService.createSnapshot).mockResolvedValue('snap-abc');
        vi.stubGlobal('location', { origin: 'https://app.example.com' });
        render(<ShareCanvasDialog isOpen onClose={vi.fn()} />);
        fireEvent.click(screen.getByText(/create.*link/i));
        await waitFor(() => screen.getByText(/copy/i));
        fireEvent.click(screen.getByText(/copy/i));
        expect(mockClipboard.writeText).toHaveBeenCalledWith('https://app.example.com/view/snap-abc');
    });

    it('calls createSnapshot with userId, workspaceName, nodes, edges', async () => {
        vi.mocked(snapshotService.createSnapshot).mockResolvedValue('snap-abc');
        render(<ShareCanvasDialog isOpen onClose={vi.fn()} />);
        fireEvent.click(screen.getByText(/create.*link/i));
        await waitFor(() => screen.getByText(/copy/i));
        expect(snapshotService.createSnapshot).toHaveBeenCalledWith(
            'user-1', 'My Board', expect.arrayContaining([expect.objectContaining({ id: 'n1' })]), []
        );
    });

    it('calls onClose when close button is clicked', () => {
        const onClose = vi.fn();
        render(<ShareCanvasDialog isOpen onClose={onClose} />);
        fireEvent.click(screen.getByLabelText(/close/i));
        expect(onClose).toHaveBeenCalledOnce();
    });

    it('shows error toast on createSnapshot failure', async () => {
        const { toast } = await import('@/shared/stores/toastStore');
        vi.mocked(snapshotService.createSnapshot).mockRejectedValue(new Error('upload failed'));
        render(<ShareCanvasDialog isOpen onClose={vi.fn()} />);
        fireEvent.click(screen.getByText(/create.*link/i));
        await waitFor(() => expect(toast.error).toHaveBeenCalled());
    });
});
