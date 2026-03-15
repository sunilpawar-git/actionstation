/**
 * Tile Loader — Viewport-driven Firestore reads for spatial chunking.
 * Loads nodes from tile subcollections with an in-memory cache.
 * SSOT for tile read I/O. No coupling to React or Zustand.
 */
import { collection, getDocs, query, limit } from 'firebase/firestore';
import { db } from '@/config/firebase';
import type { CanvasNode } from '@/features/canvas/types/node';
import { normalizeNodeColorKey } from '@/features/canvas/types/node';
import { normalizeContentMode } from '@/features/canvas/types/contentMode';
import { migrateNode } from '@/migrations/migrationRunner';
import { logger } from '@/shared/services/logger';
import { FIRESTORE_QUERY_CAP, TILE_EVICTION_MS } from '@/config/firestoreQueryConfig';

interface TileCacheEntry {
    nodes: CanvasNode[];
    loadedAt: number;
}

const cache = new Map<string, TileCacheEntry>();

function getTileNodesRef(userId: string, workspaceId: string, tileId: string) {
    return collection(db, 'users', userId, 'workspaces', workspaceId, 'tiles', tileId, 'nodes');
}

interface FirestoreTimestamp {
    toDate?: () => Date;
}

function parseNodeDoc(docSnapshot: { data: () => Record<string, unknown> }, workspaceId: string): CanvasNode {
    const data = docSnapshot.data();
    const nodeData = data.data as CanvasNode['data'];
    const created = data.createdAt as FirestoreTimestamp | undefined;
    const updated = data.updatedAt as FirestoreTimestamp | undefined;
    return migrateNode({
        id: data.id,
        workspaceId,
        type: data.type,
        data: {
            ...nodeData,
            colorKey: normalizeNodeColorKey(nodeData.colorKey),
            contentMode: normalizeContentMode(nodeData.contentMode),
        },
        position: data.position,
        width: data.width,
        height: data.height,
        createdAt: created?.toDate?.() ?? new Date(),
        updatedAt: updated?.toDate?.() ?? new Date(),
    } as CanvasNode);
}

async function fetchTile(
    userId: string,
    workspaceId: string,
    tileId: string,
): Promise<CanvasNode[]> {
    const ref = getTileNodesRef(userId, workspaceId, tileId);
    const snapshot = await getDocs(query(ref, limit(FIRESTORE_QUERY_CAP)));
    if (snapshot.size >= FIRESTORE_QUERY_CAP) {
        logger.warn('[tileLoader] Tile query cap reached', { tileId, cap: FIRESTORE_QUERY_CAP });
    }
    return snapshot.docs.map((d) =>
        parseNodeDoc(d as unknown as { data: () => Record<string, unknown> }, workspaceId),
    );
}

async function loadTiles(
    userId: string,
    workspaceId: string,
    tileIds: string[],
): Promise<CanvasNode[]> {
    const uncached = tileIds.filter((id) => !cache.has(id));
    if (uncached.length > 0) {
        const results = await Promise.all(
            uncached.map((id) => fetchTile(userId, workspaceId, id).then((nodes) => ({ id, nodes }))),
        );
        for (const { id, nodes } of results) {
            cache.set(id, { nodes, loadedAt: Date.now() });
        }
    }
    return tileIds.flatMap((id) => cache.get(id)?.nodes ?? []);
}

function invalidateTile(tileId: string): void {
    cache.delete(tileId);
}

function evictStaleTiles(activeTileIds: string[]): string[] {
    const now = Date.now();
    const activeSet = new Set(activeTileIds);
    const evicted: string[] = [];
    for (const [key, entry] of [...cache.entries()]) {
        if (!activeSet.has(key) && now - entry.loadedAt > TILE_EVICTION_MS) {
            cache.delete(key);
            evicted.push(key);
        }
    }
    return evicted;
}

function clearCache(): void {
    cache.clear();
}

function getCachedTileIds(): string[] {
    return [...cache.keys()];
}

export const tileLoader = {
    loadTiles,
    invalidateTile,
    evictStaleTiles,
    clearCache,
    getCachedTileIds,
} as const;
