import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ClusterOverlay } from '../ClusterOverlay';
import { useCanvasStore } from '@/features/canvas/stores/canvasStore';
import { useClusterPreviewStore } from '../../stores/clusterPreviewStore';
import type { CanvasNode } from '@/features/canvas/types/node';

vi.mock('@xyflow/react', () => ({
    useStore: (selector: (s: Record<string, unknown>) => unknown) =>
        selector({ transform: [0, 0, 1] }),
}));

function makeNode(id: string, x: number, y: number): CanvasNode {
    return {
        id, workspaceId: 'w1', type: 'idea',
        data: { heading: id }, position: { x, y },
        width: 200, height: 100,
        createdAt: new Date(), updatedAt: new Date(),
    } as CanvasNode;
}

const NODES = [makeNode('n1', 0, 0), makeNode('n2', 300, 0)];

beforeEach(() => {
    useCanvasStore.getState().clearClusterGroups();
    useCanvasStore.getState().setNodes(NODES);
    useClusterPreviewStore.getState().reset();
});

describe('ClusterOverlay', () => {
    it('renders committed cluster boundaries', () => {
        useCanvasStore.getState().setClusterGroups([
            { id: 'c1', nodeIds: ['n1', 'n2'], label: 'Committed', colorIndex: 0 },
        ]);
        render(<ClusterOverlay />);
        expect(screen.getByText('Committed')).toBeInTheDocument();
    });

    it('renders preview boundaries when preview groups exist', () => {
        useClusterPreviewStore.getState().setPreview([
            { id: 'p1', nodeIds: ['n1', 'n2'], label: 'Preview Theme', colorIndex: 1 },
        ]);
        render(<ClusterOverlay />);
        expect(screen.getByText('Preview Theme')).toBeInTheDocument();
    });

    it('renders preview bar during computing phase', () => {
        useClusterPreviewStore.getState().setPhase('computing');
        render(<ClusterOverlay />);
        expect(screen.getByText('Analyzing themes...')).toBeInTheDocument();
    });

    it('renders nothing when no clusters and idle phase', () => {
        const { container } = render(<ClusterOverlay />);
        const children = Array.from(container.childNodes).filter(
            (node) => node.nodeType === Node.ELEMENT_NODE,
        );
        expect(children).toHaveLength(0);
    });
});
