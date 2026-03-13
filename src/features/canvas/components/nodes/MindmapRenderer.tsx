/**
 * MindmapRenderer — Renders markdown as an interactive SVG mindmap.
 *
 * Uses markmap-lib (markdown → tree) and markmap-view (tree → SVG).
 * The underlying data.output remains markdown — this component only
 * changes the visual rendering, not the data format.
 *
 * Pointer isolation: onPointerDown / onWheel stopPropagation prevents
 * the mindmap's pan/zoom from bubbling to ReactFlow's canvas handlers.
 *
 * Fit strategy: ALL fit() calls go through scheduleFit() which uses
 * requestAnimationFrame to coalesce multiple callers (setData completion,
 * ResizeObserver) into at most one fit() per frame. autoFit is OFF so
 * markmap never calls fit() itself during renderData.
 *
 * @see contentMode.ts — SSOT for when this renderer is active
 */
import React, { useEffect, useRef, useCallback } from 'react';
import { Transformer } from 'markmap-lib';
import { Markmap } from 'markmap-view';
import { strings } from '@/shared/localization/strings';
import { captureError } from '@/shared/services/sentryService';
import { sanitizeMarkdown } from '@/shared/utils/sanitize';
import styles from './MindmapRenderer.module.css';

// ── Props ────────────────────────────────────────────────────────────

export interface MindmapRendererProps {
    /** Markdown content to visualize as a mindmap */
    markdown: string;
}

// ── Singleton transformer (stateless, expensive to create) ───────────

const transformer = new Transformer();

/** Silently capture markmap rendering errors without crashing the UI */
function catchRenderError(error: unknown): void {
    captureError(error instanceof Error ? error : new Error(String(error)));
}

/** Markmap options: autoFit OFF, theme-aware CSS variables via style callback */
function buildMarkmapOptions() {
    return {
        autoFit: false,
        duration: 250,
        style: (id: string) => `
            .markmap.${id} {
                --markmap-text-color: var(--color-text-primary);
                --markmap-code-color: var(--color-text-secondary);
                --markmap-code-bg: var(--color-surface);
                --markmap-a-color: var(--color-primary);
                --markmap-a-hover-color: var(--color-primary-hover);
                --markmap-circle-open-bg: var(--color-surface-elevated);
                --markmap-font: 300 14px/18px var(--font-sans, sans-serif);
            }
        `,
    };
}

// ── Component ────────────────────────────────────────────────────────

export const MindmapRenderer = React.memo(function MindmapRenderer({ markdown }: MindmapRendererProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const svgRef = useRef<SVGSVGElement>(null);
    const markmapRef = useRef<Markmap | null>(null);
    const rafRef = useRef(0);

    const scheduleFit = useCallback(() => {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = requestAnimationFrame(() => {
            void markmapRef.current?.fit().catch(catchRenderError);
        });
    }, []);

    // Wheel isolation — prevent ReactFlow canvas zoom hijack
    const stopPropagation = useCallback((e: React.SyntheticEvent) => {
        e.stopPropagation();
    }, []);

    // Pointer isolation — prevent ReactFlow canvas pan/zoom hijack.
    // We also focus the nearest focusable ancestor so Escape / keyboard
    // shortcuts reach the card's onKeyDown and useEscapeLayer handler.
    const handlePointerDown = useCallback((e: React.PointerEvent) => {
        e.stopPropagation();
        const focusable = (e.currentTarget as HTMLElement)
            .closest<HTMLElement>('[tabindex="0"]');
        focusable?.focus({ preventScroll: true });
    }, []);

    // Initialize markmap instance once on mount.
    // autoFit is OFF — we control fit() timing via scheduleFit() so that
    // fit never runs while the container still has 0×0 dimensions (the
    // "garbled initial render" bug). Only scheduleFit + ResizeObserver
    // trigger fit(), and both defer to the next animation frame.
    useEffect(() => {
        if (!svgRef.current) return;
        markmapRef.current = Markmap.create(svgRef.current, buildMarkmapOptions());
        return () => {
            cancelAnimationFrame(rafRef.current);
            markmapRef.current?.destroy();
            markmapRef.current = null;
        };
    }, []);

    // Update data when markdown changes.
    // setData() returns a promise that resolves after D3 transitions
    // complete (~250ms). We schedule fit at that point so node positions
    // are final. scheduleFit deduplicates via requestAnimationFrame.
    useEffect(() => {
        if (!markmapRef.current) return;
        const raw = markdown.trim() || `# ${strings.canvas.mindmap.emptyFallback}`;
        const input = sanitizeMarkdown(raw);
        const { root } = transformer.transform(input);
        void markmapRef.current.setData(root).then(() => scheduleFit()).catch(catchRenderError);
    }, [markdown, scheduleFit]);

    // Re-fit on genuine container resize (node resize handles, collapse).
    //
    // ResizeObserver rounds dimensions to integer pixels. This eliminates
    // sub-pixel jitter that HiDPI/Retina displays produce when ReactFlow
    // pans the canvas via CSS transform — the "jumping mindmap" bug.
    //
    // This also handles the initial mount: the container starts at 0×0
    // and ResizeObserver fires once the node gets its real dimensions,
    // scheduling the FIRST correct fit() via RAF.
    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;
        let lastW = 0;
        let lastH = 0;
        const ro = new ResizeObserver((entries) => {
            const entry = entries[0];
            if (!entry?.contentBoxSize[0]) return;
            const w = Math.round(entry.contentBoxSize[0].inlineSize);
            const h = Math.round(entry.contentBoxSize[0].blockSize);
            if (w === lastW && h === lastH) return;
            lastW = w;
            lastH = h;
            scheduleFit();
        });
        ro.observe(el);
        return () => ro.disconnect();
    }, [scheduleFit]);

    return (
        <div
            ref={containerRef}
            className={styles.container}
            data-testid="mindmap-renderer"
            role="figure"
            aria-label={strings.canvas.mindmap.ariaLabel}
            onPointerDown={handlePointerDown}
            onWheel={stopPropagation}
        >
            <svg ref={svgRef} className={styles.svg} role="img"
                aria-label={strings.canvas.mindmap.ariaLabel} />
        </div>
    );
});
