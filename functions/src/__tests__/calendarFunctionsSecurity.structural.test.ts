/**
 * Structural test: Calendar Cloud Functions security invariants.
 *
 * Invariants enforced:
 * 1. Every onCall handler for calendar functions declares cors: ALLOWED_ORIGINS
 *    — without this the browser blocks preflight requests from localhost and
 *    www.actionstation.in (regression: workspaceBundle was missing this).
 * 2. withToken() calls logSecurityEvent() on rate-limit violation and auth failure
 *    — required by AGENTS.md "log on every 4xx/5xx" rule.
 * 3. No bare console.* calls remain in calendarAuth or calendarEvents
 *    — diagnostic logs added during debugging must be removed before merge.
 */
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const FUNCTIONS_SRC = path.resolve(__dirname, '..');

function read(file: string): string {
    return fs.readFileSync(path.join(FUNCTIONS_SRC, file), 'utf-8');
}

describe('Calendar Cloud Functions — CORS invariant', () => {
    const eventsContent = read('calendarEvents.ts');
    const authContent = read('calendarAuth.ts');

    it('calendarCreateEvent declares cors: ALLOWED_ORIGINS', () => {
        expect(eventsContent).toMatch(/calendarCreateEvent\s*=\s*onCall\(\s*\{[^}]*cors:\s*ALLOWED_ORIGINS/);
    });

    it('calendarUpdateEvent declares cors: ALLOWED_ORIGINS', () => {
        expect(eventsContent).toMatch(/calendarUpdateEvent\s*=\s*onCall\(\s*\{[^}]*cors:\s*ALLOWED_ORIGINS/);
    });

    it('calendarDeleteEvent declares cors: ALLOWED_ORIGINS', () => {
        expect(eventsContent).toMatch(/calendarDeleteEvent\s*=\s*onCall\(\s*\{[^}]*cors:\s*ALLOWED_ORIGINS/);
    });

    it('calendarListEvents declares cors: ALLOWED_ORIGINS', () => {
        expect(eventsContent).toMatch(/calendarListEvents\s*=\s*onCall\(\s*\{[^}]*cors:\s*ALLOWED_ORIGINS/);
    });

    it('exchangeCalendarCode declares cors: ALLOWED_ORIGINS', () => {
        expect(authContent).toMatch(/exchangeCalendarCode\s*=\s*onCall\(\s*\{[^}]*cors:\s*ALLOWED_ORIGINS/s);
    });

    it('disconnectCalendar declares cors: ALLOWED_ORIGINS', () => {
        expect(authContent).toMatch(/disconnectCalendar\s*=\s*onCall\(\s*\{[^}]*cors:\s*ALLOWED_ORIGINS/s);
    });
});

describe('Calendar Cloud Functions — security logging invariant', () => {
    const eventsContent = read('calendarEvents.ts');
    const authContent = read('calendarAuth.ts');

    it('calendarEvents logs rate-limit violation via logSecurityEvent', () => {
        // withToken must call logSecurityEvent on RATE_LIMIT_VIOLATION
        expect(eventsContent).toContain('SecurityEventType.RATE_LIMIT_VIOLATION');
    });

    it('calendarEvents logs auth failure (REAUTH_REQUIRED) via logSecurityEvent', () => {
        expect(eventsContent).toContain('SecurityEventType.AUTH_FAILURE');
    });

    it('calendarAuth logs rate-limit violation via logSecurityEvent', () => {
        expect(authContent).toContain('SecurityEventType.RATE_LIMIT_VIOLATION');
    });

    it('calendarAuth logs auth failure via logSecurityEvent', () => {
        expect(authContent).toContain('SecurityEventType.AUTH_FAILURE');
    });
});

describe('Calendar Cloud Functions — no diagnostic console.* calls', () => {
    const eventsContent = read('calendarEvents.ts');
    const authContent = read('calendarAuth.ts');

    const CONSOLE_PATTERN = /\bconsole\.(log|error|warn|info|debug)\b/;

    it('calendarEvents.ts has no bare console.* calls', () => {
        const lines = eventsContent.split('\n').filter(
            (l) => !l.trimStart().startsWith('//') && !l.includes('eslint-disable'),
        );
        const violations = lines.filter((l) => CONSOLE_PATTERN.test(l));
        expect(violations).toEqual([]);
    });

    it('calendarAuth.ts has no bare console.* calls', () => {
        const lines = authContent.split('\n').filter(
            (l) => !l.trimStart().startsWith('//') && !l.includes('eslint-disable'),
        );
        const violations = lines.filter((l) => CONSOLE_PATTERN.test(l));
        expect(violations).toEqual([]);
    });
});

describe('Calendar Cloud Functions — no dead re-exports of internal utilities', () => {
    const eventsContent = read('calendarEvents.ts');

    it('calendarEvents does not re-export logSecurityEvent (internal utility leak)', () => {
        expect(eventsContent).not.toContain('export { logSecurityEvent');
        expect(eventsContent).not.toContain('export { SecurityEventType');
    });
});
