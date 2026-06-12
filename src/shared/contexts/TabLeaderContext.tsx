/**
 * TabLeaderContext — useReducer-based context for tab leader role.
 * Pattern mirrors TierLimitsContext: single provider, lightweight consumer hooks.
 * Zero Zustand canvas-store dependency.
 */
import {
    createContext,
    useContext,
    useReducer,
    useMemo,
    useEffect,
    type ReactNode,
} from 'react';
import { createTabLeaderService, type TabRole } from '@/shared/services/tabLeaderService';
import { useTabRoleStore } from '@/shared/stores/tabRoleStore';

// ─── Types ────────────────────────────────────────────────────────────────────
interface TabLeaderState {
    readonly role: TabRole;
    readonly isLeader: boolean;
}

interface TabLeaderAction { type: 'SET_ROLE'; role: TabRole; }

interface TabLeaderContextValue {
    readonly state: TabLeaderState;
}

// ─── Reducer ──────────────────────────────────────────────────────────────────
function tabLeaderReducer(_state: TabLeaderState, action: TabLeaderAction): TabLeaderState {
    return { role: action.role, isLeader: action.role === 'leader' };
}

// Default isLeader=false prevents follower tabs from writing to Firestore
// during the brief election window before the first onRoleChange fires.
const INITIAL_STATE: TabLeaderState = { role: 'pending', isLeader: false };

// ─── Context ──────────────────────────────────────────────────────────────────
const TabLeaderCtx = createContext<TabLeaderContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────
export function TabLeaderProvider({ children }: { children: ReactNode }) {
    const [state, dispatch] = useReducer(tabLeaderReducer, INITIAL_STATE);

    useEffect(() => {
        const service = createTabLeaderService();
        const unsub = service.onRoleChange((role) => {
            dispatch({ type: 'SET_ROLE', role });
            useTabRoleStore.setState({ isLeader: role === 'leader' });
        });
        service.start();
        return () => {
            service.stop();
            unsub();
        };
    }, []);

    const value = useMemo(() => ({ state }), [state]);
    return <TabLeaderCtx.Provider value={value}>{children}</TabLeaderCtx.Provider>;
}

// ─── Consumer hooks ───────────────────────────────────────────────────────────
// eslint-disable-next-line react-refresh/only-export-components
export function useTabLeaderState(): TabLeaderState {
    const ctx = useContext(TabLeaderCtx);
    if (!ctx) throw new Error('useTabLeaderState must be used within TabLeaderProvider');
    return ctx.state;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useTabLeaderRole(): boolean {
    const ctx = useContext(TabLeaderCtx);
    if (!ctx) throw new Error('useTabLeaderRole must be used within TabLeaderProvider');
    return ctx.state.isLeader;
}
