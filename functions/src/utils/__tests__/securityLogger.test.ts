/**
 * Security Logger Tests
 * Validates that log entries are correctly structured and written to the
 * appropriate console stream based on severity.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
    logSecurityEvent,
    SecurityEventType,
    type SecurityEvent,
} from '../securityLogger.js';

describe('securityLogger', () => {
    let warnSpy: ReturnType<typeof vi.spyOn>;
    let errorSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
        warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
        errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('writes WARNING events to console.warn', () => {
        const event: SecurityEvent = {
            type: SecurityEventType.AUTH_FAILURE,
            uid: 'user-1',
            ip: '1.2.3.4',
            endpoint: 'geminiProxy',
            message: 'Token missing',
        };
        logSecurityEvent(event);
        expect(warnSpy).toHaveBeenCalledOnce();
        expect(errorSpy).not.toHaveBeenCalled();
    });

    it('writes ERROR events to console.error for BOT_DETECTED', () => {
        logSecurityEvent({
            type: SecurityEventType.BOT_DETECTED,
            ip: '1.2.3.4',
            endpoint: 'geminiProxy',
            message: 'sqlmap UA',
        });
        expect(errorSpy).toHaveBeenCalledOnce();
        expect(warnSpy).not.toHaveBeenCalled();
    });

    it('writes CRITICAL events to console.error for THREAT_SPIKE', () => {
        logSecurityEvent({
            type: SecurityEventType.THREAT_SPIKE,
            endpoint: 'system',
            message: '429 spike',
        });
        expect(errorSpy).toHaveBeenCalledOnce();
    });

    it('writes PROMPT_INJECTION at ERROR severity', () => {
        logSecurityEvent({
            type: SecurityEventType.PROMPT_INJECTION,
            uid: 'user-2',
            endpoint: 'geminiProxy',
            message: 'Injection detected',
        });
        expect(errorSpy).toHaveBeenCalledOnce();
    });

    it('includes all required fields in the JSON payload', () => {
        logSecurityEvent({
            type: SecurityEventType.RATE_LIMIT_VIOLATION,
            uid: 'user-3',
            ip: '5.6.7.8',
            endpoint: 'fetchLinkMeta',
            message: 'Rate limit hit',
            metadata: { count: 21 },
        });

        const raw = warnSpy.mock.calls[0]?.[0] as string;
        const parsed = JSON.parse(raw) as Record<string, unknown>;

        expect(parsed.severity).toBe('WARNING');
        expect(parsed.uid).toBe('user-3');
        expect(parsed.ip).toBe('5.6.7.8');
        expect(parsed.endpoint).toBe('fetchLinkMeta');
        expect((parsed.labels as Record<string,string>).eden_security).toBe('true');
        expect((parsed.labels as Record<string,string>).event_type).toBe(SecurityEventType.RATE_LIMIT_VIOLATION);
        expect(parsed.count).toBe(21);
    });

    it('uses "anonymous" and "unknown" when uid/ip omitted', () => {
        logSecurityEvent({
            type: SecurityEventType.AUTH_FAILURE,
            endpoint: 'proxyImage',
            message: 'No token',
        });

        const raw = warnSpy.mock.calls[0]?.[0] as string;
        const parsed = JSON.parse(raw) as Record<string, unknown>;

        expect(parsed.uid).toBe('anonymous');
        expect(parsed.ip).toBe('unknown');
    });
});
