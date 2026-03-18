/**
 * CalendarCallback - Google OAuth redirect handler
 * Rendered when the browser lands on /auth/calendar/callback after Google
 * redirects back with an authorization code.
 *
 * Reads `code` and `state` from the URL, calls handleCalendarCallback, then
 * redirects back to the canvas (or wherever the user was before connecting).
 */
import { useEffect, useRef, useState } from 'react';
import { handleCalendarCallback } from '../services/calendarAuthService';
import { logger } from '@/shared/services/logger';

export function CalendarCallback() {
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const hasRun = useRef(false);

    useEffect(() => {
        // Guard against React Strict Mode double-invocation.
        // The authorization code is single-use; running twice would cause
        // the second invocation to get invalid_grant from Google.
        if (hasRun.current) return;
        hasRun.current = true;
        const run = async () => {
            const params = new URLSearchParams(window.location.search);
            const code = params.get('code');
            const state = params.get('state');
            const error = params.get('error');

            if (error || !code || !state) {
                logger.warn('[CalendarCallback] OAuth error or missing params', undefined, { error });
                setStatus('error');
                setTimeout(() => {
                    const returnTo = sessionStorage.getItem('oauth_return_to') ?? '/';
                    sessionStorage.removeItem('oauth_return_to');
                    window.location.replace(returnTo);
                }, 2000);
                return;
            }

            const ok = await handleCalendarCallback(code, state);
            setStatus(ok ? 'success' : 'error');

            setTimeout(() => {
                const returnTo = sessionStorage.getItem('oauth_return_to') ?? '/';
                sessionStorage.removeItem('oauth_return_to');
                window.location.replace(returnTo);
            }, ok ? 800 : 2000);
        };

        run().catch((err: unknown) => {
            logger.warn('[CalendarCallback] Unhandled error', err instanceof Error ? err : new Error(String(err)));
            setStatus('error');
        });
    }, []);

    return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', flexDirection: 'column', gap: '1rem', fontFamily: 'sans-serif' }}>
            {status === 'loading' && (
                <>
                    <div className="loading-spinner" />
                    <p>Connecting your Google Calendar…</p>
                </>
            )}
            {status === 'success' && (
                <p>✅ Google Calendar connected! Redirecting…</p>
            )}
            {status === 'error' && (
                <p>❌ Could not connect Google Calendar. Redirecting…</p>
            )}
        </div>
    );
}
