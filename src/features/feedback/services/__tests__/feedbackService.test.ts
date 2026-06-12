import { describe, it, expect, vi, beforeEach } from 'vitest';
import { submitFeedback } from '../feedbackService';
import type { FeedbackType } from '../../types/feedback';

const mockAddDoc = vi.fn();
const mockCollection = vi.fn((_db: unknown, ...segments: string[]) => ({ _path: segments.join('/') }));

vi.mock('@/config/firebase', () => ({ db: {} }));
vi.mock('@/shared/services/logger', () => ({
    logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));
vi.mock('firebase/firestore', () => ({
    collection: (db: unknown, ...segments: string[]) => mockCollection(db, ...segments),
    addDoc: (ref: unknown, data: unknown) => mockAddDoc(ref, data),
    serverTimestamp: vi.fn(() => 'SERVER_TS'),
}));

const MOCK_UUID = 'feed-aaaa-bbbb-cccc';
vi.stubGlobal('crypto', { randomUUID: vi.fn(() => MOCK_UUID) });

describe('feedbackService', () => {
    beforeEach(() => { vi.clearAllMocks(); });

    describe('submitFeedback', () => {
        it('calls addDoc with the correct Firestore path', async () => {
            mockAddDoc.mockResolvedValue({ id: 'doc-1' });
            await submitFeedback('user-1', 'general', 'This app is great!');
            expect(mockCollection).toHaveBeenCalledWith({}, 'users', 'user-1', 'feedback');
            expect(mockAddDoc).toHaveBeenCalledOnce();
        });

        it('writes userId, type, message, createdAt and browserInfo to Firestore', async () => {
            mockAddDoc.mockResolvedValue({ id: 'doc-1' });
            await submitFeedback('user-1', 'bug', 'Something is broken here!');
            const [, doc] = mockAddDoc.mock.calls[0] as [unknown, Record<string, unknown>];
            expect(doc.userId).toBe('user-1');
            expect(doc.type).toBe('bug');
            expect(doc.message).toBe('Something is broken here!');
            expect(doc.createdAt).toBe('SERVER_TS');
            expect(typeof doc.browserInfo).toBe('string');
        });

        it('trims whitespace from message before storing', async () => {
            mockAddDoc.mockResolvedValue({ id: 'doc-1' });
            await submitFeedback('user-1', 'general', '   Nice app! Works well.   ');
            const [, doc] = mockAddDoc.mock.calls[0] as [unknown, Record<string, unknown>];
            expect(doc.message).toBe('Nice app! Works well.');
        });

        it('throws when message is too short (< 10 chars)', async () => {
            await expect(submitFeedback('user-1', 'general', 'Short')).rejects.toThrow('at least 10');
        });

        it('throws when message is too long (> 2000 chars)', async () => {
            const longMessage = 'x'.repeat(2001);
            await expect(submitFeedback('user-1', 'general', longMessage)).rejects.toThrow('at most 2000');
        });

        it('throws when userId is empty', async () => {
            await expect(submitFeedback('', 'general', 'Valid message here!')).rejects.toThrow();
        });

        it('accepts all valid feedback types', async () => {
            mockAddDoc.mockResolvedValue({ id: 'doc-1' });
            const types: FeedbackType[] = ['bug', 'feature', 'general'];
            for (const type of types) {
                await expect(submitFeedback('user-1', type, 'This is my feedback message!')).resolves.toBeUndefined();
            }
            expect(mockAddDoc).toHaveBeenCalledTimes(3);
        });

        it('includes browser info string in the stored document (no PII)', async () => {
            mockAddDoc.mockResolvedValue({ id: 'doc-1' });
            await submitFeedback('user-1', 'general', 'This is fine feedback.');
            const [, doc] = mockAddDoc.mock.calls[0] as [unknown, Record<string, unknown>];
            expect(doc.browserInfo).toContain('language');
            expect(doc.browserInfo).not.toContain('userAgent');
            expect(doc.browserInfo).not.toContain('platform');
        });
    });
});
