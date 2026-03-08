/**
 * SearchInputRefContext — Shares the SearchBar ref across the component tree.
 * Allows KeyboardShortcutsProvider (sibling of Layout) to call focus/select
 * on the SearchBar input without prop drilling.
 *
 * Usage:
 *   - Wrap siblings with <SearchInputRefProvider>
 *   - Layout.tsx: const ref = useSearchInputRef(); <SearchBar ref={ref} />
 *   - KeyboardShortcutsProvider.tsx: const ref = useSearchInputRef(); pass to useKeyboardShortcuts
 */
import { createContext, useContext, useRef, type ReactNode } from 'react';
import type React from 'react';
import type { SearchBarHandle } from '../components/SearchBar';

type SearchInputRef = React.RefObject<SearchBarHandle>;

const SearchInputRefContext = createContext<SearchInputRef | null>(null);

/** Stable fallback ref used when SearchInputRefProvider is absent (e.g. in unit tests). */
const FALLBACK_REF: SearchInputRef = { current: null } as React.RefObject<SearchBarHandle>;

export function SearchInputRefProvider({ children }: { children: ReactNode }) {
    const ref = useRef<SearchBarHandle>(null);
    return (
        <SearchInputRefContext.Provider value={ref}>
            {children}
        </SearchInputRefContext.Provider>
    );
}

/**
 * Returns the shared SearchBar ref.
 * Gracefully returns a null fallback ref when used outside SearchInputRefProvider
 * (e.g. in unit tests that render Layout directly).
 */
export function useSearchInputRef(): SearchInputRef {
    return useContext(SearchInputRefContext) ?? FALLBACK_REF;
}
