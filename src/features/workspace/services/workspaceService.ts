/** Workspace Service - Firestore persistence for workspaces */
import { doc, setDoc, getDoc, getDocs, collection, writeBatch, serverTimestamp, getCountFromServer, updateDoc, query, limit, runTransaction } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { type Workspace, createWorkspace, createDivider } from '../types/workspace';
import { strings } from '@/shared/localization/strings';
import { type CanvasNode, normalizeNodeColorKey } from '@/features/canvas/types/node';
import { normalizeContentMode } from '@/features/canvas/types/contentMode';
import type { CanvasEdge } from '@/features/canvas/types/edge';
import { removeUndefined, batchDeleteCollection, chunkedBatchWrite } from '@/shared/utils/firebaseUtils';
import { stripBase64Images } from '@/shared/utils/contentSanitizer';
import { cleanupDeletedNodeStorage } from './nodeStorageCleanup';
import { loadWorkspaceBundle, invalidateBundleCache } from './bundleLoader';
import { migrateWorkspace, migrateNode, CURRENT_SCHEMA_VERSION } from '@/migrations/migrationRunner';
import { logger } from '@/shared/services/logger';
import { FIRESTORE_QUERY_CAP, WORKSPACE_LIST_CAP } from '@/config/firestoreQueryConfig';

const getSubcollectionRef = (userId: string, workspaceId: string, sub: string) =>
    collection(db, 'users', userId, 'workspaces', workspaceId, sub);
const getSubcollectionDocRef = (userId: string, workspaceId: string, sub: string, docId: string) =>
    doc(db, 'users', userId, 'workspaces', workspaceId, sub, docId);

/** Create a new workspace and save to Firestore */
export async function createNewWorkspace(userId: string, name?: string): Promise<Workspace> {
    const workspaceId = `workspace-${crypto.randomUUID()}`;
    const workspace = createWorkspace(workspaceId, userId, name ?? strings.workspace.untitled);
    workspace.nodeCount = 0;
    await saveWorkspace(userId, workspace);
    invalidateBundleCache();
    return workspace;
}

/** Create a new divider and save to Firestore */
export async function createNewDividerWorkspace(userId: string): Promise<Workspace> {
    const workspaceId = `divider-${crypto.randomUUID()}`;
    const workspace = createDivider(workspaceId, userId);
    await saveWorkspace(userId, workspace);
    invalidateBundleCache();
    return workspace;
}

/** Save workspace metadata to Firestore */
export async function saveWorkspace(userId: string, workspace: Workspace): Promise<void> {
    const workspaceRef = doc(db, 'users', userId, 'workspaces', workspace.id);
    await setDoc(workspaceRef, {
        id: workspace.id,
        name: workspace.name,
        canvasSettings: workspace.canvasSettings,
        createdAt: workspace.createdAt,
        updatedAt: serverTimestamp(),
        orderIndex: workspace.orderIndex ?? Date.now(),
        type: workspace.type ?? 'workspace',
        nodeCount: workspace.nodeCount ?? 0,
        includeAllNodesInPool: workspace.includeAllNodesInPool ?? false,
        clusterGroups: workspace.clusterGroups ?? [],
        spatialChunkingEnabled: workspace.spatialChunkingEnabled ?? false,
    });
}

/** Efficiently update the node count of a workspace without rewriting other metadata */
export async function updateWorkspaceNodeCount(userId: string, workspaceId: string, nodeCount: number): Promise<void> {
    await updateDoc(doc(db, 'users', userId, 'workspaces', workspaceId), { nodeCount, updatedAt: serverTimestamp() });
}

/** Firestore workspace document shape */
interface WorkspaceDoc {
    id: string;
    name: string;
    canvasSettings?: Workspace['canvasSettings'];
    createdAt?: { toDate?: () => Date };
    updatedAt?: { toDate?: () => Date };
    orderIndex?: number;
    type?: 'workspace' | 'divider';
    nodeCount?: number;
    includeAllNodesInPool?: boolean;
    clusterGroups?: unknown[];
    spatialChunkingEnabled?: boolean;
}

