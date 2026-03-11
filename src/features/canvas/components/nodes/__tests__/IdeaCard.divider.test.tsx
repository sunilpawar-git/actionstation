/** IdeaCard Component Tests - AI card divider (prompt vs output) */
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
    NodeHeading: ({ heading }: { heading: string }) => (
        <div data-testid="node-heading">{heading}</div>
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

describe('IdeaCard AI card divider', () => {
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

    describe('AI card divider (prompt !== output)', () => {
        it('shows divider for legacy AI cards (prompt field, no heading)', () => {
            const aiCard = {
                ...defaultProps,
                data: { ...defaultData, prompt: 'Write a poem', output: 'Roses are red...' },
            };
            render(<IdeaCard {...aiCard} />);
            expect(screen.getByTestId('ai-divider')).toBeInTheDocument();
        });

        it('shows prompt text above divider for legacy AI cards', () => {
            const aiCard = {
                ...defaultProps,
                data: { ...defaultData, prompt: 'Write a poem', output: 'Roses are red...' },
            };
            render(<IdeaCard {...aiCard} />);
            expect(screen.getByText('Write a poem')).toBeInTheDocument();
        });

        it('does NOT show divider when heading is the prompt source', () => {
            const aiCard = {
                ...defaultProps,
                data: { ...defaultData, heading: 'Write a poem', prompt: '', output: 'Roses are red...' },
            };
            render(<IdeaCard {...aiCard} />);
            expect(screen.queryByTestId('ai-divider')).not.toBeInTheDocument();
        });

        it('does NOT show divider for note cards (output only)', () => {
            const noteCard = {
                ...defaultProps,
                data: { ...defaultData, prompt: '', output: 'My personal note' },
            };
            render(<IdeaCard {...noteCard} />);
            expect(screen.queryByTestId('ai-divider')).not.toBeInTheDocument();
        });
    });
});
