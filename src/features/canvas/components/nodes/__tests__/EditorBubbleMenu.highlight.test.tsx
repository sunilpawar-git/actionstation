/**
 * EditorBubbleMenu — Highlight swatch tests
 * TDD: RED phase — these tests must fail before implementation
 *
 * Covers:
 *  - Bubble menu renders a highlight section with 5 color swatches
 *  - Each swatch has an accessible aria-label
 *  - Clicking a swatch calls toggleHighlight with the correct CSS variable
 *  - Clicking an active swatch removes the highlight (toggle off)
 *  - Active swatch gets the `highlightActive` class
 *  - A "remove highlight" button exists and clears all highlights
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { EditorBubbleMenu } from '../EditorBubbleMenu';
import { strings } from '@/shared/localization/strings';

function createMockEditor(overrides: Record<string, boolean | { color: string }> = {}) {
    const runFn = vi.fn();
    const chain = {
        focus: vi.fn(() => chain),
        toggleBold: vi.fn(() => chain),
        toggleHighlight: vi.fn(() => chain),
        unsetHighlight: vi.fn(() => chain),
        run: runFn,
    };
    return {
        chain: vi.fn(() => chain),
        isActive: vi.fn((format: string, attrs?: Record<string, unknown>) => {
            if (attrs !== undefined && 'color' in attrs) {
                const key = `highlight-${String(attrs.color)}`;
                const val = overrides[key];
                return typeof val === 'boolean' ? val : false;
            }
            const val = overrides[format];
            return typeof val === 'boolean' ? val : false;
        }),
        getAttributes: vi.fn(() => ({})),
        _chain: chain,
        _run: runFn,
    };
}

vi.mock('@tiptap/react/menus', () => ({
    BubbleMenu: ({ children }: { editor: unknown; children: React.ReactNode }) => (
        <div data-testid="bubble-menu-wrapper">{children}</div>
    ),
}));

const SWATCH_COLORS = [
    { key: 'yellow', label: () => strings.formatting.highlightYellow },
    { key: 'green', label: () => strings.formatting.highlightGreen },
    { key: 'blue', label: () => strings.formatting.highlightBlue },
    { key: 'pink', label: () => strings.formatting.highlightPink },
    { key: 'purple', label: () => strings.formatting.highlightPurple },
] as const;

describe('EditorBubbleMenu — highlight swatches', () => {
    beforeEach(() => { vi.clearAllMocks(); });

    it('renders exactly 5 highlight color swatches', () => {
        const editor = createMockEditor();
        render(<EditorBubbleMenu editor={editor as never} />);

        // Each swatch must have its aria-label
        for (const { label } of SWATCH_COLORS) {
            expect(screen.getByLabelText(label())).toBeInTheDocument();
        }
    });

    it('renders the highlight section label / aria region', () => {
        const editor = createMockEditor();
        render(<EditorBubbleMenu editor={editor as never} />);
        // Accessible group for screen-reader orientation
        expect(screen.getByRole('group', { name: strings.formatting.highlight })).toBeInTheDocument();
    });

    it('calls toggleHighlight with CSS variable color on yellow swatch mouseDown', () => {
        const editor = createMockEditor();
        render(<EditorBubbleMenu editor={editor as never} />);

        fireEvent.mouseDown(screen.getByLabelText(strings.formatting.highlightYellow));

        expect(editor.chain).toHaveBeenCalled();
        expect(editor._chain.focus).toHaveBeenCalled();
        expect(editor._chain.toggleHighlight).toHaveBeenCalledWith({ color: 'var(--highlight-yellow)' });
        expect(editor._run).toHaveBeenCalled();
    });

    it('calls toggleHighlight with correct variable for each swatch color', () => {
        const colorVarMap: Record<string, string> = {
            yellow: 'var(--highlight-yellow)',
            green: 'var(--highlight-green)',
            blue: 'var(--highlight-blue)',
            pink: 'var(--highlight-pink)',
            purple: 'var(--highlight-purple)',
        };

        for (const { key, label } of SWATCH_COLORS) {
            const editor = createMockEditor();
            render(<EditorBubbleMenu editor={editor as never} />);
            fireEvent.mouseDown(screen.getByLabelText(label()));
            expect(editor._chain.toggleHighlight).toHaveBeenCalledWith({ color: colorVarMap[key] });
            vi.clearAllMocks();
            cleanup();
        }
    });

    it('applies active CSS class to a swatch when that highlight color is active', () => {
        const editor = createMockEditor({
            'highlight-var(--highlight-yellow)': true,
        });
        render(<EditorBubbleMenu editor={editor as never} />);

        const yellowSwatch = screen.getByLabelText(strings.formatting.highlightYellow);
        expect(yellowSwatch.className).toContain('active');
    });

    it('does not apply active class to inactive swatches', () => {
        const editor = createMockEditor();
        render(<EditorBubbleMenu editor={editor as never} />);

        for (const { label } of SWATCH_COLORS) {
            expect(screen.getByLabelText(label()).className).not.toContain('active');
        }
    });

    it('renders a remove-highlight button to clear all highlight marks', () => {
        const editor = createMockEditor();
        render(<EditorBubbleMenu editor={editor as never} />);
        expect(screen.getByLabelText(strings.formatting.removeHighlight)).toBeInTheDocument();
    });

    it('calls unsetHighlight on remove-highlight button mouseDown', () => {
        const editor = createMockEditor();
        render(<EditorBubbleMenu editor={editor as never} />);

        fireEvent.mouseDown(screen.getByLabelText(strings.formatting.removeHighlight));
        expect(editor._chain.unsetHighlight).toHaveBeenCalled();
        expect(editor._run).toHaveBeenCalled();
    });

    it('prevents default and stops propagation on swatch mouseDown to preserve selection', () => {
        const editor = createMockEditor();
        render(<EditorBubbleMenu editor={editor as never} />);

        const swatch = screen.getByLabelText(strings.formatting.highlightYellow);
        const event = new MouseEvent('mousedown', { bubbles: true, cancelable: true });
        const preventSpy = vi.spyOn(event, 'preventDefault');
        const stopSpy = vi.spyOn(event, 'stopPropagation');
        swatch.dispatchEvent(event);

        expect(preventSpy).toHaveBeenCalled();
        expect(stopSpy).toHaveBeenCalled();
    });
});
