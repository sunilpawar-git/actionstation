/**
 * Firestore Query Safety Caps
 * Prevents unbounded collection reads and runaway batch deletes.
 */

/** Max documents returned from a single getDocs call for workspace data */
export const FIRESTORE_QUERY_CAP = 1000;

/** Max documents fetched per batch-delete iteration */
export const FIRESTORE_BATCH_DELETE_CAP = 500;

/** Max workspaces returned for a user */
export const WORKSPACE_LIST_CAP = 100;

/** Max KB entries returned for a workspace */
export const KB_ENTRIES_CAP = 500;

/** Spatial tile size in canvas pixels (2000 x 2000 grid cells) */
export const TILE_SIZE = 2000;

/** Number of extra tile rings to prefetch around the viewport */
export const TILE_PREFETCH_RING = 1;

/** Milliseconds before an inactive tile is evicted from the cache */
export const TILE_EVICTION_MS = 60_000;
