/**
 * TipTapEditor Component Tests
 * TDD: Validates the thin wrapper around TipTap's EditorContent
 * and the conditional BubbleMenu rendering
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { strings } from '@/shared/localization/strings';

vi.mock('@tiptap/react', async () => {
    const React = await import('react');
    return {
        EditorContent: React.forwardRef(function MockEditorContent(
            _props: Record<string, unknown>,
            _ref: React.Ref<HTMLDivElement>,
        ) {
            return React.createElement('div', { 'data-testid': 'editor-content' });
        }),
    };
});

vi.mock('@tiptap/react/menus', () => ({
    BubbleMenu: ({ children }: { editor: unknown; children: React.ReactNode }) => (
        <div data-testid="bubble-menu-wrapper">{children}</div>
    ),
}));

const { TipTapEditor } = await import('../TipTapEditor');

function createMockEditor(editable: boolean) {
    return {
        isEditable: editable,
        isActive: vi.fn(() => false),
        getAttributes: vi.fn(() => ({})),
        chain: vi.fn(() => ({
            focus: vi.fn(() => ({
                toggleBold: vi.fn(() => ({ run: vi.fn() })),
                toggleItalic: vi.fn(() => ({ run: vi.fn() })),
                toggleStrike: vi.fn(() => ({ run: vi.fn() })),
                toggleCode: vi.fn(() => ({ run: vi.fn() })),
            })),
        })),
    };
}

describe('TipTapEditor', () => {
    it('renders with data-testid when provided', () => {
        render(<TipTapEditor editor={null} data-testid="test-editor" />);
        expect(screen.getByTestId('test-editor')).toBeInTheDocument();
    });

    it('applies custom className', () => {
        render(<TipTapEditor editor={null} className="custom-class" data-testid="styled-editor" />);
        const wrapper = screen.getByTestId('styled-editor');
        expect(wrapper.className).toContain('custom-class');
    });

    it('renders without editor instance (null state)', () => {
        render(<TipTapEditor editor={null} data-testid="null-editor" />);
        expect(screen.getByTestId('null-editor')).toBeInTheDocument();
    });

    it('does not render BubbleMenu when editor is null', () => {
        render(<TipTapEditor editor={null} data-testid="no-bubble" />);
        expect(screen.queryByTestId('bubble-menu-wrapper')).not.toBeInTheDocument();
    });

    it('renders BubbleMenu with formatting buttons when editor is editable', () => {
        const editor = createMockEditor(true);
        render(<TipTapEditor editor={editor as never} isEditable={true} data-testid="editable" />);

        expect(screen.getByTestId('bubble-menu-wrapper')).toBeInTheDocument();
        expect(screen.getByLabelText(strings.formatting.bold)).toBeInTheDocument();
        expect(screen.getByLabelText(strings.formatting.italic)).toBeInTheDocument();
        expect(screen.getByLabelText(strings.formatting.strikethrough)).toBeInTheDocument();
        expect(screen.getByLabelText(strings.formatting.code)).toBeInTheDocument();
    });

    it('does not render BubbleMenu when editor is not editable', () => {
        const editor = createMockEditor(false);
        render(<TipTapEditor editor={editor as never} isEditable={false} data-testid="readonly" />);
        expect(screen.queryByTestId('bubble-menu-wrapper')).not.toBeInTheDocument();
    });
});
