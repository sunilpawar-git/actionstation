/**
 * IdeaCard Resize Buttons Integration Tests
 * NodeResizeButtons: expand/shrink width/height, hover visibility
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { IdeaCard } from '../IdeaCard';
import { useCanvasStore } from '../../../stores/canvasStore';
import {
    DEFAULT_NODE_WIDTH,
    DEFAULT_NODE_HEIGHT,
    MAX_NODE_WIDTH,
    MAX_NODE_HEIGHT,
    RESIZE_INCREMENT_PX,
    createIdeaNode,
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
            isVisible,
            minWidth,
            maxWidth,
            minHeight,
            maxHeight,
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

function hoverCard(): HTMLElement {
    render(<IdeaCard {...defaultProps} />);
    const contentArea = screen.getByTestId('content-area');
    const cardWrapper = contentArea.parentElement?.parentElement as HTMLElement;
    fireEvent.mouseEnter(cardWrapper);
    return cardWrapper;
}

describe('IdeaCard Resize Integration', () => {
    const TEST_WORKSPACE_ID = 'test-workspace';

    beforeEach(async () => {
        await setupResizeTests();
    });

    describe('NodeResizeButtons integration', () => {
        beforeEach(() => {
            vi.useFakeTimers();
            const node = createIdeaNode(defaultProps.id, TEST_WORKSPACE_ID, { x: 0, y: 0 });
            node.data = defaultData;
            useCanvasStore.getState().addNode(node);
        });

        afterEach(() => {
            vi.useRealTimers();
        });

        it('renders resize buttons when node is hovered', () => {
            hoverCard();
            expect(screen.getByRole('button', { name: /expand width/i })).toBeInTheDocument();
            expect(screen.getByRole('button', { name: /expand height/i })).toBeInTheDocument();
        });

        it('sets data-hovered on cardWrapper when hovered anywhere', () => {
            const cardWrapper = hoverCard();
            expect(cardWrapper.getAttribute('data-hovered')).toBe('true');
        });

        it('removes data-hovered when mouse leaves', () => {
            const cardWrapper = hoverCard();
            fireEvent.mouseLeave(cardWrapper);
            act(() => { vi.advanceTimersByTime(300); });
            expect(cardWrapper.getAttribute('data-hovered')).toBeNull();
        });

        it('clicking expand width button increases node width in store', () => {
            hoverCard();
            fireEvent.click(screen.getByRole('button', { name: /expand width/i }));
            const node = useCanvasStore.getState().nodes.find((n) => n.id === defaultProps.id);
            expect(node?.width).toBe(DEFAULT_NODE_WIDTH + RESIZE_INCREMENT_PX);
        });

        it('clicking expand height button increases node height in store', () => {
            hoverCard();
            fireEvent.click(screen.getByRole('button', { name: /expand height/i }));
            const node = useCanvasStore.getState().nodes.find((n) => n.id === defaultProps.id);
            expect(node?.height).toBe(DEFAULT_NODE_HEIGHT + RESIZE_INCREMENT_PX);
        });

        it('width button is hidden when node is at max width', () => {
            useCanvasStore.getState().updateNodeDimensions(defaultProps.id, MAX_NODE_WIDTH, DEFAULT_NODE_HEIGHT);
            hoverCard();
            expect(screen.queryByRole('button', { name: /expand width/i })).not.toBeInTheDocument();
        });

        it('height button is hidden when node is at max height', () => {
            useCanvasStore.getState().updateNodeDimensions(defaultProps.id, DEFAULT_NODE_WIDTH, MAX_NODE_HEIGHT);
            hoverCard();
            expect(screen.queryByRole('button', { name: /expand height/i })).not.toBeInTheDocument();
        });

        it('shrink width button is hidden when node is at default width', () => {
            hoverCard();
            expect(screen.queryByRole('button', { name: /reduce width/i })).not.toBeInTheDocument();
        });

        it('shrink width button is visible when node is wider than default', () => {
            useCanvasStore.getState().updateNodeDimensions(defaultProps.id, DEFAULT_NODE_WIDTH + 100, DEFAULT_NODE_HEIGHT);
            hoverCard();
            expect(screen.getByRole('button', { name: /reduce width/i })).toBeInTheDocument();
        });

        it('clicking shrink width button decreases node width', () => {
            const startWidth = DEFAULT_NODE_WIDTH + 100;
            useCanvasStore.getState().updateNodeDimensions(defaultProps.id, startWidth, DEFAULT_NODE_HEIGHT);
            hoverCard();
            fireEvent.click(screen.getByRole('button', { name: /reduce width/i }));
            const node = useCanvasStore.getState().nodes.find((n) => n.id === defaultProps.id);
            expect(node?.width).toBe(startWidth - RESIZE_INCREMENT_PX);
        });

        it('shrink height button is visible when node is taller than default', () => {
            useCanvasStore.getState().updateNodeDimensions(defaultProps.id, DEFAULT_NODE_WIDTH, DEFAULT_NODE_HEIGHT + 100);
            hoverCard();
            expect(screen.getByRole('button', { name: /reduce height/i })).toBeInTheDocument();
        });

        it('clicking shrink height button decreases node height', () => {
            const startHeight = DEFAULT_NODE_HEIGHT + 100;
            useCanvasStore.getState().updateNodeDimensions(defaultProps.id, DEFAULT_NODE_WIDTH, startHeight);
            hoverCard();
            fireEvent.click(screen.getByRole('button', { name: /reduce height/i }));
            const node = useCanvasStore.getState().nodes.find((n) => n.id === defaultProps.id);
            expect(node?.height).toBe(startHeight - RESIZE_INCREMENT_PX);
        });
    });
});
