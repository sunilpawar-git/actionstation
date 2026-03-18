/**
 * FontSizeButtons — bubble-menu A+ / A− component tests
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { FontSizeButtons } from '../FontSizeButtons';
import { strings } from '@/shared/localization/strings';
import { FONT_SIZE_STEPS } from '../../../extensions/fontSizeExtension';

// ─── Mock editor factory ──────────────────────────────────────────────────────

function createMockEditor(sizeAttr?: string) {
    const chain = {
        focus: vi.fn(function (this: typeof chain) { return this; }),
        increaseFontSize: vi.fn(function (this: typeof chain) { return this; }),
        decreaseFontSize: vi.fn(function (this: typeof chain) { return this; }),
        run: vi.fn(),
    };
    return {
        chain: vi.fn(() => chain),
        getAttributes: vi.fn((_name: string) => ({ size: sizeAttr })),
        _chain: chain,
    };
}

// ─── Render ───────────────────────────────────────────────────────────────────

describe('FontSizeButtons — render', () => {
    afterEach(cleanup);

    it('renders an A+ button with the correct aria-label', () => {
        render(<FontSizeButtons editor={createMockEditor() as never} />);
        expect(screen.getByLabelText(strings.formatting.fontSizeIncrease)).toBeInTheDocument();
    });

    it('renders an A− button with the correct aria-label', () => {
        render(<FontSizeButtons editor={createMockEditor() as never} />);
        expect(screen.getByLabelText(strings.formatting.fontSizeDecrease)).toBeInTheDocument();
    });

    it('A+ button displays the increase display string', () => {
        render(<FontSizeButtons editor={createMockEditor() as never} />);
        expect(screen.getByLabelText(strings.formatting.fontSizeIncrease).textContent)
            .toBe(strings.formatting.fontSizeIncreaseDisplay);
    });

    it('A− button displays the decrease display string', () => {
        render(<FontSizeButtons editor={createMockEditor() as never} />);
        expect(screen.getByLabelText(strings.formatting.fontSizeDecrease).textContent)
            .toBe(strings.formatting.fontSizeDecreaseDisplay);
    });
});

// ─── Boundary / disabled state ────────────────────────────────────────────────

describe('FontSizeButtons — boundary disabled state', () => {
    afterEach(cleanup);

    it('A+ is disabled when size is already at maximum', () => {
        const max = FONT_SIZE_STEPS[FONT_SIZE_STEPS.length - 1] as string;
        render(<FontSizeButtons editor={createMockEditor(max) as never} />);
        expect(screen.getByLabelText(strings.formatting.fontSizeIncrease)).toBeDisabled();
    });

    it('A− is disabled when size is already at minimum', () => {
        const min = FONT_SIZE_STEPS[0] as string;
        render(<FontSizeButtons editor={createMockEditor(min) as never} />);
        expect(screen.getByLabelText(strings.formatting.fontSizeDecrease)).toBeDisabled();
    });

    it('A+ is enabled at default (no size attribute)', () => {
        render(<FontSizeButtons editor={createMockEditor(undefined) as never} />);
        expect(screen.getByLabelText(strings.formatting.fontSizeIncrease)).not.toBeDisabled();
    });

    it('A− is enabled at default (no size attribute)', () => {
        render(<FontSizeButtons editor={createMockEditor(undefined) as never} />);
        expect(screen.getByLabelText(strings.formatting.fontSizeDecrease)).not.toBeDisabled();
    });

    it('both buttons are enabled at an intermediate step', () => {
        const mid = FONT_SIZE_STEPS[3] as string;
        render(<FontSizeButtons editor={createMockEditor(mid) as never} />);
        expect(screen.getByLabelText(strings.formatting.fontSizeIncrease)).not.toBeDisabled();
        expect(screen.getByLabelText(strings.formatting.fontSizeDecrease)).not.toBeDisabled();
    });
});

// ─── Interactions ─────────────────────────────────────────────────────────────

describe('FontSizeButtons — interactions', () => {
    afterEach(cleanup);

    it('mouseDown on A+ calls chain().focus().increaseFontSize().run()', () => {
        const editor = createMockEditor();
        render(<FontSizeButtons editor={editor as never} />);

        fireEvent.mouseDown(screen.getByLabelText(strings.formatting.fontSizeIncrease));

        expect(editor.chain).toHaveBeenCalled();
        expect(editor._chain.focus).toHaveBeenCalled();
        expect(editor._chain.increaseFontSize).toHaveBeenCalled();
        expect(editor._chain.run).toHaveBeenCalled();
    });

    it('mouseDown on A− calls chain().focus().decreaseFontSize().run()', () => {
        const editor = createMockEditor();
        render(<FontSizeButtons editor={editor as never} />);

        fireEvent.mouseDown(screen.getByLabelText(strings.formatting.fontSizeDecrease));

        expect(editor.chain).toHaveBeenCalled();
        expect(editor._chain.focus).toHaveBeenCalled();
        expect(editor._chain.decreaseFontSize).toHaveBeenCalled();
        expect(editor._chain.run).toHaveBeenCalled();
    });

    it('A+ does not trigger default browser behaviour (e.preventDefault called)', () => {
        const editor = createMockEditor();
        render(<FontSizeButtons editor={editor as never} />);

        const btn = screen.getByLabelText(strings.formatting.fontSizeIncrease);
        const event = new MouseEvent('mousedown', { bubbles: true, cancelable: true });
        const spy = vi.spyOn(event, 'preventDefault');
        btn.dispatchEvent(event);
        expect(spy).toHaveBeenCalled();
    });
});
