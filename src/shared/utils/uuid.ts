/**
 * uuid — Portable UUID v4 generator.
 *
 * Prefers `crypto.randomUUID()` (fast, native). Falls back to
 * `crypto.getRandomValues()` when `randomUUID` is unavailable
 * (e.g. non-HTTPS / older browsers).
 */

function fallbackUUID(): string {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    // Set version 4 (bits 12-15 of time_hi_and_version)
    const b6 = bytes[6] ?? 0;
    bytes[6] = (b6 & 0x0f) | 0x40;
    // Set variant 1 (bits 6-7 of clock_seq_hi_and_reserved)
    const b8 = bytes[8] ?? 0;
    bytes[8] = (b8 & 0x3f) | 0x80;

    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function generateUUID(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }
    return fallbackUUID();
}
