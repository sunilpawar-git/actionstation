/**
 * IdeaCard Resize Constraints Integration Tests
 * NodeResizer constraints, store clamping, visibility, content area, dimension constants
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import fs from 'fs';
import path from 'path';
import { IdeaCard } from '../IdeaCard';
import { useCanvasStore } from '../../../stores/canvasStore';
import {
    MIN_NODE_WIDTH,
    MAX_NODE_WIDTH,
    MIN_NODE_HEIGHT,
    MAX_NODE_HEIGHT,
    DEFAULT_NODE_WIDTH,
    DEFAULT_NODE_HEIGHT,
    MINDMAP_MIN_WIDTH,
    MINDMAP_MIN_HEIGHT,
} from '../../../types/node';
import { defaultData, defaultProps, setupResizeTests } from './IdeaCard.resize.shared';

vi.mock('@xyflow/react', async () => {
    const actual = await vi.importActual('@xyflow/react');
    return {
        ...actual,
        Handle: ({ type, position }: { type: string; position: string }) => (
            <div data-testid={`handle-${type}-${position}`} />
        ),
        Position: { Top: 'top', Bottom: 'bottom' },
        NodeResizer: ({
            minWidth,
            maxWidth,
            minHeight,
            maxHeight,
            isVisible,
        }: {
            isVisible?: boolean;
            minWidth?: number;
            maxWidth?: number;
            minHeight?: number;
            maxHeight?: number;
        }) => (
            <div
                data-testid="node-resizer"
                data-visible={isVisible}
                data-min-width={minWidth}
                data-max-width={maxWidth}
                data-min-height={minHeight}
                data-max-height={maxHeight}
            />
        ),
    };
});

vi.mock('@/features/ai/hooks/useNodeGeneration', () => ({
    useNodeGeneration: () => ({ generateFromPrompt: vi.fn(), branchFromNode: vi.fn() }),
}));

vi.mock('../../../hooks/useTipTapEditor', async () =>
    (await import('./helpers/tipTapTestMock')).hookMock()
);
vi.mock('../TipTapEditor', async () =>
    (await import('./helpers/tipTapTestMock')).componentMock()
);
vi.mock('../../../extensions/slashCommandSuggestion', async () =>
    (await import('./helpers/tipTapTestMock')).extensionMock()
);
vi.mock('../../../hooks/useIdeaCardEditor', async () =>
    (await import('./helpers/tipTapTestMock')).useIdeaCardEditorMock()
);
vi.mock('../../../hooks/useNodeInput', async () =>
    (await import('./helpers/tipTapTestMock')).useNodeInputMock()
);
vi.mock('../../../hooks/useLinkPreviewFetch', () => ({ useLinkPreviewFetch: vi.fn() }));
vi.mock('../../../hooks/useIdeaCardActions', async () =>
    (await import('./helpers/tipTapTestMock')).useIdeaCardActionsMock()
);
vi.mock('../../../hooks/useIdeaCardState', async () =>
    (await import('./helpers/tipTapTestMock')).useIdeaCardStateMock()
);
vi.mock('../NodeHeading', () => ({
    NodeHeading: ({ heading }: { heading: string }) => (
        <div data-testid="node-heading">{heading}</div>
    ),
}));
vi.mock('../NodeDivider', () => ({ NodeDivider: () => <div data-testid="node-divider" /> }));
vi.mock('@/features/canvas/contexts/PanToNodeContext', () => ({
    usePanToNodeContext: () => ({ panToPosition: vi.fn() }),
}));

describe('IdeaCard Resize Integration', () => {
    beforeEach(async () => {
        await setupResizeTests();
    });

    describe('NodeResizer constraint integration — text mode', () => {
        it('NodeResizer minWidth matches MIN_NODE_WIDTH constant', () => {
            render(<IdeaCard {...defaultProps} />);
            const resizer = screen.getByTestId('node-resizer');
            expect(Number(resizer.getAttribute('data-min-width'))).toBe(MIN_NODE_WIDTH);
        });

        it('NodeResizer maxWidth matches MAX_NODE_WIDTH constant', () => {
            render(<IdeaCard {...defaultProps} />);
            const resizer = screen.getByTestId('node-resizer');
            expect(Number(resizer.getAttribute('data-max-width'))).toBe(MAX_NODE_WIDTH);
        });

        it('NodeResizer minHeight matches MIN_NODE_HEIGHT constant', () => {
            render(<IdeaCard {...defaultProps} />);
            const resizer = screen.getByTestId('node-resizer');
            expect(Number(resizer.getAttribute('data-min-height'))).toBe(MIN_NODE_HEIGHT);
        });

        it('NodeResizer maxHeight matches MAX_NODE_HEIGHT constant', () => {
            render(<IdeaCard {...defaultProps} />);
            const resizer = screen.getByTestId('node-resizer');
            expect(Number(resizer.getAttribute('data-max-height'))).toBe(MAX_NODE_HEIGHT);
        });
    });

    describe('NodeResizer constraint integration — mindmap mode', () => {
        const mindmapProps = {
            ...defaultProps,
            data: { ...defaultData, contentMode: 'mindmap' as const },
        };

        it('NodeResizer minWidth uses MINDMAP_MIN_WIDTH when contentMode is mindmap', () => {
            render(<IdeaCard {...mindmapProps} />);
            const resizer = screen.getByTestId('node-resizer');
            expect(Number(resizer.getAttribute('data-min-width'))).toBe(MINDMAP_MIN_WIDTH);
        });

        it('NodeResizer minHeight uses MINDMAP_MIN_HEIGHT when contentMode is mindmap', () => {
            render(<IdeaCard {...mindmapProps} />);
            const resizer = screen.getByTestId('node-resizer');
            expect(Number(resizer.getAttribute('data-min-height'))).toBe(MINDMAP_MIN_HEIGHT);
        });

        it('NodeResizer maxWidth remains MAX_NODE_WIDTH in mindmap mode', () => {
            render(<IdeaCard {...mindmapProps} />);
            const resizer = screen.getByTestId('node-resizer');
            expect(Number(resizer.getAttribute('data-max-width'))).toBe(MAX_NODE_WIDTH);
        });

        it('NodeResizer maxHeight remains MAX_NODE_HEIGHT in mindmap mode', () => {
            render(<IdeaCard {...mindmapProps} />);
            const resizer = screen.getByTestId('node-resizer');
            expect(Number(resizer.getAttribute('data-max-height'))).toBe(MAX_NODE_HEIGHT);
        });
    });

    describe('Store dimension clamping', () => {
        const mockNode = { id: 'test-node', workspaceId: 'ws-1', type: 'idea' as const, data: defaultData, position: { x: 0, y: 0 }, width: DEFAULT_NODE_WIDTH, height: DEFAULT_NODE_HEIGHT, createdAt: new Date(), updatedAt: new Date() };

        it('updateNodeDimensions clamps width below minimum', () => {
            useCanvasStore.getState().addNode(mockNode);
            useCanvasStore.getState().updateNodeDimensions('test-node', 50, 200);
            const node = useCanvasStore.getState().nodes[0];
            expect(node?.width).toBe(MIN_NODE_WIDTH);
        });

        it('updateNodeDimensions clamps width above maximum', () => {
            useCanvasStore.getState().addNode(mockNode);
            useCanvasStore.getState().updateNodeDimensions('test-node', 1500, 200);
            const node = useCanvasStore.getState().nodes[0];
            expect(node?.width).toBe(MAX_NODE_WIDTH);
        });

        it('updateNodeDimensions clamps height below minimum', () => {
            useCanvasStore.getState().addNode(mockNode);
            useCanvasStore.getState().updateNodeDimensions('test-node', 300, 20);
            const node = useCanvasStore.getState().nodes[0];
            expect(node?.height).toBe(MIN_NODE_HEIGHT);
        });

        it('updateNodeDimensions clamps height above maximum', () => {
            useCanvasStore.getState().addNode(mockNode);
            useCanvasStore.getState().updateNodeDimensions('test-node', 300, 1500);
            const node = useCanvasStore.getState().nodes[0];
            expect(node?.height).toBe(MAX_NODE_HEIGHT);
        });
    });

    describe('Selection-based visibility', () => {
        it('NodeResizer is visible when node is selected', () => {
            render(<IdeaCard {...defaultProps} selected={true} />);
            const resizer = screen.getByTestId('node-resizer');
            expect(resizer.getAttribute('data-visible')).toBe('true');
        });

        it('NodeResizer is hidden when node is not selected', () => {
            render(<IdeaCard {...defaultProps} selected={false} />);
            const resizer = screen.getByTestId('node-resizer');
            expect(resizer.getAttribute('data-visible')).toBe('false');
        });
    });

    describe('Content area scrolling', () => {
        it('content area has proper scrolling class', () => {
            render(<IdeaCard {...defaultProps} />);
            const contentArea = screen.getByTestId('content-area');
            expect(contentArea.className).toContain('contentArea');
        });

        it('content area has nowheel class to prevent zoom conflicts', () => {
            render(<IdeaCard {...defaultProps} />);
            const contentArea = screen.getByTestId('content-area');
            expect(contentArea).toHaveClass('nowheel');
        });
    });

    describe('Dimension constants consistency', () => {
        it('DEFAULT_NODE_WIDTH is within min/max bounds', () => {
            expect(DEFAULT_NODE_WIDTH).toBeGreaterThanOrEqual(MIN_NODE_WIDTH);
            expect(DEFAULT_NODE_WIDTH).toBeLessThanOrEqual(MAX_NODE_WIDTH);
        });

        it('DEFAULT_NODE_HEIGHT is within min/max bounds', () => {
            expect(DEFAULT_NODE_HEIGHT).toBeGreaterThanOrEqual(MIN_NODE_HEIGHT);
            expect(DEFAULT_NODE_HEIGHT).toBeLessThanOrEqual(MAX_NODE_HEIGHT);
        });

        it('MIN values are positive', () => {
            expect(MIN_NODE_WIDTH).toBeGreaterThan(0);
            expect(MIN_NODE_HEIGHT).toBeGreaterThan(0);
        });

        it('MAX values are greater than MIN values', () => {
            expect(MAX_NODE_WIDTH).toBeGreaterThan(MIN_NODE_WIDTH);
            expect(MAX_NODE_HEIGHT).toBeGreaterThan(MIN_NODE_HEIGHT);
        });
    });

    describe('cardWrapper height propagation for vertical resize', () => {
        it('cardWrapper element has correct CSS class for height propagation', () => {
            render(<IdeaCard {...defaultProps} />);
            const contentArea = screen.getByTestId('content-area');
            const ideaCard = contentArea.parentElement;
            const cardWrapper = ideaCard?.parentElement;
            expect(cardWrapper).toBeTruthy();
            expect(cardWrapper?.className).toContain('cardWrapper');
        });

        it('CSS file contains height: 100% for cardWrapper class', () => {
            const cssPath = path.resolve(__dirname, '../IdeaCard.module.css');
            const cssContent = fs.readFileSync(cssPath, 'utf-8');
            const cardWrapperRegex = /\.cardWrapper\s*\{([^}]+)\}/;
            const cardWrapperMatch = cardWrapperRegex.exec(cssContent);
            expect(cardWrapperMatch).toBeTruthy();
            const cardWrapperContent = cardWrapperMatch?.[1] ?? '';
            expect(/height:\s*100%/.test(cardWrapperContent)).toBe(true);
        });
    });
});
