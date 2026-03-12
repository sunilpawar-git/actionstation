/**
 * SearchFilterBar — Horizontal filter panel for advanced search.
 * Composes TagFilterChips. Visibility gated by isFilterBarOpen from reducer.
 */
import { useMemo, useCallback } from 'react';
import { useCanvasStore } from '@/features/canvas/stores/canvasStore';
import { searchStrings } from '../strings/searchStrings';
import type { SearchFilters, ContentTypeFilter } from '../types/search';
import { TagFilterChips } from './TagFilterChips';
import styles from './SearchFilterBar.module.css';

const VALID_CONTENT_TYPES = new Set<ContentTypeFilter>(['all', 'hasOutput', 'hasAttachments', 'hasConnections', 'noOutput']);

interface SearchFilterBarProps {
    readonly filters: SearchFilters;
    readonly isOpen: boolean;
    readonly onSetFilter: (f: Partial<SearchFilters>) => void;
    readonly onClearFilters: () => void;
}

function parseDateInput(value: string): Date | null {
    if (!value) return null;
    const date = new Date(value);
    return isNaN(date.getTime()) ? null : date;
}

function formatDateForInput(date: Date | null | undefined): string {
    return date && !isNaN(date.getTime()) ? date.toISOString().slice(0, 10) : '';
}

function countActiveFilters(filters: SearchFilters): number {
    return [
        (filters.tags?.length ?? 0) > 0,
        filters.dateRange?.from != null || filters.dateRange?.to != null,
        filters.contentType != null && filters.contentType !== 'all',
    ].filter(Boolean).length;
}

export function SearchFilterBar({ filters, isOpen, onSetFilter, onClearFilters }: SearchFilterBarProps) {
    const nodes = useCanvasStore((s) => s.nodes);

    const availableTags = useMemo(() => {
        const tagSet = new Set<string>();
        for (const node of nodes) {
            // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- defense-in-depth
            for (const tag of node.data?.tags ?? []) tagSet.add(tag);
        }
        return [...tagSet].sort();
    }, [nodes]);

    const handleTagToggle = useCallback(
        (tag: string) => {
            const current = filters.tags ?? [];
            const next = current.includes(tag) ? current.filter((t) => t !== tag) : [...current, tag];
            onSetFilter({ tags: next });
        },
        [filters.tags, onSetFilter],
    );

    const handleContentType = useCallback(
        (e: React.ChangeEvent<HTMLSelectElement>) => {
            const value = e.target.value;
            if (VALID_CONTENT_TYPES.has(value as ContentTypeFilter)) {
                onSetFilter({ contentType: value as ContentTypeFilter });
            }
        },
        [onSetFilter],
    );

    const handleDateFrom = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            onSetFilter({ dateRange: { from: parseDateInput(e.target.value), to: filters.dateRange?.to ?? null } });
        },
        [filters.dateRange, onSetFilter],
    );

    const handleDateTo = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            onSetFilter({ dateRange: { from: filters.dateRange?.from ?? null, to: parseDateInput(e.target.value) } });
        },
        [filters.dateRange, onSetFilter],
    );

    const activeCount = countActiveFilters(filters);

    if (!isOpen) return null;

    return (
        <section className={styles.filterBar} aria-label="Search filters">
            <TagFilterChips
                availableTags={availableTags}
                selectedTags={filters.tags ?? []}
                onToggle={handleTagToggle}
            />

            <div className={styles.filterGroup}>
                <label className={styles.filterLabel}>{searchStrings.filterDateFrom}</label>
                <input type="date" className={styles.dateInput} onChange={handleDateFrom}
                    value={formatDateForInput(filters.dateRange?.from)} />
                <label className={styles.filterLabel}>{searchStrings.filterDateTo}</label>
                <input type="date" className={styles.dateInput} onChange={handleDateTo}
                    value={formatDateForInput(filters.dateRange?.to)} />
            </div>

            <div className={styles.filterGroup}>
                <label className={styles.filterLabel}>{searchStrings.filterContentType}</label>
                <select
                    aria-label={searchStrings.filterContentType}
                    className={styles.contentTypeSelect}
                    value={filters.contentType ?? 'all'}
                    onChange={handleContentType}
                >
                    <option value="all">{searchStrings.contentTypeAll}</option>
                    <option value="hasOutput">{searchStrings.contentTypeHasOutput}</option>
                    <option value="hasAttachments">{searchStrings.contentTypeHasAttachments}</option>
                    <option value="hasConnections">{searchStrings.contentTypeHasConnections}</option>
                    <option value="noOutput">{searchStrings.contentTypeNoOutput}</option>
                </select>
            </div>

            {activeCount > 0 && (
                <button className={styles.clearBtn} onClick={onClearFilters} type="button">
                    {searchStrings.filterClear} ({activeCount} {searchStrings.activeFilters})
                </button>
            )}
        </section>
    );
}
