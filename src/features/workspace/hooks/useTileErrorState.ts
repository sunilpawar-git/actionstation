/**
 * useTileErrorState — reads tile error IDs and exposes a retry trigger.
 * Separated from useViewportTileLoader to allow standalone consumption.
 */
import { useCallback } from 'react';
import { useTileErrorStore } from '@/features/workspace/stores/tileErrorStore';

export function useTileErrorState(): { errorTileIds: readonly string[]; retry: () => void } {
    const errorTileIds = useTileErrorStore((s) => s.errorTileIds);
    const retry = useCallback(() => { useTileErrorStore.getState().retryFn?.(); }, []);
    return { errorTileIds, retry };
}
