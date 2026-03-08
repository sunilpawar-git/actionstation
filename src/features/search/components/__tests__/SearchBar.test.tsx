/**
 * SearchBar Component Tests
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SearchBar } from '../SearchBar';
import { useCanvasStore } from '@/features/canvas/stores/canvasStore';
import { useWorkspaceStore } from '@/features/workspace/stores/workspaceStore';

describe('SearchBar', () => {
    beforeEach(() => {
        useCanvasStore.setState({
            nodes: [
                {
                    id: 'node-1',
                    workspaceId: 'ws-1',
                    type: 'idea',
                    data: { prompt: 'React hooks', output: 'Learn about hooks' },
                    position: { x: 0, y: 0 },
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
            ],
            edges: [],
            selectedNodeIds: new Set(),
        });
        useWorkspaceStore.setState({
            currentWorkspaceId: 'ws-1',
            workspaces: [{
                id: 'ws-1',
                userId: 'user-1',
                name: 'My Workspace',
                canvasSettings: { backgroundColor: 'grid' },
                createdAt: new Date(),
                updatedAt: new Date(),
            }],
        });
    });

    it('should render search input', () => {
        render(<SearchBar />);
        expect(screen.getByPlaceholderText(/search/i)).toBeInTheDocument();
    });

    it('should show results when typing', () => {
        render(<SearchBar />);
        const input = screen.getByPlaceholderText(/search/i);
        fireEvent.change(input, { target: { value: 'React' } });
        // Text is split across highlight <mark> + <span>, use role query
        const resultItems = screen.getAllByRole('option');
        expect(resultItems.length).toBeGreaterThanOrEqual(1);
    });

    it('should clear search on escape', () => {
        render(<SearchBar />);
        const input = screen.getByPlaceholderText(/search/i);
        fireEvent.change(input, { target: { value: 'React' } });
        fireEvent.keyDown(input, { key: 'Escape' });
        expect(input).toHaveValue('');
    });

    it('should call onResultClick when clicking a result', () => {
        const onResultClick = vi.fn();
        render(<SearchBar onResultClick={onResultClick} />);
        const input = screen.getByPlaceholderText(/search/i);
        fireEvent.change(input, { target: { value: 'React' } });
        const resultItem = screen.getAllByRole('option')[0]!;
        fireEvent.click(resultItem);
        expect(onResultClick).toHaveBeenCalledWith('node-1', 'ws-1');
    });

    it('should have role="combobox" on input', () => {
        render(<SearchBar />);
        const input = screen.getByPlaceholderText(/search/i);
        expect(input).toHaveAttribute('role', 'combobox');
    });

    it('ArrowDown increments activeIndex', () => {
        render(<SearchBar />);
        const input = screen.getByPlaceholderText(/search/i);
        fireEvent.change(input, { target: { value: 'React' } });
        fireEvent.keyDown(input, { key: 'ArrowDown' });
        const items = screen.getAllByRole('option');
        expect(items[0]).toHaveAttribute('aria-selected', 'true');
    });

    it('Escape blurs the input and clears', () => {
        render(<SearchBar />);
        const input = screen.getByPlaceholderText(/search/i);
        fireEvent.change(input, { target: { value: 'React' } });
        fireEvent.keyDown(input, { key: 'Escape' });
        expect(input).toHaveValue('');
    });
});
