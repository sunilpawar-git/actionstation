import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { CanvasViewer } from '../CanvasViewer';
import type { CanvasSnapshot } from '../../services/snapshotService';
import * as snapshotService from '../../services/snapshotService';

vi.mock('../../services/snapshotService', () => ({
    loadSnapshot: vi.fn(),
}));

vi.mock('@xyflow/react', () => ({
    ReactFlow: ({ nodes }: { nodes: unknown[] }) => (
        <div data-testid="reactflow">nodes:{nodes.length}</div>
    ),
    ReactFlowProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    Background: () => null,
    Controls: () => null,
}));

vi.mock('@/shared/services/logger', () => ({
    logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

const FUTURE = new Date(Date.now() + 1000 * 60 * 60 * 24 * 10).toISOString();
const SNAPSHOT: CanvasSnapshot = {
    snapshotId: 'snap-1',
    workspaceName: 'My Board',
    nodes: [
        {
            id: 'n1', workspaceId: 'ws-1', type: 'idea',
            data: { heading: 'Test Node', output: 'Some output' },
            position: { x: 0, y: 0 },
            createdAt: new Date(), updatedAt: new Date(),
        },
    ],
    edges: [],
    createdAt: new Date().toISOString(),
    expiresAt: FUTURE,
    createdBy: 'user-1',
};

describe('CanvasViewer', () => {
    beforeEach(() => { vi.clearAllMocks(); });

    it('shows loading state initially', () => {
        vi.mocked(snapshotService.loadSnapshot).mockReturnValue(new Promise(() => { /* never resolves */ }));
        render(<CanvasViewer snapshotId="snap-1" />);
        expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('renders canvas and workspace name when loaded', async () => {
        vi.mocked(snapshotService.loadSnapshot).mockResolvedValue(SNAPSHOT);
        render(<CanvasViewer snapshotId="snap-1" />);
        await waitFor(() => expect(screen.getByTestId('reactflow')).toBeInTheDocument());
        expect(screen.getByText('My Board')).toBeInTheDocument();
    });

    it('shows node count in header', async () => {
        vi.mocked(snapshotService.loadSnapshot).mockResolvedValue(SNAPSHOT);
        render(<CanvasViewer snapshotId="snap-1" />);
        await waitFor(() => screen.getByTestId('reactflow'));
        expect(screen.getByText(/1 node/i)).toBeInTheDocument();
    });

    it('shows expired state when snapshot is expired', async () => {
        vi.mocked(snapshotService.loadSnapshot).mockRejectedValue(new Error('Snapshot has expired'));
        render(<CanvasViewer snapshotId="snap-1" />);
        await waitFor(() =>
            expect(screen.getByText(/expired/i)).toBeInTheDocument()
        );
    });

    it('shows not-found state for unknown errors', async () => {
        vi.mocked(snapshotService.loadSnapshot).mockRejectedValue(new Error('Failed to load snapshot: 404'));
        render(<CanvasViewer snapshotId="snap-1" />);
        await waitFor(() =>
            expect(screen.getByText(/not found/i)).toBeInTheDocument()
        );
    });

    it('calls loadSnapshot with the provided snapshotId', async () => {
        vi.mocked(snapshotService.loadSnapshot).mockResolvedValue(SNAPSHOT);
        render(<CanvasViewer snapshotId="snap-1" />);
        await waitFor(() => screen.getByTestId('reactflow'));
        expect(snapshotService.loadSnapshot).toHaveBeenCalledWith('snap-1');
    });

    it('shows read-only label', async () => {
        vi.mocked(snapshotService.loadSnapshot).mockResolvedValue(SNAPSHOT);
        render(<CanvasViewer snapshotId="snap-1" />);
        await waitFor(() => screen.getByTestId('reactflow'));
        expect(screen.getByText(/read.only/i)).toBeInTheDocument();
    });
});
