import { describe, it, expect } from 'vitest';
import { readerReducer, INITIAL_STATE } from '../hooks/useReaderReducer';
import type { ReaderAction } from '../hooks/useReaderReducer';

describe('readerReducer', () => {
    it('returns initial state for unknown action', () => {
        const result = readerReducer(INITIAL_STATE, { type: 'UNKNOWN' } as unknown as ReaderAction);
        expect(result).toEqual(INITIAL_STATE);
    });

    it('FLIP_PANES toggles paneSide', () => {
        expect(readerReducer(INITIAL_STATE, { type: 'FLIP_PANES' }).paneSide).toBe('right');
        const flipped = readerReducer({ ...INITIAL_STATE, paneSide: 'right' }, { type: 'FLIP_PANES' });
        expect(flipped.paneSide).toBe('left');
    });

    it('SET_PAGE clamps to valid range', () => {
        const withPages = { ...INITIAL_STATE, totalPages: 10 };
        expect(readerReducer(withPages, { type: 'SET_PAGE', page: 5 }).currentPage).toBe(5);
        expect(readerReducer(withPages, { type: 'SET_PAGE', page: 0 }).currentPage).toBe(1);
        expect(readerReducer(withPages, { type: 'SET_PAGE', page: 15 }).currentPage).toBe(10);
    });

    it('SET_TOTAL_PAGES updates total', () => {
        const result = readerReducer(INITIAL_STATE, { type: 'SET_TOTAL_PAGES', total: 42 });
        expect(result.totalPages).toBe(42);
    });

    it('SET_SELECTION stores text', () => {
        const result = readerReducer(INITIAL_STATE, { type: 'SET_SELECTION', text: 'hello world' });
        expect(result.selectionDraft).toBe('hello world');
    });

    it('CLEAR_SELECTION empties draft', () => {
        const withSelection = { ...INITIAL_STATE, selectionDraft: 'some text' };
        expect(readerReducer(withSelection, { type: 'CLEAR_SELECTION' }).selectionDraft).toBe('');
    });

    it('SET_LOAD_STATE updates loadState', () => {
        const result = readerReducer(INITIAL_STATE, { type: 'SET_LOAD_STATE', state: 'error' });
        expect(result.loadState).toBe('error');
    });

    it('RESET returns initial state', () => {
        const modified = { ...INITIAL_STATE, currentPage: 5, selectionDraft: 'test' };
        expect(readerReducer(modified, { type: 'RESET' })).toEqual(INITIAL_STATE);
    });
});
