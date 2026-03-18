/**
 * Threat Monitor — cross-endpoint anomaly and spike detection.
 *
 * Maintains per-type sliding-window counters in memory.  When a counter
 * crosses its threshold, logSecurityEvent() is called at CRITICAL severity
 * so a Cloud Monitoring log-based alert fires immediately.
 *
 * Counter resets on cold start — intentional.  We want per-instance spike
 * detection rather than a distributed counter (which would need Redis).
 * Even a single-instance spike is enough to warrant investigation.
 *
 * Integrate by calling recordThreatEvent() whenever a 429, 500, or auth
 * failure is returned.  The caller does not need to check the return value
 * (fire-and-forget is fine since all side effects are logging-only).
 */
import { logSecurityEvent, SecurityEventType } from './securityLogger.js';

// ─── Types ────────────────────────────────────────────────────────────────

/** Categories of threat events we track */
export type ThreatType =
    | '429_spike'
    | '500_spike'
    | 'auth_failure_spike'
    | 'bot_spike';

interface ThreatWindow {
    count: number;
    windowStart: number;
}

// ─── Configuration ────────────────────────────────────────────────────────

/** Events per minute that trigger a CRITICAL spike alert */
export const SPIKE_THRESHOLDS: Record<ThreatType, number> = {
    '429_spike': 50,          // 50 rate-limit hits/min → DDoS or credential stuffing
    '500_spike': 20,          // 20 server errors/min → exploit probing or regression
    'auth_failure_spike': 30, // 30 auth failures/min → credential stuffing
    'bot_spike': 10,          // 10 bot detections/min → coordinated scanner
};

const THREAT_WINDOW_MS = 60_000; // 1-minute sliding window

// ─── State ────────────────────────────────────────────────────────────────

const threatCounters = new Map<ThreatType, ThreatWindow>();

// ─── Public API ───────────────────────────────────────────────────────────

/**
 * Record a single threat event.  Logs a CRITICAL entry and returns true
 * when the per-minute threshold is crossed; otherwise returns false.
 *
 * @param type     Which category of threat
 * @param metadata Additional context (uid, ip, endpoint…)
 */
export function recordThreatEvent(
    type: ThreatType,
    metadata?: Record<string, unknown>,
): boolean {
    const now = Date.now();
    let window = threatCounters.get(type);

    // Slide the window
    if (!window || now - window.windowStart > THREAT_WINDOW_MS) {
        window = { count: 0, windowStart: now };
        threatCounters.set(type, window);
    }

    window.count++;

    const threshold = SPIKE_THRESHOLDS[type];
    if (window.count >= threshold) {
        // Reset so the alert fires once per window, not on every subsequent hit
        window.count = 0;
        window.windowStart = now;

        logSecurityEvent({
            type: SecurityEventType.THREAT_SPIKE,
            endpoint: (metadata?.endpoint as string | undefined) ?? 'system',
            message: `Spike: ${type} reached ${threshold} events/min`,
            metadata: {
                threat_type: type,
                threshold,
                ...metadata,
            },
        });

        return true;
    }

    return false;
}

/**
 * Return the current event count for a threat type (within the active window).
 * Useful for tests and dashboards.
 */
export function getThreatCount(type: ThreatType): number {
    const window = threatCounters.get(type);
    if (!window) return 0;
    if (Date.now() - window.windowStart > THREAT_WINDOW_MS) return 0;
    return window.count;
}

/** Reset all counters (for testing only) */
export function clearThreatCounters(): void {
    threatCounters.clear();
}
