/** IdeaCard Component Tests - TDD: Write tests FIRST */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { IdeaCard } from '../IdeaCard';
import { useCanvasStore } from '../../../stores/canvasStore';
import type { IdeaNodeData } from '../../../types/node';
// Mock ReactFlow hooks and components
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

// Mock the generation hook (still needed by useNodeInput's onSubmitAI)
const mockGenerateFromPrompt = vi.fn();
vi.mock('@/features/ai/hooks/useNodeGeneration', () => ({
    useNodeGeneration: () => ({
        generateFromPrompt: mockGenerateFromPrompt,
        branchFromNode: vi.fn(),
    }),
}));

// Mock useIdeaCardActions (extracted action callbacks)
const mockHandleDelete = vi.fn();
vi.mock('../../../hooks/useIdeaCardActions', async () => {
    const mock = (await import('./helpers/tipTapTestMock')).useIdeaCardActionsMock();
    return {
        useIdeaCardActions: (opts: unknown) => {
            const result = mock.useIdeaCardActions(opts as never);
            return { ...result, handleDelete: mockHandleDelete };
        },
    };
});
vi.mock('../../../hooks/useIdeaCardState', async () =>
    (await import('./helpers/tipTapTestMock')).useIdeaCardStateMock()
);

// Mock NodeHeading and NodeDivider (tested separately)
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

vi.mock('@/features/canvas/hooks/usePanToNode', () => ({
    usePanToNode: () => ({ panToPosition: vi.fn() }),
}));

describe('IdeaCard', () => {
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

    describe('Structure', () => {
        it('renders output section when output exists', () => {
            const propsWithOutput = {
                ...defaultProps,
                data: { ...defaultData, output: 'AI generated output' },
            };
            render(<IdeaCard {...propsWithOutput} />);
            expect(screen.getByTestId('view-editor')).toBeInTheDocument();
        });

        it('renders editor when no output (empty card)', () => {
            const propsNoOutput = {
                ...defaultProps,
                data: { ...defaultData, prompt: '', output: undefined },
            };
            render(<IdeaCard {...propsNoOutput} />);
            // Empty cards start in edit mode with TipTap editor
            expect(screen.getByTestId('tiptap-editor')).toBeInTheDocument();
        });

        it('renders connection handles (top target + bottom source)', () => {
            render(<IdeaCard {...defaultProps} />);
            expect(screen.getByTestId('handle-target-top')).toBeInTheDocument();
            expect(screen.getByTestId('handle-source-bottom')).toBeInTheDocument();
        });
    });

    describe('Unified action bar (all cards get same actions)', () => {
        it('renders Transform, Show more actions, and Delete buttons for note cards', () => {
            const noteCard = {
                ...defaultProps,
                data: { ...defaultData, prompt: '', output: 'My personal note' },
            };
            render(<IdeaCard {...noteCard} />);
            expect(screen.getByRole('button', { name: /transform/i })).toBeInTheDocument();
            expect(screen.getByRole('button', { name: /more actions/i })).toBeInTheDocument();
            expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
        });

        it('renders all action buttons for AI cards', () => {
            const aiCard = {
                ...defaultProps,
                data: { ...defaultData, prompt: 'AI prompt', output: 'AI response' },
            };
            render(<IdeaCard {...aiCard} />);
            expect(screen.getByRole('button', { name: /transform/i })).toBeInTheDocument();
            expect(screen.getByRole('button', { name: /connect/i })).toBeInTheDocument();
            expect(screen.getByRole('button', { name: /copy/i })).toBeInTheDocument();
            expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
            expect(screen.getByRole('button', { name: /more actions/i })).toBeInTheDocument();
        });

        // Copy-specific tests are in IdeaCard.copy.test.tsx
    });

    // AI card divider tests are in IdeaCard.divider.test.tsx
    // Typography tests are in IdeaCard.style.test.tsx
    // Connection handles tests are in IdeaCard.features.test.tsx
    // Editable content area tests are in IdeaCard.editable.test.tsx

    describe('Loading state', () => {
        it('shows generating indicator when isGenerating is true', () => {
            const generatingProps = {
                ...defaultProps,
                data: { ...defaultData, isGenerating: true },
            };
            render(<IdeaCard {...generatingProps} />);

            expect(screen.getByText(/generating/i)).toBeInTheDocument();
        });
    });

    describe('Delete action', () => {
        it('clicking delete button calls deleteNode', () => {
            render(<IdeaCard {...defaultProps} />);
            fireEvent.click(screen.getByRole('button', { name: /delete/i }));

            expect(mockHandleDelete).toHaveBeenCalled();
        });
    });

    // Dual-mode input tests are in IdeaCard.dualmode.test.tsx
});
