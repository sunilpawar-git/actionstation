/**
 * Calendar Auth Service - Google OAuth connection management
 * Uses Google Identity Services (GIS) SDK to retrieve a pure client-side
 * Access Token.
 */
import { auth } from '@/config/firebase';
import { useAuthStore } from '../stores/authStore';
import { calendarStrings as cs } from '@/shared/localization/calendarStrings';

const GIS_SCRIPT_URL = 'https://accounts.google.com/gsi/client';
const CALENDAR_SCOPE = 'https://www.googleapis.com/auth/calendar.events';

export const STORAGE_KEY = 'eden_calendar_token';
export const EXPIRY_KEY = 'eden_calendar_expiry';

/** Reject tokens containing XSS/injection or header-injection characters */
export const DANGEROUS_TOKEN_CHARS = /[<>"'`;&|\r\n\0]/;

export function getCalendarToken(): string | null {
    const token = localStorage.getItem(STORAGE_KEY);
    const expiry = localStorage.getItem(EXPIRY_KEY);
    if (!token || !expiry) return null;

    if (DANGEROUS_TOKEN_CHARS.test(token)) {
        console.warn('Invalid calendar token format detected, clearing');
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(EXPIRY_KEY);
        return null;
    }

    const expiryMs = parseInt(expiry, 10);
    if (Number.isNaN(expiryMs) || Date.now() > expiryMs) {
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(EXPIRY_KEY);
        return null;
    }
    return token;
}

let gisScriptPromise: Promise<void> | null = null;
let gisScriptLoaded = false;

/** Load the GIS SDK script tag if not already present. */
function ensureGisScript(): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (gisScriptLoaded || window.google?.accounts?.oauth2) {
        gisScriptLoaded = true;
        return Promise.resolve();
    }

    if (gisScriptPromise) {
        return gisScriptPromise;
    }

    gisScriptPromise = new Promise<void>((resolve, reject) => {
        const script = document.createElement('script');
        script.src = GIS_SCRIPT_URL;
        script.async = true;
        script.onload = () => {
            gisScriptLoaded = true;
            resolve();
        };
        script.onerror = () => {
            gisScriptPromise = null;
            reject(new Error(cs.errors.noToken));
        };
        document.head.appendChild(script);
    });

    return gisScriptPromise;
}

/**
 * Connect Google Calendar via the GIS Token client flow.
 * Shows a popup, then saves the access token to localStorage.
 */
export async function connectGoogleCalendar(): Promise<boolean> {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId || !auth.currentUser) return false;

    await ensureGisScript();

    const googleApi = window.google;
    if (!googleApi) return false;

    return new Promise<boolean>((resolve) => {
        const client = googleApi.accounts.oauth2.initTokenClient({
            client_id: clientId,
            scope: CALENDAR_SCOPE,
            callback: (response) => {
                if ('error' in response && response.error) {
                    resolve(false);
                    return;
                }
                const token = response.access_token;

                if (DANGEROUS_TOKEN_CHARS.test(token)) {
                    resolve(false);
                    return;
                }

                const expiresInStr = response.expires_in;
                const expiresIn = typeof expiresInStr === 'number' ? expiresInStr : (Number(expiresInStr) || 3599); // Default 1 hr
                // Subtract 1 minute just to be safe with margins
                const expiryTime = Date.now() + (expiresIn - 60) * 1000;

                localStorage.setItem(STORAGE_KEY, token);
                localStorage.setItem(EXPIRY_KEY, expiryTime.toString());

                useAuthStore.getState().setCalendarConnected(true);
                resolve(true);
            },
            error_callback: () => {
                resolve(false);
            },
        });

        client.requestAccessToken({ prompt: 'consent' });
    });
}

/**
 * Disconnect Google Calendar by removing the token from localStorage
 * and attempting to revoke it on Google's servers.
 */
export function disconnectGoogleCalendar(): boolean {
    if (!auth.currentUser) return false;

    const token = getCalendarToken();
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(EXPIRY_KEY);
    useAuthStore.getState().setCalendarConnected(false);

    if (token) {
        // Optimistically revoke the token, but don't fail if it doesn't work
        try {
            fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(token)}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            }).catch(() => {
                // Ignore silent revocation failures
            });
        } catch {
            // Ignore fetch errors during revocation
        }
    }

    return true;
}

/**
 * Check if the user has a valid calendar token stored locally.
 * Called on auth state change to restore isCalendarConnected across reloads.
 */
export function checkCalendarConnection(): void {
    if (!auth.currentUser) return;

    const token = getCalendarToken();
    useAuthStore.getState().setCalendarConnected(!!token);
}

