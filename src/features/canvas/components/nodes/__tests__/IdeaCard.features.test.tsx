/**
 * IdeaCard Feature Tests - Connection handles, resizing, scrollable output
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { IdeaCard } from '../IdeaCard';
import { useCanvasStore } from '../../../stores/canvasStore';
import type { IdeaNodeData } from '../../../types/node';

// Mock ReactFlow hooks and components
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
        Position: {
            Top: 'top',
            Bottom: 'bottom',
        },
        NodeResizer: ({ 
            isVisible, 
            minWidth, 
            maxWidth, 
            minHeight, 
            maxHeight 
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

// Mock the generation hook
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

// TipTap mocks — shared state via singleton in helper module
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

describe('IdeaCard Features', () => {
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

    describe('Connection handles', () => {
        it('target handle should be connectable', () => {
            render(<IdeaCard {...defaultProps} />);
            const targetHandle = screen.getByTestId('handle-target-top');
            expect(targetHandle.getAttribute('data-connectable')).toBe('true');
        });

        it('source handle should be connectable', () => {
            render(<IdeaCard {...defaultProps} />);
            const sourceHandle = screen.getByTestId('handle-source-bottom');
            expect(sourceHandle.getAttribute('data-connectable')).toBe('true');
        });

        it('handles should have proper CSS class for styling', () => {
            render(<IdeaCard {...defaultProps} />);
            const targetHandle = screen.getByTestId('handle-target-top');
            const sourceHandle = screen.getByTestId('handle-source-bottom');
            
            expect(targetHandle.className).toContain('handle');
            expect(sourceHandle.className).toContain('handle');
        });
    });

    describe('Resizable', () => {
        it('renders NodeResizer component', () => {
            render(<IdeaCard {...defaultProps} />);
            expect(screen.getByTestId('node-resizer')).toBeInTheDocument();
        });

        it('NodeResizer is not visible when node is not selected', () => {
            render(<IdeaCard {...defaultProps} />);
            const resizer = screen.getByTestId('node-resizer');
            expect(resizer.getAttribute('data-visible')).toBe('false');
        });

        it('NodeResizer is visible when node is selected', () => {
            const selectedProps = {
                ...defaultProps,
                selected: true,
            };
            render(<IdeaCard {...selectedProps} />);
            const resizer = screen.getByTestId('node-resizer');
            expect(resizer.getAttribute('data-visible')).toBe('true');
        });

        it('NodeResizer has correct minWidth constraint (180)', () => {
            render(<IdeaCard {...defaultProps} />);
            const resizer = screen.getByTestId('node-resizer');
            expect(resizer.getAttribute('data-min-width')).toBe('180');
        });

        it('NodeResizer has correct maxWidth constraint (900)', () => {
            render(<IdeaCard {...defaultProps} />);
            const resizer = screen.getByTestId('node-resizer');
            expect(resizer.getAttribute('data-max-width')).toBe('900');
        });

        it('NodeResizer has correct minHeight constraint (100)', () => {
            render(<IdeaCard {...defaultProps} />);
            const resizer = screen.getByTestId('node-resizer');
            expect(resizer.getAttribute('data-min-height')).toBe('100');
        });

        it('NodeResizer has correct maxHeight constraint (800)', () => {
            render(<IdeaCard {...defaultProps} />);
            const resizer = screen.getByTestId('node-resizer');
            expect(resizer.getAttribute('data-max-height')).toBe('800');
        });
    });

    describe('Scrollable content area', () => {
        it('content area has scrollable styling', () => {
            const propsWithOutput = {
                ...defaultProps,
                data: { ...defaultData, output: 'Some output content' },
            };
            render(<IdeaCard {...propsWithOutput} />);
            
            const contentArea = screen.getByTestId('content-area');
            expect(contentArea.className).toContain('contentArea');
        });

        it('content area should be scrollable for long content', () => {
            const longOutput = 'Line\n'.repeat(100);
            const propsWithOutput = {
                ...defaultProps,
                data: { ...defaultData, output: longOutput },
            };
            render(<IdeaCard {...propsWithOutput} />);
            
            const contentArea = screen.getByTestId('content-area');
            expect(contentArea.className).toContain('contentArea');
            expect(contentArea.textContent).toContain('Line');
        });

        it('content area should contain output content wrapper', () => {
            const propsWithOutput = {
                ...defaultProps,
                data: { ...defaultData, output: 'Test output' },
            };
            render(<IdeaCard {...propsWithOutput} />);
            
            const contentArea = screen.getByTestId('content-area');
            expect(contentArea.querySelector('div')).not.toBeNull();
        });

        it('renders output using TipTapEditor component', () => {
            const propsWithOutput = {
                ...defaultProps,
                data: { ...defaultData, output: '**Bold** text' },
            };
            render(<IdeaCard {...propsWithOutput} />);

            const viewEditor = screen.getByTestId('view-editor');
            expect(viewEditor).toBeInTheDocument();
        });
    });

});
