import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { z } from 'zod';
import { storage } from '@/config/firebase';
import { stripBase64Images } from '@/shared/utils/contentSanitizer';
import type { CanvasNode } from '../types/node';
import type { CanvasEdge } from '../types/edge';

const SNAPSHOT_TTL_DAYS = 30;
const SNAPSHOT_PATH = (id: string) => `shared-snapshots/${id}.json`;

// Validates the shape of a fetched snapshot before trusting its contents.
// Nodes/edges use passthrough so extra fields are preserved for downstream rendering.
const canvasSnapshotSchema = z.object({
    snapshotId: z.string(),
    workspaceName: z.string(),
    nodes: z.array(z.object({ id: z.string() }).loose()),
    edges: z.array(z.object({ id: z.string() }).loose()),
    createdAt: z.string(),
    expiresAt: z.string(),
    createdBy: z.string(),
});

export interface CanvasSnapshot {
    snapshotId: string;
    workspaceName: string;
    nodes: CanvasNode[];
    edges: CanvasEdge[];
    createdAt: string;
    expiresAt: string;
    createdBy: string;
}

function buildSnapshot(
    snapshotId: string,
    userId: string,
    workspaceName: string,
    nodes: CanvasNode[],
    edges: CanvasEdge[],
): CanvasSnapshot {
    const createdAt = new Date();
    const expiresAt = new Date(createdAt);
    expiresAt.setDate(expiresAt.getDate() + SNAPSHOT_TTL_DAYS);
    const sanitizedNodes = nodes.map((n) => ({
        ...n,
        data: stripBase64Images(n.data),
    }));
    return {
        snapshotId,
        workspaceName,
        nodes: sanitizedNodes,
        edges,
        createdAt: createdAt.toISOString(),
        expiresAt: expiresAt.toISOString(),
        createdBy: userId,
    };
}

export async function createSnapshot(
    userId: string,
    workspaceName: string,
    nodes: CanvasNode[],
    edges: CanvasEdge[],
): Promise<string> {
    const snapshotId = crypto.randomUUID();
    const snapshot = buildSnapshot(snapshotId, userId, workspaceName, nodes, edges);
    const storageRef = ref(storage, SNAPSHOT_PATH(snapshotId));
    await uploadString(storageRef, JSON.stringify(snapshot), 'raw', {
        contentType: 'application/json',
    });
    return snapshotId;
}

export async function loadSnapshot(snapshotId: string): Promise<CanvasSnapshot> {
    const storageRef = ref(storage, SNAPSHOT_PATH(snapshotId));
    const url = await getDownloadURL(storageRef);
    const response = await fetch(url, { signal: AbortSignal.timeout(10_000) });
    if (!response.ok) {
        throw new Error(`Failed to load snapshot: ${response.status}`);
    }
    const raw: unknown = await response.json();
    const parsed = canvasSnapshotSchema.safeParse(raw);
    if (!parsed.success) {
        throw new Error(`Invalid snapshot format: ${parsed.error.issues[0]?.message ?? 'unknown'}`);
    }
    const data = parsed.data as unknown as CanvasSnapshot;
    if (new Date(data.expiresAt) < new Date()) {
        throw new Error('Snapshot has expired');
    }
    return data;
}
