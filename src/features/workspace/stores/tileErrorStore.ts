/**
 * Tile Error Store — tiny Zustand store for sharing tile error state
 * between useViewportTileLoader (writer) and TileErrorBanner (reader).
 * Pattern: primitive selector reads, getState() for actions.
 */
import { create } from 'zustand';

interface TileErrorState {
    readonly errorTileIds: readonly string[];
    readonly retryFn: (() => void) | null;
}

export const useTileErrorStore = create<TileErrorState>(() => ({
    errorTileIds: [],
    retryFn: null,
}));
