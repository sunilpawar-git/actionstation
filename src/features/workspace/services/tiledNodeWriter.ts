/**
 * Tiled Node Writer — Firestore write operations for spatial chunking.
 * Writes node documents into tile subcollections:
 *   users/{userId}/workspaces/{workspaceId}/tiles/{tileId}/nodes/{nodeId}
 *
 * SSOT for tiled write I/O. No coupling to React or Zustand.
 */
import { doc, collection, setDoc, getDocs, query, limit, serverTimestamp, runTransaction } from 'firebase/firestore';
import { db } from '@/config/firebase';
import type { CanvasNode } from '@/features/canvas/types/node';
import { removeUndefined, chunkedBatchWrite } from '@/shared/utils/firebaseUtils';
import { stripBase64Images } from '@/shared/utils/contentSanitizer';
import { CURRENT_SCHEMA_VERSION } from '@/migrations/migrationRunner';
import { logger } from '@/shared/services/logger';
import { FIRESTORE_QUERY_CAP } from '@/config/firestoreQueryConfig';

const TRANSACTION_WRITE_LIMIT = 500;

function getTileNodeDocRef(userId: string, workspaceId: string, tileId: string, nodeId: string) {
    return doc(db, 'users', userId, 'workspaces', workspaceId, 'tiles', tileId, 'nodes', nodeId);
}

function getTileNodesRef(userId: string, workspaceId: string, tileId: string) {
    return collection(db, 'users', userId, 'workspaces', workspaceId, 'tiles', tileId, 'nodes');
}

function buildTiledNodeDoc(node: CanvasNode, userId: string, workspaceId: string) {
    const sanitizedData = stripBase64Images(removeUndefined(node.data as Record<string, unknown>));
    return removeUndefined({
        id: node.id, userId, workspaceId, tileId: node.tileId,
        type: node.type, data: sanitizedData, position: node.position,
        width: node.width, height: node.height,
        createdAt: node.createdAt, updatedAt: serverTimestamp(),
        schemaVersion: CURRENT_SCHEMA_VERSION,
    });
}

/**
 * Save nodes grouped by tile. Only dirty tiles are written.
 * Within each dirty tile, orphaned docs are deleted.
 */
export async function saveTiledNodes(
    userId: string,
    workspaceId: string,
    nodes: CanvasNode[],
    dirtyTileIds: Set<string>,
): Promise<void> {
    const nodesByTile = new Map<string, CanvasNode[]>();
    for (const node of nodes) {
        if (!node.tileId || !dirtyTileIds.has(node.tileId)) continue;
        const list = nodesByTile.get(node.tileId) ?? [];
        list.push(node);
        nodesByTile.set(node.tileId, list);
    }

    for (const [tileId, tileNodes] of nodesByTile) {
        const ref = getTileNodesRef(userId, workspaceId, tileId);
        const existing = await getDocs(query(ref, limit(FIRESTORE_QUERY_CAP)));
        const existingIds = new Set(existing.docs.map((d) => d.id));
        const currentIds = new Set(tileNodes.map((n) => n.id));
        const totalOps = tileNodes.length + [...existingIds].filter((id) => !currentIds.has(id)).length;

        if (totalOps <= TRANSACTION_WRITE_LIMIT) {
            await runTransaction(db, (txn) => {
                existingIds.forEach((id) => {
                    if (!currentIds.has(id)) txn.delete(getTileNodeDocRef(userId, workspaceId, tileId, id));
                });
                tileNodes.forEach((node) => {
                    txn.set(getTileNodeDocRef(userId, workspaceId, tileId, node.id), buildTiledNodeDoc(node, userId, workspaceId));
                });
                return Promise.resolve();
            });
        } else {
            const ops: Array<{ type: 'set' | 'delete'; ref: ReturnType<typeof doc>; data?: Record<string, unknown> }> = [];
            existingIds.forEach((id) => {
                if (!currentIds.has(id)) ops.push({ type: 'delete', ref: getTileNodeDocRef(userId, workspaceId, tileId, id) });
            });
            tileNodes.forEach((node) => {
                ops.push({ type: 'set', ref: getTileNodeDocRef(userId, workspaceId, tileId, node.id), data: buildTiledNodeDoc(node, userId, workspaceId) });
            });
            await chunkedBatchWrite(ops as Parameters<typeof chunkedBatchWrite>[0]);
        }
    }

}

/** Append a single node to its tile subcollection */
export async function appendTiledNode(userId: string, workspaceId: string, node: CanvasNode): Promise<void> {
    const tileId = node.tileId;
    if (!tileId) {
        logger.error('[tiledNodeWriter] appendTiledNode called with missing tileId', undefined, { nodeId: node.id });
        return;
    }
    await setDoc(getTileNodeDocRef(userId, workspaceId, tileId, node.id), buildTiledNodeDoc(node, userId, workspaceId));
}

/** Atomically move a node from one tile to another */
export async function reassignNodeTile(
    userId: string,
    workspaceId: string,
    node: CanvasNode,
    oldTileId: string,
    newTileId: string,
): Promise<void> {
    await runTransaction(db, (txn) => {
        txn.delete(getTileNodeDocRef(userId, workspaceId, oldTileId, node.id));
        txn.set(
            getTileNodeDocRef(userId, workspaceId, newTileId, node.id),
            buildTiledNodeDoc({ ...node, tileId: newTileId }, userId, workspaceId),
        );
        return Promise.resolve();
    });
}
