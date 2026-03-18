/**
 * DeletableEdge Component Tests — Connector style inline-style validation.
 *
 * After Phase 5 refactor, connector styles are applied as inline SVG styles
 * via CONNECTOR_STYLE_DEFS (single source of truth), not CSS class names.
 * Tests assert on computed style properties rather than class presence.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { ReactFlowProvider, Position } from '@xyflow/react';
import { DeletableEdge } from '../DeletableEdge';
import { useSettingsStore } from '@/shared/stores/settingsStore';
import { createMockSettingsState } from '@/shared/__tests__/helpers/mockSettingsState';
import type { ConnectorStyle } from '@/shared/stores/settingsStore';

// Mock the settings store with getState() support
vi.mock('@/shared/stores/settingsStore', () => {
    const selectorFn = vi.fn();
    Object.assign(selectorFn, { getState: () => createMockSettingsState({}) });
    return { useSettingsStore: selectorFn };
});

// Mock the canvas store
vi.mock('../../stores/canvasStore', () => ({
    useCanvasStore: vi.fn(),
}));

// Provide minimal required props for EdgeProps
const mockEdgeProps = {
    id: 'test-edge-1',
    source: 'test-source',
    target: 'test-target',
    sourceX: 0,
    sourceY: 0,
    targetX: 100,
    targetY: 100,
    sourcePosition: Position.Bottom,
    targetPosition: Position.Top,
    style: { stroke: 'red' }, // Custom inline style — must always win over connector base stroke
};

describe('DeletableEdge ConnectorStyles', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    const setupWithStyle = (connectorStyle: ConnectorStyle) => {
        vi.mocked(useSettingsStore).mockImplementation((selector) => {
            const state = createMockSettingsState({ connectorStyle });
            return typeof selector === 'function' ? selector(state) : state;
        });

        // SVG wrapper is needed because React Flow BaseEdge renders an SVG path
        render(
            <ReactFlowProvider>
                <svg>
                    <DeletableEdge {...mockEdgeProps} />
                </svg>
            </ReactFlowProvider>
        );
    };

    it('user stroke override wins for regular style', () => {
        setupWithStyle('regular');
        const path = document.querySelector('.react-flow__edge-path');
        expect(path).toBeInTheDocument();
        // User style.stroke overrides the connector base stroke
        expect(path).toHaveStyle({ stroke: 'red' });
        expect(path).toHaveStyle({ strokeWidth: 2 });
    });

    it('applies faint solid line for light style', () => {
        setupWithStyle('light');
        const path = document.querySelector('.react-flow__edge-path');
        expect(path).toBeInTheDocument();
        expect(path).toHaveStyle({ strokeWidth: 1 });
        expect(path).toHaveStyle({ strokeOpacity: 0.5 });
    });

    it('applies thick line for bold style', () => {
        setupWithStyle('bold');
        const path = document.querySelector('.react-flow__edge-path');
        expect(path).toBeInTheDocument();
        expect(path).toHaveStyle({ strokeWidth: 4 });
    });

    it('applies dash pattern for dashed style', () => {
        setupWithStyle('dashed');
        const path = document.querySelector('.react-flow__edge-path');
        expect(path).toBeInTheDocument();
        expect(path).toHaveStyle({ strokeDasharray: '6 6' });
    });

    it('applies dot pattern for dotted style', () => {
        setupWithStyle('dotted');
        const path = document.querySelector('.react-flow__edge-path');
        expect(path).toBeInTheDocument();
        expect(path).toHaveStyle({ strokeDasharray: '2 6' });
    });

    it('applies near-invisible line for ghost style', () => {
        setupWithStyle('ghost');
        const path = document.querySelector('.react-flow__edge-path');
        expect(path).toBeInTheDocument();
        expect(path).toHaveStyle({ strokeWidth: 0.75 });
        expect(path).toHaveStyle({ strokeOpacity: 0.22 });
    });
});
