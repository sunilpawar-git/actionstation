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

// ── Component ────────────────────────────────────────────────────────

export const MindmapRenderer = React.memo(function MindmapRenderer({ markdown }: MindmapRendererProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const svgRef = useRef<SVGSVGElement>(null);
    const markmapRef = useRef<Markmap | null>(null);

    // Wheel isolation — prevent ReactFlow canvas zoom hijack
    const stopPropagation = useCallback((e: React.SyntheticEvent) => {
        e.stopPropagation();
    }, []);

    // Pointer isolation — prevent ReactFlow canvas pan/zoom hijack.
    // We also focus the nearest focusable ancestor so Escape / keyboard shortcuts
    // reach the card's onKeyDown and the document-level useEscapeLayer handler.
    // Without this, markmap-view's internal D3 zoom captures keyboard events and
    // swallows Escape before it can bubble to `document`.
    const handlePointerDown = useCallback((e: React.PointerEvent) => {
        e.stopPropagation();
        const focusable = (e.currentTarget as HTMLElement)
            .closest<HTMLElement>('[tabindex="0"]');
        focusable?.focus({ preventScroll: true });
    }, []);

    // Initialize markmap instance once on mount
    useEffect(() => {
        if (!svgRef.current) return;
        markmapRef.current = Markmap.create(svgRef.current, {
            autoFit: true,
            duration: 250,
            // Override markmap's hardcoded light-mode defaults with CSS custom
            // properties from the app theme.  The `style` callback is injected
            // after markmap's own global CSS, so these declarations win for
            // every theme (light, dark, sepia, grey, darkBlack) without any
            // JS-side theme detection.
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
        });
        return () => {
            markmapRef.current?.destroy();
            markmapRef.current = null;
        };
    }, []);

    // Update data when markdown changes
    useEffect(() => {
        if (!markmapRef.current) return;
        const raw = markdown.trim() || `# ${strings.canvas.mindmap.emptyFallback}`;
        const input = sanitizeMarkdown(raw);
        const { root } = transformer.transform(input);
        const mm = markmapRef.current;
        void mm.setData(root).then(() => mm.fit().catch(catchRenderError)).catch(catchRenderError);
    }, [markdown]);

    // Re-fit on container resize (node resize handles, collapse toggle)
    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;
        const ro = new ResizeObserver(() => {
            void markmapRef.current?.fit().catch(catchRenderError);
        });
        ro.observe(el);
        return () => ro.disconnect();
    }, []);

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
