/**
 * Search Integration Tests
 * TDD: Tests for complete search flow including node selection
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Layout } from '@/app/components/Layout';
import { useCanvasStore } from '@/features/canvas/stores/canvasStore';
import { useWorkspaceStore } from '@/features/workspace/stores/workspaceStore';

// Mock usePanToNode to avoid ReactFlow dependency in Layout tests
vi.mock('@/features/canvas/hooks/usePanToNode', () => ({
    usePanToNode: () => ({
        panToPosition: vi.fn(),
    }),
}));

describe('Search Integration', () => {
    beforeEach(() => {
        useCanvasStore.setState({
            nodes: [
                {
                    id: 'node-1',
                    workspaceId: 'ws-1',
                    type: 'idea',
                    data: { heading: 'React hooks', prompt: 'React hooks', output: 'Learn about hooks' },
                    position: { x: 0, y: 0 },
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
                {
                    id: 'node-2',
                    workspaceId: 'ws-1',
                    type: 'idea',
                    data: { heading: 'TypeScript basics', prompt: 'TypeScript basics', output: 'TypeScript adds types' },
                    position: { x: 100, y: 0 },
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
                updatedAt: new Date()
            }],
        });
    });

    it('should select node when clicking search result', () => {
        render(
            <Layout onSettingsClick={() => { }}>
                <div>Canvas Content</div>
            </Layout>
        );

        const input = screen.getByPlaceholderText(/search/i);
        fireEvent.change(input, { target: { value: 'React' } });

        // Results rendered as role="option" items with highlighted text
        const resultItems = screen.getAllByRole('option');
        expect(resultItems.length).toBeGreaterThanOrEqual(1);

        // Click the first result
        fireEvent.click(resultItems[0]!);

        // Verify node was selected
        const selectedNodes = useCanvasStore.getState().selectedNodeIds;
        expect(selectedNodes.has('node-1')).toBe(true);
    });

    it('should clear previous selection when clicking search result', () => {
        // Pre-select a node
        useCanvasStore.getState().selectNode('node-2');

        render(
            <Layout onSettingsClick={() => { }}>
                <div>Canvas Content</div>
            </Layout>
        );

        const input = screen.getByPlaceholderText(/search/i);
        fireEvent.change(input, { target: { value: 'React' } });

        const resultItems = screen.getAllByRole('option');
        fireEvent.click(resultItems[0]!);

        // Verify only the clicked node is selected
        const selectedNodes = useCanvasStore.getState().selectedNodeIds;
        expect(selectedNodes.has('node-1')).toBe(true);
        expect(selectedNodes.has('node-2')).toBe(false);
    });

    it('should not select node from different workspace', () => {
        useWorkspaceStore.setState({
            currentWorkspaceId: 'ws-2',
            workspaces: [
                {
                    id: 'ws-1',
                    userId: 'user-1',
                    name: 'Workspace 1',
                    canvasSettings: { backgroundColor: 'grid' },
                    createdAt: new Date(),
                    updatedAt: new Date()
                },
                {
                    id: 'ws-2',
                    userId: 'user-1',
                    name: 'Workspace 2',
                    canvasSettings: { backgroundColor: 'grid' },
                    createdAt: new Date(),
                    updatedAt: new Date()
                },
            ],
        });

        render(
            <Layout onSettingsClick={() => { }}>
                <div>Canvas Content</div>
            </Layout>
        );

        const input = screen.getByPlaceholderText(/search/i);
        fireEvent.change(input, { target: { value: 'React' } });

        const resultItems = screen.getAllByRole('option');
        fireEvent.click(resultItems[0]!);

        // Node should not be selected because it's in a different workspace
        const selectedNodes = useCanvasStore.getState().selectedNodeIds;
        expect(selectedNodes.has('node-1')).toBe(false);
    });
});
