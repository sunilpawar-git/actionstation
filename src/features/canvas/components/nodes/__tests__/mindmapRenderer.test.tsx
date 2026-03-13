/**
 * MindmapRenderer Tests — TDD: Validates rendering, pointer isolation,
 * accessibility, empty/error handling, and cleanup lifecycle.
 *
 * Strategy: markmap-view requires a real DOM (SVG operations). We mock
 * the Markmap class and Transformer to verify the component's integration
 * contract without requiring a full browser SVG engine.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { strings } from '@/shared/localization/strings';
import { MindmapRenderer } from '../MindmapRenderer';

// ── Mocks (hoisted to avoid "Cannot access before initialization") ───
const { mockSetData, mockFit, mockDestroy, mockTransform, mockCreate } = vi.hoisted(() => {
    const mockFit = vi.fn().mockResolvedValue(undefined);
    const mockSetData = vi.fn().mockResolvedValue(undefined);
    const mockDestroy = vi.fn();
    const mockTransform = vi.fn().mockReturnValue({
        root: { content: 'Topic', children: [] },
    });
    const mockCreate = vi.fn().mockReturnValue({
        setData: mockSetData,
        fit: mockFit,
        destroy: mockDestroy,
    });
    return { mockSetData, mockFit, mockDestroy, mockTransform, mockCreate };
});

vi.mock('markmap-lib', () => ({
    Transformer: vi.fn().mockImplementation(() => ({
        transform: mockTransform,
    })),
}));

vi.mock('markmap-view', () => ({
    Markmap: { create: mockCreate },
    deriveOptions: vi.fn().mockReturnValue({}),
}));

describe('MindmapRenderer', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // jsdom does not implement ResizeObserver — stub it so the useEffect doesn't throw
        vi.stubGlobal(
            'ResizeObserver',
            vi.fn(() => ({ observe: vi.fn(), disconnect: vi.fn() })),
        );
    });

    it('renders an SVG element', () => {
        const { container } = render(
            <MindmapRenderer markdown="# Topic" />,
        );
        const svg = container.querySelector('svg');
        expect(svg).toBeInTheDocument();
    });

    it('sets aria-label for accessibility on container and SVG', () => {
        render(<MindmapRenderer markdown="# Topic" />);
        const elements = screen.getAllByLabelText(strings.canvas.mindmap.ariaLabel);
        expect(elements.length).toBeGreaterThanOrEqual(1);
        expect(screen.getByTestId('mindmap-renderer')).toHaveAttribute('aria-label', strings.canvas.mindmap.ariaLabel);
    });

    it('has data-testid for test targeting', () => {
        render(<MindmapRenderer markdown="# Topic" />);
        expect(screen.getByTestId('mindmap-renderer')).toBeInTheDocument();
    });

    it('calls Markmap.create on mount', () => {
        render(<MindmapRenderer markdown="# Topic" />);
        expect(mockCreate).toHaveBeenCalledTimes(1);
    });

    it('calls setData with transformed root', () => {
        render(<MindmapRenderer markdown="# Topic" />);
        expect(mockSetData).toHaveBeenCalledWith(
            expect.objectContaining({ content: 'Topic' }),
        );
    });

    it('calls fit after setData', async () => {
        render(<MindmapRenderer markdown="# Topic" />);
        await waitFor(() => {
            expect(mockFit).toHaveBeenCalled();
        });
    });

    it('calls destroy on unmount (cleanup)', () => {
        const { unmount } = render(
            <MindmapRenderer markdown="# Topic" />,
        );
        unmount();
        expect(mockDestroy).toHaveBeenCalledTimes(1);
    });

    describe('pointer isolation (prevents ReactFlow canvas drag/zoom)', () => {
        it('stops pointerDown propagation', () => {
            render(<MindmapRenderer markdown="# Topic" />);
            const container = screen.getByTestId('mindmap-renderer');
            // jsdom lacks PointerEvent — use MouseEvent with the pointer event name
            const event = new MouseEvent('pointerdown', { bubbles: true });
            const stopSpy = vi.spyOn(event, 'stopPropagation');
            container.dispatchEvent(event);
            expect(stopSpy).toHaveBeenCalled();
        });

        it('stops wheel propagation', () => {
            render(<MindmapRenderer markdown="# Topic" />);
            const container = screen.getByTestId('mindmap-renderer');
            const event = new WheelEvent('wheel', { bubbles: true });
            const stopSpy = vi.spyOn(event, 'stopPropagation');
            container.dispatchEvent(event);
            expect(stopSpy).toHaveBeenCalled();
        });

        it('focuses nearest [tabindex="0"] ancestor on pointerDown so Escape reaches the canvas', () => {
            // Regression test: clicking a mindmap node must route keyboard focus
            // to the card's contentArea div so Escape can bubble to document
            // and trigger useEscapeLayer's clearSelection handler.
            const focusSpy = vi.fn();
            const { container: wrapper } = render(
                <div tabIndex={0} onFocus={focusSpy}>
                    <MindmapRenderer markdown="# Topic" />
                </div>,
            );
            // Attach a spy to the focusable ancestor's focus method
            const focusable = wrapper.querySelector<HTMLElement>('[tabindex="0"]')!;
            const focusMethod = vi.spyOn(focusable, 'focus');

            const mindmapContainer = screen.getByTestId('mindmap-renderer');
            const event = new MouseEvent('pointerdown', { bubbles: true });
            mindmapContainer.dispatchEvent(event);

            // The nearest [tabindex="0"] ancestor should have received .focus()
            expect(focusMethod).toHaveBeenCalledWith({ preventScroll: true });
        });
    });

    describe('empty / fallback handling', () => {
        it('transforms empty markdown with fallback string', () => {
            render(<MindmapRenderer markdown="" />);
            expect(mockTransform).toHaveBeenCalledWith(
                expect.stringContaining(strings.canvas.mindmap.emptyFallback),
            );
        });
    });

    describe('theme-aware text color (dark mode fix)', () => {
        it('passes a style function to Markmap.create', () => {
            render(<MindmapRenderer markdown="# Topic" />);
            const [, options] = mockCreate.mock.calls[0] as [unknown, Record<string, unknown>];
            expect(typeof options.style).toBe('function');
        });

        it('style function returns CSS that sets --markmap-text-color to app variable', () => {
            render(<MindmapRenderer markdown="# Topic" />);
            const [, options] = mockCreate.mock.calls[0] as [unknown, Record<string, unknown>];
            const css = (options.style as (id: string) => string)('test-id');
            expect(css).toContain('--markmap-text-color');
            expect(css).toContain('--color-text-primary');
        });

        it('style function returns CSS that sets --markmap-code-bg to surface variable', () => {
            render(<MindmapRenderer markdown="# Topic" />);
            const [, options] = mockCreate.mock.calls[0] as [unknown, Record<string, unknown>];
            const css = (options.style as (id: string) => string)('test-id');
            expect(css).toContain('--markmap-code-bg');
            expect(css).toContain('--color-surface');
        });

        it('style function scopes rules to the markmap instance id', () => {
            render(<MindmapRenderer markdown="# Topic" />);
            const [, options] = mockCreate.mock.calls[0] as [unknown, Record<string, unknown>];
            const css = (options.style as (id: string) => string)('my-instance');
            // Must scope to the specific SVG instance to avoid cross-contamination
            expect(css).toContain('my-instance');
        });
    });

    describe('ResizeObserver — scroll jitter suppression (canvas pan bug fix)', () => {
        it('does NOT call fit() when ResizeObserver fires with the same dimensions (scroll jitter)', () => {
            // Simulate: ResizeObserver fires during canvas pan but the node div
            // hasn't actually changed size — only sub-pixel transform jitter.
            // fit() must NOT be called in this case.
            //
            // Strategy: seed lastW/lastH via the FIRST observation (establishes
            // baseline), then fire a second identical observation — no fit() call.
            let capturedCallback: ((entries: ResizeObserverEntry[]) => void) | null = null;
            vi.stubGlobal('ResizeObserver', vi.fn((cb: (entries: ResizeObserverEntry[]) => void) => {
                capturedCallback = cb;
                return { observe: vi.fn(), disconnect: vi.fn() };
            }));

            render(<MindmapRenderer markdown="# Topic" />);
            vi.clearAllMocks();

            // First observation: establishes baseline 400×300 (triggers fit — ok)
            capturedCallback!([{ contentBoxSize: [{ inlineSize: 400, blockSize: 300 }] }] as unknown as ResizeObserverEntry[]);
            vi.clearAllMocks(); // reset after baseline

            // Second observation: same size — scroll jitter scenario
            capturedCallback!([{ contentBoxSize: [{ inlineSize: 400, blockSize: 300 }] }] as unknown as ResizeObserverEntry[]);

            expect(mockFit).not.toHaveBeenCalled();
        });

        it('calls fit() when ResizeObserver fires with genuinely different dimensions (user resize)', () => {
            let capturedCallback: ((entries: ResizeObserverEntry[]) => void) | null = null;
            vi.stubGlobal('ResizeObserver', vi.fn((cb: (entries: ResizeObserverEntry[]) => void) => {
                capturedCallback = cb;
                return { observe: vi.fn(), disconnect: vi.fn() };
            }));

            render(<MindmapRenderer markdown="# Topic" />);
            // Establish baseline
            capturedCallback!([{ contentBoxSize: [{ inlineSize: 400, blockSize: 300 }] }] as unknown as ResizeObserverEntry[]);
            vi.clearAllMocks();

            // Fire with meaningfully larger dimensions — user dragged resize handle
            capturedCallback!([{ contentBoxSize: [{ inlineSize: 600, blockSize: 450 }] }] as unknown as ResizeObserverEntry[]);

            expect(mockFit).toHaveBeenCalledTimes(1);
        });

        it('ignores sub-pixel jitter (within 2px tolerance) without calling fit()', () => {
            let capturedCallback: ((entries: ResizeObserverEntry[]) => void) | null = null;
            vi.stubGlobal('ResizeObserver', vi.fn((cb: (entries: ResizeObserverEntry[]) => void) => {
                capturedCallback = cb;
                return { observe: vi.fn(), disconnect: vi.fn() };
            }));

            render(<MindmapRenderer markdown="# Topic" />);
            // Establish baseline at 400×300
            capturedCallback!([{ contentBoxSize: [{ inlineSize: 400, blockSize: 300 }] }] as unknown as ResizeObserverEntry[]);
            vi.clearAllMocks();

            // Sub-pixel jitter: 1px change on inlineSize only — within 2px tolerance
            capturedCallback!([{ contentBoxSize: [{ inlineSize: 401, blockSize: 300 }] }] as unknown as ResizeObserverEntry[]);

            expect(mockFit).not.toHaveBeenCalled();
        });
    });

    it('disconnects ResizeObserver on unmount', () => {
        const disconnect = vi.fn();
        vi.stubGlobal(
            'ResizeObserver',
            vi.fn(() => ({ observe: vi.fn(), disconnect })),
        );
        const { unmount } = render(
            <MindmapRenderer markdown="# Topic" />,
        );
        unmount();
        expect(disconnect).toHaveBeenCalled();
    });
});
