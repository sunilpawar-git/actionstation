/**
 * useDocumentAgent — orchestrates document analysis and insight node spawning.
 * Uses useReducer for local state machine (isolated from canvasStore).
 * All Zustand reads via getState() — no selectors, no re-render deps.
 * Canvas write is a single atomic setState() call.
 */
import { useReducer, useCallback } from 'react';
import { useCanvasStore, getNodeMap } from '@/features/canvas/stores/canvasStore';
import { useSettingsStore } from '@/shared/stores/settingsStore';
import { useSubscriptionStore } from '@/features/subscription/stores/subscriptionStore';
import { GATED_FEATURES } from '@/features/subscription/types/subscription';
import { toast } from '@/shared/stores/toastStore';
import { captureError } from '@/shared/services/sentryService';
import { strings } from '@/shared/localization/strings';
import {
    trackDocumentAgentTriggered,
    trackDocumentAgentCompleted,
    trackDocumentAgentFailed,
} from '@/shared/services/analyticsService';
import { INITIAL_AGENT_STATE } from '../types/documentAgent';
import type { AgentState } from '../types/documentAgent';
import { agentReducer } from './agentReducer';
import { analyzeDocument } from '../services/documentAgentService';
import { buildInsightSpawn, calculateInsightPosition } from '../services/insightNodeBuilder';
import { normalizeNodeColorKey } from '@/features/canvas/types/node';
import { cacheExtraction } from '../services/extractionCacheService';
import { safeCrossReference } from '../services/crossRefOrchestrator';
import { incrementAndCheck, safeAggregation } from '../services/aggregationOrchestrator';

export function useDocumentAgent(): {
    analyzeAndSpawn: (
        nodeId: string,
        parsedText: string,
        filename: string,
        workspaceId: string,
        isManual?: boolean,
    ) => Promise<void>;
    agentState: AgentState;
} {
    const [state, dispatch] = useReducer(agentReducer, INITIAL_AGENT_STATE);

    const analyzeAndSpawn = useCallback(
        async (nodeId: string, parsedText: string, filename: string, workspaceId: string, isManual = false) => {
            if (!isManual) {
                const autoAnalyze = useSettingsStore.getState().autoAnalyzeDocuments;
                if (!autoAnalyze) return;
            }

            const hasAccess = useSubscriptionStore.getState().hasAccess(GATED_FEATURES.documentIntelligence);
            if (!hasAccess) {
                if (isManual) toast.info(strings.subscription.featureLocked);
                return;
            }

            dispatch({ type: 'START_ANALYSIS' });
            toast.info(strings.documentAgent.analyzing);
            trackDocumentAgentTriggered(filename);

            try {
                const result = await analyzeDocument(parsedText, filename);

                const { nodes } = useCanvasStore.getState();
                const parentNode = getNodeMap(nodes).get(nodeId);
                if (!parentNode) return;

                const attachment = parentNode.data.attachments?.find(
                    (a) => a.filename === filename,
                );
                if (attachment) {
                    const updated = cacheExtraction(attachment, result);
                    const newAttachments = parentNode.data.attachments?.map(
                        (a) => (a.filename === filename ? updated : a),
                    );
                    useCanvasStore.getState().updateNodeAttachments(nodeId, newAttachments);
                }

                const isFreeFlow = useSettingsStore.getState().canvasFreeFlow;
                const freshNodes = useCanvasStore.getState().nodes;
                const position = calculateInsightPosition(parentNode, freshNodes, isFreeFlow);

                const parentColorKey = normalizeNodeColorKey(parentNode.data.colorKey);
                const { node, edge } = buildInsightSpawn(nodeId, workspaceId, position, result, filename, parentColorKey);

                useCanvasStore.setState((s) => ({
                    nodes: [...s.nodes, node],
                    edges: [...s.edges, edge],
                }));

                dispatch({ type: 'ANALYSIS_COMPLETE', payload: result, insightNodeId: node.id });
                toast.success(strings.documentAgent.analysisComplete);
                trackDocumentAgentCompleted(result.classification, result.confidence);

                void safeCrossReference(nodeId, workspaceId, result, filename, parentColorKey).catch((e: unknown) =>
                    captureError(e instanceof Error ? e : new Error(String(e))),
                );

                if (incrementAndCheck()) {
                    void safeAggregation(workspaceId).catch((e: unknown) =>
                        captureError(e instanceof Error ? e : new Error(String(e))),
                    );
                }
            } catch (error: unknown) {
                captureError(error instanceof Error ? error : new Error(strings.documentAgent.analysisFailed));
                const message = error instanceof Error ? error.message : strings.documentAgent.analysisFailed;
                dispatch({ type: 'ANALYSIS_FAILED', error: message });
                toast.error(message);
                trackDocumentAgentFailed(message);
            }
        },
        [],
    );

    return { analyzeAndSpawn, agentState: state };
}
