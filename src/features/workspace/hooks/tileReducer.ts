/**
 * Tile State Reducer — Pure state machine for viewport tile loading.
 * Completely isolated from canvas store and Zustand.
 * All state transitions are one-shot; no nested dispatches.
 */

export interface TileState {
    activeTileIds: string[];
    loadingTileIds: string[];
    loadedTileIds: string[];
    errorTileIds: string[];
}

export type TileAction =
    | { type: 'TILES_REQUESTED'; tileIds: string[] }
    | { type: 'TILES_LOADED'; tileIds: string[] }
    | { type: 'TILES_FAILED'; tileIds: string[] }
    | { type: 'TILES_EVICTED'; tileIds: string[] }
    | { type: 'RESET' };

export const INITIAL_TILE_STATE: TileState = {
    activeTileIds: [],
    loadingTileIds: [],
    loadedTileIds: [],
    errorTileIds: [],
};

function unique(arr: string[]): string[] {
    return [...new Set(arr)];
}

export function tileReducer(state: TileState, action: TileAction): TileState {
    switch (action.type) {
        case 'TILES_REQUESTED': {
            const newLoading = action.tileIds.filter((id) => !state.loadedTileIds.includes(id));
            return {
                ...state,
                activeTileIds: action.tileIds,
                loadingTileIds: unique([...state.loadingTileIds, ...newLoading]),
                errorTileIds: state.errorTileIds.filter((id) => !action.tileIds.includes(id)),
            };
        }
        case 'TILES_LOADED':
            return {
                ...state,
                loadingTileIds: state.loadingTileIds.filter((id) => !action.tileIds.includes(id)),
                loadedTileIds: unique([...state.loadedTileIds, ...action.tileIds]),
            };
        case 'TILES_FAILED':
            return {
                ...state,
                loadingTileIds: state.loadingTileIds.filter((id) => !action.tileIds.includes(id)),
                errorTileIds: unique([...state.errorTileIds, ...action.tileIds]),
            };
        case 'TILES_EVICTED':
            return {
                ...state,
                loadedTileIds: state.loadedTileIds.filter((id) => !action.tileIds.includes(id)),
                activeTileIds: state.activeTileIds.filter((id) => !action.tileIds.includes(id)),
                errorTileIds: state.errorTileIds.filter((id) => !action.tileIds.includes(id)),
            };
        case 'RESET':
            return INITIAL_TILE_STATE;
        default:
            return state;
    }
}
