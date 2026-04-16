/**
 * consentService — pure analytics/cookie consent storage.
 * Reads and writes consent choice to localStorage.
 * No side effects — all analytics calls happen in useConsentState.
 */
import type { ConsentChoice } from '../types/consent';

const CONSENT_KEY = 'as_analytics_consent';

export const consentService = {
    getChoice(): ConsentChoice {
        const stored = localStorage.getItem(CONSENT_KEY);
        if (stored === 'accepted' || stored === 'rejected') return stored;
        return 'pending';
    },

    hasConsented(): boolean {
        return localStorage.getItem(CONSENT_KEY) === 'accepted';
    },

    accept(): void {
        localStorage.setItem(CONSENT_KEY, 'accepted');
    },

    reject(): void {
        localStorage.setItem(CONSENT_KEY, 'rejected');
    },

    clear(): void {
        localStorage.removeItem(CONSENT_KEY);
    },

    isDntEnabled(): boolean {
        return navigator.doNotTrack === '1';
    },
};
