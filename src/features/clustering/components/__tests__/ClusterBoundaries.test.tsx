import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ClusterBoundaries } from '../ClusterBoundaries';
import type { ClusterGroup } from '../../types/cluster';
import type { CanvasNode } from '@/features/canvas/types/node';

vi.mock('@xyflow/react', () => ({
    useStore: (selector: (s: Record<string, unknown>) => unknown) =>
        selector({ transform: [100, 50, 0.8] }),
}));

function makeNode(id: string, x: number, y: number, w = 200, h = 100): CanvasNode {
    return {
        id,
        workspaceId: 'w1',
        type: 'idea',
        data: { heading: id },
        position: { x, y },
        width: w,
        height: h,
        createdAt: new Date(),
        updatedAt: new Date(),
    } as CanvasNode;
}

const NODES: CanvasNode[] = [
    makeNode('n1', 0, 0),
    makeNode('n2', 300, 0),
    makeNode('n3', 0, 200),
];

const CLUSTER: ClusterGroup = {
    id: 'c1',
    nodeIds: ['n1', 'n2'],
    label: 'Test Cluster',
    colorIndex: 2,
};

describe('ClusterBoundaries', () => {
    it('renders boundary at correct position with node dimensions', () => {
        render(<ClusterBoundaries clusters={[CLUSTER]} nodes={NODES} />);
        const boundary = screen.getByRole('group');
        expect(boundary).toBeInTheDocument();
        expect(boundary.style.left).toBe('-40px');
        expect(boundary.style.top).toBe('-40px');
        expect(boundary.style.width).toBe('580px');
        expect(boundary.style.height).toBe('180px');
    });

    it('displays label text matching cluster.label', () => {
        render(<ClusterBoundaries clusters={[CLUSTER]} nodes={NODES} />);
        expect(screen.getByText('Test Cluster')).toBeInTheDocument();
    });

    it('maps colorIndex to CSS variable', () => {
        render(<ClusterBoundaries clusters={[CLUSTER]} nodes={NODES} />);
        const boundary = screen.getByRole('group');
        expect(boundary.style.getPropertyValue('--cluster-hue')).toBe('var(--cluster-color-3)');
    });

    it('layer element has correct CSS class applied', () => {
        const { container } = render(<ClusterBoundaries clusters={[CLUSTER]} nodes={NODES} />);
        const layer = container.firstChild as HTMLElement;
        expect(layer).toBeInTheDocument();
        expect(layer.className).toContain('layer');
    });

    it('sets aria-label for accessibility', () => {
        render(<ClusterBoundaries clusters={[CLUSTER]} nodes={NODES} />);
        expect(screen.getByLabelText('Test Cluster')).toBeInTheDocument();
    });

    it('returns null when clusterGroups is empty', () => {
        const { container } = render(<ClusterBoundaries clusters={[]} nodes={NODES} />);
        expect(container.firstChild).toBeNull();
    });

    it('filters out clusters whose nodes are all deleted', () => {
        const orphanCluster: ClusterGroup = {
            id: 'orphan', nodeIds: ['deleted1', 'deleted2'], label: 'Gone', colorIndex: 0,
        };
        const { container } = render(<ClusterBoundaries clusters={[orphanCluster]} nodes={NODES} />);
        expect(container.firstChild).toBeNull();
    });

    it('applies viewport transform to layer', () => {
        const { container } = render(<ClusterBoundaries clusters={[CLUSTER]} nodes={NODES} />);
        const layer = container.firstChild as HTMLElement;
        expect(layer.style.transform).toBe('translate(100px, 50px) scale(0.8)');
    });

    it('applies preview variant CSS class', () => {
        render(<ClusterBoundaries clusters={[CLUSTER]} nodes={NODES} variant="preview" />);
        const boundary = screen.getByRole('group');
        expect(boundary.className).toContain('preview');
    });

    it('applies committed variant without preview class', () => {
        render(<ClusterBoundaries clusters={[CLUSTER]} nodes={NODES} variant="committed" />);
        const boundary = screen.getByRole('group');
        expect(boundary.className).not.toContain('preview');
    });
});
