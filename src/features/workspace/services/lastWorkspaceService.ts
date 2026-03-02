/**
 * lastWorkspaceService — Persists the last-active workspace ID across sessions.
 * Stores to localStorage so the user returns to the same workspace on next visit.
 */
import { getStorageItem, setStorageItem } from '@/shared/utils/storage';

export const LAST_WORKSPACE_KEY = 'last-workspace-id';

/** Persist the ID of the workspace the user just switched to. */
export function persistLastWorkspaceId(id: string): void {
    setStorageItem(LAST_WORKSPACE_KEY, id);
}

/** Read the last-persisted workspace ID. Returns '' if never set. */
export function getLastWorkspaceId(): string {
    return getStorageItem<string>(LAST_WORKSPACE_KEY, '');
}
