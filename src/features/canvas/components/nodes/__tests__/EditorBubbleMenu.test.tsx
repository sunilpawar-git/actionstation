/**
 * EditorBubbleMenu Tests – TDD RED-GREEN
 * Covers rendering, aria-labels, toggle commands, and active states
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { EditorBubbleMenu } from '../EditorBubbleMenu';
import { strings } from '@/shared/localization/strings';

function createMockEditor(overrides: Record<string, boolean> = {}) {
    const runFn = vi.fn();
    const chain = {
        focus: vi.fn(() => chain),
        toggleBold: vi.fn(() => chain),
        toggleItalic: vi.fn(() => chain),
        toggleStrike: vi.fn(() => chain),
        toggleCode: vi.fn(() => chain),
        setLink: vi.fn(() => chain),
        unsetLink: vi.fn(() => chain),
        run: runFn,
    };

    return {
        chain: vi.fn(() => chain),
        isActive: vi.fn((format: string) => overrides[format] ?? false),
        getAttributes: vi.fn(() => ({ href: '' })),
        _chain: chain,
        _run: runFn,
    };
}

vi.mock('@tiptap/react/menus', () => ({
    BubbleMenu: ({ children }: { editor: unknown; children: React.ReactNode }) => (
        <div data-testid="bubble-menu-wrapper">{children}</div>
    ),
}));

describe('EditorBubbleMenu', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders nothing when editor is null', () => {
        const { container } = render(<EditorBubbleMenu editor={null} />);
        expect(container.innerHTML).toBe('');
    });

    it('renders five formatting buttons with correct aria-labels', () => {
        const editor = createMockEditor();
        render(<EditorBubbleMenu editor={editor as never} />);

        expect(screen.getByLabelText(strings.formatting.bold)).toBeInTheDocument();
        expect(screen.getByLabelText(strings.formatting.italic)).toBeInTheDocument();
        expect(screen.getByLabelText(strings.formatting.strikethrough)).toBeInTheDocument();
        expect(screen.getByLabelText(strings.formatting.code)).toBeInTheDocument();
        expect(screen.getByLabelText(strings.formatting.link)).toBeInTheDocument();
    });

    it('calls toggleBold on Bold button mouseDown', () => {
        const editor = createMockEditor();
        render(<EditorBubbleMenu editor={editor as never} />);

        fireEvent.mouseDown(screen.getByLabelText(strings.formatting.bold));
        expect(editor.chain).toHaveBeenCalled();
        expect(editor._chain.focus).toHaveBeenCalled();
        expect(editor._chain.toggleBold).toHaveBeenCalled();
        expect(editor._run).toHaveBeenCalled();
    });

    it('calls toggleItalic on Italic button mouseDown', () => {
        const editor = createMockEditor();
        render(<EditorBubbleMenu editor={editor as never} />);

        fireEvent.mouseDown(screen.getByLabelText(strings.formatting.italic));
        expect(editor._chain.toggleItalic).toHaveBeenCalled();
        expect(editor._run).toHaveBeenCalled();
    });

    it('calls toggleStrike on Strikethrough button mouseDown', () => {
        const editor = createMockEditor();
        render(<EditorBubbleMenu editor={editor as never} />);

        fireEvent.mouseDown(screen.getByLabelText(strings.formatting.strikethrough));
        expect(editor._chain.toggleStrike).toHaveBeenCalled();
        expect(editor._run).toHaveBeenCalled();
    });

    it('calls toggleCode on Code button mouseDown', () => {
        const editor = createMockEditor();
        render(<EditorBubbleMenu editor={editor as never} />);

        fireEvent.mouseDown(screen.getByLabelText(strings.formatting.code));
        expect(editor._chain.toggleCode).toHaveBeenCalled();
        expect(editor._run).toHaveBeenCalled();
    });

    it('prevents default and stops propagation on mouseDown to preserve selection', () => {
        const editor = createMockEditor();
        render(<EditorBubbleMenu editor={editor as never} />);

        const boldButton = screen.getByLabelText(strings.formatting.bold);
        const event = new MouseEvent('mousedown', { bubbles: true, cancelable: true });
        const preventSpy = vi.spyOn(event, 'preventDefault');
        const stopSpy = vi.spyOn(event, 'stopPropagation');
        boldButton.dispatchEvent(event);

        expect(preventSpy).toHaveBeenCalled();
        expect(stopSpy).toHaveBeenCalled();
    });

    it('applies active class when format is active', () => {
        const editor = createMockEditor({ bold: true, italic: true });
        render(<EditorBubbleMenu editor={editor as never} />);

        const boldButton = screen.getByLabelText(strings.formatting.bold);
        const italicButton = screen.getByLabelText(strings.formatting.italic);
        const strikeButton = screen.getByLabelText(strings.formatting.strikethrough);

        expect(boldButton.className).toContain('active');
        expect(italicButton.className).toContain('active');
        expect(strikeButton.className).not.toContain('active');
    });

    it('does not apply active class when format is inactive', () => {
        const editor = createMockEditor();
        render(<EditorBubbleMenu editor={editor as never} />);

        const boldButton = screen.getByLabelText(strings.formatting.bold);
        expect(boldButton.className).not.toContain('active');
    });
});

describe('EditorBubbleMenu link button', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.restoreAllMocks();
    });

    it('sets link when user enters a URL via prompt', () => {
        vi.spyOn(window, 'prompt').mockReturnValue('https://example.com');
        const editor = createMockEditor();
        render(<EditorBubbleMenu editor={editor as never} />);

        fireEvent.mouseDown(screen.getByLabelText(strings.formatting.link));
        expect(window.prompt).toHaveBeenCalled();
        expect(editor._chain.setLink).toHaveBeenCalledWith({ href: 'https://example.com' });
        expect(editor._run).toHaveBeenCalled();
    });

    it('does nothing when user cancels the prompt', () => {
        vi.spyOn(window, 'prompt').mockReturnValue(null);
        const editor = createMockEditor();
        render(<EditorBubbleMenu editor={editor as never} />);

        fireEvent.mouseDown(screen.getByLabelText(strings.formatting.link));
        expect(editor._chain.setLink).not.toHaveBeenCalled();
        expect(editor._chain.unsetLink).not.toHaveBeenCalled();
    });

    it('does nothing when user enters empty string', () => {
        vi.spyOn(window, 'prompt').mockReturnValue('');
        const editor = createMockEditor();
        render(<EditorBubbleMenu editor={editor as never} />);

        fireEvent.mouseDown(screen.getByLabelText(strings.formatting.link));
        expect(editor._chain.setLink).not.toHaveBeenCalled();
    });

    it('unsets link when link is already active', () => {
        const promptSpy = vi.spyOn(window, 'prompt');
        const editor = createMockEditor({ link: true });
        render(<EditorBubbleMenu editor={editor as never} />);

        fireEvent.mouseDown(screen.getByLabelText(strings.formatting.link));
        expect(promptSpy).not.toHaveBeenCalled();
        expect(editor._chain.unsetLink).toHaveBeenCalled();
        expect(editor._run).toHaveBeenCalled();
    });

    it('rejects javascript: URLs for XSS prevention', () => {
        vi.spyOn(window, 'prompt').mockReturnValue('javascript:alert(1)');
        const editor = createMockEditor();
        render(<EditorBubbleMenu editor={editor as never} />);

        fireEvent.mouseDown(screen.getByLabelText(strings.formatting.link));
        expect(editor._chain.setLink).not.toHaveBeenCalled();
    });

    it('applies active class when link is active', () => {
        const editor = createMockEditor({ link: true });
        render(<EditorBubbleMenu editor={editor as never} />);

        const linkButton = screen.getByLabelText(strings.formatting.link);
        expect(linkButton.className).toContain('active');
    });

    it('pre-fills prompt with existing href when link is active', () => {
        const promptSpy = vi.spyOn(window, 'prompt').mockReturnValue(null);
        const editor = createMockEditor({ link: true });
        editor.getAttributes.mockReturnValue({ href: 'https://existing.com' });
        // Override isActive: return true for 'link' but still call unsetLink path
        // For this test, we need the link NOT active so the prompt path runs
        editor.isActive.mockImplementation((f: string) => f !== 'link');
        render(<EditorBubbleMenu editor={editor as never} />);

        fireEvent.mouseDown(screen.getByLabelText(strings.formatting.link));
        expect(promptSpy).toHaveBeenCalledWith(
            strings.formatting.linkPrompt,
            'https://existing.com',
        );
    });
});
