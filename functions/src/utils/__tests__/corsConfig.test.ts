/**
 * CORS Config Tests
 * Validates the ALLOWED_ORIGINS array content.
 * Firebase Functions v2 handles CORS headers internally — we test the config, not the framework.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('corsConfig', () => {
    const originalEnv = { ...process.env };

    beforeEach(() => {
        vi.resetModules();
    });

    afterEach(() => {
        process.env = { ...originalEnv };
    });

    it('includes production Firebase Hosting origins', async () => {
        delete process.env.FUNCTIONS_EMULATOR;
        delete process.env.CORS_ALLOWED_ORIGINS;

        const { ALLOWED_ORIGINS } = await import('../corsConfig.js');

        expect(ALLOWED_ORIGINS).toContain('https://eden-so.web.app');
        expect(ALLOWED_ORIGINS).toContain('https://eden-so.firebaseapp.com');
    });

    it('excludes localhost when not in emulator mode', async () => {
        delete process.env.FUNCTIONS_EMULATOR;
        delete process.env.CORS_ALLOWED_ORIGINS;

        const { ALLOWED_ORIGINS } = await import('../corsConfig.js');

        expect(ALLOWED_ORIGINS).not.toContain('http://localhost:5173');
        expect(ALLOWED_ORIGINS).not.toContain('http://localhost:4173');
    });

    it('includes localhost origins in emulator mode', async () => {
        process.env.FUNCTIONS_EMULATOR = 'true';
        delete process.env.CORS_ALLOWED_ORIGINS;

        const { ALLOWED_ORIGINS } = await import('../corsConfig.js');

        expect(ALLOWED_ORIGINS).toContain('http://localhost:5173');
        expect(ALLOWED_ORIGINS).toContain('http://localhost:4173');
    });

    it('appends custom origins from CORS_ALLOWED_ORIGINS env var', async () => {
        delete process.env.FUNCTIONS_EMULATOR;
        process.env.CORS_ALLOWED_ORIGINS = 'https://custom.example.com,https://staging.example.com';

        const { ALLOWED_ORIGINS } = await import('../corsConfig.js');

        expect(ALLOWED_ORIGINS).toContain('https://custom.example.com');
        expect(ALLOWED_ORIGINS).toContain('https://staging.example.com');
    });

    it('handles empty CORS_ALLOWED_ORIGINS gracefully', async () => {
        delete process.env.FUNCTIONS_EMULATOR;
        process.env.CORS_ALLOWED_ORIGINS = '';

        const { ALLOWED_ORIGINS } = await import('../corsConfig.js');

        expect(ALLOWED_ORIGINS).toContain('https://eden-so.web.app');
        expect(ALLOWED_ORIGINS.length).toBe(2);
    });

    it('does not include wildcard origin', async () => {
        delete process.env.FUNCTIONS_EMULATOR;
        delete process.env.CORS_ALLOWED_ORIGINS;

        const { ALLOWED_ORIGINS } = await import('../corsConfig.js');

        expect(ALLOWED_ORIGINS).not.toContain('*');
    });

    it('returns a string array (compatible with Firebase Functions v2 cors option)', async () => {
        delete process.env.FUNCTIONS_EMULATOR;
        delete process.env.CORS_ALLOWED_ORIGINS;

        const { ALLOWED_ORIGINS } = await import('../corsConfig.js');

        expect(Array.isArray(ALLOWED_ORIGINS)).toBe(true);
        for (const origin of ALLOWED_ORIGINS) {
            expect(typeof origin).toBe('string');
        }
    });
});
