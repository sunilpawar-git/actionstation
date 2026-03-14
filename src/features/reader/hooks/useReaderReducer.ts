/**
 * useReaderReducer — Local UI state for the reader shell.
 * Isolated from canvas store to prevent cross-dispatch cascades.
 * High-frequency updates (page, selection) stay local.
 */
import { useReducer, useCallback } from 'react';
import type { ReaderLocalState, ReaderLoadState } from '../types/reader';

type ReaderAction =
    | { type: 'FLIP_PANES' }
    | { type: 'SET_PAGE'; page: number }
    | { type: 'SET_TOTAL_PAGES'; total: number }
    | { type: 'SET_SELECTION'; text: string }
    | { type: 'CLEAR_SELECTION' }
    | { type: 'SET_LOAD_STATE'; state: ReaderLoadState }
    | { type: 'RESET' };

const INITIAL_STATE: ReaderLocalState = {
    paneSide: 'left',
    currentPage: 1,
    totalPages: 0,
    selectionDraft: '',
    loadState: 'idle',
};

function readerReducer(state: ReaderLocalState, action: ReaderAction): ReaderLocalState {
    switch (action.type) {
        case 'FLIP_PANES':
            return { ...state, paneSide: state.paneSide === 'left' ? 'right' : 'left' };
        case 'SET_PAGE':
            return { ...state, currentPage: Math.max(1, Math.min(action.page, state.totalPages || 1)) };
        case 'SET_TOTAL_PAGES':
            return { ...state, totalPages: action.total };
        case 'SET_SELECTION':
            return { ...state, selectionDraft: action.text };
        case 'CLEAR_SELECTION':
            return { ...state, selectionDraft: '' };
        case 'SET_LOAD_STATE':
            return { ...state, loadState: action.state };
        case 'RESET':
            return INITIAL_STATE;
        default:
            return state;
    }
}

export function useReaderReducer() {
    const [state, dispatch] = useReducer(readerReducer, INITIAL_STATE);

    const flipPanes = useCallback(() => dispatch({ type: 'FLIP_PANES' }), []);
    const setPage = useCallback((page: number) => dispatch({ type: 'SET_PAGE', page }), []);
    const setTotalPages = useCallback((total: number) => dispatch({ type: 'SET_TOTAL_PAGES', total }), []);
    const setSelection = useCallback((text: string) => dispatch({ type: 'SET_SELECTION', text }), []);
    const clearSelection = useCallback(() => dispatch({ type: 'CLEAR_SELECTION' }), []);
    const setLoadState = useCallback((s: ReaderLoadState) => dispatch({ type: 'SET_LOAD_STATE', state: s }), []);
    const reset = useCallback(() => dispatch({ type: 'RESET' }), []);

    return {
        state,
        flipPanes,
        setPage,
        setTotalPages,
        setSelection,
        clearSelection,
        setLoadState,
        reset,
    };
}

export { INITIAL_STATE, readerReducer };
export type { ReaderAction };
