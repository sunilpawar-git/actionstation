import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { FEEDBACK_MESSAGE_MAX, FEEDBACK_MESSAGE_MIN } from '../types/feedback';
import type { FeedbackType } from '../types/feedback';

// Collects only non-identifying technical context (no PII, no screen dimensions).
function getBrowserInfo(): string {
    return JSON.stringify({ language: navigator.language });
}

export async function submitFeedback(
    userId: string,
    type: FeedbackType,
    rawMessage: string,
): Promise<void> {
    if (!userId) throw new Error('userId is required');
    const message = rawMessage.trim();
    if (message.length < FEEDBACK_MESSAGE_MIN) {
        throw new Error(`Message must be at least ${FEEDBACK_MESSAGE_MIN} characters.`);
    }
    if (message.length > FEEDBACK_MESSAGE_MAX) {
        throw new Error(`Message must be at most ${FEEDBACK_MESSAGE_MAX} characters.`);
    }
    const ref = collection(db, 'users', userId, 'feedback');
    await addDoc(ref, {
        userId,
        type,
        message,
        browserInfo: getBrowserInfo(),
        createdAt: serverTimestamp(),
    });
}
