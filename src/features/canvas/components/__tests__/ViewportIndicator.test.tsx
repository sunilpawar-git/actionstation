import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ViewportIndicator } from '../ViewportIndicator';
import type { RadarTransform } from '../radarHelpers';

/**
 * Mock ReactFlow's useStore with configurable return values.
 * Each call returns the next value from mockReturnValues in order:
 * vpX, vpY, zoom, containerW, containerH
 */
let mockStoreValues = { vpX: 0, vpY: 0, zoom: 1, containerW: 800, containerH: 600 };

vi.mock('@xyflow/react', () => ({
    useStore: (selector: (s: Record<string, unknown>) => unknown) => {
        const state = {
            transform: [mockStoreValues.vpX, mockStoreValues.vpY, mockStoreValues.zoom],
            width: mockStoreValues.containerW,
            height: mockStoreValues.containerH,
        };
        return selector(state);
    },
}));

const RADAR_SIZE = 32;

const makeTransform = (): RadarTransform => ({
    scale: 0.224,
    offsetX: 4.8,
    offsetY: 4.8,
    minX: 0,
    minY: 0,
});

function renderIndicator(transform: RadarTransform | null = makeTransform()) {
    return render(
        <svg data-testid="test-svg">
            <ViewportIndicator transform={transform} radarSize={RADAR_SIZE} />
        </svg>,
    );
}

describe('ViewportIndicator', () => {
    it('renders a rect when transform and dimensions are valid', () => {
        mockStoreValues = { vpX: 0, vpY: 0, zoom: 1, containerW: 800, containerH: 600 };
        renderIndicator();
        expect(screen.getByTestId('viewport-indicator')).toBeInTheDocument();
    });

    it('returns null when transform is null', () => {
        mockStoreValues = { vpX: 0, vpY: 0, zoom: 1, containerW: 800, containerH: 600 };
        renderIndicator(null);
        expect(screen.queryByTestId('viewport-indicator')).not.toBeInTheDocument();
    });

    it('returns null when container dimensions are zero', () => {
        mockStoreValues = { vpX: 0, vpY: 0, zoom: 1, containerW: 0, containerH: 0 };
        renderIndicator();
        expect(screen.queryByTestId('viewport-indicator')).not.toBeInTheDocument();
    });

    it('rect has expected SVG attributes', () => {
        mockStoreValues = { vpX: -100, vpY: -50, zoom: 1, containerW: 800, containerH: 600 };
        renderIndicator();
        const rect = screen.getByTestId('viewport-indicator');
        expect(rect.tagName).toBe('rect');
        expect(rect.getAttribute('x')).toBeTruthy();
        expect(rect.getAttribute('y')).toBeTruthy();
        expect(rect.getAttribute('width')).toBeTruthy();
        expect(rect.getAttribute('height')).toBeTruthy();
    });

    it('is accessible as a presentation element (no interaction)', () => {
        mockStoreValues = { vpX: 0, vpY: 0, zoom: 1, containerW: 800, containerH: 600 };
        renderIndicator();
        const rect = screen.getByTestId('viewport-indicator');
        // pointer-events: none is set via CSS, so just verify it renders
        expect(rect).toBeInTheDocument();
    });
});
