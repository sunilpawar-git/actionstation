/**
 * Structural test: CSP completeness
 *
 * Prevents regression of the Content-Security-Policy meta tag in index.html.
 * Ensures all required Firebase/Google domains are present in connect-src
 * and dangerous directives (unsafe-eval, bare wildcards) remain absent.
 *
 * If this test fails, someone modified the CSP without including all
 * required first-party Google domains — which will break AI generation,
 * Firestore saves, or auth flows.
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, it, expect, beforeAll } from 'vitest';

const INDEX_HTML = join(process.cwd(), 'index.html');

/** Parse the CSP meta tag content from index.html */
function extractCsp(): string {
    const html = readFileSync(INDEX_HTML, 'utf-8');
    // Use RegExp#exec instead of String#match for ESLint compliance
    const regex = /http-equiv="Content-Security-Policy"\s+content="([^"]+)"/i;
    const match = regex.exec(html);
    if (!match?.[1]) throw new Error('No CSP meta tag found in index.html');
    return match[1];
}

/** Extract a specific directive's value from the full CSP string */
function getDirective(csp: string, name: string): string {
    // Use word boundary to avoid partial matches; handles first or mid-string directives
    const regex = new RegExp(`(?:^|;\\s*)${name}\\s+([^;]+)`);
    const match = regex.exec(csp);
    return match?.[1]?.trim() ?? '';
}

describe('CSP Completeness (index.html)', () => {
    let csp: string;
    let connectSrc: string;

    beforeAll(() => {
        csp = extractCsp();
        connectSrc = getDirective(csp, 'connect-src');
    });

    it('should have a CSP meta tag in index.html', () => {
        expect(csp.length).toBeGreaterThan(0);
    });

    // ── connect-src: required domains ────────────────────

    describe('connect-src contains all required Firebase/Google domains', () => {
        const requiredDomains = [
            { domain: 'https://generativelanguage.googleapis.com', reason: 'Gemini AI API' },
            { domain: 'https://firestore.googleapis.com', reason: 'Firestore REST' },
            { domain: 'https://*.firebaseio.com', reason: 'Firestore WebChannel transport' },
            { domain: 'wss://*.firebaseio.com', reason: 'Firestore WebSocket transport' },
            { domain: 'https://identitytoolkit.googleapis.com', reason: 'Firebase Auth sign-in' },
            { domain: 'https://securetoken.googleapis.com', reason: 'Firebase Auth token refresh' },
            { domain: 'https://*.cloudfunctions.net', reason: 'Cloud Functions proxy' },
            { domain: 'https://www.googleapis.com', reason: 'Google APIs (Calendar, etc.)' },
            { domain: 'https://oauth2.googleapis.com', reason: 'OAuth2 token exchange' },
            { domain: 'https://firebasestorage.googleapis.com', reason: 'Firebase Storage upload API' },
            { domain: 'https://*.firebasestorage.app', reason: 'Firebase Storage download URLs' },
        ];

        it.each(requiredDomains)(
            'includes $domain ($reason)',
            ({ domain }) => {
                expect(
                    connectSrc,
                    `connect-src is missing "${domain}". ` +
                    'Add it to the CSP meta tag in index.html.'
                ).toContain(domain);
            }
        );
    });

    // ── img-src: required sources for image features ──────

    describe('img-src allows sources needed by image features', () => {
        const requiredSources = [
            { source: 'blob:', reason: 'imageCompressor uses URL.createObjectURL for canvas processing' },
            { source: 'data:', reason: 'progressive upload inserts base64 placeholder images' },
        ];

        it.each(requiredSources)(
            'includes $source ($reason)',
            ({ source }) => {
                const imgSrc = getDirective(csp, 'img-src');
                expect(
                    imgSrc,
                    `img-src is missing "${source}". ` +
                    'Add it to the CSP meta tag in index.html.',
                ).toContain(source);
            },
        );
    });

    // ── frame-src: Google Sign-In popup ──────────────────

    it('frame-src allows accounts.google.com for Google Sign-In', () => {
        const frameSrc = getDirective(csp, 'frame-src');
        expect(
            frameSrc,
            'frame-src must allow https://accounts.google.com for Google Sign-In popup. ' +
            "Using 'none' breaks authentication."
        ).toContain('https://accounts.google.com');
    });

    // ── worker-src: Sentry replay worker support ──────────

    describe('worker-src allows blob: for Sentry replay workers', () => {
        it('includes blob: (required for Sentry replayIntegration Web Worker)', () => {
            const workerSrc = getDirective(csp, 'worker-src');
            expect(
                workerSrc,
                'worker-src is missing "blob:". Sentry replayIntegration creates Web Workers ' +
                'from blob: URLs. Without worker-src, the CSP falls back to script-src which blocks blob:.',
            ).toContain('blob:');
        });

        it("includes 'self' as baseline", () => {
            const workerSrc = getDirective(csp, 'worker-src');
            expect(workerSrc).toContain("'self'");
        });

        it('does NOT contain unsafe-eval', () => {
            const workerSrc = getDirective(csp, 'worker-src');
            expect(
                workerSrc,
                "worker-src must NOT contain 'unsafe-eval'",
            ).not.toContain("'unsafe-eval'");
        });
    });

    // ── Security guardrails (negative assertions) ────────

    describe('security guardrails remain in place', () => {
        it('script-src does NOT contain unsafe-eval', () => {
            const scriptSrc = getDirective(csp, 'script-src');
            expect(
                scriptSrc,
                "script-src must NOT contain 'unsafe-eval' — it allows arbitrary code execution"
            ).not.toContain("'unsafe-eval'");
        });

        it('connect-src does NOT contain bare wildcard *', () => {
            // Split to avoid matching *.firebaseio.com etc.
            const entries = connectSrc.split(/\s+/);
            const hasBareWildcard = entries.some((e) => e === '*');
            expect(
                hasBareWildcard,
                'connect-src must NOT contain bare wildcard * — it allows data exfiltration to any server'
            ).toBe(false);
        });

        it('object-src is none (blocks plugin injection)', () => {
            const objectSrc = getDirective(csp, 'object-src');
            expect(objectSrc).toContain("'none'");
        });

        it('base-uri is self (blocks base tag hijacking)', () => {
            const baseUri = getDirective(csp, 'base-uri');
            expect(baseUri).toContain("'self'");
        });

        it('default-src is self', () => {
            const defaultSrc = getDirective(csp, 'default-src');
            expect(defaultSrc).toContain("'self'");
        });
    });
});
