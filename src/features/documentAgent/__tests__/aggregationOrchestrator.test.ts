/**
 * Aggregation Orchestrator Tests — color policy and no auto-tags
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { strings } from '@/shared/localization/strings';

const { mockSetState } = vi.hoisted(() => ({ mockSetState: vi.fn() }));

vi.mock('@/features/canvas/stores/canvasStore', () => ({
    useCanvasStore: Object.assign(vi.fn(), {
        getState: () => ({
            nodes: [
                {
                    id: 'n1', workspaceId: 'ws-1',
                    data: {
                        attachments: [{
                            filename: 'a.pdf',
                            extraction: { entities: ['Acme'], classification: 'invoice', summary: 'Invoice A' },
                        }],
                    },
                },
                {
                    id: 'n2', workspaceId: 'ws-1',
                    data: {
                        attachments: [{
                            filename: 'b.pdf',
                            extraction: { entities: ['Globex'], classification: 'contract', summary: 'Contract B' },
                        }],
                    },
                },
            ],
            edges: [],
            updateNodeOutput: vi.fn(),
        }),
        setState: mockSetState,
    }),
}));

vi.mock('@/features/knowledgeBank/services/geminiClient', () => ({
    callGemini: vi.fn().mockResolvedValue({
        ok: true,
        data: {
            candidates: [{
                content: {
                    parts: [{
                        text: JSON.stringify({
                            sections: [{ classification: 'invoice', summary: 'Aggregated invoice data' }],
                        }),
                    }],
                },
            }],
        },
    }),
}));

vi.mock('../services/entityIndexService', () => ({
    buildEntityIndex: vi.fn().mockReturnValue({
        entries: [
            { nodeId: 'n1', filename: 'a.pdf', classification: 'invoice' },
            { nodeId: 'n2', filename: 'b.pdf', classification: 'contract' },
        ],
    }),
}));

vi.mock('../services/aggregationService', () => ({
    shouldTriggerAggregation: vi.fn().mockReturnValue(true),
    groupEntriesByClassification: vi.fn().mockReturnValue(
        new Map([['invoice', [{ nodeId: 'n1' }]]]),
    ),
    buildAggregationPrompt: vi.fn().mockReturnValue('prompt'),
    buildAggregationRequestBody: vi.fn().mockReturnValue({}),
    parseAggregationResponse: vi.fn().mockReturnValue({
        sections: [{ classification: 'invoice', summary: 'Aggregated invoice data' }],
    }),
}));

vi.mock('@/shared/stores/toastStore', () => ({ toast: { info: vi.fn() } }));
vi.mock('@/shared/services/sentryService', () => ({ captureError: vi.fn() }));
vi.mock('@/shared/services/analyticsService', () => ({ trackAggregationGenerated: vi.fn() }));
vi.mock('@/shared/utils/storage', () => ({
    getStorageItem: vi.fn().mockReturnValue(0),
    setStorageItem: vi.fn(),
}));

/* eslint-disable import-x/first -- Must import after vi.mock */
import { runAggregation, resetAggregationState } from '../services/aggregationOrchestrator';
/* eslint-enable import-x/first */

describe('runAggregation', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        resetAggregationState();
    });

    it('spawns aggregation node with default color (no hardcoded warning)', async () => {
        await runAggregation('ws-1');

        const setStateFn = mockSetState.mock.calls[0]?.[0] as
            (s: { nodes: Array<{ data: Record<string, unknown> }> }) =>
            { nodes: Array<{ data: Record<string, unknown> }> };
        const newState = setStateFn({ nodes: [] });

        expect(newState.nodes[0]?.data.colorKey).toBe('default');
    });

    it('spawns aggregation node with no auto-tags', async () => {
        await runAggregation('ws-1');

        const setStateFn = mockSetState.mock.calls[0]?.[0] as
            (s: { nodes: Array<{ data: Record<string, unknown> }> }) =>
            { nodes: Array<{ data: Record<string, unknown> }> };
        const newState = setStateFn({ nodes: [] });

        expect(newState.nodes[0]?.data.tags).toBeUndefined();
    });

    it('spawns aggregation node with correct heading from strings', async () => {
        await runAggregation('ws-1');

        const setStateFn = mockSetState.mock.calls[0]?.[0] as
            (s: { nodes: Array<{ data: Record<string, unknown> }> }) =>
            { nodes: Array<{ data: Record<string, unknown> }> };
        const newState = setStateFn({ nodes: [] });

        expect(newState.nodes[0]?.data.heading).toBe(strings.documentAgent.aggregationHeading);
    });
});
