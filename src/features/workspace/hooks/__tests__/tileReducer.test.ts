import { describe, it, expect } from 'vitest';
import { tileReducer, INITIAL_TILE_STATE, type TileState, type TileAction } from '../tileReducer';

function dispatch(state: TileState, ...actions: TileAction[]): TileState {
    return actions.reduce(tileReducer, state);
}

describe('tileReducer', () => {
    describe('TILES_REQUESTED', () => {
        it('sets activeTileIds and adds to loadingTileIds', () => {
            const result = dispatch(INITIAL_TILE_STATE, {
                type: 'TILES_REQUESTED', tileIds: ['tile_0_0', 'tile_1_0'],
            });
            expect(result.activeTileIds).toEqual(['tile_0_0', 'tile_1_0']);
            expect(result.loadingTileIds).toEqual(['tile_0_0', 'tile_1_0']);
        });

        it('does not add already-loaded tiles to loadingTileIds', () => {
            const state: TileState = {
                ...INITIAL_TILE_STATE,
                loadedTileIds: ['tile_0_0'],
            };
            const result = dispatch(state, {
                type: 'TILES_REQUESTED', tileIds: ['tile_0_0', 'tile_1_0'],
            });
            expect(result.loadingTileIds).toEqual(['tile_1_0']);
        });

        it('clears error state for re-requested tiles', () => {
            const state: TileState = {
                ...INITIAL_TILE_STATE,
                errorTileIds: ['tile_0_0', 'tile_2_2'],
            };
            const result = dispatch(state, {
                type: 'TILES_REQUESTED', tileIds: ['tile_0_0'],
            });
            expect(result.errorTileIds).toEqual(['tile_2_2']);
        });

        it('is idempotent for duplicate requests', () => {
            const first = dispatch(INITIAL_TILE_STATE, {
                type: 'TILES_REQUESTED', tileIds: ['tile_0_0'],
            });
            const second = dispatch(first, {
                type: 'TILES_REQUESTED', tileIds: ['tile_0_0'],
            });
            expect(second.loadingTileIds).toEqual(['tile_0_0']);
        });
    });

    describe('TILES_LOADED', () => {
        it('moves tiles from loadingTileIds to loadedTileIds', () => {
            const state: TileState = {
                ...INITIAL_TILE_STATE,
                loadingTileIds: ['tile_0_0', 'tile_1_0'],
            };
            const result = dispatch(state, {
                type: 'TILES_LOADED', tileIds: ['tile_0_0'],
            });
            expect(result.loadingTileIds).toEqual(['tile_1_0']);
            expect(result.loadedTileIds).toContain('tile_0_0');
        });

        it('does not create duplicate loadedTileIds', () => {
            const state: TileState = {
                ...INITIAL_TILE_STATE,
                loadedTileIds: ['tile_0_0'],
                loadingTileIds: ['tile_0_0'],
            };
            const result = dispatch(state, {
                type: 'TILES_LOADED', tileIds: ['tile_0_0'],
            });
            expect(result.loadedTileIds).toEqual(['tile_0_0']);
        });
    });

    describe('TILES_FAILED', () => {
        it('moves tiles from loadingTileIds to errorTileIds', () => {
            const state: TileState = {
                ...INITIAL_TILE_STATE,
                loadingTileIds: ['tile_0_0'],
            };
            const result = dispatch(state, {
                type: 'TILES_FAILED', tileIds: ['tile_0_0'],
            });
            expect(result.loadingTileIds).toEqual([]);
            expect(result.errorTileIds).toContain('tile_0_0');
        });
    });

    describe('TILES_EVICTED', () => {
        it('removes tiles from loadedTileIds and activeTileIds', () => {
            const state: TileState = {
                ...INITIAL_TILE_STATE,
                loadedTileIds: ['tile_0_0', 'tile_1_0'],
                activeTileIds: ['tile_0_0', 'tile_1_0'],
            };
            const result = dispatch(state, {
                type: 'TILES_EVICTED', tileIds: ['tile_1_0'],
            });
            expect(result.loadedTileIds).toEqual(['tile_0_0']);
            expect(result.activeTileIds).toEqual(['tile_0_0']);
        });
    });

    describe('RESET', () => {
        it('clears all tile state', () => {
            const state: TileState = {
                activeTileIds: ['tile_0_0'],
                loadingTileIds: ['tile_1_0'],
                loadedTileIds: ['tile_2_0'],
                errorTileIds: ['tile_3_0'],
            };
            const result = dispatch(state, { type: 'RESET' });
            expect(result).toEqual(INITIAL_TILE_STATE);
        });
    });

    describe('full lifecycle', () => {
        it('handles request -> load -> evict sequence', () => {
            let state = INITIAL_TILE_STATE;
            state = tileReducer(state, { type: 'TILES_REQUESTED', tileIds: ['tile_0_0', 'tile_1_0'] });
            expect(state.loadingTileIds).toHaveLength(2);

            state = tileReducer(state, { type: 'TILES_LOADED', tileIds: ['tile_0_0', 'tile_1_0'] });
            expect(state.loadingTileIds).toHaveLength(0);
            expect(state.loadedTileIds).toHaveLength(2);

            state = tileReducer(state, { type: 'TILES_EVICTED', tileIds: ['tile_0_0'] });
            expect(state.loadedTileIds).toEqual(['tile_1_0']);
        });
    });
});
