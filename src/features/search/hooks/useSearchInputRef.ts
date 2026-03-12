/**
 * useSearchInputRef — Hook to access the shared SearchBar ref.
 * Gracefully returns a null fallback ref when used outside SearchInputRefProvider
 * (e.g. in unit tests that render Layout directly).
 */
import { useContext } from 'react';
import { SearchInputRefContext, FALLBACK_REF, type SearchInputRef } from '../context/searchInputRefDefs';

export function useSearchInputRef(): SearchInputRef {
    return useContext(SearchInputRefContext) ?? FALLBACK_REF;
}
