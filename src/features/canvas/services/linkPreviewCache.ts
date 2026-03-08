/**
 * Link Preview Cache - In-memory + localStorage cache with TTL expiration
 * Prevents redundant network requests for previously-fetched URLs
 *
 * Security hardening:
 * - Zod validation on localStorage reads (prevents injection from tampered storage)
 * - Schema versioning (structured invalidation without key bumping)
 * - LRU eviction cap (prevents unbounded memory growth)
 * - Stale entry pruning on detection (immediate memory release)
 * - Per-field length caps before storage (prevents localStorage quota abuse)
 * - Quota-exceeded recovery: prune stale + retry before silently failing
 */
import { z } from 'zod';
import type { LinkPreviewMetadata } from '../types/node';
import { captureError } from '@/shared/services/sentryService';

/** Cache TTL: 24 hours */
export const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

/** localStorage key for persisted cache */
export const STORAGE_KEY = 'eden_link_previews_v2';

/**
 * Schema version stored inside the persisted payload.
 * Bump this constant whenever the stored shape changes (instead of renaming STORAGE_KEY).
 */
export const CACHE_SCHEMA_VERSION = 1;

/** Maximum entries in memory cache — oldest evicted on overflow (LRU) */
export const MAX_CACHE_ENTRIES = 500;

/** Field length caps to prevent localStorage quota abuse */
const MAX_FIELD_TITLE = 200;
const MAX_FIELD_DESCRIPTION = 500;
const MAX_FIELD_URL = 2048;
const MAX_FIELD_DOMAIN = 253; // max valid hostname length

/** Zod schema for a single cache entry — validates untrusted localStorage data */
const entrySchema = z.object({
    url: z.string().max(MAX_FIELD_URL),
    title: z.string().max(MAX_FIELD_TITLE).optional(),
    description: z.string().max(MAX_FIELD_DESCRIPTION).optional(),
    image: z.string().max(MAX_FIELD_URL).optional(),
    favicon: z.string().max(MAX_FIELD_URL).optional(),
    domain: z.string().max(MAX_FIELD_DOMAIN).optional(),
    cardType: z.enum(['summary', 'summary_large_image', 'player', 'app']).optional(),
    fetchedAt: z.number().positive(),
    error: z.boolean().optional(),
});

/** In-memory cache map (URL → metadata). Map preserves insertion order for LRU. */
let memoryCache = new Map<string, LinkPreviewMetadata>();

/**
 * Check if a preview is stale (older than TTL)
 */
export function isStale(metadata: LinkPreviewMetadata, ttl = CACHE_TTL_MS): boolean {
    return Date.now() - metadata.fetchedAt > ttl;
}

/**
 * Get a preview from cache. Returns null on miss or stale entry.
 * Checks memory first, then falls back to localStorage.
 * Stale entries are pruned from memory immediately on detection.
 */
export function getFromCache(url: string): LinkPreviewMetadata | null {
    // Check memory cache first
    const memEntry = memoryCache.get(url);
    if (memEntry) {
        if (isStale(memEntry) || memEntry.error) {
            memoryCache.delete(url); // Prune stale entry immediately
            return null;
        }
        return memEntry;
    }

    // Fall back to localStorage
    const stored = loadFromStorage();
    const entry = stored[url];
    if (!entry) return null;
    if (isStale(entry) || entry.error) return null;

    // Promote to memory cache for faster subsequent reads
    evictOldestIfNeeded();
    memoryCache.set(url, entry);
    return entry;
}

/** Debounce timer for localStorage writes */
let persistTimer: ReturnType<typeof setTimeout> | null = null;

/** Debounce delay for batching localStorage writes (ms) */
const PERSIST_DEBOUNCE_MS = 1000;

/**
 * Store a preview in memory and schedule debounced localStorage write.
 * Sanitizes field lengths before storage and evicts oldest entry if at capacity.
 */
export function setInCache(url: string, metadata: LinkPreviewMetadata): void {
    evictOldestIfNeeded();
    memoryCache.set(url, sanitizeEntry(metadata));
    schedulePersist();
}

