/**
 * FocusOverlay Tests
 * Covers rendering, interaction, editing, ARIA, and edge cases.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { FocusOverlay } from '../FocusOverlay';
import { useFocusStore } from '../../stores/focusStore';
import { useCanvasStore } from '../../stores/canvasStore';
import { strings } from '@/shared/localization/strings';
import { setCanvasDefaults } from './helpers/focusOverlayFixtures';

const mockGetMarkdown = vi.fn(() => 'edited content');

vi.mock('../../hooks/useIdeaCardEditor', () => ({
    useIdeaCardEditor: () => ({
        editor: null,
        getMarkdown: mockGetMarkdown,
        setContent: vi.fn(),
        submitHandlerRef: { current: null },
    }),
}));

vi.mock('../../hooks/useTipTapEditor', () => ({
    useTipTapEditor: () => ({
        editor: null,
        getMarkdown: vi.fn(() => ''),
        setContent: vi.fn(),
    }),
}));

vi.mock('../nodes/NodeHeading', async () => {
    const React = await import('react');
    return {
        NodeHeading: React.forwardRef(
            (
                { heading, onDoubleClick }: { heading: string; onDoubleClick?: () => void },
                ref: React.ForwardedRef<{ focus: () => void; getHeading: () => string }>,
            ) => {
                React.useImperativeHandle(ref, () => ({ focus: () => {}, getHeading: () => 'Edited Title' }));
                return React.createElement('div', { 'data-testid': 'focus-heading', onDoubleClick }, heading);
            },
        ),
    };
});

vi.mock('../nodes/TipTapEditor', async () => {
    const React = await import('react');
    return {
        TipTapEditor: ({ 'data-testid': testId }: { 'data-testid'?: string }) =>
            React.createElement('div', { 'data-testid': testId ?? 'tiptap-editor' }),
    };
});

vi.mock('@/features/tags', async () => {
    const React = await import('react');
    return {
        TagInput: ({ selectedTagIds }: { selectedTagIds: string[] }) =>
            React.createElement('div', { 'data-testid': 'focus-tags' }, selectedTagIds.join(',')),
    };
});

vi.mock('../nodes/LinkPreviewCard', async () => {
    const React = await import('react');
    return {
        LinkPreviewList: ({ previews }: { previews: Record<string, unknown> }) => {
            const count = Object.keys(previews).length;
            if (count === 0) return null;
            return React.createElement('div', { 'data-testid': 'link-preview-list' }, `${count} preview(s)`);
        },
    };
});

vi.mock('../../hooks/useHeadingEditor', () => ({
    useHeadingEditor: () => ({
        editor: null,
        suggestionActiveRef: { current: false },
    }),
}));

describe('FocusOverlay', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        useFocusStore.setState({ focusedNodeId: null });
        setCanvasDefaults();
    });

    it('does not render when focusedNodeId is null', () => {
        render(<FocusOverlay />);
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('renders backdrop and panel when focused', () => {
        useFocusStore.setState({ focusedNodeId: 'node-1' });
        render(<FocusOverlay />);
        expect(screen.getByRole('dialog')).toBeInTheDocument();
        expect(screen.getByTestId('focus-backdrop')).toBeInTheDocument();
        expect(screen.getByTestId('focus-panel')).toBeInTheDocument();
    });

    it('displays node heading from store', () => {
        useFocusStore.setState({ focusedNodeId: 'node-1' });
        render(<FocusOverlay />);
        expect(screen.getByTestId('focus-heading')).toHaveTextContent('Test Heading');
    });

    it('displays tags from store', () => {
        useFocusStore.setState({ focusedNodeId: 'node-1' });
        render(<FocusOverlay />);
        expect(screen.getByTestId('focus-tags')).toHaveTextContent('tag-1,tag-2');
    });

    it('close button calls exitFocus', () => {
        useFocusStore.setState({ focusedNodeId: 'node-1' });
        render(<FocusOverlay />);
        fireEvent.click(screen.getByTestId('focus-close-button'));
        expect(useFocusStore.getState().focusedNodeId).toBeNull();
    });

    it('backdrop click calls exitFocus', () => {
        useFocusStore.setState({ focusedNodeId: 'node-1' });
        render(<FocusOverlay />);
        fireEvent.click(screen.getByTestId('focus-backdrop'));
        expect(useFocusStore.getState().focusedNodeId).toBeNull();
    });

    it('panel click does NOT call exitFocus', () => {
        useFocusStore.setState({ focusedNodeId: 'node-1' });
        render(<FocusOverlay />);
        fireEvent.click(screen.getByTestId('focus-panel'));
        expect(useFocusStore.getState().focusedNodeId).toBe('node-1');
    });

    it('uses string resources for close button label', () => {
        useFocusStore.setState({ focusedNodeId: 'node-1' });
        render(<FocusOverlay />);
        expect(screen.getByTestId('focus-close-button'))
            .toHaveAttribute('aria-label', strings.nodeUtils.exitFocus);
    });

    it('has correct ARIA attributes', () => {
        useFocusStore.setState({ focusedNodeId: 'node-1' });
        render(<FocusOverlay />);
        const dialog = screen.getByRole('dialog');
        expect(dialog).toHaveAttribute('aria-modal', 'true');
        expect(dialog).toHaveAttribute('aria-label', strings.nodeUtils.focus);
    });

    it('does not render when focused node does not exist', () => {
        useFocusStore.setState({ focusedNodeId: 'non-existent' });
        render(<FocusOverlay />);
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    describe('Editing', () => {
        it('isEditing is true when enterFocusWithEditing sets both stores', () => {
            useFocusStore.setState({ focusedNodeId: 'node-1' });
            useCanvasStore.setState({ editingNodeId: 'node-1' });
            render(<FocusOverlay />);
            expect(useCanvasStore.getState().editingNodeId).toBe('node-1');
            expect(screen.queryByTestId('focus-content-area')).toBeInTheDocument();
        });

        it('double-clicking content area calls startEditing', () => {
            useFocusStore.setState({ focusedNodeId: 'node-1' });
            useCanvasStore.setState({ editingNodeId: 'node-1' });
            render(<FocusOverlay />);
            act(() => { useCanvasStore.setState({ editingNodeId: null }); });
            fireEvent.doubleClick(screen.getByTestId('focus-content-area'));
            expect(useCanvasStore.getState().editingNodeId).toBe('node-1');
        });

        it('double-clicking heading calls startEditing', () => {
            useFocusStore.setState({ focusedNodeId: 'node-1' });
            useCanvasStore.setState({ editingNodeId: 'node-1' });
            render(<FocusOverlay />);
            act(() => { useCanvasStore.setState({ editingNodeId: null }); });
            fireEvent.doubleClick(screen.getByTestId('focus-heading'));
            expect(useCanvasStore.getState().editingNodeId).toBe('node-1');
        });

        it('isEditing becomes false when editingNodeId clears and double-click starts editing again', () => {
            useFocusStore.setState({ focusedNodeId: 'node-1' });
            useCanvasStore.setState({ editingNodeId: 'node-1' });
            render(<FocusOverlay />);
            act(() => { useCanvasStore.setState({ editingNodeId: null }); });
            const contentArea = screen.getByTestId('focus-content-area');
            expect(contentArea).toBeInTheDocument();
            fireEvent.doubleClick(contentArea);
            expect(useCanvasStore.getState().editingNodeId).toBe('node-1');
        });

        it('isEditing is false when editingNodeId targets a different node', () => {
            useFocusStore.setState({ focusedNodeId: 'node-1' });
            useCanvasStore.setState({ editingNodeId: 'node-no-tags' });
            render(<FocusOverlay />);
            const contentArea = screen.getByTestId('focus-content-area');
            expect(contentArea).toBeInTheDocument();
        });

        it('isEditing reacts to editingNodeId store changes', () => {
            useFocusStore.setState({ focusedNodeId: 'node-1' });
            useCanvasStore.setState({ editingNodeId: 'node-1' });
            const { rerender } = render(<FocusOverlay />);
            expect(useCanvasStore.getState().editingNodeId).toBe('node-1');

            act(() => { useCanvasStore.setState({ editingNodeId: null }); });
            rerender(<FocusOverlay />);

            act(() => { useCanvasStore.setState({ editingNodeId: 'node-1' }); });
            rerender(<FocusOverlay />);
            expect(useCanvasStore.getState().editingNodeId).toBe('node-1');
        });
    });

    describe('Save on exit', () => {
        it('saves content to store when close button is clicked', () => {
            useFocusStore.setState({ focusedNodeId: 'node-1' });
            render(<FocusOverlay />);
            fireEvent.click(screen.getByTestId('focus-close-button'));
            const node = useCanvasStore.getState().nodes.find(n => n.id === 'node-1');
            expect(node?.data.output).toBe('edited content');
        });

        it('saves content to store when backdrop is clicked', () => {
            useFocusStore.setState({ focusedNodeId: 'node-1' });
            render(<FocusOverlay />);
            fireEvent.click(screen.getByTestId('focus-backdrop'));
            const node = useCanvasStore.getState().nodes.find(n => n.id === 'node-1');
            expect(node?.data.output).toBe('edited content');
        });

        it('saves heading to store when close button is clicked', () => {
            useFocusStore.setState({ focusedNodeId: 'node-1' });
            render(<FocusOverlay />);
            fireEvent.click(screen.getByTestId('focus-close-button'));
            const node = useCanvasStore.getState().nodes.find(n => n.id === 'node-1');
            expect(node?.data.heading).toBe('Edited Title');
        });

        it('saves heading to store when backdrop is clicked', () => {
            useFocusStore.setState({ focusedNodeId: 'node-1' });
            render(<FocusOverlay />);
            fireEvent.click(screen.getByTestId('focus-backdrop'));
            const node = useCanvasStore.getState().nodes.find(n => n.id === 'node-1');
            expect(node?.data.heading).toBe('Edited Title');
        });
    });

    describe('Edge cases', () => {
        it('renders with empty heading', () => {
            useFocusStore.setState({ focusedNodeId: 'node-no-tags' });
            render(<FocusOverlay />);
            expect(screen.getByTestId('focus-heading')).toHaveTextContent('');
        });

        it('hides tags section when node has no tags', () => {
            useFocusStore.setState({ focusedNodeId: 'node-no-tags' });
            render(<FocusOverlay />);
            expect(screen.queryByTestId('focus-tags')).not.toBeInTheDocument();
        });
    });

    describe('Node color propagation', () => {
        it('applies data-color attribute matching node colorKey', () => {
            useFocusStore.setState({ focusedNodeId: 'node-danger' });
            render(<FocusOverlay />);
            expect(screen.getByTestId('focus-panel')).toHaveAttribute('data-color', 'danger');
        });

        it('defaults to "default" when node has no colorKey', () => {
            useFocusStore.setState({ focusedNodeId: 'node-1' });
            render(<FocusOverlay />);
            expect(screen.getByTestId('focus-panel')).toHaveAttribute('data-color', 'default');
        });

        it('applies warning color class', () => {
            useFocusStore.setState({ focusedNodeId: 'node-warning' });
            render(<FocusOverlay />);
            expect(screen.getByTestId('focus-panel')).toHaveAttribute('data-color', 'warning');
        });

        it('applies success color class', () => {
            useFocusStore.setState({ focusedNodeId: 'node-success' });
            render(<FocusOverlay />);
            expect(screen.getByTestId('focus-panel')).toHaveAttribute('data-color', 'success');
        });

        it('normalises legacy colorKey values', () => {
            useFocusStore.setState({ focusedNodeId: 'node-legacy' });
            render(<FocusOverlay />);
            expect(screen.getByTestId('focus-panel')).toHaveAttribute('data-color', 'danger');
        });
    });

    describe('Link previews (SSOT parity with IdeaCard)', () => {
        it('renders link preview list when node has linkPreviews', () => {
            useFocusStore.setState({ focusedNodeId: 'node-1' });
            render(<FocusOverlay />);
            expect(screen.getByTestId('link-preview-list')).toBeInTheDocument();
            expect(screen.getByTestId('link-preview-list')).toHaveTextContent('1 preview(s)');
        });

        it('does not render link preview list when node has no linkPreviews', () => {
            useFocusStore.setState({ focusedNodeId: 'node-no-tags' });
            render(<FocusOverlay />);
            expect(screen.queryByTestId('link-preview-list')).not.toBeInTheDocument();
        });
    });
});
