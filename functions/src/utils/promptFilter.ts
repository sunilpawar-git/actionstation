/**
 * Prompt Filter — AI input sanitisation and output secret scanning.
 *
 * INPUT LAYER  — detects prompt injection and PII exfiltration attempts
 *                before the request reaches the Gemini API.
 * OUTPUT LAYER — scans Gemini responses for accidentally leaked secrets
 *                (API keys, bearer tokens) before forwarding to the client.
 *
 * Limits enforced here are in addition to the GEMINI_MAX_BODY_BYTES check
 * in geminiProxy.ts — we reason about *text content*, not raw JSON bytes.
 */

// ─── Types ────────────────────────────────────────────────────────────────

export interface PromptFilterResult {
    allowed: boolean;
    reason: string | null;
    /** Validated contents array (only present when allowed === true) */
    sanitized?: unknown[];
}

export interface OutputFilterResult {
    safe: boolean;
    reason: string | null;
}

// ─── Injection patterns ───────────────────────────────────────────────────

/** Classic prompt injection phrases */
const INJECTION_PATTERNS: RegExp[] = [
    /ignore\s+(all\s+)?(previous|prior|above)\s+instructions?/i,
    /forget\s+(everything|all\s+of\s+this|all\s+previous|what\s+you)/i,
    /forget\s+everything\b/i,
    /\bDAN\s+mode\b/i,
    /jailbreak/i,
    /\[SYSTEM\]/i,
    /<\|im_start\|>/i,   // OpenAI chat-ML injection
    /<\|im_end\|>/i,
    /###\s*(instruction|system|prompt)/i,
    /act\s+as\s+if\s+you\s+(have|had|are)\s+(no\s+)?restrictions?/i,
    /pretend\s+(you\s+are|to\s+be)\s+(an?\s+)?(evil|malicious|unfiltered|uncensored)/i,
    /you\s+are\s+now\s+free\s+from/i,
    /override\s+(your\s+)?(safety|content|ethical)\s+(guidelines?|filters?|rules?)/i,
];

/** Patterns attempting to exfiltrate system prompts or credentials */
const EXFILTRATION_PATTERNS: RegExp[] = [
    /repeat\s+(your\s+)?(system|training|base|initial)\s+prompt/i,
    /print\s+(your\s+)?(api\s+key|secret|password|token|credentials?)/i,
    /reveal\s+(your\s+)?(configuration|settings|credentials?|prompt)/i,
    /what\s+(are\s+your|is\s+your)\s+(instructions?|system\s+prompt|constraints?)/i,
    /show\s+me\s+(your\s+)?(system|base|hidden)\s+(prompt|instructions?)/i,
];

// ─── Limits ───────────────────────────────────────────────────────────────

/** Maximum characters allowed in a single text part (defence against token flooding) */
const MAX_PART_TEXT_LENGTH = 50_000;

/** Maximum total text characters across all parts and turns */
const MAX_TOTAL_TEXT_LENGTH = 100_000;

// ─── Input filter ─────────────────────────────────────────────────────────

type ContentPart = Record<string, unknown>;
type ContentItem = { parts?: ContentPart[] } | null | undefined;

/**
 * Validate and sanitise an AI prompt `contents` array.
 *
 * Returns `{ allowed: false, reason }` on any violation so the caller
 * can log the event and return 400 to the client.
 */
export function filterPromptInput(contents: unknown[]): PromptFilterResult {
    if (!Array.isArray(contents)) {
        return { allowed: false, reason: 'contents must be an array' };
    }

    let totalLength = 0;

    for (const item of contents as ContentItem[]) {
        const parts = item?.parts;
        if (!Array.isArray(parts)) continue;

        for (const part of parts) {
            const text = typeof part?.text === 'string' ? part.text : null;
            if (text === null) continue;

            // Individual part length check
            if (text.length > MAX_PART_TEXT_LENGTH) {
                return {
                    allowed: false,
                    reason: 'Prompt part exceeds maximum length (possible token-flooding attack)',
                };
            }

            totalLength += text.length;
            if (totalLength > MAX_TOTAL_TEXT_LENGTH) {
                return {
                    allowed: false,
                    reason: 'Total prompt length exceeds maximum',
                };
            }

            // Injection pattern scan
            for (const pattern of INJECTION_PATTERNS) {
                if (pattern.test(text)) {
                    return {
                        allowed: false,
                        reason: 'Prompt injection pattern detected',
                    };
                }
            }

            // Exfiltration pattern scan
            for (const pattern of EXFILTRATION_PATTERNS) {
                if (pattern.test(text)) {
                    return {
                        allowed: false,
                        reason: 'Credential exfiltration pattern detected',
                    };
                }
            }
        }
    }

    return { allowed: true, reason: null, sanitized: contents };
}

// ─── Output filter ────────────────────────────────────────────────────────

/** GCP API key pattern (AIza...) */
const GCP_API_KEY_RE = /AIza[0-9A-Za-z_-]{35}/;
/** Bearer token pattern */
const BEARER_TOKEN_RE = /Bearer\s+[A-Za-z0-9_.-]{20,}/;
/** Firebase private key fragment */
const PRIVATE_KEY_RE = /-----BEGIN (RSA )?PRIVATE KEY-----/;

/**
 * Scan a Gemini response for accidentally leaked secrets.
 * Returns `{ safe: false, reason }` if a pattern matches.
 */
export function filterPromptOutput(
    response: Record<string, unknown>,
): OutputFilterResult {
    const text = JSON.stringify(response);

    if (GCP_API_KEY_RE.test(text)) {
        return { safe: false, reason: 'GCP API key pattern in AI response' };
    }
    if (BEARER_TOKEN_RE.test(text)) {
        return { safe: false, reason: 'Bearer token pattern in AI response' };
    }
    if (PRIVATE_KEY_RE.test(text)) {
        return { safe: false, reason: 'Private key fragment in AI response' };
    }

    return { safe: true, reason: null };
}