/** Schedule a debounced persist to localStorage */
function schedulePersist(): void {
    if (persistTimer) clearTimeout(persistTimer);
    persistTimer = setTimeout(() => {
        persistTimer = null;
        persistToStorage();
    }, PERSIST_DEBOUNCE_MS);
}

/** Clear all cached entries (memory + localStorage) */
export function clearCache(): void {
    memoryCache = new Map();
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* noop */ }
}

/** Get the number of entries in memory cache */
export function getCacheSize(): number {
    return memoryCache.size;
}

/**
 * Evict the oldest (first-inserted) entry when at capacity.
 * Map preserves insertion order, so .keys().next() is O(1).
 */
function evictOldestIfNeeded(): void {
    if (memoryCache.size >= MAX_CACHE_ENTRIES) {
        const oldest = memoryCache.keys().next().value;
        if (oldest !== undefined) memoryCache.delete(oldest);
    }
}

/**
 * Cap per-field lengths to prevent localStorage quota abuse.
 * A single malicious site could set og:description to 500 KB within the 1 MB HTML limit.
 * Only modifies fields that are present — avoids adding explicit `undefined` keys.
 */
function sanitizeEntry(meta: LinkPreviewMetadata): LinkPreviewMetadata {
    const result = { ...meta };
    if (result.title !== undefined) result.title = result.title.slice(0, MAX_FIELD_TITLE);
    if (result.description !== undefined) result.description = result.description.slice(0, MAX_FIELD_DESCRIPTION);
    if (result.image !== undefined) result.image = result.image.slice(0, MAX_FIELD_URL);
    if (result.favicon !== undefined) result.favicon = result.favicon.slice(0, MAX_FIELD_URL);
    if (result.domain !== undefined) result.domain = result.domain.slice(0, MAX_FIELD_DOMAIN);
    return result;
}

/** Remove all stale entries from the memory cache (called before quota-exceeded retry) */
function pruneStaleFromMemory(): void {
    for (const [url, meta] of memoryCache) {
        if (isStale(meta)) memoryCache.delete(url);
    }
}

/** Shape of the versioned object stored in localStorage */
interface StoredCache {
    version: number;
    entries: Record<string, unknown>;
}

function isStoredCache(v: unknown): v is StoredCache {
    return (
        typeof v === 'object' &&
        v !== null &&
        'version' in v &&
        (v as StoredCache).version === CACHE_SCHEMA_VERSION &&
        'entries' in v &&
        typeof (v as StoredCache).entries === 'object'
    );
}

/**
 * Load cache from localStorage.
 * Validates schema version and runs Zod validation on each entry.
 * Malformed or version-mismatched data is discarded (forces refetch).
 */
function loadFromStorage(): Record<string, LinkPreviewMetadata> {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return {};
        const parsed = JSON.parse(raw) as unknown;
        if (!isStoredCache(parsed)) return {};

        const result: Record<string, LinkPreviewMetadata> = {};
        for (const [url, entry] of Object.entries(parsed.entries)) {
            const validation = entrySchema.safeParse(entry);
            if (validation.success) {
                result[url] = validation.data as LinkPreviewMetadata;
            }
        }
        return result;
    } catch {
        return {};
    }
}

/** Attempt to write memory cache to localStorage. Returns true on success. */
function tryPersist(): boolean {
    try {
        const entries: Record<string, LinkPreviewMetadata> = {};
        for (const [url, meta] of memoryCache) { entries[url] = meta; }
        const payload: StoredCache = { version: CACHE_SCHEMA_VERSION, entries };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
        return true;
    } catch {
        return false;
    }
}

/**
 * Persist memory cache to localStorage.
 * On quota failure: prune stale entries, emit Sentry warning, and retry once.
 */
function persistToStorage(): void {
    if (!tryPersist()) {
        // Quota exceeded — evict stale entries to recover space and retry
        pruneStaleFromMemory();
        captureError(
            new Error('localStorage quota exceeded for link preview cache — pruned stale entries'),
        );
        tryPersist(); // Second attempt; if still fails, silent (best-effort)
    }
}
