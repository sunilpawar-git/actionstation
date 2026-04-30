export type FeedbackType = 'bug' | 'feature' | 'general';

// Note: id is assigned by Firestore (not written by the client); omit from the stored shape.
export interface FeedbackEntry {
    userId: string;
    type: FeedbackType;
    message: string;
    browserInfo: string;
    createdAt: unknown; // serverTimestamp
}

export const FEEDBACK_MESSAGE_MAX = 2000;
export const FEEDBACK_MESSAGE_MIN = 10;
export const VALID_FEEDBACK_TYPES: readonly FeedbackType[] = ['bug', 'feature', 'general'];
