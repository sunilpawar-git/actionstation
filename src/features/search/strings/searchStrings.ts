/**
 * Search Strings — All user-facing text for the search feature.
 * Imported by strings.ts (feature-first pattern). Zero hardcoded text in components.
 */
export const searchStrings = {
    placeholder: 'Search notes...',
    noResults: 'No results found',
    resultsCount: 'results',
    prompt: 'Prompt',
    heading: 'Heading',
    output: 'Output',
    tag: 'Tag',
    // Filter bar
    filterToggle: 'Toggle filters',
    filterClear: 'Clear all filters',
    filterTags: 'Tags',
    filterDateRange: 'Date range',
    filterDateFrom: 'From',
    filterDateTo: 'To',
    filterContentType: 'Content type',
    contentTypeAll: 'All',
    contentTypeHasOutput: 'Has AI output',
    contentTypeHasAttachments: 'Has attachments',
    contentTypeHasConnections: 'Has connections',
    contentTypeNoOutput: 'Empty nodes',
    activeFilters: 'active filters',
    findSimilar: 'Find similar',
    similarResults: 'Similar nodes',
    noSimilarResults: 'No similar nodes found',
    keyboardHint: '↑↓ navigate · ↵ select · Esc close',
} as const;
