/**
 * IdeaCard Wheel scroll behavior tests - ReactFlow zoom prevention.
 * Split from IdeaCard.features.test.tsx to stay under 300 lines.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { IdeaCard } from '../IdeaCard';
import { useCanvasStore } from '../../../stores/canvasStore';
import type { IdeaNodeData } from '../../../types/node';

vi.mock('@xyflow/react', async () => {
    const actual = await vi.importActual('@xyflow/react');
    return {
        ...actual,
        Handle: ({ type, position, isConnectable, className }: {
            type: string;
            position: string;
            isConnectable?: boolean;
            className?: string;
        }) => (
            <div
                data-testid={`handle-${type}-${position}`}
                data-connectable={isConnectable}
                className={className}
            />
        ),
        Position: { Top: 'top', Bottom: 'bottom' },
        NodeResizer: ({ isVisible, minWidth, maxWidth, minHeight, maxHeight }: {
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
    useNodeGeneration: () => ({
        generateFromPrompt: vi.fn(),
        branchFromNode: vi.fn(),
    }),
}));

vi.mock('../../../hooks/useIdeaCardActions', async () =>
    (await import('./helpers/tipTapTestMock')).useIdeaCardActionsMock()
);
vi.mock('../../../hooks/useIdeaCardState', async () =>
    (await import('./helpers/tipTapTestMock')).useIdeaCardStateMock()
);
vi.mock('../NodeHeading', () => ({
    NodeHeading: ({ heading, onDoubleClick }: { heading: string; onDoubleClick?: () => void }) => (
        <div data-testid="node-heading" onDoubleClick={onDoubleClick}>{heading}</div>
    ),
}));
vi.mock('../NodeDivider', () => ({
    NodeDivider: () => <div data-testid="node-divider" />,
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
vi.mock('../../../hooks/useLinkPreviewFetch', () => ({
    useLinkPreviewFetch: vi.fn(),
}));
vi.mock('@/features/canvas/contexts/PanToNodeContext', () => ({
    usePanToNodeContext: () => ({ panToPosition: vi.fn() }),
}));

describe('IdeaCard Features - Wheel scroll behavior', () => {
    const defaultData: IdeaNodeData = {
        prompt: 'Test prompt content',
        output: undefined,
        isGenerating: false,
        isPromptCollapsed: false,
    };

    const defaultProps = {
        id: 'idea-1',
        data: defaultData,
        type: 'idea' as const,
        selected: false,
        isConnectable: true,
        positionAbsoluteX: 0,
        positionAbsoluteY: 0,
        zIndex: 0,
        dragging: false,
        selectable: true,
        deletable: true,
        draggable: true,
    };

    beforeEach(async () => {
        vi.clearAllMocks();
        const { resetMockState, initNodeInputStore, initStateStore } = await import('./helpers/tipTapTestMock');
        resetMockState();
        initNodeInputStore(useCanvasStore);
        initStateStore(useCanvasStore);
        useCanvasStore.setState({
            nodes: [],
            edges: [],
            selectedNodeIds: new Set(),
            editingNodeId: null,
            draftContent: null,
            inputMode: 'note',
        });
    });

    describe('Wheel scroll behavior (ReactFlow zoom prevention)', () => {
        it('content area has nowheel class to prevent ReactFlow zoom', () => {
            const propsWithOutput = {
                ...defaultProps,
                data: { ...defaultData, output: 'Some output content' },
            };
            render(<IdeaCard {...propsWithOutput} />);

            const contentArea = screen.getByTestId('content-area');
            expect(contentArea).toHaveClass('nowheel');
        });

        it('content area has nowheel class even without content (edit mode)', () => {
            const emptyProps = {
                ...defaultProps,
                data: { ...defaultData, prompt: '', output: undefined },
            };
            render(<IdeaCard {...emptyProps} />);

            const contentArea = screen.getByTestId('content-area');
            expect(contentArea).toHaveClass('nowheel');
        });

        it('content area has nowheel class during generation', () => {
            const generatingProps = {
                ...defaultProps,
                data: { ...defaultData, isGenerating: true },
            };
            render(<IdeaCard {...generatingProps} />);

            const contentArea = screen.getByTestId('content-area');
            expect(contentArea).toHaveClass('nowheel');
        });

        it('wheel events stop propagation to prevent canvas zoom', () => {
            const propsWithOutput = {
                ...defaultProps,
                data: { ...defaultData, output: 'Long content for scrolling' },
            };
            render(<IdeaCard {...propsWithOutput} />);

            const contentArea = screen.getByTestId('content-area');

            const wheelEvent = new WheelEvent('wheel', {
                bubbles: true,
                deltaY: 100,
            });
            const stopPropagationSpy = vi.spyOn(wheelEvent, 'stopPropagation');

            contentArea.dispatchEvent(wheelEvent);

            expect(stopPropagationSpy).toHaveBeenCalled();
        });

        it('wheel events with scroll up stop propagation', () => {
            const propsWithOutput = {
                ...defaultProps,
                data: { ...defaultData, output: 'Content for testing' },
            };
            render(<IdeaCard {...propsWithOutput} />);

            const contentArea = screen.getByTestId('content-area');

            const wheelEvent = new WheelEvent('wheel', {
                bubbles: true,
                deltaY: -100,
            });
            const stopPropagationSpy = vi.spyOn(wheelEvent, 'stopPropagation');

            contentArea.dispatchEvent(wheelEvent);

            expect(stopPropagationSpy).toHaveBeenCalled();
        });

        it('content area retains both contentArea and nowheel classes', () => {
            const propsWithOutput = {
                ...defaultProps,
                data: { ...defaultData, output: 'Test content' },
            };
            render(<IdeaCard {...propsWithOutput} />);

            const contentArea = screen.getByTestId('content-area');

            expect(contentArea.className).toContain('contentArea');
            expect(contentArea.className).toContain('nowheel');
        });
    });
});
