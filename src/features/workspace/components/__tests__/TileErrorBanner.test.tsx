/**
 * TileErrorBanner tests — TDD (written BEFORE implementation).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TileErrorBanner } from '../TileErrorBanner';
import { strings } from '@/shared/localization/strings';

// Module-level mutable state for mock control
let mockErrorTileIds: string[] = [];
const mockRetry = vi.fn();

vi.mock('@/features/workspace/hooks/useTileErrorState', () => ({
    useTileErrorState: vi.fn(() => ({
        errorTileIds: mockErrorTileIds,
        retry: mockRetry,
    })),
}));

describe('TileErrorBanner', () => {
    beforeEach(() => {
        mockErrorTileIds = [];
        vi.clearAllMocks();
    });

    it('renders nothing when there are no failed tiles', () => {
        mockErrorTileIds = [];
        const { container } = render(<TileErrorBanner />);
        expect(container.firstChild).toBeNull();
    });

    it('renders banner when one or more tiles have failed', () => {
        mockErrorTileIds = ['tile_0_0'];
        render(<TileErrorBanner />);
        expect(
            screen.getByText(strings.workspace.tileLoadFailed, { exact: false }),
        ).toBeInTheDocument();
    });

    it('has a retry button', () => {
        mockErrorTileIds = ['tile_0_0'];
        render(<TileErrorBanner />);
        expect(
            screen.getByRole('button', { name: strings.workspace.tileLoadRetry }),
        ).toBeInTheDocument();
    });

    it('calls retry when button is clicked', () => {
        mockErrorTileIds = ['tile_0_0', 'tile_1_0'];
        render(<TileErrorBanner />);
        fireEvent.click(screen.getByRole('button', { name: strings.workspace.tileLoadRetry }));
        expect(mockRetry).toHaveBeenCalledTimes(1);
    });

    it('has accessible region label', () => {
        mockErrorTileIds = ['tile_0_0'];
        render(<TileErrorBanner />);
        // aria-label now includes count: "<message> (1)"
        expect(
            screen.getByRole('region', { name: new RegExp(strings.workspace.tileLoadFailed) }),
        ).toBeInTheDocument();
    });

    it('shows the count of failed tiles', () => {
        mockErrorTileIds = ['tile_0_0', 'tile_1_0', 'tile_2_0'];
        render(<TileErrorBanner />);
        expect(screen.getByText(/3/)).toBeInTheDocument();
    });
});
