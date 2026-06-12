import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { CanvasNode } from '../../types/node';
import type { CanvasEdge } from '../../types/edge';

vi.mock('firebase/storage', () => ({
    ref: vi.fn((_s: unknown, path: string) => ({ path })),
    uploadString: vi.fn(() => Promise.resolve()),
    getDownloadURL: vi.fn(() => Promise.resolve('https://storage.example.com/snap.json')),
}));

vi.mock('@/config/firebase', () => ({
    storage: {},
}));

vi.mock('@/shared/utils/contentSanitizer', () => ({
    stripBase64Images: vi.fn(<T>(obj: T) => obj),
}));

vi.mock('@/shared/services/logger', () => ({
    logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

const MOCK_UUID = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
vi.stubGlobal('crypto', { randomUUID: vi.fn(() => MOCK_UUID) });

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

const NODE: CanvasNode = {
    id: 'node-1',
    workspaceId: 'ws-1',
    type: 'idea',
    data: { heading: 'Hello', output: 'World' },
    position: { x: 100, y: 200 },
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
};

const EDGE: CanvasEdge = {
    id: 'edge-1',
    workspaceId: 'ws-1',
    sourceNodeId: 'node-1',
    targetNodeId: 'node-2',
    relationshipType: 'related',
};

describe('snapshotService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('createSnapshot', () => {
        it('returns the generated snapshotId', async () => {
            const { createSnapshot } = await import('../snapshotService');
            const id = await createSnapshot('user-1', 'My Board', [NODE], [EDGE]);
            expect(id).toBe(MOCK_UUID);
        });

        it('uploads to the correct storage path', async () => {
            const { createSnapshot } = await import('../snapshotService');
            const { ref, uploadString } = await import('firebase/storage');
            await createSnapshot('user-1', 'My Board', [NODE], [EDGE]);
            expect(ref).toHaveBeenCalledWith({}, `shared-snapshots/${MOCK_UUID}.json`);
            expect(uploadString).toHaveBeenCalled();
        });

        it('uploads valid JSON with required fields', async () => {
            const { createSnapshot } = await import('../snapshotService');
            const { uploadString } = await import('firebase/storage');
            const now = new Date('2025-06-01T00:00:00.000Z');
            vi.setSystemTime(now);
            await createSnapshot('user-1', 'My Board', [NODE], [EDGE]);
            const [, jsonStr] = vi.mocked(uploadString).mock.calls[0] as [unknown, string, ...unknown[]];
            const parsed = JSON.parse(jsonStr) as Record<string, unknown>;
            expect(parsed.snapshotId).toBe(MOCK_UUID);
            expect(parsed.workspaceName).toBe('My Board');
            expect(parsed.createdBy).toBe('user-1');
            expect(parsed.nodes).toHaveLength(1);
            expect(parsed.edges).toHaveLength(1);
            vi.useRealTimers();
        });

        it('sets expiresAt to 30 days after createdAt', async () => {
            const { createSnapshot } = await import('../snapshotService');
            const { uploadString } = await import('firebase/storage');
            const now = new Date('2025-06-01T00:00:00.000Z');
            vi.setSystemTime(now);
            await createSnapshot('user-1', 'My Board', [NODE], [EDGE]);
            const [, jsonStr] = vi.mocked(uploadString).mock.calls[0] as [unknown, string, ...unknown[]];
            const parsed = JSON.parse(jsonStr) as { createdAt: string; expiresAt: string };
            const created = new Date(parsed.createdAt);
            const expires = new Date(parsed.expiresAt);
            const diffDays = (expires.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
            expect(diffDays).toBe(30);
            vi.useRealTimers();
        });

        it('strips base64 images from node data before uploading', async () => {
            const { createSnapshot } = await import('../snapshotService');
            const { stripBase64Images } = await import('@/shared/utils/contentSanitizer');
            await createSnapshot('user-1', 'My Board', [NODE], [EDGE]);
            expect(stripBase64Images).toHaveBeenCalledWith(NODE.data);
        });

        it('uploads with application/json content type', async () => {
            const { createSnapshot } = await import('../snapshotService');
            const { uploadString } = await import('firebase/storage');
            await createSnapshot('user-1', 'My Board', [NODE], [EDGE]);
            const [, , , metadata] = vi.mocked(uploadString).mock.calls[0] as [unknown, unknown, unknown, { contentType: string }];
            expect(metadata.contentType).toBe('application/json');
        });
    });

    describe('loadSnapshot', () => {
        const FUTURE = new Date(Date.now() + 1000 * 60 * 60 * 24 * 10).toISOString();
        const PAST = new Date(Date.now() - 1000 * 60 * 60 * 24 * 1).toISOString();
        const NOW_ISO = new Date().toISOString();

        const makeSnap = (expiresAt: string) => ({
            snapshotId: MOCK_UUID,
            workspaceName: 'My Board',
            nodes: [NODE],
            edges: [EDGE],
            createdAt: NOW_ISO,
            expiresAt,
            createdBy: 'user-1',
        });

        it('returns parsed snapshot when valid and not expired', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(makeSnap(FUTURE)),
            });
            const { loadSnapshot } = await import('../snapshotService');
            const result = await loadSnapshot(MOCK_UUID);
            expect(result.snapshotId).toBe(MOCK_UUID);
            expect(result.workspaceName).toBe('My Board');
            expect(result.nodes).toHaveLength(1);
            expect(result.edges).toHaveLength(1);
        });

        it('throws when snapshot is expired', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(makeSnap(PAST)),
            });
            const { loadSnapshot } = await import('../snapshotService');
            await expect(loadSnapshot(MOCK_UUID)).rejects.toThrow('expired');
        });

        it('throws when fetch returns non-ok response', async () => {
            mockFetch.mockResolvedValueOnce({ ok: false, status: 404 });
            const { loadSnapshot } = await import('../snapshotService');
            await expect(loadSnapshot(MOCK_UUID)).rejects.toThrow();
        });

        it('constructs the correct storage path for the ref', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(makeSnap(FUTURE)),
            });
            const { loadSnapshot } = await import('../snapshotService');
            const { ref } = await import('firebase/storage');
            await loadSnapshot(MOCK_UUID);
            expect(ref).toHaveBeenCalledWith({}, `shared-snapshots/${MOCK_UUID}.json`);
        });

        it('throws when fetched JSON is missing required fields (invalid schema)', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({ malicious: 'payload' }),
            });
            const { loadSnapshot } = await import('../snapshotService');
            await expect(loadSnapshot(MOCK_UUID)).rejects.toThrow();
        });

        it('throws when fetched JSON has wrong types for critical fields', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({ ...makeSnap(FUTURE), expiresAt: 12345 }),
            });
            const { loadSnapshot } = await import('../snapshotService');
            await expect(loadSnapshot(MOCK_UUID)).rejects.toThrow();
        });
    });
});
