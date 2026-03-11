/**
 * AIMemorySection Tests — AI Memory settings subsection
 * Tests pool count display, clear button, and workspace pool state
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AIMemorySection } from '../AIMemorySection';
import { useCanvasStore } from '@/features/canvas/stores/canvasStore';
import { useWorkspaceStore } from '@/features/workspace/stores/workspaceStore';
import { strings } from '@/shared/localization/strings';
import type { CanvasNode } from '@/features/canvas/types/node';

vi.mock('@/shared/stores/toastStore', () => ({
    toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

function makeNode(id: string, inPool = false): CanvasNode {
    return {
        id, workspaceId: 'ws-1', type: 'idea',
        data: { heading: `Node ${id}`, includeInAIPool: inPool },
        position: { x: 0, y: 0 },
        createdAt: new Date(), updatedAt: new Date(),
    };
}

describe('AIMemorySection', () => {
    beforeEach(() => {
        useCanvasStore.setState({ nodes: [], edges: [], selectedNodeIds: new Set(), poolCount: 0, pinnedCount: 0 });
        useWorkspaceStore.setState({ workspaces: [], currentWorkspaceId: null });
    });

    it('renders the section title', () => {
        render(<AIMemorySection />);
        expect(screen.getByText(strings.nodePool.settingsTitle)).toBeInTheDocument();
    });

    it('renders the description', () => {
        render(<AIMemorySection />);
        expect(screen.getByText(strings.nodePool.settingsDescription)).toBeInTheDocument();
    });

    it('shows 0 nodes when none are pooled', () => {
        useCanvasStore.setState({ nodes: [makeNode('n1'), makeNode('n2')] });
        render(<AIMemorySection />);
        expect(screen.getByText(strings.nodePool.pooledNodeCount(0))).toBeInTheDocument();
    });

    it('shows correct count of individually pooled nodes', () => {
        useCanvasStore.setState({
            nodes: [makeNode('n1', true), makeNode('n2', false), makeNode('n3', true)],
            poolCount: 2,
        });
        render(<AIMemorySection />);
        expect(screen.getByText(strings.nodePool.pooledNodeCount(2))).toBeInTheDocument();
    });

    it('shows all nodes count when workspace pool is on', () => {
        useCanvasStore.setState({
            nodes: [makeNode('n1'), makeNode('n2'), makeNode('n3')],
        });
        useWorkspaceStore.setState({
            workspaces: [{
                id: 'ws-1', userId: 'u1', name: 'Test',
                canvasSettings: { backgroundColor: 'grid' },
                createdAt: new Date(), updatedAt: new Date(),
                includeAllNodesInPool: true,
            }],
            currentWorkspaceId: 'ws-1',
        });
        render(<AIMemorySection />);
        expect(screen.getByText(strings.nodePool.pooledNodeCount(3))).toBeInTheDocument();
    });

    it('shows clear button when nodes are individually pooled', () => {
        useCanvasStore.setState({ nodes: [makeNode('n1', true)], poolCount: 1 });
        render(<AIMemorySection />);
        expect(screen.getByText(strings.nodePool.clearAll)).toBeInTheDocument();
    });

    it('hides clear button when no nodes are pooled', () => {
        useCanvasStore.setState({ nodes: [makeNode('n1')] });
        render(<AIMemorySection />);
        expect(screen.queryByText(strings.nodePool.clearAll)).not.toBeInTheDocument();
    });

    it('hides clear button when workspace pool is on', () => {
        useCanvasStore.setState({ nodes: [makeNode('n1', true)], poolCount: 1 });
        useWorkspaceStore.setState({
            workspaces: [{
                id: 'ws-1', userId: 'u1', name: 'Test',
                canvasSettings: { backgroundColor: 'grid' },
                createdAt: new Date(), updatedAt: new Date(),
                includeAllNodesInPool: true,
            }],
            currentWorkspaceId: 'ws-1',
        });
        render(<AIMemorySection />);
        expect(screen.queryByText(strings.nodePool.clearAll)).not.toBeInTheDocument();
    });

    it('clears all pooled nodes when clear button is clicked', () => {
        useCanvasStore.setState({
            nodes: [makeNode('n1', true), makeNode('n2', true)],
            poolCount: 2,
        });
        render(<AIMemorySection />);
        fireEvent.click(screen.getByText(strings.nodePool.clearAll));

        const state = useCanvasStore.getState();
        expect(state.nodes.every((n) => !n.data.includeInAIPool)).toBe(true);
    });
});
