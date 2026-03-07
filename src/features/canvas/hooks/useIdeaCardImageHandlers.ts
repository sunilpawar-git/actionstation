import { useCallback } from 'react';
import type { Editor } from '@tiptap/react';
import { useCanvasStore, getNodeMap } from '../stores/canvasStore';
import { useWorkspaceStore } from '@/features/workspace/stores/workspaceStore';
import { useSettingsStore } from '@/shared/stores/settingsStore';
import { ensureEditorFocus } from '../services/imageInsertService';
import type { AfterImageInsertFn } from '../services/imageInsertService';
import { useImageInsert } from './useImageInsert';
import { useDocumentInsert } from './useDocumentInsert';
import { useNodeDocumentUpload } from './useNodeDocumentUpload';
import { useDocumentAgent } from '@/features/documentAgent/hooks/useDocumentAgent';
import { useOfflineQueue } from '@/features/documentAgent/hooks/useOfflineQueue';
import { resolveAnalyzeCommand } from '@/features/documentAgent/services/analyzeCommandService';
import { describeImageWithAI } from '@/features/knowledgeBank/services/imageDescriptionService';
import { sanitizeFilename } from '@/shared/utils/sanitize';
import { captureError } from '@/shared/services/sentryService';
import { strings } from '@/shared/localization/strings';
import { toast } from '@/shared/stores/toastStore';
import type { DocumentInsertFn } from '../extensions/fileHandlerExtension';

interface Params {
    id: string;
    editor: Editor | null;
    getMarkdown: () => string;
    imageUploadFn: (file: File) => Promise<string>;
}

type AnalyzeFn = (nId: string, text: string, fname: string, wsId: string, manual?: boolean) => Promise<void>;

function safeAsync(fn: () => Promise<void>): void {
    void fn().catch((e: unknown) =>
        captureError(e instanceof Error ? e : new Error(String(e))),
    );
}

interface AnalyzeContext {
    nodeId: string;
    analyzeFn: AnalyzeFn;
    enqueue?: (item: { nodeId: string; parsedText: string; filename: string; workspaceId: string }) => boolean;
}

function triggerImageAnalysis(file: File, ctx: Pick<AnalyzeContext, 'nodeId' | 'analyzeFn'>): void {
    const autoAnalyze = useSettingsStore.getState().autoAnalyzeDocuments;
    if (!autoAnalyze) return;

    const workspaceId = useWorkspaceStore.getState().currentWorkspaceId;
    if (!workspaceId) return;

    const safeFilename = sanitizeFilename(file.name);
    safeAsync(async () => {
        const imageDescription = await describeImageWithAI(file, safeFilename);
        await ctx.analyzeFn(ctx.nodeId, imageDescription, safeFilename, workspaceId);
    });
}

function runAnalyzeCommand(ctx: Required<AnalyzeContext>): void {
    safeAsync(async () => {
        const { nodes } = useCanvasStore.getState();
        const node = getNodeMap(nodes).get(ctx.nodeId);
        const attachments = node?.data.attachments;
        const workspaceId = useWorkspaceStore.getState().currentWorkspaceId;
        if (!workspaceId) return;

        const resolved = await resolveAnalyzeCommand(attachments);
        if ('error' in resolved) {
            toast.warning(resolved.error);
            return;
        }
        const { parsedText, filename, isCached } = resolved.result;
        if (isCached) {
            toast.info(strings.documentAgent.cachedResult);
            return;
        }
        const canProceed = ctx.enqueue({ nodeId: ctx.nodeId, parsedText, filename, workspaceId });
        if (!canProceed) return;
        await ctx.analyzeFn(ctx.nodeId, parsedText, filename, workspaceId, true);
    });
}

export function useIdeaCardImageHandlers({ id, editor, getMarkdown, imageUploadFn }: Params) {
    const { analyzeAndSpawn } = useDocumentAgent();

    const handleAfterImageInsert: AfterImageInsertFn = useCallback((file, _permanentUrl) => {
        const md = getMarkdown();
        if (md) useCanvasStore.getState().updateNodeOutput(id, md);
        triggerImageAnalysis(file, { nodeId: id, analyzeFn: analyzeAndSpawn });
    }, [id, getMarkdown, analyzeAndSpawn]);

    const { triggerFilePicker: triggerImagePicker } = useImageInsert(editor, imageUploadFn, handleAfterImageInsert);
    const documentUploadFn = useNodeDocumentUpload(id);

    const processQueueItem = useCallback((item: { nodeId: string; parsedText: string; filename: string; workspaceId: string }) => {
        safeAsync(() => analyzeAndSpawn(item.nodeId, item.parsedText, item.filename, item.workspaceId));
    }, [analyzeAndSpawn]);

    const { enqueueIfOffline } = useOfflineQueue(processQueueItem);

    const onDocumentReady = useCallback((parsedText: string, filename: string) => {
        const workspaceId = useWorkspaceStore.getState().currentWorkspaceId;
        if (!workspaceId) return;
        safeAsync(() => analyzeAndSpawn(id, parsedText, filename, workspaceId));
    }, [id, analyzeAndSpawn]);

    const { triggerFilePicker: triggerDocumentPicker, insertFileDirectly } = useDocumentInsert(id, editor, documentUploadFn, getMarkdown, onDocumentReady);

    const documentInsertFn: DocumentInsertFn = useCallback(
        (_editor: Editor, file: File) => insertFileDirectly(file),
        [insertFileDirectly],
    );

    const handleAnalyzeCommand = useCallback(
        () => runAnalyzeCommand({ nodeId: id, analyzeFn: analyzeAndSpawn, enqueue: enqueueIfOffline }),
        [id, analyzeAndSpawn, enqueueIfOffline],
    );

    const slashHandler = useCallback((c: string) => {
        if (c === 'ai-generate') useCanvasStore.getState().setInputMode('ai');
        if (c === 'insert-image') triggerImagePicker();
        if (c === 'insert-document') triggerDocumentPicker();
        if (c === 'analyze-document') handleAnalyzeCommand();
    }, [triggerImagePicker, triggerDocumentPicker, handleAnalyzeCommand]);

    const handleImageClick = useCallback(() => {
        const store = useCanvasStore.getState();
        if (store.editingNodeId !== id) store.startEditing(id);
        ensureEditorFocus(editor);
        triggerImagePicker();
    }, [id, editor, triggerImagePicker]);

    const handleAttachmentClick = useCallback(() => {
        const store = useCanvasStore.getState();
        if (store.editingNodeId !== id) store.startEditing(id);
        ensureEditorFocus(editor);
        triggerDocumentPicker();
    }, [id, editor, triggerDocumentPicker]);

    return { slashHandler, handleImageClick, handleAttachmentClick, documentInsertFn, handleAfterImageInsert };
}
