/**
 * Pure utility functions for SearchFilterBar.
 * Extracted to keep SearchFilterBar.tsx under 100-line limit.
 */
import type { SearchFilters } from '../types/search';

export function parseDateInput(value: string): Date | null {
    if (!value) return null;
    const date = new Date(value);
    return isNaN(date.getTime()) ? null : date;
}

export function formatDateForInput(date: Date | null | undefined): string {
    return date && !isNaN(date.getTime()) ? date.toISOString().slice(0, 10) : '';
}

export function countActiveFilters(filters: SearchFilters): number {
    return [
        (filters.tags?.length ?? 0) > 0,
        filters.dateRange?.from != null || filters.dateRange?.to != null,
        filters.contentType != null && filters.contentType !== 'all',
    ].filter(Boolean).length;
}
