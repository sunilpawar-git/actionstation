/**
 * createNodeFromQuoteService — Shared logic for creating a new idea node
 * from a reader quote. Used by both useQuoteActions and useSidePanelQuoteActions.
 */
import type { ReaderSource } from '../types/reader';
import { buildQuoteMarkdown } from './quoteInsertionService';
import { useCanvasStore } from '@/features/canvas/stores/canvasStore';
import { useWorkspaceStore } from '@/features/workspace/stores/workspaceStore';
import { createIdeaNode } from '@/features/canvas/types/node';
import { calculateNextNodePosition } from '@/features/canvas/stores/canvasStoreHelpers';
import { trackReaderQuoteInserted } from '@/shared/services/analyticsService';
import { toast } from '@/shared/stores/toastStore';
import { strings } from '@/shared/localization/strings';

export function createNodeFromQuote(
    source: ReaderSource,
    text: string,
    page: number | undefined,
    nodeId: string,
): boolean {
    const workspaceId = useWorkspaceStore.getState().currentWorkspaceId;
    if (!workspaceId) return false;

    const markdown = buildQuoteMarkdown(text, {
        sourceId: source.sourceId,
        sourceType: source.type,
        filename: source.filename,
        page,
        nodeId,
    });

    if (markdown.length === 0) return false;

    const nodes = useCanvasStore.getState().nodes;
    const position = calculateNextNodePosition(nodes);
    const newNodeId = `idea-${crypto.randomUUID()}`;
    const newNode = createIdeaNode(newNodeId, workspaceId, position);
    newNode.data.output = markdown;
    newNode.data.heading = source.filename;

    useCanvasStore.getState().addNode(newNode);
    trackReaderQuoteInserted(source.type, 'create_node');
    toast.success(strings.reader.nodeCreated);
    return true;
}
