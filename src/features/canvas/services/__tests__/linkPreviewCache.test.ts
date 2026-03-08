/**
 * Link Preview Cache Tests
 * Covers: basic get/set, TTL staleness, localStorage persistence (new versioned format),
 * Zod validation, schema versioning, LRU eviction, field length caps,
 * stale-entry memory pruning, and localStorage quota recovery.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
    getFromCache, setInCache, isStale, clearCache, getCacheSize,
    CACHE_TTL_MS, CACHE_SCHEMA_VERSION, MAX_CACHE_ENTRIES, STORAGE_KEY,
} from '../linkPreviewCache';
import type { LinkPreviewMetadata } from '../../types/node';
import { captureError } from '@/shared/services/sentryService';

vi.mock('@/shared/services/sentryService', () => ({
    captureError: vi.fn(),
}));

const mockPreview = (url: string, fetchedAt = Date.now()): LinkPreviewMetadata => ({
    url,
    title: `Title for ${url}`,
    description: 'A description',
    domain: 'example.com',
    fetchedAt,
});

/** Write an entry to localStorage in the current versioned format */
function storeInLocalStorage(entries: Record<string, LinkPreviewMetadata>): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
        version: CACHE_SCHEMA_VERSION,
        entries,
    }));
}

describe('linkPreviewCache', () => {
    beforeEach(() => {
        clearCache();
        localStorage.clear();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    // ── Basic get/set ────────────────────────────────────────────────────────

    describe('setInCache / getFromCache', () => {
        it('stores and retrieves a preview by URL', () => {
            const preview = mockPreview('https://a.com');
            setInCache('https://a.com', preview);
            expect(getFromCache('https://a.com')).toEqual(preview);
        });

        it('returns null for cache miss', () => {
            expect(getFromCache('https://missing.com')).toBeNull();
        });

        it('overwrites existing entry for same URL', () => {
            setInCache('https://a.com', mockPreview('https://a.com'));
            const updated = { ...mockPreview('https://a.com'), title: 'Updated' };
            setInCache('https://a.com', updated);
            expect(getFromCache('https://a.com')?.title).toBe('Updated');
        });

        it('stores multiple entries', () => {
            setInCache('https://a.com', mockPreview('https://a.com'));
            setInCache('https://b.com', mockPreview('https://b.com'));
            expect(getFromCache('https://a.com')).not.toBeNull();
            expect(getFromCache('https://b.com')).not.toBeNull();
        });
    });

    // ── isStale ──────────────────────────────────────────────────────────────

    describe('isStale', () => {
        it('returns false for fresh metadata', () => {
            const fresh = mockPreview('https://a.com', Date.now());
            expect(isStale(fresh)).toBe(false);
        });

        it('returns true for metadata older than TTL', () => {
            const old = mockPreview('https://a.com', Date.now() - CACHE_TTL_MS - 1);
            expect(isStale(old)).toBe(true);
        });

        it('accepts custom TTL', () => {
            const customTtl = 1000;
            expect(isStale(mockPreview('https://a.com', Date.now() - 500), customTtl)).toBe(false);
            expect(isStale(mockPreview('https://a.com', Date.now() - 1500), customTtl)).toBe(true);
        });
    });

    // ── Staleness in getFromCache ─────────────────────────────────────────────

    describe('getFromCache with staleness', () => {
        it('returns null for stale entries', () => {
            const stale = mockPreview('https://a.com', Date.now() - CACHE_TTL_MS - 1);
            setInCache('https://a.com', stale);
            expect(getFromCache('https://a.com')).toBeNull();
        });

        it('returns entry when within TTL', () => {
            const fresh = mockPreview('https://a.com', Date.now());
            setInCache('https://a.com', fresh);
            expect(getFromCache('https://a.com')).toEqual(fresh);
        });

        it('prunes stale entry from memory on detection (Issue #8)', () => {
            const stale = mockPreview('https://a.com', Date.now() - CACHE_TTL_MS - 1);
            setInCache('https://a.com', stale);
            expect(getCacheSize()).toBe(1);
            getFromCache('https://a.com'); // triggers pruning
            expect(getCacheSize()).toBe(0);
        });

        it('returns null for error entries', () => {
            setInCache('https://a.com', { ...mockPreview('https://a.com'), error: true });
            expect(getFromCache('https://a.com')).toBeNull();
        });
    });

    // ── clearCache ────────────────────────────────────────────────────────────

    describe('clearCache', () => {
        it('removes all entries from memory cache', () => {
            setInCache('https://a.com', mockPreview('https://a.com'));
            setInCache('https://b.com', mockPreview('https://b.com'));
            clearCache();
            expect(getFromCache('https://a.com')).toBeNull();
            expect(getFromCache('https://b.com')).toBeNull();
        });
    });

    // ── getCacheSize ──────────────────────────────────────────────────────────

    describe('getCacheSize', () => {
        it('returns 0 for empty cache', () => {
            expect(getCacheSize()).toBe(0);
        });

        it('returns count of cached entries', () => {
            setInCache('https://a.com', mockPreview('https://a.com'));
            setInCache('https://b.com', mockPreview('https://b.com'));
            expect(getCacheSize()).toBe(2);
        });
    });

    // ── localStorage persistence ──────────────────────────────────────────────

    describe('localStorage persistence', () => {
        it('persists cache to localStorage in versioned format after debounce', () => {
            vi.useFakeTimers();
            setInCache('https://a.com', mockPreview('https://a.com'));

            expect(localStorage.getItem(STORAGE_KEY)).toBeNull(); // not yet (debounced)

            vi.advanceTimersByTime(1100);

            const raw = localStorage.getItem(STORAGE_KEY);
            expect(raw).not.toBeNull();
            const parsed = JSON.parse(raw!) as { version: number; entries: Record<string, unknown> };
            expect(parsed.version).toBe(CACHE_SCHEMA_VERSION);
            expect(parsed.entries['https://a.com']).toBeDefined();
            vi.useRealTimers();
        });

        it('loads from localStorage on getFromCache when memory is empty', () => {
            const preview = mockPreview('https://a.com');
            storeInLocalStorage({ 'https://a.com': preview });
            expect(getFromCache('https://a.com')).toEqual(preview);
        });

        it('handles corrupted localStorage gracefully', () => {
            localStorage.setItem(STORAGE_KEY, 'not-valid-json');
            expect(getFromCache('https://a.com')).toBeNull();
        });
    });

    // ── Schema versioning (Issue #9) ──────────────────────────────────────────

    describe('schema versioning', () => {
        it('rejects stored payload with mismatched version — forces refetch', () => {
            localStorage.setItem(STORAGE_KEY, JSON.stringify({
                version: CACHE_SCHEMA_VERSION + 99,
                entries: { 'https://example.com': mockPreview('https://example.com') },
            }));
            expect(getFromCache('https://example.com')).toBeNull();
        });

        it('rejects legacy flat format (no version field)', () => {
            // Simulate pre-versioning cache written as a raw Record
            localStorage.setItem(STORAGE_KEY, JSON.stringify({
                'https://example.com': mockPreview('https://example.com'),
            }));
            expect(getFromCache('https://example.com')).toBeNull();
        });

        it('loads valid entries when version matches', () => {
            const preview = mockPreview('https://versioned.com');
            storeInLocalStorage({ 'https://versioned.com': preview });
            expect(getFromCache('https://versioned.com')).toEqual(preview);
        });
    });

    // ── Zod validation (Issue #3) ─────────────────────────────────────────────

    describe('Zod validation on localStorage read', () => {
        it('discards malformed entries missing fetchedAt', () => {
            const bad = { url: 'https://bad.com', title: 'No timestamp' }; // missing fetchedAt
            storeInLocalStorage({ 'https://bad.com': bad as LinkPreviewMetadata });
            expect(getFromCache('https://bad.com')).toBeNull();
        });

        it('discards entries with invalid cardType value', () => {
            const bad = { ...mockPreview('https://bad.com'), cardType: 'injected' as never };
            storeInLocalStorage({ 'https://bad.com': bad });
            expect(getFromCache('https://bad.com')).toBeNull();
        });

        it('accepts entries with valid cardType', () => {
            const valid = { ...mockPreview('https://good.com'), cardType: 'summary_large_image' as const };
            storeInLocalStorage({ 'https://good.com': valid });
            expect(getFromCache('https://good.com')).toMatchObject({ cardType: 'summary_large_image' });
        });

        it('discards entries with oversized title (storage abuse prevention)', () => {
            // Max is 200 — anything larger is rejected by Zod
            const bad = { ...mockPreview('https://bad.com'), title: 'A'.repeat(201) };
            storeInLocalStorage({ 'https://bad.com': bad });
            expect(getFromCache('https://bad.com')).toBeNull();
        });

        it('accepts valid entry loaded directly from storage round-trip', () => {
            // Write a valid entry using the canonical storage helper (bypasses memory)
            // and verify Zod accepts it on the localStorage read path.
            const preview = mockPreview('https://roundtrip.com');
            storeInLocalStorage({ 'https://roundtrip.com': preview });
            // Memory is empty (clearCache called in beforeEach) → falls through to localStorage
            expect(getFromCache(preview.url)).toEqual(preview);
        });
    });

    // ── LRU eviction (Issue #4) ───────────────────────────────────────────────

    describe('LRU eviction', () => {
        it(`evicts oldest entry when cache exceeds MAX_CACHE_ENTRIES (${MAX_CACHE_ENTRIES})`, () => {
            const firstUrl = 'https://first-ever.com';
            setInCache(firstUrl, mockPreview(firstUrl));

            for (let i = 1; i < MAX_CACHE_ENTRIES; i++) {
                const url = `https://entry-${i}.com`;
                setInCache(url, mockPreview(url));
            }

            // At capacity — adding one more should evict firstUrl
            const overflowUrl = 'https://overflow.com';
            setInCache(overflowUrl, mockPreview(overflowUrl));

            expect(getCacheSize()).toBe(MAX_CACHE_ENTRIES);
            expect(getFromCache(firstUrl)).toBeNull(); // evicted
            expect(getFromCache(overflowUrl)).not.toBeNull(); // kept
        });
    });

    // ── Field length caps (Issue #7) ──────────────────────────────────────────

    describe('field length caps', () => {
        it('truncates title to 200 chars', () => {
            setInCache('https://a.com', { ...mockPreview('https://a.com'), title: 'T'.repeat(300) });
            expect(getFromCache('https://a.com')?.title?.length).toBe(200);
        });

        it('truncates description to 500 chars', () => {
            setInCache('https://a.com', { ...mockPreview('https://a.com'), description: 'D'.repeat(600) });
            expect(getFromCache('https://a.com')?.description?.length).toBe(500);
        });

        it('truncates image URL to 2048 chars', () => {
            const longImg = `https://img.example.com/${'x'.repeat(2100)}`;
            setInCache('https://a.com', { ...mockPreview('https://a.com'), image: longImg });
            expect(getFromCache('https://a.com')?.image?.length).toBe(2048);
        });

        it('does not add undefined keys for absent optional fields', () => {
            const preview = mockPreview('https://a.com'); // no image, favicon
            setInCache('https://a.com', preview);
            const cached = getFromCache('https://a.com');
            expect('image' in (cached ?? {})).toBe(false);
            expect('favicon' in (cached ?? {})).toBe(false);
        });
    });

    // ── Quota recovery (Issue #6) ─────────────────────────────────────────────

    describe('localStorage quota recovery', () => {
        it('captures Sentry error and retries when quota is exceeded', async () => {
            // Simulate quota exceeded on first write, success on second
            let callCount = 0;
            vi.spyOn(Storage.prototype, 'setItem').mockImplementation(
                function (this: Storage, key: string, value: string) {
                    callCount++;
                    if (callCount === 1) throw new DOMException('QuotaExceededError');
                    // Second attempt: write normally via the real implementation
                    Object.getOwnPropertyDescriptor(
                        Object.getPrototypeOf(Storage.prototype), 'setItem',
                    )?.value?.call(this, key, value);
                },
            );

            vi.useFakeTimers();
            setInCache('https://trigger.com', mockPreview('https://trigger.com'));
            await vi.runAllTimersAsync();

            expect(captureError).toHaveBeenCalledWith(
                expect.objectContaining({ message: expect.stringContaining('quota exceeded') }),
            );
            vi.useRealTimers();
        });
    });
});
