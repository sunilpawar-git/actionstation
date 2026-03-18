/**
 * Bot Detector — identifies automated scanners, crawlers, and headless browsers
 * before they reach auth or rate-limit checks.
 *
 * Called at the top of every Cloud Function handler so bots are rejected
 * cheaply (no Firestore hit) and logged for threat monitoring.
 */

/** Shape of a detection decision */
export interface BotDetectionResult {
    isBot: boolean;
    reason: string | null;
    /** How certain we are — used to decide whether to hard-block or just log */
    confidence: 'high' | 'medium' | 'low';
}

/** Minimum subset of Express/Cloud Functions request we need */
export interface RequestLike {
    headers: Record<string, string | string[] | undefined>;
    ip?: string;
    method?: string;
}

// ─── Known malicious scanner & automation User-Agents ─────────────────────

const SCANNER_UA: RegExp[] = [
    /sqlmap/i,
    /nikto/i,
    /nmap/i,
    /masscan/i,
    /zgrab/i,
    /gobuster/i,
    /dirbuster/i,
    /ffuf/i,
    /feroxbuster/i,
    /nuclei/i,
    /zaproxy/i,
    /burpsuite/i,
    /acunetix/i,
    /nessus/i,
    /openvas/i,
    // Raw HTTP clients (not a browser)
    /^python-requests\//i,
    /^Go-http-client\//i,
    /^curl\/[0-9]/i,
    /^wget\//i,
    /^libwww-perl\//i,
    /^lwp-/i,
    /^Java\//i,
    /^Apache-HttpClient\//i,
];

// ─── Headless browser signatures ──────────────────────────────────────────

const HEADLESS_UA: RegExp[] = [
    /HeadlessChrome/i,
    /PhantomJS/i,
    /Puppeteer/i,
    /Playwright/i,
    /Selenium/i,
    /WebDriver/i,
];

// ─── Heuristics ───────────────────────────────────────────────────────────

/**
 * Analyse an incoming request for bot/scanner signatures.
 *
 * Decision table:
 *  HIGH   → block immediately, log BOT_DETECTED at ERROR severity
 *  MEDIUM → block, log BOT_DETECTED at WARNING severity
 *  LOW    → allow through, optionally log for monitoring
 */
export function detectBot(req: RequestLike): BotDetectionResult {
    const ua = header(req, 'user-agent');

    // 1. Missing User-Agent — strong signal
    if (!ua) {
        return {
            isBot: true,
            reason: 'Missing User-Agent header',
            confidence: 'high',
        };
    }

    // 2. Known scanner tools
    for (const pattern of SCANNER_UA) {
        if (pattern.test(ua)) {
            return {
                isBot: true,
                reason: `Scanner UA: ${ua.slice(0, 100)}`,
                confidence: 'high',
            };
        }
    }

    // 3. Headless browsers
    for (const pattern of HEADLESS_UA) {
        if (pattern.test(ua)) {
            return {
                isBot: true,
                reason: `Headless browser: ${ua.slice(0, 100)}`,
                confidence: 'high',
            };
        }
    }

    // 4. Wildcard Accept with no Accept-Language (browsers always set both)
    const accept = header(req, 'accept') ?? '';
    const acceptLang = header(req, 'accept-language');
    if (accept === '*/*' && !acceptLang) {
        return {
            isBot: true,
            reason: 'Wildcard Accept without Accept-Language',
            confidence: 'medium',
        };
    }

    // 5. Missing Accept-Encoding (every HTTP/1.1+ client sends this)
    if (!header(req, 'accept-encoding')) {
        return {
            isBot: false,
            reason: 'Missing Accept-Encoding (suspicious but not blocked)',
            confidence: 'low',
        };
    }

    return { isBot: false, reason: null, confidence: 'low' };
}

/**
 * Extract the real client IP from Cloud Functions request.
 * Cloud Run/Functions always populates X-Forwarded-For with the original IP.
 */
export function extractClientIp(req: RequestLike): string {
    const forwarded = header(req, 'x-forwarded-for');
    if (forwarded) {
        // X-Forwarded-For: <client>, <proxy1>, <proxy2>
        return forwarded.split(',')[0]?.trim() ?? 'unknown';
    }
    return req.ip ?? 'unknown';
}

/** Helper: get a header value as a string (handles string[] case) */
function header(req: RequestLike, name: string): string | undefined {
    const val = req.headers[name];
    if (Array.isArray(val)) return val[0];
    return val;
}
