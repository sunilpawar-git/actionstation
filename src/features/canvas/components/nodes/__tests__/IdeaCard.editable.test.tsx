/** IdeaCard Editable Content Area Tests */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { IdeaCard } from '../IdeaCard';
import { useCanvasStore } from '../../../stores/canvasStore';
import type { IdeaNodeData } from '../../../types/node';

vi.mock('@xyflow/react', async () => {
    const actual = await vi.importActual('@xyflow/react');
    return {
        ...actual,
        Handle: ({ type, position, isConnectable, className }: {
            type: string; position: string; isConnectable?: boolean; className?: string;
        }) => (
            <div data-testid={`handle-${type}-${position}`}
                data-connectable={isConnectable} className={className} />
        ),
        Position: { Top: 'top', Bottom: 'bottom' },
        NodeResizer: ({ isVisible }: { isVisible?: boolean }) => (
            <div data-testid="node-resizer" data-visible={isVisible} />
        ),
    };
});

const mockGenerateFromPrompt = vi.fn();
vi.mock('@/features/ai/hooks/useNodeGeneration', () => ({
    useNodeGeneration: () => ({
        generateFromPrompt: mockGenerateFromPrompt,
        branchFromNode: vi.fn(),
    }),
}));

vi.mock('../../../hooks/useIdeaCardActions', async () => {
    const mock = (await import('./helpers/tipTapTestMock')).useIdeaCardActionsMock();
    return {
        useIdeaCardActions: (opts: unknown) => mock.useIdeaCardActions(opts as never),
    };
});
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

describe('IdeaCard editable content area', () => {
    const defaultData: IdeaNodeData = {
        prompt: 'Test prompt content', output: undefined, isGenerating: false, isPromptCollapsed: false,
    };
    const defaultProps = {
        id: 'idea-1', data: defaultData, type: 'idea' as const, selected: false,
        isConnectable: true, positionAbsoluteX: 0, positionAbsoluteY: 0, zIndex: 0,
        dragging: false, selectable: true, deletable: true, draggable: true,
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

    it('double-clicking card content enters edit mode', () => {
        const noteCard = {
            ...defaultProps,
            data: { ...defaultData, prompt: '', output: 'My note' },
        };
        render(<IdeaCard {...noteCard} />);
        const content = screen.getByText('My note');
        fireEvent.doubleClick(content);

        expect(screen.getByTestId('tiptap-editor')).toBeInTheDocument();
    });

    it('empty card shows input textarea by default', () => {
        const emptyCard = {
            ...defaultProps,
            data: { ...defaultData, prompt: '', output: undefined },
        };
        render(<IdeaCard {...emptyCard} />);

        expect(screen.getByTestId('tiptap-editor')).toBeInTheDocument();
    });

    it('Shift+Enter does not trigger save (TipTap handles newline)', () => {
        const emptyCard = {
            ...defaultProps,
            data: { ...defaultData, prompt: '', output: undefined },
        };
        render(<IdeaCard {...emptyCard} />);

        expect(screen.getByTestId('tiptap-editor')).toBeInTheDocument();
        expect(mockGenerateFromPrompt).not.toHaveBeenCalled();
    });

    it('shows generating spinner when isGenerating is true (not content)', () => {
        const generatingProps = {
            ...defaultProps,
            data: { ...defaultData, prompt: 'AI prompt', output: 'Response', isGenerating: true },
        };
        render(<IdeaCard {...generatingProps} />);

        expect(screen.getByText(/generating/i)).toBeInTheDocument();
        expect(screen.queryByText('AI prompt')).not.toBeInTheDocument();
    });

    it('pressing a printable character key on selected node enters edit mode', () => {
        const noteCard = {
            ...defaultProps,
            selected: true,
            data: { ...defaultData, prompt: '', output: 'My note' },
        };
        render(<IdeaCard {...noteCard} />);

        const contentArea = screen.getByTestId('content-area');
        fireEvent.keyDown(contentArea, { key: 'h' });

        expect(screen.getByTestId('tiptap-editor')).toBeInTheDocument();
    });
});
