/**
 * Calendar Intent Handler - Orchestrates calendar event creation from AI intents.
 * Extracted from useNodeGeneration to keep the hook under the 75-line limit.
 */
import { useCanvasStore } from '@/features/canvas/stores/canvasStore';
import { toast } from '@/shared/stores/toastStore';
import {
    detectCalendarIntent, looksLikeCalendarIntent,
    type CalendarIntentResult,
} from './calendarIntentService';
import { createEvent, listEvents } from './calendarService';
import { disconnectGoogleCalendar } from '@/features/auth/services/calendarAuthService';
import { calendarStrings as cs } from '../localization/calendarStrings';
import { REAUTH_REQUIRED } from './serverCalendarClient';
import { formatEventsMarkdown } from './calendarEventFormatter';
import { useAuthStore } from '@/features/auth/stores/authStore';

/**
 * Check whether the user has Google Calendar connected.
 * In the new server-side OAuth flow, connecting requires a full-page redirect
 * (connectGoogleCalendar). We no longer trigger that inline; instead the event
 * is stored as pending and the user can retry via the calendar badge after connecting.
 */
function isCalendarReady(): boolean {
    return useAuthStore.getState().isCalendarConnected;
}

/**
 * Handle a detected calendar intent — creates event or stores as pending.
 */
async function handleCalendarIntent(
    nodeId: string,
    intent: CalendarIntentResult,
    hasToken: boolean,
): Promise<void> {
    const store = useCanvasStore.getState();

    if (!hasToken) {
        if (intent.type === 'read') {
            store.updateNodeOutput(nodeId, cs.errors.readNoToken);
            toast.info(cs.errors.readNoToken);
            return;
        }

        store.setNodeCalendarEvent(nodeId, {
            id: '',
            type: intent.type,
            title: intent.title,
            date: intent.date,
            endDate: intent.endDate,
            notes: intent.notes,
            status: 'pending',
            calendarId: 'primary',
        });
        store.updateNodeOutput(nodeId, intent.confirmation);
        toast.info(cs.errors.noTokenRetry);
        return;
    }

    try {
        if (intent.type === 'read') {
            let end = intent.endDate;
            if (!end || end === intent.date) {
                const d = new Date(intent.date);
                d.setHours(d.getHours() + 1);
                end = d.toISOString();
            }
            const events = await listEvents(intent.date, end);
            const markdown = formatEventsMarkdown(events);

            // For reads, we just update the text content and don't add a badge
            store.updateNodeOutput(nodeId, markdown);
        } else {
            const meta = await createEvent(intent.type, intent.title, intent.date, intent.endDate, intent.notes);
            store.setNodeCalendarEvent(nodeId, meta);
            store.updateNodeOutput(nodeId, intent.confirmation);
        }
    } catch (err) {
        if (err instanceof Error && err.message === REAUTH_REQUIRED) {
            disconnectGoogleCalendar();
            store.updateNodeOutput(nodeId, cs.errors.sessionExpired);
            toast.error(cs.errors.sessionExpired);
            return;
        }

        const errorMsg = intent.type === 'read' ? cs.errors.readFailed : cs.errors.createFailed;
        store.updateNodeOutput(nodeId, errorMsg);
        toast.error(errorMsg);
    }
}

/**
 * Process a potential calendar intent for a node.
 * Returns true if the prompt was handled as a calendar intent.
 * The spinner (isGenerating) is managed by the caller (useNodeGeneration).
 */
export async function processCalendarIntent(nodeId: string, promptText: string): Promise<boolean> {
    const calendarTokenReady = looksLikeCalendarIntent(promptText)
        ? isCalendarReady()
        : false;

    const calendarIntent = await detectCalendarIntent(promptText);
    if (calendarIntent) {
        await handleCalendarIntent(nodeId, calendarIntent, calendarTokenReady);
        return true;
    }
    return false;
}
