/**
 * useTileEviction — manages tile eviction interval and syncs tile-error store.
 * Extracted from useViewportTileLoader to keep that hook within the 75-line limit.
 */
import { useEffect, useRef } from 'react';
import type { Dispatch } from 'react';
import { tileLoader } from '@/features/workspace/services/tileLoader';
import { useTileErrorStore } from '@/features/workspace/stores/tileErrorStore';
import { TILE_EVICTION_MS } from '@/config/firestoreQueryConfig';
import type { TileAction } from './tileReducer';

export function useTileEviction(
    enabled: boolean,
    activeTileIds: readonly string[],
    errorTileIds: readonly string[],
    dispatch: Dispatch<TileAction>,
    retryFn: () => void,
): void {
    useEffect(() => {
        useTileErrorStore.setState({ retryFn });
        return () => { useTileErrorStore.setState({ retryFn: null }); };
    }, [retryFn]);

    useEffect(() => {
        useTileErrorStore.setState({ errorTileIds });
    }, [errorTileIds]);

    const activeTileIdsRef = useRef(activeTileIds);
    activeTileIdsRef.current = activeTileIds;

    useEffect(() => {
        if (!enabled) return;
        const interval = setInterval(() => {
            const evicted = tileLoader.evictStaleTiles([...activeTileIdsRef.current]);
            if (evicted.length > 0) dispatch({ type: 'TILES_EVICTED', tileIds: evicted });
        }, TILE_EVICTION_MS);
        return () => { clearInterval(interval); tileLoader.clearCache(); };
    }, [enabled, dispatch]);
}
