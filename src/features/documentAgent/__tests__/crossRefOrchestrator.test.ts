/**
 * Cross-Reference Orchestrator Tests — color inheritance + no auto-tags + safe wrapper
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { strings } from '@/shared/localization/strings';

const { mockSetState } = vi.hoisted(() => ({ mockSetState: vi.fn() }));

vi.mock('@/features/canvas/stores/canvasStore', () => ({
    useCanvasStore: Object.assign(
        vi.fn(),
        {
            getState: () => ({
                nodes: [{
                    id: 'node-1',
                    position: { x: 0, y: 0 },
                    data: {
                        heading: 'Test',
                        attachments: [{ filename: 'a.pdf', extraction: { entities: ['Power Corp'] } }],
                    },
                }],
                edges: [],
            }),
            setState: mockSetState,
        },
    ),
    getNodeMap: vi.fn().mockReturnValue(new Map([
        ['node-1', { id: 'node-1', position: { x: 0, y: 0 }, data: { heading: 'Test' } }],
    ])),
}));

vi.mock('@/shared/stores/settingsStore', () => ({
    useSettingsStore: Object.assign(vi.fn(), {
        getState: () => ({ canvasFreeFlow: false }),
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
                            connections: ['Shared vendor'],
                            contradictions: [],
                            actionItems: [],
                            relatedDocuments: [],
                        }),
                    }],
                },
            }],
        },
    }),
}));

vi.mock('../services/entityIndexService', () => ({
    buildEntityIndex: vi.fn().mockReturnValue({ entries: [{ nodeId: 'n2' }] }),
    queryEntityIndex: vi.fn().mockReturnValue([{
        entry: { nodeId: 'n2', filename: 'contract.pdf', summary: 'A contract' },
        score: 0.9,
        overlappingEntities: ['Power Corp'],
    }]),
}));

vi.mock('../types/entityIndex', () => ({
    extractEntities: vi.fn().mockReturnValue(['Power Corp']),
}));

vi.mock('../services/crossReferenceService', () => ({
    buildCrossRefPrompt: vi.fn().mockReturnValue('prompt'),
    buildCrossRefRequestBody: vi.fn().mockReturnValue({}),
    parseCrossRefResponse: vi.fn().mockReturnValue({
        connections: ['Shared vendor'],
        contradictions: [],
        actionItems: [],
        relatedDocuments: [],
    }),
}));

vi.mock('../services/crossRefFormatter', () => ({
    formatCrossRefMarkdown: vi.fn().mockReturnValue('## Cross-ref'),
}));

vi.mock('../services/insightNodeBuilder', () => ({
    calculateInsightPosition: vi.fn().mockReturnValue({ x: 0, y: 300 }),
}));

vi.mock('@/shared/stores/toastStore', () => ({
    toast: { info: vi.fn() },
}));

vi.mock('@/shared/services/sentryService', () => ({ captureError: vi.fn() }));
vi.mock('@/shared/services/analyticsService', () => ({ trackCrossReferenceGenerated: vi.fn() }));

/* eslint-disable import-x/first -- Must import after vi.mock */
import { attemptCrossReference, safeCrossReference } from '../services/crossRefOrchestrator';
import { captureError } from '@/shared/services/sentryService';
/* eslint-enable import-x/first */

describe('attemptCrossReference', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('spawns cross-ref node with parent color when provided', async () => {
        await attemptCrossReference('node-1', 'ws-1', { classification: 'invoice', confidence: 'high', summary: '', keyFacts: [], actionItems: [], questions: [], extendedFacts: [] }, 'a.pdf', 'danger');

        const setStateFn = mockSetState.mock.calls[0]?.[0] as (s: { nodes: Array<{ data: Record<string, unknown> }>; edges: unknown[] }) => { nodes: Array<{ data: Record<string, unknown> }>; edges: unknown[] };
        const newState = setStateFn({ nodes: [], edges: [] });

        expect(newState.nodes[0]?.data.colorKey).toBe('danger');
    });

    it('spawns cross-ref node with default color when parentColorKey omitted', async () => {
        await attemptCrossReference('node-1', 'ws-1', { classification: 'invoice', confidence: 'high', summary: '', keyFacts: [], actionItems: [], questions: [], extendedFacts: [] }, 'a.pdf');

        const setStateFn = mockSetState.mock.calls[0]?.[0] as (s: { nodes: Array<{ data: Record<string, unknown> }>; edges: unknown[] }) => { nodes: Array<{ data: Record<string, unknown> }>; edges: unknown[] };
        const newState = setStateFn({ nodes: [], edges: [] });

        expect(newState.nodes[0]?.data.colorKey).toBe('default');
    });

    it('spawned cross-ref node has no auto-tags', async () => {
        await attemptCrossReference('node-1', 'ws-1', { classification: 'invoice', confidence: 'high', summary: '', keyFacts: [], actionItems: [], questions: [], extendedFacts: [] }, 'a.pdf');

        const setStateFn = mockSetState.mock.calls[0]?.[0] as (s: { nodes: Array<{ data: Record<string, unknown> }>; edges: unknown[] }) => { nodes: Array<{ data: Record<string, unknown> }>; edges: unknown[] };
        const newState = setStateFn({ nodes: [], edges: [] });

        expect(newState.nodes[0]?.data.tags).toBeUndefined();
    });

    it('spawned cross-ref node has correct heading from strings', async () => {
        await attemptCrossReference('node-1', 'ws-1', { classification: 'invoice', confidence: 'high', summary: '', keyFacts: [], actionItems: [], questions: [], extendedFacts: [] }, 'a.pdf');

        const setStateFn = mockSetState.mock.calls[0]?.[0] as (s: { nodes: Array<{ data: Record<string, unknown> }>; edges: unknown[] }) => { nodes: Array<{ data: Record<string, unknown> }>; edges: unknown[] };
        const newState = setStateFn({ nodes: [], edges: [] });

        expect(newState.nodes[0]?.data.heading).toBe(strings.documentAgent.crossRefHeading);
    });
});

describe('safeCrossReference', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('catches errors silently without throwing', async () => {
        vi.mocked(captureError).mockClear();
        const { callGemini } = await import('@/features/knowledgeBank/services/geminiClient');
        vi.mocked(callGemini).mockRejectedValueOnce(new Error('network failure'));

        await expect(safeCrossReference('node-1', 'ws-1', { classification: 'invoice', confidence: 'high', summary: '', keyFacts: [], actionItems: [], questions: [], extendedFacts: [] }, 'a.pdf')).resolves.toBeUndefined();

        expect(captureError).toHaveBeenCalled();
    });
});
