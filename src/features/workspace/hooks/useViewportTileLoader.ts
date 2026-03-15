/**
 * Viewport Tile Loader Hook — drives tile loading based on viewport changes.
 *
 * Constraints:
 * - Zustand: selectors for state, getState() for actions
 * - useReducer for tile state (isolated from canvas store)
 * - Debounced viewport → no cascade risk
 * - callbackRef for stale-closure prevention
 */
import { useReducer, useEffect, useRef, useCallback } from 'react';
import { useCanvasStore } from '@/features/canvas/stores/canvasStore';
import { tileLoader } from '@/features/workspace/services/tileLoader';
import { getViewportTileIds } from '@/features/workspace/services/tileCalculator';
import { tileReducer, INITIAL_TILE_STATE, type TileState } from './tileReducer';
import { TILE_EVICTION_MS } from '@/config/firestoreQueryConfig';
import { logger } from '@/shared/services/logger';
import { toast } from '@/shared/stores/toastStore';
import { strings } from '@/shared/localization/strings';

const VIEWPORT_DEBOUNCE_MS = 200;

export function useViewportTileLoader(
    userId: string | undefined,
    workspaceId: string,
    enabled: boolean,
): TileState {
    const [state, dispatch] = useReducer(tileReducer, INITIAL_TILE_STATE);
    const viewport = useCanvasStore((s) => s.viewport);

    const userIdRef = useRef(userId);
    userIdRef.current = userId;
    const workspaceIdRef = useRef(workspaceId);
    workspaceIdRef.current = workspaceId;
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const loadForViewport = useCallback(() => {
        const uid = userIdRef.current;
        const wsId = workspaceIdRef.current;
        if (!uid) return;

        const vp = useCanvasStore.getState().viewport;
        const w = typeof window !== 'undefined' ? window.innerWidth : 1920;
        const h = typeof window !== 'undefined' ? window.innerHeight : 1080;
        const tileIds = getViewportTileIds(vp, vp.zoom, w, h);
        dispatch({ type: 'TILES_REQUESTED', tileIds });

        tileLoader.loadTiles(uid, wsId, tileIds)
            .then((nodes) => {
                dispatch({ type: 'TILES_LOADED', tileIds });
                const existingNodes = useCanvasStore.getState().nodes;
                const existingIds = new Set(existingNodes.map((n) => n.id));
                const newNodes = nodes.filter((n) => !existingIds.has(n.id));
                if (newNodes.length > 0) {
                    useCanvasStore.getState().setNodes([...existingNodes, ...newNodes]);
                }
            })
            .catch((err: unknown) => {
                dispatch({ type: 'TILES_FAILED', tileIds });
                logger.error('[useViewportTileLoader] Tile load failed', err);
                toast.error(strings.workspace.tileLoadFailed);
            });
    }, []);

    useEffect(() => {
        if (!enabled || !userId) {
            dispatch({ type: 'RESET' });
            return;
        }

        if (timerRef.current !== null) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(loadForViewport, VIEWPORT_DEBOUNCE_MS);

        return () => {
            if (timerRef.current !== null) clearTimeout(timerRef.current);
        };
    }, [viewport, enabled, userId, loadForViewport]);

    const activeTileIdsRef = useRef(state.activeTileIds);
    activeTileIdsRef.current = state.activeTileIds;

    useEffect(() => {
        if (!enabled) return;
        const interval = setInterval(() => {
            const evicted = tileLoader.evictStaleTiles(activeTileIdsRef.current);
            if (evicted.length > 0) dispatch({ type: 'TILES_EVICTED', tileIds: evicted });
        }, TILE_EVICTION_MS);
        return () => { clearInterval(interval); tileLoader.clearCache(); };
    }, [enabled]);

    return state;
}
