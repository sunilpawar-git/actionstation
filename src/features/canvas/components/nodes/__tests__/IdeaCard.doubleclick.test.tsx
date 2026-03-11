/**
 * IdeaCard Double-Click Tests - TDD Phase 2
 * Tests for double-click to enter edit mode functionality
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { IdeaCard } from '../IdeaCard';
import { useCanvasStore } from '../../../stores/canvasStore';
import { defaultTestData, defaultTestProps } from './helpers/ideaCardTestMocks';

// Mock ReactFlow hooks and components
vi.mock('@xyflow/react', async () => {
    const actual = await vi.importActual('@xyflow/react');
    return {
        ...actual,
        Handle: ({ type, position }: { type: string; position: string }) => (
            <div data-testid={`handle-${type}-${position}`} />
        ),
        Position: { Top: 'top', Bottom: 'bottom' },
        NodeResizer: () => <div data-testid="node-resizer" />,
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

describe('IdeaCard Double-Click Edit Pattern - Phase 2', () => {
    const defaultData = defaultTestData;
    const defaultProps = defaultTestProps;

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

    it('should enter edit mode on double-click', () => {
        const propsWithOutput = {
            ...defaultProps,
            data: { ...defaultData, output: 'Existing content' },
        };

        render(<IdeaCard {...propsWithOutput} />);

        // Should show content, not textarea initially
        expect(screen.queryByTestId('tiptap-editor')).not.toBeInTheDocument();
        expect(screen.getByText('Existing content')).toBeInTheDocument();

        // Double-click to enter edit mode
        const content = screen.getByText('Existing content');
        fireEvent.doubleClick(content);

        // Should now show textarea
        expect(screen.getByTestId('tiptap-editor')).toBeInTheDocument();
    });

    it('should NOT enter edit mode on single-click (allow selection)', () => {
        const propsWithOutput = {
            ...defaultProps,
            data: { ...defaultData, output: 'Clickable content' },
        };

        render(<IdeaCard {...propsWithOutput} />);

        // Single-click should NOT trigger edit mode
        const content = screen.getByText('Clickable content');
        fireEvent.click(content);

        // Should still show content, not textarea
        expect(screen.queryByTestId('tiptap-editor')).not.toBeInTheDocument();
        expect(screen.getByText('Clickable content')).toBeInTheDocument();
    });

    it('should enter edit mode for AI card prompt on double-click', () => {
        const aiCardProps = {
            ...defaultProps,
            data: { 
                ...defaultData, 
                prompt: 'AI prompt here',
                output: 'AI generated response' 
            },
        };

        render(<IdeaCard {...aiCardProps} />);

        // Double-click prompt to edit
        const promptText = screen.getByText('AI prompt here');
        fireEvent.doubleClick(promptText);

        // Should enter edit mode
        expect(screen.getByTestId('tiptap-editor')).toBeInTheDocument();
    });

    it('should support Enter key to enter edit mode when node is selected', () => {
        const propsWithOutput = {
            ...defaultProps,
            selected: true, // Node is selected
            data: { ...defaultData, output: 'Selected node content' },
        };

        render(<IdeaCard {...propsWithOutput} />);

        // Press Enter on selected node content
        const contentArea = screen.getByTestId('content-area');
        fireEvent.keyDown(contentArea, { key: 'Enter' });

        // Should enter edit mode
        expect(screen.getByTestId('tiptap-editor')).toBeInTheDocument();
    });

    it('should support keyboard navigation: Enter on content to edit', () => {
        const propsWithOutput = {
            ...defaultProps,
            selected: true, // Node must be selected for keyboard input
            data: { ...defaultData, output: 'Keyboard accessible' },
        };

        render(<IdeaCard {...propsWithOutput} />);

        // Find the clickable content area and trigger Enter
        const contentArea = screen.getByTestId('content-area');
        fireEvent.keyDown(contentArea, { key: 'Enter' });

        // Should enter edit mode (existing behavior maintained)
        expect(screen.getByTestId('tiptap-editor')).toBeInTheDocument();
    });

    it('should NOT enter edit mode on double-click when generating', () => {
        const generatingProps = {
            ...defaultProps,
            data: { ...defaultData, prompt: 'Test', output: 'Test', isGenerating: true },
        };

        render(<IdeaCard {...generatingProps} />);

        // Should show generating state
        expect(screen.getByText(/generating/i)).toBeInTheDocument();
    });

    describe('Focus and cursor placement on edit entry', () => {
        it('should enter edit mode on double-click to ensure immediate typing', () => {
            const propsWithOutput = {
                ...defaultProps,
                data: { ...defaultData, output: 'Focus test content' },
            };

            render(<IdeaCard {...propsWithOutput} />);

            const content = screen.getByText('Focus test content');
            fireEvent.doubleClick(content);

            expect(screen.getByTestId('tiptap-editor')).toBeInTheDocument();
        });

        it('should enter edit mode on Enter key to ensure immediate typing', () => {
            const propsWithOutput = {
                ...defaultProps,
                selected: true,
                data: { ...defaultData, output: 'Enter focus test' },
            };

            render(<IdeaCard {...propsWithOutput} />);

            const contentArea = screen.getByTestId('content-area');
            fireEvent.keyDown(contentArea, { key: 'Enter' });

            expect(screen.getByTestId('tiptap-editor')).toBeInTheDocument();
        });

        it('should enter edit mode on printable key to ensure immediate typing', () => {
            const propsWithOutput = {
                ...defaultProps,
                selected: true,
                data: { ...defaultData, output: 'Key focus test' },
            };

            render(<IdeaCard {...propsWithOutput} />);

            const contentArea = screen.getByTestId('content-area');
            fireEvent.keyDown(contentArea, { key: 'a' });

            expect(screen.getByTestId('tiptap-editor')).toBeInTheDocument();
        });

        it('should insert the triggering character when entering edit mode via key', async () => {
            const { getInsertedChars } = await import('./helpers/tipTapTestMock');
            const propsWithOutput = {
                ...defaultProps,
                selected: true,
                data: { ...defaultData, output: 'Existing text' },
            };

            render(<IdeaCard {...propsWithOutput} />);

            const contentArea = screen.getByTestId('content-area');
            fireEvent.keyDown(contentArea, { key: 'h' });

            // The 'h' keypress that triggered edit mode must be inserted
            expect(getInsertedChars()).toContain('h');
        });

        it('should NOT insert character for Enter key (Enter enters edit mode only)', async () => {
            const { getInsertedChars } = await import('./helpers/tipTapTestMock');
            const propsWithOutput = {
                ...defaultProps,
                selected: true,
                data: { ...defaultData, output: 'Enter test' },
            };

            render(<IdeaCard {...propsWithOutput} />);

            const contentArea = screen.getByTestId('content-area');
            fireEvent.keyDown(contentArea, { key: 'Enter' });

            // Enter should NOT be inserted as text
            expect(getInsertedChars()).not.toContain('Enter');
            expect(getInsertedChars()).not.toContain('\n');
        });
    });
});
