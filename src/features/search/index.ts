/**
 * Search Feature - Export public API
 */
export { SearchBar } from './components/SearchBar';
export type { SearchBarHandle } from './components/SearchBar';
export { useSearch } from './hooks/useSearch';
export { useFindSimilar } from './hooks/useFindSimilar';
export { FindSimilarProvider, useFindSimilarContext } from './context/FindSimilarContext';
export type { SearchResult, SearchFilters, ContentTypeFilter } from './types/search';
export { searchStrings } from './strings/searchStrings';
