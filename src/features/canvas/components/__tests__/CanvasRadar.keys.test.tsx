import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CanvasRadar } from '../CanvasRadar';
import { useCanvasStore } from '../../stores/canvasStore';
import { ReactFlowProvider } from '@xyflow/react';
import { makeNode } from './helpers/radarFixtures';

vi.mock('@xyflow/react', async (importOriginal) => {
    const original = await importOriginal<typeof import('@xyflow/react')>();
    return {
        ...original,
        useReactFlow: () => ({
            fitView: vi.fn(),
            zoomIn: vi.fn(),
            zoomOut: vi.fn(),
        }),
    };
});

describe('CanvasRadar keys', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        useCanvasStore.setState({ nodes: [] });
    });

    const renderRadar = () =>
        render(<ReactFlowProvider><CanvasRadar /></ReactFlowProvider>);

    it('renders one circle per node with distinct coordinates', () => {
        useCanvasStore.setState({
            nodes: [
                makeNode('n1', 0, 0),
                makeNode('n2', 200, 100),
                makeNode('n3', 400, 300),
            ],
        });
        renderRadar();
        const svg = screen.getByTestId('canvas-radar').querySelector('svg');
        const circles = svg?.querySelectorAll('circle') ?? [];

        expect(circles.length).toBe(3);

        const coordinates = new Set<string>();
        circles.forEach((circle) => {
            const cx = circle.getAttribute('cx');
            const cy = circle.getAttribute('cy');
            coordinates.add(`${cx}-${cy}`);
        });

        expect(coordinates.size).toBe(circles.length);
    });

    it('renders both circles when two nodes share the same position', () => {
        useCanvasStore.setState({
            nodes: [
                makeNode('n1', 100, 100),
                makeNode('n2', 100, 100),
            ],
        });
        renderRadar();
        const svg = screen.getByTestId('canvas-radar').querySelector('svg');
        const circles = svg?.querySelectorAll('circle') ?? [];

        expect(circles.length).toBe(2);
    });
});
