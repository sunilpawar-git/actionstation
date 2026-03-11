/**
 * IdeaCard Copy Tests - Copy button behavior, clipboard, and toast feedback
 * Extracted to keep test files < 300 lines
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { IdeaCard } from '../IdeaCard';
import { useCanvasStore } from '../../../stores/canvasStore';
import type { IdeaNodeData } from '../../../types/node';
import { toast } from '@/shared/stores/toastStore';

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
        NodeResizer: ({ isVisible }: { isVisible?: boolean }) => (
            <div data-testid="node-resizer" data-visible={isVisible} />
        ),
    };
});

vi.mock('@/shared/stores/toastStore', () => ({
    toast: { success: vi.fn(), error: vi.fn() },
}));

const mockWriteText = vi.fn();
Object.assign(navigator, { clipboard: { writeText: mockWriteText } });

vi.mock('@/features/ai/hooks/useNodeGeneration', () => ({
    useNodeGeneration: () => ({
        generateFromPrompt: vi.fn(),
        branchFromNode: vi.fn(),
    }),
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
// Copy tests use the REAL useIdeaCardActions to test clipboard behavior
vi.mock('@/features/ai/hooks/useNodeTransformation', () => ({
    useNodeTransformation: () => ({ transformNodeContent: vi.fn(), isTransforming: false }),
}));
vi.mock('../../../hooks/useIdeaCardState', async () =>
    (await import('./helpers/tipTapTestMock')).useIdeaCardStateMock()
);
vi.mock('../NodeHeading', () => ({
    NodeHeading: ({ heading }: { heading: string }) =>
        <div data-testid="node-heading">{heading}</div>,
}));
vi.mock('../NodeDivider', () => ({
    NodeDivider: () => <div data-testid="node-divider" />,
}));

vi.mock('@/features/canvas/contexts/PanToNodeContext', () => ({
    usePanToNodeContext: () => ({ panToPosition: vi.fn() }),
}));

describe('IdeaCard Copy', () => {
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

    it('copies output text and shows success toast for AI cards', async () => {
        const aiCard = {
            ...defaultProps,
            data: { ...defaultData, prompt: 'AI prompt', output: 'AI response' },
        };
        mockWriteText.mockResolvedValue(undefined);
        render(<IdeaCard {...aiCard} />);
        fireEvent.click(screen.getByRole('button', { name: /copy/i }));
        await vi.waitFor(() => {
            expect(mockWriteText).toHaveBeenCalledWith('AI response');
            expect(toast.success).toHaveBeenCalledWith('Copied to clipboard');
        });
    });

    it('shows error toast when clipboard write fails', async () => {
        const aiCard = {
            ...defaultProps,
            data: { ...defaultData, prompt: 'AI prompt', output: 'AI response' },
        };
        mockWriteText.mockRejectedValue(new Error('Clipboard error'));
        render(<IdeaCard {...aiCard} />);
        fireEvent.click(screen.getByRole('button', { name: /copy/i }));
        await vi.waitFor(() => {
            expect(toast.error).toHaveBeenCalledWith('Failed to copy');
        });
    });

    it('copies output text for note cards (no prompt)', async () => {
        const noteCard = {
            ...defaultProps,
            data: { ...defaultData, prompt: '', output: 'My personal note' },
        };
        mockWriteText.mockResolvedValue(undefined);
        render(<IdeaCard {...noteCard} />);
        fireEvent.click(screen.getByRole('button', { name: /copy/i }));
        await vi.waitFor(() => {
            expect(mockWriteText).toHaveBeenCalledWith('My personal note');
            expect(toast.success).toHaveBeenCalledWith('Copied to clipboard');
        });
    });

    it('disables copy button for empty cards (no content)', () => {
        const emptyCard = {
            ...defaultProps,
            data: { ...defaultData, prompt: '', output: undefined },
        };
        render(<IdeaCard {...emptyCard} />);
        expect(screen.queryByRole('button', { name: /copy/i })).toBeDisabled();
    });
});
