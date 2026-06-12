/**
 * tabRoleStore — Minimal Zustand store exposing tab leader role
 * for imperative reads outside React context (e.g. useSaveCallback.save()).
 * Updated exclusively by TabLeaderContext via setState().
 *
 * Default isLeader=false: prevents writes during the brief election window
 * before TabLeaderProvider's first useEffect fires and resolves the role.
 * useAutosave debounces 2s so no real save attempt occurs in this window.
 */
import { create } from 'zustand';

interface TabRoleState {
    readonly isLeader: boolean;
}

export const useTabRoleStore = create<TabRoleState>(() => ({ isLeader: false }));
