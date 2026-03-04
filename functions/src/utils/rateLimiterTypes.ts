/**
 * Rate Limiter Interface — async contract for all rate limiter implementations
 * Both in-memory (tests/emulator) and Firestore (production) implement this.
 */

export interface RateLimiter {
    checkRateLimit(
        userId: string,
        endpoint: string,
        maxRequests: number,
        windowMs?: number,
    ): Promise<boolean>;

    clearStore(): Promise<void>;
}
