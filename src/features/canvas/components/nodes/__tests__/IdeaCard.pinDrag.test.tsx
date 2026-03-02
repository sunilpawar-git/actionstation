/**
 * IdeaCard Pin Drag Tests
 * Verifies pinned nodes get the `nodrag` class on the card wrapper,
 * preventing ReactFlow from allowing drag (via noDragClassName).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { IdeaCard } from '../IdeaCard';
import type { NodeProps } from '@xyflow/react';
import type { IdeaNodeData } from '../../../types/node';

vi.mock('@xyflow/react', async () => {
    const actual = await vi.importActual('@xyflow/react');
    return {
        ...actual,
        Handle: vi.fn(() => null),
        NodeResizer: vi.fn(() => null),
    };
});

const mockCanvasState = {
    nodes: [],
    editingNodeId: null,
    setInputMode: vi.fn(),
    stopEditing: vi.fn(),
    toggleNodePinned: vi.fn(),
    toggleNodeCollapsed: vi.fn(),
};
const subscribers = new Set<() => void>();
vi.mock('../../../stores/canvasStore', () => ({
    useCanvasStore: Object.assign(
        vi.fn((selector?: (s: typeof mockCanvasState) => unknown) =>
            selector ? selector(mockCanvasState) : mockCanvasState),
        {
            getState: () => mockCanvasState,
            subscribe: (cb: () => void) => { subscribers.add(cb); return () => subscribers.delete(cb); },
            setState: () => { /* no-op for test */ },
        },
    ),
    getNodeMap: () => new Map(),
}));

vi.mock('../../../hooks/useIdeaCardEditor', () => ({
    useIdeaCardEditor: () => ({
        editor: null, getMarkdown: vi.fn(), setContent: vi.fn(), submitHandlerRef: { current: null },
    }),
}));

vi.mock('../../../hooks/useNodeInput', () => ({
    useNodeInput: () => ({ isEditing: false, handleKeyDown: vi.fn(), handleDoubleClick: vi.fn() }),
}));

vi.mock('../../../hooks/useNodeShortcuts', () => ({ useNodeShortcuts: vi.fn() }));

vi.mock('../../../hooks/useIdeaCardActions', () => ({
    useIdeaCardActions: () => ({
        handleDelete: vi.fn(), handleRegenerate: vi.fn(), handleConnectClick: vi.fn(),
        handleTransform: vi.fn(), handleHeadingChange: vi.fn(), handleCopy: vi.fn(),
        handleTagsChange: vi.fn(), isTransforming: false,
    }),
}));

vi.mock('../../../hooks/useIdeaCardState', () => ({
    useIdeaCardState: () => ({
        getEditableContent: vi.fn(), saveContent: vi.fn(), placeholder: '', onSubmitAI: vi.fn(),
    }),
}));

vi.mock('../../../hooks/useLinkPreviewRetry', () => ({ useLinkPreviewRetry: vi.fn() }));

vi.mock('../../../hooks/useBarPinOpen', () => ({
    useBarPinOpen: () => ({
        isPinnedOpen: false,
        handlers: { onContextMenu: vi.fn(), onTouchStart: vi.fn(), onTouchEnd: vi.fn() },
    }),
}));

vi.mock('@/features/ai/hooks/useNodeGeneration', () => ({
    useNodeGeneration: () => ({ generateFromPrompt: vi.fn(), branchFromNode: vi.fn() }),
}));

vi.mock('../NodeUtilsBar', async () => {
    const React = await import('react');
    return {
        NodeUtilsBar: React.memo(React.forwardRef<HTMLDivElement>(function MockBar(_p, ref) {
            return <div ref={ref} data-testid="node-utils-bar" />;
        })),
    };
});

vi.mock('../NodeResizeButtons', () => ({ NodeResizeButtons: vi.fn(() => null) }));
vi.mock('../NodeHeading', () => ({ NodeHeading: vi.fn(() => <div>Heading</div>) }));
vi.mock('../NodeDivider', () => ({ NodeDivider: vi.fn(() => null) }));
vi.mock('../IdeaCardContent', () => ({
    EditingContent: vi.fn(() => null), GeneratingContent: vi.fn(() => null),
    AICardContent: vi.fn(() => null), SimpleCardContent: vi.fn(() => null),
    PlaceholderContent: vi.fn(() => null),
}));
vi.mock('@/features/tags', () => ({ TagInput: vi.fn(() => null) }));
vi.mock('@/features/canvas/hooks/usePanToNode', () => ({
    usePanToNode: () => ({ panToPosition: vi.fn() }),
}));

describe('IdeaCard - Pin prevents drag via noDragClassName', () => {
    beforeEach(() => { vi.clearAllMocks(); });

    it('pinned node wrapper has nodrag class', () => {
        const props = {
            id: 'pinned-1',
            data: { heading: 'Pinned', isPinned: true } as IdeaNodeData,
            selected: false,
        } as NodeProps;

        const { container } = render(<IdeaCard {...props} />);
        const cardWrapper = container.querySelector('[class*="cardWrapper"]') as HTMLElement;
        expect(cardWrapper.classList.contains('nodrag')).toBe(true);
    });

    it('unpinned node wrapper does not have nodrag class', () => {
        const props = {
            id: 'free-1',
            data: { heading: 'Free', isPinned: false } as IdeaNodeData,
            selected: false,
        } as NodeProps;

        const { container } = render(<IdeaCard {...props} />);
        const cardWrapper = container.querySelector('[class*="cardWrapper"]') as HTMLElement;
        expect(cardWrapper.classList.contains('nodrag')).toBe(false);
    });
});
