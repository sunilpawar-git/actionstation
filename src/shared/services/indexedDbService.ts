/**
 * IndexedDB Service - Generic typed wrapper over idb library
 * SOLID SRP: Only handles IDB database lifecycle and CRUD operations
 */
import { openDB, type IDBPDatabase } from 'idb';
import { captureError } from './sentryService';
import { strings } from '@/shared/localization/strings';

const DB_NAME = 'actionstation';
const DB_VERSION = 1;

/** Store names available in the ActionStation IDB database */
export const IDB_STORES = {
    workspaceData: 'workspace-data',
    pinnedWorkspaces: 'pinned-workspaces',
    metadata: 'metadata',
} as const;

type StoreName = (typeof IDB_STORES)[keyof typeof IDB_STORES];

let dbPromise: Promise<IDBPDatabase> | null = null;

/** Exported for direct unit testing of migration paths */
export function upgradeHandler(db: IDBPDatabase, oldVersion: number): void {
    if (oldVersion < 1) {
        db.createObjectStore(IDB_STORES.workspaceData);
        db.createObjectStore(IDB_STORES.pinnedWorkspaces);
        db.createObjectStore(IDB_STORES.metadata);
    }
}

function getDb(): Promise<IDBPDatabase> {
    dbPromise ??= openDB(DB_NAME, DB_VERSION, { upgrade: upgradeHandler });
    return dbPromise;
}

async function get<T>(store: StoreName, key: string): Promise<T | undefined> {
    try {
        const db = await getDb();
        return await db.get(store, key) as T | undefined;
    } catch (error) {
        captureError(error instanceof Error ? error : new Error(strings.security.idbReadFailed), { store, key });
        return undefined;
    }
}

async function put(store: StoreName, key: string, value: unknown): Promise<boolean> {
    try {
        const db = await getDb();
        await db.put(store, value, key);
        return true;
    } catch (error) {
        captureError(error instanceof Error ? error : new Error(strings.security.idbWriteFailed), { store, key });
        return false;
    }
}

async function del(store: StoreName, key: string): Promise<boolean> {
    try {
        const db = await getDb();
        await db.delete(store, key);
        return true;
    } catch (error) {
        captureError(error instanceof Error ? error : new Error(strings.security.idbDeleteFailed), { store, key });
        return false;
    }
}

async function getAllKeys(store: StoreName): Promise<string[]> {
    try {
        const db = await getDb();
        const keys = await db.getAllKeys(store);
        return keys.map(String);
    } catch (error) {
        captureError(error instanceof Error ? error : new Error(strings.security.idbReadFailed), { store });
        return [];
    }
}

async function clear(store: StoreName): Promise<boolean> {
    try {
        const db = await getDb();
        await db.clear(store);
        return true;
    } catch (error) {
        captureError(error instanceof Error ? error : new Error(strings.security.idbDeleteFailed), { store });
        return false;
    }
}

/** Reset the DB promise (for testing) */
function resetConnection(): void {
    dbPromise = null;
}

export const indexedDbService = {
    get,
    put,
    del,
    getAllKeys,
    clear,
    resetConnection,
};
