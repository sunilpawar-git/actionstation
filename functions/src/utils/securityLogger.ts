/**
 * Security Logger — structured security event logging for Cloud Logging
 * Writing structured JSON to stdout/stderr is automatically ingested by
 * Google Cloud Logging when running in Cloud Functions.
 *
 * Set up a Cloud Monitoring log-based alert on:
 *   jsonPayload.labels.eden_security="true" AND severity>=ERROR
 * to receive real-time threat notifications.
 */

/** All security event types this system records */
export const SecurityEventType = {
    /** AI prompt accepted — records sanitized prompt hash for audit */
    AI_PROMPT: 'ai_prompt',
    /** Firebase Auth token missing or invalid */
    AUTH_FAILURE: 'auth_failure',
    /** Per-user rate limit exceeded */
    RATE_LIMIT_VIOLATION: 'rate_limit_violation',
    /** Per-IP rate limit exceeded */
    IP_BLOCKED: 'ip_blocked',
    /** Firestore rule or function ACL denied access */
    RULE_DENIAL: 'rule_denial',
    /** Request matched bot/scanner signature */
    BOT_DETECTED: 'bot_detected',
    /** Prompt injection or exfiltration pattern found */
    PROMPT_INJECTION: 'prompt_injection',
    /** Cross-endpoint spike threshold exceeded */
    THREAT_SPIKE: 'threat_spike',
    /** File upload rejected by validator */
    UPLOAD_REJECTED: 'upload_rejected',
    /** Cloudflare Turnstile or Google reCAPTCHA challenge failed */
    CAPTCHA_FAILED: 'captcha_failed',
} as const;

export type SecurityEventType = (typeof SecurityEventType)[keyof typeof SecurityEventType];

/** Shape of every security log entry */
export interface SecurityEvent {
    type: SecurityEventType;
    /** Firebase UID, if authenticated */
    uid?: string;
    /** Client IP (from X-Forwarded-For or req.ip) */
    ip?: string;
    /** Cloud Function endpoint name */
    endpoint: string;
    /** Human-readable description of the event */
    message: string;
    /** Additional structured context (kept shallow to stay searchable) */
    metadata?: Record<string, unknown>;
}

/**
 * Write a structured security event to Cloud Logging.
 *
 * Cloud Functions maps:
 *   - console.log   → INFO
 *   - console.warn  → WARNING
 *   - console.error → ERROR
 *
 * HIGH/CRITICAL events write to stderr so Cloud Alerting policies can
 * trigger on severity >= ERROR without extra configuration.
 */
export function logSecurityEvent(event: SecurityEvent): void {
    const severity = getSeverity(event.type);

    const entry = {
        severity,
        message: `[SECURITY:${event.type}] ${event.message}`,
        labels: {
            eden_security: 'true',
            event_type: event.type,
        },
        uid: event.uid ?? 'anonymous',
        ip: event.ip ?? 'unknown',
        endpoint: event.endpoint,
        timestamp: new Date().toISOString(),
        ...(event.metadata ?? {}),
    };

    const line = JSON.stringify(entry);

    if (severity === 'ERROR' || severity === 'CRITICAL') {
        console.error(line);
    } else {
        console.warn(line);
    }
}

function getSeverity(
    type: SecurityEventType,
): 'WARNING' | 'ERROR' | 'CRITICAL' {
    switch (type) {
        case SecurityEventType.THREAT_SPIKE:
            return 'CRITICAL';
        case SecurityEventType.BOT_DETECTED:
        case SecurityEventType.PROMPT_INJECTION:
        case SecurityEventType.IP_BLOCKED:
            return 'ERROR';
        default:
            return 'WARNING';
    }
}
