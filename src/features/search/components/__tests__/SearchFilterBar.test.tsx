/**
 * SearchFilterBar — Unit Tests
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SearchFilterBar } from '../SearchFilterBar';
import { useCanvasStore } from '@/features/canvas/stores/canvasStore';

describe('SearchFilterBar', () => {
    beforeEach(() => {
        useCanvasStore.setState({
            nodes: [
                {
                    id: 'n1', workspaceId: 'ws-1', type: 'idea',
                    data: { heading: 'Test', tags: ['react', 'hooks'] },
                    position: { x: 0, y: 0 }, createdAt: new Date(), updatedAt: new Date(),
                },
            ],
            edges: [],
            selectedNodeIds: new Set(),
        });
    });

    it('renders when isOpen=true; hidden when false', () => {
        const { rerender } = render(
            <SearchFilterBar filters={{}} isOpen={true} onSetFilter={() => {}} onClearFilters={() => {}} />,
        );
        expect(screen.getByLabelText('Search filters')).toBeInTheDocument();

        rerender(
            <SearchFilterBar filters={{}} isOpen={false} onSetFilter={() => {}} onClearFilters={() => {}} />,
        );
        expect(screen.queryByLabelText('Search filters')).not.toBeInTheDocument();
    });

    it('content type dropdown dispatches SET_FILTER + contentType', () => {
        const onSetFilter = vi.fn();
        render(
            <SearchFilterBar filters={{}} isOpen={true} onSetFilter={onSetFilter} onClearFilters={() => {}} />,
        );
        const select = screen.getByLabelText('Content type');
        fireEvent.change(select, { target: { value: 'hasOutput' } });
        expect(onSetFilter).toHaveBeenCalledWith({ contentType: 'hasOutput' });
    });

    it('clear all button dispatches CLEAR_FILTERS', () => {
        const onClear = vi.fn();
        render(
            <SearchFilterBar
                filters={{ tags: ['react'], contentType: 'hasOutput' }}
                isOpen={true}
                onSetFilter={() => {}}
                onClearFilters={onClear}
            />,
        );
        const clearBtn = screen.getByText(/Clear all filters/);
        fireEvent.click(clearBtn);
        expect(onClear).toHaveBeenCalled();
    });

    it('delegates tag rendering to TagFilterChips', () => {
        render(
            <SearchFilterBar filters={{}} isOpen={true} onSetFilter={() => {}} onClearFilters={() => {}} />,
        );
        // Tags from node data should appear as chips
        expect(screen.getByText('hooks')).toBeInTheDocument();
        expect(screen.getByText('react')).toBeInTheDocument();
    });
});
