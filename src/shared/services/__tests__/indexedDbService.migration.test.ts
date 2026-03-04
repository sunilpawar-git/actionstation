/**
 * IndexedDB Migration Tests
 * TDD RED: Verifies upgradeHandler creates stores based on oldVersion
 */
import { describe, it, expect, vi } from 'vitest';
import { upgradeHandler, IDB_STORES } from '../indexedDbService';

function createMockDb(existingStores: string[] = []) {
    const createdStores: string[] = [];
    return {
        objectStoreNames: { contains: (name: string) => existingStores.includes(name) },
        createObjectStore: vi.fn((name: string) => { createdStores.push(name); }),
        _createdStores: createdStores,
    };
}

describe('upgradeHandler', () => {
    it('creates all 3 stores on fresh install (oldVersion === 0)', () => {
        const mockDb = createMockDb();
        upgradeHandler(mockDb as never, 0);

        expect(mockDb.createObjectStore).toHaveBeenCalledTimes(3);
        expect(mockDb._createdStores).toContain(IDB_STORES.workspaceData);
        expect(mockDb._createdStores).toContain(IDB_STORES.pinnedWorkspaces);
        expect(mockDb._createdStores).toContain(IDB_STORES.metadata);
    });

    it('does not recreate stores when oldVersion === 1 (current version)', () => {
        const mockDb = createMockDb();
        upgradeHandler(mockDb as never, 1);

        expect(mockDb.createObjectStore).not.toHaveBeenCalled();
    });
});
