/**
 * Bot Detector Tests
 * Validates scanner UA detection, headless browser detection, and heuristics.
 */
import { describe, it, expect } from 'vitest';
import { detectBot, extractClientIp, type RequestLike } from '../botDetector.js';

function makeReq(overrides: Partial<RequestLike> = {}): RequestLike {
    return {
        headers: {
            'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X) AppleWebKit/537.36',
            'accept': 'application/json',
            'accept-language': 'en-US,en;q=0.9',
            'accept-encoding': 'gzip, deflate, br',
        },
        ip: '1.2.3.4',
        ...overrides,
    };
}

describe('detectBot', () => {
    it('allows normal browser requests', () => {
        const result = detectBot(makeReq());
        expect(result.isBot).toBe(false);
    });

    it('blocks missing User-Agent with high confidence', () => {
        const req = makeReq({ headers: { 'accept': '*/*' } });
        const result = detectBot(req);
        expect(result.isBot).toBe(true);
        expect(result.confidence).toBe('high');
        expect(result.reason).toMatch(/Missing User-Agent/);
    });

    it('blocks sqlmap UA with high confidence', () => {
        const result = detectBot(makeReq({
            headers: { 'user-agent': 'sqlmap/1.7.8#stable (https://sqlmap.org)', 'accept': '*/*' },
        }));
        expect(result.isBot).toBe(true);
        expect(result.confidence).toBe('high');
        expect(result.reason).toMatch(/Scanner UA/);
    });

    it('blocks nikto scanner', () => {
        const result = detectBot(makeReq({
            headers: { 'user-agent': 'Nikto/2.1.6', 'accept': '*/*' },
        }));
        expect(result.isBot).toBe(true);
        expect(result.confidence).toBe('high');
    });

    it('blocks raw python-requests', () => {
        const result = detectBot(makeReq({
            headers: { 'user-agent': 'python-requests/2.31.0', 'accept': '*/*' },
        }));
        expect(result.isBot).toBe(true);
        expect(result.confidence).toBe('high');
    });

    it('blocks raw curl', () => {
        const result = detectBot(makeReq({
            headers: { 'user-agent': 'curl/7.88.1', 'accept': '*/*' },
        }));
        expect(result.isBot).toBe(true);
        expect(result.confidence).toBe('high');
    });

    it('blocks HeadlessChrome', () => {
        const result = detectBot(makeReq({
            headers: { 'user-agent': 'Mozilla/5.0 HeadlessChrome/114.0.0.0' },
        }));
        expect(result.isBot).toBe(true);
        expect(result.confidence).toBe('high');
        expect(result.reason).toMatch(/Headless browser/);
    });

    it('blocks Playwright', () => {
        const result = detectBot(makeReq({
            headers: { 'user-agent': 'Mozilla/5.0 Playwright/1.38' },
        }));
        expect(result.isBot).toBe(true);
    });

    it('blocks wildcard Accept without Accept-Language with medium confidence', () => {
        const result = detectBot(makeReq({
            headers: {
                'user-agent': 'Mozilla/5.0 (compatible)',
                'accept': '*/*',
                'accept-encoding': 'gzip',
                // no accept-language
            },
        }));
        expect(result.isBot).toBe(true);
        expect(result.confidence).toBe('medium');
    });

    it('flags missing Accept-Encoding as low confidence (not blocked)', () => {
        const result = detectBot(makeReq({
            headers: {
                'user-agent': 'Mozilla/5.0 (compatible)',
                'accept': 'application/json',
                'accept-language': 'en-US',
                // no accept-encoding
            },
        }));
        expect(result.isBot).toBe(false);
        expect(result.confidence).toBe('low');
    });
});

describe('extractClientIp', () => {
    it('extracts first IP from X-Forwarded-For', () => {
        const req = makeReq({
            headers: { 'x-forwarded-for': '203.0.113.1, 10.0.0.1, 10.0.0.2' },
        });
        expect(extractClientIp(req)).toBe('203.0.113.1');
    });

    it('falls back to req.ip when no X-Forwarded-For', () => {
        const req = makeReq({ ip: '192.168.1.50' });
        expect(extractClientIp(req)).toBe('192.168.1.50');
    });

    it('returns "unknown" when neither header nor ip present', () => {
        const req: RequestLike = { headers: {} };
        expect(extractClientIp(req)).toBe('unknown');
    });
});
