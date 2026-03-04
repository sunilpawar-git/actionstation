/**
 * Analytics Service — PostHog
 * Wraps PostHog with typed events. DSN loaded from VITE_POSTHOG_KEY.
 * Safe to call even when PostHog is not configured (no-ops silently).
 */
import posthog from 'posthog-js';

const KEY = import.meta.env.VITE_POSTHOG_KEY;
const HOST = import.meta.env.VITE_POSTHOG_HOST ?? 'https://app.posthog.com';

let initialized = false;

/**
 * Initialize PostHog. Call once at app startup.
 */
export function initAnalytics(): void {
    if (!KEY) {
        if (import.meta.env.DEV) {
            console.info('[Analytics] VITE_POSTHOG_KEY not set — skipping initialization.');
        }
        return;
    }

    posthog.init(KEY, {
        api_host: HOST,
        // Don't auto-capture all clicks — we track meaningful events manually
        autocapture: false,
        // Respect Do Not Track
        respect_dnt: true,
        // Persist user identity across page reloads
        persistence: 'localStorage',
        // Disable session recording by default; enable explicitly if needed
        disable_session_recording: true,
        loaded(ph) {
            if (import.meta.env.DEV) {
                ph.opt_out_capturing(); // Don't pollute prod data with dev events
            }
        },
    });

    initialized = true;
}

/**
 * Identify the signed-in user. Call after successful authentication.
 * We only pass the opaque user ID — no PII (name, email).
 */
export function identifyUser(userId: string): void {
    if (!initialized) return;
    posthog.identify(userId);
}

/**
 * Reset identity on sign-out so next user gets a fresh anonymous ID.
 */
export function resetAnalyticsUser(): void {
    if (!initialized) return;
    posthog.reset();
}

// ── Typed event catalogue ─────────────────────────────────────────────────────

export function trackSignIn(): void {
    track('sign_in');
}

export function trackSignOut(): void {
    track('sign_out');
}

export function trackNodeCreated(nodeType: string): void {
    track('node_created', { node_type: nodeType });
}

export function trackAiGenerated(nodeType: string): void {
    track('ai_generated', { node_type: nodeType });
}

export function trackWorkspaceCreated(): void {
    track('workspace_created');
}

export function trackWorkspaceDeleted(): void {
    track('workspace_deleted');
}

export function trackKbEntryAdded(method: 'paste' | 'file'): void {
    track('kb_entry_added', { method });
}

type SettingKey =
    | 'theme' | 'canvasGrid' | 'autoSave' | 'autoSaveInterval'
    | 'compactMode' | 'canvasScrollMode' | 'connectorStyle'
    | 'isCanvasLocked' | 'canvasFreeFlow' | 'data_export';

export function trackSettingsChanged(setting: SettingKey, value: string | boolean | number): void {
    track('settings_changed', { setting, value });
}

// ── Internal helper ───────────────────────────────────────────────────────────

function track(event: string, properties?: Record<string, unknown>): void {
    if (!initialized) return;
    posthog.capture(event, properties);
}