function validateClusterGroups(raw: unknown[] | undefined): Workspace['clusterGroups'] {
    if (!Array.isArray(raw)) return [];
    return raw.filter((item): item is NonNullable<Workspace['clusterGroups']>[number] =>
        typeof item === 'object' && item !== null && typeof (item as Record<string, unknown>).id === 'string'
        && Array.isArray((item as Record<string, unknown>).nodeIds)
        && typeof (item as Record<string, unknown>).label === 'string'
        && typeof (item as Record<string, unknown>).colorIndex === 'number');
}

async function backfillNodeCount(
    userId: string, workspaceId: string, docRef: ReturnType<typeof doc>,
): Promise<number> {
    try {
        const countSnap = await getCountFromServer(getSubcollectionRef(userId, workspaceId, 'nodes'));
        const count = countSnap.data().count;
        setDoc(docRef, { nodeCount: count }, { merge: true })
            .catch((err: unknown) => logger.error('[workspaceService] Failed to backfill nodeCount:', err));
        return count;
    } catch (error: unknown) {
        logger.error('[workspaceService] Failed to get nodeCount for workspace', error, { workspaceId });
        return 0;
    }
}

function buildWorkspace(data: WorkspaceDoc, userId: string, nodeCount: number): Workspace {
    return migrateWorkspace({
        id: data.id, userId, name: data.name,
        canvasSettings: data.canvasSettings ?? { backgroundColor: 'grid' },
        createdAt: data.createdAt?.toDate?.() ?? new Date(),
        updatedAt: data.updatedAt?.toDate?.() ?? new Date(),
        orderIndex: data.orderIndex ?? Date.now(), type: data.type ?? 'workspace',
        nodeCount, includeAllNodesInPool: data.includeAllNodesInPool ?? false,
        clusterGroups: validateClusterGroups(data.clusterGroups),
        spatialChunkingEnabled: data.spatialChunkingEnabled ?? false,
    });
}

/** Load workspace from Firestore */
export async function loadWorkspace(userId: string, workspaceId: string): Promise<Workspace | null> {
    const workspaceRef = doc(db, 'users', userId, 'workspaces', workspaceId);
    const snapshot = await getDoc(workspaceRef);
    if (!snapshot.exists()) return null;
    const data = snapshot.data() as WorkspaceDoc;
    const nodeCount = data.nodeCount !== undefined || data.type === 'divider'
        ? (data.nodeCount ?? 0)
        : await backfillNodeCount(userId, workspaceId, workspaceRef);
    return buildWorkspace(data, userId, nodeCount);
}

/** Load all workspaces for a user from Firestore (tries bundle first, falls back to direct query) */
export async function loadUserWorkspaces(userId: string): Promise<Workspace[]> {
    const bundleSnapshot = await loadWorkspaceBundle();
    const workspacesRef = collection(db, 'users', userId, 'workspaces');
    const q = query(workspacesRef, limit(WORKSPACE_LIST_CAP));
    const snapshot = bundleSnapshot ?? await getDocs(q);
    if (snapshot.size >= WORKSPACE_LIST_CAP) {
        logger.warn('[workspaceService] Workspace list cap reached', { cap: WORKSPACE_LIST_CAP });
    }
    const workspaces: Workspace[] = [];
    const CHUNK_SIZE = 20;
    for (let i = 0; i < snapshot.docs.length; i += CHUNK_SIZE) {
        const chunk = snapshot.docs.slice(i, i + CHUNK_SIZE);
        const processed = await Promise.all(chunk.map(async (docSnap) => {
            const data = docSnap.data() as WorkspaceDoc;
            const nodeCount = data.nodeCount !== undefined || data.type === 'divider'
                ? (data.nodeCount ?? 0)
                : await backfillNodeCount(userId, data.id, docSnap.ref as ReturnType<typeof doc>);
            return buildWorkspace(data, userId, nodeCount);
        }));
        workspaces.push(...processed);
    }
    return workspaces;
}

/** Append a single node to a workspace without disturbing existing nodes */
export async function appendNode(userId: string, workspaceId: string, node: CanvasNode): Promise<void> {
    const sanitizedData = stripBase64Images(removeUndefined(node.data as Record<string, unknown>));
    const nodeDoc = removeUndefined({
        id: node.id, userId, workspaceId, type: node.type, data: sanitizedData, position: node.position,
        width: node.width, height: node.height, createdAt: node.createdAt, updatedAt: serverTimestamp(),
        schemaVersion: CURRENT_SCHEMA_VERSION,
    });
    await setDoc(getSubcollectionDocRef(userId, workspaceId, 'nodes', node.id), nodeDoc);
}

