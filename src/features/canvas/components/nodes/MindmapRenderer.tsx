/**
 * MindmapRenderer — Renders markdown as an interactive SVG mindmap.
 *
 * Uses markmap-lib (markdown → tree) and markmap-view (tree → SVG).
 * The underlying data.output remains markdown — this component only
 * changes the visual rendering, not the data format.
 *
 * D3 zoom disabled: markmap-view registers D3 zoom handlers (wheel,
 * mousedown, etc.) on the SVG. These cause the mindmap to zoom/pan when
 * the user scrolls the canvas — the "jumping mindmap" bug. We strip ALL
 * D3 zoom listeners after create. Wheel events pass through to ReactFlow.
 *
 * foreignObject isolation: markmap places every node label in an SVG
 * foreignObject and registers mousedown + dblclick D3 handlers on each.
 * These foreignObjects extend beyond the visible SVG area (their natural
 * layout width can be 300-700px in a 280px node) and their hit-test boxes
 * intercept scroll + double-click events from the parent ReactFlow node.
 * We inject `pointer-events: none` on `.markmap-foreign` so all pointer
 * events fall through to the container div / ReactFlow, making double-click
 * for the focus overlay work correctly.
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
    /**
     * Strip D3 zoom/pan listeners from the SVG after create.
     * Defaults to true for canvas nodes (prevents competing with ReactFlow pan/zoom).
     * Set to false in the focus overlay so the user can zoom/pan the mindmap freely.
     */
    disableZoom?: boolean;
}

// ── Singleton transformer (stateless, expensive to create) ───────────

const transformer = new Transformer();

/** Silently capture markmap rendering errors without crashing the UI */
function catchRenderError(error: unknown): void {
    captureError(error instanceof Error ? error : new Error(String(error)));
}

/** Ignore ResizeObserver changes under 4px — CSS transform jitter on HiDPI */
const JITTER_PX = 4;

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

export const MindmapRenderer = React.memo(function MindmapRenderer({ markdown, disableZoom = true }: MindmapRendererProps) {
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

    // Pointer isolation — prevent ReactFlow from starting a node drag
    // when the user clicks inside the mindmap. Also focuses the nearest
    // focusable ancestor so Escape / keyboard shortcuts reach the card.
    const handlePointerDown = useCallback((e: React.PointerEvent) => {
        e.stopPropagation();
        const focusable = (e.currentTarget as HTMLElement)
            .closest<HTMLElement>('[tabindex="0"]');
        focusable?.focus({ preventScroll: true });
    }, []);

    useEffect(() => {
        if (!svgRef.current) return;
        const mm = Markmap.create(svgRef.current, buildMarkmapOptions());
        if (disableZoom) {
            const svg = mm.svg as unknown as { on: (event: string, handler: null) => void };
            svg.on('.zoom', null);
            svg.on('wheel', null);
        }
        markmapRef.current = mm;
        return () => {
            cancelAnimationFrame(rafRef.current);
            markmapRef.current?.destroy();
            markmapRef.current = null;
        };
    // disableZoom is intentionally excluded — it's a mount-time config, not reactive
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
            if (Math.abs(w - lastW) < JITTER_PX && Math.abs(h - lastH) < JITTER_PX) return;
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
        >
            {/* Disable pointer events on markmap foreignObjects so they don't
                intercept scroll or double-click from the parent ReactFlow node */}
            <style>{`.markmap-foreign { pointer-events: none; }`}</style>
            <svg ref={svgRef} className={styles.svg} role="img"
                aria-label={strings.canvas.mindmap.ariaLabel} />
        </div>
    );
});
