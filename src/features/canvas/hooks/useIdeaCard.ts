import { useCallback, useState, useRef } from 'react';
import { useCanvasStore } from '../stores/canvasStore';
import { useFocusStore } from '../stores/focusStore';
import { useNodeData } from './useNodeData';
import { useIdeaCardEditor } from './useIdeaCardEditor';
import { useIdeaCardState } from './useIdeaCardState';
import { useIdeaCardHandlers } from './useIdeaCardHandlers';
import { useLinkPreviewRetry } from './useLinkPreviewRetry';
import { useProximityBar } from './useProximityBar';
import { useBarPinOpen } from './useBarPinOpen';
import { useNodeGeneration } from '@/features/ai/hooks/useNodeGeneration';
import { useNodeImageUpload } from './useNodeImageUpload';
import { useIdeaCardCalendar } from '@/features/calendar/hooks/useIdeaCardCalendar';
import type { IdeaNodeData } from '../types/node';
import type { NodeHeadingHandle } from '../components/nodes/NodeHeading';

interface UseIdeaCardParams {
    id: string;
    rfData: IdeaNodeData;
    selected: boolean | undefined;
}

export function useIdeaCard({ id, rfData, selected }: UseIdeaCardParams) {
    const storeData = useNodeData(id);
    const resolvedData: IdeaNodeData = storeData ?? rfData;
    // eslint-disable-next-line @typescript-eslint/no-deprecated -- legacy field, heading is SSOT
    const { heading, prompt = '', output, isGenerating, isPinned, isCollapsed, tags: tagIds = [], linkPreviews, calendarEvent } = resolvedData;
    const promptSource = (heading?.trim() ?? prompt) || '';
    const isAICard = Boolean(promptSource && output && promptSource !== output);
    const [showTagInput, setShowTagInput] = useState(false);
    const contentRef = useRef<HTMLDivElement>(null);
    const cardWrapperRef = useRef<HTMLDivElement>(null);
    const barContainerRef = useRef<HTMLDivElement>(null);
    const headingRef = useRef<NodeHeadingHandle>(null);
    const proximityLostFnRef = useRef<(() => void) | undefined>(undefined);
    const registerProximityLostFn = useCallback((fn: () => void) => { proximityLostFnRef.current = fn; }, []);
    useProximityBar(cardWrapperRef, barContainerRef, () => { proximityLostFnRef.current?.(); });
    const { isPinnedOpen, handlers: pinOpenHandlers } = useBarPinOpen();

    const { generateFromPrompt, branchFromNode } = useNodeGeneration();
    const { getEditableContent, saveContent, placeholder, onSubmitAI } = useIdeaCardState({
        nodeId: id, prompt, output, isAICard,
        generateFromPrompt, // eslint-disable-line @typescript-eslint/no-misused-promises -- async, consumed by useIdeaCardState
    });
    const calendar = useIdeaCardCalendar({ nodeId: id, calendarEvent });
    // Stable selectors - derive comparison outside to avoid closure anti-pattern
    const focusedNodeId = useFocusStore((s) => s.focusedNodeId);
    const editingNodeId = useCanvasStore((s) => s.editingNodeId);
    const isFocusTarget = focusedNodeId === id;
    const isEditing = editingNodeId === id && !isFocusTarget;
    const imageUploadFn = useNodeImageUpload(id);

    const { editor, getMarkdown, setContent, submitHandlerRef } = useIdeaCardEditor({
        isEditing, output, getEditableContent, placeholder, saveContent,
        onExitEditing: useCallback((): void => { useCanvasStore.getState().stopEditing(); }, []),
        imageUploadFn,
    });

    const handlers = useIdeaCardHandlers({
        id, selected, setShowTagInput, contentRef, headingRef, editor, getMarkdown, setContent,
        getEditableContent, saveContent, submitHandlerRef, imageUploadFn,
        generateFromPrompt, branchFromNode, calendar, resolvedData, isEditing, onSubmitAI,
    });

    useLinkPreviewRetry(id, linkPreviews);
    const hasContent = Boolean(output);

    return {
        resolvedData, heading, prompt, output, isGenerating, isPinned, isCollapsed, tagIds, linkPreviews, calendarEvent,
        isAICard, showTagInput, contentRef, cardWrapperRef, barContainerRef, headingRef,
        pinOpenHandlers, editor, hasContent, isEditing, isPinnedOpen, calendar, registerProximityLostFn, ...handlers,
    };
}
