/**
 * KBSearchBar — Search input + type filter pills + tag filter for KB panel
 * Connects to store for search query, type filter, and tag filter state
 */
import React, { useCallback } from 'react';
import clsx from 'clsx';
import { useKnowledgeBankStore, extractAllTags } from '../stores/knowledgeBankStore';
import type { KBTypeFilter } from '../types/knowledgeBank';
import { strings } from '@/shared/localization/strings';
import {
    KB_SEARCH_BAR,
    KB_SEARCH_BAR_STYLE,
    KB_SEARCH_INPUT,
    KB_SEARCH_INPUT_STYLE,
    KB_TYPE_FILTERS,
    KB_TYPE_FILTERS_STYLE,
    KB_FILTER_PILL,
    KB_FILTER_PILL_STYLE,
    KB_FILTER_PILL_ACTIVE_STYLE,
    KB_TAG_FILTERS,
    KB_TAG_FILTERS_STYLE,
    KB_TAG_PILL,
    KB_TAG_PILL_STYLE,
    KB_TAG_PILL_ACTIVE_STYLE,
} from './kbSearchBarStyles';

const TYPE_FILTERS: Array<{ value: KBTypeFilter; label: string }> = [
    { value: 'all', label: strings.knowledgeBank.search.filterAll },
    { value: 'text', label: strings.knowledgeBank.search.filterText },
    { value: 'image', label: strings.knowledgeBank.search.filterImage },
    { value: 'document', label: strings.knowledgeBank.search.filterDocument },
];

export const KBSearchBar = React.memo(function KBSearchBar() {
    const searchQuery = useKnowledgeBankStore((s) => s.searchQuery);
    const typeFilter = useKnowledgeBankStore((s) => s.typeFilter);
    const selectedTag = useKnowledgeBankStore((s) => s.selectedTag);
    const entries = useKnowledgeBankStore((s) => s.entries);

    const allTags = React.useMemo(() => extractAllTags(entries), [entries]);

    const handleSearchChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            useKnowledgeBankStore.getState().setSearchQuery(e.target.value);
        },
        []
    );

    const handleTagClick = useCallback(
        (tag: string) => {
            const store = useKnowledgeBankStore.getState();
            store.setSelectedTag(store.selectedTag === tag ? null : tag);
        },
        []
    );

    return (
        <div className={clsx(KB_SEARCH_BAR)} style={KB_SEARCH_BAR_STYLE}>
            <input
                type="text"
                className={clsx(KB_SEARCH_INPUT)}
                style={KB_SEARCH_INPUT_STYLE}
                placeholder={strings.knowledgeBank.search.placeholder}
                value={searchQuery}
                onChange={handleSearchChange}
                aria-label={strings.knowledgeBank.search.placeholder}
            />
            <div className={clsx(KB_TYPE_FILTERS)} style={KB_TYPE_FILTERS_STYLE}>
                {TYPE_FILTERS.map((f) => (
                    <button
                        key={f.value}
                        className={clsx(KB_FILTER_PILL)}
                        style={typeFilter === f.value ? KB_FILTER_PILL_ACTIVE_STYLE : KB_FILTER_PILL_STYLE}
                        onClick={() => useKnowledgeBankStore.getState().setTypeFilter(f.value)}
                    >
                        {f.label}
                    </button>
                ))}
            </div>
            {allTags.length > 0 && (
                <TagFilterRow
                    tags={allTags}
                    selectedTag={selectedTag}
                    onTagClick={handleTagClick}
                />
            )}
        </div>
    );
});

/** Sub-component: tag filter pill row */
const TagFilterRow = React.memo(function TagFilterRow({
    tags, selectedTag, onTagClick,
}: { tags: string[]; selectedTag: string | null; onTagClick: (tag: string) => void }) {
    return (
        <div className={clsx(KB_TAG_FILTERS)} style={KB_TAG_FILTERS_STYLE}>
            {tags.map((tag) => (
                <button
                    key={tag}
                    className={clsx(KB_TAG_PILL)}
                    style={selectedTag === tag ? KB_TAG_PILL_ACTIVE_STYLE : KB_TAG_PILL_STYLE}
                    onClick={() => onTagClick(tag)}
                >
                    {tag}
                </button>
            ))}
        </div>
    );
});
