/**
 * Sentry Error Tracking Service
 * Initializes Sentry SDK and exports capture helpers.
 * DSN is loaded from VITE_SENTRY_DSN env var — never hardcoded.
 */
import * as Sentry from '@sentry/react';

const DSN = import.meta.env.VITE_SENTRY_DSN;
const ENV = import.meta.env.VITE_APP_ENV ?? import.meta.env.MODE;

/**
 * Initialize Sentry. Call once at app startup before rendering.
 * No-ops gracefully if DSN is absent (e.g. local dev without config).
 */
export function initSentry(): void {
    if (!DSN) {
        if (import.meta.env.DEV) {
            console.info('[Sentry] VITE_SENTRY_DSN not set — skipping initialization.');
        }
        return;
    }

    Sentry.init({
        dsn: DSN,
        environment: ENV,
        // Only capture a sample of performance traces to keep quota low
        tracesSampleRate: ENV === 'production' ? 0.1 : 0,
        // Replay 10% of sessions, 100% of sessions with errors
        replaysSessionSampleRate: 0.1,
        replaysOnErrorSampleRate: 1.0,
        integrations: [
            Sentry.browserTracingIntegration(),
            Sentry.replayIntegration(),
        ],
        // Strip PII from breadcrumbs
        beforeBreadcrumb(breadcrumb) {
            if (breadcrumb.category === 'xhr' || breadcrumb.category === 'fetch') {
                // Redact query strings that may contain tokens
                if (typeof breadcrumb.data?.url === 'string') {
                    breadcrumb.data.url = breadcrumb.data.url.split('?')[0] ?? breadcrumb.data.url;
                }
            }
            return breadcrumb;
        },
    });
}

/**
 * Tag the current Sentry scope with the authenticated user.
 * Call after successful sign-in.
 */
export function setSentryUser(userId: string): void {
    Sentry.setUser({ id: userId });
}

/**
 * Clear user context on sign-out.
 */
export function clearSentryUser(): void {
    Sentry.setUser(null);
}

/**
 * Capture a handled exception with optional context.
 */
export function captureError(error: unknown, context?: Record<string, unknown>): void {
    Sentry.withScope((scope) => {
        if (context) {
            scope.setExtras(context);
        }
        Sentry.captureException(error);
    });
}
