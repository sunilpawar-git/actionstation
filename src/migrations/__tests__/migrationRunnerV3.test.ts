import { describe, it, expect, vi } from 'vitest';
import { migrateNode, migrateWorkspace, CURRENT_SCHEMA_VERSION } from '../migrationRunner';
import type { CanvasNode } from '@/features/canvas/types/node';
import type { Workspace } from '@/features/workspace/types/workspace';
import { getTileId } from '@/features/workspace/services/tileCalculator';

vi.mock('@/shared/services/logger', () => ({
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

const baseNode: CanvasNode = {
    id: 'n1', workspaceId: 'ws-1', type: 'idea',
    data: { heading: 'test' },
    position: { x: 7500, y: 9200 },
    createdAt: new Date(), updatedAt: new Date(),
};

const baseWorkspace: Workspace = {
    id: 'ws-1', userId: 'u1', name: 'Test',
    canvasSettings: { backgroundColor: 'grid' },
    createdAt: new Date(), updatedAt: new Date(),
};

describe('migrationRunner v3 — add_tileId_field', () => {
    it('CURRENT_SCHEMA_VERSION equals 3', () => {
        expect(CURRENT_SCHEMA_VERSION).toBe(3);
    });

    it('adds tileId computed from position when missing', () => {
        const result = migrateNode(baseNode);
        expect(result.tileId).toBe(getTileId(baseNode.position));
        expect(result.tileId).toBe('tile_3_4');
    });

    it('preserves existing tileId', () => {
        const node = { ...baseNode, tileId: 'tile_99_99', schemaVersion: 3 };
        const result = migrateNode(node);
        expect(result.tileId).toBe('tile_99_99');
    });

    it('applies v3 migration from v0 (all migrations in order)', () => {
        const legacy = { ...baseNode, schemaVersion: undefined };
        const result = migrateNode(legacy);
        expect(result.schemaVersion).toBe(3);
        expect(result.tileId).toBe('tile_3_4');
    });

    it('applies v3 migration from v2', () => {
        const v2 = { ...baseNode, schemaVersion: 2 };
        const result = migrateNode(v2);
        expect(result.schemaVersion).toBe(3);
        expect(result.tileId).toBe('tile_3_4');
    });

    it('is idempotent — migrating twice yields same result', () => {
        const first = migrateNode(baseNode);
        const second = migrateNode(first);
        expect(second.tileId).toBe(first.tileId);
        expect(second.schemaVersion).toBe(first.schemaVersion);
    });

    it('computes tileId for negative positions', () => {
        const node = { ...baseNode, position: { x: -500, y: -3200 } };
        const result = migrateNode(node);
        expect(result.tileId).toBe('tile_n1_n2');
    });

    it('computes tileId for origin position', () => {
        const node = { ...baseNode, position: { x: 0, y: 0 } };
        const result = migrateNode(node);
        expect(result.tileId).toBe('tile_0_0');
    });

    it('workspace migration still works with v3 version bump', () => {
        const result = migrateWorkspace(baseWorkspace);
        expect(result.schemaVersion).toBe(3);
    });

    it('workspace without spatialChunkingEnabled remains valid', () => {
        const result = migrateWorkspace(baseWorkspace);
        expect(result.spatialChunkingEnabled).toBeUndefined();
    });
});
