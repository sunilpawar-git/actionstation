/**
 * IdeaCard Editing Tests
 * Tests for save-on-blur and populate-on-edit functionality
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
const mockGenerateFromPrompt = vi.fn();
vi.mock('@/features/ai/hooks/useNodeGeneration', () => ({
    useNodeGeneration: () => ({
        generateFromPrompt: mockGenerateFromPrompt,
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

describe('IdeaCard Editing', () => {
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

    describe('Save on Blur (Data Loss Prevention)', () => {
        it('should save content to store on blur instead of discarding', () => {
            const mockUpdateOutput = vi.fn();
            useCanvasStore.setState({
                nodes: [],
                edges: [],
                selectedNodeIds: new Set(),
                updateNodeOutput: mockUpdateOutput,
                updateNodePrompt: vi.fn(),
            });

            render(<IdeaCard {...defaultProps} />);

            const textarea = screen.getByTestId('tiptap-editor');
            fireEvent.change(textarea, { target: { value: 'Content that should be saved' } });
            fireEvent.blur(textarea);

            expect(mockUpdateOutput).toHaveBeenCalledWith('idea-1', 'Content that should be saved');
        });

        it('should not save on blur if content is empty', () => {
            const mockUpdateOutput = vi.fn();
            useCanvasStore.setState({
                nodes: [],
                edges: [],
                selectedNodeIds: new Set(),
                updateNodeOutput: mockUpdateOutput,
                updateNodePrompt: vi.fn(),
            });

            render(<IdeaCard {...defaultProps} />);

            const textarea = screen.getByTestId('tiptap-editor');
            fireEvent.change(textarea, { target: { value: '   ' } });
            fireEvent.blur(textarea);

            expect(mockUpdateOutput).not.toHaveBeenCalled();
        });

        it('should not save on blur if content unchanged from existing', () => {
            const mockUpdateOutput = vi.fn();
            const propsWithOutput = {
                ...defaultProps,
                data: { ...defaultData, output: 'Existing content' },
            };
            useCanvasStore.setState({
                nodes: [],
                edges: [],
                selectedNodeIds: new Set(),
                updateNodeOutput: mockUpdateOutput,
                updateNodePrompt: vi.fn(),
            });

            render(<IdeaCard {...propsWithOutput} />);

            // Double-click to enter edit mode
            const content = screen.getByText('Existing content');
            fireEvent.doubleClick(content);

            const textarea = screen.getByTestId('tiptap-editor');
            fireEvent.blur(textarea);
            expect(mockUpdateOutput).not.toHaveBeenCalled();
        });
    });

    describe('Populate on Edit (Re-editing Support)', () => {
        it('should populate textarea with existing output when entering edit mode', () => {
            const propsWithOutput = {
                ...defaultProps,
                data: { ...defaultData, output: 'My existing note content' },
            };

            render(<IdeaCard {...propsWithOutput} />);

            // Double-click to enter edit mode
            const content = screen.getByText('My existing note content');
            fireEvent.doubleClick(content);

            const textarea = screen.getByTestId('tiptap-editor');
            expect(textarea).toHaveValue('My existing note content');
        });

        it('should populate textarea with output for AI cards when entering edit mode', () => {
            const aiCardProps = {
                ...defaultProps,
                data: {
                    ...defaultData,
                    prompt: 'Original AI prompt',
                    output: 'AI generated response'
                },
            };

            render(<IdeaCard {...aiCardProps} />);

            // Double-click prompt area to enter edit mode
            const promptText = screen.getByText('Original AI prompt');
            fireEvent.doubleClick(promptText);

            const textarea = screen.getByTestId('tiptap-editor');
            expect(textarea).toHaveValue('AI generated response');
        });

        it('should allow editing and saving modified content via blur', () => {
            const mockUpdateOutput = vi.fn();
            const propsWithOutput = {
                ...defaultProps,
                data: { ...defaultData, output: 'Original content' },
            };
            useCanvasStore.setState({
                nodes: [],
                edges: [],
                selectedNodeIds: new Set(),
                updateNodeOutput: mockUpdateOutput,
                updateNodePrompt: vi.fn(),
            });

            render(<IdeaCard {...propsWithOutput} />);

            // Double-click to enter edit mode
            const content = screen.getByText('Original content');
            fireEvent.doubleClick(content);

            // Modify and blur to save
            const textarea = screen.getByTestId('tiptap-editor');
            fireEvent.change(textarea, { target: { value: 'Modified content' } });
            fireEvent.blur(textarea);

            expect(mockUpdateOutput).toHaveBeenCalledWith('idea-1', 'Modified content');
        });

        it('should preserve content when clicking outside and back in', () => {
            const mockUpdateOutput = vi.fn();
            const propsWithOutput = {
                ...defaultProps,
                data: { ...defaultData, output: 'Persistent content' },
            };
            useCanvasStore.setState({
                nodes: [],
                edges: [],
                selectedNodeIds: new Set(),
                updateNodeOutput: mockUpdateOutput,
                updateNodePrompt: vi.fn(),
            });

            render(<IdeaCard {...propsWithOutput} />);

            // Double-click to enter edit mode
            const content = screen.getByText('Persistent content');
            fireEvent.doubleClick(content);

            // Modify content partially
            const textarea = screen.getByTestId('tiptap-editor');
            fireEvent.change(textarea, { target: { value: 'Partially modified' } });

            // Blur (click outside)
            fireEvent.blur(textarea);

            expect(mockUpdateOutput).toHaveBeenCalledWith('idea-1', 'Partially modified');
        });
    });

    describe('Edit Mode Transitions', () => {
        it('should exit edit mode and save on blur', () => {
            const mockUpdateOutput = vi.fn();
            useCanvasStore.setState({
                nodes: [],
                edges: [],
                selectedNodeIds: new Set(),
                updateNodeOutput: mockUpdateOutput,
                updateNodePrompt: vi.fn(),
            });

            render(<IdeaCard {...defaultProps} />);

            const textarea = screen.getByTestId('tiptap-editor');
            fireEvent.change(textarea, { target: { value: 'Some content' } });
            fireEvent.blur(textarea);

            expect(mockUpdateOutput).toHaveBeenCalledWith('idea-1', 'Some content');
        });

        it('should exit edit mode after blur (textarea disappears)', () => {
            render(<IdeaCard {...defaultProps} />);

            const textarea = screen.getByTestId('tiptap-editor');
            fireEvent.change(textarea, { target: { value: 'Saved content' } });
            fireEvent.blur(textarea);

            expect(screen.queryByTestId('tiptap-editor')).not.toBeInTheDocument();
        });
    });
});
