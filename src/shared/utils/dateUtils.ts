/**
 * dateUtils — Safe timestamp normalisation for Firestore-sourced data.
 *
 * Firestore fields typed as `Date` may arrive at runtime as:
 * - A native `Date` object (client-side)
 * - A Firestore `Timestamp` with `.toDate()` (server SDK)
 * - A numeric epoch (ms) or ISO string (REST / migration artefacts)
 *
 * `toEpochMs` unifies all of these into epoch milliseconds, returning
 * `NaN` for shapes it cannot handle — callers should guard accordingly.
 */

/**
 * Convert a possibly-heterogeneous timestamp to epoch milliseconds.
 * Returns `NaN` for unrecognised shapes.
 */
export function toEpochMs(ts: unknown): number {
    if (ts instanceof Date) return ts.getTime();
    if (typeof ts === 'number') return ts;
    if (typeof ts === 'string') return new Date(ts).getTime();
    if (ts != null && typeof (ts as { toDate?: unknown }).toDate === 'function') {
        return (ts as { toDate: () => Date }).toDate().getTime();
    }
    return NaN;
}