const TRANSACTION_WRITE_LIMIT = 500;
/** Save nodes to Firestore with delete sync. runTransaction for small ops, chunked batch otherwise. */
export async function saveNodes(userId: string, workspaceId: string, nodes: CanvasNode[]): Promise<void> {
    const nodesRef = getSubcollectionRef(userId, workspaceId, 'nodes');
    const existingSnapshot = await getDocs(query(nodesRef, limit(FIRESTORE_QUERY_CAP)));
    const existingIds = new Set(existingSnapshot.docs.map((d) => d.id));
    const currentIds = new Set(nodes.map((n) => n.id));
    const deletedNodeData: CanvasNode[] = existingSnapshot.docs
        .filter((d) => !currentIds.has(d.id))
        .map((d) => ({ id: d.id, data: (d.data() as Record<string, unknown>).data ?? {}, type: 'idea', position: { x: 0, y: 0 } }) as CanvasNode);
    const totalOps = (existingIds.size - currentIds.size > 0 ? existingIds.size - currentIds.size : 0) + nodes.length;
    const buildNodeDoc = (node: CanvasNode) => {
        const sanitizedData = stripBase64Images(removeUndefined(node.data as Record<string, unknown>));
        return removeUndefined({
            id: node.id, userId, workspaceId, type: node.type, data: sanitizedData, position: node.position,
            width: node.width, height: node.height, createdAt: node.createdAt, updatedAt: serverTimestamp(),
            schemaVersion: CURRENT_SCHEMA_VERSION,
        });
    };
    if (totalOps <= TRANSACTION_WRITE_LIMIT) {
        await runTransaction(db, (txn) => {
            existingIds.forEach((id) => { if (!currentIds.has(id)) txn.delete(getSubcollectionDocRef(userId, workspaceId, 'nodes', id)); });
            nodes.forEach((node) => txn.set(getSubcollectionDocRef(userId, workspaceId, 'nodes', node.id), buildNodeDoc(node)));
            return Promise.resolve();
        });
    } else {
        const ops: Array<{ type: 'set' | 'delete'; ref: ReturnType<typeof getSubcollectionDocRef>; data?: Record<string, unknown> }> = [];
        existingIds.forEach((id) => { if (!currentIds.has(id)) ops.push({ type: 'delete', ref: getSubcollectionDocRef(userId, workspaceId, 'nodes', id) }); });
        nodes.forEach((node) => ops.push({ type: 'set', ref: getSubcollectionDocRef(userId, workspaceId, 'nodes', node.id), data: buildNodeDoc(node) }));
        await chunkedBatchWrite(ops as Parameters<typeof chunkedBatchWrite>[0]);
    }
    if (deletedNodeData.length > 0) {
        cleanupDeletedNodeStorage(deletedNodeData).catch((err: unknown) =>
            logger.warn('[workspaceService] Storage cleanup failed:', err));
    }
}

/** Save edges to Firestore with delete sync. Uses runTransaction when total ops fit, batch otherwise. */
export async function saveEdges(userId: string, workspaceId: string, edges: CanvasEdge[]): Promise<void> {
    const edgesRef = getSubcollectionRef(userId, workspaceId, 'edges');
    const existingSnapshot = await getDocs(query(edgesRef, limit(FIRESTORE_QUERY_CAP)));
    const existingIds = new Set(existingSnapshot.docs.map((d) => d.id));
    const currentIds = new Set(edges.map((e) => e.id));
    const buildEdgeDoc = (edge: CanvasEdge) => ({
        id: edge.id, userId, workspaceId, sourceNodeId: edge.sourceNodeId,
        targetNodeId: edge.targetNodeId, relationshipType: edge.relationshipType,
    });
    const totalOps = Math.max(0, existingIds.size - currentIds.size) + edges.length;
    if (totalOps <= TRANSACTION_WRITE_LIMIT) {
        await runTransaction(db, (txn) => {
            existingIds.forEach((id) => { if (!currentIds.has(id)) txn.delete(getSubcollectionDocRef(userId, workspaceId, 'edges', id)); });
            edges.forEach((edge) => txn.set(getSubcollectionDocRef(userId, workspaceId, 'edges', edge.id), buildEdgeDoc(edge)));
            return Promise.resolve();
        });
    } else {
        const ops: Array<{ type: 'set' | 'delete'; ref: ReturnType<typeof getSubcollectionDocRef>; data?: Record<string, unknown> }> = [];
        existingIds.forEach((id) => { if (!currentIds.has(id)) ops.push({ type: 'delete', ref: getSubcollectionDocRef(userId, workspaceId, 'edges', id) }); });
        edges.forEach((edge) => ops.push({ type: 'set', ref: getSubcollectionDocRef(userId, workspaceId, 'edges', edge.id), data: buildEdgeDoc(edge) }));
        await chunkedBatchWrite(ops as Parameters<typeof chunkedBatchWrite>[0]);
    }
}

