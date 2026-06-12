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
import { useTileEviction } from './useTileEviction';
import { logger } from '@/shared/services/logger';
import { toast } from '@/shared/stores/toastStore';
import { strings } from '@/shared/localization/strings';
import { trackTileLoadFailed, trackTileLoadRetried } from '@/shared/services/analyticsService';
import type { CanvasNode } from '@/features/canvas/types/node';

export { useTileErrorState } from './useTileErrorState';

const VIEWPORT_DEBOUNCE_MS = 200;

function injectNewNodes(nodes: CanvasNode[]): void {
    const existing = useCanvasStore.getState().nodes;
    const existingIds = new Set(existing.map((n) => n.id));
    const newNodes = nodes.filter((n) => !existingIds.has(n.id));
    if (newNodes.length > 0) useCanvasStore.getState().setNodes([...existing, ...newNodes]);
}

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
    const errorTileIdsRef = useRef(state.errorTileIds);
    errorTileIdsRef.current = state.errorTileIds;
    const generationRef = useRef(0);

    const loadForViewport = useCallback(() => {
        const uid = userIdRef.current;
        const wsId = workspaceIdRef.current;
        if (!uid) return;
        const vp = useCanvasStore.getState().viewport;
        const w = typeof window !== 'undefined' ? window.innerWidth : 1920;
        const h = typeof window !== 'undefined' ? window.innerHeight : 1080;
        const tileIds = getViewportTileIds(vp, vp.zoom, w, h);
        dispatch({ type: 'TILES_REQUESTED', tileIds });
        const gen = ++generationRef.current;
        tileLoader.loadTiles(uid, wsId, tileIds)
            .then((nodes) => {
                if (gen !== generationRef.current) return;
                dispatch({ type: 'TILES_LOADED', tileIds });
                injectNewNodes(nodes);
            })
            .catch((err: unknown) => {
                if (gen !== generationRef.current) return;
                dispatch({ type: 'TILES_FAILED', tileIds });
                logger.error('[useViewportTileLoader] Tile load failed', err);
                toast.error(strings.workspace.tileLoadFailed);
                tileIds.forEach((id) => trackTileLoadFailed(id));
            });
    }, []);

    const retryTiles = useCallback(() => {
        const errIds = [...errorTileIdsRef.current];
        if (errIds.length === 0) return;
        const uid = userIdRef.current;
        const wsId = workspaceIdRef.current;
        if (!uid) return;
        dispatch({ type: 'RETRY_TILE', tileIds: errIds });
        trackTileLoadRetried(errIds.length);
        const gen = ++generationRef.current;
        tileLoader.loadTiles(uid, wsId, errIds)
            .then((nodes) => {
                if (gen !== generationRef.current) return;
                dispatch({ type: 'TILES_LOADED', tileIds: errIds });
                injectNewNodes(nodes);
            })
            .catch((err: unknown) => {
                if (gen !== generationRef.current) return;
                dispatch({ type: 'TILES_FAILED', tileIds: errIds });
                logger.error('[useViewportTileLoader] Retry failed', err);
                errIds.forEach((id) => trackTileLoadFailed(id));
            });
    }, []);

    useTileEviction(enabled, state.activeTileIds, state.errorTileIds, dispatch, retryTiles);

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

    return state;
}


