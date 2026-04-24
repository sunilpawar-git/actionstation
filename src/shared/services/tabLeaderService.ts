/**
 * tabLeaderService — Cross-tab leader election via BroadcastChannel
 * with localStorage heartbeat and a storage-event fallback.
 *
 * Lifecycle:
 *   createTabLeaderService() → service.start() → service.stop()
 *
 * A tab is elected leader when no other tab has a fresh heartbeat (<6 s).
 * Leaders broadcast a HEARTBEAT every 3 s and a RESIGN on unload.
 * Any follower that receives RESIGN will immediately re-run the election.
 */
import { generateUUID } from '@/shared/utils/uuid';
import { logger } from '@/shared/services/logger';

// ─── Constants ────────────────────────────────────────────────────────────────
const LS_LEADER_ID = 'actionstation-leader-id';
const LS_HEARTBEAT_TS = 'actionstation-leader-hb';
const BC_CHANNEL = 'actionstation-tab-leader';
const HEARTBEAT_INTERVAL_MS = 3_000;
const HEARTBEAT_TIMEOUT_MS = 6_000;

// ─── Types ────────────────────────────────────────────────────────────────────
export type TabRole = 'leader' | 'follower' | 'pending';

type BcMessage =
    | { type: 'CLAIM'; tabId: string }
    | { type: 'RESIGN'; tabId: string }
    | { type: 'HEARTBEAT'; tabId: string };

export interface TabLeaderService {
    readonly tabId: string;
    getRole(): TabRole;
    start(): void;
    stop(): void;
    onRoleChange(cb: (role: TabRole) => void): () => void;
}

// ─── Module-level helpers (pure, ≤20 lines each) ─────────────────────────────
function isHeartbeatFresh(): boolean {
    const ts = localStorage.getItem(LS_HEARTBEAT_TS);
    if (!ts) return false;
    return Date.now() - parseInt(ts, 10) < HEARTBEAT_TIMEOUT_MS;
}

function safePost(channel: BroadcastChannel | null, msg: BcMessage): void {
    try {
        channel?.postMessage(msg);
    } catch (err) {
        logger.warn('tabLeaderService: BroadcastChannel postMessage failed', err);
    }
}

// ─── Factory ─────────────────────────────────────────────────────────────────
export function createTabLeaderService(): TabLeaderService {
    const tabId = generateUUID();
    let role: TabRole = 'pending';
    const listeners = new Set<(role: TabRole) => void>();
    let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
    let channel: BroadcastChannel | null = null;
    let bcMessageHandler: ((e: MessageEvent<BcMessage>) => void) | null = null;

    function notify(next: TabRole): void {
        role = next;
        listeners.forEach((cb) => cb(role));
    }

    function stopHeartbeat(): void {
        if (heartbeatTimer !== null) clearInterval(heartbeatTimer);
        heartbeatTimer = null;
    }
    function claimLeadership(): void {
        localStorage.setItem(LS_LEADER_ID, tabId);
        localStorage.setItem(LS_HEARTBEAT_TS, String(Date.now()));
        notify('leader');
        safePost(channel, { type: 'CLAIM', tabId });
        heartbeatTimer = setInterval(() => {
            localStorage.setItem(LS_HEARTBEAT_TS, String(Date.now()));
            safePost(channel, { type: 'HEARTBEAT', tabId });
        }, HEARTBEAT_INTERVAL_MS);
    }

    function tryClaimOrFollow(): void { if (isHeartbeatFresh()) notify('follower'); else claimLeadership(); }
    function handleBcMessage(msg: BcMessage): void {
        if (msg.tabId === tabId) return; // ignore self
        const msgType = msg.type;
        if (msgType === 'CLAIM' || msgType === 'HEARTBEAT') {
            stopHeartbeat();
            notify('follower');
        } else {
            tryClaimOrFollow();
        }
    }

    function handleStorageEvent(e: StorageEvent): void {
        // Fallback for environments without BroadcastChannel
        if (e.key !== LS_LEADER_ID) return;
        if (e.newValue && e.newValue !== tabId) {
            // Another tab claimed leadership
            stopHeartbeat();
            notify('follower');
        } else if (e.newValue === null) {
            // Leader resigned (removeItem fires newValue=null) — race to claim
            tryClaimOrFollow();
        }
    }

    function startChannel(): void {
        if (typeof BroadcastChannel !== 'undefined') {
            channel = new BroadcastChannel(BC_CHANNEL);
            bcMessageHandler = (e: MessageEvent<BcMessage>) => handleBcMessage(e.data);
            channel.addEventListener('message', bcMessageHandler);
        } else {
            window.addEventListener('storage', handleStorageEvent);
        }
    }

    function stopChannel(): void {
        if (role === 'leader') {
            localStorage.removeItem(LS_LEADER_ID);
            localStorage.removeItem(LS_HEARTBEAT_TS);
            safePost(channel, { type: 'RESIGN', tabId });
        }
        if (channel && bcMessageHandler) {
            channel.removeEventListener('message', bcMessageHandler);
            bcMessageHandler = null;
        }
        channel?.close();
        channel = null;
        try { window.removeEventListener('storage', handleStorageEvent); } catch (err) { logger.warn('tabLeaderService: removeEventListener failed', err); }
    }

    return {
        tabId,
        getRole: () => role,
        start(): void { startChannel(); tryClaimOrFollow(); },
        stop(): void { stopHeartbeat(); stopChannel(); },
        onRoleChange(cb: (role: TabRole) => void): () => void {
            listeners.add(cb);
            return () => { listeners.delete(cb); };
        },
    };
}
