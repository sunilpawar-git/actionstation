/**
 * Content Section Mindmap Integration Tests — TDD: Validates that
 * IdeaCardContentSection conditionally renders MindmapRenderer vs
 * TipTapEditor based on contentMode.
 *
 * Strategy: We mock TipTapEditor and MindmapRenderer to verify the
 * conditional rendering contract without needing real editor / markmap.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { strings } from '@/shared/localization/strings';

// ── Mocks ─────────────────────────────────────────────────────────────

vi.mock('../TipTapEditor', () => ({
    TipTapEditor: (props: Record<string, unknown>) => (
        <div data-testid={props['data-testid'] ?? 'mock-tiptap'}>TipTapEditor</div>
    ),
}));

vi.mock('../MindmapRenderer', () => ({
    MindmapRenderer: ({ markdown }: { markdown: string }) => (
        <div data-testid="mindmap-renderer">{`Mindmap:${markdown}`}</div>
    ),
}));

vi.mock('../IdeaCardContent', () => ({
    GeneratingContent: () => <div data-testid="generating-content">Generating…</div>,
}));

vi.mock('../LinkPreviewCard', () => ({
    LinkPreviewList: () => <div data-testid="link-preview-list" />,
}));

// eslint-disable-next-line import-x/first
import { IdeaCardContentSection, type IdeaCardContentSectionProps } from '../IdeaCardContentSection';

// ── Helpers ───────────────────────────────────────────────────────────

function makeProps(overrides: Partial<IdeaCardContentSectionProps> = {}): IdeaCardContentSectionProps {
    return {
        contentRef: { current: null },
        selected: false,
        isEditing: false,
        onKeyDown: undefined,
        isGenerating: false,
        hasContent: true,
        isAICard: false,
        heading: 'Test',
        prompt: '',
        editor: null,
        handleDoubleClick: vi.fn(),
        linkPreviews: {},
        ...overrides,
    };
}

// ── Tests ─────────────────────────────────────────────────────────────

describe('IdeaCardContentSection – mindmap integration', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders TipTapEditor when contentMode is undefined (backward compat)', () => {
        render(<IdeaCardContentSection {...makeProps()} />);
        expect(screen.getByText('TipTapEditor')).toBeInTheDocument();
        expect(screen.queryByTestId('mindmap-renderer')).not.toBeInTheDocument();
    });

    it('renders TipTapEditor when contentMode is "text"', () => {
        render(<IdeaCardContentSection {...makeProps({ contentMode: 'text' })} />);
        expect(screen.getByText('TipTapEditor')).toBeInTheDocument();
        expect(screen.queryByTestId('mindmap-renderer')).not.toBeInTheDocument();
    });

    it('renders MindmapRenderer when contentMode is "mindmap" and not editing', async () => {
        await act(async () => {
            render(
                <IdeaCardContentSection
                    {...makeProps({ contentMode: 'mindmap', output: '# Topic\n- item' })}
                />,
            );
        });
        const el = screen.getByTestId('mindmap-renderer');
        expect(el).toBeInTheDocument();
        expect(el.textContent).toBe('Mindmap:# Topic\n- item');
    });

    it('hides TipTapEditor wrapper when mindmap mode is active', async () => {
        let container!: HTMLElement;
        await act(async () => {
            const result = render(
                <IdeaCardContentSection
                    {...makeProps({ contentMode: 'mindmap', output: '# Test' })}
                />,
            );
            container = result.container;
        });
        // The TipTap wrapper div should have display: none
        const tiptapWrapper = container.querySelector('[style*="display: none"]');
        expect(tiptapWrapper).toBeInTheDocument();
    });

    it('shows TipTapEditor when contentMode is "mindmap" but isEditing', () => {
        render(
            <IdeaCardContentSection
                {...makeProps({ contentMode: 'mindmap', output: '# Topic', isEditing: true })}
            />,
        );
        // In editing mode, TipTapEditor should be visible (no hidden style)
        expect(screen.getByText('TipTapEditor')).toBeInTheDocument();
        // Mindmap should NOT render during editing
        expect(screen.queryByTestId('mindmap-renderer')).not.toBeInTheDocument();
    });

    it('does not render MindmapRenderer when isGenerating', () => {
        render(
            <IdeaCardContentSection
                {...makeProps({ contentMode: 'mindmap', output: '# Test', isGenerating: true })}
            />,
        );
        expect(screen.queryByTestId('mindmap-renderer')).not.toBeInTheDocument();
    });

    it('passes output markdown to MindmapRenderer', async () => {
        const md = '# Root\n- A\n- B';
        await act(async () => {
            render(
                <IdeaCardContentSection
                    {...makeProps({ contentMode: 'mindmap', output: md })}
                />,
            );
        });
        const el = screen.getByTestId('mindmap-renderer');
        expect(el.textContent).toBe(`Mindmap:${md}`);
    });

    it('passes empty string to MindmapRenderer when output is undefined', async () => {
        await act(async () => {
            render(
                <IdeaCardContentSection
                    {...makeProps({ contentMode: 'mindmap' })}
                />,
            );
        });
        expect(screen.getByText('Mindmap:')).toBeInTheDocument();
    });

    it('placeholder still renders in mindmap mode when hasContent is false', () => {
        render(
            <IdeaCardContentSection
                {...makeProps({ contentMode: 'mindmap', hasContent: false })}
            />,
        );
        expect(screen.getByText(strings.canvas.mindmap.emptyHint)).toBeInTheDocument();
    });
});
