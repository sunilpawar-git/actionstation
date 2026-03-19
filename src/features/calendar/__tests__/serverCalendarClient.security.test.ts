/**
 * Server Calendar Client - Security Hardening Tests
 * Validates client-side event ID sanitisation before the httpsCallable is invoked.
 * The new serverCalendarClient delegates to Cloud Functions instead of calling
 * Google Calendar API directly, but still validates event IDs client-side.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Firebase Functions — the security tests only care about validation BEFORE the call
vi.mock('firebase/functions', () => ({
    getFunctions: vi.fn(() => ({})),
    httpsCallable: vi.fn(() => vi.fn().mockResolvedValue({ data: { id: 'test-event' } })),
}));

vi.mock('../localization/calendarStrings', () => ({
    calendarStrings: {
        errors: {
            syncFailed: 'Sync failed',
            createFailed: 'Create failed',
            updateFailed: 'Update failed',
            deleteFailed: 'Delete failed',
            readFailed: 'Read failed',
        },
    },
}));

// eslint-disable-next-line import-x/first
import { serverUpdateEvent, serverDeleteEvent, validateEventId } from '../services/serverCalendarClient';

describe('serverCalendarClient - Security Validation', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('validateEventId — path-traversal protection', () => {
        it('rejects event ID with path traversal (..)', () => {
            expect(() => validateEventId('../other-calendar')).toThrow('Invalid event ID');
        });

        it('rejects event ID with forward slash', () => {
            expect(() => validateEventId('calendar/events/malicious')).toThrow('Invalid event ID');
        });

        it('rejects event ID with URL-encoded characters', () => {
            expect(() => validateEventId('event%2F%2E%2E%2Fmalicious')).toThrow('Invalid event ID');
        });

        it('rejects event ID with special characters', () => {
            expect(() => validateEventId('event<script>alert(1)</script>')).toThrow('Invalid event ID');
        });

        it('rejects blank string', () => {
            expect(() => validateEventId('')).toThrow('Invalid event ID');
        });

        it('accepts valid Google Calendar event ID (alphanumeric, dash, underscore)', () => {
            expect(() => validateEventId('abc123_xyz-789')).not.toThrow();
        });

        it('accepts event ID with mixed case and digits', () => {
            expect(() => validateEventId('event_123-ABC-xyz_789')).not.toThrow();
        });
    });

    describe('serverUpdateEvent — rejects before calling Cloud Function', () => {
        it('throws on path traversal in eventId', async () => {
            await expect(
                serverUpdateEvent('../other-calendar', 'event', 'Test', '2026-01-01'),
            ).rejects.toThrow('Invalid event ID');
        });

        it('throws on slash in eventId', async () => {
            await expect(
                serverUpdateEvent('calendar/events/malicious', 'event', 'Test', '2026-01-01'),
            ).rejects.toThrow('Invalid event ID');
        });

        it('calls httpsCallable with valid eventId', async () => {
            const { httpsCallable } = await import('firebase/functions');
            const mockFn = vi.fn().mockResolvedValue({ data: {} });
            vi.mocked(httpsCallable).mockReturnValue(mockFn as never);

            await serverUpdateEvent('valid_event_123', 'event', 'Title', '2026-01-01T10:00:00Z');
            expect(mockFn).toHaveBeenCalledWith(expect.objectContaining({ eventId: 'valid_event_123' }));
        });
    });

    describe('serverDeleteEvent — rejects before calling Cloud Function', () => {
        it('throws on path traversal', async () => {
            await expect(serverDeleteEvent('../other-event')).rejects.toThrow('Invalid event ID');
        });

        it('throws on forward slash', async () => {
            await expect(serverDeleteEvent('calendar/malicious')).rejects.toThrow('Invalid event ID');
        });

        it('calls httpsCallable with valid eventId', async () => {
            const { httpsCallable } = await import('firebase/functions');
            const mockFn = vi.fn().mockResolvedValue({ data: null });
            vi.mocked(httpsCallable).mockReturnValue(mockFn as never);

            await serverDeleteEvent('valid_event_123');
            expect(mockFn).toHaveBeenCalledWith(expect.objectContaining({ eventId: 'valid_event_123' }));
        });
    });
});

