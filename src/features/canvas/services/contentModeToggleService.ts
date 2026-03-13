/**
 * contentModeToggleService — Single smart toggle for mindmap/text mode.
 *
 * One public entry point: toggleContentModeWithUndo().
 *
 * Behaviour when switching text → mindmap:
 *   • If output already looks like hierarchical markdown (has ## sub-headings)
 *     → flip render mode instantly (no AI call, no latency)
 *   • If output is prose (or structured with only one heading level)
 *     → call Gemini to convert prose → hierarchy, then flip mode
 *   • If output is empty → show warning toast, do nothing
 *
 * Behaviour when switching mindmap → text:
 *   • Always instant — just flip the render mode flag.
 *
 * Every state transition is fully undoable/redoable via the history stack.
 */
import { useCanvasStore, getNodeMap } from '../stores/canvasStore';
import { useHistoryStore } from '../stores/historyStore';
import { isContentModeMindmap } from '../types/contentMode';
import { convertTextToMindmap } from '@/features/ai/services/geminiService';
import { toast } from '@/shared/stores/toastStore';
import { strings } from '@/shared/localization/strings';
import { captureError } from '@/shared/services/sentryService';
import type { ContentMode } from '../types/contentMode';

// ── Heuristic ────────────────────────────────────────────────────────

/**
 * Returns true when the text is already hierarchical markdown suitable
 * for rendering as a mindmap (has a # root AND at least one ## branch).
 * Prose, empty strings, or single-heading text all return false.
 */
export function looksLikeMindmapMarkdown(text: string): boolean {
    if (!text.trim()) return false;
    const hasRoot = /^#\s/m.test(text);
    const hasBranch = /^##\s/m.test(text);
    return hasRoot && hasBranch;
}

// ── Internal helpers ─────────────────────────────────────────────────

function pushToggleHistory(
    nodeId: string,
    prevMode: ContentMode | undefined,
    nextMode: ContentMode,
    prevWidth: number | undefined,
    prevHeight: number | undefined,
    prevOutput: string | undefined,
    nextOutput: string | undefined,
) {
    useHistoryStore.getState().dispatch({
        type: 'PUSH',
        command: {
            type: 'toggleContentMode',
            timestamp: Date.now(),
            entityId: nodeId,
            undo: () => {
                const s = useCanvasStore.getState();
                if (prevOutput !== undefined) s.updateNodeOutput(nodeId, prevOutput);
                s.updateNodeContentMode(nodeId, prevMode ?? 'text');
                if (prevWidth != null && prevHeight != null) {
                    s.updateNodeDimensions(nodeId, prevWidth, prevHeight);
                }
            },
            redo: () => {
                const s = useCanvasStore.getState();
                if (nextOutput !== undefined) s.updateNodeOutput(nodeId, nextOutput);
                s.updateNodeContentMode(nodeId, nextMode);
            },
        },
    });
}

// ── Public API ───────────────────────────────────────────────────────

/**
 * The single smart mindmap toggle.
 *
 * - Returns immediately (synchronous) when toggling mindmap→text or when
 *   content is already structured markdown.
 * - Returns a Promise that resolves after the AI call when content is prose.
 *
 * Callers should always await the result so any AI work completes before
 * assuming the mode has changed.
 */
export async function toggleContentModeWithUndo(nodeId: string): Promise<ContentMode | null> {
    const store = useCanvasStore.getState();
    const node = getNodeMap(store.nodes).get(nodeId);
    if (!node) {
        captureError(new Error(`toggleContentModeWithUndo: node ${nodeId} not found`));
        return null;
    }

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    const prevMode = node.data?.contentMode;
    const prevWidth = node.width;
    const prevHeight = node.height;
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    const currentOutput = node.data?.output ?? '';

    // ── Toggling OFF (mindmap → text): always instant ────────────────
    if (isContentModeMindmap(prevMode)) {
        store.updateNodeContentMode(nodeId, 'text');
        toast.info(strings.canvas.mindmap.switchedToText);
        pushToggleHistory(nodeId, prevMode, 'text', prevWidth, prevHeight, undefined, undefined);
        return 'text';
    }

    // ── Toggling ON (text → mindmap) ─────────────────────────────────

    // Guard: nothing to show
    if (!currentOutput.trim()) {
        toast.warning(strings.canvas.mindmap.convertEmpty);
        return null;
    }

    // Fast path: content is already hierarchical markdown
    if (looksLikeMindmapMarkdown(currentOutput)) {
        store.updateNodeContentMode(nodeId, 'mindmap');
        toast.info(strings.canvas.mindmap.switchedToMindmap);
        pushToggleHistory(nodeId, prevMode, 'mindmap', prevWidth, prevHeight, undefined, undefined);
        return 'mindmap';
    }

    // Slow path: prose → AI conversion → mindmap
    store.setNodeGenerating(nodeId, true);
    try {
        const converted = await convertTextToMindmap(currentOutput);
        if (!converted.trim() || !converted.includes('#')) {
            toast.error(strings.errors.aiError);
            return null;
        }
        const s = useCanvasStore.getState();
        s.updateNodeOutput(nodeId, converted);
        s.updateNodeContentMode(nodeId, 'mindmap');
        toast.info(strings.canvas.mindmap.switchedToMindmap);
        pushToggleHistory(nodeId, prevMode, 'mindmap', prevWidth, prevHeight, currentOutput, converted);
        return 'mindmap';
    } catch (error) {
        const message = error instanceof Error ? error.message : strings.errors.aiError;
        toast.error(message);
        return null;
    } finally {
        useCanvasStore.getState().setNodeGenerating(nodeId, false);
    }
}
