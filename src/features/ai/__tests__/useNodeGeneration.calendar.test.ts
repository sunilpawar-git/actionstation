/**
 * useNodeGeneration Calendar Intent Tests
 * Tests the calendar intent interception in generateFromPrompt
 */
import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { renderHook, act } from '@testing-library/react';

vi.mock('../services/geminiService', () => ({
    generateContentWithContext: vi.fn(),
}));

vi.mock('@/features/knowledgeBank/hooks/useKnowledgeBankContext', () => ({
    useKnowledgeBankContext: () => ({ getKBContext: vi.fn(() => '') }),
}));

vi.mock('@/features/calendar/services/calendarIntentService', () => ({
    detectCalendarIntent: vi.fn(),
    looksLikeCalendarIntent: vi.fn(),
}));

vi.mock('@/features/calendar/services/calendarService', () => ({
    createEvent: vi.fn(),
}));

vi.mock('@/features/auth/services/calendarAuthService', () => ({
    connectGoogleCalendar: vi.fn(),
}));

let mockIsCalendarConnected = true;
vi.mock('@/features/auth/stores/authStore', () => ({
    useAuthStore: {
        getState: () => ({ isCalendarConnected: mockIsCalendarConnected }),
    },
}));

vi.mock('@/shared/stores/toastStore', () => ({
    toast: { info: vi.fn(), error: vi.fn(), success: vi.fn() },
}));

vi.mock('@/features/canvas/contexts/PanToNodeContext', () => ({
    usePanToNodeContext: () => ({ panToPosition: vi.fn() }),
}));

vi.mock('../hooks/useNodePoolContext', () => ({
    useNodePoolContext: () => ({ getPoolContext: vi.fn(() => '') }),
}));

// eslint-disable-next-line import-x/first
import { useNodeGeneration } from '../hooks/useNodeGeneration';
// eslint-disable-next-line import-x/first
import { useCanvasStore } from '@/features/canvas/stores/canvasStore';
// eslint-disable-next-line import-x/first
import { detectCalendarIntent, looksLikeCalendarIntent } from '@/features/calendar/services/calendarIntentService';
// eslint-disable-next-line import-x/first
import { createEvent } from '@/features/calendar/services/calendarService';
// eslint-disable-next-line import-x/first
import { connectGoogleCalendar } from '@/features/auth/services/calendarAuthService';
// eslint-disable-next-line import-x/first
import { toast } from '@/shared/stores/toastStore';
// eslint-disable-next-line import-x/first
import * as geminiService from '../services/geminiService';
// eslint-disable-next-line import-x/first
import type { IdeaNodeData } from '@/features/canvas/types/node';

const calendarResult = {
    type: 'reminder' as const,
    title: 'Call Mama',
    date: '2026-02-19T21:00:00.000Z',
    confirmation: 'OK. Reminder set to call Mama at 9pm.',
};

const eventMeta = {
    id: 'gcal-1', type: 'reminder' as const, title: 'Call Mama',
    date: '2026-02-19T21:00:00.000Z', status: 'synced' as const,
    syncedAt: Date.now(), calendarId: 'primary',
};

function addIdeaNode(id: string, heading: string) {
    useCanvasStore.getState().addNode({
        id, workspaceId: 'ws-1', type: 'idea',
        data: { heading, isGenerating: false } as IdeaNodeData,
        position: { x: 0, y: 0 },
        createdAt: new Date(), updatedAt: new Date(),
    });
}

