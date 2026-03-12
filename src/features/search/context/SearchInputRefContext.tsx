/**
 * SearchInputRefContext — Shares the SearchBar ref across the component tree.
 * Allows KeyboardShortcutsProvider (sibling of Layout) to call focus/select
 * on the SearchBar input without prop drilling.
 *
 * Usage:
 *   - Wrap siblings with <SearchInputRefProvider>
 *   - Layout.tsx: const ref = useSearchInputRef(); <SearchBar ref={ref} />
 *   - KeyboardShortcutsProvider.tsx: const ref = useSearchInputRef(); pass to useKeyboardShortcuts
 *
 * Note: useSearchInputRef hook is in hooks/useSearchInputRef.ts to satisfy
 * react-refresh/only-export-components (this file only exports components).
 */
import { useRef, type ReactNode } from 'react';
import type { SearchBarHandle } from '../components/SearchBar';
import { SearchInputRefContext } from './searchInputRefDefs';

export function SearchInputRefProvider({ children }: { children: ReactNode }) {
    const ref = useRef<SearchBarHandle>(null);
    return (
        <SearchInputRefContext.Provider value={ref}>
            {children}
        </SearchInputRefContext.Provider>
    );
}
