/**
 * EditorBubbleMenu — Heading (font-size) button tests
 * TDD: RED phase — these tests must fail before the implementation.
 *
 * Adds H1 / H2 / H3 toggle buttons to the bubble menu so users can
 * increase or decrease the heading level of selected text inline.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { HeadingButtons } from '../HeadingButtons';
import { strings } from '@/shared/localization/strings';

// ---------------------------------------------------------------------------
// Mock editor factory
// ---------------------------------------------------------------------------

function createMockEditor(activeHeadingLevel: number | null = null) {
    const chain = {
        focus: vi.fn(() => chain),
        toggleHeading: vi.fn(() => chain),
        run: vi.fn(),
    };
    return {
        chain: vi.fn(() => chain),
        isActive: vi.fn((format: string, attrs?: Record<string, unknown>) => {
            if (format === 'heading' && attrs !== undefined && 'level' in attrs) {
                return attrs.level === activeHeadingLevel;
            }
            return false;
        }),
        _chain: chain,
    };
}

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

describe('HeadingButtons — render', () => {
    afterEach(cleanup);

    it('renders an H1 button with the correct aria-label', () => {
        render(<HeadingButtons editor={createMockEditor() as never} />);
        expect(screen.getByLabelText(strings.formatting.heading1)).toBeInTheDocument();
    });

    it('renders an H2 button', () => {
        render(<HeadingButtons editor={createMockEditor() as never} />);
        expect(screen.getByLabelText(strings.formatting.heading2)).toBeInTheDocument();
    });

    it('renders an H3 button', () => {
        render(<HeadingButtons editor={createMockEditor() as never} />);
        expect(screen.getByLabelText(strings.formatting.heading3)).toBeInTheDocument();
    });

    it('displays "H1", "H2", "H3" text content', () => {
        render(<HeadingButtons editor={createMockEditor() as never} />);
        expect(screen.getByLabelText(strings.formatting.heading1).textContent)
            .toBe(strings.formatting.heading1Display);
        expect(screen.getByLabelText(strings.formatting.heading2).textContent)
            .toBe(strings.formatting.heading2Display);
        expect(screen.getByLabelText(strings.formatting.heading3).textContent)
            .toBe(strings.formatting.heading3Display);
    });
});

// ---------------------------------------------------------------------------
// Interactions
// ---------------------------------------------------------------------------

describe('HeadingButtons — interactions', () => {
    afterEach(cleanup);

    it('mouseDown on H1 calls toggleHeading({ level: 1 })', () => {
        const editor = createMockEditor();
        render(<HeadingButtons editor={editor as never} />);
        fireEvent.mouseDown(screen.getByLabelText(strings.formatting.heading1));
        expect(editor.chain).toHaveBeenCalled();
        expect(editor._chain.focus).toHaveBeenCalled();
        expect(editor._chain.toggleHeading).toHaveBeenCalledWith({ level: 1 });
        expect(editor._chain.run).toHaveBeenCalled();
    });

    it('mouseDown on H2 calls toggleHeading({ level: 2 })', () => {
        const editor = createMockEditor();
        render(<HeadingButtons editor={editor as never} />);
        fireEvent.mouseDown(screen.getByLabelText(strings.formatting.heading2));
        expect(editor._chain.toggleHeading).toHaveBeenCalledWith({ level: 2 });
    });

    it('mouseDown on H3 calls toggleHeading({ level: 3 })', () => {
        const editor = createMockEditor();
        render(<HeadingButtons editor={editor as never} />);
        fireEvent.mouseDown(screen.getByLabelText(strings.formatting.heading3));
        expect(editor._chain.toggleHeading).toHaveBeenCalledWith({ level: 3 });
    });
});

// ---------------------------------------------------------------------------
// Active state
// ---------------------------------------------------------------------------

describe('HeadingButtons — active state', () => {
    afterEach(cleanup);

    it('applies active class to H2 when the selection is heading level 2', () => {
        const editor = createMockEditor(2);
        render(<HeadingButtons editor={editor as never} />);
        expect(screen.getByLabelText(strings.formatting.heading2).className)
            .toContain('active');
    });

    it('does not apply active class to H1 or H3 when H2 is active', () => {
        const editor = createMockEditor(2);
        render(<HeadingButtons editor={editor as never} />);
        expect(screen.getByLabelText(strings.formatting.heading1).className)
            .not.toContain('active');
        expect(screen.getByLabelText(strings.formatting.heading3).className)
            .not.toContain('active');
    });

    it('no button is active when the selection is plain paragraph text', () => {
        const editor = createMockEditor(null);
        render(<HeadingButtons editor={editor as never} />);
        for (const label of [
            strings.formatting.heading1,
            strings.formatting.heading2,
            strings.formatting.heading3,
        ]) {
            expect(screen.getByLabelText(label).className).not.toContain('active');
        }
    });
});