/** Load nodes from Firestore */
export async function loadNodes(userId: string, workspaceId: string): Promise<CanvasNode[]> {
    const nodesRef = getSubcollectionRef(userId, workspaceId, 'nodes');
    const q = query(nodesRef, limit(FIRESTORE_QUERY_CAP));
    const snapshot = await getDocs(q);
    if (snapshot.size >= FIRESTORE_QUERY_CAP) {
        logger.warn('[workspaceService] Node query cap reached', { cap: FIRESTORE_QUERY_CAP, workspaceId });
    }
    return snapshot.docs.map((docSnapshot) => {
        const data = docSnapshot.data();
        /* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call -- Firestore DocumentData fields */
        return migrateNode({
            id: data.id, workspaceId, type: data.type,
            data: {
                ...(data.data as CanvasNode['data']),
                colorKey: normalizeNodeColorKey((data.data as CanvasNode['data']).colorKey),
                contentMode: normalizeContentMode((data.data as CanvasNode['data']).contentMode),
            },
            position: data.position, width: data.width, height: data.height,
            createdAt: data.createdAt?.toDate?.() ?? new Date(),
            updatedAt: data.updatedAt?.toDate?.() ?? new Date(),
        } as CanvasNode);
        /* eslint-enable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call */
    });
}

/** Load edges from Firestore */
export async function loadEdges(userId: string, workspaceId: string): Promise<CanvasEdge[]> {
    const edgesRef = getSubcollectionRef(userId, workspaceId, 'edges');
    const snapshot = await getDocs(query(edgesRef, limit(FIRESTORE_QUERY_CAP)));
    return snapshot.docs.map((docSnapshot) => {
        const data = docSnapshot.data();
        /* eslint-disable @typescript-eslint/no-unsafe-assignment -- Firestore DocumentData fields */
        return {
            id: data.id, sourceNodeId: data.sourceNodeId,
            targetNodeId: data.targetNodeId, relationshipType: data.relationshipType,
        } as CanvasEdge;
        /* eslint-enable @typescript-eslint/no-unsafe-assignment */
    });
}

/** Delete a workspace and all its contents (nodes, edges, KB entries, Storage files) */
export async function deleteWorkspace(userId: string, workspaceId: string): Promise<void> {
    const { deleteAllKBEntries } = await import('@/features/knowledgeBank/services/knowledgeBankService');
    await deleteAllKBEntries(userId, workspaceId);
    const nodesRef = getSubcollectionRef(userId, workspaceId, 'nodes');
    const edgesRef = getSubcollectionRef(userId, workspaceId, 'edges');
    const nodeSnap = await getDocs(query(nodesRef, limit(FIRESTORE_QUERY_CAP)));
    const nodesToClean = nodeSnap.docs.map((d) => ({ id: d.id, data: (d.data() as Record<string, unknown>).data ?? {}, type: 'idea', position: { x: 0, y: 0 } }) as CanvasNode);
    void cleanupDeletedNodeStorage(nodesToClean).catch((err: unknown) =>
        logger.warn('[workspaceService] deleteWorkspace storage cleanup failed:', err));
    await batchDeleteCollection(nodesRef);
    await batchDeleteCollection(edgesRef);
    const batch = writeBatch(db);
    batch.delete(doc(db, 'users', userId, 'workspaces', workspaceId));
    await batch.commit();
    invalidateBundleCache();
}
export { updateWorkspaceOrder } from './workspaceOrderService';
