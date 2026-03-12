/**
 * SearchBar Component - Global search with fuzzy match, filters, keyboard navigation
 * BASB: Quick retrieval of captured ideas
 * Phase 8: ARIA combobox, highlight rendering, filter bar integration
 */
import { useState, useCallback, useRef, useEffect, useImperativeHandle, forwardRef, useId } from 'react';
import { useSearch } from '../hooks/useSearch';
import { splitByRanges } from '../services/fuzzyMatch';
import { searchStrings } from '../strings/searchStrings';
import { SearchFilterBar } from './SearchFilterBar';
import type { SearchResult } from '../types/search';
import styles from './SearchBar.module.css';

interface SearchBarProps {
    onResultClick?: (nodeId: string, workspaceId: string) => void;
}

/** Safe React highlight rendering — uses splitByRanges, not raw HTML injection */
function HighlightedText({ text, ranges }: { text: string; ranges: ReadonlyArray<{ start: number; end: number }> }) {
    const segments = splitByRanges(text, ranges);
    return (
        <>
            {segments.map((seg, si) =>
                seg.highlighted ? (
                    <mark key={`hl-${si}`} className={styles.highlight}>
                        {seg.text}
                    </mark>
                ) : (
                    <span key={`seg-${si}`}>{seg.text}</span>
                ),
            )}
        </>
    );
}

export interface SearchBarHandle {
    focus: () => void;
    select: () => void;
}

function matchTypeLabel(matchType: SearchResult['matchType']): string {
    switch (matchType) {
        case 'output': return searchStrings.output;
        case 'tag': return searchStrings.tag;
        case 'prompt': return searchStrings.prompt;
        default: return searchStrings.heading;
    }
}

/** Hook: close dropdown when clicking outside container */
function useClickOutside(ref: React.RefObject<HTMLElement | null>, onClose: () => void): void {
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (!(e.target instanceof Node)) return;
            if (ref.current && !ref.current.contains(e.target)) onClose();
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [ref, onClose]);
}

interface SearchResultsListProps {
    readonly results: SearchResult[];
    readonly activeIndex: number;
    readonly listboxId: string;
    readonly onSelect: (result: SearchResult) => void;
    readonly onHover: (index: number) => void;
}

function SearchResultsList({ results, activeIndex, listboxId, onSelect, onHover }: SearchResultsListProps) {
    return (
        <ul className={styles.resultsDropdown} role="listbox" id={listboxId} aria-label={searchStrings.resultsCount}>
            {results.map((result, index) => (
                <li
                    key={`${result.nodeId}-${result.matchType}-${index}`}
                    id={`search-result-${index}`}
                    role="option"
                    aria-selected={index === activeIndex}
                    className={`${styles.resultItem} ${index === activeIndex ? styles.resultItemActive : ''}`}
                    onClick={() => onSelect(result)}
                    onMouseEnter={() => onHover(index)}
                >
                    <span className={styles.resultContent}>
                        <HighlightedText text={result.matchedContent} ranges={result.highlightRanges} />
                    </span>
                    <span className={styles.resultMeta}>
                        {matchTypeLabel(result.matchType)}
                        {' \u00B7 '}
                        {result.workspaceName}
                    </span>
                </li>
            ))}
            <li className={styles.keyboardHint}>{searchStrings.keyboardHint}</li>
        </ul>
    );
}

function useSearchBarState(onResultClick?: (nodeId: string, workspaceId: string) => void) {
    const [inputValue, setInputValue] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const {
        results, search, clear, activeIndex, setActiveIndex,
        filters, setFilters, clearFilters, isFilterBarOpen, toggleFilterBar,
    } = useSearch();

    const handleInputChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            const value = e.target.value;
            setInputValue(value);
            search(value);
            setIsOpen(value.length > 0);
        },
        [search],
    );

    const handleResultSelect = useCallback(
        (result: SearchResult) => {
            onResultClick?.(result.nodeId, result.workspaceId);
            setInputValue('');
            clear();
            setIsOpen(false);
        },
        [onResultClick, clear],
    );

    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent) => {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setActiveIndex(Math.min(activeIndex + 1, results.length - 1));
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setActiveIndex(Math.max(activeIndex - 1, -1));
            } else if (e.key === 'Enter' && activeIndex >= 0 && results[activeIndex]) {
                e.preventDefault();
                handleResultSelect(results[activeIndex]);
            } else if (e.key === 'Escape') {
                // Local escape: clears search input. NOT migrated to useEscapeLayer.
                // See PHASE-ESC-N-KEY-BULLETPROOF.md §2.6.
                setInputValue('');
                clear();
                setIsOpen(false);
                inputRef.current?.blur();
            }
        },
        [activeIndex, results, setActiveIndex, handleResultSelect, clear],
    );

    const closeDropdown = useCallback(() => setIsOpen(false), []);
    useClickOutside(containerRef, closeDropdown);

    const hasResults = results.length > 0;
    const showDropdown = isOpen && (hasResults || inputValue.length > 0);
    const activeDescendant = activeIndex >= 0 ? `search-result-${activeIndex}` : undefined;
    const uniqueId = useId();
    const listboxId = `search-results-listbox-${uniqueId}`;

    return {
        inputValue, inputRef, containerRef, handleInputChange, handleKeyDown, handleResultSelect,
        results, filters, setFilters, clearFilters, isFilterBarOpen, toggleFilterBar,
        hasResults, showDropdown, activeDescendant, listboxId, activeIndex, setActiveIndex, setIsOpen,
    };
}

export const SearchBar = forwardRef<SearchBarHandle, SearchBarProps>(function SearchBar(
    { onResultClick },
    ref,
) {
    const {
        inputValue, inputRef, containerRef, handleInputChange, handleKeyDown, handleResultSelect,
        results, filters, setFilters, clearFilters, isFilterBarOpen, toggleFilterBar,
        hasResults, showDropdown, activeDescendant, listboxId, activeIndex, setActiveIndex, setIsOpen,
    } = useSearchBarState(onResultClick);

    useImperativeHandle(ref, () => ({
        focus: () => { inputRef.current?.focus(); },
        select: () => { inputRef.current?.select(); },
    }), [inputRef]);

    return (
        <div className={styles.searchContainer} ref={containerRef}>
            <div className={styles.inputRow}>
                <input
                    type="text"
                    role="combobox"
                    aria-expanded={showDropdown}
                    aria-haspopup="listbox"
                    aria-controls={listboxId}
                    aria-activedescendant={activeDescendant}
                    aria-autocomplete="list"
                    className={styles.searchInput}
                    placeholder={searchStrings.placeholder}
                    value={inputValue}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    onFocus={() => { if (inputValue.length > 0) setIsOpen(true); }}
                    ref={inputRef}
                />
                <span className={styles.searchIcon}>🔍</span>
                <button
                    type="button"
                    className={styles.filterToggleBtn}
                    onClick={toggleFilterBar}
                    aria-label={searchStrings.filterToggle}
                    title={searchStrings.filterToggle}
                >
                    ⚙
                </button>
            </div>

            <SearchFilterBar
                filters={filters}
                isOpen={isFilterBarOpen}
                onSetFilter={setFilters}
                onClearFilters={clearFilters}
            />

            {showDropdown && hasResults && (
                <SearchResultsList results={results} activeIndex={activeIndex}
                    listboxId={listboxId} onSelect={handleResultSelect} onHover={setActiveIndex} />
            )}

            {showDropdown && inputValue.length > 0 && !hasResults && (
                <div className={styles.resultsDropdown}>
                    <div className={styles.noResults}>{searchStrings.noResults}</div>
                </div>
            )}
        </div>
    );
});
