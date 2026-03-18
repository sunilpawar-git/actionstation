/**
 * Google Calendar Client
 * Delegates all Calendar API calls to Cloud Functions that manage OAuth tokens
 * server-side. No access tokens are stored or transmitted client-side.
 *
 * Previously called Google Calendar API directly from the browser (GIS Token flow).
 * Now uses Firebase httpsCallable to proxy through calendarCreate/Update/Delete/ListEvents.
 */
import { getFunctions, httpsCallable } from 'firebase/functions';
import type { FirebaseError } from 'firebase/app';
import type { CalendarEventMetadata, CalendarEventType } from '../types/calendarEvent';
import { calendarStrings as cs } from '../localization/calendarStrings';

/** Error code returned when the user needs to re-authenticate (token revoked / not connected). */
export const REAUTH_REQUIRED = 'REAUTH_REQUIRED';

/** Converts a Firebase Functions error into a domain error the rest of the app understands. */
function mapError(err: unknown, fallback: string): Error {
    if (isFirebaseError(err)) {
        if (err.code === 'functions/unauthenticated') return new Error(REAUTH_REQUIRED);
        if (err.code === 'functions/resource-exhausted') return new Error(cs.errors.syncFailed);
    }
    return new Error(err instanceof Error ? err.message : fallback);
}

function isFirebaseError(err: unknown): err is FirebaseError {
    return typeof err === 'object' && err !== null && 'code' in err;
}

/** Validates that an event ID is safe to pass to the Cloud Function. */
export function validateEventId(eventId: string): void {
    if (!/^[A-Za-z0-9_-]+$/.test(eventId) || eventId.length > 128) {
        throw new Error('Invalid event ID format');
    }
}

/** Create event via Cloud Function. */
export async function serverCreateEvent(
    type: CalendarEventType,
    title: string,
    date: string,
    endDate?: string,
    notes?: string,
): Promise<CalendarEventMetadata> {
    try {
        const fn = httpsCallable<object, CalendarEventMetadata>(getFunctions(), 'calendarCreateEvent');
        const result = await fn({ type, title, date, endDate, notes });
        return result.data;
    } catch (err) {
        throw mapError(err, cs.errors.createFailed);
    }
}

/** List events via Cloud Function. */
export async function serverListEvents(
    startDate: string,
    endDate: string,
): Promise<Array<{ title: string; date: string; endDate?: string }>> {
    try {
        const fn = httpsCallable<object, Array<{ title: string; date: string; endDate?: string }>>(
            getFunctions(), 'calendarListEvents',
        );
        const result = await fn({ startDate, endDate });
        return result.data;
    } catch (err) {
        throw mapError(err, cs.errors.readFailed);
    }
}

/** Update event via Cloud Function. */
export async function serverUpdateEvent(
    eventId: string,
    type: CalendarEventType,
    title: string,
    date: string,
    endDate?: string,
    notes?: string,
): Promise<CalendarEventMetadata> {
    validateEventId(eventId);
    try {
        const fn = httpsCallable<object, CalendarEventMetadata>(getFunctions(), 'calendarUpdateEvent');
        const result = await fn({ eventId, type, title, date, endDate, notes });
        return result.data;
    } catch (err) {
        throw mapError(err, cs.errors.updateFailed);
    }
}

/** Delete event via Cloud Function. */
export async function serverDeleteEvent(eventId: string): Promise<void> {
    validateEventId(eventId);
    try {
        const fn = httpsCallable(getFunctions(), 'calendarDeleteEvent');
        await fn({ eventId });
    } catch (err) {
        throw mapError(err, cs.errors.deleteFailed);
    }
}
