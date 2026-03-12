/**
 * searchInputRefDefs — Shared context + type for the SearchBar ref.
 * Split from SearchInputRefContext.tsx to satisfy react-refresh/only-export-components.
 */
import { createContext, createRef } from 'react';
import type React from 'react';
import type { SearchBarHandle } from '../components/SearchBar';

export type SearchInputRef = React.RefObject<SearchBarHandle>;

export const SearchInputRefContext = createContext<SearchInputRef | null>(null);

/** Stable fallback ref used when SearchInputRefProvider is absent (e.g. in unit tests). */
export const FALLBACK_REF: SearchInputRef = createRef<SearchBarHandle>();
