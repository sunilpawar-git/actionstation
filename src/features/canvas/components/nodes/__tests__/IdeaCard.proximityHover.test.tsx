/**
 * IdeaCard Proximity Hover Tests
 * Tests that useProximityBar sets DOM data attributes for bar visibility
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { IdeaCard } from '../IdeaCard';
import { PROXIMITY_THRESHOLD_PX } from '../../../hooks/useProximityBar';
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
        editor: null,
        getMarkdown: vi.fn(),
        setContent: vi.fn(),
        submitHandlerRef: { current: null },
    }),
}));

vi.mock('../../../hooks/useNodeInput', () => ({
    useNodeInput: () => ({
        isEditing: false,
        handleKeyDown: vi.fn(),
        handleDoubleClick: vi.fn(),
    }),
}));

vi.mock('../../../hooks/useNodeShortcuts', () => ({
    useNodeShortcuts: vi.fn(),
}));

vi.mock('../../../hooks/useIdeaCardActions', () => ({
    useIdeaCardActions: () => ({
        handleDelete: vi.fn(),
        handleRegenerate: vi.fn(),
        handleConnectClick: vi.fn(),
        handleTransform: vi.fn(),
        handleHeadingChange: vi.fn(),
        handleCopy: vi.fn(),
        handleTagsChange: vi.fn(),
        isTransforming: false,
    }),
}));

vi.mock('../../../hooks/useIdeaCardState', () => ({
    useIdeaCardState: () => ({
        getEditableContent: vi.fn(),
        saveContent: vi.fn(),
        placeholder: 'Test placeholder',
        onSubmitAI: vi.fn(),
    }),
}));

vi.mock('../../../hooks/useLinkPreviewRetry', () => ({
    useLinkPreviewRetry: vi.fn(),
}));

vi.mock('@/features/ai/hooks/useNodeGeneration', () => ({
    useNodeGeneration: () => ({
        generateFromPrompt: vi.fn(),
    }),
}));

vi.mock('../NodeUtilsBar', async () => {
    const React = await import('react');
    return {
        NodeUtilsBar: React.memo(React.forwardRef<HTMLDivElement>(function MockNodeUtilsBar(_props, ref) {
            return <div ref={ref} data-testid="node-utils-bar">Utils Bar</div>;
        })),
    };
});

vi.mock('../NodeResizeButtons', () => ({
    NodeResizeButtons: vi.fn(() => null),
}));

vi.mock('../NodeHeading', () => ({
    NodeHeading: vi.fn(() => <div>Heading</div>),
}));

vi.mock('../NodeDivider', () => ({
    NodeDivider: vi.fn(() => null),
}));

vi.mock('../IdeaCardContent', () => ({
    GeneratingContent: vi.fn(() => <div>Generating</div>),
}));

vi.mock('@/features/tags', () => ({
    TagInput: vi.fn(() => null),
}));

vi.mock('@/features/canvas/contexts/PanToNodeContext', () => ({
    usePanToNodeContext: () => ({ panToPosition: vi.fn() }),
}));

describe('IdeaCard - Proximity Hover (data-attribute driven)', () => {
    const mockNodeProps = {
        id: 'test-node',
        data: {
            heading: 'Test Node',
            output: 'Test output',
        } as IdeaNodeData,
        selected: false,
    } as NodeProps;

    beforeEach(() => {
        vi.useFakeTimers();
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('sets data-bar-proximity="near" when mouse is within PROXIMITY_THRESHOLD_PX of right edge', () => {
        const { container } = render(<IdeaCard {...mockNodeProps} />);
        const cardWrapper = container.querySelector('[class*="cardWrapper"]') as HTMLElement;

        const right = 500;
        vi.spyOn(cardWrapper, 'getBoundingClientRect').mockReturnValue({
            left: 100, right, top: 100, bottom: 300,
            width: 400, height: 200, x: 100, y: 100, toJSON: () => ({}),
        });

        fireEvent.mouseEnter(cardWrapper);
        // clientX within threshold: right - (threshold - 1) = just inside the zone
        fireEvent.mouseMove(cardWrapper, { clientX: right - (PROXIMITY_THRESHOLD_PX - 1), clientY: 200 });

        expect(cardWrapper.getAttribute('data-bar-proximity')).toBe('near');
    });

    it('removes data-bar-proximity when mouse moves outside PROXIMITY_THRESHOLD_PX', () => {
        const { container } = render(<IdeaCard {...mockNodeProps} />);
        const cardWrapper = container.querySelector('[class*="cardWrapper"]') as HTMLElement;

        const right = 500;
        vi.spyOn(cardWrapper, 'getBoundingClientRect').mockReturnValue({
            left: 100, right, top: 100, bottom: 300,
            width: 400, height: 200, x: 100, y: 100, toJSON: () => ({}),
        });

        fireEvent.mouseEnter(cardWrapper);
        // Move inside threshold
        fireEvent.mouseMove(cardWrapper, { clientX: right - (PROXIMITY_THRESHOLD_PX - 1), clientY: 200 });
        expect(cardWrapper.getAttribute('data-bar-proximity')).toBe('near');

        // Move outside threshold: right - (threshold + 1)
        fireEvent.mouseMove(cardWrapper, { clientX: right - (PROXIMITY_THRESHOLD_PX + 1), clientY: 200 });
        expect(cardWrapper.getAttribute('data-bar-proximity')).toBeNull();
    });

    it('sets data-hovered="true" on mouseenter', () => {
        const { container } = render(<IdeaCard {...mockNodeProps} />);
        const cardWrapper = container.querySelector('[class*="cardWrapper"]') as HTMLElement;

        fireEvent.mouseEnter(cardWrapper);
        expect(cardWrapper.getAttribute('data-hovered')).toBe('true');
    });

    it('removes data-hovered on mouseleave', () => {
        const { container } = render(<IdeaCard {...mockNodeProps} />);
        const cardWrapper = container.querySelector('[class*="cardWrapper"]') as HTMLElement;

        fireEvent.mouseEnter(cardWrapper);
        fireEvent.mouseLeave(cardWrapper);
        vi.advanceTimersByTime(300);
        expect(cardWrapper.getAttribute('data-hovered')).toBeNull();
    });

    it('sets data-bar-placement on mouseenter', () => {
        const { container } = render(<IdeaCard {...mockNodeProps} />);
        const cardWrapper = container.querySelector('[class*="cardWrapper"]') as HTMLElement;

        fireEvent.mouseEnter(cardWrapper);
        expect(cardWrapper.getAttribute('data-bar-placement')).toBe('right');
    });
});