describe('useNodeGeneration - calendar intent', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockIsCalendarConnected = true;
        useCanvasStore.setState({ nodes: [], edges: [], selectedNodeIds: new Set() });
    });

    it('creates calendar event when intent detected and calendar connected', async () => {
        addIdeaNode('n1', 'Remind me to call Mama at 9pm');
        (looksLikeCalendarIntent as Mock).mockReturnValue(true);
        (detectCalendarIntent as Mock).mockResolvedValue(calendarResult);
        (createEvent as Mock).mockResolvedValue(eventMeta);

        const { result } = renderHook(() => useNodeGeneration());
        await act(async () => { await result.current.generateFromPrompt('n1'); });

        expect(createEvent).toHaveBeenCalledWith('reminder', 'Call Mama', '2026-02-19T21:00:00.000Z', undefined, undefined);
        const node = useCanvasStore.getState().nodes.find(n => n.id === 'n1');
        expect(node?.data.output).toBe('OK. Reminder set to call Mama at 9pm.');
        expect(node?.data.calendarEvent).toEqual(eventMeta);
        expect(node?.data.isGenerating).toBe(false);
        expect(geminiService.generateContentWithContext).not.toHaveBeenCalled();
    });

    it('triggers connect and creates event when not connected', async () => {
        mockIsCalendarConnected = false;
        addIdeaNode('n1', 'Remind me to call Mama');
        (looksLikeCalendarIntent as Mock).mockReturnValue(true);
        (connectGoogleCalendar as Mock).mockResolvedValue(true);
        (detectCalendarIntent as Mock).mockResolvedValue(calendarResult);
        (createEvent as Mock).mockResolvedValue(eventMeta);

        const { result } = renderHook(() => useNodeGeneration());
        await act(async () => { await result.current.generateFromPrompt('n1'); });

        expect(connectGoogleCalendar).toHaveBeenCalledOnce();
        expect(createEvent).toHaveBeenCalled();
        const node = useCanvasStore.getState().nodes.find(n => n.id === 'n1');
        expect(node?.data.calendarEvent).toEqual(eventMeta);
    });

    it('stores pending event when connect fails', async () => {
        mockIsCalendarConnected = false;
        addIdeaNode('n1', 'Remind me to call Mama');
        (looksLikeCalendarIntent as Mock).mockReturnValue(true);
        (connectGoogleCalendar as Mock).mockResolvedValue(false);
        (detectCalendarIntent as Mock).mockResolvedValue(calendarResult);

        const { result } = renderHook(() => useNodeGeneration());
        await act(async () => { await result.current.generateFromPrompt('n1'); });

        expect(createEvent).not.toHaveBeenCalled();
        expect(toast.info).toHaveBeenCalled();
        const node = useCanvasStore.getState().nodes.find(n => n.id === 'n1');
        expect(node?.data.calendarEvent?.status).toBe('pending');
        expect(node?.data.calendarEvent?.id).toBe('');
    });

    it('shows error toast when createEvent throws', async () => {
        addIdeaNode('n1', 'Schedule meeting');
        (looksLikeCalendarIntent as Mock).mockReturnValue(true);
        (detectCalendarIntent as Mock).mockResolvedValue(calendarResult);
        (createEvent as Mock).mockRejectedValue(new Error('API down'));

        const { result } = renderHook(() => useNodeGeneration());
        await act(async () => { await result.current.generateFromPrompt('n1'); });

        expect(toast.error).toHaveBeenCalled();
        expect(geminiService.generateContentWithContext).not.toHaveBeenCalled();
    });

    it('falls through to normal AI generation when no calendar intent', async () => {
        addIdeaNode('n1', 'Write a poem');
        (looksLikeCalendarIntent as Mock).mockReturnValue(false);
        (detectCalendarIntent as Mock).mockResolvedValue(null);
        vi.mocked(geminiService.generateContentWithContext).mockResolvedValue('A poem...');

        const { result } = renderHook(() => useNodeGeneration());
        await act(async () => { await result.current.generateFromPrompt('n1'); });

        expect(connectGoogleCalendar).not.toHaveBeenCalled();
        expect(createEvent).not.toHaveBeenCalled();
        expect(geminiService.generateContentWithContext).toHaveBeenCalled();
    });

    it('clears generating spinner when keyword match is a false positive', async () => {
        addIdeaNode('n1', 'Call me maybe lyrics');
        (looksLikeCalendarIntent as Mock).mockReturnValue(true);
        (detectCalendarIntent as Mock).mockResolvedValue(null);
        vi.mocked(geminiService.generateContentWithContext).mockResolvedValue('Lyrics...');

        const { result } = renderHook(() => useNodeGeneration());
        await act(async () => { await result.current.generateFromPrompt('n1'); });

        const node = useCanvasStore.getState().nodes.find(n => n.id === 'n1');
        expect(node?.data.isGenerating).toBe(false);
        expect(node?.data.output).toBe('Lyrics...');
        expect(geminiService.generateContentWithContext).toHaveBeenCalled();
    });
});
