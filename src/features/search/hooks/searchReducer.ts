/**
 * Search Reducer — Pure state machine for search UI.
 * Completely isolated from React and stores.
 */
import type { SearchFilters } from '../types/search';

export interface SearchState {
    query: string;
    filters: SearchFilters;
    activeIndex: number; // Keyboard navigation: -1 = none selected
    isFilterBarOpen: boolean; // Filter panel toggle state
}

export type SearchAction =
    | { type: 'SET_QUERY'; query: string }
    | { type: 'SET_FILTER'; filter: Partial<SearchFilters> }
    | { type: 'SET_ACTIVE_INDEX'; index: number }
    | { type: 'TOGGLE_FILTER_BAR' }
    | { type: 'CLEAR_FILTERS' }
    | { type: 'CLEAR_ALL' };

export const INITIAL_SEARCH_STATE: SearchState = {
    query: '',
    filters: {},
    activeIndex: -1,
    isFilterBarOpen: false,
};

export function searchReducer(state: SearchState, action: SearchAction): SearchState {
    switch (action.type) {
        case 'SET_QUERY':
            // Reset activeIndex so stale keyboard selection doesn't persist
            return { ...state, query: action.query.slice(0, 200), activeIndex: -1 };
        case 'SET_FILTER':
            return { ...state, filters: { ...state.filters, ...action.filter } };
        case 'SET_ACTIVE_INDEX':
            return { ...state, activeIndex: action.index };
        case 'TOGGLE_FILTER_BAR':
            return { ...state, isFilterBarOpen: !state.isFilterBarOpen };
        case 'CLEAR_FILTERS':
            return { ...state, filters: {} };
        case 'CLEAR_ALL':
            return INITIAL_SEARCH_STATE;
    }
}
