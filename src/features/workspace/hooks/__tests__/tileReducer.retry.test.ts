/**
 * tileReducer RETRY_TILE action — TDD tests (written BEFORE implementation).
 */
import { describe, it, expect } from 'vitest';
import { tileReducer, INITIAL_TILE_STATE } from '../tileReducer';
import type { TileState } from '../tileReducer';

function stateWith(overrides: Partial<TileState>): TileState {
    return { ...INITIAL_TILE_STATE, ...overrides };
}

describe('tileReducer — RETRY_TILE', () => {
    it('moves tiles from errorTileIds to loadingTileIds', () => {
        const state = stateWith({ errorTileIds: ['tile_0_0', 'tile_1_0'] });
        const next = tileReducer(state, { type: 'RETRY_TILE', tileIds: ['tile_0_0'] });
        expect(next.errorTileIds).not.toContain('tile_0_0');
        expect(next.loadingTileIds).toContain('tile_0_0');
    });

    it('removes retried tiles from errorTileIds completely', () => {
        const state = stateWith({ errorTileIds: ['tile_0_0', 'tile_1_0'] });
        const next = tileReducer(state, { type: 'RETRY_TILE', tileIds: ['tile_0_0', 'tile_1_0'] });
        expect(next.errorTileIds).toHaveLength(0);
    });

    it('preserves loadingTileIds that were already loading', () => {
        const state = stateWith({
            errorTileIds: ['tile_0_0'],
            loadingTileIds: ['tile_2_0'],
        });
        const next = tileReducer(state, { type: 'RETRY_TILE', tileIds: ['tile_0_0'] });
        expect(next.loadingTileIds).toContain('tile_2_0');
        expect(next.loadingTileIds).toContain('tile_0_0');
    });

    it('does not duplicate a tileId in loadingTileIds if already loading', () => {
        const state = stateWith({
            errorTileIds: ['tile_0_0'],
            loadingTileIds: ['tile_0_0'],
        });
        const next = tileReducer(state, { type: 'RETRY_TILE', tileIds: ['tile_0_0'] });
        expect(next.loadingTileIds.filter((id) => id === 'tile_0_0')).toHaveLength(1);
    });

    it('does not touch activeTileIds or loadedTileIds', () => {
        const state = stateWith({
            activeTileIds: ['tile_0_0'],
            loadedTileIds: ['tile_3_0'],
            errorTileIds: ['tile_0_0'],
        });
        const next = tileReducer(state, { type: 'RETRY_TILE', tileIds: ['tile_0_0'] });
        expect(next.activeTileIds).toEqual(['tile_0_0']);
        expect(next.loadedTileIds).toEqual(['tile_3_0']);
    });

    it('is a no-op when tileId is not in errorTileIds', () => {
        const state = stateWith({ errorTileIds: ['tile_1_0'] });
        const next = tileReducer(state, { type: 'RETRY_TILE', tileIds: ['tile_0_0'] });
        expect(next.loadingTileIds).toContain('tile_0_0');
        expect(next.errorTileIds).toEqual(['tile_1_0']);
    });
});
