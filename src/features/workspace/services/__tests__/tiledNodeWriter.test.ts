import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/config/firebase', () => ({ db: {} }));
vi.mock('@/shared/services/logger', () => ({
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

const mockSetDoc = vi.fn();
const mockDeleteDoc = vi.fn();
const mockGetDocs = vi.fn();
const mockRunTransaction = vi.fn();

vi.mock('firebase/firestore', () => ({
    doc: vi.fn((...args: string[]) => ({ _path: args.join('/'), id: args[args.length - 1] })),
    collection: vi.fn((...args: string[]) => ({ _path: args.join('/') })),
    setDoc: (...args: unknown[]) => mockSetDoc(...args),
    deleteDoc: (...args: unknown[]) => mockDeleteDoc(...args),
    getDocs: (...args: unknown[]) => mockGetDocs(...args),
    query: vi.fn((ref: unknown) => ref),
    limit: vi.fn(),
    serverTimestamp: vi.fn(() => 'SERVER_TS'),
    runTransaction: (...args: unknown[]) => mockRunTransaction(...args),
}));

vi.mock('@/shared/utils/contentSanitizer', () => ({
    stripBase64Images: vi.fn(<T>(obj: T) => obj),
}));

vi.mock('@/shared/utils/firebaseUtils', () => ({
    removeUndefined: vi.fn(<T>(obj: T) => obj),
    chunkedBatchWrite: vi.fn(),
}));

vi.mock('@/migrations/migrationRunner', () => ({
    CURRENT_SCHEMA_VERSION: 3,
}));

import { saveTiledNodes, appendTiledNode, reassignNodeTile } from '../tiledNodeWriter';
import type { CanvasNode } from '@/features/canvas/types/node';
import { stripBase64Images } from '@/shared/utils/contentSanitizer';

function makeNode(overrides: Partial<CanvasNode> & { id: string; tileId: string }): CanvasNode {
    return {
        workspaceId: 'ws1', type: 'idea',
        data: { heading: 'test' },
        position: { x: 100, y: 100 },
        createdAt: new Date(), updatedAt: new Date(),
        ...overrides,
    } as CanvasNode;
}

describe('tiledNodeWriter', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('saveTiledNodes', () => {
        it('groups nodes by tile and writes each group', async () => {
            const nodes = [
                makeNode({ id: 'n1', tileId: 'tile_0_0' }),
                makeNode({ id: 'n2', tileId: 'tile_0_0' }),
                makeNode({ id: 'n3', tileId: 'tile_1_0' }),
            ];
            mockGetDocs.mockResolvedValue({ docs: [], size: 0 });
            mockRunTransaction.mockImplementation(async (_db: unknown, fn: (txn: unknown) => Promise<void>) => {
                const txn = { set: vi.fn(), delete: vi.fn() };
                await fn(txn);
            });

            await saveTiledNodes('u1', 'ws1', nodes, new Set(['tile_0_0', 'tile_1_0']));
            expect(mockRunTransaction).toHaveBeenCalled();
        });

        it('only saves dirty tiles', async () => {
            const nodes = [
                makeNode({ id: 'n1', tileId: 'tile_0_0' }),
                makeNode({ id: 'n2', tileId: 'tile_1_0' }),
            ];
            mockGetDocs.mockResolvedValue({ docs: [], size: 0 });
            mockRunTransaction.mockImplementation(async (_db: unknown, fn: (txn: unknown) => Promise<void>) => {
                const txn = { set: vi.fn(), delete: vi.fn() };
                await fn(txn);
            });

            await saveTiledNodes('u1', 'ws1', nodes, new Set(['tile_0_0']));
            expect(mockRunTransaction).toHaveBeenCalledTimes(1);
        });

        it('applies stripBase64Images on node data', async () => {
            const nodes = [makeNode({ id: 'n1', tileId: 'tile_0_0' })];
            mockGetDocs.mockResolvedValue({ docs: [], size: 0 });
            mockRunTransaction.mockImplementation(async (_db: unknown, fn: (txn: unknown) => Promise<void>) => {
                const txn = { set: vi.fn(), delete: vi.fn() };
                await fn(txn);
            });

            await saveTiledNodes('u1', 'ws1', nodes, new Set(['tile_0_0']));
            expect(stripBase64Images).toHaveBeenCalled();
        });

        it('deletes orphaned docs within dirty tiles', async () => {
            const nodes = [makeNode({ id: 'n1', tileId: 'tile_0_0' })];
            mockGetDocs.mockResolvedValue({
                docs: [
                    { id: 'n1', data: () => ({}) },
                    { id: 'n_orphan', data: () => ({}) },
                ],
                size: 2,
            });
            let txnActions: { set: ReturnType<typeof vi.fn>; delete: ReturnType<typeof vi.fn> } | null = null;
            mockRunTransaction.mockImplementation(async (_db: unknown, fn: (txn: unknown) => Promise<void>) => {
                txnActions = { set: vi.fn(), delete: vi.fn() };
                await fn(txnActions);
            });

            await saveTiledNodes('u1', 'ws1', nodes, new Set(['tile_0_0']));
            expect(txnActions!.delete).toHaveBeenCalled();
        });
    });

    describe('appendTiledNode', () => {
        it('writes node to correct tile subcollection', async () => {
            const node = makeNode({ id: 'n1', tileId: 'tile_2_3' });
            mockSetDoc.mockResolvedValueOnce(undefined);

            await appendTiledNode('u1', 'ws1', node);
            expect(mockSetDoc).toHaveBeenCalledTimes(1);
        });

        it('applies stripBase64Images on node data', async () => {
            const node = makeNode({ id: 'n1', tileId: 'tile_0_0' });
            mockSetDoc.mockResolvedValueOnce(undefined);

            await appendTiledNode('u1', 'ws1', node);
            expect(stripBase64Images).toHaveBeenCalled();
        });
    });

    describe('reassignNodeTile', () => {
        it('deletes from old tile and writes to new tile atomically', async () => {
            const node = makeNode({ id: 'n1', tileId: 'tile_1_0' });
            let txnActions: { set: ReturnType<typeof vi.fn>; delete: ReturnType<typeof vi.fn> } | null = null;
            mockRunTransaction.mockImplementation(async (_db: unknown, fn: (txn: unknown) => Promise<void>) => {
                txnActions = { set: vi.fn(), delete: vi.fn() };
                await fn(txnActions);
            });

            await reassignNodeTile('u1', 'ws1', node, 'tile_0_0', 'tile_1_0');
            expect(txnActions!.delete).toHaveBeenCalledTimes(1);
            expect(txnActions!.set).toHaveBeenCalledTimes(1);
        });
    });
});
