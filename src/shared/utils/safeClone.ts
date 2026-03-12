/**
 * safeClone — Deep clone with structuredClone, falling back to JSON round-trip.
 *
 * `structuredClone` throws `DataCloneError` on objects containing functions,
 * DOM nodes, Symbols, or non-serialisable types. The JSON fallback silently
 * drops those properties but never throws.
 */
export function safeClone<T>(obj: T): T {
    try {
        return structuredClone(obj);
    } catch {
        return JSON.parse(JSON.stringify(obj)) as T;
    }
}
