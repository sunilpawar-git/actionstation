/**
 * IP Rate Limiter — sliding window per client IP address.
 *
 * Complements the per-user limiter: a single IP driving requests through
 * 100 different user accounts would bypass user rate limits but hits this.
 *
 * Production: Firestore-backed (survives cold starts, consistent across
 *   function instances). Same pattern as firestoreRateLimiter.ts.
 * Emulator/tests: in-memory map.
 */

interface IpRateLimitEntry {
    timestamps: number[];
}

const ipStore = new Map<string, IpRateLimitEntry>();

/** True when running as a deployed Cloud Function (not emulator/tests) */
function isDeployedFunction(): boolean {
    return !!process.env.K_SERVICE && process.env.FUNCTIONS_EMULATOR !== 'true';
}

/**
 * Check if an IP has exceeded its rate limit and record the request.
 * Returns true = allowed, false = blocked.
 */
export async function checkIpRateLimit(
    ip: string,
    endpoint: string,
    maxRequests: number,
    windowMs = 60_000,
): Promise<boolean> {
    if (isDeployedFunction()) {
        return checkFirestore(ip, endpoint, maxRequests, windowMs);
    }
    return checkMemory(ip, endpoint, maxRequests, windowMs);
}

// ─── In-memory implementation (emulator / tests) ──────────────────────────

function checkMemory(
    ip: string,
    endpoint: string,
    maxRequests: number,
    windowMs: number,
): boolean {
    const key = `${ip}:${endpoint}`;
    const now = Date.now();
    const cutoff = now - windowMs;

    let entry = ipStore.get(key);
    if (!entry) {
        entry = { timestamps: [] };
        ipStore.set(key, entry);
    }

    entry.timestamps = entry.timestamps.filter((ts) => ts > cutoff);
    if (entry.timestamps.length >= maxRequests) return false;

    entry.timestamps.push(now);
    return true;
}

// ─── Firestore implementation (production) ────────────────────────────────

const IP_RATE_LIMIT_COLLECTION = '_ipRateLimits';

async function checkFirestore(
    ip: string,
    endpoint: string,
    maxRequests: number,
    windowMs: number,
): Promise<boolean> {
    const { getFirestore } = await import('firebase-admin/firestore');
    const db = getFirestore();

    // Firestore doc IDs cannot contain slashes; sanitise the IP
    const safeIp = ip.replace(/[^a-zA-Z0-9._-]/g, '_');
    const key = `${safeIp}:${endpoint}`;
    const docRef = db.collection(IP_RATE_LIMIT_COLLECTION).doc(key);

    return db.runTransaction(async (tx) => {
        const snap = await tx.get(docRef);
        const now = Date.now();
        const cutoff = now - windowMs;

        const raw = snap.data()?.timestamps;
        const timestamps: number[] = (Array.isArray(raw) ? raw : []).filter(
            (ts): ts is number => typeof ts === 'number' && ts > cutoff,
        );

        if (timestamps.length >= maxRequests) return false;

        timestamps.push(now);
        tx.set(docRef, {
            timestamps,
            expiresAt: new Date(now + windowMs),
        });
        return true;
    });
}

// ─── Test helpers ─────────────────────────────────────────────────────────

/** Clear all in-memory IP rate limit state (for tests only) */
export function clearIpRateLimitStore(): void {
    ipStore.clear();
}
