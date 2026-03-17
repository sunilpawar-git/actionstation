/**
 * Captcha / Bot-challenge validator
 * Supports Cloudflare Turnstile and Google reCAPTCHA v3.
 *
 * Both services follow the same server-side verification pattern:
 *   1. Client completes the challenge widget → receives a one-time token.
 *   2. Client POSTs the token to the verifyTurnstile (or verifyRecaptcha) Cloud Function.
 *   3. Server POSTs { secret, response } to the provider's /siteverify endpoint.
 *   4. Server returns success/failure to the client, which then proceeds (or is blocked).
 *
 * ─── Secret setup (one-time, do this before deploying) ─────────────────────
 *
 *  Turnstile secret:
 *    1. Create a Turnstile site in the Cloudflare dashboard (type: "Managed" challenge).
 *    2. Copy the Secret Key shown in the dashboard.
 *    3. Store it in Secret Manager:
 *         gcloud secrets create TURNSTILE_SECRET --replication-policy="automatic"
 *         echo -n "YOUR_TURNSTILE_SECRET" | \
 *           gcloud secrets versions add TURNSTILE_SECRET --data-file=-
 *
 *  reCAPTCHA v3 secret:
 *    1. Register a site at console.cloud.google.com → reCAPTCHA Enterprise, OR
 *       at www.google.com/recaptcha/admin for the free v3 API.
 *    2. Copy the Secret Key.
 *    3. Store it in Secret Manager:
 *         gcloud secrets create RECAPTCHA_SECRET --replication-policy="automatic"
 *         echo -n "YOUR_RECAPTCHA_SECRET" | \
 *           gcloud secrets versions add RECAPTCHA_SECRET --data-file=-
 *
 * ─── Grant Secret Manager access to the default service account ────────────
 *
 *    gcloud secrets add-iam-policy-binding TURNSTILE_SECRET \
 *      --member="serviceAccount:actionstation-244f0@appspot.gserviceaccount.com" \
 *      --role="roles/secretmanager.secretAccessor"
 *
 *    gcloud secrets add-iam-policy-binding RECAPTCHA_SECRET \
 *      --member="serviceAccount:actionstation-244f0@appspot.gserviceaccount.com" \
 *      --role="roles/secretmanager.secretAccessor"
 *
 * ─── Secret names (use defineSecret('NAME') in each Cloud Function) ────────
 *   TURNSTILE_SECRET  — Cloudflare Turnstile secret key
 *   RECAPTCHA_SECRET  — Google reCAPTCHA v3 secret key
 */

const TURNSTILE_VERIFY_URL =
    'https://challenges.cloudflare.com/turnstile/v0/siteverify';
const RECAPTCHA_VERIFY_URL =
    'https://www.google.com/recaptcha/api/siteverify';

/**
 * Minimum reCAPTCHA v3 score to accept (0.0 = bot, 1.0 = human).
 * 0.5 is Google's recommended default. Raise to 0.7 for high-risk actions.
 */
export const RECAPTCHA_MIN_SCORE = 0.5;

/** Unified result returned by both verifiers. */
export interface CaptchaResult {
    success: boolean;
    /** reCAPTCHA v3 only — value in [0, 1]; higher means more likely human. */
    score?: number;
    /** Provider-specific error codes on failure (useful for logging). */
    errorCodes?: string[];
}

// ─── Cloudflare Turnstile ──────────────────────────────────────────────────

/**
 * Verifies a Cloudflare Turnstile one-time token against /siteverify.
 *
 * @param token    Token from the client-side Turnstile widget.
 * @param secret   Value of TURNSTILE_SECRET (pass `turnstileSecret.value()`).
 * @param remoteip Client IP — Cloudflare strongly recommends including it.
 */
export async function verifyTurnstileToken(
    token: string,
    secret: string,
    remoteip?: string,
): Promise<CaptchaResult> {
    const body = new URLSearchParams({ secret, response: token });
    if (remoteip) body.set('remoteip', remoteip);

    let resp: Response;
    try {
        resp = await fetch(TURNSTILE_VERIFY_URL, { method: 'POST', body });
    } catch (err) {
        return { success: false, errorCodes: ['fetch-error'] };
    }

    if (!resp.ok) {
        return { success: false, errorCodes: [`http_${resp.status}`] };
    }

    const json = (await resp.json()) as {
        success: boolean;
        'error-codes'?: string[];
    };

    return {
        success: json.success,
        errorCodes: json['error-codes'],
    };
}

// ─── Google reCAPTCHA v3 ──────────────────────────────────────────────────

/**
 * Verifies a Google reCAPTCHA v3 token against /siteverify.
 *
 * reCAPTCHA v3 does not show a UI challenge — it scores every request silently.
 * Reject requests where score < RECAPTCHA_MIN_SCORE or action does not match.
 *
 * @param token    Token from `grecaptcha.execute(siteKey, { action })`.
 * @param secret   Value of RECAPTCHA_SECRET (pass `recaptchaSecret.value()`).
 * @param action   Expected action string (e.g. "login", "upload").
 *                 Mismatch is treated as a token-reuse / replay-attack indicator.
 * @param remoteip Client IP (optional but recommended by Google).
 */
export async function verifyRecaptchaToken(
    token: string,
    secret: string,
    action?: string,
    remoteip?: string,
): Promise<CaptchaResult> {
    const body = new URLSearchParams({ secret, response: token });
    if (remoteip) body.set('remoteip', remoteip);

    let resp: Response;
    try {
        resp = await fetch(RECAPTCHA_VERIFY_URL, { method: 'POST', body });
    } catch (err) {
        return { success: false, errorCodes: ['fetch-error'] };
    }

    if (!resp.ok) {
        return { success: false, errorCodes: [`http_${resp.status}`] };
    }

    const json = (await resp.json()) as {
        success: boolean;
        score?: number;
        action?: string;
        'error-codes'?: string[];
    };

    // Action mismatch: token was generated for a different action — possible replay attack.
    if (action && json.action && json.action !== action) {
        return {
            success: false,
            score: json.score,
            errorCodes: ['action-mismatch'],
        };
    }

    // Score below threshold → treat as bot.
    const score = json.score ?? 1;
    return {
        success: json.success && score >= RECAPTCHA_MIN_SCORE,
        score,
        errorCodes: json['error-codes'],
    };
}
