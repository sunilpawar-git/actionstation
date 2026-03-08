/**
 * Search Reducer — Unit Tests (pure function, no React dependency)
 */
import { describe, it, expect } from 'vitest';
import { searchReducer, INITIAL_SEARCH_STATE, type SearchState } from '../searchReducer';

describe('searchReducer', () => {
    it('SET_QUERY updates query', () => {
        const next = searchReducer(INITIAL_SEARCH_STATE, { type: 'SET_QUERY', query: 'hello' });
        expect(next.query).toBe('hello');
    });

    it('SET_QUERY caps at 200 chars (security)', () => {
        const longQuery = 'a'.repeat(300);
        const next = searchReducer(INITIAL_SEARCH_STATE, { type: 'SET_QUERY', query: longQuery });
        expect(next.query.length).toBe(200);
    });

    it('SET_QUERY resets activeIndex to -1', () => {
        const state: SearchState = { ...INITIAL_SEARCH_STATE, activeIndex: 5 };
        const next = searchReducer(state, { type: 'SET_QUERY', query: 'test' });
        expect(next.activeIndex).toBe(-1);
    });

    it('SET_FILTER merges partial filter', () => {
        const next = searchReducer(INITIAL_SEARCH_STATE, { type: 'SET_FILTER', filter: { tags: ['react'] } });
        expect(next.filters.tags).toEqual(['react']);
    });

    it('SET_FILTER preserves existing filters', () => {
        const state: SearchState = { ...INITIAL_SEARCH_STATE, filters: { tags: ['react'] } };
        const next = searchReducer(state, { type: 'SET_FILTER', filter: { contentType: 'hasOutput' } });
        expect(next.filters.tags).toEqual(['react']);
        expect(next.filters.contentType).toBe('hasOutput');
    });

    it('SET_ACTIVE_INDEX sets activeIndex', () => {
        const next = searchReducer(INITIAL_SEARCH_STATE, { type: 'SET_ACTIVE_INDEX', index: 3 });
        expect(next.activeIndex).toBe(3);
    });

    it('TOGGLE_FILTER_BAR flips isFilterBarOpen', () => {
        const next = searchReducer(INITIAL_SEARCH_STATE, { type: 'TOGGLE_FILTER_BAR' });
        expect(next.isFilterBarOpen).toBe(true);
    });

    it('TOGGLE_FILTER_BAR called twice returns to false', () => {
        let state = searchReducer(INITIAL_SEARCH_STATE, { type: 'TOGGLE_FILTER_BAR' });
        state = searchReducer(state, { type: 'TOGGLE_FILTER_BAR' });
        expect(state.isFilterBarOpen).toBe(false);
    });

    it('CLEAR_FILTERS resets filters but keeps query, activeIndex, isFilterBarOpen', () => {
        const state: SearchState = {
            query: 'test', filters: { tags: ['react'] }, activeIndex: 2, isFilterBarOpen: true,
        };
        const next = searchReducer(state, { type: 'CLEAR_FILTERS' });
        expect(next.filters).toEqual({});
        expect(next.query).toBe('test');
        expect(next.activeIndex).toBe(2);
        expect(next.isFilterBarOpen).toBe(true);
    });

    it('CLEAR_ALL resets to INITIAL_SEARCH_STATE', () => {
        const state: SearchState = {
            query: 'test', filters: { tags: ['x'] }, activeIndex: 5, isFilterBarOpen: true,
        };
        const next = searchReducer(state, { type: 'CLEAR_ALL' });
        expect(next).toEqual(INITIAL_SEARCH_STATE);
    });

    it('returns new state object (immutability)', () => {
        const next = searchReducer(INITIAL_SEARCH_STATE, { type: 'SET_QUERY', query: 'a' });
        expect(next).not.toBe(INITIAL_SEARCH_STATE);
    });
});
