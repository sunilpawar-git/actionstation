import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

vi.mock('@/shared/services/logger', () => ({
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock('@/shared/stores/toastStore', () => ({
    toast: { error: vi.fn(), success: vi.fn() },
}));

const mockLoadTiles = vi.fn();
const mockEvictStaleTiles = vi.fn().mockReturnValue([]);
const mockClearCache = vi.fn();

vi.mock('@/features/workspace/services/tileLoader', () => ({
    tileLoader: {
        loadTiles: (...args: unknown[]) => mockLoadTiles(...args),
        evictStaleTiles: (...args: unknown[]) => mockEvictStaleTiles(...args),
        clearCache: () => mockClearCache(),
        getCachedTileIds: vi.fn(() => []),
        invalidateTile: vi.fn(),
    },
}));

let storedViewport = { x: 0, y: 0, zoom: 1 };
const mockSetNodes = vi.fn();
vi.mock('@/features/canvas/stores/canvasStore', () => ({
    useCanvasStore: Object.assign(
        (selector: (s: Record<string, unknown>) => unknown) => selector({
            viewport: storedViewport,
            nodes: [],
        }),
        {
            getState: () => ({
                setNodes: mockSetNodes,
                nodes: [],
                viewport: storedViewport,
            }),
        },
    ),
}));

vi.mock('@/features/workspace/services/tileCalculator', () => ({
    getViewportTileIds: vi.fn(() => ['tile_0_0']),
}));

import { useViewportTileLoader } from '../useViewportTileLoader';
import type { CanvasNode } from '@/features/canvas/types/node';

function makeNode(id: string): CanvasNode {
    return {
        id, workspaceId: 'ws1', type: 'idea',
        data: { heading: 'test' }, position: { x: 0, y: 0 },
        createdAt: new Date(), updatedAt: new Date(),
    };
}

describe('useViewportTileLoader', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.useFakeTimers();
        storedViewport = { x: 0, y: 0, zoom: 1 };
        mockLoadTiles.mockResolvedValue([]);
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('returns initial tile state when disabled', () => {
        const { result } = renderHook(() =>
            useViewportTileLoader(undefined, 'ws1', false),
        );
        expect(result.current.activeTileIds).toEqual([]);
        expect(result.current.loadingTileIds).toEqual([]);
    });

    it('returns initial tile state when userId is undefined', () => {
        const { result } = renderHook(() =>
            useViewportTileLoader(undefined, 'ws1', true),
        );
        expect(result.current.activeTileIds).toEqual([]);
    });

    it('loads tiles when enabled with valid userId', async () => {
        mockLoadTiles.mockResolvedValue([makeNode('n1')]);

        const { result } = renderHook(() =>
            useViewportTileLoader('u1', 'ws1', true),
        );

        await act(async () => {
            vi.advanceTimersByTime(300);
        });
        await act(async () => {
            await Promise.resolve();
        });

        expect(mockLoadTiles).toHaveBeenCalledWith('u1', 'ws1', expect.any(Array));
        expect(result.current.loadedTileIds.length).toBeGreaterThanOrEqual(0);
    });

    it('clears cache on unmount', () => {
        const { unmount } = renderHook(() =>
            useViewportTileLoader('u1', 'ws1', true),
        );
        unmount();
        expect(mockClearCache).toHaveBeenCalled();
    });

    it('resets state when disabled after being enabled', async () => {
        const { result, rerender } = renderHook(
            ({ enabled }: { enabled: boolean }) =>
                useViewportTileLoader('u1', 'ws1', enabled),
            { initialProps: { enabled: true } },
        );

        await act(async () => {
            vi.advanceTimersByTime(300);
        });
        await act(async () => {
            await Promise.resolve();
        });

        rerender({ enabled: false });

        expect(result.current.activeTileIds).toEqual([]);
    });
});
