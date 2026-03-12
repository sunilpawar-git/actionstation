/**
 * contentModeToggleService — Toggles contentMode with undo/redo support.
 * Captures pre-toggle state (mode + dimensions) so Ctrl+Z fully reverts.
 * Also exposes convertToMindmapWithAI for prose-to-hierarchical conversion.
 */
import { useCanvasStore, getNodeMap } from '../stores/canvasStore';
import { useHistoryStore } from '../stores/historyStore';
import { isContentModeMindmap } from '../types/contentMode';
import { convertTextToMindmap } from '@/features/ai/services/geminiService';
import { toast } from '@/shared/stores/toastStore';
import { strings } from '@/shared/localization/strings';
import { captureError } from '@/shared/services/sentryService';
import type { ContentMode } from '../types/contentMode';

/** Toggle contentMode on a node and push an undo command to the history stack. */
export function toggleContentModeWithUndo(nodeId: string): ContentMode | null {
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
    const nextMode: ContentMode = isContentModeMindmap(prevMode) ? 'text' : 'mindmap';

    store.updateNodeContentMode(nodeId, nextMode);

    toast.info(nextMode === 'mindmap'
        ? strings.canvas.mindmap.switchedToMindmap
        : strings.canvas.mindmap.switchedToText);

    useHistoryStore.getState().dispatch({
        type: 'PUSH',
        command: {
            type: 'toggleContentMode',
            timestamp: Date.now(),
            entityId: nodeId,
            undo: () => {
                const s = useCanvasStore.getState();
                s.updateNodeContentMode(nodeId, prevMode ?? 'text');
                if (prevWidth != null && prevHeight != null) {
                    s.updateNodeDimensions(nodeId, prevWidth, prevHeight);
                }
            },
            redo: () => {
                useCanvasStore.getState().updateNodeContentMode(nodeId, nextMode);
            },
        },
    });

    return nextMode;
}

/**
 * Convert a node's prose content to hierarchical mindmap markdown via AI,
 * then switch to mindmap mode. Captures original output for undo.
 */
export async function convertToMindmapWithAI(nodeId: string): Promise<void> {
    const store = useCanvasStore.getState();
    const node = getNodeMap(store.nodes).get(nodeId);
    if (!node) {
        captureError(new Error(`convertToMindmapWithAI: node ${nodeId} not found`));
        return;
    }

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    const originalOutput = node.data?.output;
    if (!originalOutput?.trim()) {
        toast.warning(strings.canvas.mindmap.convertEmpty);
        return;
    }

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    const prevMode = node.data?.contentMode;
    const prevWidth = node.width;
    const prevHeight = node.height;

    store.setNodeGenerating(nodeId, true);
    try {
        const converted = await convertTextToMindmap(originalOutput);
        if (!converted.trim() || !converted.includes('#')) {
            toast.error(strings.errors.aiError);
            return;
        }
        const s = useCanvasStore.getState();
        s.updateNodeOutput(nodeId, converted);
        s.updateNodeContentMode(nodeId, 'mindmap');

        useHistoryStore.getState().dispatch({
            type: 'PUSH',
            command: {
                type: 'toggleContentMode',
                timestamp: Date.now(),
                entityId: nodeId,
                undo: () => {
                    const us = useCanvasStore.getState();
                    us.updateNodeOutput(nodeId, originalOutput);
                    us.updateNodeContentMode(nodeId, prevMode ?? 'text');
                    if (prevWidth != null && prevHeight != null) {
                        us.updateNodeDimensions(nodeId, prevWidth, prevHeight);
                    }
                },
                redo: () => {
                    const rs = useCanvasStore.getState();
                    rs.updateNodeOutput(nodeId, converted);
                    rs.updateNodeContentMode(nodeId, 'mindmap');
                },
            },
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : strings.errors.aiError;
        toast.error(message);
    } finally {
        useCanvasStore.getState().setNodeGenerating(nodeId, false);
    }
}
