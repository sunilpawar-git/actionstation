/**
 * Advanced Search — Structural & Security Tests (Phase 8F)
 * Validates architecture constraints, security invariants, and accessibility.
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const SRC = path.resolve(__dirname, '../../..');
const SEARCH = path.resolve(SRC, 'features/search');

function readSearch(relativePath: string): string {
    return fs.readFileSync(path.resolve(SEARCH, relativePath), 'utf-8');
}

describe('Structural tests', () => {
    it('useSearch return type includes activeIndex, isFilterBarOpen, toggleFilterBar, setActiveIndex', () => {
        const src = readSearch('hooks/useSearch.ts');
        expect(src).toContain('activeIndex');
        expect(src).toContain('isFilterBarOpen');
        expect(src).toContain('toggleFilterBar');
        expect(src).toContain('setActiveIndex');
    });

    it('SearchResult includes highlightRanges field', () => {
        const src = readSearch('types/search.ts');
        expect(src).toContain('highlightRanges');
    });

    it('useSearch accepts SearchFilters (return type includes filters)', () => {
        const src = readSearch('hooks/useSearch.ts');
        expect(src).toContain('filters');
        expect(src).toContain('SearchFilters');
    });

    it('fuzzyMatch is a pure function (no imports of stores/hooks/React)', () => {
        const src = readSearch('services/fuzzyMatch.ts');
        expect(src).not.toMatch(/import.*from.*stores/);
        expect(src).not.toMatch(/import.*from.*hooks/);
        expect(src).not.toMatch(/import.*from.*react/i);
    });

    it('splitByRanges defensively sorts input ranges before processing', () => {
        const src = readSearch('services/fuzzyMatch.ts');
        expect(src).toContain('.sort(');
    });

    it('searchFilters is a pure function (no imports of stores/hooks/React)', () => {
        const src = readSearch('services/searchFilters.ts');
        expect(src).not.toMatch(/import.*from.*stores/);
        expect(src).not.toMatch(/import.*from.*hooks/);
        expect(src).not.toMatch(/import.*from.*react/i);
    });

    it('searchReducer is a pure function (no side effects)', () => {
        const src = readSearch('hooks/searchReducer.ts');
        expect(src).not.toMatch(/import.*from.*react/i);
        expect(src).not.toMatch(/import.*from.*stores/);
        expect(src).not.toMatch(/useEffect|useState|useCallback/);
    });

    it('searchReducer handles SET_ACTIVE_INDEX and TOGGLE_FILTER_BAR actions', () => {
        const src = readSearch('hooks/searchReducer.ts');
        expect(src).toContain('SET_ACTIVE_INDEX');
        expect(src).toContain('TOGGLE_FILTER_BAR');
    });

    it('findSimilar imports from tfidfScorer (reuse check — DRY)', () => {
        const src = readSearch('services/findSimilar.ts');
        expect(src).toContain('tfidfScorer');
    });

    it('findSimilar imports tokenizeRaw from relevanceScorer (SSOT tokenization)', () => {
        const src = readSearch('services/findSimilar.ts');
        expect(src).toContain('tokenizeRaw');
        expect(src).toContain('relevanceScorer');
    });

    it('findSimilar SIMILARITY_THRESHOLD >= 0.15', () => {
        const src = readSearch('services/findSimilar.ts');
        const match = /SIMILARITY_THRESHOLD\s*=\s*([\d.]+)/.exec(src);
        expect(match).not.toBeNull();
        expect(parseFloat(match![1]!)).toBeGreaterThanOrEqual(0.15);
    });
});

describe('Security tests', () => {
    it('no dangerouslySetInnerHTML in search components (XSS protection)', () => {
        const searchBarSrc = readSearch('components/SearchBar.tsx');
        const filterBarSrc = readSearch('components/SearchFilterBar.tsx');
        const tagChipsSrc = readSearch('components/TagFilterChips.tsx');
        expect(searchBarSrc).not.toContain('dangerouslySetInnerHTML');
        expect(filterBarSrc).not.toContain('dangerouslySetInnerHTML');
        expect(tagChipsSrc).not.toContain('dangerouslySetInnerHTML');
    });

    it('no `new RegExp(` with user input in search services (ReDoS protection)', () => {
        const fuzzyMatchSrc = readSearch('services/fuzzyMatch.ts');
        const filtersSrc = readSearch('services/searchFilters.ts');
        expect(fuzzyMatchSrc).not.toContain('new RegExp');
        expect(filtersSrc).not.toContain('new RegExp');
    });

    it('query length capped in searchReducer (SET_QUERY)', () => {
        const src = readSearch('hooks/searchReducer.ts');
        expect(src).toContain('.slice(0, 200)');
    });
});

describe('Accessibility tests', () => {
    it('SearchBar has role="combobox" attribute (WCAG 2.1 AA)', () => {
        const src = readSearch('components/SearchBar.tsx');
        expect(src).toContain('role="combobox"');
    });

    it('TagFilterChips has role="checkbox" attribute', () => {
        const src = readSearch('components/TagFilterChips.tsx');
        expect(src).toContain('role="checkbox"');
    });

    it('SearchBar has aria-expanded and aria-haspopup="listbox"', () => {
        const src = readSearch('components/SearchBar.tsx');
        expect(src).toContain('aria-expanded');
        expect(src).toContain('aria-haspopup="listbox"');
    });

    it('SearchFilterBar.module.css uses only CSS variables (no hex colors)', () => {
        const css = readSearch('components/SearchFilterBar.module.css');
        // Should not contain hex color patterns like #fff, #000, #abc123
        expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    });

    it('no hardcoded strings in search components', () => {
        const searchBarSrc = readSearch('components/SearchBar.tsx');
        const filterBarSrc = readSearch('components/SearchFilterBar.tsx');
        // Should not have raw English strings for user-facing text
        // (placeholder, labels, etc.) — all from searchStrings
        expect(searchBarSrc).toContain('searchStrings');
        expect(filterBarSrc).toContain('searchStrings');
    });
});
