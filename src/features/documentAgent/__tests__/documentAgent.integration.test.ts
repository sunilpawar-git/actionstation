/**
 * Document Agent Integration Test — full pipeline mock verification
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { strings } from '@/shared/localization/strings';

const { mockSetState } = vi.hoisted(() => ({ mockSetState: vi.fn() }));

vi.mock('@/shared/stores/settingsStore', () => ({
    useSettingsStore: Object.assign(
        vi.fn((sel?: (s: Record<string, unknown>) => unknown) => {
            const state = { autoAnalyzeDocuments: true, canvasFreeFlow: false };
            return typeof sel === 'function' ? sel(state) : state;
        }),
        { getState: () => ({ autoAnalyzeDocuments: true, canvasFreeFlow: false }) },
    ),
}));

vi.mock('@/features/subscription/stores/subscriptionStore', () => ({
    useSubscriptionStore: Object.assign(
        vi.fn((sel?: (s: Record<string, unknown>) => unknown) => {
            const state = { hasAccess: () => true };
            return typeof sel === 'function' ? sel(state) : state;
        }),
        { getState: () => ({ hasAccess: () => true }) },
    ),
}));

vi.mock('@/features/canvas/stores/canvasStore', () => ({
    useCanvasStore: Object.assign(
        vi.fn((sel?: (s: Record<string, unknown>) => unknown) => {
            const state = {
                nodes: [{ id: 'node-1', position: { x: 0, y: 0 }, data: { heading: 'Test' } }],
                edges: [],
            };
            return typeof sel === 'function' ? sel(state) : state;
        }),
        {
            getState: () => ({
                nodes: [{ id: 'node-1', position: { x: 0, y: 0 }, data: { heading: 'Test' } }],
                edges: [],
            }),
            setState: mockSetState,
        },
    ),
    getNodeMap: vi.fn().mockReturnValue(new Map([
        ['node-1', { id: 'node-1', position: { x: 0, y: 0 }, data: { heading: 'Test' } }],
    ])),
}));

vi.mock('../services/documentAgentService', () => ({
    analyzeDocument: vi.fn().mockResolvedValue({
        classification: 'invoice',
        confidence: 'high',
        summary: 'Monthly electricity bill',
        keyFacts: ['Amount: $142'],
        actionItems: ['Pay by Friday'],
        questions: ['Auto-pay?'],
        extendedFacts: [],
    }),
}));

vi.mock('@/features/canvas/services/freeFlowPlacementService', () => ({
    calculateBranchPlacement: vi.fn().mockReturnValue({ x: 400, y: 0 }),
}));

vi.mock('@/features/canvas/services/gridLayoutService', () => ({
    calculateMasonryPosition: vi.fn().mockReturnValue({ x: 0, y: 300 }),
}));

vi.mock('@/shared/stores/toastStore', () => ({
    toast: { info: vi.fn(), success: vi.fn(), error: vi.fn() },
}));

vi.mock('@/shared/services/sentryService', () => ({ captureError: vi.fn() }));

vi.mock('@/shared/services/analyticsService', () => ({
    trackDocumentAgentTriggered: vi.fn(),
    trackDocumentAgentCompleted: vi.fn(),
    trackDocumentAgentFailed: vi.fn(),
}));

vi.mock('@/features/subscription/types/subscription', () => ({
    GATED_FEATURES: { documentIntelligence: 'documentIntelligence' },
}));

/* eslint-disable import-x/first -- Must import after vi.mock */
import { useDocumentAgent } from '../hooks/useDocumentAgent';
import { toast } from '@/shared/stores/toastStore';
/* eslint-enable import-x/first */

describe('Document Agent Integration', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('full pipeline: analyzeAndSpawn triggers toast, setState, and success toast', async () => {
        const { result } = renderHook(() => useDocumentAgent());

        await act(async () => {
            await result.current.analyzeAndSpawn('node-1', 'Electricity bill text', 'bill.pdf', 'ws-1');
        });

        expect(toast.info).toHaveBeenCalledWith(strings.documentAgent.analyzing);
        expect(mockSetState).toHaveBeenCalledTimes(1);
        expect(toast.success).toHaveBeenCalledWith(strings.documentAgent.analysisComplete);
    });

    it('setState is called with a function that adds 1 node and 1 edge', async () => {
        const { result } = renderHook(() => useDocumentAgent());

        await act(async () => {
            await result.current.analyzeAndSpawn('node-1', 'text', 'f.pdf', 'ws-1');
        });

        const setStateFn = mockSetState.mock.calls[0]?.[0] as (s: { nodes: unknown[]; edges: unknown[] }) => { nodes: unknown[]; edges: unknown[] };
        const newState = setStateFn({ nodes: [{ id: 'existing' }], edges: [] });

        expect(newState.nodes).toHaveLength(2);
        expect(newState.edges).toHaveLength(1);
    });

    it('spawned node has correct heading, inherits parent color, and has no auto-tags', async () => {
        const { result } = renderHook(() => useDocumentAgent());

        await act(async () => {
            await result.current.analyzeAndSpawn('node-1', 'text', 'f.pdf', 'ws-1');
        });

        const setStateFn = mockSetState.mock.calls[0]?.[0] as (s: { nodes: Array<{ data: { heading?: string; tags?: string[]; colorKey?: string } }>; edges: unknown[] }) => { nodes: Array<{ data: { heading?: string; tags?: string[]; colorKey?: string } }>; edges: unknown[] };
        const newState = setStateFn({ nodes: [], edges: [] });
        const insightNode = newState.nodes[0];

        expect(insightNode?.data.heading).toBe(strings.documentAgent.insightHeading);
        expect(insightNode?.data.tags).toBeUndefined();
        expect(insightNode?.data.colorKey).toBe('default');
    });

    it('spawned edge has derived relationship type', async () => {
        const { result } = renderHook(() => useDocumentAgent());

        await act(async () => {
            await result.current.analyzeAndSpawn('node-1', 'text', 'f.pdf', 'ws-1');
        });

        const setStateFn = mockSetState.mock.calls[0]?.[0] as (s: { nodes: unknown[]; edges: Array<{ relationshipType: string }> }) => { nodes: unknown[]; edges: Array<{ relationshipType: string }> };
        const newState = setStateFn({ nodes: [], edges: [] });

        expect(newState.edges[0]?.relationshipType).toBe('derived');
    });

    it('agent state transitions to complete after success', async () => {
        const { result } = renderHook(() => useDocumentAgent());

        await act(async () => {
            await result.current.analyzeAndSpawn('node-1', 'text', 'f.pdf', 'ws-1');
        });

        expect(result.current.agentState.status).toBe('complete');
        expect(result.current.agentState.result?.classification).toBe('invoice');
    });
});
